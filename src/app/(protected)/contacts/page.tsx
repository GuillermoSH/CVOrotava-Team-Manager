import ContactsView from "./ContactsView";
import { requireAdminPage } from "@/lib/auth/require-admin-page";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { listTeamContacts } from "@/lib/contacts/listTeamContacts";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

export default async function ContactsPage() {
  // Layout y página se renderizan en paralelo: la página no toca datos sin comprobar admin.
  await requireAdminPage();
  const season = getCurrentSeason();
  const teams = await listTeamContacts(supabaseAdmin, season);
  return <ContactsView teams={teams} season={season} />;
}
