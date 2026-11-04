/**
 * Geometría de la hoja del acta: los paneles de cada set y las columnas del campo (posiciones I a VI).
 * Todo se mide respecto al «Inicio:» de cada panel, porque la hoja sale de una plantilla fija.
 */

export const within = (v: number, lo: number, hi: number) => v >= lo && v <= hi;
export const isInt = (s: string) => /^\d+$/.test(s.trim());

/** Columnas del campo (posiciones I a VI) respecto al «Inicio:» de su panel: la del equipo de la izquierda y la de la derecha. */
export const ROT_LEFT = [-108, -90, -70, -53, -34, -16];
export const ROT_RIGHT = [39, 58, 75, 93, 112, 132];
export const ROT_TOL = 9;

export const colOf = (x: number, x0: number, offsets: number[]): number => {
  let best = -1;
  let bestGap = Infinity;
  offsets.forEach((off, i) => {
    const gap = Math.abs(x - (x0 + off));
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  });
  return bestGap <= ROT_TOL ? best : -1;
};

export type Panel = {
  set: number;
  x0: number;
  y0: number;
  start: string | null;
  end: string | null;
  /**
   * Quién hay en la rejilla de la izquierda y quién en la de la derecha. Las letras A y B que
   * rotulan cada rejilla cambian de un set a otro, así que el equipo se identifica por su nombre.
   */
  left: { name: string; startsServing: boolean | null };
  right: { name: string; startsServing: boolean | null };
};

