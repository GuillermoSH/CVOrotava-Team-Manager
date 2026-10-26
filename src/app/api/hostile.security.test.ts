import { beforeEach, describe, expect, it, vi } from "vitest";
import { OTHER_PLAYER, PLAYER } from "@/test/security/fixtures";
import { createQueryChain } from "@/test/security/queryChain";

/**
 * Matriz hostil: cada ruta API × cada identidad (anónimo, fuera de la lista,
 * inactivo, jugador, admin). Se usan los `requireAllowedUser` / `requireAdmin`
 * REALES; solo se simulan la sesión de Supabase y la BD. Una identidad sin
 * permiso nunca debe llegar a `supabaseAdmin` (service role, salta RLS).
 */

type Identity = "anon" | "notAllowlisted" | "inactive" | "player" | "admin";
const state = vi.hoisted(() => ({ identity: "anon" as Identity }));
const adminCalls = vi.hoisted(() => ({ list: [] as string[] }));
const tables = vi.hoisted(() => ({ byName: {} as Record<string, { data: unknown; error: unknown }> }));

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: vi.fn(async () => ({
    auth: {
      getUser: async () =>
        state.identity === "anon"
          ? { data: { user: null }, error: null }
          : {
              data: {
                user: {
                  id: state.identity === "admin" ? "33333333-3333-4333-8333-333333333333" : "11111111-1111-4111-8111-111111111111",
                  email: "alguien@cvorotava.test",
                  // Metadatos de JWT falsos: jamás deben dar permisos.
                  user_metadata: { role: "admin", is_admin: true },
                  app_metadata: { role: "admin" },
                },
              },
              error: null,
            },
    },
    from: () => {
      adminCalls.list.push("userClient.from");
      return createQueryChain({ data: null, error: null });
    },
  })),
}));

vi.mock("@/lib/auth/allowlist", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/allowlist")>()),
  isEmailAllowlisted: vi.fn(async () => state.identity !== "notAllowlisted"),
}));

vi.mock("@/lib/auth/gate", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/gate")>()),
  readGateFromRequest: vi.fn(async () => null),
}));

vi.mock("@/lib/auth/userActivity", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/userActivity")>()),
  getUserActivity: vi.fn(async () => ({
    is_active: state.identity !== "inactive",
    role: state.identity === "admin" ? "admin" : "player",
    isAdmin: state.identity === "admin",
    user_name: "Test",
    gender: "male",
  })),
}));

// Cualquier uso del service role queda registrado.
vi.mock("@/lib/supabase/admin", () => {
  const trap = new Proxy(
    {},
    {
      get(_t, prop) {
        return (...args: unknown[]) => {
          adminCalls.list.push(`supabaseAdmin.${String(prop)}(${String(args[0] ?? "")})`);
          return createQueryChain(tables.byName[String(args[0])] ?? { data: [], error: null });
        };
      },
    }
  );
  return { supabaseAdmin: trap };
});

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@/lib/fed/sync", () => ({ syncFed: vi.fn(async () => ({})) }));
vi.mock("@/lib/stats/competitive/load", () => ({ getCompetitiveStats: vi.fn(async () => ({})) }));

type Level = "admin" | "member" | "memberInactiveOk" | "secret" | "public";

const LEVELS: Record<string, Level> = {
  "allowed-emails GET": "admin",
  "allowed-emails POST": "admin",
  "allowed-emails PATCH": "admin",
  "allowed-emails DELETE": "admin",
  "auth/callback GET": "public",
  "auth/logout POST": "public",
  "cron/fed-sync GET": "secret",
  "fed/sync GET": "member",
  "fed/sync POST": "admin",
  "match_sets POST": "admin",
  "matches GET": "member",
  "matches POST": "admin",
  "matches/[id] GET": "member",
  "matches/[id] PUT": "admin",
  "matches/[id] DELETE": "admin",
  "payments GET": "memberInactiveOk",
  "payments POST": "admin",
  "payments/exemptions PUT": "admin",
  "payments/exemptions DELETE": "admin",
  "payments/exemptions/clear-pending POST": "admin",
  "payments/[id] PATCH": "admin",
  "payments/[id] DELETE": "admin",
  "seasons GET": "memberInactiveOk",
  "stats GET": "member",
  "stats/competitive GET": "member",
  "user GET": "memberInactiveOk",
  "users GET": "admin",
  "users PATCH": "admin",
  "venues GET": "member",
  "venues POST": "admin",
  "venues/[id] PATCH": "admin",
  "venues/[id] DELETE": "admin",
  "venues/[id]/merge POST": "admin",
  "venues/reconcile POST": "admin",
  "videos GET": "member",
  "videos POST": "admin",
  "videos/[id] PUT": "admin",
  "videos/[id] DELETE": "admin",
};

