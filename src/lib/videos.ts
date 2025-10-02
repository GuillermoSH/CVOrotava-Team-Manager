export async function fetchVideos(
  category: "match" | "training",
  filters: { season?: string; competition_type?: string; gender?: string } = {},
  page = 1,
  limit = 12
) {
  const params = new URLSearchParams({
    category,
    page: page.toString(),
    limit: limit.toString(),
    ...(filters.season ? { season: filters.season } : {}),
    ...(filters.competition_type ? { competition_type: filters.competition_type } : {}),
    ...(filters.gender ? { gender: filters.gender } : {}),
  });

  const res = await fetch(`/api/videos?${params}`);
  if (!res.ok) throw new Error("Error fetching videos");
  return res.json();
}

export async function fetchSeasons() {
  const res = await fetch("/api/seasons");
  if (!res.ok) throw new Error("Error fetching seasons");
  return res.json();
}

export function getDateByTimestampz(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}
