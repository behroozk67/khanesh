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

// ═══ specs/020 (P132): AFP، B2M، کلسی‌تونین، CgA، PSA کل/آزاد/نسبت از همین خواننده ═══
const T20 = (name, value, unit, reference = "") => ({ name, value: String(value), unit, reference });
const go20 = (patient, tests) => { const e = runEngine({ patient, tests }); const p = runPatterns(e); return { e, p, rows: tumorMarkerRows(e), score: healthScore(e, p) }; };
const row20 = (r, key) => r.rows.find((x) => x.key === key);
const say20 = (r, id) => String(r.p.findings.find((f) => (f.rule_id ?? f.pattern) === id)?.must_say ?? "");
const urg20 = (r, id) => r.p.findings.find((f) => (f.rule_id ?? f.pattern) === id)?.urgency;
const M60 = { age: 60, sex: "M" }, M45 = { age: 45, sex: "M" };

// پیش از P132 هیچ‌کدام از این هفت کلید ردیفی در _engine.tests نداشتند و «<» اکید مثلِ «≤» خوانده می‌شد.
test("TMM10: هفت کلیدِ P77 ردیفِ _engine.tests دارند؛ «<» اکید روی حد ⇒ بالا (P122 برای PSA/AFP هم)", () => {
  for (const k of ["AFP", "B2M", "CALCITONIN", "CGA", "PSA_TOTAL", "PSA_FREE", "PSA_RATIO"]) assert.ok(TM_KEYS.has(k), k);
  assert.equal(TM_KEYS.has("CALPROTECTIN"), false);   // در AI_RE هست ولی تومورمارکر نیست
  const psa = go20(M60, [T20("PSA", "4.0", "ng/mL", "< 4.0")]);
  assert.deepEqual([row20(psa, "PSA_TOTAL")?.verdict, row20(psa, "PSA_TOTAL")?.abnormal], ["above", true]);
  assert.equal(urg20(psa, "psa_result"), "this_week");   // P132: پرسشِ بازبین (۱)
  const afp = go20(M45, [T20("AFP", "7.0", "ng/mL", "< 7.0")]);
  assert.deepEqual([row20(afp, "AFP")?.verdict, row20(afp, "AFP")?.dir], ["above", "high"]);
  const all = go20(M60, [T20("B2M", 2.5, "mg/L", "0.8-2.2"), T20("Chromogranin A", 120, "ng/mL", "< 100"), T20("Free PSA", 0.5, "ng/mL", "")]);
  assert.deepEqual(["B2M", "CGA", "PSA_FREE"].map((k) => row20(all, k)?.verdict), ["above", "above", "noref"]);
});

test("TMM11: کلسی‌تونین بی‌بازه ⇒ noref/abnormal:null؛ بازهٔ سنی‌بندیِ PSA ⇒ «خوانده نشد» (نه «چاپ نشده»)", () => {
  const c = go20(M45, [T20("Calcitonin", 12, "pg/mL", "")]);
  assert.deepEqual([row20(c, "CALCITONIN")?.verdict, row20(c, "CALCITONIN")?.abnormal, row20(c, "CALCITONIN")?.range], ["noref", null, null]);
  const p = go20(M60, [T20("PSA", 3.0, "ng/mL", "40-49 y: <2.5 / 50-59 y: <3.5")]);
  assert.deepEqual([row20(p, "PSA_TOTAL")?.verdict, row20(p, "PSA_TOTAL")?.abnormal], ["unreadable", null]);
  assert.match(say20(p, "psa_result"), /بازهٔ مرجعِ چاپ‌شده روی همان ردیف خوانده نشد/);
  assert.equal(say20(p, "psa_result").includes("محدودهٔ مرجع روی همان ردیف چاپ نشده"), false);
});

