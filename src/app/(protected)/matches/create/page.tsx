import { redirect } from "next/navigation";

/** Legacy create page → calendar (MatchModal is the canonical create UI). */
export default function MatchCreateRedirectPage() {
  redirect("/matches");
}
