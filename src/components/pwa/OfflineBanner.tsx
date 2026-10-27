"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Fixed strip under the chrome when the device reports offline. */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-14 z-[calc(var(--z-navbar)-1)] border-b border-[color-mix(in_srgb,var(--color-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-warning-muted)_90%,var(--color-bg))] px-3 py-2 text-center text-xs font-medium text-[var(--text-primary)] backdrop-blur-md md:top-0 md:left-[var(--sidebar-width)] sm:text-sm"
    >
      Sin conexión — mostrando datos guardados de esta sesión.
    </div>
  );
}
