/** Clave de sessionStorage con el orden de jugadores de la lista de pagos. */
export const PLAYER_ORDER_KEY = "payments:player-order";

export type OrderedPlayer = { id: string; name: string };

export function readPlayerOrder(): OrderedPlayer[] {
  try {
    const raw = sessionStorage.getItem(PLAYER_ORDER_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? (parsed as OrderedPlayer[]) : [];
  } catch {
    return [];
  }
}
