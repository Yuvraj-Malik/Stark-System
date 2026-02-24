"""
Stark Research Paper Analyzer — FastAPI Backend
Upload a PDF → Get structured summary + section analysis
"""

import hashlib
import uuid
from datetime import datetime, timezone
from threading import Lock

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from pdf_extractor import extract_text_by_pages, detect_sections
from summarizer import process_paper, count_tokens, RateLimitExceeded

app = FastAPI(
    title="Stark Paper Analyzer",
    description="Upload research papers and get structured summaries",
    version="0.1.0",
)

JOBS: dict[str, dict] = {}
ANALYSIS_CACHE: dict[str, dict] = {}
STORE_LOCK = Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_fallback_analysis(sections: list[dict], reason: str) -> dict:
    fallback_sections = [
        {
            "section_name": section["name"],
            "page_start": section.get("page_start", 0),
            "summary": "Detailed LLM summary is pending due to temporary API quota limits.",
            "key_points": [],
            "key_terms": [],
        }
        for section in sections
    ]

    return {
        "global": {
            "inferred_title": "Analysis Pending",
            "global_summary": reason,
            "problem_statement": "",
            "methodology": "",
            "key_contributions": [],
            "limitations": ["Gemini quota limit hit during this run."],
            "future_work": [
                "Retry full analysis once quota resets.",
                "Use async job endpoint for automatic background retries.",
            ],
            "all_key_terms": [],
        },
        "sections": fallback_sections,
        "stats": {
            "total_sections": len(sections),
            "total_chunks_processed": 0,
            "mode": "fallback_quota_limited",
        },
    }


def _set_job(job_id: str, **updates):
    with STORE_LOCK:
        job = JOBS.get(job_id)
        if not job:
            return
        job.update(updates)


def _run_analysis_job(job_id: str, filename: str, file_bytes: bytes, file_hash: str):
    _set_job(job_id, status="running", started_at=_now_iso(), error=None)

    try:
        pages = extract_text_by_pages(file_bytes)
        full_text = "\n\n".join(p["text"] for p in pages if p["text"])

        if not full_text.strip():
            raise ValueError("PDF contains no extractable text. It may be scanned/image-based.")

        with STORE_LOCK:
            cached_payload = ANALYSIS_CACHE.get(file_hash)

        if cached_payload:
            _set_job(
                job_id,
                status="completed",
                completed_at=_now_iso(),
                result={**cached_payload, "cached": True},
            )
            return

        sections = detect_sections(pages)

        try:
            analysis = process_paper(sections)
            payload = {
                "filename": filename,
                "total_pages": len(pages),
                "total_tokens": count_tokens(full_text),
                "analysis": analysis,
                "cached": False,
            }
            with STORE_LOCK:
                ANALYSIS_CACHE[file_hash] = payload
            _set_job(job_id, status="completed", completed_at=_now_iso(), result=payload)
        except RateLimitExceeded as e:
            fallback = {
                "filename": filename,
                "total_pages": len(pages),
                "total_tokens": count_tokens(full_text),
                "analysis": _build_fallback_analysis(
                    sections,
                    "Gemini rate limit reached. Showing extracted structure now; "
                    "retry later for full semantic analysis.",
                ),
                "cached": False,
            }
            _set_job(
                job_id,
                status="partial",
                completed_at=_now_iso(),
                error=str(e),
                result=fallback,
            )
    except Exception as e:
        _set_job(job_id, status="failed", completed_at=_now_iso(), error=str(e))

# CORS — allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "online", "service": "Stark Paper Analyzer v0.1"}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Step 1 endpoint: Upload PDF and get raw extraction results.
    Returns page count, total characters, detected sections, and token count.
    Use this to verify PDF ingestion works before running summarization.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()

    try:
        pages = extract_text_by_pages(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {str(e)}")

    full_text = "\n\n".join(p["text"] for p in pages if p["text"])
    sections = detect_sections(pages)
    tokens = count_tokens(full_text)

    return {
        "filename": file.filename,
        "total_pages": len(pages),
        "total_characters": len(full_text),
        "total_tokens": tokens,
        "detected_sections": [
            {
                "name": s["name"],
                "page_start": s.get("page_start", 0),
                "content_length": len(s["content"]),
            }
            for s in sections
        ],
    }


@app.post("/analyze")
async def analyze_pdf(file: UploadFile = File(...)):
    """
    Full pipeline: Upload PDF → Extract → Chunk → Summarize → Global Analysis.
    Returns structured JSON with section summaries and global paper analysis.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    try:
        pages = extract_text_by_pages(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {str(e)}")

    full_text = "\n\n".join(p["text"] for p in pages if p["text"])

    if not full_text.strip():
        raise HTTPException(
            status_code=422,
            detail="PDF contains no extractable text. It may be scanned/image-based.",
        )

    with STORE_LOCK:
        cached_payload = ANALYSIS_CACHE.get(file_hash)
    if cached_payload:
        return {**cached_payload, "cached": True}

    sections = detect_sections(pages)

    try:
        result = process_paper(sections)
    except RateLimitExceeded as e:
        raise HTTPException(
            status_code=429,
            detail=(
                "Gemini rate limit reached. Please retry in a few minutes or use "
                "POST /jobs/analyze for async processing. "
                f"Details: {str(e)}"
            ),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Summarization failed: {str(e)}",
        )

    payload = {
        "filename": file.filename,
        "total_pages": len(pages),
        "total_tokens": count_tokens(full_text),
        "analysis": result,
        "cached": False,
    }

    with STORE_LOCK:
        ANALYSIS_CACHE[file_hash] = payload

    return payload


@app.post("/jobs/analyze")
async def create_analysis_job(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Async analysis endpoint.
    Returns a job id immediately and processes the PDF in the background.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    job_id = str(uuid.uuid4())

    with STORE_LOCK:
        JOBS[job_id] = {
            "job_id": job_id,
            "filename": file.filename,
            "status": "queued",
            "created_at": _now_iso(),
            "started_at": None,
            "completed_at": None,
            "error": None,
            "result": None,
        }

    background_tasks.add_task(_run_analysis_job, job_id, file.filename, file_bytes, file_hash)

    return {
        "job_id": job_id,
        "status": "queued",
        "status_url": f"/jobs/{job_id}",
        "result_url": f"/jobs/{job_id}/result",
    }


@app.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    with STORE_LOCK:
        job = JOBS.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job["job_id"],
        "filename": job["filename"],
        "status": job["status"],
        "created_at": job["created_at"],
        "started_at": job["started_at"],
        "completed_at": job["completed_at"],
        "error": job["error"],
    }


@app.get("/jobs/{job_id}/result")
def get_job_result(job_id: str):
    with STORE_LOCK:
        job = JOBS.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] in {"queued", "running"}:
        raise HTTPException(status_code=409, detail="Job is still processing")

    if job["status"] == "failed":
        raise HTTPException(status_code=500, detail=job["error"] or "Job failed")

    return job["result"]
