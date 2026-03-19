"use client";

import { useEffect, useState } from "react";
import MatchCard from "@/components/calendar/MatchCard";
import Loading from "@/components/common/Loading";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { useUser } from "@/contexts/UserContext";
import { useSeasons } from "@/contexts/SeasonContext";

export type Match = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  season: string;
  result?: string;
  video_url?: string;
  notes?: string;
  gender: "male" | "female";
  venues: {
    id: string;
    venue_name: string;
    location_url?: string;
    location_type: "home" | "away" | "outside_island";
  };
};

type Filters = {
  season?: string;
  gender?: string;
  competition_type?: string;
};

export default function CalendarPage() {
  const { user, loading: userLoading } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [filters, setFilters] = useState<Filters>(() => ({
    season: getCurrentSeason(),
    gender: user?.gender ?? undefined,
  }));
  const { seasons } = useSeasons();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch("/api/matches?order=asc");
        if (!res.ok) throw new Error("Error al obtener partidos");
        const data = (await res.json()) as Match[];

        setMatches(data);
        setFilteredMatches(data);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el calendario.");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  useEffect(() => {
    if (!filters.gender && user?.gender) {
      setFilters((prev) => ({ ...prev, gender: user.gender! }));
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...matches];
    if (filters.season)
      filtered = filtered.filter((m) => m.season === filters.season);
    if (filters.gender)
      filtered = filtered.filter((m) => m.gender === filters.gender);
    setFilteredMatches(filtered);
  }, [filters, matches]);

  if (loading || userLoading) return <Loading />;

  if (error)
    return (
      <main className="flex justify-center items-center flex-1">
        <p className="text-red-500">{error}</p>
      </main>
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

  return (
    <main className="w-full max-w-6xl py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">📅 Calendario</h1>
        <p className="text-sm text-[var(--text-muted)]">Partidos de la temporada</p>
      </div>

      <div className="mb-6">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          configs={filterConfigs}
        />
      </div>

      {filteredMatches.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-8">
          No hay partidos que coincidan con los filtros.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} isAdmin={user?.isAdmin} />
          ))}
        </div>
      )}
    </main>
  );
}
