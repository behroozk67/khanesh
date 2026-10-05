// ============================================================
// review1005.test.js — بازبینیِ متامورفیکِ ۲۰۲۶-۱۰-۰۵ (P84). فایلِ جدا تا با engine.test.js تداخل نکند.
// روش: رابطه‌هایی که همیشه باید برقرار باشند (دورتر از بازه ⇒ فوریتِ کمتر نه؛ افزودنِ آزمایش ⇒ فوریتِ کمتر نه؛
// واحدِ چاپ‌شده ⇒ همان معنا). 🔴 هر تست روی HEAD (9a43d1a) قرمز است (git archive + junction اندازه‌گیری شد).
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const row = (name, value, unit) => ({ name, value, ...(unit ? { unit } : {}) });
const M45 = { sex: "M", age: 45 };
const run = (tests, patient = M45) => {
  const e = runEngine({ patient, tests });
  return { e, p: runPatterns(e) };
};
const g = (e, k) => e.graded.find((x) => x.test === k);
const RANK = { none: 0, routine: 1, this_week: 2, soon: 3, emergency: 4 };
const text = (p) => p.findings.map((f) => `${f.headline} ${f.must_say}`).join(" ");

test("R1: واحدِ خامِ «/µL» روی شمارش‌ها دنبال می‌شود — جهت وارونه نمی‌شود (N3/N12)", () => {
  // 🔴 «NEUT# 90 /µL» ⇒ ۹۰۰۰۰ و «کمی بالا، نوبتِ عادی»؛ «WBC 800 /µL» ⇒ ۸۰۰ K و «بسیار بالا، اورژانس».
  const n = run([row("NEUT#", "90", "/µL")]);
  assert.equal(g(n.e, "NEUT_ABS")?.value, 90);
  assert.equal(g(n.e, "NEUT_ABS").dir, "low");
  assert.ok(n.p.findings.some((f) => f.rule_id === "severe_neutropenia"), n.p.findings.map((f) => f.rule_id).join());
  const w = run([row("WBC", "800", "cells/µL")]);
  assert.equal(g(w.e, "WBC")?.value, 0.8);
  assert.equal(g(w.e, "WBC").dir, "low");
  assert.ok(!w.p.findings.some((f) => f.rule_id === "extreme_leukocytosis"));
  const l = run([row("Lymph#", "50", "/µL")]);
  assert.equal(g(l.e, "LYMPH_ABS")?.dir, "low");
  // گاردِ مخالف: ضریب‌دارها و اعشاری‌ها همان رفتارِ قبلی (برگهٔ واقعی job 40b8a901: «x1000/mm³»)
  assert.equal(g(run([row("Platelet", "53", "x1000/mm³")]).e, "PLT")?.value, 53);
  assert.equal(g(run([row("NEUT#", "3.66", "10^3/uL")]).e, "NEUT_ABS")?.value, 3660);
  assert.equal(g(run([row("NEUT#", "3.66", "/µL")]).e, "NEUT_ABS")?.value, 3660);
  assert.equal(g(run([row("WBC", "7500", "/cumm")]).e, "WBC")?.value, 7.5);
  // بازبینیِ کد (P84، H1/H2): زیرِ کف با واحدِ خام = OCR ۱۰³ را انداخته ⇒ همان خوانشِ K؛ «10E3» ضریب است. اورژانسِ پلاکت گم نمی‌شود.
  assert.equal(g(run([row("WBC", "7", "/mm3")]).e, "WBC")?.value, 7);
  for (const [n, v, u] of [["PLT", "15", "x10E3/uL"], ["Platelet", "15", "/µL"]]) {
    const r = run([row(n, v, u)]);
    assert.equal(g(r.e, "PLT")?.value, 15, `${n} ${v} ${u}`);
    assert.equal(r.p.overall_urgency, "emergency", `${n} ${v} ${u}`);
  }
  assert.equal(g(run([row("PLT", "180", "/cmm")]).e, "PLT")?.value, 180);
  assert.equal(g(run([row("NEUT#", "4", "x10E3/uL")]).e, "NEUT_ABS")?.value, 4000);
});

