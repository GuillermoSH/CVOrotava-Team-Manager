import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";

/** Último acceso vía Auth Admin: paginar listUsers en vez de N× getUserById. */
async function authLastSignInByUserIds(userIds: string[]) {
  const needed = new Set(userIds.filter(Boolean));
  const out: Record<string, string | null> = {};
  if (needed.size === 0) return out;

  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error || !data?.users?.length) break;

    for (const u of data.users) {
      if (needed.has(u.id)) {
        out[u.id] = u.last_sign_in_at ?? null;
        needed.delete(u.id);
      }
    }

    if (needed.size === 0) break;
    if (data.users.length < perPage) break;
    page += 1;
  }

  for (const id of needed) out[id] = null;
  return out;
}

/** Columnas que consume la UI (listas, modales, dashboard); evita `select('*')`. */
const PAYMENT_SELECT_PLAYER = `
  id,
  user_id,
  concept,
  amount,
  status,
  due_date,
  paid_date,
  notes,
  season,
  created_at,
  updated_at
`;

const PAYMENT_SELECT_ADMIN = `
  ${PAYMENT_SELECT_PLAYER.trim()},
  users ( user_name, gender )
`;

const PAYMENT_SELECT_ADMIN_GENDER = `
  ${PAYMENT_SELECT_PLAYER.trim()},
  users!inner ( user_name, gender )
`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");
  const season = url.searchParams.get("season");
  const gender = url.searchParams.get("gender");

  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

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
    // ADMIN VIEW: service role + join users (RLS de pagos para admin)
    let query = supabaseAdmin
      .from("payments")
      .select(PAYMENT_SELECT_ADMIN)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }
    if (season) query = query.eq("season", season);
    
    // For manual gender filtering with LEFT JOIN, we can't reliably do .eq("users.gender", gender) in Supabase 
    // unless we use inner join. So if gender is provided, we MUST use inner join.
    if (gender) {
      query = supabaseAdmin
        .from("payments")
        .select(PAYMENT_SELECT_ADMIN_GENDER)
        .order("due_date", { ascending: true, nullsFirst: false });
      
      if (targetUserId) query = query.eq("user_id", targetUserId);
      if (season) query = query.eq("season", season);
      query = query.eq("users.gender", gender);
    }

    const { data: payments, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const paymentRows = (payments ?? []) as unknown as { user_id: string }[];
    const uniqueUserIds = [...new Set(paymentRows.map((p) => p.user_id))];
    const authLastSignInAtByUserId = await authLastSignInByUserIds(uniqueUserIds);

    return NextResponse.json({
      data: paymentRows,
      isAdmin: true,
      authLastSignInAtByUserId,
    });
  } else {
    // PLAYER VIEW: Obtener solo sus pagos (asegurado por RLS)
    let query = supabase
      .from("payments")
      .select(PAYMENT_SELECT_PLAYER)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (season) query = query.eq("season", season);

    const { data: payments, error } = await query;

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
  season: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

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

    // FECHAS y extras (asegurar nulos si están vacías en vez de "")
    const cleanData = {
      ...paymentData,
      due_date: paymentData.due_date || null,
      paid_date: paymentData.paid_date || null,
      notes: paymentData.notes || null,
      season: paymentData.season || null,
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
