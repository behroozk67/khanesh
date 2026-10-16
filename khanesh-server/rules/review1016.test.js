// بازبینیِ ۲۰۲۶-۱۰-۱۶ (P108): برگهٔ تقریباً سالمِ مردِ ۳۶ ساله «این هفته» + ۳۳ توصیه می‌گرفت. شش ریشه، هر کدام یک آزمون:
//   V1 T3ِ «1.2» با بازهٔ «0.52-2.1» (کیتِ ng/mL) nmol/L حدس زده و ۷۸ ng/dL «پایین» خوانده می‌شد (N3)
//   V2 سقفِ کراتینینِ مرد ۱٫۲ (تصمیمِ کاربر ⇒ ۱٫۳)
//   V3 کراتینینِ درجهٔ ۱ با eGFR ≥ ۶۰ «این هفته» و «مرحلهٔ ۲ بیماری کلیه» می‌گرفت، در حالی که G3a روتین بود (وارونگیِ فوریت)
//   V4 منتزرِ ۱۳٫۶ (سمتِ کمبودِ آهن) متنِ «بیشتر به حالت ارثی می‌خورد» می‌گرفت (N12)
//   V5 T4ِ تامِ چاپ‌شده نادیده و «FT4 اندازه‌گیری نشده … نمی‌توان کنار گذاشت» گفته می‌شد (N4/N21)
//   V6 CK (آنزیمِ عضله) امتیازِ «قلب» را پایین می‌آورد
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { healthScore, SCORE_TABLE } from "./score.js";
import { isMinorDeviation } from "./minor.js";
import { parseSampleDate } from "./sampledate.js";

const r = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
const M36 = { age: 36, sex: "M" };
const run = (tests, patient = M36) => {
  const e = runEngine({ patient, tests });
  return { e, p: runPatterns(e) };
};
const ids = (p) => p.findings.map((f) => f.pattern);
const find = (p, id) => p.findings.find((f) => f.pattern === id);
const g = (e, k) => e.graded.find((x) => x.test === k);

// برگهٔ نمونهٔ بازبینی (مقادیرِ گزارش‌شده؛ بازه‌های چاپ‌شده همان‌هایی که بازبین نقل کرد)
const SHEET = [
  r("WBC", "6.8", "x10^3/uL", "4-10"), r("RBC", "5.84", "x10^6/uL", "4.5-6.0"), r("Hb", "15.5", "g/dL", "13.5-17.5"),
  r("HCT", "46.4", "%", "40-52"), r("MCV", "79.4", "fL", "80-96"), r("MCH", "26.6", "pg", "27-33"), r("MCHC", "33.4", "g/dL", "32-36"),
  r("RDW-CV", "13.1", "%", "11.5-14.5"), r("PLT", "245", "x10^3/uL", "150-450"), r("PDW", "16.2", "", "9-20"),
  r("FBS", "92", "mg/dL", "70-100"), r("Urea", "32", "mg/dL", "15-45"), r("Creatinine", "1.23", "mg/dL", "0.7-1.3"),
  r("Uric Acid", "8.2", "mg/dL", "3.6-8.2"), r("Cholesterol", "193", "mg/dL"), r("Triglyceride", "153", "mg/dL"),
  r("HDL", "42", "mg/dL"), r("LDL", "112", "mg/dL"), r("SGOT (AST)", "33", "U/L"), r("SGPT (ALT)", "48", "U/L"),
  r("ALP", "140", "U/L", "80-306"), r("CK", "357", "U/L"), r("Albumin", "5.3", "g/dL", "3.5-5.2"), r("Calcium", "9.9", "mg/dL"),
  r("Ferritin", "85", "ng/mL", "30-400"), r("Vitamin B12", "251", "pg/mL", "200-835"), r("TSH", "3.0", "mIU/L"),
  r("T4", "8.1", "ug/dL", "5-12"), r("T3", "1.2", "", "0.52-2.1"), r("ESR", "5", "mm/hr"),
  r("Urine Protein", "Neg"), r("Urine Blood", "Neg"), r("Urine RBC", "0-1", "/hpf"),
];

