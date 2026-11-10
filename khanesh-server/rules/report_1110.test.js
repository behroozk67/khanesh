// بازبینیِ گزارشِ کاربر ۲۰۲۶-۱۱-۱۰: تناقضِ MCV، ادرارِ منفی در فهرستِ «در محدوده»، «از X تا X» در روند.
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { normalRangeParagraph } from "./printed.js";
import { calculateTrend5 } from "./history.js";

const sheet = () => runEngine({
  patient: { age: "30 سال", sex: "مرد" },
  tests: [
    { name: "MCV", value: "79.4", unit: "fL", reference: "76-96" },
    { name: "HGB", value: "15", unit: "g/dL", reference: "13-17" },
    { name: "Protein", value: "Negative", section: "Urine" },
    { name: "Glucose", value: "Negative", section: "Urine" },
  ],
});

test("MCV داخلِ بازهٔ چاپیِ برگه: متنِ یافته نمی‌گوید «کوچک‌تر از حد طبیعی (76-96)»", () => {
  const f = runPatterns(sheet()).findings.find((x) => x.pattern === "microcytosis_no_anemia");
  assert.ok(f);
  assert.doesNotMatch(f.must_say, /کوچک‌تر از حد طبیعی/);
  assert.match(f.must_say, /داخلِ محدودهٔ طبیعیِ چاپ‌شده روی برگهٔ شما \(76-96\)/);
});

test("ردیف‌های منفیِ نوارِ ادرار در فهرستِ «در محدوده» می‌آیند", () => {
  assert.match(normalRangeParagraph(sheet()), /در آزمایش ادرار، این موارد منفی بودند: پروتئین، گلوکز\./);
});

test("روندِ نوسانی: بازه کمینه تا بیشینه است، نه اولین تا آخرین (۱۲۴ تا ۱۲۴)", () => {
  const pts = [124, 150, 110, 124].map((value, i) => ({ value, date: `2026-0${i + 1}-01`, time: Date.UTC(2026, i, 1) }));
  const t = calculateTrend5(pts);
  assert.equal(t.direction, "fluctuating");
  assert.doesNotMatch(t.summaryFa, /از ۱۲۴ تا ۱۲۴/);
  assert.match(t.summaryFa, /از ۱۱۰.* تا ۱۵۰/);
});
