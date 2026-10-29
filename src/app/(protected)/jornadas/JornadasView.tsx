"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FilterBar, { type FilterConfig } from "@/components/ui/FilterBar";
import PageHeader from "@/components/ui/PageHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import GroupStandings from "@/components/competition/GroupStandings";
import RoundMatches from "@/components/competition/RoundMatches";
import { longDate, shortDate } from "@/components/stats/competitive/format";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import {
  groupLabel,
  nextOurMatch,
  roundChip,
  roundTitle,
  type Competition,
  type CompetitionGroup,
  type CompetitionRound,
  type Gender,
} from "@/lib/competition/build";

const GENDER_LABEL: Record<Gender, string> = { male: "Masculino", female: "Femenino" };

function roundDates(round: CompetitionRound): string | null {
  if (!round.startDate) return null;
  if (!round.endDate || round.endDate === round.startDate) return longDate(round.startDate);
  return `${shortDate(round.startDate)} – ${shortDate(round.endDate)}`;
}

/** Grupo que se abre primero: el de nuestro equipo con más partidos. */
function defaultGroup(groups: CompetitionGroup[]): CompetitionGroup | undefined {
  return groups.find((g) => g.hasOurs) ?? groups[0];
}

/** Jornada cerrada: no queda en ella nada por jugar. */
const isDone = (round: CompetitionRound): boolean =>
  round.matches.length > 0 && round.matches.every((m) => m.status === "played" || m.status === "canceled" || m.status === "rest");

