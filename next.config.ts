import type { NextConfig } from "next";

// GitHub Pages demo build (PAGES=1): static UI only, no API routes.
const pages = process.env.PAGES === "1";

const nextConfig: NextConfig = {
  ...(pages ? { output: "export", basePath: "/manage-linkedin", trailingSlash: true } : { output: "standalone" }), // standalone: needed by the Electron desktop build
  images: {
    unoptimized: pages,
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
