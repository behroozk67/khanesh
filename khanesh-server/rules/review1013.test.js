// بازبینیِ چندعاملیِ ۲۰۲۶-۱۰-۱۳ — یافته‌های critical/high که داورِ Opus تأیید کرد و بدون تصمیمِ بالینی قابل‌اصلاح بودند.
// هر آزمون روی کدِ قبل از اصلاح قرمز است.
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { dosageSignals } from "./protected.js";
import { getPedRef } from "./refs_ped.js";

const run = (tests, patient = {}) => {
  const o = runEngine({ tests: tests.map(([name, value, unit]) => ({ name, value, unit })), patient });
  return { o, ids: runPatterns(o).findings.map((f) => `${f.pattern || f.id}:${f.urgency}`) };
};

test("R13-3: «Not Present» / «0/100» / «ندیده شد» غایب است، «Present» و «2/100» حاضر", () => {
  for (const v of ["Not Present", "Non Present", "ندیده شد", "0/100"]) {
    assert.ok(!run([["Blasts", v]]).ids.some((x) => x.startsWith("peripheral_smear")), `Blasts ${v}`);
  }
  assert.ok(run([["Blasts", "Present"]]).ids.some((x) => x.startsWith("peripheral_smear")), "کنترل مثبت");
});

test("R13-8: کشتِ خونِ «رشد میکروب ندارد» / «No pathogenic growth» / «Growth: None» منفی است؛ نامِ ارگانیسم مثبت می‌ماند", () => {
  for (const v of ["رشد میکروب ندارد", "No pathogenic growth", "Growth: None", "No microbial growth"]) {
    assert.ok(!run([["Blood Culture", v]]).ids.some((x) => x.startsWith("blood_culture_result:soon")), v);
  }
  assert.ok(run([["Blood Culture", "E. coli >10^5"]]).ids.some((x) => x === "blood_culture_result:soon"));
});

test("R13-10: HIV «پوزیتیو» / «+ve» / «Repeat reactive» / «1.5 (Reactive)» خوانده می‌شود؛ منفی‌ها نه", () => {
  for (const v of ["پوزیتیو", "مثبت است", "+ve", "Repeat reactive", "1.5 (Reactive)"]) {
    assert.ok(run([["HIV Ab", v]]).ids.some((x) => x.startsWith("hiv_screen_reactive")), v);
  }
  for (const v of ["Non-reactive", "نگاتیو", "1.5 (Non-reactive)"]) {
    assert.ok(!run([["HIV Ab", v]]).ids.some((x) => x.startsWith("hiv_screen_reactive")), v);
  }
});

test("R13-15: «K 7.5.» / «RBC 4.5 (3.8-5.2)» به unmapped می‌رود، نه qual؛ بازهٔ «8-10» و «3+» در qual می‌ماند", () => {
  for (const [n, v] of [["Potassium", "7.5."], ["Potassium", "7.5 L."], ["RBC", "4.5 (3.8-5.2)"], ["WBC", "11.2 H."]]) {
    const { o, ids } = run([[n, v]]);
    assert.ok(o.unmapped.includes(n), `${n} ${v} باید unmapped باشد`);
    assert.ok(!ids.some((x) => /hematuria|pyuria/.test(x)), `${n} ${v} نباید ادرار شود`);
  }
  assert.equal(run([["RBC", "8-10"]]).o.qual.RBC, "8-10");
  assert.equal(run([["CRP", "3+"]]).o.qual.CRP, "3+");
});

test("R13-18: املاهای رایجِ K/Na/WBC/کراتینین دیگر unmapped نیستند", () => {
  for (const [n, v] of [["K+", "7.2"], ["پتاسیم", "2.4"], ["Serum Sodium", "115"], ["WBC Count", "25"], ["Creatinine, Serum", "6"], ["Neutrophil Count", "0.3"]]) {
    const { o } = run([[n, v]]);
    assert.ok(!o.unmapped.includes(n), `${n} هنوز unmapped است`);
    assert.ok(o.abnormal.length >= 1, `${n} ${v} باید غیرطبیعی درجه شود`);
  }
});

