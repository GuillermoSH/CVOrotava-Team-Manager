/**
 * Logros «nuevos»: los desbloqueados desde la última vez que se abrió la pestaña.
 * La primera vez (sin nada guardado) no se marca ninguno, para no inundar de «Nuevo».
 */
export function newlyUnlocked(unlockedIds: string[], seen: string[] | null): string[] {
  if (seen === null) return [];
  const known = new Set(seen);
  return unlockedIds.filter((id) => !known.has(id));
}
