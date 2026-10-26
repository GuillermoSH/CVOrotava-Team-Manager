import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { listVenues } from "@/lib/venues/listVenues";
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createVenueSchema } from "@/lib/venues/venueInput";
import { findVenueByName } from "@/lib/venues/venueNames";

export async function GET() {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  try {
    const data = await listVenues();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** POST /api/venues — alta manual de un pabellón (admin). No queda pendiente de revisar. */
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  const parsed = createVenueSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { data: existing, error: listError } = await supabaseAdmin
    .from("venues")
    .select("id, venue_name, team_name");
  if (listError) return NextResponse.json({ error: listError.message }, { status: 400 });

  const duplicate = findVenueByName(parsed.data.venue_name, existing ?? []);
  if (duplicate) {
    return NextResponse.json(
      { error: `Ya existe «${duplicate.venue_name}». Edítalo o fusiona en lugar de crear otro.` },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("venues")
    .insert({ ...parsed.data, needs_review: false })
    .select("id, venue_name, team_name, location_type, needs_review")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidateTag("venues", { expire: 0 });
  return NextResponse.json(data, { status: 201 });
}
