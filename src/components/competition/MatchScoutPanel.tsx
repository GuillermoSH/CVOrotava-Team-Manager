"use client";

import type { ReactNode } from "react";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { CompetitionTeam } from "@/lib/competition/build";
import type { MatchScout, Outcome, TeamScout } from "@/lib/competition/scout";
import { shortDate } from "@/components/stats/competitive/format";
import { ratio, share, signed } from "./scoutFormat";

type Teams = Record<number, CompetitionTeam>;

const name = (teams: Teams, id: number) => (teams[id] ? prettyTeamName(teams[id].name) : `Equipo ${id}`);

function FormChips({ scout, teams }: Readonly<{ scout: TeamScout; teams: Teams }>) {
  if (scout.form.length === 0) return <span className="text-[var(--text-muted)]">–</span>;
  return (
    <span className="inline-flex gap-1">
      {scout.form.map((f, i) => (
        <span
          key={i}
          title={`${f.won ? "Victoria" : "Derrota"} ${f.score} ${f.home ? "en casa contra" : "fuera contra"} ${name(teams, f.rivalId)}`}
          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${
            f.won ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"
          }`}
        >
          {f.won ? "V" : "D"}
        </span>
      ))}
    </span>
  );
}

/** Fila de comparación: valor del local, etiqueta y valor del visitante; barra opcional (parte del local). */
function Row({
  label,
  home,
  away,
  homeShare,
}: Readonly<{ label: string; home: ReactNode; away: ReactNode; homeShare?: number }>) {
  return (
    <div className="py-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
        <span className="text-right font-semibold tabular-nums text-[var(--text-primary)]">{home}</span>
        <span className="text-center text-xs text-[var(--text-muted)]">{label}</span>
        <span className="text-left font-semibold tabular-nums text-[var(--text-primary)]">{away}</span>
      </div>
      {homeShare !== undefined ? (
        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-faint)]" aria-hidden>
          <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.round(homeShare * 100)}%` }} />
          <div className="h-full flex-1 bg-[var(--text-muted)] opacity-40" />
        </div>
      ) : null}
    </div>
  );
}

function resultLine(o: Outcome): string {
  return `${o.ownSets}-${o.rivalSets}`;
}

