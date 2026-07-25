// ============================================================
// تست‌های رگرسیون موتور قواعد — با node:test داخلی (بدون وابستگی خارجی)
// اجرا: npm test  (یا: node --test)
//
// هر تست دقیقاً یکی از باگ‌های رفع‌شده را پوشش می‌دهد تا دوباره برنگردد.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";

import { creatRef, getRef, esrRef, ckdEpiEgfr } from "./refs.js";
import { evaluate } from "./grade.js";
import { runEngine, parseTitre } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { buildEngineFallbackResult, buildEngineRecommendations, ENGINE_SYSTEM_PROMPT,
         tidyRecommendations, phraseSuggestion } from "./prompt.js";
import { extractMedlineTerms, matchesMedlineKey, TEST_MEDLINE_MAP } from "./medline.js";
import { missingSentences, missingFindingText, normalizeFa, splitSentences, distinctiveTokens } from "./coverage.js";

// ---------- A1: کراتینین با سن نامعلوم ----------
test("A1: creatRef با سن null محدودهٔ بالغ می‌دهد نه نوزادی", () => {
  assert.deepEqual(creatRef(null), [0.6, 1.2]);
  assert.deepEqual(creatRef(undefined), [0.6, 1.2]);
  assert.deepEqual(creatRef(1), [0.3, 0.6]);   // نوزاد واقعی
  assert.deepEqual(creatRef(40), [0.6, 1.2]);
});

test("A1: getRef('CREAT') با سن null → بالغِ جنس‌محور", () => {
  // کراتینین اکنون جنس‌محور است (زنان تودهٔ عضلانی کمتر → کف پایین‌تر).
  assert.deepEqual(getRef("CREAT", "M", null), [0.6, 1.2]);
  assert.deepEqual(getRef("CREAT", "F", null), [0.5, 1.1]);
  assert.deepEqual(getRef("CREAT", null, null), [0.6, 1.2]);  // جنس نامعلوم → بازهٔ بازتر
});

test("A1: کراتینین ۱.۰ با سن نامعلوم غیرطبیعی شمرده نمی‌شود", () => {
  const e = runEngine({ tests: [{ name: "Creatinine", value: "1.0" }] });
  const cr = e.graded.find((g) => g.test === "CREAT");
  assert.ok(cr, "کراتینین باید نگاشت شود");
  assert.equal(cr.abnormal, false);
});

// ---------- A3: تطبیق مرزکلمه‌ای MedlinePlus ----------
test("A3: 'fasting blood sugar' نباید به تست‌های کبدی نگاشت شود", () => {
  const terms = extractMedlineTerms("Fasting Blood Sugar: 95").map((t) => t.term);
  assert.ok(!terms.includes("Liver Function Tests"), "زیررشتهٔ ast نباید مطابقت کند");
});

test("A3: تطبیق واقعیِ استاندالون همچنان کار می‌کند", () => {
  assert.deepEqual(extractMedlineTerms("AST: 40").map((t) => t.term), ["Liver Function Tests"]);
  assert.deepEqual(extractMedlineTerms("BUN: 18").map((t) => t.term), ["BUN (Blood Urea Nitrogen)"]);
});

test("A3: matchesMedlineKey مرز واژه را رعایت می‌کند", () => {
  assert.equal(matchesMedlineKey("fasting blood sugar", "ast"), false);
  assert.equal(matchesMedlineKey("ast", "ast"), true);
  assert.equal(matchesMedlineKey("aptt", "pt"), false);   // pt داخل aptt نباید مطابقت کند
});

// ---------- A4: سیگنال nearLimit ----------
test("A4: مقدار طبیعیِ نزدیک حد بالا، nearLimit=true می‌دهد", () => {
  const r = evaluate("HGB", 17.4, 13.5, 17.5); // در محدوده ولی نزدیک سقف
  assert.equal(r.abnormal, false);
  assert.equal(r.nearLimit, true);
});

test("A4: مقدار وسط محدوده nearLimit=false", () => {
  const r = evaluate("HGB", 15.5, 13.5, 17.5);
  assert.equal(r.abnormal, false);
  assert.equal(r.nearLimit, false);
});

// ---------- A2: نتیجهٔ قطعیِ جایگزین هنگام خطای JSON مدل ----------
test("A2: buildEngineFallbackResult یافته‌ها و has_critical را حفظ می‌کند", () => {
  const patternOut = {
    has_critical: true,
    overall_urgency: "emergency",
    findings: [
      {
        headline: "اسیدوز دیابتی محتمل",
        must_say: "این یک وضعیت خطرناک است.",
        action: "همین حالا به اورژانس بروید.",
        suggest: ["کتون خون"],
        warnings: ["مایعات فراوان بنوشید."],
        forbid: [],
        urgency: "emergency",
      },
    ],
  };
  const engineOut = { abnormal: [{ test: "GLU_F", value: 480, fa: "بحرانی — خیلی بالا" }] };
  const fb = buildEngineFallbackResult(engineOut, patternOut);
  assert.equal(fb.has_critical, true);
  assert.ok(fb.interpretation.includes("خطرناک"));
  assert.ok(fb.general_recommendations.includes("همین حالا به اورژانس بروید."));
  assert.ok(fb.general_recommendations.some((r) => r.includes("کتون خون")));
});

test("A2: buildEngineRecommendations تست‌های forbid را حذف می‌کند", () => {
  const recs = buildEngineRecommendations({
    findings: [{ action: "به پزشک مراجعه کنید", suggest: ["فروس"], warnings: [], forbid: ["فروس"] }],
  });
  assert.ok(!recs.some((r) => r.includes("فروس")), "تست ممنوع نباید در توصیه‌ها بماند");
  assert.ok(recs.includes("به پزشک مراجعه کنید"));
});

// ---------- A5: الگوی کبدی بدون ALP ----------
test("A5: ALT/AST بالا بدون ALP → unspecified، نه cholestatic، و ALP پیشنهاد می‌شود", () => {
  const e = runEngine({
    patient: { age: 40, sex: "M" },
    tests: [{ name: "ALT", value: "120" }, { name: "AST", value: "110" }],
  });
  const p = runPatterns(e);
  const liver = p.findings.find((f) => typeof f.pattern === "string" && f.pattern.startsWith("liver_"));
  assert.ok(liver, "باید یک یافتهٔ کبدی باشد");
  assert.equal(liver.pattern, "liver_unspecified");
  assert.ok(liver.suggest.includes("ALP"), "باید ALP را پیشنهاد دهد");
  assert.ok(!liver.must_say.includes("صفرا"), "بدون ALP نباید ادعای cholestatic کند");
});

// ---------- A8 (رگرسیون): چند اورژانس همزمان حذف نمی‌شوند ----------
test("A8: هنگام وجود blocker اورژانسی، selected خالی نمی‌شود و اورژانس می‌ماند", () => {
  // تروپونین بالا = اورژانس (blocks_others) در کنار یک تست کم‌اهمیت‌تر.
  const e = runEngine({
    patient: { age: 50, sex: "M" },
    tests: [{ name: "Troponin I", value: "5" }, { name: "Cholesterol", value: "260" }],
  });
  const p = runPatterns(e);
  assert.ok(p.findings.length > 0, "selected نباید خالی باشد");
  assert.equal(p.overall_urgency, "emergency");
  assert.equal(p.has_critical, true);
});

// ---------- ارقام فارسی/عربی (toNum از طریق موتور) ----------
test("locale: ارقام فارسی درست پارس می‌شوند", () => {
  const e = runEngine({ patient: { sex: "F", age: 30 }, tests: [{ name: "Hb", value: "۱۰" }] });
  const hb = e.graded.find((g) => g.test === "HGB");
  assert.ok(hb, "هموگلوبین باید نگاشت شود");
  assert.equal(hb.value, 10);
  assert.equal(hb.abnormal, true); // ۱۰ برای زن پایین است
});

// ---------- گریدینگ پایه ----------
test("grading: ESR سن/جنس‌محور", () => {
  assert.deepEqual(esrRef("M", 40), [0, 15]);
  assert.deepEqual(esrRef("F", 40), [0, 20]);
});

test("grading: MCV به‌صورت classifier برچسب می‌خورد", () => {
  const micro = evaluate("MCV", 70, 80, 100);
  assert.equal(micro.mode, "classifier");
  assert.equal(micro.abnormal, true);
});

// ---------- C1: HbA1c بزرگسال دیگر بی‌صدا حذف نمی‌شود ----------
test("C1: getRef('HBA1C') برای بزرگسال محدوده دارد (قبلاً null بود)", () => {
  assert.deepEqual(getRef("HBA1C", "M", 40), [4, 5.6]);
  assert.deepEqual(getRef("HBA1C", "F", 55), [4, 5.6]);
});

test("C1: HbA1c بزرگسال درجه‌بندی و در الگوی قند دیده می‌شود", () => {
  const e = runEngine({ patient: { age: 45, sex: "M" }, tests: [{ name: "HbA1c", value: "7.5" }] });
  const a1c = e.graded.find((g) => g.test === "HBA1C");
  assert.ok(a1c, "HbA1c بزرگسال باید درجه‌بندی شود، نه اینکه حذف شود");
  assert.equal(a1c.abnormal, true);
  const p = runPatterns(e);
  const dm = p.findings.find((f) => f.pattern === "diabetes_range");
  assert.ok(dm, "HbA1c ۷.۵ باید الگوی محدودهٔ دیابت را فعال کند");
});

// ---------- C2: قند تصادفی (BS) در الگوهای قند لحاظ می‌شود ----------
test("C2: قند تصادفی ۳۲۰ → محدودهٔ دیابت", () => {
  // «Blood Sugar»/«BS» به GLU_RANDOM نگاشت می‌شود
  const e = runEngine({ patient: { age: 50, sex: "F" }, tests: [{ name: "Blood Sugar", value: "320" }] });
  const p = runPatterns(e);
  assert.ok(p.findings.some((f) => f.pattern === "diabetes_range"),
    "قند تصادفی ۳۲۰ باید محدودهٔ دیابت را فعال کند، نه اینکه فقط تور ایمنی عمومی بگیرد");
});

test("C2: قند تصادفی بالا + کتون → DKA اورژانسی", () => {
  const e = runEngine({
    patient: { age: 30, sex: "M" },
    tests: [
      { name: "Blood Sugar", value: "520" },
      { name: "Urine Ketone", value: "positive" },
    ],
  });
  const p = runPatterns(e);
  assert.ok(p.findings.some((f) => f.pattern === "dka_pattern"),
    "قند تصادفی بالا + کتون باید DKA بدهد");
  assert.equal(p.overall_urgency, "emergency");
});

test("C2: قند تصادفی پایین → هایپوگلیسمی", () => {
  const e = runEngine({ patient: { age: 40, sex: "F" }, tests: [{ name: "Blood Sugar", value: "48" }] });
  const p = runPatterns(e);
  assert.ok(p.findings.some((f) => String(f.pattern).startsWith("hypoglycemia")),
    "قند تصادفی ۴۸ باید هایپوگلیسمی بدهد");
});

// ---------- R1: کلسیم تصحیح‌شده با آلبومین ----------
test("R1: کلسیم ۸.۰ با آلبومین ۲.۰ تصحیح می‌شود و هیپوکلسمی کاذب نمی‌دهد", () => {
  const e = runEngine({
    patient: { age: 50, sex: "M" },
    tests: [{ name: "Calcium", value: "8.0" }, { name: "Albumin", value: "2.0" }],
  });
  const ca = e.graded.find((g) => g.test === "CA");
  assert.equal(e.indices.ca_corrected, 9.6);            // 8.0 + 0.8×(4−2)
  assert.equal(e.indices.ca_correction_applied, true);
  assert.equal(ca.value, 9.6);
  assert.equal(ca.abnormal, false, "کلسیم تصحیح‌شده طبیعی است");
  const p = runPatterns(e);
  assert.ok(!p.findings.some((f) => f.pattern === "hypocalcemia"), "نباید هیپوکلسمی کاذب بدهد");
});

test("R1: با آلبومین طبیعی، کلسیم پایین همچنان پایین می‌ماند", () => {
  const e = runEngine({
    patient: { age: 50, sex: "M" },
    tests: [{ name: "Calcium", value: "8.0" }, { name: "Albumin", value: "4.0" }],
  });
  const ca = e.graded.find((g) => g.test === "CA");
  assert.equal(e.indices.ca_correction_applied, undefined);
  assert.equal(ca.abnormal, true);
});

// ---------- R2: شکاف آنیونی بالا ----------
test("R2: Na140/Cl100/HCO3 18 → شکاف آنیونی بالا", () => {
  const e = runEngine({
    patient: { age: 45, sex: "M" },
    tests: [
      { name: "Sodium", value: "140" }, { name: "Chloride", value: "100" },
      { name: "Bicarbonate", value: "18" },
    ],
  });
  assert.equal(e.indices.anion_gap, 22);
  const p = runPatterns(e);
  assert.ok(p.findings.some((f) => f.pattern === "high_anion_gap"), "باید شکاف آنیونی بالا بدهد");
});

// ---------- R3: eGFR (CKD-EPI 2021) ----------
test("R3: ckdEpiEgfr مقدار معقول می‌دهد", () => {
  const egfr = ckdEpiEgfr(1.0, 50, "M");
  assert.ok(egfr >= 88 && egfr <= 96, `eGFR باید ~۹۲ باشد، شد ${egfr}`);
});

test("R3: eGFR پایین با کراتینین طبیعی، الگوی کلیه را فعال می‌کند", () => {
  const e = runEngine({ patient: { age: 80, sex: "F" }, tests: [{ name: "Creatinine", value: "1.1" }] });
  const cr = e.graded.find((g) => g.test === "CREAT");
  assert.equal(cr.abnormal, false, "کراتینین ۱.۱ برای بزرگسال طبیعی است");
  assert.ok(e.indices.egfr < 60, `eGFR باید < ۶۰ باشد، شد ${e.indices.egfr}`);
  const p = runPatterns(e);
  const kidney = p.findings.find((f) => f.pattern === "kidney_impairment" || f.pattern === "prerenal_pattern");
  assert.ok(kidney, "eGFR پایین باید الگوی کلیه را فعال کند");
  assert.equal(kidney.urgency, "routine");
});

// ---------- R4: آستانهٔ اورژانس پتاسیم ----------
test("R4: پتاسیم ۶.۲ اکنون اورژانس است (قبلاً this_week)", () => {
  const e = runEngine({ patient: { age: 50, sex: "M" }, tests: [{ name: "Potassium", value: "6.2" }] });
  const p = runPatterns(e);
  const k = p.findings.find((f) => f.pattern === "hyperkalemia");
  assert.ok(k, "باید هیپرکالمی بدهد");
  assert.equal(k.urgency, "emergency");
  assert.equal(p.has_critical, true);
});

// ---------- R6: سدیم تصحیح‌شده در هایپرگلیسمی ----------
test("R6: سدیم ۱۲۸ با قند ۶۰۰ تصحیح می‌شود و هیپوناترمی کاذب نمی‌دهد", () => {
  const e = runEngine({
    patient: { age: 45, sex: "M" },
    tests: [{ name: "Sodium", value: "128" }, { name: "Blood Sugar", value: "600" }],
  });
  const na = e.graded.find((g) => g.test === "NA");
  assert.equal(e.indices.na_correction_applied, true);
  assert.equal(na.value, 140, "128 + 0.024×(600−100) = 140");
  assert.equal(na.abnormal, false);
  const p = runPatterns(e);
  assert.ok(!p.findings.some((f) => f.pattern === "hyponatremia"), "نباید هیپوناترمی کاذب بدهد");
});

