import {
  type QuotaItem,
  formatQuotaDay,
  formatQuotaMonth,
  isQuotaOverdue,
  sortQuotasByDue,
} from "@/components/payments/quotaDates";

type QuotaMonthBoardProps = {
  quotas: QuotaItem[];
};

function seasonGroups(quotas: QuotaItem[]): { label: string | null; items: QuotaItem[] }[] {
  const sorted = sortQuotasByDue(quotas);
  const keys = [
    ...new Set(sorted.map((q) => q.season?.trim() || "")),
  ];
  if (keys.length <= 1) {
    return [{ label: null, items: sorted }];
  }

  return keys
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({
      label: key || "Sin temporada",
      items: sorted.filter((q) => (q.season?.trim() || "") === key),
    }));
}

export default function QuotaMonthBoard({ quotas }: QuotaMonthBoardProps) {
  const groups = seasonGroups(quotas);

  if (quotas.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.label ?? "season"}>
          {group.label ? (
            <h2 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
              {group.label}
            </h2>
          ) : null}
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-[repeat(auto-fit,_minmax(9.5rem,_1fr))]">
            {group.items.map((q) => {
              const overdue = isQuotaOverdue(q.status, q.due_date);
              const tone =
                q.status === "paid"
                  ? "payment-card payment-card--paid"
                  : overdue
                    ? "payment-card payment-card--overdue"
                    : "payment-card payment-card--pending";
              const statusLabel =
                q.status === "paid"
                  ? "Pagado"
                  : overdue
                    ? "Atrasada"
                    : "Pendiente";

              return (
                <li key={q.id} className={`rounded-xl px-3 py-3 ${tone}`}>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">
                    {formatQuotaMonth(q.due_date)}
                  </p>
                  <p
                    className={`mt-1 text-xl font-bold tabular-nums ${
                      q.status === "paid"
                        ? "payment-amount--paid"
                        : "payment-amount--pending"
                    }`}
                  >
                    {q.amount}€
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
                    {q.concept}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {statusLabel}
                    {" · "}
                    <span className="tabular-nums">
                      {formatQuotaDay(q.due_date)}
                    </span>
                  </p>
                  {q.notes ? (
                    <p className="mt-1 truncate text-[11px] italic text-[var(--text-muted)]">
                      {q.notes}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
