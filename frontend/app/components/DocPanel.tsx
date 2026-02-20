"use client";

import React, { useEffect, useState } from "react";
import { getDocDetail } from "../app/api/client";

export function DocPanel({ runId, docId, section }: { runId: number; docId: number | null; section: "doc" | "skills" | "experience" }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    (async () => {
      const d = await getDocDetail(runId, docId, section, 5);
      if (!cancelled) setData(d);
    })();
    return () => { cancelled = true; };
  }, [runId, docId, section]);

  if (!docId) return <div>Select a point to see nearest neighbors.</div>;
  if (!data) return <div>Loading neighbors...</div>;

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <div><b>Selected doc:</b> {docId}</div>
      <div><b>View:</b> {section}</div>
      <div style={{ marginTop: 8 }}><b>Nearest neighbors</b></div>
      <ul>
        {data.neighbors.map((n: any) => (
          <li key={n.id}>
            {n.filename} — cosine distance: {n.cosine_distance.toFixed(4)}
          </li>
        ))}
      </ul>
    </div>
  );
}
