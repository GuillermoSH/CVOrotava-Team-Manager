"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import { ordinal } from "@/components/stats/competitive/format";

type Row = Record<string, number>;

function RaceTooltip({
  active,
  label,
  payload,
  names,
  oursKey,
}: {
  active?: boolean;
  label?: number;
  payload?: { dataKey?: string; value?: number }[];
  names: Record<string, string>;
  oursKey: string | null;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload
    .filter((p) => typeof p.value === "number")
    .map((p) => ({ key: String(p.dataKey), pos: p.value as number }))
    .sort((a, b) => a.pos - b.pos);
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-[var(--text-primary)]">Jornada {label}</p>
      <ol className="space-y-0.5">
        {rows.map((r) => (
          <li
            key={r.key}
            className={`flex gap-2 tabular-nums ${r.key === oursKey ? "font-bold text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}
          >
            <span className="w-5 text-right">{r.pos}</span>
            <span>{prettyTeamName(names[r.key] ?? "")}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Puesto de cada equipo tras cada jornada. Si el club juega en el grupo, su línea va en el color
 * de la marca y las demás atenuadas.
 */
export default function PositionRace({
  rounds,
  teams,
  ourId,
}: Readonly<{
  rounds: { round: number; positions: Record<number, number> }[];
  teams: { id: number; name: string }[];
  ourId: number | null;
}>) {
  if (rounds.length < 2) return null;

  const key = (id: number) => `t${id}`;
  const names = Object.fromEntries(teams.map((t) => [key(t.id), t.name]));
  const data: Row[] = rounds.map((r) => ({
    round: r.round,
    ...Object.fromEntries(teams.map((t) => [key(t.id), r.positions[t.id]])),
  }));

  let summary = "Evolución del puesto de cada equipo, jornada a jornada.";
  if (ourId !== null) {
    const ours = rounds.map((r) => r.positions[ourId]).filter((p): p is number => typeof p === "number");
    if (ours.length > 0) {
      summary = `Empezamos ${ordinal(ours[0])}, ahora ${ordinal(ours[ours.length - 1])}; mejor puesto ${ordinal(Math.min(...ours))}.`;
    }
  }

  return (
    <figure>
      <figcaption className="mb-3 text-sm text-[var(--text-secondary)]">{summary}</figcaption>
      <div className="h-[260px] w-full" role="img" aria-label={`Carrera de posiciones. ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-axis)" vertical={false} />
            <XAxis
              dataKey="round"
              tickFormatter={(r: number) => `J${r}`}
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              axisLine={{ stroke: "var(--chart-axis)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              reversed
              domain={[1, teams.length]}
              ticks={Array.from({ length: teams.length }, (_, i) => i + 1)}
              allowDecimals={false}
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<RaceTooltip names={names} oursKey={ourId !== null ? key(ourId) : null} />} />
            {teams
              .filter((t) => t.id !== ourId)
              .map((t) => (
                <Line
                  key={t.id}
                  dataKey={key(t.id)}
                  stroke="var(--text-muted)"
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ))}
            {ourId !== null ? (
              <Line
                dataKey={key(ourId)}
                stroke="var(--accent)"
                strokeWidth={3}
                dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
