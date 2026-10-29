import { notFound } from "next/navigation";
import TeamProfileView from "./TeamProfileView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import { getTeamContext } from "@/lib/competition/loadTeam";

export default async function FedTeamPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const user = await requireAppUser();
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) notFound();

  const ctx = await getTeamContext(Number(id));
  if (!ctx) notFound();
  // Cada usuario ve solo el género que le toca; sin género asignado se ven los dos.
  if (user.gender && user.gender !== ctx.gender) notFound();

  return <TeamProfileView ctx={ctx} />;
}
