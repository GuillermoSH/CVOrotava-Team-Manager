import { supabase } from "@/lib/supabaseClient";

export async function getVideosByCategory(
  category: "match" | "training",
  filters?: { season?: string; competition_type?: string; gender?: string }
) {
  let query = supabase.from("videos").select("*").eq("category", category);

  if (filters?.season) {
    query = query.eq("season", filters.season);
  }
  if (filters?.competition_type) {
    query = query.eq("competition_type", filters.competition_type);
  }
  if (filters?.gender) {
    query = query.eq("gender", filters.gender);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching videos:", error);
    return [];
  }
  return data || [];
}

export function getDateByTimestampz(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export async function getSeasons() {
  const { data, error } = await supabase
    .from("videos")
    .select("season")
    .order("season", { ascending: false });

  if (error) {
    console.error("Error fetching seasons:", error);
    return [];
  }

  // eliminar duplicados
  const uniqueSeasons = [...new Set(data.map((d) => d.season))];
  return uniqueSeasons;
}
