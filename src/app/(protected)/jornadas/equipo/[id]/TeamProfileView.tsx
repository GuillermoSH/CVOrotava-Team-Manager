import type { ReactNode } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import BetaNotice from "@/components/competition/BetaNotice";
import TeamBrief from "@/components/competition/TeamBrief";
import { longDate } from "@/components/stats/competitive/format";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import { groupLabel, roundTitle } from "@/lib/competition/build";
import { fedMatchHref } from "@/lib/competition/links";
import { buildTeamBrief } from "@/lib/competition/teamBrief";
import type { TeamContext } from "@/lib/competition/loadTeam";
import type { PhaseCounts, ProfileFlow, Ratio } from "@/lib/competition/teamProfile";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

const pct = (r: Ratio): string => (r.of === 0 ? "–" : `${Math.round((r.n / r.of) * 100)} %`);
const frac = (r: Ratio): string => (r.of === 0 ? "–" : `${r.n} de ${r.of} (${pct(r)})`);
const dec = (v: number | null, digits = 1): string => (v === null ? "–" : v.toLocaleString("es-ES", { maximumFractionDigits: digits, minimumFractionDigits: digits }));
const signed = (v: number | null): string => (v === null ? "–" : `${v > 0 ? "+" : ""}${dec(v)}`);
const phase = (p: PhaseCounts): string => `inicio ${p.early} · medio ${p.mid} · final ${p.late}`;

