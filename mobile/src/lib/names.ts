/** Catalog names are "English (فارسی)" or "فارسی (English)": returns [Persian name, English badge or null]. */
export function splitName(n: string): [string, string | null] {
  const m = n.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (!m) return [n, null];
  const fa = /[؀-ۿ]/;
  if (fa.test(m[2])) return [m[2], m[1]];
  if (fa.test(m[1])) return [m[1], m[2]];
  return [n, null];
}
