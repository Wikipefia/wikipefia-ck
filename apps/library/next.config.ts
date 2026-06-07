import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Load the single shared `.env.local` from the monorepo root (two levels up),
// so this app picks up NEXT_PUBLIC_CONVEX_URL etc. like the other apps do.
loadEnvConfig(path.resolve(__dirname, "../.."));

const nextConfig: NextConfig = {
  // Allow Next dev assets to be requested from the LAN host used in this setup.
  allowedDevOrigins: ["10.10.10.1"],
};

export default nextConfig;
