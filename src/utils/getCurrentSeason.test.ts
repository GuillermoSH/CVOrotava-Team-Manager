import { describe, expect, it } from "vitest";
import {
  getCurrentSeason,
  getNextSeason,
  normalizeSeasonId,
  getSeasonSelectOptions,
} from "@/utils/getCurrentSeason";

describe("season helpers — Portal/TM YYYY-YY", () => {
  it("normalizes slash and hyphen to hyphen", () => {
    expect(normalizeSeasonId("2026/27")).toBe("2026-27");
    expect(normalizeSeasonId("2026-27")).toBe("2026-27");
    expect(normalizeSeasonId(" 2025/26 ")).toBe("2025-26");
  });

  it("getCurrentSeason uses hyphen (Sep 2026 → 2026-27)", () => {
    expect(getCurrentSeason(new Date(2026, 8, 15))).toBe("2026-27");
    expect(getCurrentSeason(new Date(2026, 2, 1))).toBe("2025-26");
  });

  it("getNextSeason accepts legacy slash", () => {
    expect(getNextSeason("2025/26")).toBe("2026-27");
    expect(getNextSeason("2026-27")).toBe("2027-28");
  });

  it("select options use hyphen values", () => {
    const opts = getSeasonSelectOptions({
      asOf: new Date(2026, 8, 1),
      past: 1,
      includeNext: true,
    });
    expect(opts.every((o) => !o.value.includes("/"))).toBe(true);
    expect(opts[0]?.value).toBe("2027-28");
    expect(opts.some((o) => o.value === "2026-27")).toBe(true);
  });
});
