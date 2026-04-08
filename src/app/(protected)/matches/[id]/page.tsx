import { headers } from "next/headers";
import { notFound } from "next/navigation";
import MatchDetailsView, {
  type MatchDetail,
} from "@/components/calendar/MatchDetailsView";

function serverBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    const v = process.env.VERCEL_URL;
    return v.startsWith("http") ? v : `https://${v}`;
  }
  return "http://localhost:3000";
}

export default async function MatchDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  // El fetch en RSC no envía cookies por defecto; el API valida sesión con cookies.
  const headerList = await headers();
  const cookie = headerList.get("cookie");

  const res = await fetch(`${serverBaseUrl()}/api/matches/${id}`, {
    cache: "no-store",
    headers: cookie ? { cookie } : {},
  });

  if (res.status === 404) notFound();
  if (!res.ok) throw new Error("No se pudo cargar el partido");

  const match = (await res.json()) as MatchDetail;

  return <MatchDetailsView key={id} match={match} />;
}
