# backend/core/models.py
from django.db import models
from pgvector.django import VectorField

SECTION_CHOICES = [
    ("doc", "Full Document"),
    ("skills", "Skills"),
    ("experience", "Experience"),
    ("projects", "Projects"),
    ("education", "Education"),
    ("other", "Other"),
]

class AnalysisRun(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    cohort_key = models.CharField(max_length=200, default="default")
    embedding_model = models.CharField(max_length=200, default="sentence-transformers/all-MiniLM-L6-v2")
    chunking_version = models.CharField(max_length=50, default="v1_doc_only")
    umap_params = models.JSONField(default=dict)
    status = models.CharField(max_length=50, default="pending")  # pending/running/done/failed
    error = models.TextField(blank=True, default="")
    herd_phrases = models.JSONField(default=dict)  # e.g., {"bigrams":[{"phrase":"data analysis","count":42,"doc_freq":18}, ...]}
    label = models.CharField(max_length=200, blank=True, default="")
    parent_run = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children")

class Document(models.Model):
    cohort_key = models.CharField(max_length=128, db_index=True)

    # Keep filename if you already use it elsewhere, but make it the "original"
    filename = models.CharField(max_length=512)  # optional legacy / keep for now

    original_filename = models.CharField(max_length=512, blank=True, default="")
    stored_name = models.CharField(max_length=512, blank=True, default="")

    content_type = models.CharField(max_length=128, blank=True, default="")
    file_path = models.TextField()  # absolute path you already use
    status = models.CharField(max_length=32, default="uploaded")
    created_at = models.DateTimeField(auto_now_add=True)
    raw_text = models.TextField(blank=True, default="")
    scrubbed_text = models.TextField(blank=True, default="")
    error = models.TextField(blank=True, default="")

class DocEmbedding(models.Model):
    document = models.ForeignKey("Document", on_delete=models.CASCADE, related_name="embeddings")
    run = models.ForeignKey("AnalysisRun", on_delete=models.CASCADE, related_name="embeddings")
    section = models.CharField(max_length=20, choices=SECTION_CHOICES, default="doc")
    vector = VectorField(dimensions=384)
    norm = models.FloatField(default=0.0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["document", "run", "section"], name="uniq_embedding_doc_run_section")
        ]


class DocProjection(models.Model):
    document = models.ForeignKey("Document", on_delete=models.CASCADE, related_name="projections")
    run = models.ForeignKey("AnalysisRun", on_delete=models.CASCADE, related_name="projections")
    section = models.CharField(max_length=20, choices=SECTION_CHOICES, default="doc")
    x = models.FloatField()
    y = models.FloatField()
    cluster_id = models.IntegerField(null=True, blank=True)
    outlier_score = models.FloatField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["document", "run", "section"], name="uniq_projection_doc_run_section")
        ]

# backend/core/models.py
class AuditEvent(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=100)  # e.g., "cohort_delete", "upload", "run_start"
    cohort_key = models.CharField(max_length=200, default="default")
    detail = models.JSONField(default=dict)    # flexible payload
    actor = models.CharField(max_length=200, blank=True, default="")  # later: user id/email/ip
