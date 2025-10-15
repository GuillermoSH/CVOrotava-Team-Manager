"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlaneDeparture,
  faCarSide,
  faHouse,
  faCalendarPlus,
  faVideo,
  faLocationDot,
} from "@fortawesome/free-solid-svg-icons";

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

enum OutsideIslandVenues {
  MEET_MUSIC = "IES Doctoral",
  LOS_GERANIOS = "IES Playa Honda",
  GUPANE = "Pab. Mun. Beatriz Mendoza",
  DOS_19_ARINAGA = "Pol. Mun. Playa de Arinaga",
  ALHAMBRA_AXINAMAR = "Pab. Mun. Juan Carlos Hernández",
  SAN_ROQUE = "Pab. Mun. El Batán",
  SUAC_CANARIAS = "Pab. García San Román",
  XACAY_TEROR = "Pab. Municipal de Teror",
}

enum AwayVenues {
  YEJARAFE = "CEIP San Matías",
  SONAM = "CEIP San Matías",
  VICTORIA = "Pab. Mun. La Victoria",
}

const HOME_VENUE = "Pabellón Quiquirá";

export default function MatchCard({ match }: { match: Match }) {
  const matchDate = new Date(`${match.date}T${match.time}`);
  const now = new Date();
  const isPast = now > matchDate;
  const isUpcoming = !isPast;

  // Color de borde según resultado
  let borderColor = "border-white/10";
  if (isPast && !match.result) borderColor = "border-gray-500/30";
  if (match.result) {
    const [ourScore, theirScore] = match.result.split("-").map(Number);
    if (ourScore > theirScore) borderColor = "border-green-500/40";
    else if (ourScore < theirScore) borderColor = "border-red-500/40";
    else borderColor = "border-yellow-500/40";
  }

  // Tipo de partido
  const isOutsideIsland = Object.values(OutsideIslandVenues).some((name) =>
    match.location.toLowerCase().includes(name.toLowerCase())
  );
  const isAway =
    !isOutsideIsland &&
    Object.values(AwayVenues).some((name) =>
      match.location.toLowerCase().includes(name.toLowerCase())
    );
  const isHome =
    !isOutsideIsland && !isAway && match.location.includes(HOME_VENUE);

  const formattedDate = matchDate
    .toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "2-digit",
    })
    .replace(/^./, (char) => char.toUpperCase());
  const formattedTime = matchDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Google Calendar link
  const startUTC = matchDate.toISOString().replace(/-|:|\.\d+/g, "");
  const endUTC = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)
    .toISOString()
    .replace(/-|:|\.\d+/g, "");
  const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "Partido vs " + match.opponent
  )}&dates=${startUTC}/${endUTC}&details=${encodeURIComponent(
    match.notes || ""
  )}&location=${encodeURIComponent(match.location)}`;

  // ✈️ Etiqueta visual (badges)
  const Tag = () => {
    const base =
      "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-md border transition hover:brightness-110";
    if (isOutsideIsland)
      return (
        <span
          className={`${base} bg-blue-500/20 border-blue-500/30 text-blue-300`}
        >
          <FontAwesomeIcon icon={faPlaneDeparture} />
          Viaje
        </span>
      );
    if (isAway)
      return (
        <span
          className={`${base} bg-yellow-400/20 border-yellow-400/40 text-yellow-300`}
        >
          <FontAwesomeIcon icon={faCarSide} />
          Fuera
        </span>
      );
    if (isHome)
      return (
        <span
          className={`${base} bg-green-500/20 border-green-500/40 text-green-300`}
        >
          <FontAwesomeIcon icon={faHouse} />
          Casa
        </span>
      );
    return null;
  };

  return (
    <div
      className={`bg-white/5 backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between border ${borderColor} hover:border-white/30 hover:bg-white/10 transition-all duration-300`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white tracking-tight">
            {match.opponent}
          </h2>
          <Tag />
        </div>

        <p className="text-sm text-white/70 mb-2">
          {formattedDate} • {formattedTime}
        </p>

        {/* 📍 Localización clicable */}
        {match.location_url ? (
          <a
            href={match.location_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 font-medium hover:text-blue-400 transition-colors underline underline-offset-2"
          >
            <FontAwesomeIcon
              icon={faLocationDot}
              className="mr-1 text-red-400"
            />
            {match.location}
          </a>
        ) : (
          <p className="text-white/80 font-medium">
            <FontAwesomeIcon
              icon={faLocationDot}
              className="mr-1 text-red-400"
            />
            {match.location}
          </p>
        )}

        <p className="text-sm text-white/60 mt-1">
          Temporada: <span className="font-semibold">{match.season}</span>
        </p>

        {match.result && (
          <p className="mt-2 text-white font-semibold">
            🏁 Resultado: {match.result}
          </p>
        )}

        {match.notes && (
          <p className="mt-2 text-white/70 italic text-sm border-t border-white/10 pt-2">
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
            className="bg-red-600 text-white py-2 px-4 rounded-xl text-center hover:bg-red-700 transition text-sm flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faVideo} />
            Ver vídeo
          </a>
        )}

        {isUpcoming && (
          <a
            href={gcalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white py-2 px-4 rounded-xl text-center hover:bg-blue-700 transition text-sm flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faCalendarPlus} />
            Añadir a Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}
