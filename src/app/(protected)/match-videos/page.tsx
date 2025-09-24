import { getVideosByCategory } from "@/lib/videos";
import VideoCard from "@/components/VideoCard";

export default async function PartidosPage() {
  const videos = await getVideosByCategory("match");

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-600 p-6">
      <h1 className="text-2xl font-bold mb-6">Videos de Partidos</h1>
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </main>
  );
}
