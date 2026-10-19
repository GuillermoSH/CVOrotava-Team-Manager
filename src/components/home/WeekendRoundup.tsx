import { shortDate } from "@/components/stats/competitive/format";
import type { RoundupMatch, WeekendRoundup as Roundup } from "@/lib/home/weekendRoundup";

function Row({ m }: Readonly<{ m: RoundupMatch }>) {
  const homeWon = m.homeSets > m.awaySets;
  const side = (name: string, won: boolean, align: string) => (
    <span className={`min-w-0 truncate ${align} ${won ? "font-semibold" : "text-[var(--text-secondary)]"}`}>
      {name}
    </span>
  );
  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 py-2.5 text-sm ${
        m.ours ? "rounded-lg bg-[var(--accent-muted)]" : ""
      }`}
    >
      {side(m.home, homeWon, "text-right")}
      <span className="rounded-md bg-[var(--surface-faint)] px-2 py-0.5 text-center font-bold tabular-nums ring-1 ring-inset ring-[var(--glass-border)]">
        {m.homeSets} – {m.awaySets}
      </span>
      {side(m.away, !homeWon, "text-left")}
    </li>
  );
}

export default function WeekendRoundup({ roundup }: Readonly<{ roundup: Roundup }>) {
  const { ours, others, othersSwept } = roundup;
  const range =
    roundup.dateFrom === roundup.dateTo
      ? shortDate(roundup.dateFrom)
      : `${shortDate(roundup.dateFrom)} – ${shortDate(roundup.dateTo)}`;

  return (
    <section className="@container">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Así quedó la jornada</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {roundup.roundLabel ? `${roundup.roundLabel} · ` : ""}
          {range}
        </p>
      </div>
      <ul className="grid gap-x-6 gap-y-0.5 @3xl:grid-cols-2">
        <Row m={ours} />
        {others.map((m) => (
          <Row key={m.id} m={m} />
        ))}
      </ul>
      <p className="mt-3 border-t border-[var(--glass-border)] pt-3 text-sm text-[var(--text-muted)]">
        {others.length === 0
          ? "No hay más partidos jugados en esta jornada."
          : `${othersSwept} de ${others.length} partido${others.length === 1 ? "" : "s"} de la jornada acabaron sin ceder ningún set.`}
      </p>
    </section>
  );
}
