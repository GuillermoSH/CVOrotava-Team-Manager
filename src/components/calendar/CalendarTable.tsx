"use client";

import MatchCard from "./MatchCard";

export type Match = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  season: string;
  result?: string;
  video_url?: string;
  notes?: string;
  gender: "male" | "female";
  venues: {
    id: string;
    venue_name: string;
    location_url?: string;
    location_type: "home" | "away" | "outside_island";
  };
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
