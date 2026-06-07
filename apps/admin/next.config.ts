import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import path from "path";

// All apps and Convex share the monorepo-root env file (../../.env.local).
// Next only auto-loads env files from the app dir, so load the root here.
loadEnvConfig(path.resolve(__dirname, "../.."));

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@wikipefia/mdx-compiler", "@wikipefia/ui"],
};

export default nextConfig;
