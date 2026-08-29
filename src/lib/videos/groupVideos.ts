import type { Video } from "@/components/videos/VideoCard";
import {
  VIDEO_TYPES,
  VIDEO_TYPE_GROUP_LABELS,
} from "@/lib/videos/constants";

export type VideoGroupBy = "none" | "type" | "month";

export const VIDEO_GROUP_OPTIONS: {
  value: VideoGroupBy;
  label: string;
}[] = [
  { value: "none", label: "Sin grupo" },
  { value: "type", label: "Tipo" },
  { value: "month", label: "Mes" },
];

export type VideoGroup = {
  key: string;
  label: string;
  videos: Video[];
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

  if (groupBy === "type") {
    return VIDEO_TYPES.map((type) => ({
      key: type,
      label: VIDEO_TYPE_GROUP_LABELS[type],
      videos: videos.filter((v) => v.video_type === type),
    })).filter((g) => g.videos.length > 0);
  }

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

/** Migrate stored group prefs from the old category/competition keys. */
export function normalizeVideoGroupPref(value: string | null): VideoGroupBy {
  if (value === "type" || value === "category" || value === "competition") {
    return "type";
  }
  if (value === "month") return "month";
  return "none";
}
