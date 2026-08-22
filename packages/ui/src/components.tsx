import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "ghost";
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={`ms-btn ms-btn-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "income" | "expense" | "accent";
}) {
  return (
    <article className={`ms-card metric-card metric-${tone}`}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </article>
  );
}

export function StatusChip({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return <span className={`status-chip status-${tone}`}>{label}</span>;
}

export function EmptyState({
  title,
  body,
  action,
  imageSrc,
  imageAlt
}: {
  title: string;
  body: string;
  action?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <section className="ms-card empty-state">
      {imageSrc ? <img className="empty-photo" src={imageSrc} alt={imageAlt ?? ""} /> : null}
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}
