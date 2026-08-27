import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET() {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, user_name, is_active")
    .order("user_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(users);
}

const patchSchema = z
  .object({
    id: z.string().uuid(),
    gender: z.enum(["male", "female"]).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (v) => v.gender !== undefined || v.is_active !== undefined,
    "Nada que actualizar"
  );

async function ensureAuthUser(id: string) {
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.getUserById(id);
  if (authError || !authData?.user) return null;
  return authData.user;
}

/** Admin: patch profile fields; create row if Auth user has no profile yet. */
export async function PATCH(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const { id, gender, is_active } = parsed.data;

  // Do not deactivate yourself / another admin via this endpoint casually —
  // still allow, but block deactivating own account to avoid lockout confusion.
  if (is_active === false && id === auth.user.id) {
    return NextResponse.json(
      { error: "No puedes desactivar tu propia cuenta" },
      { status: 400 }
    );
  }

  const patch: { gender?: "male" | "female"; is_active?: boolean } = {};
  if (gender !== undefined) patch.gender = gender;
  if (is_active !== undefined) patch.is_active = is_active;

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (existing) {
    if (existing.role === "admin" && is_active === false) {
      return NextResponse.json(
        { error: "No se puede desactivar a un admin" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(patch)
      .eq("id", id)
      .select("id, gender, is_active")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "No se pudo actualizar el perfil" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      ok: true,
      id: data.id,
      gender: data.gender,
      is_active: data.is_active,
    });
  }

  const authUser = await ensureAuthUser(id);
  if (!authUser) {
    return NextResponse.json(
      { error: "No hay cuenta de Auth con ese id" },
      { status: 404 }
    );
  }

  const email = authUser.email ?? "";
  const metaName =
    typeof authUser.user_metadata?.full_name === "string"
      ? authUser.user_metadata.full_name
      : typeof authUser.user_metadata?.name === "string"
        ? authUser.user_metadata.name
        : null;

  const { data: created, error: insertError } = await supabaseAdmin
    .from("users")
    .insert({
      id,
      gender: gender ?? "male",
      is_active: is_active ?? true,
      user_name: metaName || email || "Usuario",
      role: "player",
    })
    .select("id, gender, is_active")
    .maybeSingle();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  if (!created) {
    return NextResponse.json(
      { error: "No se pudo crear el perfil" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: created.id,
    gender: created.gender,
    is_active: created.is_active,
    created: true,
  });
}
