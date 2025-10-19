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
  YEJARAFE_SONAM = "CEIP San Matías",
  VICTORIA = "Pab. Mun. La Victoria",
}

const HOME_VENUE = "Pabellón Quiquirá";

export default function MatchCard({ match }: { match: Match }) {
  const matchDate = new Date(`${match.date}T${match.time}`);
  const now = new Date();
  const matchEnd = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
  const isPast = now > matchEnd;
  const isUpcoming = !isPast;

  // 🎨 Estilos de borde y estado
  let borderColor = "border-white/10";
  let cardOpacity = "opacity-100";
  let cardOverlay = "";
  let pendingBadge = null;
  let bgColor = "bg-white/5";
  let borderHovercolor = "hover:border-white/30";
  let bgHoverColor = "hover:bg-white/10";

  if (isPast && !match.result) {
    borderColor = "border-gray-500/30";
    cardOpacity = "opacity-70";
    cardOverlay = "bg-gray-900/30";
    pendingBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-700/30 border border-gray-500/30 text-gray-300">
        Pendiente resultado
      </span>
    );
  }

  if (match.result) {
    const [ourScore, theirScore] = match.result.split("-").map(Number);
    if (ourScore > theirScore) {
      bgColor = "bg-green-700/5";
      bgHoverColor = "hover:bg-green-700/10";
      borderColor = "border-green-700/30";
      borderHovercolor = "hover:border-green-700/40";
    } else {
      bgColor = "bg-red-700/5";
      bgHoverColor = "hover:bg-red-700/10";
      borderColor = "border-red-700/30";
      borderHovercolor = "hover:border-red-700/40";
    }
  }

  // 🏐 Tipo de partido
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

  // 📅 Google Calendar link
  const startUTC = matchDate.toISOString().replace(/-|:|\.\d+/g, "");
  const endUTC = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)
    .toISOString()
    .replace(/-|:|\.\d+/g, "");
  const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "Partido vs " + match.opponent
  )}&dates=${startUTC}/${endUTC}&details=${encodeURIComponent(
    match.notes || ""
  )}&location=${encodeURIComponent(match.location)}`;

  // 🏷️ Etiquetas visuales
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
      className={`relative backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between border transition-all duration-300 ${borderColor} ${cardOpacity} ${bgColor} ${borderHovercolor} ${bgHoverColor}`}
    >
      {cardOverlay && <div className={`absolute inset-0 rounded-2xl ${cardOverlay}`} />}

      <div className="relative z-10 space-y-2.5">
        {/* 🏷️ Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Tag />
          {pendingBadge}
        </div>

        {/* 🆚 Oponente */}
        <h2 className="text-xl font-semibold text-white tracking-tight leading-tight">
          {match.opponent}
        </h2>

        {/* 📅 Fecha y hora */}
        <p className="text-sm text-white/80">
          {formattedDate} • {formattedTime}
        </p>

        {/* 📍 Localización */}
        {match.location_url ? (
          <a
            href={match.location_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex underline items-center text-white/90 font-medium hover:text-blue-400 transition-colors"
          >
            <FontAwesomeIcon
              icon={faLocationDot}
              className="mr-1.5 text-red-400"
            />
            {match.location}
          </a>
        ) : (
          <p className="text-white/80 font-medium flex items-center">
            <FontAwesomeIcon
              icon={faLocationDot}
              className="mr-1.5 text-red-400"
            />
            {match.location}
          </p>
        )}
      </div>

      {/* 🎥 Acciones */}
      <div className="mt-4 z-10 flex flex-wrap justify-between gap-2 relative">
        {match.video_url && (
          <a
            href={match.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 text-white px-4 rounded-xl text-center hover:bg-red-700 transition text-sm flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faVideo} />
            Ver vídeo
          </a>
        )}

        {/* 🏆 Resultado */}
        {match.result && (
          <div className="pt-2 border-white/10 space-y-1.5">
            {match.result && (
              <p className="text-neutral-400 text-3xl font-semibold">
                {match.result}
              </p>
            )}
          </div>
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
