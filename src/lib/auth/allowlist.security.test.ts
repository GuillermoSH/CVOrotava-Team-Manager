import { describe, expect, it, vi, beforeEach } from "vitest";
import { isEmailAllowlisted, normalizeEmail } from "@/lib/auth/allowlist";

const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

describe("isEmailAllowlisted — fail closed, no wildcard bypass", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    eq.mockClear();
    select.mockClear();
    from.mockClear();
  });

  it("normalizes emails before compare", () => {
    expect(normalizeEmail("  Admin@Club.TEST ")).toBe("admin@club.test");
  });

  it("queries by normalized email (indexed eq)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await isEmailAllowlisted({ from } as never, "Admin@Club.TEST");
    expect(eq).toHaveBeenCalledWith("email", "admin@club.test");
  });

  it("denies when the lookup errors (fail closed)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "db down" } });
    const allowed = await isEmailAllowlisted(
      { from } as never,
      "admin@cvorotava.test"
    );
    expect(allowed).toBe(false);
  });

  it("denies when no row matches", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const allowed = await isEmailAllowlisted(
      { from } as never,
      "intruso@cvorotava.test"
    );
    expect(allowed).toBe(false);
  });

  it("allows when a row exists for the normalized email", async () => {
    maybeSingle.mockResolvedValue({
      data: { email: "jugador@cvorotava.test" },
      error: null,
    });
    expect(
      await isEmailAllowlisted({ from } as never, "jugador@cvorotava.test")
    ).toBe(true);
  });
});
