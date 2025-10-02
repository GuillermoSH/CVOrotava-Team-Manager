"use client";

import VideoCard from "@/components/VideoCard";
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

  return (
    <>
      {videos.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video: Video) => (
              <VideoCard key={video.id} url={video.url} created_at={video.created_at} />
            ))}
          </div>
          {/* Loader */}
          {(hasMore || loading) && (
            <div ref={loaderRef} className="h-12 mt-6 flex justify-center items-center">
              {loading && <p className="text-gray-500">Cargando más…</p>}
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-600">No hay videos disponibles.</p>
      )}
    </>
  );
}
