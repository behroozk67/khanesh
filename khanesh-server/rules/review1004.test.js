// ============================================================
// review1004.test.js — بازبینیِ ۲۰۲۶-۱۰-۰۴ (دو گزارشِ فقط‌خواندنی: مرز موتور/LLM + بالینی). فایلِ جدا تا با engine.test.js تداخل نکند.
// 🔴 هر تست روی کدِ پیش از اصلاح قرمز است (stash اندازه‌گیری شد).
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { buildEngineRecommendations, buildUninterpretedResult, UNINTERPRETED_SYMPTOM_WARNING } from "./prompt.js";
import { childVoice } from "./neonatal.js";

const row = (name, value, unit) => ({ name, value, ...(unit ? { unit } : {}) });
const ids = (p) => p.findings.map((f) => f.rule_id);
const find = (p, id) => p.findings.find((f) => f.rule_id === id || f.pattern === id);

test("M366: «شک به MDS» پلاکتِ پایینِ ≥۱۰۰ را با عددش می‌گوید (N16) — Hb 9 · ANC 1.5 · PLT 120 · MCV 105 در ۶۵ سالگی", () => {
  // 🔴 پیش از اصلاح: mds_suspicion (Hb + ANC) anemia_macrocytic_mds را کنار می‌زد و متنش پلاکت را نمی‌گفت؛ PLT در RULE_READS «پوشش‌داده» بود ⇒ هیچ‌جا.
  const e = runEngine({ patient: { age: 65, sex: "M" }, tests: [
    row("Hb", "9", "g/dL"), row("MCV", "105", "fL"), row("PLT", "120", "10^3/uL"), row("WBC", "4.5", "10^3/uL"), row("NEUT#", "1.5", "10^3/uL"),
  ] });
  const p = runPatterns(e);
  const mds = find(p, "mds_suspicion");
  assert.ok(mds, ids(p).join());
  assert.ok(!ids(p).includes("anemia_macrocytic_mds"), "دو یافتهٔ MDS");
  const text = p.findings.map((f) => f.must_say).join(" ");
  assert.match(text, /پلاکت 120/, "پلاکتِ 120 در هیچ متنی نیامد");
  assert.match(mds.must_say, /MCV 105/);
});

test("M367: تلهٔ عضله با هاپتوگلوبینِ چاپ‌شدهٔ بی‌بازه «روی این برگه نیست» نمی‌گوید و دوباره هاپتوگلوبین نمی‌خواهد (N4)", () => {
  const e = runEngine({ patient: { age: 40, sex: "M" }, tests: [
    row("LDH", "600", "U/L"), row("CK", "600", "U/L"), row("AST", "90", "U/L"),
  ] });
  e.ungraded = { ...(e.ungraded ?? {}), HAPTO: { value: 80, reason: "no_range" } };
  const p = runPatterns(e);
  const f = find(p, "ldh_muscle_not_hemolysis");
  assert.ok(f, ids(p).join());
  assert.doesNotMatch(f.must_say, /هاپتوگلوبین روی این برگه نیست/);
  assert.match(f.must_say, /هاپتوگلوبین روی برگه هست/);
  assert.ok(!f.suggest.includes("هاپتوگلوبین"), f.suggest.join());
  // گاردِ مخالف: هاپتوگلوبینِ واقعاً غایب هنوز «نیست» می‌گوید و پیشنهاد می‌شود.
  const p2 = runPatterns(runEngine({ patient: { age: 40, sex: "M" }, tests: [row("LDH", "600", "U/L"), row("CK", "600", "U/L"), row("AST", "90", "U/L")] }));
  const f2 = find(p2, "ldh_muscle_not_hemolysis");
  assert.match(f2.must_say, /هاپتوگلوبین روی این برگه نیست/);
  assert.ok(f2.suggest.includes("هاپتوگلوبین"));
});

