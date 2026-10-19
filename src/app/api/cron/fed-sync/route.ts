import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncFed } from "@/lib/fed/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/fed-sync — Vercel Cron (lunes por la mañana, ver vercel.json).
 * Vercel envía `Authorization: Bearer $CRON_SECRET`; sin secreto configurado
 * la ruta queda cerrada.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncFed({
      supabase: supabaseAdmin,
      scope: { kind: "current" },
      trigger: "cron",
    });
    revalidateTag("venues", { expire: 0 });
    revalidateTag("fed", { expire: 0 });
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error("[cron fed-sync]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