const modules: Record<string, () => Promise<unknown>> = import.meta.glob("/src/app/api/**/route.ts");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function routeName(path: string) {
  return path.replace("/src/app/api/", "").replace(/\/route\.ts$/, "");
}

async function call(path: string, method: string, init: RequestInit = {}) {
  const mod = (await modules[path]()) as Record<string, (...a: unknown[]) => Promise<Response>>;
  const hasBody = method !== "GET" && method !== "DELETE";
  const req = new Request("http://local/api/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: hasBody ? JSON.stringify({ id: PLAYER.id, role: "admin", is_active: true }) : undefined,
    ...init,
  });
  return mod[method](req, { params: Promise.resolve({ id: "99999999-9999-4999-8999-999999999999" }) });
}

const entries = Object.entries(LEVELS).map(([key, level]) => {
  const [name, method] = key.split(" ");
  return { key, name, method, level, path: `/src/app/api/${name}/route.ts` };
});

describe("route table is complete (new route → forced security decision)", () => {
  it("every route.ts export is classified", async () => {
    const found: string[] = [];
    for (const path of Object.keys(modules)) {
      const mod = (await modules[path]()) as Record<string, unknown>;
      for (const m of METHODS) if (typeof mod[m] === "function") found.push(`${routeName(path)} ${m}`);
    }
    expect(found.sort()).toEqual(Object.keys(LEVELS).sort());
  });
});

beforeEach(() => {
  adminCalls.list.length = 0;
  tables.byName = {};
  vi.stubEnv("CRON_SECRET", "s3cret-value");
});

const gated = entries.filter((e) => e.level !== "public" && e.level !== "secret");

describe.each(gated)("$key [$level]", ({ path, method, level }) => {
  it("anonymous → 401, service role untouched", async () => {
    state.identity = "anon";
    const res = await call(path, method);
    expect(res.status).toBe(401);
    expect(adminCalls.list).toEqual([]);
  });

  it("valid session but email not in allowlist → 403, service role untouched", async () => {
    state.identity = "notAllowlisted";
    const res = await call(path, method);
    expect(res.status).toBe(403);
    expect(adminCalls.list).toEqual([]);
  });

  it("forged admin claims in JWT metadata grant nothing to a player", async () => {
    state.identity = "player";
    const res = await call(path, method);
    if (level === "admin") {
      expect(res.status).toBe(403);
      expect(adminCalls.list).toEqual([]);
    } else {
      expect(res.status).not.toBe(401);
    }
  });

  if (level !== "memberInactiveOk") {
    it("inactive member → 403, service role untouched", async () => {
      state.identity = "inactive";
      const res = await call(path, method);
      expect(res.status).toBe(403);
      expect(adminCalls.list).toEqual([]);
    });
  }
});

describe("cron secret", () => {
  const cron = "/src/app/api/cron/fed-sync/route.ts";
  const bad: Array<[string, Record<string, string>]> = [
    ["no header", {}],
    ["empty bearer", { authorization: "Bearer " }],
    ["bearer undefined", { authorization: "Bearer undefined" }],
    ["wrong secret", { authorization: "Bearer nope" }],
    ["secret without scheme", { authorization: "s3cret-value" }],
    ["lowercase scheme", { authorization: "bearer s3cret-value" }],
    ["x-forwarded spoof", { "x-vercel-cron": "1", "x-forwarded-for": "127.0.0.1" }],
  ];

  it.each(bad)("rejects %s", async (_n, headers) => {
    const res = await call(cron, "GET", { headers });
    expect(res.status).toBe(401);
    expect(adminCalls.list).toEqual([]);
  });

  it("fails closed when CRON_SECRET is unset, even for 'Bearer undefined'", async () => {
    vi.stubEnv("CRON_SECRET", "");
    for (const authorization of ["Bearer undefined", "Bearer ", "Bearer"]) {
      const res = await call(cron, "GET", { headers: { authorization } });
      expect(res.status).toBe(401);
    }
    expect(adminCalls.list).toEqual([]);
  });

  it("accepts the exact secret", async () => {
    const res = await call(cron, "GET", { headers: { authorization: "Bearer s3cret-value" } });
    expect(res.status).toBe(200);
  });
});

