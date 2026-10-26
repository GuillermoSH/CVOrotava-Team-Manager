import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN, PLAYER } from "@/test/security/fixtures";
import { createQueryChain, jsonOf } from "@/test/security/queryChain";

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

import { POST } from "@/app/api/payments/exemptions/clear-pending/route";
import { PUT } from "@/app/api/payments/exemptions/route";

const PLAYER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const post = (body: unknown) =>
  new Request("http://local/api/payments/exemptions/clear-pending", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const put = (body: unknown) =>
  new Request("http://local/api/payments/exemptions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** Cadenas en el orden en que la ruta consulta: exención, jugador y pagos. */
function chainsForClear(opts: { exempt: boolean; userId: string | null; count: number }) {
  const exemption = createQueryChain({ data: opts.exempt ? { reason: "Coordinación" } : null, error: null });
  const player = createQueryChain({ data: { user_id: opts.userId }, error: null });
  const payments = createQueryChain({ data: null, error: null, count: opts.count } as never);
  return { exemption, player, payments };
}

describe("quitar pagos pendientes de un exento", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    from.mockReset();
  });

  it("un jugador no puede borrar pagos", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await POST(post({ player_id: PLAYER_ID }));
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("rechaza ids que no son UUID antes de tocar la base de datos", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const res = await POST(post({ player_id: "x'; delete from payments;--" }));
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("no borra nada si el jugador no está exento esa temporada", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const { exemption } = chainsForClear({ exempt: false, userId: USER_ID, count: 0 });
    from.mockReturnValueOnce(exemption);
    const res = await POST(post({ player_id: PLAYER_ID, season: "2026/27" }));
    expect(res.status).toBe(409);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("payment_exemptions");
  });

  it("el admin borra solo los pendientes de la temporada, por player_id y por el user_id antiguo", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const { exemption, player, payments } = chainsForClear({ exempt: true, userId: USER_ID, count: 2 });
    from.mockReturnValueOnce(exemption).mockReturnValueOnce(player).mockReturnValueOnce(payments);

    const res = await POST(post({ player_id: PLAYER_ID, season: "2026/27" }));

    expect(res.status).toBe(200);
    expect((await jsonOf(res)).removed).toBe(2);
    expect(from).toHaveBeenNthCalledWith(3, "payments");
    expect(payments.delete).toHaveBeenCalledWith({ count: "exact" });
    expect(payments.eq).toHaveBeenCalledWith("status", "pending");
    expect(payments.eq).toHaveBeenCalledWith("season", "2026-27");
    expect(payments.or).toHaveBeenCalledWith(
      `player_id.eq.${PLAYER_ID},and(player_id.is.null,user_id.eq.${USER_ID})`
    );
  });

  it("sin cuenta de usuario solo filtra por player_id", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const { exemption, player, payments } = chainsForClear({ exempt: true, userId: null, count: 1 });
    from.mockReturnValueOnce(exemption).mockReturnValueOnce(player).mockReturnValueOnce(payments);

    const res = await POST(post({ player_id: PLAYER_ID }));

    expect(res.status).toBe(200);
    expect(payments.or).not.toHaveBeenCalled();
    expect(payments.eq).toHaveBeenCalledWith("player_id", PLAYER_ID);
  });

  it("no interpola en el filtro un user_id que no sea UUID", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const { exemption, player, payments } = chainsForClear({
      exempt: true,
      userId: "1,or=(role.eq.admin)",
      count: 0,
    });
    from.mockReturnValueOnce(exemption).mockReturnValueOnce(player).mockReturnValueOnce(payments);

    await POST(post({ player_id: PLAYER_ID }));

    expect(payments.or).not.toHaveBeenCalled();
    expect(payments.eq).toHaveBeenCalledWith("player_id", PLAYER_ID);
  });
});

describe("marcar como exento quitando los pendientes", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    from.mockReset();
  });

  it("con clear_pending guarda la exención y borra los pendientes", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const upsert = createQueryChain({ data: null, error: null });
    const player = createQueryChain({ data: { user_id: USER_ID }, error: null });
    const payments = createQueryChain({ data: null, error: null, count: 3 } as never);
    from.mockReturnValueOnce(upsert).mockReturnValueOnce(player).mockReturnValueOnce(payments);

    const res = await PUT(put({ player_id: PLAYER_ID, season: "2026/27", clear_pending: true }));

    expect(res.status).toBe(200);
    expect((await jsonOf(res)).removed).toBe(3);
    expect(upsert.upsert).toHaveBeenCalled();
    expect(payments.eq).toHaveBeenCalledWith("status", "pending");
  });

  it("sin clear_pending no toca ningún pago", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    from.mockReturnValueOnce(createQueryChain({ data: null, error: null }));

    const res = await PUT(put({ player_id: PLAYER_ID, season: "2026/27" }));

    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("payment_exemptions");
  });

  it("si falla el borrado, la exención queda guardada y avisa", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const upsert = createQueryChain({ data: null, error: null });
    const player = createQueryChain({ data: null, error: { message: "boom" } });
    from.mockReturnValueOnce(upsert).mockReturnValueOnce(player);

    const res = await PUT(put({ player_id: PLAYER_ID, clear_pending: true }));
    const json = await jsonOf(res);

    expect(res.status).toBe(200);
    expect(json.removed).toBe(0);
    expect(String(json.warning)).toContain("boom");
  });
});
