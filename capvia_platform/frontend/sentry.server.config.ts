// sentry.server.config.ts
// This file is loaded on the Node.js server side (API routes, Server Components)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Log errors to the console in development
  debug: process.env.NODE_ENV === "development",
});