// ⚠️ باگِ واقعی (سنجیده روی کدِ پیش از P132): PSAِ *طبیعی* امتیازِ ۹۸ «high» را ۹۰ «mid» می‌کرد (همان کلاسِ N46 برای CEA).
test("TMM12: PSA (طبیعی یا بالا) امتیاز را تکان نمی‌دهد — psa_result هم مثلِ tumor_markers_result بیرون از امتیاز", () => {
  const base = [T20("Albumin", 4.4, "g/dL"), T20("Creatinine", 0.9, "mg/dL"), T20("FBS", 90, "mg/dL"), T20("hs-CRP", 0.3, "mg/L"),
    T20("Lymph %", 30, "%"), T20("MCV", 90, "fL"), T20("RDW-CV", 12.5, "%"), T20("ALP", 70, "U/L"), T20("WBC", 6.5, "x10^3/uL"), T20("Neutrophils %", 60, "%")];
  const a = go20(M45, base);
  assert.equal(typeof a.score.value, "number", "پیش‌شرط: امتیاز ساخته شود");
  for (const v of [1, 6]) {
    const b = go20(M45, [...base, T20("PSA", v, "ng/mL", "< 4")]);
    assert.deepEqual([b.score.value, b.score.count.unread, b.score.total], [a.score.value, a.score.count.unread, a.score.total], `PSA ${v}`);
    if (v === 1) assert.equal(b.score.band, a.score.band, "PSAِ طبیعی باند را هم پایین نمی‌آورد");
  }
});

// کنترلِ منفی: مسیرِ بارداری AFPِ MoM را نگه می‌دارد. نگهبانِ واقعی `prenatalClaim` در adapter.js است، نه شاخهٔ MoMِ serology.js
//   (برداشتنِ آن یکی تست را قرمز نکرد؛ خاموش کردنِ prenatalClaim کرد — BASELINE.md).
test("TMM13: AFPِ MoM روی برگهٔ بارداری ردیفِ تومورمارکر نمی‌گیرد؛ کلسی‌تونینِ دوجنسیتی با جنسِ نامعلوم همان وضعِ امروز", () => {
  const preg = go20({ age: 30, sex: "F", pregnant: true }, [T20("AFP", 2.5, "MoM", "0.5-2.5")]);
  assert.equal(preg.rows.some((r) => r.key === "AFP"), false);
  assert.ok(preg.p.findings.some((f) => (f.rule_id ?? f.pattern) === "prenatal_ntd_afp"));
  // ⚠️ شکافِ پیشین (P132، پرسشِ بازبین): با جنسِ نامعلوم حدِ مردانه برداشته می‌شود ⇒ ۶ «داخل». این تست وضعِ امروز را قفل می‌کند تا بی‌صدا جابه‌جا نشود.
  const c = go20({ age: 45 }, [T20("Calcitonin", 6, "pg/mL", "Male: < 8.4 Female: < 5")]);
  assert.equal(row20(c, "CALCITONIN")?.verdict, "within");
});

test("TMM14: قرارداد v2 — abnormal:null ⇔ بی‌حکم؛ نامِ فارسی، نه کلید", () => {
  const panels = [
    [M60, [T20("PSA", 6, "ng/mL", "< 4.0"), T20("Free PSA Ratio", 18, "%", "> 25"), T20("Free PSA", 1, "ng/mL", "")]],
    [M45, [T20("AFP", 3, "ng/mL", "Adult: < 10 / Pregnancy: variable"), T20("B2M", 1.5, "mg/L", "see comment"), T20("Calcitonin", 2, "pg/mL", "< 10")]],
    [{ age: 45, sex: "F" }, [T20("CEA", 7, "ng/mL", "Non smoker: < 5   Smokers: < 10"), T20("Chromogranin A", 50, "ng/mL", "< 100")]],
  ];
  let n = 0;
  for (const [patient, tests] of panels) for (const r of go20(patient, tests).rows) {
    n++;
    assert.equal(r.abnormal === null, ["between", "noref", "unreadable"].includes(r.verdict), `${r.key} ${r.verdict}`);
    assert.equal(r.name, faName(r.key));
    if (r.key !== "CEA") assert.notEqual(r.name, r.key);
  }
  assert.equal(n, 8, "هر ردیف شمرده شود (نگهبانِ بی‌صدا نه)");
});

