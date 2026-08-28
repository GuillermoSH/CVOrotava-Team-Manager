import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AllowedUser } from "@/lib/auth/require-allowed-user";

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

/** Columns the UI consumes; avoid select('*'). */
const PAYMENT_SELECT_PLAYER = `
  id,
  user_id,
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

const PAYMENT_SELECT_ADMIN = `
  ${PAYMENT_SELECT_PLAYER.trim()},
  users ( user_name, gender )
`;

const PAYMENT_SELECT_ADMIN_GENDER = `
  ${PAYMENT_SELECT_PLAYER.trim()},
  users!inner ( user_name, gender )
`;

export type PaymentRow = {
  id: string;
  user_id: string;
  concept: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  season: string | null;
  created_at: string;
  updated_at: string;
  users?: { user_name: string; gender?: string };
};

export type PaymentsSnapshot = {
  data: PaymentRow[];
  isAdmin: boolean;
  authLastSignInAtByUserId?: Record<string, string | null>;
};

export type GetPaymentsSnapshotOpts = {
  actor: AllowedUser;
  targetUserId?: string | null;
  season?: string | null;
  gender?: string | null;
};

export type GetPaymentsSnapshotResult =
  | { status: "ok"; body: PaymentsSnapshot }
  | { status: "denied" }
  | { status: "error"; message: string };

export async function getPaymentsSnapshot(
  opts: GetPaymentsSnapshotOpts
): Promise<GetPaymentsSnapshotResult> {
  const { actor, targetUserId, season, gender } = opts;
  const isAdmin = actor.isAdmin;

  if (isAdmin) {
    let query = supabaseAdmin
      .from("payments")
      .select(PAYMENT_SELECT_ADMIN)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (targetUserId) query = query.eq("user_id", targetUserId);
    if (season) query = query.eq("season", season);

    if (gender) {
      query = supabaseAdmin
        .from("payments")
        .select(PAYMENT_SELECT_ADMIN_GENDER)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (targetUserId) query = query.eq("user_id", targetUserId);
      if (season) query = query.eq("season", season);
      query = query.eq("users.gender", gender);
    }

    const { data: payments, error } = await query;
    if (error) return { status: "error", message: error.message };

    const paymentRows = (payments ?? []) as unknown as PaymentRow[];
    const uniqueUserIds = [...new Set(paymentRows.map((p) => p.user_id))];
    const authLastSignInAtByUserId = await authLastSignInByUserIds(uniqueUserIds);

    return {
      status: "ok",
      body: {
        data: paymentRows,
        isAdmin: true,
        authLastSignInAtByUserId,
      },
    };
  }

  if (targetUserId && targetUserId !== actor.id) {
    return { status: "denied" };
  }

  let query = supabaseAdmin
    .from("payments")
    .select(PAYMENT_SELECT_PLAYER)
    .eq("user_id", actor.id)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (season) query = query.eq("season", season);

  const { data: payments, error } = await query;
  if (error) return { status: "error", message: error.message };

  const own = ((payments ?? []) as PaymentRow[]).filter(
    (p) => p.user_id === actor.id
  );

  return {
    status: "ok",
    body: { data: own, isAdmin: false },
  };
}
