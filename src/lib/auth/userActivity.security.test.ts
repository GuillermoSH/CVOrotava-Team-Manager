import { describe, expect, it, vi, beforeEach } from "vitest";
import { getUserActivity, isInactiveAllowedPath } from "@/lib/auth/userActivity";

const maybeSingle = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
    })),
  },
}));

describe("getUserActivity — no self-promotion, no fuzzy roles", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
  });

  it("does not treat a missing profile as admin (pending row is the attack window)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const activity = await getUserActivity("no-row");
    expect(activity.isAdmin).toBe(false);
    expect(activity.role).toBeNull();
  });

  it("does not treat a lookup error as admin (fail closed on privilege)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "timeout" } });
    const activity = await getUserActivity("err");
    expect(activity.isAdmin).toBe(false);
  });

  it.each([
    "coach",
    "player",
    "administrator",
    "Admin",
    "ADMIN",
    "admin ",
    " admin",
    "superadmin",
    "staff",
    "true",
    "",
    null,
  ])("role %j is not admin", async (role) => {
    maybeSingle.mockResolvedValue({
      data: { is_active: true, role },
      error: null,
    });
    const activity = await getUserActivity("u");
    expect(activity.isAdmin).toBe(false);
  });

  it("only the exact string admin is privileged", async () => {
    maybeSingle.mockResolvedValue({
      data: { is_active: false, role: "admin" },
      error: null,
    });
    const activity = await getUserActivity("u");
    expect(activity.isAdmin).toBe(true);
    expect(activity.is_active).toBe(true);
  });

  it("an inactive player stays inactive", async () => {
    maybeSingle.mockResolvedValue({
      data: { is_active: false, role: "player" },
      error: null,
    });
    const activity = await getUserActivity("u");
    expect(activity.isAdmin).toBe(false);
    expect(activity.is_active).toBe(false);
  });
});

describe("isInactiveAllowedPath — prefix matching is an admin-page leak", () => {
  it("allows only the player payments page", () => {
    expect(isInactiveAllowedPath("/payments")).toBe(true);
    expect(isInactiveAllowedPath("/payments/")).toBe(true);
  });

  it.each([
    "/payments/admin",
    "/payments/admin/",
    "/payments/admin/22222222-2222-2222-2222-222222222222",
    "/payments/../access",
    "/payments/%2e%2e/access",
    "/access",
    "/matches/create",
    "/matches/edit/abc",
    "/",
    "/payments-admin",
    "/Payments",
  ])("does not treat %s as a payments-only path", (pathname) => {
    expect(isInactiveAllowedPath(pathname)).toBe(false);
  });
});
