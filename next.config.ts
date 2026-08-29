/** @type {import('next').NextConfig} */
const nextConfig = {
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
