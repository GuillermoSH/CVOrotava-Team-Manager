import { describe, expect, it } from "vitest";
import { countdownLabel, daysUntil, isMatchPast, matchStart } from "./schedule";

const at = (s: string) => new Date(s);

describe("isMatchPast", () => {
  it("un partido de hoy por la tarde sigue siendo próximo por la mañana", () => {
    expect(isMatchPast("2026-10-25", "18:30:00", at("2026-10-25T09:00"))).toBe(false);
  });
  it("sigue en curso durante las dos horas siguientes al saque", () => {
    expect(isMatchPast("2026-10-25", "18:30", at("2026-10-25T20:00"))).toBe(false);
    expect(isMatchPast("2026-10-25", "18:30", at("2026-10-25T20:31"))).toBe(true);
  });
});

describe("matchStart", () => {
  it("sin hora válida usa medianoche", () => {
    expect(matchStart("2026-10-25", null).getHours()).toBe(0);
    expect(matchStart("2026-10-25", "18:30:00").getHours()).toBe(18);
  });
});

describe("daysUntil / countdownLabel", () => {
  it("cuenta días naturales, no tramos de 24 h", () => {
    expect(daysUntil("2026-10-25", at("2026-10-24T23:30"))).toBe(1);
    expect(daysUntil("2026-10-25", at("2026-10-25T08:00"))).toBe(0);
    expect(daysUntil("2026-10-30", at("2026-10-25T08:00"))).toBe(5);
  });
  it("etiqueta hoy, mañana y n días", () => {
    expect(countdownLabel(0)).toBe("Hoy");
    expect(countdownLabel(1)).toBe("Mañana");
    expect(countdownLabel(5)).toBe("En 5 días");
  });
});
