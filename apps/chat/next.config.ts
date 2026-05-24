import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(path.resolve(__dirname, "../.."));

const nextConfig: NextConfig = {
  // Workspace packages that ship raw TS — must be transpiled.
  transpilePackages: ["@wikipefia/chat", "@wikipefia/mdx-renderer"],
};

export default nextConfig;
