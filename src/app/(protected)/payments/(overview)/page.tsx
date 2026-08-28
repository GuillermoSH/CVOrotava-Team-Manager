import PaymentsView from "./PaymentsView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import { getPaymentsSnapshot } from "@/lib/payments/getPaymentsSnapshot";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import type { Payment } from "./PaymentsView";

export default async function PaymentsPage() {
  const user = await requireAppUser();
  const season = getCurrentSeason();
  const gender = user.isAdmin ? user.gender ?? undefined : undefined;
  const result = await getPaymentsSnapshot({
    actor: user,
    season,
    gender,
  });

  const initialSnapshot =
    result.status === "ok"
      ? {
          data: result.body.data as Payment[],
          isAdmin: result.body.isAdmin,
          authLastSignInAtByUserId: result.body.authLastSignInAtByUserId,
        }
      : { data: [] as Payment[], isAdmin: user.isAdmin };

  return (
    <PaymentsView
      initialSnapshot={initialSnapshot}
      initialFilters={{ season, gender }}
    />
  );
}
