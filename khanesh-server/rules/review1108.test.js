// بازبینیِ ۲۰۲۶-۱۱-۰۸: فوترِ دستگاه unmapped می‌شد؛ T4 تامِ طبیعی کنار TSH بالا نادیده بود؛ ANA ۲۶ برابرِ مرز «routine» بود.
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const r = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
const run = (tests) => { const e = runEngine({ patient: { age: 35, sex: "M" }, tests }); return { e, p: runPatterns(e) }; };
const find = (p, id) => p.findings.find((f) => f.pattern === id);

test("R1: فوترِ «Analysed by … sysmex … cell counter» آزمایش نیست و unmapped نمی‌شود؛ ردیفِ عددیِ دستگاه‌دار می‌ماند", () => {
  const { e } = run([r("Hb", "15", "g/dL"), r("Analysed by flowcytometric sysmex X series cell counter", "")]);
  assert.deepEqual(e.unmapped, []);
  assert.ok(e.graded.some((g) => g.test === "HGB"));
});

test("R2: TSH بالا + T4 تامِ طبیعی، بی‌FT4 ⇒ متن T4 را نام می‌برد و «نمی‌توان گفت» نمی‌گوید", () => {
  const { p } = run([r("TSH", "6.25", "uIU/mL", "0.3-6.0"), r("T4", "6.6", "ug/dL", "5-12.6")]);
  const f = find(p, "thyroid_hypo_ft4_unmeasured");
  assert.ok(f.must_say.includes("T4 تامِ شما 6.6"));
  assert.ok(!f.must_say.includes("نمی‌توان گفت"));
  assert.equal(f.urgency, "routine");
});

test("R3: ANA عددی ≥ ۱۰× مرزِ چاپی ⇒ this_week + ارجاع به روماتولوژی؛ ۳× مرز همان routine می‌ماند", () => {
  const hi = find(run([r("ANA", "259", "U/mL", "<10")]).p, "ana_family_result");
  assert.equal(hi.urgency, "this_week");
  assert.ok(hi.suggest.includes("بررسی توسط متخصص روماتولوژی"));
  const lo = find(run([r("ANA", "30", "U/mL", "<10")]).p, "ana_family_result");
  assert.equal(lo.urgency, "routine");
});

test("R4: بندِ «در محدودهٔ طبیعی» سقف ندارد — قند و اوره حتی بعد از بیست ردیف نامشان را می‌گیرند (N4/N35)", async () => {
  const { normalRangeParagraph } = await import("./printed.js");
  const rows = Array.from({ length: 22 }, (_, i) => r(["WBC","RBC","Hb","HCT","MCV","MCH","MCHC","RDW-CV","PLT","ESR","Ferritin","Vitamin B12","Creatinine","Uric Acid","Cholesterol","Triglyceride","LDL","SGOT (AST)","SGPT (ALT)","ALP","Calcium","Sodium"][i], ({WBC:"6.8",RBC:"5.1",Hb:"15.3",HCT:"45",MCV:"90",MCH:"30",MCHC:"33","RDW-CV":"13",PLT:"245",ESR:"5",Ferritin:"90","Vitamin B12":"351",Creatinine:"0.9","Uric Acid":"6",Cholesterol:"190",Triglyceride:"120",LDL:"100","SGOT (AST)":"25","SGPT (ALT)":"30",ALP:"140",Calcium:"9.5",Sodium:"140"})[["WBC","RBC","Hb","HCT","MCV","MCH","MCHC","RDW-CV","PLT","ESR","Ferritin","Vitamin B12","Creatinine","Uric Acid","Cholesterol","Triglyceride","LDL","SGOT (AST)","SGPT (ALT)","ALP","Calcium","Sodium"][i]]));
  const { e } = run([...rows, r("FBS", "92", "mg/dL", "70-100"), r("Urea", "32", "mg/dL", "15-45")]);
  const t = normalRangeParagraph(e);
  assert.ok(t.includes("قند ناشتا") && t.includes("اوره"));
  assert.ok(!t.includes("مورد دیگر"));
});

test("R5: HbA1c ۷٫۸ + قندِ ناشتای ۱۲۴ — قند ناشتا در هر دو شاخه نام برده می‌شود و «قندِ ناشتا را بخواهید» نمی‌آید (N4/N21)", () => {
  const base = [r("HbA1c", "7.8", "%", "4-5.6"), r("FBS", "124", "mg/dL", "70-110")];
  const ok = find(run([...base, r("Hb", "15", "g/dL", "13.3-17.5"), r("MCV", "88", "fL", "80-100")]).p, "diabetes_range");
  assert.ok(ok.must_say.includes("قندِ ناشتای شما 124"));
  const bad = find(run([...base, r("Hb", "15", "g/dL", "13.3-17.5"), r("MCV", "79.4", "fL", "80-100")]).p, "a1c_diabetes_range_unreliable");
  assert.ok(bad.must_say.includes("قندِ ناشتای شما 124"));
  assert.ok(!bad.action.includes("را بخواهید"));
  const noFbs = find(run([r("HbA1c", "7.8", "%", "4-5.6"), r("MCV", "79.4", "fL", "80-100")]).p, "a1c_diabetes_range_unreliable");
  assert.ok(noFbs.action.includes("قندِ ناشتا را بخواهید"));
});

