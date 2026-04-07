"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCalendarDays,
  faCalendarPlus,
  faCarSide,
  faClock,
  faHouse,
  faMapLocationDot,
  faNoteSticky,
  faPenToSquare,
  faPlaneDeparture,
  faPlay,
  faTrophy,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import MatchModal, { MatchFormValues } from "@/components/calendar/MatchModal";
import type { Match } from "@/components/calendar/MatchCard";
import { matchToModalInitialValues } from "@/lib/matchFormValues";
import { getThumbnailUrl, getYouTubeId } from "@/lib/youtube";

export type MatchDetail = Match & {
  match_sets?: Array<{
    id: string;
    set_number: number;
    team_score: number;
    opponent_score: number;
  }>;
};

export default function MatchDetailsView({
  match: initialMatch,
}: {
  match: MatchDetail;
}) {
  const { user } = useUser();
  const router = useRouter();
  const [match, setMatch] = useState(initialMatch);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MatchFormValues | undefined>(undefined);

  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  const matchDate = useMemo(
    () => new Date(`${match.date}T${match.time}`),
    [match.date, match.time]
  );
  const now = new Date();
  const matchEnd = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
  const isPast = now > matchEnd;
  const isUpcoming = !isPast;

  const [teamScore, opponentScore] = match.result
    ? match.result.split("-").map(Number)
    : [null, null];

  const resultColor =
    teamScore !== null && opponentScore !== null
      ? teamScore > opponentScore
        ? "text-[var(--color-success)]"
        : teamScore < opponentScore
          ? "text-[var(--color-danger)]"
          : "text-[var(--text-secondary)]"
      : "text-[var(--text-muted)]";

  let accentColor = "var(--glass-border)";
  let cardBorderClass = "border-white/[0.06]";
  if (isPast && !match.result) {
    accentColor = "var(--color-warning)";
    cardBorderClass = "border-yellow-500/20";
  } else if (match.result && teamScore !== null && opponentScore !== null) {
    accentColor =
      teamScore > opponentScore
        ? "var(--color-success)"
        : teamScore < opponentScore
          ? "var(--color-danger)"
          : "var(--glass-border)";
    cardBorderClass =
      teamScore > opponentScore
        ? "border-green-500/15"
        : teamScore < opponentScore
          ? "border-red-500/15"
          : "border-white/[0.06]";
  }

  const startUTC = matchDate.toISOString().replace(/-|:|\.\d+/g, "");
  const endUTC = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)
    .toISOString()
    .replace(/-|:|\.\d+/g, "");
  const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "Partido vs " + match.opponent
  )}&dates=${startUTC}/${endUTC}&details=${encodeURIComponent(
    match.notes || ""
  )}&location=${encodeURIComponent(match.venues.venue_name || "")}`;

  const sortedSets = [...(match.match_sets || [])].sort(
    (a, b) => a.set_number - b.set_number
  );

  const youtubeId = match.video_url ? getYouTubeId(match.video_url) : null;
  const thumbUrl =
    match.video_url && youtubeId
      ? getThumbnailUrl(match.video_url, "max")
      : "";

  const genderLabel =
    match.gender === "male" ? "Sénior Masculino" : "Sénior Femenino";

  const dateDisplay = useMemo(() => {
    const weekday = matchDate.toLocaleDateString("es-ES", { weekday: "long" });
    const dayMonthYear = matchDate.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return {
      weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
      dayMonthYear,
    };
  }, [matchDate]);

  const statusLabel = (() => {
    if (match.result) return "Partido disputado";
    if (isPast) return "Resultado pendiente";
    return "Próximo partido";
  })();

  const LocationTag = () => {
    const tagMap = {
      outside_island: {
        icon: faPlaneDeparture,
        text: "Viaje",
        cls: "badge-info",
      },
      away: { icon: faCarSide, text: "Fuera", cls: "badge-warning" },
      home: { icon: faHouse, text: "Casa", cls: "badge-success" },
    } as const;
    const tag = tagMap[match.venues.location_type];
    if (!tag) return null;
    return (
      <span className={`badge ${tag.cls}`}>
        <FontAwesomeIcon icon={tag.icon} />
        {tag.text}
      </span>
    );
  };

  const refreshMatch = async () => {
    const res = await fetch(`/api/matches/${match.id}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as MatchDetail;
      setMatch(data);
    }
    router.refresh();
  };

  return (
    <>
      <main className="w-full max-w-4xl mx-auto py-6 px-4 sm:px-6 pb-16">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/matches"
            className="group inline-flex items-center gap-3 text-sm text-[var(--text-muted)] transition-colors hover:text-white"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[var(--text-secondary)] transition-colors group-hover:border-red-500/35 group-hover:bg-red-500/10 group-hover:text-red-300">
              <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            </span>
            Volver al calendario
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {isUpcoming && (
              <a
                href={gcalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <FontAwesomeIcon icon={faCalendarPlus} />
                Añadir al calendario
              </a>
            )}
            {user?.isAdmin && (
              <button
                type="button"
                className="btn-primary flex items-center gap-2 text-sm"
                onClick={() => {
                  setEditing(matchToModalInitialValues(match));
                  setModalOpen(true);
                }}
              >
                <FontAwesomeIcon icon={faPenToSquare} />
                Editar partido
              </button>
            )}
          </div>
        </div>

        {/* Match overview */}
        <section
          className={`relative mb-10 overflow-hidden rounded-[1.75rem] border backdrop-blur-md ${cardBorderClass} bg-[var(--glass-surface)] shadow-[0_32px_64px_-24px_rgba(0,0,0,0.55)]`}
        >
          <div
            className="absolute left-0 top-0 z-10 h-full w-1 rounded-l-[1.75rem]"
            style={{ background: accentColor }}
          />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-500/12 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />

          <div className="relative border-b border-white/[0.06] bg-gradient-to-br from-red-950/25 via-[var(--glass-surface)] to-transparent px-5 py-8 pl-6 sm:px-10 sm:py-10 sm:pl-11">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <LocationTag />
                {isPast && !match.result && (
                  <span className="badge badge-warning">Pte. resultado</span>
                )}
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Temporada {match.season}
              </span>
            </div>

            <p className="mt-6 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-red-400/85">
              {genderLabel}
            </p>
            <p className="mt-2 inline-flex items-center rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] ring-1 ring-white/[0.06]">
              {statusLabel}
            </p>

            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
              <span className="block text-lg font-semibold text-[var(--text-muted)] sm:text-xl">
                vs
              </span>
              <span className="mt-1 block">{match.opponent}</span>
            </h1>
          </div>

          <div className="relative grid gap-px bg-white/[0.06] sm:grid-cols-3">
            <div className="bg-[var(--glass-surface)] p-5 sm:p-6 sm:pb-8">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-400 ring-1 ring-red-500/20">
                  <FontAwesomeIcon icon={faCalendarDays} className="text-lg" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-red-400/90">
                    Día
                  </p>
                  <p className="mt-1.5 text-sm font-medium leading-snug text-white">
                    {dateDisplay.weekday}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {dateDisplay.dayMonthYear}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[var(--glass-surface)] p-5 sm:p-6 sm:pb-8">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-400 ring-1 ring-red-500/20">
                  <FontAwesomeIcon icon={faClock} className="text-lg" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-red-400/90">
                    Hora
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-white sm:text-3xl">
                    {match.time?.slice(0, 5) || "—"}
                  </p>
                  {match.time?.slice(0, 5) ? (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Hora local
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-400/90">
                      Sin hora definida
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-[var(--glass-surface)] p-5 sm:p-6 sm:pb-8">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-400 ring-1 ring-red-500/20">
                  <FontAwesomeIcon icon={faMapLocationDot} className="text-lg" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-red-400/90">
                    Pabellón
                  </p>
                  {match.venues.location_url ? (
                    <a
                      href={match.venues.location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 block text-sm font-medium leading-snug text-[var(--text-secondary)] underline decoration-white/15 underline-offset-2 transition-colors hover:text-white hover:decoration-red-400/50"
                    >
                      {match.venues.venue_name}
                    </a>
                  ) : (
                    <p className="mt-1.5 text-sm font-medium leading-snug text-[var(--text-secondary)]">
                      {match.venues.venue_name || "Sin pabellón asignado"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative border-t border-white/[0.06] bg-black/15 px-5 py-6 sm:px-10 sm:py-8">
            {match.result ? (
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Marcador
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Resultado del encuentro
                  </p>
                </div>
                <span
                  className={`text-5xl font-black tabular-nums tracking-tight sm:text-6xl ${resultColor}`}
                >
                  {match.result}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Resultado
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {isPast
                      ? "Aún no se ha registrado el marcador de este partido."
                      : "El marcador se publicará cuando se dispute el encuentro."}
                  </p>
                </div>
                <span className="text-lg font-medium italic text-[var(--text-muted)] sm:shrink-0">
                  Pendiente
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Sets */}
        {sortedSets.length > 0 && (
          <section className="mb-8 overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-[var(--glass-surface)] shadow-lg backdrop-blur-sm">
            <div className="border-b border-white/[0.06] bg-gradient-to-r from-red-950/20 to-transparent px-5 py-4 sm:px-6">
              <h3 className="flex items-center gap-2.5 text-base font-semibold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/12 text-red-400">
                  <FontAwesomeIcon icon={faTrophy} />
                </span>
                Sets
              </h3>
              <p className="mt-1 pl-11 text-xs text-[var(--text-muted)]">
                Desglose por set del partido
              </p>
            </div>
            <ul className="divide-y divide-white/[0.06] p-2 sm:p-3">
              {sortedSets.map((s) => {
                const won = s.team_score > s.opponent_score;
                const lost = s.team_score < s.opponent_score;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-4 rounded-xl px-3 py-3.5 sm:px-4"
                  >
                    <span className="text-sm font-medium text-[var(--text-muted)]">
                      Set {s.set_number}
                    </span>
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        won
                          ? "text-[var(--color-success)]"
                          : lost
                            ? "text-[var(--color-danger)]"
                            : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {s.team_score} — {s.opponent_score}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Video */}
        {match.video_url && (
          <section className="mb-8 overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-[var(--glass-surface)] shadow-lg backdrop-blur-sm">
            <div className="border-b border-white/[0.06] bg-gradient-to-r from-red-950/20 to-transparent px-5 py-4 sm:px-6">
              <h3 className="flex items-center gap-2.5 text-base font-semibold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/12 text-red-400">
                  <FontAwesomeIcon icon={faVideo} />
                </span>
                Vídeo del partido
              </h3>
              <p className="mt-1 pl-11 text-xs text-[var(--text-muted)]">
                Abre el vídeo en una nueva pestaña
              </p>
            </div>
            {thumbUrl ? (
              <a
                href={match.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative aspect-video w-full overflow-hidden border-t border-white/[0.06]"
              >
                <Image
                  src={thumbUrl}
                  alt="Vista previa del vídeo"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 1280px) 100vw, 1024px"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/50 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-105 transition-transform">
                    <FontAwesomeIcon
                      icon={faPlay}
                      className="text-white text-lg ml-1"
                    />
                  </div>
                </div>
              </a>
            ) : (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                <a
                  href={match.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faVideo} />
                  Ver vídeo
                </a>
              </div>
            )}
          </section>
        )}

        {/* Notes */}
        {match.notes && (
          <section className="overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-[var(--glass-surface)] shadow-lg backdrop-blur-sm">
            <div className="border-b border-white/[0.06] bg-gradient-to-r from-red-950/20 to-transparent px-5 py-4 sm:px-6">
              <h3 className="flex items-center gap-2.5 text-base font-semibold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/12 text-red-400">
                  <FontAwesomeIcon icon={faNoteSticky} />
                </span>
                Notas
              </h3>
            </div>
            <div className="p-5 sm:p-6">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--text-secondary)]">
                {match.notes}
              </p>
            </div>
          </section>
        )}
      </main>

      {user?.isAdmin && (
        <MatchModal
          isOpen={modalOpen}
          initialData={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(undefined);
          }}
          onSuccess={refreshMatch}
        />
      )}
    </>
  );
}
