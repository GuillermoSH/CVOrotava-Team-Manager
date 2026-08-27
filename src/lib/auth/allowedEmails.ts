export type AllowedEmailRow = {
  email: string;
  created_at: string | null;
  user_id: string | null;
  user_name: string | null;
  role: "admin" | "coach" | "player" | null;
  gender: "male" | "female" | null;
  is_active: boolean | null;
  last_sign_in_at: string | null;
};

/** Has a Supabase Auth account (already signed in at least once via Google). */
export function isRegisteredAccess(row: AllowedEmailRow): boolean {
  return Boolean(row.user_id);
}

/** Profile exists and is marked inactive (leavers). */
export function isInactiveAccess(row: AllowedEmailRow): boolean {
  return isRegisteredAccess(row) && row.is_active === false;
}
