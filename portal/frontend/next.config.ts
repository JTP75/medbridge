import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Smaller, self-contained build output for the Dockerfile.
  output: "standalone",
  // Pin the workspace root (a stray lockfile elsewhere on this machine was
  // otherwise being auto-detected as the root).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
