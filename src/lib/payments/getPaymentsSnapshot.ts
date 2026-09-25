import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AllowedUser } from "@/lib/auth/require-allowed-user";
import {
  listActiveSeniorPlayers,
  listPaymentAssigneeOptions,
  seniorPlayerDisplayName,
  syncTmPlayersToSeniorRoster,
  type SeniorPlayerRow,
} from "@/lib/payments/seniorPlayers";

/** Last sign-in via Auth Admin: paginate listUsers instead of N× getUserById. */
async function authLastSignInByUserIds(userIds: string[]) {
  const needed = new Set(userIds.filter(Boolean));
  const out: Record<string, string | null> = {};
  if (needed.size === 0) return out;

  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error || !data?.users?.length) break;

    for (const u of data.users) {
      if (needed.has(u.id)) {
        out[u.id] = u.last_sign_in_at ?? null;
        needed.delete(u.id);
      }
    }

    if (needed.size === 0) break;
    if (data.users.length < perPage) break;
    page += 1;
  }

  for (const id of needed) out[id] = null;
  return out;
}

const PAYMENT_COLUMNS = `
  id,
  user_id,
  player_id,
  concept,
  amount,
  status,
  due_date,
  paid_date,
  notes,
  season,
  created_at,
  updated_at
`;

export type PaymentRow = {
  id: string;
  user_id: string | null;
  player_id: string | null;
  concept: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  season: string | null;
  created_at: string;
  updated_at: string;
  /** Display name from roster and/or linked TM user. */
  player_name?: string | null;
  users?: { user_name: string; gender?: string } | null;
  players?: {
    id: string;
    full_name: string;
    first_name?: string | null;
    last_name?: string | null;
    user_id?: string | null;
  } | null;
};

export type SeniorRosterOption = {
  id: string;
  name: string;
  user_id: string | null;
};

export type AdminOverviewRow = {
  player_id: string;
  user_id: string | null;
  player: string;
  pendingAmount: number;
  status: "success" | "warning" | "danger";
  lastSignInAt: string | null;
};

export type PaymentsSnapshot = {
  data: PaymentRow[];
  isAdmin: boolean;
  authLastSignInAtByUserId?: Record<string, string | null>;
  /** Admin overview: senior roster (with or without payments). */
  adminOverview?: AdminOverviewRow[];
  /** Options for assign-payment modal. */
  seniorPlayers?: SeniorRosterOption[];
};

export type GetPaymentsSnapshotOpts = {
  actor: AllowedUser;
  /** Preferred: roster player id. */
  targetPlayerId?: string | null;
  /** Transition: TM user id → resolve linked / ensure-read via player. */
  targetUserId?: string | null;
  season?: string | null;
  gender?: string | null;
};

export type GetPaymentsSnapshotResult =
  | { status: "ok"; body: PaymentsSnapshot }
  | { status: "denied" }
  | { status: "error"; message: string };

function enrichPaymentRow(row: PaymentRow): PaymentRow {
  const fromPlayer = row.players
    ? seniorPlayerDisplayName(row.players)
    : null;
  const fromUser = row.users?.user_name?.trim() || null;
  return {
    ...row,
    player_name: fromPlayer || fromUser || null,
  };
}

function buildAdminOverview(
  roster: SeniorPlayerRow[],
  payments: PaymentRow[],
  authLastSignInAtByUserId: Record<string, string | null>
): AdminOverviewRow[] {
  const pendingByPlayer = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "pending") continue;
    const key = p.player_id;
    if (!key) continue;
    pendingByPlayer.set(key, (pendingByPlayer.get(key) ?? 0) + Number(p.amount));
  }

  return roster.map((player) => {
    const pendingAmount = pendingByPlayer.get(player.id) ?? 0;
    let status: AdminOverviewRow["status"] = "success";
    if (pendingAmount >= 100) status = "danger";
    else if (pendingAmount > 0) status = "warning";

    return {
      player_id: player.id,
      user_id: player.user_id,
      player: seniorPlayerDisplayName(player),
      pendingAmount,
      status,
      lastSignInAt: player.user_id
        ? (authLastSignInAtByUserId[player.user_id] ?? null)
        : null,
    };
  });
}

