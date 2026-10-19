import type { Birthday } from "@/lib/home/adminPending";
import { shortDate } from "@/components/stats/competitive/format";

export default function Birthdays({ birthdays }: Readonly<{ birthdays: Birthday[] }>) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">Cumpleaños</h2>
      {birthdays.length === 0 ? (
        <p className="border-t border-[var(--glass-border)] py-4 text-sm text-[var(--text-muted)]">
          Ningún cumpleaños en los próximos 14 días.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--glass-border)] border-y border-[var(--glass-border)]">
          {birthdays.map((b) => (
            <li key={b.playerId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{b.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Cumple {b.turns} · {shortDate(b.date)}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold tabular-nums ${
                  b.daysAway === 0 ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
                }`}
              >
                {b.daysAway === 0 ? "Hoy" : b.daysAway === 1 ? "Mañana" : `En ${b.daysAway} días`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
