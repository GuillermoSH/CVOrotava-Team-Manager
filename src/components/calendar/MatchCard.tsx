"use client";

type Match = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  location: string;
  season: string;
  location_url?: string;
  result?: string;
  video_url?: string;
  notes?: string;
};

export default function MatchCard({ match }: { match: Match }) {
  const matchDate = new Date(`${match.date}T${match.time}`);
  const now = new Date();
  const isPast = now > matchDate;
  const isUpcoming = !isPast;

  // Color de fondo según resultado
  let bgColor = "bg-white/90";
  if (isPast && !match.result) bgColor = "bg-gray-200";
  if (match.result) {
    if (match.result.includes("-")) {
      const [ourScore, theirScore] = match.result.split("-").map(Number);
      if (ourScore > theirScore) bgColor = "bg-green-100";
      else if (ourScore < theirScore) bgColor = "bg-red-100";
      else bgColor = "bg-yellow-100";
    }
  }

  const formattedDate = matchDate.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).replace(/^./, (char) => char.toUpperCase());
  const formattedTime = matchDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Google Calendar link
  const startUTC = matchDate.toISOString().replace(/-|:|\.\d+/g, "");
  const endUTC = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000) // 2h
    .toISOString()
    .replace(/-|:|\.\d+/g, "");
  const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "Partido vs " + match.opponent
  )}&dates=${startUTC}/${endUTC}&details=${encodeURIComponent(
    match.notes || ""
  )}&location=${encodeURIComponent(match.location)}`;

  return (
    <div
      className={`${bgColor} backdrop-blur-sm rounded-2xl shadow-md p-5 flex flex-col justify-between border border-gray-200 hover:shadow-lg transition`}
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          {match.opponent}
        </h2>
        <p className="text-sm text-gray-600 mb-2">
          {formattedDate} • {formattedTime}
        </p>
        <p className="text-gray-700 font-medium">
          📍 {match.location}
          {match.location_url && (
            <a
              href={match.location_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 ml-1 hover:underline"
            >
              (ver mapa)
            </a>
          )}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Temporada: <span className="font-semibold">{match.season}</span>
        </p>

        {match.result && (
          <p className="mt-2 text-gray-800 font-semibold">
            🏁 Resultado: {match.result}
          </p>
        )}

        {match.notes && (
          <p className="mt-2 text-gray-700 italic text-sm border-t pt-2">
            “{match.notes}”
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {match.video_url && (
          <a
            href={match.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 text-white py-2 px-4 rounded-xl text-center hover:bg-red-700 transition text-sm"
          >
            🎥 Ver vídeo
          </a>
        )}

        {isUpcoming && (
          <a
            href={gcalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white py-2 px-4 rounded-xl text-center hover:bg-blue-700 transition text-sm"
          >
            📅 Añadir a Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}
