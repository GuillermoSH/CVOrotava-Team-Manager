import Bone, { FilterChipsSkeleton } from "@/components/common/Bone";
import PageHeader from "@/components/ui/PageHeader";

export function AccessListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-4 w-52 max-w-full" />
            <Bone className="h-3 w-36" />
          </div>
          <div className="flex gap-2">
            <Bone className="h-9 w-20 rounded-lg" />
            <Bone className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AccessSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando usuarios"
      className="flex w-full flex-col text-[var(--text-primary)]"
    >
      <PageHeader
        title="Usuarios"
        subtitle="Quién puede entrar con Google y datos de perfil"
      />
      <Bone className="mb-6 h-28 rounded-2xl" />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Bone className="h-11 w-full max-w-xs rounded-xl" />
        <FilterChipsSkeleton count={3} className="" />
      </div>
      <AccessListSkeleton />
    </div>
  );
}
