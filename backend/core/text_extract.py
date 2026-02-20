# backend/core/text_extract.py
from __future__ import annotations
from pathlib import Path
import pdfplumber
from docx import Document as DocxDocument

def extract_text(path: str) -> str:
    p = Path(path)
    suffix = p.suffix.lower()
    if suffix == ".pdf":
        chunks = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                if t:
                    chunks.append(t)
        return "\n".join(chunks).strip()
    if suffix in {".docx"}:
        doc = DocxDocument(path)
        return "\n".join([para.text for para in doc.paragraphs]).strip()
    if suffix in {".txt"}:
        return p.read_text(encoding="utf-8", errors="ignore").strip()
    raise ValueError(f"Unsupported file type: {suffix}")
