// sentry.client.config.ts
// This file is loaded on the browser side (client components, pages)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of all transactions in production; 100% in dev
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Replay 1% of sessions; 100% of sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Hide PII in production
  beforeSend(event) {
    if (process.env.NODE_ENV === "production") {
      delete event.user?.email;
      delete event.user?.ip_address;
    }
    return event;
  },
});
