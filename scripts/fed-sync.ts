/**
 * Sincroniza datos de la Federación Canaria (Leverade) a las tablas fed_*.
 *
 * Uso (desde la raíz, con .env.local):
 *   pnpm fed:sync                      # temporada actual
 *   pnpm fed:sync --all                # backfill desde 2019-20
 *   pnpm fed:sync --season 2025-26     # temporadas concretas (repetible)
 *   pnpm fed:sync --all --dry-run      # descarga y parsea sin escribir
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncFed, type FedSyncScope } from "@/lib/fed/sync";
import { normalizeSeasonId } from "@/utils/getCurrentSeason";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const seasons = args
  .flatMap((a, i) => (a === "--season" && args[i + 1] ? [normalizeSeasonId(args[i + 1])] : []));

const scope: FedSyncScope = args.includes("--all")
  ? { kind: "all" }
  : seasons.length > 0
    ? { kind: "seasons", seasons }
    : { kind: "current" };

const started = Date.now();
syncFed({
  supabase: supabaseAdmin,
  scope,
  trigger: scope.kind === "current" ? "manual" : "backfill",
  dryRun,
  log: (m) => console.log(m),
})
  .then((s) => {
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `\n${dryRun ? "[dry-run] " : ""}${s.tournaments.length} torneos sincronizados, ` +
        `${s.skipped.length} omitidos, ${secs}s`
    );
    for (const k of s.skipped) console.log(`  - omitido ${k.id} ${k.name} (${k.reason})`);
    for (const v of s.link?.newVenues ?? []) console.log(`  + pabellón nuevo (revisar casa/fuera/viaje): ${v}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
