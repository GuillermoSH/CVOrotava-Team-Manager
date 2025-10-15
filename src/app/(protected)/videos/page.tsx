"use client";

import { useEffect, useState } from "react";
import VideosGrid from "@/components/videos/VideosGrid";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
import useViewportHeight from "@/hooks/useViewportHeight";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

type Filters = {
  season?: string;
  competition_type?: string;
  gender?: string;
  category?: "match" | "training";
};

export default function PartidosPage() {
  const [filters, setFilters] = useState<Filters>({
    season: getCurrentSeason(),
  });
  const [seasons, setSeasons] = useState<string[]>([]);
  useViewportHeight();

  useEffect(() => {
    const fetchSeasons = async () => {
      const res = await fetch("/api/seasons");
      const data = await res.json();
      setSeasons(data);
    };
    fetchSeasons();
  }, []);

  const filterConfigs: FilterConfig[] = [
    {
      key: "season",
      label: "Temporada",
      options: seasons.map((s) => ({ label: s, value: s })),
    },
    {
      key: "category",
      label: "Categoría",
      options: [
        { label: "Partido", value: "match" },
        { label: "Entrenamiento", value: "training" },
      ],
    },
    {
      key: "competition_type",
      label: "Competición",
      options: [
        { label: "Liga", value: "league" },
        { label: "Amistoso", value: "friendly" },
      ],
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
    <main className="p-6">
      <h1 className="text-2xl text-white font-bold mb-6">Videos de Partidos</h1>
      <FilterBar filters={filters} setFilters={setFilters} configs={filterConfigs} />
      <VideosGrid filters={filters} />
    </main>
  );
}
