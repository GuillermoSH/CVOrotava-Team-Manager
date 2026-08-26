function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--surface-faint)] ${className}`}
      aria-hidden
    />
  );
}

/** Layout-faithful placeholder for match details while the RSC loads. */
export default function MatchDetailsLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando partido"
      className="flex w-full flex-col text-[var(--text-primary)]"
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Bone className="h-4 w-36" />
        <div className="flex gap-2">
          <Bone className="h-9 w-40 rounded-xl" />
          <Bone className="hidden h-9 w-32 rounded-xl sm:block" />
        </div>
      </div>

      <header className="mb-10 border-b border-[var(--glass-border)] pb-8 lg:mb-12 lg:pb-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0 flex-1 space-y-3">
            <Bone className="h-9 w-3/4 max-w-md sm:h-10" />
            <Bone className="h-3.5 w-56" />
            <Bone className="h-3.5 w-64" />
            <Bone className="h-3.5 w-48" />
          </div>
          <Bone className="h-12 w-28 shrink-0 rounded-xl sm:h-14" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Bone className="h-28 rounded-2xl lg:col-span-2" />
        <Bone className="h-28 rounded-2xl" />
        <Bone className="h-40 rounded-2xl lg:col-span-3" />
      </div>
    </div>
  );
}