test("V0: برگهٔ نمونه — فوریتِ کل routine؛ نه کلیه، نه تیروئید، نه «مرحلهٔ ۲»، نه نتیجه‌گیریِ ارثیِ خلافِ منتزر", () => {
  const { p } = run(SHEET);
  assert.equal(p.overall_urgency, "routine", `فوریت: ${p.overall_urgency} — ${ids(p)}`);
  for (const id of ["kidney_impairment", "thyroid_nonthyroidal_illness", "thal_trait_likely"]) {
    assert.ok(!ids(p).includes(id), `${id} نباید فعال شود: ${ids(p)}`);
  }
  const all = JSON.stringify(p.findings);
  assert.doesNotMatch(all, /مرحلهٔ ۲/);
  assert.doesNotMatch(all, /بیشتر به حالت ارثی می‌خورد/);
  assert.ok(!(find(p, "unexplained_abnormal")?.uncovered ?? []).includes("MCH"), "MCHِ پایین جملهٔ خودش را دارد");
});

test("V1: T3 — ng/mL ×۱۰۰؛ بی‌واحد با بازهٔ «0.52-2.1» حدس زده نمی‌شود؛ «80-200» همچنان ng/dL (کنترل)", () => {
  const ngml = run([r("T3", "1.2", "ng/mL", "0.52-1.85"), r("TSH", "3.0", "mIU/L")]);
  assert.equal(g(ngml.e, "T3")?.value, 120);
  assert.equal(g(ngml.e, "T3")?.abnormal, false);
  const bare = run([r("T3", "1.2", "", "0.52-2.1"), r("TSH", "3.0", "mIU/L")]);
  assert.equal(g(bare.e, "T3"), undefined, "T3ِ بی‌واحدِ مبهم نباید سنجیده شود");
  assert.ok(!ids(bare.p).includes("thyroid_nonthyroidal_illness"));
  assert.match(find(bare.p, "unit_unknown_values")?.must_say ?? "", /در محدودهٔ مرجعی است که خودِ آزمایشگاه کنارش چاپ کرده/);
  const conv = run([r("T3", "120", "", "80-200"), r("TSH", "3.0", "mIU/L")]);
  assert.equal(g(conv.e, "T3")?.value, 120, "ng/dL از نامزدهای دیگر دور است و هنوز تعیین می‌شود");
  const si = run([r("T3", "1.2", "nmol/L"), r("TSH", "3.0", "mIU/L")]);
  assert.equal(g(si.e, "T3")?.value, 78, "nmol/L ِ چاپ‌شده همان تبدیلِ قبلی");
});

test("V2: کراتینینِ مرد تا ۱٫۳ طبیعی است؛ زن و جنسِ نامعلوم دست‌نخورده", () => {
  assert.equal(g(run([r("Creatinine", "1.25", "mg/dL")]).e, "CREAT").abnormal, false);
  assert.equal(g(run([r("Creatinine", "1.35", "mg/dL")]).e, "CREAT").abnormal, true);
  assert.equal(g(run([r("Creatinine", "1.15", "mg/dL")], { age: 36, sex: "F" }).e, "CREAT").abnormal, true);
  assert.equal(g(run([r("Creatinine", "1.25", "mg/dL")], { age: 36 }).e, "CREAT").abnormal, true, "بی جنس eGFR نیست ⇒ سقف ۱٫۲ می‌ماند");
});

