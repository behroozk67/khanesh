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

// ── P83 (تصمیمِ کاربر ۲۰۲۶-۱۰-۰۴): RDW بالا و TIBC بالا/پایین قاعدهٔ خودشان را گرفتند ──
test("M377: RDW-CV/RDW-SD بالا تنها یافتهٔ خودش را می‌گیرد، نه «توضیح آماده نداریم»؛ با کم‌خونی مالکِ همان قاعده است", () => {
  // 🔴 پیش از اصلاح: فقط unmatched_abnormal.
  const a = go(45, [row("RDW-CV", 18, "%")]);
  assert.deepEqual(ids(a), ["rdw_high"], ids(a).join());
  assert.equal(urg(a, "rdw_high"), "routine");
  assert.match(find(a, "rdw_high").must_say, /RDW-CV 18/);
  const b = go(45, [row("RDW-CV", 18, "%"), row("RDW-SD", 70, "fL")]);
  assert.match(find(b, "rdw_high").must_say, /RDW-CV 18.*RDW-SD 70/);
  // گاردِ مخالف: با کم‌خونی، rdw_high دوباره حرف نمی‌زند (N20)
  const c = go(45, [row("RDW-CV", 19, "%"), row("Hb", 9.5, "g/dL"), row("MCV", 68, "fL")]);
  assert.ok(!ids(c).includes("rdw_high"), ids(c).join());
  assert.ok(!ids(c).includes("unmatched_abnormal") && !c.findings.some((f) => (f.uncovered ?? []).includes("RDW_CV")), "RDW گم شد");
  // RDW طبیعی یا پایین چیزی نمی‌سازد
  assert.ok(!ids(go(45, [row("RDW-CV", 13, "%")])).includes("rdw_high"));
});

test("M378: TIBC بالا و پایین قاعدهٔ خودشان را می‌گیرند، سه‌حالته دربارهٔ آهن/فریتین/TSAT؛ در الگوی فقر آهن مالک همان است", () => {
  const hi = go(45, [row("TIBC", 520, "ug/dL")]);
  assert.deepEqual(ids(hi), ["tibc_high"], ids(hi).join());
  assert.match(find(hi, "tibc_high").must_say, /TIBC شما 520/);
  assert.match(find(hi, "tibc_high").must_say, /آهن سرم روی این برگه نیست/, "arm غایب");
  const lo = go(45, [row("TIBC", 180, "ug/dL"), row("Iron", 90, "ug/dL")]);
  assert.deepEqual(ids(lo), ["tibc_low"], ids(lo).join());
  const t = find(lo, "tibc_low").must_say;
  assert.doesNotMatch(t, /شایع‌ترین نشانهٔ کمبود آهن/, "جهتِ معکوس");
  assert.match(t, /آهن سرم 90 و در محدودهٔ طبیعی است/, "arm طبیعی");
  // بارداری: جملهٔ مخصوص فقط برای باردار
  const preg = runPatterns(runEngine({ patient: { age: 30, sex: "F", pregnant: true }, tests: [row("TIBC", 520, "ug/dL")] }));
  assert.match(find(preg, "tibc_high").must_say, /شما باردار هستید/);
  assert.doesNotMatch(find(hi, "tibc_high").must_say, /شما باردار هستید/);
  // الگوی فقر آهن مالک است؛ TIBC بی‌توضیح نمی‌ماند و rule دوم هم نمی‌آید
  const ida = go(45, [row("TIBC", 520, "ug/dL"), row("Ferritin", 6, "ng/mL"), row("Iron", 30, "ug/dL"), row("Hb", 9.5, "g/dL"), row("MCV", 68, "fL")]);
  assert.ok(!ids(ida).includes("tibc_high"), ids(ida).join());
  assert.ok(!ids(ida).includes("unmatched_abnormal") && !ida.findings.some((f) => (f.uncovered ?? []).includes("TIBC")), "TIBC گم شد");
});

