// specs/019 — خوانندهٔ بازهٔ چاپ‌شدهٔ تومورمارکرها و ردیفِ `_engine.tests` (rules/tumor_markers.js). فقط ماژولِ خالص؛
// تست‌های سرتاسری روی برگه (TM1–TM8) در engine.test.js هستند.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTmRange, tmVerdict, tumorMarkerRows, TM_KEYS } from "./tumor_markers.js";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { healthScore } from "./score.js";
import { faName } from "./names.js";

const hi = (text) => { const r = parseTmRange(text); return r.kind === "single" ? r.bands[0] : r; };

test("TMM1: قالب‌های بازه ⇒ باند با اکید/غیراکیدِ همان‌طور که چاپ شده", () => {
  const strict = ["< 35", "<35", "Less than 35", "کمتر از 35", "Normal: <35", "< 35 U/mL"];
  const incl = ["≤ 35", "<= 35", "=< 35", "up to 35", "Up to: 35", "Upto 35", "At or below: 35", "At or below 35 U/mL", "not more than 35"];
  for (const t of strict) assert.deepEqual([hi(t).hi, hi(t).hiStrict, hi(t).lo], [35, true, null], t);
  for (const t of incl) assert.deepEqual([hi(t).hi, hi(t).hiStrict, hi(t).lo], [35, false, null], t);
  for (const t of ["0-35", "0 - 35", "0–35", "0 to 35", "0 تا 35", "۰-۳۵"]) assert.deepEqual([hi(t).lo, hi(t).hi, hi(t).hiStrict], [0, 35, false], t);
  assert.equal(hi("At or below: 31.0").hi, 31);
  assert.equal(hi("5,5").kind, "unreadable");   // عددِ تنها بازه نیست
});

test("TMM2: بازهٔ برچسب‌دار — دو باندِ بالایی؛ هر جداکننده؛ ترتیبِ معکوس هم", () => {
  for (const t of ["Non smoker: < 5   Smokers: < 10", "Non smoker: < 5 / Smokers: < 10", "Non smoker: < 5 ; Smokers: < 10",
    "Non smoker: < 5 | Smokers: < 10", "Non smoker: < 5 ، Smokers: < 10", "Non smoker: < 5\nSmokers: < 10", "Non-smoker <5 Smoker <10",
    "Smokers: < 10 / Non smoker: < 5", "غیر سیگاری: < 5 سیگاری: < 10"]) {
    const r = parseTmRange(t);
    assert.equal(r.kind, "labelled", t);
    assert.deepEqual(r.bands.map((b) => [b.label, b.hi, b.hiStrict]), [["nonsmoker", 5, true], ["smoker", 10, true]], t);
  }
});

test("TMM3: بازهٔ برچسب‌دارِ ناقص/متناقض/عددِ پیش از برچسب ⇒ unreadable، هرگز نخستین بخش", () => {
  for (const t of ["Smokers: < 10", "Non smoker: < 5", "Non smoker: < 10 Smokers: < 5", "Non smoker: < 5 Smokers: < 5",
    "< 5 non smoker < 10 smoker", "Non smoker: < 5 Smokers: 5-10", "Non smoker: < 5 Smokers: < 10 Ex smoker: < 12"]) {
    assert.equal(parseTmRange(t).kind, "unreadable", t);
  }
  for (const t of ["see comment", "0-35 0-40", "Male: < 5 Female: < 3.5 child 2"]) assert.notEqual(parseTmRange(t).kind, "labelled", t);
  assert.equal(parseTmRange("").kind, "none");
  assert.equal(parseTmRange(undefined).kind, "none");
});

test("TMM4: مرزهای حکم — روی حد، یک واحدِ کمتر/بیشتر (اکید و غیراکید)", () => {
  const v = (n, t, cmp = null) => tmVerdict(n, cmp, parseTmRange(t));
  assert.deepEqual([34.9, 35, 35.1].map((n) => v(n, "< 35")), ["within", "above", "above"]);
  assert.deepEqual([34.9, 35, 35.1].map((n) => v(n, "≤ 35")), ["within", "within", "above"]);
  assert.deepEqual([34.9, 35, 35.1].map((n) => v(n, "At or below: 35")), ["within", "within", "above"]);
  assert.deepEqual([-0.1, 0, 35, 35.1].map((n) => v(n, "0-35")), ["below", "within", "within", "above"]);
  const two = "Non smoker: < 5   Smokers: < 10";
  assert.deepEqual([4.9, 5, 9.9, 10, 10.1].map((n) => v(n, two)), ["within", "between", "between", "above", "above"]);
  const twoIncl = "Non smoker: ≤ 5   Smokers: ≤ 10";
  assert.deepEqual([5, 5.1, 10, 10.1].map((n) => v(n, twoIncl)), ["within", "between", "between", "above"]);
});

