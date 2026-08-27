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
  ])("%s calls requireAdminPage", (file) => {
    expect(src(file)).toContain("requireAdminPage");
  });
});

describe("player payments GET must pin user_id and strip leaked rows", () => {
  it("contains both the IDOR 403 and a post-query own-row filter", () => {
    const get = handlerBody(src("src/app/api/payments/route.ts"), "GET");
    const playerBranch = get.slice(get.lastIndexOf("} else {"));
    expect(playerBranch).toMatch(/targetUserId !== auth\.user\.id/);
    expect(playerBranch).toMatch(/\.eq\(\s*["']user_id["']\s*,\s*auth\.user\.id\s*\)/);
    expect(playerBranch).toMatch(/p\.user_id === auth\.user\.id/);
    expect(playerBranch).not.toMatch(/authLastSignInAtByUserId/);
    expect(playerBranch).toContain("isAdmin: false");
  });
});
