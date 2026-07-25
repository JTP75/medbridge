import path from "path";
import type { NextConfig } from "next";

// Set by the GitHub Pages deploy workflow only; local/Docker builds are
// unaffected and keep using the standalone output below.
const isGithubPagesBuild = process.env.NEXT_BUILD_TARGET === "github-pages";
// Must match the repo name — GitHub Pages serves project sites at
// https://<user>.github.io/<repo>/, so all asset/routing paths need this
// prefix when statically exported.
const REPO_BASE_PATH = "/medbridge";

const nextConfig: NextConfig = isGithubPagesBuild
  ? {
      // Static HTML/JS export for GitHub Pages — no Node server involved.
      // The frontend already falls back to preview/demo data whenever its
      // API calls can't reach a backend, which is exactly the situation on
      // Pages (no hospital-node/portal-backend services are hosted there).
      output: "export",
      basePath: REPO_BASE_PATH,
      assetPrefix: `${REPO_BASE_PATH}/`,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      // Smaller, self-contained build output for the Dockerfile.
      output: "standalone",
      // Pin the workspace root (a stray lockfile elsewhere on this machine
      // was otherwise being auto-detected as the root).
      turbopack: {
        root: path.resolve(__dirname),
      },
    };

export default nextConfig;
