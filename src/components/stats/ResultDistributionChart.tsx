"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Row = { result: string; count: number };

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs shadow-xl">
      <p className="text-[var(--text-secondary)]">{label}</p>
      <p className="font-semibold text-[var(--text-primary)]">
        {payload[0].value} partidos
      </p>
    </div>
  );
}

export default function ResultDistributionChart({ data }: { data: Row[] }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 2, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="result"
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
            axisLine={{ stroke: "var(--chart-axis)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "var(--chart-cursor)" }}
          />
          <Bar
            dataKey="count"
            fill="var(--accent)"
            radius={[5, 5, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
