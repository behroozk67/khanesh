// P150 (۲۰۲۶-۱۱-۱۶): برگهٔ «مرد ۴۷ ساله، قند ۴۸۵، کتون ۳+، TG ۱۱۵۰، آمیلاز ۱۴۵»، با نام‌های چاپ‌شدهٔ همان جاب (extracted_tests).
//   زیرِ blockerِ DKA، lipid_profile و pancreas_pattern هر دو حذف می‌شدند و TG ۱۱۵۰ «توضیحِ آماده نداریم» می‌گرفت (N59).
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const T = (name, value, reference) => ({ name, value, ...(reference ? { reference } : {}) });
const M47 = { age: 47, sex: "M" };
const SHEET = (tg = "1150 mg/dL") => [
  T("FBS", "485 mg/dL", "70 - 100"), T("HbA1c", "11.8 %", "4.0 - 5.6"), T("Sodium (Na)", "124 mmol/L", "135 - 145"),
  T("Potassium (K)", "5.9 mmol/L", "3.5 - 5.1"), T("Creatinine", "1.6 mg/dL", "0.7 - 1.3"), T("Triglycerides", tg, "< 150"),
  T("Amylase", "145 U/L", "28 - 100"), T("Lipase", "42 U/L", "13 - 60"),
  T("Glucose (Urine)", "4+", "Negative"), T("Ketone (Urine)", "3+", "Negative"),
];
const run = (tests) => { const e = runEngine({ tests, patient: M47 }); return { e, p: runPatterns(e) }; };
const shown = (p) => p.findings.map((f) => f.rule_id);

test("P150-1: زیرِ blockerِ DKA، TG ≥ ۵۰۰ و آمیلازِ بالا کامل می‌مانند و به هم وصل‌اند؛ TG بی‌صاحب نیست", () => {
  const { p } = run(SHEET());
  assert.ok(shown(p).includes("dka_pattern"));
  assert.ok(shown(p).includes("lipid_profile"), shown(p).join());
  assert.ok(shown(p).includes("pancreas_pattern"), shown(p).join());
  assert.ok(!p.suppressed_ids.includes("lipid_profile") && !p.suppressed_ids.includes("pancreas_pattern"), p.suppressed_ids.join());
  const lip = p.findings.find((f) => f.rule_id === "lipid_profile").must_say;
  const pan = p.findings.find((f) => f.rule_id === "pancreas_pattern").must_say;
  for (const s of [lip, pan]) { assert.match(s, /1150/); assert.match(s, /آمیلاز 145/); assert.match(s, /لیپازِ طبیعی/); }
  assert.equal(p.findings[0].rule_id, "dka_pattern", "فوریت و ترتیبِ اورژانس دست‌نخورده");
});

test("P150-2: TG زیرِ ۵۰۰ یا بدونِ آنزیمِ بالا، جمله نمی‌آید و رفتارِ قبلی می‌ماند", () => {
  const low = run(SHEET("450 mg/dL")).p;
  assert.ok(low.suppressed_ids.includes("lipid_profile"), "TG 450 هنوز زیرِ blocker پنهان است: " + low.suppressed_ids.join());
  const noAmy = run(SHEET().filter((t) => !/Amylase/.test(t.name))).p;
  const lip = noAmy.findings.find((f) => f.rule_id === "lipid_profile")?.must_say ?? "";
  assert.doesNotMatch(lip, /هم‌زمان بالاست/);
});

// P151 (ایرادِ ۲ همان برگه): پتاسیمِ ۵٫۹ کنارِ DKA «شاید همولیز» و «۲۴ تا ۴۸ ساعت» می‌گرفت، زیرِ «همین حالا اورژانس».
import { buildEngineRecommendations } from "./prompt.js";
test("P151-1: پتاسیمِ بالای غیربحرانی کنارِ DKA همولیز را ادعا نمی‌کند و زمانِ ۲۴–۴۸ ساعت نمی‌دهد", () => {
  const { e, p } = run(SHEET());
  const k = p.findings.find((f) => f.rule_id === "potassium_critical");
  const txt = [k.must_say, k.brief, ...(k.warnings ?? [])].join(" ");
  assert.match(k.must_say, /کاذب فرض نکنید/);
  assert.doesNotMatch(txt, /همولیز/);
  const recs = buildEngineRecommendations(p, e).join(" | ");
  assert.doesNotMatch(recs, /همولیز|۲۴ تا ۴۸/);
  assert.match(recs, /همین حالا به اورژانس/);
});
test("P151-2: همان پتاسیم بی‌DKA رفتارِ قبلی (همولیز + ۲۴–۴۸ ساعت) را می‌گیرد", () => {
  const { e, p } = run([T("Potassium (K)", "5.9 mmol/L", "3.5 - 5.1")]);
  const recs = buildEngineRecommendations(p, e).join(" | ");
  assert.match(recs, /همولیز/);
  assert.match(recs, /۲۴ تا ۴۸/);
});
