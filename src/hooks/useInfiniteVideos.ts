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

  useEffect(() => {
    const calcLimit = () => {
      if (window.innerWidth < 640) return 4; // móviles
      if (window.innerWidth < 1024) return 8; // tablets
      return 12; // escritorio
    };

    const handleResize = () => setLimit(calcLimit());

    setLimit(calcLimit());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setVideos([]);
    setPage(1);
    setHasMore(true);
  }, [JSON.stringify(filters), limit]);

  // 📦 fetch de videos con paginación
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.season && { season: filters.season }),
        ...(filters?.competition_type && { competition_type: filters.competition_type }),
        ...(filters?.gender && { gender: filters.gender }),
        ...(filters?.category && { category: filters.category }), // ✅ ahora sí
      });

      try {
        const res = await fetch(`/api/videos?${params}`);
        if (!res.ok) throw new Error("Error al obtener videos");
        const data = await res.json();

        if (data.length < limit) setHasMore(false);

        setVideos((prev) => (page === 1 ? data : [...prev, ...data]));
      } catch (error) {
        console.error("❌ Error cargando videos:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [page, JSON.stringify(filters), limit]);

  // 👁️ Intersection Observer
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