test("V3: کراتینینِ درجهٔ ۱ با eGFR ≥ ۶۰ ⇒ روتین، بی «مرحلهٔ ۲»؛ eGFR < ۶۰ همان «این هفته» (کنترل)", () => {
  const { p } = run([r("Creatinine", "1.2", "mg/dL")], { age: 29, sex: "F" });
  const k = find(p, "kidney_impairment");
  assert.ok(k, `kidney فعال نشد: ${ids(p)}`);
  assert.equal(k.urgency, "routine");
  assert.match(k.headline, /کراتینین شما کمی بالاتر/);
  assert.doesNotMatch(k.must_say, /مرحلهٔ ۲/);
  assert.match(k.must_say, /به‌تنهایی بیماری کلیه حساب نمی‌شود/);
  assert.doesNotMatch(k.action, /این هفته/, "N20: دستور از همان فوریت");
  const low = find(run([r("Creatinine", "1.6", "mg/dL")], { age: 60, sex: "F" }).p, "kidney_impairment");
  assert.equal(low?.urgency, "this_week", "eGFR < ۶۰ با کراتینینِ بالا");
});

test("V4: منتزرِ ≥ ۱۳ تالاسمی را نتیجه نمی‌گیرد؛ منتزرِ < ۱۳ همان thal_trait_likely (کنترل)", () => {
  const hi = run([r("Hb", "15.5", "g/dL"), r("RBC", "5.84"), r("MCV", "79.4", "fL"), r("MCH", "26.6", "pg"), r("Ferritin", "85", "ng/mL")]);
  assert.ok(!ids(hi.p).includes("thal_trait_likely"), `منتزر ${hi.e.indices.mentzer}: ${ids(hi.p)}`);
  assert.match(find(hi.p, "microcytosis_no_anemia")?.must_say ?? "", /MCH شما 26\.6/);
  const lo = run([r("Hb", "15.8", "g/dL"), r("RBC", "7.13"), r("MCV", "67.3", "fL"), r("MCH", "22.2", "pg")]);
  assert.ok(ids(lo.p).includes("thal_trait_likely"), `منتزر ${lo.e.indices.mentzer}: ${ids(lo.p)}`);
});

test("V5: T3ِ پایین بی‌FT4 — T4ِ تامِ چاپ‌شده نام برده می‌شود؛ بی T4 جملهٔ قبلی؛ فوریت دست‌نخورده (N29)", () => {
  const withT4 = run([r("T3", "60", "ng/dL"), r("TSH", "2.0", "mIU/L"), r("T4", "8.1", "ug/dL")]);
  const f = find(withT4.p, "thyroid_nonthyroidal_illness");
  assert.ok(f, `فعال نشد: ${ids(withT4.p)}`);
  assert.match(f.must_say, /T4 تامِ شما 8\.1 .* در محدوده است/);
  assert.doesNotMatch(f.must_say, /بدونِ آن کم‌کاریِ ناشی از غدهٔ هیپوفیز را نمی‌توان کنار گذاشت/);
  const noT4 = find(run([r("T3", "60", "ng/dL"), r("TSH", "2.0", "mIU/L")]).p, "thyroid_nonthyroidal_illness");
  assert.match(noT4.must_say, /بدونِ آن کم‌کاریِ ناشی از غدهٔ هیپوفیز را نمی‌توان کنار گذاشت/);
  assert.equal(f.urgency, noT4.urgency);
});

test("V6: CK و میوگلوبین در دستگاهِ «قلب» نیستند؛ CKِ بالا امتیازِ قلب را پایین نمی‌آورد", () => {
  assert.equal(SCORE_TABLE.CK, undefined);
  assert.equal(SCORE_TABLE.MYOGLOBIN, undefined);
  const lip = [r("Cholesterol", "180", "mg/dL"), r("TG", "120", "mg/dL"), r("HDL", "50", "mg/dL"), r("LDL", "100", "mg/dL"),
    r("Hb", "15", "g/dL"), r("WBC", "6"), r("PLT", "250"), r("Creatinine", "0.9", "mg/dL"), r("ALT", "20")];
  const heart = (tests) => { const { e, p } = run(tests); return healthScore(e, p).systems?.find((s) => s.id === "heart")?.score; };
  assert.equal(heart([...lip, r("CK", "357", "U/L")]), heart(lip));
});

