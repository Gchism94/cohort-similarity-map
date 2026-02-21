# backend/core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("upload/", views.upload),
    path("documents/", views.documents),

    path("runs/start/", views.start_run),
    path("runs/", views.list_runs),

    path("runs/<int:run_id>/", views.run_status),
    path("runs/<int:run_id>/projection/", views.projection),
    path("runs/<int:run_id>/doc/<int:doc_id>/", views.doc_detail),

    path("runs/<int:run_id>/herd/", views.herd),
    path("runs/<int:run_id>/rerun/", views.rerun),

    path("cohorts/<str:cohort_key>/", views.delete_cohort),
    path("health/", views.health),
]