// ---------- R7: رتیکولوسیت در کم‌خونی نورموسیتیک ----------
test("R7: کم‌خونی نورموسیتیک با رتیکولوسیت بالا به همولیز/خونریزی اشاره می‌کند", () => {
  const e = runEngine({
    patient: { age: 30, sex: "F" },
    tests: [{ name: "Hemoglobin", value: "10" }, { name: "MCV", value: "90" }, { name: "Retic", value: "3.0" }],
  });
  const p = runPatterns(e);
  const nc = p.findings.find((f) => f.pattern === "normocytic_anemia");
  assert.ok(nc, "باید کم‌خونی نورموسیتیک بدهد");
  assert.ok(nc.must_say.includes("رتیکولوسیت بالاست"));
  assert.ok(nc.suggest.includes("هاپتوگلوبین"));
});

// ---------- R8: حد بالای TSH از ۵ به ۴.۵ ----------
test("R8: TSH محدودهٔ بزرگسال [0.5, 4.5] است", () => {
  assert.deepEqual(getRef("TSH", "F", 35), [0.5, 4.5]);
});

test("R8: TSH ۴.۷ اکنون غیرطبیعی (کم‌کاری تحت‌بالینی) است", () => {
  const e = runEngine({ patient: { age: 35, sex: "F" }, tests: [{ name: "TSH", value: "4.7" }] });
  const tsh = e.graded.find((g) => g.test === "TSH");
  assert.equal(tsh.abnormal, true, "۴.۷ اکنون بالای حد ۴.۵ است");
});

// ---------- U1: pH ادرار با pH خون اشتباه گرفته می‌شد (اورژانس کاذب) ----------
// برگهٔ واقعی کاربر: فقط pH نگاشت شد → severe_acidosis → «اورژانس» کاذب.
const URINE_SHEET = [
  { name: "Color", value: "Yellow" },
  { name: "Appearance", value: "Clear" },
  { name: "Specific Gravity", value: "1.015" },
  { name: "pH", value: "5" },
  { name: "Protein", value: "Negative" },
  { name: "Glucose", value: "Negative" },
  { name: "Blood/Hgb", value: "Negative" },
  { name: "Bilirubin", value: "Negative" },
  { name: "Casts", value: "Negative" },
  { name: "Crystals", value: "Negative" },
];

test("U1: pH ادرار ۵ دیگر pH خون خوانده نمی‌شود و اورژانس کاذب نمی‌سازد", () => {
  const e = runEngine({ patient: { age: 30, sex: "F" }, tests: URINE_SHEET });
  assert.equal(e.graded.find((g) => g.test === "PH"), undefined, "pH نباید به‌عنوان pH خون درجه‌بندی شود");
  assert.ok("Urine pH" in e.qual, "pH باید به‌عنوان pH ادرار در qual بنشیند");
  const p = runPatterns(e);
  assert.ok(!p.findings.some((f) => f.pattern === "severe_acidosis"), "نباید اسیدوز شدید بدهد");
  assert.equal(p.has_critical, false, "نباید اورژانس کاذب بسازد");
});

test("U1: pH واقعی خون (۷.۲) همچنان درست درجه‌بندی می‌شود", () => {
  const e = runEngine({
    patient: { age: 60, sex: "M" },
    tests: [{ name: "pH", value: "7.2" }, { name: "HCO3", value: "14" }],
  });
  const ph = e.graded.find((g) => g.test === "PH");
  assert.ok(ph, "pH در دامنهٔ خون باید به‌عنوان pH خون بماند");
  assert.equal(ph.abnormal, true);
  const p = runPatterns(e);
  assert.ok(p.findings.some((f) => f.pattern === "severe_acidosis"), "اسیدوز واقعی باید تشخیص داده شود");
});

test("U1: WBC/RBC ادراری با واحد /hpf شمارش خون خوانده نمی‌شوند", () => {
  const e = runEngine({
    patient: { age: 30, sex: "F" },
    tests: [
      ...URINE_SHEET,
      { name: "WBC", value: "2", unit: "/hpf" },
      { name: "RBC", value: "1", unit: "/hpf" },
    ],
  });
  assert.equal(e.graded.find((g) => g.test === "WBC"), undefined, "WBC ادراری نباید WBC خون شود");
  assert.equal(e.graded.find((g) => g.test === "RBC"), undefined, "RBC ادراری نباید RBC خون شود");
  const p = runPatterns(e);
  assert.equal(p.has_critical, false);
});

test("U1: برگهٔ ترکیبی (CBC + ادرار) تست‌های خون را از دست نمی‌دهد", () => {
  // اگر یک صفحه هم CBC داشته باشد هم ادرار، نباید WBC/RBC/HGB خون ادراری تلقی شوند.
  const e = runEngine({
    patient: { age: 30, sex: "F" },
    tests: [
      { name: "Color", value: "Yellow" }, { name: "Specific Gravity", value: "1.015" },
      { name: "WBC", value: "6.2" }, { name: "RBC", value: "4.7" },
      { name: "Hgb", value: "13" }, { name: "MCV", value: "88" }, { name: "PLT", value: "250" },
    ],
  });
  assert.ok(e.graded.find((g) => g.test === "WBC"), "WBC خون باید حفظ شود");
  assert.ok(e.graded.find((g) => g.test === "HGB"), "هموگلوبین خون باید حفظ شود");
  assert.ok(e.graded.find((g) => g.test === "PLT"), "پلاکت باید حفظ شود");
});

test("U1: پروتئین/خون ادرار حالا الگوهای ادرار را فعال می‌کنند (قبلاً گم می‌شدند)", () => {
  const e = runEngine({
    patient: { age: 30, sex: "F" },
    tests: [
      { name: "Color", value: "Yellow" }, { name: "Appearance", value: "Turbid" },
      { name: "Specific Gravity", value: "1.020" }, { name: "Casts", value: "Negative" },
      { name: "Protein", value: "+2" },
    ],
  });
  const p = runPatterns(e);
  assert.ok(p.findings.some((f) => String(f.pattern).startsWith("proteinuria")),
    "پروتئین ادرار +۲ باید الگوی پروتئینوری بدهد");
});

// ═══ M1: ورود دستی هم باید از موتور رد شود ═══
// باگ واقعی: هر درخواست متنی (ورود دستی) از مسیر قدیم LLM-only می‌رفت و موتور
// اصلاً اجرا نمی‌شد. نتیجه: Hb=9.2 در زن ۳۰ ساله — که موتور آن را CTCAE گرید ۲ و
// فوریت this_week می‌داند — در UI به‌صورت «موارد بحرانی، مراجعه فوری» نشان داده شد.
test("M1: پنل فقر آهنِ ورود دستی، فوریت this_week می‌دهد نه بحرانی", () => {
  const e = runEngine({
    patient: { age: "30 سال", sex: "زن" },
    tests: [
      { name: "Ferritin", value: 5, unit: "ng/mL" },
      { name: "Iron", value: 28, unit: "µg/dL" },
      { name: "TIBC", value: 480, unit: "µg/dL" },
      { name: "Hb", value: 9.2, unit: "g/dL" },
      { name: "MCV", value: 68, unit: "fl" },
      { name: "MCH", value: 22, unit: "pg" },
      { name: "RDW", value: 17, unit: "%" },
    ],
  });
  const hgb = e.graded.find((g) => g.test === "HGB");
  assert.equal(hgb.ctcaeGrade, 2, "Hb ۹.۲ در زن بالغ باید CTCAE گرید ۲ باشد");
  const p = runPatterns(e);
  assert.equal(p.overall_urgency, "this_week", "فقر آهن متوسط فوریت this_week دارد");
  assert.equal(p.has_critical, false, "این پنل نباید بحرانی علامت بخورد");
});

// ═══ M2: گاردِ نگاشت نام‌های فرم ورود دستی ═══
// فرانت label را با پرانتز فارسی می‌سازد («Hb (هموگلوبین)») که NAME_MAP را می‌شکند؛
// به همین دلیل engineName() پرانتز را حذف می‌کند. اگر کسی label یا NAME_MAP را
// طوری عوض کند که نگاشت بشکند، تست باید بیفتد — وگرنه تست بی‌صدا از تفسیر حذف می‌شود.
test("M2: هر تست فرم ورود دستی به کلید موتور نگاشت می‌شود", () => {
  const strip = (s) => s.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  const FORM = [
    ["FBS (قند خون ناشتا)", 90, "mg/dL"], ["HbA1c", 5, "%"],
    ["Cholesterol (کلسترول تام)", 180, "mg/dL"], ["TG (تری‌گلیسیرید)", 120, "mg/dL"],
    ["HDL (کلسترول خوب)", 50, "mg/dL"], ["LDL (کلسترول بد)", 100, "mg/dL"],
    ["Urea (اوره)", 30, "mg/dL"], ["BUN", 14, "mg/dL"],
    ["Creatinine (کراتینین)", 0.9, "mg/dL"], ["Uric Acid (اسید اوریک)", 5, "mg/dL"],
    ["AST (SGOT)", 25, "U/L"], ["ALT (SGPT)", 25, "U/L"],
    ["ALP (آلکالن فسفاتاز)", 90, "U/L"], ["Bilirubin Total (بیلی‌روبین تام)", 0.8, "mg/dL"],
    ["Albumin (آلبومین)", 4.2, "g/dL"], ["Amylase (آمیلاز)", 60, "U/L"], ["LDH", 180, "U/L"],
    ["Na (سدیم)", 140, "mmol/L"], ["K (پتاسیم)", 4, "mmol/L"], ["Ca (کلسیم)", 9.5, "mg/dL"],
    ["Phosphorus (فسفر)", 3.5, "mg/dL"], ["Mg (منیزیم)", 2, "mg/dL"],
    ["Ferritin (فریتین)", 60, "ng/mL"], ["Iron (آهن)", 100, "µg/dL"], ["TIBC", 320, "µg/dL"],
    ["WBC (گلبول سفید)", 7, "×10³/µL"], ["RBC (گلبول قرمز)", 4.6, "×10⁶/µL"],
    ["Hb (هموگلوبین)", 13.5, "g/dL"], ["HCT (هماتوکریت)", 41, "%"],
    ["MCV", 90, "fl"], ["MCH", 30, "pg"], ["MCHC", 34, "g/dL"],
    ["PLT (پلاکت)", 250, "×10³/µL"], ["ESR", 10, "mm/hr"], ["RDW", 13, "%"],
    ["PT", 12, "sec"], ["INR", 1, ""], ["PTT", 30, "sec"],
    ["TSH", 2, "µIU/mL"], ["Total T4 (T4 تام)", 8, "µg/dL"],
    ["Total T3 (ng/dL)", 120, "ng/dL"], ["Total T3 (nmol/L)", 2, "nmol/L"],
    ["Free T4", 1.2, "ng/dL"], ["Vitamin D (25-OH)", 35, "ng/mL"],
    ["Vitamin B12", 400, "pg/mL"], ["Folate (فولات)", 10, "ng/mL"],
  ];
  // کلید موتورِ موردانتظار برای هر label — تا نگاشتِ *غلط* هم گرفته شود،
  // نه فقط نگاشت‌نشدن. (باگ واقعی: هر دو فیلد T3 روی کلید T3 می‌افتادند و
  // مقدار SI طبیعی «پایین» کاذب می‌داد؛ تستِ «graded.length>0» آن را می‌پذیرفت.)
  const EXPECT = {
    "FBS": "GLU_F", "HbA1c": "HBA1C", "Cholesterol": "CHOL", "TG": "TG", "HDL": "HDL",
    "LDL": "LDL", "Urea": "UREA", "BUN": "UREA_N", "Creatinine": "CREAT", "Uric Acid": "URIC",
    "AST": "AST", "ALT": "ALT", "ALP": "ALP", "Bilirubin Total": "BILI_T", "Albumin": "ALB",
    "Amylase": "AMYLASE", "LDH": "LDH", "Na": "NA", "K": "K", "Ca": "CA", "Phosphorus": "PHOS",
    "Mg": "MG", "Ferritin": "FERRITIN", "Iron": "IRON", "TIBC": "TIBC", "WBC": "WBC", "RBC": "RBC",
    "Hb": "HGB", "HCT": "HCT", "MCV": "MCV", "MCH": "MCH", "MCHC": "MCHC", "PLT": "PLT",
    "ESR": "ESR", "RDW": "RDW_CV", "PT": "PT", "INR": "INR", "PTT": "APTT", "TSH": "TSH",
    "Total T4": "T4", "Total T3": "T3", "Free T4": "FT4", "Vitamin D": "VIT_D",
    "Vitamin B12": "B12", "Folate": "FOLATE",
  };
  const missed = [], wrong = [];
  for (const [label, value, unit] of FORM) {
    const e = runEngine({
      patient: { age: "30 سال", sex: "زن" },
      tests: [{ name: strip(label), value, unit }],
    });
    if (!e.graded.length) { missed.push(label); continue; }
    const got = e.graded[0].test;
    const want = EXPECT[strip(label)];
    if (want && got !== want) wrong.push(`${label} → ${got} (انتظار ${want})`);
  }
  assert.deepEqual(missed, [], `این تست‌ها نگاشت نشدند و بی‌صدا حذف می‌شوند: ${missed.join("، ")}`);
  assert.deepEqual(wrong, [], `نگاشت غلط: ${wrong.join("، ")}`);

  // دو فیلد T3 (ng/dL و nmol/L) نباید هم‌دیگر را به مقدار غلط بیندازند:
  // مقدار SI طبیعی باید طبیعی سنجیده شود، نه «پایین».
  const t3si = runEngine({
    patient: { age: "30 سال", sex: "زن" },
    tests: [{ name: "Total T3", value: 2.2, unit: "nmol/L" }],
  }).graded[0];
  assert.equal(t3si.test, "T3");
  assert.equal(t3si.abnormal, false, "T3 = 2.2 nmol/L طبیعی است، نباید «پایین» شود");
});

// ═══ M3: ویتامین D — آستانه‌های Endocrine Society 2011 ═══
// «کافی» نباید غیرطبیعی علامت بخورد. قبلاً grade.js فقط تگ‌های
// normal/normocytic/normochromic را طبیعی می‌شناخت، پس هر طبقه‌بند جدید
// با تگ دیگر (مثل sufficient) بی‌صدا غیرطبیعی می‌شد.
test("M3: ویتامین D کافی غیرطبیعی علامت نمی‌خورد، کمبود می‌خورد", () => {
  const grade = (v) => {
    const e = runEngine({
      patient: { age: "30 سال", sex: "زن" },
      tests: [{ name: "Vitamin D", value: v, unit: "ng/mL" }],
    });
    return e.graded[0];
  };
  assert.equal(grade(15).tag, "deficiency");
  assert.equal(grade(25).tag, "insufficiency");
  assert.equal(grade(55).tag, "sufficient");
  assert.equal(grade(55).abnormal, false, "ویتامین D کافی نباید غیرطبیعی باشد");
  assert.equal(grade(15).abnormal, true, "کمبود ویتامین D باید غیرطبیعی باشد");
});

