// ============================================================
// گروه‌بندی و ترتیبِ متنِ تفسیر (rules/groups.js، P123)
//
// گزارشِ اپ موبایل: CRP در یک پاراگراف و ESR چهار پاراگراف پایین‌تر، آهن جدا از هموگلوبین، و ترتیبِ پاراگراف‌ها
// ترتیبِ فوریت بود. این تست‌ها تضمینِ *کد* را می‌سنجند، نه رفتارِ مدل: مدلِ عمداً بد (ترتیبِ غلط، جملهٔ یک گروه در
// گروهِ دیگر، بخشِ گم‌شده) باید همان خروجیِ درست را بدهد. تستِ HTTPِ کامل: api-contract.test.js «T65».
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";

import { runEngine } from "./adapter.js";
import { runPatterns, RULES } from "./patterns.js";
import { buildEngineFallbackResult, buildEnginePrompt } from "./prompt.js";
import { GroupedText, INTERP_GROUPS, RULE_GROUP, groupOf, orderFindings } from "./groups.js";

// CRP+ESR بالا، Hb پایین + فریتین پایین + TIBC بالا (واحدِ آهن و TIBC چاپ شده، وگرنه unit_unknown_values می‌شوند و به گروهِ کم‌خونی نمی‌رسند)
export const PANEL = {
  patient: { age: 34, sex: "F" },
  tests: [
    { name: "CRP", value: 48, unit: "mg/L" }, { name: "ESR", value: 62 },
    { name: "Hemoglobin", value: 9.8, unit: "g/dL" }, { name: "MCV", value: 68 }, { name: "MCH", value: 21 }, { name: "RDW", value: 17 },
    { name: "Ferritin", value: 6, unit: "ng/mL" }, { name: "TIBC", value: 460, unit: "µg/dL" }, { name: "Iron", value: 25, unit: "µg/dL" },
  ],
};
const verdict = (panel = PANEL) => { const e = runEngine(panel); return { e, p: runPatterns(e) }; };
const paras = (s) => s.split("\n\n");
const countParas = (text, needle) => paras(text).filter((p) => p.includes(needle)).length;

test("GR1: هر قاعدهٔ RULES دقیقاً یک گروه دارد و جدول مرده ندارد (N1/N16: قاعدهٔ تازه بی‌گروه بی‌صدا به «آخر» نمی‌افتد)", () => {
  const ids = RULES.filter((r) => r?.id).map((r) => r.id);
  assert.deepEqual(ids.filter((i) => !RULE_GROUP[i]), [], "قاعده‌ای بدونِ گروه در RULE_GROUP");
  assert.deepEqual(Object.keys(RULE_GROUP).filter((i) => !ids.includes(i)), [], "ورودیِ مرده در RULE_GROUP");
  const known = new Set(INTERP_GROUPS.map((g) => g.id));
  assert.deepEqual([...new Set(Object.values(RULE_GROUP))].filter((g) => !known.has(g)), []);
});

test("GR2: ترتیبِ گروه‌ها هماتولوژی ← بیوشیمی ← هورمون/ایمونولوژی ← ادرار/مدفوع ← بین‌گروهی", () => {
  const at = (id) => INTERP_GROUPS.findIndex((g) => g.id === id);
  for (const [a, b] of [["anemia", "glucose"], ["inflam", "glucose"], ["cardiac", "thyroid"], ["tumor", "urine"], ["stool", "general"]]) {
    assert.ok(at(a) < at(b), `${a} باید پیش از ${b} باشد`);
  }
  assert.equal(INTERP_GROUPS.at(-1).id, "general");
});

test("GR3: برگهٔ CRP+ESR بالا و Hb/فریتین پایین — هر گروه یک پاراگراف، هر نشانگر فقط در یک پاراگراف، کم‌خونی پیش از التهاب", () => {
  const { e, p } = verdict();
  const text = buildEngineFallbackResult(e, p).interpretation;
  const ps = paras(text);
  for (const m of ["CRP", "ESR", "MCV", "MCH", "RDW", "هموگلوبین", "فریتین"]) {
    assert.equal(countParas(text, m), 1, `«${m}» در ${countParas(text, m)} پاراگراف آمده`);
  }
  const iAnemia = ps.findIndex((x) => x.includes("هموگلوبین")), iInflam = ps.findIndex((x) => x.includes("CRP"));
  assert.ok(iAnemia >= 0 && iInflam > iAnemia, "کم‌خونی/آهن باید پیش از التهاب بیاید");
  assert.equal(ps.findIndex((x) => x.includes("ESR")), iInflam, "CRP و ESR در یک پاراگراف");
  // جملهٔ اولِ هر پاراگرافِ گروه، گروه را نام می‌برد
  assert.match(ps[iAnemia].split(/(?<=[.؟!])\s/)[0], /کم‌خونی|آهن/);
  assert.match(ps[iInflam].split(/(?<=[.؟!])\s/)[0], /التهاب/);
});

