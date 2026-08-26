/** Lightweight fuzzy match — no extra dependency. */

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Score how well `query` matches `text`. Higher is better; 0 = no match. */
export function fuzzyScore(text: string, query: string): number {
  const t = normalize(text);
  const q = normalize(query);
  if (!q) return 1;
  if (!t) return 0;

  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 70;

  // Subsequence: characters of q appear in order in t
  let ti = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  let matched = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = false;
    while (ti < t.length) {
      if (t[ti] === ch) {
        found = true;
        matched++;
        consecutive++;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
        ti++;
        break;
      }
      consecutive = 0;
      ti++;
    }
    if (!found) return 0;
  }

  const coverage = matched / q.length;
  return Math.round(40 * coverage + 20 * (maxConsecutive / q.length));
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string | string[]
): T[] {
  const q = query.trim();
  if (!q) return items;

  const scored = items
    .map((item) => {
      const fields = getText(item);
      const texts = Array.isArray(fields) ? fields : [fields];
      const score = Math.max(...texts.map((t) => fuzzyScore(t, q)));
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.item);
}
