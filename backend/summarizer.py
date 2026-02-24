"""
Hierarchical summarization engine using Google Gemini (free).
Chunks text intelligently, summarizes each chunk, then synthesizes a global summary.
"""

import os
import json
import time
from google import genai
from dotenv import load_dotenv

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_THIS_DIR, ".env"))

MAX_CHUNK_CHARS = 12000  # ~3000 tokens worth of characters
MODEL = "gemini-2.5-flash"  # Free tier, fast, handles JSON well

_client = None


class RateLimitExceeded(Exception):
    """Raised when Gemini quota/rate limit is exceeded after retries."""


def get_client() -> genai.Client:
    """Lazy-initialize the Gemini client so the server can start without a key."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. "
                "Create backend/.env with your key (see .env.example)."
            )
        _client = genai.Client(api_key=api_key)
    return _client


def count_tokens(text: str) -> int:
    """Approximate token count (1 token ≈ 4 chars for English text)."""
    return len(text) // 4


def chunk_by_sections(sections: list[dict], max_chars: int = MAX_CHUNK_CHARS) -> list[dict]:
    """
    Chunk sections so each chunk stays within size limits.
    If a section is too large, split it into sub-chunks.
    """
    chunks = []

    for section in sections:
        name = section["name"]
        content = section["content"]

        if len(content) <= max_chars:
            chunks.append({
                "name": name,
                "content": content,
                "page_start": section.get("page_start", 0),
            })
        else:
            # Split large section into sub-chunks by paragraphs
            paragraphs = content.split("\n\n")
            current_chunk = ""
            chunk_index = 1

            for para in paragraphs:
                if len(current_chunk) + len(para) + 2 > max_chars:
                    if current_chunk.strip():
                        chunks.append({
                            "name": f"{name} (Part {chunk_index})",
                            "content": current_chunk.strip(),
                            "page_start": section.get("page_start", 0),
                        })
                        chunk_index += 1
                    current_chunk = para
                else:
                    current_chunk += "\n\n" + para

            if current_chunk.strip():
                chunks.append({
                    "name": f"{name} (Part {chunk_index})" if chunk_index > 1 else name,
                    "content": current_chunk.strip(),
                    "page_start": section.get("page_start", 0),
                })

    return chunks


def _call_gemini(prompt: str) -> dict:
    """Call Gemini and parse JSON response with retry logic for quota limits."""
    client = get_client()
    max_retries = 3
    base_delay = 40  # Start with 40 seconds (free tier limit is 5 requests/minute)
    
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config={
                    "temperature": 0.3,
                    "response_mime_type": "application/json",
                },
            )
            return json.loads(response.text)
        except Exception as e:
            if "RESOURCE_EXHAUSTED" in str(e) or "quota" in str(e).lower():
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)  # Exponential backoff
                    print(f"Rate limited. Retrying in {delay} seconds... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(delay)
                    continue
                else:
                    raise RateLimitExceeded(
                        f"Rate limit exceeded after {max_retries} attempts. "
                        "Please wait a few minutes before trying again."
                    )
            else:
                raise  # Re-raise non-quota errors immediately


def summarize_chunk(chunk: dict) -> dict:
    """Summarize a single chunk using Gemini."""
    prompt = f"""You are a research paper analysis assistant.

Summarize the following section from a research paper.

Section: {chunk['name']}

Text:
{chunk['content']}

Provide:
1. A 2-3 sentence summary
2. 3-5 key points as bullet points
3. Any important terms or concepts mentioned

Respond in this exact JSON format:
{{
  "summary": "...",
  "key_points": ["point1", "point2", ...],
  "key_terms": ["term1", "term2", ...]
}}"""

    result = _call_gemini(prompt)

    return {
        "section_name": chunk["name"],
        "page_start": chunk.get("page_start", 0),
        "summary": result.get("summary", ""),
        "key_points": result.get("key_points", []),
        "key_terms": result.get("key_terms", []),
    }


def generate_global_summary(section_summaries: list[dict]) -> dict:
    """Combine section summaries into a global paper summary."""
    combined = "\n\n".join(
        f"**{s['section_name']}**: {s['summary']}"
        for s in section_summaries
    )

    prompt = f"""You are a research paper analysis assistant.

Below are summaries of each section of a research paper:

{combined}

Based on these section summaries, provide a comprehensive analysis:

1. Paper title (infer from content)
2. A 5-line overall summary of the entire paper
3. Problem statement (what problem does this paper solve?)
4. Methodology overview (how do they solve it?)
5. Key results and contributions (3-5 bullet points)
6. Limitations mentioned or implied
7. 3 possible future research directions / open gaps
8. A list of all key terms across the paper

Respond in this exact JSON format:
{{
  "inferred_title": "...",
  "global_summary": "...",
  "problem_statement": "...",
  "methodology": "...",
  "key_contributions": ["...", "..."],
  "limitations": ["...", "..."],
  "future_work": ["...", "..."],
  "all_key_terms": ["...", "..."]
}}"""

    return _call_gemini(prompt)


def process_paper(sections: list[dict]) -> dict:
    """
    Full pipeline: sections → chunks → section summaries → global summary.
    Returns the complete structured analysis.
    """
    # Step 1: Chunk sections to fit token limits
    chunks = chunk_by_sections(sections)

    # Step 2: Summarize each chunk
    section_summaries = []
    for chunk in chunks:
        try:
            summary = summarize_chunk(chunk)
            section_summaries.append(summary)
        except RateLimitExceeded:
            raise
        except Exception as e:
            section_summaries.append({
                "section_name": chunk["name"],
                "page_start": chunk.get("page_start", 0),
                "summary": f"Error summarizing: {str(e)}",
                "key_points": [],
                "key_terms": [],
            })

    # Step 3: Generate global summary from section summaries
    try:
        global_analysis = generate_global_summary(section_summaries)
    except RateLimitExceeded:
        raise
    except Exception as e:
        global_analysis = {
            "inferred_title": "Unknown",
            "global_summary": f"Error generating global summary: {str(e)}",
            "problem_statement": "",
            "methodology": "",
            "key_contributions": [],
            "limitations": [],
            "future_work": [],
            "all_key_terms": [],
        }

    return {
        "global": global_analysis,
        "sections": section_summaries,
        "stats": {
            "total_sections": len(sections),
            "total_chunks_processed": len(chunks),
        },
    }
