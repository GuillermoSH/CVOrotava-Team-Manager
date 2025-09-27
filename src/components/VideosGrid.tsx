import { getVideosByCategory } from "@/lib/videos";
import VideoCard from "@/components/VideoCard";

export default async function VideoGrid({ category }: Readonly<{ category: "match" | "training" }>) {
  const videos = await getVideosByCategory(category);

  return (
    <>
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
          <VideoCard
            key={video.id}
            url={video.url}
            category={video.category}
          />
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No hay videos disponibles.</p>
      )}
    </>
  );
}