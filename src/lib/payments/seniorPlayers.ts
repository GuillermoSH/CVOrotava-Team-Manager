import { supabaseAdmin } from "@/lib/supabase/admin";

export type SeniorPlayerRow = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  season: string;
  is_active: boolean;
  team_id: string | null;
  teams: { id: string; category: string; gender: string; season: string; name: string } | null;
};

/** Modal / assignee option: always a roster `players.id`. */
export type PaymentAssigneeOption = {
  id: string;
  name: string;
  user_id: string | null;
};

function displayName(row: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  user_name?: string | null;
}): string {
  const composed = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
  return (
    composed ||
    row.full_name?.trim() ||
    row.user_name?.trim() ||
    "Sin nombre"
  );
}

function normalizePersonName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Exclude demo / QA accounts from payments roster. */
export function isExcludedTestPlayerName(name: string | null | undefined): boolean {
  return /jugador\s*de\s*pruebas/i.test((name ?? "").trim());
}

/**
 * Portal stores seasons as `YYYY-YY` (e.g. `2026-27`).
 * Team Manager payments UI historically uses `YYYY/YY` (e.g. `2026/27`).
 */
export function toPortalSeasonId(season: string): string {
  const trimmed = season.trim();
  const match = trimmed.match(/^(\d{4})[/-](\d{2})$/);
  if (!match) return trimmed;
  return `${match[1]}-${match[2]}`;
}

/**
 * Active senior roster for payments: `players.is_active`, senior team, season.
 * Excludes test names and profiles linked to inactive TM users.
 */
export async function listActiveSeniorPlayers(opts: {
  season: string;
  gender?: string | null;
}): Promise<{ data: SeniorPlayerRow[]; error: string | null }> {
  const portalSeason = toPortalSeasonId(opts.season);

  let query = supabaseAdmin
    .from("players")
    .select(
      `
      id,
      full_name,
      first_name,
      last_name,
      user_id,
      season,
      is_active,
      team_id,
      teams!inner ( id, category, gender, season, name )
    `
    )
    .eq("season", portalSeason)
    .eq("is_active", true)
    .eq("teams.category", "senior");

  if (opts.gender === "male" || opts.gender === "female") {
    query = query.eq("teams.gender", opts.gender);
  }

  const { data, error } = await query.order("first_name", { ascending: true });

  if (error) return { data: [], error: error.message };

  const rows = (data ?? []).map((row) => {
    const teamsRaw = row.teams as
      | SeniorPlayerRow["teams"]
      | SeniorPlayerRow["teams"][]
      | null;
    const teams = Array.isArray(teamsRaw) ? (teamsRaw[0] ?? null) : teamsRaw;
    return {
      id: row.id as string,
      full_name: row.full_name as string,
      first_name: (row.first_name as string | null) ?? null,
      last_name: (row.last_name as string | null) ?? null,
      user_id: (row.user_id as string | null) ?? null,
      season: row.season as string,
      is_active: Boolean(row.is_active),
      team_id: (row.team_id as string | null) ?? null,
      teams,
    } satisfies SeniorPlayerRow;
  });

  const linkedUserIds = [
    ...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id))),
  ];

  const inactiveUserIds = new Set<string>();
  if (linkedUserIds.length > 0) {
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, is_active, user_name")
      .in("id", linkedUserIds);

    if (usersError) return { data: [], error: usersError.message };

    for (const user of users ?? []) {
      if (user.is_active === false) {
        inactiveUserIds.add(user.id as string);
      }
      if (isExcludedTestPlayerName(user.user_name as string | null)) {
        inactiveUserIds.add(user.id as string);
      }
    }
  }

  const filtered = rows.filter((row) => {
    if (isExcludedTestPlayerName(displayName(row))) return false;
    if (row.user_id && inactiveUserIds.has(row.user_id)) return false;
    return true;
  });

  // If sync once created a linked duplicate beside an unlinked original, keep the linked one.
  const byName = new Map<string, SeniorPlayerRow>();
  for (const row of filtered) {
    const key = normalizePersonName(displayName(row));
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, row);
      continue;
    }
    if (!prev.user_id && row.user_id) {
      byName.set(key, row);
    }
  }

  const deduped = [...byName.values()];
  deduped.sort((a, b) =>
    displayName(a).localeCompare(displayName(b), "es", { sensitivity: "base" })
  );

  return { data: deduped, error: null };
}

