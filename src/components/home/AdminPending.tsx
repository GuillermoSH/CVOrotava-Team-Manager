import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import type { AdminPendingData } from "@/lib/home/loadAdminPending.types";

const DOCS_SHOWN = 5;
const SYNC_STALE_DAYS = 8;

function syncLabel(finishedAt: string | null, now: Date): { text: string; stale: boolean } {
  if (!finishedAt) return { text: "Aún sin sincronizar", stale: true };
  const days = Math.floor((now.getTime() - Date.parse(finishedAt)) / 86_400_000);
  const when = new Date(finishedAt).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rel = days <= 0 ? "hoy" : days === 1 ? "ayer" : `hace ${days} días`;
  return { text: `${rel} · ${when}`, stale: days >= SYNC_STALE_DAYS };
}

function Item({
  title,
  children,
  href,
  action,
}: Readonly<{ title: string; children: React.ReactNode; href?: string; action?: string }>) {
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        {href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {action}
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="mt-1 text-sm text-[var(--text-secondary)]">{children}</div>
    </li>
  );
}

export default function AdminPending({ data, now }: Readonly<{ data: AdminPendingData; now: Date }>) {
  const { docs, invited, venuesToReview, lastSync } = data;
  const sync = syncLabel(lastSync.finishedAt, now);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">Pendientes</h2>
      <ul className="divide-y divide-[var(--glass-border)] border-y border-[var(--glass-border)]">
        <Item title="Documentación de jugadores">
          {docs.length === 0 ? (
            <span className="payment-blurb-ok font-medium">Todos los jugadores de la app están al día.</span>
          ) : (
            <>
              <p>
                <strong className="tabular-nums">{docs.length}</strong> jugador{docs.length === 1 ? "" : "es"} con
                documentos sin entregar
              </p>
              <ul className="mt-1.5 flex flex-col gap-0.5 text-xs text-[var(--text-muted)]">
                {docs.slice(0, DOCS_SHOWN).map((d) => (
                  <li key={d.playerId}>
                    <span className="font-medium text-[var(--text-secondary)]">{d.name}</span> · falta{" "}
                    {d.missing.join(", ").toLowerCase()}
                  </li>
                ))}
                {docs.length > DOCS_SHOWN ? <li>y {docs.length - DOCS_SHOWN} más</li> : null}
              </ul>
            </>
          )}
        </Item>

        <Item title="Invitados sin entrar" href="/access" action="Usuarios">
          {invited.count === 0 ? (
            "Todos los invitados ya tienen cuenta."
          ) : (
            <>
              <strong className="tabular-nums">{invited.count}</strong> email{invited.count === 1 ? "" : "s"} autorizado
              {invited.count === 1 ? "" : "s"} que todavía no ha{invited.count === 1 ? "" : "n"} iniciado sesión
            </>
          )}
        </Item>

        <Item title="Pabellones a revisar" href="/venues" action="Pabellones">
          {venuesToReview === 0 ? (
            "Ningún pabellón pendiente de revisión."
          ) : (
            <>
              <strong className="tabular-nums">{venuesToReview}</strong> pabellón{venuesToReview === 1 ? "" : "es"}{" "}
              nuevo{venuesToReview === 1 ? "" : "s"} sin clasificar
            </>
          )}
        </Item>

        <Item title="Última sincronización con la federación">
          <span className={sync.stale ? "font-medium text-[var(--color-danger)]" : ""}>{sync.text}</span>
          {lastSync.trigger ? (
            <span className="text-[var(--text-muted)]">
              {" "}
              · {lastSync.trigger === "cron" ? "automática" : lastSync.trigger === "manual" ? "manual" : lastSync.trigger}
            </span>
          ) : null}
        </Item>
      </ul>
    </section>
  );
}
