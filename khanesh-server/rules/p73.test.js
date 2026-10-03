// ============================================================
// p73.test.js — P73: ۱۲ شکافِ پوششِ تک‌آزمایشی (patterns_p73_gaps.js)
// ------------------------------------------------------------
// فایلِ جدا برای این‌که با engine.test.js (که جلسه‌های دیگر هم در آن می‌نویسند) تداخل نکند؛ node --test همه را برمی‌دارد.
// 🔴 پیش از P73 (اندازه‌گیری‌شده، probe.mjs، ۲۰۲۶-۱۰-۰۳): هر ۱۲ پنل فقط `unmatched_abnormal` («توضیحِ آماده نداریم») می‌گرفتند.
// هر تست روی کدِ بی‌ماژول قرمز است (stash شد؛ خروجی در گزارشِ جلسه).
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns, RULES } from "./patterns.js";
import { buildEngineRecommendations } from "./prompt.js";
import { GUIDELINE_IDS } from "./guidelines.js";
import { RULES_P73_GAPS, P73_OWNERS } from "./patterns_p73_gaps.js";

const run = (tests, patient = { age: 45, sex: "M" }) => {
  const e = runEngine({ patient, tests });
  const p = runPatterns(e);
  return { e, p, recs: buildEngineRecommendations(p, e) };
};
const ids = (r) => r.p.findings.map((f) => f.rule_id);
const text = (r) => [...r.p.findings.flatMap((f) => [f.headline, f.must_say, f.action, ...(f.warnings ?? [])]), ...r.recs].join(" ");
const one = (r, id) => r.p.findings.find((f) => f.rule_id === id);

// پنلِ هر ۱۲ مورد: [برچسب، آزمایش‌ها، شناسهٔ یافته، عددی که باید در متن بیاید]
const PANELS = [
  ["HCT↑", [{ name: "HCT", value: "65", unit: "%" }], "hct_rbc_high", "65"],
  ["RBC↑", [{ name: "RBC", value: "7.7" }], "hct_rbc_high", "7.7"],
  ["BILI_T↑", [{ name: "Bilirubin Total", value: "12", unit: "mg/dL" }], "bilirubin_total_alone", "12"],
  ["CK↑", [{ name: "CK", value: "1700", unit: "U/L" }], "ck_elevated_alone", "1700"],
  ["ALB↓", [{ name: "Albumin", value: "1.95", unit: "g/dL" }], "albumin_low_alone", "1.95"],
  ["FERRITIN↑", [{ name: "Ferritin", value: "3000", unit: "ng/mL" }], "iron_markers_high", "3000"],
  ["TSAT↑", [{ name: "TSAT", value: "71", unit: "%" }], "iron_markers_high", "71"],
  ["T4↑", [{ name: "T4", value: "16", unit: "ug/dL" }], "total_t4_abnormal", "16"],
  ["T4↓", [{ name: "T4", value: "3", unit: "ug/dL" }], "total_t4_abnormal", "3"],
  ["HCO3↓", [{ name: "HCO3", value: "15", unit: "mmol/L" }], "bicarbonate_low_moderate", "15"],
  ["PCT↑", [{ name: "Procalcitonin", value: "1.0", unit: "ng/mL" }], "pct_intermediate", "1"],
  ["NH3↑", [{ name: "Ammonia", value: "90", unit: "umol/L" }], "ammonia_mild_high", "90"],
  ["Hb↓ تنها", [{ name: "Hb", value: "9.6", unit: "g/dL" }], "anemia_hb_alone", "9.6"],
];

test("M313: همهٔ ده قاعده در RULES هستند و هر شناسهٔ مالک وجود دارد (مالکِ ناموجود = تسلیمِ بی‌صدا)", () => {
  const all = new Set(RULES.map((r) => r.id));
  for (const r of RULES_P73_GAPS) assert.ok(all.has(r.id), `قاعده در RULES نیست: ${r.id}`);
  for (const [k, list] of Object.entries(P73_OWNERS)) for (const id of list) assert.ok(all.has(id), `مالکِ ناموجود در ${k}: ${id}`);
  assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length, "شناسهٔ تکراری");
});

