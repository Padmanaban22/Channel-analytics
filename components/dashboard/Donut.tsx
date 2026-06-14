"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SERIES_COLORS, formatCompact } from "@/lib/metrics";

export interface DonutDatum {
  label: string;
  value: number;
}

export function Donut({ data }: { data: DonutDatum[] }) {
  if (!data.length) {
    return (
      <p className="px-5 py-6 text-sm text-cloud-muted">
        No data in this range.
      </p>
    );
  }
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="flex flex-col items-center gap-4 px-5 pb-5 pt-2 sm:flex-row">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#1d212c",
                border: "1px solid #2a2f3c",
                borderRadius: 10,
                color: "#e8eaf0",
                fontSize: 12,
              }}
              formatter={(v: number, n) => [formatCompact(v), n]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex w-full flex-col gap-1.5">
        {data.map((d, i) => (
          <li
            key={d.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2 text-cloud">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
              />
              {d.label}
            </span>
            <span className="font-mono text-cloud-muted tnum">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
