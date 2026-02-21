"use client";

import React, { useState } from "react";
import { uploadFile } from "../api/client";

export function UploadBox({ cohortKey, onUploaded }: { cohortKey: string; onUploaded: () => void }) {
  const [busy, setBusy] = useState(false);

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <input
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            await uploadFile(f, cohortKey);
            onUploaded();
          } finally {
            setBusy(false);
            e.currentTarget.value = "";
          }
        }}
      />
      {busy ? <div style={{ marginTop: 8 }}>Uploading...</div> : null}
    </div>
  );
}
