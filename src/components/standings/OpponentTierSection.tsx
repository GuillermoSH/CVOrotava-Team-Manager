"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRankingStar,
  faMedal,
  faTrophy,
  faChevronDown,
  faChevronUp,
  faUpload,
  faStarOfLife,
  faTableList,
  faBolt,
  faSeedling,
  faTriangleExclamation,
  faSkullCrossbones,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import AliasResolver, {
  type StandingOption,
  type UnmatchedRow,
} from "./AliasResolver";

type Tier = "top" | "mid" | "bottom";

type TierStats = {
  played: number;
  won: number;
  lost: number;
  sets_for: number;
  sets_against: number;
  league_points: number;
  max_possible_points: number;
};

type PerOpponent = {
  match_id: string;
  date: string;
  opponent_raw: string;
  resolved_via: "direct" | "alias" | null;
  team_name: string | null;
  normalized_name?: string | null;
  position: number | null;
  tier: Tier | null;
  our_sets: number;
  their_sets: number;
  league_points_earned: number;
};

type NextSeasonRival = {
  team_name: string;
  position: number;
  tier: Tier;
  our_wins: number;
  our_losses: number;
  summary: string;
  worst_loss_sets: string | null;
};

type ApiResponse = {
  has_standings: boolean;
  season: string;
  gender: string;
  total_teams: number;
  our_position: number | null;
  tiers: Record<Tier, TierStats> | null;
  per_opponent: PerOpponent[];
  unmatched_opponents: UnmatchedRow[];
  next_season?: {
    tough: NextSeasonRival[];
    easy: NextSeasonRival[];
    upset_losses: NextSeasonRival[];
  };
  highlights: {
    best_surprise: PerOpponent | null;
    worst_upset: PerOpponent | null;
  } | null;
};

type Props = {
  season: string | undefined;
  gender: string | undefined;
  isAdmin: boolean;
};

const TIER_META: { key: Tier; label: string; icon: typeof faMedal }[] = [
  { key: "top", label: "Top de la tabla", icon: faTrophy },
  { key: "mid", label: "Zona media", icon: faMedal },
  { key: "bottom", label: "Cola de la tabla", icon: faRankingStar },
];

