import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { removeExemption, setExemption } from "@/lib/payments/exemptions";
import { getCurrentSeason, normalizeSeasonId } from "@/utils/getCurrentSeason";

const putSchema = z.object({
  player_id: z.string().uuid(),
  season: z.string().trim().min(1).optional(),
  reason: z.string().trim().max(200).optional().nullable(),
});

const deleteSchema = z.object({
  player_id: z.string().uuid(),
  season: z.string().trim().min(1).optional(),
});

const seasonOf = (raw: string | undefined) => normalizeSeasonId(raw || getCurrentSeason());

/** Marca (o actualiza el motivo de) un jugador como exento de pagos en una temporada. */
export async function PUT(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de exención no válidos." }, { status: 400 });
  }

  const result = await setExemption({
    playerId: parsed.data.player_id,
    season: seasonOf(parsed.data.season),
    reason: parsed.data.reason?.trim() || null,
    createdBy: auth.user.id,
  });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ message: "Exención guardada" });
}

/** Quita la exención de un jugador en una temporada. */
export async function DELETE(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const parsed = deleteSchema.safeParse({
    player_id: url.searchParams.get("player_id"),
    season: url.searchParams.get("season") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de exención no válidos." }, { status: 400 });
  }

  const result = await removeExemption(parsed.data.player_id, seasonOf(parsed.data.season));
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ message: "Exención quitada" });
}
