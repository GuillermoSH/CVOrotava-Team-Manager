"use client";

import MatchCard from "./MatchCard";

type Match = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  location: string;
  season: string;
  location_url?: string;
  result?: string;
  video_url?: string;
  notes?: string;
};

interface CalendarTableProps {
  matches: Match[];
}

export default function CalendarTable({ matches }: CalendarTableProps) {
  if (!matches.length) {
    return (
      <p className="text-center text-gray-500">No hay partidos programados.</p>
    );
  }

  return (
    <div className="grid gap-4">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
