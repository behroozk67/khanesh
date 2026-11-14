// P148 (۲۰۲۶-۱۱-۱۴، تصمیمِ کاربر): تستِ استرسِ «زنِ ۳۴ ساله — گریوز». برگه همان است که روی سرور تفسیر شد (نام‌ها و بازه‌های
//   چاپ‌شده عیناً). هر آزمون روی HEAD ِ e550656 قرمز بود.
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { buildEngineRecommendations } from "./prompt.js";
import { GroupedText } from "./groups.js";
import { getRef } from "./refs.js";

const T = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
const GRAVES = [
  T("TSH (ECL)", "0.015", "mIU/L", "0.35 - 4.94"), T("Free T4 (FT4)", "3.4", "ng/dL", "0.70 - 1.48"), T("Free T3 (FT3)", "11.2", "pg/mL", "1.71 - 3.71"),
  T("Anti-TPO", "420", "IU/mL", "Up to 34"), T("Anti-Thyroglobulin", "310", "IU/mL", "Up to 115"), T("TRAb (TSH Receptor Ab)", "8.5", "IU/L", "Negative < 1.75"),
  T("FBS", "106", "mg/dL", "70 - 100"), T("Chol", "122", "mg/dL", "140 - 200"), T("LDL", "64", "mg/dL", "Up to 130"),
  T("SGOT (AST)", "48", "U/L", "Up to 31"), T("SGPT (ALT)", "56", "U/L", "Up to 31"), T("Alk.P", "345", "U/L", "64 - 306"),
  T("Total Bilirubin", "1.1", "mg/dL", "0.1 - 1.2"), T("Calcium", "10.6", "mg/dL", "8.5 - 10.2"), T("Serum Albumin", "3.7", "g/dL", "3.5 - 5.2"),
  T("W.B.C", "3.8", "10^3/uL", "4.0 - 11.0"), T("Hemoglobin", "11.6", "g/dL", "12.0 - 16.0"), T("M.C.V", "76.5", "fL", "80.0 - 100.0"),
  T("Platelets", "195", "10^3/uL", "150 - 450"),
];
const F34 = { age: 34, sex: "F" };
const run = (tests, patient = F34) => { const e = runEngine({ tests, patient }); const p = runPatterns(e); return { e, p, recs: buildEngineRecommendations(p, e) }; };
const byId = (p, id) => p.findings.find((f) => f.rule_id === id);
const swap = (rows, name, patch) => rows.map((r) => (r.name === name ? { ...r, ...patch } : r));
const drop = (rows, ...names) => rows.filter((r) => !names.includes(r.name));
// بی‌پرکاری: TSH و FT4 و FT3 طبیعی، آنتی‌بادی‌ها حذف
const EUTHYROID = drop(swap(swap(swap(GRAVES, "TSH (ECL)", { value: "1.2" }), "Free T4 (FT4)", { value: "1.1" }), "Free T3 (FT3)", { value: "3.0" }),
  "Anti-TPO", "Anti-Thyroglobulin", "TRAb (TSH Receptor Ab)");

test("P148-1: «TRAb (TSH Receptor Ab)» خوانده و تفسیر می‌شود و دوباره درخواست نمی‌شود؛ «X (Y)» فقط وقتی هر دو یک کلید بدهند", () => {
  const { e, p, recs } = run(GRAVES);
  assert.ok(!e.unmapped.includes("TRAb (TSH Receptor Ab)"));
  assert.equal(e.ungraded?.TRAB?.state, "above");
  assert.match(byId(p, "thyroid").must_say, /TRAb\/TSI\) 8\.5 IU\/L/);
  assert.ok(!recs.some((r) => /TRAb/.test(r)), recs.join(" | "));
  const anti = run(swap(GRAVES, "Anti-Thyroglobulin", { name: "Anti-Thyroglobulin (Anti-Tg)" })).e;
  assert.equal(anti.ungraded?.ANTI_TG?.state, "above");
  const mixed = run(swap(GRAVES, "TRAb (TSH Receptor Ab)", { name: "TRAb (Anti-Tg)" })).e;
  assert.ok(!mixed.ungraded?.TRAB && mixed.unmapped.includes("TRAb (Anti-Tg)"), "دو کلیدِ متفاوت در دو طرفِ پرانتز ⇒ هیچ‌کدام");
});

