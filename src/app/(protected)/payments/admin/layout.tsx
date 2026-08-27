import { requireAdminPage } from "@/lib/auth/require-admin-page";

export default async function PaymentsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  return children;
}
