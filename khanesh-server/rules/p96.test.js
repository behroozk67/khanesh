// ============================================================
// p96.test.js — پاسخِ بازبین به فهرستِ تصمیم‌های بازبینیِ ۲۳۶ درخواستِ LIS، ۲۰۲۶-۱۰-۰۶. فایلِ جدا تا با جلسه‌های هم‌زمان تداخل نکند.
// فقط سن/جنس/عدد — هیچ شناسهٔ بیمار نیست. بندها = شمارهٔ فهرستِ note.md (۸ شماره‌گذاری است و تصمیم ندارد).
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { mixedLine } from "./prompt.js";

const row = (name, value, unit = "", reference = undefined) => ({ name, value, unit, reference });
const run = (tests, patient = { sex: "F", age: 40 }) => {
  const e = runEngine({ patient, tests });
  return { e, p: runPatterns(e) };
};
const ids = (p) => p.findings.map((f) => f.rule_id ?? f.pattern);
const find = (p, id) => p.findings.find((f) => (f.rule_id ?? f.pattern) === id);
const graded = (e, k) => e.graded.find((g) => g.test === k);
const basis = (e, k) => e.unitConversions?.find((c) => c.test === k)?.basis;

test("P96-۱: گامِ «اندازه» برای کلسیم و کراتینین؛ مبهم‌ها و بقیهٔ کلیدها هنوز «واحد نامعلوم»", () => {
  // کلسیم: «۱۱» فقط mg/dL (۱۱ mmol/L = ۴۴ mg/dL ناممکن)، «۲٫۴» فقط mmol/L؛ «۳٫۸» جهتِ وارونه ⇒ تعیین نمی‌شود.
  const c11 = run([row("Calcium", "11")]).e;
  assert.equal(graded(c11, "CA")?.value, 11); assert.equal(basis(c11, "CA"), "magnitude");
  const c24 = run([row("Calcium", "2.4")]).e;
  assert.ok(Math.abs(graded(c24, "CA").value - 9.62) < 0.05 && !graded(c24, "CA").abnormal); assert.equal(basis(c24, "CA"), "magnitude");
  const c38 = run([row("Calcium", "3.8")]);
  assert.equal(graded(c38.e, "CA"), undefined); assert.equal(c38.e.ungraded.CA?.reason, "unit_unknown");
  assert.equal(c38.p.overall_urgency, "emergency");   // هر دو خوانش خطرناک‌اند؛ فوریت از دست نمی‌رود
  // کراتینین: ۸۴ فقط µmol/L (۰٫۹۵)، ۰٫۹ فقط mg/dL، ۱۹ مبهم.
  const r84 = run([row("Creatinine", "84")], { sex: "M", age: 40 });
  assert.ok(Math.abs(graded(r84.e, "CREAT").value - 0.95) < 0.02); assert.equal(basis(r84.e, "CREAT"), "magnitude"); assert.equal(r84.p.overall_urgency, "none");
  assert.equal(graded(run([row("Creatinine", "0.9")]).e, "CREAT")?.value, 0.9);
  assert.equal(run([row("Creatinine", "19")]).e.ungraded.CREAT?.reason, "unit_unknown");
  // ۸۰۰ (bحرانی): اورژانس می‌ماند (کمتر از قبل نمی‌شود).
  assert.equal(run([row("Creatinine", "900")], { sex: "M", age: 50 }).p.overall_urgency, "emergency");
  assert.equal(run([row("Calcium", "15")]).p.overall_urgency, "emergency");
  // کنترل: اوره/قند/بیلی‌روبینِ بزرگسال همچنان نامعلوم (گامِ اندازه برایشان خاموش است).
  for (const [n, v] of [["urea", "84"], ["FBS", "59"], ["T.Bili", "18"]]) assert.equal(Object.values(run([row(n, v)]).e.ungraded)[0]?.reason, "unit_unknown", n);
});

