import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";

const patchSchema = z.object({
  concept: z.string().optional(),
  amount: z.number().optional(),
  status: z.enum(["pending", "paid"]).optional(),
  due_date: z.string().optional().nullable(),
  paid_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  season: z.string().optional().nullable(),
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
  const gate = await requireAllowedUser(supabase);
  if ("response" in gate) {
    const status = gate.response!.status;
    return {
      error: status === 401 ? "No autenticado" : "No autorizado",
      status,
    };
  }

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
    const updateData = patchSchema.parse(body);

    const supabaseAdmin = getSupaAdmin();
    
    // Auto-set paid_date only if we explicitly transitioned to paid and no date was provided
    if (updateData.status === "paid" && updateData.paid_date === undefined) {
      updateData.paid_date = new Date().toISOString().split("T")[0];
    } else if (updateData.status === "pending") {
      updateData.paid_date = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update(updateData)
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
