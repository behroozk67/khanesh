// P149 (۲۰۲۶-۱۱-۱۴، تصمیمِ کاربر): تستِ استرسِ «زنِ ۲۶ ساله — شعلهٔ لوپوس»، با نام‌ها و بازه‌های چاپ‌شدهٔ همان برگه‌ای که روی سرور
//   تفسیر شد. P147 روی برگهٔ ساختگی («Protein»، «ANA») سبز بود و روی نام‌های واقعی هرگز فعال نشد (N56). هر آزمون روی 0ed4d65 قرمز بود.
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { buildEngineRecommendations } from "./prompt.js";
import { readAutoValue } from "./serology.js";

const T = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
const SLE = [
  T("ANA (CL)", "1:640", "Titer", "Negative < 1:80"), T("Anti-dsDNA", "145.0", "IU/mL", "Negative < 20"),
  T("C3 Complement", "52", "mg/dL", "90 - 180"), T("C4 Complement", "7", "mg/dL", "10 - 40"),
  T("RF", "38", "IU/mL", "Up to 14"), T("Anti-CCP", "3.2", "U/mL", "< 17"),
  T("W.B.C", "3.1", "10^3/uL", "4.0 - 11.0"), T("Lymphocyte %", "16.0", "%", "20 - 45"), T("Hemoglobin", "9.4", "g/dL", "12.0 - 16.0"),
  T("M.C.V", "103.5", "fL", "80.0 - 100.0"), T("Platelets", "98", "10^3/uL", "150 - 450"), T("E.S.R 1st hr", "78", "mm/hr", "0 - 20"),
  T("CRP", "6.5", "mg/L", "0 - 5.0"), T("LDH", "490", "U/L", "Up to 250"), T("Bilirubin Total", "2.4", "mg/dL", "0.1 - 1.2"),
  T("Bilirubin Direct", "0.4", "mg/dL", "<= 0.3"), T("Creatinine", "1.45", "mg/dL", "0.5 - 1.1"), T("Serum Albumin", "2.9", "g/dL", "3.5 - 5.2"),
  T("Protein (Urine)", "3+", null, "Negative"), T("Blood/Hb (Urine)", "3+", null, "Negative"),
  T("RBC/hpf (Urine)", "25-30", "/hpf", "0 - 2"), T("Casts (Urine)", "RBC Casts 2-3", "/lpf", "Negative"),
];
const F26 = { age: 26, sex: "F" };
const run = (tests, patient = F26) => { const e = runEngine({ tests, patient }); const p = runPatterns(e); return { e, p, recs: buildEngineRecommendations(p, e) }; };
const ids = (p) => p.findings.map((f) => f.rule_id);
const byId = (p, id) => p.findings.find((f) => f.rule_id === id);
const all = (p) => p.findings.map((f) => f.must_say).join(" ");

test("P149-1: «Protein (Urine)» و «Blood/Hb (Urine)» با مقدارِ نواری ادرار خوانده می‌شوند؛ عدد همان مسیرِ قبلی را می‌رود", () => {
  const { e } = run(SLE);
  assert.equal(e.qual["Urine Protein"], "3+");
  assert.equal(e.qual["Urine Blood"], "3+");
  assert.ok(!e.unmapped.includes("Protein (Urine)") && !e.unmapped.includes("Blood/Hb (Urine)"), JSON.stringify(e.unmapped));
  // عدد («15 mg/dL») پدِ نوار نیست — با «Urine Protein»ِ نواری قاطی نمی‌شود.
  const n = runEngine({ tests: [T("Protein (Urine)", "15", "mg/dL")], patient: F26 });
  assert.equal(n.qual["Urine Protein"], undefined);
});

test("P149-2: «ANA (CL)» با تیترِ 1:640 مثبت خوانده می‌شود و «ANA روی این برگه نیست» گفته نمی‌شود", () => {
  const { p } = run(SLE);
  const ana = byId(p, "ana_family_result").must_say;
  assert.match(ana, /1:640/);
  assert.doesNotMatch(ana, /ANA روی این برگه نیست/);
  assert.ok(ids(p).includes("lupus_activity_link"), ids(p).join(","));
});