export default function JornadasView({
  competition,
  loadFailed = false,
  seasons,
  season,
  gender,
  canPickGender,
  today,
  initialGroupId,
  initialRound,
}: Readonly<{
  competition: Competition | null;
  loadFailed?: boolean;
  seasons: string[];
  season: string;
  gender: Gender;
  canPickGender: boolean;
  /** YYYY-MM-DD en hora de Canarias, calculado en el servidor. */
  today: string;
  /** Grupo y jornada (desde 1) con los que se abre, p. ej. al volver desde el detalle de un partido. */
  initialGroupId?: number;
  initialRound?: number;
}>) {
  const router = useRouter();
  const groups = competition?.groups ?? [];
  const startGroup = groups.find((g) => g.id === initialGroupId) ?? defaultGroup(groups);
  const [groupId, setGroupId] = useState<number | null>(startGroup?.id ?? null);
  const [roundByGroup, setRoundByGroup] = useState<Record<number, number>>(
    startGroup && initialRound && initialRound >= 1 && initialRound <= startGroup.rounds.length
      ? { [startGroup.id]: initialRound - 1 }
      : {}
  );

  const group = groups.find((g) => g.id === groupId) ?? defaultGroup(groups);
  const roundIdx = group ? Math.min(roundByGroup[group.id] ?? group.currentRound, group.rounds.length - 1) : 0;
  const round = group?.rounds[roundIdx];
  const groupMatches = group?.rounds.flatMap((r) => r.matches) ?? [];

  const go = (next: { season?: string; gender?: string }) => {
    const qs = new URLSearchParams({ season: next.season ?? season });
    if (canPickGender) qs.set("gender", next.gender ?? gender);
    router.push(`/jornadas?${qs}`);
  };

  const filterConfigs: FilterConfig[] = [
    { key: "season", label: "Temporada", required: true, options: seasons.map((s) => ({ label: s, value: s })) },
    ...(canPickGender
      ? [
          {
            key: "gender",
            label: "Género",
            required: true,
            options: (Object.keys(GENDER_LABEL) as Gender[]).map((g) => ({ label: GENDER_LABEL[g], value: g })),
          },
        ]
      : []),
  ];

  const setRound = (idx: number) => {
    if (group) setRoundByGroup((prev) => ({ ...prev, [group.id]: idx }));
  };

  // La frase que responde a «¿qué viene?»: el próximo partido del club en este grupo.
  const next = nextOurMatch(groupMatches, today);
  const teamOf = (id: number | null) => (id !== null && competition?.teams[id] ? prettyTeamName(competition.teams[id].name) : "Por determinar");
  const subtitle = next
    ? `Próximo partido del club: ${teamOf(next.homeId)} – ${teamOf(next.awayId)}, ${next.date ? longDate(next.date).toLocaleLowerCase("es") : ""}${next.time ? ` a las ${next.time}` : ""}`
    : `${GENDER_LABEL[gender]} · temporada ${season}`;

  // La tira de números solo cuando todas las jornadas se numeran; si no (eliminatorias), un selector.
  const chips = group ? group.rounds.map((r) => roundChip(r.label)) : [];
  const useStrip = group !== undefined && group.rounds.length > 1 && chips.every((c) => c !== null);

  return (
    <div className="w-full max-w-[80rem]">
      <PageHeader title="Jornadas" subtitle={subtitle} />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <FilterBar
          className="mb-0"
          filters={{ season, gender: canPickGender ? gender : undefined }}
          setFilters={(updater) => {
            const prev = { season, gender: canPickGender ? gender : undefined };
            const nextFilters = typeof updater === "function" ? updater(prev) : updater;
            go({ season: nextFilters.season, gender: nextFilters.gender });
          }}
          configs={filterConfigs}
        />
        {groups.length > 1 && group ? (
          <SegmentedControl
            aria-label="Grupo"
            value={String(group.id)}
            options={groups.map((g) => ({ value: String(g.id), label: groupLabel(g.name) }))}
            onChange={(v) => setGroupId(Number(v))}
          />
        ) : null}
      </div>

      {!competition || !group ? (
        <p role={loadFailed ? "alert" : undefined} className="mt-6 text-sm text-[var(--text-muted)]">
          {loadFailed
            ? "No se han podido cargar las jornadas. Recarga la página en unos segundos; si sigue igual, avisa a un administrador."
            : "Todavía no hay datos de la federación para esta temporada. Se cargan con la sincronización semanal."}
        </p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-8 gap-y-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <section aria-labelledby="round-title" className="min-w-0">
            {useStrip ? (
              <div role="group" aria-label="Jornadas" className="mb-4 flex gap-1 overflow-x-auto pb-1">
                {group.rounds.map((r, i) => {
                  const selected = i === roundIdx;
                  return (
                    <button
                      key={r.id ?? i}
                      ref={(el) => {
                        // La jornada elegida queda a la vista aunque la tira se desplace.
                        if (selected && el) el.scrollIntoView({ inline: "center", block: "nearest" });
                      }}
                      type="button"
                      aria-current={selected ? "true" : undefined}
                      aria-label={roundTitle(r.label)}
                      onClick={() => setRound(i)}
                      className={`relative inline-flex h-9 min-w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg px-2 text-sm font-semibold tabular-nums transition-colors max-md:h-11 max-md:min-w-11 ${
                        selected
                          ? "bg-[var(--accent-muted)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_32%,transparent)]"
                          : isDone(r)
                            ? "text-[var(--text-secondary)] hover:bg-[var(--glass-surface)]"
                            : "text-[var(--text-muted)] hover:bg-[var(--glass-surface)]"
                      }`}
                    >
                      {chips[i]}
                      {i === group.currentRound ? (
                        <span aria-hidden className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--accent)]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <h2 id="round-title" className="text-xl font-semibold tracking-tight">
                  {round ? roundTitle(round.label) : "Sin jornadas"}
                </h2>
                {round && roundDates(round) ? <p className="mt-0.5 text-sm text-[var(--text-muted)]">{roundDates(round)}</p> : null}
              </div>

              {!useStrip && group.rounds.length > 1 ? (
                <select
                  aria-label="Ir a jornada"
                  value={roundIdx}
                  onChange={(e) => setRound(Number(e.target.value))}
                  className="h-9 max-w-[14rem] cursor-pointer rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] px-3 text-sm text-[var(--text-primary)] max-md:h-11"
                >
                  {group.rounds.map((r, i) => (
                    <option key={r.id ?? "none"} value={i}>
                      {roundTitle(r.label)}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {round ? <RoundMatches matches={round.matches} teams={competition.teams} /> : null}
          </section>

          {group.standings ? (
            <aside aria-labelledby="standings-title" className="min-w-0 xl:sticky xl:top-6">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="standings-title" className="text-xl font-semibold tracking-tight">
                  Clasificación
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {groupLabel(group.name)} · {group.teamIds.length} equipos
                </p>
              </div>
              <GroupStandings groupName={group.name} standings={group.standings} teams={competition.teams} />
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}
