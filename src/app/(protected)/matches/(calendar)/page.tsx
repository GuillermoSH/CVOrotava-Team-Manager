import CalendarView from "./CalendarView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import { listMatches } from "@/lib/matches/listMatches";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import type { Match } from "@/components/calendar/MatchCard";

export default async function CalendarPage() {
  const user = await requireAppUser();
  const season = getCurrentSeason();
  const gender = user.gender ?? undefined;

  const matches = (await listMatches({
    order: "asc",
    season,
    gender,
  })) as Match[];

  return (
    <CalendarView
      initialMatches={matches}
      initialSeason={season}
      initialGender={gender}
    />
  );
}