test("M368: نوتروپنیِ خفیف با WBCِ چاپ‌شدهٔ ارزیابی‌نشده «WBC روی این برگه نیست» نمی‌گوید (N4)", () => {
  const e = runEngine({ patient: { age: 40, sex: "M" }, tests: [row("NEUT#", "1.2", "10^3/uL")] });
  e.ungraded = { ...(e.ungraded ?? {}), WBC: { value: 5, reason: "no_range" } };
  const f = find(runPatterns(e), "mild_neutropenia");
  assert.ok(f);
  assert.doesNotMatch(f.must_say, /روی این برگه نیست/);
  assert.match(f.must_say, /روی برگه هست ولی اینجا ارزیابی نشد/);
});

test("M369: INR ≥ ۱۰ (emergency) دستورِ اورژانس دارد، نه «تماس بگیرید» (N20)؛ INR ۵ همان soon می‌ماند", () => {
  const e = runEngine({ patient: { age: 60, sex: "M" }, tests: [row("INR", "11")] });
  const p = runPatterns(e);
  const f = find(p, "coagulation_abnormal");
  assert.equal(f.urgency, "emergency");
  assert.match(f.action, /اورژانس/);
  assert.doesNotMatch(f.action, /تماس بگیرید/);
  assert.match(buildEngineRecommendations(p, e).join(" "), /اورژانس/);
  const f5 = find(runPatterns(runEngine({ patient: { age: 60, sex: "M" }, tests: [row("INR", "5")] })), "coagulation_abnormal");
  assert.equal(f5.urgency, "soon");
  assert.match(f5.action, /۲۴ تا ۴۸/);
});

test("M370: «تفسیر نشد» — «فهرستِ بالا» فقط وقتی فهرست هست؛ جملهٔ ثابتِ علائمِ حاد در توصیه‌ها (نه warningsِ رندرنشده)", () => {
  const manual = buildUninterpretedResult(["Procalcitonin", "Lactate"]);
  assert.doesNotMatch(manual.interpretation, /فهرستِ بالا/, "ورودِ دستی فهرستِ «مقادیرِ خوانده‌شده» ندارد");
  assert.ok(manual.general_recommendations.includes(UNINTERPRETED_SYMPTOM_WARNING));
  assert.equal(manual.has_critical, false, "حکمِ شدت نمی‌دهد");
  const photo = buildUninterpretedResult(["Procalcitonin"], { listShown: true });
  assert.match(photo.interpretation, /فهرستِ بالا/);
});

test("M371: لحنِ کودک — بندِ بارداری «کودک باردار» نمی‌شود؛ «کودکِ شما» ⇒ «کودک» نه «کودکِ کودک»؛ بقیه «شما» ⇒ «کودک»", () => {
  const s = childVoice("اگر شما باردار هستید به پزشک بگویید. هموگلوبین شما پایین است؛ کودکِ شما نیاز به بررسی دارد.");
  assert.match(s, /اگر شما باردار هستید/);
  assert.doesNotMatch(s, /کودک باردار/);
  assert.match(s, /هموگلوبین کودک پایین است/);
  assert.doesNotMatch(s, /کودکِ? کودک/);
});

// ─────────── P82: تصمیم‌های بازبین (۲۰۲۶-۱۰-۰۴) ───────────
import { microMcvCut } from "./patterns_utils.js";
const go = (age, rows, sex = "M") => runPatterns(runEngine({ patient: { age, sex }, tests: rows }));
const urg = (p, id) => find(p, id)?.urgency;

