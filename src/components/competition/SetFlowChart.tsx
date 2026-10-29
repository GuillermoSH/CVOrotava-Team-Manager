import type { ReportSet, ReportSide, ReportScore } from "@/lib/competition/report";
import { setFlow } from "@/lib/competition/rallies";

const W = 640;
const H = 150;
const PAD = { l: 34, r: 10, t: 12, b: 20 };

/** Marcador en el desarrollo del set (local − visitante) tras cada jugada, con los tiempos muertos y los cambios marcados. */
export default function SetFlowChart({ set, home, away }: Readonly<{ set: ReportSet; home: string; away: string }>) {
  const rallies = set.rallies;
  if (!rallies) return null;
  const flow = setFlow(rallies, "home", set.number);
  const n = rallies.winners.length;
  const diffs = flow.scores.map((s) => s.own - s.opp);
  const span = Math.max(6, ...diffs.map(Math.abs));
  const x = (k: number) => PAD.l + (k / Math.max(1, n)) * (W - PAD.l - PAD.r);
  const y = (d: number) => PAD.t + ((span - d) / (2 * span)) * (H - PAD.t - PAD.b);
  const path = diffs.map((d, k) => `${k === 0 ? "M" : "L"}${x(k).toFixed(1)} ${y(d).toFixed(1)}`).join(" ");

  /** Posición del evento en el set: su marcador visto desde el local; null si no cuadra con lo reconstruido. */
  const at = (side: ReportSide, sc: ReportScore): number | null => {
    const own = side === "home" ? sc.own : sc.opp;
    const opp = side === "home" ? sc.opp : sc.own;
    const s = flow.scores[own + opp];
    return s && s.own === own && s.opp === opp ? own + opp : null;
  };
  const markers = (["home", "away"] as const).flatMap((side) => [
    ...set[side].timeouts.map((t, i) => ({ k: at(side, t), side, kind: "t" as const, key: `${side}t${i}` })),
    ...set[side].substitutions.map((s, i) => ({ k: at(side, s.scoreIn), side, kind: "s" as const, key: `${side}s${i}` })),
  ]);

  const gridDiffs = [-span, 0, span].filter((v, i, a) => a.indexOf(v) === i);
  const label = (side: ReportSide) => (side === "home" ? home : away);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" className="h-auto w-full" aria-label={`Desarrollo del set ${set.number}: ${set.home.points} a ${set.away.points}. Línea por encima del centro: ventaja de ${home}.`}>
        {gridDiffs.map((d) => (
          <g key={d}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(d)} y2={y(d)} stroke="var(--glass-border)" strokeDasharray={d === 0 ? undefined : "3 4"} />
            <text x={PAD.l - 6} y={y(d) + 3} textAnchor="end" fontSize="10" fill="var(--text-muted)">
              {d > 0 ? `+${d}` : d}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        {markers.map(({ k, side, kind, key }) =>
          k === null ? null : (
            <g key={key}>
              <line x1={x(k)} x2={x(k)} y1={kind === "t" ? PAD.t : H - PAD.b - 7} y2={kind === "t" ? y(diffs[k]) : H - PAD.b} stroke={side === "home" ? "var(--accent)" : "var(--text-secondary)"} strokeOpacity="0.45" />
              <circle cx={x(k)} cy={y(diffs[k])} r={kind === "t" ? 4 : 2.5} fill={kind === "t" ? (side === "home" ? "var(--accent)" : "var(--text-secondary)") : "none"} stroke={side === "home" ? "var(--accent)" : "var(--text-secondary)"}>
                <title>{`${kind === "t" ? "Tiempo muerto" : "Cambio"} de ${label(side)}`}</title>
              </circle>
            </g>
          )
        )}
        <text x={PAD.l} y={H - 4} fontSize="10" fill="var(--text-muted)">
          Jugada 0
        </text>
        <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
          {n} jugadas
        </text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
        <span>↑ ventaja de {home}</span>
        <span>↓ ventaja de {away}</span>
        <span>● tiempo muerto</span>
        <span>○ cambio</span>
      </figcaption>
    </figure>
  );
}
