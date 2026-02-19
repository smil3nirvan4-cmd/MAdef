import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler disabled due to setState-in-effect warnings
  // Can be re-enabled after fixing cascading render patterns
  reactCompiler: false,
  serverExternalPackages: ['pino', 'pino-pretty', 'jimp', 'sharp', 'pdfkit'],
};

export default nextConfig;
