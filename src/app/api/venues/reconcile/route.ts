import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listVenuesAdmin, mergeVenues, planVenueMerges } from "@/lib/venues/adminVenues";

/** POST /api/venues/reconcile — aplica todas las fusiones sugeridas (admin). */
export async function POST() {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  try {
    const steps = planVenueMerges(await listVenuesAdmin(supabaseAdmin));
    for (const s of steps) await mergeVenues(supabaseAdmin, s.source, s.target);
    revalidateTag("venues");
    return NextResponse.json({ ok: true, merged: steps.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
