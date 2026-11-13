// P145 (۲۰۲۶-۱۱-۱۳، تصمیمِ کاربر): متنِ کراتینینِ اورژانسی (درجهٔ ≥ ۳، kidneySevere) — پنج اصلاح، هر کدام روی HEAD ِ 354469e قرمز.
//   ۱. جملهٔ «یک آزمایش قطعی نمی‌کند… سه ماه پایدار» در اورژانس نمی‌آید (N20: اطمینانِ متناقض کنارِ «اورژانس پزشکی»)
//   ۲. هشدارِ «نوسانِ ۱۸٪» (EFLM) در اورژانس نمی‌آید
//   ۳. پیشنهادهای سرپایی (ACR، سونوگرافی، تکرارِ کراتینین، BUN) در اورژانس نمی‌آیند؛ فقط الکترولیت‌ها
//   ۴. بیمارِ دیالیزی بازهٔ مرجع را هم می‌شنود
//   ۵. بیمارِ دیالیزیِ ثبت‌نشده: «فوراً به اورژانس» اولین جمله می‌ماند؛ جملهٔ شرطیِ ثبتِ دیالیز پس از آن
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const M = { age: 60, sex: "M" }, DIAL = { age: 60, sex: "M", conditions: ["dialysis"] };
const cr = (v) => [{ name: "Creatinine", value: String(v), unit: "mg/dL" }];
const kid = (v, patient = M) => runPatterns(runEngine({ tests: cr(v), patient })).findings.find((f) => f.rule_id === "kidney");
const HEDGE = /یک آزمایش به‌تنهایی این را قطعی نمی‌کند|سه ماه پایدار/;

test("P145-1: کراتینینِ ۸ و ۴٫۲ (اورژانس) ⇒ جملهٔ «قطعی نمی‌کند / سه ماه» نیست؛ ۸ جملهٔ اورژانس را بلافاصله پس از عدد دارد", () => {
  for (const v of [8, 4.2]) {
    const f = kid(v);
    assert.equal(f.urgency, "emergency", String(v));
    assert.doesNotMatch(f.must_say, HEDGE, String(v));
  }
  assert.match(kid(8).must_say, /^کراتینین شما 8 \(حد طبیعی [^)]+\) است و بالاتر از حد طبیعی است\. مقادیر بالای ۵\.۰/);
  // اورژانسِ زیرِ ۵ فقط عدد نمی‌گیرد؛ و انتهای متن فاصلهٔ اضافه ندارد
  assert.match(kid(4.2).must_say, /کارِ کلیه به‌طورِ جدی کاهش یافته است/);
  for (const v of [8, 4.2, 2]) assert.equal(kid(v).must_say, kid(v).must_say.trim(), String(v));
});

test("P145-2: کراتینینِ اورژانسی ⇒ هشدارِ «نوسانِ ۱۸٪» نیست؛ هشدارِ مسکن‌ها می‌ماند", () => {
  const f = kid(8);
  assert.ok(!f.warnings.some((w) => /18٪|تغییرپذیریِ زیستی/.test(w)), f.warnings.join(" | "));
  assert.ok(f.warnings.some((w) => /ایبوپروفن/.test(w)));
});

test("P145-3: کراتینینِ اورژانسی ⇒ پیشنهاد فقط الکترولیت‌ها", () => {
  assert.deepEqual(kid(8).suggest, ["الکترولیت‌ها"]);
  assert.deepEqual(kid(4.2).suggest, ["الکترولیت‌ها"]);
});

test("P145-4: بیمارِ دیالیزی با کراتینینِ ۸ ⇒ بازهٔ مرجع نقل می‌شود؛ فوریت همان routine", () => {
  const f = kid(8, DIAL);
  assert.equal(f.pattern, "kidney_dialysis");
  assert.match(f.must_say, /کراتینین شما 8 است \(حد طبیعی برای افرادِ بدونِ بیماریِ کلیه: [\d.]+–[\d.]+\)/);
  assert.equal(f.urgency, "routine");
});

test("P145-5: کراتینینِ ۸ بی‌دیالیزِ ثبت‌شده ⇒ اقدام با «فوراً… به اورژانس» شروع می‌شود و جملهٔ شرطیِ ثبتِ دیالیز پس از آن می‌آید", () => {
  const f = kid(8);
  assert.match(f.action, /^فوراً و بدون اتلاف وقت به اورژانس بیمارستان مراجعه کنید\./);
  assert.match(f.action, /اگر دیالیز می‌شوید، مرکزِ دیالیزِ خود را هم در جریان بگذارید/);
  assert.match(f.action, /«دیالیز» را در پروفایلِ خود ثبت کنید/);
  assert.doesNotMatch(f.action, /تماس بگیرید/);   // M303b: با اورژانسِ فوری‌ترِ همان برگه رقابت نکند
});

test("P145-6 (قفل): کراتینینِ متوسط (۲) و خفیف (۱٫۵) ⇒ متنِ امروز — جملهٔ «سه ماه»، هشدارِ ۱۸٪ و پیشنهادهای سرپایی می‌مانند", () => {
  for (const v of [2, 1.5]) {
    const f = kid(v);
    assert.notEqual(f.urgency, "emergency", String(v));
    assert.match(f.must_say, HEDGE, String(v));
    assert.ok(f.warnings.some((w) => /18٪/.test(w)), String(v));
    assert.ok(f.suggest.includes("ACR ادرار"), String(v));
  }
});
