import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeSeasonId } from "@/utils/getCurrentSeason";

export type Exemption = { reason: string | null };

/** Códigos de «la tabla no existe»: Postgres (42P01) y PostgREST (PGRST205), p. ej. migración sin aplicar. */
export function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /could not find the table|does not exist/i.test(error.message ?? "")
  );
}

/**
 * Exentos de una temporada por id de jugador. Si la tabla aún no existe se trata como
 * «sin exentos» (y se avisa en el log) para no romper los pagos antes de aplicar la migración.
 */
export async function listExemptions(season: string): Promise<Map<string, Exemption>> {
  const { data, error } = await supabaseAdmin
    .from("payment_exemptions")
    .select("player_id, reason")
    .eq("season", normalizeSeasonId(season));

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("payment_exemptions no existe todavía: aplica la migración 20261021120000.");
      return new Map();
    }
    throw new Error(`payment_exemptions: ${error.message}`);
  }
  return new Map(
    (data ?? []).map((r) => [r.player_id as string, { reason: (r.reason as string | null) ?? null }])
  );
}

export async function getExemption(playerId: string, season: string): Promise<Exemption | null> {
  const { data, error } = await supabaseAdmin
    .from("payment_exemptions")
    .select("reason")
    .eq("player_id", playerId)
    .eq("season", normalizeSeasonId(season))
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(`payment_exemptions: ${error.message}`);
  }
  return data ? { reason: (data.reason as string | null) ?? null } : null;
}

export async function setExemption(opts: {
  playerId: string;
  season: string;
  reason: string | null;
  createdBy: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabaseAdmin.from("payment_exemptions").upsert(
    {
      player_id: opts.playerId,
      season: normalizeSeasonId(opts.season),
      reason: opts.reason,
      created_by: opts.createdBy,
    },
    { onConflict: "player_id,season" }
  );
  if (error) {
    return {
      ok: false,
      message: isMissingTableError(error)
        ? "Falta aplicar la migración de exenciones (payment_exemptions)."
        : error.message,
    };
  }
  return { ok: true };
}

export async function removeExemption(
  playerId: string,
  season: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabaseAdmin
    .from("payment_exemptions")
    .delete()
    .eq("player_id", playerId)
    .eq("season", normalizeSeasonId(season));
  if (error && !isMissingTableError(error)) return { ok: false, message: error.message };
  return { ok: true };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Borra los pagos pendientes de un jugador en una temporada: los que cuelgan de su
 * `player_id` y los antiguos que solo llevan su `user_id`. No toca los pagados.
 * El llamador debe haber comprobado que el jugador está exento esa temporada.
 */
export async function clearPendingPayments(
  playerId: string,
  season: string
): Promise<{ ok: true; removed: number } | { ok: false; message: string }> {
  const { data: player, error: playerError } = await supabaseAdmin
    .from("players")
    .select("user_id")
    .eq("id", playerId)
    .maybeSingle();
  if (playerError) return { ok: false, message: playerError.message };
  if (!player) return { ok: false, message: "Jugador no encontrado." };

  let query = supabaseAdmin
    .from("payments")
    .delete({ count: "exact" })
    .eq("status", "pending")
    .eq("season", normalizeSeasonId(season));

  // Solo se interpolan UUID validados en el filtro `.or()`.
  const userId = typeof player.user_id === "string" && UUID.test(player.user_id) ? player.user_id : null;
  query =
    userId && UUID.test(playerId)
      ? query.or(`player_id.eq.${playerId},and(player_id.is.null,user_id.eq.${userId})`)
      : query.eq("player_id", playerId);

  const { error, count } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true, removed: count ?? 0 };
}
