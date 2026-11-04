import type { BriefTone, TeamBrief as Brief } from "@/lib/competition/teamBrief";

const TONE: Record<BriefTone, { label: string; className: string }> = {
  strength: { label: "Punto fuerte", className: "text-[var(--color-success)]" },
  weakness: { label: "Punto débil", className: "text-[var(--color-danger)]" },
  habit: { label: "Costumbre", className: "text-[var(--text-secondary)]" },
  info: { label: "Dato", className: "text-[var(--text-secondary)]" },
};

/**
 * Resumen rápido de un rival de cara a un partido: lo de más impacto de su ficha, con su recuento,
 * y un enlace a la sección de abajo donde está el detalle.
 */
export default function TeamBrief({ brief, name }: Readonly<{ brief: Brief; name: string }>) {
  if (!brief.headline && brief.facts.length === 0 && brief.versusUs.length === 0) return null;

  return (
    <section aria-labelledby="t-brief" className="max-w-3xl rounded-xl border border-[var(--glass-border)] bg-[var(--surface-faint)] p-4 sm:p-5">
      <h2 id="t-brief" className="text-lg font-semibold tracking-tight">
        Claves para el partido contra {name}
      </h2>
      <p className="mb-3 mt-0.5 text-xs text-[var(--text-muted)]">Resumen automático de la temporada. El detalle de cada punto está más abajo.</p>

      {brief.headline ? <p className="text-sm text-[var(--text-primary)]">{brief.headline}</p> : null}

      {brief.versusUs.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-sm text-[var(--text-secondary)]">
          {brief.versusUs.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {brief.facts.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {brief.facts.map((f) => (
            <li key={f.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <span className={`w-24 shrink-0 text-xs font-semibold ${TONE[f.tone].className}`}>{TONE[f.tone].label}</span>
              <span className="min-w-0 flex-1 text-sm">
                {f.text}{" "}
                <a href={`#${f.section}`} className="whitespace-nowrap text-xs font-semibold text-[var(--accent)] hover:underline">
                  Ver detalle
                </a>
              </span>
            </li>
          ))}
        </ul>
      ) : brief.caution ? null : (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Nada se sale de lo normal con los datos que hay.</p>
      )}

      {brief.caution ? <p className="mt-4 text-xs text-[var(--text-muted)]">{brief.caution}</p> : null}
    </section>
  );
}
