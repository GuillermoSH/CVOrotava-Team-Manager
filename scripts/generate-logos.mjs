import sharp from "sharp";
import { mkdirSync } from "node:fs";

const OUT_DIR = "public/assets/imgs";
const SIZES = [32, 64, 128, 192, 256, 512];
/** Matches --color-bg-elevated in dark theme */
const DARK = { r: 20, g: 20, b: 24, alpha: 1 };
const PAD = 0.1;

mkdirSync(OUT_DIR, { recursive: true });

async function resizedLogo(src, box) {
  return sharp(src)
    .resize(box, box, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function writeSquare({ src, name, size, background }) {
  const inner = Math.round(size * (1 - PAD * 2));
  const logo = await resizedLogo(src, inner);
  const base = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  }).composite([{ input: logo, gravity: "centre" }]);

  const out = `${OUT_DIR}/${name}_${size}.webp`;
  await base.webp({ quality: 92, alphaQuality: 90, effort: 6 }).toFile(out);
  console.log("wrote", out);
}

for (const size of SIZES) {
  await writeSquare({
    src: `${OUT_DIR}/logo_blanco.png`,
    name: "logo_blanco",
    size,
    background: DARK,
  });
  await writeSquare({
    src: `${OUT_DIR}/logo_negro.png`,
    name: "logo_negro",
    size,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
}

await sharp({
  create: { width: 32, height: 32, channels: 4, background: DARK },
})
  .composite([
    {
      input: await resizedLogo(`${OUT_DIR}/logo_blanco.png`, 26),
      gravity: "centre",
    },
  ])
  .png()
  .toFile("src/app/icon.png");
console.log("wrote src/app/icon.png");

await sharp({
  create: { width: 180, height: 180, channels: 4, background: DARK },
})
  .composite([
    {
      input: await resizedLogo(`${OUT_DIR}/logo_blanco.png`, 150),
      gravity: "centre",
    },
  ])
  .png()
  .toFile("src/app/apple-icon.png");
console.log("wrote src/app/apple-icon.png");

mkdirSync("src/emails/assets", { recursive: true });
const emailLogoBuf = await sharp({
  create: { width: 192, height: 192, channels: 4, background: DARK },
})
  .composite([
    {
      input: await resizedLogo(`${OUT_DIR}/logo_blanco.png`, 160),
      gravity: "centre",
    },
  ])
  .png()
  .toBuffer();
await sharp(emailLogoBuf).toFile(`${OUT_DIR}/logo_email.png`);
await sharp(emailLogoBuf).toFile("src/emails/assets/logo_email.png");
console.log("wrote logo_email.png");
