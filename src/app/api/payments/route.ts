import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getPaymentsSnapshot } from "@/lib/payments/getPaymentsSnapshot";
import {
  listActiveSeniorPlayers,
  resolvePlayerForPaymentWrite,
  syncTmPlayersToSeniorRoster,
} from "@/lib/payments/seniorPlayers";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetPlayerId = url.searchParams.get("playerId");
  const targetUserId = url.searchParams.get("userId");
  const season = url.searchParams.get("season");
  const gender = url.searchParams.get("gender");

  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase, { allowInactive: true });
  if ("response" in auth) return auth.response;

  const result = await getPaymentsSnapshot({
    actor: auth.user,
    targetPlayerId,
    targetUserId,
    season,
    gender,
  });

  if (result.status === "denied") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }
  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  return NextResponse.json(result.body);
}

const paymentPostSchema = z
  .object({
    player_id: z.string().min(1).optional(),
    /** Transition: accepted if player_id omitted; ensure senior profile on write. */
    user_id: z.string().min(1).optional(),
    concept: z.string().min(1),
    amount: z.number(),
    status: z.enum(["pending", "paid"]),
    due_date: z.string().optional(),
    paid_date: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    season: z.string().optional().nullable(),
    gender: z.enum(["male", "female"]).optional().nullable(),
  })
  .refine((v) => Boolean(v.player_id || v.user_id), {
    message: "Indica player_id o user_id",
  });

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const parsedData = paymentPostSchema.parse(body);

    const season = parsedData.season?.trim() || getCurrentSeason();
    const cleanData = {
      concept: parsedData.concept,
      amount: parsedData.amount,
      status: parsedData.status,
      due_date: parsedData.due_date || null,
      paid_date: parsedData.paid_date || null,
      notes: parsedData.notes || null,
      season,
    };

    const bulkTarget =
      parsedData.player_id === "ALL" || parsedData.user_id === "ALL";

    if (bulkTarget) {
      const synced = await syncTmPlayersToSeniorRoster({
        season,
        gender: parsedData.gender,
      });
      if (!synced.ok) {
        return NextResponse.json({ error: synced.message }, { status: 400 });
      }

      const roster = await listActiveSeniorPlayers({
        season,
        gender: parsedData.gender,
      });
      if (roster.error) throw new Error(roster.error);
      if (roster.data.length === 0) {
        return NextResponse.json(
          {
            error:
              "No hay jugadores sénior activos para esa temporada" +
              (parsedData.gender ? " y género" : "") +
              ".",
          },
          { status: 400 }
        );
      }

      const bulkPayments = roster.data.map((player) => ({
        player_id: player.id,
        user_id: player.user_id,
        ...cleanData,
      }));

      const { error: bulkError } = await supabaseAdmin
        .from("payments")
        .insert(bulkPayments);
      if (bulkError) throw new Error(bulkError.message);

      return NextResponse.json({
        message: `Asignado a ${bulkPayments.length} jugadores sénior correctamente`,
      });
    }

    const resolved = await resolvePlayerForPaymentWrite({
      playerId: parsedData.player_id,
      userId: parsedData.user_id,
      season,
    });
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.message }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      player_id: resolved.player.playerId,
      user_id: resolved.player.userId,
      ...cleanData,
    });

    if (insertError) throw new Error(insertError.message);
    return NextResponse.json({ message: "Pago asignado correctamente" });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
