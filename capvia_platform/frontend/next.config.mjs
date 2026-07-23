import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: "loose",
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.join(__dirname, "src");
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organisation & project (matches sentry.properties / env vars)
  org: "capvia",
  project: "capvia-frontend",

  // Upload source maps silently during build
  silent: !process.env.CI,

  // Automatically tree-shake Sentry logger to shrink bundle size
  disableLogger: true,

  // Fine-grained source-map upload (avoids leaking source in the browser)
  hideSourceMaps: true,

  // Automatically instrument Next.js server routes & API handlers
  autoInstrumentServerFunctions: true,

  // Tunnel Sentry requests through your own origin to bypass ad-blockers
  tunnelRoute: "/monitoring",
});
