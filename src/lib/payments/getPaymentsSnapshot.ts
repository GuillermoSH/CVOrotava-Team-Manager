import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AllowedUser } from "@/lib/auth/require-allowed-user";
import {
  listActiveSeniorPlayers,
  seniorPlayerDisplayName,
  syncTmPlayersToSeniorRoster,
  type SeniorPlayerRow,
} from "@/lib/payments/seniorPlayers";
import {
  isQuotaOverdue,
  quotaSeverity,
} from "@/components/payments/quotaDates";
import { feeAudienceFor, missingFees, resolveDueDate } from "@/lib/payments/feeSchedule";
import { getCurrentSeason, normalizeSeasonId } from "@/utils/getCurrentSeason";

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
  fee_code,
  billing_month,
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
  fee_code?: string | null;
  billing_month?: number | null;
  /** Cuota prevista por el calendario, aún sin fila en la base de datos. */
  expected?: boolean;
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
  overdueCount: number;
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
  /** Home / summary: skip roster sync + Auth listUsers (full overview still on /payments). */
  adminOverviewLite?: boolean;
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
    due_date: resolveDueDate(row),
    player_name: fromPlayer || fromUser || null,
  };
}

/** Categoría del equipo de una ficha (decide qué cuotas le tocan). */
async function categoryOfPlayer(playerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("players")
    .select("teams ( category )")
    .eq("id", playerId)
    .maybeSingle();
  const teams = data?.teams as { category: string } | { category: string }[] | null | undefined;
  const team = Array.isArray(teams) ? teams[0] : teams;
  return team?.category ?? null;
}

/** Cuotas del calendario que el jugador aún no tiene registradas (como en el Portal). */
function expectedRowsFor(
  rows: PaymentRow[],
  player: { id: string; user_id: string | null; category?: string | null },
  season: string
): PaymentRow[] {
  return missingFees(
    rows.filter((r) => r.player_id === player.id || !r.player_id),
    season,
    feeAudienceFor(player.category)
  ).map((fee) => ({
    id: `expected:${player.id}:${fee.fee_code}:${fee.billing_month ?? ""}`,
    user_id: player.user_id,
    player_id: player.id,
    concept: fee.concept,
    amount: fee.amount,
    status: "pending",
    due_date: fee.due_date,
    paid_date: null,
    notes: null,
    season: normalizeSeasonId(season),
    fee_code: fee.fee_code,
    billing_month: fee.billing_month,
    expected: true,
    created_at: "",
    updated_at: "",
  }));
}

function buildAdminOverview(
  roster: SeniorPlayerRow[],
  payments: PaymentRow[],
  authLastSignInAtByUserId: Record<string, string | null>,
  season: string
): AdminOverviewRow[] {
  const pendingByPlayer = new Map<string, number>();
  const overdueByPlayer = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "pending") continue;
    const key = p.player_id;
    if (!key) continue;
    pendingByPlayer.set(key, (pendingByPlayer.get(key) ?? 0) + Number(p.amount));
    if (isQuotaOverdue("pending", p.due_date)) {
      overdueByPlayer.set(key, (overdueByPlayer.get(key) ?? 0) + 1);
    }
  }

  return roster.map((player) => {
    let pendingAmount = pendingByPlayer.get(player.id) ?? 0;
    let overdueCount = overdueByPlayer.get(player.id) ?? 0;
    // Previstas sin registrar que ya están en aviso o vencidas también se deben.
    const playerRows = payments.filter((p) => p.player_id === player.id);
    for (const fee of expectedRowsFor(
      playerRows,
      { id: player.id, user_id: player.user_id, category: player.teams?.category },
      season
    )) {
      const severity = quotaSeverity("pending", fee.due_date);
      if (severity === "ok") continue;
      pendingAmount += Number(fee.amount);
      if (severity === "critical") overdueCount += 1;
    }
    let status: AdminOverviewRow["status"] = "success";
    if (overdueCount > 0 || pendingAmount >= 100) status = "danger";
    else if (pendingAmount > 0) status = "warning";

    return {
      player_id: player.id,
      user_id: player.user_id,
      player: seniorPlayerDisplayName(player),
      pendingAmount,
      overdueCount,
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
  const { actor, targetPlayerId, targetUserId, season, gender, adminOverviewLite } =
    opts;
  const seasonKey = season?.trim() ? normalizeSeasonId(season.trim()) : null;
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
        if (seasonKey) legacyQuery = legacyQuery.eq("season", seasonKey);

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
      const playerCategory = await categoryOfPlayer(resolvedPlayerId);

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

      if (seasonKey) query = query.eq("season", seasonKey);

      const { data: payments, error } = await query;
      if (error) return { status: "error", message: error.message };

      const rows = ((payments ?? []) as unknown as PaymentRow[]).map(
        enrichPaymentRow
      );
      return {
        status: "ok",
        body: {
          data: [
            ...rows,
            ...expectedRowsFor(
              rows,
              { id: resolvedPlayerId, user_id: linkedUserId, category: playerCategory },
              seasonKey ?? getCurrentSeason()
            ),
          ],
          isAdmin: true,
        },
      };
    }

    // Admin overview: sync TM player accounts → senior roster, then list.
    if (!seasonKey) {
      return {
        status: "error",
        message: "Indica la temporada para listar jugadores sénior.",
      };
    }

    if (!adminOverviewLite) {
      const synced = await syncTmPlayersToSeniorRoster({
        season: seasonKey,
        gender,
      });
      if (!synced.ok) {
        return { status: "error", message: synced.message };
      }
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
    const authLastSignInAtByUserId = adminOverviewLite
      ? {}
      : await authLastSignInByUserIds(linkedUserIds);

    const adminOverview = buildAdminOverview(
      roster,
      paymentRows,
      authLastSignInAtByUserId,
      seasonKey
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

  if (seasonKey) query = query.eq("season", seasonKey);

  const { data: payments, error } = await query;
  if (error) return { status: "error", message: error.message };

  const own = ((payments ?? []) as PaymentRow[]).filter((p) => {
    if (p.player_id && ownPlayerId && p.player_id === ownPlayerId) return true;
    if (p.user_id === actor.id && !p.player_id) return true;
    if (!ownPlayerId && p.user_id === actor.id) return true;
    return false;
  });

  const ownRows = own.map((row) => ({ ...row, due_date: resolveDueDate(row) }));
  const ownExpected = ownPlayerId
    ? expectedRowsFor(
        ownRows,
        { id: ownPlayerId, user_id: actor.id, category: await categoryOfPlayer(ownPlayerId) },
        seasonKey ?? getCurrentSeason()
      )
    : [];

  return {
    status: "ok",
    body: { data: [...ownRows, ...ownExpected], isAdmin: false },
  };
}
