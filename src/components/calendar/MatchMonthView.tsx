"use client";

import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import MatchCard from "./MatchCard";
import type { Match } from "./MatchCard.types";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function matchTone(match: Match): "win" | "loss" | "upcoming" | "pending" {
  const end = new Date(`${match.date}T${match.time}`);
  end.setHours(end.getHours() + 2);
  const past = Date.now() > end.getTime();
  if (!past) return "upcoming";
  if (!match.result) return "pending";
  const [us, them] = match.result.split("-").map(Number);
  if (!Number.isNaN(us) && !Number.isNaN(them) && us > them) return "win";
  if (!Number.isNaN(us) && !Number.isNaN(them) && us < them) return "loss";
  return "pending";
}

const DOT: Record<ReturnType<typeof matchTone>, string> = {
  upcoming: "bg-[var(--color-success)]",
  win: "bg-[var(--color-success)]",
  loss: "bg-[var(--color-danger)]",
  pending: "bg-[var(--color-warning)]",
};

type MatchMonthViewProps = {
  matches: Match[];
  initialMonth?: Date;
};

export default function MatchMonthView({
  matches,
  initialMonth,
}: MatchMonthViewProps) {
  const [cursor, setCursor] = useState(() =>
    startOfMonth(initialMonth ?? new Date())
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const list = map.get(m.date) ?? [];
      list.push(m);
      map.set(m.date, list);
    }
    return map;
  }, [matches]);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const mondayOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0
    ).getDate();
    const total = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
    const out: Array<{ date: Date | null; key: string | null }> = [];
    for (let i = 0; i < total; i++) {
      const dayNum = i - mondayOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        out.push({ date: null, key: null });
      } else {
        const d = new Date(cursor.getFullYear(), cursor.getMonth(), dayNum);
        out.push({ date: d, key: dateKey(d) });
      }
    }
    return out;
  }, [cursor]);

  const monthTitle = cursor
    .toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  const todayKey = dateKey(new Date());
  const selectedMatches = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  const monthMatches = useMemo(() => {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const prefix = `${y}-${m}-`;
    return matches
      .filter((match) => match.date.startsWith(prefix))
      .sort(
        (a, b) =>
          +new Date(`${a.date}T${a.time}`) - +new Date(`${b.date}T${b.time}`)
      );
  }, [matches, cursor]);

  const agendaList = selectedDay ? selectedMatches : monthMatches;

  return (
    <div className="flex w-full flex-col gap-5 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-[var(--glass-border)] lg:bg-[var(--color-bg-elevated)]">
      {/* ── Calendar ── */}
      <section className="w-full min-w-0 lg:border-r lg:border-[var(--glass-border)] lg:p-6 xl:p-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setCursor((c) => addMonths(c, -1));
              setSelectedDay(null);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--text-primary)]"
            aria-label="Mes anterior"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          </button>
          <h2 className="text-lg font-semibold tracking-tight">{monthTitle}</h2>
          <button
            type="button"
            onClick={() => {
              setCursor((c) => addMonths(c, 1));
              setSelectedDay(null);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--text-primary)]"
            aria-label="Mes siguiente"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          </button>
        </div>

        <div
          className="grid w-full grid-cols-7 gap-1 sm:gap-1.5"
          role="grid"
          aria-label={`Calendario ${monthTitle}`}
        >
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              role="columnheader"
              className="min-w-0 py-1.5 text-center text-xs font-medium text-[var(--text-muted)]"
            >
              {d}
            </div>
          ))}

          {cells.map((cell, i) => {
            if (!cell.date || !cell.key) {
              return (
                <div
                  key={`empty-${i}`}
                  role="gridcell"
                  className="min-w-0 h-12 w-full sm:h-[3.25rem] lg:h-14"
                />
              );
            }
            const dayMatches = byDay.get(cell.key) ?? [];
            const has = dayMatches.length > 0;
            const isToday = cell.key === todayKey;
            const isSelected = selectedDay === cell.key;
            const tones = dayMatches.map(matchTone);

            return (
              <button
                key={cell.key}
                type="button"
                role="gridcell"
                disabled={!has}
                onClick={() => has && setSelectedDay(cell.key)}
                className={`relative flex h-12 w-full min-w-0 flex-col items-center justify-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:h-[3.25rem] sm:rounded-xl lg:h-14 ${
                  isSelected
                    ? "bg-[var(--accent-muted)] text-[var(--text-primary)] ring-1 ring-[var(--accent)]"
                    : has
                      ? "bg-[var(--color-bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--glass-surface-hover)] lg:bg-[var(--surface-faint)]"
                      : "text-[var(--text-muted)]"
                } ${isToday && !isSelected ? "ring-1 ring-[var(--glass-border)]" : ""} ${
                  !has ? "cursor-default opacity-50" : ""
                }`}
              >
                <span className="tabular-nums font-medium lg:text-base">
                  {cell.date.getDate()}
                </span>
                {has && (
                  <span className="mt-0.5 flex max-w-full items-center justify-center gap-0.5">
                    {tones.slice(0, 3).map((t, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 w-1.5 rounded-full ${DOT[t]}`}
                        aria-hidden
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            Próximo / victoria
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
            Derrota
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]" />
            Sin resultado
          </span>
        </p>
      </section>

      {/* ── Agenda ── */}
      <aside className="flex min-h-0 w-full flex-col rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] p-5 sm:p-6 lg:rounded-none lg:border-0 lg:p-6 xl:p-8">
        <div className="mb-4 shrink-0">
          {selectedDay ? (
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="text-lg font-semibold tracking-tight capitalize text-[var(--text-primary)]">
                {new Date(`${selectedDay}T12:00:00`).toLocaleDateString(
                  "es-ES",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }
                )}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
              >
                Ver mes completo
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                Partidos del mes
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {monthMatches.length === 0
                  ? "No hay encuentros en este mes."
                  : `${monthMatches.length} encuentro${monthMatches.length === 1 ? "" : "s"} · pulsa un día marcado para filtrar`}
              </p>
            </>
          )}
        </div>

        {agendaList.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {selectedDay
              ? "No hay partidos este día."
              : "No hay encuentros en este mes."}
          </p>
        ) : (
          <ul className="flex min-h-0 flex-col gap-3 lg:max-h-[32rem] lg:overflow-y-auto xl:max-h-[36rem]">
            {agendaList.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} />
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
