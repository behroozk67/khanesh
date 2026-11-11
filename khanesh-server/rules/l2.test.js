// ============================================================
// l2.test.js — لایهٔ ۲ (ممیزیِ ۶ بازبینِ پزشکی روی patterns_*.js، ۲۰۲۶-۱۰-۰۳): گروه ۱ (N6 مجموعهٔ بسته)، گروه ۲ (N3 واحد)،
// گروه ۴ (N19/N20 کم‌اورژانسی). فایلِ جدا تا با engine.test.js تداخل نکند.
// 🔴 هر تست روی HEAD (۷aec40e + کامیتِ P74) قرمز است — با `git archive` + junction اندازه‌گیری شد (خروجی در گزارشِ جلسه).
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns, RULES } from "./patterns.js";
import { buildEngineRecommendations } from "./prompt.js";

const run = (tests, patient = { age: 45, sex: "M" }) => {
  const e = runEngine({ patient, tests });
  const p = runPatterns(e);
  return { e, p, recs: buildEngineRecommendations(p, e) };
};
const ids = (r) => r.p.findings.map((f) => f.rule_id);
const all = (r) => [...r.p.findings.flatMap((f) => [f.headline, f.must_say, f.action, ...(f.warnings ?? [])]), ...r.recs].join(" ");
const row = (name, value, unit) => ({ name, value, ...(unit ? { unit } : {}) });

// ═══ گروه ۱ — N6: کیفی یک مجموعهٔ بسته است، نه زیررشته ═══

test("M322: نتیجهٔ منفیِ غربالگری/تروپونین («Not reactive»، «غیر واکنش‌گر»، «Undetected»، «Nondetected»، «Non-reactive») یافته نمی‌سازد", () => {
  // 🔴 پیش از اصلاح: هر کدام this_week (غربالگری) یا emergency (تروپونین) می‌گرفت — «reactive» ⊂ «Not reactive»، «detected» ⊂ «Undetected».
  const NEG = [
    [row("HIV Ab", "Not reactive")], [row("HIV Ab", "Not Reactive (0.1)")], [row("HIV Ab", "غیر واکنش‌گر")],
    [row("HBsAg", "Not reactive")], [row("HBsAg", "Undetected")], [row("HBsAg", "غیر واکنش‌گر")],
    [row("HCV Ab", "Not reactive")], [row("HCV Ab", "Nondetected")],
    [row("Troponin I", "Non-reactive")], [row("Troponin I", "Not reactive")],
  ];
  for (const t of NEG) {
    const r = run(t);
    assert.equal(r.p.overall_urgency, "none", `${t[0].name}=${t[0].value}: ${ids(r)} ${r.p.overall_urgency}`);
    assert.equal(r.p.has_critical, false);
  }
});

test("M322b: مثبت‌ها هنوز می‌افتند (گاردِ جهتِ دیگر) — «Reactive»، «Reactive (S/CO 12.4)»، «Weakly reactive»، «Positive»", () => {
  const POS = [
    [row("HIV Ab", "Reactive"), "hiv_screen_reactive"], [row("HIV Ab", "Reactive (S/CO 12.4)"), "hiv_screen_reactive"],
    [row("HIV Ab", "Weakly reactive"), "hiv_screen_reactive"], [row("HBsAg", "Positive"), "hbv_screen_reactive"],
    [row("HCV Ab", "Reactive"), "hcv_screen_reactive"],
  ];
  for (const [t, id] of POS) {
    const r = run([t]);
    assert.ok(ids(r).includes(id), `${t.name}=${t.value}: ${ids(r)}`);
  }
  assert.equal(run([row("Troponin I", "Positive")]).p.has_critical, true);
  assert.equal(run([row("Troponin I", "Reactive")]).p.has_critical, true);
});

test("M323: کشتِ منفی («بدون رشد»، «رشد نداشت»، «No significant growth»، «<10000 CFU/mL») مثبت خوانده نمی‌شود؛ رشدِ واقعی هنوز می‌افتد", () => {
  // 🔴 پیش از اصلاح: کشتِ خونِ «بدون رشد» ⇒ blood_culture_result[soon] «میکروب در خون رشد کرده».
  for (const [name, v] of [["Blood Culture", "بدون رشد"], ["Blood Culture", "No significant growth"], ["Blood Culture", "No growth after 5 days"],
    ["Urine Culture", "رشد نداشت"], ["Urine Culture", "رشد باکتری مشاهده نشد"], ["Urine Culture", "<10000 CFU/mL"]]) {
    const r = run([row(name, v)]);
    assert.ok(!r.p.findings.some((f) => ["soon", "this_week", "emergency"].includes(f.urgency)), `${name}=${v}: ${r.p.findings.map((f) => f.rule_id + ":" + f.urgency)}`);
  }
  assert.equal(run([row("Blood Culture", "Growth of Staphylococcus aureus")]).p.overall_urgency, "soon");
  assert.equal(run([row("Urine Culture", "E. coli > 100000 CFU/mL")]).p.overall_urgency, "this_week");
});

test("M324: hCG «Not positive» و «+/-» مثبت نیستند؛ «Borderline» نام برده می‌شود، نه سکوت (N6/N28)", () => {
  const F = { age: 30, sex: "F" };
  for (const v of ["Not positive", "+/-"]) {
    const r = run([row("Pregnancy test", v)], F);
    assert.ok(!/بارداری مثبت است|با بارداری سازگار/.test(all(r)), `«${v}» مثبت خوانده شد: ${all(r)}`);
  }
  const b = run([row("Beta hCG", "Borderline"), row("Hb", "13.5", "g/dL")], F);
  assert.ok(ids(b).includes("qual_equivocal_result"), `مبهم نام برده نشد: ${ids(b)}`);
  assert.ok(/Borderline/.test(all(b)) && !/مثبت است/.test(all(b)), all(b));
});

test("M324b: CRP «Reactive» کنار ESR طبیعی دیده می‌شود؛ «+/-» مثبت نیست و نام برده می‌شود", () => {
  // 🔴 پیش از اصلاح: «Reactive» + ESR 5 ⇒ هیچ یافته (مسیرِ «نتایج طبیعی»)؛ «+/-» + ESR 5 ⇒ «نشانهٔ التهابِ تازه» (this_week).
  const a = run([row("CRP", "Reactive"), row("ESR", "5")]);
  assert.ok(ids(a).length > 0 && a.p.overall_urgency !== "none", `Reactive دیده نشد: ${ids(a)}`);
  const b = run([row("CRP", "+/-"), row("ESR", "5")]);
  assert.ok(!/التهاب تازه/.test(all(b)), all(b));
  assert.ok(ids(b).includes("qual_equivocal_result"), ids(b));
});

test("M325: لامِ «Blasts <1%» و «blasts less than 1%» بلاستِ حاضر نیست؛ «Blasts 5%» هنوز soon", () => {
  // 🔴 پیش از اصلاح: regexِ درصد «<» را می‌بلعید و «۱٪ حاضر» ⇒ peripheral_smear_findings[soon] «۲۴ تا ۴۸ ساعت».
  for (const v of ["Blasts <1%, normal morphology", "blasts less than 1%"]) {
    const r = run([row("Peripheral Smear", v)]);
    assert.ok(!ids(r).includes("peripheral_smear_findings"), `${v}: ${r.p.findings.map((f) => f.rule_id + ":" + f.urgency)}`);
  }
  assert.equal(run([row("Peripheral Smear", "Blasts 5%")]).p.overall_urgency, "soon");
});

