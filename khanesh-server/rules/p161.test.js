// P161–P164 (بازبینیِ اجماعِ ۲۰۲۶-۱۱-۱۹): چهار رگرسیونِ بیمارمحورِ P155–P160.
//   P161 — نگاشتِ قند: قیدِ «تصادفی» نباید به نامِ عمومیِ «glucose» ببازد.
//   P162 — پتاسیم: متن/کاوئات/دستورِ اورژانس فقط برای DKA/HHS، نه برای قندِ ۲۵۰–۵۹۹.
//   P163 — نوتروفیلِ مطلقِ مشتق، به‌شکلِ درصدِ چاپ‌شده (N5؛ absQuoteFa)، نه عددِ ساخته‌شده.
//   P164 — خلاصهٔ DKA فقط وقتی «قند خون بسیار بالا» می‌گوید که ردیفِ قند روی برگه باشد (جملهٔ P160، 2622c4c).
// هر تست روی درختِ قبل از اصلاح قرمز است (کنترلِ منفی، N10).
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { buildEngineRecommendations, engineSummary } from "./prompt.js";

const T = (name, value, reference) => ({ name, value, ...(reference ? { reference } : {}) });
const MALE = { age: 47, sex: "M" };
const run = (tests, patient = MALE) => {
  const e = runEngine({ tests, patient });
  return { e, p: runPatterns(e) };
};
const keysOf = (name, value = "120", reference = "70 - 140") =>
  runEngine({ tests: [T(name, `${value} mg/dL`, reference)], patient: MALE }).graded.map((g) => g.test);

// ── P161 ─────────────────────────────────────────────────────
test("P161-1: قیدِ صریح برنده است (ناشتا/۲ساعته/تصادفی) و P155 دست‌نخورده می‌ماند", () => {
  const cases = {
    "FBS (Blood Sugar)": "GLU_F",
    "Blood Sugar (FBS)": "GLU_F",
    "F.B.S. (Blood Sugar)": "GLU_F",
    "Blood Sugar (2hpp)": "GLU_2H",
    "2hpp (Blood Sugar)": "GLU_2H",
    "Blood Sugar (Post prandial)": "GLU_2H",
    "RBS (Glucose)": "GLU_RANDOM",
    "Glucose (Random) BS": "GLU_RANDOM",
    "Glucose Random Blood Sugar": "GLU_RANDOM",
    "Random Blood Sugar (Glucose)": "GLU_RANDOM",
    "B.S (Glucose)": "GLU_F",
    "Blood Sugar (Glucose)": "GLU_F",   // تصمیمِ P160: دو نامِ عمومی = ناشتا
  };
  for (const [name, key] of Object.entries(cases)) assert.deepEqual(keysOf(name), [key], name);
});

test("P161-2: دو قیدِ متناقض حدس زده نمی‌شوند", () => {
  for (const name of ["FBS (2hpp)", "RBS (2hpp)"]) {
    assert.deepEqual(keysOf(name), [], name);
  }
});

test("P161-3: قندِ تصادفیِ ۱۱۰ «پیش‌دیابت» نمی‌گیرد (قبلاً GLU_F می‌شد)", () => {
  const { p } = run([T("RBS (Glucose)", "110 mg/dL", "70 - 140")]);
  assert.ok(!p.findings.some((f) => f.rule_id === "glycemia"), "قند تصادفی نباید حکمِ ناشتا بگیرد");
  assert.doesNotMatch(JSON.stringify(p.findings), /پیش‌دیابت/);
});

test("P161-4: قندِ تصادفیِ ۱۸۵ «دیابت» خوانده نمی‌شود", () => {
  const { p } = run([T("RBS (Glucose)", "185 mg/dL", "70 - 140")]);
  assert.ok(!p.findings.some((f) => f.rule_id === "glycemia"));
});

// ── P162 ─────────────────────────────────────────────────────
const potassiumCase = (tests, patient = { age: 58, sex: "F" }) => {
  const { e, p } = run(tests, patient);
  return { e, p, k: p.findings.find((f) => f.rule_id === "potassium_critical"), recs: buildEngineRecommendations(p, e) };
};

