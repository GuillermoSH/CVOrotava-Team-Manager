/**
 * One-shot: apply Portal YYYY-YY season normalization against the shared DB.
 * Usage (from repo root, with .env.local loaded):
 *   node --env-file=.env.local scripts/apply-normalize-season.mjs
 *   node --env-file=.env.local scripts/apply-normalize-season.mjs --dry-run
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dryRun = process.argv.includes("--dry-run");

function loadPg() {
  const candidates = [
    resolve(__dirname, "../node_modules/pg"),
    resolve(__dirname, "../../CVOrotava-Portal/node_modules/pg"),
  ];
  for (const p of candidates) {
    try {
      return require(p);
    } catch {
      /* try next */
    }
  }
  throw new Error("Cannot find module 'pg'. Install it or run from a sibling Portal checkout.");
}

const { Client } = loadPg();

const sqlPath = resolve(
  __dirname,
  "../supabase/migrations/20261016120000_normalize_season_portal_yyyy_yy.sql"
);

async function inventory(client) {
  const { rows: tables } = await client.query(`
    select table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'season'
    group by 1
    order by 1
  `);
  console.log("tables_with_season:", tables.map((t) => t.table_name).join(", "));
  for (const { table_name: t } of tables) {
    const { rows } = await client.query(
      `select season, count(*)::int as n from public.${t} group by 1 order by 1 nulls first`
    );
    console.log(`=== ${t} ===`);
    for (const r of rows) {
      console.log(`  ${JSON.stringify(r.season)}: ${r.n}`);
    }
  }
}

async function main() {
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("Missing POSTGRES_URL_NON_POOLING / POSTGRES_URL");
  }

  // Supabase pooler often presents a chain that Node rejects unless we relax TLS.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log("--- BEFORE ---");
  await inventory(client);

  if (dryRun) {
    console.log("\n(--dry-run: skipping migration apply)");
    await client.end();
    return;
  }

  const sql = readFileSync(sqlPath, "utf8");
  console.log("\n--- APPLYING", sqlPath, "---");
  await client.query(sql);

  console.log("\n--- AFTER ---");
  await inventory(client);
  await client.end();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
