// بازبینیِ ۲۰۲۶-۱۰-۲۰ (P111): شش برگهٔ واقعی، ۳۱ نقصِ گزارش‌شده. هر آزمون یک ریشهٔ واقعیِ همان گزارش را قفل می‌کند.
//   Y01 تصحیحِ کلسیم روی آلبومینِ بالا (۹٫۹ ⇒ ۹٫۲) در بیمارِ ۳۶ ساله
//   Y02 ستونِ میکروسکوپیِ ادرار (Mucus/Casts/Bacteria) در «تفسیر نشدند» می‌ماند
//   Y03 متونِ چاپیِ آزمایشگاه (سلبِ مسئولیت، سرتیترِ U/C) ردیفِ آزمایش نمی‌شوند
//   Y04 نام‌های واقعیِ برگه: Platlet، U.AC، Phosphorus.P، Mg +2، tshcl، Serum Albumin
//   Y05 ردیف‌های مشتق (VLDL، BUN/Cr، LDL/HDL، SGOT/SGPT) وقتی اجزایشان روی برگه‌اند «بی‌حکم» نمی‌شوند
//   Y06 شاخص‌ها فقط جایی که معنا دارند (منتزر در ماکروسیتوز، R و FIB-4 با آنزیمِ نرمال)
//   Y07/Y08 کودکِ ۱۲ ساله: پلی‌سیتمیِ کاذب از رفرنسِ بزرگسال
//   Y09 لنفوسیتوزِ غالب: «بخشِ اصلیِ افزایش از نوتروفیل‌هاست» گفته نمی‌شود
//   Y10 «Occult Blood (FIT)»ِ مثبت به یافتهٔ خونِ مخفیِ مدفوع می‌رسد
//   Y11 رنگِ مدفوع رنگِ ادرار نمی‌شود
//   Y12 کارتِ تخصصیِ میکروسیتوز متن و منبع دارد
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine, mergeIdentityTag } from "./adapter.js";
import { runPatterns, RULES } from "./patterns.js";

const r = (name, value, unit, reference, section) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}), ...(section ? { section } : {}) });
const M36 = { age: 36, sex: "M" };
const F25 = { age: 25, sex: "F" };
const run = (tests, patient = M36) => {
  const e = runEngine({ patient, tests });
  return { e, p: runPatterns(e) };
};
const ids = (p) => p.findings.map((f) => f.pattern);
const find = (p, id) => p.findings.find((f) => f.pattern === id);
const g = (e, k) => e.graded.find((x) => x.test === k);
const allText = (f) => [f.must_say, f.brief, ...(f.warnings ?? []), ...(f.brief_warnings ?? [])].filter((x) => typeof x === "string").join(" ");

test("Y01: کلسیمِ ۹٫۹ با آلبومینِ ۵٫۳ تصحیح نمی‌شود (فرمولِ تصحیح مالِ هیپوآلبومینمی است)", () => {
  const hi = run([r("Calcium", "9.9", "mg/dL", "8.6-10.2"), r("Albumin", "5.3", "g/dL", "3.5-5.2")]);
  assert.equal(g(hi.e, "CA")?.value, 9.9, "کلسیمِ گزارش‌شده نباید تغییر کند");
  assert.ok(!/9\.2/.test(JSON.stringify(hi.e)), "کلسیمِ کاذبِ ۹٫۲ در خروجی موتور آمد");

  const lo = run([r("Calcium", "8.0", "mg/dL", "8.6-10.2"), r("Albumin", "3.0", "g/dL", "3.5-5.2")]);
  assert.equal(g(lo.e, "ALB")?.value, 3, "آلبومینِ پایین باید خوانده شود");
  assert.ok(lo.e.graded.some((x) => x.test === "CA"), "کلسیم باید نمره بگیرد");
  assert.match(JSON.stringify(lo.e), /9\.1|9\.2|correct/i, "با آلبومینِ ۳٫۰ تصحیح باید انجام شود");
});

