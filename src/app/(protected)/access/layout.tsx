import { requireAdminPage } from "@/lib/auth/require-admin-page";

export default async function AccessAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  return children;
}