// ═══ M4: سن باید از patient.age خوانده شود ═══
// اگر فرانت سن را در سطح بالا بفرستد، موتور آن را null می‌گیرد و محدودهٔ
// بزرگسال روی کودک اعمال می‌شود — یعنی Hb یک کودک ۶ ساله با مرجع بزرگسال سنجیده می‌شود.
test("M4: سن کودک از patient.age خوانده می‌شود و محدودهٔ کودکان اعمال می‌شود", () => {
  const child = runEngine({
    patient: { age: "6 سال", sex: "زن" },
    tests: [{ name: "Hb", value: 11.0, unit: "g/dL" }],
  });
  assert.equal(child.age, 6, "سن باید از patient.age خوانده شود");
  const adult = runEngine({
    patient: { age: "30 سال", sex: "زن" },
    tests: [{ name: "Hb", value: 11.0, unit: "g/dL" }],
  });
  assert.notEqual(child.graded[0].range, adult.graded[0].range,
    "محدودهٔ کودک و بزرگسال نباید یکی باشد");
});

// ═══ M5: آزمایشی که همین حالا داده شده دوباره پیشنهاد نمی‌شود ═══
// باگ واقعی: در پنل فقر آهن با فریتین=۵، آهن=۲۸، TIBC=۴۸۰، توصیه‌ها شامل
// «درخواست آزمایش فریتین از پزشک» بود — یعنی آزمایشی که در همان برگه هست.
test("M5: پیشنهادِ آزمایشِ موجود حذف می‌شود ولی «تکرار» می‌ماند", () => {
  const e = runEngine({
    patient: { age: "30 سال", sex: "زن" },
    tests: [
      { name: "Ferritin", value: 5, unit: "ng/mL" },
      { name: "Iron", value: 28, unit: "µg/dL" },
      { name: "TIBC", value: 480, unit: "µg/dL" },
      { name: "Hb", value: 9.2, unit: "g/dL" },
      { name: "MCV", value: 68, unit: "fl" },
    ],
  });
  const p = runPatterns(e);
  const recs = buildEngineRecommendations(p, e);
  for (const gone of ["درخواست آزمایش فریتین از پزشک",
                      "درخواست آزمایش آهن سرم از پزشک",
                      "درخواست آزمایش TIBC از پزشک"]) {
    assert.ok(!recs.includes(gone), `نباید پیشنهاد شود چون موجود است: ${gone}`);
  }
  // تطبیق دقیق است، پس پیشنهادهای «تکرار …» نباید قربانی شوند
  const repeats = buildEngineRecommendations(
    { findings: [{ suggest: ["تکرار CBC", "پایش دوره‌ای TSH", "فریتین"] }] },
    { graded: [{ test: "FERRITIN" }, { test: "TSH" }] }
  );
  assert.ok(repeats.includes("درخواست آزمایش تکرار CBC از پزشک"), "«تکرار CBC» باید بماند");
  assert.ok(repeats.includes("درخواست آزمایش پایش دوره‌ای TSH از پزشک"), "«پایش دوره‌ای TSH» باید بماند");
  assert.ok(!repeats.includes("درخواست آزمایش فریتین از پزشک"), "فریتینِ موجود باید حذف شود");
});

// ═══ M6: نگاشت MedlinePlus سند نامربوط نمی‌دهد ═══
// باگ واقعی: ترم «Hemoglobin Test» در MedlinePlus وجود ندارد و جست‌وجو سند
// «A1C» (پایش دیابت) را برمی‌گرداند — هم لینک بی‌ربط به کاربر نشان داده می‌شد،
// هم خلاصهٔ A1C به‌عنوان مرجعِ هموگلوبین وارد پرامپت می‌شد.
test("M6: هموگلوبین به A1C نگاشت نمی‌شود و LDH نگاشت نامربوط ندارد", () => {
  assert.notEqual(TEST_MEDLINE_MAP["hemoglobin"], "Hemoglobin Test",
    "ترمی که به سند A1C می‌رسید نباید بماند");
  assert.equal(TEST_MEDLINE_MAP["hemoglobin"], "Blood Count Tests");
  assert.equal(TEST_MEDLINE_MAP["هموگلوبین"], "Blood Count Tests");
  assert.equal(TEST_MEDLINE_MAP["ldh"], undefined,
    "LDH موضوع متناظر درستی در MedlinePlus ندارد — بی‌نگاشت می‌ماند");
  // هیچ ترمی نباید به A1C برسد مگر خودِ HbA1c
  for (const [k, term] of Object.entries(TEST_MEDLINE_MAP)) {
    if (term === "A1C Test") assert.ok(/a1c|هموگلوبین a1c/i.test(k), `«${k}» نباید به A1C برود`);
  }
});

// ═══ M7: قاعدهٔ الگوی ویتامین D ═══
// باگ واقعی: ویتامین D به refs/interpret/NAME_MAP اضافه شد ولی نه به patterns.js،
// پس کمبود D (شایع‌ترین اختلال این جمعیت) به unmatched_abnormal می‌افتاد و
// به بیمار می‌گفت «برای این ترکیب توضیح آماده‌ای نداریم».
test("M7: کمبود ویتامین D قاعدهٔ اختصاصی دارد، نه پیام «توضیح نداریم»", () => {
  const e = runEngine({ patient: { age: "30 سال", sex: "زن" },
    tests: [{ name: "Vitamin D", value: 12, unit: "ng/mL" }] });
  const p = runPatterns(e);
  assert.equal(p.findings[0]?.pattern, "vitamin_d_deficiency");
  assert.equal(p.overall_urgency, "routine");
  assert.ok(!/توضیح آماده/.test(p.findings[0]?.must_say || ""), "نباید پیام fallback بدهد");
  // بالای ۱۵۰ سمّیت است، نه «کافی»؛ و باز هم قاعده دارد نه unmatched
  const hi = runPatterns(runEngine({ patient: { age: "30 سال", sex: "زن" },
    tests: [{ name: "Vitamin D", value: 200, unit: "ng/mL" }] }));
  assert.equal(hi.findings[0]?.pattern, "vitamin_d_high");
  // مقدار کافی هیچ یافته‌ای نمی‌سازد
  const ok = runPatterns(runEngine({ patient: { age: "30 سال", sex: "زن" },
    tests: [{ name: "Vitamin D", value: 45, unit: "ng/mL" }] }));
  assert.equal(ok.findings.length, 0, "ویتامین D کافی نباید یافته بسازد");
});

// ═══ M8: برگهٔ بیوشیمی+ادرار، قندِ خون را به «قند ادرار» منحرف نمی‌کند ═══
// باگ واقعی: صفحه‌ای با بیوشیمی و U/A ولی بدون CBC، «ادرارِ خالص» شناخته می‌شد و
// Glucose=320 به qual (قند ادرار) می‌رفت — نه گرید می‌شد، نه در unmapped بود.
test("M8: قندِ برگهٔ ترکیبی بیوشیمی+ادرار گرید می‌شود، نه قند ادرار", () => {
  const e = runEngine({ patient: { age: 50, sex: "M" }, tests: [
    { name: "Glucose", value: 320, unit: "mg/dL" },
    { name: "Urea", value: 40 }, { name: "Creatinine", value: 1.1 },
    { name: "Color", value: "Yellow" }, { name: "Specific Gravity", value: 1.02 },
    { name: "Nitrite", value: "Negative" }, { name: "pH", value: 5.5 },
  ]});
  const glu = e.graded.find((g) => /GLU/.test(g.test));
  assert.ok(glu && glu.value === 320, "قند ۳۲۰ باید گرید شود");
  assert.ok(!Object.keys(e.qual).some((k) => /Urine Glucose|قند ادرار/i.test(k)),
    "قند نباید به قند ادرار منحرف شود");
});

// ═══ M9: pH فقط با پنل گاز خون (ABG)، pH خون است ═══
// باگ واقعی: pH ادرارِ ۷.۰ روی برگهٔ بدون ABG به‌عنوان pH خون سنجیده می‌شد و
// الگوی severe_acidosis یک «🚨 اورژانس» کاذب می‌ساخت.
test("M9: pH بدون ABG اورژانس اسیدوز کاذب نمی‌سازد، با ABG می‌سازد", () => {
  const noAbg = runPatterns(runEngine({ patient: { age: 30, sex: "F" }, tests: [
    { name: "pH", value: 7.0 }, { name: "Protein", value: "Negative" },
    { name: "Glucose", value: "Negative" },
  ]}));
  assert.notEqual(noAbg.overall_urgency, "emergency", "pH تنها نباید اورژانس بسازد");
  assert.ok(!noAbg.has_critical, "نباید بحرانی شود");

  const withAbg = runPatterns(runEngine({ patient: { age: 60, sex: "M" }, tests: [
    { name: "pH", value: 7.0 }, { name: "HCO3", value: 14 }, { name: "pCO2", value: 30 },
  ]}));
  assert.ok(withAbg.findings.some((f) => f.pattern === "severe_acidosis"),
    "با ABG، اسیدوز واقعی باید تشخیص داده شود");
});

// ═══ M10: آشتی محدوده‌ها (ریسرچ منبع‌محور ۲۰۲۶-۰۷) ═══
// هر assert یک موردی است که قبلاً حکمِ نرمال/غیرطبیعی را برعکس می‌کرد
// (فرانت و بک‌اند مخالف بودند). منابع در REF_DIFF.md.
test("M10: منیزیم ۱.۵ اکنون «پایین» است (نه نرمال)", () => {
  const g = runEngine({ patient: { age: 30, sex: "F" },
    tests: [{ name: "Mg", value: 1.5, unit: "mg/dL" }] }).graded[0];
  assert.equal(g.test, "MG");
  assert.equal(g.abnormal, true, "Mg 1.5 با محدودهٔ 1.7–2.2 پایین است");
});
test("M10: کلسیم ۹.۰ نرمال است (نه «پایین» کاذب)", () => {
  const g = runEngine({ patient: { age: 30, sex: "M" },
    tests: [{ name: "Calcium", value: 9.0, unit: "mg/dL" }] }).graded[0];
  assert.equal(g.abnormal, false, "Ca 9.0 با محدودهٔ 8.5–10.2 نرمال است");
});
test("M10: آلبومین ۴.۸ نرمال است (نه «بالا» کاذب)", () => {
  const g = runEngine({ patient: { age: 30, sex: "F" },
    tests: [{ name: "Albumin", value: 4.8, unit: "g/dL" }] }).graded[0];
  assert.equal(g.abnormal, false, "Alb 4.8 با محدودهٔ 3.5–5.0 نرمال است");
});
test("M10: کلسترول ۲۴۰ «بالا» است، ولی کلسترولِ پایین علامت نمی‌خورد", () => {
  const hi = runEngine({ patient: { age: 40, sex: "M" },
    tests: [{ name: "Cholesterol", value: 240, unit: "mg/dL" }] }).graded[0];
  assert.equal(hi.abnormal, true, "کلسترول ۲۴۰ باید بالا باشد (آستانهٔ <۲۰۰)");
  const lo = runEngine({ patient: { age: 40, sex: "M" },
    tests: [{ name: "Cholesterol", value: 120, unit: "mg/dL" }] }).graded[0];
  assert.equal(lo.abnormal, false, "کلسترولِ پایین نباید علامت بخورد (آستانه است نه بازه)");
});
test("M10: TG ۱۶۰ «بالا» است (مرزیِ ATP III دیگر جا نمی‌افتد)", () => {
  const g = runEngine({ patient: { age: 40, sex: "M" },
    tests: [{ name: "Triglyceride", value: 160, unit: "mg/dL" }] }).graded[0];
  assert.equal(g.abnormal, true, "TG 160 با آستانهٔ <۱۵۰ باید بالا باشد");
});
test("M10: کراتینین ۰.۵۵ برای زن نرمال است، برای مرد پایین", () => {
  const f = runEngine({ patient: { age: 30, sex: "F" },
    tests: [{ name: "Creatinine", value: 0.55, unit: "mg/dL" }] }).graded[0];
  assert.equal(f.abnormal, false, "زن: 0.55 با کف 0.5 نرمال");
  const m = runEngine({ patient: { age: 30, sex: "M" },
    tests: [{ name: "Creatinine", value: 0.55, unit: "mg/dL" }] }).graded[0];
  assert.equal(m.abnormal, true, "مرد: 0.55 با کف 0.6 پایین");
});

// ═══ M11: هایپرکلسمی/هایپوکلسمیِ متوسط قاعده دارد (نه unmatched_abnormal) ═══
// باگ واقعی (تست ۲۰-سناریویی): Ca 12.5 (گرید ۲) هیچ قاعده‌ای نداشت →
// به unmatched_abnormal می‌افتاد، «توضیح آماده نداریم» می‌گفت و urgency را
// routine می‌گذاشت. قاعدهٔ calcium فقط CA≥13/≤7.0 را می‌گرفت.
test("M11: کلسیم ۱۲.۵ هایپرکلسمی this_week است، نه unmatched routine", () => {
  const e = runEngine({ patient: { age: 60, sex: "F" },
    tests: [{ name: "Ca", value: 12.5 }, { name: "Albumin", value: 4.0 }] });
  const p = runPatterns(e);
  assert.equal(p.findings[0]?.pattern, "hypercalcemia");
  assert.equal(p.overall_urgency, "this_week");
  assert.ok(!p.findings.some((f) => f.rule_id === "unmatched_abnormal"),
    "نباید به تور ایمنی عمومی بیفتد");
  // بحرانی همچنان اورژانس
  const crit = runPatterns(runEngine({ patient: { age: 60, sex: "F" },
    tests: [{ name: "Ca", value: 14.5 }, { name: "Albumin", value: 4.0 }] }));
  assert.equal(crit.overall_urgency, "emergency");
  assert.equal(crit.has_critical, true);
  // خفیف عادی
  const mild = runPatterns(runEngine({ patient: { age: 60, sex: "F" },
    tests: [{ name: "Ca", value: 10.8 }, { name: "Albumin", value: 4.0 }] }));
  assert.equal(mild.findings[0]?.pattern, "hypercalcemia");
  assert.equal(mild.overall_urgency, "routine");
});

// ═══ M12: کلیدِ خامِ موتور هرگز به متنِ روبه‌کاربر نمی‌رسد ═══
// باگ واقعی (تست ۲۰-سناریویی، مسیر API): وقتی unmatched_abnormal فعال می‌شد،
// abnormal_tests با کلید خام (HGB، LDH، BILI_T) به LLM می‌رفت و مدل همان را
// به بیمار نشان می‌داد: «درخواست آزمایش HGB از پزشک». also must_say کلید خام داشت.
test("M12: پرامپت و must_say نام فارسی می‌دهند، نه کلید خام", async () => {
  const { buildEnginePrompt } = await import("./prompt.js");
  const { faName } = await import("./names.js");
  assert.equal(faName("HGB"), "هموگلوبین");
  assert.equal(faName("BILI_T"), "بیلی‌روبین تام");
  const e = runEngine({ patient: { age: 25, sex: "M" },
    tests: [{ name: "Hb", value: 8.5 }, { name: "LDH", value: 600 }, { name: "Bilirubin Total", value: 3.2 }] });
  const p = runPatterns(e);
  // پرامپت نباید کلید خام داشته باشد
  const pl = JSON.parse(buildEnginePrompt(e, p, "").content);
  const names = pl.abnormal_tests.map((a) => a.test);
  assert.ok(names.includes("هموگلوبین"), "باید نام فارسی باشد");
  assert.ok(!names.includes("HGB") && !names.includes("BILI_T"), "نباید کلید خام باشد");
  // must_say هم نباید کلید خام لو بدهد
  const ms = p.findings.find((f) => f.rule_id === "unmatched_abnormal")?.must_say || "";
  assert.ok(!/\bHGB\b|\bBILI_T\b/.test(ms), "must_say نباید کلید خام داشته باشد");
});

