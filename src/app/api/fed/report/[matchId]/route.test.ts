import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYER } from "@/test/security/fixtures";
import { createQueryChain } from "@/test/security/queryChain";

const requireAllowedUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/require-allowed-user", () => ({
  requireAllowedUser: (...args: unknown[]) => requireAllowedUser(...args),
}));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: vi.fn(async () => ({})) }));

const from = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => from(...args) },
}));

import { GET } from "./route";

const call = (matchId: string) =>
  GET(new Request(`http://local/api/fed/report/${matchId}`), { params: Promise.resolve({ matchId }) });

const REPORT = "https://competitionmanager.clupik.com/matches/1/pdf-url-redirect";

describe("GET /api/fed/report/:matchId", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    from.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("rechaza ids que no son numéricos antes de tocar la base de datos", async () => {
    for (const id of ["abc", "1;drop", "1 or 1=1", "../x", "99999999999999999999"]) {
      expect((await call(id)).status).toBe(400);
    }
    expect(from).not.toHaveBeenCalled();
  });

  it("404 si el partido no tiene acta", async () => {
    from.mockReturnValue(createQueryChain({ data: { report_url: null }, error: null }));
    expect((await call("1")).status).toBe(404);
  });

  it("no sigue enlaces que no sean de la federación", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    from.mockReturnValue(createQueryChain({ data: { report_url: "https://evil.example/acta.pdf" }, error: null }));
    expect((await call("1")).status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sirve el PDF en línea desde nuestro dominio", async () => {
    from.mockReturnValue(createQueryChain({ data: { report_url: REPORT }, error: null }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("%PDF-1.4 contenido", { headers: { "content-type": "application/pdf" } }))
    );
    const res = await call("1");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("inline");
    expect(res.headers.get("cache-control")).toContain("private");
    expect(await res.text()).toContain("%PDF");
  });

  it("502 si lo que devuelve la federación no es un PDF", async () => {
    from.mockReturnValue(createQueryChain({ data: { report_url: REPORT }, error: null }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>error</html>", { headers: { "content-type": "text/html" } }))
    );
    expect((await call("1")).status).toBe(502);
  });

  it("504 si la federación no responde", async () => {
    from.mockReturnValue(createQueryChain({ data: { report_url: REPORT }, error: null }));
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("timeout"))));
    expect((await call("1")).status).toBe(504);
  });
});
