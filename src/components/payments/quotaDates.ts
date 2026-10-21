export type QuotaItem = {
  id: string;
  concept: string;
  amount: number;
  status: "pending" | "paid";
  due_date: string | null;
  notes?: string | null;
  season?: string | null;
  /** Cuota prevista por el calendario (aún sin registrar), no una fila real. */
  expected?: boolean;
};

export type QuotaSeverity = "ok" | "warning" | "critical";

/** Día del mes de vencimiento desde el que se avisa. */
export const QUOTA_WARNING_DAY = 10;

export function parseQuotaDay(iso: string | null): Date | null {
  if (!iso) return null;
  const parts = iso.split("T")[0].split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/**
 * Pendiente: aviso desde el día 10 del mes en que vence; crítico desde el día
 * de vencimiento (las mensualidades vencen el último día del mes).
 */
export function quotaSeverity(
  status: QuotaItem["status"],
  dueDate: string | null,
  today: Date = startOfToday()
): QuotaSeverity {
  if (status !== "pending") return "ok";
  const due = parseQuotaDay(dueDate);
  if (!due) return "ok";
  if (today >= due) return "critical";
  const warnFrom = new Date(due.getFullYear(), due.getMonth(), QUOTA_WARNING_DAY);
  return today >= warnFrom ? "warning" : "ok";
}

export function isQuotaOverdue(
  status: QuotaItem["status"],
  dueDate: string | null
): boolean {
  return quotaSeverity(status, dueDate) === "critical";
}

/** Se debe ya: pendiente real, o prevista que ha entrado en aviso/crítico. */
export function isQuotaOwed(
  q: Pick<QuotaItem, "status" | "due_date" | "expected">
): boolean {
  if (q.status !== "pending") return false;
  return !q.expected || quotaSeverity("pending", q.due_date) !== "ok";
}

export function formatQuotaDay(iso: string | null): string {
  const day = parseQuotaDay(iso);
  if (!day) return "Sin fecha";
  return day.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

export function formatQuotaMonth(iso: string | null): string {
  const day = parseQuotaDay(iso);
  if (!day) return "—";
  const raw = day
    .toLocaleDateString("es-ES", { month: "short", year: "2-digit" })
    .replace(".", "");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function sortQuotasByDue<T extends QuotaItem>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    (a.due_date ?? "").localeCompare(b.due_date ?? "")
  );
}
