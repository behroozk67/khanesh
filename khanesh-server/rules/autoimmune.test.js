// ============================================================
// autoimmune.test.js — P76 مرحلهٔ ۱: خودایمنی/روماتولوژیِ کیفی و عددیِ بی‌نمره
// ------------------------------------------------------------
// 🔴 پیش از این کار (اندازه‌گیری‌شده ۲۰۲۶-۱۰-۰۴، probe.mjs): ANA مثبت، anti-dsDNA ۸۵ IU/mL و c-ANCA مثبت
//    هر سه `overall=none` و فقط «نتایج را در پرونده نگه دارید» می‌دادند (N2/N28).
// C1: هیچ آستانهٔ تأییدنشده‌ای در کد نیست؛ عدد فقط با مرزِ چاپ‌شده روی همان ردیف سنجیده می‌شود.
// N6: مقدارِ کیفی مجموعهٔ بستهٔ کلمه است (qualVerdict). فایلِ جدا تا با جلسهٔ هم‌زمان تداخل نکند.
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
const IDS = ["ana_family_result", "anca_result", "hla_b27_result"];

test("A00: سه شناسهٔ تازه در RULES است", () => {
  for (const id of IDS) assert.ok(RULES.some((r) => r.id === id), `${id} در RULES نیست`);
});

// ═══════════ ANA و آنتی‌بادی‌های هسته‌ای ═══════════
test("A01: ANA مثبتِ تنها ⇒ یک یافته، routine، بی‌نامِ بیماری، و dsDNA/ENA «روی برگه نیست»", () => {
  const r = run([{ name: "ANA", value: "Positive" }]);
  const x = byId(r, "ana_family_result");
  assert.equal(x.length, 1, `ids: ${r.f.map((f) => f.rule_id)}`);
  assert.equal(x[0].urgency, "routine");
  assert.ok(!r.f.some((f) => f.rule_id === "unmatched_abnormal"));
  const t = txt(x[0]);
  assert.match(t, /anti-dsDNA/i);
  assert.match(t, /روی این برگه نیست/);
  // P77: جملهٔ معیارهای طبقه‌بندیِ لوپوس (شرطِ ورودِ ANA) عمداً هست؛ نبایدِ حکمِ «شما لوپوس دارید» و نبودِ الگو ⇒ بی‌اسمِ بیماریِ الگو.
  assert.doesNotMatch(t, /لوپوس دارید|بیماری دارید|اسکلرودرمی|شوگرن|الگوی/);
  assert.match(t, /EULAR\/ACR 2019/);
});

