import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { stoolGrade, stoolConsistency } from "./stool.js";

// ═══ P117 — کانالِ مشاهده‌های توصیفیِ برگهٔ مدفوع ═══
// منبع: WHO Manual of basic techniques for a health laboratory (2003) — معاینهٔ ماکروسکوپی (color/consistency/
// blood/mucus/food remnants) و CDC DPDx (ova/cyst). هیچ آستانهٔ عددی؛ متنِ خودِ برگه می‌مانَد.

const r = (name, value, unit = "", reference = "", section = null) => ({
  name, value: String(value), ...(unit ? { unit } : {}), ...(reference ? { reference } : {}), ...(section ? { section } : {}),
});
const run = (tests, age = 44, sex = "M") => {
  const e = runEngine({ tests, patient: { sex, age } });
  const p = runPatterns(e);
  return { e, p, ids: p.findings.map((f) => f.rule_id), f: (id) => p.findings.find((x) => x.rule_id === id) };
};
const CBC = [r("Hb", 14.2, "g/dL", "11-18"), r("Hct", 42, "%", "35-50"), r("MCV", 88, "fL", "80-100"), r("WBC", 6.4, "x10^3/uL", "4-10"), r("PLT", 240, "x10^3/uL", "150-450")];

test("P117-۱: فیلدهای استانداردِ گزارشِ مدفوع دیگر «تفسیرنشده» نیستند", () => {
  const { e } = run([...CBC,
    r("Color", "Brown", "", "", "Stool"), r("Consistency", "Soft", "", "", "Stool"),
    r("Undigested Food", "Few", "", "", "Stool"), r("Ova Of Parasites", "Negative", "", "", "Stool"),
    r("Protozoa Cyst", "Negative", "", "", "Stool"),
  ]);
  for (const name of ["Consistency", "Undigested Food", "Ova Of Parasites", "Protozoa Cyst"]) {
    assert.ok(!e.unmapped.includes(name), `${name} نباید در «تفسیر نشدند» باشد`);
  }
  assert.equal(e.ungraded.STOOL_CONSISTENCY.value, "Soft");
  assert.equal(e.ungraded.STOOL_UNDIGESTED.value, "Few");
  assert.equal(e.ungraded.STOOL_OVA.value, "Negative");
  assert.equal(e.ungraded.STOOL_CYST.value, "Negative");
});

test("P117-۲: مدفوعِ سیاه ⇒ یافتهٔ this_week با معنا و هشدارِ اورژانس؛ بی‌کم‌خونی هم می‌آید", () => {
  const { ids, f } = run([...CBC, r("Color", "Black", "", "", "Stool")]);
  assert.ok(ids.includes("stool_melena"), `یافته‌ها: ${ids.join(",")}`);
  const mel = f("stool_melena");
  assert.equal(mel.urgency, "this_week");
  assert.match(mel.must_say, /خونریزی/);
  assert.match(mel.must_say, /آهن|بیسموت/);          // داروی سیاه‌کننده هم گفته می‌شود
  assert.ok((mel.warnings ?? []).length >= 1);
  assert.deepEqual(mel.explains, ["STOOL_COLOR"]);
});

test("P117-۳: «Dark brown» سیاه نیست (فهرستِ بستهٔ N6) — هیچ یافته‌ای نمی‌سازد", () => {
  const { ids } = run([...CBC, r("Color", "Dark brown", "", "", "Stool")]);
  assert.ok(!ids.includes("stool_melena"));
});

test("P117-۴: کم‌خونیِ میکروسیتیک + مدفوعِ سیاه ⇒ صاحبِ یافته همان قاعدهٔ قدیمی است (بی‌هم‌پوشانی، N20)", () => {
  const { ids } = run([
    r("Hb", 9.4, "g/dL", "11-18"), r("Hct", 31, "%", "35-50"), r("MCV", 68, "fL", "80-100"),
    r("WBC", 6.4, "x10^3/uL", "4-10"), r("PLT", 240, "x10^3/uL", "150-450"),
    r("Color", "Black", "", "", "Stool"),
  ]);
  assert.ok(ids.includes("melena_microcytic_anemia"), `یافته‌ها: ${ids.join(",")}`);
  assert.ok(!ids.includes("stool_melena"), "دو یافته روی یک مشاهده ممنوع");
});