test("R13-11: غلظتِ عددیِ نوارِ ادرار «+۳» نمی‌شود؛ درجهٔ واقعیِ «3+» هنوز پروتئینوریِ شدید است", () => {
  const strip = [["Urine SG", "1.015"], ["Urine pH", "6"]];
  assert.ok(!run([["Urine Protein", "10 mg/dL"], ...strip]).ids.some((x) => /proteinuria/.test(x)));
  assert.ok(run([["Urine Protein", "3+"], ...strip]).ids.some((x) => x.startsWith("proteinuria_heavy")));
});

test("R13-14: بی‌کربناتِ سرم کنار نوارِ ادرار، pH ادرار ۶٫۵ را اسیدوزِ شدید نمی‌کند", () => {
  const { ids } = run([["WBC", "7"], ["Hb", "14"], ["Creatinine", "1"], ["Bicarbonate", "24"], ["pH", "6.5"],
    ["Specific Gravity", "1.015"], ["Nitrite", "Negative"], ["Leukocyte Esterase", "Negative"]]);
  assert.ok(!ids.some((x) => x.startsWith("severe_acidosis")), ids.join());
});

test("R13-0: CK بالا + ALT بالا — رابدومیولیز دیده می‌شود؛ الگوی «از عضله» هنوز مالک است", () => {
  const p = { sex: "M", age: 40 };
  assert.ok(run([["CK", "3000"], ["AST", "120"], ["ALT", "80"]], p).ids.some((x) => x.startsWith("ck_elevated_alone")));
  const m = run([["CK", "3000"], ["AST", "120"], ["ALT", "30"]], p).ids;
  assert.ok(m.some((x) => x.startsWith("muscle_origin_not_liver")) && !m.some((x) => x.startsWith("ck_elevated_alone")));
});

test("R13-7: hs-CRP «خطر قلبی‌عروقی» برای کودک/نوزاد فعال نمی‌شود، برای بزرگسال می‌شود", () => {
  const f = (age) => run([["hs-CRP", "3", "mg/L"]], { age }).ids.some((x) => x.startsWith("hscrp_ascvd_risk"));
  assert.equal(f(0.01), false);
  assert.equal(f(7), false);
  assert.equal(f(50), true);
});

test("R13-4: بازهٔ BUN اطفال یک‌بار تبدیل می‌شود (کودکِ ۵ ساله ≈ ۷–۱۸ mg/dL)", () => {
  const r = getPedRef("UREA_N", 5);
  const [lo, hi] = Array.isArray(r) ? r : (r.both ?? [r.low, r.high]);
  assert.ok(lo > 5 && hi > 15 && hi < 22, `${lo}–${hi}`);
});

test("R13-21: «گرم در دسی‌لیتر» دوز حساب نمی‌شود؛ «۵ میلی‌گرم» هنوز دوز است", () => {
  assert.equal(dosageSignals("هموگلوبین شما ۹ گرم در دسی‌لیتر و ALT 80 واحد در لیتر است").length, 0);
  assert.ok(dosageSignals("روزی ۵ میلی‌گرم بخورید").length >= 1);
});

