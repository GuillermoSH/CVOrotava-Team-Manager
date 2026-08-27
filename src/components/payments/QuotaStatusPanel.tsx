import {
  type QuotaItem,
  formatQuotaDay,
  isQuotaOverdue,
  sortQuotasByDue,
} from "@/components/payments/quotaDates";

type QuotaStatusPanelProps = {
  pending: number;
  paid: number;
  quotas: QuotaItem[];
};

export default function QuotaStatusPanel({
  pending,
  paid,
  quotas,
}: QuotaStatusPanelProps) {
  const overdueCount = quotas.filter((q) =>
    isQuotaOverdue(q.status, q.due_date)
  ).length;
  const pendingCount = quotas.filter((q) => q.status === "pending").length;
  const paidCount = quotas.filter((q) => q.status === "paid").length;
  const pendingSorted = sortQuotasByDue(
    quotas.filter((q) => q.status === "pending")
  );
  const nextQuota =
    pendingSorted.find((q) => !isQuotaOverdue(q.status, q.due_date)) ??
    pendingSorted[0];

  return (
    <div
      role="region"
      aria-label="Resumen de cuotas"
      className="flex flex-col gap-4 border-b border-[var(--glass-border)] pb-5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-10 sm:gap-y-3"
    >
      {pending <= 0 ? (
        <p>
          <span className="payment-label-ok text-sm font-semibold">Al día</span>
          <span className="mt-1 block text-3xl font-bold tabular-nums payment-amount--paid">
            {paid}€
          </span>
          <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
            pagado esta temporada
          </span>
        </p>
      ) : (
        <p>
          <span className="text-3xl font-bold tabular-nums payment-amount--pending">
            {pending}€
          </span>
          <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
            pendiente
          </span>
        </p>
      )}

      {pending > 0 ? (
        <p>
          <span className="text-2xl font-semibold tabular-nums payment-amount--paid">
            {paid}€
          </span>
          <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
            pagado
          </span>
        </p>
      ) : null}

      <p className="text-sm text-[var(--text-secondary)]">
        {quotas.length} {quotas.length === 1 ? "cuota" : "cuotas"}
        {" · "}
        {pendingCount} pendiente{pendingCount === 1 ? "" : "s"}
        {paidCount > 0
          ? ` · ${paidCount} pagada${paidCount === 1 ? "" : "s"}`
          : ""}
        {overdueCount > 0 ? (
          <span className="mt-1 block font-medium text-[var(--color-danger)]">
            {overdueCount} atrasada{overdueCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </p>

      {nextQuota ? (
        <p className="text-sm text-[var(--text-secondary)]">
          {isQuotaOverdue(nextQuota.status, nextQuota.due_date)
            ? "Cobro más antiguo"
            : "Próximo cobro"}
          <span className="mt-1 block text-base font-semibold tabular-nums text-[var(--text-primary)]">
            {formatQuotaDay(nextQuota.due_date)} · {nextQuota.amount}€
          </span>
        </p>
      ) : null}
    </div>
  );
}
