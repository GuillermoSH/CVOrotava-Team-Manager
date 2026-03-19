import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["pending", "paid"]),
});

// Uso el client administrador de backend genérico
function getSupaAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Revisa si el request viene de un administrador
async function verifyAdmin() {
  const supabase = await supabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return { error: "No autenticado", status: 401 };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Acceso denegado. Solo administradores.", status: 403 };
  }

  return { user, error: null };
}

// PATCH /api/payments/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, status } = await verifyAdmin();
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID de pago faltante" }, { status: 400 });

    const body = await req.json();
    const { status: newStatus } = patchSchema.parse(body);

    const supabaseAdmin = getSupaAdmin();

    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({ status: newStatus, paid_date: newStatus === "paid" ? new Date().toISOString().split("T")[0] : null })
      .eq("id", id);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ message: "Pago actualizado correctamente" });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

// DELETE /api/payments/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, status } = await verifyAdmin();
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID de pago faltante" }, { status: 400 });

    const supabaseAdmin = getSupaAdmin();

    const { error: deleteError } = await supabaseAdmin
      .from("payments")
      .delete()
      .eq("id", id);

    if (deleteError) throw new Error(deleteError.message);

    return NextResponse.json({ message: "Pago eliminado correctamente" });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
