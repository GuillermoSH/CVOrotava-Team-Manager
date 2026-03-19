import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");

  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Obtener el rol del usuario conectado
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  if (isAdmin) {
    // ADMIN VIEW: Obtener todos los pagos y relacionarlos con los nombres de usuario
    // Como isAdmin => RLS policy: Admins have full access to payments
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabaseAdmin
      .from("payments")
      .select(`
        *,
        users ( user_name )
      `)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: payments, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: payments, isAdmin: true });
  } else {
    // PLAYER VIEW: Obtener solo sus pagos (asegurado por RLS)
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: payments, isAdmin: false });
  }
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
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar admin
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado. Solo administradores." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsedData = paymentPostSchema.parse(body);

    const { user_id, ...paymentData } = parsedData;

    // FECHAS (asegurar nulos si están vacías en vez de "")
    const cleanData = {
      ...paymentData,
      due_date: paymentData.due_date || null,
      paid_date: paymentData.paid_date || null,
      notes: paymentData.notes || null,
    };

    if (user_id === "ALL") {
      // Crear cliente Admin para saltar el RLS al leer usuarios y hacer inserts masivos
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

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
      // INDIVIDUAL INSERT
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
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
