import VideosGrid from "@/components/videos/VideosGrid";

export default async function EntrenamientosPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl text-white font-bold mb-6">Videos de Entrenamientos</h1>
      <VideosGrid category="training" />
    </main>
  );
}
