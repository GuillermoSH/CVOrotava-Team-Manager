/**
 * Sets ganados/perdidos desde `matches.result`
 * (formato "X-Y" donde X = nuestros sets, Y = sets rival).
 */
export function parseResultString(result: string | null | undefined): {
  ourSets: number;
  theirSets: number;
} | null {
  if (!result) return null;
  const m = /^\s*(\d+)\s*[-–:]\s*(\d+)\s*$/.exec(result);
  if (!m) return null;
  return { ourSets: Number(m[1]), theirSets: Number(m[2]) };
}
