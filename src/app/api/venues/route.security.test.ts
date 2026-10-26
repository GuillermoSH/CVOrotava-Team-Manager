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
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

const from = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => from(...args) },
}));

import { POST } from "@/app/api/venues/route";
import { DELETE } from "@/app/api/venues/[id]/route";

const VENUE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const post = (body: unknown) =>
  new Request("http://local/api/venues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const del = (id: string) =>
  DELETE(new Request(`http://local/api/venues/${id}`, { method: "DELETE" }) as never, {
    params: Promise.resolve({ id }),
  });

const valid = { venue_name: "Pabellón Nuevo", team_name: "CV Nuevo", location_type: "away" };

describe("alta de pabellones (POST /api/venues)", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    from.mockReset();
  });

  it("un jugador no puede crear pabellones", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await POST(post(valid));
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("rechaza datos incompletos o con un tipo inventado antes de tocar la base de datos", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    expect((await POST(post({ venue_name: "A", team_name: "X", location_type: "away" }))).status).toBe(400);
    expect((await POST(post({ ...valid, location_type: "mars" }))).status).toBe(400);
    expect((await POST(post(null))).status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("no duplica un pabellón que ya existe con otro nombre equivalente", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    from.mockReturnValueOnce(
      createQueryChain({
        data: [{ id: VENUE_ID, venue_name: "Pabellón Quiquirá", team_name: "CV Orotava" }],
        error: null,
      })
    );
    const res = await POST(
      post({ venue_name: "Pabellón Quiquirá La Orotava", team_name: "CV Orotava", location_type: "home" })
    );
    expect(res.status).toBe(409);
    expect(String((await jsonOf(res)).error)).toContain("Pabellón Quiquirá");
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("el admin lo crea ya revisado (no pendiente)", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const insertChain = createQueryChain({ data: { id: VENUE_ID, ...valid }, error: null });
    from
      .mockReturnValueOnce(createQueryChain({ data: [], error: null }))
      .mockReturnValueOnce(insertChain);
    const res = await POST(post({ ...valid, venue_name: "  Pabellón Nuevo  " }));
    expect(res.status).toBe(201);
    expect(insertChain.insert).toHaveBeenCalledWith({
      venue_name: "Pabellón Nuevo",
      team_name: "CV Nuevo",
      location_type: "away",
      needs_review: false,
    });
  });
});

describe("borrado de pabellones (DELETE /api/venues/[id])", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    from.mockReset();
  });

  it("un jugador no puede borrar pabellones", async () => {
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    const res = await del(VENUE_ID);
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("rechaza ids que no son UUID", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const res = await del("x'; drop table venues;--");
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("no borra un pabellón que tiene partidos: hay que fusionarlo", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    from.mockReturnValueOnce(createQueryChain({ data: null, error: null, count: 2 } as never));
    const res = await del(VENUE_ID);
    expect(res.status).toBe(409);
    expect(String((await jsonOf(res)).error)).toContain("2 partidos");
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("matches");
  });

  it("borra un pabellón sin partidos", async () => {
    requireAllowedUser.mockResolvedValue({ user: ADMIN });
    const deleteChain = createQueryChain({ data: null, error: null });
    from
      .mockReturnValueOnce(createQueryChain({ data: null, error: null, count: 0 } as never))
      .mockReturnValueOnce(deleteChain);
    const res = await del(VENUE_ID);
    expect(res.status).toBe(200);
    expect(from).toHaveBeenLastCalledWith("venues");
    expect(deleteChain.delete).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith("id", VENUE_ID);
  });
});
