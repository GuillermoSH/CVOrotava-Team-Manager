import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { ADMIN, PLAYER, INACTIVE_PLAYER, COACH } from "@/test/security/fixtures";

const getUser = vi.fn();
const isEmailAllowlisted = vi.fn();
const getUserActivity = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("@/lib/auth/allowlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/allowlist")>();
  return {
    ...actual,
    isEmailAllowlisted: (...args: unknown[]) => isEmailAllowlisted(...args),
  };
});

vi.mock("@/lib/auth/userActivity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/userActivity")>();
  return {
    ...actual,
    getUserActivity: (...args: unknown[]) => getUserActivity(...args),
  };
});

import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { requireAdmin } from "@/lib/auth/require-admin";

function supabaseWithUser(
  user: { id: string; email?: string | null } | null,
  error: unknown = null
) {
  getUser.mockResolvedValue({ data: { user }, error });
  return { auth: { getUser } } as never;
}

describe("requireAllowedUser", () => {
  beforeEach(() => {
    getUser.mockReset();
    isEmailAllowlisted.mockReset();
    getUserActivity.mockReset();
  });

  it("rejects a session without email (do not skip allowlist)", async () => {
    const result = await requireAllowedUser(
      supabaseWithUser({ id: PLAYER.id, email: null })
    );
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(401);
    expect(isEmailAllowlisted).not.toHaveBeenCalled();
  });

  it("rejects someone not on the allowlist", async () => {
    isEmailAllowlisted.mockResolvedValue(false);
    const result = await requireAllowedUser(
      supabaseWithUser({ id: PLAYER.id, email: PLAYER.email })
    );
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(403);
    expect(getUserActivity).not.toHaveBeenCalled();
  });

  it("rejects an inactive player on privileged routes", async () => {
    isEmailAllowlisted.mockResolvedValue(true);
    getUserActivity.mockResolvedValue({
      is_active: false,
      role: "player",
      isAdmin: false,
    });
    const result = await requireAllowedUser(
      supabaseWithUser({ id: INACTIVE_PLAYER.id, email: INACTIVE_PLAYER.email })
    );
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json();
      expect(body.code).toBe("inactive");
    }
  });

  it("lets an inactive player through only when allowInactive is set", async () => {
    isEmailAllowlisted.mockResolvedValue(true);
    getUserActivity.mockResolvedValue({
      is_active: false,
      role: "player",
      isAdmin: false,
    });
    const result = await requireAllowedUser(
      supabaseWithUser({ id: INACTIVE_PLAYER.id, email: INACTIVE_PLAYER.email }),
      { allowInactive: true }
    );
    expect("user" in result).toBe(true);
    if ("user" in result) {
      expect(result.user.isAdmin).toBe(false);
      expect(result.user.isActive).toBe(false);
    }
  });

  it("copies isAdmin from getUserActivity, not from the JWT user object", async () => {
    isEmailAllowlisted.mockResolvedValue(true);
    getUserActivity.mockResolvedValue({
      is_active: true,
      role: "player",
      isAdmin: false,
    });
    getUser.mockResolvedValue({
      data: {
        user: {
          id: PLAYER.id,
          email: PLAYER.email,
          user_metadata: { role: "admin", isAdmin: true },
          app_metadata: { role: "admin" },
        },
      },
      error: null,
    });
    const result = await requireAllowedUser({ auth: { getUser } } as never);
    expect("user" in result).toBe(true);
    if ("user" in result) expect(result.user.isAdmin).toBe(false);
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    getUser.mockReset();
    isEmailAllowlisted.mockReset();
    getUserActivity.mockReset();
    isEmailAllowlisted.mockResolvedValue(true);
  });

  it("denies a player even if they are allowlisted and active", async () => {
    getUserActivity.mockResolvedValue({
      is_active: true,
      role: "player",
      isAdmin: false,
    });
    const result = await requireAdmin(
      supabaseWithUser({ id: PLAYER.id, email: PLAYER.email })
    );
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(403);
  });

  it("denies a coach — the role is not a backdoor to admin APIs", async () => {
    getUserActivity.mockResolvedValue({
      is_active: true,
      role: "coach",
      isAdmin: false,
    });
    const result = await requireAdmin(
      supabaseWithUser({ id: COACH.id, email: COACH.email })
    );
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(403);
  });

  it("does not treat NextResponse.json as a successful user", async () => {
    getUserActivity.mockResolvedValue({
      is_active: true,
      role: "admin",
      isAdmin: true,
    });
    const result = await requireAdmin(
      supabaseWithUser({ id: ADMIN.id, email: ADMIN.email })
    );
    expect("user" in result).toBe(true);
    if ("user" in result) expect(result.user.isAdmin).toBe(true);
    expect(result).not.toBeInstanceOf(NextResponse);
  });
});
