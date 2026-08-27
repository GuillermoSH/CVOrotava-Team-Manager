export type QuotaItem = {
  id: string;
  concept: string;
  amount: number;
  status: "pending" | "paid";
  due_date: string | null;
  notes?: string | null;
  season?: string | null;
};

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

export function isQuotaOverdue(
  status: QuotaItem["status"],
  dueDate: string | null
): boolean {
  if (status !== "pending") return false;
  const day = parseQuotaDay(dueDate);
  if (!day) return false;
  return day < startOfToday();
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
