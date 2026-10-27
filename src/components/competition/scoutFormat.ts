const nf = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** «+3,8» / «−1,0» / «0,0» (con el signo menos tipográfico). */
export function signed(n: number): string {
  const s = nf.format(Math.abs(n));
  if (Math.abs(n) < 0.05) return "0,0";
  return `${n > 0 ? "+" : "−"}${s}`;
}

/** Ganados de jugados: «2/3»; «–» si no hay muestra. */
export function ratio(r: { played: number; won: number }): string {
  return r.played > 0 ? `${r.won}/${r.played}` : "–";
}

/** Parte de `a` frente a `b` en [0, 1]; 0,5 si no hay nada que repartir. */
export function share(a: number, b: number): number {
  const total = a + b;
  return total > 0 ? a / total : 0.5;
}
