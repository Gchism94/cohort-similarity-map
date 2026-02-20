"use client";

import React, { useState } from "react";

export function DangerConfirm({
  label,
  warningTitle,
  warningBody,
  confirmPhrase,
  onConfirm,
  busy,
}: {
  label: string;
  warningTitle: string;
  warningBody: string;
  confirmPhrase: string;
  onConfirm: () => Promise<void>;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const canConfirm = text.trim() === confirmPhrase && !busy;

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #f0b4b4",
          background: "#fff5f5",
          color: "#b42318",
          fontWeight: 600,
        }}
        title="Danger: irreversible"
      >
        {label}
      </button>

      {open ? (
        <div
          style={{
            marginTop: 10,
            border: "1px solid #f0b4b4",
            background: "#fff5f5",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 800, color: "#b42318", marginBottom: 6 }}>
            {warningTitle}
          </div>
          <div style={{ fontSize: 13, color: "#7a271a", marginBottom: 10 }}>
            {warningBody}
          </div>

          <div style={{ fontSize: 12, color: "#7a271a", marginBottom: 6 }}>
            Type <b>{confirmPhrase}</b> to confirm.
          </div>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={confirmPhrase}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #f0b4b4",
              marginBottom: 10,
            }}
            disabled={busy}
          />

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                setOpen(false);
                setText("");
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "white",
              }}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              onClick={async () => {
                await onConfirm();
                setOpen(false);
                setText("");
              }}
              disabled={!canConfirm}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #b42318",
                background: canConfirm ? "#b42318" : "#f0b4b4",
                color: "white",
                fontWeight: 700,
              }}
            >
              {busy ? "Deleting..." : "Delete permanently"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