/**
 * Only UPDATE `players.user_id` on existing senior roster rows (match by name).
 * Never creates players. Only active TM users (`is_active` !== false), role=player.
 * Skips "JUGADOR DE PRUEBAS".
 */
export async function linkTmUsersToExistingSeniorPlayers(opts: {
  season: string;
  gender?: string | null;
}): Promise<{ ok: true; linked: number } | { ok: false; message: string }> {
  const portalSeason = toPortalSeasonId(opts.season);

  let usersQuery = supabaseAdmin
    .from("users")
    .select("id, user_name, gender, role, is_active")
    .eq("role", "player")
    .or("is_active.is.null,is_active.eq.true");

  if (opts.gender === "male" || opts.gender === "female") {
    usersQuery = usersQuery.eq("gender", opts.gender);
  }

  const { data: users, error: usersError } = await usersQuery;
  if (usersError) return { ok: false, message: usersError.message };

  let playersQuery = supabaseAdmin
    .from("players")
    .select(
      `
      id,
      full_name,
      first_name,
      last_name,
      user_id,
      season,
      is_active,
      team_id,
      teams!inner ( id, category, gender, season )
    `
    )
    .eq("season", portalSeason)
    .eq("is_active", true)
    .eq("teams.category", "senior")
    .is("user_id", null);

  if (opts.gender === "male" || opts.gender === "female") {
    playersQuery = playersQuery.eq("teams.gender", opts.gender);
  }

  const { data: unlinkedPlayers, error: playersError } = await playersQuery;
  if (playersError) return { ok: false, message: playersError.message };

  const available = [...(unlinkedPlayers ?? [])];
  let linked = 0;

  for (const user of users ?? []) {
    const name = (user.user_name as string | null) ?? "";
    if (isExcludedTestPlayerName(name)) continue;

    // Already linked somewhere?
    const { data: already, error: alreadyError } = await supabaseAdmin
      .from("players")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (alreadyError) return { ok: false, message: alreadyError.message };
    if (already) continue;

    const targetNorm = normalizePersonName(name);
    const matchIndexes = available
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row }) => normalizePersonName(displayName(row)) === targetNorm
      );

    if (matchIndexes.length !== 1) continue;

    const { row, index } = matchIndexes[0];
    const { error: linkError } = await supabaseAdmin
      .from("players")
      .update({ user_id: user.id })
      .eq("id", row.id)
      .is("user_id", null);

    if (linkError) return { ok: false, message: linkError.message };

    available.splice(index, 1);
    linked += 1;
  }

  return { ok: true, linked };
}

/** @deprecated alias — payments snapshot still calls sync name */
export async function syncTmPlayersToSeniorRoster(opts: {
  season: string;
  gender?: string | null;
}): Promise<{ ok: true; ensured: number } | { ok: false; message: string }> {
  const result = await linkTmUsersToExistingSeniorPlayers(opts);
  if (!result.ok) return result;
  return { ok: true, ensured: result.linked };
}

/**
 * Options for the payment modal: senior roster after linking TM accounts by name.
 */
export async function listPaymentAssigneeOptions(opts: {
  season: string;
  gender?: string | null;
}): Promise<{ data: PaymentAssigneeOption[]; error: string | null }> {
  const linked = await linkTmUsersToExistingSeniorPlayers(opts);
  if (!linked.ok) return { data: [], error: linked.message };

  const roster = await listActiveSeniorPlayers(opts);
  if (roster.error) return { data: [], error: roster.error };

  return {
    data: roster.data.map((p) => ({
      id: p.id,
      name: displayName(p),
      user_id: p.user_id,
    })),
    error: null,
  };
}

export function seniorPlayerDisplayName(row: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  return displayName(row);
}

export type EnsuredPlayer = {
  playerId: string;
  userId: string | null;
  displayName: string;
};

/**
 * Resolve an existing senior profile for a TM user (link by name if needed).
 * Does **not** create new `players` rows.
 */
