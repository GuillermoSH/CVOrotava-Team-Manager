import { parseResultString } from "@/lib/standings/resolveOpponent";
import { VIDEO_TYPE_LABELS, type VideoType } from "@/lib/videos/constants";

export type VideoEmailMatchInput = {
  id: string;
  date: string;
  time?: string | null;
  opponent: string;
  result?: string | null;
  venues?: {
    venue_name?: string | null;
    location_type?: string | null;
  } | null;
  match_sets?: Array<{
    set_number: number;
    team_score: number;
    opponent_score: number;
  }> | null;
};

export type VideoEmailRecap = {
  opponent: string;
  score: string | null;
  outcome: "win" | "loss" | null;
  outcomeLabel: string | null;
  when: string | null;
  sets: string | null;
};

export type NewVideoEmailCopy = {
  subject: string;
  preview: string;
  headline: string;
  kicker: string;
  body: string;
  recap: VideoEmailRecap | null;
};

const HEADLINE: Record<VideoType, string> = {
  league_match: "Ya está el vídeo del partido de liga",
  friendly_match: "Ya está el vídeo del amistoso",
  training: "Ya está el vídeo del entrenamiento",
};

export function teamLabel(gender: string) {
  return gender === "female" ? "Senior femenino" : "Senior masculino";
}

export function locationLabel(type: string | null | undefined) {
  if (type === "home") return "En casa";
  if (type === "away") return "Fuera";
  if (type === "outside_island") return "Fuera de la isla";
  return null;
}

export function formatMatchWhen(
  date: string,
  time?: string | null,
  locationType?: string | null
) {
  const datePart = new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Atlantic/Canary",
  });
  const timePart = time?.slice(0, 5) || null;
  const place = locationLabel(locationType);
  return [datePart, timePart, place].filter(Boolean).join(" · ");
}

export function formatSetLine(
  sets: VideoEmailMatchInput["match_sets"]
): string | null {
  if (!sets?.length) return null;
  const ordered = [...sets].sort((a, b) => a.set_number - b.set_number);
  return `Parciales: ${ordered
    .map((s) => `${s.team_score}-${s.opponent_score}`)
    .join(" · ")}`;
}

export function matchOutcome(result?: string | null): {
  score: string | null;
  outcome: "win" | "loss" | null;
  outcomeLabel: string | null;
} {
  const parsed = parseResultString(result);
  if (!parsed) {
    const trimmed = result?.trim() || null;
    return { score: trimmed, outcome: null, outcomeLabel: null };
  }
  const score = `${parsed.ourSets}-${parsed.theirSets}`;
  if (parsed.ourSets > parsed.theirSets) {
    return { score, outcome: "win", outcomeLabel: "Victoria" };
  }
  if (parsed.ourSets < parsed.theirSets) {
    return { score, outcome: "loss", outcomeLabel: "Derrota" };
  }
  return { score, outcome: null, outcomeLabel: null };
}

function recapFromMatch(match: VideoEmailMatchInput): VideoEmailRecap {
  const { score, outcome, outcomeLabel } = matchOutcome(match.result);
  return {
    opponent: match.opponent,
    score,
    outcome,
    outcomeLabel,
    when: formatMatchWhen(
      match.date,
      match.time,
      match.venues?.location_type
    ),
    sets: formatSetLine(match.match_sets),
  };
}

function leagueBody(team: string, match?: VideoEmailMatchInput | null) {
  if (match) {
    return `El partido contra ${match.opponent} ya está en la videoteca y en YouTube. Entra cuando puedas.`;
  }
  return `Ya está colgado un partido de liga del ${team.toLowerCase()}. Entra cuando puedas: está en la videoteca y en YouTube.`;
}

function friendlyBody(team: string, match?: VideoEmailMatchInput | null) {
  if (match) {
    return `El amistoso contra ${match.opponent} ya está en la videoteca. Menos presión de liga, mismas rotaciones.`;
  }
  return `Ya está el vídeo del amistoso del ${team.toLowerCase()}. Entra cuando puedas: está en la videoteca y en YouTube.`;
}

function trainingBody(team: string) {
  return `La sesión del ${team.toLowerCase()} ya está colgada. Para revisar lo que salió bien… y lo que se va a repetir el martes.`;
}

export function buildNewVideoEmailCopy({
  videoType,
  gender,
  season,
  match,
}: {
  videoType: VideoType;
  gender: string;
  season?: string;
  match?: VideoEmailMatchInput | null;
}): NewVideoEmailCopy {
  const team = teamLabel(gender);
  const kicker = [team, season].filter(Boolean).join(" · ");
  const headline = HEADLINE[videoType];
  const recap = match ? recapFromMatch(match) : null;

  if (videoType === "training") {
    const body = trainingBody(team);
    return {
      subject: `Ya está el vídeo · ${VIDEO_TYPE_LABELS.training}`,
      preview: `${headline}. ${kicker}`,
      headline,
      kicker,
      body,
      recap: null,
    };
  }

  const subject = matchSubject(videoType, match, recap);
  const body =
    videoType === "friendly_match"
      ? friendlyBody(team, match)
      : leagueBody(team, match);

  const preview = recap
    ? `${headline}. vs ${recap.opponent}${recap.score ? ` ${recap.score}` : ""}`
    : `${headline}. ${kicker}`;

  return { subject, preview, headline, kicker, body, recap };
}

function matchSubject(
  videoType: VideoType,
  match: VideoEmailMatchInput | null | undefined,
  recap: VideoEmailRecap | null
) {
  if (videoType === "friendly_match") {
    if (match) return `Ya está el vídeo · Amistoso vs ${match.opponent}`;
    return `Ya está el vídeo · ${VIDEO_TYPE_LABELS.friendly_match}`;
  }
  if (match && recap) {
    return recap.score
      ? `Ya está el vídeo · vs ${match.opponent} (${recap.score})`
      : `Ya está el vídeo · vs ${match.opponent}`;
  }
  return `Ya está el vídeo · ${VIDEO_TYPE_LABELS.league_match}`;
}