test("P148-2: پرکاری — FT3 و TPO با عدد؛ بی‌«هاشیموتو»؛ FT4 با بازهٔ همان برگه، مثلِ TSH", () => {
  const t = byId(run(GRAVES).p, "thyroid").must_say;
  assert.match(t, /FT3 هم بالاست \(11\.2؛/);
  assert.match(t, /آنتی‌بادی TPO هم بالاست \(420؛/);
  assert.doesNotMatch(t, /هاشیموتو/);
  assert.match(t, /Anti-Tg\)[^.]*310[^]*در بیماری گریوز هم شایع است/);
  assert.match(t, /TSH شما 0\.015 است \(حد طبیعی 0\.35–4\.94\)/);
  assert.match(t, /FT4 بالاست \(3\.4؛ حد طبیعی 0\.7–1\.48\)/);
});

test("P148-3 (ATA 2016 ۱۵/۱۶): پرکاریِ آشکار + WBC/آنزیمِ غیرطبیعی ⇒ جملهٔ پایه پیش از داروی ضدتیروئید؛ تب/گلودرد در هشدار", () => {
  const f = byId(run(GRAVES).p, "thyroid");
  assert.match(f.must_say, /پیش از درمان مبنای مقایسه است/);
  assert.match(f.must_say, /شمارشِ گلبول سفید و آنزیم‌های کبد/);
  assert.ok(f.warnings.some((w) => /تب یا گلودرد/.test(w)));
  // بی WBC/آنزیمِ غیرطبیعی ⇒ جملهٔ پایه نیست (هشدارِ تب می‌ماند)
  const clean = swap(swap(swap(swap(GRAVES, "W.B.C", { value: "6" }), "SGOT (AST)", { value: "20" }), "SGPT (ALT)", { value: "20" }), "Alk.P", { value: "100" });
  const g = byId(run(clean).p, "thyroid");
  assert.doesNotMatch(g.must_say, /پیش از درمان مبنای مقایسه/);
  assert.ok(g.warnings.some((w) => /تب یا گلودرد/.test(w)));
});

test("P148-4: کلسیم با آلبومینِ طبیعی (۳٫۷) تصحیح نمی‌شود؛ زیرِ ۳٫۵ عددِ برگه اول و تصحیح‌شده «برآورد»", () => {
  const { e, p } = run(GRAVES);
  assert.ok(!e.indices.ca_correction_applied);
  assert.equal(e.graded.find((g) => g.test === "CA").value, 10.6);
  assert.match(byId(p, "calcium_abnormal").must_say, /^کلسیم خون شما 10\.6/);
  const low = run(swap(EUTHYROID, "Serum Albumin", { value: "2.9" }));
  const ca = byId(low.p, "calcium_abnormal").must_say;
  assert.match(ca, /^کلسیمِ روی برگهٔ شما 10\.6 است؛ چون آلبومینِ شما پایین است، کلسیمِ مؤثر حدود 11\.8/);
  assert.match(ca, /برآورد می‌شود/);
  assert.doesNotMatch(ca, /\(این مقدار با آلبومین تصحیح شده/);
});

test("P148-5: جملهٔ پرانتزی در GroupedText به پاراگرافِ گروهِ دیگر نمی‌رود", () => {
  const F = [{ rule_id: "liver_pattern", must_say: "x" }, { rule_id: "calcium_abnormal", must_say: "y" }];
  const gt = new GroupedText(F).fromModel([
    { group: "liver", text: "کبد متن." },
    { group: "mineral", text: "کلسیم خون شما 11.2 است. (این مقدار با آلبومین تصحیح شده؛ اندازه‌گیری‌شده روی برگه 10.6.)" },
  ]);
  const [liver, mineral] = gt.render().split("\n\n");
  assert.equal(liver, "کبد متن.");
  assert.match(mineral, /10\.6\.\)$/);
  assert.equal(gt.meta.relocated, 0);
});

test("P148-6: کبد کنارِ پرکاری — بی «بیش از دو برابر» (ALT ۱٫۷×)، بی «مسیرِ صفرا»/سونوگرافی/هشدارِ الکل؛ GGT می‌ماند", () => {
  const { p } = run(GRAVES);
  const f = byId(p, "liver_pattern");
  assert.doesNotMatch(f.must_say, /بیش از دو برابر/);
  assert.doesNotMatch(f.must_say, /مسیر خروج صفرا/);
  assert.match(f.must_say, /آلکالن فسفاتاز \(از استخوان، نه از کبد\)/);
  assert.deepEqual(f.suggest, ["GGT"]);
  assert.deepEqual(f.warnings, []);
  // بی‌پرکاری: همان متنِ صفراوی، ولی «بیش از دو برابر» باز هم نه (ALT < ۲×)
  const g = byId(run(EUTHYROID).p, "liver_pattern");
  assert.match(g.must_say, /مسیر خروج صفرا/);
  assert.doesNotMatch(g.must_say, /بیش از دو برابر/);
  assert.ok(g.suggest.includes("سونوگرافی شکم"));
  // ALT ≥ ۲× ⇒ جملهٔ «بیش از دو برابر» برمی‌گردد و زمینهٔ تیروئید نمی‌آید
  const h = byId(run(swap(GRAVES, "SGPT (ALT)", { value: "90" })).p, "liver_pattern");
  assert.match(h.must_say, /بیش از دو برابر/);
  assert.doesNotMatch(h.must_say, /پرکاری تیروئید/);
});

test("P148-7: کلسیمِ < ۱۱ و قندِ پیش‌دیابت و WBC ≥ ۳ کنارِ پرکاری ⇒ زمینهٔ تیروئید؛ بی‌پرکاری متنِ قبلی", () => {
  const { p } = run(GRAVES);
  assert.match(byId(p, "calcium_abnormal").must_say, /گردشِ استخوان[^]*پرکاریِ غدهٔ پاراتیروئید باید بررسی شود/);
  assert.ok(byId(p, "calcium_abnormal").suggest.includes("هورمون پاراتیروئید (PTH)"));
  const w = byId(p, "leukopenia").must_say;
  assert.doesNotMatch(w, /مغز استخوان/);
  assert.match(w, /بیماری گریوز، کاهشِ خفیفِ گلبول سفید شایع/);
  assert.match(byId(p, "glycemia").must_say, /قضاوتِ نهایی دربارهٔ قند پس از کنترلِ تیروئید/);
  const q = run(EUTHYROID).p;
  assert.match(byId(q, "leukopenia").must_say, /مغز استخوان/);
  assert.match(byId(q, "calcium_abnormal").must_say, /شایع‌ترین علت‌های کلسیم بالا پرکاری غدهٔ پاراتیروئید/);
  // نوتروفیلِ < ۱۵۰۰ ⇒ جملهٔ مغز استخوان می‌ماند
  const n = byId(run([...GRAVES, T("Neutrophils", "1.2", "10^3/uL")]).p, "leukopenia").must_say;
  assert.match(n, /مغز استخوان/);
});

test("P148-8: قندِ ناشتای ۱۰۶ — عدد در متن؛ جدول «بالا» (۷۰–۹۹)، نه در فهرستِ طبیعی؛ FBS ۱۰۰ هم بالا", () => {
  const { e, p } = run(EUTHYROID);
  assert.match(byId(p, "glycemia").must_say, /^قندِ ناشتای شما 106 است\. این در محدودهٔ «پیش‌دیابت» است/);
  const g = e.graded.find((x) => x.test === "GLU_F");
  assert.equal(g.abnormal, true);
  assert.equal(g.dir, "high");
  assert.deepEqual(getRef("GLU_F", "F", 34), [70, 99]);
  const e100 = run(swap(EUTHYROID, "FBS", { value: "100" })).e;
  assert.equal(e100.graded.find((x) => x.test === "GLU_F").dir, "high");
  assert.ok(!e100.uncovered?.includes?.("GLU_F"));
});

test("P148-9: کم‌خونیِ میکروسیتیکِ زنِ ۳۴ ساله — قاعدگی و تالاسمی؛ بی FOBT؛ مردِ ۳۴ ساله همان متنِ قبلی", () => {
  const { p } = run(EUTHYROID);
  const f = byId(p, "microcytic_anemia");
  assert.match(f.must_say, /خونریزیِ ماهانه/);
  assert.match(f.must_say, /تالاسمیِ مینور هم شایع است/);
  assert.ok(!f.suggest.some((s) => /FOBT/.test(s)), f.suggest.join(" | "));
  assert.doesNotMatch(f.action, /خونریزی پنهان گوارشی/);
  assert.match(byId(run(GRAVES).p, "microcytic_anemia").must_say, /پرکاری تیروئید \(که روی همین برگه هست\) هم ممکن است اندازهٔ گلبول‌ها/);
  const m = byId(run(swap(EUTHYROID, "Hemoglobin", { value: "12.8" }), { age: 34, sex: "M" }).p, "microcytic_anemia");
  assert.doesNotMatch(m.must_say, /خونریزیِ ماهانه/);
  assert.ok(m.suggest.some((s) => /FOBT/.test(s)));
  const w47 = byId(run(EUTHYROID, { age: 47, sex: "F" }).p, "microcytic_anemia");
  assert.ok(w47.suggest.some((s) => /FOBT/.test(s)), "از ۴۵ سالگی FOBT می‌ماند");
});

// ── بازبینیِ advisor روی eafda2f (هر کدام روی eafda2f قرمز) ──
const OVER = [T("TSH", "0.05", "mIU/L"), T("FT4", "2.4", "ng/dL"), T("WBC", "3.5", "10^3/uL"), T("ALT", "50", "U/L"), T("Calcium", "10.5", "mg/dL"),
  T("FBS", "105", "mg/dL"), T("Hb", "11.5", "g/dL"), T("MCV", "76", "fL")];
const allText = (p) => p.findings.map((f) => [f.must_say, f.action, ...(f.warnings ?? [])].join(" ")).join(" ");

test("P148-10: نوتروفیلِ ۱۷۱۰ (پایین درجه‌خورده) کنارِ پرکاری ⇒ «در محدودهٔ طبیعی» گفته نمی‌شود", () => {
  const w = byId(run([...GRAVES, T("Neut", "45", "%")]).p, "leukopenia").must_say;
  assert.doesNotMatch(w, /در محدودهٔ طبیعی/);
  assert.match(w, /بیماری گریوز، کاهشِ خفیفِ گلبول سفید شایع/);
  assert.match(w, /1710|٪45/, "عددِ نوتروفیل باید بیاید");
});

test("P148-11 (N58): کم‌کاریِ ثبت‌شده یا زمینهٔ سرطان با TSH پایین + FT4 بالا ⇒ نه «گریوز»، نه «پس از کنترلِ تیروئید»، نه جملهٔ داروی ضدتیروئید", () => {
  for (const patient of [{ age: 50, sex: "F", conditions: ["hypothyroid"] }, { age: 45, sex: "F", conditions: ["cancer"] }]) {
    const t = allText(run(OVER, patient).p);
    assert.doesNotMatch(t, /به‌ویژه بیماری گریوز|پس از کنترلِ تیروئید|داروی ضدتیروئید|که روی همین برگه هست/, JSON.stringify(patient));
  }
  assert.match(allText(run(OVER, { age: 50, sex: "F" }).p), /پس از کنترلِ تیروئید/, "بی‌سابقه، زمینهٔ پرکاری می‌آید");
});

test("P148-12: بارداری ⇒ بی «متی‌مازول» (PTU در سه‌ماههٔ اول) و بی «خونریزیِ ماهانه»", () => {
  const PG = { age: 30, sex: "F", pregnant: true };
  const t = allText(run(GRAVES, PG).p);
  assert.match(t, /داروی ضدتیروئید/);
  assert.doesNotMatch(t, /متی‌مازول|خونریزیِ ماهانه|قاعدگیِ پرحجم/);
  const ida = byId(run(swap(EUTHYROID, "Hemoglobin", { value: "9.5" }), PG).p, "microcytic_anemia");
  assert.ok(ida, "کم‌خونیِ میکروسیتیک در بارداری یافته دارد");
  assert.doesNotMatch(ida.must_say + ida.action, /خونریزیِ ماهانه|قاعدگیِ پرحجم/);
});

test("P148-13: ALT 50 + ALP 700 (۲٫۳×) ⇒ «بیش از دو برابر … منتظرِ آزمایشِ بعدی نمانید» می‌ماند", () => {
  const f = byId(run([T("ALT", "50", "U/L"), T("ALP", "700", "U/L")], { age: 50, sex: "M" }).p, "liver_pattern");
  assert.match(f.must_say, /بیش از دو برابرِ حدِ بالای طبیعی است و مرزی نیست/);
});

test("P148-14: محورِ PTH با آلبومینِ ۳٫۰ ⇒ عددِ برگه صریح و تصحیح‌شده «برآورد»؛ بی پرانتزِ آخر", () => {
  const f = byId(run([T("Calcium", "10.6", "mg/dL"), T("Albumin", "3.0", "g/dL"), T("PTH", "120", "pg/mL")], { age: 50, sex: "F" }).p, "hpt_primary");
  assert.match(f.must_say, /کلسیمِ روی برگهٔ شما 10\.6 است؛ 11\.7 برآوردِ آن/);
  assert.doesNotMatch(f.must_say, /\(این مقدار با آلبومین/);
});

test("P148-15: دو آزمایشِ قند در محدودهٔ پیش‌دیابت ⇒ «این عددها … هستند»", () => {
  const f = byId(run([T("FBS", "110", "mg/dL"), T("2hpp", "150", "mg/dL")], { age: 40, sex: "M" }).p, "glycemia");
  assert.match(f.must_say, /این عددها در محدودهٔ «پیش‌دیابت» هستند/);
});

test("P148-16 (BSG 2021 توصیهٔ ۲۵): زنِ جوان با کمبودِ آهنِ تأییدشده ⇒ سرولوژیِ سلیاک؛ بی‌فریتین یا مرد ⇒ نه", () => {
  const ida = [T("Hb", "9.5", "g/dL"), T("MCV", "70", "fL"), T("Ferritin", "6", "ng/mL")];
  const tt = (rows, patient) => byId(run(rows, patient).p, "microcytic_anemia").suggest.includes("آنتی‌بادی tTG-IgA (سلیاک)");
  assert.ok(tt(ida, { age: 30, sex: "F" }));
  assert.ok(!tt(ida.slice(0, 2), { age: 30, sex: "F" }), "بی‌فریتین کمبودِ آهن تأیید نشده");
  assert.ok(!tt(swap(ida, "Hb", { value: "11" }), { age: 40, sex: "M" }));
  const { recs } = run(ida, { age: 30, sex: "F" });
  assert.ok(recs.some((r) => /tTG-IgA \(سلیاک\)/.test(r)), recs.join(" | "));
  assert.ok(!run([...ida, T("tTG IgA", "2", "U/mL", "<10")], { age: 30, sex: "F" }).recs.some((r) => /tTG-IgA \(سلیاک\)/.test(r)), "اندازه‌گیری‌شده دوباره درخواست نمی‌شود");
});