test("P149-3: «1:640 Titer» (واحد در مقدار) همان تیترِ برهنه است", () => {
  assert.deepEqual([readAutoValue("1:640 Titer", "ANA").state, readAutoValue("1:640 Titer", "ANA").titre], ["pos", 640]);
  assert.equal(readAutoValue("1:40 titre", "ANA").state, "neg");
  const { p } = run(SLE.map((r) => (r.name === "ANA (CL)" ? T("ANA (CL)", "1:640 Titer", null, "Negative < 1:80") : r)));
  assert.doesNotMatch(all(p), /1 :640/);
});

test("P149-4: برگهٔ لوپوس — گلومرولونفریت و نفروتیک می‌آیند؛ «مزمن کبد» و «اگر در ادرار نشانه‌ای نباشد» نه", () => {
  const { p } = run(SLE);
  for (const id of ["glomerulonephritis_pattern", "nephrotic_pattern"]) assert.ok(ids(p).includes(id), `${id}: ${ids(p).join(",")}`);
  for (const id of ["cirrhosis_pattern", "kidney"]) assert.ok(!ids(p).includes(id), `${id} ماند`);
  assert.doesNotMatch(all(p), /اگر در آزمایش ادرار نشانه‌ای/);
  assert.equal(p.overall_urgency, "soon");
});

test("P149-5: کنارِ کم‌خونیِ احتمالاً همولیتیک، ژیلبرِ «بی‌خطرترین … شمارش خون طبیعی باشد» گفته نمی‌شود و CBC دوباره خواسته نمی‌شود", () => {
  const { p, recs } = run(SLE);
  const b = byId(p, "bilirubin_pattern");
  assert.doesNotMatch(b.must_say, /ژیلبر/);
  assert.match(b.must_say, /همولیز/);
  assert.ok(!recs.some((r) => /شمارش خون \(CBC\)/.test(r)), recs.join("\n"));
});

test("P149-6: ژیلبر — «آنزیم‌های کبدی طبیعی‌اند» فقط وقتی ALT/AST روی برگه است؛ CBCِ همین برگه فقط رتیکولوسیت می‌خواهد", () => {
  const BILI = [T("Total Bilirubin", "2.0", "mg/dL"), T("Direct Bilirubin", "0.3", "mg/dL")];
  const a = byId(run(BILI, { age: 30, sex: "M" }).p, "bilirubin_pattern");
  assert.match(a.must_say, /ALT و AST\) روی این برگه نیستند/);
  const b = run([...BILI, T("ALT", "20", "U/L"), T("Hemoglobin", "15", "g/dL")], { age: 30, sex: "M" });
  const bf = byId(b.p, "bilirubin_pattern");
  assert.match(bf.must_say, /وقتی آنزیم‌های کبدی طبیعی‌اند/);
  assert.match(bf.must_say, /ژیلبر/);
  assert.ok(bf.suggest.includes("رتیکولوسیت") && !bf.suggest.some((s) => /CBC/.test(s)), bf.suggest.join("|"));
});

test("P149-7: کنارِ اتصالِ لوپوس تکرارِ CRP/ESR و «چند هفته کافی است» نمی‌آید؛ بی‌لوپوس می‌ماند (کنترلِ منفی)", () => {
  const { recs } = run(SLE);
  const txt = recs.join("\n");
  assert.doesNotMatch(txt, /تکرار CRP|تکرار ESR|چند هفته کافی/);
  const plain = run([T("ESR", "40", "mm/hr"), T("CRP", "8", "mg/L")], { age: 40, sex: "F" });
  assert.match(byId(plain.p, "esr_elevated").action, /چند هفته کافی/);
  assert.ok(byId(plain.p, "crp_elevated").suggest.includes("تکرار CRP"));
  assert.ok(byId(plain.p, "esr_elevated").suggest.includes("تکرار ESR"));
});

test("P149-8: «… پس از چند هفته کافی است» زیرِ دستورِ نهاییِ ۲۴–۴۸ ساعت می‌رود، زیرِ «این هفته» می‌ماند", () => {
  const WAIT = { urgency: "routine", action: "با پزشک مطرح کنید. اگر علامتی ندارید، معمولاً تکرارِ آزمایش پس از چند هفته کافی است." };
  const rec = (urgency, action) => buildEngineRecommendations({ findings: [{ urgency, action }, WAIT] }, { graded: [] }).join(" | ");
  assert.doesNotMatch(rec("soon", "ظرف ۲۴ تا ۴۸ ساعتِ آینده با پزشک مراجعه کنید."), /چند هفته/);
  assert.match(rec("this_week", "این هفته با پزشک وقت بگیرید."), /چند هفته کافی/);
});