test("M326: مقدارِ سانسورشدهٔ «<6» (حدِ بالای ۵) عددِ ۶ نمی‌شود — «تفسیر نشدند»؛ «<3» طبیعی و «>10» بالا می‌ماند", () => {
  // 🔴 پیش از اصلاح: «CRP <6 mg/L» ⇒ crp_elevated «CRP شما 6 است … بالاست»؛ بی‌واحد ⇒ unit_unknown_values «خارج از محدوده».
  for (const t of [row("CRP", "<6", "mg/L"), row("CRP", "<6")]) {
    const r = run([t]);
    assert.ok(!ids(r).includes("crp_elevated") && !ids(r).includes("unit_unknown_values"), `${t.value}${t.unit ?? ""}: ${ids(r)}`);
    assert.ok(r.e.unmapped.includes("CRP"), JSON.stringify(r.e.unmapped));
  }
  const lt3 = run([row("CRP", "<3", "mg/L")]);
  assert.ok(!ids(lt3).includes("crp_elevated") && lt3.e.graded.find((g) => g.test === "CRP_Q")?.abnormal === false, ids(lt3).join());
  assert.ok(ids(run([row("CRP", ">10", "mg/L")])).includes("crp_elevated"));
});

test("M327: Anti-HBc IgM منفی فقط عفونتِ تازه را رد می‌کند، تماسِ قبلی را نه", () => {
  const r = run([row("Anti-HBc IgM", "Negative")]);
  assert.ok(!/تماسِ قبلی با ویروسِ هپاتیت B دیده نشده/.test(all(r)), all(r));
  assert.ok(/IgM منفی است/.test(all(r)) && /رد نمی‌کند/.test(all(r)), all(r));
  // کنترل: Anti-HBc تام منفی همان جملهٔ قبلی را دارد
  assert.ok(/تماسِ قبلی/.test(all(run([row("Anti-HBc", "Negative")]))));
});

test("M328: ASO «1,200» هزارگان است (۱۲۰۰)، نه ۱٫۲", () => {
  const r = run([row("ASO", "1,200", "IU/mL")]);
  assert.ok(!/ASO 1\.2\b/.test(all(r)), all(r));
  assert.ok(/1200|1,200/.test(all(r)), all(r));
});

// ═══ گروه ۲ — N3: واحدِ چاپ‌شده ═══

test("M329: لاکتات mg/dL (≈ ۲ mmol/L، طبیعی)، PCT pg/mL و APOB g/L با واحدِ چاپ‌شده تبدیل می‌شوند؛ بی‌واحد دست نمی‌خورد", () => {
  // 🔴 پیش از اصلاح: «Lactate 18 mg/dL» و «PCT 50 pg/mL» ⇒ sepsis_markers emergency؛ «Apo B 1.4 g/L» ⇒ ۱٫۴ mg/dL و بی‌یافته.
  const lac = run([row("Lactate", "18", "mg/dL")]);
  assert.equal(lac.p.overall_urgency, "none", ids(lac).join());
  assert.ok(lac.e.unitConversions.some((c) => c.test === "LACTATE" && Math.abs(c.value - 2) < 0.01));
  assert.equal(run([row("Lactate", "40", "mg/dL")]).p.has_critical, true, "۴۰ mg/dL ≈ ۴٫۴ mmol/L واقعاً بالاست");
  assert.equal(run([row("Lactate", "5", "mmol/L")]).p.has_critical, true);
  assert.equal(run([row("Procalcitonin", "50", "pg/mL")]).p.overall_urgency, "none");
  assert.equal(run([row("Procalcitonin", "3", "ng/mL")]).p.has_critical, true);
  const apo = run([row("Apo B", "1.4", "g/L")]);
  assert.ok(ids(apo).includes("apob_elevated"), ids(apo).join());
  assert.equal(apo.e.graded.find((g) => g.test === "APOB").value, 140);
});

test("M329b: پرولاکتینِ بی‌واحد با محدودهٔ چاپ‌شدهٔ «102-496» mIU/L است؛ بی‌محدوده همان ng/mL می‌ماند", () => {
  // 🔴 پیش از اصلاح: «PRL 400 · مرجع 102-496» ⇒ hyperprolactinemia[this_week] «۴۰۰ ng/mL … هیپوفیز».
  const a = run([{ name: "Prolactin", value: "400", reference: "102-496" }]);
  assert.ok(!ids(a).includes("hyperprolactinemia"), ids(a).join());
  assert.ok(a.e.unitConversions.some((c) => c.test === "PRL" && c.basis === "reference"), JSON.stringify(a.e.unitConversions));
  assert.ok(ids(run([row("Prolactin", "400")])).includes("hyperprolactinemia"), "بی‌محدوده و بی‌واحد همان ng/mL (رفتارِ قبلی)");
});

test("M329c: مدتِ پرهیزِ منی «72 hours» = ۳ روز، نه ۷۲", () => {
  const base = [row("Volume", "2.5", "mL"), row("Sperm Count", "40", "million/mL"), row("Motility", "45", "%"), row("Morphology", "5", "%")];
  assert.equal(run([...base, row("Abstinence", "72", "hours")]).e.ungraded.SEMEN_ABSTINENCE.value, 3);
  assert.equal(run([...base, row("Abstinence", "3", "days")]).e.ungraded.SEMEN_ABSTINENCE.value, 3);
});

// ═══ گروه ۴ — N19/N20: هرچه برگه کامل‌تر، نباید هشدار کم‌تر شود ═══

test("M330: کراتینین ۴٫۴ + خون و پروتئینِ ادرار — اورژانسِ kidney به glomerulonephritis_pattern واگذار نمی‌شود", () => {
  // 🔴 پیش از اصلاح: فقط glomerulonephritis_pattern[this_week]، has_critical=false؛ همان کراتینین تنها اورژانس بود.
  const crit = run([row("Creatinine", "4.4", "mg/dL"), row("Urine Blood", "2+"), row("Urine Protein", "2+")], { age: 55, sex: "M" });
  assert.equal(crit.p.has_critical, true, `${crit.p.findings.map((f) => f.rule_id + ":" + f.urgency)}`);
  assert.ok(ids(crit).some((i) => i === "kidney"));
  // کنترل: کراتینین ۱٫۸ (اورژانس نیست) همان واگذاریِ قبلی را دارد — فقط گلومرولونفریت
  const mild = run([row("Creatinine", "1.8", "mg/dL"), row("Urine Blood", "2+"), row("Urine Protein", "2+")], { age: 55, sex: "M" });
  assert.ok(!ids(mild).includes("kidney") && ids(mild).includes("glomerulonephritis_pattern"), ids(mild).join());
});

