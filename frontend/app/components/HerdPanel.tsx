"use client";

import React from "react";

type HerdPhrase = {
  phrase: string;
  count: number;
  doc_freq: number;
};

export function HerdPanel({
  herd,
  loading,
  error,
}: {
  herd: HerdPhrase[] | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <div>Loading herd phrases...</div>;
  if (error) return <div style={{ color: "crimson" }}>{error}</div>;
  if (!herd || herd.length === 0) {
    return <div>No herd phrases available yet. Run an analysis first.</div>;
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <div style={{ marginBottom: 8 }}>
        <b>Herd phrases</b> (top {herd.length})
      </div>

      <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
        Phrases that show up frequently across the cohort (bigrams after stopword filtering).
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: "6px 4px" }}>Phrase</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: "6px 4px" }}>Count</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: "6px 4px" }}>Doc freq</th>
            </tr>
          </thead>
          <tbody>
            {herd.map((p) => (
              <tr key={p.phrase}>
                <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f3f3" }}>{p.phrase}</td>
                <td style={{ padding: "6px 4px", textAlign: "right", borderBottom: "1px solid #f3f3f3" }}>
                  {p.count}
                </td>
                <td style={{ padding: "6px 4px", textAlign: "right", borderBottom: "1px solid #f3f3f3" }}>
                  {p.doc_freq}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
