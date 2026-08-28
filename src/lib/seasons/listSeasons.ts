import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getCurrentSeason,
  getNextSeason,
} from "@/utils/getCurrentSeason";

const fetchSeasons = unstable_cache(
  async (): Promise<string[]> => {
    const current = getCurrentSeason();
    const next = getNextSeason(current);
    const seeded = new Set<string>([next, current]);

    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      "list_distinct_video_seasons"
    );

    if (!rpcError && Array.isArray(rpcData)) {
      for (const r of rpcData as { season: string }[]) {
        if (r.season) seeded.add(r.season);
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from("videos")
        .select("season")
        .order("season", { ascending: false });

      if (error) throw new Error(error.message);

      for (const d of data ?? []) {
        if (d.season) seeded.add(d.season);
      }
    }

    const { data: matchSeasons } = await supabaseAdmin
      .from("matches")
      .select("season");
    for (const d of matchSeasons ?? []) {
      if (d.season) seeded.add(d.season);
    }

    return [...seeded].sort((a, b) => b.localeCompare(a));
  },
  ["app-seasons"],
  { revalidate: 300 }
);

/** Deduped per request; cached across navigations for 5 minutes. */
export const listSeasons = cache(fetchSeasons);
