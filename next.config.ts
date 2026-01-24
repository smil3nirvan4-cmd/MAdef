import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['pino', 'pino-pretty', 'jimp', 'sharp'],
};

export default nextConfig;
