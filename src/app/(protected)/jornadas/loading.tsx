import PageHeader from "@/components/ui/PageHeader";

export default function JornadasLoading() {
  return (
    <div className="w-full">
      <PageHeader title="Jornadas" />
      <div className="flex flex-col gap-3" aria-busy="true">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-[var(--surface-faint)]" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--surface-faint)]" />
        ))}
      </div>
    </div>
  );
}
