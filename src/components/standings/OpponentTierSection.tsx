"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
      const rows: { normalized_name: string; team_name: string; is_our_team: boolean }[] =
        stJson.data ?? [];
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass flex flex-col items-start gap-3 p-5 sm:p-6"
      >
        <h2 className="section-header">Rendimiento contra rivales por clasificación</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Selecciona un género en el filtro superior para ver esta sección. La clasificación importada
          se consulta por temporada y género, y no se puede combinar ambos equipos a la vez.
        </p>
      </motion.div>
    );
  }

  if (loading && !data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass w-full p-5 sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <div className="h-6 w-64 max-w-full rounded-md bg-[var(--surface-faint)] animate-pulse" />
            <div className="h-3 w-48 max-w-full rounded-md bg-[var(--surface-faint)] animate-pulse" />
          </div>
          <div className="h-8 w-24 shrink-0 rounded-lg bg-[var(--surface-faint)] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-faint)]/80 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 rounded bg-[var(--color-bg-card)] animate-pulse" />
                <div className="h-4 w-4 shrink-0 rounded bg-[var(--color-bg-card)] animate-pulse" />
              </div>
              <div className="h-8 w-16 rounded bg-[var(--color-bg-card)] animate-pulse" />
              <div className="h-3 w-36 max-w-full rounded bg-[var(--color-bg-card)] animate-pulse" />
              <div className="mt-2 space-y-2 border-t border-[var(--glass-border)] pt-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3 w-14 rounded bg-[var(--color-bg-card)] animate-pulse" />
                  <div className="h-3 w-24 rounded bg-[var(--color-bg-card)] animate-pulse" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3 w-10 rounded bg-[var(--color-bg-card)] animate-pulse" />
                  <div className="h-3 w-20 rounded bg-[var(--color-bg-card)] animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (!data?.has_standings) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass flex flex-col items-start gap-3 p-5 sm:p-6 md:col-span-2"
      >
        <h2 className="section-header">Rendimiento contra rivales por clasificación</h2>
        <p className="text-sm text-[var(--text-muted)]">
          No hay clasificación importada para {season} ({gender === "male" ? "M" : "F"}).
          {isAdmin
            ? " Sube el archivo .xls de la liga para activar esta sección."
            : " Pide al admin que suba la clasificación final."}
        </p>
        {isAdmin && (
          <Link
            href="/league-standings/upload"
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            <FontAwesomeIcon icon={faUpload} /> Subir clasificación
          </Link>
        )}
      </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass p-5 sm:p-6 md:col-span-2"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-header">Rendimiento contra rivales por clasificación</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {data.total_teams} equipos en la liga · {totalLeaguePoints}/{maxLeaguePoints} pts
            LIGA conseguidos
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/league-standings/upload"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent)]"
          >
            <FontAwesomeIcon icon={faTableList} /> Re-subir
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TIER_META.map(({ key, label, icon }) => {
          const t = tiers[key];
          const winRate = t.played ? Math.round((t.won / t.played) * 100) : 0;
          const pointsPct = t.max_possible_points
            ? Math.round((t.league_points / t.max_possible_points) * 100)
            : 0;

          return (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-faint)] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {label}
                </span>
                <FontAwesomeIcon
                  icon={icon}
                  className="text-sm text-[var(--accent)]"
                />
              </div>

              <p className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                {winRate}%
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {t.won}V – {t.lost}D ({t.played} partido{t.played === 1 ? "" : "s"})
              </p>

              <div className="mt-2 border-t border-[var(--glass-border)] pt-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Pts LIGA</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {t.league_points}/{t.max_possible_points} · {pointsPct}%
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Sets</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {t.sets_for}–{t.sets_against}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-[var(--glass-border)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          De cara a la próxima temporada
        </h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Vista rápida según la clasificación final importada (tercios de tabla y posición relativa al
          nuestro). Sirve aunque cambien de categoría algunos equipos.
        </p>
        {ourPosition === null && (
          <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/95">
            Marca exactamente un equipo como «nuestro» en la clasificación para calcular derrotas
            evitables según la posición final.
            {isAdmin && (
              <>
                {" "}
                <Link href="/league-standings/upload" className="font-semibold underline hover:text-amber-100">
                  Revisar importación
                </Link>
              </>
            )}
          </p>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NextSeasonColumn
            title="Rivales complicados"
            subtitle="Top tabla · al menos una derrota"
            icon={faBolt}
            borderTone="border-amber-500/25 bg-amber-500/[0.07]"
            iconClass="text-amber-400"
            empty="Ningún rival del top te ganó esta temporada."
            rivals={nextSeason.tough}
            footnote={(r) => `Pos. ${r.position} · ${r.summary}`}
          />
          <NextSeasonColumn
            title="Rivales accesibles"
            subtitle="Cola tabla · al menos una victoria"
            icon={faSeedling}
            borderTone="border-emerald-500/25 bg-emerald-500/[0.07]"
            iconClass="text-emerald-400"
            empty="No hay victorias contra equipos de la cola."
            rivals={nextSeason.easy}
            footnote={(r) => `Pos. ${r.position} · ${r.summary}`}
          />
          <NextSeasonColumn
            title="Derrotas evitables"
            subtitle={
              ourPosition !== null
                ? `Perdiste frente a quien quedó por debajo (nosotros pos. ${ourPosition})`
                : "Perdiste frente a quien quedó por debajo en la tabla"
            }
            icon={faTriangleExclamation}
            borderTone="border-red-500/25 bg-red-500/[0.07]"
            iconClass="text-red-400"
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
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <HighlightCard
            icon={faStarOfLife}
            tone="positive"
            title="Mejor sorpresa"
            empty="Sin victorias registradas"
            row={data.highlights.best_surprise}
          />
          <HighlightCard
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
        className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)]"
      >
        <FontAwesomeIcon icon={showDetail ? faChevronUp : faChevronDown} />
        {showDetail ? "Ocultar" : "Ver"} detalle por rival ({data.per_opponent.length})
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
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            alias
                          </span>
                        )}
                        {p.resolved_via === null && (
                          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                            sin clasificar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {p.position ?? "–"}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right tabular-nums font-semibold ${
                        win
                          ? "text-emerald-400"
                          : lost
                          ? "text-red-400"
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
        <div className="mt-5">
          <AliasResolver
            unmatched={data.unmatched_opponents}
            candidates={candidates}
            onResolved={fetchData}
          />
        </div>
      )}
    </motion.div>
  );
}