export async function ensureSeniorPlayerForUser(opts: {
  userId: string;
  season: string;
}): Promise<{ ok: true; player: EnsuredPlayer } | { ok: false; message: string }> {
  const portalSeason = toPortalSeasonId(opts.season);

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, user_name, gender, role, is_active")
    .eq("id", opts.userId)
    .maybeSingle();

  if (userError) return { ok: false, message: userError.message };
  if (!user) {
    return { ok: false, message: "No se encontró el usuario de Team Manager." };
  }

  if (user.is_active === false) {
    return { ok: false, message: "Ese usuario está inactivo." };
  }

  if (isExcludedTestPlayerName(user.user_name as string | null)) {
    return { ok: false, message: "Cuenta de pruebas excluida de pagos." };
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("players")
    .select("id, full_name, first_name, last_name, user_id, season, is_active")
    .eq("user_id", opts.userId)
    .maybeSingle();

  if (existingError) return { ok: false, message: existingError.message };

  if (existing) {
    if (existing.is_active === false) {
      return {
        ok: false,
        message: "El perfil de jugador enlazado está inactivo en el roster.",
      };
    }
    return {
      ok: true,
      player: {
        playerId: existing.id as string,
        userId: (existing.user_id as string | null) ?? opts.userId,
        displayName: displayName(existing),
      },
    };
  }

  const gender =
    user.gender === "female" || user.gender === "male" ? user.gender : null;
  if (!gender) {
    return {
      ok: false,
      message:
        "El usuario no tiene género configurado; no se puede enlazar al sénior.",
    };
  }

  const rawName = (user.user_name as string | null)?.trim() || "";
  const targetNorm = normalizePersonName(rawName);

  const unlinkedQuery = supabaseAdmin
    .from("players")
    .select(
      `
      id,
      full_name,
      first_name,
      last_name,
      user_id,
      teams!inner ( category, gender, season )
    `
    )
    .eq("season", portalSeason)
    .eq("is_active", true)
    .eq("teams.category", "senior")
    .eq("teams.gender", gender)
    .is("user_id", null);

  const { data: unlinked, error: unlinkedError } = await unlinkedQuery;
  if (unlinkedError) return { ok: false, message: unlinkedError.message };

  const matches = (unlinked ?? []).filter(
    (row) => normalizePersonName(displayName(row)) === targetNorm
  );

  if (matches.length !== 1) {
    return {
      ok: false,
      message:
        matches.length === 0
          ? `No hay ficha sénior activa «${rawName || "sin nombre"}» sin cuenta para enlazar en ${portalSeason}.`
          : `Hay varias fichas sénior con el nombre «${rawName}»; enlaza el user_id a mano en el Portal.`,
    };
  }

  const { data: linked, error: linkError } = await supabaseAdmin
    .from("players")
    .update({ user_id: opts.userId })
    .eq("id", matches[0].id)
    .is("user_id", null)
    .select("id, full_name, first_name, last_name, user_id")
    .single();

  if (linkError) return { ok: false, message: linkError.message };

  return {
    ok: true,
    player: {
      playerId: linked.id as string,
      userId: (linked.user_id as string | null) ?? opts.userId,
      displayName: displayName(linked),
    },
  };
}

/**
 * Resolve player_id for payment write: prefer explicit playerId; else link from userId.
 */
export async function resolvePlayerForPaymentWrite(opts: {
  playerId?: string | null;
  userId?: string | null;
  season: string;
}): Promise<{ ok: true; player: EnsuredPlayer } | { ok: false; message: string }> {
  if (opts.playerId && opts.playerId !== "ALL") {
    const { data, error } = await supabaseAdmin
      .from("players")
      .select("id, full_name, first_name, last_name, user_id, is_active")
      .eq("id", opts.playerId)
      .maybeSingle();

    if (error) return { ok: false, message: error.message };
    if (data) {
      if (isExcludedTestPlayerName(displayName(data))) {
        return { ok: false, message: "Cuenta de pruebas excluida de pagos." };
      }
      if (data.is_active === false) {
        return { ok: false, message: "Ese jugador está inactivo en el roster." };
      }
      return {
        ok: true,
        player: {
          playerId: data.id as string,
          userId: (data.user_id as string | null) ?? null,
          displayName: displayName(data),
        },
      };
    }

    return {
      ok: false,
      message:
        "No se encontró ese perfil de jugador sénior. Debe estar de alta en un equipo sénior del Portal.",
    };
  }

  if (opts.userId && opts.userId !== "ALL") {
    return ensureSeniorPlayerForUser({ userId: opts.userId, season: opts.season });
  }

  return {
    ok: false,
    message: "Indica un jugador (player_id) del roster sénior.",
  };
}
