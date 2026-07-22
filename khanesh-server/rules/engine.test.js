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
import { extractMedlineTerms, matchesMedlineKey } from "./medline.js";

// ---------- A1: کراتینین با سن نامعلوم ----------
test("A1: creatRef با سن null محدودهٔ بالغ می‌دهد نه نوزادی", () => {
  assert.deepEqual(creatRef(null), [0.6, 1.2]);
  assert.deepEqual(creatRef(undefined), [0.6, 1.2]);
  assert.deepEqual(creatRef(1), [0.3, 0.6]);   // نوزاد واقعی
  assert.deepEqual(creatRef(40), [0.6, 1.2]);
});

test("A1: getRef('CREAT') با سن null → بالغ", () => {
  assert.deepEqual(getRef("CREAT", "M", null), [0.6, 1.2]);
  assert.deepEqual(getRef("CREAT", "F", null), [0.6, 1.2]);
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
