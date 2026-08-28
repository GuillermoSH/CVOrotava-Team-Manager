import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getPaymentsSnapshot } from "@/lib/payments/getPaymentsSnapshot";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");
  const season = url.searchParams.get("season");
  const gender = url.searchParams.get("gender");

  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase, { allowInactive: true });
  if ("response" in auth) return auth.response;

  const result = await getPaymentsSnapshot({
    actor: auth.user,
    targetUserId,
    season,
    gender,
  });

  if (result.status === "denied") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }
  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  return NextResponse.json(result.body);
}

// Validación Payload POST
const paymentPostSchema = z.object({
  user_id: z.string().min(1),
  concept: z.string().min(1),
  amount: z.number(),
  status: z.enum(["pending", "paid"]),
  due_date: z.string().optional(),
  paid_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  season: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const parsedData = paymentPostSchema.parse(body);

    const { user_id, ...paymentData } = parsedData;

    // FECHAS y extras (asegurar nulos si están vacías en vez de "")
    const cleanData = {
      ...paymentData,
      due_date: paymentData.due_date || null,
      paid_date: paymentData.paid_date || null,
      notes: paymentData.notes || null,
      season: paymentData.season || null,
    };

    if (user_id === "ALL") {
      // BULK INSERT: Cargar a todos los usuarios
      const { data: allUsers } = await supabaseAdmin.from("users").select("id").neq("role", "admin");
      
      if (!allUsers || allUsers.length === 0) {
         return NextResponse.json({ error: "No hay jugadores disponibles" }, { status: 400 });
      }

      const bulkPayments = allUsers.map((u: { id: string }) => ({
        user_id: u.id,
        ...cleanData
      }));

      const { error: bulkError } = await supabaseAdmin.from("payments").insert(bulkPayments);
      if (bulkError) throw new Error(bulkError.message);

      return NextResponse.json({ message: `Asignado a ${bulkPayments.length} jugadores correctamente` });
    } else {
      const { error: insertError } = await supabaseAdmin.from("payments").insert({
        user_id,
        ...cleanData
      });

      if (insertError) throw new Error(insertError.message);
      return NextResponse.json({ message: "Pago asignado correctamente" });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
