import { describe, expect, it } from "vitest";
import { quotaSeverity } from "@/components/payments/quotaDates";
import { feeDueDate, inferFee, resolveDueDate } from "./feeSchedule";

describe("feeDueDate", () => {
  it("vence el último día del mes que toca", () => {
    expect(feeDueDate("matricula", null, "2026-27")).toBe("2026-09-30");
    expect(feeDueDate("pago_unico", null, "2026-27")).toBe("2026-12-31");
    expect(feeDueDate("mensualidad", 10, "2026-27")).toBe("2026-10-31");
    expect(feeDueDate("mensualidad", 2, "2026-27")).toBe("2027-02-28");
    expect(feeDueDate("equipacion", null, "2026-27")).toBe("2026-12-31");
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
