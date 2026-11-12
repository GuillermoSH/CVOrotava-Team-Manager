import type { CSSProperties } from "react";

/** Tope del turno: una lista larga no debe tardar segundos en terminar de aparecer. */
const MAX_TURN = 26;

/**
 * Turno de entrada de una pieza (clases `reveal*` de globals.css). Se numera en el orden en que
 * debe aparecer: arriba→abajo y, en una misma fila, izquierda→derecha.
 */
export function reveal(turn: number): CSSProperties {
  return { "--i": Math.max(0, Math.min(Math.round(turn), MAX_TURN)) } as CSSProperties;
}
