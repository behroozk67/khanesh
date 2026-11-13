// P143 (specs/025، Tietz فصل‌های ۲۲/۳۳ — فقط شکاف‌ها). هر تست روی HEAD 2252643 قرمز بود (N10).
//   US1: بیمارِ دیابتیِ گزارش‌شده (dm2) — هدفِ درمان، نه تشخیص؛ فوریت دست‌نخورده
//   US2: انسولین و سی‌پپتید خوانده می‌شوند؛ انسولینِ مهارنشده در قندِ پایین
//   US3: HbA1c زیرِ ۴ مالک دارد، بالای ۱۵ جملهٔ روش/واریانت
//   US4: جهتِ تردیدِ HbA1c وقتی برگه نشان می‌دهد
//   US5: آنتی‌بادیِ ضد GAD / IA-2 فقط با مرزِ چاپ‌شده یا واژهٔ کیفی
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const r = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
const M = { age: 45, sex: "M" }, F = { age: 40, sex: "F" };
const DM = { age: 55, sex: "M", conditions: ["dm2"] };
const run = (tests, patient = M) => { const e = runEngine({ tests, patient }); return { e, out: runPatterns(e) }; };
const find = (out, id) => out.findings.find((f) => f.pattern === id);
const ids = (out) => out.findings.map((f) => f.pattern);
const a1c = (v) => [r("HbA1c", String(v), "%")];

// ═══ US1 ═══
test("P143-US1a: dm2 با HbA1c ۶٫۹ ⇒ «در محدودهٔ هدف»؛ ۷٫۰ و ۷٫۸ ⇒ «بالاتر از هدف»؛ «قطعی‌شدن تشخیص» نمی‌آید", () => {
  const w = find(run(a1c(6.9), DM).out, "diabetes_range");
  assert.match(w.must_say, /در محدودهٔ هدفِ رایجِ درمان \(کمتر از ۷٪\)/);
  for (const v of [7.0, 7.8]) {
    const f = find(run(a1c(v), DM).out, "diabetes_range");
    assert.match(f.must_say, /بالاتر از هدفِ رایجِ درمان \(کمتر از ۷٪\)/, String(v));
    assert.doesNotMatch(f.must_say, /قطعی‌شدن تشخیص/);
    assert.deepEqual(f.applied_conditions, ["dm2"]);
  }
});

test("P143-US1b: dm2 با HbA1c ۶٫۲ ⇒ «پیش‌دیابت» نمی‌آید؛ FBS ۱۵۰ ⇒ «قطعی‌شدن تشخیص» نمی‌آید؛ فوریت همانِ بی‌شرط", () => {
  const pre = find(run(a1c(6.2), DM).out, "prediabetes_range");
  assert.doesNotMatch(pre.must_say, /پیش‌دیابت|پیشرفت به دیابت/);
  assert.match(pre.must_say, /در محدودهٔ هدفِ رایجِ درمان/);
  const fbs = find(run([r("FBS", "150", "mg/dL")], DM).out, "diabetes_range");
  assert.doesNotMatch(fbs.must_say, /قطعی‌شدن تشخیص/);
  assert.match(fbs.must_say, /150/);
  assert.match(fbs.must_say, /این عدد برای تشخیص نیست/);
  for (const tests of [a1c(6.2), a1c(7.8), [r("FBS", "150", "mg/dL")]]) {
    assert.equal(run(tests, DM).out.overall_urgency, run(tests, { age: 55, sex: "M" }).out.overall_urgency);
  }
});

test("P143-US1c: بی‌شرط ⇒ متنِ امروز؛ dm2 در بارداری ⇒ مالک gestational_diabetes_range", () => {
  const plain = find(run(a1c(7.8), { age: 55, sex: "M" }).out, "diabetes_range");
  assert.match(plain.must_say, /قطعی‌شدن تشخیص/);
  assert.equal(plain.applied_conditions, undefined);
  const preg = run(a1c(7.8), { age: 30, sex: "F", pregnant: true, conditions: ["dm2"] }).out;
  assert.ok(ids(preg).includes("gestational_diabetes_range"));
  assert.ok(!ids(preg).includes("diabetes_range"));
});

// ═══ US2 ═══
test("P143-US2a: انسولین ۳۰ با بازهٔ «2.6-24.9» ⇒ بالا و insulin_result؛ دیگر unmapped نیست", () => {
  const { e, out } = run([r("Insulin", "30", "µIU/mL", "2.6-24.9"), r("FBS", "92", "mg/dL")], F);
  const g = e.graded.find((x) => x.test === "INSULIN");
  assert.equal(g?.dir, "high");
  assert.ok(!e.unmapped.includes("Insulin"));
  const f = find(out, "insulin_result");
  assert.match(f.must_say, /30/);
  assert.doesNotMatch(f.must_say, /انسولینوما|HOMA/);
});

