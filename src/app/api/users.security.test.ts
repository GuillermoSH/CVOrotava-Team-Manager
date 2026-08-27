import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN, OTHER_PLAYER, PLAYER } from "@/test/security/fixtures";

const requireAllowedUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/require-allowed-user", () => ({
  requireAllowedUser: (...args: unknown[]) => requireAllowedUser(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: vi.fn(async () => ({})),
}));

const from = vi.hoisted(() => vi.fn());
const getUserById = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => from(...args),
    auth: { admin: { getUserById: (...args: unknown[]) => getUserById(...args) } },
  },
}));

import { GET, PATCH } from "@/app/api/users/route";
import { GET as GET_EMAILS } from "@/app/api/allowed-emails/route";

describe("roster / allowlist APIs", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    from.mockReset();
    getUserById.mockReset();
  });

  it("GET /api/users is not a player directory leak", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("GET /api/allowed-emails is not a mailbox dump for players", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await GET_EMAILS();
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("PATCH /api/users strips a role:admin smuggled in the body", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const updatePayloads: Record<string, unknown>[] = [];
    let fromCalls = 0;

    from.mockImplementation(() => {
      fromCalls += 1;
      if (fromCalls === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: OTHER_PLAYER.id, role: "player" },
                error: null,
              })),
            })),
          })),
        };
      }
      return {
        update: vi.fn((payload: Record<string, unknown>) => {
          updatePayloads.push(payload);
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { id: OTHER_PLAYER.id, gender: "male", is_active: true },
                  error: null,
                })),
              })),
            })),
          };
        }),
      };
    });

    const res = await PATCH(
      new Request("http://local/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: OTHER_PLAYER.id,
          gender: "male",
          role: "admin",
          isAdmin: true,
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]).toEqual({ gender: "male" });
    expect(updatePayloads[0]).not.toHaveProperty("role");
    expect(updatePayloads[0]).not.toHaveProperty("isAdmin");
  });

  it("a player cannot PATCH anyone via this endpoint", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await PATCH(
      new Request("http://local/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: PLAYER.id,
          role: "admin",
          gender: "male",
        }),
      })
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });
});
