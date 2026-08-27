import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

const patchSchema = z.object({
  concept: z.string().optional(),
  amount: z.number().optional(),
  status: z.enum(["pending", "paid"]).optional(),
  due_date: z.string().optional().nullable(),
  paid_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  season: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID de pago faltante" }, { status: 400 });

    const body = await req.json();
    const updateData = patchSchema.parse(body);

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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID de pago faltante" }, { status: 400 });

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
