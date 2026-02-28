import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@wikipefia/mdx-compiler"],
  serverExternalPackages: ["@mdx-js/mdx"],
};

export default nextConfig;
