import { redirect } from "next/navigation";
import { loadAppUser } from "./loadAppUser";

/** Server layouts/pages: bounce non-admins home. Shares loadAppUser with the shell. */
export async function requireAdminPage() {
  const result = await loadAppUser();
  if (!result.ok || !result.user.isAdmin) redirect("/");
}
