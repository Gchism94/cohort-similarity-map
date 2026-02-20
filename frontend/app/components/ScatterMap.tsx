"use client";

import dynamic from "next/dynamic";
import React from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type Point = {
  document_id: number;
  filename: string;
  x: number;
  y: number;
  cluster_id: number | null;
  outlier_score: number | null;
};

export function ScatterMap({
  points,
  onSelect
}: {
  points: Point[];
  onSelect: (docId: number) => void;
}) {
  const x = points.map(p => p.x);
  const y = points.map(p => p.y);
  const text = points.map(p => `${p.filename}<br/>cluster=${p.cluster_id ?? "n/a"}<br/>outlier=${p.outlier_score ?? "n/a"}`);

  return (
    <Plot
      data={[
        {
          x,
          y,
          type: "scatter",
          mode: "markers",
          text,
          hoverinfo: "text"
        } as any
      ]}
      layout={{
        title: "Cohort Similarity Map (UMAP)",
        height: 600,
        margin: { t: 50, l: 40, r: 20, b: 40 }
      }}
      onClick={(e: any) => {
        const idx = e?.points?.[0]?.pointIndex;
        if (idx !== undefined) onSelect(points[idx].document_id);
      }}
      style={{ width: "100%" }}
      config={{ displayModeBar: false }}
    />
  );
}
