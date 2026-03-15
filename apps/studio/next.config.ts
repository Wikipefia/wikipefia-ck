import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@wikipefia/mdx-compiler", "@wikipefia/mdx-renderer"],
  serverExternalPackages: ["@mdx-js/mdx"],
};

export default nextConfig;