// برگهٔ واقعیِ ۱۳۹۷/۰۵/۱۴ (تصویرِ کاربر): فسفر ۵٫۱ و پتاسیم unmapped، TPO (EL) unmapped، سرتیترِ «-» unmapped، T3 nmol/L بی‌رکوردِ تبدیل.
test("R6: «P ( Phosphorus )»، «K ( Potassium )»، «TPO (EL)» نگاشت می‌شوند؛ سرتیترِ «-» نه؛ فسفرِ بالا مالک دارد؛ T3 nmol/L رکوردِ تبدیل دارد", () => {
  const { e, p } = run([
    r("C.B.C.", "-"), r("Urine Analysis", "-"), r("Urine ( Culture & Sensitivity )", "-"),
    r("P ( Phosphorus )", "5.1", "mg/dL", "2.6 - 4.5"), r("K ( Potassium )", "4.6", "mEq/L", "Adults :3.5-5.5"),
    r("TPO (EL)", "5.1", "IU/ml", "<= 40"), r("T3", "1.78", "nmol/L", "1.3 - 3.1"),
    r("P.T. ( Patient )", "15.7", "Sec", "plus minus 2 sec of control"), r("I.N.R.", "1.3", "Index", "1 - 1.3"), r("P.T.T.", "37", "Sec", "24 - 40"),
  ]);
  assert.deepEqual(e.unmapped.filter((n) => /phosph|potass|tpo|c\.b\.c|urine/i.test(n)), []);
  assert.ok(find(p, "hyperphosphatemia"), "فسفرِ بالا باید مالک داشته باشد");
  assert.ok(e.unitConversions.some((c) => c.test === "T3" && c.raw === 1.78 && c.from === "nmol/L"));
  const coag = find(p, "coagulation_abnormal");
  assert.ok(coag.must_say.includes("INR شما 1.3") && coag.must_say.includes("aPTT هم طبیعی است"));
});

test("R7: INR داخلِ بازهٔ چاپیِ آزمایشگاه ⇒ routine؛ INR بالاتر از بازهٔ چاپی هنوز this_week", () => {
  const ok = find(run([r("P.T. ( Patient )", "15.7", "Sec"), r("I.N.R.", "1.3", "Index", "1 - 1.3"), r("P.T.T.", "37", "Sec", "24 - 40")]).p, "coagulation_abnormal");
  assert.equal(ok.urgency, "routine");
  assert.ok(ok.action.startsWith("در نوبتِ عادی"));
  const hi = find(run([r("P.T. ( Patient )", "19", "Sec"), r("I.N.R.", "1.6", "Index", "1 - 1.3"), r("P.T.T.", "37", "Sec", "24 - 40")]).p, "coagulation_abnormal");
  assert.equal(hi.urgency, "this_week");
});

test("R8: اوره/BUNِ پایین قاعدهٔ خودش را دارد (نه «توضیح آماده نداریم»)؛ با ALT بالا آن را نام می‌برد؛ اورهٔ طبیعی ساکت", () => {
  const { p } = run([r("Urea", "14", "mg/dL", "18 - 55"), r("ALT", "50", "U/L", "<41")]);
  const f = find(p, "urea_low");
  assert.equal(f.urgency, "routine");
  assert.ok(f.must_say.includes("14") && f.must_say.includes("ALT"));
  assert.ok(!find(p, "unexplained_abnormal"));
  assert.ok(!find(run([r("Urea", "30", "mg/dL", "18 - 55")]).p, "urea_low"));
});

test("R9: RDW بالا کنار گلبولِ کوچک نام برده می‌شود و در «توضیح آماده نداریم» نمی‌افتد", () => {
  const { p } = run([r("Hb", "15", "g/dL", "13 - 18"), r("MCV", "79.4", "fL", "80 - 100"), r("RDW-CV", "15.1", "%", "10.5 - 14.6")]);
  assert.ok(find(p, "microcytosis_no_anemia").must_say.includes("RDW-CV شما 15.1"));
  assert.ok(!(find(p, "unexplained_abnormal")?.must_say ?? "").includes("RDW"));
});
