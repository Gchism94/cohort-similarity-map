# backend/config/urls.py
from django.urls import path, include

urlpatterns = [
    path("api/", include("core.urls")),
    path("cohorts/<str:cohort_key>/"),
    path("runs/<int:run_id>/herd/"),
]
