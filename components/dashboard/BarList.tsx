"use client";

import { formatCompact } from "@/lib/metrics";

export interface BarItem {
  label: string;
  value: number;
}

export function BarList({
  items,
  color = "#ff5a4d",
  unit,
}: {
  items: BarItem[];
  color?: string;
  unit?: string;
}) {
  if (!items.length) {
    return (
      <p className="px-5 py-6 text-sm text-cloud-muted">
        No data in this range.
      </p>
    );
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex flex-col gap-2 px-5 pb-5 pt-3">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-cloud">{item.label}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-ink-raised">
              <div
                className="h-full rounded"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: color,
                }}
              />
            </div>
          </div>
          <span className="font-mono text-sm text-cloud-muted tnum">
            {formatCompact(item.value)}
            {unit ? ` ${unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
