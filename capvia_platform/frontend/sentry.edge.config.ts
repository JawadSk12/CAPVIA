// sentry.edge.config.ts
// This file is loaded for Next.js Edge runtime (middleware, Edge API routes)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
