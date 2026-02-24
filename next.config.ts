import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // React Compiler disabled due to setState-in-effect warnings
  // Can be re-enabled after fixing cascading render patterns
  reactCompiler: false,
  serverExternalPackages: ['pino', 'pino-pretty', 'jimp', 'sharp', 'pdfkit'],
  async headers() {
    return [
      {
        // Apply security headers to all routes as a fallback
        source: '/(.*)',
        headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