test("P117-۵: گچی/سفید ⇒ بررسیِ صفرا؛ سرخ ⇒ خونریزیِ پایینِ گوارش", () => {
  const clay = run([...CBC, r("Color", "Clay", "", "", "Stool")]);
  assert.ok(clay.ids.includes("stool_clay_colored"));
  assert.equal(clay.f("stool_clay_colored").urgency, "this_week");
  assert.match(clay.f("stool_clay_colored").must_say, /صفرا/);

  const red = run([...CBC, r("Color", "Red", "", "", "Stool")]);
  assert.ok(red.ids.includes("stool_fresh_blood"));
  assert.match(red.f("stool_fresh_blood").must_say, /رودهٔ بزرگ|پایینی/);
});

test("P117-۶: تخمِ انگل مثبت ⇒ یافته؛ «Negative» ⇒ هیچ", () => {
  const pos = run([...CBC, r("Ova Of Parasites", "Ascaris lumbricoides", "", "", "Stool")]);
  assert.ok(pos.ids.includes("stool_parasite_found"));
  assert.match(pos.f("stool_parasite_found").must_say, /Ascaris/);
  const neg = run([...CBC, r("Ova Of Parasites", "Negative", "", "", "Stool")]);
  assert.ok(!neg.ids.includes("stool_parasite_found"));
});

test("P117-۷: بقایای غذایی — «Few» یافته نیست، «Many» هست (فقط درجهٔ ≥۲)", () => {
  assert.equal(stoolGrade("Few"), 1);
  assert.equal(stoolGrade("Many"), 3);
  assert.equal(stoolGrade("+++"), 3);
  assert.equal(stoolGrade("Negative"), 0);
  assert.equal(stoolGrade("Moderate"), 2);
  assert.equal(stoolGrade("Dysplastic"), null, "مقدارِ بیرون از فهرست ⇒ نامعلوم");
  const few = run([...CBC, r("Undigested Food", "Few", "", "", "Stool")]);
  assert.ok(!few.ids.includes("stool_undigested_food"));
  const many = run([...CBC, r("Undigested Food", "Many", "", "", "Stool")]);
  assert.ok(many.ids.includes("stool_undigested_food"));
});

test("P117-۸: قوامِ آبکی ⇒ یافتهٔ routine (بی‌عددِ تازه)؛ «Soft» یافته نیست", () => {
  assert.equal(stoolConsistency("Watery"), "watery");
  assert.equal(stoolConsistency("Soft"), "loose");
  const watery = run([...CBC, r("Consistency", "Watery", "", "", "Stool")]);
  assert.ok(watery.ids.includes("stool_loose_consistency"));
  assert.equal(watery.f("stool_loose_consistency").urgency, "routine");
  const soft = run([...CBC, r("Consistency", "Soft", "", "", "Stool")]);
  assert.ok(!soft.ids.includes("stool_loose_consistency"));
});

test("P117-۹: «Blood: Positive»ِ بخشِ مدفوع ⇒ یافته؛ «Mucus: +» همراهِ خون صاحبِ خودش را دارد (N20)", () => {
  const blood = run([...CBC, r("Blood", "Positive", "", "", "Stool")]);
  assert.ok(blood.ids.includes("stool_fresh_blood"));
  const both = run([...CBC, r("Blood", "Positive", "", "", "Stool"), r("Mucus", "+", "", "", "Stool")]);
  assert.ok(both.ids.includes("stool_fresh_blood"));
  assert.ok(!both.ids.includes("stool_mucus_present"), "خون صاحبِ یافته است؛ مخاط جدا گزارش نمی‌شود");
  const mucus = run([...CBC, r("Mucus", "Moderate", "", "", "Stool")]);
  assert.ok(mucus.ids.includes("stool_mucus_present"));
});

test("P117-۱۰: مشاهده‌های مدفوع در خطِ «محدوده مرجع نداریم» نمی‌نشینند (noRef ⇒ کانالِ مشاهده)", () => {
  const { e } = run([r("Color", "Brown", "", "", "Stool"), r("Consistency", "Formed", "", "", "Stool")]);
  // هر دو در فهرستِ بی‌بازه‌اند ولی STOOL_OBS_KEYS صاحبشان است؛ سرور آن‌ها را به خطِ «مشاهده» می‌برد.
  const { STOOL_OBS_KEYS } = { STOOL_OBS_KEYS: new Set(["STOOL_COLOR", "STOOL_CONSISTENCY", "STOOL_UNDIGESTED", "STOOL_MUCUS", "STOOL_BLOOD", "STOOL_OVA", "STOOL_CYST"]) };
  const nonObs = e.noRef.filter((k) => !STOOL_OBS_KEYS.has(k));
  assert.deepEqual(nonObs, [], "چیزی جز مشاهده‌های مدفوع نباید بی‌بازه بماند");
});
