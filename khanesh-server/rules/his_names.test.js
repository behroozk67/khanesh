// ============================================================
// his_names.test.js — برگهٔ واقعیِ HIS بیمارستان (۲۰۲۶-۱۱-۱۱، P137)
// ------------------------------------------------------------
// 🔴 پیش از این تغییر (HEAD 8876170، اندازه‌گیری‌شده):
//    - «LDH 338، Adult : <65year: up to 480 u/l >65year:up to 530 u/l» خوانده نمی‌شد ⇒ بازهٔ موتور ۱۰۰–۲۵۰ ⇒ «بالا»،
//      یافتهٔ isolated_ldh_elevation با توصیهٔ هاپتوگلوبین/رتیکولوسیت/بیلی‌روبین و امتیازِ خون‌سازی ۸۵ (بدترین = LDH).
//    - «Hb 12.2 %g» با مرجعِ چهارباندیِ «Male/Female/Children/newborn» ⇒ unit_unknown («دربارهٔ آن قضاوت نمی‌کنیم»).
//    - «اندازه گیری کمی اوره خون/سرم/ پلاسما» و «(ALP (ALK» ⇒ unmapped.
//    - «female : 0 .6-1.3» (فاصلهٔ OCR پیش از ممیز) و «تا 480» ⇒ بازهٔ چاپی خوانده نمی‌شد.
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine, NAME_MAP, stripHisAffixes } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { parseReference, recognizedUnit } from "./units.js";

const T = (name, value, unit, reference = "") => ({ name, value: String(value), unit, reference });
const graded = (e, k) => e.graded.find((g) => g.test === k);
const ids = (p) => p.findings.map((f) => f.rule_id ?? f.pattern);

const SHEET = [
  T("اندازه گیری کمی اوره خون/سرم/ پلاسما", 26, "MG/DL", ""),
  T("Creatinine", 0.93, "mg/dl", "male : 0.7-1.4 female : 0 .6-1.3"),
  T("(AST (SGOT", 13, "IU/L", "Male : Up to 37 Female : Up to 31"),
  T("(ALT (SGPT", 10, "IU/L", "Male :Up to 41 Female : Up to31"),
  T("(ALP (ALK", 128, "U/L", "Child:180-1200 male:80-306 female: 64-306"),
  T("LDH", 338, "U/l", "Adult : <65year: up to 480 u/l >65year:up to 530 u/l"),
  T("WBC", 4.9, "x1000/µl", "4-10"), T("RBC", 4.85, "x1000000/ µl", "Men : 4.5-6.2 Women: 4.2-5.4"),
  T("Hb", 12.2, "%g", "Male: 13-18 Female: 11-16 Children:10-14 newborn:14-23"),
  T("Hct", 39, "%", "F:32-45 M:41-50"), T(".Neutrophils", 67.6, "%", ""), T("Lymphocytes", 25.7, "%", ""),
  T("MXD", 6.7, "", "10-15"), T("Platelets", 161, "x10³/µl", "140 - 450"),
];

test("HIS1: حذفِ پیشوند/پسوندِ HIS هیچ نامِ موجودِ NAME_MAP را به کلیدِ دیگری نمی‌برد", () => {
  for (const [k, v] of Object.entries(NAME_MAP)) {
    const b = stripHisAffixes(k);
    if (b !== k && NAME_MAP[b]) assert.equal(NAME_MAP[b], v, `${k} → ${b}`);
  }
  // «ادرار» هرگز حذف نمی‌شود (کراتینینِ ادرار ≠ سرم، N25).
  assert.equal(stripHisAffixes("کراتینینادرار"), "کراتینینادرار");
});

test("HIS2: نام‌های تعرفه‌ای و OCRِ به‌هم‌ریخته نگاشت می‌شوند", () => {
  const e = runEngine({ patient: { age: 40, sex: "F" }, tests: [
    T("اندازه گیری کمی اوره خون/سرم/ پلاسما", 26, "mg/dL", "15-45"),
    T("(ALP (ALK", 128, "U/L", "<306"), T("اندازه گیری کمی کراتینین سرم", 0.9, "mg/dL", "0.6-1.2"),
  ] });
  assert.deepEqual(e.unmapped, []);
  for (const k of ["UREA", "ALP", "CREAT"]) assert.ok(graded(e, k), k);
  for (const n of ["ALP (ALK)", "ALP(ALK)", "اوره خون", "اوره سرم", "اورة", "اورۀ", "اوره ـ"]) {
    const r = runEngine({ patient: { age: 40, sex: "F" }, tests: [T(n, 100, "U/L", "")] });
    assert.deepEqual(r.unmapped, [], n);
  }
});

test("HIS3: مرجعِ چاپیِ چندباندیِ سن/جنس با «همهٔ نامزدها هم‌نظر»", () => {
  const LDH = "Adult : <65year: up to 480 u/l >65year:up to 530 u/l";
  assert.deepEqual(parseReference(LDH, "M", 40), { lo: null, hi: 480 });
  assert.deepEqual(parseReference(LDH, "M", 70), { lo: null, hi: 530 });
  assert.equal(parseReference(LDH, "M", null), null, "سنِ نامعلوم و دو باندِ متفاوت ⇒ شاهد نیست");
  const HB = "Male: 13-18 Female: 11-16 Children:10-14 newborn:14-23";
  assert.deepEqual(parseReference(HB, "M", 40), { lo: 13, hi: 18 });
  assert.deepEqual(parseReference(HB, "F", 40), { lo: 11, hi: 16 });
  assert.deepEqual(parseReference(HB, "M", 5), { lo: 10, hi: 14 });
  assert.equal(parseReference(HB, "M", 15), null, "۱۲–۱۷: کودک یا بزرگسال؟ دو بازه ⇒ null");
  assert.equal(parseReference(HB, "F", 0), null, "نوزاد یا کودک ⇒ null");
  assert.deepEqual(parseReference("Child:180-1200 male:80-306 female: 64-306", "F", 40), { lo: 64, hi: 306 });
  assert.deepEqual(parseReference("male : 0.7-1.4 female : 0 .6-1.3", "F"), { lo: 0.6, hi: 1.3 });
  assert.deepEqual(parseReference("تا 480"), { lo: null, hi: 480 });
  assert.deepEqual(parseReference("10 تا 20"), { lo: 10, hi: 20 });
  assert.ok(recognizedUnit("HGB", "%g"));
});

test("HIS4: برگهٔ واقعی، زنِ ۴۰ ساله ⇒ بی‌یافته؛ LDH و Hb با بازهٔ برگه طبیعی", () => {
  const e = runEngine({ patient: { age: 40, sex: "F" }, tests: SHEET });
  const p = runPatterns(e);
  assert.deepEqual(e.unmapped, []);
  assert.equal(graded(e, "LDH").abnormal, false);
  assert.equal(graded(e, "HGB").abnormal, false);
  assert.ok(!ids(p).includes("isolated_ldh_elevation"), ids(p).join(","));
  assert.ok(!ids(p).includes("unit_unknown_values"), ids(p).join(","));
});

test("HIS5: برگهٔ واقعی، مردِ ۴۰ ساله ⇒ کم‌خونیِ خفیف با هماتوکریتِ نام‌برده؛ بی‌LDH و بی‌«توضیح نداریم»", () => {
  const p = runPatterns(runEngine({ patient: { age: 40, sex: "M" }, tests: SHEET }));
  assert.deepEqual(ids(p), ["anemia_hb_alone"]);
  assert.match(p.findings[0].must_say, /هماتوکریت هم 39 است \(حد طبیعی 41–50\)/);
});