test("R2: FT3/T3ِ غیرطبیعی زیرِ شاخهٔ TPO یا «TSH بالا» گم نمی‌شود و فوریتش پایین نمی‌آید (N18/N12/N29)", () => {
  // 🔴 «FT3 17.6 + TPO 36» ⇒ routine با «اگر بقیهٔ هورمون‌ها طبیعی باشند» و بی‌عدد.
  const a = run([row("FT3", "17.6", "pg/mL"), row("Anti-TPO", "36", "IU/mL")]);
  assert.equal(a.p.overall_urgency, "this_week");
  assert.match(text(a.p), /17\.6/);
  assert.doesNotMatch(text(a.p), /اگر بقیه‌ی هورمون‌ها طبیعی باشند/);
  // 🔴 «TSH 5.85 + FT3 17.6» ⇒ «کندتر از حد معمول» بی‌FT3.
  const b = run([row("TSH", "5.85", "mIU/L"), row("FT3", "17.6", "pg/mL")]);
  assert.doesNotMatch(text(b.p), /کندتر از حد معمول/);
  assert.match(text(b.p), /FT3 17\.6/);
  assert.equal(b.p.overall_urgency, "this_week");
  // 🔴 «TSH 5.85 + T3 24» ⇒ routine و T3 هیچ‌جا.
  const c = run([row("TSH", "5.85", "mIU/L"), row("T3", "24", "ng/dL")]);
  assert.equal(c.p.overall_urgency, "this_week");
  assert.match(text(c.p), /T3 24/);
  // 🔴 «TSH 0.15 + FT3 0.84» ⇒ routine بی‌عدد.
  const d = run([row("TSH", "0.15", "mIU/L"), row("FT3", "0.84", "pg/mL")]);
  assert.equal(d.p.overall_urgency, "this_week");
  assert.match(text(d.p), /FT3 0\.84/);
  // 🔴 «TSH 0.15 + T3 24» (T3 تام) ⇒ «غده تیروئید شما پرکارتر از حد معمول است» (جهتِ وارونه).
  const t = run([row("TSH", "0.15", "mIU/L"), row("T3", "24", "ng/dL")]);
  assert.doesNotMatch(text(t.p), /پرکارتر/);
  assert.match(text(t.p), /T3 24/);
  assert.equal(t.p.overall_urgency, "this_week");
  // بازبینیِ کد (P84، M4): T3ِ *تام*ِ بالا + TSHِ کمی بالا + FT4ِ طبیعی «تومورِ هیپوفیز» نمی‌گیرد، ولی T3 نام برده می‌شود.
  const tot = run([row("TSH", "5.5", "mIU/L"), row("T3", "210", "ng/dL"), row("Free T4", "1.2", "ng/dL")]);
  assert.doesNotMatch(text(tot.p), /هیپوفیز/);
  assert.match(text(tot.p), /T3 210/);
  // L5: TSHِ < ۰٫۱ بی‌FT4 ارجاعِ غدد را نگه می‌دارد
  assert.ok(run([row("TSH", "0.02", "mIU/L"), row("T3", "50", "ng/dL")]).p.findings.find((f) => f.rule_id === "thyroid").suggest.includes("بررسی توسط متخصص غدد"));
  // گاردِ مخالف: TPOِ تنها همان شاخهٔ قبلی است
  assert.ok(run([row("Anti-TPO", "300", "IU/mL")]).p.findings.some((f) => /TPO/.test(f.headline)));
});

test("R3: آلبومینِ خیلی پایین کنارِ پروتئینِ تام فوریتِ خودش را نگه می‌دارد و هشدارِ تورم گم نمی‌شود (N29/N20)", () => {
  // 🔴 «ALB 1.05» تنها this_week؛ با «TP 4.5» ⇒ routine و بی‌هشدار.
  const { p } = run([row("ALB", "1.05", "g/dL"), row("Total Protein", "4.5", "g/dL")]);
  assert.equal(p.overall_urgency, "this_week");
  const f = p.findings.find((x) => x.rule_id === "total_protein_abnormal");
  assert.ok(f.warnings.some((w) => /تورمِ پا/.test(w)));
  // گاردِ مخالف: آلبومینِ طبیعی ⇒ همان routine
  assert.equal(run([row("ALB", "4.2", "g/dL"), row("Total Protein", "9.5", "g/dL")]).p.overall_urgency, "routine");
});

