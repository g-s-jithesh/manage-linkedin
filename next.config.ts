import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // needed by the Electron desktop build
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "dms.licdn.com",
      },
      {
        protocol: "https",
        hostname: "static.licdn.com",
      },
      {
        protocol: "https",
        hostname: "*.licdn.com",
      },
    ],
  },
};

export default nextConfig;
