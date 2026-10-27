import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { isTrustedReportUrl } from "@/lib/fed/reportUrl";

/**
 * GET /api/fed/report/:matchId
 * Acta en PDF de un partido de la federación, servida desde nuestro dominio para
 * poder verla incrustada (vista previa). El enlace de la federación es una
 * redirección a un PDF firmado que caduca, así que se resuelve en cada petición.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { matchId } = await params;
  if (!/^\d{1,15}$/.test(matchId)) {
    return NextResponse.json({ error: "Partido no válido." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("fed_matches")
    .select("report_url")
    .eq("id", Number(matchId))
    .maybeSingle();
  if (error) return NextResponse.json({ error: "No se pudo consultar el partido." }, { status: 500 });

  const reportUrl = (data?.report_url as string | null | undefined) ?? null;
  if (!reportUrl) return NextResponse.json({ error: "Este partido no tiene acta." }, { status: 404 });
  // El enlace viene de la API de la federación, pero solo se sigue si es de su dominio.
  if (!isTrustedReportUrl(reportUrl)) {
    return NextResponse.json({ error: "Enlace de acta no válido." }, { status: 502 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(reportUrl, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "La federación no responde." }, { status: 504 });
  }

  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !upstream.body || !type.includes("pdf")) {
    return NextResponse.json({ error: "No se pudo obtener el acta." }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="acta-${matchId}.pdf"`,
      // Solo para quien ya ha entrado; sin caché compartida.
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
