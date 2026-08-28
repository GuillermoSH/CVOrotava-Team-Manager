import Bone, { FilterChipsSkeleton } from "@/components/common/Bone";
import PageHeader from "@/components/ui/PageHeader";

function VideoCardBone() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-surface)]">
      <Bone className="aspect-video w-full rounded-none" />
      <div className="space-y-2 p-3.5">
        <Bone className="h-3.5 w-4/5" />
        <Bone className="h-3 w-2/5" />
      </div>
    </div>
  );
}

export default function VideosSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando vídeos"
      className="w-full text-[var(--text-primary)]"
    >
      <PageHeader title="Vídeos" subtitle="Partidos y entrenamientos grabados" />
      <FilterChipsSkeleton count={4} />
      <Bone className="mb-5 h-10 w-72 max-w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <VideoCardBone key={i} />
        ))}
      </div>
    </div>
  );
}
