# backend/core/scrub.py
import re

EMAIL_RE = re.compile(r"\b[\w\.-]+@[\w\.-]+\.\w+\b")
PHONE_RE = re.compile(r"(\+?\d[\d\-\s\(\)]{7,}\d)")
URL_RE = re.compile(r"\bhttps?://\S+\b")

def scrub_pii(text: str) -> str:
    t = EMAIL_RE.sub("[EMAIL]", text)
    t = PHONE_RE.sub("[PHONE]", t)
    t = URL_RE.sub("[URL]", t)
    return t
