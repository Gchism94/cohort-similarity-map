"use client";

import React, { useRef, useState } from "react";
import { uploadFile } from "../api/client";
import { Button, Badge, cx } from "../components/ui";

export function UploadBox({
  cohortKey,
  onUploaded,
}: {
  cohortKey: string;
  onUploaded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setBusy(true);
    try {
      await uploadFile(f, cohortKey);
      onUploaded();
    } finally {
      setBusy(false);
      // reset file input so the same file can be re-uploaded if needed
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cx(
          "rounded-xl border border-neutral-800 bg-neutral-950/30 p-4",
          "flex items-center justify-between gap-3 flex-wrap"
        )}
      >
        <div className="min-w-[220px]">
          <div className="text-sm font-medium text-neutral-200">Upload resume(s)</div>
          <div className="text-xs text-neutral-400">
            Accepted: <span className="text-neutral-300">.pdf</span>,{" "}
            <span className="text-neutral-300">.docx</span>,{" "}
            <span className="text-neutral-300">.txt</span>
            <span className="text-neutral-500"> · </span>
            Cohort: <span className="text-neutral-300">{cohortKey}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {busy ? <Badge tone="warn">Uploading…</Badge> : <Badge>Ready</Badge>}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handlePickFile}
            disabled={busy}
            className="hidden"
          />

          <Button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            variant={busy ? "ghost" : "default"}
          >
            {busy ? "Uploading…" : "Choose file"}
          </Button>
        </div>
      </div>

      <div className="text-xs text-neutral-500">
        Tip: Upload a few documents first, then click <span className="text-neutral-300">Start analysis</span>.
      </div>
    </div>
  );
}