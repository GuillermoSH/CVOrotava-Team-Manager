"use client";

import { useEffect } from "react";

/**
 * Registers the soft-offline service worker in production
 * (installable PWA + selective network-first caches).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is best-effort; ignore registration failures.
    });
  }, []);

  return null;
}