test("TMM5: مقدارِ سانسورشده فقط وقتی قطعی است حکم می‌دهد؛ بازهٔ ناخوانا ⇒ unknown", () => {
  const two = parseTmRange("Non smoker: < 5   Smokers: < 10");
  assert.equal(tmVerdict(3, "<", two), "within");     // «<3» زیرِ حدِ غیرسیگاری
  assert.equal(tmVerdict(7, "<", two), "unknown");    // «<7» ممکن است بین باشد
  assert.equal(tmVerdict(10, ">", two), "above");
  assert.equal(tmVerdict(8, ">", two), "unknown");
  assert.equal(tmVerdict(5, null, parseTmRange("see comment")), "unknown");
  assert.equal(tmVerdict(5, null, parseTmRange("")), "unknown");
  assert.equal(tmVerdict(NaN, null, parseTmRange("< 5")), "unknown");
});

test("TMM6: ردیف‌های _engine.tests — قرارداد، نامِ فارسی، «بی‌حکم» = abnormal:null (نه طبیعی)", () => {
  const rows = (tests) => tumorMarkerRows(runEngine({ patient: { age: 45, sex: "F" }, tests }));
  const T = (name, value, unit, reference) => ({ name, value: String(value), unit, reference });
  const r = rows([T("CEA", 27.97, "ng/mL", "Non smoker: < 5   Smokers: < 10"), T("CA 125", 10.3, "U/mL", "0-35"),
    T("CA 15-3", 11.6, "U/mL", ""), T("CA 19-9", 20, "U/mL", "see comment")]);
  const by = Object.fromEntries(r.map((x) => [x.key, x]));
  assert.deepEqual(Object.keys(by).sort(), ["CA125", "CA153", "CA199", "CEA"]);
  assert.deepEqual([by.CEA.verdict, by.CEA.abnormal, by.CEA.dir], ["above", true, "high"]);
  assert.deepEqual([by.CA125.verdict, by.CA125.abnormal, by.CA125.dir], ["within", false, null]);
  assert.deepEqual([by.CA153.verdict, by.CA153.abnormal, by.CA153.range], ["noref", null, null]);
  assert.deepEqual([by.CA199.verdict, by.CA199.abnormal, by.CA199.range], ["unreadable", null, "see comment"]);
  const between = rows([T("CEA", 7, "ng/mL", "Non smoker: < 5   Smokers: < 10")])[0];
  assert.deepEqual([between.verdict, between.abnormal, between.dir], ["between", null, null]);
  for (const x of r) {
    assert.equal(x.refSource, "printed");
    assert.equal(x.source, "tumor_marker_printed");
    assert.equal(x.level, null);
    assert.equal(x.ctcaeGrade, null);
    // نامِ نمایشی همان faName است («CEA»، «CA 125» نام‌های جاافتادهٔ فارسی‌زبان‌ها هستند)، نه کلیدِ خام «CA125» (N8).
    assert.equal(x.name, faName(x.key));
    assert.notEqual(x.name, "CA125");
    assert.ok(TM_KEYS.has(x.key));
  }
  assert.deepEqual(rows([]), []);
  assert.deepEqual(rows([T("Hb", 13, "g/dL", "")]), []);
});

