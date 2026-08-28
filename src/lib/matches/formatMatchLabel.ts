export function formatMatchDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMatchPickerLabel(match: {
  date: string;
  opponent: string;
  result?: string | null;
}): string {
  const base = `${formatMatchDate(match.date)} · vs ${match.opponent}`;
  return match.result ? `${base} (${match.result})` : base;
}
