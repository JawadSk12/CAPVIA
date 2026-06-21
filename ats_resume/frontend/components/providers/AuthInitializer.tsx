"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * AuthInitializer component.
 * Responsible for validating the session and refreshing the access token
 * when the application first loads or the user refreshes the page.
 */
export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const loadMe = useAuthStore((s) => s.loadMe);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      
      // First verify backend is reachable
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/health/ping`)
        .then(r => r.json())
        .then(() => {
          console.log("Backend reachable, initializing session...");
          loadMe().catch(() => {
            console.warn("Session restoration failed - user might be logged out.");
          });
        })
        .catch(err => {
          console.error("Backend unreachable or CORS blocked:", err);
        });
    }
  }, [loadMe]);

  return <>{children}</>;
}
