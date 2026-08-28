import StatsView from "./StatsView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import { listStatsMatches } from "@/lib/stats/listStatsMatches";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

export default async function StatsPage() {
  const user = await requireAppUser();
  const season = getCurrentSeason();
  const gender = user.gender ?? undefined;
  const matches = await listStatsMatches({ season, gender });
  return (
    <StatsView initialMatches={matches} initialFilters={{ season, gender }} />
  );
}
