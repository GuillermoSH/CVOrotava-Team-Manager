import Bone, { FilterChipsSkeleton } from "@/components/common/Bone";
import PageHeader from "@/components/ui/PageHeader";

function MatchRowBone() {
  return (
    <li className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-5 w-2/3 max-w-xs" />
          <Bone className="h-3.5 w-40" />
          <Bone className="h-3.5 w-52" />
        </div>
        <Bone className="h-9 w-24 rounded-xl" />
      </div>
    </li>
  );
}

export default function MatchesSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando calendario"
      className="w-full text-[var(--text-primary)]"
    >
      <PageHeader
        title="Calendario"
        subtitle="Partidos de la temporada"
        actions={<Bone className="h-10 w-40 rounded-xl" />}
      />
      <div className="mb-4">
        <Bone className="h-11 w-full rounded-xl" />
      </div>
      <FilterChipsSkeleton count={2} />
      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Próximos
        </h2>
        <ul className="grid gap-3 sm:gap-4 xl:grid-cols-2">
          <MatchRowBone />
          <MatchRowBone />
          <MatchRowBone />
          <MatchRowBone />
        </ul>
      </section>
    </div>
  );
}
