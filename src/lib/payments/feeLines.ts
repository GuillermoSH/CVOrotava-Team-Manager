import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeSeasonId } from "@/utils/getCurrentSeason";
import { feeDueDate, inferFee, type FeeCode } from "./feeSchedule";

/**
 * Tarifa de cada temporada: tabla `season_fee_lines`, compartida con el Portal (que es quien la edita).
 * Aquí solo se lee: qué cuotas le tocan a cada jugador y cuánto le falta de cada una.
 */
export type FeeAudience = "base" | "senior" | "aficionados";

export type SeasonFeeLine = {
  season: string;
  audience: FeeAudience;
  code: string;
  label: string;
  kind: "once" | "monthly";
  /** null = importe sin fijar: no genera deuda. */
  amount: number | null;
  /** Solo mensualidad de base de quien paga la cuota ampliada. */
  amount_extended: number | null;
  months: number[];
  due_date: string | null;
  sort_order: number;
};

/** Audiencia de cobro por categoría; una categoría de base que «paga como sénior» usa la tarifa sénior. */
export function payerAudience(category: string | null | undefined, paysAsSenior = false): FeeAudience {
  if (!category || category === "senior") return "senior";
  if (category === "aficionados") return "aficionados";
  return paysAsSenior ? "senior" : "base";
}

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Orden de los meses dentro de una temporada (septiembre primero). */
const SEASON_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

export function feeConcept(label: string, month: number | null): string {
  return month == null ? label : `${label} — ${MONTH_NAMES[month - 1] ?? month}`;
}

export type ExpectedFee = {
  fee_code: string;
  billing_month: number | null;
  concept: string;
  /** Lo que falta por pagar de esta cuota (importe de la tarifa menos lo ya cobrado). */
  amount: number;
  /** Importe completo de la cuota. */
  total: number;
  due_date: string | null;
};

type FeeRowLike = {
  status: string;
  amount: number;
  season?: string | null;
  fee_code?: string | null;
  billing_month?: number | null;
  concept?: string | null;
  due_date?: string | null;
};

const cents = (n: number) => Math.round(n * 100) / 100;

function rowKey(row: FeeRowLike): { code: string | null; month: number | null } {
  const inferred = inferFee(row);
  return {
    code: row.fee_code ?? inferred.code,
    month: row.billing_month ?? inferred.month,
  };
}

/**
 * Cuotas de la tarifa que aún no están saldadas y no tienen ya una fila pendiente registrada.
 * Una cuota pagada a medias (p. ej. 5 € de una mensualidad de 25 €) deja prevista la diferencia.
 */
export function expectedFees({
  lines,
  rows,
  season,
  audience,
  paysExtendedMonthly = false,
}: {
  lines: readonly SeasonFeeLine[];
  rows: readonly FeeRowLike[];
  season: string;
  audience: FeeAudience;
  paysExtendedMonthly?: boolean;
}): ExpectedFee[] {
  const seasonKey = normalizeSeasonId(season);
  const paid = new Map<string, number>();
  const pending = new Set<string>();
  for (const row of rows) {
    if (row.season && normalizeSeasonId(row.season) !== seasonKey) continue;
    const { code, month } = rowKey(row);
    if (!code) continue;
    const key = `${code}:${month ?? ""}`;
    if (row.status === "paid") paid.set(key, cents((paid.get(key) ?? 0) + Number(row.amount)));
    else if (row.status === "pending") pending.add(key);
  }

  const out: ExpectedFee[] = [];
  const mine = lines
    .filter((l) => l.audience === audience && normalizeSeasonId(l.season) === seasonKey)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const line of mine) {
    const total =
      line.kind === "monthly" && audience === "base" && paysExtendedMonthly && line.amount_extended != null
        ? line.amount_extended
        : line.amount;
    if (total == null) continue;

    const months =
      line.kind === "once"
        ? [null]
        : [...line.months].sort((a, b) => SEASON_ORDER.indexOf(a) - SEASON_ORDER.indexOf(b));
    for (const month of months) {
      const key = `${line.code}:${month ?? ""}`;
      if (pending.has(key)) continue;
      const remaining = cents(total - (paid.get(key) ?? 0));
      if (remaining <= 0) continue;
      const due =
        line.kind === "once"
          ? (line.due_date ?? feeDueDate(line.code as FeeCode, null, season))
          : feeDueDate("mensualidad", month, season);
      out.push({
        fee_code: line.code,
        billing_month: month,
        concept: feeConcept(line.label, month),
        amount: remaining,
        total,
        due_date: due,
      });
    }
  }
  return out;
}

type FeeLineRow = Omit<SeasonFeeLine, "months"> & { months: number[] | null };

/** Líneas de tarifa de una temporada; sin tabla o sin líneas, la temporada no prevé cuotas. */
export const listSeasonFeeLines = unstable_cache(
  async (season: string): Promise<SeasonFeeLine[]> => {
    const { data, error } = await supabaseAdmin
      .from("season_fee_lines")
      .select("season, audience, code, label, kind, amount, amount_extended, months, due_date, sort_order")
      .eq("season", normalizeSeasonId(season))
      .order("sort_order");
    if (error) {
      console.warn(`season_fee_lines: ${error.message}`);
      return [];
    }
    return ((data ?? []) as FeeLineRow[]).map((l) => ({ ...l, months: l.months ?? [] }));
  },
  ["season-fee-lines"],
  { revalidate: 300, tags: ["fee-lines"] }
);
