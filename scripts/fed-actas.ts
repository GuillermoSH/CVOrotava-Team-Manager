/**
 * Lee las actas en PDF de la Federación y guarda sus datos en las tablas fed_match_reports / fed_report_*.
 * La sincronización semanal ya lee las nuevas; este script sirve para el histórico y para reprocesar.
 *
 * Uso (desde la raíz, con .env.local; antes hay que aplicar la migración 20261029120000):
 *   pnpm fed:actas                        # los pendientes (sin leer, a medias o de una versión antigua), 100 como mucho
 *   pnpm fed:actas --all                  # todos los pendientes, sin límite
 *   pnpm fed:actas --season 2025-26       # solo esa temporada (repetible)
 *   pnpm fed:actas --force                # también los ya leídos con la versión actual (tras cambiar el extractor)
 *   pnpm fed:actas --dry-run              # descarga y lee sin escribir
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { processPendingReports } from "@/lib/fed/acta/process";
import { normalizeSeasonId } from "@/utils/getCurrentSeason";

const args = process.argv.slice(2);
const seasons = args.flatMap((a, i) => (a === "--season" && args[i + 1] ? [normalizeSeasonId(args[i + 1])] : []));
const limit = args.includes("--all") ? undefined : 100;
const started = Date.now();

processPendingReports({
  supabase: supabaseAdmin,
  limit,
  seasons: seasons.length > 0 ? seasons : undefined,
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  log: (m) => console.log(m),
})
  .then((s) => {
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `\n${args.includes("--dry-run") ? "[dry-run] " : ""}${s.processed} actas: ${s.ok} ok, ${s.review} a revisar, ` +
        `${s.failed} fallidas, ${s.retry} a reintentar${s.remaining ? `, ${s.remaining} sin tiempo` : ""} (${secs}s)`
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