test("GR4: مدلِ عمداً بد — ترتیبِ غلط، جملهٔ CRP در بخشِ کم‌خونی، بخشِ گم‌شده، شناسهٔ ناشناخته — خروجیِ کد همان چینش را می‌دهد", () => {
  const { p } = verdict();
  const must = (id) => p.findings.find((f) => f.rule_id === id).must_say;
  const gt = new GroupedText(p.findings).fromModel([
    { group: "inflam", text: must("esr_elevated") },                               // التهاب اول (غلط)، بدونِ جملات CRP
    { group: "anemia", text: `${must("microcytic_anemia")} ${must("crp_elevated").split(/(?<=[.؟!])\s/)[0]}` }, // جملهٔ CRP در کم‌خونی
    { group: "no_such_group", text: "متنِ ساختگی" },
    { group: "lipid", text: "گروهِ بی‌یافته" },
  ]);
  const text = gt.render();
  const ps = paras(text);
  assert.equal(ps.length, 2, "دقیقاً یک پاراگراف برای هر گروهِ دارای یافته");
  assert.ok(ps[0].includes("هموگلوبین") && !ps[0].includes("CRP"), "کم‌خونی اول است و جملهٔ CRP از آن بیرون رفته");
  assert.ok(ps[1].includes("CRP") && ps[1].includes("ESR"), "جملهٔ CRP به گروهِ التهاب برگشت");
  assert.deepEqual(gt.meta.ignored.sort(), ["lipid", "no_such_group"]);
  assert.equal(gt.meta.relocated, 1);
  assert.ok(!text.includes("متنِ ساختگی"));
});

test("GR5: شکلِ قدیمیِ پاسخ (فقط interpretation) یا بخشِ گم‌شده ⇒ متنِ قطعیِ موتور همان گروه؛ تضمین به مدل بسته نیست", () => {
  const { e, p } = verdict();
  const legacy = new GroupedText(p.findings).fromModel(undefined);
  assert.deepEqual(legacy.meta.filled.sort(), ["anemia", "inflam"]);
  assert.equal(legacy.render(), buildEngineFallbackResult(e, p).interpretation.split("\n\n").slice(0, 2).join("\n\n"));
  const partial = new GroupedText(p.findings).fromModel([{ group: "anemia", text: "کم‌خونیِ شما بررسی شد." }]);
  assert.deepEqual(partial.meta.filled, ["inflam"]);
  assert.ok(partial.render().includes("CRP شما 48"));
});

test("GR6: add() به پاراگرافِ گروهِ خودِ یافته می‌رود، نه ته‌ِ متن؛ closing همیشه آخر؛ جملهٔ عیناً تکراری یک بار", () => {
  const { p } = verdict();
  const crp = p.findings.find((f) => f.rule_id === "crp_elevated");
  const gt = new GroupedText(p.findings).fromModel(null).setClosing("\n\nموارد دیگرِ این برگه: نمونه.");
  gt.add(crp, "جملهٔ افزوده دربارهٔ CRP.");
  const ps = paras(gt.render());
  assert.ok(ps[1].endsWith("جملهٔ افزوده دربارهٔ CRP."), "به پاراگرافِ التهاب اضافه شد");
  assert.equal(ps.at(-1), "موارد دیگرِ این برگه: نمونه.");
  const dup = new GroupedText(p.findings).fromModel(null);
  dup.add(crp, crp.must_say.split(/(?<=[.؟!])\s/)[0]);                    // همان جملهٔ اول، دوباره
  assert.equal(countParas(dup.render(), "CRP شما 48"), 1);
  assert.equal(dup.render().split("CRP شما 48").length - 1, 1, "جملهٔ تکراری حذف می‌شود");
});

test("GR7: orderFindings — گروه‌ها ثابت، درونِ گروه ترتیبِ فوریتِ ورودی حفظ می‌شود؛ یافتهٔ ناشناخته آخر", () => {
  const fs = [
    { rule_id: "stool_melena" }, { rule_id: "کاملاً_ناشناخته" }, { rule_id: "lipid_profile" },
    { rule_id: "iron_deficiency_panel" }, { rule_id: "microcytic_anemia" }, { rule_id: "crp_elevated" },
  ];
  assert.deepEqual(orderFindings(fs).map((f) => f.rule_id),
    ["iron_deficiency_panel", "microcytic_anemia", "crp_elevated", "lipid_profile", "stool_melena", "کاملاً_ناشناخته"]);
  assert.equal(groupOf({ rule_id: "کاملاً_ناشناخته" }), "general");
});

test("GR8: payload مدل — findings به ترتیبِ گروه، هر کدام group دارد، groups به ترتیبِ ثابت؛ فهرستِ گروه فقط گروه‌های دارای یافته", () => {
  const { e, p } = verdict();
  const payload = JSON.parse(buildEnginePrompt(e, p).content);
  assert.deepEqual(payload.groups.map((g) => g.id), ["anemia", "inflam"]);
  assert.deepEqual(payload.groups.map((g) => g.title), ["کم‌خونی و آهن", "التهاب"]);
  const seq = payload.findings.map((f) => f.group);
  assert.deepEqual(seq, [...seq].sort((a, b) => INTERP_GROUPS.findIndex((g) => g.id === a) - INTERP_GROUPS.findIndex((g) => g.id === b)));
});
