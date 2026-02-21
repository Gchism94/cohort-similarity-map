"use client";

import React, { useEffect, useState } from "react";
import { getDocDetail } from "../api/client";

type Section = "doc" | "skills" | "experience";

export function DocPanel({
  runId,
  docId,
  section,
}: {
  runId: number;
  docId: number | null;
  section: Section;
}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;

    // Clear stale neighbors immediately
    setData(null);
    setError(null);

    (async () => {
      try {
        const d = await getDocDetail(runId, docId, section, 5);
        if (!cancelled) setData(d);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load neighbors");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runId, docId, section]);

  if (!docId) return <div>Select a point to see nearest neighbors.</div>;
  if (error) return <div style={{ color: "crimson" }}>{error}</div>;
  if (!data) return <div>Loading neighbors...</div>;

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <div>
        <b>Selected doc:</b> {docId}
      </div>
      <div>
        <b>View:</b> {section}
      </div>

      <div style={{ marginTop: 8 }}>
        <b>Nearest neighbors</b>
      </div>

      <ul>
        {data.neighbors?.map((n: any) => (
          <li key={n.id}>
            {n.filename} — cosine distance: {Number(n.cosine_distance).toFixed(4)}
          </li>
        ))}
      </ul>
    </div>
  );
}
