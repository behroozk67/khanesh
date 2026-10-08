// «بستری» (بخش، ICU یا اورژانسِ بیمارستان) — گزینهٔ الف، تصمیمِ کاربر ۲۰۲۶-۱۰-۰۸ (P97 / P66).
//   فقط *لحنِ دستور* عوض می‌شود: «به اورژانس بروید / وقت بگیرید / این هفته» برای کسی که همین حالا در بیمارستان است بی‌معناست.
//   فوریت، آستانه، بازهٔ مرجع و has_critical دست نمی‌خورند. هر پنج گارد قرمز-اول‌اند.
//   H1 شناسه در کاتالوگ و فعال است      H2 دستورِ یافتهٔ this_week به «ویزیتِ پزشکِ معالج» می‌رود
//   H3 emergency/soon به «اطلاع به پرستار/پزشکِ بخش»  H4 فوریتِ هیچ یافته‌ای و has_critical عوض نمی‌شود
//   H5 جاروبِ همهٔ کلیدها: هیچ جمله‌ای دربارهٔ اورژانس/مطب/وقت‌گرفتن نمی‌ماند   H6 بدونِ «بستری» بایت‌به‌بایت همان است
//   H7 «تفسیر بر پایهٔ …» و بنر
import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "./adapter.js";
import { runPatterns } from "./patterns.js";
import { ADULT_REFS, getRef } from "./refs.js";
import { FA_NAMES } from "./names.js";
import { CONDITIONS, ACTIVE_CONDITIONS, conditionIds } from "./conditions.js";
import { INPATIENT_NOW_ACTION, INPATIENT_ROUND_ACTION, onInpatient, inpatientBanner } from "./inpatient.js";

const IN = ["hospitalized"];
const run = (tests, conditions = [], patient = { age: 45, sex: "M" }) => {
  const e = runEngine({ patient: { ...patient, conditions }, tests });
  return { e, p: runPatterns(e) };
};
const t = (name, value, unit) => ({ name, value: String(value), ...(unit ? { unit } : {}) });
const OUTPATIENT = /اورژانس|۱۱۵|مطب|وقت بگیرید|نوبتِ?\s*عادی|مراجعه کنید|این هفته|همین امروز|همین چند روز|تماس بگیرید/;
const texts = (f) => [f.action, ...(f.warnings ?? []), ...(f.brief_warnings ?? [])].filter((s) => typeof s === "string");

test("H1: «بستری» در کاتالوگ و فعال است؛ برچسب بخش، ICU و اورژانس را می‌گوید", () => {
  const c = CONDITIONS.find((x) => x.id === "hospitalized");
  assert.ok(c, "hospitalized در CONDITIONS نیست");
  assert.match(c.fa, /بستری/); assert.match(c.fa, /ICU/); assert.match(c.fa, /اورژانس/);
  assert.ok(ACTIVE_CONDITIONS.has("hospitalized"));
  assert.deepEqual(conditionIds([c.fa]).ids, ["hospitalized"]);
  assert.equal(onInpatient({ conditions: IN }), true);
  assert.equal(onInpatient({ conditions: ["dm2"] }), false);
});

test("H2: PT 14 / INR 1.2 بستری ⇒ همان this_week، ولی دستور «ویزیتِ پزشکِ معالج»، نه «این هفته وقت بگیرید»", () => {
  const f = run([t("PT", 14, "sec"), t("INR", 1.2)], IN).p.findings.find((x) => x.pattern === "coagulation_abnormal");
  assert.ok(f, "coagulation_abnormal فعال نشد");
  assert.equal(f.urgency, "this_week");
  assert.ok(f.action.includes(INPATIENT_ROUND_ACTION), f.action);
  assert.doesNotMatch(f.action, OUTPATIENT);
  assert.ok(f.applied_conditions?.includes("hospitalized"));
});

test("H3: K 7.0 (emergency) و K 5.5 (soon) بستری ⇒ «همین حالا به پرستار/پزشکِ بخش اطلاع دهید»، بی‌اورژانس", () => {
  for (const k of [7.0, 5.5]) {
    const { p } = run([t("K", k, "mEq/L")], IN);
    const f = p.findings.find((x) => x.pattern === "potassium_critical" || x.pattern === "hyperkalemia" || /potassium|kalemia/.test(x.pattern ?? ""));
    assert.ok(f, `K ${k}: یافته نبود؛ ${p.findings.map((x) => x.pattern)}`);
    assert.ok(f.action.includes(INPATIENT_NOW_ACTION), `K ${k}: ${f.action}`);
    assert.doesNotMatch(texts(f).join(" "), OUTPATIENT, `K ${k}`);
  }
});

