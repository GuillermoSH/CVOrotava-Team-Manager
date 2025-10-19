"use client";

import { useEffect, useState } from "react";
import VideosGrid from "@/components/videos/VideosGrid";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
import useViewportHeight from "@/hooks/useViewportHeight";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import Loading from "@/components/common/Loading";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useViewportHeight();

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const res = await fetch("/api/seasons");
        const data = await res.json();
        setSeasons(data);

        const resGender = await fetch("/api/user-gender");
        const dataGender = await resGender.json();
        const userGender = dataGender.gender as "male" | "female";
        console.log("Género del usuario:", dataGender);

        if (userGender) {
          setFilters((prev) => ({
            ...prev,
            gender: userGender,
          }));
        }
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la lista de videos.");
      } finally {
        setLoading(false);
      }
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

  if (loading) return <Loading />;

  if (error)
    return (
      <main className="flex justify-center items-center flex-1">
        <p className="text-red-500">{error}</p>
      </main>
    );

  return (
    <main className="w-full max-w-6xl p-6">
      <h1 className="text-2xl text-white font-bold mb-6">Videos de Partidos</h1>
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        configs={filterConfigs}
      />
      <VideosGrid filters={filters} />
    </main>
  );
}
