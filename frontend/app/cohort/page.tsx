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
import { UploadBox } from "../components/UploadBox";
import { ScatterMap } from "../components/ScatterMap";
import { DocPanel } from "../components/DocPanel";
import { HerdPanel } from "../components/HerdPanel";
import { DangerConfirm } from "../components/DangerConfirm";
import { Card, Button, Input, Select, Label, Tabs, Badge } from "../components/ui";

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
      if (!status) return <span className="text-neutral-500">—</span>;
      const tone = status === "done" ? "good" : status === "running" ? "warn" : status === "failed" ? "bad" : "neutral";
      const icon = status === "done" ? "🟢" : status === "running" ? "🟡" : status === "failed" ? "🔴" : "⚪";
      return <Badge tone={tone}>{icon} {status}</Badge>;
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
  <div className="min-h-screen bg-neutral-950 text-neutral-100">
    {/* Header */}
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Cohort Similarity Map</h1>
            <p className="text-xs text-neutral-400">
              Upload resumes → embed → UMAP projection → inspect clusters & herd phrases
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {run ? (
              <div className="flex items-center gap-2">
                {statusBadge(run.status)}
                <Badge>
                  Run #{run.id}
                </Badge>
              </div>
            ) : (
              <span className="text-xs text-neutral-500">No run selected</span>
            )}
          </div>
        </div>

        {/* Controls row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <Label>Cohort key</Label>
            <Input value={cohortKey} onChange={(e) => setCohortKey(e.target.value)} placeholder="default" />
          </div>

          <div className="md:col-span-3">
            <Label>Run</Label>
            <Select
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
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>View</Label>
            <Select value={view} onChange={(e) => setView(e.target.value as ViewSection)}>
              <option value="doc">Full document</option>
              <option value="skills">Skills only</option>
              <option value="experience">Experience only</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>n_neighbors</Label>
            <Input
              type="number"
              min={2}
              max={200}
              value={umapNeighbors}
              onChange={(e) => setUmapNeighbors(Number(e.target.value))}
              disabled={!run?.id}
            />
          </div>

          <div className="md:col-span-2">
            <Label>min_dist</Label>
            <Input
              type="number"
              step={0.01}
              min={0}
              max={1}
              value={umapMinDist}
              onChange={(e) => setUmapMinDist(Number(e.target.value))}
              disabled={!run?.id}
            />
          </div>

          <div className="md:col-span-12 flex items-center gap-2 flex-wrap pt-1">
            <Button onClick={refreshDocs} variant="ghost">Refresh docs</Button>
            <Button onClick={kickRun}>Start analysis</Button>

            <Button
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
            </Button>

            <div className={canDelete ? "" : "opacity-60"}>
              <div className="mt-4 border-t border-red-900/30 pt-4">
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

            {/* Errors in a consistent style */}
            {runsError ? <span className="text-sm text-red-300">{runsError}</span> : null}
            {rerunError ? <span className="text-sm text-red-300">{rerunError}</span> : null}
            {deleteError ? <span className="text-sm text-red-300">{deleteError}</span> : null}
          </div>
        </div>
      </div>
    </header>

    {/* Main */}
    <main className="mx-auto max-w-6xl p-6 space-y-4">
      {run?.id ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-3">
          <div className="flex items-center gap-2">
            {statusBadge(run.status)}
            <span className="text-sm text-neutral-200">
              Run <span className="text-neutral-100 font-medium">#{run.id}</span>
            </span>
            {meta ? (
              <span className="text-xs text-neutral-500">
                · {meta.model} · nn={meta.nn} md={meta.md}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-neutral-400">
            {run.status === "running" ? "Processing…" : run.status === "queued" ? "Queued…" : run.status === "done" ? "Ready" : "Failed"}
          </div>
        </div>
      ) : null}
      <Card title="Upload documents">
        <UploadBox
          cohortKey={cohortKey}
          onUploaded={async () => {
            await refreshDocs();
            await refreshRuns();
          }}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scatter */}
        <div className="lg:col-span-2">
          <Card
            title="Projection"
            right={
              <span className="text-xs text-neutral-400">
                Docs: <span className="text-neutral-200">{docs.length}</span>
                {run ? (
                  <>
                    {" "}· Run: <span className="text-neutral-200">#{run.id}</span>
                  </>
                ) : null}
              </span>
            }
          >
            {meta ? (
              <div className="mb-3 text-xs text-neutral-400 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-neutral-500">Created</span>
                  <div className="text-neutral-200">{meta.created}</div>
                </div>
                <div>
                  <span className="text-neutral-500">Embedding</span>
                  <div className="text-neutral-200">{meta.model}</div>
                </div>
                <div>
                  <span className="text-neutral-500">UMAP</span>
                  <div className="text-neutral-200">nn={meta.nn}, md={meta.md}</div>
                </div>
              </div>
            ) : null}

            {run?.error ? <div className="mb-3 text-sm text-red-300">{run.error}</div> : null}

            {points.length ? (
              <div className="h-[640px] rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950/30">
                <ScatterMap points={points} onSelect={(id) => setSelected(id)} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-950/30 p-10 text-sm text-neutral-400">
                {run?.status === "done"
                  ? `No points available for view "${view}". Try uploading more documents or switch views.`
                  : "Upload documents and click “Start analysis” to generate the map."}
              </div>
            )}
          </Card>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card
            title="Inspector"
            right={
              run?.id ? (
                <span className="text-xs text-neutral-400">Selected: {selected ?? "—"}</span>
              ) : (
                <span className="text-xs text-neutral-500">Start a run to enable</span>
              )
            }
            className="h-[640px] flex flex-col"
          >
            <div className="shrink-0">
              <Tabs
                value={tab}
                onChange={(v) => setTab(v as RightTab)}
                options={[
                  { value: "details", label: "Details" },
                  {
                    value: "herd",
                    label: "Herd phrases",
                    disabled: !run?.id || run.status !== "done",
                    title: !run?.id || run.status !== "done" ? "Run an analysis to view herd phrases" : "",
                  },
                ]}
              />
            </div>

            <div className="mt-4 grow overflow-auto pr-1">
              {tab === "details" ? (
                run?.id ? (
                  <DocPanel runId={run.id} docId={selected} section={view} />
                ) : (
                  <div className="text-sm text-neutral-400">Start a run to enable details.</div>
                )
              ) : (
                <HerdPanel herd={herd} loading={herdLoading} error={herdError} />
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  </div>
);