test("H4: فوریتِ هر یافته، overall_urgency و has_critical با «بستری» دقیقاً همان است", () => {
  const panels = [
    [t("PT", 14, "sec"), t("INR", 1.2)], [t("K", 7.0, "mEq/L")], [t("K", 5.5, "mEq/L")],
    [t("Hb", 9.5, "g/dL"), t("MCV", 70, "fL"), t("Ferritin", 6, "ng/mL")], [t("Hb", 5.5, "g/dL")], [t("WBC", 1.5, "K/uL")],
  ];
  for (const tests of panels) {
    const a = run(tests).p, b = run(tests, IN).p;
    assert.deepEqual(b.findings.map((f) => [f.rule_id, f.urgency]), a.findings.map((f) => [f.rule_id, f.urgency]));
    assert.equal(b.overall_urgency, a.overall_urgency);
    assert.equal(b.has_critical, a.has_critical);
  }
});

test("H5: جاروبِ تک‌آزمایشیِ همهٔ کلیدها — با «بستری» هیچ دستور/هشداری دربارهٔ اورژانس، مطب یا وقت‌گرفتن نمی‌ماند", () => {
  const bad = [];
  let reached = 0, actions = 0;
  for (const [key, r] of Object.entries(ADULT_REFS)) {
    const rng = getRef(key, "M", 45);
    if (!Array.isArray(rng)) continue;
    const probe = (n) => runEngine({ patient: { age: 45, sex: "M" }, tests: [t(n, rng[1], r.unit ?? "")] }).graded.some((g) => g.test === key);
    const name = [key, key.replace(/_/g, " "), FA_NAMES[key]].find((n) => n && probe(n));
    if (!name) continue;
    reached++;
    for (const v of [rng[1] * 1.3, rng[1] * 2, rng[1] * 4, rng[1] * 10, rng[0] * 0.7, rng[0] * 0.5, rng[0] * 0.25].filter((x) => x > 0)) {
      const { p } = run([t(name, +v.toPrecision(3), r.unit ?? "")], IN);
      for (const f of p.findings) {
        if (f.action) actions++;
        for (const s of texts(f)) if (OUTPATIENT.test(s)) bad.push(`${key}=${+v.toPrecision(3)} ${f.rule_id}: ${s.slice(0, 90)}`);
      }
    }
  }
  assert.ok(reached >= 60, `فقط ${reached} کلید رسید — جاروبِ تهی سبزِ بی‌معناست (N15)`);
  assert.ok(actions >= 100, `فقط ${actions} دستور دیده شد`);
  assert.deepEqual([...new Set(bad)], []);
});

test("H6: بدونِ «بستری» خروجی بایت‌به‌بایت همان است (کنترلِ منفی)", () => {
  const { p } = run([t("PT", 14, "sec"), t("INR", 1.2)]);
  const f = p.findings.find((x) => x.pattern === "coagulation_abnormal");
  assert.match(f.action, /این هفته/);
  assert.ok(!f.applied_conditions?.includes("hospitalized"));
  assert.ok(!f.action.includes(INPATIENT_ROUND_ACTION));
  const d = run([t("PT", 14, "sec"), t("INR", 1.2)], ["dm2"]).p.findings.find((x) => x.pattern === "coagulation_abnormal");
  assert.equal(d.action, f.action);
});