// ═══ M13: تفسیر دیابت باید بزرگی‌محور و از نظر تشخیص دقیق باشد ═══
// باگ واقعی: برای FBS ۴۰۰ + HbA1c ۱۲٪ موتور می‌گفت «تشخیص قطعی نیاز به تکرار دارد» —
// طبق ADA دو آزمایشِ متفاوتِ غیرطبیعی روی یک نمونه تشخیص را قطعی می‌کند، پس تکرار لازم نیست.
// همچنین تفسیر «ابتدایی» بود: نه eAG می‌گفت، نه هشدار علائم بحران هایپرگلیسمی.
test("M13: دیابتِ دو-آزمایشی قطعی است (نه «تکرار کن») + eAG + هشدار علائم", () => {
  const e = runEngine({ patient: { age: 45, sex: "M" },
    tests: [{ name: "FBS", value: 400 }, { name: "HbA1c", value: 12 }] });
  const p = runPatterns(e);
  const f = p.findings.find((x) => x.pattern === "diabetes_range");
  assert.ok(f, "باید الگوی دیابت فعال شود");
  // تشخیص قطعی: نباید بگوید «تکرار شود»؛ باید بگوید نیازی به تکرار نیست
  assert.ok(!/یک بار دیگر تکرار/.test(f.must_say), "برای دو آزمایش نباید «تکرار» بگوید");
  assert.ok(/کافی است|نیازی به تکرار/.test(f.must_say), "باید تشخیص را قطعی اعلام کند");
  // eAG: HbA1c ۱۲٪ → میانگین قند ~۲۹۸
  assert.ok(f.must_say.includes("298"), "باید eAG (~۲۹۸) را بیاورد");
  // suggest نباید «تکرار قند ناشتا» داشته باشد (چون قطعی است)
  assert.ok(!f.suggest.some((s) => /تکرار قند/.test(s)), "قطعی: تکرار قند نباید پیشنهاد شود");
  // هایپرگلیسمی شدید → هشدار علائم بحران
  assert.ok(f.warnings.some((w) => /اورژانس|همین امروز/.test(w)), "باید هشدار علائم شدید بدهد");
});

// تک‌آزمایشِ منفرد همچنان باید تکرار بخواهد (تشخیص هنوز قطعی نیست)
test("M13: قند ناشتای منفرد ۱۳۰ هنوز نیاز به تکرار دارد", () => {
  const e = runEngine({ patient: { age: 45, sex: "M" }, tests: [{ name: "FBS", value: 130 }] });
  const p = runPatterns(e);
  const f = p.findings.find((x) => x.pattern === "diabetes_range");
  assert.ok(f, "باید الگوی دیابت فعال شود");
  assert.ok(/یک بار دیگر تکرار/.test(f.must_say), "یک آزمایش منفرد باید تکرار بخواهد");
  assert.ok(f.suggest.some((s) => /تکرار قند/.test(s)), "باید تکرار قند پیشنهاد شود");
});

// ═══ M14: قاعده‌های بزرگی‌محور عددِ کلیدی را به‌عنوان key_number علامت می‌زنند ═══
// باگ واقعی: LLM ارزان جملهٔ eGFR را از تفسیر حذف می‌کرد (آن را «تکراری با
// کراتینین» می‌دید). تور ایمنی سرور به key_number تکیه می‌کند تا عدد را برگرداند؛
// پس قاعده‌ها باید این عدد را در finding بگذارند و اولین جملهٔ must_say همان را داشته باشد.
test("M14: قاعدهٔ کلیه eGFR را به‌عنوان key_number و در جملهٔ اول must_say می‌آورد", () => {
  const e = runEngine({ patient: { age: 68, sex: "M" }, tests: [{ name: "Creatinine", value: 1.9 }] });
  const p = runPatterns(e);
  const f = p.findings.find((x) => x.pattern === "kidney_impairment");
  assert.ok(f, "باید الگوی کلیه فعال شود");
  assert.equal(f.key_number, e.indices.egfr, "key_number باید همان eGFR باشد");
  const firstSent = String(f.must_say).split(/(?<=[.؟!])\s/)[0];
  assert.ok(firstSent.includes(String(e.indices.egfr)), "جملهٔ اول must_say باید eGFR را داشته باشد");
});

test("M14: دیابتِ قطعی eAG را به‌عنوان key_number می‌آورد", () => {
  const e = runEngine({ patient: { age: 45, sex: "M" }, tests: [{ name: "FBS", value: 400 }, { name: "HbA1c", value: 12 }] });
  const p = runPatterns(e);
  const f = p.findings.find((x) => x.pattern === "diabetes_range");
  assert.equal(f.key_number, 298, "key_number باید eAG (~۲۹۸) باشد");
});

// ═══ M15: D-dimer باینری بود و هیچ الگویی برنمی‌داشتش ═══
// باگ واقعی: روی برگهٔ واقعی D-dimer خوانده و به‌عنوان «خارج از محدوده» علامت
// می‌خورد، ولی چون binary است و هیچ الگویی به آن اشاره نمی‌کرد، هیچ finding
// تولید نمی‌شد → «خوانده شد ولی تفسیر نداد». حالا قاعدهٔ اختصاصی دارد.
test("M15: D-dimerِ بالای تنها یافتهٔ this_week می‌سازد، نه سکوت", () => {
  const e = runEngine({ tests: [{ name: "D-Dimer", value: 600 }] });   // نرمال 0–500 ng/mL (FEU)
  const p = runPatterns(e);
  const f = p.findings.find((x) => x.pattern === "d_dimer_elevated");
  assert.ok(f, "D-dimerِ بالا باید یافته بسازد");
  assert.equal(f.urgency, "this_week");
  assert.ok(/غیراختصاصی/.test(f.must_say), "باید بگوید غیراختصاصی است (اطمینان‌بخش)");
  assert.ok(f.warnings.some((w) => /اورژانس/.test(w)), "باید هشدار علائم لخته بدهد");
});

test("M15: D-dimerِ نرمال هیچ یافتهٔ D-dimer نمی‌سازد", () => {
  const e = runEngine({ tests: [{ name: "D-Dimer", value: 100 }] });
  const p = runPatterns(e);
  assert.ok(!p.findings.some((x) => x.pattern === "d_dimer_elevated"), "D-dimer نرمال نباید یافته بسازد");
});

// ISTH: پلاکت پایین + D-dimerِ شدیداً بالا + یک اختلال انعقادی = DIC،
// حتی وقتی فیبرینوژن نرمال است (قاعدهٔ قبلی هر سهِ PLT/PT/FIB را لازم داشت).
test("M15: DIC با تریگر ISTH (D-dimer شدید + PLT پایین + PT بالا) اورژانس می‌شود", () => {
  const e = runEngine({ tests: [
    { name: "PLT", value: 60 }, { name: "PT", value: 20 }, { name: "D-Dimer", value: 5000 },
  ] });
  const p = runPatterns(e);
  const f = p.findings.find((x) => x.pattern === "possible_DIC");
  assert.ok(f, "باید DIC فعال شود");
  assert.equal(f.urgency, "emergency");
  assert.ok(/D-dimer/.test(f.must_say), "متن DIC باید D-dimer را نام ببرد");
  // نباید همزمان یافتهٔ d_dimer_elevated هم بیاید (دوباره‌گویی)
  assert.ok(!p.findings.some((x) => x.pattern === "d_dimer_elevated"), "DIC فعال است، d_dimer_elevated نباید بیاید");
});

// اختصاصی بودن: D-dimerِ شدید ولی پلاکت نرمال نباید اورژانسِ DIC کاذب بسازد.
test("M15: D-dimerِ شدید با پلاکت نرمال، DIC کاذب نمی‌سازد", () => {
  const e = runEngine({ tests: [{ name: "PLT", value: 250 }, { name: "D-Dimer", value: 5000 }] });
  const p = runPatterns(e);
  assert.ok(!p.findings.some((x) => x.pattern === "possible_DIC"), "بدون پلاکت پایین نباید DIC شود");
  const f = p.findings.find((x) => x.pattern === "d_dimer_elevated");
  assert.ok(f && f.urgency === "this_week", "باید فقط یافتهٔ this_week دی‌دایمر باشد");
});

// واحد: برگه‌های ایرانی اغلب D-dimer را mg/L / µg/mL FEU می‌دهند. بدون تبدیل،
// «۱.۵ mg/L» (= ۱۵۰۰ ng/mL، واضحاً بالا) با محدودهٔ ng/mL «نرمال» گزارش می‌شد.
test("M15: D-dimerِ mg/L به ng/mL تبدیل می‌شود (۱.۵ mg/L → بالا، نه نرمالِ کاذب)", () => {
  const e = runEngine({ tests: [{ name: "D-Dimer", value: 1.5, unit: "mg/L" }] });
  const g = e.graded.find((x) => x.test === "DDIMER");
  assert.equal(g.value, 1500, "۱.۵ mg/L باید ۱۵۰۰ ng/mL شود");
  assert.ok(g.abnormal && g.dir === "high", "باید «بالا» باشد، نه نرمال");
});

test("M15: D-dimerِ µg/mL هم تبدیل می‌شود و بدون واحد با بزرگیِ عدد حدس زده می‌شود", () => {
  const mgml = runEngine({ tests: [{ name: "D-Dimer", value: 2, unit: "µg/mL" }] });
  assert.equal(mgml.graded.find((x) => x.test === "DDIMER").value, 2000);
  // بدون واحد، عددِ کوچک ≈ mg/L → ×۱۰۰۰
  const smallNoUnit = runEngine({ tests: [{ name: "D-Dimer", value: 0.3 }] });
  assert.equal(smallNoUnit.graded.find((x) => x.test === "DDIMER").value, 300);
  // ۰.۳ mg/L = ۳۰۰ ng/mL < ۵۰۰ → با آستانهٔ درست، نرمال است (نه بالای کاذب)
  assert.equal(smallNoUnit.graded.find((x) => x.test === "DDIMER").abnormal, false);
});

// always_show: زیر یک اورژانسِ blocks_others (پان‌سیتوپنی)، دی‌دایمر کاملاً پنهان
// نمی‌شود بلکه نسخهٔ کوتاهش نمایش داده می‌شود؛ فوریت کلی همچنان emergency می‌ماند.
test("M15: D-dimer زیر اورژانس با نسخهٔ کوتاه نمایش داده می‌شود، نه پنهان", () => {
  const e = runEngine({ tests: [
    { name: "WBC", value: 2.0 }, { name: "Hemoglobin", value: 7 }, { name: "PLT", value: 40 },
    { name: "D-Dimer", value: 600 },
  ] });
  const p = runPatterns(e);
  assert.equal(p.overall_urgency, "emergency", "پیام اورژانس باید اول بماند");
  const d = p.findings.find((x) => x.pattern === "d_dimer_elevated");
  assert.ok(d, "دی‌دایمر نباید کاملاً پنهان شود");
  assert.ok(/غیراختصاصی/.test(d.must_say), "باید نسخهٔ کوتاهِ اطمینان‌بخش باشد");
  assert.equal(d.warnings.length, 0, "نسخهٔ کوتاه هشدارِ بلند ندارد تا پیام اورژانس شلوغ نشود");
});

// ═══ M16: تفسیرهای شایع باید بزرگی‌محور باشند (عدد + محدوده)، نه فقط جهت ═══
// باگ واقعی: کم‌خونی/چربی/الکترولیت فقط می‌گفتند «بالا/پایین» بدون آوردن عددِ
// خودِ بیمار و محدودهٔ مرجع — تفسیرِ «ابتدایی». حالا مقدار و بستر عددی می‌آید.

test("M16: کم‌خونی میکروسیتیک مقدار Hb و MCV و شدت را می‌آورد + key_number", () => {
  const e = runEngine({ patient: { age: 30, sex: "F" },
    tests: [{ name: "Hemoglobin", value: 9 }, { name: "MCV", value: 70 }, { name: "RBC", value: 4 }] });
  const p = runPatterns(e);
  const f = p.findings.find((x) => x.pattern === "microcytic_ida_likely");
  assert.ok(f, "باید کم‌خونیِ فقر آهن فعال شود (منتزر ۱۷.۵ > ۱۳)");
  assert.ok(f.must_say.includes("هموگلوبین شما 9"), "باید مقدار هموگلوبین را بیاورد");
  assert.ok(f.must_say.includes("70"), "باید مقدار MCV را بیاورد");
  assert.ok(/کم‌خونیِ متوسط/.test(f.must_say), "Hb ۹ باید «متوسط» طبقه‌بندی شود");
  assert.ok(/فریتین زیر ۳۰/.test(f.must_say), "باید معیار تأیید (فریتین زیر ۳۰) را بگوید");
  assert.equal(f.key_number, 9, "key_number باید هموگلوبین باشد");
});

test("M16: پروفایل چربی عددِ LDL و هدف درمانی و قید ناشتا را می‌آورد + key_number", () => {
  const e = runEngine({ patient: { age: 50, sex: "M" }, tests: [{ name: "LDL", value: 190 }] });
  const p = runPatterns(e);
  const f = p.findings.find((x) => x.pattern === "dyslipidemia");
  assert.ok(f, "باید دیس‌لیپیدمی فعال شود");
  assert.ok(f.must_say.includes("190"), "باید مقدار LDL را بیاورد");
  assert.ok(/مطلوب زیر ۱۰۰/.test(f.must_say), "باید هدف مطلوب LDL را بگوید");
  assert.ok(/رسوب|پلاک/.test(f.must_say), "باید مکانیسم آترواسکلروز را بگوید");
  assert.ok(f.warnings.some((w) => /ناشتا/.test(w)), "باید قید ناشتا بودن نمونه را بدهد");
  assert.equal(f.key_number, 190, "key_number باید LDL باشد");
});

test("M16: پتاسیم بحرانی مقدار و محدوده و مکانیسم قلبی را می‌آورد + key_number", () => {
  const e = runEngine({ tests: [{ name: "Potassium", value: 6.5 }] });
  const p = runPatterns(e);
  const f = p.findings.find((x) => x.pattern === "hyperkalemia");
  assert.ok(f, "باید هایپرکالمی فعال شود");
  assert.equal(f.urgency, "emergency", "پتاسیم ۶.۵ باید اورژانس باشد");
  assert.ok(f.must_say.includes("پتاسیم خون شما 6.5"), "باید مقدار پتاسیم را بیاورد");
  assert.ok(/حد طبیعی/.test(f.must_say), "باید محدودهٔ طبیعی را بیاورد");
  assert.equal(f.key_number, 6.5, "key_number باید پتاسیم باشد");
});

