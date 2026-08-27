export type AllowedEmailRow = {
  email: string;
  created_at: string | null;
  user_id: string | null;
  user_name: string | null;
  role: "admin" | "coach" | "player" | null;
  last_sign_in_at: string | null;
};
