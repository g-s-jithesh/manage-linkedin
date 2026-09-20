import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