// ── P108-ج (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶): پایداریِ ALT/AST با نوبتِ قبلی ──
const ALT48 = [r("ALT", "48", "U/L")];
const priorAlt = (v, date) => ({ date, graded: [{ test: "ALT", value: v, abnormal: v > 41, dir: v > 41 ? "high" : null, range: "0–41" }] });
const liver = (tests, extra = {}) => runPatterns(runEngine({ patient: M36, tests, ...extra })).findings.find((f) => f.rule_id === "liver_pattern");

test("V7: ALT ۴۸ تک‌نوبت ⇒ routine، برچسبِ «تک‌نوبت»، تکرارِ ۴–۱۲ هفته با پرهیزها، بی هپاتیت/سونو/ALP/GGT", () => {
  const f = liver(ALT48);
  assert.equal(f.urgency, "routine");
  assert.match(f.must_say, /\(تک‌نوبت\)/);
  assert.match(f.action, /۴ تا ۱۲ هفته بعد تکرار کنید؛ تا آن موقع از ورزشِ سنگین، الکل، استامینوفن و مکملِ گیاهی پرهیز کنید/);
  assert.deepEqual(f.suggest, ["تکرار ALT و AST"]);
  assert.doesNotMatch(f.must_say, /ALP هم لازم است/);
  // کنترل: ALT ≥ ۲×ULN (۱۰۰) تک‌نوبت ⇒ همان بررسیِ کامل
  assert.ok(liver([r("ALT", "100", "U/L")]).suggest.includes("هپاتیت B و C"));
});

test("V8: ALT ۴۸ با قبلیِ ۴۶ پس از ۸ هفته ⇒ soon «پایدار» + بررسیِ کامل؛ قبلیِ طبیعی ⇒ routine «تازه»؛ قبلیِ بالا ولی ۲ هفته ⇒ routine", () => {
  const per = liver(ALT48, { prior: priorAlt(46, "2026-08-21"), sampleDate: "2026-10-16" });
  assert.equal(per.urgency, "soon");
  assert.match(per.must_say, /حدودِ ۸ هفته پیش\) هم ALT \(آنزیم کبدی\) بالا بود \(46\)؛ یعنی این افزایش دست‌کم ۴ هفته پایدار/);
  assert.ok(per.suggest.includes("هپاتیت B و C") && per.suggest.includes("سونوگرافی شکم"));
  const fresh = liver(ALT48, { prior: priorAlt(30, "2026-08-21"), sampleDate: "2026-10-16" });
  assert.equal(fresh.urgency, "routine");
  assert.match(fresh.must_say, /طبیعی بود \(30\)؛ پس این افزایشِ تازه است/);
  const early = liver(ALT48, { prior: priorAlt(46, "2026-10-02"), sampleDate: "2026-10-16" });
  assert.equal(early.urgency, "routine");
  assert.match(early.must_say, /کمتر از ۴ هفته است/);
});

test("V9: ALT بالا + CK بالا ⇒ «منشأ عضلانی محتمل است» و تکرار حذف نمی‌شود", () => {
  const f = liver([...ALT48, r("CK", "400", "U/L")]);
  assert.match(f.must_say, /منشأ عضلانی محتمل است؛ با این حال تکرارِ آزمایشِ کبد لازم است/);
  assert.match(f.action, /تکرار کنید/);
});

test("V10: Na ۱۴۷ هرگز «جزئی» نیست (ردهٔ ۱)", () => {
  const g147 = runEngine({ patient: M36, tests: [r("Na", "147", "mmol/L")] }).graded.find((x) => x.test === "NA");
  assert.equal(g147.abnormal, true);
  assert.equal(isMinorDeviation(g147), false);
  const p = runPatterns(runEngine({ patient: M36, tests: [r("Na", "147", "mmol/L"), r("Cholesterol", "210", "mg/dL")] }));
  assert.ok(!p.findings.some((f) => f.minor_cap));
});

