import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { gender: null, error: "No autenticado" },
        { status: 401 }
      );
    }

    const { data: profile, error } = await supabase
      .from("users")
      .select("gender, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener datos del usuario:", error);
      return NextResponse.json(
        { error: "Error al obtener datos del usuario" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      gender: profile?.gender ?? null,
      role: profile?.role ?? null,
    });
  } catch (err) {
    console.error("Error inesperado en /api/user-gender:", err);
    return NextResponse.json(
      { error: "Error inesperado del servidor" },
      { status: 500 }
    );
  }
}
