import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler disabled due to setState-in-effect warnings
  // Can be re-enabled after fixing cascading render patterns
  reactCompiler: false,
  serverExternalPackages: ['pino', 'pino-pretty', 'jimp', 'sharp'],
  async rewrites() {
    return [
      {
        source: '/admin/whatsapp/:tab(connection|chats|contacts|flows|templates|quickreplies|autoreplies|scheduled|broadcast|labels|blacklist|webhooks|analytics|automation|config|settings)',
        destination: '/admin/whatsapp?tab=:tab',
      },
    ];
  },
};

export default nextConfig;