test("Y02: ستونِ میکروسکوپیِ ادرار خوانده می‌شود — هیچ ردیفِ خوانایی در unmapped نمی‌ماند", () => {
  const { e } = run([
    r("Urine WBC", "0-1", "/hpf"), r("Urine RBC", "0-1", "/hpf"), r("Ep. cell", "1-2", "/hpf"),
    r("Bacteria", "Not seen"), r("Casts", "Not seen"), r("Crystals", "Not seen"), r("Mucus", "Not seen"),
  ]);
  assert.deepEqual(e.unmapped, [], `ردیف‌های خوانا در «تفسیر نشدند»: ${JSON.stringify(e.unmapped)}`);
  const keys = Object.keys(e.qual);
  for (const want of ["Bacteria", "Casts", "Crystals", "Mucus"]) {
    assert.ok(keys.some((k) => k.includes(want)), `${want} به qual نرسید: ${keys.join(", ")}`);
  }
});

test("Y03: سلبِ مسئولیتِ چاپی و سرتیترِ کشت، ردیفِ آزمایش نیستند", () => {
  const { e } = run([
    r("Hemoglobin", "15.5", "g/dL", "13.5-17.5"),
    r("تفسیر نتایج آزمایشات بر عهده پزشک معالج می باشد", ""),
    r("U/C First", "No growth"),
  ]);
  assert.ok(!e.unmapped.some((n) => /بر عهده/.test(n)), "متنِ سلبِ مسئولیت ردیف شد");
  assert.ok(!e.unmapped.some((n) => /^U\/C/i.test(n)), "سرتیترِ کشت ردیف شد");
});

test("Y04: نام‌های واقعیِ برگه به کلیدِ موتور می‌رسند (Platlet، U.AC، Phosphorus.P، Mg +2، tshcl، Serum Albumin)", () => {
  const { e } = run([
    r("Platlet", "309", "x10^3/uL", "150-450"), r("U.AC", "8.0", "mg/dL", "3.5-7.2"),
    r("Phosphorus.P", "3.4", "mg/dL", "2.5-4.5"), r("Mg +2", "2.0", "mg/dL", "1.7-2.4"),
    r("tshcl", "2.1", "mIU/L", "0.4-4.5"), r("Serum Albumin", "4.8", "g/dL", "3.5-5.2"),
  ], F25);
  assert.equal(g(e, "PLT")?.value, 309);
  assert.equal(g(e, "URIC")?.value, 8);
  assert.equal(g(e, "PHOS")?.value, 3.4);
  assert.equal(g(e, "MG")?.value, 2);
  assert.equal(g(e, "TSH")?.value, 2.1);
  assert.equal(g(e, "ALB")?.value, 4.8);
  assert.deepEqual(e.unmapped, []);
});

test("Y05: ردیف‌های مشتق با حضورِ اجزا «بی‌حکم» نمی‌شوند", () => {
  const { e } = run([
    r("Triglyceride", "180", "mg/dL"), r("Cholesterol", "210", "mg/dL"), r("HDL", "35", "mg/dL"), r("LDL", "120", "mg/dL"),
    r("VLDL", "36", "mg/dL"), r("LDL/HDL Ratio", "3.4"), r("BUN/Cr", "12"), r("SGOT (AST)", "20", "U/L"), r("SGPT (ALT)", "25", "U/L"),
    r("Urea", "30", "mg/dL"), r("Creatinine", "1.0", "mg/dL"),
  ]);
  const noJudge = JSON.stringify(e.ungraded ?? {});
  for (const bad of ["VLDL", "LDL/HDL", "BUN/Cr", "SGOT"]) {
    assert.ok(!noJudge.includes(bad), `${bad} با وجودِ اجزا در «بی‌حکم» ماند: ${noJudge}`);
  }
});

