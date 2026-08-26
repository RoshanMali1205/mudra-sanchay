import type { ReactNode } from "react";

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onCancel}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p className="muted">{body}</p>
        <button className="ms-btn ms-btn-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="ms-btn ms-btn-ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

export function SaveStatus({
  state,
  saved,
  saving,
  error
}: {
  state: "idle" | "saving" | "saved" | "error";
  saved: string;
  saving: string;
  error: string;
}) {
  if (state === "idle") return null;
  return (
    <p className={state === "error" ? "ms-error" : "muted"} aria-live="polite">
      {state === "saving" ? saving : state === "saved" ? saved : error}
    </p>
  );
}

export function DateRangePicker({
  preset,
  onPreset,
  from,
  to,
  onFrom,
  onTo,
  labels
}: {
  preset: string;
  onPreset: (value: string) => void;
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  labels: Record<string, string>;
}) {
  const presets = ["today", "week", "month", "quarter", "half_year", "year", "custom"];
  return (
    <div className="range-picker filters-panel">
      <div className="chip-row" role="group" aria-label="Date range">
        {presets.map((item) => (
          <button
            key={item}
            type="button"
            className={preset === item ? "chip active" : "chip"}
            onClick={() => onPreset(item)}
            aria-pressed={preset === item}
          >
            {labels[item] ?? item}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="row-between">
          <label className="ms-field">
            <span className="ms-label">From</span>
            <input type="date" value={from} onChange={(event) => onFrom(event.target.value)} />
          </label>
          <label className="ms-field">
            <span className="ms-label">To</span>
            <input type="date" value={to} onChange={(event) => onTo(event.target.value)} />
          </label>
        </div>
      ) : null}
    </div>
  );
}

export function EmptyHint({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <section className="ms-card empty-state">
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}
