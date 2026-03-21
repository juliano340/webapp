import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@whiskeysockets/baileys"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
