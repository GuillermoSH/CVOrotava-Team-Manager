import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { syncFed } from "@/lib/fed/sync";
import { getLastFedSync } from "@/lib/fed/lastSync";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Una sincronización sin terminar más reciente que esto bloquea otra nueva. */
const RUNNING_WINDOW_MS = 10 * 60 * 1000;

/** GET /api/fed/sync — última sincronización correcta ("Actualizado el …"). */
export async function GET() {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json(await getLastFedSync());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/** POST /api/fed/sync — "Sincronizar ahora" (solo admin, temporada actual). */
export async function POST() {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  const { data: running } = await supabaseAdmin
    .from("fed_sync_runs")
    .select("id")
    .is("finished_at", null)
    .gte("started_at", new Date(Date.now() - RUNNING_WINDOW_MS).toISOString())
    .limit(1);
  if (running && running.length > 0) {
    return NextResponse.json(
      { error: "Ya hay una sincronización en curso. Prueba en unos minutos." },
      { status: 409 }
    );
  }

  try {
    const summary = await syncFed({
      supabase: supabaseAdmin,
      scope: { kind: "current" },
      trigger: "manual",
    });
    revalidateTag("venues", { expire: 0 });
    revalidateTag("fed", { expire: 0 });
    return NextResponse.json({ ok: true, summary, last: await getLastFedSync() });
  } catch (err) {
    console.error("[fed sync manual]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
