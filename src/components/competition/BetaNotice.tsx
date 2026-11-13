import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVial } from "@fortawesome/free-solid-svg-icons";

/** Aviso discreto de que Jornadas está en beta (fijo arriba en escritorio; en móvil se desplaza con la página para no robar pantalla): los datos van primero y la forma irá cambiando poco a poco. */
export default function BetaNotice() {
  return (
    <p
      role="note"
      className="mb-5 flex md:sticky md:top-3 md:z-20 md:bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] md:backdrop-blur-md max-w-[80rem] flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] px-3 py-2 text-xs text-[var(--text-secondary)]"
    >
      <FontAwesomeIcon icon={faVial} className="text-[var(--accent)]" aria-hidden />
      <span className="rounded bg-[var(--accent-muted)] px-1.5 py-0.5 font-semibold text-[var(--accent)]">Beta</span>
      <span>Esta sección está en desarrollo e irá cambiando de forma poco a poco: lo importante ahora son los datos y las estadísticas.</span>
    </p>
  );
}