test("Y06: منتزر در ماکروسیتوز، R و FIB-4 با آنزیم‌های نرمال ساخته نمی‌شوند (کنترل: آنزیمِ بالا)", () => {
  const macro = run([r("MCV", "106.6", "fL", "80-96"), r("Hb", "13.0", "g/dL", "12-17")], { age: 59, sex: "M" });
  assert.equal(macro.e.indices.mentzer, undefined, "منتزر روی MCV ۱۰۶ نباید حساب شود");

  const normal = run([r("SGOT (AST)", "20", "U/L", "5-40"), r("SGPT (ALT)", "12", "U/L", "5-45"), r("ALP", "80", "U/L", "40-130")], F25);
  assert.equal(normal.e.indices.fib4, undefined);
  assert.equal(normal.e.indices.r_ratio, undefined);

  const high = run([r("SGOT (AST)", "80", "U/L", "5-40"), r("SGPT (ALT)", "120", "U/L", "5-45"), r("ALP", "80", "U/L", "40-130")], F25);
  assert.ok(high.e.indices.fib4 != null || high.e.indices.r_ratio != null, "با آنزیمِ بالا شاخص‌ها باید بیایند");
});

test("Y07: پسرِ ۱۲ ساله با Hb ۱۴٫۳ و RBC ۵٫۴ پلی‌سیتمی نمی‌گیرد", () => {
  const { e, p } = run([
    r("WBC", "7.0", "x10^3/uL", "4-10"), r("RBC", "5.4", "x10^6/uL", "4.5-5.5"), r("Hb", "14.3", "g/dL", "12-16"),
    r("HCT", "42", "%", "36-46"), r("MCV", "77", "fL", "80-96"), r("MCH", "26", "pg", "27-33"), r("MCHC", "34", "g/dL", "32-36"),
    r("PLT", "250", "x10^3/uL", "150-450"), r("Monocytes", "170", "x10^3/uL", "100-1200"),
  ], { age: 12, sex: "M" });
  assert.notEqual(g(e, "HGB")?.dir, "high", "هموگلوبینِ ۱۴٫۳ برای پسرِ ۱۲ ساله بالا نیست");
  assert.ok(!p.findings.some((f) => /polycyt|erythrocytosis/i.test(f.pattern)), `یافتهٔ پلی‌سیتمی: ${ids(p)}`);
  const txt = p.findings.map(allText).join(" ");
  assert.ok(!/سیگار|آپنه/.test(txt), "توضیحِ پلی‌سیتمیِ بزرگسال روی کودک آمد");
});

test("Y08: پسرِ ۱۲ ساله بازهٔ بزرگسالِ مرد را می‌گیرد — ۵٫۴ طبیعی، ۶٫۲ بالا (باندِ کودک تا ۱۲ سال کشیده نمی‌شود)", () => {
  const ok = run([r("RBC", "5.4", "x10^6/uL")], { age: 12, sex: "M" });
  const hi = run([r("RBC", "6.2", "x10^6/uL")], { age: 12, sex: "M" });
  assert.notEqual(g(ok.e, "RBC")?.dir, "high", "۵٫۴ برای پسرِ ۱۲ ساله بالا نیست");
  assert.equal(g(hi.e, "RBC")?.dir, "high", "۶٫۲ باید با همان بازهٔ ثبت‌شده بالا خوانده شود");
});

test("Y09: وقتی لنفوسیت غالب است، «بخشِ اصلیِ افزایش از نوتروفیل‌هاست» گفته نمی‌شود", () => {
  const { p } = run([
    r("WBC", "39.0", "x10^3/uL", "4-10"), r("Lymphocytes", "70", "%"), r("Neutrophils", "20", "%"),
    r("Lymph Abs", "27.29", "x10^3/uL", "1.0-4.0"), r("Neut Abs", "7.85", "x10^3/uL", "1.8-7.8"),
    r("Hb", "13.0", "g/dL", "12-17"), r("PLT", "180", "x10^3/uL", "150-450"),
  ], { age: 59, sex: "M" });
  const txt = p.findings.map(allText).join(" ");
  assert.ok(!/بخشِ اصلیِ این افزایش از نوتروفیل‌هاست/.test(txt), "ادعای غلطِ غلبهٔ نوتروفیل");
});