test("M372: INR بالا در بیمارِ غیر وارفارینی — با آنزیمِ کبدیِ شدید اورژانس، با پلاکتِ پایین soon، تنها this_week؛ PT > ۲۵ تنها soon و با INRِ طبیعی routine", () => {
  assert.equal(urg(go(50, [row("INR", 3.5), row("AST", 600, "U/L"), row("ALT", 600, "U/L")]), "coagulation_abnormal"), "emergency");
  assert.equal(urg(go(50, [row("INR", 3.5), row("PLT", 60, "10^3/uL")]), "coagulation_abnormal"), "soon");
  assert.equal(urg(go(50, [row("INR", 3.5)]), "coagulation_abnormal"), "this_week", "گاردِ مخالف: بی‌همراه بالاتر نمی‌رود");
  assert.equal(urg(go(50, [row("PT", 28, "sec"), row("INR", 2.0)]), "coagulation_abnormal"), "soon", "PT>25 دیگر اورژانس نیست");
  assert.equal(urg(go(50, [row("PT", 28, "sec"), row("INR", 1.0)]), "coagulation_abnormal"), "routine", "PTِ ایزوله با INRِ طبیعی (P59)");
  // INR ≥ ۱۰ هنوز اورژانس است؛ فیبرینوژنِ < ۱۰۰ به تصمیمِ کاربر (P82، ۲۰۲۶-۱۰-۰۴) soon شد، با هشدارِ خونریزی
  const fib = go(50, [row("Fibrinogen", 90, "mg/dL")]);
  assert.equal(urg(fib, "coagulation_abnormal"), "soon");
  assert.match(find(fib, "coagulation_abnormal").warnings.join(" "), /اورژانس/);
  assert.equal(urg(go(50, [row("INR", 11)]), "coagulation_abnormal"), "emergency");
});

test("M373: کم‌خونیِ شیرخوارِ زیرِ ۶ ماه (بی‌درجهٔ WHO) هرگز routine نمی‌ماند — شاخهٔ تالاسمی و Hbِ تنها؛ کودکِ ۳ ساله با درجهٔ «متوسط» همان routine", () => {
  assert.equal(urg(go(0.3, [row("Hb", 8.5, "g/dL"), row("MCV", 65, "fL"), row("RBC", 6, "10^6/uL")]), "microcytic_anemia"), "this_week");
  assert.equal(urg(go(0.3, [row("Hb", 8.5, "g/dL")]), "anemia_hb_alone"), "this_week");
  assert.equal(urg(go(3, [row("Hb", 8.5, "g/dL"), row("MCV", 62, "fL"), row("RBC", 5.8, "10^6/uL")]), "microcytic_anemia"), "routine", "WHO ۷/۱۰: متوسط");
});

test("M374: کم‌خونیِ نورموسیتیکِ کودک کراتینین و CRP را می‌خواهد (P79 برگشت)", () => {
  const f = find(go(8, [row("Hb", 10, "g/dL"), row("MCV", 85, "fL")]), "normocytic_anemia");
  assert.ok(f.suggest.includes("کراتینین") && f.suggest.includes("CRP"), f.suggest.join());
});

test("M375: مرزِ MCVِ میکروسیتیک در ۱۶ سالگی پیوسته است (۱۵٫۹ و ۱۶ یکی)؛ شیرخوار حدِ خودش را دارد", () => {
  assert.equal(microMcvCut({ age: 15.9 }), microMcvCut({ age: 16 }));
  assert.ok(microMcvCut({ age: 0.3 }) < microMcvCut({ age: 16 }));
});

test("M376: Hb شیرخوارِ سالمِ ۴ ماهه (۱۰٫۵، افتِ فیزیولوژیک) «پایین» نمی‌خورد؛ ۸٫۵ هنوز می‌خورد (P82)", () => {
  // 🔴 پیش از اصلاح: بازهٔ ۳ ماه تا ۴ سال ۱۱–۱۴ بود و Hb 10.5 در ۴ ماهگی abnormal/low می‌شد.
  const hb = (v) => runEngine({ patient: { age: 4 / 12, sex: "M" }, tests: [row("Hb", v, "g/dL")] }).graded.find((g) => g.test === "HGB");
  assert.equal(hb(10.5)?.abnormal, false, JSON.stringify(hb(10.5)));
  assert.equal(hb(8.5)?.abnormal, true, "گاردِ مخالف: کم‌خونیِ واقعی گم نشود");
});
