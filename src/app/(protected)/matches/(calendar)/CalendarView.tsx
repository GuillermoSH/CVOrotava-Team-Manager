"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import MatchCard, { Match } from "@/components/calendar/MatchCard";
import MatchMonthView from "@/components/calendar/MatchMonthView";
import type { MatchFormValues } from "@/components/calendar/MatchModal";
import { matchToModalInitialValues } from "@/lib/matchFormValues";
import MatchesSkeleton from "@/components/skeletons/MatchesSkeleton";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { fuzzyFilter } from "@/utils/fuzzy";
import { useUser } from "@/contexts/UserContext";
import { useSeasons } from "@/contexts/SeasonContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faList,
  faCalendarDays,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Pagination from "@/components/ui/Pagination";
import { readPref, writePref } from "@/lib/prefs";

const MatchModal = dynamic(() => import("@/components/calendar/MatchModal"), {
  ssr: false,
});

type Filters = {
  season?: string;
  gender?: string;
  competition_type?: string;
};

type ViewMode = "list" | "month";

const VIEW_PREF_KEY = "cvorotava-calendar-view";

const PAGE_UPCOMING = 5;
const PAGE_PLAYED = 6;

function isMatchPast(match: Match): boolean {
  const matchDate = new Date(`${match.date}T${match.time}`);
  const matchEnd = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
  return Date.now() > matchEnd.getTime();
}

