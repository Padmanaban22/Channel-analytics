"use client";

import { labelFor, formatMetricValue } from "@/lib/metrics";

export function MetricsGrid({
  values,
  order,
}: {
  values: Record<string, number>;
  order: string[];
}) {
  const present = order.filter((k) => k in values);
  if (!present.length) {
    return (
      <p className="px-5 py-6 text-sm text-cloud-muted">No metrics available.</p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 pb-5 pt-3 sm:grid-cols-3 lg:grid-cols-4">
      {present.map((k) => (
        <div key={k}>
          <p className="text-xs uppercase tracking-wide text-cloud-faint">
            {labelFor(k)}
          </p>
          <p className="mt-1 font-mono text-lg text-cloud tnum">
            {formatMetricValue(k, values[k])}
          </p>
        </div>
      ))}
    </div>
  );
}
