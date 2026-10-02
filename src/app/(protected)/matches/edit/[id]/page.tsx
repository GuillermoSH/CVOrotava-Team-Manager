import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

/** Legacy edit page → match detail (MatchModal is the canonical edit UI). */
export default async function MatchEditRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/matches/${id}`);
}
