// P146 (۲۰۲۶-۱۱-۱۳، درخواستِ کاربر): برگهٔ کودکِ ۷ سالهٔ بستری در بخشِ کودکان + گزارشِ بازبینِ بیرونی (پروندهٔ ۱۱).
//   هر آزمون روی HEAD ِ ada0266 قرمز بود، مگر آنچه «قفل» نوشته شده.
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { buildEngineRecommendations } from "./prompt.js";

const T = (name, value, unit, reference) => ({ name, value, ...(unit ? { unit } : {}), ...(reference ? { reference } : {}) });
// برگهٔ واقعی (بی‌نام): بیوشیمی + CBC + کامل ادرار
const CHILD_SHEET = [
  T("Blood Sugar", "98", "mg/dl", "70-140"), T("urea", "27", "mg/dl", "15 - 45"), T("Creatinine", "0.61", "mg%", "normal 0.5 - 1.5"),
  T("Serum Ca", "8.7", "mg/dl", "8.6-10.3"), T("Serum Na", "133", "meq/l", "135-145"), T("Serum K", "4.23", "meq/l", "3.5-5"),
  T("AST", "76", "u/l", "F:<=31:M:<=37"), T("ALT", "21", "U/L"), T("Alk. P", "433", "U/L", "F:64-306:M:80-306"),
  T("CPK *", "1831", "U/L", "F:<=143:M:<=171"), T("LDH", "588", "iu/l", "235-470"), T("serum p", "5.0", "mg/dl", "Adults: 2.6-4.5"),
  T("W.B.C", "4.6", "x1000/mm³", "5 - 10"), T("R.B.C", "5.45", "Mill/mm³", "4.5 - 6"), T("Hb", "14", "gm/dl", "14 - 18"),
  T("Hct", "42.7", "%", "39 - 52"), T("M.C.V", "78", "fl", "80 - 96"), T("M.C.H", "26", "Pgm", "26 - 34"), T("M.C.H.C", "33", "gr/dl", "32 - 36"),
  T("Platelet", "130", "x1000/mm³", "150 - 450"), T("Neut", "70", "%", "45 - 75"), T("Lymph", "30", "%", "20 - 45"),
  T("Color", "Yellow"), T("Appearance", "Clear"), T("PH", "Acid"), T("Sp.Gravity", "1.015"), T("Protein", "negative"),
  T("Blood/Hb", "Trace"), T("Glucose", "negative"), T("Urobilinogen", "negative"), T("Bilirubin", "negative"), T("Nitrite", "Negative"),
  T("Ketone", "1+"), T("Leuko estr", "negative"), T("WBC", "3-4", "/HPF"), T("RBC", "4-5", "/HPF"),
];
const WARD7 = { age: 7, conditions: ["hospitalized"] };
const run = (tests, patient) => { const e = runEngine({ tests, patient }); return { e, p: runPatterns(e) }; };
const byId = (p, id) => p.findings.find((f) => f.rule_id === id);

test("P146-1: «Blood/Hb: Trace» نوارِ ادرار است، نه «تفسیر نشدند»؛ عددِ «Blood Hb 13 g/dL» به خونِ ادرار نمی‌رود", () => {
  const { e } = run(CHILD_SHEET, WARD7);
  assert.equal(e.qual["Urine Blood"], "Trace");
  assert.ok(!e.unmapped.includes("Blood/Hb"), e.unmapped.join(","));
  // قفل (N2): مقدارِ عددی از شاخهٔ نوار رد می‌شود
  const n = runEngine({ tests: [T("Blood Hb", "13", "g/dL"), T("MCV", "88", "fL")], patient: { age: 40, sex: "M" } });
  assert.equal(n.qual?.["Urine Blood"], undefined);
});

test("P146-2: خونِ ادرار — قاعدگی برای کودکِ ۷ ساله و مرد گفته نمی‌شود؛ زنِ ۳۰ ساله و بزرگسالِ بی‌جنس همان متن", () => {
  const ua = [T("Specific Gravity", "1.020"), T("Nitrite", "Negative"), T("Urobilinogen", "Normal"), T("Blood", "+2"), T("RBC", "20-30", "/hpf")];
  const hem = (patient) => byId(run(ua, patient).p, "hematuria_pattern");
  for (const pt of [{ age: 7 }, { age: 40, sex: "M" }, WARD7]) {
    const f = hem(pt);
    assert.doesNotMatch(f.must_say + f.suggest.join(" "), /قاعدگی/, JSON.stringify(pt));
    assert.ok(f.suggest.includes("تکرار آزمایش ادرار"), f.suggest.join(" | "));
  }
  for (const pt of [{ age: 30, sex: "F" }, { age: 40 }]) {
    const f = hem(pt);
    assert.match(f.must_say, /در دوره‌ی قاعدگی نمونه آلوده می‌شود/, JSON.stringify(pt));
    assert.ok(f.suggest.includes("تکرار آزمایش ادرار (در خانم‌ها بهتر است خارج از دوره قاعدگی)"));
  }
});

