import { describe, expect, it, vi, beforeEach } from "vitest";
import { isEmailAllowlisted, normalizeEmail } from "@/lib/auth/allowlist";

const select = vi.fn();
const from = vi.fn(() => ({ select }));

describe("isEmailAllowlisted — fail closed, no wildcard bypass", () => {
  beforeEach(() => {
    select.mockReset();
    from.mockClear();
  });

  it("normalizes emails before compare", () => {
    expect(normalizeEmail("  Admin@Club.TEST ")).toBe("admin@club.test");
  });

  it("denies when the lookup errors (fail closed)", async () => {
    select.mockResolvedValue({ data: null, error: { message: "db down" } });
    const allowed = await isEmailAllowlisted(
      { from } as never,
      "admin@cvorotava.test"
    );
    expect(allowed).toBe(false);
  });

  it("does not interpret SQL LIKE wildcards stored in the allowlist", async () => {
    select.mockResolvedValue({
      data: [{ email: "%@cvorotava.test" }, { email: "jugador@" }],
      error: null,
    });
    const allowed = await isEmailAllowlisted(
      { from } as never,
      "intruso@cvorotava.test"
    );
    expect(allowed).toBe(false);
  });

  it("does not allow a substring / prefix of a real allowlisted email", async () => {
    select.mockResolvedValue({
      data: [{ email: "jugador@cvorotava.test" }],
      error: null,
    });
    expect(
      await isEmailAllowlisted({ from } as never, "jugador@cvorotava.test.evil")
    ).toBe(false);
    expect(
      await isEmailAllowlisted({ from } as never, "jugador@cvorotava.tes")
    ).toBe(false);
  });

  it("still allows the real address with different casing", async () => {
    select.mockResolvedValue({
      data: [{ email: "Jugador@CVOrotava.TEST" }],
      error: null,
    });
    expect(
      await isEmailAllowlisted({ from } as never, "jugador@cvorotava.test")
    ).toBe(true);
  });
});
