/**
 * Sync club logos from CVOrotava-Portal (canonical optimized WebPs + favicon).
 *
 * Usage (from Team Manager root, sibling Portal checkout):
 *   node scripts/generate-logos.mjs
 */
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PORTAL = resolve(ROOT, "../CVOrotava-Portal");
const PORTAL_LOGO = join(PORTAL, "public/logo");
const OUT_LOGO = join(ROOT, "public/logo");

if (!existsSync(PORTAL_LOGO)) {
  console.error("Portal logos not found at", PORTAL_LOGO);
  process.exit(1);
}

mkdirSync(OUT_LOGO, { recursive: true });
cpSync(PORTAL_LOGO, OUT_LOGO, { recursive: true });
console.log("synced", OUT_LOGO);

const faviconSrc = join(PORTAL, "app/favicon.ico");
const faviconDst = join(ROOT, "src/app/favicon.ico");
cpSync(faviconSrc, faviconDst);
console.log("wrote", faviconDst);

const blanco64 = join(OUT_LOGO, "logo_blanco_64.webp");
const blanco256 = join(OUT_LOGO, "logo_blanco_256.webp");
const iconOut = join(ROOT, "src/app/icon.png");
const appleOut = join(ROOT, "src/app/apple-icon.png");

function magick(args) {
  try {
    execFileSync("magick", args, { stdio: "inherit" });
  } catch {
    execFileSync("convert", args, { stdio: "inherit" });
  }
}

magick([
  blanco64,
  "-resize",
  "26x26",
  "(",
  "-size",
  "32x32",
  "xc:#141418",
  ")",
  "+swap",
  "-gravity",
  "center",
  "-compose",
  "over",
  "-composite",
  `PNG32:${iconOut}`,
]);
console.log("wrote", iconOut);

magick([
  blanco256,
  "-resize",
  "150x150",
  "(",
  "-size",
  "180x180",
  "xc:#141418",
  ")",
  "+swap",
  "-gravity",
  "center",
  "-compose",
  "over",
  "-composite",
  `PNG32:${appleOut}`,
]);
console.log("wrote", appleOut);