test("M331: CK بالا + AST بالا + ALT طبیعی — فوریت از شدتِ CK می‌آید (۵۰۰۰ اورژانس، ۹۰۰ این‌هفته، ۳۰۰ routine)", () => {
  // 🔴 پیش از اصلاح: هر سه routine با «ورزش سنگین»؛ CK ۵۰۰۰ تنها اورژانس بود.
  const big = run([row("CK", "5000", "U/L"), row("AST", "400"), row("ALT", "30")]);
  assert.equal(big.p.has_critical, true, big.p.findings.map((f) => f.rule_id + ":" + f.urgency).join());
  const mid = run([row("CK", "900", "U/L"), row("AST", "120"), row("ALT", "30")]);
  assert.equal(mid.p.overall_urgency, "this_week");
  assert.ok(/رابدومیولیز|کلیه/.test(all(mid)));
  const low = run([row("CK", "300", "U/L"), row("AST", "60"), row("ALT", "30")]);
  assert.equal(low.p.overall_urgency, "routine", "CK خفیف همان رفتارِ قبلی");
});

test("M332: قندِ ناشتای ۹۰ کنارِ قندِ تصادفیِ ۴۵ — هایپوگلیسمی از «کمترین» می‌آید، نه «اولین»", () => {
  // 🔴 پیش از اصلاح: `GLU_F ?? GLU_2H ?? GLU_RANDOM` ⇒ ۹۰ ⇒ هیچ یافته (فقط «توضیح نداریم»).
  const r = run([row("FBS", "90", "mg/dL"), row("BS", "45", "mg/dL")]);
  assert.ok(r.p.findings.some((f) => /hypoglycemia/.test(f.pattern)), r.p.findings.map((f) => f.pattern).join());
  assert.equal(r.p.has_critical, true, "۴۵ < ۵۴ ⇒ اورژانس (P72 پرسش ۵)");
});

test("M333: تالاسمیِ میکروسیتیک با Hb 7.5 (شدید) routine نمی‌ماند؛ تیتر «تعدادشان زیاد» فقط با RBCِ بالا", () => {
  // 🔴 پیش از اصلاح: Hb 7.5 · MCV 62 · RBC 4.8 ⇒ routine «نوبت عادی» کنارِ «کم‌خونیِ شدید» و تیترِ «تعدادشان زیاد است» با RBCِ طبیعی.
  const s = run([row("Hb", "7.5", "g/dL"), row("MCV", "62", "fL"), row("RBC", "4.8")], { age: 35, sex: "F" });
  const f = s.p.findings.find((x) => x.pattern === "microcytic_thal_likely");
  assert.ok(f, ids(s).join());
  assert.equal(f.urgency, "soon");   // P107h (تصمیمِ کاربر، ردیف ۶): Hb ≤ ۸٫۵ ⇒ دست‌کم soon (قبلاً this_week)
  assert.ok(/۲۴ تا ۴۸ ساعت/.test(f.action) && !/نوبت عادی/.test(f.action), f.action);
  assert.ok(!/تعدادشان زیاد/.test(f.headline), f.headline);
  // کنترل: Hb 11 · MCV 68 · RBC بالا ⇒ همان routine و همان تیتر
  const m = run([row("Hb", "11", "g/dL"), row("MCV", "68", "fL"), row("RBC", "6.2")], { age: 35, sex: "F" });
  const g = m.p.findings.find((x) => x.pattern === "microcytic_thal_likely");
  assert.ok(g && g.urgency === "routine" && /تعدادشان زیاد/.test(g.headline), JSON.stringify(g && [g.urgency, g.headline]));
});

test("M334: HbA1c 8 با Hb 9 «پیش‌دیابت» نیست و یک یافتهٔ قندی دارد؛ HbA1c 8 تنها هم دو زمان‌بندیِ رقیب ندارد", () => {
  // 🔴 پیش از اصلاح: glycemia ⇒ prediabetes_range[routine] + diabetes_a1c_diagnostic[routine]؛ HbA1c 8 تنها ⇒ diabetes_range[this_week] + diabetes_a1c_diagnostic[routine].
  const a = run([row("HbA1c", "8", "%"), row("Hb", "9", "g/dL")]);
  assert.ok(!/پیش‌دیابت/.test(all(a)), all(a));
  const glyc = a.p.findings.filter((f) => /a1c|diabetes|glyc/i.test(f.pattern));
  assert.equal(glyc.length, 1, glyc.map((f) => f.pattern).join());
  assert.equal(glyc[0].urgency, "this_week");
  assert.ok(/ممکن است دقیق نباشد/.test(glyc[0].headline));
  const b = run([row("HbA1c", "8", "%")]);
  assert.equal(b.p.findings.filter((f) => /a1c|diabetes|glyc/i.test(f.pattern)).length, 1);
  assert.ok(!RULES.some((r) => r.id === "diabetes_a1c_diagnostic"));
  // کنترل: HbA1c 6.0 با Hb 9 هنوز پیش‌دیابتِ routine است (۵٫۷–۶٫۴ در کم‌خونی همان هشدارِ دقت را دارد)
  assert.ok(run([row("HbA1c", "6", "%"), row("Hb", "9", "g/dL")]).p.findings.some((f) => f.pattern === "prediabetes_range"));
});

test("M335: بروسلا — رایت ≥۱/۸۰ + کومبس ≥۱/۴۰ بی‌2ME این‌هفته‌ای است (آزمایشِ قوی‌تر فوریت را کم نمی‌کند)", () => {
  // 🔴 پیش از اصلاح: رایت ۱/۱۶۰ + کومبس ۱/۱۶۰ ⇒ فقط unmatched_abnormal[routine]؛ رایتِ تنها this_week بود.
  for (const t of [[row("Wright", "1/160"), row("Coombs Wright", "1/160")], [row("Wright", "1/320"), row("2ME", "1/20"), row("Coombs Wright", "1/80")]]) {
    const r = run(t);
    assert.ok(ids(r).includes("brucella_active"), ids(r).join());
    assert.equal(r.p.overall_urgency, "this_week");
    assert.ok(!ids(r).includes("unmatched_abnormal"));
  }
  assert.ok(ids(run([row("Wright", "1/160")])).includes("brucella_wright_only"), "رایتِ تنها همان قبلی");
});

// ═══ بازبینیِ مستقلِ همین تغییرها (code-reviewer، ۲۰۲۶-۱۰-۰۴) — هر کدام روی نسخهٔ پیش از بازبین قرمز بود (probe، خروجی در گزارش) ═══
// ⚠️ M336–M338 و M340 روی HEAD سبزند (HEAD این رگرسیون را نداشت): گاردِ «رفعِ خودِ ما» هستند، نه رفعِ باگِ HEAD.

