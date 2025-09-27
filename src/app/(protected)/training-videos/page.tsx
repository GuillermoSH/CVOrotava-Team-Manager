import VideosGrid from "@/components/VideosGrid";

export default async function EntrenamientosPage() {
  return (
    <main className="min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-cover p-6">
      <h1 className="text-2xl font-bold mb-6">Videos de Entrenamientos</h1>
      <VideosGrid category="training" />
    </main>
  );
}
