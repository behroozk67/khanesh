// نوبتِ قبلیِ هم‌تاریخ: برگهٔ تکراری نباید «تنها نتیجه / تک‌نوبت» بخواند (نتیجهٔ قبلی هست).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";

const text = (prior, sd, alt = 150, ast = 120) => {
  const o = runEngine({
    patient: { age: 40, sex: "M", ...(sd ? { sample_date: sd } : {}) },
    tests: [{ name: "ALT", value: alt, unit: "U/L" }, { name: "AST", value: ast, unit: "U/L" }],
    ...(prior ? { prior } : {}),
  });
  return runPatterns(o).findings.map((f) => String(f.must_say)).join("\n");
};
const prior = (date) => ({ date, age: 40, sex: "M", graded: [{ test: "ALT", value: 140, abnormal: true, dir: "high" }, { test: "AST", value: 110, abnormal: true, dir: "high" }] });

test("بدونِ نتیجهٔ قبلی: تک‌نوبت", () => assert.match(text(null), /همین یک نتیجهٔ آنزیم/));
test("نتیجهٔ قبلی هم‌تاریخ: دیگر «تنها نتیجه» نیست", () => {
  const t = text(prior("2026-11-01T00:00:00Z"), "2026-11-01");
  assert.doesNotMatch(t, /همین یک نتیجهٔ آنزیم/);
  assert.match(t, /هم‌تاریخ/);
});

test("تک‌نوبتِ مرزی ≠ بالاتر از ۲×ULN: دومی می‌گوید مرزی نیست", () => {
  assert.doesNotMatch(text(null, null, 48, 30), /مرزی نیست/);
  assert.match(text(null, null, 150, 120), /مرزی نیست/);
});
test("تک‌نوبت دیگر ادعا نمی‌کند قبلاً بالا نبوده", () => assert.match(text(null), /پیش‌تر هم آزمایش داده‌اید/));
