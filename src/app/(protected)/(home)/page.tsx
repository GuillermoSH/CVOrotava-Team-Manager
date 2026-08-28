import HomeView, { type HomeMatch } from "./HomeView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import { listMatches } from "@/lib/matches/listMatches";
import { getPaymentsSnapshot } from "@/lib/payments/getPaymentsSnapshot";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

export default async function HomePage() {
  const user = await requireAppUser();
  const season = getCurrentSeason();

  const [matches, paymentsResult] = await Promise.all([
    listMatches({
      gender: user.gender,
      season,
      order: "asc",
    }),
    getPaymentsSnapshot({ actor: user }),
  ]);

  return (
    <HomeView
      initialMatches={matches as HomeMatch[]}
      initialPayments={
        paymentsResult.status === "ok" ? paymentsResult.body : null
      }
    />
  );
}
