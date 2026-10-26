import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { clearPendingPayments, getExemption } from "@/lib/payments/exemptions";
import { getCurrentSeason, normalizeSeasonId } from "@/utils/getCurrentSeason";

const bodySchema = z.object({
  player_id: z.string().uuid(),
  season: z.string().trim().min(1).optional(),
});

/**
 * Quita los pagos pendientes de un jugador exento (restos anteriores a la exención).
 * Solo si el jugador está exento esa temporada; los pagos ya cobrados no se tocan.
 */
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }

  const season = normalizeSeasonId(parsed.data.season || getCurrentSeason());
  const exemption = await getExemption(parsed.data.player_id, season);
  if (!exemption) {
    return NextResponse.json(
      { error: "Solo se quitan los pagos pendientes de un jugador exento esa temporada." },
      { status: 409 }
    );
  }

  const result = await clearPendingPayments(parsed.data.player_id, season);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ message: "Pagos pendientes quitados", removed: result.removed });
}
