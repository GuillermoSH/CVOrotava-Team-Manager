import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));

import { expectedFees, feeConcept, payerAudience, type SeasonFeeLine } from "./feeLines";

const line = (over: Partial<SeasonFeeLine>): SeasonFeeLine => ({
  season: "2026-27",
  audience: "base",
  code: "mensualidad",
  label: "Cuota mensual",
  kind: "monthly",
  amount: 25,
  amount_extended: 30,
  months: [10, 11, 12, 1, 2, 3, 4, 5, 6],
  due_date: null,
  sort_order: 3,
  ...over,
});

const LINES: SeasonFeeLine[] = [
  line({}),
  line({ code: "matricula", label: "Matrícula", kind: "once", amount: 75, amount_extended: null, months: [], due_date: "2026-09-30", sort_order: 1 }),
  line({ code: "equipacion", label: "Equipación", kind: "once", amount: 15, amount_extended: null, months: [], due_date: "2026-12-31", sort_order: 2 }),
  line({ audience: "senior", code: "matricula", label: "Matrícula", kind: "once", amount: 75, amount_extended: null, months: [], due_date: "2026-09-30", sort_order: 1 }),
  line({ audience: "senior", code: "pago_unico", label: "Pago único", kind: "once", amount: 90, amount_extended: null, months: [], due_date: "2026-12-31", sort_order: 2 }),
  line({ audience: "senior", amount: 25, amount_extended: null, months: [1, 2, 3] }),
];

const paid = (fee_code: string, amount: number, billing_month: number | null = null) => ({
  status: "paid",
  amount,
  season: "2026-27",
  fee_code,
  billing_month,
});

describe("payerAudience", () => {
  it("usa la tarifa sénior si una categoría de base paga como sénior", () => {
    expect(payerAudience("junior", true)).toBe("senior");
    expect(payerAudience("cadete", false)).toBe("base");
    expect(payerAudience("senior", false)).toBe("senior");
    expect(payerAudience("aficionados", true)).toBe("aficionados");
  });
});

describe("expectedFees", () => {
  it("un junior que paga como sénior debe matrícula y pago único, no equipación", () => {
    const out = expectedFees({ lines: LINES, rows: [], season: "2026-27", audience: payerAudience("junior", true) });
    expect(out.map((f) => f.fee_code)).toEqual(["matricula", "pago_unico", "mensualidad", "mensualidad", "mensualidad"]);
    expect(out.some((f) => f.fee_code === "equipacion")).toBe(false);
  });

  it("un cadete con la matrícula y 5 € de octubre debe el resto: 20 € de octubre, los demás meses y la equipación", () => {
    const out = expectedFees({
      lines: LINES,
      rows: [paid("matricula", 75), paid("mensualidad", 5, 10)],
      season: "2026-27",
      audience: "base",
    });
    const oct = out.find((f) => f.billing_month === 10)!;
    expect(oct.amount).toBe(20);
    expect(oct.total).toBe(25);
    expect(oct.concept).toBe("Cuota mensual — octubre");
    expect(out.filter((f) => f.fee_code === "mensualidad")).toHaveLength(9);
    expect(out.some((f) => f.fee_code === "equipacion")).toBe(true);
    expect(out.some((f) => f.fee_code === "matricula")).toBe(false);
  });

  it("la cuota ampliada de base sube la mensualidad a 30 €", () => {
    const out = expectedFees({ lines: LINES, rows: [], season: "2026-27", audience: "base", paysExtendedMonthly: true });
    expect(out.find((f) => f.billing_month === 11)?.amount).toBe(30);
  });

  it("una cuota con fila pendiente registrada no se prevé otra vez", () => {
    const out = expectedFees({
      lines: LINES,
      rows: [{ status: "pending", amount: 25, season: "2026-27", fee_code: "mensualidad", billing_month: 10 }],
      season: "2026-27",
      audience: "base",
    });
    expect(out.some((f) => f.fee_code === "mensualidad" && f.billing_month === 10)).toBe(false);
  });

  it("reconoce filas antiguas sin fee_code por el concepto", () => {
    const out = expectedFees({
      lines: LINES,
      rows: [{ status: "paid", amount: 75, season: "2026-27", concept: "Matrícula" }],
      season: "2026-27",
      audience: "senior",
    });
    expect(out.some((f) => f.fee_code === "matricula")).toBe(false);
  });

  it("no prevé nada en una temporada sin tarifa", () => {
    expect(expectedFees({ lines: LINES, rows: [], season: "2025-26", audience: "base" })).toEqual([]);
  });

  it("ordena las mensualidades por la temporada y pone su vencimiento a fin de mes", () => {
    const months = expectedFees({ lines: LINES, rows: [], season: "2026-27", audience: "base" })
      .filter((f) => f.fee_code === "mensualidad")
      .map((f) => f.billing_month);
    expect(months).toEqual([10, 11, 12, 1, 2, 3, 4, 5, 6]);
    expect(expectedFees({ lines: LINES, rows: [], season: "2026-27", audience: "base" }).find((f) => f.billing_month === 1)?.due_date).toBe("2027-01-31");
  });
});

describe("feeConcept", () => {
  it("nombra la mensualidad con su mes", () => {
    expect(feeConcept("Cuota mensual", 3)).toBe("Cuota mensual — marzo");
    expect(feeConcept("Matrícula", null)).toBe("Matrícula");
  });
});
