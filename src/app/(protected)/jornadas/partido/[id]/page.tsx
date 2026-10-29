import { notFound } from "next/navigation";
import MatchDetailView from "./MatchDetailView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import { getFedMatchContext } from "@/lib/competition/load";
import { jornadaHref } from "@/lib/competition/links";

export default async function FedMatchPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const user = await requireAppUser();
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) notFound();

  const ctx = await getFedMatchContext(Number(id));
  if (!ctx) notFound();
  // Cada usuario ve solo el género que le toca; sin género asignado se ven los dos.
  if (user.gender && user.gender !== ctx.gender) notFound();

  const roundIndex = ctx.group.rounds.findIndex((r) => r.id === ctx.round.id) + 1;
  const teamIds = new Set([ctx.match.homeId, ctx.match.awayId, ...ctx.group.teamIds]);
  const teams = Object.fromEntries(
    [...teamIds].filter((tid): tid is number => tid !== null && ctx.competition.teams[tid] !== undefined).map((tid) => [tid, ctx.competition.teams[tid]])
  );

  return (
    <MatchDetailView
      match={ctx.match}
      teams={teams}
      groupMatches={ctx.group.rounds.flatMap((r) => r.matches)}
      groupName={ctx.group.name}
      roundLabel={ctx.round.label}
      backHref={jornadaHref({ season: ctx.season, gender: ctx.gender, groupId: ctx.group.id, roundIndex })}
      ours={ctx.ours}
      isAdmin={user.isAdmin}
    />
  );
}