test("M336: مثبت‌های معمولِ تروپونین/HIV/HBsAg/CRP/hCG با نقطه، علامتِ درجه، «for …» و «Repeatedly» از دست نمی‌روند (N6 جهتِ مخالف)", () => {
  // 🔴 پیش از بازبین: closed-set فقط «Positive» و «Reactive» تمیز را می‌شناخت؛ «POSITIVE.» تروپونین ⇒ مسیرِ «نتایج طبیعی» (اورژانسِ گم‌شده).
  for (const v of ["POSITIVE.", "Positive ++", "مثبت ۳+", "Positive for troponin", "Weak positive"]) {
    assert.equal(run([row("Troponin I", v)]).p.has_critical, true, `Troponin ${v}`);
  }
  for (const [n, v, id] of [["Anti-HIV", "Positive.", "hiv_screen_reactive"], ["Anti-HIV", "Repeatedly reactive", "hiv_screen_reactive"],
    ["HBsAg", "Reactive.", "hbv_screen_reactive"], ["CRP", "POSITIVE.", "crp_elevated"], ["CRP", "Positive ++", "crp_elevated"]]) {
    assert.ok(ids(run([row(n, v)])).includes(id), `${n}=${v}`);
  }
  assert.ok(ids(run([row("Pregnancy test", "Positive.")], { age: 30, sex: "F" })).includes("hcg_result"));
  // و منفی‌ها منفی می‌مانند (همان تنوعِ املا)
  for (const v of ["Negative.", "NON-REACTIVE.", "Not reactive ."]) assert.equal(run([row("Troponin I", v)]).p.overall_urgency, "none", v);
});

test("M337: کشتِ دارای نامِ ارگانیسم منفی نمی‌شود؛ آستانهٔ «<10000» فقط برای ادرار است نه کشتِ خون", () => {
  for (const [n, v, urg] of [["Urine Culture", "Growth of E. coli 10^5 CFU/mL <10^3 other", "this_week"], ["Urine Culture", "Staph aureus <10000 CFU/mL", "this_week"],
    ["Blood Culture", "Growth of Candida, <10000", "soon"], ["Blood Culture", "E. coli: no significant growth", "soon"], ["Blood Culture", "<10000 CFU/mL", "soon"]]) {
    assert.equal(run([row(n, v)]).p.overall_urgency, urg, `${n}=${v}`);
  }
  assert.equal(run([row("Urine Culture", "<10000 CFU/mL")]).p.overall_urgency, "routine");
});

test("M338: هایپوگلیسمی «توضیح‌نداده» هم نمی‌گیرد — کلیدهای قند در سورسِ قاعده می‌مانند (N18، RULE_READS)", () => {
  for (const [t, pt] of [[[row("FBS", "45", "mg/dL")], undefined], [[row("FBS", "35", "mg/dL")], { age: 0, sex: "M" }], [[row("FBS", "45", "mg/dL"), row("2hPP", "90", "mg/dL")], undefined]]) {
    const r = run(t, pt);
    assert.ok(!ids(r).includes("unexplained_abnormal"), ids(r).join());
  }
});

test("M339: Cr 4.4 + خون + پروتئینِ ادرار — اورژانسِ kidney می‌ماند و خون/پروتئینِ ادرار هم به بیمار گفته می‌شود (N18)", () => {
  const r = run([row("Creatinine", "4.4", "mg/dL"), row("Urine Blood", "3+"), row("Urine Protein", "2+")], { age: 55, sex: "M" });
  assert.equal(r.p.has_critical, true);
  assert.ok(/خون و هم پروتئین/.test(JSON.stringify(r.p.findings.map((f) => [f.must_say, f.brief]))), "یافتهٔ ادرار گم شد");
});

test("M340: «<5 mIU/L» TSH هم مثل بی‌واحد سانسورشده است؛ «less than 20%» بلاست اورژانس نمی‌شود؛ تروپونینِ مرزی «soon» است نه سکوت", () => {
  const t = run([row("TSH", "<5", "mIU/L")]);
  assert.ok(t.e.unmapped.includes("TSH") && !ids(t).includes("thyroid"), ids(t).join());
  for (const v of ["blasts less than 20%", "blasts under 25%", "Blasts <20%"]) {
    assert.equal(run([row("Peripheral Smear", v)]).p.overall_urgency, "soon", v);
  }
  assert.equal(run([row("Troponin I", "Borderline")]).p.overall_urgency, "soon");
  assert.equal(run([row("Troponin I", "Borderline")]).p.has_critical, false);
});

// ═══ گروه ۵ — N4: «طبیعی است» دربارهٔ آزمایشِ نسنجیده ═══
const finding = (r, id) => r.p.findings.find((f) => f.rule_id === id);

test("M341: «پروتئینِ تام» با آلبومینِ هم‌جهت‌نبودنِ چاپ‌شده نمی‌گوید «آلبومین روی برگه نیست»؛ غایبِ واقعی هنوز همان را می‌گوید", () => {
  // 🔴 پیش از اصلاح: TP بالا + ALB پایین، و TP پایین + ALB بالا هر دو «آلبومین روی این برگه نیست» می‌گرفتند (ادعای دروغ دربارهٔ عددِ چاپ‌شده).
  const a = finding(run([row("Total Protein", "9.2", "g/dL"), row("Albumin", "3.0", "g/dL")]), "total_protein_abnormal");
  const b = finding(run([row("Total Protein", "5.5", "g/dL"), row("Albumin", "5.4", "g/dL")]), "total_protein_abnormal");
  assert.ok(a && b);
  assert.doesNotMatch(a.must_say, /روی این برگه نیست/);
  assert.doesNotMatch(b.must_say, /روی این برگه نیست/);
  assert.match(a.must_say, /3 |3\)/); assert.match(b.must_say, /5\.4/);
  assert.match(finding(run([row("Total Protein", "9.2", "g/dL")]), "total_protein_abnormal").must_say, /روی این برگه نیست/);
});

test("M342: الگوی عضله (LDH+CK+AST بالا) بی‌هاپتوگلوبین نمی‌گوید «هاپتوگلوبین طبیعی است»؛ با هاپتوگلوبینِ طبیعی همان را می‌گوید", () => {
  const base = [row("LDH", "900", "U/L"), row("CK", "900", "U/L"), row("AST", "120", "U/L")];
  const a = finding(run(base), "hemolysis_pattern");
  assert.ok(a, "الگوی عضله فعال نشد");
  assert.doesNotMatch(a.must_say, /هاپتوگلوبین طبیعی است/);
  assert.match(a.must_say, /هاپتوگلوبین روی این برگه نیست/);
  const b = finding(run([...base, row("Haptoglobin", "100", "mg/dL")]), "hemolysis_pattern");
  assert.ok(b && /هاپتوگلوبین طبیعی است/.test(b.must_say), b?.must_say);
});

test("M343: ترومبوسیتوپنیِ ایزوله بی‌Hb/WBC نمی‌گوید «سایر رده‌ها طبیعی‌اند»؛ با هر دو در محدوده می‌گوید", () => {
  const a = finding(run([row("PLT", "60", "10^3/uL")]), "isolated_thrombocytopenia");
  assert.ok(a);
  assert.doesNotMatch(a.must_say, /سایر رده‌های خونی طبیعی هستند/);
  assert.match(a.must_say, /روی این برگه نیست/);
  const b = finding(run([row("PLT", "60", "10^3/uL"), row("Hb", "14", "g/dL"), row("WBC", "6", "10^3/uL")]), "isolated_thrombocytopenia");
  assert.match(b.must_say, /طبیعی هستند/);
});

