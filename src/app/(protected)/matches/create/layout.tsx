import { requireAdminPage } from "@/lib/auth/require-admin-page";

export default async function MatchCreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  return children;
}
