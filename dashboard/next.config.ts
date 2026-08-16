import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

const buildDate = new Date();
const buildDateIso = buildDate.toISOString();

const packageMetadata = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version?: string };
const packageVersion = packageMetadata.version ?? "0.1.0";
const appDisplayVersion = process.env.APP_DISPLAY_VERSION ?? packageVersion;
const appVersion = process.env.APP_VERSION ?? `${appDisplayVersion}-${buildDateIso}`;

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  allowedDevOrigins: ["192.168.1.69", "192.168.1.169", "192.168.1.94"],
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_APP_DISPLAY_VERSION: appDisplayVersion,
    NEXT_PUBLIC_APP_BUILD_DATE: buildDateIso,
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
