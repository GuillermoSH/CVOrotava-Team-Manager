"use client";

import { useEffect, useState } from "react";
import VideosGrid from "@/components/videos/VideosGrid";
import FiltersBar from "@/components/ui/FiltersBar";
import useViewportHeight from "@/hooks/useViewportHeight";

type Filters = {
  season?: string;
  competition_type?: string;
  gender?: string;
};

export default function PartidosPage() {
  const [filters, setFilters] = useState<Filters>({});
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

  return (
    <main className="p-6">
      <h1 className="text-2xl text-white font-bold mb-6">Videos de Partidos</h1>
      <FiltersBar filters={filters} setFilters={setFilters} seasons={seasons} />
      <VideosGrid category="match" filters={filters} />
    </main>
  );
}
