import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCheck } from "@fortawesome/free-solid-svg-icons";
import type { AdminPendingData } from "@/lib/home/loadAdminPending.types";

const LISTED = 3;
const SYNC_STALE_DAYS = 8;

export type TodoMatch = { id: string; opponent: string; date: string };

/** Lista corta de partidos enlazada a su ficha (para completar el resultado o el vídeo). */
function MatchList({ matches }: Readonly<{ matches: TodoMatch[] }>) {
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {matches.slice(0, LISTED).map((m) => (
        <li key={m.id}>
          <Link
            href={`/matches/${m.id}?edit=1`}
            className="text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            vs {m.opponent}
            <span className="text-[var(--text-muted)]">
              {" "}
              ·{" "}
              {new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
            </span>
          </Link>
        </li>
      ))}
      {matches.length > LISTED ? (
        <li className="text-[var(--text-muted)]">y {matches.length - LISTED} más</li>
      ) : null}
    </ul>
  );
}
export type TodoPayments = { usersInDebt: number; totalPending: number; usersOverdue: number };

type Todo = {
  key: string;
  count: number;
  title: string;
  detail?: React.ReactNode;
  href?: string;
  action?: string;
  urgent?: boolean;
  /** Etiqueta cuando no hay nada pendiente (se resume en una sola línea). */
  clear: string;
};

function syncLabel(finishedAt: string | null, now: Date): { text: string; stale: boolean } {
  if (!finishedAt) return { text: "Aún sin sincronizar", stale: true };
  const days = Math.floor((now.getTime() - Date.parse(finishedAt)) / 86_400_000);
  const rel = days <= 0 ? "hoy" : days === 1 ? "ayer" : `hace ${days} días`;
  return { text: rel, stale: days >= SYNC_STALE_DAYS };
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export default function AdminPending({
  data,
  payments,
  matchesWithoutResult,
  matchesWithoutVideo,
  now,
}: Readonly<{
  data: AdminPendingData;
  payments: TodoPayments | null;
  matchesWithoutResult: TodoMatch[];
  matchesWithoutVideo: TodoMatch[];
  now: Date;
}>) {
  const sync = syncLabel(data.lastSync.finishedAt, now);

  const todos: Todo[] = [
    {
      key: "payments",
      count: payments?.usersInDebt ?? 0,
      title: `${payments?.usersInDebt ?? 0} ${plural(payments?.usersInDebt ?? 0, "jugador debe", "jugadores deben")} ${payments?.totalPending ?? 0}€`,
      detail:
        payments && payments.usersOverdue > 0 ? (
          <span className="text-[var(--color-danger)]">
            {payments.usersOverdue} con {plural(payments.usersOverdue, "cuota atrasada", "cuotas atrasadas")}
          </span>
        ) : undefined,
      href: "/payments",
      action: "Cuotas",
      urgent: (payments?.usersOverdue ?? 0) > 0,
      clear: "cuotas",
    },
    {
      key: "results",
      count: matchesWithoutResult.length,
      title: `${matchesWithoutResult.length} ${plural(matchesWithoutResult.length, "partido sin resultado", "partidos sin resultado")}`,
      detail: <MatchList matches={matchesWithoutResult} />,
      clear: "resultados",
    },
    {
      key: "videos",
      count: matchesWithoutVideo.length,
      title: `${matchesWithoutVideo.length} ${plural(matchesWithoutVideo.length, "partido jugado sin vídeo", "partidos jugados sin vídeo")}`,
      detail: <MatchList matches={matchesWithoutVideo} />,
      clear: "vídeos",
    },
    {
      key: "docs",
      count: data.docs.length,
      title: `${data.docs.length} ${plural(data.docs.length, "jugador con documentos pendientes", "jugadores con documentos pendientes")}`,
      detail: (
        <ul className="mt-1 flex flex-col gap-0.5 text-[var(--text-muted)]">
          {data.docs.slice(0, LISTED).map((d) => (
            <li key={d.playerId}>
              <span className="text-[var(--text-secondary)]">{d.name}</span> · falta {d.missing.join(", ").toLowerCase()}
            </li>
          ))}
          {data.docs.length > LISTED ? <li>y {data.docs.length - LISTED} más</li> : null}
        </ul>
      ),
      clear: "documentación",
    },
    {
      key: "invited",
      count: data.invited.count,
      title: `${data.invited.count} ${plural(data.invited.count, "invitado sin entrar", "invitados sin entrar")}`,
      href: "/access",
      action: "Usuarios",
      clear: "invitados",
    },
    {
      key: "venues",
      count: data.venuesToReview,
      title: `${data.venuesToReview} ${plural(data.venuesToReview, "pabellón por revisar", "pabellones por revisar")}`,
      href: "/venues",
      action: "Pabellones",
      clear: "pabellones",
    },
  ];

  const open = todos.filter((t) => t.count > 0).sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
  const clear = todos.filter((t) => t.count === 0);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">Por hacer</h2>

      {open.length === 0 ? (
        <p className="status-chip-all-clear inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
          <FontAwesomeIcon icon={faCheck} className="text-xs" aria-hidden />
          Todo al día
        </p>
      ) : (
        <ul className="divide-y divide-[var(--glass-border)] border-y border-[var(--glass-border)]">
          {open.map((t) => (
            <li key={t.key} className="flex items-start justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold">{t.title}</p>
                {t.detail ? <div className="mt-0.5 text-xs">{t.detail}</div> : null}
              </div>
              {t.href ? (
                <Link
                  href={t.href}
                  className="inline-flex shrink-0 items-center gap-1.5 font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  {t.action}
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" aria-hidden />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[var(--text-muted)]">
        {clear.length > 0 ? (
          <>
            <FontAwesomeIcon icon={faCheck} className="text-[var(--color-success)]" aria-hidden />
            Al día: {clear.map((t) => t.clear).join(", ")}.
          </>
        ) : null}
        <span className={sync.stale ? "font-medium text-[var(--color-danger)]" : ""}>
          Federación sincronizada {sync.text}.
        </span>
      </p>
    </section>
  );
}
