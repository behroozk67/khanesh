// Manual entry payload (port of Tafsir.jsx buildStructuredTests/buildTestText). Pure: no RN imports, so selfcheck runs it.
// Only the site's own `hard` plausibility bounds are applied here; clinical judgment stays in the engine.
import { toNumber } from "../content/khanesh/digits.js";
import { CATS, REF, SECTIONS, URINE_FIELDS, URINE_OPTIONS } from "../content/khanesh/labRefs.js";
import type { ManualInput } from "./api";

type Ref = { label: string; unit: string; cat: string; hard: [number, number]; range: (sex: string | null, months: number | null, o: { pregnant: boolean }) => { low: number; high: number } };
export const REFS = REF as unknown as Record<string, Ref>;
export { CATS, SECTIONS, URINE_FIELDS, URINE_OPTIONS };

export type ManualErr = { key: string; label: string; value: string | number; min?: number; max?: number; unreadable?: boolean };

/** Engine name: the site strips the Persian parenthetical («Hb (هموگلوبین)» → «Hb») or NAME_MAP misses it. */
export const engineName = (label: string) => label.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();

export function buildManual(vals: Record<string, string>, urine: Record<string, string>, sexFa: "زن" | "مرد" | null, ageYears: number | null, pregnant = false) {
  const sex = sexFa === "زن" ? "female" : sexFa === "مرد" ? "male" : null;
  const months = ageYears == null ? null : ageYears * 12;
  const preg = sex === "female" && pregnant;
  const rows: { k: string; v: number }[] = [];
  const errs: ManualErr[] = [];
  for (const k of Object.keys(REFS)) {
    const raw = vals[k];
    if (raw === undefined || raw.trim() === "") continue;
    const v = toNumber(raw);
    if (Number.isNaN(v)) {
      errs.push({ key: k, label: REFS[k].label, value: raw, unreadable: true });
      continue;
    }
    const [min, max] = REFS[k].hard;
    if (v < min || v > max) {
      errs.push({ key: k, label: REFS[k].label, value: v, min, max });
      continue;
    }
    rows.push({ k, v });
  }
  const urineRows = (URINE_FIELDS as { k: string; label: string; name: string; unit?: string }[]).filter((f) => urine[f.k]?.trim());
  const input: ManualInput = {
    tests: [
      ...rows.map((r) => ({ key: r.k, name: engineName(REFS[r.k].label), value: r.v, unit: REFS[r.k].unit })),
      ...urineRows.map((f) => ({ key: f.k, name: f.name, value: urine[f.k].trim(), unit: f.unit ?? "", kind: "urine" as const })),
    ],
    testResults: [
      ...rows.map((r) => {
        const m = REFS[r.k];
        const ref = m.range(sex, months, { pregnant: preg });
        return `${m.label}: ${r.v} ${m.unit} (محدوده طبیعی: ${ref.low}-${ref.high})`;
      }),
      ...urineRows.map((f) => `ادرار — ${f.label}: ${urine[f.k]} ${f.unit ?? ""}`.trim()),
    ].join("\n"),
  };
  return { input, errs, count: input.tests.length };
}
