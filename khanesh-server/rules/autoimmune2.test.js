// ============================================================
// autoimmune2.test.js — P77: بقیهٔ پنلِ خودایمنی، آنتی‌فسفولیپید، تومورمارکرها، PSA، کالپروتکتین/FIT
// ------------------------------------------------------------
// منبعِ ادعاها «سند مرجعِ کاربر» است (MEDICAL_RULES.md P77)؛ هیچ‌کدام تأییدِ بازبینِ انسانی نیست.
// 🔴 پیش از P77 (اندازه‌گیری‌شده): همهٔ این ردیف‌ها unmapped بودند و فقط «تفسیر نشدند» می‌گرفتند.
// شعارِ کاربر: «هیچ‌کدام نباید به تفسیرنشده برود» ⇒ B12 (جاروب) هم ردیفِ بی‌محدودهٔ چاپی را می‌سنجد.
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { runEngine } from "./adapter.js";
import { runPatterns, RULES, SUGGEST_TESTS } from "./patterns.js";
import { FA_NAMES } from "./names.js";

const F = { age: 35, sex: "F" };
const run = (tests, patient = F) => {
  const e = runEngine({ patient, tests });
  const p = runPatterns(e);
  return { e, p, f: p.findings };
};
const txt = (f) => `${f.headline ?? ""} ${f.must_say ?? ""} ${f.action ?? ""} ${(f.warnings ?? []).join(" ")}`;
const byId = (r, id) => r.f.filter((x) => x.rule_id === id);
const NEW_IDS = ["ssc_antibody_result", "myositis_antibody_result", "antiphospholipid_result", "tumor_markers_result", "psa_result", "gi_stool_result"];

test("B00: شش شناسهٔ تازه در RULES است", () => {
  for (const id of NEW_IDS) assert.ok(RULES.some((r) => r.id === id), id);
});

// ═══════════ ANA: الگو ═══════════
test("B01: الگوی فلورسانسِ چاپ‌شده ⇒ جملهٔ «گزارش شده» (نه حکم)؛ الگو + تیترِ < ۱:۸۰ منفی است", () => {
  const sp = byId(run([{ name: "ANA", value: "Positive, Speckled 1:320" }]), "ana_family_result")[0];
  assert.match(txt(sp), /لکه‌ای/);
  const hom = byId(run([{ name: "ANA", value: "Homogeneous 1:160" }]), "ana_family_result")[0];
  assert.match(txt(hom), /هموژن \(AC-1\)/);
  assert.match(txt(hom), /در گزارش‌ها|گزارش شده است/);
  assert.doesNotMatch(txt(hom), /لوپوس دارید|بیماری دارید/);
  const cen = byId(run([{ name: "ANA", value: "Positive AC-3 1:640" }]), "ana_family_result")[0];
  assert.match(txt(cen), /سانترومر/);
  const lo = byId(run([{ name: "ANA", value: "Speckled 1:40" }]), "ana_family_result")[0];
  assert.match(txt(lo), /کمتر از ۱:۸۰ منفی|منفی/);
  assert.doesNotMatch(txt(lo), /ANA شما مثبت|لکه‌ای/);
});

test("B02: anti-dsDNA/Sm ⇒ ۶ امتیاز با قیدِ «علائمِ بالینی»؛ RNP + Sm ⇒ قیدِ Sharp؛ RNP تنها ⇒ MCTD بی‌حکم", () => {
  const a = byId(run([{ name: "Anti-Sm", value: "Positive" }, { name: "Anti-RNP", value: "Positive" }]), "ana_family_result")[0];
  assert.equal(a.urgency, "this_week");
  assert.match(txt(a), /۶ امتیاز/);
  assert.match(txt(a), /Sharp/);
  const b = byId(run([{ name: "Anti-U1-RNP", value: "85", unit: "U/mL", reference: "<20" }]), "ana_family_result")[0];
  assert.match(txt(b), /MCTD/);
  assert.doesNotMatch(txt(b), /Sharp/);
  assert.doesNotMatch(txt(b), /مبتلا|دارید/);
});

