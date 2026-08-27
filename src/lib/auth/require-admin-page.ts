import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "./require-admin";

/** Server layouts/pages: bounce non-admins home. */
export async function requireAdminPage() {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) redirect("/");
}