function monthKey(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function CalendarView({
  initialMatches,
}: {
  initialMatches: Match[];
}) {
  const { user, loading: userLoading } = useUser();
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [filters, setFilters] = useState<Filters>({
    season: getCurrentSeason(),
    gender: user?.gender ?? undefined,
  });
  const { seasons } = useSeasons();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [view, setViewState] = useState<ViewMode>("list");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [playedPage, setPlayedPage] = useState(1);

  useEffect(() => {
    const stored = readPref(VIEW_PREF_KEY);
    if (stored === "list" || stored === "month") {
      setViewState(stored);
    }
  }, []);

  const setView = (next: ViewMode) => {
    setViewState(next);
    writePref(VIEW_PREF_KEY, next);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<
    MatchFormValues | undefined
  >(undefined);

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches?order=asc");
      if (!res.ok) throw new Error("Error al obtener partidos");
      const data = (await res.json()) as Match[];
      setMatches(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el calendario.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.gender) return;
    setFilters((prev) =>
      prev.gender ? prev : { ...prev, gender: user.gender ?? undefined }
    );
  }, [user?.gender]);

  // Reset pagination when filters / search change
  useEffect(() => {
    setUpcomingPage(1);
    setPlayedPage(1);
  }, [filters.season, filters.gender, query]);

  const filteredMatches = useMemo(() => {
    let filtered = [...matches];
    if (filters.season)
      filtered = filtered.filter((m) => m.season === filters.season);
    if (filters.gender)
      filtered = filtered.filter((m) => m.gender === filters.gender);

    return fuzzyFilter(filtered, query, (m) => [
      m.opponent,
      m.venues.venue_name,
      m.result ?? "",
      m.notes ?? "",
    ]);
  }, [filters, matches, query]);

  const { upcoming, played } = useMemo(() => {
    const upcomingList: Match[] = [];
    const playedList: Match[] = [];
    for (const m of filteredMatches) {
      if (isMatchPast(m)) playedList.push(m);
      else upcomingList.push(m);
    }
    upcomingList.sort(
      (a, b) =>
        +new Date(`${a.date}T${a.time}`) - +new Date(`${b.date}T${b.time}`)
    );
    playedList.sort(
      (a, b) =>
        +new Date(`${b.date}T${b.time}`) - +new Date(`${a.date}T${a.time}`)
    );
    return { upcoming: upcomingList, played: playedList };
  }, [filteredMatches]);

  const upcomingPageCount = Math.max(
    1,
    Math.ceil(upcoming.length / PAGE_UPCOMING)
  );
  const playedPageCount = Math.max(1, Math.ceil(played.length / PAGE_PLAYED));

  const upcomingSlice = upcoming.slice(
    (upcomingPage - 1) * PAGE_UPCOMING,
    upcomingPage * PAGE_UPCOMING
  );
  const playedSlice = played.slice(
    (playedPage - 1) * PAGE_PLAYED,
    playedPage * PAGE_PLAYED
  );

  // Group current played page by month for headers
  const playedPageGroups = useMemo(() => {
    const groups: { key: string; items: Match[] }[] = [];
    for (const m of playedSlice) {
      const key = monthKey(m.date);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(m);
      else groups.push({ key, items: [m] });
    }
    return groups;
  }, [playedSlice]);

  const monthInitial = useMemo(() => {
    const next = upcoming[0] ?? played[0];
    if (!next) return new Date();
    return new Date(`${next.date}T12:00:00`);
  }, [upcoming, played]);

  if (loading || userLoading) return <MatchesSkeleton />;

  if (error)
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-[var(--color-danger)]">{error}</p>
      </div>
    );

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

  const handleEdit = (m: Match) => {
    setEditingMatch(matchToModalInitialValues(m));
    setIsModalOpen(true);
  };

  return (
    <div className="w-full text-[var(--text-primary)]">
      <PageHeader
        title="Calendario"
        subtitle={
          <>
            Partidos de la temporada
            {filteredMatches.length > 0 && (
              <span className="tabular-nums">
                {" "}
                · {filteredMatches.length} encuentro
                {filteredMatches.length === 1 ? "" : "s"}
              </span>
            )}
          </>
        }
        actions={
          <>
            <SegmentedControl
              aria-label="Vista del calendario"
              value={view}
              onChange={setView}
              options={[
                {
                  value: "list",
                  label: (
                    <>
                      <FontAwesomeIcon icon={faList} />
                      Lista
                    </>
                  ),
                },
                {
                  value: "month",
                  label: (
                    <>
                      <FontAwesomeIcon icon={faCalendarDays} />
                      Mes
                    </>
                  ),
                },
              ]}
            />
            {user?.isAdmin ? (
              <button
                type="button"
                className="btn-primary flex items-center gap-2"
                onClick={() => {
                  setEditingMatch(undefined);
                  setIsModalOpen(true);
                }}
              >
                <FontAwesomeIcon icon={faPlus} />
                Añadir partido
              </button>
            ) : null}
          </>
        }
      />

      <div className="mb-4">
        <label className="relative block">
          <span className="sr-only">Buscar partidos</span>
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar rival, pabellón, resultado…"
            className="w-full rounded-xl border border-[var(--form-input-border)] bg-[var(--form-input-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--form-placeholder)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]"
          />
        </label>
      </div>

      <div className="mb-8 [&_.mb-6]:mb-0">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          configs={filterConfigs}
        />
      </div>

      {filteredMatches.length === 0 ? (
        <p className="py-12 text-sm text-[var(--text-muted)]">
          No hay partidos que coincidan con la búsqueda o los filtros.
        </p>
      ) : view === "month" ? (
        <MatchMonthView
          key={`${filters.season}-${filters.gender}-${query}`}
          matches={filteredMatches}
          initialMonth={monthInitial}
        />
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight">
                Próximos
                <span className="ml-2 text-base font-normal tabular-nums text-[var(--text-muted)]">
                  {upcoming.length}
                </span>
              </h2>
              {upcoming.length > 0 && (
                <Pagination
                  page={Math.min(upcomingPage, upcomingPageCount)}
                  pageCount={upcomingPageCount}
                  onChange={setUpcomingPage}
                  label="Próximos"
                />
              )}
            </div>
            {upcoming.length === 0 ? (
              <p className="max-w-xl rounded-2xl border border-dashed border-[var(--border-dashed)] bg-[var(--surface-faint)] px-5 py-8 text-sm text-[var(--text-muted)]">
                No hay partidos próximos con estos filtros.
              </p>
            ) : (
              <ul className="grid gap-3 sm:gap-4 xl:grid-cols-2 xl:gap-4">
                {upcomingSlice.map((match) => (
                  <li key={match.id} className="min-w-0">
                    <MatchCard
                      match={match}
                      isAdmin={user?.isAdmin}
                      onEdit={handleEdit}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {played.length > 0 && (
            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight">
                  Jugados
                  <span className="ml-2 text-base font-normal tabular-nums text-[var(--text-muted)]">
                    {played.length}
                  </span>
                </h2>
                <Pagination
                  page={Math.min(playedPage, playedPageCount)}
                  pageCount={playedPageCount}
                  onChange={setPlayedPage}
                  label="Jugados"
                />
              </div>
              <div className="space-y-6">
                {playedPageGroups.map((group) => (
                  <div key={group.key}>
                    <h3 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
                      {monthLabel(group.key)}
                    </h3>
                    <ul className="grid gap-3 sm:gap-4 xl:grid-cols-2 xl:gap-4">
                      {group.items.map((match) => (
                        <li key={match.id} className="min-w-0">
                          <MatchCard
                            match={match}
                            isAdmin={user?.isAdmin}
                            onEdit={handleEdit}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {user?.isAdmin && (
        <MatchModal
          isOpen={isModalOpen}
          initialData={editingMatch}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchMatches();
          }}
        />
      )}
    </div>
  );
}
