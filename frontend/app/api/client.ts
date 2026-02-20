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

export async function getProjection(runId: number) {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/projection/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDocDetail(runId: number, docId: number) {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/doc/${docId}/?k=5`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
