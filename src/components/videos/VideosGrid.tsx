"use client";

import { motion, AnimatePresence, easeOut } from "framer-motion";
import VideoCard from "@/components/videos/VideoCard";
import { useInfiniteVideos } from "@/hooks/useInfiniteVideos";

type Filters = {
  season?: string;
  competition_type?: string;
  gender?: string;
};

type VideoGridProps = {
  category: "match" | "training";
  filters?: Filters;
};

type Video = {
  id: string;
  url: string;
  created_at: string;
};

export default function VideosGrid({ category, filters }: Readonly<VideoGridProps>) {
  const { videos, loaderRef, loading, hasMore } = useInfiniteVideos(category, filters);

  // Variants for Framer Motion
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08, // small delay between cards
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

  return (
    <>
      {videos.length > 0 ? (
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
                  <VideoCard url={video.url} created_at={video.created_at} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Loader */}
          {(hasMore || loading) && (
            <div
              ref={loaderRef}
              className="h-12 mt-6 flex justify-center items-center text-sm text-white/60"
            >
              {loading && <p>Cargando más…</p>}
            </div>
          )}
        </>
      ) : (
        <p className="text-white/50 text-center">No hay videos disponibles.</p>
      )}
    </>
  );
}
