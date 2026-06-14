"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TimePoint {
  date: string;
  views: number;
  watchTime: number;
}

export function ViewsChart({ data }: { data: TimePoint[] }) {
  return (
    <div className="h-72 w-full px-2 pb-4 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5a4d" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#ff5a4d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2a2f3c" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#646c7d", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#2a2f3c" }}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: "#646c7d", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v) =>
              new Intl.NumberFormat("en", { notation: "compact" }).format(v)
            }
          />
          <Tooltip
            contentStyle={{
              background: "#1d212c",
              border: "1px solid #2a2f3c",
              borderRadius: 10,
              color: "#e8eaf0",
              fontSize: 12,
            }}
            labelStyle={{ color: "#9aa3b2" }}
            formatter={(value: number, name) => [
              new Intl.NumberFormat("en").format(value),
              name === "views" ? "Views" : "Watch time (min)",
            ]}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke="#ff5a4d"
            strokeWidth={2}
            fill="url(#vGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