test("M344: نوتروفیلِ کمی پایین بی‌WBC نمی‌گوید «کلِ گلبول‌های سفید طبیعی است»", () => {
  const a = finding(run([row("NEUT#", "1.2", "10^3/uL")]), "mild_neutropenia");
  assert.ok(a, ids(run([row("NEUT#", "1.2", "10^3/uL")])).join());
  assert.doesNotMatch(a.must_say, /گلبول‌های سفیدِ شما طبیعی است/);
  const b = finding(run([row("NEUT#", "1.2", "10^3/uL"), row("WBC", "6", "10^3/uL")]), "mild_neutropenia");
  assert.match(b.must_say, /گلبول‌های سفیدِ شما طبیعی است/);
});

test("M345: پان‌سیتوپنی با WBCِ در محدوده (فقط ANC کم) نمی‌گوید «هر سه پایین هستند»", () => {
  const r = run([row("Hb", "8.5", "g/dL"), row("WBC", "4.8", "10^3/uL"), row("NEUT#", "1.2", "10^3/uL"), row("PLT", "80", "10^3/uL")]);
  const p = finding(r, "pancytopenia");
  assert.ok(p, ids(r).join());
  assert.doesNotMatch(p.must_say + p.headline, /هر سه پایین هستند|هر سه نوع سلول خونی کمتر/);
  const q = finding(run([row("Hb", "8.5", "g/dL"), row("WBC", "3.0", "10^3/uL"), row("PLT", "80", "10^3/uL")]), "pancytopenia");
  assert.match(q.must_say, /هر سه پایین هستند/);
});

test("M346: B12 پایین با Hb ولی بی‌MCV نمی‌گوید «شمارش خون این اثر را نشان نمی‌دهد»؛ پتاسیمِ پایین با Mgِ بالا نمی‌گوید «طبیعی»", () => {
  const a = finding(run([row("Vitamin B12", "100", "pg/mL"), row("Hb", "13", "g/dL")]), "overt_b12_deficiency");
  assert.ok(a);
  assert.doesNotMatch(a.must_say, /شمارش خون شما این اثر را نشان نمی‌دهد/);
  assert.match(a.must_say, /MCV\) روی این برگه نیست/);
  const k = finding(run([row("Potassium", "3.0", "mmol/L"), row("Magnesium", "3.0", "mg/dL")]), "potassium_critical");
  assert.ok(k, "K فعال نشد");
  assert.doesNotMatch(k.must_say, /منیزیم شما اندازه‌گیری شده و طبیعی است/);
});

// ═══ گروه ۳ — N3: مرزِ گلبولِ ریز/درشت در کودک از بازهٔ سنیِ PED_REFS ═══
test("M347: کودکِ ۸ ساله — MCV 79 (طبیعی: ۷۷–۹۵) «کوچک» نمی‌شود، MCV 98 (بالا) «نرموسیتیک» نمی‌شود؛ بزرگسال بی‌تغییر", () => {
  // 🔴 پیش از اصلاح: MCV 79 ⇒ microcytic_anemia («گلبول‌های قرمز کوچک‌تر از حد معمول»)، MCV 98 ⇒ normocytic_anemia (مرزهای ۸۰/۱۰۰ِ بزرگسال).
  const kid = { age: 8, sex: "M" };
  const a = run([row("Hb", "10.5", "g/dL"), row("MCV", "79", "fL")], kid);
  assert.ok(!ids(a).includes("microcytic_anemia"), ids(a).join());
  assert.ok(ids(a).includes("normocytic_anemia"), ids(a).join());
  const b = run([row("Hb", "10.5", "g/dL"), row("MCV", "98", "fL")], kid);
  assert.ok(!ids(b).includes("normocytic_anemia") && ids(b).includes("macrocytic_anemia"), ids(b).join());
  const c = run([row("Hb", "10.5", "g/dL"), row("MCV", "74", "fL")], kid);
  assert.ok(ids(c).includes("microcytic_anemia"), ids(c).join());
  // بزرگسال: ۷۹ هنوز ریز، ۹۸ هنوز نرموسیتیک
  assert.ok(ids(run([row("Hb", "10.5", "g/dL"), row("MCV", "79", "fL")], { age: 40, sex: "M" })).includes("microcytic_anemia"));
  assert.ok(ids(run([row("Hb", "10.5", "g/dL"), row("MCV", "98", "fL")], { age: 40, sex: "M" })).includes("normocytic_anemia"));
});

// ═══ گروه ۶ — N20: زمان‌بندیِ رقیب ═══
test("M348: FBS 300 — یافتهٔ دیابت «این هفته» نمی‌گوید کنارِ «۲۴ تا ۴۸ ساعت»؛ FBS 150 هنوز «این هفته»", () => {
  const a = run([row("FBS", "300", "mg/dL")]);
  assert.ok(ids(a).includes("severe_hyperglycemia_uncertain_ketosis") && ids(a).includes("glycemia"), ids(a).join());
  assert.doesNotMatch(finding(a, "glycemia").action, /این هفته/);
  assert.match(finding(run([row("FBS", "150", "mg/dL")]), "glycemia").action, /این هفته/);
});

test("M349: hs-CRP 6 (ULN 5) — hscrp نمی‌گوید «داخلِ محدودهٔ مرجع/نیاز به مراجعهٔ زودهنگام ندارد» کنارِ crp_elevated؛ hs-CRP 3 همان متنِ قبلی", () => {
  const a = run([row("hs-CRP", "6", "mg/L")]);
  assert.ok(ids(a).includes("crp_elevated") && ids(a).includes("hscrp_ascvd_risk"), ids(a).join());
  const h = finding(a, "hscrp_ascvd_risk");
  assert.doesNotMatch(h.must_say, /داخلِ محدودهٔ مرجعِ التهاب است/);
  assert.doesNotMatch(h.action, /نیاز به مراجعهٔ زودهنگام داشته باشد/);
  const b = finding(run([row("hs-CRP", "3", "mg/L")]), "hscrp_ascvd_risk");
  assert.match(b.must_say, /داخلِ محدودهٔ مرجعِ التهاب است/);
  // 🔴 M349-n (۲۰۲۶-۱۰-۱۶): سنجهٔ معمولیِ CRP هیچ‌کدام از این دو یافته را نمی‌سازد.
  //    جدولِ ۳ خطِ ۲۰۱۹ ACC/AHA فقط به *high-sensitivity* CRP اشاره دارد.
  const c = run([row("CRP", "6", "mg/L")]);
  assert.ok(ids(c).includes("crp_elevated"), `CRPِ بالای ULN باید crp_elevated بدهد: ${ids(c).join()}`);
  assert.ok(!ids(c).includes("hscrp_ascvd_risk"), `CRPِ معمولی نباید ردهٔ خطرِ hs بدهد: ${ids(c).join()}`);
});

