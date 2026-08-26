"use client";

import MatchCard from "./MatchCard";
import type { Match } from "./MatchCard.types";

interface CalendarTableProps {
  matches: Match[];
}

export default function CalendarTable({ matches }: CalendarTableProps) {
  if (!matches.length) {
    return (
      <p className="py-8 text-sm text-[var(--text-muted)]">
        No hay partidos programados.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:gap-4">
      {matches.map((match) => (
        <li key={match.id}>
          <MatchCard match={match} />
        </li>
      ))}
    </ul>
  );
}