test("P96-۱ب: بیلی‌روبینِ نوزادِ زیرِ یک ماه گامِ «اندازه» دارد؛ ۱۸ ⇒ mg/dL ⇒ همان اورژانسِ mg/dL چاپ‌شده", () => {
  const neo = { sex: "M", age: "3 روز" };
  const bare = run([row("T.Bili", "18")], neo), printed = run([row("T.Bili", "18", "mg/dL")], neo);
  assert.equal(basis(bare.e, "BILI_T"), "magnitude");
  assert.deepEqual(ids(bare.p), ids(printed.p));
  assert.equal(bare.p.overall_urgency, "emergency");
  assert.ok(ids(bare.p).includes("bilirubin_emergency"));
  // P104: داخلِ بازهٔ نوزادی ⇒ ungraded (نمودارِ ساعتی)؛ تبدیلِ واحد (آنچه این بند قفل می‌کند) همان است.
  assert.ok(Math.abs(run([row("T.Bili", "150")], neo).e.ungraded.BILI_T.value - 8.77) < 0.05, "۱۵۰ برای نوزاد فقط µmol/L است");
  // ۱٫۵: هر دو خوانش زیرِ ۲ mg/dL ⇒ مبهم ⇒ نامعلوم می‌ماند.
  assert.equal(run([row("T.Bili", "1.5")], neo).e.ungraded.BILI_T?.reason, "unit_unknown");
  // همان ۱۸ برای کودکِ ۵ ساله نامعلوم است (گام فقط برای نوزاد).
  assert.equal(run([row("T.Bili", "18")], { sex: "M", age: 5 }).e.ungraded.BILI_T?.reason, "unit_unknown");
});

test("P96-۲: INRِ تنها و خفیف (≤ ۱٫۲) با aPTT طبیعی ⇒ routine + تکرار؛ بالاتر یا با aPTTِ بالا ⇒ this_week", () => {
  const coag = (tests) => find(run(tests, { sex: "M", age: 50 }).p, "coagulation_abnormal");
  for (const v of ["1.12", "1.15", "1.2"]) {
    const f = coag([row("INR", v), row("PTT", "32")]);
    assert.equal(f.urgency, "routine", v);
    assert.match(f.action, /PT و INR تکرار شود/);
    assert.match(f.must_say, new RegExp(`INR شما ${v.replace(".", "\\.")} .*فقط کمی بالاتر`));
  }
  assert.equal(coag([row("INR", "1.3"), row("PTT", "32")]).urgency, "this_week");
  assert.equal(coag([row("INR", "1.15"), row("PTT", "55")]).urgency, "this_week");
  assert.equal(coag([row("INR", "1.15"), row("PT", "16"), row("PTT", "32")]).urgency, "this_week");
});

test("P96-۳: LDHِ تنها routine است فقط وقتی < ۲×ULN، CBC غیرطبیعی نیست، بیلی‌روبین بالا نیست، شبهِ همولیز نیست؛ کودک: ULN از بازهٔ چاپ‌شده", () => {
  const cbc = [row("Hb", "14", "g/dL"), row("Platelet", "250")];
  const ldh = (tests, patient = { sex: "F", age: 34 }) => find(run(tests, patient).p, "isolated_ldh_elevation");
  // P147-۵: سقفِ پیش‌فرض ۲۵۰ ⇒ ۴۷۰ (کیت‌های DGKCِ ایران)؛ «LDHِ بالا» ۶۰۰ است و ۲×ULN = ۹۴۰ (بود ۴۵۰ و ۵۰۰).
  assert.equal(ldh([row("LDH", "600"), ...cbc]).urgency, "routine");
  assert.equal(ldh([row("LDH", "1000"), ...cbc]).urgency, "this_week", "≥ ۲×ULN (۴۷۰)");
  assert.equal(ldh([row("LDH", "600"), row("Hb", "9", "g/dL"), row("Platelet", "250")]).urgency, "this_week", "Hbِ پایین");
  assert.equal(ldh([row("LDH", "600"), row("Hb", "14", "g/dL"), row("Platelet", "90")]).urgency, "this_week", "پلاکتِ پایین");
  assert.equal(ldh([row("LDH", "600"), row("T.Bili", "3", "mg/dL"), ...cbc]).urgency, "this_week", "بیلی‌روبینِ بالا");
  assert.equal(ldh([row("LDH", "600"), row("AST", "80"), row("ALT", "20"), ...cbc]).urgency, "this_week", "LDH+AST بالا با ALTِ طبیعی ⇒ شبهِ همولیز");
  // نبودِ CBC شاهدِ غیرطبیعی نیست ⇒ مانع نمی‌شود.
  assert.equal(ldh([row("LDH", "600")]).urgency, "routine");
  // کودک: ULN از بازهٔ چاپ‌شده. ۶۷۷ با «0-1000» (۲×=۲۰۰۰) routine؛ ۹۰۰ با «0-400» (۲×=۸۰۰) this_week.
  const kid = { sex: "M", age: 8 }, kcbc = [row("Hb", "13", "g/dL"), row("Platelet", "300")];
  assert.equal(ldh([row("LDH", "677", "", "0-1000"), ...kcbc], kid).urgency, "routine");
  assert.equal(ldh([row("LDH", "900", "", "0-400"), ...kcbc], kid).urgency, "this_week");
  assert.equal(ldh([row("LDH", "677"), ...kcbc], kid).urgency, "routine", "بی‌بازهٔ چاپ‌شده ⇒ بازهٔ موتور (۳۷۰)");
});

