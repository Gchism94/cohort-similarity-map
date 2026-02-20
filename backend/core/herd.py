# backend/core/herd.py
import re
from collections import Counter

STOPWORDS = set("""
a an the and or but if then than to of in on for with by from as at is are was were be been being
this that these those it its we our you your they their i me my
""".split())

WORD_RE = re.compile(r"[a-zA-Z][a-zA-Z\-]+")

def tokenize(text: str):
    return [w.lower() for w in WORD_RE.findall(text) if w.lower() not in STOPWORDS]

def bigrams(tokens):
    return [" ".join([tokens[i], tokens[i+1]]) for i in range(len(tokens)-1)]

def herd_phrases(texts: list[str], top_n: int = 30):
    phrase_counts = Counter()
    doc_freq = Counter()

    for t in texts:
        toks = tokenize(t)
        bs = bigrams(toks)
        phrase_counts.update(bs)
        for p in set(bs):
            doc_freq[p] += 1

    top = phrase_counts.most_common(top_n)
    return [
        {"phrase": p, "count": int(c), "doc_freq": int(doc_freq[p])}
        for p, c in top
    ]
