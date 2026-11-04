/** Aviso discreto de que Jornadas está en beta: los datos van primero y la forma irá cambiando poco a poco. */
export default function BetaNotice() {
  return (
    <p
      role="note"
      className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] px-3 py-2 text-xs text-[var(--text-secondary)]"
    >
      <span className="rounded bg-[var(--accent-muted)] px-1.5 py-0.5 font-semibold text-[var(--accent)]">Beta</span>
      <span>Esta sección está en desarrollo y irá cambiando de forma poco a poco: lo importante ahora son los datos y las estadísticas.</span>
    </p>
  );
}
