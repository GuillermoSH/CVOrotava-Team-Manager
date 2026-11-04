/** @type {import('next').NextConfig} */
const nextConfig = {
  // Isolate verify builds from a running `next dev` (.next): CVO_DIST_DIR=.next-verify
  distDir: process.env.CVO_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
    ],
  },
  // pdf.js se carga desde node_modules (no se empaqueta): lee las actas de la federación al sincronizar
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/**": ["./src/emails/assets/**"],
    // pdf.js carga su «worker» por ruta, algo que el rastreo de archivos no ve solo
    "/api/cron/fed-sync": ["./node_modules/pdfjs-dist/legacy/build/**"],
    "/api/fed/sync": ["./node_modules/pdfjs-dist/legacy/build/**"],
  },
};

module.exports = nextConfig;
