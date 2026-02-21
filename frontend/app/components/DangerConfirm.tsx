"use client";

import React, { useState } from "react";
import { Button, Input, cx } from "../components/ui";

export function DangerConfirm({
  label,
  warningTitle,
  warningBody,
  confirmPhrase,
  onConfirm,
  busy,
  className,
}: {
  label: string;
  warningTitle: string;
  warningBody: string;
  confirmPhrase: string;
  onConfirm: () => Promise<void>;
  busy: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const canConfirm = text.trim() === confirmPhrase && !busy;

  return (
    <div className={cx("inline-block", className)}>
      <Button
        variant="danger"
        onClick={() => setOpen(true)}
        disabled={busy}
        title="Danger: irreversible"
      >
        {label}
      </Button>

      {open ? (
        <div className="mt-3 rounded-2xl border border-red-900/40 bg-red-500/10 p-4">
          <div className="text-sm font-semibold text-red-200">{warningTitle}</div>
          <div className="mt-2 text-sm text-red-200/80">{warningBody}</div>

          <div className="mt-4 text-xs text-red-200/80">
            Type <span className="font-semibold text-red-100">{confirmPhrase}</span> to confirm.
          </div>

          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={confirmPhrase}
            disabled={busy}
            className="mt-2 border-red-900/40 focus:ring-red-400/30"
          />

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setText("");
              }}
              disabled={busy}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              onClick={async () => {
                await onConfirm();
                setOpen(false);
                setText("");
              }}
              disabled={!canConfirm}
              className={cx(
                canConfirm
                  ? "bg-red-600/80 hover:bg-red-600 text-white border border-red-700/60"
                  : "bg-red-500/20 text-red-200 border border-red-900/30 hover:bg-red-500/20"
              )}
            >
              {busy ? "Deleting..." : "Delete permanently"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}