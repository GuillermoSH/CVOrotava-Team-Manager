import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }>}
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from("videos")
      .update({
        url: body.url,
        category: body.category,
        season: body.season,
        competition_type: body.competition_type,
        gender: body.gender,
      })
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error en PUT /videos/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("videos")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error en DELETE /videos/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
