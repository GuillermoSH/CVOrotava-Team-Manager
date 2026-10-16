import { supabaseAdmin } from "@/lib/supabase/admin";

export type LastFedSync = {
  finishedAt: string | null;
  trigger: string | null;
};

/** Última sincronización con la federación que terminó bien. */
export async function getLastFedSync(): Promise<LastFedSync> {
  const { data, error } = await supabaseAdmin
    .from("fed_sync_runs")
    .select("finished_at, trigger")
    .eq("ok", true)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    finishedAt: (data?.finished_at as string | undefined) ?? null,
    trigger: (data?.trigger as string | undefined) ?? null,
  };
}
