import HomeView, { type HomeMatch } from "./HomeView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import { listMatches } from "@/lib/matches/listMatches";
import { getPaymentsSnapshot } from "@/lib/payments/getPaymentsSnapshot";
import { getCompetitiveStats } from "@/lib/stats/competitive/load";
import { loadAdminPending, loadLatestVideos, loadWeekendRoundup } from "@/lib/home/loadHomeExtras";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

/** Un bloque secundario que falla no debe tumbar el inicio. */
const safely = <T,>(label: string, fallback: T) => (err: unknown) => {
  console.error(`home ${label} failed:`, err);
  return fallback;
};

export default async function HomePage() {
  const user = await requireAppUser();
  const season = getCurrentSeason();
  const gender = user.gender ?? null;

  const [matches, paymentsResult, videos, competitive, roundup, adminPending] = await Promise.all([
    listMatches({
      gender: user.gender,
      season,
      order: "asc",
    }),
    getPaymentsSnapshot({
      actor: user,
      season,
      gender: user.isAdmin ? user.gender ?? undefined : undefined,
      adminOverviewLite: user.isAdmin,
    }),
    loadLatestVideos(gender).catch(safely("videos", [])),
    gender ? getCompetitiveStats(season, gender).catch(safely("stats", null)) : Promise.resolve(null),
    gender ? loadWeekendRoundup(season, gender).catch(safely("roundup", null)) : Promise.resolve(null),
    // Solo se consulta para admins: usa service role y datos personales de jugadores.
    user.isAdmin ? loadAdminPending(season).catch(safely("admin pending", null)) : Promise.resolve(null),
  ]);

  return (
    <HomeView
      initialMatches={matches as unknown as HomeMatch[]}
      initialPayments={paymentsResult.status === "ok" ? paymentsResult.body : null}
      extras={{
        videos,
        achievements: competitive?.achievements ?? [],
        season,
        gender,
        roundup,
        adminPending,
      }}
    />
  );
}