/** Formatea una fecha ISO (YYYY-MM-DD o full ISO) como dd-mm-aaaa. */
function formatDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${dd}-${mm}-${yy}`;
}

export default function OpponentTierSection({ season, gender, isAdmin }: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<StandingOption[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  const fetchData = useCallback(async () => {
    if (!season || !gender) {
      setData(null);
      setCandidates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tierRes, stRes] = await Promise.all([
        fetch(`/api/stats/opponent-tier?season=${season}&gender=${gender}`),
        fetch(`/api/league-standings?season=${season}&gender=${gender}`),
      ]);
      const tierJson = (await tierRes.json()) as ApiResponse;
      const stJson = await stRes.json();
      const rows: {
        normalized_name: string;
        team_name: string;
        is_our_team: boolean;
      }[] = stJson.data ?? [];
      setCandidates(
        rows
          .filter((r) => !r.is_our_team)
          .map((r) => ({
            normalized_name: r.normalized_name,
            team_name: r.team_name,
          }))
      );
      setData(tierJson);
    } finally {
      setLoading(false);
    }
  }, [season, gender]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!season) return null;

  if (!gender) {
    return (
      <section>
        <h2 className="mb-2 text-lg font-semibold tracking-tight sm:text-xl">
          Rendimiento contra rivales
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Selecciona un género en el filtro superior para ver esta sección. La
          clasificación importada se consulta por temporada y género.
        </p>
      </section>
    );
  }

  if (loading && !data) {
    return (
      <section>
        <div className="mb-4 h-6 w-56 max-w-full rounded-md bg-[var(--surface-faint)] animate-pulse" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-3 w-28 rounded bg-[var(--surface-faint)] animate-pulse" />
              <div className="h-8 w-16 rounded bg-[var(--surface-faint)] animate-pulse" />
              <div className="h-3 w-36 rounded bg-[var(--surface-faint)] animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!data?.has_standings) {
    return (
      <section>
        <h2 className="mb-2 text-lg font-semibold tracking-tight sm:text-xl">
          Rendimiento contra rivales
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          No hay clasificación importada para {season} (
          {gender === "male" ? "M" : "F"}).
          {isAdmin
            ? " Sube el archivo .xls de la liga para activar esta sección."
            : " Pide al admin que suba la clasificación final."}
        </p>
        {isAdmin && (
          <Link
            href="/league-standings/upload"
            className="btn-primary mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            <FontAwesomeIcon icon={faUpload} /> Subir clasificación
          </Link>
        )}
      </section>
    );
  }

  const tiers = data.tiers!;
  const totalLeaguePoints = (Object.values(tiers) as TierStats[]).reduce(
    (s, t) => s + t.league_points,
    0
  );
  const maxLeaguePoints = (Object.values(tiers) as TierStats[]).reduce(
    (s, t) => s + t.max_possible_points,
    0
  );

  const nextSeason = data.next_season ?? {
    tough: [] as NextSeasonRival[],
    easy: [] as NextSeasonRival[],
    upset_losses: [] as NextSeasonRival[],
  };
  const ourPosition = data.our_position ?? null;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Rendimiento contra rivales
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {data.total_teams} equipos · {totalLeaguePoints}/{maxLeaguePoints}{" "}
            pts LIGA
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/league-standings/upload"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
          >
            <FontAwesomeIcon icon={faTableList} /> Re-subir
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 border-b border-[var(--glass-border)] pb-8 sm:grid-cols-3 sm:gap-8">
        {TIER_META.map(({ key, label, icon }) => {
          const t = tiers[key];
          const winRate = t.played ? Math.round((t.won / t.played) * 100) : 0;
          const pointsPct = t.max_possible_points
            ? Math.round((t.league_points / t.max_possible_points) * 100)
            : 0;

          return (
            <div key={key}>
              <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <FontAwesomeIcon
                  icon={icon}
                  className="text-[0.7rem] text-[var(--accent)]"
                />
                {label}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
                {winRate}%
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {t.won}V – {t.lost}D · {t.played} partido
                {t.played === 1 ? "" : "s"}
              </p>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Pts {t.league_points}/{t.max_possible_points} · {pointsPct}% ·
                Sets {t.sets_for}–{t.sets_against}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
          De cara a la próxima temporada
        </h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Según la clasificación final (tercios de tabla y posición relativa).
        </p>
        {ourPosition === null && (
          <p className="mt-3 text-sm text-[var(--color-warning)]">
            Marca un equipo como «nuestro» en la clasificación para calcular
            derrotas evitables.
            {isAdmin && (
              <>
                {" "}
                <Link
                  href="/league-standings/upload"
                  className="font-semibold underline hover:text-[var(--accent)]"
                >
                  Revisar importación
                </Link>
              </>
            )}
          </p>
        )}
        <div className="mt-5 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
          <NextSeasonColumn
            title="Rivales complicados"
            subtitle="Top tabla · al menos una derrota"
            icon={faBolt}
            iconClass="text-[var(--color-warning)]"
            empty="Ningún rival del top te ganó esta temporada."
            rivals={nextSeason.tough}
            footnote={(r) => `Pos. ${r.position} · ${r.summary}`}
          />
          <NextSeasonColumn
            title="Rivales accesibles"
            subtitle="Cola tabla · al menos una victoria"
            icon={faSeedling}
            iconClass="text-[var(--color-success)]"
            empty="No hay victorias contra equipos de la cola."
            rivals={nextSeason.easy}
            footnote={(r) => `Pos. ${r.position} · ${r.summary}`}
          />
          <NextSeasonColumn
            title="Derrotas evitables"
            subtitle={
              ourPosition !== null
                ? `Perdiste frente a quien quedó por debajo (pos. ${ourPosition})`
                : "Perdiste frente a quien quedó por debajo en la tabla"
            }
            icon={faTriangleExclamation}
            iconClass="text-[var(--color-danger)]"
            empty={
              ourPosition === null
                ? "Sin posición propia no se puede calcular esta lista."
                : "No hay derrotas contra equipos que acabaron por debajo."
            }
            rivals={nextSeason.upset_losses}
            footnote={(r) =>
              [
                `Pos. ${r.position}`,
                r.worst_loss_sets ? `peor partido ${r.worst_loss_sets}` : null,
                r.summary,
              ]
                .filter(Boolean)
                .join(" · ")
            }
          />
        </div>
      </div>

      {data.highlights && (
        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-[var(--glass-border)] pt-8 sm:grid-cols-2 sm:gap-10">
          <HighlightBlock
            icon={faStarOfLife}
            tone="positive"
            title="Mejor sorpresa"
            empty="Sin victorias registradas"
            row={data.highlights.best_surprise}
          />
          <HighlightBlock
            icon={faSkullCrossbones}
            tone="negative"
            title="Peor revés"
            empty="Sin derrotas registradas"
            row={data.highlights.worst_upset}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="mt-8 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
      >
        <FontAwesomeIcon icon={showDetail ? faChevronUp : faChevronDown} />
        {showDetail ? "Ocultar" : "Ver"} detalle por rival (
        {data.per_opponent.length})
      </button>

      {showDetail && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-[var(--text-muted)]">
                <th className="px-2 py-2">Fecha</th>
                <th className="px-2 py-2">Rival</th>
                <th className="px-2 py-2 text-right">Pos</th>
                <th className="px-2 py-2 text-right">Sets</th>
                <th className="px-2 py-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {data.per_opponent.map((p) => {
                const win = p.our_sets > p.their_sets;
                const lost = p.our_sets < p.their_sets;
                return (
                  <tr
                    key={p.match_id}
                    className="border-t border-[var(--glass-border)]"
                  >
                    <td className="px-2 py-1.5 text-xs text-[var(--text-muted)]">
                      {formatDate(p.date)}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <span>{p.team_name ?? p.opponent_raw}</span>
                        {p.resolved_via === "alias" && (
                          <span className="text-[10px] font-semibold text-[var(--color-warning)]">
                            alias
                          </span>
                        )}
                        {p.resolved_via === null && (
                          <span className="text-[10px] font-semibold text-[var(--color-danger)]">
                            sin clasificar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {p.position ?? "–"}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right font-semibold tabular-nums ${
                        win
                          ? "text-[var(--color-success)]"
                          : lost
                            ? "text-[var(--color-danger)]"
                            : "text-[var(--text-muted)]"
                      }`}
                    >
                      {p.our_sets}–{p.their_sets}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {p.league_points_earned}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && data.unmatched_opponents.length > 0 && (
        <div className="mt-6">
          <AliasResolver
            unmatched={data.unmatched_opponents}
            candidates={candidates}
            onResolved={fetchData}
          />
        </div>
      )}
    </section>
  );
}

