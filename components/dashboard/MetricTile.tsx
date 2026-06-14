interface MetricTileProps {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}

export function MetricTile({
  label,
  value,
  accent = "#ff5a4d",
  sub,
}: MetricTileProps) {
  return (
    <div
      className="accent-rule rounded-xl border border-ink-line bg-ink-panel p-5"
      style={{ ["--rule" as any]: accent }}
    >
      <p className="text-xs uppercase tracking-wide text-cloud-faint">
        {label}
      </p>
      <p className="mt-3 font-mono text-3xl font-semibold text-cloud tnum">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-cloud-muted">{sub}</p> : null}
    </div>
  );
}
