"use client";

import { useEffect, useState } from "react";
import { getVideosByCategory } from "@/lib/videos";
import VideoCard from "@/components/VideoCard";

type Filters = {
  season?: string;
  competition_type?: string;
  gender?: string;
};

type VideoGridProps = {
  category: "match" | "training";
  filters: Filters;
};

export default function VideosGrid({ category, filters }: Readonly<VideoGridProps>) {
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      const data = await getVideosByCategory(category, filters);
      setVideos(data);
    };
    fetchVideos();
  }, [filters, category]);

  return (
    <>
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} url={video.url} created_at={video.created_at} />
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No hay videos disponibles.</p>
      )}
    </>
  );
}
