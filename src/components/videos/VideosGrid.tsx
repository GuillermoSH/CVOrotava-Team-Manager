"use client";

import { useMemo } from "react";
import { motion, AnimatePresence, easeOut, useReducedMotion } from "framer-motion";
import VideoCard, { Video } from "@/components/videos/VideoCard";
import { useInfiniteVideos } from "@/hooks/useInfiniteVideos";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVideo } from "@fortawesome/free-solid-svg-icons";
import {
  groupVideos,
  type VideoGroupBy,
} from "@/lib/videos/groupVideos";

type Filters = {
  season?: string;
  competition_type?: string;
  gender?: string;
  category?: "match" | "training";
};

type VideoGridProps = {
  filters?: Filters;
  groupBy?: VideoGroupBy;
  isAdmin?: boolean;
  onEdit?: (video: Video) => void;
};

function VideoCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-surface)]"
      aria-hidden
    >
      <div className="aspect-video animate-pulse bg-[var(--surface-faint)]" />
      <div className="space-y-2 p-3.5">
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-[var(--surface-faint)]" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-[var(--surface-faint)]" />
      </div>
    </div>
  );
}

function VideoGridCards({
  videos,
  isAdmin,
  onEdit,
  reduceMotion,
  cardVariants,
}: {
  videos: Video[];
  isAdmin?: boolean;
  onEdit?: (video: Video) => void;
  reduceMotion: boolean | null;
  cardVariants: {
    hidden: { opacity: number; y: number };
    visible: {
      opacity: number;
      y: number;
      transition: { duration: number; ease: typeof easeOut };
    };
  };
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      <AnimatePresence>
        {videos.map((video) => (
          <motion.div
            key={video.id}
            variants={cardVariants}
            layout={!reduceMotion}
            exit={
              reduceMotion
                ? undefined
                : { opacity: 0, y: 8, transition: { duration: 0.2 } }
            }
          >
            <VideoCard video={video} isAdmin={isAdmin} onEdit={onEdit} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function VideosGrid({
  filters,
  groupBy = "none",
  isAdmin,
  onEdit,
}: Readonly<VideoGridProps>) {
  const { videos, loaderRef, loading, hasMore } = useInfiniteVideos(filters);
  const reduceMotion = useReducedMotion();

  const groups = useMemo(
    () => groupVideos(videos, groupBy),
    [videos, groupBy]
  );

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.05,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.35, ease: easeOut },
    },
  };

  if (loading && videos.length === 0) {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
        role="status"
        aria-label="Cargando vídeos"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!loading && videos.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--surface-faint)] px-6 py-16 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)] text-[var(--text-muted)]">
          <FontAwesomeIcon icon={faVideo} />
        </span>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          No hay vídeos con estos filtros
        </p>
        <p className="mt-1 max-w-xs text-xs text-[var(--text-muted)]">
          Prueba a cambiar temporada, categoría o género.
        </p>
      </div>
    );
  }

  const showSectionHeaders = groupBy !== "none";

  return (
    <>
      <motion.div
        className="flex flex-col gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {groups.map((group) => (
          <section key={group.key} className="min-w-0">
            {showSectionHeaders ? (
              <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-[var(--glass-border)] pb-2">
                <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)] sm:text-base">
                  {group.label}
                </h2>
                <span className="text-xs tabular-nums text-[var(--text-muted)]">
                  {group.videos.length}
                </span>
              </header>
            ) : null}
            <VideoGridCards
              videos={group.videos}
              isAdmin={isAdmin}
              onEdit={onEdit}
              reduceMotion={reduceMotion}
              cardVariants={cardVariants}
            />
          </section>
        ))}
      </motion.div>

      {(hasMore || loading) && (
        <div
          ref={loaderRef}
          className="mt-6 flex h-14 items-center justify-center"
          aria-hidden={!loading}
        >
          {loading ? (
            <div
              role="status"
              aria-label="Cargando más vídeos"
              className="relative h-7 w-7"
            >
              <div className="absolute inset-0 rounded-full border border-[var(--glass-border)]" />
              <div
                className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[var(--accent)] opacity-80"
                style={{ animationDuration: "0.85s" }}
              />
              <span className="sr-only">Cargando más vídeos</span>
            </div>
          ) : null}
        </div>
      )}

      {!hasMore && videos.length > 0 && (
        <p className="mt-2 pb-2 text-center text-xs text-[var(--text-muted)]">
          Fin de la lista
        </p>
      )}
    </>
  );
}