test("Y10: «Occult Blood (FIT)» و OB / O.B / Stool O.B / خون مخفی مثبت یافتهٔ خونِ مخفیِ مدفوع می‌سازند", () => {
  const obVariants = [
    r("Occult Blood (FIT)", "Positive"),
    r("OB", "Positive", null, null, "Stool"),
    r("O.B", "Positive"),
    r("Stool O.B", "Positive"),
    r("خون مخفی", "Positive"),
    r("خون مخفی در مدفوع", "Positive"),
  ];
  for (const t of obVariants) {
    const { p, e } = run([t, r("CRP", "18", "mg/L", "<5")], { age: 40, sex: "M" });
    const f = find(p, "gi_stool_result");
    assert.ok(f, `یافته ساخته نشد برای ${t.name}: ${ids(p)}`);
    assert.match(allText(f), /کولونوسکوپی/);
    assert.strictEqual(e.unmapped.length, 0, `ردیف ${t.name} به unmapped رفت`);
  }
  // کنترلِ ادرار: OB در بخشِ ادرار خونِ ادرار است، نه مدفوع
  const { p: pUrine, e: eUrine } = run([r("OB", "Negative", null, null, "Urine Analysis")], { age: 40, sex: "M" });
  assert.ok(!find(pUrine, "gi_stool_result"), "OB ادرار نباید مدفوع شود");
  assert.strictEqual(eUrine.qual["Urine Blood"], "Negative");
});

test("Y15: ۳۳ املای واقعیِ خونِ مخفی (OBT، Blood Occult، FOB (Stool)، کاما، «ازمایش»، آوانگاریِ فارسی) خوانده می‌شوند", () => {
  // ⚠️ تک‌منبعِ حقیقت: serology.js ⇒ FECAL_BLOOD_RE، که adapter هم برای gateِ بخشِ مدفوع می‌پرسد.
  const names = [
    "OB", "O.B", "O.B.", "O B", "OBT", "O.B.T", "FOB", "F.O.B", "FOBT", "gFOBT", "iFOBT", "FIT",
    "Stool FIT", "Quantitative FIT", "Fecal Immunochemical Test", "Occult Blood", "Blood Occult",
    "Occult Blood, Stool", "Occult, Blood", "Stool Occult Blood", "Fecal Occult Blood", "FOB (Stool)",
    "Stool OB", "OB (Stool)", "OB Stool", "Hemoccult", "Hemoccult SENSA", "Guaiac", "Stool Guaiac",
    "Blood in Stool", "خون مخفی", "خون مخفی مدفوع", "خون مخفی در مدفوع", "خون در مدفوع",
    "آزمایش خون مخفی", "ازمایش خون مخفی", "تست خون مخفی", "OB (خون مخفی)", "هماکالت", "هموکالت",
  ];
  const failed = [];
  for (const n of names) {
    // بخشِ مدفوع هم صریح داده می‌شود تا gateِ allowlist هم آزموده شود (باگِ اصلی همین بود).
    const { p, e } = run([r(n, "Positive", null, null, "Stool")], { age: 45, sex: "M" });
    const f = find(p, "gi_stool_result");
    if (!f || f.urgency !== "this_week" || e.unmapped.length) failed.push(`${n} (unmapped=${JSON.stringify(e.unmapped)})`);
  }
  assert.deepEqual(failed, [], "این املاها خوانده نشدند");
});