test("P143-US2b: بازهٔ چاپ‌شده بر fallback مقدم است (۱۸ با «<10» بالا؛ ۲٫۰ با «1.9-23» طبیعی)؛ pmol/L با بازهٔ pmol/L", () => {
  assert.equal(run([r("Insulin", "18", "µIU/mL", "<10")], F).e.graded.find((x) => x.test === "INSULIN")?.dir, "high");
  const low = run([r("Insulin", "2.0", "µIU/mL", "1.9-23")], F).e.graded.find((x) => x.test === "INSULIN");
  assert.equal(low?.abnormal, false);
  const pm = run([r("Insulin", "200", "pmol/L", "18-173")], F).e.graded.find((x) => x.test === "INSULIN");
  assert.equal(pm?.dir, "high");
  const pmOk = run([r("Insulin", "150", "pmol/L", "18-173")], F).e.graded.find((x) => x.test === "INSULIN");
  assert.equal(pmOk?.abnormal, false, JSON.stringify(pmOk));
});

test("P143-US2c: انسولینِ بی‌واحد و بی‌بازه درجه‌بندی نمی‌شود و «طبیعی» نمی‌شود", () => {
  const { e } = run([r("Insulin", "80")], F);
  assert.ok(!e.graded.some((x) => x.test === "INSULIN"));
  assert.ok(!e.unmapped.includes("Insulin"), "خوانده شده ولی واحدش نامعلوم است، نه نگاشت‌نشده");
});

test("P143-US2d: قند ۴۵ + انسولین و سی‌پپتیدِ نه‌پایین ⇒ درون‌زاد؛ اورژانسِ قندِ پایین می‌ماند", () => {
  const { out } = run([r("Insulin", "12", "µIU/mL", "2.6-24.9"), r("C-Peptide", "2.5", "ng/mL", "1.1-4.4"), r("FBS", "45", "mg/dL")], F);
  const f = find(out, "hypoglycemia_insulin_not_suppressed");
  assert.ok(f, ids(out).join(","));
  assert.equal(f.urgency, "soon");
  assert.match(f.must_say, /بدن هنوز انسولین می‌سازد/);
  assert.match(f.must_say, /12/);
  assert.match(f.must_say, /2\.5/);
  assert.doesNotMatch(f.must_say, /انسولینوما/);
  assert.equal(out.overall_urgency, "emergency");
  assert.ok(ids(out).includes("hypoglycemia_significant"));
  assert.ok(!ids(out).includes("insulin_result"), "دو مالکِ هم‌زمان برای انسولین نه");
});

test("P143-US2e: انسولین بالا + سی‌پپتید پایین در قندِ ۴۰ ⇒ الگوی انسولینِ بیرونی؛ بی‌سی‌پپتید ⇒ پیشنهادِ سی‌پپتید", () => {
  const ex = find(run([r("Insulin", "80", "µIU/mL", "2.6-24.9"), r("C-Peptide", "0.3", "ng/mL", "1.1-4.4"), r("FBS", "40", "mg/dL")], F).out, "hypoglycemia_insulin_not_suppressed");
  assert.match(ex.must_say, /از بیرون \(تزریق\)/);
  const nocp = find(run([r("Insulin", "12", "µIU/mL", "2.6-24.9"), r("FBS", "45", "mg/dL")], F).out, "hypoglycemia_insulin_not_suppressed");
  assert.ok(nocp.suggest.includes("سی‌پپتید"));
  assert.doesNotMatch(nocp.must_say, /سی‌پپتید \d/);
});

test("P143-US2f: مرزِ قند — ۵۴ یافتهٔ انسولین نمی‌دهد، ۵۳ می‌دهد؛ انسولینِ پایین ⇒ هیچ", () => {
  const ins = r("Insulin", "12", "µIU/mL", "2.6-24.9");
  assert.ok(!ids(run([ins, r("FBS", "54", "mg/dL")], F).out).includes("hypoglycemia_insulin_not_suppressed"));
  assert.ok(ids(run([ins, r("FBS", "53", "mg/dL")], F).out).includes("hypoglycemia_insulin_not_suppressed"));
  assert.ok(!ids(run([r("Insulin", "1.5", "µIU/mL", "2.6-24.9"), r("FBS", "45", "mg/dL")], F).out).includes("hypoglycemia_insulin_not_suppressed"));
});

test("P143-US2h: قند ۴۵ با انسولینِ پایین، یا سی‌پپتیدِ تنها ⇒ ردیف مالک دارد (insulin_result)، نه «توضیح آماده‌ای نداریم»", () => {
  for (const tests of [[r("Insulin", "1.5", "µIU/mL", "2.6-24.9"), r("FBS", "45", "mg/dL")], [r("C-Peptide", "0.3", "ng/mL", "1.1-4.4"), r("FBS", "45", "mg/dL")]]) {
    const { out } = run(tests, F);
    const f = find(out, "insulin_result");
    assert.ok(f, ids(out).join(","));
    assert.match(f.must_say, /قند خونِ همین نمونه 45 است/);
    assert.ok(!ids(out).includes("unexplained_abnormal") && !ids(out).includes("unmatched_abnormal"), ids(out).join(","));
    assert.equal(out.overall_urgency, "emergency");
  }
});

