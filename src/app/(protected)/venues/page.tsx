import VenuesView from "./VenuesView";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { listVenuesAdmin } from "@/lib/venues/adminVenues";

export default async function VenuesPage() {
  const venues = await listVenuesAdmin(supabaseAdmin);
  return <VenuesView initialVenues={venues} />;
}
