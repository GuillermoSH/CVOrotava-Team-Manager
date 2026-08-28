import CalendarView from "./CalendarView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import { listMatches } from "@/lib/matches/listMatches";
import type { Match } from "@/components/calendar/MatchCard";

export default async function CalendarPage() {
  await requireAppUser();
  const matches = (await listMatches({ order: "asc" })) as Match[];
  return <CalendarView initialMatches={matches} />;
}