test("M314: هر ۱۲ پنل یک یافتهٔ اختصاصی می‌گیرد؛ نه «توضیح نداریم»، نه دو یافته دربارهٔ یک عدد؛ عددِ برگه در متن؛ منبعِ ثبت‌شده", () => {
  for (const [label, rows, id, num] of PANELS) {
    const r = run(rows);
    assert.deepEqual(ids(r), [id], `${label}: ${ids(r)}`);
    const f = one(r, id);
    assert.ok(f.must_say.includes(num), `${label}: عددِ ${num} در متن نیامد`);
    assert.ok(!/unmatched|unexplained/.test(ids(r).join()), label);
    assert.ok(f.sources?.length && f.sources.every((s) => GUIDELINE_IDS.has(s)), `${label}: منبعِ ثبت‌نشده ${f.sources}`);
    assert.ok(!/\b(HGB|BILI_T|FERRITIN|PCT_SEPSIS|NH3|HCO3|TSAT)\b/.test(text(r)), `${label}: کلیدِ خام در متنِ بیمار`);
    assert.ok(r.recs.length > 0, label);
  }
});

test("M315: فوریت از خودِ عدد/منبع می‌آید و با جملهٔ action یکی است (N20)", () => {
  const urg = (rows, id, patient) => one(run(rows, patient), id);
  assert.equal(urg([{ name: "HCT", value: "65", unit: "%" }], "hct_rbc_high").urgency, "this_week");
  assert.equal(urg([{ name: "RBC", value: "7.7" }], "hct_rbc_high").urgency, "routine");
  // CK: ۵×ULN (۱۷۰×۵ = ۸۵۰)؛ ۱۷۰۰ بالا، ۳۰۰ پایین
  const big = urg([{ name: "CK", value: "1700", unit: "U/L" }], "ck_elevated_alone");
  assert.equal(big.urgency, "this_week"); assert.match(big.must_say, /رابدومیولیز/); assert.ok(big.warnings.some((w) => /ادرارِ تیره/.test(w)));
  const small = urg([{ name: "CK", value: "300", unit: "U/L" }], "ck_elevated_alone");
  assert.equal(small.urgency, "routine"); assert.doesNotMatch(small.must_say, /رابدومیولیز/); assert.equal(small.warnings.length, 0);
  // HCO3: < ۱۸ این هفته، ۲۰ عادی
  assert.equal(urg([{ name: "HCO3", value: "15", unit: "mmol/L" }], "bicarbonate_low_moderate").urgency, "this_week");
  assert.equal(urg([{ name: "HCO3", value: "20", unit: "mmol/L" }], "bicarbonate_low_moderate").urgency, "routine");
  // هیچ یافتهٔ routine از «این هفته/همین» حرف نمی‌زند و هیچ یافتهٔ this_week «نوبت عادی» نمی‌گوید
  for (const [label, rows, id] of PANELS) {
    const f = one(run(rows), id);
    if (f.urgency === "routine") assert.doesNotMatch(f.action, /این هفته|همین/, label);
    if (f.urgency === "this_week") assert.doesNotMatch(f.action, /نوبتِ عادی/, label);
  }
});

test("M316: واگذاری به مالک — وقتی مالکِ قبلی فعال است، قاعدهٔ P73 خاموش می‌ماند و فقط یک یافته دربارهٔ آن عدد هست (N20)", () => {
  const not = (r, id) => assert.ok(!ids(r).includes(id), `${id} نباید فعال می‌شد: ${ids(r)}`);
  // Hb 17 مرد (آستانهٔ WHO ۱۶٫۵) + HCT ⇒ erythrocytosis_who_screen مالک است
  let r = run([{ name: "Hb", value: "17.2", unit: "g/dL" }, { name: "HCT", value: "52", unit: "%" }]);
  assert.ok(ids(r).includes("erythrocytosis_who_screen")); not(r, "hct_rbc_high");
  // بیلی‌روبین ۱۸ ⇒ اورژانس مالک است
  r = run([{ name: "Bilirubin Total", value: "18", unit: "mg/dL" }]); assert.ok(ids(r).includes("bilirubin_emergency")); not(r, "bilirubin_total_alone");
  // HCO3 ۸ ⇒ severe_acidosis
  r = run([{ name: "HCO3", value: "8", unit: "mmol/L" }]); assert.ok(ids(r).includes("severe_acidosis")); not(r, "bicarbonate_low_moderate");
  // Hb 6 ⇒ بحرانِ کم‌خونی؛ Hb 9.6 + MCV 70 ⇒ کم‌خونیِ میکروسیتیک
  r = run([{ name: "Hb", value: "6.0", unit: "g/dL" }]); assert.ok(ids(r).includes("severe_anemia_crisis")); not(r, "anemia_hb_alone");
  r = run([{ name: "Hb", value: "9.6", unit: "g/dL" }, { name: "MCV", value: "70", unit: "fL" }]); not(r, "anemia_hb_alone");
  // PCT 3 ⇒ sepsis_markers
  r = run([{ name: "Procalcitonin", value: "3.0", unit: "ng/mL" }]); assert.ok(ids(r).includes("sepsis_markers")); not(r, "pct_intermediate");
  // NH3 150 ⇒ hyperammonemia
  r = run([{ name: "Ammonia", value: "150", unit: "umol/L" }]); assert.ok(ids(r).includes("hyperammonemia")); not(r, "ammonia_mild_high");
  // CK بالا + AST/ALT بالا ⇒ liver_pattern مالکِ CK (muscle_origin)
  r = run([{ name: "CK", value: "900", unit: "U/L" }, { name: "AST", value: "120", unit: "U/L" }, { name: "ALT", value: "30", unit: "U/L" }]);
  not(r, "ck_elevated_alone");
});