test("V11: بی prior خروجیِ موتور کلیدِ prior ندارد؛ تاریخِ نامعتبر/آینده ⇒ نوبتِ قبلی نداریم", () => {
  assert.equal(runEngine({ patient: M36, tests: ALT48 }).prior, undefined);
  assert.equal(runEngine({ patient: M36, tests: ALT48, prior: priorAlt(46, "x"), sampleDate: "2026-10-16" }).prior, undefined);
  assert.equal(runEngine({ patient: M36, tests: ALT48, prior: priorAlt(46, "2026-11-01"), sampleDate: "2026-10-16" }).prior, undefined);
});

test("V12: تاریخِ نمونهٔ چاپ‌شده — شمسی/میلادی/ارقامِ فارسی ⇒ ISO؛ مبهم، آینده، ۱۰+ سال و اسفندِ ۳۰ ِ غیرکبیسه ⇒ null", () => {
  const now = Date.parse("2026-10-16");
  const cases = { "۱۴۰۵/۰۷/۲۴": "2026-10-16", "24/07/1405": "2026-10-16", "1404/01/01": "2025-03-21", "1403/12/30": "2025-03-20",
    "تاریخ پذیرش: ۱۴۰۵/۰۵/۰۱": "2026-07-23", "2026-10-16": "2026-10-16", "16/10/2026": "2026-10-16",
    "1404/12/30": null, "03/04/2026": null, "1405/07/26": null, "1395/01/01": null, "x": null };
  for (const [s, want] of Object.entries(cases)) assert.equal(parseSampleDate(s, now), want, s);
});

test("V13: فاصلهٔ دو نوبت با تاریخِ نمونهٔ چاپ‌شده سنجیده می‌شود؛ برگهٔ فعلیِ قدیمی‌تر از نوبتِ قبلی ⇒ نوبتِ قبلی نداریم", () => {
  const prior = priorAlt(46, "2026-08-11");
  const e = runEngine({ patient: { ...M36, sample_date: "۱۴۰۵/۰۷/۲۴" }, tests: ALT48, prior });
  assert.equal(e.sample_date, "2026-10-16");
  assert.equal(e.prior.weeks, 9.4);
  const old = runEngine({ patient: { ...M36, sample_date: "1405/04/01" }, tests: ALT48, prior });   // 2026-06-22 < 2026-08-11
  assert.equal(old.prior, undefined);
});

// ── P109 (برگهٔ واقعی ۲۰۲۶-۱۰-۱۶): ردیف‌هایی که خوانده می‌شدند و تفسیر نمی‌شدند ──
const allOf = (tests, patient = M36) => { const e = runEngine({ patient, tests }); return { e, p: runPatterns(e) }; };
const byId = (p, id) => p.findings.find((f) => f.rule_id === id);

test("V14: روی — مرزهای IZiNCG (مرد ۶۱/۷۴، کودک ۵۷/۶۵)؛ µmol/L تبدیل؛ بی‌واحد و بارداری بی‌حکم؛ از خطِ «تفسیر نشدند» بیرون", () => {
  const z = (v, u, pt) => byId(allOf([r("Zinc", v, u)], pt).p, "zinc_status");
  assert.equal(z("60", "ug/dl").pattern, "zinc_low");
  assert.equal(z("72", "µg/dL").pattern, "zinc_borderline");
  assert.equal(z("90", "µg/dL").pattern, "zinc_ok");
  assert.equal(z("130", "µg/dL").pattern, "zinc_high");
  assert.equal(z("9", "µmol/L").pattern, "zinc_low");   // ۹ × ۶٫۵۴ ≈ ۵۸٫۸
  assert.equal(z("60", "µg/dL", { sex: "M", age: 8 }).pattern, "zinc_borderline");   // کودک: ۵۷–۶۵
  assert.equal(z("60", "µg/dL", { sex: "F", age: 28, pregnant: true }).pattern, "zinc_nojudge");
  assert.equal(z("60", null), undefined, "بی‌واحد حکم نمی‌گیرد");
  for (const v of ["60", "72", "90", "130"]) assert.equal(z(v, "µg/dL").urgency, "routine");
  assert.match(z("60", "ug/dl").must_say, /\(61 میکروگرم در دسی‌لیتر، مربوط به نمونهٔ بعدازظهر\)/);
});

