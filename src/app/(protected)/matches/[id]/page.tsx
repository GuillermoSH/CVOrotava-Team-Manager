import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faClock,
  faMapLocationDot,
  faTrophy,
  faVideo,
  faNoteSticky,
} from "@fortawesome/free-solid-svg-icons";

export default async function MatchDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/matches/${id}`,
    {
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) throw new Error("No se pudo cargar el partido");

  const match = await res.json();

  const [teamScore, opponentScore] = match.result
    ? match.result.split("-").map(Number)
    : [null, null];

  const resultColor =
    teamScore !== null && opponentScore !== null
      ? teamScore > opponentScore
        ? "text-green-400"
        : "text-red-400"
      : "text-gray-400";

  return (
    <main className="flex flex-col items-center p-6 text-white">
      {/* 🏷️ Encabezado */}
      <section className="backdrop-blur-sm bg-gradient-to-r from-red-600/40 to-transparent w-full max-w-5xl rounded-2xl p-6 mb-8 border border-white/10">
        <h1 className="text-3xl font-bold mb-2 text-center">
          {match.gender === "male" ? "Sénior Masculino" : "Sénior Femenino"}
        </h1>
        <h2 className="text-xl text-center text-gray-300">
          vs {match.opponent}
        </h2>
        <div className="flex justify-center items-center mt-4">
          {match.result ? (
            <span
              className={`${resultColor} text-4xl font-extrabold tracking-wide`}
            >
              {match.result}
            </span>
          ) : (
            <span className="text-gray-400 text-xl italic">
              Resultado pendiente
            </span>
          )}
        </div>
      </section>

      {/* 📅 Información del partido */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-5xl">
        <div className="backdrop-blur-sm bg-white/10 border border-white/10 rounded-2xl p-6 shadow-md">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faCalendarDays} className="text-red-500" />
            Fecha
          </h3>
          <p className="text-gray-300">
            {new Date(match.date).toLocaleDateString("es-ES", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="backdrop-blur-sm bg-white/10 border border-white/10 rounded-2xl p-6 shadow-md">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faClock} className="text-red-500" />
            Hora
          </h3>
          <p className="text-gray-300">
            {match.time?.slice(0, 5) || "Sin hora definida"}
          </p>
        </div>

        <div className="backdrop-blur-sm bg-white/10 border border-white/10 rounded-2xl p-6 shadow-md sm:col-span-2">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faMapLocationDot} className="text-red-500" />
            Pabellón
          </h3>
          <p className="text-gray-300">
            {match.venues?.venue_name || "Sin pabellón asignado"}
          </p>
        </div>
      </section>

      {/* 🏐 Sets */}
      {match.sets && match.sets.length > 0 && (
        <section className="w-full max-w-5xl mt-8 bg-white/10 border border-white/10 rounded-2xl p-6 shadow-md">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faTrophy} className="text-red-500" />
            Detalle de Sets
          </h3>
          <ul className="space-y-2">
            {match.sets.map((s: any) => (
              <li
                key={s.id}
                className="flex justify-between text-gray-200 bg-white/5 px-4 py-2 rounded-lg"
              >
                <span>Set {s.set_number}</span>
                <span>
                  {s.team_score} - {s.opponent_score}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 🎥 Video */}
      {match.video_url && (
        <section className="w-full max-w-5xl mt-8 bg-white/10 border border-white/10 rounded-2xl p-6 shadow-md">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faVideo} className="text-red-500" />
            Video del Partido
          </h3>
          <a
            href={match.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Ver video →
          </a>
        </section>
      )}

      {/* 🗒️ Notas */}
      {match.notes && (
        <section className="w-full max-w-5xl mt-8 bg-white/10 border border-white/10 rounded-2xl p-6 shadow-md">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faNoteSticky} className="text-red-500" />
            Notas del partido
          </h3>
          <p className="text-gray-300 whitespace-pre-wrap">{match.notes}</p>
        </section>
      )}
    </main>
  );
}
