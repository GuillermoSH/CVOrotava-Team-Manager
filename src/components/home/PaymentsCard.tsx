import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

type Props = {
  pendingCount: number;
  overdueCount: number;
  total: number;
  nextDue: { concept: string | null | undefined; amount: string | number; due_date: string } | null;
};

/** Estado de las cuotas del propio jugador. */
export default function PaymentsCard({ pendingCount, overdueCount, total, nextDue }: Readonly<Props>) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">Cuotas</h2>
      <Link
        href="/payments"
        className={`group flex flex-col gap-2 rounded-xl border px-4 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] sm:flex-row sm:items-center sm:justify-between ${
          total > 0
            ? "border-[color-mix(in_srgb,var(--accent)_35%,var(--glass-border))] bg-[var(--accent-muted)]"
            : "border-[var(--glass-border)] bg-transparent hover:bg-[var(--glass-surface)]"
        }`}
      >
        <div className="min-w-0 text-sm leading-relaxed text-[var(--text-secondary)]">
          {total > 0 ? (
            <p>
              Tienes <strong className="tabular-nums text-[var(--text-primary)]">{pendingCount}</strong> pago
              {pendingCount === 1 ? "" : "s"} sin liquidar por{" "}
              <strong className="tabular-nums text-[var(--accent)]">{total}€</strong>
              {overdueCount > 0 ? (
                <>
                  ; <strong className="tabular-nums text-[var(--color-danger)]">{overdueCount}</strong> ya vencida
                  {overdueCount === 1 ? "" : "s"}
                </>
              ) : null}
              .
            </p>
          ) : (
            <p className="payment-blurb-ok font-medium">¡Perfecto! Estás al día con todos tus pagos.</p>
          )}
          {nextDue ? (
            <p className="mt-1.5">
              Próxima cuota:{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {nextDue.concept ?? "Cuota"} · {Number(nextDue.amount)}€
              </span>
              , vence el{" "}
              {new Date(`${nextDue.due_date.slice(0, 10)}T12:00:00`).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
              })}
            </p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors group-hover:text-[var(--accent)]">
          Ver detalles
          <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </section>
  );
}
