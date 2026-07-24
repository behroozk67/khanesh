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
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { buildEngineFallbackResult, buildEngineRecommendations } from "./prompt.js";
import { extractMedlineTerms, matchesMedlineKey, TEST_MEDLINE_MAP } from "./medline.js";

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
    "LDL": "LDL", "Urea": "UREA_N", "BUN": "UREA_N", "Creatinine": "CREAT", "Uric Acid": "URIC",
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
