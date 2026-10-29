"use client";

import type { ReactNode } from "react";
import type { MatchReport, ReportScore, ReportSetSide, ReportSide } from "@/lib/competition/report";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const SANCTION: Record<"W" | "P" | "E" | "D", string> = { W: "Amonestación", P: "Penalización", E: "Expulsión", D: "Descalificación" };

const th = "px-3 py-2 text-xs font-medium text-[var(--text-muted)]";
const td = "px-3 py-2.5 text-right tabular-nums";
const box = "overflow-x-auto rounded-xl border border-[var(--glass-border)]";

const score = (s: ReportScore) => `${s.own}-${s.opp}`;

function Section({ id, title, children }: Readonly<{ id: string; title: string; children: ReactNode }>) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Lineup({ lineup, names }: Readonly<{ lineup: number[]; names: Map<number, string> }>) {
  if (lineup.length === 0) return <p className="text-sm text-[var(--text-muted)]">El acta no trae la alineación inicial.</p>;
  return (
    <ol className="grid grid-cols-3 gap-1.5 text-sm sm:grid-cols-6">
      {lineup.map((n, i) => (
        <li key={i} className="rounded-lg bg-[var(--surface-faint)] px-2 py-1.5" title={n ? names.get(n) : undefined}>
          <span className="block text-[10px] font-medium text-[var(--text-muted)]">{ROMAN[i]}</span>
          <span className="font-semibold tabular-nums">{n || "–"}</span>
        </li>
      ))}
    </ol>
  );
}