test("M317: جمله‌ای که از آزمایشِ دیگر حرف می‌زند سه‌حالته است — غایب «روی برگه نیست»، طبیعی «طبیعی است»، غیرطبیعی با جهت (N4)", () => {
  // HCT بالا: هموگلوبین غایب / طبیعی
  let f = one(run([{ name: "HCT", value: "55", unit: "%" }]), "hct_rbc_high");
  assert.match(f.must_say, /هموگلوبین روی این برگه نیست/);
  f = one(run([{ name: "HCT", value: "55", unit: "%" }, { name: "Hb", value: "15", unit: "g/dL" }]), "hct_rbc_high");
  assert.match(f.must_say, /هموگلوبین 15 و در محدودهٔ طبیعی است/);
  // T4 بالا: TSH و FT4 غایب ⇒ دستورِ عادی؛ TSH غیرطبیعی ⇒ بی‌دستور (یافتهٔ thyroid تایم‌لاین می‌دهد، نه دو تایم‌لاین)
  f = one(run([{ name: "T4", value: "16", unit: "ug/dL" }]), "total_t4_abnormal");
  assert.match(f.must_say, /TSH روی این برگه نیست/); assert.match(f.must_say, /FT4 روی این برگه نیست/); assert.match(f.action, /TSH و FT4/);
  const withTsh = run([{ name: "T4", value: "16", unit: "ug/dL" }, { name: "TSH", value: "0.05" }]);
  assert.equal(one(withTsh, "total_t4_abnormal").action, "");
  assert.match(one(withTsh, "total_t4_abnormal").must_say, /TSH 0.05 است و پایین‌تر/);
  // T4 با بارداری
  f = one(run([{ name: "T4", value: "16", unit: "ug/dL" }], { age: 30, sex: "F", pregnant: true }), "total_t4_abnormal");
  assert.match(f.must_say, /چون باردار هستید/);
  // Hb↓ تنها: MCV غایب گفته می‌شود
  f = one(run([{ name: "Hb", value: "9.6", unit: "g/dL" }]), "anemia_hb_alone");
  assert.match(f.must_say, /MCV\) روی این برگه نیست/); assert.match(f.must_say, /فریتین روی این برگه نیست/);
  // CK بالا: کراتینین غایب / بالا
  f = one(run([{ name: "CK", value: "1700", unit: "U/L" }]), "ck_elevated_alone"); assert.match(f.must_say, /کراتینین[^.]*روی این برگه نیست/);
});