test("R4: «ALT طبیعی مانده» فقط وقتی ALT سنجیده و طبیعی است (N4)", () => {
  // 🔴 «AST 160 + CK 680» بی‌ALT ⇒ «ALT طبیعی مانده».
  const { p } = run([row("AST", "160", "U/L"), row("CK", "680", "U/L")]);
  assert.doesNotMatch(text(p), /ALT طبیعی مانده/);
  assert.match(text(p), /ALT روی این برگه اندازه‌گیری نشده است/);
  // 🔴 بی‌ALT، «از عضله است» ثابت نیست: فوریتِ ASTِ تنها (this_week) کف است — پیش‌تر routine.
  assert.equal(run([row("AST", "52", "U/L"), row("CK", "221", "U/L")]).p.overall_urgency, "this_week");
  assert.match(text(run([row("AST", "160", "U/L"), row("CK", "680", "U/L"), row("ALT", "30", "U/L")]).p), /ALT طبیعی مانده/);
});

test("R5: BUN و اوره یک فوریت دارند و با هر دو روی برگه هیچ‌کدام گم نمی‌شود؛ جملهٔ «کراتینینِ طبیعی» بی‌کراتینین نمی‌آید", () => {
  // 🔴 «BUN 80» ⇒ routine (اورهٔ ۱۸۰ ⇒ this_week)؛ «BUN 80 + Urea 180» ⇒ routine و ۱۸۰ هیچ‌جا.
  assert.equal(run([row("BUN", "80", "mg/dL")]).p.overall_urgency, "this_week");
  const both = run([row("BUN", "80", "mg/dL"), row("Urea", "180", "mg/dL")]);
  assert.equal(both.p.overall_urgency, "this_week");
  assert.match(text(both.p), /180/);
  assert.match(text(both.p), /80/);
  assert.doesNotMatch(text(both.p), /با کراتینینِ طبیعی/);
});

test("R6: عددِ ناممکن (اعشارِ افتاده، کامای سه‌رقمی) اورژانس نمی‌سازد و «تفسیر نشد» می‌شود (N3)", () => {
  // 🔴 «K 55»، «Na 1400»، «K 2,625» (⇒ ۲۶۲۵، هیپرکالمیِ کاذب برای پتاسیمِ پایین)، «Mg 1,275» ⇒ اورژانس.
  for (const [name, v, unit] of [["K", "55", "mEq/L"], ["Na", "1400", "mEq/L"], ["K", "2,625", "mEq/L"], ["Mg", "1,275", "mg/dL"]]) {
    const { e, p } = run([row(name, v, unit)]);
    assert.ok(RANK[p.overall_urgency] < RANK.emergency, `${name} ${v} ⇒ ${p.overall_urgency}`);
    assert.ok(e.unmapped.includes(name), `${name} ${v}: ${JSON.stringify(e.unmapped)}`);
  }
  // گاردِ مخالف: بحرانیِ واقعی همچنان اورژانس
  assert.equal(run([row("K", "7.1", "mEq/L")]).p.overall_urgency, "emergency");
  assert.equal(run([row("Na", "112", "mEq/L")]).p.overall_urgency, "emergency");
  // بازبینیِ کد (P84، H3): کفِ SURVIVAL_LIMITS بحرانیِ واقعی است — این‌ها سنجیده می‌مانند.
  assert.equal(run([row("Phosphorus", "0.4", "mg/dL")]).p.overall_urgency, "emergency");
  assert.equal(run([row("Hb", "1.8", "g/dL")]).p.overall_urgency, "emergency");
  assert.ok(g(run([row("Mg", "0.45", "mg/dL")]).e, "MG")?.abnormal);
});

