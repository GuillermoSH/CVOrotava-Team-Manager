"use client";

import { useState, useEffect, useRef } from "react";

type Video = {
  id: string;
  url: string;
  created_at: string;
};

type Filters = {
  season?: string;
  competition_type?: string;
  gender?: string;
  category?: "match" | "training";
};

export function useInfiniteVideos(filters?: Filters) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const [limit, setLimit] = useState(12);

  const { season, competition_type, gender, category } = filters || {};

  useEffect(() => {
    const calcLimit = () => {
      if (window.innerWidth < 640) return 4;
      if (window.innerWidth < 1024) return 8;
      return 12;
    };

    const handleResize = () => setLimit(calcLimit());

    setLimit(calcLimit());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Cuando cambian los filtros o el limit, reiniciamos la paginación
    setVideos([]);
    setPage(1);
    setHasMore(true);
  }, [season, competition_type, gender, category, limit]);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!hasMore) return;

      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(season && { season }),
        ...(competition_type && { competition_type }),
        ...(gender && { gender }),
        ...(category && { category }),
      });

      try {
        const res = await fetch(`/api/videos?${params}`);
        if (!res.ok) throw new Error("Error al obtener videos");
        const data: Video[] = await res.json();

        // Evitar duplicados: si page === 1, reemplazamos; si no, agregamos
        setVideos((prev) =>
          page === 1 ? data : [...prev.filter(v => !data.some(d => d.id === v.id)), ...data]
        );

        if (data.length < limit) setHasMore(false);
      } catch (error) {
        console.error("❌ Error cargando videos:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [page, limit, season, competition_type, gender, category, hasMore]);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    const current = loaderRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, [hasMore, loading]);

  return { videos, loaderRef, loading, hasMore };
}

