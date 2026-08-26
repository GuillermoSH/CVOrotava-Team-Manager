import { notFound, redirect } from "next/navigation";
import MatchDetailsView, {
  type MatchDetail,
} from "@/components/calendar/MatchDetailsView";
import { getMatchById } from "@/lib/matches/getMatchById";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { supabaseServer } from "@/lib/supabase/server";

export default async function MatchDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) {
    // RSC: no JSON — send the user to login instead of a dead 401 page.
    redirect("/login");
  }

  let match;
  try {
    match = await getMatchById(id);
  } catch (err) {
    console.error("Error cargando partido:", err);
    throw new Error("No se pudo cargar el partido");
  }

  if (!match) notFound();

  return <MatchDetailsView key={id} match={match as MatchDetail} />;
}