test("H7: «تفسیر بر پایهٔ …» بستری را می‌آورد؛ بنرِ بحرانی فقط برای بستریِ دارای بحران و بی‌اورژانس/۱۱۵", () => {
  const a = run([t("K", 7.0, "mEq/L")], IN);
  // engineContext (server.js) فقط applied_conditions را جمع می‌کند — وارد کردنِ server.js در تست پایگاه‌داده باز می‌کند
  assert.ok(a.p.findings.some((f) => f.applied_conditions?.includes("hospitalized")));
  const b = run([t("Hb", 14, "g/dL")], IN);
  assert.ok(!b.p.findings.some((f) => f.applied_conditions?.includes("hospitalized")), "برگهٔ بی‌یافته نباید ادعای «لحاظ‌شده» کند");
  const ban = inpatientBanner(a.e, a.p);
  assert.ok(ban && /پرستار/.test(ban.body) && !OUTPATIENT.test(ban.title + ban.body), JSON.stringify(ban));
  assert.equal(inpatientBanner(run([t("K", 7.0, "mEq/L")]).e, run([t("K", 7.0, "mEq/L")]).p), null);
  assert.equal(inpatientBanner(b.e, b.p), null);
});

test("H8: هشدارِ شرطی با «،» داخلِ پرانتزِ توضیحی (طوفانِ تیروئیدی) هم برای بستری بی‌اورژانس می‌شود (یافتهٔ X18، specs/016)", () => {
  // پیش از رفع: lastIndexOf("،") به «،»ِ داخلِ «(… «طوفان تیروئیدی»، یک وضعیت اورژانسی …)» می‌رسید و «فوراً به اورژانس بروید» می‌ماند.
  const { p } = run([t("TSH", 0.05, "mIU/L"), t("FT4", 2.6, "ng/dL")], IN);
  const ws = p.findings.flatMap((f) => [...(f.warnings ?? []), ...(f.brief_warnings ?? [])]);
  const storm = ws.find((w) => /ضربان قلب بسیار تند/.test(w));
  assert.ok(storm, `هشدارِ طوفانِ تیروئیدی نبود: ${ws.join(" | ")}`);
  assert.doesNotMatch(storm, /اورژانس/);
  assert.match(storm, /^اگر تب بالا همراه ضربان قلب بسیار تند و بی‌قراری یا گیجی شدید پیدا کردید، همین حالا به پرستارِ بخش اطلاع دهید\.$/);
});

test("H9: هشدارِ شرطیِ D-dimer برای بستری حذف نمی‌شود — کاملِ نشانه‌ها + «پرستار» (بازبینیِ کدِ specs/016، رگرسیونِ H8)", () => {
  // پس از H8: «همین حالا» در خودِ شرط بود («اگر همین حالا نشانه‌ها … دارید»)، lastIndexOf به -1 رسید و جمله حذف شد.
  const { p } = run([t("D-dimer", 2.5, "mg/L FEU")], IN);
  const ws = p.findings.flatMap((f) => [...(f.warnings ?? []), ...(f.brief_warnings ?? [])]);
  const clot = ws.find((w) => /تنگی نفس ناگهانی/.test(w));
  assert.ok(clot, `هشدارِ لخته حذف شد: ${ws.join(" | ")}`);
  assert.match(clot, /سرفهٔ خونی/);
  assert.match(clot, /پرستارِ بخش/);
  assert.doesNotMatch(clot, /اورژانس/);
});

test("H10: جاروب — هیچ هشدارِ شرطی («اگر …») برای بستری حذف نمی‌شود؛ فقط بازنویسی (H8/H9)", () => {
  const panels = [
    [t("D-dimer", 2.5, "mg/L FEU")], [t("TSH", 0.05, "mIU/L"), t("FT4", 2.6, "ng/dL")], [t("K", 7.0, "mEq/L")], [t("PT", 14, "sec"), t("INR", 1.2)],
    [t("Hb", 6, "g/dL")], [t("PLT", 15, "K/uL")], [t("FBS", 45, "mg/dL")], [t("Na", 118, "mEq/L")], [t("Ca", 14.5, "mg/dL")],
    [t("WBC", 1.2, "K/uL")], [t("Troponin I", 2, "ng/mL")], [t("Creatinine", 6, "mg/dL")], [t("ALT", 900, "U/L")],
  ];
  const conds = (p) => p.findings.map((f) => [...(f.warnings ?? [])].flatMap((w) => w.split(/(?<=[.؟!؛])\s+/)).filter((s) => /^(اگر|چنانچه|در صورتِ?)\s/.test(s)).length);
  for (const tests of panels) {
    const a = run(tests).p, b = run(tests, IN).p;
    assert.deepEqual(conds(b), conds(a), JSON.stringify(tests.map((x) => x.name)));
  }
});
