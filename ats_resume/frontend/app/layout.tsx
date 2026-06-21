"use client";
// Triggering rebuild

import "./globals.css";
import { Toaster } from "react-hot-toast";
import AuthInitializer from "@/components/providers/AuthInitializer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4F46E5" />
        <link rel="icon" href="/favicon.ico" />
        <title>CAPVIA — AI-Powered Resume ATS Analyzer</title>
        <meta
          name="description"
          content="CAPVIA analyzes your resume with enterprise-grade AI to maximize your ATS score, identify skill gaps, and match you to the best internships."
        />
      </head>
      <body className="antialiased">
        <AuthInitializer>
          {children}
        </AuthInitializer>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1E293B",
              color: "#F8FAFC",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 500,
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            },
            success: {
              iconTheme: { primary: "#10B981", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#F43F5E", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