describe("payments: nobody reads another member's data", () => {
  const hostile = [
    `userId=${OTHER_PLAYER.id}`,
    "userId=ALL",
    "playerId=ALL",
    `playerId=${OTHER_PLAYER.id}`,
    `userId=${PLAYER.id}&playerId=${OTHER_PLAYER.id}`,
    `userId=${OTHER_PLAYER.id}&playerId=own-player-id`,
    `userId=${encodeURIComponent(`${OTHER_PLAYER.id},user_id.neq.0`)}`,
    `playerId=${encodeURIComponent("x),user_id.neq.0,(id.eq.y")}`,
    `userId=${PLAYER.id}%00${OTHER_PLAYER.id}`,
    `userId=${PLAYER.id.toUpperCase()}`,
    `userId=${PLAYER.id}%20`,
    "userId[]=" + OTHER_PLAYER.id,
    "userId=" + OTHER_PLAYER.id + "&userId=" + PLAYER.id,
  ];

  it.each(hostile)("player with ?%s sees no other member's rows", async (qs) => {
    state.identity = "player";
    tables.byName = {
      players: { data: { id: "own-player-id" }, error: null },
      // La BD "se equivoca" y devuelve también filas ajenas: la ruta debe filtrarlas.
      payments: {
        data: [
          { id: "1", user_id: PLAYER.id, player_id: "own-player-id", concept: "mía" },
          { id: "2", user_id: OTHER_PLAYER.id, player_id: "other-player-id", concept: "AJENA" },
          { id: "3", user_id: null, player_id: "other-player-id", concept: "AJENA" },
          { id: "4", user_id: OTHER_PLAYER.id, player_id: null, concept: "AJENA" },
        ],
        error: null,
      },
    };
    const mod = (await modules["/src/app/api/payments/route.ts"]()) as { GET: (r: Request) => Promise<Response> };
    const res = await mod.GET(new Request(`http://local/api/payments?${qs}`));
    const text = await res.text();
    expect(text).not.toContain("AJENA");
    expect(text).not.toContain(OTHER_PLAYER.id);
    expect(text).not.toContain("adminOverview");
    expect(text).not.toContain("authLastSignInAtByUserId");
    expect([200, 403]).toContain(res.status);
  });

  it("inactive member can read only their own history", async () => {
    state.identity = "inactive";
    tables.byName = { players: { data: null, error: null }, payments: { data: [], error: null } };
    const mod = (await modules["/src/app/api/payments/route.ts"]()) as { GET: (r: Request) => Promise<Response> };
    const other = await mod.GET(new Request(`http://local/api/payments?userId=${OTHER_PLAYER.id}`));
    expect(other.status).toBe(403);
    const own = await mod.GET(new Request("http://local/api/payments"));
    expect(own.status).toBe(200);
  });
});

describe("stats/competitive input validation", () => {
  it.each([
    "",
    "season=2025-26",
    "gender=male",
    "season=2025-26&gender=other",
    "season=2025-26&gender=male%27%20or%201%3D1",
    "season=2025-26&gender=MALE",
    "season=2025-26&gender[]=male",
  ])("?%s → 400 and nothing is computed", async (qs) => {
    state.identity = "player";
    const { getCompetitiveStats } = await import("@/lib/stats/competitive/load");
    vi.mocked(getCompetitiveStats).mockClear();
    const mod = (await modules["/src/app/api/stats/competitive/route.ts"]()) as { GET: (r: Request) => Promise<Response> };
    const res = await mod.GET(new Request(`http://local/api/stats/competitive?${qs}`));
    expect(res.status).toBe(400);
    expect(getCompetitiveStats).not.toHaveBeenCalled();
  });
});
