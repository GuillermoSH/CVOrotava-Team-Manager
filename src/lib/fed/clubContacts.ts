import type { SupabaseClient } from "@supabase/supabase-js";
import { leveradeGet } from "./client";

export type ClubContact = {
  phone: string | null;
  email: string | null;
  headquarter: string | null;
};

const clean = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

/** Atributos de `clubs/{id}` de Leverade → contacto (vacío = null). */
export function parseClubContact(attrs: Record<string, unknown> | undefined): ClubContact {
  return {
    phone: clean(attrs?.phone),
    email: clean(attrs?.email),
    headquarter: clean(attrs?.headquarter),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Se vuelve a pedir si nunca se descargó o tiene más de `maxAgeDays` días. */
export function needsContactRefresh(
  syncedAt: string | null,
  now: Date,
  maxAgeDays = 6
): boolean {
  if (!syncedAt) return true;
  return now.getTime() - new Date(syncedAt).getTime() > maxAgeDays * DAY_MS;
}

export type ClubContactSummary = { updated: number; failed: number };

/**
 * Descarga el contacto de los clubes indicados que no se hayan actualizado hace poco.
 * Un fallo en un club no detiene a los demás (la API limita ráfagas: secuencial).
 */
export async function syncClubContacts(opts: {
  supabase: SupabaseClient;
  clubIds: number[];
  now?: Date;
  log?: (msg: string) => void;
  get?: typeof leveradeGet;
}): Promise<ClubContactSummary> {
  const { supabase, now = new Date(), log = () => {}, get = leveradeGet } = opts;
  const ids = [...new Set(opts.clubIds)];
  const summary: ClubContactSummary = { updated: 0, failed: 0 };
  if (ids.length === 0) return summary;

  const { data, error } = await supabase
    .from("fed_clubs")
    .select("id, contact_synced_at")
    .in("id", ids);
  if (error) throw new Error(`fed_clubs contact select: ${error.message}`);

  const stale = (data ?? [])
    .filter((c) => needsContactRefresh(c.contact_synced_at as string | null, now))
    .map((c) => c.id as number);

  for (const id of stale) {
    try {
      const doc = await get(`clubs/${id}`);
      const resource = Array.isArray(doc.data) ? doc.data[0] : doc.data;
      const contact = parseClubContact(resource?.attributes);
      const { error: uErr } = await supabase
        .from("fed_clubs")
        .update({ ...contact, contact_synced_at: now.toISOString() })
        .eq("id", id);
      if (uErr) throw new Error(uErr.message);
      summary.updated++;
    } catch (err) {
      summary.failed++;
      log(`club ${id}: contacto no actualizado (${err instanceof Error ? err.message : String(err)})`);
    }
  }
  return summary;
}