test("R13-12: نتیجهٔ کیفیِ مثبت زیرِ اورژانسِ پتاسیم «یافتهٔ تکمیلی» می‌شود، نه ناپدید؛ فوریت و دستورِ نهایی دست‌نخورده", () => {
  for (const [n, v, id] of [["Blood Culture", "Staphylococcus aureus", "blood_culture_result"], ["HIV Ab", "Reactive", "hiv_screen_reactive"],
    ["hCG", "Positive", "hcg_result"], ["Urine Culture", "E. coli >10^5 CFU/mL", "urine_culture_result"]]) {
    const o = runEngine({ tests: [{ name: "Potassium", value: "7.2" }, { name: n, value: v }], patient: { sex: "M", age: 40 } });
    const r = runPatterns(o);
    const s = r.findings.find((f) => f.rule_id === id);
    assert.ok(s?.supplementary, `${id} باید تکمیلی باشد؛ نمایش: ${r.findings.map((f) => f.rule_id)}`);
    assert.equal(s.action, "");
    assert.equal(r.overall_urgency, "emergency");
    assert.ok(!/«E\.»/.test(s.must_say), s.must_say);   // «E. coli» وسطِ نامِ میکروب بریده نمی‌شود
  }
  // کنترل: یافته‌ای که کلیدِ graded می‌خواند همچنان به تورِ ۲ سپرده است (leukopenia زیرِ pancytopenia تکمیلی نمی‌شود)
  const o = runEngine({ tests: [["WBC", "1.5"], ["Hb", "7.5"], ["PLT", "40"]].map(([name, value]) => ({ name, value })), patient: { sex: "M", age: 40 } });
  assert.ok(!runPatterns(o).findings.some((f) => f.rule_id === "leukopenia" && f.supplementary));
});

test("R13-9: واحدِ فقط‌خونی (g/dL، ×10³/µL) برگه را «ادرارِ خالص» نمی‌کند؛ برگهٔ ادرارِ واقعی همان می‌ماند", () => {
  const strip = [["Specific Gravity", "1.015"], ["Nitrite", "Negative"], ["pH", "6"]];
  const ids = (rows) => run(rows, { sex: "M", age: 40 }).ids;
  assert.ok(ids([["Hb", "5.0", "g/dL"], ["Creatinine", "1.0", "mg/dL"], ...strip]).some((x) => x.startsWith("severe_anemia_crisis")));
  const w = ids([["WBC", "25", "10^3/µL"], ["Creatinine", "1.0", "mg/dL"], ...strip]);
  assert.ok(w.some((x) => x.startsWith("leukocytosis")) && !w.some((x) => /pyuria/.test(x)), w.join());
  const u = ids([["Protein", "2+"], ["Glucose", "Negative"], ["Blood", "3+"], ["WBC", "5-10", "/hpf"], ...strip]);
  assert.ok(u.some((x) => x.startsWith("proteinuria")) && u.some((x) => x.startsWith("hematuria")), u.join());
});

// ── سرتیترِ بخش (پیشنهادِ کاربر، ۲۰۲۶-۱۰-۱۳): قندِ سرمِ زیرِ «بیوشیمی» کنارِ نوارِ ادرار قندِ خون می‌ماند ──
import { sectionKind } from "./adapter.js";
const runS = (rows) => {
  const o = runEngine({ tests: rows.map(([name, value, unit, section]) => ({ name, value, unit, section })), patient: { sex: "M", age: 40 } });
  return { o, ids: runPatterns(o).findings.map((f) => `${f.rule_id}:${f.urgency}`) };
};
const UA = [["Color", "Yellow"], ["Appearance", "Clear"], ["Specific Gravity", "1.020"], ["pH", "6"]];

test("R13-S1: sectionKind — فهرستِ بسته؛ ادرار پیش از بیوشیمی («Urine Chemistry»)؛ ناشناخته null", () => {
  for (const s of ["Urine Analysis", "U/A", "UA", "Urinalysis", "کامل ادرار", "Urine Chemistry"]) assert.equal(sectionKind(s), "urine", s);
  for (const s of ["Biochemistry", "Hematology", "Blood Gas", "بیوشیمی", "Serology"]) assert.equal(sectionKind(s), "blood", s);
  for (const s of [null, "", "Page 1", "Results"]) assert.equal(sectionKind(s), null, String(s));
});

test("R13-S2: «Glucose 600» زیرِ Biochemistry کنارِ نوارِ ادرار ⇒ قندِ خون (hhs)، نه قندِ ادرار", () => {
  const { o, ids } = runS([["Glucose", "600", "mg/dL", "Biochemistry"], ...UA.map((x) => [...x, null, "Urine Analysis"])]);
  assert.ok(o.graded.some((g) => g.test === "GLU_F" && g.value === 600), JSON.stringify(o.qual));
  assert.ok(ids.some((x) => x.startsWith("hhs_pattern")) && !ids.some((x) => x.startsWith("glycosuria")), ids.join());
});

