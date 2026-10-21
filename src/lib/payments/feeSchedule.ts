import { normalizeSeasonId } from "@/utils/getCurrentSeason";

/**
 * Calendario de cuotas del Portal (a partir de la temporada 2026-27) para el
 * roster sénior: matrícula en septiembre y pago único en diciembre. Las
 * mensualidades son de base y no se prevén.
 */
export type FeeCode = "matricula" | "mensualidad" | "equipacion" | "pago_unico";

export type ExpectedFee = {
  fee_code: FeeCode;
  billing_month: number | null;
  concept: string;
  amount: number;
  due_date: string;
};

type FeeRowLike = {
  concept?: string | null;
  fee_code?: string | null;
  billing_month?: number | null;
  due_date?: string | null;
  season?: string | null;
};

const FIRST_SCHEDULED_YEAR = 2026;
const ENROLMENT_AMOUNT = 75;
const SINGLE_PAYMENT_AMOUNT = 90;
const KIT_AMOUNT = 15;
const ENROLMENT_MONTH = 9;
const SINGLE_PAYMENT_MONTH = 12;
const KIT_MONTH = 12;

/**
 * Quién paga qué (espeja `season_fee_lines.audience` del Portal): sénior y aficionados,
 * matrícula + pago único; categorías de base, matrícula + equipación (y mensualidades
 * que no se prevén).
 */
export type FeeAudience = "senior" | "aficionados" | "base";

export function feeAudienceFor(category: string | null | undefined): FeeAudience {
  if (!category || category === "senior") return "senior";
  if (category === "aficionados") return "aficionados";
  return "base";
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

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function isFeeCode(value: string | null | undefined): value is FeeCode {
  return (
    value === "matricula" ||
    value === "mensualidad" ||
    value === "equipacion" ||
    value === "pago_unico"
  );
}

/** Tipo y mes de una cuota: columnas del Portal o, si faltan, deducido del concepto. */
export function inferFee(row: FeeRowLike): {
  code: FeeCode | null;
  month: number | null;
} {
  let code: FeeCode | null = isFeeCode(row.fee_code) ? row.fee_code : null;
  let month = row.billing_month ?? null;
  const text = plain(row.concept ?? "");

  if (!code) {
    if (text.includes("matricula")) code = "matricula";
    else if (text.includes("pago unico")) code = "pago_unico";
    else if (text.includes("equip")) code = "equipacion";
    else if (text.includes("mensualidad") || text.includes("cuota mensual")) {
      code = "mensualidad";
    }
  }

  if (code === "mensualidad" && !month) {
    const idx = MONTH_NAMES.findIndex((name) => text.includes(name));
    if (idx >= 0) month = idx + 1;
    else if (row.due_date) month = Number(row.due_date.split("-")[1]) || null;
  }

  return { code, month: code === "mensualidad" ? month : null };
}

function seasonStartYear(season: string | null | undefined): number | null {
  const match = /^(\d{4})/.exec(normalizeSeasonId(season ?? ""));
  return match ? Number(match[1]) : null;
}

function lastDayOfMonth(year: number, month: number): string {
  const day = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Vencimiento = último día del mes que toca (matrícula sep., pago único dic.). */
export function feeDueDate(
  code: FeeCode,
  month: number | null,
  season: string | null | undefined
): string | null {
  const start = seasonStartYear(season);
  if (!start) return null;
  const target =
    code === "matricula"
      ? ENROLMENT_MONTH
      : code === "pago_unico"
        ? SINGLE_PAYMENT_MONTH
        : code === "mensualidad"
          ? month
          : code === "equipacion"
            ? KIT_MONTH
            : null;
  if (!target) return null;
  return lastDayOfMonth(target >= 7 ? start : start + 1, target);
}

/** Vencimiento de una fila sin fecha propia (p. ej. creada desde el Portal). */
export function resolveDueDate(row: FeeRowLike): string | null {
  if (row.due_date) return row.due_date;
  const { code, month } = inferFee(row);
  return code ? feeDueDate(code, month, row.season) : null;
}

/** Cuotas que le tocan a un jugador según su audiencia y aún no tiene registradas. */
export function missingFees(
  rows: FeeRowLike[],
  season: string,
  audience: FeeAudience = "senior"
): ExpectedFee[] {
  const start = seasonStartYear(season);
  if (!start || start < FIRST_SCHEDULED_YEAR) return [];

  const seasonKey = normalizeSeasonId(season);
  const have = new Set<string>();
  for (const row of rows) {
    if (row.season && normalizeSeasonId(row.season) !== seasonKey) continue;
    const { code, month } = inferFee(row);
    if (code) have.add(`${code}:${month ?? ""}`);
  }

  const out: ExpectedFee[] = [];
  const push = (
    fee_code: FeeCode,
    billing_month: number | null,
    concept: string,
    amount: number
  ) => {
    if (have.has(`${fee_code}:${billing_month ?? ""}`)) return;
    const due_date = feeDueDate(fee_code, billing_month, season);
    if (due_date) out.push({ fee_code, billing_month, concept, amount, due_date });
  };

  push("matricula", null, "Matrícula", ENROLMENT_AMOUNT);

  if (audience === "base") {
    push("equipacion", null, "Equipación", KIT_AMOUNT);
  } else {
    push("pago_unico", null, "Pago único", SINGLE_PAYMENT_AMOUNT);
  }

  return out;
}