test("P96-۴ و ۵: HCTِ کودک با بازهٔ CALIPER و کراتینینِ شیرخوارِ بی‌بازهٔ چاپ‌شده پرچمِ بالینی نمی‌گیرند", () => {
  const kid = run([row("Hb", "12", "g/dL"), row("Hct", "37"), row("WBC", "7"), row("Platelet", "250")], { sex: "F", age: 8 }).e;
  assert.equal(graded(kid, "HCT")?.abnormal, false); assert.equal(graded(kid, "HCT")?.range, "34.9–43.7");
  const inf = { sex: "M", age: "6 ماه" };
  const a = run([row("Creatinine", "0.9", "mg/dL")], inf);
  assert.equal(graded(a.e, "CREAT"), undefined); assert.equal(a.e.ungraded.CREAT?.reason, "infant_no_printed_range");
  assert.ok(a.e.noRef.includes("CREAT")); assert.equal(a.p.overall_urgency, "none");
  assert.equal(run([row("Creatinine", "0.9")], inf).e.ungraded.CREAT?.reason, "infant_no_printed_range");
  // [209]: سنِ ۲ سال هنوز داخلِ ردیفِ RCPCH (۱ ماه تا < ۳ سال) است ⇒ همان گیت؛ سنِ ۳ با بازهٔ خودش سنجیده می‌شود.
  const two = run([row("Creatinine", "0.5", "mg/dL")], { sex: "M", age: 2 });
  assert.equal(graded(two.e, "CREAT"), undefined); assert.equal(two.p.overall_urgency, "none");
  assert.equal(graded(run([row("Creatinine", "0.9", "mg/dL")], { sex: "M", age: 3 }).e, "CREAT")?.abnormal, true);
  // با بازهٔ چاپ‌شده همان سنجشِ قبلی.
  const b = run([row("Creatinine", "0.9", "mg/dL", "0.2-0.4")], inf);
  assert.equal(graded(b.e, "CREAT")?.abnormal, true);
  // کنترل: کودکِ ۸ ساله بی‌بازهٔ چاپ‌شده همچنان با بازهٔ سنیِ خودش سنجیده می‌شود.
  assert.equal(graded(run([row("Creatinine", "1.4", "mg/dL")], { sex: "M", age: 8 }).e, "CREAT")?.abnormal, true);
});

test("P96-۶: لکوسیتوز + سیتوپنی — پلاکتِ بالا اورژانسِ «افتِ رده‌ها» نمی‌سازد؛ پلاکتِ پایین هنوز می‌سازد", () => {
  const panel87 = [row("WBC", "22.2"), row("RBC", "2.45"), row("Hb", "7.5", "g/dL"), row("Hct", "22.4"), row("MCV", "91"), row("MCH", "31"), row("MCHC", "33"),
    row("Platelet", "549"), row("Neut", "86.5"), row("Lymph", "7.5"), row("ESR 1st hr", "104"), row("CRP", "++")];
  const a = run(panel87, { sex: "M", age: 34 });
  assert.ok(!ids(a.p).includes("leukocytosis_with_cytopenia"), ids(a.p).join());
  assert.notEqual(a.p.overall_urgency, "emergency");
  const r = find(a.p, "reactive_leukocytosis_with_cytopenia");
  assert.ok(r, "یافتهٔ واکنشی نیامد"); assert.match(r.must_say, /پلاکت 549 .*بالاتر است/);
  // کنترل منفی: همان WBC با پلاکتِ پایین هنوز اورژانس.
  const low = run([row("WBC", "25"), row("Hb", "7.5", "g/dL"), row("Platelet", "30"), row("Neut", "80"), row("Lymph", "10")], { sex: "M", age: 34 });
  assert.ok(ids(low.p).includes("leukocytosis_with_cytopenia")); assert.equal(low.p.overall_urgency, "emergency");
  // WBC > ۵۰ با Hbِ < ۸ و پلاکتِ بالا: acute_leukemia_suspicion دست‌نخورده.
  const big = run([row("WBC", "60"), row("Hb", "7.2", "g/dL"), row("Platelet", "600")], { sex: "M", age: 34 });
  assert.ok(ids(big.p).includes("acute_leukemia_suspicion"));
});