function SideEvents({ side, names }: Readonly<{ side: ReportSetSide; names: Map<number, string> }>) {
  const none = side.timeouts.length === 0 && side.substitutions.length === 0;
  return (
    <div className="flex flex-col gap-3">
      <Lineup lineup={side.lineup} names={names} />
      {none ? (
        <p className="text-sm text-[var(--text-muted)]">Sin tiempos muertos ni cambios.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm text-[var(--text-secondary)]">
          {side.timeouts.map((t, i) => (
            <li key={`t${i}`}>
              <span className="font-semibold text-[var(--text-primary)]">Tiempo muerto</span> con {score(t)}
            </li>
          ))}
          {side.substitutions.map((x, i) => (
            <li key={`s${i}`}>
              <span className="font-semibold text-[var(--text-primary)]">Cambio</span> en la posición {ROMAN[x.position - 1]}
              {x.playerIn !== null ? `: entra el ${x.playerIn}${names.get(x.playerIn) ? ` (${names.get(x.playerIn)})` : ""}` : ""} con {score(x.scoreIn)}
              {x.scoreBack ? `; el titular vuelve con ${score(x.scoreBack)}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Roster({ title, players, staff }: Readonly<{ title: string; players: MatchReport["players"][ReportSide]; staff: MatchReport["staff"][ReportSide] }>) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {players.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">El acta no trae la plantilla.</p>
      ) : (
        <ul className="divide-y divide-[var(--glass-border)] rounded-xl border border-[var(--glass-border)] text-sm">
          {players.map((p) => (
            <li key={p.number} className="flex items-baseline gap-3 px-3 py-2">
              <span className="w-6 text-right font-semibold tabular-nums">{p.number}</span>
              <span className="min-w-0 flex-1">{p.name}</span>
              {p.libero ? <span className="rounded bg-[var(--surface-faint)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">Líbero</span> : null}
            </li>
          ))}
        </ul>
      )}
      {staff.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-0.5 text-sm text-[var(--text-secondary)]">
          {staff.map((s, i) => (
            <li key={i}>
              <span className="mr-2 inline-block w-7 text-xs font-semibold text-[var(--text-muted)]">{s.role}</span>
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function MatchReportPanel({ report, home, away }: Readonly<{ report: MatchReport; home: string; away: string }>) {
  const teamName: Record<ReportSide, string> = { home, away };
  const names: Record<ReportSide, Map<number, string>> = {
    home: new Map(report.players.home.map((p) => [p.number, p.name])),
    away: new Map(report.players.away.map((p) => [p.number, p.name])),
  };
  const schedule = report.start ? `${report.start}${report.end ? ` – ${report.end}` : ""}` : null;
  const facts: [string, string | null][] = [
    ["Horario", schedule],
    ["Duración", report.durationMin !== null ? `${report.durationMin} min` : null],
    ["Pabellón", [report.venue, report.city].filter(Boolean).join(", ") || null],
    ["Tiempos muertos", report.totals.home.timeouts !== null && report.totals.away.timeouts !== null ? `${report.totals.home.timeouts} – ${report.totals.away.timeouts}` : null],
    ["Cambios", report.totals.home.subs !== null && report.totals.away.subs !== null ? `${report.totals.home.subs} – ${report.totals.away.subs}` : null],
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {report.status === "review" ? (
        <details className="rounded-xl border border-[var(--color-warning)] bg-[var(--surface-faint)] px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold">El acta trae irregularidades: revisa los datos con cuidado</summary>
          <ul className="mt-2 list-disc pl-5 text-[var(--text-secondary)]">
            {report.issues.map((i, k) => (
              <li key={k}>{i.message}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <Section id="report-facts" title="El partido según el acta">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {facts
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-medium text-[var(--text-muted)]">{k}</dt>
                <dd className="font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
        </dl>
        {report.comments ? <p className="mt-4 whitespace-pre-line text-sm text-[var(--text-secondary)]">{report.comments}</p> : null}
      </Section>

      {report.sets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--glass-border)] px-4 py-6 text-sm text-[var(--text-muted)]">
          El acta no trae ningún set jugado (puede ser una incomparecencia).
        </p>
      ) : null}

      {report.sets.length > 0 ? (
      <Section id="report-sets" title="Set a set">
        <div className={`${box} max-w-xl`}>
          <table className="w-full min-w-[22rem] border-collapse text-sm">
            <caption className="sr-only">Puntos, duración, tiempos muertos y cambios de cada set</caption>
            <thead>
              <tr className="border-b border-[var(--glass-border)]">
                <th scope="col" className={`${th} text-left`}>
                  Set
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Puntos
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Duración
                </th>
                <th scope="col" className={`${th} text-right`}>
                  T. muertos
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Cambios
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)]">
              {report.sets.map((s) => (
                <tr key={s.number}>
                  <td className="px-3 py-2.5 text-[var(--text-secondary)]">{s.number}</td>
                  <td className={`${td} font-semibold`}>
                    {s.home.points}-{s.away.points}
                  </td>
                  <td className={`${td} text-[var(--text-secondary)]`}>{s.durationMin !== null ? `${s.durationMin}'` : "–"}</td>
                  <td className={`${td} text-[var(--text-secondary)]`}>
                    {s.home.timeoutsCount}-{s.away.timeoutsCount}
                  </td>
                  <td className={`${td} text-[var(--text-secondary)]`}>
                    {s.home.subsCount}-{s.away.subsCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Orden: {home} – {away}.
        </p>
      </Section>
      ) : null}

      {report.sets.length > 0 ? (
      <Section id="report-plays" title="Alineaciones y jugadas">
        <div className="flex flex-col gap-2">
          {report.sets.map((s) => (
            <details key={s.number} className="rounded-xl border border-[var(--glass-border)] px-4 py-3">
              <summary className="min-h-6 cursor-pointer text-sm font-semibold max-md:min-h-11">
                Set {s.number} · {s.home.points}-{s.away.points}
                {s.start ? <span className="ml-2 font-normal text-[var(--text-muted)]">{s.start}{s.end ? ` – ${s.end}` : ""}</span> : null}
              </summary>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {(["home", "away"] as const).map((w) => (
                  <div key={w}>
                    <h3 className="mb-2 text-sm font-semibold">
                      {teamName[w]}
                      {s[w].startsServing !== null ? (
                        <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">{s[w].startsServing ? "empieza sacando" : "empieza recibiendo"}</span>
                      ) : null}
                    </h3>
                    <SideEvents side={s[w]} names={names[w]} />
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </Section>
      ) : null}

      <Section id="report-rosters" title="Plantillas">
        <div className="grid gap-6 md:grid-cols-2">
          <Roster title={home} players={report.players.home} staff={report.staff.home} />
          <Roster title={away} players={report.players.away} staff={report.staff.away} />
        </div>
      </Section>

      {report.referees.length > 0 || report.sanctions.length > 0 ? (
        <Section id="report-officials" title="Árbitros y sanciones">
          {report.referees.length > 0 ? (
            <ul className="mb-4 flex flex-col gap-0.5 text-sm text-[var(--text-secondary)]">
              {report.referees.map((r, i) => (
                <li key={i}>
                  <span className="mr-2 inline-block w-8 text-xs font-semibold text-[var(--text-muted)]">{r.role}</span>
                  {r.name}
                </li>
              ))}
            </ul>
          ) : null}
          {report.sanctions.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm text-[var(--text-secondary)]">
              {report.sanctions.map((s, i) => {
                const who = s.side ? teamName[s.side] : null;
                const offender = /^\d+$/.test(s.offender) ? `el ${s.offender}` : `el ${s.offender} (cuerpo técnico)`;
                return (
                  <li key={i}>
                    <span className="font-semibold text-[var(--text-primary)]">{SANCTION[s.kind]}</span> a {offender}
                    {who ? ` de ${who}` : ""}
                    {s.set !== null ? ` en el set ${s.set}` : ""}
                    {s.score ? ` con ${score(s.score)}` : ""}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}
