import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  allowedDevOrigins: ["192.168.1.69"],
  async headers() {
    return [
      {
        source: "/cloudinary/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
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
    ];
  },
};

export default nextConfig;
