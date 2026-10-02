import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Scope file tracing to this project so `next build` doesn't try to trace
  // the entire sandbox/container filesystem (which can hang at the
  // "Collecting build traces" step in restricted environments).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
