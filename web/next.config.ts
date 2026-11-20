import type { NextConfig } from "next";

// Served from GitHub Pages at https://chrov.github.io/Portfolio/apps/
const basePath = process.env.NEXT_BASE_PATH ?? "/Portfolio/apps";

const config: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_DATA_VERSION: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
  },
};

export default config;
