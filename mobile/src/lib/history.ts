// On-device analysis history: pure functions only (persistence lives in store.ts) so selfcheck.ts
// can run them under plain Node. Dedupe mirrors khanesh/src/scoreHistory.js.
import type { Engine, EngineTest } from "./engine";

export type HistoryRecord = {
  id: string;
  at: string;
  sampleDate: string | null;
  sig: string;
  patient: { age: string | null; sex: string | null; conditions?: string[]; pregnant?: boolean; gestWeeks?: number };
  result: { _engine?: Engine; extracted_tests?: unknown[]; has_critical?: boolean; [k: string]: unknown };
};

export const MAX_RECORDS = 50;
const YEAR_MS = 365 * 24 * 3600 * 1000;

/** djb2, same as the site's hashStr — a sheet signature, not cryptography. */
export function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Signature from the values read off the sheet, never from the score (scoreHistory.js v3). */
export function sheetSig(result: HistoryRecord["result"]): string {
  const ex = Array.isArray(result.extracted_tests) && result.extracted_tests.length ? result.extracted_tests : result._engine?.tests ?? [];
  return hashStr(
    (ex as { name?: string; key?: string; value?: unknown }[])
      .map((t) => `${t.name ?? t.key}:${t.value}`)
      .sort()
      .join("|"),
  );
}

export const recordDate = (r: HistoryRecord) => r.sampleDate ?? r.at;
const time = (r: HistoryRecord) => Date.parse(recordDate(r)) || 0;

/** Adds or replaces (same sample date or same signature = same sheet). Returns the new list, oldest first. */
export function upsert(list: HistoryRecord[], rec: HistoryRecord): HistoryRecord[] {
  const same = (r: HistoryRecord) => r.sig === rec.sig || (!!rec.sampleDate && r.sampleDate === rec.sampleDate);
  const old = list.find(same);
  const next = [...list.filter((r) => !same(r)), old ? { ...rec, id: old.id, at: old.at } : rec];
  return next.sort((a, b) => time(a) - time(b)).slice(-MAX_RECORDS);
}

export type TrendPoint = { date: string; value: number; id: string };

/** Score of the 5 most recent analyses within 365 days of `now`, ascending. */
export function scoreTrend(list: HistoryRecord[], now = Date.now()): TrendPoint[] {
  return list
    .filter((r) => r.result._engine?.score?.value != null && now - time(r) <= YEAR_MS)
    .sort((a, b) => time(a) - time(b))
    .slice(-5)
    .map((r) => ({ date: recordDate(r), value: r.result._engine!.score!.value!, id: r.id }));
}

// Urine rows ("+2", "10-15") are descriptive: parseFloat would turn them into a fake number (the server keeps URINE_* out of its history too).
const isQualitative = (key: string) => key.startsWith("URINE_");

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
  return Number.isFinite(n) ? n : null;
};

/** Parses a printed range like «12 - 16» into [low, high]; one-sided ranges give null. */
export function parseRange(r?: string): [number, number] | null {
  const m = String(r ?? "").match(/(-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

export type SeriesPoint = { date: string; value: number; unit: string; range: [number, number] | null; t: EngineTest };

/** Numeric values of one engine key across records, ascending; only the latest unit's points. */
export function testSeries(list: HistoryRecord[], key: string): { points: SeriesPoint[]; droppedUnits: boolean } {
  const all: SeriesPoint[] = [];
  for (const r of [...list].sort((a, b) => time(a) - time(b))) {
    const t = r.result._engine?.tests?.find((x) => x.key === key);
    const v = isQualitative(key) ? null : num(t?.value);
    if (t && v != null) all.push({ date: recordDate(r), value: v, unit: t.unit ?? "", range: parseRange(t.range), t });
  }
  const unit = all.at(-1)?.unit;
  const points = all.filter((p) => p.unit === unit);
  return { points, droppedUnits: points.length < all.length };
}

/** Tests that appear with a numeric value in at least one record: key → display name (latest). */
export function knownTests(list: HistoryRecord[]): { key: string; name: string; count: number }[] {
  const m = new Map<string, { key: string; name: string; count: number }>();
  for (const r of list)
    for (const t of r.result._engine?.tests ?? [])
      if (!isQualitative(t.key) && num(t.value) != null) m.set(t.key, { key: t.key, name: t.name, count: (m.get(t.key)?.count ?? 0) + 1 });
  return [...m.values()].sort((a, b) => b.count - a.count);
}

export type Overview = {
  score: number | null;
  phenoDelta: number | null;
  abnormal: number;
  noVerdict: number;
  total: number;
  daysSince: number;
};

export function overview(list: HistoryRecord[], now = Date.now()): Overview | null {
  const last = [...list].sort((a, b) => time(a) - time(b)).at(-1);
  if (!last) return null;
  const e = last.result._engine ?? {};
  const tests: EngineTest[] = e.tests ?? [];
  // Same three buckets as bucketTests() (lib/buckets.ts) — selfcheck pins both together. Inline here so this
  // pure module keeps only its type-only engine import and `node src/lib/selfcheck.ts` can run it.
  const critical = (t: EngineTest) => t.level === "critical";
  const abnormal = tests.filter((t) => t.abnormal === true || critical(t)).length;
  const noVerdict = tests.filter((t) => t.abnormal !== true && t.abnormal !== false && !critical(t)).length;
  return {
    score: e.score?.value ?? null,
    phenoDelta: e.phenoAge?.deltaYears ?? null,
    abnormal,
    noVerdict,
    total: tests.length,
    daysSince: Math.max(0, Math.floor((now - Date.parse(last.at)) / (24 * 3600 * 1000))),
  };
}

/**
 * Which chart value labels fit without overlapping (points are oldest → newest; x/y are the label's centre).
 * Newest, highest and lowest are placed first so the numbers that matter survive a dense chart.
 */
export function pickLabels(pts: { x: number; y: number; value: number }[], w = 38, h = 16): boolean[] {
  const newestFirst = pts.map((_, i) => pts.length - 1 - i);
  const byValue = [...newestFirst].sort((a, b) => pts[b].value - pts[a].value);
  const order = [...new Set([newestFirst[0], byValue[0], byValue[byValue.length - 1], ...newestFirst])];
  const shown = pts.map(() => false);
  for (const i of order) {
    if (i === undefined) continue;
    shown[i] = !pts.some((q, j) => shown[j] && Math.abs(q.x - pts[i].x) < w && Math.abs(q.y - pts[i].y) < h);
  }
  return shown;
}
