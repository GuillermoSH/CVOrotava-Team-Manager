export default async function MatchDetailsPage({ params }: { params: { id: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/matches/${params.id}`, {
    next: { revalidate: 0 }, // ⚙️ para evitar cache en desarrollo
  });

  if (!res.ok) {
    return (
      <div className="text-center text-red-500 mt-10">
        Error cargando el partido (status {res.status})
      </div>
    );
  }

  const data = await res.json();

  if (!data) {
    return <div className="text-center text-gray-400 mt-10">No se encontró el partido.</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 text-white space-y-4">
      <h1 className="text-2xl font-bold mb-2">{data.opponent}</h1>
      <p className="text-white/70">
        {new Date(`${data.date}T${data.time}`).toLocaleString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <p className="text-white/80">
        <strong>Temporada:</strong> {data.season}
      </p>

      <p className="text-white/80">
        <strong>Ubicación:</strong>{" "}
        {data.venues?.location_url ? (
          <a
            href={data.venues.location_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline hover:text-blue-500"
          >
            {data.venues.venue_name}
          </a>
        ) : (
          data.venues?.venue_name
        )}
      </p>

      {data.result && (
        <p className="text-white/90 font-semibold text-xl">
          🏁 Resultado: {data.result}
        </p>
      )}

      {data.notes && (
        <p className="text-white/70 italic border-t border-white/10 pt-3">
          “{data.notes}”
        </p>
      )}

      {data.video_url && (
        <a
          href={data.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition text-white font-medium"
        >
          Ver vídeo
        </a>
      )}
    </main>
  );
}
