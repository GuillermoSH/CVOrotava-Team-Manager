import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Auditoría estática de la superficie de ataque. Descubre rutas, migraciones y
 * componentes por sí sola: añadir una ruta o tabla nueva sin protegerla rompe
 * estos tests.
 */

const root = process.cwd();
const read = (abs: string) => readFileSync(abs, "utf8");

function walk(dir: string, accept: (f: string) => boolean, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) walk(abs, accept, out);
    else if (accept(abs)) out.push(abs);
  }
  return out;
}

const rel = (abs: string) => relative(root, abs).split(sep).join("/");

const routeFiles = walk(join(root, "src/app/api"), (f) => f.endsWith(`${sep}route.ts`));

function handlers(src: string) {
  const out: { method: string; body: string }[] = [];
  const re = /export async function (GET|POST|PUT|PATCH|DELETE)\b/g;
  const starts: { method: string; at: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) starts.push({ method: m[1], at: m.index });
  starts.forEach((s, i) => {
    out.push({ method: s.method, body: src.slice(s.at, starts[i + 1]?.at ?? src.length) });
  });
  return out;
}

// Rutas públicas por diseño (OAuth) o protegidas por secreto de cron.
const PUBLIC_BY_DESIGN = new Set(["src/app/api/auth/callback/route.ts", "src/app/api/auth/logout/route.ts"]);
const SECRET_GATED = new Set(["src/app/api/cron/fed-sync/route.ts"]);