function NextSeasonColumn({
  title,
  subtitle,
  icon,
  borderTone,
  iconClass,
  empty,
  rivals,
  footnote,
}: {
  title: string;
  subtitle: string;
  icon: IconDefinition;
  borderTone: string;
  iconClass: string;
  empty: string;
  rivals: NextSeasonRival[];
  footnote: (r: NextSeasonRival) => string;
}) {
  return (
    <div className={`flex min-h-[7rem] flex-col rounded-2xl border ${borderTone} p-4`}>
      <div className="mb-2 flex items-start gap-2">
        <FontAwesomeIcon icon={icon} className={`mt-0.5 shrink-0 text-sm ${iconClass}`} />
        <div className="min-w-0">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {title}
          </h4>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>
      {rivals.length === 0 ? (
        <p className="mt-auto text-xs leading-snug text-[var(--text-muted)]">{empty}</p>
      ) : (
        <ul className="mt-1 flex max-h-52 flex-col gap-1.5 overflow-y-auto pr-0.5">
          {rivals.map((r) => (
            <li
              key={`${r.team_name}-${r.position}`}
              className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)]/80 px-2.5 py-1.5"
            >
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{r.team_name}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{footnote(r)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HighlightCard({
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
  const toneClasses =
    tone === "positive"
      ? "border-emerald-500/30 bg-emerald-500/10"
      : "border-red-500/30 bg-red-500/10";
  const iconColor =
    tone === "positive" ? "text-emerald-400" : "text-red-400";

  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border ${toneClasses} p-4`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">
        <FontAwesomeIcon icon={icon} className={iconColor} />
        {title}
      </div>
      {row ? (
        <>
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {row.team_name ?? row.opponent_raw}{" "}
            <span className="text-xs font-normal text-[var(--text-muted)]">
              · pos #{row.position}
            </span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {row.our_sets}–{row.their_sets} · {row.league_points_earned} pts LIGA
          </p>
        </>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">{empty}</p>
      )}
    </div>
  );
}