export default function MatchScoutPanel({
  scout,
  homeId,
  awayId,
  teams,
}: Readonly<{ scout: MatchScout; homeId: number; awayId: number; teams: Teams }>) {
  const { home, away } = scout;
  const homeName = name(teams, homeId);
  const awayName = name(teams, awayId);
  const noData = home.played === 0 && away.played === 0;

  if (noData) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Todavía no hay partidos jugados de estos equipos en el grupo: el scout aparece en cuanto se juegue la primera jornada.
      </p>
    );
  }

  const verdict =
    scout.favoured === "home"
      ? `Favorito: ${homeName}`
      : scout.favoured === "away"
        ? `Favorito: ${awayName}`
        : "Sin favorito claro";

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div>
        <p className="font-semibold text-[var(--text-primary)]">{verdict}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {scout.ratingDiff !== null
            ? `Diferencia de puntos por set entre ambos: ${signed(scout.ratingDiff)} a favor de ${homeName}.`
            : "Sin puntos por set en las actas para comparar."}
          {scout.lowSample ? " Pocos partidos jugados: tómalo con cautela." : ""}
        </p>
      </div>

      <div>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 border-b border-[var(--glass-border)] pb-2 text-xs font-semibold text-[var(--text-secondary)]">
          <span className="truncate text-right">{homeName}</span>
          <span aria-hidden className="w-16" />
          <span className="truncate text-left">{awayName}</span>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          <Row
            label="Ganados / jugados"
            home={ratio({ played: home.played, won: home.won })}
            away={ratio({ played: away.played, won: away.won })}
            homeShare={share(home.won / Math.max(home.played, 1), away.won / Math.max(away.played, 1))}
          />
          <Row
            label="Forma"
            home={<FormChips scout={home} teams={teams} />}
            away={<FormChips scout={away} teams={teams} />}
          />
          <Row
            label="Racha"
            home={home.streak ? `${home.streak.length} ${home.streak.won ? "V" : "D"}` : "–"}
            away={away.streak ? `${away.streak.length} ${away.streak.won ? "V" : "D"}` : "–"}
          />
          <Row
            label="Sets a favor–contra"
            home={`${home.setsFor}–${home.setsAgainst}`}
            away={`${away.setsFor}–${away.setsAgainst}`}
            homeShare={share(
              home.setsFor / Math.max(home.setsFor + home.setsAgainst, 1),
              away.setsFor / Math.max(away.setsFor + away.setsAgainst, 1)
            )}
          />
          <Row
            label="Puntos por set (dif.)"
            home={home.pointDiffPerSet !== null ? signed(home.pointDiffPerSet) : "–"}
            away={away.pointDiffPerSet !== null ? signed(away.pointDiffPerSet) : "–"}
          />
          <Row label="Como local / visitante" home={ratio(home.home)} away={ratio(away.away)} />
          <Row label="Sets ajustados ganados" home={ratio(home.closeSets)} away={ratio(away.closeSets)} />
          <Row
            label="Gana tras ganar el 1.er set"
            home={ratio(home.firstSet.wonFirst)}
            away={ratio(away.firstSet.wonFirst)}
          />
          <Row
            label="Gana tras perder el 1.er set"
            home={ratio(home.firstSet.lostFirst)}
            away={ratio(away.firstSet.lostFirst)}
          />
          <Row
            label="Victorias 3-0 / 3-1 / 3-2"
            home={`${home.results.w30} / ${home.results.w31} / ${home.results.w32}`}
            away={`${away.results.w30} / ${away.results.w31} / ${away.results.w32}`}
          />
        </div>
      </div>

      <section aria-label="Duelo directo">
        <h4 className="mb-1.5 text-sm font-semibold text-[var(--text-secondary)]">Duelo directo</h4>
        {scout.headToHead.played === 0 ? (
          <p className="text-[var(--text-muted)]">No se han enfrentado todavía esta temporada.</p>
        ) : (
          <ul className="space-y-1">
            {scout.headToHead.meetings.map((o) => (
              <li key={o.matchId} className="flex flex-wrap justify-between gap-2 text-[var(--text-secondary)]">
                <span>{o.date ? shortDate(o.date) : "Sin fecha"}</span>
                <span className="tabular-nums">
                  {o.won ? homeName : awayName} gana {Math.max(o.ownSets, o.rivalSets)}-{Math.min(o.ownSets, o.rivalSets)}
                  {o.sets.length > 0
                    ? ` (${o.sets.map((s) => `${s.own}-${s.rival}`).join(", ")})`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Rivales comunes">
        <h4 className="mb-1.5 text-sm font-semibold text-[var(--text-secondary)]">
          Rivales comunes
        </h4>
        {scout.common.length === 0 ? (
          <p className="text-[var(--text-muted)]">Todavía no han jugado contra ningún rival en común.</p>
        ) : (
          <>
            <ul className="divide-y divide-[var(--glass-border)]">
              {scout.common.map((c) => (
                <li key={c.rivalId} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1.5">
                  <span className="text-right tabular-nums text-[var(--text-secondary)]">
                    {c.a.meetings.map(resultLine).join(", ")}
                  </span>
                  <span className="max-w-[9rem] truncate text-center text-xs text-[var(--text-muted)]">
                    {name(teams, c.rivalId)}
                  </span>
                  <span className="tabular-nums text-[var(--text-secondary)]">{c.b.meetings.map(resultLine).join(", ")}</span>
                </li>
              ))}
            </ul>
            {scout.commonEdge !== null ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Contra esos rivales, {scout.commonEdge >= 0 ? homeName : awayName} lo ha hecho mejor
                (ventaja media de {signed(Math.abs(scout.commonEdge))}). No es una comparación exacta: los rivales no siempre
                juegan en las mismas condiciones.
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
