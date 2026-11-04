import { unstable_cache } from "next/cache";
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
import { resolveDueDate } from "@/lib/payments/feeSchedule";
import { expectedFees, listSeasonFeeLines, payerAudience, type SeasonFeeLine } from "@/lib/payments/feeLines";
import { getExemption, listExemptions, type Exemption } from "@/lib/payments/exemptions";
import { getCurrentSeason, normalizeSeasonId } from "@/utils/getCurrentSeason";

/** Último acceso de todas las cuentas (Auth Admin pagina listUsers: caro y casi inmutable, cache de 5 min). */
const loadAllLastSignIns = unstable_cache(
  async (): Promise<Record<string, string | null>> => {
    const out: Record<string, string | null> = {};
    const perPage = 1000;
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error || !data?.users?.length) break;
      for (const u of data.users) out[u.id] = u.last_sign_in_at ?? null;
      if (data.users.length < perPage) break;
    }
    return out;
  },
  ["auth-last-sign-ins"],
  { revalidate: 300 }
);

async function authLastSignInByUserIds(userIds: string[]) {
  const out: Record<string, string | null> = {};
  if (userIds.length === 0) return out;
  const all = await loadAllLastSignIns();
  for (const id of userIds) if (id) out[id] = all[id] ?? null;
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
  /** Exento de pagos esta temporada: no suma deuda ni recibe cuotas. */
  exempt?: Exemption;
};