// specs/020 (P132، FR-007 اصلاح‌شده): PSA روی پروفایلِ زن ⇒ پرچم + یک جمله، *افزون بر* حکم (حکم و فوریت پنهان نمی‌شوند — اصلِ II).
const PSA_SEX_FA = "PSA آزمایشِ مخصوصِ پروستات است و جنسِ ثبت‌شده برای این برگه زن است؛ اگر این برگه مالِ شخصِ دیگری نیست، جنسِ پروفایل را بررسی کنید و برگه را به پزشک نشان دهید.";
test("TMM15: PSA روی پروفایلِ زن — حکم همان، sexMismatch و جمله؛ مرد و CA 125ِ مرد بی‌پرچم", () => {
  const f = go20({ age: 60, sex: "F" }, [T20("PSA", 1.2, "ng/mL", "< 4.0")]);
  assert.deepEqual([row20(f, "PSA_TOTAL")?.verdict, row20(f, "PSA_TOTAL")?.sexMismatch], ["within", true]);
  assert.ok(say20(f, "psa_result").includes(PSA_SEX_FA));
  const fHi = go20({ age: 60, sex: "F" }, [T20("PSA", 6, "ng/mL", "< 4.0")]);
  assert.equal(urg20(fHi, "psa_result"), "this_week", "پرچم فوریت را پایین نمی‌آورد");
  assert.equal(row20(fHi, "PSA_TOTAL")?.verdict, "above");
  const m = go20(M60, [T20("PSA", 1.2, "ng/mL", "< 4.0")]);
  assert.equal(row20(m, "PSA_TOTAL")?.sexMismatch, undefined);
  assert.equal(say20(m, "psa_result").includes("جنسِ ثبت‌شده"), false);
  const u = go20({ age: 60 }, [T20("PSA", 1.2, "ng/mL", "< 4.0")]);   // جنسِ نامعلوم ⇒ حدس نه
  assert.equal(say20(u, "psa_result").includes("جنسِ ثبت‌شده"), false);
  const ca = go20(M45, [T20("CA 125", 10, "U/mL", "0-35")]);
  assert.equal(row20(ca, "CA125")?.sexMismatch, undefined);
  assert.equal(say20(ca, "tumor_markers_result").includes("جنسِ ثبت‌شده"), false);
});

// specs/020 (FR-006/SC-004): هیچ قاعدهٔ فصلِ ۲۰ (نیازمندِ سابقه/جراحی/تصویربرداری/فنوتیپ) به کد نیامده — گزینهٔ C.
//   «Lewis» عمداً در فهرست نیست: جملهٔ TM_CONTEXT.CA199 پیش از این کار بوده (P77) و در ثبت §۶ برای بازبین علامت خورده.
test("TMM16: جاروی سکوت — واژه‌های قواعدِ فصلِ ۲۰ در هیچ متنِ تومورمارکر/PSA نیست", () => {
  const banned = ["عود", "پروستاتکتومی", "RMI", "نیمه‌عمر", "پیوند", "نادیر", "دو برابر شدن"];
  const panels = [
    [M60, [T20("PSA", 0.3, "ng/mL", "< 4.0"), T20("Free PSA Ratio", 18, "%", "> 25")]],
    [M60, [T20("PSA", 120, "ng/mL", "< 4.0")]],
    [{ age: 60, sex: "F" }, [T20("CA 125", 600, "U/mL", "0-35"), T20("CA 15-3", 60, "U/mL", "< 31"), T20("CEA", 30, "ng/mL", "< 5")]],
    [M45, [T20("AFP", 400, "ng/mL", "< 7.0"), T20("CA 19-9", 200, "U/mL", "< 37"), T20("Calcitonin", 150, "pg/mL", "< 10")]],
    [M45, [T20("B2M", 5, "mg/L", "0.8-2.2"), T20("Chromogranin A", 300, "ng/mL", "< 100")]],
  ];
  let n = 0;
  for (const [patient, tests] of panels) {
    for (const f of go20(patient, tests).p.findings.filter((x) => ["tumor_markers_result", "psa_result"].includes(x.rule_id ?? x.pattern))) {
      n++;
      for (const w of banned) assert.equal(String(f.must_say).includes(w), false, `${f.rule_id ?? f.pattern}: «${w}»`);
    }
  }
  assert.equal(n, 5, "هر پنل یافتهٔ خودش را بسازد");
});
