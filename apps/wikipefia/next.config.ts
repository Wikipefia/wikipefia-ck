import type { NextConfig } from "next";
import { existsSync, mkdirSync, cpSync, readFileSync } from "fs";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

// Pre-build hook: copy search indexes to public/search/
function copySearchIndexes() {
  const buildDir = path.join(process.cwd(), ".content-build");
  const publicSearchDir = path.join(process.cwd(), "public", "search");

  if (!existsSync(buildDir)) return;

  // Read search meta for hash
  const metaPath = path.join(buildDir, "search-meta.json");
  if (!existsSync(metaPath)) return;

  const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
  const hash = meta.hash;

  mkdirSync(publicSearchDir, { recursive: true });

  for (const locale of ["ru", "en", "cz"]) {
    const src = path.join(buildDir, `search-index-${locale}.json`);
    if (existsSync(src)) {
      const dest = path.join(publicSearchDir, `index-${locale}-${hash}.json`);
      cpSync(src, dest);
    }
  }

  // Also copy meta
  cpSync(metaPath, path.join(publicSearchDir, "meta.json"));
}

// Run copy on config load (before next build)
copySearchIndexes();

const nextConfig: NextConfig = {
  // Ensure .mjs files from .content-build can be loaded
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default withNextIntl(nextConfig);