test("Y16: FITِ عددی فقط با مرزِ چاپ‌شدهٔ همان ردیف مثبت/منفی می‌شود (C1) — بی‌مرز ادعا نمی‌کند", () => {
  const above = run([r("FOB", "60", "ng/mL", "<50")], { age: 55, sex: "M" });
  assert.strictEqual(find(above.p, "gi_stool_result").urgency, "this_week");
  const within = run([r("FOB", "30", "ng/mL", "<50")], { age: 55, sex: "M" });
  assert.strictEqual(find(within.p, "gi_stool_result").urgency, "routine");
  const noRef = run([r("FIT", "120", "ng/mL")], { age: 55, sex: "M" });
  const f = find(noRef.p, "gi_stool_result");
  assert.strictEqual(f.urgency, "routine", "بی‌مرزِ چاپی نباید مثبت اعلام شود");
  assert.match(allText(f), /مرزِ مثبت‌بودنِ FIT به کیت/);
});

test("Y17: مقدارهای پرانتزیِ برگهٔ فارسی — «(+)» مثبت و «(-)»/«دیده نشد» منفی است، نه «تفسیر نشد»", () => {
  const pos = run([r("OB", "(+)")], { age: 45, sex: "M" });
  assert.strictEqual(find(pos.p, "gi_stool_result")?.urgency, "this_week");
  const neg = run([r("OB", "(-)")], { age: 45, sex: "M" });
  assert.strictEqual(find(neg.p, "gi_stool_result")?.urgency, "routine");
  assert.deepEqual(neg.e.unmapped, [], "ردیفِ منفیِ پرانتزی نباید «تفسیر نشد» شود");
  const notSeen = run([r("OB", "دیده نشد")], { age: 45, sex: "M" });
  assert.strictEqual(find(notSeen.p, "gi_stool_result")?.urgency, "routine");
});

test("Y18: «Occult Blood-1(FOB)» (رقمِ وسطِ نام) خوانده می‌شود و در بخشِ مدفوع «تفسیر نشد» نمی‌شود", () => {
  for (const n of ["Occult Blood-1(FOB)", "Occult Blood-2(FOB)", "FOB-1", "OB-1"]) {
    const { p, e } = run([r(n, "Positive", null, null, "Stool")], { age: 45, sex: "M" });
    assert.ok(find(p, "gi_stool_result"), `${n} یافتهٔ خونِ مخفی نساخت`);
    assert.deepEqual(e.unmapped, [], `${n} به «تفسیر نشدند» رفت`);
  }
});

test("Y19: «HDL-chol/LDL-chol/VLDL-chol» — LDL و HDLِ برگه سنجیده می‌شوند، نه «تفسیر نشدند»", () => {
  const { p, e } = run([
    r("Cholesterol", "235", "mg/dL", "<200"), r("TG", "260", "mg/dL", "<150"),
    r("HDL-chol", "35", "mg/dL", ">40"), r("LDL-chol", "150", "mg/dL", "<100"), r("VLDL-chol", "52", "mg/dL"),
  ], { age: 42, sex: "M" });
  assert.deepEqual(e.unmapped, []);
  assert.ok(g(e, "LDL")?.value === 150 && g(e, "LDL").abnormal, "LDLِ ۱۵۰ سنجیده نشد");
  assert.ok(g(e, "HDL")?.abnormal, "HDLِ ۳۵ سنجیده نشد");
  assert.ok(!g(e, "VLDL"), "VLDLِ مشتق باید کنار برود، نه سنجیده شود");
  assert.ok(find(p, "dyslipidemia"));
});

test("Y20: «Nitrit» (غلطِ املاییِ LIS) نیتریتِ ادرار است و یافتهٔ خودش را می‌سازد", () => {
  const { p, e } = run([r("Nitrit", "Positive", null, null, "Urinalysis")], { age: 30, sex: "F" });
  assert.deepEqual(e.unmapped, []);
  assert.ok(find(p, "urine_nitrite_alone"), `یافته ساخته نشد: ${ids(p)}`);
});