test("P143-US2g: «Insulin Antibody»، «Anti-Insulin»، «HOMA-IR»، «Proinsulin» به INSULIN نمی‌روند (N25)", () => {
  for (const n of ["Insulin Antibody", "Anti-Insulin", "HOMA-IR", "Proinsulin"]) {
    const { e } = run([r(n, "15", "U/mL", "<10")], F);
    assert.ok(!e.graded.some((x) => x.test === "INSULIN") && !e.ungraded?.INSULIN, n);
  }
});

// ═══ US3 ═══
test("P143-US3a: HbA1c ۳٫۵ و ۳٫۹ ⇒ hba1c_low، نه unmatched_abnormal؛ ۴٫۰ ⇒ هیچ", () => {
  for (const v of [3.5, 3.9]) {
    const { out } = run(a1c(v));
    const f = find(out, "hba1c_low");
    assert.ok(f, `${v}: ${ids(out)}`);
    assert.match(f.must_say, new RegExp(String(v).replace(".", "\\.")));
    assert.ok(!ids(out).includes("unmatched_abnormal"));
  }
  assert.ok(!ids(run(a1c(4.0)).out).includes("hba1c_low"));
});

test("P143-US3b: HbA1c ۱۵٫۱ و ۱۶ ⇒ جملهٔ واریانت با همان فوریت؛ ۱۵٫۰ ⇒ بی‌جمله", () => {
  const VAR = /HbA1c بالای ۱۵٪ کم دیده می‌شود/;
  for (const v of [15.1, 16]) {
    const f = find(run(a1c(v)).out, "diabetes_range");
    assert.match(f.must_say, VAR, String(v));
    assert.equal(f.urgency, "this_week");
  }
  assert.doesNotMatch(find(run(a1c(15.0)).out, "diabetes_range").must_say, VAR);
});

// ═══ US4 ═══
test("P143-US4: تردیدِ HbA1c جهت‌دار — فقرِ آهن ⇒ بیشتر از واقع؛ رتیکولوسیتِ بالا ⇒ کمتر از واقع؛ کم‌خونیِ تنها ⇒ دوسویه", () => {
  const base = [r("HbA1c", "6.7", "%"), r("Hb", "10.5", "g/dL")];
  const ida = find(run([...base, r("MCV", "72"), r("Ferritin", "8", "ng/mL")], F).out, "a1c_diabetes_range_unreliable");
  assert.match(ida.must_say, /کمبودِ آهن را نشان می‌دهد، HbA1c ممکن است بیشتر از واقع باشد/);
  const ret = find(run([...base, r("Retic", "6", "%")], F).out, "a1c_diabetes_range_unreliable");
  assert.match(ret.must_say, /HbA1c ممکن است کمتر از واقع باشد/);
  const only = find(run(base, F).out, "a1c_diabetes_range_unreliable");
  assert.match(only.must_say, /بیشتر یا کمتر از واقع/);
});

// ═══ US5 ═══
test("P143-US5: Anti-GAD ۲۵ با «<10» ⇒ مثبت؛ «Negative» ⇒ منفی؛ بی‌مرز ⇒ تفسیر نشد؛ IA-2 هم", () => {
  const pos = find(run([r("Anti-GAD", "25", "IU/mL", "<10")], F).out, "islet_autoantibody_result");
  assert.ok(pos);
  assert.match(pos.must_say, /مثبت/);
  assert.match(pos.must_say, /25/);
  assert.doesNotMatch(pos.must_say, /ANTI_GAD/);
  const neg = find(run([r("Anti-GAD", "Negative")], F).out, "islet_autoantibody_result");
  assert.match(neg.must_say, /منفی/);
  assert.doesNotMatch(neg.must_say, /مثبت است/);
  const noref = find(run([r("Anti-GAD", "25")], F).out, "islet_autoantibody_result");
  assert.match(noref.must_say, /تفسیر نشد/);
  assert.doesNotMatch(noref.must_say, /منفی|مثبت است/);
  const ia2 = find(run([r("Anti-IA2", "3.1", "U/mL", "<1")], F).out, "islet_autoantibody_result");
  assert.match(ia2.must_say, /IA-2/);
  assert.match(ia2.must_say, /مثبت/);
});

test("P143-US5b: Anti-GAD منفی یا داخلِ مرز امتیازِ برگهٔ سالم را پایین نمی‌آورد (کلاسِ N46)؛ مثبت می‌آورد", async () => {
  const { healthScore } = await import("./score.js");
  const base = [r("Hb", "13.5", "g/dL"), r("WBC", "7"), r("PLT", "250"), r("FBS", "88", "mg/dL"), r("Creatinine", "0.8", "mg/dL"), r("ALT", "20", "U/L")];
  const sc = (extra) => { const { e, out } = run([...base, ...extra], F); return healthScore(e, out); };
  const clean = sc([]);
  for (const x of [[r("Anti-GAD", "Negative")], [r("Anti-GAD", "3", "IU/mL", "<10")]]) {
    const s = sc(x);
    assert.equal(s.value, clean.value, JSON.stringify(x));
    assert.equal(s.band, clean.band);
  }
  assert.ok(sc([r("Anti-GAD", "25", "IU/mL", "<10")]).value < clean.value);
});