test("V15: H. pylori IgM — به qual و یافتهٔ بی‌حکم؛ h_pylori_result نمی‌خواندش؛ کنارِ آنتی‌ژنِ مدفوع پیشنهادِ تکراری ندارد", () => {
  const { e, p } = allOf([r("H.Pylori IgM", "Positive")]);
  assert.ok("H.Pylori IgM" in e.qual && !e.unmapped.includes("H.Pylori IgM"));
  const f = byId(p, "hpylori_igm_result");
  assert.equal(f.urgency, "routine");
  assert.match(f.must_say, /اعتبارِ کافی ندارد: چه مثبت باشد چه منفی/);
  assert.ok(!byId(p, "h_pylori_result"));
  const both = byId(allOf([r("H.Pylori IgM", "Positive"), r("H. pylori Ag (stool)", "Negative")]).p, "hpylori_igm_result");
  assert.deepEqual(both.suggest, []);
  assert.match(both.must_say, /روی همین برگه هست و تصمیم بر پایهٔ همان است/);
});

test("V16: لام — میکروسیتوز با MCVِ پایین/طبیعی/بالا/غایب چهار جملهٔ جدا؛ آنیزوسیتوز با RDW؛ «Negative» = دیده نشد", () => {
  const s = (rows) => byId(allOf(rows).p, "smear_rbc_size")?.must_say ?? "";
  assert.match(s([r("Microcytosis", "+"), r("MCV", "74", "fL")]), /هم‌خوان است/);
  assert.match(s([r("Microcytosis", "+"), r("MCV", "88", "fL")]), /در محدوده است؛ توصیفِ لام کیفی است/);
  assert.match(s([r("Microcytosis", "+"), r("MCV", "104", "fL")]), /هم‌جهت نیست/);
  assert.match(s([r("Microcytosis", "+")]), /MCV روی این برگه نیست/);
  assert.match(s([r("Anisocytosis", "++"), r("RDW-CV", "16.5", "%")]), /RDW.*هم‌خوان است/);
  assert.match(s([r("Hypochromia", "Negative")]), /هیپوکرومی در لام دیده نشده است/);
});

test("V17: eAG — کنارِ HbA1c بی‌حکم؛ تنها: معادلِ HbA1c با ADAG (۱۵۴ ⇒ ۷٪ ⇒ this_week)؛ mmol/L؛ بی‌واحدِ مبهم بی‌حکم", () => {
  const f = (rows) => byId(allOf(rows).p, "eag_result");
  assert.match(f([r("Estimated Average Gl", "126", "mg/dl"), r("HbA1c", "6.0", "%")]).must_say, /جداگانه حکم نمی‌گیرد/);
  const alone = f([r("Estimated Average Gl", "154", "mg/dl")]);
  assert.equal(alone.urgency, "this_week");
  assert.match(alone.must_say, /HbA1c ِ حدودِ 7٪/);
  assert.match(f([r("eAG", "8.6", "mmol/L")]).must_say, /حدودِ 7٪/);   // (8.6 + 2.59) / 1.59 ≈ 7.0
  assert.equal(f([r("eAG", "110", "mg/dL")]).urgency, "routine");          // ≈ 5.5٪
  assert.match(f([r("eAG", "40")]).must_say, /واحدِ این عدد هم معلوم نشد/);
});

