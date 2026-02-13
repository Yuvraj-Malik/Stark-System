"""
PDF text and image extraction using pdfplumber.
Extracts text page-by-page, preserving structure where possible.
"""

import pdfplumber
import re
from io import BytesIO


def extract_text_by_pages(file_bytes: bytes) -> list[dict]:
    """Extract text from each page of the PDF."""
    pages = []
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            tables = page.extract_tables() or []
            pages.append({
                "page_number": i + 1,
                "text": text.strip(),
                "tables": tables,
            })
    return pages


def detect_sections(pages: list[dict]) -> list[dict]:
    """
    Attempt to detect section headings from the extracted text.
    Uses heuristics: lines that are short, uppercase, or match common patterns.
    """
    full_text = "\n\n".join(p["text"] for p in pages if p["text"])
    lines = full_text.split("\n")

    # Common research paper section patterns
    section_patterns = [
        r"^(?:\d+\.?\s*)?(?:abstract|introduction|background|related\s*work|"
        r"literature\s*review|methodology|methods?|approach|proposed\s*(?:method|approach|system)|"
        r"experiment(?:s|al)?(?:\s*(?:setup|results?))?|results?(?:\s*and\s*discussion)?|"
        r"discussion|analysis|evaluation|conclusion(?:s)?|future\s*work|"
        r"acknowledg(?:e)?ments?|references|bibliography|appendix)",
    ]
    combined_pattern = "|".join(section_patterns)

    sections = []
    current_section = {"name": "Preamble", "content": "", "page_start": 1}

    page_char_offsets = []
    offset = 0
    for p in pages:
        page_char_offsets.append(offset)
        offset += len(p["text"]) + 2  # +2 for \n\n

    def find_page_for_offset(char_offset):
        for i in range(len(page_char_offsets) - 1, -1, -1):
            if char_offset >= page_char_offsets[i]:
                return i + 1
        return 1

    char_offset = 0
    for line in lines:
        stripped = line.strip()
        is_heading = False

        # Check if line matches section patterns (case-insensitive)
        if stripped and re.match(combined_pattern, stripped.lower()):
            is_heading = True

        # Also detect numbered sections like "1. Introduction" or "2 Methods"
        if not is_heading and re.match(r"^\d+\.?\s+[A-Z]", stripped) and len(stripped) < 80:
            is_heading = True

        # All-caps short lines are likely headings
        if not is_heading and stripped.isupper() and 3 < len(stripped) < 60:
            is_heading = True

        if is_heading and stripped:
            # Save previous section
            if current_section["content"].strip():
                sections.append(current_section.copy())
            current_section = {
                "name": stripped,
                "content": "",
                "page_start": find_page_for_offset(char_offset),
            }
        else:
            current_section["content"] += line + "\n"

        char_offset += len(line) + 1

    # Don't forget the last section
    if current_section["content"].strip():
        sections.append(current_section)

    # If no sections detected, return the whole text as one section
    if len(sections) <= 1:
        return [{
            "name": "Full Document",
            "content": full_text,
            "page_start": 1,
        }]

    return sections