test("M318: آهن — آستانهٔ EASL به جنس بسته است؛ جنسِ نامعلوم هیچ آستانه‌ای نمی‌سنجد؛ فریتین تنها این هفته نیست (P73)", () => {
  const both = [{ name: "Ferritin", value: "800", unit: "ng/mL" }, { name: "TSAT", value: "70", unit: "%" }];
  let f = one(run(both, { age: 50, sex: "M" }), "iron_markers_high");
  assert.equal(f.urgency, "this_week"); assert.match(f.must_say, /اشباعِ ترانسفرین > 50٪ و فریتین > 300/); assert.ok(f.suggest.includes("ژن HFE (هموکروماتوز)"));
  f = one(run(both, { age: 50, sex: "F" }), "iron_markers_high");
  assert.equal(f.urgency, "this_week"); assert.match(f.must_say, /اشباعِ ترانسفرین > 45٪ و فریتین > 200/);
  // جنسِ نامعلوم: بالای بازه هست ولی آستانه سنجیده نمی‌شود
  f = one(run(both, { age: 50 }), "iron_markers_high");
  assert.equal(f.urgency, "routine"); assert.match(f.must_say, /جنسِ شما روی برگه معلوم نیست/); assert.doesNotMatch(f.must_say, /بارِ آهنِ احتمالی \(مثلاً/);
  // فریتین تنها (۳۰۰۰): routine، بدون ادعای بارِ آهن؛ TSATِ غایب گفته می‌شود
  f = one(run([{ name: "Ferritin", value: "3000", unit: "ng/mL" }]), "iron_markers_high");
  assert.equal(f.urgency, "routine"); assert.match(f.must_say, /اشباعِ ترانسفرین روی این برگه نیست/); assert.doesNotMatch(f.must_say, /بارِ آهنِ احتمالی/);
});

test("M319: فهرستِ مرجعِ منابع — هر منبعِ P73 با عددِ خودش در دفتر هست و منبعِ ثانویه صریحاً برچسب خورده (G6)", async () => {
  const { GUIDELINES } = await import("./guidelines.js");
  for (const id of ["WHO_MPN_2016", "EASL_HH_2022", "AASLD_EASL_HE_2014", "BRAHMS_PCT", "SOETERS_HYPOALB_2019", "ETA_SCH_2013"]) {
    assert.ok(GUIDELINES[id]?.url?.startsWith("https://"), id);
  }
  // منبعی که فقط از خلاصهٔ ثانویه دیده شد باید در کامنتِ دفتر صراحتاً گفته باشد (خواندنِ فایل، نه حدس)
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./guidelines.js", import.meta.url), "utf8");
  for (const id of ["WHO_MPN_2016", "AASLD_EASL_HE_2014", "SOETERS_HYPOALB_2019"]) {
    const i = src.indexOf(`  ${id}: {`); assert.ok(i > 0, id);
    assert.match(src.slice(i, i + 900), /باز نکردم|ثانویه|خلاصه/, `${id}: برچسبِ «باز نکردم/ثانویه» نیست`);
  }
});

test("M320: CK «critical» همچنان emergency + has_critical است؛ ۵×ULN فقط بالا می‌برد (کفِ فوریت، N29 — بازبینیِ کد، P73)", () => {
  // 🔴 پیش از رفع: CK 3000 و 20000 ⇒ ck_elevated_alone/this_week و has_critical=false، در حالی که تورِ بی‌توضیح emergency می‌داد.
  for (const v of ["3000", "20000"]) {
    const r = run([{ name: "CK", value: v, unit: "U/L" }], { age: 40, sex: "M" });
    const f = one(r, "ck_elevated_alone");
    assert.equal(f.urgency, "emergency", v); assert.equal(r.p.has_critical, true, v);
    assert.match(f.action, /اورژانس/, v);
  }
  // ۱۰۰۰ (۵×ULN رد شده، «critical» نیست) همان this_week؛ ۳۰۰ همان routine
  assert.equal(one(run([{ name: "CK", value: "1000", unit: "U/L" }]), "ck_elevated_alone").urgency, "this_week");
  assert.equal(one(run([{ name: "CK", value: "300", unit: "U/L" }]), "ck_elevated_alone").urgency, "routine");
});

test("M321: آستانهٔ ۱۸ بی‌کربنات فقط برای بزرگسال است؛ کودکِ ۵ ساله با ۱۷٫۵ (زیرِ بازهٔ کودک) routine می‌ماند (N23، P73)", () => {
  const f = (age) => one(run([{ name: "HCO3", value: "17.5", unit: "mmol/L" }], { age, sex: "M" }), "bicarbonate_low_moderate");
  assert.equal(f(5).urgency, "routine"); assert.doesNotMatch(f(5).action, /این هفته/);
  assert.equal(f(30).urgency, "this_week");
});
