import Bone, { FilterChipsSkeleton } from "@/components/common/Bone";
import PageHeader from "@/components/ui/PageHeader";

export function PaymentsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-4"
        >
          <Bone className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-24" />
          </div>
          <Bone className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function PaymentsSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando pagos"
      className="flex w-full flex-col text-[var(--text-primary)]"
    >
      <PageHeader title="Control de pagos" />
      <FilterChipsSkeleton count={2} />
      <PaymentsListSkeleton />
    </div>
  );
}
