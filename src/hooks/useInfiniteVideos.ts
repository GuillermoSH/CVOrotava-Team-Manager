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
};

export function useInfiniteVideos(
  category: "match" | "training",
  filters?: Filters
) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // 🔥 calcular límite dinámico según la pantalla
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    const calcLimit = () => {
      if (window.innerWidth < 640) return 4; // móviles (sm)
      if (window.innerWidth < 1024) return 8; // tablets (md/lg)
      return 12; // desktop grande
    };

    setLimit(calcLimit());

    window.addEventListener("resize", () => setLimit(calcLimit()));
    return () => window.removeEventListener("resize", () => setLimit(calcLimit()));
  }, []);

  // resetear cuando cambian filtros o categoría
  useEffect(() => {
    setVideos([]);
    setPage(1);
    setHasMore(true);
  }, [filters, category, limit]);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);

      const params = new URLSearchParams({
        category,
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.season && { season: filters.season }),
        ...(filters?.competition_type && { competition_type: filters.competition_type }),
        ...(filters?.gender && { gender: filters.gender }),
      });

      const res = await fetch(`/api/videos?${params}`);
      const data = await res.json();

      if (data.length < limit) {
        setHasMore(false);
      }

      setVideos((prev) => (page === 1 ? data : [...prev, ...data]));
      setLoading(false);
    };

    fetchVideos();
  }, [page, filters, category, limit]);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0,
      }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);

    return () => {
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [hasMore, loading]);

  return { videos, loaderRef, loading, hasMore };
}
