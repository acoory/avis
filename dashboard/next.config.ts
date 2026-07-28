import type { NextConfig } from "next";

const appVersion =
  process.env.APP_VERSION ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  `${Date.now()}`;

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  allowedDevOrigins: ["192.168.1.69"],
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate",
          },
        ],
      },
      {
        source: "/cloudinary/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/documents/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/cloudinary/:path*",
        destination: "https://res.cloudinary.com/:path*",
      },
      {
        source: "/documents/:path*",
        destination: "https://res.cloudinary.com/:path*",
      },
    ];
  },
};

export default nextConfig;
