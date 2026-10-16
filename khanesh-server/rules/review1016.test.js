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
import { runPatterns, RULES } from "./patterns.js";
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
  assert.doesNotMatch(all, /(کلیه|CKD)[^"]{0,40}مرحلهٔ ۲/);   // P110-ج: «مرحلهٔ ۲» حالا پیگیریِ ALT در نمای تخصصی است
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
  assert.match(find(bare.p, "unit_unknown_values")?.must_say ?? "", /داخلِ بازهٔ مرجعِ چاپ‌شدهٔ آزمایشگاه \(0\.52 تا 2\.1\)/);   // P110-ج: با بازهٔ چاپی «طبیعی»، یک خط
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
  // P110-ج: «پرهیز تا ۴ تا ۱۲ هفته» حذف؛ الکل/استامینوفن/مکمل فقط یک بار، در هشدار.
  assert.match(f.action, /آزمایشِ کبد را ۴ تا ۱۲ هفته بعد تکرار کنید/);
  assert.doesNotMatch(f.action, /استامینوفن|پرهیز/);
  assert.equal([f.action, ...f.warnings].filter((x) => /استامینوفن/.test(x)).length, 1);
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
  const f = liver([...ALT48, r("AST", "33", "U/L"), r("CK", "400", "U/L")]);
  // P110: CKِ کمی بالا (< ۵×سقف) در همین یافته با عدد گفته و تکرارش خواسته می‌شود؛ کارتِ جدای CK نمی‌آید (V22).
  // P110-ج: AST ِ طبیعی کنارِ CK ِ بالا ⇒ «کبدِ چرب یا دارو هم محتمل است»؛ تکرار ≈ یک هفته بعد، بی‌ورزشِ سنگین.
  assert.match(f.must_say, /CK ِ بالا اغلب از ورزشِ سنگین.*AST \(33\) طبیعی است، پس کبدِ چرب یا اثرِ دارو و مکمل هم محتمل است/);
  assert.match(f.action, /آزمایشِ کبد و CK را حدودِ یک هفته بعد تکرار کنید/);
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
// P110: یافتهٔ بی‌اقدام در runPatterns به یک خط تبدیل می‌شود؛ متنِ کاملِ قاعده را مستقیم از build می‌خوانیم.
const fullOf = (rows, id) => { const e = runEngine({ patient: M36, tests: rows }); return RULES.find((x) => x.id === id).build(e); };

test("V14: روی — بی‌بازهٔ چاپی فقط مرزِ صبحِ غیرناشتای IZiNCG (مرد ۷۰، کودک ۶۵) (P110-ب، پیش‌تر سه مرز)؛ µmol/L تبدیل؛ بی‌واحد و بارداری بی‌حکم", () => {
  const z = (v, u, pt) => byId(allOf([r("Zinc", v, u)], pt).p, "zinc_status");
  assert.equal(z("60", "ug/dl").pattern, "zinc_low");
  assert.equal(z("72", "µg/dL").pattern, "zinc_ok");   // پیش‌تر «مرزی» (۷۰–۷۴)؛ تصمیمِ بازبین: یک مرز
  assert.equal(z("90", "µg/dL").pattern, "zinc_ok");
  assert.equal(z("130", "µg/dL").pattern, "zinc_high");
  assert.equal(z("9", "µmol/L").pattern, "zinc_low");   // ۹ × ۶٫۵۴ ≈ ۵۸٫۸
  assert.equal(z("60", "µg/dL", { sex: "M", age: 8 }).pattern, "zinc_low");   // کودک: ۶۵
  assert.equal(z("60", "µg/dL", { sex: "F", age: 28, pregnant: true }).pattern, "zinc_nojudge");
  assert.equal(z("60", null), undefined, "بی‌واحد حکم نمی‌گیرد");
  for (const v of ["60", "72", "90", "130"]) assert.equal(z(v, "µg/dL").urgency, "routine");
  assert.match(z("60", "ug/dl").must_say, /آزمایشگاه بازه‌ای چاپ نکرده؛ .*صبحِ غیرناشتا 70 میکروگرم/);
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
  const s = (rows) => fullOf(rows, "smear_rbc_size")?.must_say ?? "";
  assert.match(s([r("Microcytosis", "+"), r("MCV", "74", "fL")]), /هم‌خوان است/);
  assert.match(s([r("Microcytosis", "+"), r("MCV", "88", "fL")]), /در محدوده است؛ توصیفِ لام کیفی است/);
  assert.match(s([r("Microcytosis", "+"), r("MCV", "104", "fL")]), /هم‌جهت نیست/);
  assert.match(s([r("Microcytosis", "+")]), /MCV روی این برگه نیست/);
  assert.match(s([r("Anisocytosis", "++"), r("RDW-CV", "16.5", "%")]), /RDW.*هم‌خوان است/);
  assert.match(s([r("Hypochromia", "Negative")]), /هیپوکرومی در لام دیده نشده است/);
  // P110: هم‌خوان/طبیعی ⇒ یک خطِ بی‌اقدام با عددِ MCV؛ ناهم‌جهت یافتهٔ کامل می‌ماند.
  const conc = byId(allOf([r("Microcytosis", "+"), r("MCV", "74", "fL")]).p, "smear_rbc_size");
  assert.equal(conc.minor, true);
  assert.match(conc.must_say, /هم‌خوان با MCV.* 74/);
  assert.ok(!byId(allOf([r("Microcytosis", "+"), r("MCV", "104", "fL")]).p, "smear_rbc_size").minor);
});

test("V17: eAG — کنارِ HbA1c بی‌حکم؛ تنها: معادلِ HbA1c با ADAG (۱۵۴ ⇒ ۷٪ ⇒ this_week)؛ mmol/L؛ بی‌واحدِ مبهم بی‌حکم", () => {
  const f = (rows) => byId(allOf(rows).p, "eag_result");
  assert.match(fullOf([r("Estimated Average Gl", "126", "mg/dl"), r("HbA1c", "6.0", "%")], "eag_result").must_say, /جداگانه حکم نمی‌گیرد/);
  assert.match(f([r("Estimated Average Gl", "126", "mg/dl"), r("HbA1c", "6.0", "%")]).must_say, /جداگانه حکم ندارد/);   // P110: خطِ بی‌اقدام
  const alone = f([r("Estimated Average Gl", "154", "mg/dl")]);
  assert.equal(alone.urgency, "this_week");
  assert.match(alone.must_say, /HbA1c ِ حدودِ 7٪/);
  assert.match(f([r("eAG", "8.6", "mmol/L")]).must_say, /حدودِ 7٪/);   // (8.6 + 2.59) / 1.59 ≈ 7.0
  assert.equal(f([r("eAG", "110", "mg/dL")]).urgency, "routine");          // ≈ 5.5٪
  assert.match(fullOf([r("eAG", "40")], "eag_result").must_say, /واحدِ این عدد هم معلوم نشد/);
  assert.equal(f([r("eAG", "110", "mg/dL")]).minor, true);                // P110: زیرِ پیش‌دیابت ⇒ یک خط
  assert.ok(!alone.minor, "eAG در محدودهٔ دیابت یافتهٔ کامل می‌ماند");
});

test("V18: شاخصِ آتروژنیک — فرمول از هویتِ عددی با چربی‌های همان برگه؛ AIPِ مولی با مرزِ Dobiášová؛ AIPِ mg/dL تبدیل؛ بی‌چربی بی‌حکم", () => {
  const lip = [r("Cholesterol", "230", "mg/dL"), r("HDL", "50", "mg/dL"), r("TG", "150", "mg/dL")];
  const a = (v, rows = lip) => fullOf([r("Atherosclerosis index", v), ...rows], "atherogenic_index").must_say;
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

// ═══ P110 (گزارشِ کاربر ۲۰۲۶-۱۰-۱۶: «همون برگه بعد از تغییرات») — طول، تکرار، ترتیب، و هفت باگِ خوانش ═══
// برگهٔ کامل‌ترِ همان بیمار: ردیف‌های P109 + بازه‌های چاپ‌شدهٔ برگه.
const SHEET2 = [
  ...SHEET.filter((x) => !["PDW", "Albumin", "Uric Acid"].includes(x.name)),
  r("PDW", "16.2", "%", "9-20"), r("MPV", "12.1", "fL", "7-13"), r("Albumin", "5.3", "g/dL", "3.5-5.2"), r("Uric Acid", "8.2", "mg/dL", "3.6-8.2"),
  r("Neutrophils", "58", "%", "40-75"), r("Lymphocytes", "33", "%", "20-45"), r("Total", "100", "%"), r("Microcytosis", ""),
  r("Estimated Average Gl", "108", "mg/dL"), r("Atherosclerosis index", "4.6"), r("Zinc", "95", null, "72-127"),
  r("H.Pylori IgM", "13.8", "U/ml", "<40"), r("CRP-Q", "5", "IU/ml", "<6"), r("Ep.cell", "1-2"),
  r("U/C First", "Negative"), r("Culture(after 48 hrs)", "No growth"),
];

test("V21: بازهٔ برگه — هم‌حکم با موتور ⇒ فقط بازهٔ برگه؛ حکمِ متفاوت (اسید اوریکِ ۸٫۲: سقفِ موتور ۷٫۲، برگه ۸٫۲) ⇒ هر دو", () => {
  const { p } = run(SHEET2);
  assert.match(find(p, "hyperuricemia")?.must_say ?? "", /حد طبیعی 3\.5–7\.2؛ روی برگهٔ شما 3\.6[–-]8\.2/);
  // هم‌حکم: پلاکتِ ۱۲۷ زیرِ هر دو بازه (موتور ۱۵۰–۴۰۰، برگه ۱۵۰–۴۵۰) ⇒ فقط بازهٔ برگه.
  const plt = run([r("WBC", "6", "x10^3/uL"), r("Hb", "13", "g/dL"), r("Platelet", "127", "x1000/mm3", "150-450")]);
  const t = plt.p.findings.map((f) => f.must_say).join(" ");
  assert.match(t, /\(حد طبیعی 150[–-]450\)/);
  assert.ok(!/روی برگهٔ شما/.test(t), "هم‌حکم ⇒ یک بازه");
});

test("V22: ALT ۴۸ + CK ۳۵۷ تک‌نوبت ⇒ CK با عدد و بازه داخلِ یافتهٔ کبد، بی‌کارتِ جدای CK؛ CK ≥ ۵×سقف کارتِ خودش را نگه می‌دارد", () => {
  const { p } = run(SHEET2);
  const lv = byId(p, "liver_pattern");
  assert.match(lv.must_say, /CK \(آنزیم مخصوص عضله\) هم 357 است \(حد طبیعی/);
  assert.ok(!/سلول‌های کبد تحریک شده‌اند/.test(lv.must_say), "کنارِ «منشأ عضلانی» نه");
  assert.ok(lv.suggest.includes("تکرار ALT، AST و CK"));
  assert.ok(!byId(p, "ck_elevated_alone"), "کارتِ جدای CK تکرار است");
  const big = run([r("SGPT (ALT)", "48", "U/L"), r("CK", "1500", "U/L")]).p;
  assert.ok(byId(big, "ck_elevated_alone"), "CK ۱۵۰۰ (≥ ۵×) هشدارِ رابدومیولیزِ خودش را دارد");
});

test("V23: H. pylori IgM ۱۳٫۸ (مرز <۴۰) ⇒ منفی، بی‌پیشنهاد، بی‌قطعِ PPI، یک خط؛ مثبت ⇒ پیشنهاد فقط مشروط به علامت", () => {
  const neg = byId(run([r("H.Pylori IgM", "13.8", "U/ml", "<40")]).p, "hpylori_igm_result");
  assert.equal(neg.minor, true);
  assert.deepEqual(neg.suggest, []);
  assert.deepEqual(neg.warnings, []);
  assert.match(neg.must_say, /منفی/);
  const pos = byId(run([r("H.Pylori IgM", "55", "U/ml", "<40")]).p, "hpylori_igm_result");
  assert.ok(!pos.minor);
  assert.deepEqual(pos.suggest, []);
  assert.match(pos.warnings.join(" "), /^اگر علامتِ گوارشی دارید/);
});

test("V24: گلبولِ کمی کوچک با فریتینِ ۸۵ ⇒ بی‌«قرص آهن نخورید»، الکتروفورز فقط مشروط؛ بی‌فریتین هر دو مثلِ قبل", () => {
  const f = byId(run(SHEET2).p, "microcytosis_no_anemia");
  assert.ok(!f.warnings.some((w) => /قرص آهن/.test(w)), f.warnings.join(" | "));
  assert.ok(!f.suggest.includes("الکتروفورز هموگلوبین"));
  assert.ok(f.warnings.some((w) => /اگر قصدِ ازدواج.*الکتروفورز/.test(w)));
  const noFer = byId(run([r("Hb", "15", "g/dL"), r("MCV", "76", "fL"), r("RBC", "5.2", "x10^6/uL")]).p, "microcytosis_no_anemia");
  assert.ok(noFer.warnings.some((w) => /قرص آهن/.test(w)));
  assert.ok(noFer.suggest.includes("الکتروفورز هموگلوبین"));
});

test("V25: چربی — TGِ مرزیِ ۱۵۳ با LDLِ طبیعی بی‌پاراگرافِ «پلاک»، یک جملهٔ ناشتا، بی‌«پروفایل چربی ناشتا»؛ LDLِ ۱۵۰ پلاک دارد", () => {
  const f = byId(run(SHEET2).p, "lipid_profile");
  assert.ok(!/پلاک/.test(f.must_say), f.must_say);
  assert.match(f.must_say, /تری‌گلیسرید بیش از همه از قند/);
  assert.equal(f.warnings.filter((w) => /ناشتا/.test(w)).length, 0, f.warnings.join(" | "));   // P110-ج: TG ۱۵۳ ⇒ بی‌قیدِ ناشتا (فقط > ۴۴۰)
  assert.ok(!f.suggest.some((s) => /پروفایل چربی ناشتا/.test(s)));
  assert.match(byId(run([r("LDL", "150", "mg/dL"), r("Cholesterol", "240", "mg/dL")]).p, "lipid_profile").must_say, /پلاک/);
});

test("V26: B12 ۲۵۱ بی‌کم‌خونی و بی‌گلبولِ درشت ⇒ یک خطِ مشروط به علامت، بی‌MMA در فهرست؛ کنارِ MCV ۱۰۰ همان یافتهٔ کامل", async () => {
  const { buildEngineRecommendations } = await import("./prompt.js");
  const { e, p } = run(SHEET2);
  const b = byId(p, "borderline_b12_deficiency");
  assert.equal(b.minor, true);
  assert.match(b.must_say, /گزگز/);
  assert.ok(!buildEngineRecommendations(p, e).some((x) => /MMA/.test(x)));
  const macro = byId(run([r("Vitamin B12", "251", "pg/mL"), r("MCV", "100", "fL"), r("Hb", "15", "g/dL")]).p, "borderline_b12_deficiency");
  assert.ok(!macro.minor && macro.suggest.includes("MMA"));
});

test("V27: آلبومین ۵٫۳ قاعدهٔ خودش را دارد (بی‌«توضیحِ آماده نداریم»)؛ همهٔ موارد بی‌اقدام یک پاراگرافِ موتور، نه متنِ مدل", async () => {
  const { buildEnginePrompt, engineSummary } = await import("./prompt.js");
  const { minorParagraph } = await import("./printed.js");
  const { e, p } = run(SHEET2);
  assert.ok(byId(p, "albumin_high_alone")?.minor);
  assert.ok(!p.findings.some((f) => /unexplained|unmatched/.test(f.rule_id)), p.findings.map((f) => f.rule_id).join());
  const minorIds = p.findings.filter((f) => f.minor).map((f) => f.rule_id).sort();
  for (const id of ["albumin_high_alone", "atherogenic_index", "borderline_b12_deficiency", "eag_result", "hpylori_igm_result", "urine_culture_result", "zinc_status"])
    assert.ok(minorIds.includes(id), `${id} یک خط نشد: ${minorIds}`);
  const sent = JSON.parse(buildEnginePrompt(e, p).content).findings.map((f) => f.headline);
  assert.equal(sent.length, p.findings.filter((f) => !f.minor).length, "یافتهٔ بی‌اقدام به مدل نمی‌رود");
  const para = minorParagraph(p);
  for (const n of ["251", "108", "13.8"]) assert.ok(para.includes(n), `عددِ ${n} در پاراگرافِ موارد دیگر نیست (N18)`);
  // P110-ج (تصمیمِ کاربر): آلبومینِ کمتر از ۱۰٪ بالای حد و شاخصِ آتروژنیک فقط در جدول (table_only)؛ یافته‌شان هست ولی خطِ جدا نه.
  for (const n of ["5.3", "4.6"]) assert.ok(!para.includes(n), `عددِ ${n} باید فقط در جدول باشد`);
  assert.ok(byId(p, "albumin_high_alone").table_only && byId(p, "atherogenic_index").table_only);
  assert.match(engineSummary(e, p), /^بیشترِ نتایج \(.+ از .+\) در محدودهٔ طبیعی است و هیچ موردی فوری نیست/);
  assert.equal(engineSummary(e, { ...p, overall_urgency: "this_week" }), null);
});

test("V28: ترتیبِ یافته‌های routine — بیشترین انحراف اول (کبد+CK، اسید اوریک، چربی، گلبولِ کوچک)، بی‌اقدام‌ها آخر", () => {
  const fs = run(SHEET2).p.findings;
  const order = fs.map((f) => f.rule_id);
  const pos = (id) => order.indexOf(id);
  assert.ok(pos("liver_pattern") < pos("hyperuricemia") && pos("hyperuricemia") < pos("lipid_profile") && pos("lipid_profile") < pos("microcytosis_no_anemia"), order.join());
  const firstMinor = fs.findIndex((f) => f.minor);
  assert.ok(firstMinor > 0 && fs.slice(firstMinor).every((f) => f.minor), order.join());
});

test("V29: خوانش — «Total» ِ جمعِ فرمول، Microcytosis ِ خالی، Ep.cell، CRP-Q، رویِ بی‌واحد با بازهٔ چاپی، PDW با بازهٔ برگه", () => {
  const { e, p } = run(SHEET2);
  assert.deepEqual(e.unmapped, [], `تفسیر نشدند: ${e.unmapped}`);
  assert.ok(Object.keys(e.qual).some((k) => /Ep\.cell/.test(k)));
  assert.ok(g(e, "CRP_Q"), "CRP-Q");
  const zn = byId(p, "zinc_status");
  assert.match(zn.must_say, /^رویِ سرم 95: داخلِ بازهٔ چاپ‌شدهٔ آزمایشگاه \(72–127\)$/);   // P110-ب: حکم از بازهٔ چاپی
  const plt = run([r("PLT", "120", "x10^3/uL"), r("PDW", "16.2", "%", "9-20")]).p;
  const pi = byId(plt, "platelet_indices_context");
  assert.match(pi.must_say, /PDW.* 16\.2 \(بازهٔ چاپ‌شدهٔ آزمایشگاه 9-20\)/);
  assert.ok(!/35–55/.test(pi.must_say));
  const mpv = byId(run([r("PLT", "245", "x10^3/uL"), r("MPV", "12.1", "fL", "7-13")]).p, "mpv_abnormal");
  assert.equal(mpv.minor, true);
  assert.match(mpv.must_say, /داخلِ بازهٔ چاپ‌شدهٔ آزمایشگاه \(7[–-]13\)/);
});

test("V30: بی‌اقدام فقط routine است — یافتهٔ فوری‌تر هرگز یک خط نمی‌شود (eAG ۱۵۴ ⇒ this_week، کامل)", () => {
  const f = byId(run([r("Estimated Average Gl", "154", "mg/dl")]).p, "eag_result");
  assert.equal(f.urgency, "this_week");
  assert.ok(!f.minor);
  assert.ok(f.suggest.length > 0);
});

// ═══ P110-ب (تصمیمِ بازبینِ کاربر ۲۰۲۶-۱۰-۱۶): معیارِ کشوریِ تالاسمی، آهنِ تنها، روی با بازهٔ چاپی، eAG با HbA1c، AIP، جنس از عنوان ═══
test("V31: آهنِ سرمِ پایینِ تنها ⇒ iron_low_alone (بی‌«توضیحِ آماده نداریم»)؛ با فریتینِ ۸۵ یک خط؛ کنارِ کم‌خونیِ میکروسیتیک کنار می‌رود", () => {
  const alone = run([r("Fe", "40", "ug/dL"), r("Hb", "15", "g/dL")]).p;
  const f = byId(alone, "iron_low_alone");
  assert.ok(f, alone.findings.map((x) => x.rule_id).join());
  assert.ok(!byId(alone, "unmatched_abnormal") && !byId(alone, "unexplained_abnormal"));
  assert.match(f.must_say, /^آهنِ سرمِ شما 40 است \(حد طبیعی .+\)\. آهنِ سرم به‌تنهایی کمبودِ آهن را نشان نمی‌دهد/);
  assert.deepEqual(f.suggest, ["فریتین"]);
  const withFer = byId(run([r("Fe", "40", "ug/dL"), r("Ferritin", "85", "ng/mL"), r("Hb", "15", "g/dL")]).p, "iron_low_alone");
  assert.equal(withFer.minor, true);
  assert.match(withFer.must_say, /فریتینِ 85/);
  assert.ok(!byId(run([r("Fe", "40", "ug/dL"), r("Hb", "9", "g/dL"), r("MCV", "70", "fL")]).p, "iron_low_alone"), "N20: مالکِ کم‌خونی");
});

test("V32: معیارِ کشوری — MCH < ۲۷ با MCVِ طبیعی دیگر «توضیحِ آماده نداریم» نیست؛ جملهٔ مشروطِ غربالگری، نه درخواستِ مستقیم", () => {
  const p = run([r("Hb", "15", "g/dL"), r("MCV", "82", "fL"), r("MCH", "26.5", "pg"), r("RBC", "5.6", "x10^6/uL")]).p;
  const f = byId(p, "microcytosis_no_anemia");
  assert.ok(f && !byId(p, "unmatched_abnormal"), p.findings.map((x) => x.rule_id).join());
  assert.match(f.must_say, /^اندازهٔ متوسط گلبول‌ها \(MCV\) 82 در محدوده است، ولی MCH شما 26\.5/);
  assert.ok(!f.suggest.includes("الکتروفورز هموگلوبین"));
  assert.ok(f.warnings.some((w) => /یا تا حالا غربالگریِ تالاسمی نشده‌اید/.test(w)));
});

test("V33: MCV < ۷۸ و MCH < ۲۶ ⇒ الکتروفورزِ مستقیم حتی با فریتینِ ۸۵؛ هشدارِ آهن فقط با فریتین، نه منتزر", () => {
  const f = byId(run([r("Hb", "15", "g/dL"), r("MCV", "76", "fL"), r("MCH", "25", "pg"), r("RBC", "5.2", "x10^6/uL"), r("Ferritin", "85", "ng/mL")]).p, "microcytosis_no_anemia");
  assert.ok(f.suggest.includes("الکتروفورز هموگلوبین"));
  assert.ok(!f.warnings.some((w) => /قرص آهن/.test(w)));
  // منتزرِ ۱۲٫۳ (thal_trait) با فریتینِ ۸۵: پیش‌تر «قرص آهن نخورید» بی‌شرط و الکتروفورزِ مستقیم؛ MCV ۷۹ ⇒ مشروط
  const t = byId(run([r("Hb", "14.5", "g/dL"), r("MCV", "79", "fL"), r("MCH", "26.5", "pg"), r("RBC", "6.4", "x10^6/uL"), r("Ferritin", "85", "ng/mL")]).p, "thal_trait_no_anemia");
  assert.ok(!t.warnings.some((w) => /قرص آهن/.test(w)), t.warnings.join(" | "));
  assert.ok(!t.suggest.includes("الکتروفورز هموگلوبین"));
  assert.ok(t.warnings.some((w) => /غربالگریِ تالاسمی نشده‌اید/.test(w)));
});

test("V34: روی با بازهٔ چاپ‌شده — ۶۵ کنارِ ۷۲–۱۲۷ «پایین» است (پیش‌تر با IZiNCG ۷۰–۷۴ «پایین» نبود)", () => {
  const f = byId(run([r("Zinc", "65", null, "72-127")]).p, "zinc_status");
  assert.equal(f.pattern, "zinc_low");
  assert.match(f.must_say, /از حدِ پایینِ بازهٔ چاپ‌شدهٔ آزمایشگاه \(72–127\) کمتر است/);
});

test("V35: eAG ِ بی‌واحد — واحد با HbA1c ِ همان برگه تأیید می‌شود؛ بی‌HbA1c حدس از بزرگی نه (بی‌حکم)", () => {
  const ok = byId(run([r("Estimated Average Gl", "91.06"), r("HbA1c", "4.8", "%")]).p, "eag_result");
  assert.match(ok.must_say, /^میانگینِ تخمینیِ قند \(eAG\) 91\.06 mg\/dL: برگردانِ همان HbA1c/);
  const bad = byId(run([r("Estimated Average Gl", "150"), r("HbA1c", "4.8", "%")]).p, "eag_result");
  assert.match(bad.must_say, /جور نیست/);
  const none = byId(run([r("Estimated Average Gl", "154")]).p, "eag_result");
  assert.equal(none.urgency, "routine", "۱۵۴ ِ بی‌واحد پیش‌تر از بزرگی mg/dL ⇒ HbA1c ۷ ⇒ this_week");
  assert.ok(none.minor);
});

test("V36: AIP ِ «بیشتر» هم یک خطِ بی‌پیگیری است", () => {
  const f = byId(run([r("Atherosclerosis index", "0.44"), r("Triglycerides", "250", "mg/dL"), r("HDL", "40", "mg/dL")]).p, "atherogenic_index");
  assert.equal(f.minor, true);
  assert.match(f.must_say, /«بیشتر»/);
});

test("V37: جنس از عنوانِ پیش از نام (آقای/خانم/Mr/Mrs) وقتی OCR خودِ عنوان را برمی‌گرداند", () => {
  const sx = (s) => runEngine({ patient: { sex: s, age: "40" }, tests: [r("Hb", "13", "g/dL")] }).sex;
  assert.equal(sx("آقای"), "M");
  assert.equal(sx("خانم"), "F");
  assert.equal(sx("Mrs."), "F");
  assert.equal(sx("Mr"), "M");
  assert.equal(sx("Miss"), "F");
});

// ═══ P110-ج (برگهٔ واقعی ۲۰۲۶-۱۰-۱۶ + قواعدِ بالینیِ بازبینِ کاربر) ═══
test("V38: «Up to: 6» با دونقطه خوانده می‌شود؛ CRP ۵ IU/ml ⇒ سنجیده با بازهٔ چاپی (mg/L)، واحدِ چاپ‌شده در سطرِ «واحدها»، بی‌«ممکن است خارج از محدوده»", () => {
  const { e, p } = run([r("CRP(quantitative)", "5.0", "IU/ml", "Up to: 6"), r("Hb", "15", "g/dL")]);
  assert.ok(g(e, "CRP_Q"), "CRP گرفته شد");
  const uc = e.unitConversions.find((c) => c.test === "CRP_Q");
  assert.equal(uc?.printedUnit, "IU/ml");
  assert.ok(!JSON.stringify(p.findings).includes("ممکن است خارج از محدودهٔ طبیعی باشد"));
  const t3 = run([r("T3", "1.2", "mmol/L", "0.52 - 2.1"), r("TSH", "3.0", "mIU/L")]);
  const u = find(t3.p, "unit_unknown_values");
  assert.equal(u.minor, true);
  assert.match(u.must_say, /^T3 تام 1\.2: داخلِ بازهٔ مرجعِ چاپ‌شدهٔ آزمایشگاه \(0\.52 تا 2\.1\) است؛ واحدِ چاپ‌شده \(«mmol\/L»\)/);
  // خارج از بازهٔ چاپی: جملهٔ قدیمی نمی‌آید ولی یافتهٔ کامل می‌ماند
  const out = find(run([r("T3", "3.2", "mmol/L", "0.52 - 2.1"), r("TSH", "3.0", "mIU/L")]).p, "unit_unknown_values");
  assert.ok(!out.minor);
  assert.match(out.must_say, /واحدِ چاپ‌شده \(«mmol\/L»\) برای این آزمایش شناخته‌شده نیست.*بیرون از محدودهٔ مرجعی/);
});

test("V39: micg/dl = µg/dL (T4، آهن، TIBC، روی)؛ /hpf چسبیده به نام؛ Microcytosis «Slightly»", () => {
  const { e } = run([r("T4", "9.5", "micg/dl", "4.5 - 12.5"), r("Fe", "92", "mcg/dl", "50 - 150"), r("Bacteria /hpf", "Not seen"), r("Mucus threads /hpf", "Not seen"), r("Microcytosis", "Slightly"), r("MCV", "79.4", "fL")]);
  assert.equal(g(e, "T4")?.value, 9.5);
  assert.ok(!e.unitConversions.some((c) => c.test === "T4" && c.basis !== "printed"), "micg/dl شناخته می‌شود، نه بی‌واحد");
  assert.deepEqual(e.unmapped, [], String(e.unmapped));
  assert.equal(e.rbcMorph[0].qty, "minor");
});

test("V40: ALT ۴۸ + CK ۳۵۷ + AST ۳۳ ⇒ «AST ِ طبیعی ⇒ کبدِ چرب/دارو هم محتمل»؛ تکرارِ ≈ یک هفته؛ الکل/استامینوفن/مکمل فقط یک بار؛ pro: افتراقیِ مرحله‌ای", () => {
  const f = liver([...ALT48, r("AST", "33", "U/L"), r("CK", "357", "U/L"), r("Ferritin", "85", "ng/mL"), r("Fe", "92", "ug/dL"), r("TIBC", "347", "ug/dL"), r("ALP", "140", "U/L"), r("INR", "1.0")]);
  assert.match(f.must_say, /AST \(33\) طبیعی است، پس کبدِ چرب یا اثرِ دارو و مکمل هم محتمل است/);
  assert.match(f.action, /حدودِ یک هفته بعد/);
  assert.doesNotMatch(f.action, /۴ تا ۱۲ هفته|استامینوفن/);
  assert.equal([f.action, ...f.warnings].filter((x) => /استامینوفن/.test(x)).length, 1);
  assert.ok(f.pro.differential[0].startsWith("منشأ عضلانی") && /MASLD/.test(f.pro.differential[1]));
  assert.ok(f.pro.differential.some((d) => /هموکروماتوز — کم‌احتمال/.test(d)) && f.pro.differential.some((d) => /کلستاز\) — کم‌احتمال/.test(d)));
  assert.ok(/مرحلهٔ ۰/.test(f.pro.workup[0]) && /فقط اگر ALT در تکرار بالا ماند \(مرحلهٔ ۱\): HBsAg، Anti-HCV و سونوگرافی/.test(f.pro.workup[1]) && /مرحلهٔ ۲.*ANA.*سرولوپلاسمین/.test(f.pro.workup[2]));
  // AST روی برگه نیست ⇒ جملهٔ جدا (N4)
  assert.match(liver([...ALT48, r("CK", "357", "U/L")]).must_say, /AST روی این برگه نیست/);
});

test("V41: FIB-4 و AIP فقط محاسبه‌شده (indices)؛ هیچ یافته‌ای نمی‌سازند؛ FIB-4 در ≤ ۳۵ سال برچسبِ دقتِ پایین", () => {
  const { e, p } = run([r("AST", "33", "U/L"), r("ALT", "48", "U/L"), r("PLT", "239", "x10^3/uL"), r("Triglyceride", "153", "mg/dL"), r("HDL", "46", "mg/dL")]);
  assert.equal(e.indices.fib4, +((36 * 33) / (239 * Math.sqrt(48))).toFixed(2));
  assert.equal(e.indices.aip, 0.16);
  assert.ok(!e.indices.fib4_low_accuracy);
  assert.equal(run([r("AST", "33", "U/L"), r("ALT", "48", "U/L"), r("PLT", "239", "x10^3/uL")], { age: 30, sex: "M" }).e.indices.fib4_low_accuracy, true);
  assert.ok(!ids(p).some((x) => /fib|aip/i.test(x)));
});

test("V42: اسید اوریک — بی‌جملهٔ «کراتینین بالا نیست ⇒ کلیه کمتر»؛ حدِ انحلال ۶٫۸؛ دارو برای بی‌علامت لازم نیست (ACR 2020)", () => {
  const f = find(run([r("Uric Acid", "8.2", "mg/dL", "3.6 - 8.2"), r("Creatinine", "1.23", "mg/dL")]).p, "hyperuricemia");
  assert.doesNotMatch(f.must_say, /کراتینین \(1\.23\)|کمتر محتمل/);
  assert.match(f.must_say, /۶٫۸/);
  assert.match(f.must_say, /داروی کاهندهٔ اسید اوریک لازم نیست/);
  assert.deepEqual(f.sources, ["ACR_GOUT_2020"]);
});

test("V43: TG — قیدِ ناشتا و «پروفایل چربی ناشتا» فقط بالای ۴۴۰ (EAS/EFLM)", () => {
  const lip = (tg) => run([r("Triglyceride", String(tg), "mg/dL"), r("HDL", "46", "mg/dL"), r("LDL", "112", "mg/dL")]).p.findings.find((f) => f.rule_id === "lipid_profile");
  for (const tg of [153, 300, 440]) {
    const f = lip(tg);
    assert.ok(!f.warnings.some((w) => /ناشتا/.test(w)) && !f.suggest.some((x) => /ناشتا/.test(x)), `TG ${tg}`);
  }
  const hi = lip(460);
  assert.ok(hi.warnings.some((w) => /از ۴۴۰ بالاتر است/.test(w)) && hi.suggest.some((x) => /ناشتا/.test(x)));
});

test("V44: میکروسیتوز — بی‌هشدارِ ⚠️ِ بارداری؛ MCV ۷۶ و MCH ۲۵ مستقیم، بی‌«قرص آهن» با فریتینِ ۸۵", () => {
  const f = run([r("Hb", "15", "g/dL"), r("MCV", "76", "fL"), r("MCH", "25", "pg"), r("RBC", "6.4", "x10^6/uL"), r("Ferritin", "85", "ng/mL")]).p.findings.find((x) => x.rule_id === "thal_trait_no_anemia");
  assert.ok(f.suggest.includes("الکتروفورز هموگلوبین"));
  assert.ok(!f.warnings.some((w) => /⚠️|قرص آهن/.test(w)), f.warnings.join(" | "));
});

test("V45: آلبومین کمتر از ۱۰٪ بالای حد ⇒ table_only؛ بیشتر ⇒ خطِ «موارد دیگر»", () => {
  const near = find(run([r("Albumin", "5.3", "g/dL", "3.5 - 5.2")]).p, "albumin_high_alone");
  assert.ok(near.minor && near.table_only);
  const far = find(run([r("Albumin", "5.9", "g/dL", "3.5 - 5.2")]).p, "albumin_high_alone");
  assert.ok(far.minor && !far.table_only);
  assert.match(far.must_say, /معمولاً/);
});
