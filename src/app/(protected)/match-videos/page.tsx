"use client";

import { useEffect, useState } from "react";
import VideosGrid from "@/components/VideosGrid";
import FiltersBar from "@/components/FiltersBar";
import { getSeasons } from "@/lib/videos";

export default function PartidosPage() {
  const [filters, setFilters] = useState<{ season?: string; competition_type?: string; gender?: string }>({});
  const [seasons, setSeasons] = useState<string[]>([]);

  useEffect(() => {
    const fetchSeasons = async () => {
      const data = await getSeasons();
      setSeasons(data);
    };
    fetchSeasons();
  }, []);

  return (
    <main className="min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-fixed bg-center bg-cover p-6">
      <h1 className="text-2xl font-bold mb-6">Videos de Partidos</h1>
      <FiltersBar filters={filters} setFilters={setFilters} seasons={seasons} />
      <VideosGrid category="match" filters={filters} />
    </main>
  );
}