export type PaymentsSnapshot = {
  data: PaymentRow[];
  isAdmin: boolean;
  authLastSignInAtByUserId?: Record<string, string | null>;
  /** Admin overview: senior roster (with or without payments). */
  adminOverview?: AdminOverviewRow[];
  /** Options for assign-payment modal. */
  seniorPlayers?: SeniorRosterOption[];
  /** Detalle o vista propia: el jugador está exento de pagos esta temporada. */
  exemption?: Exemption | null;
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

type FeeProfile = {
  category?: string | null;
  pays_as_senior?: boolean | null;
  pays_extended_monthly?: boolean | null;
};

/** Ficha de un jugador para el cobro: usuario enlazado, categoría del equipo y si paga como sénior o cuota ampliada. */
async function playerFeeProfile(
  playerId: string
): Promise<{ userId: string | null } & Required<{ [K in keyof FeeProfile]: NonNullable<FeeProfile[K]> | null }>> {
  const { data } = await supabaseAdmin
    .from("players")
    .select("user_id, pays_as_senior, pays_extended_monthly, teams ( category )")
    .eq("id", playerId)
    .maybeSingle();
  const teams = data?.teams as { category: string } | { category: string }[] | null | undefined;
  const team = Array.isArray(teams) ? teams[0] : teams;
  return {
    userId: (data?.user_id as string | null | undefined) ?? null,
    category: team?.category ?? null,
    pays_as_senior: Boolean(data?.pays_as_senior),
    pays_extended_monthly: Boolean(data?.pays_extended_monthly),
  };
}

/** Cuotas de la tarifa de la temporada que al jugador aún le faltan por pagar (como en el Portal). */
function expectedRowsFor(
  rows: PaymentRow[],
  player: { id: string; user_id: string | null } & FeeProfile,
  season: string,
  lines: readonly SeasonFeeLine[]
): PaymentRow[] {
  return expectedFees({
    lines,
    rows: rows.filter((r) => r.player_id === player.id || !r.player_id),
    season,
    audience: payerAudience(player.category, Boolean(player.pays_as_senior)),
    paysExtendedMonthly: Boolean(player.pays_extended_monthly),
  }).map((fee) => ({
    id: `expected:${player.id}:${fee.fee_code}:${fee.billing_month ?? ""}`,
    user_id: player.user_id,
    player_id: player.id,
    concept: fee.concept,
    amount: fee.amount,
    status: "pending",
    due_date: fee.due_date,
    paid_date: null,
    notes: fee.amount < fee.total ? `Faltan ${fee.amount} € de ${fee.total} €` : null,
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
  season: string,
  exemptions: Map<string, Exemption> = new Map(),
  lines: readonly SeasonFeeLine[] = []
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
    const exempt = exemptions.get(player.id);
    if (exempt) {
      return {
        player_id: player.id,
        user_id: player.user_id,
        player: seniorPlayerDisplayName(player),
        pendingAmount: 0,
        overdueCount: 0,
        status: "success" as const,
        lastSignInAt: player.user_id ? (authLastSignInAtByUserId[player.user_id] ?? null) : null,
        exempt,
      };
    }
    let pendingAmount = pendingByPlayer.get(player.id) ?? 0;
    let overdueCount = overdueByPlayer.get(player.id) ?? 0;
    // Previstas sin registrar que ya están en aviso o vencidas también se deben.
    const playerRows = payments.filter((p) => p.player_id === player.id);
    for (const fee of expectedRowsFor(
      playerRows,
      {
        id: player.id,
        user_id: player.user_id,
        category: player.teams?.category,
        pays_as_senior: player.pays_as_senior,
        pays_extended_monthly: player.pays_extended_monthly,
      },
      season,
      lines
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

      // Ficha (usuario enlazado + categoría) y exención no dependen entre sí: en paralelo.
      const detailSeason = seasonKey ?? getCurrentSeason();
      const [profile, exemption, feeLines] = await Promise.all([
        playerFeeProfile(resolvedPlayerId),
        getExemption(resolvedPlayerId, detailSeason),
        listSeasonFeeLines(detailSeason),
      ]);
      const linkedUserId = profile.userId;

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
            // Un exento no recibe cuotas previstas.
            ...(exemption
              ? []
              : expectedRowsFor(
                  rows,
                  { ...profile, id: resolvedPlayerId, user_id: linkedUserId },
                  detailSeason,
                  feeLines
                )),
          ],
          isAdmin: true,
          exemption,
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
    const linkedUserIds = roster
      .map((p) => p.user_id)
      .filter((id): id is string => Boolean(id));
    const rosterById = new Map(roster.map((p) => [p.id, p]));

    // Exenciones, pagos y último acceso no dependen entre sí: en paralelo.
    // Los pagos van sin embeds (users/players por fila): el nombre sale del roster ya cargado.
    const [exemptions, paymentsRes, authLastSignInAtByUserId, feeLines] = await Promise.all([
      listExemptions(seasonKey),
      playerIds.length > 0
        ? supabaseAdmin
            .from("payments")
            .select(PAYMENT_COLUMNS)
            .in("player_id", playerIds)
            .eq("season", seasonKey)
            .order("due_date", { ascending: true, nullsFirst: false })
        : Promise.resolve({ data: [] as unknown[], error: null }),
      adminOverviewLite ? Promise.resolve({} as Record<string, string | null>) : authLastSignInByUserIds(linkedUserIds),
      listSeasonFeeLines(seasonKey),
    ]);
    if (paymentsRes.error) return { status: "error", message: paymentsRes.error.message };
    const paymentRows = ((paymentsRes.data ?? []) as unknown as PaymentRow[]).map((row) => {
      const p = row.player_id ? rosterById.get(row.player_id) : undefined;
      return enrichPaymentRow({
        ...row,
        players: p
          ? { id: p.id, full_name: p.full_name, first_name: p.first_name, last_name: p.last_name, user_id: p.user_id }
          : null,
      });
    });

    const adminOverview = buildAdminOverview(
      roster,
      paymentRows,
      authLastSignInAtByUserId,
      seasonKey,
      exemptions,
      feeLines
    );

    // Assignees = same roster (already synced); avoid a second full sync.
    // Los exentos no se ofrecen para asignarles pagos.
    const seniorPlayers: SeniorRosterOption[] = roster
      .filter((p) => !exemptions.has(p.id))
      .map((p) => ({
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
  const ownPlayerId = await resolveActorPlayerId(actor.id);
  if (targetPlayerId && (!ownPlayerId || targetPlayerId !== ownPlayerId)) {
    return { status: "denied" };
  }

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

  // Viendo la temporada actual el jugador ve también lo que dejó pendiente en las pasadas;
  // si pide otra temporada concreta, solo esa.
  const currentSeason = getCurrentSeason();
  const viewingCurrent = !seasonKey || seasonKey === normalizeSeasonId(currentSeason);
  if (seasonKey && !viewingCurrent) query = query.eq("season", seasonKey);

  const { data: payments, error } = await query;
  if (error) return { status: "error", message: error.message };

  const inScope = (p: PaymentRow) =>
    !viewingCurrent ||
    p.status === "pending" ||
    (p.season ? normalizeSeasonId(p.season) : currentSeason) === normalizeSeasonId(currentSeason);

  const own = ((payments ?? []) as PaymentRow[]).filter(inScope).filter((p) => {
    if (p.player_id && ownPlayerId && p.player_id === ownPlayerId) return true;
    if (p.user_id === actor.id && !p.player_id) return true;
    if (!ownPlayerId && p.user_id === actor.id) return true;
    return false;
  });

  const ownRows = own.map((row) => ({ ...row, due_date: resolveDueDate(row) }));
  const ownSeason = seasonKey ?? getCurrentSeason();
  const [ownExemption, ownLink, ownLines] = await Promise.all([
    ownPlayerId ? getExemption(ownPlayerId, ownSeason) : Promise.resolve(null),
    ownPlayerId ? playerFeeProfile(ownPlayerId) : Promise.resolve(null),
    listSeasonFeeLines(ownSeason),
  ]);
  // Un exento no debe nada: sus cuotas pendientes ya registradas no se le enseñan como deuda.
  const visibleOwnRows = ownExemption ? ownRows.filter((r) => r.status !== "pending") : ownRows;
  const ownExpected = ownPlayerId && !ownExemption
    ? expectedRowsFor(ownRows, { ...(ownLink ?? {}), id: ownPlayerId, user_id: actor.id }, ownSeason, ownLines)
    : [];

  return {
    status: "ok",
    body: { data: [...visibleOwnRows, ...ownExpected], isAdmin: false, exemption: ownExemption },
  };
}
