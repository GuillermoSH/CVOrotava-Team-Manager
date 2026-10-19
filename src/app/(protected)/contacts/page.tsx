import ContactsView from "./ContactsView";
import { requireAdminPage } from "@/lib/auth/require-admin-page";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { listContactSeasons, listRivalClubs } from "@/lib/contacts/rivalClubs";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  // Layout y página se renderizan en paralelo: la página no toca datos sin comprobar admin.
  await requireAdminPage();
  const { season: requested } = await searchParams;
  const seasons = await listContactSeasons(supabaseAdmin);
  const current = getCurrentSeason();
  // Solo temporadas con torneos sincronizados; cualquier otro valor cae a la actual.
  const season =
    requested && seasons.includes(requested)
      ? requested
      : seasons.includes(current)
        ? current
        : (seasons[0] ?? current);
  const clubs = await listRivalClubs(supabaseAdmin, season);
  return <ContactsView clubs={clubs} season={season} seasons={seasons} />;
}
