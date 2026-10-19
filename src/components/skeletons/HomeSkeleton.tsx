import Bone from "@/components/common/Bone";

export default function HomeSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando inicio"
      className="flex w-full flex-col text-[var(--text-primary)]"
    >
      <header className="mb-5">
        <Bone className="h-8 w-64 max-w-full sm:h-9" />
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          Resumen de la temporada en curso.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-8">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">
              Próximo partido
            </h2>
            <Bone className="h-64 rounded-2xl sm:h-48" />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">
              Tu temporada
            </h2>
            <div className="grid gap-6 sm:grid-cols-[minmax(0,6.5rem)_1fr]">
              <Bone className="h-20 w-24" />
              <div className="space-y-4">
                <Bone className="h-1.5 w-full rounded-full" />
              </div>
            </div>
          </section>
        </div>
        <div className="flex flex-col gap-8 lg:col-span-5">
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">Cuotas</h2>
            <Bone className="h-20 rounded-xl" />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">
              Últimos resultados
            </h2>
            <Bone className="h-32 rounded-xl" />
          </section>
        </div>
      </div>
    </div>
  );
}