test("Y21: بازهٔ چاپ‌شدهٔ شمارشِ مطلق بر بازهٔ داخلی مقدم است (مونوسیتِ نرمال «کم» نیست)", () => {
  const normal = run([r("Monocyte", "0.17", "10^3/µL", "0.1 - 1.2")], { age: 12, sex: "M" });
  assert.ok(!g(normal.e, "MONO_ABS")?.abnormal, "مونوسیتِ ۰٫۱۷ با بازهٔ برگهٔ ۰٫۱–۱٫۲ غیرطبیعی شد");
  assert.ok(!find(normal.p, "monocytopenia"), `monocytopenia کاذب: ${ids(normal.p)}`);
  const high = run([r("Monocyte", "1.5", "10^3/µL", "0.1 - 1.2")], { age: 12, sex: "M" });
  assert.ok(g(high.e, "MONO_ABS").abnormal, "۱٫۵ بالای بازهٔ برگه باید غیرطبیعی باشد");
  const noRef = run([r("Monocyte", "0.30", "10^3/µL")], { age: 12, sex: "M" });
  assert.ok(!g(noRef.e, "MONO_ABS").abnormal, "بی‌بازهٔ چاپی ⇒ بازهٔ داخلی ۲۰۰–۸۰۰");
});

test("Y22: ردیف‌های مشتقِ AST/ALT و Albumin/Globulin با حضورِ اجزا «تفسیر نشد» نمی‌شوند", () => {
  const { e } = run([r("ALT", "30", "U/L", "10-40"), r("AST", "26", "U/L", "10-40"), r("AST/ALT", "0.87"),
    r("Albumin", "4.6", "g/dL", "3.5-5"), r("Total Protein", "7.8", "g/dL", "6-8"), r("Albumin/Globulin", "1.44")], { age: 42, sex: "M" });
  assert.deepEqual(e.unmapped, []);
});

test("Y23: شکل‌های نامنظمِ گلبولِ قرمز (Elliptocyte/Ovalocyte/Target/Tear Drop) خوانده می‌شوند", () => {
  const { p, e } = run([r("Elliptocyte", "+"), r("Ovalocyte", "+"), r("Target Cells", "+"), r("Tear Drops", "Few")], { age: 34, sex: "F" });
  assert.deepEqual(e.unmapped, [], "مورفولوژیِ لام در «تفسیر نشدند» ماند");
  assert.ok((e.rbcMorph ?? []).length > 0, "به کانالِ rbcMorph نرسید");
});

test("Y24: اسید اوریک روی سقفِ بازهٔ برگه «بالاتر از حد» اعلام نمی‌شود", () => {
  const onCeil = run([r("Uric Acid", "8.2", "mg/dL", "3.6 - 8.2")], { age: 36, sex: "M" });
  assert.match(find(onCeil.p, "hyperuricemia").headline, /سقفِ بازهٔ آزمایشگاه/);
  assert.ok(!/بالاتر از حد طبیعی قرار دارد/.test(find(onCeil.p, "hyperuricemia").must_say));
  const above = run([r("Uric Acid", "9.5", "mg/dL", "3.6 - 8.2")], { age: 36, sex: "M" });
  assert.match(find(above.p, "hyperuricemia").headline, /بالاتر از حد طبیعی/);
});

test("Y25: «Hemoglobin» ادرار و خون قاطی نمی‌شوند — تگِ هویت جدا، و پدِ خونِ ادرار یافتهٔ hematuria", () => {
  // P114: هویتِ ردیف با سرتیتر جدا می‌شود (N25) — پیش‌تر هر دو یک کلید می‌شدند و هشدارِ
  // «Hemoglobin در صفحهٔ ۲ و ۲ با مقادیرِ متفاوت (6.4 و Negative)» ساخته می‌شد.
  assert.notStrictEqual(mergeIdentityTag("Hemoglobin", "6.4", "Hematology"),
    mergeIdentityTag("Hemoglobin", "Negative", "Urinalysis"), "تگِ هویتِ خون و ادرار باید متفاوت باشد");
  const blood = run([r("Hemoglobin", "6.4", "g/dL", "12-16", "Hematology")], { age: 55, sex: "M" });
  assert.strictEqual(g(blood.e, "HGB")?.value, 6.4);
  const urine = run([r("Hemoglobin", "Positive", null, null, "Urinalysis")], { age: 55, sex: "M" });
  assert.strictEqual(urine.e.qual["Urine Blood"], "Positive");
  assert.ok(find(urine.p, "hematuria"), `هماچوری ساخته نشد: ${ids(urine.p)}`);
  assert.deepEqual(urine.e.unmapped, []);
});

