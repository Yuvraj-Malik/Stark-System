"""
Stark Research Paper Analyzer — FastAPI Backend
Upload a PDF → Get structured summary + section analysis
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pdf_extractor import extract_text_by_pages, detect_sections
from summarizer import process_paper, count_tokens

app = FastAPI(
    title="Stark Paper Analyzer",
    description="Upload research papers and get structured summaries",
    version="0.1.0",
)

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

    sections = detect_sections(pages)

    try:
        result = process_paper(sections)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Summarization failed: {str(e)}",
        )

    return {
        "filename": file.filename,
        "total_pages": len(pages),
        "total_tokens": count_tokens(full_text),
        "analysis": result,
    }
