import * as React from "react";

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-ink-line bg-ink-panel ${className}`}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between px-5 pt-4">
      <h3 className="text-sm font-medium text-cloud">{title}</h3>
      {hint ? <span className="text-xs text-cloud-faint">{hint}</span> : null}
    </div>
  );
}
