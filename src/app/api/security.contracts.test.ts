import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function src(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function handlerBody(fileSrc: string, method: string) {
  const re = new RegExp(`export async function ${method}\\b`);
  const start = fileSrc.search(re);
  if (start < 0) {
    throw new Error(`No export async function ${method}`);
  }
  const rest = fileSrc.slice(start);
  const next = rest.slice(1).search(/\nexport async function\b/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

const mutating: Array<{ file: string; methods: string[] }> = [
  { file: "src/app/api/matches/route.ts", methods: ["POST"] },
  { file: "src/app/api/matches/[id]/route.ts", methods: ["PUT", "DELETE"] },
  { file: "src/app/api/match_sets/route.ts", methods: ["POST"] },
  { file: "src/app/api/videos/route.ts", methods: ["POST"] },
  { file: "src/app/api/videos/[id]/route.ts", methods: ["PUT", "DELETE"] },
  { file: "src/app/api/payments/route.ts", methods: ["POST"] },
  { file: "src/app/api/payments/[id]/route.ts", methods: ["PATCH", "DELETE"] },
  { file: "src/app/api/users/route.ts", methods: ["GET", "PATCH"] },
  { file: "src/app/api/allowed-emails/route.ts", methods: ["GET", "POST", "PATCH", "DELETE"] },
  { file: "src/app/api/league-standings/import/route.ts", methods: ["POST"] },
  { file: "src/app/api/team-aliases/route.ts", methods: ["POST"] },
  { file: "src/app/api/team-aliases/[id]/route.ts", methods: ["DELETE"] },
];

describe("mutating APIs must gate with requireAdmin, not membership", () => {
  it.each(
    mutating.flatMap(({ file, methods }) =>
      methods.map((method) => ({ file, method }))
    )
  )("$file $method calls requireAdmin and not requireAllowedUser", ({ file, method }) => {
    const body = handlerBody(src(file), method);
    expect(body, `${file} ${method} lost requireAdmin`).toContain("requireAdmin");
    expect(body).not.toMatch(/requireAllowedUser\s*\(/);
  });
});

describe("the old videos Bearer backdoor must stay gone", () => {
  it("POST /api/videos does not trust Authorization / auth.getUser(token)", () => {
    const body = handlerBody(src("src/app/api/videos/route.ts"), "POST");
    expect(body).not.toMatch(/authorization/i);
    expect(body).not.toMatch(/Bearer/);
    expect(body).not.toMatch(/getUser\(\s*token/);
    expect(body).toContain("requireAdmin");
  });

  it("VideoModal does not attach a Bearer token (cookies only)", () => {
    const modal = src("src/components/videos/VideoModal.tsx");
    expect(modal).not.toMatch(/Authorization/);
    expect(modal).not.toMatch(/getSession/);
    expect(modal).not.toMatch(/access_token/);
  });
});

describe("requireAdmin must not read role through the caller RLS client", () => {
  it("does not query public.users with the user-scoped client", () => {
    const file = src("src/lib/auth/require-admin.ts");
    expect(file).not.toMatch(/\.from\(\s*["']users["']\s*\)/);
    expect(file).not.toMatch(/user_metadata/);
    expect(file).not.toMatch(/app_metadata/);
  });

  it("requireAllowedUser does not take isAdmin from JWT metadata", () => {
    const file = src("src/lib/auth/require-allowed-user.ts");
    expect(file).not.toMatch(/user_metadata/);
    expect(file).not.toMatch(/app_metadata/);
    expect(file).toContain("getUserActivity");
  });
});

describe("admin pages are gated on the server, not only in the client", () => {
  it.each([
    "src/app/(protected)/access/layout.tsx",
    "src/app/(protected)/payments/admin/layout.tsx",
    "src/app/(protected)/matches/create/layout.tsx",
    "src/app/(protected)/matches/edit/layout.tsx",
    "src/app/(protected)/league-standings/upload/layout.tsx",
  ])("%s calls requireAdminPage", (file) => {
    expect(src(file)).toContain("requireAdminPage");
  });
});

describe("forMatchId must be UUID-validated before PostgREST .or() interpolation", () => {
  it.each([
    "src/app/api/matches/route.ts",
    "src/app/api/videos/route.ts",
  ])("%s rejects invalid forMatchId with uuid + 400", (file) => {
    const body = src(file);
    expect(body).toContain("forMatchId");
    expect(body).toMatch(/z\.string\(\)\.uuid\(\)/);
    expect(body).toMatch(/status:\s*400/);
  });

  it.each([
    "src/lib/matches/listMatches.ts",
    "src/lib/videos/listVideos.ts",
  ])("%s only interpolates UUID-safe forMatchId into .or()", (file) => {
    const body = src(file);
    expect(body).toMatch(/z\.string\(\)\.uuid\(\)/);
    expect(body).toMatch(/\.or\(`/);
  });
});

describe("gate secret must not fall back to service role in production", () => {
  it("gate.ts prefers CVOROTAVA_GATE_SECRET and fails closed in production", () => {
    const body = src("src/lib/auth/gate.ts");
    expect(body).toContain("CVOROTAVA_GATE_SECRET");
    expect(body).toMatch(/NODE_ENV\s*===\s*["']production["']/);
    expect(body).toContain("VERCEL_ENV");
    // Must not unconditionally OR the service role key as the secret.
    expect(body).not.toMatch(
      /CVOROTAVA_GATE_SECRET\s*\|\|\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY/
    );
  });
});

describe("users RLS must freeze privileged columns for client JWT", () => {
  it("migration splits policies and protects role/is_active", () => {
    const sql = src(
      "supabase/migrations/20261002140000_users_rls_protect_privileged_columns.sql"
    );
    expect(sql).toContain("users_select_own");
    expect(sql).toContain("users_update_own");
    expect(sql).toContain("protect_users_privileged_columns");
    expect(sql).toMatch(/new\.role\s*:=\s*old\.role/);
    expect(sql).toMatch(/new\.is_active\s*:=\s*old\.is_active/);
    expect(sql).toContain("service_role");
    expect(sql).not.toMatch(/\bfor all\b/i);
    expect(sql).toMatch(/for select/i);
    expect(sql).toMatch(/for update/i);
  });

  it("players/teams get allowlisted read RLS migration", () => {
    const sql = src(
      "supabase/migrations/20261002141500_players_teams_rls_allowlisted_read.sql"
    );
    expect(sql).toContain("Allowlisted users can read players");
    expect(sql).toContain("Allowlisted users can read teams");
    expect(sql).toContain("enable row level security");
  });
});

describe("player payments GET must pin player_id (or legacy user_id) and strip leaked rows", () => {
  it("GET delegates to getPaymentsSnapshot after allowInactive auth", () => {
    const get = handlerBody(src("src/app/api/payments/route.ts"), "GET");
    expect(get).toContain("allowInactive: true");
    expect(get).toContain("getPaymentsSnapshot");
  });

  it("contains both the IDOR 403 and a post-query own-row filter", () => {
    const lib = src("src/lib/payments/getPaymentsSnapshot.ts");
    expect(lib).toMatch(/targetUserId !== actor\.id/);
    expect(lib).toMatch(/\.eq\(\s*["']player_id["']/);
    expect(lib).toMatch(/p\.player_id === ownPlayerId/);
    expect(lib).toContain("isAdmin: false");

    const playerReturn = lib.slice(lib.lastIndexOf("if (targetUserId"));
    expect(playerReturn).not.toMatch(/authLastSignInAtByUserId/);
  });
});
