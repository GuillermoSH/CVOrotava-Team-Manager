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
  outputFileTracingIncludes: {
    "/api/**": ["./src/emails/assets/**"],
  },
};

module.exports = nextConfig;
