# backend/core/urls.py
from django.urls import path, include
from core import views

urlpatterns = [
    path("api/", include("core.urls")),
    path("upload/", views.upload),
    path("documents/", views.documents),

    path("runs/start/", views.start_run),
    path("runs/", views.list_runs),  # <-- IMPORTANT: matches client.ts listRuns()

    path("runs/<int:run_id>/", views.run_status),
    path("runs/<int:run_id>/projection/", views.projection),
    path("runs/<int:run_id>/doc/<int:doc_id>/", views.doc_detail),

    path("runs/<int:run_id>/herd/", views.herd),    # <-- matches getHerd()
    path("runs/<int:run_id>/rerun/", views.rerun),  # <-- matches rerun()

    path("cohorts/<str:cohort_key>/", views.delete_cohort),  # <-- matches deleteCohort()
]
