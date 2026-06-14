"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface AgeGenderRow {
  age: string;
  female: number;
  male: number;
  other: number;
}

export function DemographicsChart({ data }: { data: AgeGenderRow[] }) {
  if (!data.length) {
    return (
      <p className="px-5 py-6 text-sm text-cloud-muted">
        Audience demographics aren’t available for this range (YouTube hides
        them below a viewer threshold).
      </p>
    );
  }

  return (
    <div className="h-72 w-full px-2 pb-4 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#2a2f3c" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="age"
            tick={{ fill: "#646c7d", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#2a2f3c" }}
          />
          <YAxis
            tick={{ fill: "#646c7d", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#1d212c",
              border: "1px solid #2a2f3c",
              borderRadius: 10,
              color: "#e8eaf0",
              fontSize: 12,
            }}
            formatter={(v: number, n) => [`${v.toFixed(1)}%`, n]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#9aa3b2" }}
            iconType="circle"
          />
          <Bar dataKey="female" name="Female" fill="#e06bd6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="male" name="Male" fill="#39d3c3" radius={[3, 3, 0, 0]} />
          <Bar dataKey="other" name="Other" fill="#f5b942" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
