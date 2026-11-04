/**
 * El acta trae a cada jugador solo con dorsal y nombre, sin licencia ni identificador, y quien la rellena
 * escribe el nombre como quiere: «APELLIDO NOMBRE» o «NOMBRE APELLIDO», con o sin tildes, con el segundo
 * apellido o sin él, y a veces con la marca de capitán «(C)». Para no contar a una misma persona varias veces
 * se unen los nombres de un equipo con reglas conservadoras:
 *  1. Mismas palabras en cualquier orden, sin tildes ni signos: es la misma persona.
 *  2. Un nombre cuyas palabras (dos o más) están todas dentro de las de otro (falta un apellido): es la
 *     misma persona solo si ese otro es el único candidato y nunca salen juntos en la plantilla de un partido.
 * Ante la duda no se une: un jugador repetido es mejor que dos personas mezcladas.
 */

const CAPTAIN = /\(\s*c\s*\)/gi;

/** Palabras del nombre en mayúsculas, sin tildes ni signos y sin la marca de capitán. */
export function nameTokens(name: string): string[] {
  return name
    .replace(CAPTAIN, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

const cleanName = (name: string): string => name.replace(CAPTAIN, " ").replace(/\s+/g, " ").trim();

type Identity = { variants: Map<string, number>; tokens: Set<string>; rosters: Set<number>; parent: number | null };

/**
 * Recibe las plantillas (una lista de nombres por partido) de un mismo equipo y devuelve una función que da,
 * para cada nombre escrito en un acta, el nombre con el que mostrar a esa persona: la variante más completa y,
 * entre las que tienen las mismas palabras, la más frecuente.
 */
export function buildNameResolver(rosters: string[][]): (name: string) => string {
  const byKey = new Map<string, number>();
  const ids: Identity[] = [];
  rosters.forEach((names, r) => {
    for (const raw of new Set(names)) {
      const tok = nameTokens(raw);
      if (tok.length === 0) continue;
      const key = [...tok].sort().join(" ");
      let i = byKey.get(key);
      if (i === undefined) {
        i = ids.length;
        byKey.set(key, i);
        ids.push({ variants: new Map(), tokens: new Set(tok), rosters: new Set(), parent: null });
      }
      const id = ids[i];
      const shown = cleanName(raw);
      id.variants.set(shown, (id.variants.get(shown) ?? 0) + 1);
      id.rosters.add(r);
    }
  });

  const root = (i: number): number => (ids[i].parent === null ? i : root(ids[i].parent!));

  // De los nombres más cortos a los más largos: así «A B» entra en «A B C» antes de que este entre en «A B C D»
  const order = ids.map((_, i) => i).sort((a, b) => ids[a].tokens.size - ids[b].tokens.size);
  for (const x of order) {
    const X = ids[x];
    if (X.tokens.size < 2 || X.parent !== null) continue;
    const candidates = new Set<number>();
    ids.forEach((Y, y) => {
      if (y === x || Y.tokens.size <= X.tokens.size) return;
      if ([...X.tokens].every((t) => Y.tokens.has(t))) candidates.add(root(y));
    });
    if (candidates.size !== 1) continue;
    const target = [...candidates][0];
    if (target === x || [...X.rosters].some((r) => ids[target].rosters.has(r))) continue;
    X.parent = target;
    for (const r of X.rosters) ids[target].rosters.add(r);
    for (const [v, n] of X.variants) ids[target].variants.set(v, (ids[target].variants.get(v) ?? 0) + n);
  }

  const displayOf = (i: number): string => {
    const r = root(i);
    const all = new Map<string, number>();
    ids.forEach((id, j) => {
      if (root(j) === r) for (const [v, n] of id.variants) all.set(v, (all.get(v) ?? 0) + n);
    });
    return [...all]
      .sort((a, b) => nameTokens(b[0]).length - nameTokens(a[0]).length || b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  };
  const display = new Map<number, string>();

  return (name: string) => {
    const tok = nameTokens(name);
    const i = tok.length ? byKey.get([...tok].sort().join(" ")) : undefined;
    if (i === undefined) return cleanName(name);
    const r = root(i);
    if (!display.has(r)) display.set(r, displayOf(i));
    return display.get(r)!;
  };
}
