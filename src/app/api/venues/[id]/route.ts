import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { venueDeleteBlocker } from "@/lib/venues/venueInput";

const patchSchema = z
  .object({
    venue_name: z.string().trim().min(2).optional(),
    location_type: z.enum(["home", "away", "outside_island"]).optional(),
    /** Confirmar casa/fuera/viaje sin cambiarlo. */
    reviewed: z.literal(true).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, "Nada que actualizar");

/** PATCH /api/venues/[id] — nombre / casa-fuera-viaje (admin). Elegir tipo = revisado. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { reviewed, ...fields } = parsed.data;
  const patch: Record<string, unknown> = { ...fields };
  if (reviewed || fields.location_type) patch.needs_review = false;

  const { data, error } = await supabaseAdmin
    .from("venues")
    .update(patch)
    .eq("id", id)
    .select("id, venue_name, location_type, needs_review")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidateTag("venues", { expire: 0 });
  return NextResponse.json(data);
}

/** DELETE /api/venues/[id] — borra un pabellón sin partidos (admin). Con partidos, se fusiona. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const { count, error: countError } = await supabaseAdmin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", id);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 400 });

  const blocker = venueDeleteBlocker(count ?? 0);
  if (blocker) return NextResponse.json({ error: blocker }, { status: 409 });

  const { error } = await supabaseAdmin.from("venues").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidateTag("venues", { expire: 0 });
  return NextResponse.json({ ok: true });
}
