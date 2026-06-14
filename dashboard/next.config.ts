import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  allowedDevOrigins: ["192.168.1.69"],
};

export default nextConfig;
