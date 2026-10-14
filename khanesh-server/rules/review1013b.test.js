import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { phraseSuggestion } from "./prompt.js";

const T = (name, value, unit) => ({ name, value: String(value), unit });
const ids = (sex, age, tests) =>
  (runPatterns(runEngine({ patient: { sex, age }, tests })).findings || []).map((f) => f.rule_id);

test("R13b-1: نوزاد ۱۰ روزه با قند ۶۰ (طبیعی در بازهٔ سنی) hypoglycemia نمی‌گیرد؛ قند ۳۰ هنوز می‌گیرد؛ بزرگسال ۶۰ هم", () => {
  assert.ok(!ids("M", "10 روز", [T("FBS", 60, "mg/dL")]).includes("hypoglycemia"));
  assert.ok(ids("M", "10 روز", [T("FBS", 30, "mg/dL")]).includes("hypoglycemia"));
  assert.ok(ids("M", 40, [T("FBS", 60, "mg/dL")]).includes("hypoglycemia"));
});

test("R13b-2: TG ۱۶۰ کودک ۸ ساله (حد ۱۸۶) lipid_profile نمی‌گیرد؛ بزرگسال می‌گیرد", () => {
  assert.ok(!ids("M", 8, [T("TG", 160, "mg/dL")]).includes("lipid_profile"));
  assert.ok(ids("M", 40, [T("TG", 160, "mg/dL")]).includes("lipid_profile"));
});

test("R13b-3: suggest منیزیم جملهٔ شکسته نمی‌سازد", () => {
  assert.equal(phraseSuggestion("تکرار منیزیم"), "درخواست تکرار منیزیم از پزشک");
});

test("R13b-4: متن lipid_profile کودک حدِ TG سنی را می‌گوید، نه ۱۵۰ بزرگسال", () => {
  const f = (age, tg) =>
    runPatterns(runEngine({ patient: { sex: "M", age }, tests: [T("TG", tg, "mg/dL")] })).findings.find((x) => x.rule_id === "lipid_profile");
  const child = f(8, 200);
  assert.ok(child, "کودک ۸ ساله TG 200 (بالای ۱۸۶) باید یافته بگیرد");
  assert.match(child.must_say, /زیر ۱۸۶ در این سن/);
  assert.doesNotMatch(child.must_say, /مطلوب زیر ۱۵۰/);
  assert.match(f(40, 160).must_say, /مرزی است \(مطلوب زیر ۱۵۰\)/);
});