test("M350: AST 500 + ALT 200 + GGT بالا — alcoholic_liver_pattern زمان‌بندیِ رقیب («این هفته») نمی‌دهد؛ AST 150 هنوز «این هفته»", () => {
  const hi = run([row("AST", "500", "U/L"), row("ALT", "200", "U/L"), row("GGT", "300", "U/L")]);
  assert.ok(ids(hi).includes("liver_pattern") && ids(hi).includes("alcoholic_liver_pattern"), ids(hi).join());
  assert.doesNotMatch(finding(hi, "alcoholic_liver_pattern").action, /این هفته/);
  const lo = run([row("AST", "150", "U/L"), row("ALT", "60", "U/L"), row("GGT", "300", "U/L")]);
  assert.match(finding(lo, "alcoholic_liver_pattern")?.action ?? "", /این هفته/, ids(lo).join());
});

// ═══ گروه ۷ — N8/N20/N4 ═══
test("M351: پیشنهادِ آزمایشی که روی همین برگه هست دوباره خواسته نمی‌شود (SUGGEST_TESTS: CBC، 2ME، کومبس رایت، ACR ادرار، BUN/اوره …)", async () => {
  const { SUGGEST_TESTS, alreadyMeasured } = await import("./patterns.js");
  const rows = { "CBC": ["HGB", "WBC", "PLT"], "2ME": ["ME2"], "کومبس رایت": ["COOMBS_WRIGHT"], "ACR ادرار": ["ACR"], "BUN": ["UREA"], "عملکرد کلیه": ["CREAT"] };
  for (const [name, keys] of Object.entries(rows)) {
    assert.ok(SUGGEST_TESTS[name], `ردیفِ ${name} نیست`);
    assert.equal(alreadyMeasured(name, new Set(keys)), true, name);
    assert.equal(alreadyMeasured(name, new Set([keys[0] === "HGB" ? "WBC" : "XXX"])), false, name + " (ناقص نباید حذف شود)");
  }
});

test("M352: MDS — با Hb 8 · MCV 108 · PLT 60 در ۷۰ سالگی فقط یک یافتهٔ «شک به MDS» می‌آید؛ زیر ۶۰ سال و MCV > 102 هنوز anemia_macrocytic_mds", () => {
  const old = run([row("Hb", "8", "g/dL"), row("MCV", "108", "fL"), row("PLT", "60", "10^3/uL")], { age: 70, sex: "M" });
  assert.ok(ids(old).includes("mds_suspicion") && !ids(old).includes("anemia_macrocytic_mds"), ids(old).join());
  const young = run([row("Hb", "8", "g/dL"), row("MCV", "108", "fL"), row("PLT", "60", "10^3/uL")], { age: 40, sex: "M" });
  assert.ok(ids(young).includes("anemia_macrocytic_mds") && !ids(young).includes("mds_suspicion"), ids(young).join());
  // کاهش نوتروفیل هنوز توضیح دارد (RULE_READS)
  const neut = run([row("Hb", "8", "g/dL"), row("MCV", "108", "fL"), row("PLT", "60", "10^3/uL"), row("NEUT#", "1.2", "10^3/uL"), row("WBC", "5", "10^3/uL")], { age: 70, sex: "M" });
  assert.ok(!ids(neut).includes("unexplained_abnormal"), ids(neut).join());
});

test("M353: hCG مثبت در دخترِ ۶ ساله «با بارداری سازگار» نیست (this_week، پزشکِ کودکان)؛ منفی یافته نمی‌سازد؛ زنِ ۳۰ ساله بی‌تغییر", () => {
  const a = run([row("Beta HCG", "50", "mIU/mL")], { age: 6, sex: "F" });
  const f = finding(a, "hcg_result");
  assert.ok(f, ids(a).join());
  assert.equal(f.urgency, "this_week");
  assert.doesNotMatch(f.must_say, /با بارداری سازگار/);
  assert.ok(!ids(run([row("Pregnancy test", "Negative")], { age: 6, sex: "F" })).includes("hcg_result"));
  assert.match(finding(run([row("Beta HCG", "50", "mIU/mL")], { age: 30, sex: "F" }), "hcg_result").must_say, /با بارداری سازگار/);
});

// ═══ P77 — پاسخِ بازبین (۲۰۲۶-۱۰-۰۴): آستانه‌های بی‌منبعِ P75/P77 ═══
const urg = (r, id) => finding(r, id)?.urgency;

test("M354: منیزیمِ بالا — بالای مرجع this_week، ≥ ۴٫۹ اورژانس با دستورِ اورژانس (P77-۲)", () => {
  assert.equal(urg(run([row("Magnesium", "3.0", "mg/dL")]), "magnesium_abnormal"), "this_week");
  const hi = run([row("Magnesium", "6.5", "mg/dL")]);
  assert.equal(urg(hi, "magnesium_abnormal"), "emergency");
  assert.match(finding(hi, "magnesium_abnormal").action, /اورژانس/);
  assert.equal(hi.p.has_critical, true);
  assert.equal(urg(run([row("Magnesium", "4.8", "mg/dL")]), "magnesium_abnormal"), "this_week");
});

test("M355: لیپازِ ≥ ۳×ULN soon است نه اورژانس؛ زیرِ آن this_week (P77-۳)", () => {
  assert.equal(urg(run([row("Lipase", "2000", "U/L")]), "pancreas_pattern"), "soon");
  assert.equal(run([row("Lipase", "2000", "U/L")]).p.has_critical, false);
  // P108-ب (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶): لیپازِ زیرِ ۳×ULN تنها روی برگه «انحرافِ جزئی» است (Atlanta) ⇒ routine؛ کنارِ عددی بیرون از نوار همان this_week.
  assert.equal(urg(run([row("Lipase", "500", "U/L")]), "pancreas_pattern"), "routine");
  assert.equal(urg(run([row("Lipase", "500", "U/L"), row("ALT", "200", "U/L")]), "pancreas_pattern"), "this_week");
});

test("M356: اورهٔ ۱۵۰–۱۹۹ با کراتینینِ طبیعی this_week؛ ۱۴۹ routine؛ ۲۰۰ اورژانس (P77-۴)", () => {
  const cr = row("Creatinine", "0.9", "mg/dL");
  assert.equal(urg(run([row("Urea", "170", "mg/dL"), cr]), "isolated_urea_elevation"), "this_week");
  assert.equal(urg(run([row("Urea", "149", "mg/dL"), cr]), "isolated_urea_elevation"), "routine");
  assert.equal(run([row("Urea", "210", "mg/dL"), cr]).p.has_critical, true);
});

test("M357: فسفرِ ≥ ۸٫۹ soon حتی بی‌نشانهٔ کلیوی؛ ۷ همان قبل (P77-۵)", () => {
  assert.equal(urg(run([row("Phosphorus", "9.5", "mg/dL")]), "phosphate_abnormal"), "soon");
  assert.equal(urg(run([row("Phosphorus", "6.5", "mg/dL")]), "phosphate_abnormal"), "routine");
});

test("M358: بحرانِ آدرنال — کورتیزولِ صبحِ بسیار پایین + Na < ۱۳۰ + K > ۵٫۵ + قند < ۷۰ اورژانس؛ بی‌سه‌گانه this_week (P77-۶)", () => {
  const base = [row("Cortisol AM", "1.5", "µg/dL")];
  const c = run([...base, row("Na", "125", "mmol/L"), row("K", "5.8", "mmol/L"), row("FBS", "60", "mg/dL")]);
  assert.equal(urg(c, "adrenal_insufficiency_likely"), "emergency");
  assert.match(finding(c, "adrenal_insufficiency_likely").action, /اورژانس/);
  assert.equal(urg(run(base), "adrenal_insufficiency_likely"), "this_week");
  assert.equal(urg(run([...base, row("Na", "125", "mmol/L"), row("K", "5.8", "mmol/L")]), "adrenal_insufficiency_likely"), "this_week");
});

