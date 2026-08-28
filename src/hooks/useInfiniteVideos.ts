"use client";

import { useState, useEffect, useRef } from "react";

import { Video } from "@/components/videos/VideoCard";
import { DEFAULT_VIDEO_PAGE_SIZE } from "@/lib/videos/constants";
import type { VideoType } from "@/lib/videos/constants";

type Filters = {
  season?: string;
  video_type?: VideoType;
  gender?: string;
};

type UseInfiniteVideosOpts = {
  initialVideos?: Video[];
  initialFilters?: Filters;
  initialLimit?: number;
};

function calcPageLimit(): number {
  if (typeof window === "undefined") return DEFAULT_VIDEO_PAGE_SIZE;
  if (window.innerWidth < 640) return 4;
  if (window.innerWidth < 1024) return 8;
  return 12;
}

function filtersMatch(a?: Filters, b?: Filters): boolean {
  return (
    (a?.season ?? "") === (b?.season ?? "") &&
    (a?.video_type ?? "") === (b?.video_type ?? "") &&
    (a?.gender ?? "") === (b?.gender ?? "")
  );
}

export function useInfiniteVideos(
  filters?: Filters,
  opts?: UseInfiniteVideosOpts
) {
  const serverLimit = opts?.initialLimit ?? DEFAULT_VIDEO_PAGE_SIZE;
  const [limit, setLimit] = useState(calcPageLimit);

  const canSeed =
    Boolean(opts?.initialVideos?.length) &&
    filtersMatch(filters, opts?.initialFilters) &&
    limit === serverLimit;

  const [videos, setVideos] = useState<Video[]>(
    canSeed ? opts!.initialVideos! : []
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(
    canSeed ? opts!.initialVideos!.length >= serverLimit : true
  );
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const skipFirstFetchRef = useRef(canSeed);
  const mountedRef = useRef(false);

  const { season, video_type, gender } = filters || {};

  useEffect(() => {
    const handleResize = () => setLimit(calcPageLimit());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setVideos([]);
    setPage(1);
    setHasMore(true);
    skipFirstFetchRef.current = false;
  }, [season, video_type, gender]);

  useEffect(() => {
    if (skipFirstFetchRef.current && page === 1) {
      skipFirstFetchRef.current = false;
      return;
    }

    const fetchVideos = async () => {
      if (!hasMore) return;

      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(season && { season }),
        ...(video_type && { video_type }),
        ...(gender && { gender }),
      });

      try {
        const res = await fetch(`/api/videos?${params}`);
        if (!res.ok) throw new Error("Error al obtener videos");
        const data: Video[] = await res.json();

        setVideos((prev) =>
          page === 1
            ? data
            : [
                ...prev.filter((v) => !data.some((d) => d.id === v.id)),
                ...data,
              ]
        );

        if (data.length < limit) setHasMore(false);
      } catch (error) {
        console.error("Error cargando videos:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [page, limit, season, video_type, gender, hasMore]);

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
