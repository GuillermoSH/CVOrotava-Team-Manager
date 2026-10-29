/**
 * Extrae y valida todas las actas PDF de una carpeta y resume cuántas salen bien y por qué fallan.
 *
 *   npx tsx scripts/actas-report.mts <carpeta con <idPartidoFederacion>.pdf> [--fixture <json de torneos>] [--season 2025-26] [--verbose]
 *
 * Sirve para medir el extractor con actas reales antes de fiarse de él y cada vez que se cambia.
 * Con `--fixture` (el JSON de torneos que usan los tests de estadísticas) también contrasta cada
 * acta con los puntos de sus sets en la federación.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readActaItems } from "../src/lib/fed/acta/items.ts";
import { parseActa } from "../src/lib/fed/acta/parse.ts";
import { actaStatus, compareWithFed, validateActa, type FedMatchForActa } from "../src/lib/fed/acta/validate.ts";
import type { ActaIssue } from "../src/lib/fed/acta/types.ts";

type Bundle = {
  tournament: { season: string };
  teams: { id: number; name: string }[];
  matches: { id: number; home_team_id: number | null; away_team_id: number | null; home_sets: number | null; away_sets: number | null }[];
  sets: { match_id: number; set_number: number; home_points: number; away_points: number }[];
};

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--fixture" && args[args.indexOf(a) - 1] !== "--season");
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const verbose = args.includes("--verbose");
if (!dir) {
  console.error("Uso: npx tsx scripts/actas-report.mts <carpeta> [--fixture <json>] [--season 2025-26] [--verbose]");
  process.exit(1);
}

const fed = new Map<number, FedMatchForActa>();
const fixture = opt("--fixture");
if (fixture) {
  const season = opt("--season");
  const bundles = JSON.parse(readFileSync(fixture, "utf8")) as Bundle[];
  for (const b of bundles.filter((x) => !season || x.tournament.season === season)) {
    const names = new Map(b.teams.map((t) => [t.id, t.name]));
    for (const m of b.matches) {
      if (m.home_team_id === null || m.away_team_id === null) continue;
      fed.set(m.id, {
        homeName: names.get(m.home_team_id) ?? "",
        awayName: names.get(m.away_team_id) ?? "",
        homeSets: m.home_sets,
        awaySets: m.away_sets,
        sets: b.sets
          .filter((s) => s.match_id === m.id)
          .sort((p, q) => p.set_number - q.set_number)
          .map((s) => ({ home: s.home_points, away: s.away_points })),
      });
    }
  }
}

const files = readdirSync(dir).filter((f) => f.endsWith(".pdf")).sort();
const byStatus: Record<string, number> = { ok: 0, review: 0, failed: 0, unreadable: 0 };
const byCode = new Map<string, { count: number; level: string; example: string; files: string[] }>();
const failures: { file: string; issues: ActaIssue[] }[] = [];

for (const file of files) {
  const id = Number(file.replace(".pdf", ""));
  let issues: ActaIssue[] = [];
  try {
    const items = await readActaItems(new Uint8Array(readFileSync(join(dir, file))));
    const parsed = parseActa(items);
    issues = parsed.issues;
    if (parsed.data) {
      issues = [...issues, ...validateActa(parsed.data)];
      const f = fed.get(id);
      if (f) issues = [...issues, ...compareWithFed(parsed.data, f).issues];
      else if (fed.size > 0) issues.push({ level: "warning", code: "fed-missing", message: "No hay partido de la federación para contrastar." });
    }
  } catch (e) {
    byStatus.unreadable++;
    issues = [{ level: "error", code: "unreadable", message: e instanceof Error ? e.message : String(e) }];
    failures.push({ file, issues });
    continue;
  }
  const status = actaStatus(issues);
  byStatus[status]++;
  for (const i of issues) {
    const e = byCode.get(i.code) ?? { count: 0, level: i.level, example: i.message, files: [] };
    e.count++;
    if (e.files.length < 4) e.files.push(file);
    byCode.set(i.code, e);
  }
  if (status !== "ok") failures.push({ file, issues });
}

console.log(`\n${files.length} actas`, byStatus);
console.log("\nAvisos por código:");
for (const [code, e] of [...byCode].sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${String(e.count).padStart(4)}  ${e.level.padEnd(7)} ${code}  — p. ej. ${e.example}  [${e.files.join(", ")}]`);
}
if (verbose) {
  console.log("\nDetalle:");
  for (const f of failures) {
    console.log(`  ${f.file}`);
    for (const i of f.issues) console.log(`     ${i.level}: ${i.message}`);
  }
}
