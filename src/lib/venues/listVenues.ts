import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type VenueRow = {
  id: string;
  venue_name: string;
  location_type: string;
};

const fetchVenues = unstable_cache(
  async (): Promise<VenueRow[]> => {
    const { data, error } = await supabaseAdmin
      .from("venues")
      .select("id, venue_name, location_type")
      .order("venue_name");

    if (error) throw new Error(error.message);
    return (data ?? []) as VenueRow[];
  },
  ["venues-list"],
  { revalidate: 300, tags: ["venues"] }
);

/** Cached venue list (small table, changes rarely). */
export const listVenues = cache(fetchVenues);
