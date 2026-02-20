# backend/core/chunking.py
import re
from collections import defaultdict

HEADERS = {
    "skills": [r"^skills?\b", r"^technical skills?\b", r"^core competencies\b", r"^tools?\b"],
    "experience": [r"^(work )?experience\b", r"^professional experience\b", r"^employment\b"],
    "projects": [r"^projects?\b", r"^selected projects?\b"],
    "education": [r"^education\b", r"^academic\b"],
}

def chunk_sections(text: str) -> dict[str, str]:
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]

    current = "other"
    out = defaultdict(list)

    for ln in lines:
        low = ln.lower()

        matched = None
        for section, pats in HEADERS.items():
            for p in pats:
                if re.match(p, low):
                    matched = section
                    break
            if matched:
                break

        if matched:
            current = matched
            continue

        out[current].append(ln)

    # Always include full doc view
    out["doc"] = lines

    return {k: "\n".join(v).strip() for k, v in out.items() if "\n".join(v).strip()}
