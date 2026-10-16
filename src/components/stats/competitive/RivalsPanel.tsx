"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { CompetitiveStats } from "@/lib/stats/competitive/build";
import type { RivalEntry } from "@/lib/stats/competitive/rivals";
import { fullDate, ordinal, percent, whenLabel } from "./format";
import { Meter, Stars, TagChip } from "./ui";

function Record({ label, w, l }: Readonly<{ label: string; w: number; l: number }>) {
  return (
    <div>
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums">
        {w + l === 0 ? <span className="text-sm font-normal text-[var(--text-muted)]">Sin cruces</span> : `${w}V · ${l}D`}
      </dd>
    </div>
  );
}

function Dossier({ rival, today }: Readonly<{ rival: RivalEntry; today: string }>) {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h3 className="text-xl font-bold leading-tight tracking-tight">{prettyTeamName(rival.name)}</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {rival.position !== null ? `${ordinal(rival.position)} en la liga · ${rival.leaguePoints} pts` : "Sin partidos jugados esta temporada"}
          {rival.rating !== null ? ` · rating ${rival.rating}` : ""}
        </p>
      </header>

      {rival.winProbability !== null ? (
        <div>
          <div className="flex items-end justify-between gap-4">
            <p className="text-4xl font-bold tabular-nums tracking-tight">{percent(rival.winProbability)}</p>
            <div className="text-right">
              <p className="mb-1 text-xs text-[var(--text-muted)]">Dificultad</p>
              <Stars value={rival.stars} />
            </div>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Probabilidad de ganar en terreno neutral (estimación)</p>
          <Meter className="mt-2" value={rival.winProbability * 100} label="Probabilidad de ganar" />
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          {rival.isNew ? "Rival nuevo en la liga." : "Sin referencia comparable del año pasado."} Su rating y la
          probabilidad se activan cuando haya jugado 3 partidos esta temporada.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-4 border-y border-[var(--glass-border)] py-4">
        <Record label="Esta temporada" w={rival.record.current.w} l={rival.record.current.l} />
        <Record label="Temporada pasada" w={rival.record.previous.w} l={rival.record.previous.l} />
      </dl>

      {rival.nextMatch ? (
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Próximo cruce:</span>{" "}
          {whenLabel(rival.nextMatch.date, today)} · {rival.nextMatch.home ? "en casa" : "fuera"}
          {rival.nextMatch.probability !== null ? ` · ${percent(rival.nextMatch.probability)} de ganar` : ""}
        </p>
      ) : null}

      <div>
        <h4 className="mb-2 text-sm font-semibold">Cara a cara</h4>
        {rival.meetings.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Primer cruce: todavía no hay partidos entre vosotros en estas dos temporadas.</p>
        ) : (
          <ul className="divide-y divide-[var(--glass-border)]">
            {rival.meetings.map((m) => (
              <li key={`${m.date}-${m.home}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 first:pt-0">
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-md text-xs font-bold ${
                    m.won
                      ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                      : "bg-[var(--color-danger-muted)] text-[color-mix(in_srgb,var(--color-danger)_72%,var(--text-primary))]"
                  }`}
                >
                  {m.won ? "V" : "D"}
                </span>
                <span className="text-lg font-bold tabular-nums">
                  {m.ownSets}–{m.rivalSets}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {fullDate(m.date)} · {m.home ? "Casa" : "Fuera"}
                  {m.competition === "otra" ? " · otra competición" : ""}
                </span>
                {m.sets.length > 0 ? (
                  <span className="basis-full text-xs tabular-nums text-[var(--text-muted)]">
                    {m.sets.map((s) => `${s.own}-${s.rival}`).join(" · ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function RivalsPanel({
  stats,
  selectedId,
  onSelect,
}: Readonly<{ stats: CompetitiveStats; selectedId: number | null; onSelect: (id: number | null) => void }>) {
  const rivals = stats.rivals;

  if (!stats.hasLeague || rivals.length === 0) {
    return (
      <section>
        <h2 className="mb-2 text-lg font-semibold tracking-tight sm:text-xl">Rivales a batir</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Todavía no hay rivales para esta temporada. Se rellenan cuando la federación publica el calendario de la liga.
        </p>
      </section>
    );
  }

  const activeId = selectedId ?? rivals[0].teamId;
  const active = rivals.find((r) => r.teamId === activeId) ?? rivals[0];

  return (
    <section aria-labelledby="rivals-title">
      <h2 id="rivals-title" className="text-lg font-semibold tracking-tight sm:text-xl">
        Rivales a batir
      </h2>
      <p className="mt-1 max-w-prose text-sm text-[var(--text-muted)]">
        Ordenados por prioridad: cercanía en la tabla, cuentas pendientes y próximos cruces.
      </p>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        <ol className="divide-y divide-[var(--glass-border)] border-y border-[var(--glass-border)]">
          {rivals.map((r, i) => {
            const open = selectedId === r.teamId;
            return (
              <li key={r.teamId}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onSelect(open ? null : r.teamId)}
                  className={`flex w-full cursor-pointer items-start gap-3 px-2 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] sm:gap-4 sm:px-3 ${
                    r.teamId === activeId ? "bg-[var(--glass-surface)]" : "hover:bg-[var(--surface-faint)]"
                  }`}
                >
                  <span
                    className={`w-6 shrink-0 pt-0.5 text-right text-sm font-bold tabular-nums ${
                      i === 0 ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={`font-semibold ${i === 0 ? "text-base sm:text-lg" : "text-sm sm:text-base"}`}>
                        {prettyTeamName(r.name)}
                      </span>
                      {r.position !== null ? (
                        <span className="text-xs tabular-nums text-[var(--text-muted)]">{ordinal(r.position)}</span>
                      ) : null}
                      {r.tags.slice(0, 2).map((t) => (
                        <TagChip key={t} tag={t} />
                      ))}
                    </span>
                    <span className="mt-1 block text-sm text-[var(--text-secondary)]">{r.reason}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                    <Stars value={r.stars} />
                    <span className="text-sm font-semibold tabular-nums">
                      {r.winProbability === null ? "—" : percent(r.winProbability)}
                    </span>
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    aria-hidden
                    className={`mt-1.5 shrink-0 text-xs text-[var(--text-muted)] transition-transform lg:hidden ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open ? (
                  <div className="border-t border-[var(--glass-border)] bg-[var(--surface-faint)] px-3 py-5 lg:hidden">
                    <Dossier rival={r} today={stats.asOf} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <aside className="hidden lg:block" aria-label="Dossier del rival">
          <div className="sticky top-6">
            <Dossier rival={active} today={stats.asOf} />
          </div>
        </aside>
      </div>

      <details className="mt-8 max-w-prose text-sm">
        <summary className="cursor-pointer text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
          Cómo se calcula
        </summary>
        <ul className="mt-2 space-y-1.5 text-[var(--text-muted)]">
          <li>
            El <span className="text-[var(--text-secondary)]">rating</span> sube o baja tras cada partido de la liga según
            el resultado en sets y la fuerza del rival; arranca desde el rating final del año pasado.
          </li>
          <li>
            La <span className="text-[var(--text-secondary)]">probabilidad</span> sale de comparar ratings. Es una
            estimación calibrada con los resultados de las últimas temporadas, no una promesa.
          </li>
          <li>
            Las <span className="text-[var(--text-secondary)]">estrellas</span> miden la dificultad: 1 si ganamos más del
            80 % de las veces, 5 si menos del 30 %.
          </li>
          <li>
            La <span className="text-[var(--text-secondary)]">prioridad</span> suma cercanía en la tabla, si nos ganó la
            última vez, cuándo toca el próximo cruce y lo difícil que es.
          </li>
          <li>Un rival sin referencia sale sin rating hasta que haya jugado 3 partidos esta temporada.</li>
        </ul>
      </details>
    </section>
  );
}