test("P162-1: K ۵٫۹ کنارِ قندِ ۲۶۰ (بدونِ کتون) دستورِ اورژانس و کاوئاتِ همولیز را از دست نمی‌دهد", () => {
  const { p, k, recs } = potassiumCase([T("FBS", "260 mg/dL", "70 - 100"), T("Potassium (K)", "5.9 mmol/L", "3.5 - 5.1")]);
  assert.equal(p.overall_urgency, "soon");
  assert.equal(k.urgency, "soon");
  assert.doesNotMatch(recs[0], /اورژانس/, "برگهٔ غیراورژانسی نباید با «در اورژانس بگویید» شروع شود");
  assert.match(recs[0], /۲۴ تا ۴۸/);
  assert.doesNotMatch(k.must_say, /اورژانس/);
  assert.equal(k.skip_preanalytical, undefined);
  assert.ok(recs.some((r) => /همولیز/.test(String(r))), "کاوئاتِ همولیزِ پتاسیم باید برگردد");
});

test("P162-2: K ۵٫۳ (routine) کنارِ قندِ ۲۶۸ هم متنِ اورژانس نمی‌گیرد", () => {
  const { k } = potassiumCase([T("FBS", "268 mg/dL", "70 - 100"), T("Potassium (K)", "5.3 mmol/L", "3.5 - 5.1")], { age: 58, sex: "F", conditions: ["dm2"] });
  assert.equal(k.urgency, "routine");
  assert.doesNotMatch(k.must_say, /اورژانس/);
  assert.equal(k.skip_preanalytical, undefined);
});

test("P162-3: HHS و DKA همچنان زمینهٔ پتاسیم را می‌گیرند (گاردِ مثبتِ P158)", () => {
  for (const rows of [
    [T("FBS", "720 mg/dL", "70 - 100"), T("Potassium (K)", "5.9 mmol/L", "3.5 - 5.1")],
    [T("FBS", "485 mg/dL", "70 - 100"), T("Ketone (Urine)", "3+", "Negative"), T("Potassium (K)", "5.9 mmol/L", "3.5 - 5.1")],
  ]) {
    const { k } = potassiumCase(rows);
    assert.match(k.must_say, /کاذب فرض نکنید/, "در DKA/HHS پتاسیم کاذب فرض نمی‌شود");
    assert.equal(k.skip_preanalytical, true);
    assert.doesNotMatch(k.must_say + k.brief, /همولیز/);
  }
});

test("P162-4: K تنها بی‌تغییر است", () => {
  const { k, recs } = potassiumCase([T("Potassium (K)", "5.9 mmol/L", "3.5 - 5.1")]);
  assert.equal(k.urgency, "soon");
  assert.match(recs[0], /۲۴ تا ۴۸/);
  assert.doesNotMatch(k.must_say, /کاذب فرض نکنید/);
  assert.ok(recs.some((r) => /همولیز/.test(String(r))), "کاوئاتِ همولیز برای K تنها هست");
});

// ── P163 ─────────────────────────────────────────────────────
const dkaTail = (extra) =>
  run([T("FBS", "485 mg/dL", "70 - 100"), T("Ketone (Urine)", "3+", "Negative"), ...extra]).p.findings.find((f) => f.rule_id === "dka_pattern").must_say;

test("P163-1: نوتروفیل با درصدِ چاپ‌شده نقل می‌شود، نه عددِ مشتقِ ۱۳۷۷۶ (N5)", () => {
  const text = dkaTail([T("WBC", "16.8 10^3/uL", "4 - 11"), T("Neutrophil %", "82 %", "45 - 75")]);
  assert.match(text, /٪82/);
  assert.match(text, /حد طبیعی روی برگه/);
  assert.doesNotMatch(text, /13776/);
});

test("P163-2: اگر برگه خودش عددِ مطلق چاپ کرده، همان عدد می‌آید", () => {
  const text = dkaTail([T("WBC", "16.8 10^3/uL", "4 - 11"), T("Neutrophils Absolute", "13776 10^3/uL", "1800 - 7800")]);
  assert.match(text, /13776/);
  assert.doesNotMatch(text, /٪82/);
});

// ── P164 ─────────────────────────────────────────────────────
test("P164-1: DKAِ اوگلیسمیک (بیکربنات + کتون، بی‌ردیفِ قند) در خلاصه «قند خون بسیار بالا» نمی‌شنود", () => {
  const { e, p } = run([T("Bicarbonate", "15 mmol/L", "22 - 29"), T("Ketone (Urine)", "3+", "Negative")]);
  const s = engineSummary(e, p);
  assert.equal(p.overall_urgency, "emergency");
  assert.doesNotMatch(s, /قند خون بسیار بالا/);
  assert.match(s, /اورژانس/);
});

test("P164-2: با ردیفِ قند، نامِ DKA در خلاصه می‌ماند (P159)", () => {
  const { e, p } = run([T("FBS", "485 mg/dL", "70 - 100"), T("Ketone (Urine)", "3+", "Negative")]);
  assert.match(engineSummary(e, p), /قند خون بسیار بالا همراه با کتون/);
});
