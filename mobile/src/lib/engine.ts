import { BAND_TONE as SITE_BAND_TONE, NO_SCORE_FA, scoreTone as siteScoreTone, TONE_WORD as SITE_TONE_WORD } from "../content/khanesh/resultModel.js";
import { CATEGORY_ORDER, categoryOf } from "../content/khanesh/testCategories.js";

// Typed views of the server's `_engine` (contract: specs/001-health-app-upgrade/contracts/engine-result.md).
// Persian strings and tone rules are copied from khanesh/src/resultModel.js — nothing is judged here.
export type EngineTest = {
  key: string;
  name: string;
  value: number | string;
  range?: string;
  unit?: string;
  fa?: string;
  abnormal?: boolean;
  dir?: string;
  level?: string;
  nearLimit?: boolean;
};

// Result order: blood (CBC, iron, coagulation) → biochemistry → hormones → vitamins → the rest (urine last).
// Display order only; a key's category comes from the site's testCategories.js. Stable, so the server's order holds inside a category.
const SECTION: Record<string, number> = { cbc: 0, iron: 0, coag: 0, glycemia: 1, lipids: 1, kidney: 1, liver: 1, electro: 1, inflam: 1, cardiac: 1, thyroid: 2, serology: 2, vitamin: 3 };
const catOf = (key: string) => (key.startsWith("URINE_") ? "urine" : categoryOf(key));
// 0 blood, 1 biochemistry, 2 hormone + immunology, 3 vitamin, 4 urine, 5 the rest.
export const sectionOf = (key: string) => (key.startsWith("URINE_") ? 4 : SECTION[categoryOf(key)] ?? 5);
const rankOf = (key: string) => sectionOf(key) * 100 + CATEGORY_ORDER.indexOf(categoryOf(key));
export const bySection = (tests: EngineTest[]) => [...tests].sort((a, b) => rankOf(a.key) - rankOf(b.key));

const LATIN_WORD = /[A-Za-z][A-Za-z0-9-]+/g;
const mentions = (p: string, t: EngineTest) =>
  !!t.name && ((/[^\u0000-\u007f]/.test(t.name) && p.includes(t.name)) || (t.name.match(LATIN_WORD) ?? []).some((w) => new RegExp(`(?<![A-Za-z0-9])${w}(?![A-Za-z0-9])`).test(p)));

/** Category a paragraph is about (a testCategories key, or "urine"): the one whose tests it mentions most — by the engine's Persian `name` or its Latin part («CRP»); null when none. */
export function topicOf(p: string, tests: EngineTest[]): string | null {
  const n = new Map<string, number>();
  for (const t of tests) if (mentions(p, t)) n.set(catOf(t.key), (n.get(catOf(t.key)) ?? 0) + 1);
  let best: string | null = null;
  for (const [k, c] of n) if (best == null || c > n.get(best)!) best = k;
  return best;
}

// Five-zone band, low → high: red | yellow | green | yellow | red. Zone widths (fractions) and their order.
export const ZONES = [
  { tone: "bad", w: 0.12 },
  { tone: "warn", w: 0.18 },
  { tone: "good", w: 0.4 },
  { tone: "warn", w: 0.18 },
  { tone: "bad", w: 0.12 },
] as const;

/**
 * Where a result sits on the band: the zone comes only from the engine's verdict (abnormal/dir/level; red is
 * `critical` only, matching the row's colour), never from a threshold here. Inside green, the printed range
 * places the marker; outside it, the engine's severity level does. Null when the engine gave no verdict.
 */
export function bandOf(t: EngineTest, range: [number, number] | null): { zone: number; pos: number } | null {
  const v = typeof t.value === "number" ? t.value : parseFloat(String(t.value));
  const at = (zone: number, f: number) => {
    const start = ZONES.slice(0, zone).reduce((s, z) => s + z.w, 0);
    return { zone, pos: start + ZONES[zone].w * Math.min(0.9, Math.max(0.1, f)) };
  };
  // Safety net for a classifier that is abnormal but sends no `dir`: the side is then only where the number sits
  // against the printed range; the verdict itself still comes from the engine.
  const dir = t.dir ?? (t.abnormal && range && Number.isFinite(v) ? (v <= range[0] ? "low" : v >= range[1] ? "high" : undefined) : undefined);
  const high = dir === "high";
  const sided = high || dir === "low";
  if (t.level === "critical") return sided ? at(high ? 4 : 0, 0.5) : null;
  if (t.abnormal === false) {
    const f = range && Number.isFinite(v) && range[1] > range[0] ? (v - range[0]) / (range[1] - range[0]) : 0.5;
    return at(2, f);
  }
  if (!t.abnormal || !sided) return null;
  // Further from green as the engine's level rises (mild → moderate → marked).
  const out = t.level === "marked" ? 0.85 : t.level === "moderate" ? 0.5 : 0.15;
  return at(high ? 3 : 1, high ? out : 1 - out);
}

