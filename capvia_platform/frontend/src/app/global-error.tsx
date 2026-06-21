"use client";
// src/app/global-error.tsx
// This is the Next.js App Router global error boundary — required by Sentry
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* Render the default Next.js error page UI */}
        <NextError statusCode={0} />
        <button
          onClick={reset}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "10px 20px",
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
