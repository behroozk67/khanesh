// ============================================================
// تست‌های رگرسیون موتور قواعد — با node:test داخلی (بدون وابستگی خارجی)
// اجرا: npm test  (یا: node --test)
//
// هر تست دقیقاً یکی از باگ‌های رفع‌شده را پوشش می‌دهد تا دوباره برنگردد.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";

import { creatRef, getRef, esrRef } from "./refs.js";
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