test("V18: شاخصِ آتروژنیک — فرمول از هویتِ عددی با چربی‌های همان برگه؛ AIPِ مولی با مرزِ Dobiášová؛ AIPِ mg/dL تبدیل؛ بی‌چربی بی‌حکم", () => {
  const lip = [r("Cholesterol", "230", "mg/dL"), r("HDL", "50", "mg/dL"), r("TG", "150", "mg/dL")];
  const a = (v, rows = lip) => byId(allOf([r("Atherosclerosis index", v), ...rows]).p, "atherogenic_index").must_say;
  assert.match(a("4.6"), /شاخصِ کاستلیِ ۱/);
  assert.doesNotMatch(a("4.6"), /گروهِ «/);
  assert.match(a("0.12"), /نسبتِ مولی.*گروهِ «متوسط»/);           // log10((150/88.57)/(50/38.67)) ≈ 0.117
  assert.match(a("0.48"), /با واحدِ mg\/dL حساب شده؛ AIP ِ استاندارد.*0\.12/);   // log10(150/50) = 0.477
  assert.match(a("4.6", []), /معلوم نشد کدام است/);
});

test("V19: املاها — Alk.Ph، Fe، Vit D (25 OH)، PT Patient سنجیده می‌شوند؛ «Blood (RBC/Hgb)» خونِ ادرار؛ «U/C» کشتِ ادرار با نوبتِ بدتر؛ «Total» و کشتِ بی‌U/C حدس زده نمی‌شوند", () => {
  const { e } = allOf([r("Alk.Ph", "350", "U/L"), r("Fe", "40", "ug/dl"), r("Vit D (25 OH)", "15", "ng/ml"), r("PT Patient", "13.6", "sec")]);
  for (const k of ["ALP", "IRON", "VIT_D", "PT"]) assert.ok(e.graded.some((x) => x.test === k), `${k}: ${e.unmapped}`);
  const blood = allOf([r("Blood (RBC/Hgb)", "2+")]);
  assert.equal(blood.e.qual["Urine Blood"], "2+");
  assert.ok(blood.p.findings.some((f) => /hematuria/.test(f.rule_id)), blood.p.findings.map((f) => f.rule_id).join());
  assert.ok(allOf([r("Blood (RBC/Hgb)", "12")]).e.unmapped.includes("Blood (RBC/Hgb)"));
  const uc = byId(allOf([r("U/C First", "Negative"), r("Culture(after 48 hrs)", "E. coli >100000 CFU/ml")]).p, "urine_culture_result");
  assert.equal(uc.urgency, "this_week", "مثبتِ ۴۸ ساعته زیرِ منفیِ نوبتِ اول گم نشود");
  assert.ok(allOf([r("Culture(after 48 hrs)", "No growth")]).e.unmapped.includes("Culture(after 48 hrs)"));
  assert.ok(allOf([r("Total", "6.8", "g/dl")]).e.unmapped.includes("Total"));
});

test("V20: همان شخص — سنِ امروز باید با سنِ نوبتِ قبلی + فاصله بخواند (رواداری ۱٫۵ سال)", () => {
  const pr = (age) => ({ ...priorAlt(46, "2026-08-11"), age });
  const at = (age, prior) => runEngine({ patient: { sex: "M", age }, tests: ALT48, prior, sampleDate: "2026-10-16" }).prior;
  assert.ok(at(36, pr(36)), "همان سن، ۹ هفته بعد");
  assert.ok(at(37, pr(36)), "تولد میانِ دو نوبت");
  assert.equal(at(36, pr(62)), undefined, "سنِ دیگر ⇒ شخصِ دیگر");
  assert.ok(at(36, priorAlt(46, "2026-08-11")), "سنِ قبلی نامعلوم ⇒ فقط جنس سنجیده می‌شود");
});
