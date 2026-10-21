"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import InfoDialog from "@/components/ui/InfoDialog";
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
    <article aria-labelledby={`rival-${rival.teamId}`} className="flex flex-col gap-8">
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 id={`rival-${rival.teamId}`} className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {prettyTeamName(rival.name)}
          </h3>
          {rival.tags.slice(0, 2).map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          {rival.position !== null
            ? `${ordinal(rival.position)} en la liga · ${rival.leaguePoints} pts`
            : "Sin partidos jugados esta temporada"}
        </p>
        <p className="mt-3 max-w-prose text-[var(--text-secondary)]">{rival.reason}</p>
      </header>

      <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
        {rival.winProbability !== null ? (
          <div>
            <div className="flex items-end justify-between gap-4">
              <p className="text-5xl font-bold tabular-nums tracking-tight">{percent(rival.winProbability)}</p>
              <div className="text-right">
                <p className="mb-1 text-xs text-[var(--text-muted)]">Dificultad</p>
                <Stars value={rival.stars} />
              </div>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Probabilidad de ganar en terreno neutral (estimación)</p>
            <Meter className="mt-3" value={rival.winProbability * 100} label="Probabilidad de ganar" />
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            {rival.isNew ? "Rival nuevo en la liga." : "Sin referencia comparable del año pasado."} Su nivel y la
            probabilidad se activan cuando haya jugado 3 partidos esta temporada.
          </p>
        )}

        <div className="flex flex-col justify-between gap-5">
          <dl className="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      <div className="border-t border-[var(--glass-border)] pt-6">
        <h4 className="mb-3 text-base font-semibold">Cara a cara</h4>
        {rival.meetings.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Primer cruce: todavía no hay partidos entre vosotros en estas dos temporadas.
          </p>
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
    </article>
  );
}

export function RivalsHowItWorks() {
  return (
    <ul className="space-y-3 text-sm leading-relaxed text-[var(--text-muted)]">
      <li>
        El <span className="text-[var(--text-secondary)]">nivel</span> de cada equipo sube o baja con sus resultados en
        la liga (cuenta el marcador en sets y a quién se gana) y arranca desde cómo acabó el año pasado.
      </li>
      <li>
        La <span className="text-[var(--text-secondary)]">probabilidad</span> compara el nivel de los dos equipos. Es una
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
      <li>Un rival sin referencia sale sin probabilidad ni estrellas hasta que haya jugado 3 partidos esta temporada.</li>
    </ul>
  );
}

export default function RivalsPanel({
  stats,
  selectedId,
  onSelect,
}: Readonly<{ stats: CompetitiveStats; selectedId: number | null; onSelect: (id: number | null) => void }>) {
  const rivals = stats.rivals;
  const [helpOpen, setHelpOpen] = useState(false);
  const menuRef = useRef<HTMLOListElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const activeId = selectedId ?? rivals[0]?.teamId ?? null;

  // En móvil el menú es una tira horizontal: el rival elegido (p. ej. desde Resumen) debe quedar a la vista.
  useEffect(() => {
    const menu = menuRef.current;
    const el = activeRef.current;
    if (!menu || !el || menu.scrollWidth <= menu.clientWidth) return;
    menu.scrollTo({ left: el.offsetLeft - (menu.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [activeId]);

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

  const active = rivals.find((r) => r.teamId === activeId) ?? rivals[0];

  return (
    <section aria-labelledby="rivals-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="rivals-title" className="text-lg font-semibold tracking-tight sm:text-xl">
          Rivales a batir
        </h2>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <FontAwesomeIcon icon={faCircleInfo} aria-hidden className="text-[var(--text-muted)]" />
          Cómo se calcula
        </button>
      </div>
      <p className="max-w-prose text-sm text-[var(--text-muted)]">
        Ordenados por prioridad: cercanía en la tabla, cuentas pendientes y próximos cruces.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14">
        <nav aria-label="Rivales" className="min-w-0">
          <ol
            ref={menuRef}
            className="relative flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
          >
            {rivals.map((r, i) => {
              const current = r.teamId === active.teamId;
              return (
                <li key={r.teamId} className="shrink-0 snap-start lg:shrink">
                  <button
                    ref={current ? activeRef : undefined}
                    type="button"
                    aria-current={current ? "true" : undefined}
                    onClick={() => onSelect(r.teamId)}
                    className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-full border px-3.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:rounded-lg lg:border-transparent lg:px-3 ${
                      current
                        ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--text-primary)] lg:border-transparent"
                        : "border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-faint)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span
                      className={`w-4 shrink-0 text-right text-xs font-bold tabular-nums ${
                        i === 0 || current ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{prettyTeamName(r.name)}</span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                      {r.winProbability === null ? "—" : percent(r.winProbability)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0" aria-live="polite">
          <Dossier key={active.teamId} rival={active} today={stats.asOf} />
        </div>
      </div>

      <InfoDialog open={helpOpen} title="Cómo se calcula" onClose={() => setHelpOpen(false)}>
        <RivalsHowItWorks />
      </InfoDialog>
    </section>
  );
}
