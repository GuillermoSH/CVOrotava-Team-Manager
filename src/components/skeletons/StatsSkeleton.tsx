import { FilterChipsSkeleton } from "@/components/common/Bone";
import PageHeader from "@/components/ui/PageHeader";

export function StatsSummarySkeleton() {
  return (
    <div className="flex w-full flex-col gap-10">
      <div>
        <div className="mb-4 h-6 w-40 rounded-md bg-[var(--surface-faint)] animate-pulse" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 rounded bg-[var(--surface-faint)] animate-pulse" />
              <div className="h-7 w-10 rounded bg-[var(--surface-faint)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="h-[190px] rounded-xl bg-[var(--surface-faint)] animate-pulse" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-[var(--surface-faint)] animate-pulse"
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-[var(--surface-faint)] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default function StatsSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando estadísticas"
      className="flex w-full flex-col text-[var(--text-primary)]"
    >
      <PageHeader
        title="Estadísticas"
        subtitle="Rendimiento del equipo por temporada y contexto"
      />
      <FilterChipsSkeleton count={2} />
      <StatsSummarySkeleton />
    </div>
  );
}
