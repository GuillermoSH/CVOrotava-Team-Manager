export type ExemptPlayerRef = { id: string; full_name: string; user_id: string | null };
export type PendingPaymentRef = { player_id: string | null; user_id: string | null };
export type ExemptWithPending = { playerId: string; name: string; count: number };

/**
 * Exentos que aún tienen pagos pendientes registrados (restos de antes de la exención).
 * No cuentan como deuda, pero conviene limpiarlos. Un pago es del jugador si lleva su
 * `player_id`, o si es antiguo (sin `player_id`) y lleva su `user_id`.
 * Del que más pendientes tiene al que menos; a igualdad, por nombre.
 */
export function exemptWithPending(
  exempt: readonly ExemptPlayerRef[],
  pending: readonly PendingPaymentRef[]
): ExemptWithPending[] {
  return exempt
    .map((player) => ({
      playerId: player.id,
      name: player.full_name,
      count: pending.filter(
        (p) =>
          p.player_id === player.id ||
          (!p.player_id && player.user_id !== null && p.user_id === player.user_id)
      ).length,
    }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}
