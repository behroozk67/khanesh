// P155 (۲۰۲۶-۱۱-۱۶): جاب a57055d6 (عکس) — «F.B.S (Blood Sugar)» = ۴۸۵ unmapped ماند؛ dka_pattern/glycemia فعال نشد و فقط TG گفته شد (N2).
//   نام‌ها همان چاپِ واقعیِ extracted_tests است (N56).
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const T = (name, value, reference) => ({ name, value, ...(reference ? { reference } : {}) });
const keys = (name) => runEngine({ tests: [T(name, "485 mg/dL", "70 - 100")], patient: { age: 47, sex: "M" } }).graded.map((g) => g.test);

test("P155-1: «قندِ خونِ عمومی + قیدِ ناشتا/۲ساعته» در پرانتز، قید برنده است", () => {
  for (const n of ["F.B.S (Blood Sugar)", "FBS (Blood Sugar)", "Blood Sugar (FBS)", "F.B.S. (Blood Sugar)"]) assert.deepEqual(keys(n), ["GLU_F"], n);
  for (const n of ["Blood Sugar (2hpp)", "Blood Sugar (Post prandial)"]) assert.deepEqual(keys(n), ["GLU_2H"], n);
});

test("P155-2: دو قیدِ متفاوت و نامِ بی‌قید دست‌نخورده می‌مانند", () => {
  assert.deepEqual(keys("FBS (2hpp)"), [], "دو قیدِ متفاوت حدس زده نمی‌شود");
  assert.deepEqual(keys("Blood Sugar"), ["GLU_RANDOM"]);
  assert.deepEqual(keys("FBS"), ["GLU_F"]);
});

test("P155-3: برگهٔ واقعیِ جاب — با «F.B.S (Blood Sugar)» DKA فعال می‌شود و قند در unread نیست", () => {
  const tests = [T("F.B.S (Blood Sugar)", "485 mg/dL", "70 - 100"), T("HbA1c (HPLC)", "11.8 %", "4.0 - 5.6"), T("Triglycerides (TG)", "1150 mg/dL", "< 150"),
    T("Glucose (Urine)", "4+", "Negative"), T("Ketone (Urine)", "3+", "Negative")];
  const e = runEngine({ tests, patient: { age: 47, sex: "M" } });
  const p = runPatterns(e);
  assert.ok(e.graded.some((g) => g.test === "GLU_F" && g.value === 485));
  assert.ok(!e.unmapped.includes("F.B.S (Blood Sugar)"));
  assert.ok(p.findings.some((f) => f.rule_id === "dka_pattern"), p.findings.map((f) => f.rule_id).join());
});