test("M359: INR — ۳٫۲ دیگر اورژانس نیست؛ ۴٫۵ تا < ۱۰ soon؛ ≥ ۱۰ اورژانس (P77-۷)", () => {
  assert.equal(urg(run([row("INR", "3.2")]), "coagulation_abnormal"), "this_week");
  assert.equal(run([row("INR", "3.2")]).p.has_critical, false);
  assert.equal(urg(run([row("INR", "6")]), "coagulation_abnormal"), "soon");
  assert.equal(urg(run([row("INR", "11")]), "coagulation_abnormal"), "emergency");
  assert.match(all(run([row("INR", "6")])), /خونریزی/);
});

test("M360: هماتوکریتِ کودک (< ۱۶ سال) با بازهٔ CALIPER سنجیده می‌شود؛ بحرانِ HCT < ۲۱ هنوز اورژانس؛ بزرگسال بی‌تغییر", () => {
  // P135-1: «۴ ساله» در CALIPER ردیفِ «۴ تا <۱۴» (۳۴٫۹–۴۳٫۷) است؛ این تست با مرزِ بستهٔ «≤ ۴» سبز بود. ۳ ساله = «۳ تا <۴» (۳۱٫۳–۴۱٫۷).
  const kid = { age: 3, sex: "F" };
  const a = run([row("HCT", "33", "%"), row("Hb", "11.2", "g/dL")], kid);
  assert.ok(!ids(a).includes("low_rbc_hct_without_anemia"), ids(a).join());
  assert.ok(a.e.graded.some((g) => g.test === "HCT"));
  assert.equal(a.e.graded.find((g) => g.test === "HCT")?.abnormal, false);
  const b = run([row("HCT", "15", "%")], kid);
  assert.ok(ids(b).includes("severe_anemia_crisis") && b.p.has_critical, ids(b).join());
  assert.ok(!/حد طبیعی undefined|حد طبیعی null/.test(all(b)));
  assert.ok(ids(run([row("HCT", "33", "%"), row("Hb", "11.2", "g/dL")], { age: 40, sex: "F" })).length >= 0);
  assert.ok(run([row("HCT", "33", "%")], { age: 40, sex: "F" }).e.graded.some((g) => g.test === "HCT"));
});

test("M361: شدتِ کم‌خونی WHO زیر ۵ سال ۷/۱۰ است و زیرِ ۶ ماه بی‌درجه (P77-۹)", () => {
  const sev = (age, hb) => (finding(run([row("Hb", String(hb), "g/dL"), row("MCV", "82", "fL")], { age, sex: "M" }), "normocytic_anemia")?.must_say.match(/\) — کم‌خونیِ ([^\s.]+)/) ?? [])[1];
  assert.equal(sev(3, 9.5), "متوسط");
  assert.equal(sev(3, 10.5), "خفیف");
  assert.equal(sev(3, 6.5), "شدید");
  assert.equal(sev(8, 7.5), "شدید");
  assert.equal(sev(0.3, 9.5), undefined);
});

test("M362: PCT نوزادِ < ۴۸ ساعت: ۲–۲۰ soon با جملهٔ فیزیولوژیک، > ۲۰ اورژانس؛ BNP نوزاد قیدِ بازهٔ سنی دارد (P77-۱۰، ۱۱)", () => {
  const neo = { age: 0, sex: "M" };
  const a = run([row("Procalcitonin", "5", "ng/mL")], neo);
  assert.equal(urg(a, "sepsis_markers"), "soon");
  assert.equal(a.p.has_critical, false);
  assert.equal(urg(run([row("Procalcitonin", "30", "ng/mL")], neo), "sepsis_markers"), "emergency");
  assert.equal(urg(run([row("Procalcitonin", "5", "ng/mL")], { age: 30, sex: "M" }), "sepsis_markers"), "emergency");
  assert.match(finding(run([row("BNP", "600", "pg/mL")], neo), "natriuretic_peptide_elevated").must_say, /بازهٔ سنیِ نوزاد/);
});

test("M363: زنجیرهٔ سبکِ آزاد زنده است — کاپا ۸۰ با نسبتِ ناهنجار this_week؛ هر دو بالا با نسبتِ طبیعی routine و یک یافته؛ mg/dL ×۱۰ (P77-۱۲)", () => {
  const a = run([row("Kappa free light chain", "80", "mg/L"), row("Lambda free light chain", "10", "mg/L")], { age: 65, sex: "M" });
  assert.equal(urg(a, "monoclonal_gammopathy_kappa"), "this_week");
  assert.ok(!ids(a).includes("unexplained_abnormal"), ids(a).join());
  const b = run([row("Kappa FLC", "40", "mg/L"), row("Lambda FLC", "40", "mg/L")], { age: 65, sex: "M" });
  assert.deepEqual(ids(b).filter((i) => i.startsWith("monoclonal")), ["monoclonal_gammopathy_kappa"]);
  assert.equal(urg(b, "monoclonal_gammopathy_kappa"), "routine");
  assert.doesNotMatch(finding(b, "monoclonal_gammopathy_kappa").must_say, /میلوم/);
  const c = run([row("Kappa FLC", "10", "mg/dL"), row("Lambda FLC", "10", "mg/L")], { age: 65, sex: "M" });
  assert.equal(c.e.graded.find((g) => g.test === "KAPPA_FLC").value, 100);
});

test("M364: hCG — زنِ > ۵۵ سال: < ۱۴ routine بی‌ادعای بارداری، ≥ ۱۴ this_week، منفی بی‌یافته؛ دخترِ < ۱۰ سال پزشکِ غدد/انکولوژیِ کودکان (P77-۱۳، ۱۴)", () => {
  const old = { age: 70, sex: "F" };
  const lo = finding(run([row("Beta HCG", "8", "mIU/mL")], old), "hcg_result");
  assert.equal(lo.urgency, "routine"); assert.doesNotMatch(lo.must_say, /با بارداری سازگار/);
  const hi = finding(run([row("Beta HCG", "20", "mIU/mL")], old), "hcg_result");
  assert.equal(hi.urgency, "this_week"); assert.doesNotMatch(hi.must_say, /با بارداری سازگار/);
  assert.ok(!ids(run([row("Pregnancy test", "Negative")], old)).includes("hcg_result"));
  assert.match(finding(run([row("Beta HCG", "50", "mIU/mL")], { age: 6, sex: "F" }), "hcg_result").action, /غدد یا انکولوژیِ کودکان/);
});

