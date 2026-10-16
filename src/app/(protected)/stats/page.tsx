import StatsView from "./StatsView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import { listStatsMatches } from "@/lib/stats/listStatsMatches";
import { getCompetitiveStats } from "@/lib/stats/competitive/load";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

export default async function StatsPage() {
  const user = await requireAppUser();
  const season = getCurrentSeason();
  const gender = user.gender ?? undefined;
  const [matches, competitive] = await Promise.all([
    listStatsMatches({ season, gender }),
    gender
      ? getCompetitiveStats(season, gender).catch((err) => {
          console.error("getCompetitiveStats failed:", err);
          return null;
        })
      : Promise.resolve(null),
  ]);
  return (
    <StatsView
      initialMatches={matches}
      initialFilters={{ season, gender }}
      initialCompetitive={competitive}
    />
  );
}