test("P96-۷: باند > نوتروفیل ⇒ «مشکوک به خطای ثبت یا جابه‌جاییِ ستون»، routine، بی‌نوتروپنی و بی‌باندمی", () => {
  const panel = [row("W.B.C", "7.4"), row("R.B.C", "4.80"), row("Hb", "14.2", "g/dL"), row("Hct", "41.0"), row("M.C.V", "85"), row("Platelet", "230"), row("Mixed", "6.9"), row("Neut", "18.1"), row("Band", "75.0")];
  const a = run(panel, { sex: "F", age: 10 });
  const f = find(a.p, "band_neutrophil_discordance");
  assert.ok(f, ids(a.p).join()); assert.equal(f.urgency, "routine");
  assert.match(f.must_say, /خطای ثبت یا جابه‌جاییِ ستون/);
  assert.ok(!ids(a.p).includes("bandemia") && !ids(a.p).includes("mild_neutropenia"), ids(a.p).join());
  assert.notEqual(a.p.overall_urgency, "emergency");
  // کنترل: باندِ بالا با نوتروفیلِ بیشتر ⇒ همان bandemia قبلی.
  const b = run([row("W.B.C", "12"), row("Neut", "70"), row("Band", "15"), row("Lymph", "10"), row("Hb", "14", "g/dL"), row("Platelet", "230")], { sex: "F", age: 30 });
  assert.ok(ids(b.p).includes("bandemia") && !ids(b.p).includes("band_neutrophil_discordance"), ids(b.p).join());
});

test("P96-۹الف: شیستوسیت — ≥ ۱٪ با پلاکت یا Hbِ پایین اورژانس؛ نشانگرِ ماها؛ مقدارِ کم/بی‌کمیت/بی‌٪ محتاطانه", () => {
  // نشانگرِ مستقیمِ MAHA: Hb < ۱۰، PLT < ۵۰ و شیستوسیت ≥ ۱٪ ⇒ maha_ttp_suspicion (شیستوسیت در متن).
  const a = run([row("Schistocytes", "2", "%"), row("Platelet", "40"), row("Hb", "8", "g/dL"), row("WBC", "8")]);
  assert.ok(ids(a.p).includes("maha_ttp_suspicion")); assert.match(find(a.p, "maha_ttp_suspicion").must_say, /شیستوسیت 2٪/);
  assert.ok(!ids(a.p).includes("schistocytes_screen"), "یک یافته دربارهٔ شیستوسیت (N20)");
  // زیرِ آستانهٔ maha (PLT ۸۰، Hb ۹) ولی شیستوسیتِ ۲٪ ⇒ اورژانسِ خودش.
  const b = run([row("Schistocytes", "2", "%"), row("Platelet", "80"), row("Hb", "9", "g/dL")]);
  assert.equal(find(b.p, "schistocytes_screen").urgency, "emergency"); assert.match(find(b.p, "schistocytes_screen").action, /اورژانس/);
  // CBCِ سنجیده‌شده و طبیعی ⇒ this_week، نه اورژانس. CBCِ غایب ⇒ soon + درخواستِ CBC.
  assert.equal(find(run([row("Schistocytes", "2", "%"), row("Platelet", "250"), row("Hb", "14", "g/dL")]).p, "schistocytes_screen").urgency, "this_week");
  const none = find(run([row("Schistocytes", "2", "%")]).p, "schistocytes_screen");
  assert.equal(none.urgency, "soon"); assert.match(none.must_say, /پلاکت و هموگلوبین روی این برگه نیست/);
  // «کم»/زیرِ ۱٪ ⇒ routine (با cytopenia ⇒ this_week)؛ «Present» بی‌کمیت + cytopenia ⇒ soon.
  assert.equal(find(run([row("Schistocytes", "Few"), row("Platelet", "250"), row("Hb", "14", "g/dL")]).p, "schistocytes_screen").urgency, "routine");
  assert.equal(find(run([row("Schistocytes", "0.5", "%"), row("Platelet", "250"), row("Hb", "14", "g/dL")]).p, "schistocytes_screen").urgency, "routine");
  assert.equal(find(run([row("Fragmented RBC", "Present"), row("Platelet", "40"), row("Hb", "14", "g/dL")]).p, "schistocytes_screen").urgency, "soon");
  // عددِ بی‌واحد و بی‌٪ مبهم است ⇒ خوانده نمی‌شود، «تفسیر نشدند» نامش را می‌برد (N3).
  const amb = run([row("Schistocytes", "2"), row("Platelet", "250")]).e;
  assert.ok(amb.unmapped.includes("Schistocytes")); assert.equal(amb.rbcMorph, undefined);
  // «منفی/دیده نشد» ⇒ هیچ یافته.
  assert.ok(!ids(run([row("Schistocytes", "Absent"), row("Platelet", "40"), row("Hb", "8", "g/dL")]).p).includes("schistocytes_screen"));
});

