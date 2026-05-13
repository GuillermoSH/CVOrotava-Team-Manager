import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Si el partido tiene URL de vídeo y no existe fila en `videos` con esa URL,
 * inserta un registro (categoría partido). No actualiza filas ya existentes.
 */
export async function ensureVideoFromMatchUrl(params: {
  videoUrl: string | null | undefined;
  season: string | null | undefined;
  gender: string | null | undefined;
}): Promise<void> {
  const url = typeof params.videoUrl === "string" ? params.videoUrl.trim() : "";
  if (!url) return;

  const { data: existing, error: selectError } = await supabaseAdmin
    .from("videos")
    .select("id")
    .eq("url", url)
    .maybeSingle();

  if (selectError) {
    console.error("[ensureVideoFromMatchUrl] select:", selectError.message);
    return;
  }
  if (existing) return;

  const { error: insertError } = await supabaseAdmin.from("videos").insert({
    url,
    category: "match",
    season: params.season ?? null,
    competition_type: "league",
    gender: params.gender ?? null,
  });

  if (insertError?.code === "23505") return;
  if (insertError) console.error("[ensureVideoFromMatchUrl] insert:", insertError.message);
}