function NextSeasonColumn({
  title,
  subtitle,
  icon,
  iconClass,
  empty,
  rivals,
  footnote,
}: {
  title: string;
  subtitle: string;
  icon: IconDefinition;
  iconClass: string;
  empty: string;
  rivals: NextSeasonRival[];
  footnote: (r: NextSeasonRival) => string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-start gap-2">
        <FontAwesomeIcon
          icon={icon}
          className={`mt-0.5 shrink-0 text-sm ${iconClass}`}
        />
        <div className="min-w-0">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {title}
          </h4>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
            {subtitle}
          </p>
        </div>
      </div>
      {rivals.length === 0 ? (
        <p className="text-xs leading-snug text-[var(--text-muted)]">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--glass-border)]">
          {rivals.map((r) => (
            <li key={`${r.team_name}-${r.position}`} className="py-2 first:pt-0 last:pb-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {r.team_name}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {footnote(r)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HighlightBlock({
  icon,
  tone,
  title,
  empty,
  row,
}: {
  icon: typeof faStarOfLife;
  tone: "positive" | "negative";
  title: string;
  empty: string;
  row: PerOpponent | null;
}) {
  const iconColor =
    tone === "positive"
      ? "text-[var(--color-success)]"
      : "text-[var(--color-danger)]";

  return (
    <div>
      <p
        className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${iconColor}`}
      >
        <FontAwesomeIcon icon={icon} />
        {title}
      </p>
      {row ? (
        <>
          <p className="mt-1.5 text-base font-semibold text-[var(--text-primary)]">
            {row.team_name ?? row.opponent_raw}{" "}
            <span className="text-xs font-normal text-[var(--text-muted)]">
              · pos #{row.position}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {row.our_sets}–{row.their_sets} · {row.league_points_earned} pts LIGA
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">{empty}</p>
      )}
    </div>
  );
}