test("P96-۹ب: اسفروسیتِ تنها ⇒ «DAT را در نظر بگیرید» (routine)؛ با کم‌خونی/رتیکولوسیتوز/LDH/بیلی‌روبین ⇒ قوی‌تر؛ spherocytosis_likely مالکِ خودش", () => {
  const alone = find(run([row("Spherocytes", "Few"), row("Hb", "14", "g/dL")]).p, "spherocytes_dat");
  assert.equal(alone.urgency, "routine"); assert.match(alone.must_say, /در نظر بگیرد/); assert.doesNotMatch(alone.must_say, /لازم است/);
  for (const extra of [[row("Hb", "8", "g/dL")], [row("Hb", "14", "g/dL"), row("LDH", "600")], [row("Hb", "14", "g/dL"), row("T.Bili", "3", "mg/dL")]]) {
    const f = find(run([row("Spherocytes", "Many"), ...extra]).p, "spherocytes_dat");
    assert.equal(f.urgency, "this_week"); assert.match(f.must_say, /DAT\) لازم است/);
    assert.ok(f.suggest.includes("تست کومبس مستقیم (DAT)"));
  }
  // اسفروسیتِ عددی کالیبره نیست ⇒ unmapped می‌ماند.
  assert.ok(run([row("Spherocytes", "5", "%")]).e.unmapped.includes("Spherocytes"));
  // وقتی الگوی MCHC (spherocytosis_likely) هست، همان مالک است و جملهٔ لام را دارد.
  const likely = run([row("Hb", "10.5", "g/dL"), row("MCV", "88"), row("MCH", "30"), row("MCHC", "37"), row("RDW-CV", "16.5"), row("Spherocytes", "Many")], { sex: "M", age: 40 });
  assert.ok(ids(likely.p).includes("spherocytosis_likely") && !ids(likely.p).includes("spherocytes_dat"), ids(likely.p).join());
  assert.match(find(likely.p, "spherocytosis_likely").must_say, /لامِ خونِ همین برگه هم اسفروسیت گزارش کرده/);
});

test("P96-۹ج: کانالِ rbcMorph فقط وقتی ردیف هست در خروجی می‌آید (فریزها دست‌نخورده)", () => {
  assert.equal("rbcMorph" in run([row("Hb", "14", "g/dL")]).e, false);
});

test("P96-۱۰: رنگ/ظاهرِ ادرارِ معمول (Dark-Yellow/Semi Clear) یافته نمی‌سازد؛ Mixed فقط نسبت به بازهٔ چاپ‌شدهٔ خودِ آزمایشگاه موقعیت می‌گیرد", () => {
  const u = run([row("Color", "Dark-Yellow"), row("Appearance", "Semi Clear"), row("Sp.Gravity", "1.030"), row("Protein", "negative"), row("Blood", "negative"),
    row("Nitrite", "Negative"), row("Leuko estr", "negative"), row("Glucose", "negative")], { sex: "F", age: 30 });
  assert.equal(u.p.findings.length, 0, ids(u.p).join()); assert.equal(u.p.overall_urgency, "none");
  const mx = (ref) => mixedLine(run([row("WBC", "7.4"), row("Neut", "60"), row("Lymph", "30"), row("Mixed", "12", "", ref), row("Hb", "14", "g/dL")], { sex: "F", age: 30 }).e);
  assert.match(mx("3-9"), /عدد بالاتر از آن بازه است/); assert.match(mx("3-9"), /\(3-9\)/);
  assert.match(mx("10-15"), /عدد داخلِ آن بازه است/);
  assert.match(mx("0-5"), /بالاتر از آن بازه/);
  // بی‌بازهٔ چاپ‌شده: هیچ جملهٔ موقعیت و هیچ عددِ ثابتِ موتور.
  assert.doesNotMatch(mx(undefined), /بازهٔ چاپ‌شده|بالاتر|پایین‌تر|داخلِ/);
});