test("Y26: LDH با سقفِ چاپیِ آزمایشگاه (بزرگسال) طبیعی است؛ بالای همان سقف غیرطبیعی", () => {
  const normal = run([r("LDH", "275", "U/L", "< 530")], { age: 55, sex: "M" });
  assert.ok(!g(normal.e, "LDH")?.abnormal, "LDH ۲۷۵ با سقفِ ۵۳۰ غیرطبیعی شد");
  assert.ok(!find(normal.p, "ldh_high_nonspecific"));
  const high = run([r("LDH", "700", "U/L", "< 530")], { age: 55, sex: "M" });
  assert.ok(g(high.e, "LDH").abnormal && g(high.e, "LDH").dir === "high");
});

test("Y27: مقادیرِ «Were seen»/«Seen» در لام پذیرفته می‌شوند و مورفولوژی unmapped نمی‌شود", () => {
  const { p, e } = run([r("Tear Drops", "Were seen"), r("Target Cells", "Seen"), r("Elliptocyte", "Present")], { age: 40, sex: "M" });
  assert.deepEqual(e.unmapped, [], "مورفولوژی با مقدارِ متنی «تفسیر نشد» شد");
  assert.ok((e.rbcMorph ?? []).some((m) => m.kind === "poikilocytosis"));
  assert.ok(find(p, "smear_rbc_size"));
});

test("Y28: PSA با بازهٔ دوگانهٔ چاپی — ادعای «بازه چاپ نشده» نمی‌شود", () => {
  const { p } = run([r("PSA", "0.81", "ng/ml", "< 4.0 / 70-80 years: Up to 6.5")], { age: 55, sex: "M" });
  const f = find(p, "psa_result");
  assert.ok(f, `یافته ساخته نشد: ${ids(p)}`);
  assert.match(f.must_say, /داخلِ محدودهٔ چاپ‌شده/);
  assert.ok(!/چاپ نشده/.test(f.must_say), "ادعای کاذبِ «بازه چاپ نشده»");
});

test("Y29: MCHCِ پایین در کم‌خونیِ میکروسیتیک توضیح داده می‌شود و در «توضیح نداریم» نمی‌نشیند", () => {
  const { p } = run([r("Hemoglobin", "6.4", "g/dL", "12-16"), r("MCV", "59.1", "fL", "80-100"),
    r("MCH", "15.3", "pg", "27-33"), r("MCHC", "25.9", "g/dL", "32-36"), r("RBC", "5.6", "10^6/µL", "4.5-5.9")], { age: 55, sex: "M" });
  const micro = p.findings.find((f) => /^microcytic/.test(f.pattern));
  assert.ok(micro, `یافتهٔ میکروسیتیک ساخته نشد: ${ids(p)}`);
  assert.match(micro.must_say, /MCHC/);
  assert.ok(!find(p, "unexplained_abnormal"), "MCHC نباید «بی‌توضیح» بماند");
  // بحرانِ هماتولوژیک: به‌جای «تکرار CBC»، بررسیِ منشأ (فریتین/کولونوسکوپی).
  const crisis = find(p, "severe_anemia_crisis");
  assert.ok(crisis.suggest.includes("فریتین"));
  assert.ok(!crisis.suggest.includes("CBC"), "در اورژانس «تکرار CBC» پیشنهاد نمی‌شود");
});