async function resolveActorPlayerId(actorId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("user_id", actorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id as string;
}

async function resolveTargetPlayerId(opts: {
  targetPlayerId?: string | null;
  targetUserId?: string | null;
}): Promise<string | null> {
  if (opts.targetPlayerId) return opts.targetPlayerId;
  if (!opts.targetUserId || opts.targetUserId === "ALL") return null;

  const { data } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("user_id", opts.targetUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

export async function getPaymentsSnapshot(
  opts: GetPaymentsSnapshotOpts
): Promise<GetPaymentsSnapshotResult> {
  const { actor, targetPlayerId, targetUserId, season, gender } = opts;
  const isAdmin = actor.isAdmin;

  if (isAdmin) {
    const resolvedPlayerId = await resolveTargetPlayerId({
      targetPlayerId,
      targetUserId,
    });

    // Detail for one player (or legacy userId without roster → empty).
    if (targetPlayerId || targetUserId) {
      if (!resolvedPlayerId && targetUserId && targetUserId !== "ALL") {
        // Legacy: payments still hanging only on user_id with no player row.
        let legacyQuery = supabaseAdmin
          .from("payments")
          .select(
            `${PAYMENT_COLUMNS.trim()}, users ( user_name, gender ), players ( id, full_name, first_name, last_name, user_id )`
          )
          .eq("user_id", targetUserId)
          .order("due_date", { ascending: true, nullsFirst: false });
        if (season) legacyQuery = legacyQuery.eq("season", season);

        const { data: legacyPayments, error: legacyError } = await legacyQuery;
        if (legacyError) return { status: "error", message: legacyError.message };

        const rows = ((legacyPayments ?? []) as unknown as PaymentRow[]).map(
          enrichPaymentRow
        );
        return {
          status: "ok",
          body: { data: rows, isAdmin: true },
        };
      }

      if (!resolvedPlayerId) {
        return { status: "ok", body: { data: [], isAdmin: true } };
      }

      // Linked user on this player (for legacy rows still only on user_id).
      const { data: playerRow } = await supabaseAdmin
        .from("players")
        .select("id, user_id")
        .eq("id", resolvedPlayerId)
        .maybeSingle();
      const linkedUserId = (playerRow?.user_id as string | null) ?? null;

      let query = supabaseAdmin
        .from("payments")
        .select(
          `${PAYMENT_COLUMNS.trim()}, users ( user_name, gender ), players ( id, full_name, first_name, last_name, user_id )`
        )
        .order("due_date", { ascending: true, nullsFirst: false });

      if (linkedUserId) {
        query = query.or(
          `player_id.eq.${resolvedPlayerId},and(user_id.eq.${linkedUserId},player_id.is.null)`
        );
      } else {
        query = query.eq("player_id", resolvedPlayerId);
      }

      if (season) query = query.eq("season", season);

      const { data: payments, error } = await query;
      if (error) return { status: "error", message: error.message };

      return {
        status: "ok",
        body: {
          data: ((payments ?? []) as unknown as PaymentRow[]).map(enrichPaymentRow),
          isAdmin: true,
        },
      };
    }

    // Admin overview: sync TM player accounts → senior roster, then list.
    const seasonKey = season?.trim() || null;
    if (!seasonKey) {
      return {
        status: "error",
        message: "Indica la temporada para listar jugadores sénior.",
      };
    }

    const synced = await syncTmPlayersToSeniorRoster({
      season: seasonKey,
      gender,
    });
    if (!synced.ok) {
      return { status: "error", message: synced.message };
    }

    const rosterResult = await listActiveSeniorPlayers({
      season: seasonKey,
      gender,
    });
    if (rosterResult.error) {
      return { status: "error", message: rosterResult.error };
    }

    const roster = rosterResult.data;
    const playerIds = roster.map((p) => p.id);

    let paymentRows: PaymentRow[] = [];
    if (playerIds.length > 0) {
      const { data: payments, error } = await supabaseAdmin
        .from("payments")
        .select(
          `${PAYMENT_COLUMNS.trim()}, users ( user_name, gender ), players ( id, full_name, first_name, last_name, user_id )`
        )
        .in("player_id", playerIds)
        .eq("season", seasonKey)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) return { status: "error", message: error.message };
      paymentRows = ((payments ?? []) as unknown as PaymentRow[]).map(
        enrichPaymentRow
      );
    }

    const linkedUserIds = roster
      .map((p) => p.user_id)
      .filter((id): id is string => Boolean(id));
    const authLastSignInAtByUserId = await authLastSignInByUserIds(linkedUserIds);

    const adminOverview = buildAdminOverview(
      roster,
      paymentRows,
      authLastSignInAtByUserId
    );

    // Assignees = same roster (already synced); avoid a second full sync.
    const seniorPlayers: SeniorRosterOption[] = roster.map((p) => ({
      id: p.id,
      name: seniorPlayerDisplayName(p),
      user_id: p.user_id,
    }));

    return {
      status: "ok",
      body: {
        data: paymentRows,
        isAdmin: true,
        authLastSignInAtByUserId,
        adminOverview,
        seniorPlayers,
      },
    };
  }

  // Player / non-admin: only own quotas via linked player (or legacy user_id).
  if (targetUserId && targetUserId !== actor.id) {
    return { status: "denied" };
  }
  if (targetPlayerId) {
    const ownPlayerId = await resolveActorPlayerId(actor.id);
    if (!ownPlayerId || targetPlayerId !== ownPlayerId) {
      return { status: "denied" };
    }
  }

  const ownPlayerId = await resolveActorPlayerId(actor.id);

  let query = supabaseAdmin
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (ownPlayerId) {
    // Profile + any legacy rows still only on user_id (before/without backfill).
    query = query.or(
      `player_id.eq.${ownPlayerId},and(user_id.eq.${actor.id},player_id.is.null)`
    );
  } else {
    // No ficha (p. ej. ya no sigue): historial solo por user_id — no crear player.
    query = query.eq("user_id", actor.id);
  }

  if (season) query = query.eq("season", season);

  const { data: payments, error } = await query;
  if (error) return { status: "error", message: error.message };

  const own = ((payments ?? []) as PaymentRow[]).filter((p) => {
    if (p.player_id && ownPlayerId && p.player_id === ownPlayerId) return true;
    if (p.user_id === actor.id && !p.player_id) return true;
    if (!ownPlayerId && p.user_id === actor.id) return true;
    return false;
  });

  return {
    status: "ok",
    body: { data: own, isAdmin: false },
  };
}
