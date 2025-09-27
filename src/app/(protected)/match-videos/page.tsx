import VideosGrid from "@/components/VideosGrid";

export default function PartidosPage() {
  return (
    <main className="min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-cover p-6">
      <h1 className="text-2xl font-bold mb-6">Videos de Partidos</h1>
      <VideosGrid category="match" />
    </main>
  );
}
