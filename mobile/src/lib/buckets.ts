// One split for the result table, the PDF and the history card. A row the engine refused to judge
// (`abnormal: null`: unreadable printed range, tumour marker with no verdict) is NOT "in range" —
// the site's N46 lesson: every `!t.abnormal` reader must give that state its own bucket.
export type TestLike = { abnormal?: boolean | null; level?: string | null };
export type TestBuckets<T extends TestLike> = { out: T[]; noVerdict: T[]; rest: T[] };

export function bucketTests<T extends TestLike>(tests: readonly T[]): TestBuckets<T> {
  const out: T[] = [];
  const noVerdict: T[] = [];
  const rest: T[] = [];
  for (const t of tests) {
    if (t.abnormal === true || t.level === "critical") out.push(t);
    else if (t.abnormal === false) rest.push(t);
    else noVerdict.push(t);
  }
  return { out, noVerdict, rest };
}
