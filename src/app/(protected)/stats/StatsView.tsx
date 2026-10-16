"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
import PageHeader from "@/components/ui/PageHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import TeamCardPanel from "@/components/stats/competitive/TeamCardPanel";
import RivalsPanel from "@/components/stats/competitive/RivalsPanel";
import { FormPanel, NextMatchPanel, TopRivalPanel } from "@/components/stats/competitive/NextMatchPanel";
import { StatsSummarySkeleton } from "@/components/skeletons/StatsSkeleton";
import { useSeasons } from "@/contexts/SeasonContext";
import { useUser } from "@/contexts/UserContext";
import { readPref, writePref } from "@/lib/prefs";
import type { CompetitiveStats } from "@/lib/stats/competitive/build";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarCheck,
  faTrophy,
  faTimesCircle,
  faHouse,
  faCarSide,
  faPlaneDeparture,
  faUsers,
  faLayerGroup,
  faArrowsLeftRight,
  faPercent,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type Match = {
  id: string;
  fed_match_id: number | null;
  season: string;
  gender: "male" | "female";
  result: string | null;
  venues?: { location_type: string } | null;
  opponent: string;
};

type Filters = {
  season?: string;
  gender?: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

type Tab = "resumen" | "rivales" | "liga" | "versus";
type Scope = "liga" | "todas";
const TAB_PREF_KEY = "cvorotava-stats-tab";

const LeaguePanel = dynamic(() => import("@/components/stats/competitive/LeaguePanel"), {
  ssr: false,
  loading: () => <div className="h-64" aria-hidden />,
});
const VersusPanel = dynamic(() => import("@/components/stats/competitive/VersusPanel"), {
  ssr: false,
  loading: () => <div className="h-64" aria-hidden />,
});
const FedSyncStatus = dynamic(() => import("@/components/calendar/FedSyncStatus"), { ssr: false });

const ResultDistributionChart = dynamic(
  () => import("@/components/stats/ResultDistributionChart"),
  { ssr: false, loading: () => <div className="h-[200px]" aria-hidden /> }
);

/** Parse marcador tipo "3-1"; devuelve null si no es válido. */
function parseSetScore(
  result: string | null | undefined
): [number, number] | null {
  if (!result || typeof result !== "string") return null;
  const idx = result.indexOf("-");
  if (idx <= 0 || idx >= result.length - 1) return null;
  const us = Number.parseInt(result.slice(0, idx).trim(), 10);
  const them = Number.parseInt(result.slice(idx + 1).trim(), 10);
  if (!Number.isFinite(us) || !Number.isFinite(them)) return null;
  return [us, them];
}

function rateTone(wr: number): string {
  if (wr >= 50) return "text-[var(--color-success)]";
  if (wr > 0) return "text-[var(--color-danger)]";
  return "text-[var(--text-muted)]";
}

export default function StatsView({
  initialMatches,
  initialFilters,
  initialCompetitive,
}: {
  initialMatches: Match[];
  initialFilters: Filters;
  initialCompetitive: CompetitiveStats | null;
}) {
  const reduceMotion = useReducedMotion();
  const { user } = useUser();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const { seasons } = useSeasons();
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [competitive, setCompetitive] = useState<CompetitiveStats | null>(initialCompetitive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTabState] = useState<Tab>("resumen");
  const [scope, setScope] = useState<Scope>("liga");
  const [selectedRival, setSelectedRival] = useState<number | null>(null);

  useEffect(() => {
    const saved = readPref(TAB_PREF_KEY);
    if (saved === "resumen" || saved === "rivales" || saved === "liga" || saved === "versus") setTabState(saved);
  }, []);

  const setTab = (next: Tab) => {
    setTabState(next);
    writePref(TAB_PREF_KEY, next);
  };

  const openRival = (teamId: number) => {
    setSelectedRival(teamId);
    setTab("rivales");
  };

  const filterConfigs: FilterConfig[] = [
    {
      key: "season",
      label: "Temporada",
      options: seasons.map((s) => ({ label: s, value: s })),
    },
    {
      key: "gender",
      label: "Género",
      options: [
        { label: "Masculino", value: "male" },
        { label: "Femenino", value: "female" },
      ],
    },
  ];

  const loadAll = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.season) params.set("season", f.season);
      if (f.gender) params.set("gender", f.gender);
      const qs = params.toString();
      const [statsRes, compRes] = await Promise.all([
        fetch(qs ? `/api/stats?${qs}` : "/api/stats"),
        f.season && f.gender ? fetch(`/api/stats/competitive?${qs}`) : Promise.resolve(null),
      ]);
      const data = await statsRes.json();
      setMatches(data.matches || []);
      if (compRes) {
        if (!compRes.ok) throw new Error("No se pudieron cargar las estadísticas competitivas");
        setCompetitive((await compRes.json()) as CompetitiveStats);
      } else {
        setCompetitive(null);
      }
      setSelectedRival(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las estadísticas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sameSeason = (filters.season ?? "") === (initialFilters.season ?? "");
    const sameGender = (filters.gender ?? "") === (initialFilters.gender ?? "");
    if (sameSeason && sameGender) return;
    void loadAll(filters);
  }, [filters, initialFilters.season, initialFilters.gender, loadAll]);

  const leagueIds = useMemo(() => new Set(competitive?.leagueMatchIds ?? []), [competitive]);
  const canScope = Boolean(competitive?.hasLeague);
  const validMatches = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.result &&
          (!canScope || scope === "todas" || (m.fed_match_id !== null && leagueIds.has(m.fed_match_id)))
      ),
    [matches, canScope, scope, leagueIds]
  );

  const wins = validMatches.filter((m) => {
    const s = parseSetScore(m.result);
    return s !== null && s[0] > s[1];
  }).length;

  const total = validMatches.length;
  const losses = total - wins;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const derivedExtras = useMemo(() => {
    let setsFor = 0;
    let setsAgainst = 0;
    const opponents = new Set<string>();
    for (const m of validMatches) {
      const s = parseSetScore(m.result);
      if (!s) continue;
      const [us, them] = s;
      setsFor += us;
      setsAgainst += them;
      if (m.opponent?.trim()) opponents.add(m.opponent.trim());
    }
    return {
      setsFor,
      setsAgainst,
      setDiff: setsFor - setsAgainst,
      uniqueOpponents: opponents.size,
    };
  }, [validMatches]);

  const resultDistSorted = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const m of validMatches) {
      if (!m.result) continue;
      acc[m.result] = (acc[m.result] || 0) + 1;
    }
    return Object.entries(acc)
      .map(([result, count]) => ({ result, count }))
      .sort((a, b) => b.count - a.count);
  }, [validMatches]);

  const topResultLabel = useMemo(() => {
    if (resultDistSorted.length === 0) return null;
    const top = resultDistSorted[0];
    return `${top.result} (${top.count})`;
  }, [resultDistSorted]);

  interface LocationStats {
    [key: string]: { total: number; wins: number };
  }

  const rawLocationStats = validMatches.reduce((acc: LocationStats, m) => {
    const loc = m.venues?.location_type || "unknown";
    const s = parseSetScore(m.result);
    if (!s) return acc;
    const [us, them] = s;
    acc[loc] ??= { total: 0, wins: 0 };
    acc[loc].total++;
    if (us > them) acc[loc].wins++;
    return acc;
  }, {} as LocationStats);

  const locationTypes: {
    key: string;
    label: string;
    icon: IconDefinition;
  }[] = [
    { key: "home", label: "Casa", icon: faHouse },
    { key: "away", label: "Fuera", icon: faCarSide },
    { key: "outside_island", label: "Viaje", icon: faPlaneDeparture },
  ];

  const locationStats = locationTypes.map(({ key, label, icon }) => {
    const stats = rawLocationStats[key] || { total: 0, wins: 0 };
    const locWinRate = stats.total
      ? Math.round((stats.wins / stats.total) * 100)
      : 0;
    return { location: label, icon, winRate: locWinRate, total: stats.total };
  });

  const diffTone =
    derivedExtras.setDiff > 0
      ? "text-[var(--color-success)]"
      : derivedExtras.setDiff < 0
        ? "text-[var(--color-danger)]"
        : "text-[var(--text-secondary)]";

  const summaryMetrics: {
    key: string;
    label: string;
    value: ReactNode;
    tone: string;
    icon: IconDefinition;
  }[] = [
    {
      key: "played",
      label: "Jugados",
      value: total,
      tone: "text-[var(--accent)]",
      icon: faCalendarCheck,
    },
    {
      key: "wins",
      label: "Ganados",
      value: wins,
      tone: "text-[var(--color-success)]",
      icon: faTrophy,
    },
    {
      key: "losses",
      label: "Perdidos",
      value: losses,
      tone: "text-[var(--color-danger)]",
      icon: faTimesCircle,
    },
    {
      key: "rate",
      label: "Tasa victoria",
      value: `${winRate}%`,
      tone: "text-[var(--text-primary)]",
      icon: faPercent,
    },
    {
      key: "sets",
      label: "Sets F–C",
      value: `${derivedExtras.setsFor}–${derivedExtras.setsAgainst}`,
      tone: "text-[var(--text-primary)]",
      icon: faLayerGroup,
    },
    {
      key: "diff",
      label: "Dif. sets",
      value: `${derivedExtras.setDiff > 0 ? "+" : ""}${derivedExtras.setDiff}`,
      tone: diffTone,
      icon: faArrowsLeftRight,
    },
    {
      key: "rivals",
      label: "Rivales",
      value: derivedExtras.uniqueOpponents,
      tone: "text-[var(--text-primary)]",
      icon: faUsers,
    },
    {
      key: "top",
      label: "Marcador frecuente",
      value: topResultLabel ?? "—",
      tone: "text-[var(--text-primary)]",
      icon: faLayerGroup,
    },
  ];

  const competitiveBlock = (content: ReactNode) =>
    filters.gender && filters.season ? (
      content
    ) : (
      <p className="text-sm text-[var(--text-muted)]">
        Elige una temporada y un género en los filtros para ver la ficha y los rivales.
      </p>
    );

  const seasonSummary = (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Temporada</h2>
        {canScope ? (
          <SegmentedControl
            aria-label="Competiciones incluidas"
            value={scope}
            onChange={setScope}
            options={[
              { value: "liga", label: "Liga regular" },
              { value: "todas", label: "Todas" },
            ]}
          />
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-[var(--glass-border)] pb-8 sm:grid-cols-4">
        {summaryMetrics.map((m) => (
          <div key={m.key}>
            <dt
              className={`flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider ${m.tone}`}
            >
              <FontAwesomeIcon icon={m.icon} className="text-[0.7rem]" aria-hidden />
              {m.label}
            </dt>
            <dd className={`mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${m.tone}`}>
              {m.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );

  const detailCharts = (
    <div className="grid gap-10 md:grid-cols-2 md:gap-x-10">
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">Distribución de resultados</h2>
        {resultDistSorted.length > 0 ? (
          <ResultDistributionChart data={resultDistSorted} />
        ) : (
          <p className="py-6 text-sm text-[var(--text-muted)]">Sin resultados suficientes para mostrar el gráfico</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">Rendimiento por lugar</h2>
        <ul className="divide-y divide-[var(--glass-border)]">
          {locationStats.map((loc) => (
            <li key={loc.location} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <FontAwesomeIcon icon={loc.icon} className="w-4 shrink-0 text-sm text-[var(--accent)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{loc.location}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {loc.total} partido{loc.total === 1 ? "" : "s"}
                </p>
              </div>
              <p className={`shrink-0 text-lg font-bold tabular-nums sm:text-xl ${rateTone(loc.winRate)}`}>
                {loc.winRate}%
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

  return (
    <motion.div
      className="flex w-full flex-col text-[var(--text-primary)]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <PageHeader
        title="Estadísticas"
        subtitle={
          <>
            Rendimiento del equipo por temporada y contexto
            <span className="mt-1 block text-xs">
              <FedSyncStatus
                isAdmin={Boolean(user?.isAdmin)}
                onSynced={() => void loadAll(filters)}
              />
            </span>
          </>
        }
      />

      <FilterBar filters={filters} setFilters={setFilters} configs={filterConfigs} />

      <div className="mb-8">
        <SegmentedControl
          aria-label="Sección de estadísticas"
          value={tab}
          onChange={setTab}
          options={[
            { value: "resumen", label: "Resumen" },
            { value: "rivales", label: "Rivales" },
            { value: "liga", label: "Liga" },
            { value: "versus", label: "Vs. año pasado" },
          ]}
        />
      </div>

      {error ? (
        <p role="alert" className="mb-6 text-sm text-[var(--color-danger)]">
          {error}{" "}
          <button
            type="button"
            onClick={() => void loadAll(filters)}
            className="font-semibold underline underline-offset-2 hover:text-[var(--accent)]"
          >
            Reintentar
          </button>
        </p>
      ) : null}

      {loading ? (
        <StatsSummarySkeleton />
      ) : tab === "rivales" ? (
        competitiveBlock(
          competitive ? (
            <RivalsPanel stats={competitive} selectedId={selectedRival} onSelect={setSelectedRival} />
          ) : null
        )
      ) : tab === "liga" ? (
        competitiveBlock(competitive ? <LeaguePanel stats={competitive} /> : null)
      ) : tab === "versus" ? (
        competitiveBlock(competitive ? <VersusPanel stats={competitive} /> : null)
      ) : (
        <div className="flex w-full flex-col gap-10 lg:gap-14">
          {competitiveBlock(
            competitive ? (
              <div className="grid gap-8 lg:grid-cols-[19.5rem_minmax(0,1fr)] lg:gap-14">
                <div className="order-2 lg:order-1">
                  <TeamCardPanel stats={competitive} />
                </div>
                <div className="order-1 flex flex-col gap-9 lg:order-2">
                  <NextMatchPanel stats={competitive} onOpenRival={openRival} />
                  <FormPanel stats={competitive} />
                  <TopRivalPanel stats={competitive} onOpenRival={openRival} />
                </div>
              </div>
            ) : null
          )}
          {seasonSummary}
          {detailCharts}
        </div>
      )}
    </motion.div>
  );
}
