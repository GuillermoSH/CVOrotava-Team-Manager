import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/supabase/fetchAll";
import {
  groupContactsByTeam,
  type ContactRow,
  type PlayerRow,
  type TeamContacts,
  type TeamRow,
} from "./groupContacts";

/**
 * Contactos (teléfono y correo) de las familias por equipo y temporada.
 * Solo para admins: el llamador debe haber pasado `requireAdminPage`/`requireAdmin`.
 * Columnas explícitas: nada de DNI, dirección ni notas médicas.
 */
export async function listTeamContacts(
  supabase: SupabaseClient,
  season: string
): Promise<TeamContacts[]> {
  const [teams, players] = await Promise.all([
    fetchAll<TeamRow>((a, b) =>
      supabase.from("teams").select("id, name, category, gender").eq("season", season).range(a, b)
    ),
    fetchAll<PlayerRow>((a, b) =>
      supabase
        .from("players")
        .select("id, full_name, team_id, is_active")
        .eq("season", season)
        .range(a, b)
    ),
  ]);

  const playerIds = players.map((p) => p.id);
  const contacts: ContactRow[] = [];
  // `in` con cientos de ids revienta la URL: se pide en trozos.
  for (let i = 0; i < playerIds.length; i += 100) {
    const chunk = playerIds.slice(i, i + 100);
    const rows = await fetchAll<ContactRow>((a, b) =>
      supabase
        .from("player_contacts")
        .select("id, player_id, full_name, relationship, phone, email, is_primary")
        .in("player_id", chunk)
        .range(a, b)
    );
    contacts.push(...rows);
  }

  return groupContactsByTeam(teams, players, contacts);
}