export type ScoreSystem = { id: string; fa: string; score: number | null; critical: boolean; worst?: { key: string; name: string } | null };

export type Score = {
  version: number;
  value: number | null;
  band: "high" | "mid" | "low" | null;
  reason: "neonate" | "emergency" | "too_few" | "one_system" | null;
  systems?: ScoreSystem[];
  counted?: number;
  total?: number;
};

export type PhenoAge = { years: number; chronoAge: number; deltaYears: number; capped: boolean };

export type Engine = {
  urgency?: string;
  critical_banner?: { title: string; body: string } | null;
  context?: {
    sex?: string;
    age_text?: string;
    sample_date?: string;
    pregnant?: boolean;
    gest_weeks?: number | null;
    conditions_applied?: { id: string; fa: string }[];
  };
  tests?: EngineTest[];
  score?: Score | null;
  phenoAge?: PhenoAge | null;
};

// Shared with the site: generated copy of resultModel.js (scripts/sync-content.mjs), so these never drift.
export { EMERGENCY_BANNER, DISCLAIMER_FA, RADAR_MIN_SYSTEMS } from "../content/khanesh/resultModel.js";
export type Tone = "good" | "warn" | "bad" | "none";
export const BAND_TONE = SITE_BAND_TONE as Record<"high" | "mid" | "low", Tone>;
export const TONE_WORD = SITE_TONE_WORD as Record<Tone, string>;
export const scoreTone = (s: number | null, critical: boolean) => siteScoreTone(s, critical) as Tone;

export function noScoreText(score: Score): string | null {
  if (!score.reason) return null;
  const t = NO_SCORE_FA[score.reason];
  if (typeof t !== "function") return t ?? null;
  return t((score.systems ?? []).filter((x) => x.score != null).map((x) => x.fa).join("، "));
}

/** Overall tone of the sheet score — RadarCard in ResultDashboard.jsx: the server band, else the system-score rule. */
export function overallTone(score: Score): Tone {
  if (score.value == null) return "none";
  return score.band ? BAND_TONE[score.band] : scoreTone(score.value, false);
}

// Model/engine-written text, rendered as-is (khanesh ResultView.jsx). Server output may be any JSON shape (asText/asList).
const asText = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
};

export type Interpretation = { summary: string; paragraphs: string[]; recommendations: string[] };

/**
 * Patient-facing text of a result. Graph path: labmat.patientSection. Classic path: summary + interpretation +
 * general_recommendations. `labmat.doctorSection` is model-written and never shown (frontend.md: expert view).
 */
// In RTL text a Latin name with its number and unit («CEA 27.97 ng/mL», «CA 15-3», «11–14») gets shuffled around the Persian words;
// isolating each such run as one LTR unit keeps it as written. Trailing punctuation stays outside. Display only.
const TOKEN = "[A-Za-z0-9µ][A-Za-z0-9µ.,/%×^\\-–]*";
const LATIN_RUN = new RegExp(`${TOKEN}(?:\\s+(?:[–-]\\s+)?${TOKEN})*`, "g");
const isolateRanges = (t: string) =>
  t.replace(LATIN_RUN, (m) => {
    const tail = m.match(/[.,\-–]+$/)?.[0] ?? "";
    return `⁦${m.slice(0, m.length - tail.length)}⁩${tail}`;
  });

export function interpretationOf(result: { [k: string]: unknown }): Interpretation {
  const labmat = result.labmat as { patientSection?: unknown } | undefined;
  const split = (t: string) => t.split(/\r?\n\s*\r?\n/).map((x) => isolateRanges(x.trim())).filter(Boolean);
  const recs = Array.isArray(result.general_recommendations) ? result.general_recommendations : result.general_recommendations ? [result.general_recommendations] : [];
  if (labmat) return { summary: "", paragraphs: split(asText(labmat.patientSection)), recommendations: [] };
  return { summary: isolateRanges(asText(result.summary)), paragraphs: split(asText(result.interpretation)), recommendations: recs.map(asText).filter(Boolean).map(isolateRanges) };
}

/** «تفسیر بر پایهٔ: …» — ContextLine in ResultView.jsx: only what the engine reports it used. */
export function contextLine(ctx: Engine["context"]): string | null {
  if (!ctx) return null;
  const parts = [
    ctx.sex && asText(ctx.sex),
    ctx.age_text && asText(ctx.age_text),
    ctx.pregnant && (ctx.gest_weeks != null ? `باردار، هفتهٔ ${String(ctx.gest_weeks).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d])}` : "باردار"),
    ...(Array.isArray(ctx.conditions_applied) ? ctx.conditions_applied.map((c) => asText(c?.fa)) : []),
  ].filter(Boolean);
  return parts.length ? parts.join("، ") : null;
}