test("R13-S3: بی‌سرتیتر — «Glucose 106» عددی کنارِ «Glucose Negative» نواری ⇒ عدد سرم است و گم نمی‌شود", () => {
  const { o } = runS([["Glucose", "106", "mg/dL"], ...UA, ["Glucose", "Negative"]]);
  assert.ok(o.graded.some((g) => g.test === "GLU_F" && g.value === 106));
  assert.equal(o.qual["Urine Glucose"], "Negative");
});

test("R13-S4: سرتیترِ ادرار عددِ ادرار را ادرار نگه می‌دارد؛ برگهٔ ادرارِ بی‌سرتیترِ قدیمی بی‌تغییر", () => {
  const d = runS([["Glucose", "250", "mg/dL", "Urine Analysis"], ...UA.map((x) => [...x, null, "Urine Analysis"])]);
  assert.ok(!d.o.graded.some((g) => g.test.startsWith("GLU")), "قندِ ادرار به قندِ خون رفت");
  const g = runS([["Protein", "2+"], ["Glucose", "Negative"], ["Blood", "3+"], ["Specific Gravity", "1.015"], ["Nitrite", "Negative"], ["pH", "6"]]);
  assert.ok(g.ids.some((x) => x.startsWith("proteinuria")) && g.ids.some((x) => x.startsWith("hematuria")), g.ids.join());
});

test("R13-S5: pH زیرِ «Blood Gas» pH خون است و pH ِ زیرِ «Urinalysis» ادرار، روی یک صفحه", () => {
  const { o } = runS([["pH", "7.1", null, "Blood Gas"], ["HCO3", "12", null, "Blood Gas"], ...UA.map((x) => [...x, null, "Urinalysis"])]);
  assert.ok(o.graded.some((g) => g.test === "PH" && g.value === 7.1));
  assert.equal(o.qual["Urine pH"], "6");
});

test("R13-S6: mergeIdentityTag — قندِ سرم و قندِ ادرارِ هم‌نام روی یک صفحه دو کلیدِ ادغامِ متفاوت دارند", async () => {
  const { mergeIdentityTag } = await import("./adapter.js");
  assert.notEqual(mergeIdentityTag("Glucose", "106", "Biochemistry"), mergeIdentityTag("Glucose", "Negative", "Urine Analysis"));
  assert.notEqual(mergeIdentityTag("Glucose", "106", null), mergeIdentityTag("Glucose", "Negative", null));   // بی‌سرتیتر: شکلِ مقدار
  assert.equal(mergeIdentityTag("Creatinine", "1.0", "Biochemistry"), "");   // کلیدِ غیرمبهم دست نمی‌خورد
});

// ── یافتهٔ ۲۲ (N9): forbid روی متنِ خودِ مدل — «آهن» برای ماکروسیتیک جایگزین می‌شود، فریتینِ یافتهٔ کمبودِ آهن نه ──
test("R13-22: جملهٔ مدل با واژهٔ ممنوع با متنِ موتور جایگزین می‌شود؛ معافیتِ R3-CR2 برای یافتهٔ دیگر", async () => {
  const { replaceForbiddenSentences } = await import("./coverage.js");
  const p = (rows) => runPatterns(runEngine({ tests: rows.map(([name, value, unit]) => ({ name, value, unit })), patient: { sex: "M", age: 50 } }));
  const mac = p([["Hb", "9.5", "g/dL"], ["MCV", "112", "fL"]]);
  assert.ok(mac.findings.some((f) => f.rule_id === "macrocytic_anemia" && f.forbid?.includes("آهن")), "پیش‌شرط");
  const r = replaceForbiddenSentences("گلبول‌ها درشت‌اند. برای جبرانِ کم‌خونی غذاهای آهن‌دار بخورید. با پزشک صحبت کنید.", mac.findings);
  assert.ok(!/آهن/.test(r.text), r.text);
  assert.ok(/B12/.test(r.text), "حرفِ درستِ موتور برنگشت: " + r.text);
  assert.ok(r.text.endsWith("با پزشک صحبت کنید."), "جمله‌های سالم دست خوردند");
  // برگهٔ ترکیبی: فریتینِ پایین یافتهٔ خودش را دارد ⇒ جمله‌اش پاک نمی‌شود
  const mix = p([["Hb", "9.5", "g/dL"], ["MCV", "112", "fL"], ["Ferritin", "6", "ng/mL"]]);
  const m = replaceForbiddenSentences("فریتینِ شما 6 است و ذخیرهٔ آهن کم است.", mix.findings);
  assert.equal(m.hits.length, 0);
  // «iron» داخلِ «environment» واژهٔ ممنوع نیست
  assert.equal(replaceForbiddenSentences("This environment matters.", mac.findings).hits.length, 0);
});

