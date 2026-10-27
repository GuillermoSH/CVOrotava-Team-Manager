import JornadasView from "./JornadasView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import { getCompetition, listCompetitionSeasons } from "@/lib/competition/load";
import { getCurrentSeason, normalizeSeasonId } from "@/utils/getCurrentSeason";

type SearchParams = Promise<{ season?: string; gender?: string }>;

export default async function JornadasPage({ searchParams }: Readonly<{ searchParams: SearchParams }>) {
  const user = await requireAppUser();
  const params = await searchParams;

  // Cada usuario ve su género; solo quien no tiene uno asignado puede elegir.
  const canPickGender = !user.gender;
  const gender = user.gender ?? (params.gender === "female" ? "female" : "male");

  const requested = params.season ? normalizeSeasonId(params.season) : null;
  const season = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : getCurrentSeason();

  const [seasons, competition] = await Promise.all([
    listCompetitionSeasons(),
    getCompetition(season, gender).catch((err) => {
      console.error("getCompetition failed:", err);
      return null;
    }),
  ]);

  return (
    <JornadasView
      key={`${season}-${gender}`}
      competition={competition}
      seasons={seasons.includes(season) ? seasons : [season, ...seasons]}
      season={season}
      gender={gender}
      canPickGender={canPickGender}
    />
  );
}
