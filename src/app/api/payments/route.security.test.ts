import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN, OTHER_PLAYER, PLAYER } from "@/test/security/fixtures";
import { createQueryChain, jsonOf } from "@/test/security/queryChain";

const requireAllowedUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/require-allowed-user", () => ({
  requireAllowedUser: (...args: unknown[]) => requireAllowedUser(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: vi.fn(async () => ({})),
}));

const listUsers = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => from(...args),
    auth: { admin: { listUsers: (...args: unknown[]) => listUsers(...args) } },
  },
}));

import { GET, POST } from "@/app/api/payments/route";
import { PATCH, DELETE } from "@/app/api/payments/[id]/route";

describe("GET /api/payments IDOR", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    from.mockReset();
    listUsers.mockReset();
  });

  it("refuses a player asking for another member's userId and does not query payments", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await GET(
      new Request(
        `http://local/api/payments?userId=${OTHER_PLAYER.id}`
      )
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
    expect(listUsers).not.toHaveBeenCalled();
    const body = await jsonOf(res);
    expect(body).not.toHaveProperty("data");
    expect(body).not.toHaveProperty("authLastSignInAtByUserId");
  });

  it("refuses userId=ALL as a player (bulk identifier is not a self-read)", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await GET(new Request("http://local/api/payments?userId=ALL"));
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("drops leaked rows if the database ignores the user_id filter", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const chain = createQueryChain({
      data: [
        { id: "p1", user_id: PLAYER.id, amount: 10, status: "pending" },
        { id: "p2", user_id: OTHER_PLAYER.id, amount: 999, status: "pending" },
      ],
      error: null,
    });
    from.mockReturnValue(chain);

    const res = await GET(new Request("http://local/api/payments"));
    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("user_id", PLAYER.id);
    expect(listUsers).not.toHaveBeenCalled();

    const body = await jsonOf(res);
    expect(body.isAdmin).toBe(false);
    expect(body).not.toHaveProperty("authLastSignInAtByUserId");
    const rows = body.data as { user_id: string; amount: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(PLAYER.id);
    expect(rows.some((r) => r.user_id === OTHER_PLAYER.id)).toBe(false);
  });

  it("does not honor spoof headers that claim admin", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const chain = createQueryChain({ data: [], error: null });
    from.mockReturnValue(chain);

    const res = await GET(
      new Request("http://local/api/payments", {
        headers: {
          "x-admin": "true",
          "x-role": "admin",
          Authorization: "Bearer totally-admin",
        },
      })
    );
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(body.isAdmin).toBe(false);
    expect(listUsers).not.toHaveBeenCalled();
  });
});

describe("POST /api/payments privilege", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    from.mockReset();
  });

  it("does not let a player insert a quota (including user_id=ALL)", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await POST(
      new Request("http://local/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "ALL",
          concept: "Mensualidad",
          amount: 1,
          status: "pending",
        }),
      })
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("does not let a coach insert either", async () => {
    requireAllowedUser.mockResolvedValue({
      user: { ...PLAYER, email: "coach@x.test", isAdmin: false },
    });
    const res = await POST(
      new Request("http://local/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: OTHER_PLAYER.id,
          concept: "Mensualidad",
          amount: 25,
          status: "pending",
        }),
      })
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("still allows a real admin through the same payload", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const chain = createQueryChain({ data: null, error: null });
    from.mockReturnValue(chain);

    const res = await POST(
      new Request("http://local/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: OTHER_PLAYER.id,
          concept: "Mensualidad",
          amount: 25,
          status: "pending",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(chain.insert).toHaveBeenCalled();
  });
});

describe("PATCH/DELETE /api/payments/[id]", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    from.mockReset();
  });

  it("does not let a player mark a quota as paid", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await PATCH(
      new Request("http://local/api/payments/p1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      }),
      { params: Promise.resolve({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" }) }
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("does not let a player delete a quota", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await DELETE(
      new Request("http://local/api/payments/p1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" }) }
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });
});
