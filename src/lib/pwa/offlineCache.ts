/** Clears soft-offline Cache Storage entries and asks the SW to drop its cvo-* caches. */
export async function clearOfflineCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("cvo-"))
          .map((key) => caches.delete(key))
      );
    }
  } catch {
    /* best-effort */
  }

  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    reg?.active?.postMessage("CLEAR_OFFLINE_CACHES");
  } catch {
    /* best-effort */
  }
}