test("B03: Ro/La مثبت — بارداری ⇒ بلوکِ قلبی هفته ۱۶–۲۶؛ زنِ غیرباردار ⇒ «قصدِ بارداری»؛ مرد ⇒ هیچ؛ شیرخوار ⇒ آنتی‌بادیِ مادری", () => {
  const rows = [{ name: "Anti-Ro (SSA)", value: "Positive" }, { name: "Anti-La/SSB", value: "Positive" }];
  assert.match(txt(byId(run(rows, { age: 28, sex: "F", pregnant: true }), "ana_family_result")[0]), /هفتهٔ ۱۶ تا ۲۶/);
  assert.match(txt(byId(run(rows, F), "ana_family_result")[0]), /قصدِ بارداری/);
  assert.doesNotMatch(txt(byId(run(rows, { age: 40, sex: "M" }), "ana_family_result")[0]), /بارداری/);
  assert.match(txt(byId(run(rows, { age: 0.3, sex: "F" }), "ana_family_result")[0]), /از مادر رسیده/);
  // شوگرن: فقط SSA امتیاز دارد
  assert.match(txt(byId(run([{ name: "Anti-La/SSB", value: "Positive" }], F), "ana_family_result")[0]), /^((?!امتیاز دارد \(۳ امتیاز).)*$/s);
  assert.match(txt(byId(run([{ name: "Anti-Ro", value: "Positive" }], F), "ana_family_result")[0]), /۳ امتیاز/);
});

// ═══════════ Anti-CCP قوی/ضعیف ═══════════
test("B04: Anti-CCP — بیش از ۳×ULNِ چاپی ⇒ قوی؛ تا ۳× ⇒ ضعیف؛ فقط «مثبت» ⇒ ضعیف", () => {
  const strong = txt(byId(run([{ name: "Anti-CCP", value: "250", unit: "U/mL", reference: "<17" }]), "anti_ccp_result")[0]);
  assert.match(strong, /مثبتِ قوی/);
  const weak = txt(byId(run([{ name: "Anti-CCP", value: "40", unit: "U/mL", reference: "<17" }]), "anti_ccp_result")[0]);
  assert.match(weak, /مثبتِ ضعیف/);
  const word = txt(byId(run([{ name: "Anti-CCP", value: "Positive" }]), "anti_ccp_result")[0]);
  assert.match(word, /مثبتِ ضعیف \(۲ امتیاز\)/);
  assert.match(strong, /۶ یا بیشتر/);
});

test("B05: C3 و C4 هر دو پایین ⇒ جملهٔ ۴ امتیاز؛ یکی پایین ⇒ ۳ امتیاز", () => {
  const both = txt(byId(run([{ name: "C3", value: "0.5", unit: "g/L", reference: "0.9-1.8" }, { name: "C4", value: "0.05", unit: "g/L", reference: "0.1-0.4" }]), "complement_result")[0]);
  assert.match(both, /هر دو پایین‌اند/);
  const one = txt(byId(run([{ name: "C3", value: "0.5", unit: "g/L", reference: "0.9-1.8" }]), "complement_result")[0]);
  assert.match(one, /۳ امتیاز/);
  assert.doesNotMatch(one, /هر دو پایین‌اند/);
});

// ═══════════ اسکلرودرمی، میوزیت، آنتی‌فسفولیپید ═══════════
test("B06: Scl-70 مثبت ⇒ this_week، حدِ ۹ امتیاز، بی‌حکم؛ منفی ⇒ routine؛ سانترومر غایب گفته می‌شود", () => {
  const p = byId(run([{ name: "Scl-70", value: "Positive" }]), "ssc_antibody_result")[0];
  assert.equal(p.urgency, "this_week");
  assert.match(txt(p), /۹ امتیاز/);
  assert.match(txt(p), /anti-centromere روی این برگه نیست/);
  assert.doesNotMatch(txt(p), /اسکلرودرمی دارید|مبتلا/);
  const n = byId(run([{ name: "Anti-Scl-70", value: "Negative" }, { name: "Anti-Centromere", value: "Negative" }]), "ssc_antibody_result")[0];
  assert.equal(n.urgency, "routine");
});

test("B07: Anti-Jo-1 مثبت ⇒ this_week، ۳٫۹ امتیاز، CK سه‌حالته؛ منفی ⇒ «رد نمی‌کند»", () => {
  const p = byId(run([{ name: "Anti-Jo-1", value: "85", unit: "U/mL", reference: "<20" }]), "myositis_antibody_result")[0];
  assert.equal(p.urgency, "this_week");
  assert.match(txt(p), /۳٫۹ امتیاز/);
  assert.match(txt(p), /CK روی این برگه نیست/);
  const q = byId(run([{ name: "Jo-1", value: "Negative" }]), "myositis_antibody_result")[0];
  assert.match(txt(q), /رد نمی‌کند/);
});

test("B08: آنتی‌فسفولیپید — مثبت ⇒ this_week، ۱۲ هفته، IgG؛ سه‌گانه؛ غایب‌ها گفته می‌شوند؛ منفی ⇒ routine", () => {
  const r = run([{ name: "Lupus Anticoagulant", value: "Positive" }, { name: "Anticardiolipin IgG", value: "85", unit: "GPL", reference: "<20" }, { name: "Anti-Beta-2 Glycoprotein I IgG", value: "70", unit: "U/mL", reference: "<20" }]);
  const x = byId(r, "antiphospholipid_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "this_week");
  assert.match(txt(x[0]), /۱۲ هفته/);
  assert.match(txt(x[0]), /هر سه آزمایش/);
  assert.ok(!r.f.some((f) => ["unmatched_abnormal", "unexplained_abnormal"].includes(f.rule_id)));
  const la = byId(run([{ name: "Lupus Anticoagulant", value: "Positive" }]), "antiphospholipid_result")[0];
  assert.match(txt(la), /کاردیولیپین روی این برگه نیست/);
  assert.match(txt(la), /بتا-۲ گلیکوپروتئین I روی این برگه نیست/);
  const neg = byId(run([{ name: "Anticardiolipin IgM", value: "5", unit: "MPL", reference: "<20" }]), "antiphospholipid_result")[0];
  assert.equal(neg.urgency, "routine");
});

// ═══════════ تومورمارکرها ═══════════
test("B09: تومورمارکر — بالاتر از محدودهٔ چاپی ⇒ this_week بی‌تشخیص؛ داخل ⇒ routine؛ بی‌محدوده/سانسورشده ⇒ یافته (نه unmapped) با «بالا/پایین» نگفتن", () => {
  const r = run([{ name: "CEA", value: "12", unit: "ng/mL", reference: "<5" }, { name: "CA 19-9", value: "20", unit: "U/mL", reference: "<37" }]);
  const x = byId(r, "tumor_markers_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "this_week");
  assert.match(txt(x[0]), /بالاتر از مرزِ چاپ‌شده/);
  assert.match(txt(x[0]), /Lewis/);
  assert.match(txt(x[0]), /تشخیصِ سرطان نیست/);
  assert.doesNotMatch(txt(x[0]), /سرطان دارید|مبتلا/);
  const noref = run([{ name: "CA 125", value: "80", unit: "U/mL" }, { name: "AFP", value: "<0.5", unit: "ng/mL" }]);
  const y = byId(noref, "tumor_markers_result");
  assert.equal(y.length, 1, `unmapped: ${noref.e.unmapped}`);
  assert.equal(y[0].urgency, "routine");
  assert.match(txt(y[0]), /محدودهٔ مرجع روی همان ردیف چاپ نشده/);
  assert.equal(noref.e.unmapped.length, 0);
  assert.ok(!noref.f.some((f) => ["unmatched_abnormal", "unexplained_abnormal"].includes(f.rule_id)));
});

test("B10: کلسی‌تونین > ۱۰۰ فقط با واحدِ pg/mL ادعا می‌کند؛ بی‌واحد نه (N3)", () => {
  const hi = byId(run([{ name: "Calcitonin", value: "150", unit: "pg/mL" }]), "tumor_markers_result")[0];
  assert.equal(hi.urgency, "this_week");
  assert.match(txt(hi), /بالای ۱۰۰ pg\/mL/);
  const nu = byId(run([{ name: "Calcitonin", value: "150" }]), "tumor_markers_result")[0];
  assert.equal(nu.urgency, "routine");
  assert.doesNotMatch(txt(nu), /بالای ۱۰۰ pg\/mL/);
});

test("B11: کروموگرانین A ⇒ جملهٔ PPI؛ β2M ⇒ کراتینین؛ CA 15-3 ⇒ غربالگری نیست", () => {
  const t = txt(byId(run([{ name: "Chromogranin A", value: "300", unit: "ng/mL", reference: "<100" }, { name: "Beta-2 Microglobulin", value: "2.0", unit: "mg/L", reference: "1.0-2.5" }, { name: "CA 15-3", value: "20", unit: "U/mL", reference: "<30" }]), "tumor_markers_result")[0]);
  assert.match(t, /PPI/);
  assert.match(t, /کنارِ کراتینین/);
  // تغییرِ عمدی (specs/019، ۲۰۲۶-۱۱-۰۸): جملهٔ قدیمیِ «CA 15-3 برای غربالگری یا تشخیصِ سرطانِ پستان کاربرد ندارد؛ فقط برای پایش…» با
  //   عبارتِ منبع‌دارِ NACB 2008 (ص ۳۷: نشانگرهای خونی برای تشخیصِ زودهنگام بی‌ارزش‌اند؛ ص ۴۷: پایشِ بیماریِ پیشرفته) جایگزین شد.
  //   «تشخیص» و «فقط» در منبعِ بازشده نبود. معنای همین تست (CA 15-3 ابزارِ غربالگری نیست) همان مانده.
  assert.match(t, /نشانگرهای خونی برای تشخیصِ زودهنگامِ سرطانِ پستان کاربردی ندارند و CA 15-3 هم از این قاعده بیرون نیست/);
});

// ═══════════ PSA ═══════════
test("B12: PSA — درصدِ Free PSA فقط در PSA کل ۴ تا ۱۰؛ ≤۱۵٪ ⇒ this_week؛ فیناستراید ذکر می‌شود", () => {
  const a = byId(run([{ name: "Total PSA", value: "6.0", unit: "ng/mL" }, { name: "Free PSA", value: "0.5", unit: "ng/mL" }], { age: 62, sex: "M" }), "psa_result");
  assert.equal(a.length, 1);
  assert.equal(a[0].urgency, "this_week");
  assert.match(txt(a[0]), /حدود 8\.3٪/);
  assert.match(txt(a[0]), /حدود 56٪/);
  assert.match(txt(a[0]), /فیناستراید/);
  const b = byId(run([{ name: "PSA", value: "6.0", unit: "ng/mL" }, { name: "Free PSA", value: "1.8", unit: "ng/mL" }], { age: 62, sex: "M" }), "psa_result")[0];
  assert.equal(b.urgency, "routine");
  assert.match(txt(b), /حدود 8٪/);
  const c = byId(run([{ name: "PSA", value: "2.0", unit: "ng/mL" }, { name: "Free PSA", value: "0.3", unit: "ng/mL" }], { age: 62, sex: "M" }), "psa_result")[0];
  assert.match(txt(c), /حکمی نمی‌دهیم/);
  const d = byId(run([{ name: "PSA", value: "5.2", unit: "ng/mL", reference: "<4" }], { age: 62, sex: "M" }), "psa_result")[0];
  assert.equal(d.urgency, "this_week");
  const e2 = byId(run([{ name: "Free PSA", value: "0.5", unit: "ng/mL" }], { age: 62, sex: "M" }), "psa_result")[0];
  assert.match(txt(e2), /PSA کل روی این برگه نیست/);
});

// ═══════════ گوارش ═══════════
test("B13: FIT مثبت ⇒ this_week، کولونوسکوپی، بی‌نامِ سرطان به‌عنوان حکم؛ منفی ⇒ routine؛ عددِ بی‌محدوده ⇒ آستانه وابسته به کیت", () => {
  const p = run([{ name: "FIT", value: "Positive" }], { age: 55, sex: "M" });
  const x = byId(p, "gi_stool_result")[0];
  assert.equal(x.urgency, "this_week");
  assert.match(txt(x), /کولونوسکوپی/);
  assert.match(txt(x), /لزوماً سرطان نیست/);
  assert.ok(p.p.recommendations?.some?.((s) => /کولونوسکوپی/.test(s)) || (x.suggest ?? []).includes("کولونوسکوپی"));
  const n = byId(run([{ name: "Fecal Occult Blood", value: "Not detected" }], { age: 55, sex: "M" }), "gi_stool_result")[0];
  assert.equal(n.urgency, "routine");
  assert.match(txt(n), /۴۵ تا ۷۵/);
  const num = byId(run([{ name: "FIT", value: "25", unit: "ug/g" }], { age: 55, sex: "M" }), "gi_stool_result")[0];
  assert.match(txt(num), /به کیت و برنامه بستگی دارد/);
  const cal = byId(run([{ name: "Fecal Calprotectin", value: "400", unit: "ug/g", reference: "<50" }], { age: 30, sex: "F" }), "gi_stool_result")[0];
  assert.equal(cal.urgency, "this_week");
  assert.match(txt(cal), /بیماریِ التهابیِ روده را مطرح می‌کند/);
});

// ═══════════ N6 و هم‌نامی ═══════════
test("B14: N6 — FIT «Undetected» منفی، «Weakly positive» مثبت، «Trace» نه مثبت نه منفی (unmapped)", () => {
  assert.equal(byId(run([{ name: "FIT", value: "Undetected" }]), "gi_stool_result")[0].urgency, "routine");
  assert.equal(byId(run([{ name: "FIT", value: "Weakly positive" }]), "gi_stool_result")[0].urgency, "this_week");
  const r = run([{ name: "FIT", value: "Trace" }]);
  const tr = byId(r, "gi_stool_result");
  assert.equal(tr.length, 1);
  assert.equal(tr[0].urgency, "routine");
  assert.match(txt(tr[0]), /مرزی یا نامشخص/);
  assert.doesNotMatch(txt(tr[0]), /\(مثبت\)|\(منفی\)|کولونوسکوپی/);
  assert.equal(r.e.unmapped.length, 0);
});

test("B15: هم‌نامی — «La» تنها، «Sm» تنها، «CT»، «Ca»، «FIT» در نام‌های دیگر؛ کلسیم دست‌نخورده", () => {
  const r = run([{ name: "La", value: "Positive" }, { name: "Sm", value: "Positive" }, { name: "Ca", value: "9.4", unit: "mg/dL" }]);
  assert.equal(r.f.filter((f) => ["ana_family_result", "antiphospholipid_result"].includes(f.rule_id)).length, 0);
  assert.ok(r.e.graded.some((g) => g.test === "CA"));
});

// ═══════════ جاروبِ ناقض‌ها ═══════════
const KEYS_TXT = /\b(ANTI_SM|ANTI_RNP|SCL70|ANTI_CENTROMERE|JO1|ACL_IG[GM]|ACL|B2GPI(_IG[GM])?|LUPUS_AC|CA125|CA199|CA153|B2M|CALCITONIN|CGA|PSA_TOTAL|PSA_FREE|PSA_RATIO|CALPROTECTIN)\b/;   // «FIT» نامِ چاپ‌شدهٔ برگه است (مثل INR)، کلیدِ خام نیست
const PANELS = [
  [{ name: "Anti-Sm", value: "Positive" }, { name: "Anti-RNP", value: "12", unit: "U/mL", reference: "<20" }],
  [{ name: "Scl-70", value: "Positive" }, { name: "Anti-Centromere", value: "Positive" }],
  [{ name: "Anti-Jo-1", value: "Negative" }],
  [{ name: "Lupus Anticoagulant", value: "Negative" }, { name: "Anticardiolipin IgG", value: "5", unit: "GPL", reference: "<20" }, { name: "Anti-Beta-2 Glycoprotein I IgM", value: "70", unit: "U/mL", reference: "<20" }],
  [{ name: "CEA", value: "2", unit: "ng/mL" }, { name: "AFP", value: "3", unit: "ng/mL", reference: "<10" }, { name: "CA 125", value: "100", unit: "U/mL", reference: "<35" }, { name: "CA 15-3", value: "50" }, { name: "Calcitonin", value: "<2", unit: "pg/mL" }],
  [{ name: "Beta-2 Microglobulin", value: "4", unit: "mg/L" }, { name: "Chromogranin A", value: "80", unit: "ng/mL", reference: "<100" }],
  [{ name: "Total PSA", value: "1.1", unit: "ng/mL" }, { name: "Free PSA", value: "0.3", unit: "ng/mL" }, { name: "Free PSA Ratio", value: "27", unit: "%" }],
  [{ name: "Fecal Calprotectin", value: "30" }, { name: "FIT", value: "Negative" }],
];
test("B16: جاروبِ P77 — هر ردیف یافته می‌گیرد، بی‌undefined/کلیدِ خام/اورژانس/unmatched؛ suggest در SUGGEST_TESTS؛ FA_NAMES؛ هیچ ردیفی unmapped نیست", () => {
  for (const pt of [F, { age: 8, sex: "M" }, { age: 82, sex: "F" }, { age: 28, sex: "F", pregnant: true }, { age: 55, sex: "M" }]) {
    for (const t of PANELS) {
      const r = run(t, pt);
      assert.deepEqual(r.e.unmapped, [], `unmapped ${JSON.stringify(t)} → ${r.e.unmapped}`);
      assert.ok(r.f.some((f) => NEW_IDS.includes(f.rule_id) || ["ana_family_result", "anti_ccp_result"].includes(f.rule_id)), `بی‌یافته: ${JSON.stringify(t)}`);
      assert.ok(!r.f.some((f) => ["unmatched_abnormal", "unexplained_abnormal"].includes(f.rule_id)), `${JSON.stringify(t)} → ${r.f.map((f) => f.rule_id)}`);
      for (const f of r.f.filter((x) => NEW_IDS.includes(x.rule_id) || x.rule_id === "ana_family_result")) {
        const s = txt(f);
        assert.ok(!/undefined|null|\bNaN\b/.test(s), s);
        assert.ok(!KEYS_TXT.test(s), `کلیدِ خام: ${s}`);
        assert.notEqual(f.urgency, "emergency");
        for (const g of f.suggest ?? []) assert.ok(Object.prototype.hasOwnProperty.call(SUGGEST_TESTS, g), `«${g}»`);
      }
    }
  }
  for (const k of ["ANTI_SM", "ANTI_RNP", "SCL70", "ANTI_CENTROMERE", "JO1", "ACL_IGG", "ACL_IGM", "ACL", "B2GPI_IGG", "B2GPI_IGM", "B2GPI", "LUPUS_AC", "CEA", "AFP", "CA125", "CA199", "CA153", "B2M", "CALCITONIN", "CGA", "PSA_TOTAL", "PSA_FREE", "PSA_RATIO", "CALPROTECTIN", "FIT"]) {
    assert.ok(FA_NAMES[k], `FA_NAMES.${k}`);
  }
});

test("B17: AFP با محدودهٔ چاپی (بی‌واحد) یافته می‌گیرد؛ MoM یا بی‌واحدِ بی‌محدوده unmapped می‌ماند (M105)", () => {
  const hi = run([{ name: "AFP", value: "45", reference: "< 10" }], { age: 50, sex: "M" });
  const x = byId(hi, "tumor_markers_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "this_week");
  assert.match(txt(x[0]), /بالاتر از مرزِ چاپ‌شدهٔ همان ردیف/);
  assert.equal(hi.e.unmapped.length, 0);
  const ok = byId(run([{ name: "Alpha-Fetoprotein", value: "3.1", reference: "0-8.5" }], { age: 50, sex: "M" }), "tumor_markers_result")[0];
  assert.equal(ok.urgency, "routine");
  const mom = run([{ name: "AFP", value: "1.2", unit: "MoM", reference: "0.5-2.5" }], { age: 28, sex: "F", pregnant: true });
  assert.equal(byId(mom, "tumor_markers_result").length, 0);
  // ⚠️ re-baseline عمدی (specs/013): پیش‌تر `unmapped.includes("AFP")` — افتِ خاموشِ غربالگری (N28). حالا AFPِ MoM
  //    AFPِ سرمِ مادر است (کانالِ prenatal)، و هنوز هرگز تومورمارکر نیست (خطِ بالا).
  assert.ok(mom.e.prenatal.markers.AFP_MAT, "AFPِ MoM به کانالِ غربالگری نرفت");
  assert.ok(!mom.e.unmapped.includes("AFP"));
  const bare = run([{ name: "AFP", value: "45" }], { age: 50, sex: "M" });
  assert.equal(byId(bare, "tumor_markers_result").length, 0);
});

// ═══════════ P112: قواعدِ خونِ مخفی در مدفوع، برگرفته از گایدلاین‌ها و مقالات (۲۰۲۶-۱۰-۲۱، درخواستِ کاربر) ═══════════
// هر جمله‌ای که این آزمون‌ها می‌سنجند یک منبعِ ثبت‌شده در guidelines.js دارد؛ B23 نبودِ منبعِ معلق را قفل می‌کند.
test("B18: FIT مثبت + کمخونیِ فقر آهن ⇒ بررسیِ همزمانِ گوارشِ فوقانی و تحتانی + منبعِ IDA/دارو/تأخیر", () => {
  const rows = [
    { name: "Occult Blood (FIT)", value: "Positive" },
    { name: "Hemoglobin", value: "9.8", unit: "g/dL", reference: "12-16" },
    { name: "Ferritin", value: "8", unit: "ng/mL", reference: "15-150" },
  ];
  const x = byId(run(rows, { age: 58, sex: "M" }), "gi_stool_result")[0];
  assert.equal(x.urgency, "this_week");
  assert.match(txt(x), /آندوسکوپی/);
  assert.match(txt(x), /۹٫۸|9.8/);
  assert.match(txt(x), /۱۰ ماه/);
  assert.match(txt(x), /آسپیرین/);
  assert.doesNotMatch(txt(x), /قطعِ (این )?داروها لازم است/);
  assert.ok((x.suggest ?? []).includes("آندوسکوپیِ فوقانی"), JSON.stringify(x.suggest));
  for (const id of ["USPSTF_CRC_2021", "ACPGBI_BSG_FIT_2022", "BSG_ACPGBI_FIT_IDA_2025", "NIEWENBURG_2019_FIT_DRUGS", "CORLEY_2017_FIT_DELAY"]) {
    assert.ok((x.sources ?? []).includes(id), `منبعِ ${id} پیوست نشد: ${JSON.stringify(x.sources)}`);
  }
  // بی‌کمخونی: جملهٔ آندوسکوپیِ فوقانی نباید بیاید (شرطی است، نه سراسری).
  const noAnemia = byId(run([{ name: "FIT", value: "Positive" }], { age: 58, sex: "M" }), "gi_stool_result")[0];
  assert.doesNotMatch(txt(noAnemia), /آندوسکوپی/);
  assert.match(txt(noAnemia), /۱۰ ماه/);   // جملهٔ تأخیر مالِ هر FIT مثبت است، نه فقط کمخونی‌دار
});

test("B19: FIT مثبت زیرِ ۵۰ سال ⇒ جملهٔ سن (IBD محتمل‌تر)؛ بالای ۵۰ سال گفته نمی‌شود", () => {
  const young = byId(run([{ name: "FIT", value: "Positive" }], { age: 44, sex: "F" }), "gi_stool_result")[0];
  assert.match(txt(young), /زیرِ ۵۰ سال/);
  const old = byId(run([{ name: "FIT", value: "Positive" }], { age: 61, sex: "M" }), "gi_stool_result")[0];
  assert.doesNotMatch(txt(old), /زیرِ ۵۰ سال/);
});

test("B20: FIT منفی + کمخونیِ فقر آهن ⇒ «بررسی را حذف نمی‌کند» + هر دو بخشِ گوارش", () => {
  const x = byId(run([
    { name: "FIT", value: "Negative" },
    { name: "Hemoglobin", value: "10.4", unit: "g/dL", reference: "12-16" },
    { name: "MCV", value: "72", unit: "fL", reference: "80-100" },
  ], { age: 52, sex: "F" }), "gi_stool_result")[0];
  assert.equal(x.urgency, "routine");
  assert.match(txt(x), /حذف نمی‌کند/);
  assert.match(txt(x), /آندوسکوپی/);
  assert.match(txt(x), /ردِ ارجاع نیست/);
  // بی‌کمخونی: FIT منفی همان متنِ غربالگری/علائم را دارد، بی‌ادعای گوارشِ فوقانی.
  const plain = byId(run([{ name: "FIT", value: "Negative" }], { age: 52, sex: "F" }), "gi_stool_result")[0];
  assert.doesNotMatch(txt(plain), /آندوسکوپی/);
});

test("B21: نام‌های گایاکی (gFOBT/Hemoccult/Stool Guaiac) هم خوانده می‌شوند و جملهٔ سه‌نمونه/محدودیتِ غذایی می‌گیرند", () => {
  const rows = [
    { name: "Guaiac FOBT", value: "Positive" },
    { name: "Hemoccult SENSA", value: "Negative" },
    { name: "Stool Guaiac", value: "Positive" },
  ];
  const r = run(rows, { age: 60, sex: "M" });
  assert.deepEqual(r.e.unmapped, [], JSON.stringify(r.e.unmapped));
  const x = byId(r, "gi_stool_result")[0];
  assert.match(txt(x), /گایاکی/);
  assert.match(txt(x), /سه نمونه/);
  assert.match(txt(x), /محدودیتِ غذایی/);
  // نامِ چاپ‌شدهٔ برگه در متن می‌آید، نه کلیدِ خامِ موتور.
  assert.match(txt(x), /Guaiac FOBT/);
  assert.match(txt(x), /کولونوسکوپی/);
  assert.ok(!/\b(CALPROTECTIN|HLA_B27|PSA_TOTAL)\b/.test(txt(x)));
  // ردیفِ عددیِ گایاکی (نامِ چاپ‌شده) هم روش را می‌گیرد؛ نمایشِ نام برای ردیفِ assay عوض نمی‌شود (PN02: متنِ برگه‌های دیگر بایت‌به‌بایت).
  const num = byId(run([{ name: "Hemoccult SENSA", value: "25", unit: "ug/g", reference: "<20" }], { age: 60, sex: "M" }), "gi_stool_result")[0];
  assert.match(txt(num), /گایاکی/);
  assert.match(txt(num), /خونِ مخفی در مدفوع/);
  assert.doesNotMatch(txt(num), /Hemoccult SENSA/);
});

test("B22: FITِ عددیِ ng/mL بی‌مرزِ چاپی ⇒ تبدیلِ واحد به µg Hb/g و بی‌حکم بودنِ مثبت/منفی (C1)", () => {
  const x = byId(run([{ name: "FIT", value: "80", unit: "ng/mL" }], { age: 57, sex: "M" }), "gi_stool_result")[0];
  assert.equal(x.urgency, "routine");
  assert.match(txt(x), /16 µg Hb\/g/);
  assert.match(txt(x), /به کیت و برنامه بستگی دارد/);
  assert.doesNotMatch(txt(x), /\(مثبت\)|\(منفی\)/);
  assert.ok((x.sources ?? []).includes("FIT_UNIT_CONVERSION_2013"));
  // واحدِ µg/g که خودِ راهنماها به کار می‌برند: جملهٔ تبدیل لازم نیست.
  const ug = byId(run([{ name: "FIT", value: "40", unit: "ug/g", reference: "<20" }], { age: 57, sex: "M" }), "gi_stool_result")[0];
  assert.equal(ug.urgency, "this_week");
  assert.doesNotMatch(txt(ug), /معادلِ ۱ µg/);
  assert.match(txt(ug), /واحدی است که راهنماها با آن کار می‌کنند/);
});

test("B23: هر شناسهٔ منبعِ FIT/FOBT در guidelines.js رجیستری است (بی‌منبعِ معلق)", async () => {
  const { guideline } = await import("./guidelines.js");
  const ids = ["USPSTF_CRC_2021", "ACPGBI_BSG_FIT_2022", "BSG_ACPGBI_FIT_IDA_2025", "NIEWENBURG_2019_FIT_DRUGS", "CORLEY_2017_FIT_DELAY", "FIT_UNIT_CONVERSION_2013"];
  for (const id of ids) {
    const g = guideline(id);
    assert.ok(g, id);
    assert.ok(g.org && g.fa && g.title && g.url && g.scope, `${id} ناقص است`);
  }
  // ⚠️ C1: عدد و واحدِ راهنماها فقط در scope/متنِ بیمار می‌آید، نه به‌عنوانِ آستانهٔ کد.
  for (const id of ["USPSTF_CRC_2021", "ACPGBI_BSG_FIT_2022", "FIT_UNIT_CONVERSION_2013"]) {
    assert.ok(/µg|ng\/mL/.test(guideline(id).scope), `${id} واحدِ راهنما را ثبت نکرده`);
  }
});