// ════════ P104 — پنج تصمیمِ بالینیِ کاربر (۲۰۲۶-۱۰-۱۳) ════════
const runP = (rows, patient) => {
  const o = runEngine({ tests: rows.map(([name, value, unit, reference]) => ({ name, value, unit, reference })), patient });
  return { o, p: runPatterns(o), ids: runPatterns(o).findings.map((f) => `${f.rule_id}:${f.urgency}`) };
};

test("P104-1 (یافتهٔ ۱۹): تروپونینِ ng/mL بالای حدِ چاپ‌شدهٔ خودِ ردیف ⇒ troponin_positive؛ بی‌مرجع یا مرجعِ شُل‌تر بی‌تغییر", () => {
  const pt = { sex: "M", age: 60 };
  for (const [n, v, ref] of [["Troponin I", "0.3", "<0.04"], ["Troponin T", "0.3", "<0.014"], ["Troponin I", "0.9", "<0.04"]]) {
    assert.ok(runP([[n, v, "ng/mL", ref]], pt).ids.includes("troponin_positive:emergency"), `${n} ${v} ${ref}`);
  }
  assert.equal(runP([["Troponin I", "0.02", "ng/mL", "<0.04"]], pt).p.findings.length, 0);
  assert.equal(runP([["Troponin I", "0.3", "ng/mL"]], pt).p.findings.length, 0, "بی‌مرجع: همان بازهٔ موتور");
  assert.equal(runP([["Troponin I", "0.3", "ng/mL", "0-1"]], pt).p.findings.length, 0, "مرجعِ شُل‌تر از موتور اعمال نمی‌شود");
  assert.ok(runP([["hs-Troponin I", "45", "ng/L", "<19"]], pt).ids.some((x) => x.startsWith("troponin_hs_above_99th")), "مسیرِ hs دست‌نخورده");
});

test("P104-2 (یافتهٔ ۶): بیلی‌روبینِ نوزادِ < ۱۴ روز داخلِ بازه ⇒ نمودارِ ساعتی (soon)؛ بالای بازه همان اورژانس؛ بعد از ۱۴ روز بی‌تغییر", () => {
  const d1 = runP([["Total Bilirubin", "14.5", "mg/dL"]], { age: "1 day", sex: "M" });
  assert.deepEqual(d1.ids, ["neonatal_bilirubin_hour_chart:soon"]);
  assert.ok(!d1.o.graded.some((g) => g.test === "BILI_T"), "حکمِ «طبیعی» نباید بماند");
  assert.doesNotMatch(d1.p.findings[0].must_say, /شما|نوزادِ نوزاد/);
  assert.ok(runP([["Total Bilirubin", "18", "mg/dL"]], { age: "3 days" }).ids.includes("bilirubin_emergency:emergency"));
  assert.ok(!runP([["Total Bilirubin", "6", "mg/dL"]], { age: "20 days" }).ids.some((x) => x.startsWith("neonatal_bilirubin_hour_chart")));
  assert.equal(runP([["Total Bilirubin", "1", "mg/dL"]], { age: 40 }).p.findings.length, 0);
});

