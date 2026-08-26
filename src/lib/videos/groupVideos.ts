import type { Video } from "@/components/videos/VideoCard";

export type VideoGroupBy = "none" | "category" | "month" | "competition";

export const VIDEO_GROUP_OPTIONS: {
  value: VideoGroupBy;
  label: string;
}[] = [
  { value: "none", label: "Sin grupo" },
  { value: "category", label: "Tipo" },
  { value: "month", label: "Mes" },
  { value: "competition", label: "Competición" },
];

export type VideoGroup = {
  key: string;
  label: string;
  videos: Video[];
};

const CATEGORY_ORDER = ["match", "training"] as const;
const CATEGORY_LABEL: Record<(typeof CATEGORY_ORDER)[number], string> = {
  match: "Partidos",
  training: "Entrenamientos",
};

const COMP_ORDER = ["league", "friendly"] as const;
const COMP_LABEL: Record<(typeof COMP_ORDER)[number], string> = {
  league: "Liga",
  friendly: "Amistosos",
};

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Group already-fetched videos for display. Filters still decide what loads. */
export function groupVideos(
  videos: Video[],
  groupBy: VideoGroupBy
): VideoGroup[] {
  if (groupBy === "none" || videos.length === 0) {
    return [{ key: "all", label: "", videos }];
  }

  if (groupBy === "category") {
    return CATEGORY_ORDER.map((cat) => ({
      key: cat,
      label: CATEGORY_LABEL[cat],
      videos: videos.filter((v) => v.category === cat),
    })).filter((g) => g.videos.length > 0);
  }

  if (groupBy === "competition") {
    return COMP_ORDER.map((comp) => ({
      key: comp,
      label: COMP_LABEL[comp],
      videos: videos.filter((v) => v.competition_type === comp),
    })).filter((g) => g.videos.length > 0);
  }

  // month
  const buckets = new Map<string, Video[]>();
  for (const v of videos) {
    const key = monthKey(v.created_at);
    const list = buckets.get(key);
    if (list) list.push(v);
    else buckets.set(key, [v]);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, vids]) => ({
      key,
      label: monthLabel(key),
      videos: vids,
    }));
}