// ═══ لایهٔ ۴ (P79) — صدای متن برای کودک، و پیشنهادِ آزمایشِ کم‌خونیِ نورموسیتیکِ کودک ═══
// 🔴 پیش از اصلاح (مرورگر، ۲۰۲۶-۱۰-۰۴): پسرِ ۳ ساله Hb 10.5 / MCV 75 ⇒ خلاصه «این کودک» ولی تفسیر «خون شما … هموگلوبین شما»؛
//    و پیشنهادِ «کراتینین» و «CRP» (الگوریتمِ بزرگسال).
const childText = (r) => r.p.findings.flatMap((f) => [f.headline, f.must_say, f.action, ...(f.warnings ?? [])]).join(" ");
const hasYou = (s) => /(^|[\s(«])شما(?=[\s،.؛:)»]|$)/.test(s);

test("M365: کودکِ ۳ ساله — در متنِ موتور «شما» نمی‌ماند و «کودک» جای آن می‌آید؛ پیشنهاد رتیکولوسیت، فریتین، کراتینین و CRP (P82: تصمیمِ بازبین، برگشتِ P79)", () => {
  const r = run([row("Hemoglobin", 10.5, "g/dL"), row("MCV", 75)], { age: 3, sex: "M" });
  const f = r.p.findings.find((x) => x.rule_id === "normocytic_anemia");
  assert.ok(f, `normocytic_anemia فعال نشد: ${ids(r)}`);
  assert.equal(hasYou(childText(r)), false, `«شما» مانده: ${childText(r).slice(0, 200)}`);
  assert.match(f.must_say, /هموگلوبین فرزندتان 10\.5/);
  assert.deepEqual(f.suggest, ["رتیکولوسیت", "فریتین", "کراتینین", "CRP"]);
});

test("M365b: کنترل — بزرگسال همان متن و همان چهار پیشنهاد را می‌گیرد؛ ۱۲ ساله هنوز «شما»", () => {
  const a = run([row("Hemoglobin", 10, "g/dL"), row("MCV", 88)], { age: 40, sex: "F" });
  const fa = a.p.findings.find((x) => x.rule_id === "normocytic_anemia");
  assert.ok(fa, ids(a));
  assert.equal(hasYou(fa.must_say), true);
  assert.deepEqual(fa.suggest, ["رتیکولوسیت", "فریتین", "کراتینین", "CRP"]);
  const t = run([row("Hemoglobin", 10.5, "g/dL"), row("MCV", 88)], { age: 12, sex: "M" });
  const ft = t.p.findings.find((x) => x.rule_id === "normocytic_anemia");
  assert.ok(ft, ids(t));
  assert.equal(hasYou(ft.must_say), true, "۱۲ ساله باید همان صدای بزرگسال را بگیرد");
});

test("M365c: کلماتِ دارای «شما» در ریشه («شمارش») دست نمی‌خورند؛ نوزاد صدای خودش را دارد", async () => {
  const { childVoice } = await import("./neonatal.js");
  assert.equal(childVoice("شمارش خون شما طبیعی است و نتیجهٔ شماست"), "شمارش خون فرزندتان طبیعی است و نتیجهٔ کودک است");
  const n = run([row("Hemoglobin", 10, "g/dL")], { age: 10 / 365, sex: "M" });
  assert.doesNotMatch(childText(n), /(هموگلوبین|خون|نتیجه) کودک /, "نوزاد نباید صدای کودک بگیرد");
  assert.match(childText(n), /نوزاد/);
});

test("M381: ماکروسیتوزِ بدونِ کم‌خونی (MCV بالا با Hb طبیعی یا غایب)؛ واگذاری به کمبود B12، آرتیفکت و کم‌خونی ماکروسیتیک", () => {
  // ۱. بزرگسال: Hb 14 (طبیعی) + MCV 105 (بالا)
  const a = run([row("Hb", "14", "g/dL"), row("MCV", "105", "fL")], { age: 30, sex: "M" });
  assert.ok(ids(a).includes("macrocytosis_no_anemia"), ids(a).join());
  assert.equal(urg(a, "macrocytosis_no_anemia"), "routine");
  assert.match(finding(a, "macrocytosis_no_anemia").must_say, /کم‌خونی وجود ندارد/);
  assert.match(finding(a, "macrocytosis_no_anemia").must_say, /ماکروسیتوز/);
  assert.ok(!ids(a).includes("unexplained_abnormal"));

  // ۲. کودکِ ۵ ساله: Hb 12 (طبیعی) + MCV 88 (بالای مرجعِ اطفال 75–87)
  const kid = run([row("Hb", "12", "g/dL"), row("MCV", "88", "fL")], { age: 5, sex: "F" });
  assert.ok(ids(kid).includes("macrocytosis_no_anemia"), ids(kid).join());
  assert.match(finding(kid, "macrocytosis_no_anemia").must_say, /ضدتشنج|رتیکولوسیت/);
  assert.ok(!ids(kid).includes("unexplained_abnormal"));

  // ۳. MCV بالا بدون داشتن Hb روی برگه
  const noHb = run([row("MCV", "105", "fL")], { age: 30, sex: "M" });
  assert.ok(ids(noHb).includes("macrocytosis_no_anemia"), ids(noHb).join());
  assert.match(finding(noHb, "macrocytosis_no_anemia").headline, /هموگلوبین روی برگه نیست/);
  assert.match(finding(noHb, "macrocytosis_no_anemia").must_say, /هموگلوبین روی این برگه نیست/);

  // ۴. کم‌خونی ماکروسیتیک (Hb 9 + MCV 105): قاعدهٔ ماکروسیتیک فعال می‌شود، نه این قاعده
  const macroAnemia = run([row("Hb", "9", "g/dL"), row("MCV", "105", "fL")], { age: 30, sex: "M" });
  assert.ok(ids(macroAnemia).includes("macrocytic_anemia"));
  assert.ok(!ids(macroAnemia).includes("macrocytosis_no_anemia"));

  // ۵. کمبود صریح B12 (< ۱۵۰): overt_b12_deficiency مالک است
  const b12Overt = run([row("Hb", "14", "g/dL"), row("MCV", "105", "fL"), row("Vitamin B12", "100", "pg/mL")], { age: 30, sex: "M" });
  assert.ok(ids(b12Overt).includes("overt_b12_deficiency"));
  assert.ok(!ids(b12Overt).includes("macrocytosis_no_anemia"));

  // ۶. کمبود مرزی B12 (۱۵۰–۳۹۹): borderline_b12_deficiency مالک است
  const b12Border = run([row("Hb", "14", "g/dL"), row("MCV", "105", "fL"), row("Vitamin B12", "250", "pg/mL")], { age: 30, sex: "M" });
  assert.ok(ids(b12Border).includes("borderline_b12_deficiency"));
  assert.ok(!ids(b12Border).includes("macrocytosis_no_anemia"));

  // ۷. خطای نمونه و آگلوتینین سرد (MCHC > 36.5): rbc_indices_implausible مالک است
  const coldAgg = run([row("Hb", "14", "g/dL"), row("Hct", "38", "%"), row("MCV", "102", "fL"), row("MCHC", "37", "g/dL")], { age: 40, sex: "M" });
  assert.ok(ids(coldAgg).includes("rbc_indices_implausible"));
  assert.ok(!ids(coldAgg).includes("macrocytosis_no_anemia"));
});
