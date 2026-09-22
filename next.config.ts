import type { NextConfig } from "next";

// Set to "/obscura" by the Pages workflow; empty everywhere else.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static HTML, so GitHub Pages can serve it with no server involved.
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  // The floating dev badge sits over the artwork; nothing else needs overriding.
  devIndicators: false,
};

export default nextConfig;