function Section({ id, title, note, children }: Readonly<{ id: string; title: string; note?: string; children: ReactNode }>) {
  return (
    <section aria-labelledby={id} className="max-w-3xl">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {note ? <p className="mb-3 mt-0.5 text-xs text-[var(--text-muted)]">{note}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

function Facts({ items }: Readonly<{ items: [string, string][] }>) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 border-b border-[var(--glass-border)] py-1.5">
          <dt className="text-[var(--text-secondary)]">{k}</dt>
          <dd className="text-right font-semibold tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function runLine(r: ProfileFlow["bestRunFor"]): ReactNode {
  if (!r) return "–";
  return (
    <Link href={fedMatchHref(r.matchId)} className="underline">
      {r.length} seguidas (set {r.set}, de {r.from.own}-{r.from.opp} a {r.to.own}-{r.to.opp})
    </Link>
  );
}

export default function TeamProfileView({ ctx }: Readonly<{ ctx: TeamContext }>) {
  const { team, profile: p, teams, matches, groups } = ctx;
  const name = prettyTeamName(team.name);
  const teamName = (id: number | null) => (id !== null && teams[id] ? prettyTeamName(teams[id].name) : "Por determinar");
  const noDetail = p.withReport === 0;
  const first = groups[0];
  const brief = buildTeamBrief(p, matches, teams);

  return (
    <div className="flex w-full max-w-[56rem] flex-col gap-10">
      <div>
        <BetaNotice />
        <Link href="/jornadas" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] max-md:min-h-11">
          <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          Jornadas
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Temporada {ctx.season}
          {first ? ` · ${groupLabel(first.name)}` : ""}
          {first?.standing ? ` · ${first.standing.position}.º con ${first.standing.league_points} puntos` : ""}
        </p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {p.played === 0
            ? "Todavía no ha jugado ningún partido."
            : `Ha jugado ${p.played} ${p.played === 1 ? "partido" : "partidos"}; de ${p.withReport} tenemos el acta leída.`}
        </p>
        {p.smallSample && p.played > 0 ? (
          <p className="mt-2 rounded-lg border border-[var(--color-warning)] bg-[var(--surface-faint)] px-3 py-2 text-sm">
            Pocas actas todavía: los porcentajes de abajo se apoyan en muy pocos sets, tómalos como una pista.
          </p>
        ) : null}
      </div>

      <TeamBrief brief={brief} name={name} />

      {p.played > 0 ? (
        <Section id="t-record" title="Resultados">
          <Facts
            items={[
              ["Victorias – derrotas", `${p.record.won} – ${p.record.lost}`],
              ["Sets a favor – en contra", `${p.record.setsFor} – ${p.record.setsAgainst}`],
              ["Victorias 3-0 / 3-2", `${p.record.wins30} / ${p.record.wins32}`],
              ["Derrotas 0-3 / 2-3", `${p.record.losses03} / ${p.record.losses23}`],
              ["Primer set ganado", frac(p.sets.firstSet)],
              ["Sets apretados ganados (≤ 2 puntos)", frac(p.sets.tight)],
              ["Quintos sets ganados", frac(p.sets.decider)],
              ["Puntos por set a favor – en contra", `${dec(p.sets.avgFor)} – ${dec(p.sets.avgAgainst)}`],
              ["Duración media de un set", p.sets.avgDurationMin === null ? "–" : `${dec(p.sets.avgDurationMin, 0)} min`],
            ]}
          />
        </Section>
      ) : null}

      {!noDetail ? (
        <>
          {p.flow.sets > 0 ? (
            <Section
              id="t-flow"
              title="Juego punto a punto"
              note={`Sobre ${p.flow.sets} sets con el marcador jugada a jugada leído (de ${p.timeouts.sets} con acta). Las jugadas en que el equipo saca son «con su saque»; las demás son «al recibir».`}
            >
              <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                {(
                  [
                    ["Gana la jugada con su saque", frac(p.flow.serve)],
                    ["Gana la jugada al recibir (cambio de saque)", frac(p.flow.receive)],
                    ["Racha media más larga por set", `${dec(p.flow.avgRunFor)} a favor · ${dec(p.flow.avgRunAgainst)} en contra`],
                    ["Cambios de líder por set", dec(p.flow.avgLeadChanges)],
                    ["Remontadas (sets ganados yendo 5 abajo)", frac(p.flow.comebacks)],
                    ["Ventajas perdidas (sets perdidos yendo 5 arriba)", frac(p.flow.blownLeads)],
                    ["Finales apretados ganados (20-20)", frac(p.flow.closeFinishes)],
                    ["Gana la jugada siguiente a su tiempo muerto", frac(p.flow.afterTimeout.nextPoint)],
                    ["Corta una racha rival de 3 o más con el tiempo muerto", frac(p.flow.afterTimeout.stopsRun)],
                    ["Su mejor racha", runLine(p.flow.bestRunFor)],
                    ["La peor racha que ha sufrido", runLine(p.flow.worstRunAgainst)],
                  ] as [string, ReactNode][]
                ).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 border-b border-[var(--glass-border)] py-1.5">
                    <dt className="text-[var(--text-secondary)]">{k}</dt>
                    <dd className="text-right font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          ) : null}

          <Section id="t-timeouts" title="Tiempos muertos" note={`Sobre ${p.timeouts.sets} sets con acta. El marcador es el del propio equipo contra el rival.`}>
            <Facts
              items={[
                ["Tiempos muertos por set", dec(p.timeouts.perSet, 2)],
                ["Total", String(p.timeouts.total)],
                ["Diferencia media al pedirlo", signed(p.timeouts.avgLead)],
                ["Pide perdiendo por 3 o más", frac(p.timeouts.trailing3)],
                ["Pide ganando por 3 o más", frac(p.timeouts.leading3)],
                ["Pide el primero del set", frac(p.timeouts.first)],
                ["En qué parte del set", phase(p.timeouts.phase)],
              ]}
            />
          </Section>

          <Section id="t-subs" title="Cambios" note="Inicio: menos del 40 % del set; medio: hasta el 80 %; final: el resto.">
            <Facts
              items={[
                ["Cambios por set", dec(p.substitutions.perSet, 2)],
                ["Total", String(p.substitutions.total)],
                ["En qué parte del set", phase(p.substitutions.phase)],
                ["El titular vuelve a su puesto", frac(p.substitutions.returned)],
                ["Por posición del campo", ROMAN.map((r, i) => `${r}: ${p.substitutions.byPosition[i]}`).join(" · ")],
              ]}
            />
            {p.substitutions.topIn.length > 0 ? (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Quien más entra: {p.substitutions.topIn.map((x) => `${x.name} (${x.times})`).join(", ")}.
              </p>
            ) : null}
          </Section>

          <Section
            id="t-lineups"
            title="Alineaciones y rotación"
            note={`Sobre ${p.lineups.sets} sets con la alineación inicial escrita. Los dorsales van por orden de rotación, empezando por el menor.`}
          >
            {p.lineups.sets === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Las actas no traen la alineación inicial.</p>
            ) : (
              <>
                <Facts
                  items={[
                    ["Sextetos distintos usados", String(p.lineups.distinctSextets)],
                    ["Empieza sacando", frac(p.lineups.startsServing)],
                  ]}
                />
                <ol className="mt-4 flex flex-col gap-2 text-sm">
                  {p.lineups.sextets.map((s) => (
                    <li key={s.numbers.join("-")} className="rounded-xl border border-[var(--glass-border)] px-4 py-3">
                      <p className="flex items-baseline justify-between gap-4">
                        <span className="font-semibold tabular-nums">{s.numbers.join(" · ")}</span>
                        <span className="text-[var(--text-secondary)]">
                          {s.count} {s.count === 1 ? "set" : "sets"} ({Math.round(s.share * 100)} %)
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{s.names.join(", ")}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </Section>

          <Section id="t-players" title="Plantilla" note="Titular: en la alineación inicial de un set. Entra: veces que sale desde el banquillo.">
            <div className="overflow-x-auto rounded-xl border border-[var(--glass-border)]">
              <table className="w-full min-w-[22rem] border-collapse text-sm">
                <caption className="sr-only">Jugadores del equipo</caption>
                <thead>
                  <tr className="border-b border-[var(--glass-border)] text-xs font-medium text-[var(--text-muted)]">
                    <th scope="col" className="px-3 py-2 text-right">Nº</th>
                    <th scope="col" className="px-3 py-2 text-left">Jugador</th>
                    <th scope="col" className="px-3 py-2 text-right">Partidos</th>
                    <th scope="col" className="px-3 py-2 text-right">Titular</th>
                    <th scope="col" className="px-3 py-2 text-right">Entra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--glass-border)]">
                  {p.players.map((pl) => (
                    <tr key={pl.name}>
                      <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">{pl.number}</td>
                      <td className="px-3 py-2">
                        {pl.name}
                        {pl.libero ? <span className="ml-2 rounded bg-[var(--surface-faint)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">Líbero</span> : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{pl.matches}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{pl.starts}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{pl.subIns}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {p.coaches.length > 0 ? `Entrenador: ${p.coaches.join(", ")}. ` : ""}
              Sanciones: {p.sanctions.W} amonestaciones, {p.sanctions.P} penalizaciones, {p.sanctions.E} expulsiones y {p.sanctions.D} descalificaciones.
            </p>
          </Section>
        </>
      ) : p.played > 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--glass-border)] px-4 py-6 text-sm text-[var(--text-muted)]">
          Todavía no hay actas leídas de este equipo, así que no hay datos de tiempos muertos, cambios ni alineaciones.
        </p>
      ) : null}

      <Section id="t-matches" title="Partidos">
        <ul className="divide-y divide-[var(--glass-border)] rounded-xl border border-[var(--glass-border)] text-sm">
          {matches.map((m) => {
            const home = m.homeId === team.id;
            const rivalId = home ? m.awayId : m.homeId;
            const f = home ? m.homeSets : m.awaySets;
            const a = home ? m.awaySets : m.homeSets;
            return (
              <li key={m.id}>
                <Link href={fedMatchHref(m.id)} className="flex items-baseline gap-3 px-4 py-2.5 hover:bg-[var(--glass-surface)] max-md:min-h-11">
                  <span className="w-24 shrink-0 text-xs text-[var(--text-muted)]">{m.date ? longDate(m.date) : "Sin fecha"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[var(--text-muted)]">{home ? "vs" : "en"} </span>
                    {teamName(rivalId)}
                    <span className="ml-2 text-xs text-[var(--text-muted)]">{roundTitle(m.roundLabel)}</span>
                  </span>
                  {m.status === "played" && f !== null && a !== null ? (
                    <span className={`font-semibold tabular-nums ${f > a ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                      {f} – {a}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">{m.status === "scheduled" ? "Por jugar" : m.status === "postponed" ? "Aplazado" : m.status === "canceled" ? "Suspendido" : "Descansa"}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}