// ⚠️ باگِ واقعی (۲۰۲۶-۱۱-۰۸، سنجیده روی کدِ پیش از اصلاح): CEAِ طبیعی ۹۸ («high») را ۹۰ («mid») می‌کرد — یافتهٔ tumor_markers_result
//    به هیچ کلیدِ graded نسبت داده نمی‌شد (سقفِ کلِ برگه) و ردیفِ ungraded «خوانده‌نشده» شمرده می‌شد. این تست روی آن کد قرمز است.
test("TMM7: افزودنِ تومورمارکر (طبیعی/بی‌بازه/ناخوانا) به پنل، امتیاز و باند و سنِ زیستی را تکان نمی‌دهد", () => {
  const T = (name, value, unit, reference = "") => ({ name, value: String(value), unit, reference });
  const base = [T("Albumin", 4.4, "g/dL"), T("Creatinine", 0.9, "mg/dL"), T("FBS", 90, "mg/dL"), T("hs-CRP", 0.3, "mg/L"),
    T("Lymph %", 30, "%"), T("MCV", 90, "fL"), T("RDW-CV", 12.5, "%"), T("ALP", 70, "U/L"), T("WBC", 6.5, "x10^3/uL"), T("Neutrophils %", 60, "%")];
  const go = (extra) => { const e = runEngine({ patient: { sex: "M", age: 45 }, tests: [...base, ...extra] }); const p = runPatterns(e); return { e, score: healthScore(e, p) }; };
  const a = go([]);
  assert.equal(typeof a.e.indices.pheno_age, "number", "پیش‌شرط: PhenoAge ساخته شود");
  const variants = {
    "طبیعی": [T("CEA", 3, "ng/mL", "Non smoker: < 5   Smokers: < 10"), T("CA 125", 10, "U/mL", "0-35"), T("CA 15-3", 11, "U/mL", "At or below: 31.0")],
    "بی‌بازه": [T("CEA", 3, "ng/mL"), T("CA 125", 10, "U/mL")],
    "ناخوانا": [T("CA 19-9", 20, "U/mL", "see comment")],
    "بین": [T("CEA", 7, "ng/mL", "Non smoker: < 5   Smokers: < 10")],
  };
  for (const [label, extra] of Object.entries(variants)) {
    const b = go(extra);
    assert.equal(b.e.indices.pheno_age, a.e.indices.pheno_age, label);
    assert.deepEqual([b.score.value, b.score.band, b.score.count.unread, b.score.total], [a.score.value, a.score.band, a.score.count.unread, a.score.total], label);
    assert.deepEqual(b.e.graded.map((g) => g.test), a.e.graded.map((g) => g.test), label);
  }
  // بالا هم عددِ امتیاز را تکان نمی‌دهد؛ فقط رنگ (باند) به‌خاطرِ urgencyِ کل («این هفته») از «مطلوب» پایین می‌آید — طرحِ P97.
  const hi = go([T("CEA", 27.97, "ng/mL", "Non smoker: < 5   Smokers: < 10")]);
  assert.equal(hi.score.value, a.score.value);
  assert.equal(hi.score.count.unread, a.score.count.unread);
});

test("TMM8: نمای تخصصی برای تومورمارکرِ دارای حکم «بدون حکم» نمی‌گوید؛ همان برچسب و بازهٔ نمای ساده (دو روایت نمی‌شود)", async () => {
  const { buildExpertView } = await import("./expert.js");
  const T = (name, value, unit, reference) => ({ name, value: String(value), unit, reference });
  const e = runEngine({ patient: { age: 45, sex: "F" }, tests: [T("CEA", 27.97, "ng/mL", "Non smoker: < 5   Smokers: < 10"), T("CA 125", 10.3, "U/mL", "0-35"), T("CA 15-3", 11.6, "U/mL", "")] });
  const view = buildExpertView(e, runPatterns(e), healthScore(e, runPatterns(e)));
  const rows = Object.fromEntries(tumorMarkerRows(e).map((r) => [r.name, r]));
  for (const row of view.tests.filter((x) => rows[x.name])) {
    assert.equal(row.status_fa, rows[row.name].fa, row.name);
    assert.equal(row.printed_range, rows[row.name].range, row.name);
    assert.equal(row.range_source, "printed", row.name);
  }
  assert.equal(view.tests.filter((x) => rows[x.name]).length, 3);
});

test("TMM9: بدونِ برچسب همان نخستین بخشِ قابل‌خواندنِ قدیم؛ «0-N» برچسب‌دار فقط‌سقف است؛ «< 5 (non smoker)» تنها ⇒ unreadable", () => {
  const v = (n, t) => tmVerdict(n, null, parseTmRange(t, "F"));
  assert.deepEqual([10, 36].map((n) => v(n, "0-35 U/mL (CA 125 II)")), ["within", "above"]);    // «/» داخلِ واحد؛ HEAD می‌خواند
  assert.deepEqual([10, 36].map((n) => v(n, "< 35 / ECLIA")), ["within", "above"]);
  const r = parseTmRange("Non smoker: 0-5  Smokers: 0-10");
  assert.deepEqual([r.kind, r.bands.map((b) => [b.label, b.lo, b.hi, b.hiStrict])], ["labelled", [["nonsmoker", null, 5, false], ["smoker", null, 10, false]]]);
  assert.deepEqual([3, 5, 7, 10, 11].map((n) => tmVerdict(n, null, r)), ["within", "within", "between", "between", "above"]);
  assert.equal(parseTmRange("< 5 (non smoker)").kind, "unreadable");   // HEAD: بی‌صدا حدِ عمومی می‌شد
});
