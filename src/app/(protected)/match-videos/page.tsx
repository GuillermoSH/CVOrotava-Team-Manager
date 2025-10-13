"use client";

import { useEffect, useState } from "react";
import VideosGrid from "@/components/VideosGrid";
import FiltersBar from "@/components/FiltersBar";
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
    <main
      className="min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-fixed bg-cover p-6"
      style={{ minHeight: "calc(var(--vh, 1vh) * 100)" }}
    >
      <h1 className="text-2xl text-white font-bold mb-6">Videos de Partidos</h1>
      <FiltersBar filters={filters} setFilters={setFilters} seasons={seasons} />
      <VideosGrid category="match" filters={filters} />
    </main>
  );
}
