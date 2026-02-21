"use client";

import React from "react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  title,
  right,
  children,
  className,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "bg-neutral-900/70 border border-neutral-800 rounded-2xl shadow-sm",
        "backdrop-blur supports-[backdrop-filter]:bg-neutral-900/50",
        className
      )}
    >
      {title ? (
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="text-sm font-medium text-neutral-200">{title}</div>
          {right ? <div className="text-xs text-neutral-400">{right}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Button({
  variant = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "danger" | "dangerSolid";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium " +
    "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "dangerSolid"
      ? "bg-red-600/80 hover:bg-red-600 text-white border border-red-700/60"
      : variant === "danger"
      ? "bg-red-500/10 text-red-300 hover:bg-red-500/15 border border-red-900/40"
      : variant === "ghost"
      ? "bg-transparent hover:bg-neutral-800/60 text-neutral-200 border border-neutral-800"
      : "bg-neutral-800/70 hover:bg-neutral-700/70 text-neutral-100 border border-neutral-700";

  return <button className={cx(base, styles, className)} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "h-9 w-full rounded-lg bg-neutral-950/40 border border-neutral-800 px-3 text-sm text-neutral-100",
        "placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "h-9 rounded-lg bg-neutral-950/40 border border-neutral-800 px-3 text-sm text-neutral-100",
        "focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:opacity-50",
        props.className
      )}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-neutral-400">{children}</div>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-900/40"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-300 border-amber-900/40"
      : tone === "bad"
      ? "bg-red-500/10 text-red-300 border-red-900/40"
      : "bg-neutral-800/60 text-neutral-200 border-neutral-700";
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs", toneClass)}>
      {children}
    </span>
  );
}

export function Tabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean; title?: string }>;
}) {
  return (
    <div className="inline-flex rounded-xl border border-neutral-800 bg-neutral-950/30 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          disabled={o.disabled}
          title={o.title}
          className={cx(
            "px-3 py-1.5 text-sm rounded-lg transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            value === o.value ? "bg-neutral-800 text-neutral-100" : "text-neutral-300 hover:bg-neutral-900/60"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx("animate-pulse rounded-lg bg-neutral-800/60", className)} />
  );
}
