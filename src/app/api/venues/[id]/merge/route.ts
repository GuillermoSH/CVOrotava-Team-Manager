import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mergeVenues } from "@/lib/venues/adminVenues";

const bodySchema = z.object({ into: z.string().uuid() });

/**
 * POST /api/venues/[id]/merge { into } — "es el mismo pabellón que…" (admin).
 * Mueve partidos y alias de la federación a `into` y borra este venue.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  if (parsed.data.into === id) {
    return NextResponse.json({ error: "Elige un pabellón distinto" }, { status: 400 });
  }

  try {
    await mergeVenues(supabaseAdmin, id, parsed.data.into);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  revalidateTag("venues");
  return NextResponse.json({ ok: true });
}
