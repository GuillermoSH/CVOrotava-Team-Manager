"use client";

import { motion, AnimatePresence, easeOut } from "framer-motion";
import VideoCard, { Video } from "@/components/videos/VideoCard";
import Loading from "@/components/common/Loading";
import { useInfiniteVideos } from "@/hooks/useInfiniteVideos";

type Filters = {
  season?: string;
  competition_type?: string;
  gender?: string;
  category?: "match" | "training";
};

type VideoGridProps = {
  filters?: Filters;
  isAdmin?: boolean;
  onEdit?: (video: Video) => void;
};

export default function VideosGrid({ filters, isAdmin, onEdit }: Readonly<VideoGridProps>) {
  const { videos, loaderRef, loading, hasMore } = useInfiniteVideos(filters);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: easeOut },
    },
  };

  // Carga inicial: no hay videos todavía y está cargando
  if (loading && videos.length === 0) {
    return <Loading />;
  }

  return (
    <>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {videos.map((video: Video) => (
            <motion.div
              key={video.id}
              variants={cardVariants}
              layout
              exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
            >
              <VideoCard 
                video={video} 
                isAdmin={isAdmin} 
                onEdit={onEdit} 
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Indicador de carga para infinite scroll (después del primer batch) */}
      {(hasMore || loading) && (
        <div
          ref={loaderRef}
          className="h-16 mt-6 flex justify-center items-center"
        >
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent)] animate-spin" />
                <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-red-400/50 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
              </div>
              <p className="text-xs text-white/40 animate-pulse">Cargando más...</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
