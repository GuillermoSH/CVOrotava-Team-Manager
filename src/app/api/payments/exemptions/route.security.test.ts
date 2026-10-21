import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN, PLAYER } from "@/test/security/fixtures";
import { createQueryChain } from "@/test/security/queryChain";

const requireAllowedUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/require-allowed-user", () => ({
  requireAllowedUser: (...args: unknown[]) => requireAllowedUser(...args),
}));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: vi.fn(async () => ({})),
}));

const from = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => from(...args) },
}));

import { PUT, DELETE } from "@/app/api/payments/exemptions/route";

const PLAYER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const put = (body: unknown) =>
  new Request("http://local/api/payments/exemptions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("payment exemptions API", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    from.mockReset();
  });

  it("un jugador no puede marcarse a sí mismo (ni a nadie) como exento", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await PUT(put({ player_id: PLAYER_ID }));
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("un jugador no puede quitar una exención", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await DELETE(
      new Request(`http://local/api/payments/exemptions?player_id=${PLAYER_ID}`, { method: "DELETE" })
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("rechaza ids que no son UUID antes de tocar la base de datos", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const res = await PUT(put({ player_id: "x'; drop table players;--" }));
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("el admin guarda la exención con su id como autor y la temporada normalizada", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const chain = createQueryChain({ data: null, error: null });
    from.mockReturnValue(chain);
    const res = await PUT(put({ player_id: PLAYER_ID, season: "2026/27", reason: " Coordinación " }));
    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith("payment_exemptions");
    expect(chain.upsert).toHaveBeenCalledWith(
      { player_id: PLAYER_ID, season: "2026-27", reason: "Coordinación", created_by: ADMIN.id },
      { onConflict: "player_id,season" }
    );
  });
});