test("Y11: رنگِ مدفوع رنگِ ادرار نمی‌شود (صفحهٔ ترکیبیِ ادرار و مدفوع)", () => {
  const tests = [
    { ...r("Urine Protein", "Neg"), _page: 1 }, { ...r("Urine Blood", "Neg"), _page: 1 },
    { ...r("Urine Color", "Yellow"), _page: 1 }, { ...r("Color", "Brown"), _page: 1 },
    { ...r("FOBT", "Positive"), _page: 1 },
  ];
  const e = runEngine({ patient: { age: 40, sex: "M" }, tests });
  assert.equal(e.qual["Urine Color"], "Yellow", `رنگِ ادرار بازنویسی شد: ${JSON.stringify(e.qual)}`);
});

test("Y13: پسوندِ روشِ دستگاه و املاهای برگه (CLIA/CL، BILIT/BILID، Gama GT، U.AC) هویتِ تست را عوض نمی‌کنند", () => {
  const { e } = run([
    r("TSH (CLIA)", "2.1", "mIU/L", "0.4-4.5"), r("25 OH-Vit D (CL)", "11", "ng/mL", "30-100"),
    r("BILIT", "1.1", "mg/dL", "0.2-1.2"), r("BILID", "0.3", "mg/dL", "0-0.3"),
    r("Gama GT", "48", "U/L", "10-71"), r("U.AC", "8.0", "mg/dL", "3.5-7.2"),
  ], { age: 40, sex: "M" });
  assert.equal(g(e, "TSH")?.value, 2.1, "TSH (CLIA)");
  assert.equal(g(e, "VIT_D")?.value, 11, "25 OH-Vit D (CL)");
  assert.equal(g(e, "BILI_T")?.value, 1.1, "BILIT");
  assert.equal(g(e, "BILI_D")?.value, 0.3, "BILID");
  assert.equal(g(e, "GGT")?.value, 48, "Gama GT");
  assert.equal(g(e, "URIC")?.value, 8, "U.AC");
});

test("Y14: صفحهٔ ترکیبیِ ادرار و مدفوع — رنگ و میکروسکوپیِ هر بخش مالِ خودش است، نه تداخلِ مقادیر", () => {
  const tests = [
    { ...r("Color", "Yellow"), section: "Urine Analysis", _page: 2 },
    { ...r("W.B.C", "2", "/hpf"), section: "Urine Analysis", _page: 2 },
    { ...r("Color", "Brown"), section: "Stool", _page: 2 },
    { ...r("W.B.C", "Not Seen", "/hpf"), section: "Stool", _page: 2 },
    { ...r("FOB", "Positive"), section: "Stool", _page: 2 },
  ];
  const e = runEngine({ patient: { age: 40, sex: "M" }, tests });
  assert.equal(e.qual["Urine Color"], "Yellow", `رنگِ ادرار: ${JSON.stringify(e.qual)}`);
  assert.equal(e.qual["Urine W.B.C"], "2", `میکروسکوپیِ ادرار: ${JSON.stringify(e.qual)}`);
  assert.equal(e.ungraded?.STOOL_COLOR?.value, "Brown", "رنگِ مدفوع با رنگِ ادرار قاطی شد");
  assert.deepEqual(e.valueConflicts ?? [], [], "تداخلِ مقادیر برای ردیف‌های دو بخشِ مختلف ساخته شد");
  assert.ok(!("WBC" in (e.tests ?? {})), "WBCِ مدفوع وارد شمارشِ خون شد");
});

test("Y12: قاعدهٔ میکروسیتوزِ بی‌کم‌خونی متنِ تخصصی با منبع دارد", () => {
  const rule = RULES.find((x) => x.id === "microcytosis_no_anemia");
  assert.ok(rule?.pro, "pro_text برای microcytosis_no_anemia ثبت نشده");
  assert.ok((rule.pro.sources ?? []).length > 0, "منبع ندارد");
  assert.ok((rule.pro.differential ?? []).length > 0, "افتراقی ندارد");
});
