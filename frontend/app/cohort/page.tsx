"use client";

import React, { useEffect, useState } from "react";
import { listDocs, startRun, getRun, getProjection } from "../api/client";
import { UploadBox } from "../../components/UploadBox";
import { ScatterMap } from "../../components/ScatterMap";
import { DocPanel } from "../../components/DocPanel";

export default function CohortPage() {
  const [cohortKey, setCohortKey] = useState("default");
  const [docs, setDocs] = useState<any[]>([]);
  const [run, setRun] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  async function refreshDocs() {
    setDocs(await listDocs(cohortKey));
  }

  useEffect(() => { refreshDocs(); }, [cohortKey]);

  async function kickRun() {
    const r = await startRun(cohortKey);
    setRun(r);
    setPoints([]);
    setSelected(null);
  }

  // poll run status while running
  useEffect(() => {
    if (!run?.id) return;
    let timer: any;

    async function poll() {
      const r2 = await getRun(run.id);
      setRun(r2);
      if (r2.status === "done") {
        const p = await getProjection(run.id);
        setPoints(p);
        return;
      }
      if (r2.status === "failed") return;
      timer = setTimeout(poll, 1500);
    }
    poll();

    return () => timer && clearTimeout(timer);
  }, [run?.id]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Cohort Similarity Map</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          Cohort key:&nbsp;
          <input value={cohortKey} onChange={(e) => setCohortKey(e.target.value)} />
        </label>
        <button onClick={refreshDocs}>Refresh docs</button>
        <button onClick={kickRun}>Start analysis</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <UploadBox cohortKey={cohortKey} onUploaded={refreshDocs} />
      </div>

      <div style={{ marginTop: 12 }}>
        <b>Docs:</b> {docs.length} &nbsp; {run ? <>| <b>Run:</b> {run.id} ({run.status})</> : null}
        {run?.error ? <div style={{ color: "crimson" }}>{run.error}</div> : null}
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div>
          {points.length ? (
            <ScatterMap points={points} onSelect={(id) => setSelected(id)} />
          ) : (
            <div style={{ border: "1px dashed #bbb", padding: 24, borderRadius: 8 }}>
              Upload documents and click “Start analysis” to generate the map.
            </div>
          )}
        </div>
        <div>
          {run?.id ? <DocPanel runId={run.id} docId={selected} /> : <div>Start a run to enable details.</div>}
        </div>
      </div>
    </div>
  );
}