test("M379: PDW/P-LCR/PTِ کنترلِ تنها «هیچ‌کدام از مقادیر خارج از محدوده نیست» نمی‌گیرند (N4)؛ CBCِ عادی بی‌آن‌ها دست‌نخورده", async () => {
  // 🔴 پیش از اصلاح: خلاصهٔ «نتایج آزمایش شما در محدوده طبیعی است» برای PDW 25 با بازهٔ چاپیِ 10–20.
  const { buildNormalResult } = await import("./prompt.js");
  const res = (rows) => { const e = runEngine({ patient: { age: 40, sex: "M" }, tests: rows }); return { e, r: buildNormalResult(e) }; };
  for (const rows of [[{ name: "PDW", value: "25", reference: "10-20" }], [{ name: "P-LCR", value: "60", reference: "15-35" }], [{ name: "PT control", value: "50" }]]) {
    const { e, r } = res(rows);
    assert.equal(runPatterns(e).findings.length, 0, JSON.stringify(rows));
    assert.doesNotMatch(r.summary + r.interpretation, /نتایج آزمایش شما در محدوده طبیعی است|^هیچ‌کدام از مقادیر خارج از محدوده مرجع نیست/, JSON.stringify(rows));
    assert.match(r.interpretation, /سنجیده نمی‌شوند/);
  }
  const ok = res([row("Hb", 14, "g/dL")]).r;
  assert.equal(ok.summary, "نتایج آزمایش شما در محدوده طبیعی است.", "گاردِ مخالف: برگهٔ عادی دست نخورد");
});

test("M380: بیلی‌روبین مستقیم↑ و غیرمستقیم↑ تنها قاعدهٔ خودشان را می‌گیرند؛ با الگوی بیلی‌روبینِ تام مالکِ همان است (N20)", () => {
  // 🔴 پیش از اصلاح: فقط unmatched_abnormal.
  const d = go(45, [row("Bilirubin Direct", 1.2, "mg/dL")]);
  assert.deepEqual(ids(d), ["bilirubin_direct_high"], ids(d).join());
  assert.match(find(d, "bilirubin_direct_high").must_say, /بیلی‌روبین مستقیم شما 1.2/);
  assert.match(find(d, "bilirubin_direct_high").must_say, /ALP روی این برگه نیست/, "arm غایب");
  const i = go(45, [row("Bilirubin Indirect", 2.5, "mg/dL"), row("Hb", 14, "g/dL"), row("ALT", 20, "U/L"), row("AST", 20, "U/L")]);
  assert.deepEqual(ids(i), ["bilirubin_indirect_high"], ids(i).join());
  assert.match(find(i, "bilirubin_indirect_high").must_say, /ژیلبر/);
  const noHb = go(45, [row("Bilirubin Indirect", 2.5, "mg/dL")]);
  assert.doesNotMatch(find(noHb, "bilirubin_indirect_high").must_say, /طبیعی بودنِ هموگلوبین/, "بی‌Hb «طبیعی» نمی‌گوید (N4)");
  // با بیلی‌روبین تام + اجزا، الگوی موجود مالک است و یافتهٔ دوم نمی‌آید
  const t = go(45, [row("Bilirubin Total", 3, "mg/dL"), row("Bilirubin Direct", 1.8, "mg/dL"), row("Bilirubin Indirect", 1.2, "mg/dL")]);
  assert.ok(!ids(t).includes("bilirubin_direct_high") && !ids(t).includes("bilirubin_indirect_high"), ids(t).join());
  assert.ok(!ids(t).includes("unmatched_abnormal") && !t.findings.some((f) => (f.uncovered ?? []).some((k) => /BILI/.test(k))), "بیلی‌روبین گم شد");
  // دو یافته برای دو جزءِ بالا هم‌زمان نیستند وقتی تام نیست؟ هر کدام یک یافته (دو عددِ متفاوت)
  const both = go(45, [row("Bilirubin Direct", 1.2, "mg/dL"), row("Bilirubin Indirect", 2.5, "mg/dL")]);
  assert.ok(!ids(both).includes("unmatched_abnormal"), ids(both).join());
});
