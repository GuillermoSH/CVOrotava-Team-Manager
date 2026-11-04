import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { CompetitionTeam } from "@/lib/competition/build";
import { describeHighlight, type Highlight } from "@/lib/competition/digest";

/** Lo más destacado de la jornada, en frases cortas. No sale nada si todavía no se ha jugado. */
export default function RoundDigest({
  highlights,
  teams,
}: Readonly<{ highlights: Highlight[]; teams: Record<number, CompetitionTeam> }>) {
  if (highlights.length === 0) return null;
  const name = (id: number) => (teams[id] ? prettyTeamName(teams[id].name) : `Equipo ${id}`);

  return (
    <section aria-labelledby="digest-title" className="mb-6">
      <h3 id="digest-title" className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
        Lo destacado
      </h3>
      <ul className="space-y-1.5 text-sm text-[var(--text-primary)]">
        {highlights.map((h, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
            <span>{describeHighlight(h, name)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
