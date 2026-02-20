const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function uploadFile(file: File, cohortKey: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("cohort_key", cohortKey);
  const res = await fetch(`${API_BASE}/api/upload/`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listDocs(cohortKey: string) {
  const res = await fetch(`${API_BASE}/api/documents/?cohort_key=${encodeURIComponent(cohortKey)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function startRun(cohortKey: string) {
  const res = await fetch(`${API_BASE}/api/runs/start/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cohort_key: cohortKey })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getRun(runId: number) {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProjection(runId: number, section: "doc" | "skills" | "experience" = "doc") {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/projection/?section=${encodeURIComponent(section)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDocDetail(
  runId: number,
  docId: number,
  section: "doc" | "skills" | "experience" = "doc",
  k: number = 5
) {
  const res = await fetch(
    `${API_BASE}/api/runs/${runId}/doc/${docId}/?k=${k}&section=${encodeURIComponent(section)}`
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHerd(runId: number) {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/herd/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteCohort(cohortKey: string) {
  const res = await fetch(`${API_BASE}/api/cohorts/${encodeURIComponent(cohortKey)}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listRuns(cohortKey: string) {
  const res = await fetch(`${API_BASE}/api/runs/?cohort_key=${encodeURIComponent(cohortKey)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function rerun(runId: number, umapParams: { n_neighbors: number; min_dist: number }, label?: string) {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/rerun/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ umap_params: umapParams, label }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
