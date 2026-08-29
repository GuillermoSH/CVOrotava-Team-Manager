import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { normalizeEmail } from "@/lib/auth/allowlist";
import { signOutAuthUserByEmail } from "@/lib/auth/authUsers";
import { listAllowedEmails } from "@/lib/access/listAllowedEmails";

const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .transform((s) => normalizeEmail(s))
  .refine((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), "Email no válido");

export async function GET() {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  try {
    const rows = await listAllowedEmails();
    return NextResponse.json({ data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

  const parsed = z.object({ email: emailSchema }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email no válido" }, { status: 400 });
  }

  const email = parsed.data.email;
  const { error } = await supabaseAdmin.from("allowed_emails").insert({ email });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ese email ya tiene acceso" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email }, { status: 201 });
}

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

  const parsed = z
    .object({ email: emailSchema, nextEmail: emailSchema })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email no válido" }, { status: 400 });
  }

  const { email, nextEmail } = parsed.data;
  if (email === nextEmail) {
    return NextResponse.json({ ok: true, email });
  }
  if (email === auth.user.email) {
    return NextResponse.json(
      { error: "No puedes modificar tu propio acceso" },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabaseAdmin
    .from("allowed_emails")
    .update({ email: nextEmail })
    .eq("email", email)
    .select("email")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ese email ya tiene acceso" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Ese acceso no existe" }, { status: 404 });
  }

  await signOutAuthUserByEmail(email);
  return NextResponse.json({ ok: true, email: nextEmail });
}

export async function DELETE(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = z.object({ email: emailSchema }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email no válido" }, { status: 400 });
  }

  const email = parsed.data.email;
  if (email === auth.user.email) {
    return NextResponse.json(
      { error: "No puedes quitarte el acceso a ti mismo" },
      { status: 400 }
    );
  }

  const { count, error: countError } = await supabaseAdmin
    .from("allowed_emails")
    .select("email", { count: "exact", head: true });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: "Tiene que quedar al menos un acceso" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("allowed_emails")
    .delete()
    .eq("email", email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await signOutAuthUserByEmail(email);
  return NextResponse.json({ ok: true });
}