test("P146-3: کاهشِ خفیفِ گلبولِ سفید ⇒ «مغز استخوان» فقط شرطیِ ماندگاری، نه گزینهٔ هم‌وزنِ «موقت»", () => {
  const f = byId(run(CHILD_SHEET, WARD7).p, "leukopenia");
  assert.doesNotMatch(f.must_say, /یا نیاز به بررسی مغز استخوان داشته باشد/);
  assert.match(f.must_say, /اگر در تکرار هم پایین بماند، پزشک بررسی‌های بیشتری انجام می‌دهد/);
});

test("P146-4: بستری — جملهٔ عواملِ بخش برای هر آزمایش یک بار؛ کودک ⇒ «فرزندتان … بستری است»", () => {
  const { p } = run(CHILD_SHEET, WARD7);
  const all = p.findings.map((f) => f.must_say).join("\n");
  assert.doesNotMatch(all, /بستری هستید/);
  const marks = p.findings.filter((f) => /چون فرزندتان در بیمارستان بستری است/.test(f.must_say));
  assert.ok(marks.length >= 1);
  for (const k of ["AST \\(آنزیم کبدی\\):", "CK \\(کراتین کیناز\\):", "پلاکت:"]) {
    assert.ok(p.findings.filter((f) => new RegExp(k).test(f.must_say)).length <= 1, k);
  }
  // بزرگسال همان جملهٔ «شما»
  const a = run([T("ALT", "120", "U/L"), T("PLT", "120")], { age: 40, sex: "M", conditions: ["hospitalized"] }).p;
  assert.ok(a.findings.some((f) => /چون در بیمارستان بستری هستید/.test(f.must_say)));
});

test("P146-5: بستری — «با پزشک مطرح کنید تا علت بررسی شود» کنارِ «در ویزیتِ بعدیِ پزشکِ معالج» تکرار نمی‌شود؛ جملهٔ شرطی می‌ماند", () => {
  const { p } = run(CHILD_SHEET, WARD7);
  for (const f of p.findings) assert.doesNotMatch(f.action ?? "", /^.*ویزیتِ بعدی.*با پزشک مطرح کنید تا علت/, f.rule_id);
  assert.match(byId(p, "ketonuria_pattern").action, /اگر ناشتا نبوده‌اید/);
});

test("P146-6: کودک — «اگر ورزش سنگین کرده‌اید» خطاب به والد ⇒ «اگر فرزندتان …»", () => {
  const { p } = run(CHILD_SHEET, WARD7);
  const acts = p.findings.map((f) => f.action ?? "").join(" ");
  assert.doesNotMatch(acts, /ورزش سنگین کرده‌اید/);
  assert.match(acts, /اگر فرزندتان ورزش یا فعالیتِ بدنیِ سنگین داشته/);
});

test("P146-7: لنفوپنی — «پایین‌تر از حد طبیعی است» دو بار پشتِ سرِ هم نمی‌آید", () => {
  const f = byId(run(CHILD_SHEET, WARD7).p, "lymphopenia");
  assert.equal((f.must_say.match(/پایین‌تر از حد طبیعی است/g) ?? []).length, 1, f.must_say);
});

test("P146-8: کلسیمِ خفیف (درجهٔ ۱) ⇒ بی «بی‌نظمی ضربان قلب»؛ کلسیمِ ۷٫۵ (درجهٔ ۲) همان جمله", () => {
  const ca = (v, patient) => byId(run([T("Calcium", v, "mg/dL")], patient).p, "calcium_abnormal");
  const mild = byId(run(CHILD_SHEET, WARD7).p, "calcium_abnormal");
  assert.doesNotMatch(mild.must_say, /بی‌نظمی ضربان قلب/);
  assert.match(mild.must_say, /این تغییرِ خفیف معمولاً علامتی ایجاد نمی‌کند/);
  assert.match(ca("7.5", { age: 40, sex: "M" }).must_say, /بی‌نظمی ضربان قلب/);
});

test("P146-9: «آزمایش کامل ادرار» وقتی کاملِ ادرار روی همین برگه است پیشنهاد نمی‌شود؛ بی‌ادرار همان پیشنهاد", () => {
  const { p, e } = run(CHILD_SHEET, WARD7);
  assert.ok(!p.findings.some((f) => (f.suggest ?? []).includes("آزمایش کامل ادرار")));
  assert.ok(!buildEngineRecommendations(p, e).some((r) => /آزمایش کامل ادرار/.test(r)));
  const noUa = CHILD_SHEET.filter((t) => !/Color|Appearance|PH|Gravity|Protein|Blood\/Hb|Glucose|Urobilinogen|Bilirubin|Nitrite|Ketone|Leuko|\/HPF/.test(t.name + (t.unit ?? "")));
  const q = run(noUa, WARD7).p;
  assert.ok(q.findings.some((f) => (f.suggest ?? []).includes("آزمایش کامل ادرار")), "قفل: بی‌ادرار پیشنهاد می‌ماند");
});
