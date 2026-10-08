// P98: MCV که برگه با بازهٔ چاپ‌شدهٔ خودش H/L می‌زند ولی هنوز زیرِ مرزِ درشت/ریز است — متن نباید «اندازهٔ طبیعی» بگوید.
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const nc = (mcv, reference) => {
  const t = { name: "MCV", value: mcv };
  if (reference) t.reference = reference;
  const e = runEngine({ patient: { age: 30, sex: "F" }, tests: [{ name: "Hemoglobin", value: "10", unit: "g/dL" }, t] });
  return runPatterns(e).findings.find((f) => f.pattern === "normocytic_anemia");
};

test("P98: MCV 97 با سقفِ چاپیِ 96 → «اندازهٔ طبیعی» نمی‌گوید و برگه را نام می‌برد", () => {
  const f = nc("97", "80-96");
  assert.ok(f, "کم‌خونی نورموسیتیک باید بماند (مرز درشت ۱۰۰ تصمیمِ ثابت است)");
  for (const s of [f.must_say, f.brief]) {
    assert.ok(!s.includes("اندازهٔ طبیعی"), s);
    assert.ok(s.includes("80–96") && s.includes("نرسیده"), s);
  }
});

test("P98: MCV 90 یا بی‌بازهٔ چاپی → همان جملهٔ قبلی", () => {
  for (const f of [nc("90", "80-96"), nc("97", null)]) {
    assert.ok(f.must_say.includes("گلبول‌ها اندازهٔ طبیعی دارند"));
    assert.ok(f.brief.includes("به اندازهٔ طبیعی"));
  }
});
