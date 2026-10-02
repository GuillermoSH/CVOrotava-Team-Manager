import { requireAdminPage } from "@/lib/auth/require-admin-page";

export default async function LeagueStandingsUploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  return children;
}
