import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Without this, Turbopack walks up and finds the stray package-lock.json
  // in the Windows home directory, then warns on every dev/build run.
  turbopack: { root: here },
  // Static export: `npm run build` emits web/out/, which Flask serves directly.
  // Keeps the demo a single `python app.py` with no Node process in the loop.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Next 16 writes AGENTS.md/CLAUDE.md into the project on build unless
  // this is off. Whether the repo carries agent instructions is the
  // author's decision, not a build side-effect.
  agentRules: false,
};

export default nextConfig;
