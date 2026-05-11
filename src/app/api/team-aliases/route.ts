import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { normalizeTeamName } from "@/lib/standings/normalize";

/** GET — lista global (allowlisted). */
export async function GET() {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("team_aliases")
    .select(
      "id, alias_normalized, canonical_normalized, display_alias, display_canonical, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

const postSchema = z.object({
  alias: z.string().min(1),
  canonical: z.string().min(1),
});

/** POST — crea o reemplaza un alias (admin). */
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const alias_normalized = normalizeTeamName(parsed.data.alias);
  const canonical_normalized = normalizeTeamName(parsed.data.canonical);

  if (!alias_normalized || !canonical_normalized) {
    return NextResponse.json(
      { error: "Nombres no pueden quedar vacíos tras normalizar." },
      { status: 400 }
    );
  }

  if (alias_normalized === canonical_normalized) {
    return NextResponse.json(
      { error: "El alias no puede coincidir con su canonical." },
      { status: 400 }
    );
  }

  // Defensa anti-cadena: canonical no puede ser a su vez un alias existente.
  const { data: chain } = await supabaseAdmin
    .from("team_aliases")
    .select("id")
    .eq("alias_normalized", canonical_normalized)
    .maybeSingle();

  if (chain) {
    return NextResponse.json(
      { error: "El canonical es a su vez un alias existente. Resuelve la cadena primero." },
      { status: 422 }
    );
  }

  // Validar que canonical exista en alguna fila de league_standings.
  const { data: standingsHit } = await supabaseAdmin
    .from("league_standings")
    .select("id")
    .eq("normalized_name", canonical_normalized)
    .limit(1)
    .maybeSingle();

  if (!standingsHit) {
    return NextResponse.json(
      {
        error:
          "El canonical no existe en ninguna clasificación importada. Sube primero el excel.",
      },
      { status: 422 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("team_aliases")
    .upsert(
      {
        alias_normalized,
        canonical_normalized,
        display_alias: parsed.data.alias,
        display_canonical: parsed.data.canonical,
        created_by: auth.user.id,
      },
      { onConflict: "alias_normalized" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
