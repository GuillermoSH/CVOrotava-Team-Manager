"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import FilterBar, { type FilterConfig } from "@/components/ui/FilterBar";
import PageHeader from "@/components/ui/PageHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import GroupStandings from "@/components/competition/GroupStandings";
import RoundMatches from "@/components/competition/RoundMatches";
import { shortDate } from "@/components/stats/competitive/format";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { Competition, CompetitionGroup, CompetitionRound, Gender } from "@/lib/competition/build";

const GENDER_LABEL: Record<Gender, string> = { male: "Masculino", female: "Femenino" };

function roundDates(round: CompetitionRound): string | null {
  if (!round.startDate) return null;
  if (!round.endDate || round.endDate === round.startDate) return shortDate(round.startDate);
  return `${shortDate(round.startDate)} – ${shortDate(round.endDate)}`;
}

/** Grupo que se abre primero: el de nuestro equipo con más partidos. */
function defaultGroup(groups: CompetitionGroup[]): CompetitionGroup | undefined {
  return groups.find((g) => g.hasOurs) ?? groups[0];
}

const navButton =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40";

export default function JornadasView({
  competition,
  seasons,
  season,
  gender,
  canPickGender,
}: Readonly<{
  competition: Competition | null;
  seasons: string[];
  season: string;
  gender: Gender;
  canPickGender: boolean;
}>) {
  const router = useRouter();
  const groups = competition?.groups ?? [];
  const [groupId, setGroupId] = useState<number | null>(defaultGroup(groups)?.id ?? null);
  const [roundByGroup, setRoundByGroup] = useState<Record<number, number>>({});

  const group = groups.find((g) => g.id === groupId) ?? defaultGroup(groups);
  const roundIdx = group ? Math.min(roundByGroup[group.id] ?? group.currentRound, group.rounds.length - 1) : 0;
  const round = group?.rounds[roundIdx];
  // El scout de un partido usa los resultados de todo el grupo, no solo de la jornada.
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

  return (
    <div className="w-full">
      <PageHeader
        title="Jornadas"
        subtitle={`${GENDER_LABEL[gender]} · temporada ${season}`}
      />

      <FilterBar
        filters={{ season, gender: canPickGender ? gender : undefined }}
        setFilters={(updater) => {
          const prev = { season, gender: canPickGender ? gender : undefined };
          const next = typeof updater === "function" ? updater(prev) : updater;
          go({ season: next.season, gender: next.gender });
        }}
        configs={filterConfigs}
      />

      {!competition || !group ? (
        <p className="mt-6 text-sm text-[var(--text-muted)]">
          Todavía no hay datos de la federación para esta temporada. Se cargan con la sincronización semanal.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.length > 1 ? (
            <SegmentedControl
              aria-label="Grupo"
              value={String(group.id)}
              options={groups.map((g) => ({ value: String(g.id), label: prettyTeamName(g.name) }))}
              onChange={(v) => setGroupId(Number(v))}
            />
          ) : null}

          {groups.length === 1 || !group.hasOurs ? (
            <p className="-mt-3 text-xs text-[var(--text-muted)]">
              {group.hasOurs ? prettyTeamName(group.name) : `${prettyTeamName(group.name)} · no juega el club`}
            </p>
          ) : null}

          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_28rem]">
            <section aria-labelledby="round-title" className="min-w-0">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="round-title" className="truncate text-lg font-semibold tracking-tight">
                    {round ? round.label : "Sin jornadas"}
                  </h2>
                  {round && roundDates(round) ? (
                    <p className="text-xs text-[var(--text-muted)]">{roundDates(round)}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {group.rounds.length > 1 ? (
                    <select
                      aria-label="Ir a jornada"
                      value={roundIdx}
                      onChange={(e) => setRound(Number(e.target.value))}
                      className="h-9 max-w-[9rem] cursor-pointer rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] px-3 text-sm text-[var(--text-primary)]"
                    >
                      {group.rounds.map((r, i) => (
                        <option key={r.id ?? "none"} value={i}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <button
                    type="button"
                    className={navButton}
                    aria-label="Jornada anterior"
                    disabled={roundIdx <= 0}
                    onClick={() => setRound(roundIdx - 1)}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  <button
                    type="button"
                    className={navButton}
                    aria-label="Jornada siguiente"
                    disabled={roundIdx >= group.rounds.length - 1}
                    onClick={() => setRound(roundIdx + 1)}
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                </div>
              </div>

              {round ? (
                <RoundMatches matches={round.matches} teams={competition.teams} groupMatches={groupMatches} />
              ) : null}
            </section>

            {group.standings ? (
              <section aria-labelledby="standings-title" className="min-w-0">
                <h2 id="standings-title" className="mb-3 text-lg font-semibold tracking-tight">
                  Clasificación
                </h2>
                <GroupStandings groupName={group.name} standings={group.standings} teams={competition.teams} />
              </section>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