test("R7: هماتوکریتِ زیرِ کفِ بقا «نوبتِ عادی» نمی‌گیرد — تفسیر نشد (یکنواختی، N3)", () => {
  // 🔴 «HCT 8.2» اورژانس، «HCT 2.05» ⇒ low_rbc_hct_without_anemia و routine.
  const { e, p } = run([row("HCT", "2.05", "%")]);
  assert.ok(!p.findings.some((f) => f.rule_id === "low_rbc_hct_without_anemia"));
  assert.ok(e.unmapped.includes("HCT"));
  assert.equal(run([row("HCT", "8.2", "%")]).p.overall_urgency, "emergency");
});

test("R8: تیترِ «160.0» همان ۱/۱۶۰ است، نه ردیفِ متنیِ بی‌خواننده (N28)", () => {
  // 🔴 «Wright 160.0» ⇒ qual و هیچ یافته‌ای.
  for (const name of ["Wright", "Coombs Wright"]) {
    const { e, p } = run([row(name, "160.0")]);
    assert.ok(e.graded.some((x) => x.value === 160), `${name}: ${JSON.stringify(e.qual)}`);
    assert.notEqual(p.overall_urgency, "none");
  }
});

test("R9: 2MEِ باارزش بی‌رایت مالک دارد؛ «ANC» و «Absolute Neutrophil Count» نگاشت می‌شوند و ANCA دست نمی‌خورد (N1/N2)", () => {
  // 🔴 «2ME 1/80» تنها ⇒ فقط unmatched_abnormal؛ «ANC 0.4» ⇒ unmapped.
  const m = run([row("2ME", "1/80")]);
  const f = m.p.findings.find((x) => x.rule_id === "brucella_2me_only");
  assert.ok(f, m.p.findings.map((x) => x.rule_id).join());
  assert.equal(f.urgency, "this_week");
  assert.match(f.must_say, /رایت روی این برگه نیست/);
  // گاردِ مخالف: رایت + 2ME هر دو باارزش ⇒ همان brucella_active، نه دو یافته (N20)
  const both = run([row("Wright", "1/160"), row("2ME", "1/80")]);
  assert.deepEqual(both.p.findings.filter((x) => /brucella/.test(x.rule_id)).map((x) => x.rule_id), ["brucella_active"]);
  assert.equal(g(run([row("ANC", "0.4", "10^3/uL")]).e, "NEUT_ABS")?.value, 400);
  assert.equal(g(run([row("Absolute Neutrophil Count", "3.1", "10^3/uL")]).e, "NEUT_ABS")?.value, 3100);
  const anca = run([row("ANCA", "Positive")]);
  assert.ok(!g(anca.e, "NEUT_ABS") && anca.e.qual.ANCA === "Positive");
});

test("R10: واحدِ چسبیده به عدد در خانهٔ نتیجه همان واحدِ چاپ‌شده است؛ درصدِ بالای ۱۰۰ ناممکن است (N3)", () => {
  // 🔴 «FBS: 21 mg/dL» (ستونِ واحد خالی) ⇒ واحدِ نامعلوم و soon؛ «Troponin I: 2.4 µg/L» ⇒ this_week به‌جای اورژانس.
  const fbs = run([row("FBS", "21 mg/dL")]);
  assert.equal(g(fbs.e, "GLU_F")?.value, 21);
  assert.equal(fbs.p.overall_urgency, "emergency");
  assert.equal(run([row("Troponin I", "2.4 µg/L")]).p.overall_urgency, "emergency");
  assert.equal(g(run([row("MONO#", "60 /µL")]).e, "MONO_ABS")?.value, 60);
  // گاردِ مخالف: متنِ غیرواحد دست نمی‌خورد
  const fx = run([row("FBS", "95 fasting")]).e;
  assert.ok(!g(fx, "GLU_F") && fx.ungraded.GLU_F?.reason === "unit_unknown", JSON.stringify(fx.ungraded));
  // «HbA2 1,125» (کامای سه‌رقمی ⇒ ۱۱۲۵٪) ⇒ تفسیر نشد، نه «HbA2 بالا»
  const h = run([row("HbA2", "1,125", "%")]);
  assert.ok(!h.p.findings.some((x) => x.rule_id === "hba2_elevated"));
  assert.ok(h.e.unmapped.includes("HbA2"));
});