test("P104-3 (یافتهٔ ۲۰): بارداری + پلاکت < ۱۰۰ + AST/ALT ≥ ۲×ULN یا سه‌گانهٔ تنسی ⇒ اورژانس؛ غیرباردار/< ۲۰ هفته/پلاکت ۱۳۰ نه", () => {
  const H = [["PLT", "80"], ["AST", "150", "U/L"], ["ALT", "140", "U/L"], ["LDH", "700", "U/L"]];
  const yes = runP(H, { sex: "F", age: 30, pregnant: true });
  assert.ok(yes.ids.includes("pregnancy_hellp_severe_features:emergency"), yes.ids.join());
  assert.equal(yes.p.overall_urgency, "emergency");
  for (const pt of [{ sex: "F", age: 30 }, { sex: "F", age: 30, pregnant: true, gestWeeks: 14 }]) {
    assert.ok(!runP(H, pt).ids.some((x) => x.startsWith("pregnancy_hellp")), JSON.stringify(pt));
  }
  assert.ok(!runP([["PLT", "130"], ...H.slice(1)], { sex: "F", age: 30, pregnant: true }).ids.some((x) => x.startsWith("pregnancy_hellp")));
  // فقط تنسی (AST ≥ ۷۰ ولی < ۲×ULN، LDH ≥ ۶۰۰، پلاکت ≤ ۱۰۰)
  assert.ok(runP([["PLT", "95"], ["AST", "75", "U/L"], ["LDH", "650", "U/L"]], { sex: "F", age: 30, pregnant: true }).ids
    .includes("pregnancy_hellp_severe_features:emergency"));
});

test("P104-4 (یافتهٔ ۲): DKA بی کتون فقط با HCO3 < ۱۸ (ADA 2024)؛ ۱۸–۲۱ ⇒ قندِ بالای بی‌کتون (soon) با درخواستِ کتون", () => {
  const pt = { sex: "M", age: 40 };
  const mid = runP([["FBS", "300", "mg/dL"], ["HCO3", "21"]], pt);
  assert.ok(!mid.ids.some((x) => x.startsWith("dka_pattern")), mid.ids.join());
  const sev = mid.p.findings.find((f) => f.rule_id === "severe_hyperglycemia_uncertain_ketosis");
  assert.equal(sev?.urgency, "soon");
  assert.match(sev.must_say, /کتون/);
  assert.ok(runP([["FBS", "300", "mg/dL"], ["HCO3", "15"]], pt).ids.includes("dka_pattern:emergency"));
  assert.ok(runP([["FBS", "300", "mg/dL"], ["HCO3", "21"], ["Urine Ketone", "2+"]], pt).ids.includes("dka_pattern:emergency"));
  assert.equal(runP([["FBS", "600", "mg/dL"], ["HCO3", "10"]], pt).p.overall_urgency, "emergency", "بدترین ورودی (N3/N29)");
  assert.equal(runP([["FBS", "520", "mg/dL"], ["HCO3", "21"]], pt).p.overall_urgency, "emergency", "قندِ > ۵۰۰ اورژانسِ خودش را دارد");
});

test("P104-5 (یافتهٔ ۵): Hb نوجوان — WHO: ۱۲–۱۴ سال < ۱۲٫۰، ≥ ۱۵ پسر < ۱۳٫۰؛ پسرِ ۱۳ ساله با ۱۳٫۲ کم‌خون نیست", () => {
  const hb = (age, sex, v) => runP([["Hb", v, "g/dL"], ["MCV", "88", "fL"]], { age, sex });
  assert.equal(hb(13, "M", "13.2").p.findings.length, 0);
  assert.ok(hb(13, "M", "11.5").ids.some((x) => x.startsWith("normocytic_anemia")));
  assert.equal(hb(15, "M", "13.2").p.findings.length, 0);
  assert.ok(hb(15, "M", "12.8").ids.some((x) => x.startsWith("normocytic_anemia")));
  assert.equal(hb(16, "M", "13.2").o.graded.find((g) => g.test === "HGB").range, "13.6–17.5", "بزرگسال (P53) دست‌نخورده");
});
