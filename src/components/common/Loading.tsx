"use client";

type LoadingProps = {
  /** Optional label for screen readers / quiet hint. Default: none on screen. */
  label?: string;
};

/**
 * Viewport-centered subtle spinner for full-page waits.
 * Uses min-height against the shell chrome so it doesn't stick to the top.
 */
export default function Loading({ label = "Cargando" }: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex w-full min-h-[calc(100svh-var(--mobile-top-height)-var(--bottom-nav-height)-4rem)] items-center justify-center md:min-h-[calc(100svh-6rem)]"
    >
      <div className="relative h-8 w-8">
        <div
          className="absolute inset-0 rounded-full border border-[var(--glass-border)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 rounded-full border border-transparent border-t-[var(--accent)] opacity-80 animate-spin"
          aria-hidden
          style={{ animationDuration: "0.85s" }}
        />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