// ---------- قدمِ ۴ (۲۰۲۶-۱۰-۰۵): کودک/شیرخوار، ادرار، سرولوژی — هر کدام روی 1e878eb قرمز ----------
test("R11: TSHِ داخلِ بازهٔ سنیِ شیرخوار «کم‌کاری» نیست و متنِ تیروئید دربارهٔ TSHِ چاپ‌شده «اندازه‌گیری نشده» نمی‌گوید (N3/N4)", () => {
  // 🔴 طبقه‌بندِ TSH مرزِ ثابتِ ۴٫۵ داشت: شیرخوارِ ۴ ماهه TSH 6.75 (بازه ۰٫۶–۸٫۱) ⇒ abnormal بی‌جهت ⇒ «، و TSH روی این برگه اندازه‌گیری نشده است».
  const inf = { sex: "F", age: 0.35 };
  const a = run([row("TSH", "6.75", "mIU/L")], inf);
  assert.equal(g(a.e, "TSH").abnormal, false);
  assert.doesNotMatch(text(a.p), /TSH روی این برگه اندازه‌گیری نشده/);
  assert.equal(g(run([row("TSH", "9", "mIU/L")], inf).e, "TSH").dir, "high");
  // بزرگسال بی‌تغییر، جز مرزِ دقیقِ ۰٫۵ که حالا مثلِ refs.js طبیعی است
  assert.equal(g(run([row("TSH", "4.6", "mIU/L")]).e, "TSH").dir, "high");
  assert.equal(g(run([row("TSH", "0.5", "mIU/L")]).e, "TSH").abnormal, false);
});

test("R12: عددی که قاعدهٔ دیگری فقط برای زمینه نام می‌برد، فوریتِ خودش را از دست نمی‌دهد (N29 ساختاری)؛ دیالیز (P72) استثناست", () => {
  // 🔴 کودکِ ۱۰ ساله: «Hb 19.89» تنها this_week؛ کنارِ «TIBC 585» ⇒ routine (Hb در متنِ tibc_high نام برده می‌شد).
  const kid = { sex: "F", age: 10 };
  assert.equal(run([row("HGB", "19.89", "g/dL"), row("TIBC", "585", "µg/dL")], kid).p.overall_urgency, "this_week");
  assert.equal(run([row("HGB", "19.89", "g/dL"), row("HbF", "8", "%")], kid).p.overall_urgency, "this_week");
  // گاردِ مخالف: بیمارِ دیالیزی (P72، M310) — کراتینینِ بحرانی همچنان اورژانس نمی‌شود
  const dia = runPatterns(runEngine({ patient: { sex: "M", age: 60, conditions: ["dialysis"] }, tests: [row("Creatinine", "9", "mg/dL"), row("K", "5.2", "mEq/L")] }));
  assert.notEqual(dia.overall_urgency, "emergency");
});

test("R13: ادرار — «Many» بدترین مقدار است، نه بی‌صدا؛ «+/-» مرزی است نه مثبت؛ «Detected» مثبت است (N19/N30)", () => {
  const F35 = { sex: "F", age: 35 };
  // 🔴 «Urine RBC: Many» ⇒ هیچ یافته (۳۰–۴۰ ⇒ this_week)؛ «Urine WBC: Many» ⇒ هیچ.
  assert.equal(run([row("Urine RBC", "Many", "/hpf")], F35).p.overall_urgency, "this_week");
  const w = run([row("Urine WBC", "Many", "/hpf")], F35).p;
  const pf = w.findings.find((f) => f.rule_id === "urine_pyuria_alone");
  assert.ok(pf, w.findings.map((f) => f.rule_id).join());
  assert.match(pf.must_say, /«Many»/);
  assert.doesNotMatch(pf.must_say, /null|undefined/);
  // 🔴 «Ketones: +/-» ⇒ ketonuria_pattern؛ «Nitrite: Detected» ⇒ هیچ.
  assert.ok(!run([row("Ketones", "+/-")], F35).p.findings.some((f) => f.rule_id === "ketonuria_pattern"));
  assert.ok(run([row("Nitrite", "Detected")], F35).p.findings.length > 0);
});

