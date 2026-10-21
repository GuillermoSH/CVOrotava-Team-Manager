import { describe, expect, it } from "vitest";
import { quotaSeverity } from "@/components/payments/quotaDates";
import { feeAudienceFor, feeDueDate, inferFee, missingFees, resolveDueDate } from "./feeSchedule";

describe("feeDueDate", () => {
  it("vence el último día del mes que toca", () => {
    expect(feeDueDate("matricula", null, "2026-27")).toBe("2026-09-30");
    expect(feeDueDate("pago_unico", null, "2026-27")).toBe("2026-12-31");
    expect(feeDueDate("mensualidad", 10, "2026-27")).toBe("2026-10-31");
    expect(feeDueDate("mensualidad", 2, "2026-27")).toBe("2027-02-28");
    expect(feeDueDate("equipacion", null, "2026-27")).toBe("2026-12-31");
  });
});

describe("feeAudienceFor", () => {
  it("sénior y aficionados por su cuenta; el resto de categorías pagan como base", () => {
    expect(feeAudienceFor("senior")).toBe("senior");
    expect(feeAudienceFor("aficionados")).toBe("aficionados");
    for (const c of ["alevin", "infantil", "cadete", "junior", "juvenil"]) {
      expect(feeAudienceFor(c)).toBe("base");
    }
  });
  it("sin categoría conocida se mantiene el calendario sénior", () => {
    expect(feeAudienceFor(null)).toBe("senior");
    expect(feeAudienceFor(undefined)).toBe("senior");
  });
});

describe("inferFee / resolveDueDate", () => {
  it("usa las columnas del Portal o deduce del concepto", () => {
    expect(inferFee({ concept: "x", fee_code: "mensualidad", billing_month: 3 })).toEqual({
      code: "mensualidad",
      month: 3,
    });
    expect(inferFee({ concept: "Mensualidad Octubre" })).toEqual({
      code: "mensualidad",
      month: 10,
    });
    expect(
      resolveDueDate({ concept: "Cuota mensual — enero", season: "2026-27" })
    ).toBe("2027-01-31");
  });
});

describe("missingFees", () => {
  it("prevé matrícula y pago único, sin mensualidades", () => {
    expect(missingFees([], "2026-27").map((f) => f.fee_code)).toEqual([
      "matricula",
      "pago_unico",
    ]);
  });

  it("a los de base les prevé matrícula y equipación, no el pago único", () => {
    const out = missingFees([], "2026-27", "base");
    expect(out.map((f) => [f.fee_code, f.amount, f.due_date])).toEqual([
      ["matricula", 75, "2026-09-30"],
      ["equipacion", 15, "2026-12-31"],
    ]);
  });

  it("a los aficionados les prevé lo mismo que a los sénior", () => {
    expect(missingFees([], "2026-27", "aficionados").map((f) => f.fee_code)).toEqual([
      "matricula",
      "pago_unico",
    ]);
  });

  it("no repite lo que ya está registrado", () => {
    const rows = [
      { concept: "Matrícula", season: "2026-27" },
      { concept: "x", fee_code: "pago_unico", season: "2026-27" },
    ];
    expect(missingFees(rows, "2026-27")).toEqual([]);
  });

  it("no prevé nada en temporadas anteriores al calendario", () => {
    expect(missingFees([], "2025-26")).toEqual([]);
  });
});

describe("quotaSeverity", () => {
  const due = "2026-10-31";
  it("avisa desde el día 10 y es crítico el último día", () => {
    expect(quotaSeverity("pending", due, new Date(2026, 9, 9))).toBe("ok");
    expect(quotaSeverity("pending", due, new Date(2026, 9, 10))).toBe("warning");
    expect(quotaSeverity("pending", due, new Date(2026, 9, 30))).toBe("warning");
    expect(quotaSeverity("pending", due, new Date(2026, 9, 31))).toBe("critical");
    expect(quotaSeverity("paid", due, new Date(2026, 10, 5))).toBe("ok");
  });
});