test("A02: ANA منفی ⇒ یافتهٔ مختصرِ منفی، routine، و حکمِ «بیماری ندارید» نمی‌دهد", () => {
  const r = run([{ name: "ANA", value: "Negative" }]);
  const x = byId(r, "ana_family_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "routine");
  assert.match(txt(x[0]), /منفی/);
  assert.doesNotMatch(txt(x[0]), /بیماری (خودایمنی )?ندارید|رد (می‌شود|شد)\b/);
});

test("A03: «Positive 1:160» ⇒ تیتر نقل می‌شود", () => {
  const x = byId(run([{ name: "ANA (IFA)", value: "Positive 1:160" }]), "ana_family_result");
  assert.equal(x.length, 1);
  assert.match(txt(x[0]), /1:160/);
});

test("A04: تیترِ بی‌واژهٔ ANA — ≥ ۱:۸۰ مثبت و < ۱:۸۰ منفی (شرطِ ورودِ EULAR/ACR 2019، P77)؛ تیترِ غیر از ANA همچنان قضاوت نمی‌شود", () => {
  const hi = byId(run([{ name: "ANA Titer", value: "1:80" }]), "ana_family_result");
  assert.equal(hi.length, 1);
  assert.match(txt(hi[0]), /۱:۸۰ یا بیشتر/);
  const lo = byId(run([{ name: "ANA", value: "1:40" }]), "ana_family_result");
  assert.equal(lo.length, 1);
  assert.match(txt(lo[0]), /کمتر از ۱:۸۰ منفی/);
  assert.doesNotMatch(txt(lo[0]), /ANA شما مثبت/);
  // تیترِ بی‌واژه برای آزمایشِ دیگر (مثلاً VDRL-خانواده یا dsDNA) هنوز unmapped است
  const r = run([{ name: "Anti-dsDNA", value: "1:40" }]);
  assert.equal(byId(r, "ana_family_result").length, 0);
  assert.ok(r.e.unmapped.includes("Anti-dsDNA"));
});

test("A05: ANA مثبت + anti-dsDNA ۸۵ (مرزِ چاپیِ <30) ⇒ یک یافته، this_week، dsDNA «بالاتر از مرز»", () => {
  const r = run([{ name: "ANA", value: "Positive" }, { name: "Anti-dsDNA", value: "85", unit: "IU/mL", reference: "<30" }]);
  const x = byId(r, "ana_family_result");
  assert.equal(x.length, 1, "یک یافته برای خانوادهٔ ANA (N20)");
  assert.equal(x[0].urgency, "this_week");
  assert.match(txt(x[0]), /بالاتر از مرز/);
  assert.match(txt(x[0]), /85/);
  assert.ok(!r.f.some((f) => ["unmatched_abnormal", "unexplained_abnormal"].includes(f.rule_id)));
});

test("A06: anti-dsDNA داخلِ مرزِ چاپی ⇒ routine؛ ANA غایب ⇒ گفته می‌شود روی برگه نیست (N4)", () => {
  const x = byId(run([{ name: "Anti-dsDNA", value: "12", unit: "IU/mL", reference: "<30" }]), "ana_family_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "routine");
  assert.match(txt(x[0]), /داخل/);
  assert.match(txt(x[0]), /ANA.*روی این برگه نیست/s);
});

test("A07: dsDNA عددی بی‌مرزِ چاپی ⇒ unmapped، بی‌یافته (C1)", () => {
  const r = run([{ name: "Anti-dsDNA", value: "85", unit: "IU/mL" }]);
  assert.equal(byId(r, "ana_family_result").length, 0);
  assert.ok(r.e.unmapped.includes("Anti-dsDNA"));
});

test("A08: N6 — «+/-»، «Equivocal» مثبت نیستند؛ «Weak positive»، «Undetected»، «Non-reactive» درست خوانده می‌شوند", () => {
  for (const v of ["+/-", "Equivocal", "Borderline"]) {
    const r = run([{ name: "ANA", value: v }]);
    assert.equal(byId(r, "ana_family_result").length, 0, `«${v}» نباید یافته بسازد`);
    assert.ok(r.e.unmapped.includes("ANA"), `«${v}» باید نام برده شود`);
  }
  assert.equal(byId(run([{ name: "ANA", value: "Weak positive" }]), "ana_family_result")[0]?.urgency, "routine");
  assert.match(txt(byId(run([{ name: "ANA", value: "Weak positive" }]), "ana_family_result")[0]), /مثبت/);
  for (const v of ["Undetected", "Non-reactive", "Not detected", "منفی"]) {
    const x = byId(run([{ name: "ANA", value: v }]), "ana_family_result");
    assert.equal(x.length, 1, v);
    assert.doesNotMatch(txt(x[0]), /مثبت است|مثبت‌ است/, `«${v}» مثبت خوانده شد`);
  }
});

test("A09: Anti-Ro (SSA) و Anti-La مثبت ⇒ this_week، همان یافتهٔ ANA-خانواده", () => {
  const r = run([{ name: "Anti-Ro (SSA)", value: "Positive" }, { name: "Anti-La/SSB", value: "Negative" }]);
  const x = byId(r, "ana_family_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "this_week");
});

// ═══════════ ANCA ═══════════
test("A10: c-ANCA مثبت + MPO منفی ⇒ this_week؛ PR3 «روی برگه نیست»؛ کراتینین غایب گفته می‌شود", () => {
  const r = run([{ name: "c-ANCA", value: "Positive" }, { name: "MPO", value: "Negative" }], { age: 50, sex: "M" });
  const x = byId(r, "anca_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "this_week");
  const t = txt(x[0]);
  assert.match(t, /PR3.*روی این برگه نیست/s);
  assert.match(t, /کراتینین.*روی این برگه نیست/s);
  // P77: الگوی c-ANCA/PR3 ⇒ GPA «گزارش شده» (نه حکم)؛ حکمِ «دارید» ممنوع است.
  assert.match(t, /گزارش شده/);
  assert.doesNotMatch(t, /واسکولیت دارید|GPA دارید|مبتلا/);
});

test("A11: کراتینینِ چاپ‌شده کنارِ ANCA مثبت ⇒ سه‌حالته (بالا / داخل)", () => {
  const hi = byId(run([{ name: "c-ANCA", value: "Positive" }, { name: "Creatinine", value: "3.1", unit: "mg/dL" }], { age: 50, sex: "M" }), "anca_result")[0];
  assert.ok(hi);
  assert.match(txt(hi), /کراتینین.*(بیرون|بالاتر)/s);
  const ok = byId(run([{ name: "c-ANCA", value: "Positive" }, { name: "Creatinine", value: "0.9", unit: "mg/dL" }], { age: 50, sex: "M" }), "anca_result")[0];
  assert.match(txt(ok), /کراتینین.*داخل/s);
});

test("A12: p-ANCA منفی ⇒ routine، بی‌حکمِ رد", () => {
  const x = byId(run([{ name: "p-ANCA", value: "Negative" }]), "anca_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "routine");
  assert.doesNotMatch(txt(x[0]), /رد (می‌شود|شد)\b/);
});

test("A13: MPO ۴۵ U/mL (مرزِ چاپیِ <20) ⇒ this_week؛ PR3 «Not detected» ⇒ منفی", () => {
  const r = run([{ name: "Anti-MPO", value: "45", unit: "U/mL", reference: "<20" }, { name: "Anti-PR3", value: "Not detected" }]);
  const x = byId(r, "anca_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "this_week");
  assert.match(txt(x[0]), /45/);
  assert.ok(!r.f.some((f) => ["unmatched_abnormal", "unexplained_abnormal"].includes(f.rule_id)));
});

// ═══════════ HLA-B27 ═══════════
test("A14: HLA-B27 مثبت ⇒ routine، «ژن است نه بیماری»؛ منفی ⇒ «رد نمی‌کند»", () => {
  const p = byId(run([{ name: "HLA-B27", value: "Positive" }]), "hla_b27_result");
  assert.equal(p.length, 1);
  assert.equal(p[0].urgency, "routine");
  assert.match(txt(p[0]), /ژن/);
  assert.match(txt(p[0]), /به‌تنهایی بیماری را نشان نمی‌دهد|بیماری نیست/);
  const n = byId(run([{ name: "HLA B27", value: "Negative" }]), "hla_b27_result");
  assert.equal(n.length, 1);
  assert.match(txt(n[0]), /رد نمی‌کند/);
});

// ═══════════ جاروب‌های ناقض ═══════════
const PANELS = [
  [{ name: "ANA", value: "Positive" }],
  [{ name: "ANA", value: "Positive 1:320" }, { name: "Anti-dsDNA", value: "85", unit: "IU/mL", reference: "<30" }, { name: "Anti-Ro", value: "Positive" }, { name: "Anti-La", value: "Negative" }],
  [{ name: "ANA", value: "Negative" }, { name: "Anti-dsDNA", value: "5", unit: "IU/mL", reference: "<30" }],
  [{ name: "c-ANCA", value: "Positive" }, { name: "PR3", value: "88", unit: "U/mL", reference: "<20" }],
  [{ name: "p-ANCA", value: "Positive" }, { name: "MPO", value: "Negative" }],
  [{ name: "ANCA", value: "Negative" }],
  [{ name: "HLA-B27", value: "Positive" }],
];

test("A15: جاروب — بی‌undefined، بی‌کلیدِ خام، هیچ اورژانسی، هر suggest در SUGGEST_TESTS، explains برای کلیدهای عددی", () => {
  for (const pt of [F, { age: 8, sex: "M" }, { age: 82, sex: "F" }, { age: 28, sex: "F", pregnant: true }]) {
    for (const t of PANELS) {
      const r = run(t, pt);
      for (const f of r.f.filter((x) => IDS.includes(x.rule_id))) {
        const s = txt(f);
        assert.ok(!/undefined|null|\bNaN\b/.test(s), `${f.rule_id}: ${s}`);
        assert.ok(!/ANTI_DSDNA|ANTI_RO|ANTI_LA|C_ANCA|P_ANCA|HLA_B27/.test(s), `کلیدِ خام: ${s}`);
        assert.notEqual(f.urgency, "emergency");
        assert.ok(!f.has_critical);
        for (const g of f.suggest ?? []) assert.ok(Object.prototype.hasOwnProperty.call(SUGGEST_TESTS, g), `«${g}» در SUGGEST_TESTS نیست`);
      }
      assert.ok(!r.f.some((f) => ["unmatched_abnormal", "unexplained_abnormal"].includes(f.rule_id)),
        `${JSON.stringify(t)} → ${r.f.map((f) => f.rule_id)}`);
      assert.ok(r.f.some((f) => IDS.includes(f.rule_id)), `بی‌یافته: ${JSON.stringify(t)}`);
    }
  }
});

test("A16: FA_NAMES برای کلیدهای عددیِ تازه", () => {
  for (const k of ["ANTI_DSDNA", "ANTI_RO", "ANTI_LA", "C_ANCA", "P_ANCA", "ANCA", "MPO", "PR3"]) {
    // ANCA / c-ANCA / p-ANCA: نامِ چاپ‌شدهٔ برگه همان اختصار است (مثلِ MCH/INR) — فقط حضور را می‌سنجیم.
    assert.ok(FA_NAMES[k], `FA_NAMES.${k}`);
  }
});

test("A17: هم‌نامی‌ها — «RO» و «ANA» در نام‌های دیگر نمی‌گیرند؛ کلسیمِ CA دست‌نخورده", () => {
  const r = run([{ name: "Ca", value: "9.4", unit: "mg/dL" }, { name: "Banana", value: "Positive" }]);
  assert.equal(r.f.filter((f) => IDS.includes(f.rule_id)).length, 0);
});

// ═══════════ مرحلهٔ ۲: Anti-CCP و کمپلمان C3/C4 ═══════════
const IDS2 = ["anti_ccp_result", "complement_result"];

test("A18: Anti-CCP ۲۵۰ (مرزِ چاپیِ <17) ⇒ routine هم‌سطحِ rf_positive، RF سه‌حالته، بی‌نامِ بیماری", () => {
  const r = run([{ name: "Anti-CCP", value: "250", unit: "U/mL", reference: "<17" }, { name: "RF", value: "80", unit: "IU/mL", reference: "<14" }], { age: 50, sex: "F" });
  const x = byId(r, "anti_ccp_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "routine");
  assert.match(txt(x[0]), /250/);
  assert.match(txt(x[0]), /RF روی همین برگه هم بالاتر/);
  assert.doesNotMatch(txt(x[0]), /روماتیسم مفصلی دارید|ابتلا به/);
  // دو یافتهٔ روماتیسمی، یک زمان‌بندی (N20)
  const urg = new Set(r.f.filter((f) => ["rf_positive", "anti_ccp_result"].includes(f.rule_id)).map((f) => f.urgency));
  assert.equal(urg.size, 1, `زمان‌بندی‌های رقیب: ${[...urg]}`);
  // Anti-CCP روی برگه است ⇒ rf_positive دوباره «درخواست Anti-CCP» نمی‌کند
  assert.ok(!r.p.findings.some((f) => (f.suggest ?? []).includes("Anti-CCP")), "Anti-CCP اندازه‌گیری‌شده دوباره پیشنهاد شد (N8)");
});

test("A19: Anti-CCP منفی (واژه) ⇒ «رد نمی‌کند»؛ RF غایب گفته می‌شود؛ بی‌مرزِ چاپیِ عددی ⇒ unmapped", () => {
  const x = byId(run([{ name: "Anti-CCP", value: "Negative" }]), "anti_ccp_result");
  assert.equal(x.length, 1);
  assert.match(txt(x[0]), /رد نمی‌کند/);
  assert.match(txt(x[0]), /RF روی این برگه نیست/);
  const r = run([{ name: "Anti-CCP", value: "250", unit: "U/mL" }]);
  assert.equal(byId(r, "anti_ccp_result").length, 0);
  assert.ok(r.e.unmapped.includes("Anti-CCP"));
});

test("A20: RF بالا بدونِ Anti-CCP هنوز «درخواست Anti-CCP» می‌دهد (پیشنهادِ درست نباید حذف شود)", () => {
  const r = run([{ name: "RF", value: "80", unit: "IU/mL", reference: "<14" }], { age: 50, sex: "F" });
  assert.ok(r.p.findings.some((f) => (f.suggest ?? []).includes("Anti-CCP")));
});

test("A21: C3 پایین (بازهٔ چاپیِ 0.9-1.8) ⇒ this_week؛ C4 غایب گفته می‌شود؛ dsDNA غایب گفته می‌شود", () => {
  const r = run([{ name: "C3", value: "0.6", unit: "g/L", reference: "0.9-1.8" }]);
  const x = byId(r, "complement_result");
  assert.equal(x.length, 1);
  assert.equal(x[0].urgency, "this_week");
  assert.match(txt(x[0]), /پایین‌تر از محدودهٔ چاپ‌شده/);
  assert.match(txt(x[0]), /C4 روی این برگه نیست/);
  assert.match(txt(x[0]), /anti-dsDNA روی این برگه نیست/);
  assert.ok(!r.f.some((f) => ["unmatched_abnormal", "unexplained_abnormal"].includes(f.rule_id)));
});

test("A22: C3/C4 داخلِ بازه یا بالا ⇒ routine بی‌حکمِ بیماری؛ mg/dL با بازهٔ mg/dL همان جهت را می‌دهد؛ بی‌بازه ⇒ unmapped", () => {
  const ok = byId(run([{ name: "C3", value: "120", unit: "mg/dL", reference: "90-180" }, { name: "C4", value: "30", unit: "mg/dL", reference: "10-40" }]), "complement_result")[0];
  assert.equal(ok.urgency, "routine");
  assert.match(txt(ok), /داخلِ محدودهٔ چاپ‌شده/);
  const low = byId(run([{ name: "C4", value: "5", unit: "mg/dL", reference: "10-40" }]), "complement_result")[0];
  assert.equal(low.urgency, "this_week");
  const hi = byId(run([{ name: "C3", value: "2.4", unit: "g/L", reference: "0.9-1.8" }]), "complement_result")[0];
  assert.equal(hi.urgency, "routine");
  assert.match(txt(hi), /بالاتر از محدودهٔ چاپ‌شده/);
  const none = run([{ name: "C3", value: "0.6", unit: "g/L" }]);
  assert.equal(byId(none, "complement_result").length, 0);
  assert.ok(none.e.unmapped.includes("C3"));
  const cens = run([{ name: "C4", value: "<5", unit: "mg/dL", reference: "10-40" }]);
  assert.equal(byId(cens, "complement_result").length, 0);
});

test("A23: dsDNA مثبت بی‌C3/C4 ⇒ «C3 و C4» پیشنهاد می‌شود؛ با C3 روی برگه نه", () => {
  const sug = (t) => run(t).p.findings.flatMap((f) => f.suggest ?? []);
  assert.ok(sug([{ name: "Anti-dsDNA", value: "85", unit: "IU/mL", reference: "<30" }]).includes("C3 و C4"));
  assert.ok(!sug([{ name: "Anti-dsDNA", value: "85", unit: "IU/mL", reference: "<30" }, { name: "C3", value: "1.2", unit: "g/L", reference: "0.9-1.8" }]).includes("C3 و C4"));
});

test("A24: جاروبِ مرحلهٔ ۲ — بی‌undefined، بی‌کلیدِ خام، هیچ اورژانسی، suggest در SUGGEST_TESTS، بی‌unmatched/unexplained", () => {
  const panels = [
    [{ name: "Anti-CCP", value: "250", unit: "U/mL", reference: "<17" }],
    [{ name: "ACPA", value: "Positive" }],
    [{ name: "Anti-CCP", value: "3", unit: "U/mL", reference: "<17" }, { name: "RF", value: "5", unit: "IU/mL", reference: "<14" }],
    [{ name: "C3", value: "0.6", unit: "g/L", reference: "0.9-1.8" }, { name: "C4", value: "0.05", unit: "g/L", reference: "0.1-0.4" }],
    [{ name: "C3", value: "1.2", unit: "g/L", reference: "0.9-1.8" }],
  ];
  for (const pt of [F, { age: 8, sex: "M" }, { age: 82, sex: "F" }, { age: 28, sex: "F", pregnant: true }]) for (const t of panels) {
    const r = run(t, pt);
    assert.ok(r.f.some((f) => IDS2.includes(f.rule_id)), `بی‌یافته: ${JSON.stringify(t)}`);
    for (const f of r.f.filter((x) => IDS2.includes(x.rule_id))) {
      const s = txt(f);
      assert.ok(!/undefined|null|\bNaN\b/.test(s), s);
      assert.ok(!/ANTI_CCP|\bC3\b(?!\s)|^C4$/.test(s.replace(/کمپلمان C3|کمپلمان C4|C3 و C4|C3 یا C4|C4 روی|C3 روی|\(C3 \/ C4\)/g, "")), `کلیدِ خام: ${s}`);
      assert.notEqual(f.urgency, "emergency");
      for (const g of f.suggest ?? []) assert.ok(Object.prototype.hasOwnProperty.call(SUGGEST_TESTS, g), `«${g}»`);
    }
    assert.ok(!r.f.some((f) => ["unmatched_abnormal", "unexplained_abnormal"].includes(f.rule_id)), `${JSON.stringify(t)} → ${r.f.map((f) => f.rule_id)}`);
  }
});

test("A25: کلیدهای تازه در FA_NAMES و شناسه‌ها در RULES", () => {
  for (const k of ["ANTI_CCP", "C3", "C4"]) assert.ok(FA_NAMES[k], `FA_NAMES.${k}`);
  for (const id of IDS2) assert.ok(RULES.some((r) => r.id === id), id);
});

test("A26: هم‌نامی — «C3»/«C4» در نام‌های دیگر (مثلاً T3/T4/PCT) نمی‌گیرد؛ تیروئید دست‌نخورده", () => {
  const r = run([{ name: "T3", value: "1.2", unit: "ng/mL" }, { name: "T4", value: "8", unit: "ug/dL" }, { name: "TSH", value: "2", unit: "mIU/L" }]);
  assert.equal(r.f.filter((f) => IDS2.includes(f.rule_id)).length, 0);
});

test("A27: ANCA مثبت با MPO روی برگه ⇒ فقط PR3 پیشنهاد/خواسته می‌شود (N8)؛ تیترِ ANA دوبار نقل نمی‌شود", () => {
  const r = run([{ name: "c-ANCA", value: "Positive" }, { name: "MPO", value: "Negative" }], { age: 50, sex: "M" });
  const s = r.p.findings.flatMap((f) => f.suggest ?? []);
  assert.ok(s.includes("Anti-PR3") && !s.includes("Anti-MPO"), `suggest: ${s}`);
  assert.match(txt(byId(r, "anca_result")[0]), /PR3 روی این برگه نیست؛ پزشک معمولاً آن را هم می‌خواهد/);
  const a = txt(byId(run([{ name: "ANA", value: "Positive 1:320" }]), "ana_family_result")[0]);
  assert.equal((a.match(/1:320/g) ?? []).length, 1, a);
});