test("R14: کشتِ خون — «POS»/«+» مثبت، «NEG»/«Not detected» منفی؛ «نامعلوم» فوریت و جملهٔ اقدامِ یکسان دارد (N30/N20)", () => {
  const u = (v) => run([row("Blood Culture", v)]).p.findings.find((f) => f.rule_id === "blood_culture_result");
  for (const v of ["POS", "+"]) assert.equal(u(v).urgency, "soon", v);
  for (const v of ["NEG", "Not detected", "Nil"]) assert.equal(u(v).urgency, "routine", v);
  const unk = u("See report");
  assert.equal(unk.urgency, "this_week");
  assert.match(unk.action, /این هفته/);
});

test("R15: سرخجه IgG — «+» و «-» همان مثبت و منفی‌اند، نه «تفسیر نشدند»", () => {
  for (const [v, st] of [["+", /در خون شما دیده می‌شود/], ["-", /کافی نیست/]]) {
    const p = run([row("Rubella IgG", v)]).p;
    const f = p.findings.find((x) => x.rule_id === "rubella_igg_status");
    assert.ok(f, `${v}: ${p.findings.map((x) => x.rule_id)}`);
    assert.match(f.must_say + f.headline, st);
  }
});

test("R16: اورژانسِ اوره/BUN روی معادلِ اوره (×۲٫۱۴) — نامِ ردیف فوریت را عوض نمی‌کند (P85، MM4)", () => {
  // 🔴 روی 15f1fd4: «BUN 95» (= اورهٔ ۲۰۳) «این هفته» و «Urea 203» اورژانس.
  const urg = (t) => run(t).p.overall_urgency;
  assert.equal(urg([row("BUN", "95", "mg/dL")]), "emergency");
  assert.equal(urg([row("Urea", "203", "mg/dL")]), "emergency");
  assert.equal(urg([row("BUN", "93", "mg/dL")]), urg([row("Urea", "199", "mg/dL")]));
  // عددِ نقل‌شده همانی است که اورژانس را ساخت
  const f = run([row("Urea", "150", "mg/dL"), row("BUN", "96", "mg/dL")]).p.findings.find((x) => x.rule_id === "urea_bun_emergency");
  assert.ok(f && /96/.test(f.must_say) && !/150/.test(f.must_say), f?.must_say);
});

test("R17: کامای مبهمِ «1,200» — اگر هزارگان برای آن آزمایش ناممکن است، «تفسیر نشدند» نه اورژانس (P86، N3)", () => {
  // 🔴 روی 6cf797c: بیلی‌روبین/اوره/BUN/FT4/FT3/INR/HCO3/لاکتات/PT/aPTT/TT «1,200» ⇒ ۱۲۰۰ و اورژانس یا this_week.
  for (const [n, v, u] of [["Total Bilirubin", "1,200", "mg/dL"], ["Urea", "1,200", "mg/dL"], ["BUN", "1,500", "mg/dL"],
    ["FT4", "1,200", "ng/dL"], ["FT3", "2,800", "pg/mL"], ["INR", "1,200"], ["HCO3", "2,400", "mEq/L"], ["Lactate", "1,800", "mmol/L"],
    ["PT", "1,250", "sec"], ["PTT", "3,500", "sec"]]) {
    const { e, p } = run([row(n, v, u)]);
    assert.equal(e.graded.length, 0, `${n} ${v}: ${JSON.stringify(e.graded.map((x) => [x.test, x.value]))}`);
    assert.ok(e.unmapped.includes(n), `${n} ${v}: unmapped=${JSON.stringify(e.unmapped)}`);
    assert.notEqual(p.overall_urgency, "emergency", `${n} ${v}`);
  }
  // گاردِ مخالف: هزارگانِ ممکن و اعشارِ کاما همان رفتارِ قبلی
  assert.equal(g(run([row("AST", "1,200", "U/L")]).e, "AST")?.value, 1200);
  assert.equal(g(run([row("PLT", "250,000")]).e, "PLT")?.value, 250);
  assert.equal(g(run([row("Total Bilirubin", "1,2", "mg/dL")]).e, "BILI_T")?.value, 1.2);
  assert.equal(g(run([row("Triglyceride", "1,200", "mg/dL")]).e, "TG")?.value, 1200);
});