describe("every API handler has an explicit auth gate", () => {
  const cases = routeFiles
    .filter((f) => !PUBLIC_BY_DESIGN.has(rel(f)) && !SECRET_GATED.has(rel(f)))
    .flatMap((f) => handlers(read(f)).map((h) => ({ file: rel(f), ...h })));

  it("discovers a sane number of handlers (guards the discovery itself)", () => {
    expect(cases.length).toBeGreaterThan(20);
  });

  it.each(cases)("$file $method calls requireAdmin or requireAllowedUser before anything else", ({ file, body }) => {
    const gate = body.search(/require(Admin|AllowedUser)\s*\(/);
    expect(gate, `${file} has no auth gate`).toBeGreaterThan(-1);
    // Nada de tocar la BD con service role antes de autenticar.
    const adminUse = body.search(/supabaseAdmin\b/);
    if (adminUse > -1) expect(gate).toBeLessThan(adminUse);
  });

  it.each(cases.filter((c) => c.method !== "GET"))(
    "$file $method (mutation) requires admin, never mere membership",
    ({ file, body }) => {
      expect(body, `${file} mutation lacks requireAdmin`).toMatch(/requireAdmin\s*\(/);
      expect(body).not.toMatch(/requireAllowedUser\s*\(/);
    }
  );
});

describe("cron endpoint", () => {
  const body = handlers(read(join(root, "src/app/api/cron/fed-sync/route.ts")))[0].body;
  it("fails closed and compares the exact Bearer secret before any work", () => {
    expect(body.indexOf("CRON_SECRET")).toBeLessThan(body.indexOf("syncFed("));
    expect(body).toMatch(/!secret/);
    expect(body).toMatch(/Bearer \$\{secret\}/);
  });
  it("is the only GET that uses the service role without a user session", () => {
    const withoutUser = routeFiles.filter((f) => {
      const s = read(f);
      return s.includes("supabaseAdmin") && !/require(Admin|AllowedUser)/.test(s);
    });
    expect(withoutUser.map(rel).sort()).toEqual(
      ["src/app/api/auth/callback/route.ts", "src/app/api/cron/fed-sync/route.ts"].sort()
    );
  });
});

describe("secrets never reach the browser", () => {
  const clientFiles = walk(join(root, "src"), (f) => /\.(ts|tsx)$/.test(f)).filter((f) =>
    /^\s*["']use client["']/m.test(read(f).slice(0, 300))
  );

  it("discovers client components", () => {
    expect(clientFiles.length).toBeGreaterThan(20);
  });

  it.each(clientFiles.map((f) => ({ file: rel(f), src: read(f) })))(
    "$file does not import the service-role client or read server secrets",
    ({ src }) => {
      expect(src).not.toMatch(/supabase\/admin/);
      expect(src).not.toMatch(/SERVICE_ROLE/);
      expect(src).not.toMatch(/CRON_SECRET/);
      expect(src).not.toMatch(/from\s+["']@\/lib\/auth\/(require-admin|require-allowed-user)["']/);
    }
  );

  it("no NEXT_PUBLIC_ variable carries a secret", () => {
    const all = walk(join(root, "src"), (f) => /\.(ts|tsx)$/.test(f)).map(read).join("\n");
    expect(all).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET|CRON|PRIVATE)/);
  });
});

describe("new federation tables are closed to client JWTs (RLS + revoke)", () => {
  const migrations = walk(join(root, "supabase/migrations"), (f) => f.endsWith(".sql"));
  const sql = Object.fromEntries(migrations.map((f) => [rel(f), read(f)]));
  const allSql = Object.values(sql).join("\n");

  const mirrorTables = [
    "fed_tournaments",
    "fed_groups",
    "fed_rounds",
    "fed_teams",
    "fed_facilities",
    "fed_matches",
    "fed_match_sets",
    "fed_sync_runs",
    "fed_clubs",
    "venue_fed_facilities",
  ];

  it.each(mirrorTables)("%s is created", (t) => {
    expect(allSql).toMatch(new RegExp(`create table if not exists public\\.${t}\\b`));
  });

  it("fed_leverade_mirror enables RLS and revokes anon/authenticated for ALL its tables via loop", () => {
    const m = sql["supabase/migrations/20261016150000_fed_leverade_mirror.sql"];
    expect(m).toMatch(/enable row level security/);
    expect(m).toMatch(/revoke all on public\.%I from anon, authenticated/);
    // El bucle debe cubrir cada tabla fed_* creada en el mismo fichero.
    const loop = m.slice(m.indexOf("foreach") > -1 ? m.indexOf("foreach") : m.indexOf("for t in"));
    const created = [...m.matchAll(/create table if not exists public\.(fed_\w+)/g)].map((x) => x[1]);
    for (const t of created) expect(loop, `${t} missing from RLS loop`).toContain(t);
  });

  it.each(["20261016170000_venue_aliases.sql", "20261016180000_fed_clubs.sql"])(
    "%s locks its table",
    (f) => {
      const m = sql[`supabase/migrations/${f}`];
      expect(m).toMatch(/enable row level security/);
      expect(m).toMatch(/revoke all on public\.\w+ from anon, authenticated/);
    }
  );

  it("no migration opens a table to anon or grants wide-open policies", () => {
    expect(allSql).not.toMatch(/grant\s+(all|select|insert|update|delete)[^;]*\sto\s+anon\b/i);
    // `using (true)` solo es aceptable para el rol interno del hook de Auth.
    const policies = allSql.match(/create policy[\s\S]*?;/gi) ?? [];
    for (const p of policies.filter((x) => /(using|with check)\s*\(\s*true\s*\)/i.test(x))) {
      expect(p, "open policy for a client role").toMatch(/to\s+supabase_auth_admin\b/i);
    }
  });

  it("every SECURITY DEFINER function revokes execute from public/anon/authenticated", () => {
    const fns = [...allSql.matchAll(/create (?:or replace )?function\s+public\.(\w+)\s*\(([\s\S]*?)\bas\s+\$/gi)]
      .filter((m) => /security definer/i.test(m[2]))
      .map((m) => m[1]);
    expect(fns).toEqual(expect.arrayContaining(["merge_venues"]));
    for (const fn of fns) {
      expect(allSql, `${fn} may be callable by clients`).toMatch(
        new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from [^;]*(public|anon|authenticated)`, "i")
      );
    }
  });
});

describe("admin-only UI is also gated on the server", () => {
  it("every adminOnly nav item has a server-gated layout", () => {
    const nav = read(join(root, "src/components/layout/navItems.ts"));
    const items = nav.match(/\{\s*name:[\s\S]*?\s*\}/g) ?? [];
    const adminHrefs = items
      .filter((i) => /adminOnly:\s*true/.test(i))
      .map((i) => /href:\s*"([^"]+)"/.exec(i)![1]);
    expect(adminHrefs).toEqual(expect.arrayContaining(["/venues", "/access"]));
    for (const href of adminHrefs) {
      const layout = join(root, "src/app/(protected)", href, "layout.tsx");
      expect(read(layout), `${href} layout lost requireAdminPage`).toContain("requireAdminPage");
    }
  });

  it("the payments detail page for any player lives under the admin layout", () => {
    expect(
      read(join(root, "src/app/(protected)/payments/admin/layout.tsx"))
    ).toContain("requireAdminPage");
  });
});