test("M16: سدیم و کلسیمِ غیرطبیعی مقدار خود بیمار را می‌آورند + key_number", () => {
  const na = runEngine({ tests: [{ name: "Sodium", value: 118 }] });
  const naF = runPatterns(na).findings.find((x) => x.pattern === "hyponatremia");
  assert.ok(naF, "باید هیپوناترمی فعال شود");
  assert.ok(naF.must_say.includes("سدیم خون شما 118"), "باید مقدار سدیم را بیاورد");
  assert.equal(naF.key_number, 118);

  const ca = runEngine({ tests: [{ name: "Calcium", value: 12.5 }] });
  const caF = runPatterns(ca).findings.find((x) => x.pattern === "hypercalcemia");
  assert.ok(caF, "باید هایپرکلسمی فعال شود");
  assert.ok(caF.must_say.includes("کلسیم خون شما 12.5"), "باید مقدار کلسیم را بیاورد");
  assert.equal(caF.key_number, 12.5);
});

// ═══ M17: ACR (نسبت آلبومین به کراتینین) — طبقه‌بندی KDIGO A1/A2/A3 ═══
// افزوده از فصل کلیهٔ «اصول بیوشیمی بالینی» + KDIGO 2024. پیش از این موتور
// ACR را می‌شناخت (در suggest می‌آمد) ولی اگر مقدارش می‌آمد هیچ تفسیری نداشت.
// KDIGO: A1<30، A2 30–300، A3 ≥300 mg/g.

test("M17: ACR ۴۵ → A2 (میکروآلبومینوری)، تفسیر نفروپاتی زودرس + key_number", () => {
  const e = runEngine({ patient: { age: 60, sex: "M" }, tests: [{ name: "ACR", value: 45 }] });
  const g = e.graded.find((x) => x.test === "ACR");
  assert.equal(g.tag, "A2", "۴۵ mg/g باید A2 باشد");
  assert.ok(g.abnormal, "A2 باید غیرطبیعی باشد");
  const p = runPatterns(e);
  const f = p.findings.find((x) => x.pattern === "albuminuria_A2");
  assert.ok(f, "باید الگوی آلبومینوری فعال شود");
  assert.equal(f.key_number, 45, "key_number باید ACR باشد");
  assert.ok(f.must_say.includes("45"), "باید مقدار ACR را بیاورد");
  assert.ok(/زودترین نشانه|زودرس|پیش از آنکه کراتینین/.test(f.must_say), "باید بگوید نشانهٔ زودرس آسیب کلیه است");
  assert.ok(/جلوگیری|کنترل/.test(f.must_say), "باید پیام امیدوارکنندهٔ کنترل زودهنگام را بدهد");
});

test("M17: ACR ۳۵۰ → A3 (افزایش شدید)؛ ACR ۲۰ → A1 (طبیعی، بدون یافته)", () => {
  const a3 = runEngine({ tests: [{ name: "UACR", value: 350 }] });
  assert.equal(a3.graded.find((x) => x.test === "ACR").tag, "A3", "۳۵۰ باید A3 باشد");
  assert.ok(runPatterns(a3).findings.some((x) => x.pattern === "albuminuria_A3"));

  const a1 = runEngine({ tests: [{ name: "ACR", value: 20 }] });
  assert.equal(a1.graded.find((x) => x.test === "ACR").tag, "A1", "۲۰ باید A1 باشد");
  assert.ok(a1.graded.find((x) => x.test === "ACR").abnormal === false, "A1 نباید غیرطبیعی باشد");
  assert.ok(!runPatterns(a1).findings.some((x) => /albuminuria/.test(x.pattern)), "A1 نباید یافته بسازد");
});

test("M17: ACR واحدِ SI (mg/mmol) به mg/g تبدیل می‌شود", () => {
  // ۸ mg/mmol × ۸.۸۴ ≈ ۷۰.۷ mg/g → A2 (نه A1ِ کاذب)
  const e = runEngine({ tests: [{ name: "ACR", value: 8, unit: "mg/mmol" }] });
  const g = e.graded.find((x) => x.test === "ACR");
  assert.ok(g.value > 60 && g.value < 80, "۸ mg/mmol باید ~۷۰ mg/g شود");
  assert.equal(g.tag, "A2", "پس از تبدیل باید A2 باشد، نه A1ِ کاذب");
});

test("M17: «albumin» تنها به ALB سرم می‌رود، نه ACR (جلوگیری از خطای واحد)", () => {
  const e = runEngine({ tests: [{ name: "Albumin", value: 4.2 }] });
  assert.ok(!e.graded.some((x) => x.test === "ACR"), "«albumin» نباید به ACR نگاشت شود");
});

// ═══ M18: تفسیر بیلی‌روبین/کبد — بزرگی‌محور از فصل کبدِ بیوشیمی بالینی ═══
// بزرگی (عدد + محدوده)، آستانهٔ زردیِ قابل‌مشاهده (~۲.۵)، اطمینان‌بخشیِ ژیلبر،
// پرچمِ سه‌گانهٔ شارکو در انسداد، و نسبت De Ritis عددی در الگوی الکلی.

