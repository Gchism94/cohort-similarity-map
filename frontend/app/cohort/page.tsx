"use client";

import React, { useEffect, useState } from "react";
import {
  listDocs,
  startRun,
  getRun,
  getProjection,
  getHerd,
  deleteCohort,
  listRuns,
  rerun,
} from "../api/client";
import { UploadBox } from "../../components/UploadBox";
import { ScatterMap } from "../../components/ScatterMap";
import { DocPanel } from "../../components/DocPanel";
import { HerdPanel } from "../../components/HerdPanel";
import { DangerConfirm } from "../../components/DangerConfirm";

type ViewSection = "doc" | "skills" | "experience";
type RightTab = "details" | "herd";

export default function CohortPage() {
  const [cohortKey, setCohortKey] = useState("default");
  const [docs, setDocs] = useState<any[]>([]);
  const [run, setRun] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const [view, setView] = useState<ViewSection>("doc");

  const [tab, setTab] = useState<RightTab>("details");
  const [herd, setHerd] = useState<any[] | null>(null);
  const [herdLoading, setHerdLoading] = useState(false);
  const [herdError, setHerdError] = useState<string | null>(null);

  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Runs UI state
  const [runs, setRuns] = useState<any[]>([]);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runsLoading, setRunsLoading] = useState(false);

  const [umapNeighbors, setUmapNeighbors] = useState<number>(15);
  const [umapMinDist, setUmapMinDist] = useState<number>(0.1);

  const [rerunBusy, setRerunBusy] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  const canDelete = (docs.length > 0 || run !== null) && !deleteBusy;

  function statusBadge(status?: string) {
    const map: Record<string, { icon: string; color: string; label: string }> = {
      queued: { icon: "⚪", color: "#888", label: "queued" },
      running: { icon: "🟡", color: "#b58900", label: "running" },
      done: { icon: "🟢", color: "#2e7d32", label: "done" },
      failed: { icon: "🔴", color: "#c62828", label: "failed" },
    };

    const s = status ? map[status] : undefined;
    if (!s) return <span style={{ color: "#888" }}>—</span>;

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          padding: "2px 6px",
          borderRadius: 6,
          border: "1px solid #eee",
          color: s.color,
        }}
        title={s.label}
      >
        <span>{s.icon}</span>
        <span>{s.label}</span>
      </span>
    );
  }

  function syncUmapInputsFromRun(r: any) {
    const nn = Number(r?.umap_params?.n_neighbors);
    const md = Number(r?.umap_params?.min_dist);
    setUmapNeighbors(Number.isFinite(nn) ? nn : 15);
    setUmapMinDist(Number.isFinite(md) ? md : 0.1);
  }

  function formatRunMeta(r: any) {
    if (!r) return null;
    const created = r.created_at ? new Date(r.created_at).toLocaleString() : "—";
    const nn = r?.umap_params?.n_neighbors ?? "—";
    const md = r?.umap_params?.min_dist ?? "—";
    const model = r?.embedding_model ?? "—";
    return { created, nn, md, model };
  }

  async function refreshDocs() {
    try {
      const d = await listDocs(cohortKey);
      setDocs(d);
    } catch (e: any) {
      console.error("Failed to refresh docs:", e);
    }
  }

  async function refreshRuns() {
    setRunsLoading(true);
    setRunsError(null);
    try {
      const rs = await listRuns(cohortKey);
      setRuns(rs);
    } catch (e: any) {
      setRunsError(e?.message ?? "Failed to load runs");
    } finally {
      setRunsLoading(false);
    }
  }

  async function handleDeleteCohort() {
    if (!canDelete) return;

    setDeleteBusy(true);
    setDeleteError(null);

    try {
      await deleteCohort(cohortKey);

      // Clear all UI state tied to the cohort
      setDocs([]);
      setRuns([]);
      setRun(null);
      setPoints([]);
      setSelected(null);

      setTab("details");
      setHerd(null);
      setHerdError(null);
      setHerdLoading(false);

      setRerunError(null);
      setRunsError(null);
    } catch (e: any) {
      setDeleteError(e?.message ?? "Failed to delete cohort");
    } finally {
      setDeleteBusy(false);
    }
  }

  // When cohort changes, refresh docs + runs, clear stale errors
  useEffect(() => {
    setDeleteError(null);
    setRunsError(null);
    setRerunError(null);
    refreshDocs();
    refreshRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortKey]);

  async function kickRun() {
    const r = await startRun(cohortKey);
    setRun(r);
    setPoints([]);
    setSelected(null);

    setTab("details");
    setHerd(null);
    setHerdError(null);
    setHerdLoading(false);

    setRerunError(null);
    syncUmapInputsFromRun(r);
    await refreshRuns();
  }

  async function selectRun(runId: number) {
    const chosen = runs.find((x) => x.id === runId);
    if (!chosen) return;

    setRun(chosen);
    setPoints([]);
    setSelected(null);

    setTab("details");
    setHerd(null);
    setHerdError(null);
    setHerdLoading(false);

    setRerunError(null);
    syncUmapInputsFromRun(chosen);

    if (chosen.status === "done") {
      const p = await getProjection(chosen.id, view);
      setPoints(p);
    }
  }

  async function handleRerun() {
    if (!run?.id) return;
    if (run.status !== "done") return;

    setRerunBusy(true);
    setRerunError(null);

    try {
      const newRun = await rerun(
        run.id,
        { n_neighbors: umapNeighbors, min_dist: umapMinDist },
        `rerun nn=${umapNeighbors} md=${umapMinDist}`
      );

      setRun(newRun);
      setPoints([]);
      setSelected(null);

      setTab("details");
      setHerd(null);
      setHerdError(null);
      setHerdLoading(false);

      await refreshRuns();
      syncUmapInputsFromRun(newRun);
    } catch (e: any) {
      setRerunError(e?.message ?? "Failed to rerun");
    } finally {
      setRerunBusy(false);
    }
  }

  // Poll run status while running; when done, fetch projection for current view.
  useEffect(() => {
    if (!run?.id) return;

    let timer: any = null;
    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      const r2 = await getRun(run.id);
      if (cancelled) return;

      setRun(r2);

      if (r2.status === "done") {
        const p = await getProjection(run.id, view);
        if (!cancelled) {
          setPoints(p);
          setSelected(null);
        }
        return;
      }

      if (r2.status === "failed") return;

      timer = setTimeout(poll, 1500);
    }

    if (run.status !== "done" && run.status !== "failed") {
      poll();
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // NOTE: don't include `view` here, or polling restarts on view change
  }, [run?.id]);

  // If view changes and the run is already done, refetch projection for that section.
  useEffect(() => {
    if (!run?.id) return;
    if (run.status !== "done") return;

    let cancelled = false;
    (async () => {
      const p = await getProjection(run.id, view);
      if (!cancelled) {
        setPoints(p);
        setSelected(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [run?.id, run?.status, view]);

  // Herd phrases: fetch when run is done AND (tab is herd OR we haven't fetched yet).
  useEffect(() => {
    if (!run?.id) return;
    if (run.status !== "done") return;

    if (tab !== "herd" && herd !== null) return;

    let cancelled = false;
    (async () => {
      setHerdLoading(true);
      setHerdError(null);
      try {
        const data = await getHerd(run.id);
        const bigrams = Array.isArray(data?.bigrams) ? data.bigrams : [];
        if (!cancelled) setHerd(bigrams);
      } catch (e: any) {
        if (!cancelled) setHerdError(e?.message ?? "Failed to load herd phrases");
      } finally {
        if (!cancelled) setHerdLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [run?.id, run?.status, tab]);

  const meta = formatRunMeta(run);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Cohort Similarity Map</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Cohort key:&nbsp;
          <input value={cohortKey} onChange={(e) => setCohortKey(e.target.value)} />
        </label>

        <button onClick={refreshDocs}>Refresh docs</button>
        <button onClick={kickRun}>Start analysis</button>

        <label>
          Run:&nbsp;
          <select
            value={run?.id ?? ""}
            onChange={(e) => selectRun(Number(e.target.value))}
            disabled={runsLoading || runs.length === 0}
          >
            <option value="" disabled>
              {runsLoading ? "Loading runs..." : runs.length ? "Select a run" : "No runs yet"}
            </option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} [{r.status}] {r.label ? `— ${r.label}` : ""}
              </option>
            ))}
          </select>
        </label>

        {run ? <span style={{ marginLeft: 6 }}>{statusBadge(run.status)}</span> : null}

        <label>
          View:&nbsp;
          <select value={view} onChange={(e) => setView(e.target.value as ViewSection)}>
            <option value="doc">Full document</option>
            <option value="skills">Skills only</option>
            <option value="experience">Experience only</option>
          </select>
        </label>

        <label>
          n_neighbors:&nbsp;
          <input
            type="number"
            min={2}
            max={200}
            value={umapNeighbors}
            onChange={(e) => setUmapNeighbors(Number(e.target.value))}
            style={{ width: 80 }}
            disabled={!run?.id}
          />
        </label>

        <label>
          min_dist:&nbsp;
          <input
            type="number"
            step={0.01}
            min={0}
            max={1}
            value={umapMinDist}
            onChange={(e) => setUmapMinDist(Number(e.target.value))}
            style={{ width: 80 }}
            disabled={!run?.id}
          />
        </label>

        <button
          onClick={handleRerun}
          disabled={!run?.id || run.status !== "done" || rerunBusy}
          title={
            !run?.id
              ? "Select a run first"
              : run.status !== "done"
              ? "Run must finish before rerunning with new UMAP params"
              : ""
          }
        >
          {rerunBusy ? "Rerunning..." : "Rerun"}
        </button>

        {/* UX safety: disable delete unless cohort actually has something */}
        <div style={{ opacity: canDelete ? 1 : 0.6 }}>
          <DangerConfirm
            label="Delete cohort"
            warningTitle="Delete cohort permanently"
            warningBody={`This will permanently delete ALL uploaded documents, embeddings, projections, and runs for cohort "${cohortKey}". This cannot be undone.`}
            confirmPhrase={`delete ${cohortKey}`}
            onConfirm={handleDeleteCohort}
            busy={deleteBusy}
          />
        </div>
      </div>

      {runsError ? <div style={{ marginTop: 10, color: "crimson" }}>{runsError}</div> : null}
      {rerunError ? <div style={{ marginTop: 10, color: "crimson" }}>{rerunError}</div> : null}
      {deleteError ? <div style={{ marginTop: 10, color: "crimson" }}>{deleteError}</div> : null}

      <div style={{ marginTop: 12 }}>
        <UploadBox
          cohortKey={cohortKey}
          onUploaded={async () => {
            await refreshDocs();
            await refreshRuns();
          }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <b>Docs:</b> {docs.length} &nbsp;
        {run ? (
          <>
            | <b>Run:</b> {run.id} {statusBadge(run.status)}
          </>
        ) : null}
        {run?.error ? <div style={{ color: "crimson" }}>{run.error}</div> : null}

        {meta ? (
          <div style={{ marginTop: 6, fontSize: 13, color: "#444" }}>
            <div>
              <b>Created:</b> {meta.created}
            </div>
            <div>
              <b>Embedding model:</b> {meta.model}
            </div>
            <div>
              <b>UMAP:</b> n_neighbors={meta.nn}, min_dist={meta.md}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div>
          {points.length ? (
            <ScatterMap points={points} onSelect={(id) => setSelected(id)} />
          ) : (
            <div style={{ border: "1px dashed #bbb", padding: 24, borderRadius: 8 }}>
              {run?.status === "done"
                ? `No points available for view "${view}". Try uploading more documents or switch views.`
                : "Upload documents and click “Start analysis” to generate the map."}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setTab("details")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: tab === "details" ? "#f3f3f3" : "white",
              }}
            >
              Details
            </button>

            <button
              onClick={() => setTab("herd")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: tab === "herd" ? "#f3f3f3" : "white",
              }}
              disabled={!run?.id || run.status !== "done"}
              title={!run?.id || run.status !== "done" ? "Run an analysis to view herd phrases" : ""}
            >
              Herd phrases
            </button>
          </div>

          {tab === "details" ? (
            run?.id ? (
              <DocPanel runId={run.id} docId={selected} section={view} />
            ) : (
              <div>Start a run to enable details.</div>
            )
          ) : (
            <HerdPanel herd={herd} loading={herdLoading} error={herdError} />
          )}
        </div>
      </div>
    </div>
  );
}
