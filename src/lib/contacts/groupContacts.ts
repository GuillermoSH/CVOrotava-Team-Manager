export type TeamRow = { id: string; name: string; category: string; gender: string };
export type PlayerRow = { id: string; full_name: string; team_id: string | null; is_active: boolean };
export type ContactRow = {
  id: string;
  player_id: string;
  full_name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
};

export type PlayerContacts = {
  playerId: string;
  playerName: string;
  contacts: ContactRow[];
};

export type TeamContacts = {
  teamId: string;
  teamName: string;
  players: PlayerContacts[];
};

const byName = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

/**
 * Equipos con sus jugadores activos y los contactos de cada uno (principal primero).
 * Ignora jugadores sin equipo o inactivos y equipos sin jugadores con contacto.
 */
export function groupContactsByTeam(
  teams: TeamRow[],
  players: PlayerRow[],
  contacts: ContactRow[]
): TeamContacts[] {
  const contactsOf = new Map<string, ContactRow[]>();
  for (const c of contacts) {
    const list = contactsOf.get(c.player_id) ?? [];
    list.push(c);
    contactsOf.set(c.player_id, list);
  }

  const playersOf = new Map<string, PlayerContacts[]>();
  for (const p of players) {
    if (!p.team_id || !p.is_active) continue;
    const own = contactsOf.get(p.id);
    if (!own?.length) continue;
    const sorted = [...own].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || byName(a.full_name, b.full_name)
    );
    const list = playersOf.get(p.team_id) ?? [];
    list.push({ playerId: p.id, playerName: p.full_name, contacts: sorted });
    playersOf.set(p.team_id, list);
  }

  return teams
    .filter((t) => playersOf.has(t.id))
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      players: (playersOf.get(t.id) ?? []).sort((a, b) => byName(a.playerName, b.playerName)),
    }))
    .sort((a, b) => byName(a.teamName, b.teamName));
}

/** Teléfono tal cual lo escribió quien lo introdujo; el enlace `tel:` solo lleva dígitos y "+". */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