test("M18: بیلی‌روبین غیرمستقیمِ خفیف با آنزیم طبیعی → ژیلبر (خوش‌خیم) + عدد", () => {
  const e = runEngine({ patient: { age: 22, sex: "M" },
    tests: [{ name: "Total Bilirubin", value: 2.4 }, { name: "Direct Bilirubin", value: 0.3 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "bilirubin_indirect_dominant");
  assert.ok(f, "باید الگوی غیرمستقیم فعال شود");
  assert.equal(f.urgency, "routine", "ژیلبرِ خفیف باید routine باشد");
  assert.equal(f.key_number, 2.4, "key_number باید بیلی‌روبین تام باشد");
  assert.ok(f.must_say.includes("2.4"), "باید مقدار بیلی‌روبین را بیاورد");
  assert.ok(/ژیلبر/.test(f.must_say), "باید سندرم ژیلبر را نام ببرد");
  assert.ok(/درمانی لازم ندارد|بی‌خطر|هیچ آسیبی/.test(f.must_say), "باید پیام اطمینان‌بخش بدهد");
});

test("M18: بیلی‌روبینِ مستقیم‌غالبِ بالا → عدد + آستانهٔ زردی + پرچمِ کلانژیت", () => {
  const e = runEngine({ patient: { age: 58, sex: "F" },
    tests: [{ name: "Total Bilirubin", value: 8 }, { name: "Direct Bilirubin", value: 6 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "bilirubin_direct_dominant");
  assert.ok(f, "باید الگوی مستقیم فعال شود");
  assert.equal(f.key_number, 8);
  assert.ok(/زردی/.test(f.must_say), "بیلی‌روبین ۸ باید به زردیِ قابل‌مشاهده اشاره کند");
  assert.ok(f.warnings.some((w) => /اورژانس/.test(w) && /تب/.test(w)),
    "باید پرچمِ سه‌گانهٔ شارکو (تب+درد+زردی → اورژانس) بدهد");
});

test("M18: الگوی کبدِ الکلی نسبت De Ritis را عددی می‌آورد + هشدارِ «زیر ۳۰۰»", () => {
  const e = runEngine({ patient: { age: 50, sex: "M" },
    tests: [{ name: "AST", value: 180 }, { name: "ALT", value: 70 }, { name: "GGT", value: 300 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "alcoholic_liver_pattern");
  assert.ok(f, "باید الگوی الکلی فعال شود");
  assert.equal(f.key_number, 2.6, "key_number باید نسبت AST/ALT باشد");
  assert.ok(f.must_say.includes("180") && f.must_say.includes("70"), "باید مقادیر AST و ALT را بیاورد");
  assert.ok(/زیر ۳۰۰/.test(f.must_say), "باید نکتهٔ «الکلی معمولاً زیر ۳۰۰» را بدهد");
});

// ═══ M19: اوره دیگر به BUN تبدیل نمی‌شود — هرکدام با محدودهٔ خودش ═══
// درخواست کاربر: عددِ اوره در تفسیر نصف نشود؛ اوره به‌عنوان اوره و BUN به‌عنوان BUN.
// تبدیل ÷۲.۱۴ فقط داخلی برای شاخصِ BUN/Cr می‌ماند.

test("M19: اورهٔ واردشده نصف نمی‌شود و با محدودهٔ اوره سنجیده می‌شود", () => {
  const e = runEngine({ tests: [{ name: "Urea", value: 90 }] });
  const u = e.graded.find((x) => x.test === "UREA");
  assert.ok(u, "اوره باید کلید UREA بگیرد، نه UREA_N");
  assert.equal(u.value, 90, "مقدار اوره باید ۹۰ بماند (نه ۴۲ِ نصف‌شده)");
  assert.ok(u.abnormal && u.dir === "high", "۹۰ بالای محدودهٔ اوره (۱۵–۴۳) است");
  assert.ok(!e.graded.some((x) => x.test === "UREA_N"), "نباید UREA_Nِ کاذب ساخته شود");
  // اوره ۳۰ در محدودهٔ اوره طبیعی است (قبلاً ۳۰÷۲.۱۴=۱۴ می‌شد که هنوز نرمال بود، ولی عددش گمراه‌کننده)
  const norm = runEngine({ tests: [{ name: "اوره", value: 30 }] }).graded.find((x) => x.test === "UREA");
  assert.ok(norm && norm.value === 30 && norm.abnormal === false, "اوره ۳۰ باید نرمال و بدون تغییر باشد (نامِ فارسی هم نگاشت شود)");
});

test("M19: BUN همچنان به‌عنوان BUN تفسیر می‌شود (بدون دو برابر شدن)", () => {
  const e = runEngine({ tests: [{ name: "BUN", value: 40 }] });
  const b = e.graded.find((x) => x.test === "UREA_N");
  assert.ok(b && b.value === 40, "BUN باید ۴۰ بماند");
  assert.ok(b.abnormal && b.dir === "high", "BUN ۴۰ بالای محدودهٔ ۷–۲۰ است");
});

test("M19: شاخصِ BUN/Cr وقتی فقط اوره داریم از اوره÷۲.۱۴ ساخته می‌شود", () => {
  // اوره ۱۲۰ → BUNِ داخلی ~۵۶؛ با کراتینین ۲.۵ نسبت ~۲۲ (>۲۰ = پیش‌کلیوی)
  const e = runEngine({ tests: [{ name: "Urea", value: 120 }, { name: "Creatinine", value: 2.5 }] });
  assert.equal(e.indices.bun_cr, 22, "BUN/Cr باید از اورهٔ ÷۲.۱۴ محاسبه شود، نه از خودِ اوره");
  const f = runPatterns(e).findings.find((x) => x.pattern === "prerenal_pattern");
  assert.ok(f, "نسبت BUN/Cr بالای ۲۰ باید الگوی پیش‌کلیوی را همچنان فعال کند");
});

// ═══ M20: تفسیر تیروئید — بزرگی‌محور از فصل «Thyroid Function» (Nishizawa-Brennen) ═══
// بزرگیِ TSH/FT4 با محدوده، key_number، علائمِ همراه، پرچمِ طوفان تیروئیدی،
// و رفعِ یک نقص: FT4ِ بالا با TSHِ طبیعی «پرکاریِ واضح» نیست (Table 14.1).

test("M20: کم‌کاریِ واضح (TSH بالا + FT4 پایین) عدد هر دو را می‌آورد + key_number + علائم", () => {
  const e = runEngine({ patient: { age: 45, sex: "F" },
    tests: [{ name: "TSH", value: 12 }, { name: "FT4", value: 0.5 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "thyroid_hypo_overt");
  assert.ok(f, "باید کم‌کاریِ واضح فعال شود");
  assert.equal(f.key_number, 12, "key_number باید TSH باشد");
  assert.ok(f.must_say.includes("12"), "باید مقدار TSH را بیاورد");
  assert.ok(f.must_say.includes("0.5"), "باید مقدار FT4 را هم بیاورد (بزرگیِ هر دو هورمون)");
  assert.ok(/خستگی|یبوست|سرمایی/.test(f.must_say), "باید علائمِ کم‌کاری را ذکر کند (Box 14.1)");
});

test("M20: کم‌کاری تیروئید همراه هیپوناترمی/کم‌خونی، نکتهٔ علتِ ثانویه را می‌دهد", () => {
  // فصل ص.۲۳: کم‌کاری تیروئید خودش می‌تواند سدیم پایین و کم‌خونی بسازد.
  const e = runEngine({ patient: { age: 50, sex: "M" },
    tests: [{ name: "TSH", value: 12 }, { name: "FT4", value: 0.5 },
            { name: "Sodium", value: 128 }, { name: "Hemoglobin", value: 10 }] });
  const f = runPatterns(e).findings.find((x) => /thyroid_hypo/.test(x.pattern));
  assert.ok(f, "باید کم‌کاری تیروئید فعال شود");
  assert.ok(/سدیم پایین/.test(f.must_say) && /کم‌خونی/.test(f.must_say),
    "باید یافته‌های همراه را نام ببرد");
  assert.ok(/می‌تواند خودش عاملِ این‌ها/.test(f.must_say),
    "باید بگوید تیروئید می‌تواند علتِ ثانویهٔ آن‌ها باشد");
});

test("M20: پرکاریِ واضح (TSH پایین + FT4 بالا) پرچمِ طوفان تیروئیدی + TRAb می‌دهد", () => {
  const e = runEngine({ patient: { age: 35, sex: "F" },
    tests: [{ name: "TSH", value: 0.05 }, { name: "FT4", value: 3.0 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "thyroid_hyper_overt");
  assert.ok(f, "باید پرکاریِ واضح فعال شود");
  assert.equal(f.key_number, 0.05, "key_number باید TSH باشد");
  assert.ok(f.must_say.includes("3"), "باید مقدار FT4 را بیاورد");
  assert.ok(f.warnings.some((w) => /طوفان تیروئیدی/.test(w) && /اورژانس/.test(w)),
    "باید پرچمِ اورژانسیِ طوفان تیروئیدی بدهد");
  assert.ok(f.suggest.some((s) => /TRAb/.test(s)), "باید TRAb را پیشنهاد دهد");
});

test("M20: نقصِ رفع‌شده — FT4ِ بالا با TSHِ طبیعی «پرکاریِ واضح» نیست (Table 14.1)", () => {
  // در پرکاریِ اولیهٔ واقعی TSH سرکوب می‌شود؛ FT4ِ بالا با TSHِ طبیعی اغلب
  // خطای پیش‌تحلیلی/بیوتین است — نباید بیمار را با «پرکاری واضح» بترساند.
  const e = runEngine({ patient: { age: 40, sex: "M" },
    tests: [{ name: "TSH", value: 2.0 }, { name: "FT4", value: 3.0 }] });
  const finds = runPatterns(e).findings;
  assert.ok(!finds.some((x) => x.pattern === "thyroid_hyper_overt"),
    "TSHِ طبیعی نباید «پرکاریِ واضح» بسازد");
  const f = finds.find((x) => x.pattern === "thyroid_discordant_ft4_high");
  assert.ok(f, "باید الگوی ناهماهنگِ محتاط فعال شود");
  assert.equal(f.urgency, "routine", "چون احتمالاً خطای آزمایشگاهی است، routine بماند");
  assert.equal(f.key_number, 3.0, "key_number باید FT4 باشد");
  assert.ok(/بیوتین|خطای آزمایشگاهی|پیش‌تحلیلی|لووتیروکسین/.test(f.must_say),
    "باید احتمالِ خطای پیش‌تحلیلی/تداخل را توضیح دهد");
});

// ═══ M21: نقصِ ترتیبِ شاخه — TSH بالا + FT4 بالا «کم‌کاری» نیست ═══
// از فصل «Basic Endocrinology» (Moore) Table 13.3: T4↑/TSH↑ = پرکاریِ ثانویه
// (تومورِ ترشح‌کنندهٔ TSH) یا مقاومت به هورمون. قبلاً چون شاخهٔ tshHigh زودتر
// چک می‌شد، این حالت اشتباهاً «کم‌کاریِ تحت‌بالینی» با جملهٔ غلطِ «FT4 طبیعی است»
// برچسب می‌خورد.

test("M21: TSH بالا + FT4 بالا → پرکاریِ ثانویه، نه کم‌کاریِ تحت‌بالینیِ کاذب", () => {
  const e = runEngine({ patient: { age: 38, sex: "F" },
    tests: [{ name: "TSH", value: 8 }, { name: "FT4", value: 3.0 }] });
  const finds = runPatterns(e).findings;
  assert.ok(!finds.some((x) => /thyroid_hypo/.test(x.pattern)),
    "نباید کم‌کاری (تحت‌بالینی یا واضح) برچسب بخورد");
  const f = finds.find((x) => x.pattern === "thyroid_secondary_hyper");
  assert.ok(f, "باید الگوی پرکاریِ ثانویه فعال شود");
  assert.equal(f.key_number, 3.0, "key_number باید FT4 باشد");
  assert.ok(f.must_say.includes("8") && f.must_say.includes("3"),
    "باید مقادیرِ TSH و FT4 هر دو را بیاورد");
  assert.ok(/هیپوفیز|مقاومت|ثانویه/.test(f.must_say),
    "باید تومورِ هیپوفیز/مقاومت به هورمون را به‌عنوان علت مطرح کند");
  assert.ok(!/FT4 هنوز طبیعی|FT4 طبیعی است/.test(f.must_say),
    "نباید جملهٔ غلطِ «FT4 طبیعی است» را بگوید");
});

// ═══ M23: الگوی زنجیره‌ای منیزیم — بزرگی‌محور + پرچمِ آریتمی/دیگوکسین ═══
// از فصل «Electrolytes» (Mistler) Table 11.15: منیزیمِ پایین با پتاسیمِ پایین
// خطرِ آریتمی و مسمومیتِ دیجیتال را بالا می‌برد؛ اصلاحِ منیزیم مقدم است.

test("M23: منیزیمِ پایین + پتاسیمِ پایین عددِ Mg و پرچمِ آریتمی/دیگوکسین را می‌آورد", () => {
  const e = runEngine({ patient: { age: 55, sex: "F" },
    tests: [{ name: "Magnesium", value: 1.2 }, { name: "Potassium", value: 3.0 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "magnesium_depletion_pattern");
  assert.ok(f, "باید الگوی زنجیره‌ای منیزیم فعال شود");
  assert.equal(f.key_number, 1.2, "key_number باید منیزیم باشد");
  assert.ok(f.must_say.includes("1.2"), "باید مقدار منیزیم را بیاورد");
  assert.ok(/تا منیزیم اصلاح نشود/.test(f.must_say), "باید نکتهٔ مقاومت به درمان را بدهد");
  assert.ok(f.warnings.some((w) => /ضربان|آریتمی|نامنظم/.test(w)),
    "با پتاسیمِ پایین باید پرچمِ آریتمی بدهد");
  assert.ok(f.warnings.some((w) => /دیگوکسین|دیجیتال/.test(w)),
    "باید هشدارِ سمّیتِ دیگوکسین بدهد");
});

// ═══ M24: چربی — non-HDL و تلهٔ فریدوالد (فصل «Lipids and Lipoproteins», Kenwright) ═══
// non-HDL = کلسترول تام − HDL؛ پیش‌بینی‌کنندهٔ مستقلِ خطر و در غیرناشتا معتبر.
// با TG>۴۰۰ محاسبهٔ LDL به روش فریدوالد نامعتبر است — باید به کاربر گفته شود.

test("M24: non-HDL محاسبه و در تفسیر با هدفِ زیر ۱۳۰ آورده می‌شود", () => {
  // کلسترول ۲۹۵، HDL ۳۵ → non-HDL = ۲۶۰
  const e = runEngine({ patient: { age: 47, sex: "F" },
    tests: [{ name: "Cholesterol", value: 295 }, { name: "HDL", value: 35 },
            { name: "Triglycerides", value: 200 }] });
  assert.equal(e.indices.non_hdl, 260, "non-HDL باید ۲۹۵−۳۵ باشد");
  const f = runPatterns(e).findings.find((x) => x.pattern === "dyslipidemia");
  assert.ok(f, "باید الگوی چربی فعال شود");
  assert.ok(f.must_say.includes("260"), "باید عددِ non-HDL را بیاورد");
  assert.ok(/زیر ۱۳۰/.test(f.must_say), "باید هدفِ زیر ۱۳۰ را بگوید");
});

test("M24: با TG>۴۰۰ هشدارِ نامعتبر بودنِ LDLِ محاسبه‌ای داده می‌شود", () => {
  const e = runEngine({ patient: { age: 50, sex: "M" },
    tests: [{ name: "Triglycerides", value: 450 }, { name: "LDL", value: 120 },
            { name: "Cholesterol", value: 260 }, { name: "HDL", value: 40 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "dyslipidemia");
  assert.ok(f, "باید الگوی چربی فعال شود");
  assert.ok(f.warnings.some((w) => /قابل اعتماد نیست|محاسبه‌ای/.test(w) && /۴۰۰/.test(w)),
    "باید بگوید LDLِ محاسبه‌ای با TG>۴۰۰ نامعتبر است");
});

test("M24: با TG طبیعی هشدارِ فریدوالد داده نمی‌شود (هشدار کاذب)", () => {
  const e = runEngine({ patient: { age: 50, sex: "M" },
    tests: [{ name: "Triglycerides", value: 180 }, { name: "LDL", value: 160 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "dyslipidemia");
  assert.ok(f, "باید الگوی چربی فعال شود");
  assert.ok(!f.warnings.some((w) => /قابل اعتماد نیست/.test(w)),
    "با TG زیر ۴۰۰ نباید هشدارِ فریدوالد بدهد");
});

// ── M25: HHS (فصل ۹، Freeman) — قندِ >۶۰۰ بدونِ کتواسیدوز یک اورژانس است ──
// باگ: قندِ ۹۵۰ با کتونِ منفی هیچ قاعدهٔ اورژانسی را فعال نمی‌کرد و فقط
// «diabetes_range / این هفته وقت بگیرید» می‌گرفت — برای وضعیتی با مرگ‌ومیرِ بالا.
test("M25: قندِ ۹۵۰ بدونِ کتون/اسیدوز → اورژانسِ هایپراسمولار، نه «این هفته»", () => {
  const e = runEngine({ patient: { age: 58, sex: "M" },
    tests: [{ name: "Glucose", value: 950 }, { name: "BUN", value: 48 },
            { name: "Creatinine", value: 1.6 }] });
  const out = runPatterns(e);
  assert.equal(out.overall_urgency, "emergency", "قندِ ۹۵۰ باید اورژانس باشد");
  assert.equal(out.has_critical, true);
  const f = out.findings.find((x) => x.pattern === "hhs_pattern");
  assert.ok(f, "باید الگوی HHS فعال شود");
  assert.equal(f.key_number, 950, "عددِ محوری باید خودِ قند باشد");
  assert.ok(f.must_say.includes("950"), "عدد باید در جملهٔ اول بیاید");
  assert.ok(/هایپراسمولار/.test(f.must_say));
  assert.ok(/اوره\/کراتینین/.test(f.must_say), "کم‌آبیِ همراه باید ذکر شود");
  assert.ok(/اورژانس/.test(f.action), "اقدام باید اورژانس باشد نه نوبتِ مطب");
});

test("M25: قندِ بالا + کتونِ مثبت → DKA می‌ماند، HHS دوباره‌گویی نمی‌کند", () => {
  const e = runEngine({ patient: { age: 18, sex: "M" },
    tests: [{ name: "Urine Ketone", value: "Positive" }, { name: "Glucose", value: 700 }] });
  const finds = runPatterns(e).findings;
  assert.ok(finds.some((x) => x.pattern === "dka_pattern"), "باید DKA بگیرد");
  assert.ok(!finds.some((x) => x.pattern === "hhs_pattern"),
    "با کتونِ مثبت نباید HHS هم بدهد");
});

test("M25: قندِ ۵۲۰ (زیرِ آستانهٔ ۶۰۰) نباید HHS بگیرد — هشدارِ کاذب", () => {
  const e = runEngine({ patient: { age: 58, sex: "M" }, tests: [{ name: "Glucose", value: 520 }] });
  const finds = runPatterns(e).findings;
  assert.ok(!finds.some((x) => x.pattern === "hhs_pattern"));
  assert.ok(finds.some((x) => x.pattern === "diabetes_range"));
});

// نوارِ کتونِ ادرار (نیتروپروساید) استواستات را می‌سنجد نه بتاهیدروکسی‌بوتیرات
// را که ~۷۸٪ کتون‌هاست؛ پس کتونِ منفی کتواسیدوز را رد نمی‌کند (فصل ۹، Ketones).
test("M25: کتونِ منفیِ اندازه‌گیری‌شده → هشدارِ محدودیتِ نوارِ ادرار", () => {
  const e = runEngine({ patient: { age: 62, sex: "F" },
    tests: [{ name: "Urine Ketone", value: "Negative" }, { name: "Glucose", value: 820 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "hhs_pattern");
  assert.ok(f, "باید HHS فعال شود");
  // عمداً در must_say است نه warnings — چون فقط must_sayِ اورژانسی ضامنِ سرور دارد
  assert.ok(/۷۸٪/.test(f.must_say) && /بتاهیدروکسی/.test(f.must_say),
    "باید در must_say بگوید نوارِ ادرار بتاهیدروکسی‌بوتیرات را نمی‌بیند");
});

test("M25: بدونِ اندازه‌گیریِ کتون، هشدارِ نوارِ کتون داده نمی‌شود", () => {
  const e = runEngine({ patient: { age: 62, sex: "F" }, tests: [{ name: "Glucose", value: 820 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "hhs_pattern");
  assert.ok(f);
  assert.ok(!/بتاهیدروکسی/.test(f.must_say),
    "وقتی کتون اصلاً اندازه‌گیری نشده، این قید بی‌ربط است");
});

// ── M25: کلیدِ GLU_RANDOM در الگوی آلبومینوری (پیش‌تر GLU_R بود و هرگز وجود نداشت) ──
test("M25: قندِ تصادفیِ ۳۲۰ + ACR → زمینهٔ دیابت تشخیص داده می‌شود", () => {
  const e = runEngine({ patient: { age: 55, sex: "M" },
    tests: [{ name: "ACR", value: 150 }, { name: "BS", value: 320 }] });
  const f = runPatterns(e).findings.find((x) => /albuminuria/.test(x.pattern));
  assert.ok(f, "باید الگوی آلبومینوری فعال شود");
  assert.ok(/قند شما هم بالاست/.test(f.action),
    "با قندِ تصادفیِ بالا باید قالبِ درگیریِ کلیه در دیابت را بگوید");
  assert.ok(!f.suggest.includes("قند خون و HbA1c"),
    "وقتی قند همین حالا بالاست، پیشنهادِ «قند خون» تکراری است");
});

// ═══ M26: رابدومیولیز — تفسیرِ سطحی بود: «CK بسیار بالاست» بدون عدد ═══
// یافته‌ای با blocks_others و اورژانس، تنها متنی است که بیمار می‌بیند؛ پس
// نبودِ عدد، مکانیسم و پرچمِ پتاسیم در آن پرهزینه‌ترین حالت است.
// نکتهٔ کلیدیِ بالینی: نوارِ ادرار میوگلوبین را از هموگلوبین جدا نمی‌کند،
// پس «خونِ» ادرار در رابدومیولیز لزوماً خونریزی نیست.

test("M26: رابدومیولیز عددِ CK + محدوده + key_number می‌دهد (نه فقط «بسیار بالا»)", () => {
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 8200 }, { name: "Urine Blood", value: "+2" }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");
  assert.ok(f, "باید الگوی رابدومیولیز فعال شود");
  assert.equal(f.key_number, 8200, "key_number باید عددِ CK باشد");
  assert.ok(f.must_say.includes("8200"), "باید عددِ CK را بیاورد");
  assert.ok(/حد طبیعی/.test(f.must_say), "باید محدودهٔ مرجعِ CK را هم بیاورد");
  assert.ok(/میوگلوبین/.test(f.must_say), "باید مکانیسمِ میوگلوبین → کلیه را بگوید");
  assert.ok(/گلبول قرمزی دیده نمی‌شود|خونریزی نیست/.test(f.must_say),
    "باید تلهٔ «خونِ ادرارِ» نوار را توضیح دهد");
  assert.ok(/۲۴ تا ۷۲ ساعت/.test(f.must_say),
    "باید بگوید یک‌بار اندازه‌گیریِ CK کافی نیست (اوجِ ۲۴–۷۲ ساعت)");
  assert.ok(f.warnings.some((w) => /استاتین/.test(w)), "باید هشدارِ استاتین بدهد");
  assert.ok(f.warnings.some((w) => /ایبوپروفن|ضدالتهاب/.test(w)),
    "باید از مسکّنِ ضدالتهاب (فشار بر کلیه) پرهیز بدهد");
});

test("M26: با پتاسیمِ بالا، عددِ پتاسیم و پرچمِ آریتمی در متن می‌آید", () => {
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 12000 }, { name: "Urine Blood", value: "+2" },
            { name: "Potassium", value: 6.4 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");
  assert.ok(f, "باید الگوی رابدومیولیز فعال شود");
  assert.ok(f.must_say.includes("6.4"), "باید عددِ پتاسیم را بیاورد");
  assert.ok(f.warnings.some((w) => /ضربان|نامنظم/.test(w)), "باید پرچمِ آریتمی بدهد");
  // نامِ خالیِ تستی که همین حالا اندازه‌گیری شده نباید پیشنهاد شود؛ فقط «تکرارِ …»
  assert.ok(!f.suggest.includes("پتاسیم") && !f.suggest.includes("کراتینین"),
    "تستِ اندازه‌گیری‌شده نباید به‌شکلِ درخواستِ تستِ جدید پیشنهاد شود");
  assert.ok(f.suggest.some((s) => /^تکرار/.test(s)), "پایشِ سریالی باید با قالبِ «تکرار» بیاید");
});

test("M26: با کراتینینِ طبیعی، ادعای درگیریِ کلیه نمی‌کند ولی هشدارِ تأخیر می‌دهد", () => {
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 6000 }, { name: "Urine Blood", value: "+2" },
            { name: "Creatinine", value: 0.9 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");
  assert.ok(f, "باید الگوی رابدومیولیز فعال شود");
  assert.ok(!/کلیه‌ها هم درگیر شده‌اند/.test(f.must_say),
    "با کراتینینِ طبیعی نباید درگیریِ کلیه را قطعی بگوید");
  assert.ok(/با تأخیر/.test(f.must_say),
    "اما باید بگوید آسیبِ کلیه می‌تواند بعداً ظاهر شود");
});

// ── M26: نتیجهٔ اندازه‌گیری‌نشده نباید «طبیعی» اعلام شود ──
// 🔴 باگ واقعی: شرطِ «!crHigh» هر سه حالتِ طبیعی/پایین/غایب را یکی می‌گرفت و
//    روی برگهٔ بدونِ کراتینین می‌گفت «شاخص کلیه هنوز طبیعی است» — ساختنِ نتیجه.
test("M26: بدونِ کراتینین روی برگه، نباید بگوید کراتینین طبیعی است", () => {
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 8200 }, { name: "Urine Blood", value: "+2" }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");
  assert.ok(f, "باید الگوی رابدومیولیز فعال شود");
  assert.ok(!/طبیعی است|خارج از محدوده نیست/.test(f.must_say),
    "وقتی کراتینین اندازه‌گیری نشده، هیچ ادعایی دربارهٔ طبیعی بودنش نباید بشود");
  assert.ok(/اندازه‌گیری نشده/.test(f.must_say),
    "باید صریح بگوید کراتینین روی برگه نیست و بررسی‌اش فوری است");
});

test("M26: کراتینینِ پایین هم «طبیعی» اعلام نمی‌شود", () => {
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 8200 }, { name: "Urine Blood", value: "+2" },
            { name: "Creatinine", value: 0.35 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");
  assert.ok(!/اندازه‌گیری نشده/.test(f.must_say), "کراتینین داده شده، پس «نداریم» غلط است");
  assert.ok(/خارج از محدوده نیست/.test(f.must_say),
    "برای کراتینینِ غیرِبالا باید قالبِ محتاطانه بیاید، نه ادعای «طبیعی»");
});

// ── M26: پتاسیمِ خفیف نباید «فوری‌ترین بخش» خوانده شود (آستانهٔ ۶.۰) ──
test("M26: پتاسیمِ ۵.۱ «فوری‌ترین بخش» نیست ولی ۶.۴ هست", () => {
  const mild = runPatterns(runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 2000 }, { name: "Urine Blood", value: "+2" },
            { name: "Potassium", value: 5.1 }] })).findings
    .find((x) => x.pattern === "rhabdomyolysis_pattern");
  assert.ok(mild.must_say.includes("5.1"), "عدد پتاسیم باید بیاید");
  assert.ok(!/فوری‌ترین بخش/.test(mild.must_say),
    "پتاسیمِ ۵.۱ نباید فوری‌ترین بخش اعلام شود");

  const crit = runPatterns(runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 2000 }, { name: "Urine Blood", value: "+2" },
            { name: "Potassium", value: 6.4 }] })).findings
    .find((x) => x.pattern === "rhabdomyolysis_pattern");
  assert.ok(/فوری‌ترین بخش/.test(crit.must_say), "پتاسیمِ ۶.۴ باید فوری‌ترین بخش باشد");
});

// ── M26: عددِ کلسیمِ تصحیح‌شده نباید بی‌توضیح چاپ شود ──
// کلسیمِ e.graded با آلبومین تصحیح شده؛ چاپِ خامِ آن عددی را نشان می‌داد که
// روی برگهٔ بیمار وجود ندارد (۷.۳ در برابرِ ۶.۲) و قاعدهٔ calcium_abnormal که
// توضیحِ تصحیح را دارد، زیرِ این یافتهٔ اورژانسی سرکوب می‌شود.
test("M26: کلسیمِ پایین بدونِ عددِ تصحیح‌شده گفته می‌شود + هشدارِ مکملِ خودسرانه", () => {
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 12000 }, { name: "Urine Blood", value: "+2" },
            { name: "Calcium", value: 6.2 }, { name: "Albumin", value: 2.6 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");
  const ca = e.graded.find((g) => g.test === "CA");
  assert.ok(/کلسیم شما هم پایین است/.test(f.must_say), "باید کلسیمِ پایین را بگوید");
  assert.ok(!f.must_say.includes(String(ca.value)),
    "نباید عددِ تصحیح‌شده را بی‌توضیح چاپ کند (روی برگهٔ بیمار نیست)");
  assert.ok(/مکملِ خودسرانه/.test(f.must_say), "باید از مکملِ خودسرانهٔ کلسیم پرهیز بدهد");
});

// ── M26: بلندترین must_say نباید از سقفِ جملهٔ پرامپت رد شود ──
// دو فیلد در تضادند: قاعدهٔ ۱ می‌گوید must_say را کامل منتقل کن، و
// interpretation سقفِ «حداکثر N جمله» دارد. اگر must_say بلندتر شود، مدل یا
// دُمِ متن را می‌اندازد یا خلاصه می‌کند — و خلاصه‌کردن تطبیقِ زیررشته‌ایِ تورِ
// ایمنیِ server.js را می‌شکند و کلِ بلوک دوباره append می‌شود (متنِ تکراری).
// این تست هر دو سرِ تضاد را به هم قفل می‌کند.
test("M26: بلندترین must_say از سقفِ جملهٔ ENGINE_SYSTEM_PROMPT بیشتر نیست", () => {
  const faDigits = (s) => s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  const capMatch = ENGINE_SYSTEM_PROMPT.match(/حداکثر\s+([۰-۹\d]+)\s+جمله/);
  assert.ok(capMatch, "پرامپت باید سقفِ جمله برای interpretation داشته باشد");
  const cap = Number(faDigits(capMatch[1]));

  // بدترین حالت: همهٔ شاخه‌های شرطیِ رابدومیولیز فعال
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 12000 }, { name: "Urine Blood", value: "+2" },
            { name: "Potassium", value: 6.4 }, { name: "Creatinine", value: 2.4 },
            { name: "Calcium", value: 6.2 }, { name: "Albumin", value: 2.6 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");
  assert.ok(f, "باید الگوی رابدومیولیز فعال شود");
  // همان تقسیم‌بندیِ جمله که server.js برای تورِ ایمنی استفاده می‌کند
  const sentences = f.must_say.split(/(?<=[.؟!])\s+/).filter((s) => s.trim());
  assert.ok(sentences.length <= cap,
    `must_say ${sentences.length} جمله دارد ولی سقفِ پرامپت ${cap} است`);
});

// ═══ M29: سرولوژی — رایت / 2ME / کومبس رایت / RF / CRPِ کیفی ═══
// 🔴 باگ واقعی: هیچ‌کدام در NAME_MAP نبودند → unmapped → و چون به abnormal
//    نمی‌رسیدند، برگه‌ای که تنها ایرادش «رایت ۱/۳۲۰» بود پاسخِ آمادهٔ
//    «نتایج شما طبیعی است» می‌گرفت.
// آستانه‌ها: راهنمای کشوری بروسلوز، وزارت بهداشت، ص ۴۰ (رایت ≥۱/۸۰، 2ME و
//    کومبس ≥۱/۴۰) — عمداً از عددِ CDC پایین‌تر، چون آنتی‌ژنِ تست B. abortus
//    است ولی گونهٔ غالبِ ایران B. melitensis و عیار ≈ نصفِ رقمِ حقیقی.

test("M29: parseTitre شکل‌های واقعیِ برگه را می‌فهمد (نه toNum)", () => {
  assert.equal(parseTitre("1/160"), 160);
  assert.equal(parseTitre("1:80"), 80);
  assert.equal(parseTitre("۱/۳۲۰"), 320, "ارقام فارسی");
  assert.equal(parseTitre("160"), 160, "عددِ تنها");
  assert.equal(parseTitre("Negative"), 0);
  assert.equal(parseTitre("منفی"), 0);
  assert.equal(parseTitre("<1/20"), 0, "کمتر از آستانه = منفی");
  assert.equal(parseTitre("1/20 Negative"), 0, "کلمهٔ منفی بر عدد مقدم است");
  assert.equal(parseTitre("Positive"), null, "مثبتِ بدون تیتر عدد ندارد");
  // ⚠️ همان چیزی که toNum اشتباه می‌کرد
  assert.notEqual(parseTitre("1/160"), 1160);
});

test("M29: رایت ۱/۳۲۰ + 2ME ۱/۸۰ → تب مالتِ فعال (نه «نتایج طبیعی است»)", () => {
  const e = runEngine({ patient: { age: 35, sex: "M" },
    tests: [{ name: "Wright", value: "1/320" }, { name: "2ME", value: "1/80" }] });
  assert.deepEqual(e.unmapped, [], "هیچ‌کدام نباید unmapped بمانند");
  assert.equal(e.graded.find((g) => g.test === "WRIGHT").value, 320);
  assert.equal(e.graded.find((g) => g.test === "ME2").value, 80);
  const f = runPatterns(e).findings.find((x) => x.pattern === "brucella_active");
  assert.ok(f, "باید تب مالتِ فعال تشخیص داده شود");
  assert.equal(f.urgency, "this_week", "سرولوژیِ تنها اورژانس نیست");
  assert.ok(/1\/320/.test(f.must_say), "تیتر باید در متن بیاید");
  assert.ok(/چهاربرابری/.test(f.must_say), "باید بگوید تیترِ منفرد کافی نیست");
});

test("M29: رایتِ زیرِ آستانه + کومبسِ مثبت هم تب مالتِ فعال است (آنتی‌بادی بلوک‌کننده)", () => {
  const e = runEngine({ patient: { age: 35, sex: "M" },
    tests: [{ name: "Wright", value: "1/40" }, { name: "Coombs Wright", value: "1/160" }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "brucella_active");
  assert.ok(f, "کومبسِ باارزش با رایتِ زیرِ آستانه نباید از دست برود");
  assert.ok(/بلوک‌کننده/.test(f.must_say), "باید مکانیزمِ آنتی‌بادیِ بلوک‌کننده را بگوید");
});

test("M29: رایتِ باارزش با 2ME منفی → «قطعی نیست»، نه تشخیصِ تب مالت", () => {
  const e = runEngine({ patient: { age: 35, sex: "M" },
    tests: [{ name: "Wright", value: "1/160" }, { name: "2ME", value: "Negative" }] });
  const fs = runPatterns(e).findings;
  assert.ok(!fs.some((x) => x.pattern === "brucella_active"), "نباید موردِ فعال اعلام شود");
  const f = fs.find((x) => x.pattern === "brucella_wright_only");
  assert.ok(f, "باید قاعدهٔ «رایتِ تنها» فعال شود");
  assert.ok(/منفی/.test(f.must_say) && !/۱\/منفی|1\/0/.test(f.must_say),
    "تیترِ منفی باید «منفی» نوشته شود نه «۱/۰»");
});

test("M29: سرولوژیِ کاملاً منفی هیچ یافته‌ای نمی‌سازد (هشدارِ کاذب)", () => {
  const e = runEngine({ patient: { age: 35, sex: "M" },
    tests: [{ name: "Wright", value: "Negative" }, { name: "2ME", value: "منفی" },
            { name: "Coombs Wright", value: "منفی" }] });
  assert.equal(runPatterns(e).findings.length, 0);
  // رایت ۱/۴۰ هم زیرِ آستانهٔ کشوری است
  const e2 = runEngine({ patient: { age: 35, sex: "M" }, tests: [{ name: "رایت", value: "۱/۴۰" }] });
  assert.equal(runPatterns(e2).findings.length, 0, "۱/۴۰ زیر آستانهٔ ۱/۸۰ است");
});

test("M29: CRPِ کیفی «3+» دیگر بی‌صدا نمی‌افتد", () => {
  const e = runEngine({ patient: { age: 32, sex: "F" },
    tests: [{ name: "Hemoglobin", value: 13.5 }, { name: "CRP", value: "3+" }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "crp_elevated");
  assert.ok(f, "CRPِ کیفیِ مثبت باید یافته بسازد");
  assert.ok(f.must_say.includes("3+"), "همان چیزی که برگه نوشته باید نقل شود");
  // ⚠️ ترجمهٔ «3+» به mg/L کیت‌وابسته است — نباید عددی ساخته شود
  assert.ok(!/mg\/L\s*\d|\d+\s*mg\/L/.test(f.must_say.replace(/کمی \(mg\/L\)/g, "")),
    "نباید «3+» را به عددِ mg/L ترجمه کند");
});

test("M29: CRP و RFِ عددی دیگر به qual نمی‌افتند (هم‌خانوادهٔ باگِ تروپونین)", () => {
  const e = runEngine({ patient: { age: 32, sex: "F" },
    tests: [{ name: "CRP", value: "24", unit: "mg/L" }, { name: "RF", value: "82", unit: "IU/mL" }] });
  assert.equal(e.graded.find((g) => g.test === "CRP_Q")?.value, 24, "CRPِ عددی باید graded شود");
  assert.equal(e.graded.find((g) => g.test === "RF")?.value, 82, "RFِ عددی باید graded شود");
  assert.deepEqual(e.qual, {}, "هیچ‌کدام نباید کیفی بمانند");
});

test("M29: RFِ کیفیِ «RA factor: Positive» تطبیق می‌خورد و ادعای روماتیسم نمی‌کند", () => {
  const e = runEngine({ patient: { age: 60, sex: "F" },
    tests: [{ name: "RA factor", value: "Positive" }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rf_positive");
  assert.ok(f, "نامِ فاصله‌دار هم باید تطبیق بخورد");
  assert.equal(f.urgency, "routine");
  assert.ok(/به‌تنهایی به‌معنای روماتیسم مفصلی نیست/.test(f.must_say),
    "باید صریح بگوید RF مثبت تشخیصِ روماتیسم نیست");
  assert.ok(f.suggest.includes("Anti-CCP"), "باید تستِ اختصاصی‌تر را پیشنهاد دهد");
});

// ═══ M30: توصیه‌ها — تکرارِ نزدیک و قالبِ شکسته ═══
// باگ واقعی: تنها فیلتر `new Set` بود، پس یک پنلِ معمولی ۱۹ توصیه می‌داد که
// سه‌تایش «نوبت عادی…» و دوتایش «این هفته…» بود، و قالبِ «درخواست آزمایش X
// از پزشک» روی چیزی که نامِ آزمایش نبود هم می‌نشست.

test("M30: قالبِ «درخواست آزمایش» روی دستورِ غیرآزمایشی نمی‌نشیند", () => {
  assert.equal(phraseSuggestion("فریتین"), "درخواست آزمایش فریتین از پزشک");
  assert.equal(phraseSuggestion("مشاوره با پزشک دربارهٔ خطر قلبی‌عروقی"),
    "مشاوره با پزشک دربارهٔ خطر قلبی‌عروقی", "خودش پزشک را نام برده — قالب نمی‌خواهد");
  assert.equal(phraseSuggestion("GGT — برای مشخص شدن منبع ALP"),
    "درخواست آزمایش GGT از پزشک — برای مشخص شدن منبع ALP",
    "«از پزشک» باید بعدِ نامِ آزمایش بیاید نه آخرِ جمله");
});

test("M30: توصیه‌های هم‌سرآغاز ادغام می‌شوند بدون گم‌شدنِ جزئیات", () => {
  const out = tidyRecommendations([
    "نوبت عادی با پزشک.",
    "نوبت عادی با پزشک. تغذیه و تحرک را جدی بگیرید.",
    "نوبت عادی. اگر باردار هستید یا علامت خاصی دارید، با پزشک مطرح کنید.",
  ]);
  assert.equal(out.length, 1, "هر سه یک تصمیم‌اند");
  assert.ok(/تغذیه و تحرک/.test(out[0]), "جزئیاتِ اول نباید گم شود");
  assert.ok(/باردار/.test(out[0]), "جزئیاتِ دوم هم نباید گم شود");
});

test("M30: پیشنهادِ زیرمجموعه حذف می‌شود («پنل کامل آهن» ⊃ «آهن سرم»)", () => {
  const e = runEngine({ patient: { age: 32, sex: "F" },
    tests: [{ name: "Hemoglobin", value: 8.1 }, { name: "MCV", value: 68 },
            { name: "Ferritin", value: 6 }] });
  const recs = buildEngineRecommendations(runPatterns(e), e);
  const has = (s) => recs.some((r) => r.includes(s));
  assert.ok(has("پنل کامل آهن"), "پیشنهادِ فراگیر باید بماند");
  assert.ok(!has("درخواست آزمایش آهن سرم"), "زیرمجموعه باید حذف شود");
  assert.ok(!has("درخواست آزمایش TIBC"), "زیرمجموعه باید حذف شود");
});

test("M30: تستی که همین حالا روی برگه است دوباره درخواست نمی‌شود", () => {
  const e = runEngine({ patient: { age: 32, sex: "F" },
    tests: [{ name: "FBS", value: 108 }, { name: "HDL", value: 35 },
            { name: "Cholesterol", value: 240 }] });
  const recs = buildEngineRecommendations(runPatterns(e), e);
  assert.ok(!recs.some((r) => r === "درخواست آزمایش قند خون از پزشک"),
    "قند همین حالا اندازه‌گیری شده — درخواستش همان باگِ فریتین است");
});

// ═══ M31: املاهای واقعیِ برگه + تفسیرِ ESR ═══
// 🔴 باگ واقعی (از یک برگهٔ واقعیِ کاربر): چهار تست «خوانده شدند ولی موتور
//    تفسیرشان نکرد» چون NAME_MAP تطبیقِ دقیق می‌خواهد و برگه این‌ها را
//    این‌طور چاپ کرده بود: Creatinin، cholestrol، Triglicerde، ESR 1hrs.
//    مهم‌ترینشان ESR=۸۵ بود (مرجع ۰–۲۰) که کاملاً از تفسیر افتاد.

test("M31: املاهای واقعیِ برگه unmapped نمی‌مانند", () => {
  const e = runEngine({ patient: { age: 32, sex: "F" }, tests: [
    { name: "Creatinin", value: "1.0" },
    { name: "cholestrol", value: "107" },
    { name: "Triglicerde", value: "70" },
    { name: "ESR 1hrs", value: "85" },
  ]});
  assert.deepEqual(e.unmapped, [], "هیچ‌کدام نباید unmapped بماند");
  const key = (k) => e.graded.find((g) => g.test === k)?.value;
  assert.equal(key("CREAT"), 1);
  assert.equal(key("CHOL"), 107);
  assert.equal(key("TG"), 70);
  assert.equal(key("ESR"), 85);
});

test("M31: هر شکلی از ESR به ESR نگاشت می‌شود", () => {
  for (const name of ["ESR", "ESR 1hrs", "ESR 1st hour", "E.S.R", "ESR-1hr", "esr 2hrs"]) {
    const e = runEngine({ patient: { age: 32, sex: "F" }, tests: [{ name, value: "85" }] });
    assert.ok(e.graded.some((g) => g.test === "ESR"), `«${name}» باید ESR شود`);
  }
});

test("M31: ESRِ بالا تفسیر می‌گیرد، نه «توضیح آماده‌ای نداریم»", () => {
  const e = runEngine({ patient: { age: 32, sex: "F" },
    tests: [{ name: "ESR 1hrs", value: "85" }, { name: "Hb", value: "13.2" }] });
  const fs = runPatterns(e).findings;
  assert.ok(!fs.some((f) => f.pattern === "unmatched_abnormal"),
    "نباید به تورِ «توضیح نداریم» بیفتد");
  const f = fs.find((x) => x.pattern === "esr_elevated");
  assert.ok(f, "باید الگوی ESR فعال شود");
  assert.equal(f.key_number, 85);
  assert.ok(f.must_say.includes("85") && /0–20|0-20/.test(f.must_say), "عدد + محدوده");
});

test("M31: در بیمارِ کم‌خون، نکتهٔ «کم‌خونی خودش ESR را بالا می‌برد» گفته می‌شود", () => {
  const anemic = runPatterns(runEngine({ patient: { age: 32, sex: "F" },
    tests: [{ name: "ESR 1hrs", value: "85" }, { name: "Hb", value: "7.4" },
            { name: "M.C.V", value: "74.1" }] })).findings
    .find((x) => x.pattern === "esr_elevated");
  assert.ok(/کم‌خونی ESR را بالا می‌برد/.test(anemic.must_say),
    "بدون این نکته بیمار دنبال علتِ دومی می‌گردد که وجود ندارد");

  const notAnemic = runPatterns(runEngine({ patient: { age: 32, sex: "F" },
    tests: [{ name: "ESR 1hrs", value: "85" }, { name: "Hb", value: "13.2" }] })).findings
    .find((x) => x.pattern === "esr_elevated");
  assert.ok(!/کم‌خونی ESR را بالا می‌برد/.test(notAnemic.must_say),
    "بدون کم‌خونی نباید این نکته بیاید (هشدارِ کاذب)");
});

test("M31: ESR بالای ۱۰۰ فوریتِ بالاتر و پرچمِ علائم می‌گیرد", () => {
  const f = runPatterns(runEngine({ patient: { age: 32, sex: "F" },
    tests: [{ name: "ESR", value: "120" }] })).findings
    .find((x) => x.pattern === "esr_elevated");
  assert.equal(f.urgency, "this_week");
  assert.ok(/کاهش وزن|تعریق شبانه/.test(f.action), "باید علائمِ هشدار را بپرسد");
});

// ═══ M28: شمارشِ خامِ CBC نباید اورژانسِ کاذب بسازد ═══
// 🔴 باگ واقعی: refs.js برای WBC/PLT واحدِ K/µL و برای RBC واحدِ M/µL می‌خواهد،
//    ولی برگه‌ها اغلب خامِ شمارش می‌دهند (WBC 7000، PLT 250000، RBC 4800000).
//    نتیجه: یک CBC کاملاً طبیعی «لکوسیتوز شدید — بررسی فوری» می‌گرفت.
//    برخلافِ _ABS و D-dimer و ACR، اینجا هیچ نرمال‌سازی‌ای وجود نداشت.

test("M28: CBCِ طبیعیِ خام (WBC 7000/PLT 250000/RBC 4.8M) هیچ یافته‌ای نمی‌سازد", () => {
  const e = runEngine({ patient: { age: 40, sex: "M" },
    tests: [{ name: "WBC", value: 7000 }, { name: "Platelet", value: 250000 },
            { name: "RBC", value: 4800000 }] });
  assert.equal(e.graded.find((g) => g.test === "WBC").value, 7, "WBC باید به K/µL تبدیل شود");
  assert.equal(e.graded.find((g) => g.test === "PLT").value, 250, "PLT باید به K/µL تبدیل شود");
  assert.equal(e.graded.find((g) => g.test === "RBC").value, 4.8, "RBC باید به M/µL تبدیل شود");
  assert.equal(e.abnormal.length, 0, "این CBC طبیعی است — نباید چیزی غیرطبیعی شود");
  assert.equal(runPatterns(e).findings.length, 0, "و نباید هیچ الگویی فعال شود");
});

test("M28: واحدِ استاندارد دست‌نخورده می‌ماند (نصفه نمی‌شود)", () => {
  const e = runEngine({ patient: { age: 40, sex: "M" },
    tests: [{ name: "WBC", value: 7 }, { name: "Platelet", value: 250 }, { name: "RBC", value: 4.8 }] });
  assert.equal(e.graded.find((g) => g.test === "WBC").value, 7);
  assert.equal(e.graded.find((g) => g.test === "PLT").value, 250);
  assert.equal(e.graded.find((g) => g.test === "RBC").value, 4.8);
});

test("M28: اورژانسِ واقعی در هر دو واحد حفظ می‌شود", () => {
  // لوسمی: چه 258 (K/µL) چه 258000 (خام)
  for (const v of [258, 258000]) {
    const e = runEngine({ patient: { age: 40, sex: "M" }, tests: [{ name: "WBC", value: v }] });
    assert.equal(e.graded.find((g) => g.test === "WBC").value, 258, `WBC=${v} باید ۲۵۸ شود`);
    assert.ok(runPatterns(e).findings.some((f) => f.pattern === "extreme_leukocytosis"),
      `WBC=${v} باید لکوسیتوزِ شدید بدهد`);
  }
  // ترومبوسیتوپنیِ شدید: چه 30 چه 30000
  for (const v of [30, 30000]) {
    const e = runEngine({ patient: { age: 40, sex: "M" }, tests: [{ name: "Platelet", value: v }] });
    assert.equal(e.graded.find((g) => g.test === "PLT").value, 30);
    assert.ok(runPatterns(e).findings.some((f) => f.pattern === "severe_thrombocytopenia"),
      `PLT=${v} باید ترومبوسیتوپنیِ شدید بدهد`);
  }
});

test("M28: ترومبوسیتوزِ واقعی (۹۰۰ K/µL) خام تلقی و نصفه نمی‌شود", () => {
  const e = runEngine({ patient: { age: 40, sex: "M" }, tests: [{ name: "Platelet", value: 900 }] });
  assert.equal(e.graded.find((g) => g.test === "PLT").value, 900, "زیرِ آستانهٔ ۳۰۰۰ است — دست‌نخورده");
  assert.ok(runPatterns(e).findings.some((f) => f.pattern === "thrombocytosis"));
});

// ═══ M27: تورِ ایمنیِ اورژانس، بازنویسیِ مدل را «غایب» نمی‌بیند ═══
// 🔴 باگ واقعی، با فراخوانیِ زندهٔ gpt-4o-mini تأیید شد: حضورِ یافته با
//    «زیررشتهٔ عینیِ کلِ must_say» سنجیده می‌شد. مدل یافتهٔ رابدومیولیز را
//    خلاصه نوشت → تطبیق شکست خورد → کلِ بلوکِ ۱۰ جمله‌ای دوباره append شد و
//    تفسیر ۱۹ جمله شد با ۴ جملهٔ عیناً تکراری.
// متنِ زیر عیناً همان چیزی است که مدل در آن اجرا برگرداند.

const MODEL_TEXT_RHABDO =
  "پتاسیم خون شما 6.4 (حد طبیعی 3.5–5) است و بالاتر از حد طبیعی قرار دارد. " +
  "پتاسیم جریان برقی‌ای را که ضربان قلب را تنظیم می‌کند کنترل می‌کند؛ پتاسیمِ خیلی بالا می‌تواند ضربان قلب را کند یا بی‌نظم کند و در حد بحرانی خطر ایست قلبی دارد — و در این حد نیاز به رسیدگی فوری دارد. " +
  "آنزیم عضلانی CK شما 12000 است (حد طبیعی 55–170) و در آزمایش ادرار هم «خون» گزارش شده. " +
  "این ترکیب می‌تواند نشانهٔ تخریب بافت عضلانی (رابدومیولیز) باشد. " +
  "مقدار CK شما در محدوده‌ای است که خطر درگیری کلیه در آن به‌طور مشخص بیشتر است. " +
  "کراتینین شما 2.4 است (حد طبیعی 0.6–1.2)، یعنی احتمالاً کلیه‌ها هم درگیر شده‌اند. " +
  "کلسیم شما هم پایین است، که در این وضعیت شایع و قابل‌انتظار است. " +
  "این وضعیت نیاز به رسیدگی فوری دارد.";

test("M27: جمله‌ای که مدل بازنویسی کرده دوباره append نمی‌شود", () => {
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 12000 }, { name: "Urine Blood", value: "+2" },
            { name: "Potassium", value: 6.4 }, { name: "Creatinine", value: 2.4 },
            { name: "Calcium", value: 6.2 }, { name: "Albumin", value: 2.6 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");

  const missing = missingSentences(f.must_say, MODEL_TEXT_RHABDO);
  const total = splitSentences(f.must_say).length;
  assert.ok(missing.length < total,
    "مدل بخشِ زیادی را منتقل کرده؛ نباید همهٔ جمله‌ها غایب حساب شوند");
  // جمله‌هایی که مدل واقعاً نوشته نباید دوباره برگردند
  assert.ok(!missing.some((s) => /آنزیم عضلانی CK شما/.test(s)),
    "جملهٔ CK عیناً در متنِ مدل هست — نباید تکرار شود");
  assert.ok(!missing.some((s) => /کراتینین شما/.test(s)),
    "جملهٔ کراتینین در متنِ مدل هست — نباید تکرار شود");
  // ولی چیزی که مدل انداخته باید برگردد
  assert.ok(missing.some((s) => /میکروسکوپ|هموگلوبین/.test(s)),
    "تلهٔ نوارِ ادرار را مدل انداخته بود — باید برگردد");
  assert.ok(missing.some((s) => /۲۴ تا ۷۲ ساعت/.test(s)),
    "نکتهٔ اوجِ ۲۴–۷۲ ساعت را مدل انداخته بود — باید برگردد");
});

test("M27: وقتی مدل یافته را کامل انداخته، سرتیتر + کلِ متن برمی‌گردد", () => {
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 12000 }, { name: "Urine Blood", value: "+2" }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");
  const added = missingFindingText(f, "نتایج شما بررسی شد و مشکلی ندارد.");
  assert.ok(added.startsWith(f.headline), "یافتهٔ کاملاً غایب باید با سرتیتر بیاید");
  assert.ok(added.includes("میوگلوبین"), "کلِ must_say باید برگردد");
});

test("M27: متنِ عیناً کپی‌شده هیچ افزوده‌ای تولید نمی‌کند", () => {
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 12000 }, { name: "Urine Blood", value: "+2" }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");
  assert.equal(missingFindingText(f, `خلاصه. ${f.must_say}`), "",
    "وقتی متن عیناً آمده نباید چیزی append شود");
});

test("M27: نرمال‌سازی — ارقام فارسی و نیم‌فاصله مانعِ تطبیق نمی‌شوند", () => {
  assert.equal(normalizeFa("۱۲۴۰۰"), "12400");
  assert.equal(normalizeFa("می‌تواند"), "میتواند");
  assert.equal(normalizeFa("كلیه"), "کلیه");   // کافِ عربی
  const sent = "پتاسیم شما 6.4 است (حد طبیعی 3.5–5).";
  assert.ok(missingSentences(sent, "پتاسیمِ ۶.۴ بالاست").length === 0 ||
            distinctiveTokens(sent).includes("پتاسیم"),
    "توکنِ متمایز باید واژه‌های معنادار را نگه دارد");
});

// ── M26: eGFR در آسیبِ حاد نباید نقل شود (CKD-EPI کراتینینِ پایدار می‌خواهد) ──
test("M26: در رابدومیولیز عددِ eGFR در متن نمی‌آید", () => {
  const e = runEngine({ patient: { age: 34, sex: "M" },
    tests: [{ name: "CK", value: 12000 }, { name: "Urine Blood", value: "+2" },
            { name: "Creatinine", value: 2.4 }] });
  const f = runPatterns(e).findings.find((x) => x.pattern === "rhabdomyolysis_pattern");
  assert.ok(/کراتینین شما 2.4/.test(f.must_say), "کراتینینِ بالا باید با عدد بیاید");
  assert.ok(!/برآوردِ کارِ کلیه/.test(f.must_say),
    "eGFR در حالتِ ناپایدارِ حاد گمراه‌کننده است و نباید نقل شود");
  assert.ok(e.indices?.egfr != null, "eGFR محاسبه می‌شود ولی عمداً استفاده نمی‌شود");
});
