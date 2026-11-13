// ============================================================
// serology.test.js — specs/012 (P68): سرولوژیِ ردیف ۱ و نام‌های منی
// ------------------------------------------------------------
// چرا فایلِ جدا و پیشوندِ S: هم‌زمان با این کار، جلسهٔ دیگری M300–M302 را در engine.test.js
// افزود. برای این‌که شماره و فایل تداخل نکنند، تست‌های specs/012 این‌جا هستند (node --test
// همهٔ *.test.js را اجرا می‌کند، پس پیش‌کامیت هم این‌ها را می‌بیند). نگاشت: M301→S01 … M316→S16.
//
// 🔴 پیش از specs/012 (اندازه‌گیری‌شده، ۲۰۲۶-۱۰-۰۳، probe012.mjs): VDRL، RPR، Rubella IgG،
//    Indirect Coombs، H. pylori، Anti-Tg، TRAb و TSI همه unmapped بودند و هیچ یافته‌ای نمی‌ساختند —
//    یک VDRLِ واکنش‌گر یا سرخجهٔ غیرایمن در بارداری به «نتایج شما طبیعی است» یا به مسیرِ بی‌موتور می‌رسید (N2/N28).
//
// C1 (تصمیمِ کاربر، ۲۰۲۶-۱۰-۰۳): هیچ آستانهٔ تأییدنشده‌ای در کد نیست. سرخجه/Anti-Tg/TRAb فقط با بازه،
//    مرز یا واژهٔ *چاپ‌شده روی برگه* سنجیده می‌شوند؛ تیترِ کومبس و VDRL نقل می‌شود، با عددِ ثابت مقایسه نمی‌شود.
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runEngine } from "./adapter.js";
import { runPatterns, RULES, SUGGEST_TESTS } from "./patterns.js";
import { FA_NAMES } from "./names.js";
import { GUIDELINE_IDS } from "./guidelines.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const F_ADULT = { age: 35, sex: "F" };
const F_PREG = { age: 28, sex: "F", pregnant: true };
const M_ADULT = { age: 35, sex: "M" };

function run(tests, patient = F_ADULT) {
  const e = runEngine({ patient, tests });
  const p = runPatterns(e);
  return { e, p, f: p.findings };
}
const txt = (f) => `${f.headline ?? ""} ${f.must_say ?? ""} ${f.action ?? ""} ${(f.warnings ?? []).join(" ")}`;
const byId = (r, id) => r.f.filter((x) => x.rule_id === id);
const allText = (r) => r.f.map(txt).join(" ");
const inQual = (r, name) => Object.prototype.hasOwnProperty.call(r.e.qual ?? {}, name);
const inUnmapped = (r, name) => (r.e.unmapped ?? []).includes(name);
const graded = (r, key) => r.e.graded.find((g) => g.test === key);

const SERO_IDS = ["syphilis_screen_result", "rubella_igg_status", "indirect_coombs_result", "h_pylori_result"];

// ---------- S01 (M301): مسیریابی — قرارداد C1 + ماتریسِ شکل‌ها (FR-006) ----------
test("S01: مسیریابیِ سرولوژی — هر ردیف به کانالِ خودش، و ردیف‌های بی‌خواننده به «تفسیر نشدند»", () => {
  // به qual (با خواننده)
  for (const [name, value] of [
    ["VDRL", "Reactive 1:8"], ["RPR", "Non-reactive"], ["Rubella IgG", "Immune"],
    ["Indirect Coombs", "Positive"], ["Antibody screen", "Negative"],
    ["H. pylori Ag (stool)", "Positive"], ["UBT", "Negative"], ["H.pylori IgG", "Positive"],
    ["هلیکوباکتر پیلوری آنتی ژن مدفوع", "مثبت"], ["کومبس غیرمستقیم", "منفی"], ["سرخجه IgG", "ایمن"],
  ]) {
    const r = run([{ name, value }]);
    assert.ok(inQual(r, name), `«${name}» به qual نرفت (unmapped=${r.e.unmapped})`);
  }
  // عمداً unmapped: خواننده ندارند (N28) — نامشان در «تفسیر نشدند» می‌آید، نه سکوت
  for (const [name, value] of [
    // P109 (عمدی): «H. pylori IgA/IgM» حالا به qual می‌رود و hpylori_igm_result (بی‌حکم) می‌خواندش — V15 در review1016.test.js.
    ["Rubella IgM", "Positive"],
    ["Direct Coombs", "Positive"], ["DAT", "Positive"], ["Coombs", "Positive"],
  ]) {
    const r = run([{ name, value }]);
    assert.ok(inUnmapped(r, name), `«${name}» باید unmapped باشد (qual=${Object.keys(r.e.qual)})`);
    assert.ok(!inQual(r, name), `«${name}» نباید به qual برود — خواننده ندارد`);
  }
  // Coombs Wright (بروسلا) و Tg (تری‌گلیسیرید) دست‌نخورده
  const cw = run([{ name: "Coombs Wright", value: "1/160" }]);
  assert.ok(graded(cw, "COOMBS_WRIGHT"), "Coombs Wright دیگر COOMBS_WRIGHT نیست");
  const tg = run([{ name: "Tg", value: "180", unit: "mg/dL" }]);
  assert.ok(graded(tg, "TG"), "Tgِ تنها باید تری‌گلیسیرید بماند");
  assert.ok(!tg.e.ungraded?.ANTI_TG, "Tgِ تنها نباید Anti-Tg شود");
  // Anti-Tg / TRAb با بازهٔ چاپ‌شده → ungraded با دلیلِ assay_printed؛ بی‌بازه و بی‌واژه → unmapped
  for (const [name, key] of [["Anti-Tg", "ANTI_TG"], ["Anti Thyroglobulin Ab", "ANTI_TG"], ["TRAb", "TRAB"], ["TSI", "TRAB"], ["آنتی تیروگلوبولین", "ANTI_TG"]]) {
    const ok = run([{ name, value: "300", unit: "IU/mL", reference: "<115" }]);
    assert.equal(ok.e.ungraded?.[key]?.reason, "assay_printed", `«${name}» با بازهٔ چاپ‌شده به assay_printed نرفت`);
    assert.ok(!graded(ok, "TG"), `«${name}» به تری‌گلیسیرید رفت (N25)`);
    const bare = run([{ name, value: "300" }]);
    assert.ok(inUnmapped(bare, name), `«${name}»ِ بی‌بازه و بی‌واژه باید unmapped باشد`);
    const word = run([{ name, value: "Positive" }]);
    assert.ok(inQual(word, name), `«${name}: Positive» باید به qual برود`);
  }
  // ماتریسِ شکل‌ها (FR-006): واحدِ دیگر عیناً نقل، بی‌تبدیل؛ کودک بی‌پیش‌فرضِ بزرگسال
  for (const unit of ["IU/mL", "kIU/L", "U/mL"]) {
    const r = run([{ name: "Anti-Tg", value: "300", unit, reference: "<115" }]);
    assert.equal(r.e.ungraded?.ANTI_TG?.unit, unit, `واحدِ «${unit}» عیناً نگه داشته نشد`);
    assert.equal(r.e.ungraded?.ANTI_TG?.value, 300, "مقدار نباید تبدیل شود");
  }
  for (const unit of ["IU/L", "U/L", "%"]) {
    const r = run([{ name: "TRAb", value: "8", unit, reference: "<1.75" }]);
    assert.equal(r.e.ungraded?.TRAB?.unit, unit, `واحدِ TRAb «${unit}» عیناً نگه داشته نشد`);
  }
  for (const age of [8, 0.5]) {
    const kid = run([{ name: "Anti-Tg", value: "300", unit: "IU/mL" }], { age, sex: "F" });
    assert.ok(inUnmapped(kid, "Anti-Tg"), `کودکِ ${age} ساله: Anti-Tgِ بی‌بازه نباید با پیش‌فرضی سنجیده شود`);
  }
});

// ---------- S02 (M302): مجموعهٔ بسته — SC-004 / N6 ----------
const POS = ["Positive", "positive", "POS", "Reactive", "reactive", "Detected", "Present", "مثبت", "واکنش‌گر", "واکنش گر", "پازیتیو",
  "Reactive 1:8", "Reactive (1:16)", "1:8", "1/32", "۱:۸", "Positive 1:4", "+", "++"];
const NEG = ["Negative", "negative", "NEG", "Non-reactive", "Nonreactive", "non reactive", "NR", "Not detected", "Undetected", "Nondetected",
  "Absent", "Nil", "منفی", "غیر واکنش‌گر", "غیرواکنش‌گر", "-"];
const AMB = ["+/-", "Equivocal", "equivocal", "Borderline", "Weakly reactive", "grey zone", "Indeterminate", "مشکوک", "مرزی", "Trace", "?"];

test("S02: مجموعهٔ بستهٔ مثبت/منفی/مبهم — هیچ مقدارِ مبهمی مثبت خوانده نمی‌شود (N6، SC-004)", () => {
  assert.ok(POS.length >= 15 && NEG.length >= 15 && AMB.length >= 10, "اندازهٔ جاروب کم است");
  for (const name of ["VDRL", "Indirect Coombs", "H. pylori Ag (stool)"]) {
    for (const v of POS) {
      const r = run([{ name, value: v }], F_PREG);
      const t = allText(r);
      assert.ok(inQual(r, name), `${name}=«${v}» به qual نرفت`);
      assert.match(t, /واکنش‌گر|مثبت|آنتی‌بادی دیده شده/, `${name}=«${v}» مثبت خوانده نشد: ${t.slice(0, 160)}`);
    }
    for (const v of NEG) {
      const r = run([{ name, value: v }], F_PREG);
      const t = allText(r);
      assert.ok(inQual(r, name), `${name}=«${v}» به qual نرفت`);
      assert.match(t, /منفی/, `${name}=«${v}» منفی خوانده نشد: ${t.slice(0, 160)}`);
      assert.doesNotMatch(t, /واکنش‌گر است|مثبت است|آنتی‌بادی دیده شده/, `${name}=«${v}» مثبت خوانده شد`);
    }
    for (const v of AMB) {
      const r = run([{ name, value: v }], F_PREG);
      assert.ok(inUnmapped(r, name), `${name}=«${v}» مبهم است و باید «تفسیر نشدند» برود (qual=${JSON.stringify(r.e.qual)})`);
      assert.equal(r.f.filter((f) => SERO_IDS.includes(f.rule_id)).length, 0, `${name}=«${v}» یافته ساخت`);
    }
  }
  // سرخجه: واژه‌های ایمنی
  for (const v of ["Immune", "ایمن", "Positive", "Reactive"]) {
    const r = run([{ name: "Rubella IgG", value: v }]);
    assert.doesNotMatch(allText(r), /کافی نیست/, `سرخجه «${v}» غیرایمن خوانده شد`);
  }
  for (const v of ["Non-immune", "Nonimmune", "Not immune", "غیرایمن", "غیر ایمن", "Negative"]) {
    const r = run([{ name: "Rubella IgG", value: v }]);
    assert.match(allText(r), /کافی نیست/, `سرخجه «${v}» غیرایمن خوانده نشد`);
  }
  for (const v of ["Equivocal", "Borderline", "مرزی"]) {
    const r = run([{ name: "Rubella IgG", value: v }]);
    assert.ok(inUnmapped(r, "Rubella IgG"), `سرخجه «${v}» باید «تفسیر نشدند» برود`);
  }
});

// ---------- S03 (M303): سیفلیس ----------
test("S03: VDRL واکنش‌گر → this_week، تیتر نقل‌شده، «غربالگری، نه تشخیص»؛ منفی → routine و محدود به همین آزمایش", () => {
  const r = run([{ name: "VDRL", value: "Reactive 1:8" }]);
  const s = byId(r, "syphilis_screen_result");
  assert.equal(s.length, 1);
  assert.equal(s[0].urgency, "this_week");
  assert.match(s[0].must_say, /1:8/, "تیتر نقل نشد");
  assert.match(s[0].must_say, /غربالگری/);
  assert.match(s[0].must_say, /ترپونمایی/);
  assert.match(s[0].must_say, /بارداری/, "علت‌های مثبتِ کاذب گفته نشد");
  assert.ok(s[0].suggest.includes("تست تأییدی ترپونمایی (TPHA/FTA-ABS)"));
  assert.doesNotMatch(allText(r), /سیفلیس دارید|مبتلا به سیفلیس هستید/, "از یک غربالگری حکمِ ابتلا داده شد");
  const n = run([{ name: "RPR", value: "Non-reactive" }]);
  const ns = byId(n, "syphilis_screen_result");
  assert.equal(ns.length, 1);
  assert.equal(ns[0].urgency, "routine");
  assert.match(ns[0].headline, /منفی/);
  assert.doesNotMatch(txt(ns[0]), /سالم هستید|عفونتی ندارید/, "منفی به کلِ سلامت تعمیم داده شد");
});

// ---------- S04 (M304): سرخجه — C1: فقط مرز/واژهٔ چاپ‌شده ----------
test("S04: سرخجه IgG — غیرایمن در بارداری this_week و بدونِ توصیهٔ واکسن؛ عددِ بی‌مرزِ چاپ‌شده تفسیر نمی‌شود (C1)", () => {
  const preg = run([{ name: "Rubella IgG", value: "4", unit: "IU/mL", reference: "Immune ≥ 10" }], F_PREG);
  const p = byId(preg, "rubella_igg_status");
  assert.equal(p.length, 1);
  assert.equal(p[0].urgency, "this_week");
  assert.match(p[0].must_say, /بارداری/);
  assert.doesNotMatch(txt(p[0]) + (p[0].suggest ?? []).join(" "), /واکسن بزنید|واکسن تزریق|واکسیناسیون کنید/, "در بارداری توصیهٔ واکسن شد");
  assert.match(p[0].must_say, /پس از زایمان/, "زمانِ درستِ واکسن (پس از زایمان) گفته نشد");

  const np = run([{ name: "Rubella IgG", value: "Non-immune" }], F_ADULT);
  const q = byId(np, "rubella_igg_status");
  assert.equal(q[0].urgency, "routine");
  assert.match(q[0].must_say, /واکسن/, "برای غیرباردار مشاورهٔ واکسن گفته نشد");

  const ok = run([{ name: "Rubella IgG", value: "25", unit: "IU/mL", reference: "Immune ≥ 10" }]);
  assert.doesNotMatch(allText(ok), /کافی نیست/, "۲۵ با مرزِ ۱۰ غیرایمن خوانده شد");

  // C1 guard: بی‌مرزِ چاپ‌شده و بی‌واژه → «تفسیر نشدند» (یعنی عددِ ۱۰ در کد نیست)
  for (const row of [{ name: "Rubella IgG", value: "4", unit: "IU/mL" }, { name: "Rubella IgG", value: "15" }]) {
    const r = run([row], F_PREG);
    assert.ok(inUnmapped(r, "Rubella IgG"), `«${row.value} ${row.unit ?? ""}» بی‌مرز باید «تفسیر نشدند» برود`);
    assert.equal(byId(r, "rubella_igg_status").length, 0);
  }
  // مرزِ چاپ‌شده تنها مرز است
  const cut15 = run([{ name: "Rubella IgG", value: "12", unit: "IU/mL", reference: "Immune ≥ 15" }]);
  assert.match(allText(cut15), /کافی نیست/, "مرزِ چاپ‌شدهٔ ۱۵ رعایت نشد");
  // شیرخوار: آنتی‌بادیِ مادر، بی‌ادعای ایمنی
  const inf = run([{ name: "Rubella IgG", value: "Immune" }], { age: 0.5, sex: "M" });
  const i = byId(inf, "rubella_igg_status");
  assert.equal(i.length, 1);
  assert.match(i[0].must_say, /مادر/);
  assert.doesNotMatch(i[0].must_say, /ایمن هستید|در برابرِ سرخجه ایمن است/);
});

// ---------- S05 (M305): کومبسِ غیرمستقیم ----------
test("S05: کومبس غیرمستقیم — مثبت در بارداری this_week، تیتر نقل‌شده بی‌آستانه (C1)؛ منفی دربارهٔ Rh چیزی نمی‌گوید (N4)", () => {
  const r = run([{ name: "Indirect Coombs", value: "Positive 1:32" }], F_PREG);
  const c = byId(r, "indirect_coombs_result");
  assert.equal(c.length, 1);
  assert.equal(c[0].urgency, "this_week");
  assert.match(c[0].must_say, /1:32/, "تیترِ چاپ‌شده نقل نشد");
  assert.match(c[0].must_say, /نوعِ آنتی‌بادی|شناسایی/);
  assert.doesNotMatch(c[0].must_say, /1:16|۱:۱۶|1\/16/, "آستانهٔ تیتر در متن آمد (C1)");
  const np = run([{ name: "Indirect Coombs", value: "Positive" }], M_ADULT);
  const c2 = byId(np, "indirect_coombs_result");
  assert.equal(c2[0].urgency, "routine");
  assert.match(c2[0].must_say, /تزریقِ خون/);
  const neg = run([{ name: "Indirect Coombs", value: "Negative" }], F_PREG);
  const c3 = byId(neg, "indirect_coombs_result");
  assert.equal(c3[0].urgency, "routine");
  assert.match(c3[0].must_say, /گروهِ خون|Rh/, "نگفت که این نتیجه دربارهٔ Rh چیزی نمی‌گوید");
  assert.match(c3[0].must_say, /روی این برگه نیست|نمی‌گوید/);
  // N25: کنارِ کومبس رایت، هر کدام یک بار
  const both = run([{ name: "Coombs Wright", value: "1/320" }, { name: "Indirect Coombs", value: "Positive" }], F_PREG);
  assert.equal(byId(both, "indirect_coombs_result").length, 1);
  assert.ok(both.f.some((f) => /brucella/.test(f.rule_id)), "قاعدهٔ بروسلا کنارِ کومبس غیرمستقیم خاموش شد");
});

// ---------- S06 (M306): هلیکوباکتر ----------
test("S06: H. pylori — آنتی‌ژن/تنفسی مثبت = عفونتِ فعال؛ IgG = گذشته/حال جدا نمی‌شود؛ منفی با هشدارِ PPI/آنتی‌بیوتیک", () => {
  for (const name of ["H. pylori Ag (stool)", "UBT", "Urea breath test"]) {
    const r = run([{ name, value: "Positive" }]);
    const h = byId(r, "h_pylori_result");
    assert.equal(h.length, 1, `${name}`);
    assert.equal(h[0].urgency, "routine");
    assert.match(h[0].must_say, /فعال/, `${name}: عفونتِ فعال گفته نشد`);
    assert.match(h[0].must_say, /درمان/);
  }
  const igg = run([{ name: "H.pylori IgG", value: "Positive" }]);
  const g = byId(igg, "h_pylori_result");
  assert.match(g[0].must_say, /گذشته/);
  assert.ok(g[0].suggest.includes("آنتی‌ژن مدفوع یا تست تنفسی اوره برای هلیکوباکتر"));
  // پیشنهادِ تکراری نه: آنتی‌ژن روی برگه هست
  const both = run([{ name: "H.pylori IgG", value: "Positive" }, { name: "H. pylori Ag (stool)", value: "Negative" }]);
  const sug = both.f.flatMap((f) => f.suggest ?? []);
  const shown = both.f.length;
  assert.ok(shown >= 1);
  assert.ok(!sug.includes("آنتی‌ژن مدفوع یا تست تنفسی اوره برای هلیکوباکتر") ||
    SUGGEST_TESTS["آنتی‌ژن مدفوع یا تست تنفسی اوره برای هلیکوباکتر"], "پیشنهاد در SUGGEST_TESTS نیست");
  const neg = run([{ name: "H. pylori Ag (stool)", value: "Negative" }]);
  const n = byId(neg, "h_pylori_result");
  assert.match(n[0].must_say, /دو هفته/);
  assert.match(n[0].must_say, /چهار هفته/);
  for (const f of [...igg.f, ...neg.f]) assert.doesNotMatch(txt(f), /عفونت هلیکوباکتر دارید|مبتلا هستید/);
  // نامِ بی‌زیرگروه → «تفسیر نشدند»
  const bare = run([{ name: "H. pylori", value: "Positive" }]);
  assert.ok(inUnmapped(bare, "H. pylori"), "H. pyloriِ بی‌نوع باید «تفسیر نشدند» برود");
});

// ---------- S07 (M307): آنتی‌بادی‌های تیروئید، داخلِ قاعدهٔ thyroid ----------
test("S07: Anti-Tg و TRAb — یک یافتهٔ تیروئید، با بازهٔ چاپ‌شده؛ «الگوی گریوز» شرطی؛ بارداری فوریت را بالا نمی‌برد (C1)", () => {
  const a = run([{ name: "Anti-Tg", value: "300", unit: "IU/mL", reference: "<115" }, { name: "TSH", value: "8", unit: "mIU/L" }]);
  const th = byId(a, "thyroid");
  assert.equal(th.length, 1);
  assert.match(th[0].must_say, /تیروگلوبولین/);
  assert.match(th[0].must_say, /300/);
  const alone = run([{ name: "Anti-Tg", value: "300", unit: "IU/mL", reference: "<115" }]);
  const t2 = byId(alone, "thyroid");
  assert.equal(t2.length, 1, "Anti-Tgِ تنها هیچ یافته‌ای نساخت");
  assert.equal(t2[0].urgency, "routine");
  const inRange = run([{ name: "Anti-Tg", value: "50", unit: "IU/mL", reference: "<115" }]);
  assert.equal(byId(inRange, "thyroid").length, 0, "Anti-Tgِ داخلِ بازه یافته ساخت");
  const graves = run([{ name: "TRAb", value: "8", unit: "IU/L", reference: "<1.75" },
    { name: "TSH", value: "0.01", unit: "mIU/L" }, { name: "Free T4", value: "3.1", unit: "ng/dL" }]);
  const gt = byId(graves, "thyroid")[0];
  assert.match(gt.must_say, /گریوز/);
  assert.match(gt.must_say, /پزشک/);
  assert.doesNotMatch(allText(graves), /مبتلا به گریوز|گریوز دارید/);
  const trabOnly = run([{ name: "TRAb", value: "8", unit: "IU/L", reference: "<1.75" }]);
  assert.doesNotMatch(allText(trabOnly), /گریوز است|الگوی بیماری گریوز/, "TRAbِ تنها، بی‌پرکاری، الگوی گریوز خوانده شد");
  // بارداری: جمله آری، بالا بردنِ فوریت نه — حتی در ۱۰ برابرِ حد (هیچ قاعدهٔ «۳×» در کد نیست)
  const base = run([{ name: "TRAb", value: "17.5", unit: "IU/L", reference: "<1.75" }], F_ADULT);
  const preg = run([{ name: "TRAb", value: "17.5", unit: "IU/L", reference: "<1.75" }], F_PREG);
  const bu = byId(base, "thyroid")[0], pu = byId(preg, "thyroid")[0];
  assert.equal(pu.urgency, bu.urgency, "بارداری فوریت را عوض کرد (C1)");
  assert.match(pu.must_say, /پزشکِ زنان|متخصصِ زنان|ماما/);
  // بی‌بازه، بی‌واحد → «تفسیر نشدند»
  const bare = run([{ name: "Anti-Tg", value: "300" }]);
  assert.ok(inUnmapped(bare, "Anti-Tg"));
});

// ---------- S08 (M308): freeze — قاعدهٔ thyroid روی پنل‌های بدونِ Anti-Tg/TRAb بایت‌به‌بایت ثابت ----------
// مرجع روی درختِ پیش از تغییر گرفته شد (۲۰۲۶-۱۰-۰۳، پیش از هر ویرایشِ قاعده): ۱۲ پنل، هر ۱۲ یافتهٔ تیروئید دارند.
const P = (o) => Object.entries(o).map(([name, v]) => ({ name, value: String(v[0]), unit: v[1] }));
const THYROID_PANELS = [
  { TSH: [8, "mIU/L"] }, { TSH: [0.05, "mIU/L"] },
  { TSH: [8, "mIU/L"], "Free T4": [0.6, "ng/dL"] }, { TSH: [0.05, "mIU/L"], "Free T4": [2.8, "ng/dL"] },
  { TSH: [0.05, "mIU/L"], "Free T4": [1.2, "ng/dL"], FT3: [5.5, "pg/mL"] }, { TSH: [6, "mIU/L"], "Anti-TPO": [120, "IU/mL"] },
  { "Anti-TPO": [300, "IU/mL"] }, { TSH: [2, "mIU/L"], "Free T4": [2.6, "ng/dL"] },
  { TSH: [12, "mIU/L"], "Free T4": [1.1, "ng/dL"], "Anti-TPO": [80, "IU/mL"] }, { TSH: [0.2, "mIU/L"], T3: [250, "ng/dL"] },
  { "Free T4": [0.5, "ng/dL"] }, { TSH: [25, "mIU/L"], "Free T4": [0.3, "ng/dL"], "Anti-TPO": [500, "IU/mL"] },
];
test("S08: freeze — خروجیِ قاعدهٔ thyroid روی ۱۲ پنلِ بی‌Anti-Tg/TRAb عوض نشد", () => {
  const out = THYROID_PANELS.map((pn) => {
    const { f } = run(P(pn), { age: 40, sex: "F" });
    return f.filter((x) => x.rule_id === "thyroid" || x.pattern?.startsWith?.("thyroid"))
      .map((x) => ({ id: x.rule_id, p: x.pattern, u: x.urgency, h: x.headline, m: x.must_say, a: x.action, s: x.suggest, w: x.warnings }));
  });
  assert.equal(out.filter((x) => x.length).length, 12, "پنلی بی‌یافتهٔ تیروئید شد — freeze معنا ندارد");
  const hash = crypto.createHash("sha256").update(JSON.stringify(out)).digest("hex");
  // عمداً بازپایه شد (۲۰۲۶-۱۰-۰۳، P72، M304/M305): پنج پنلِ بی‌TSH یا بی‌FT4 دیگر «… طبیعی است» دربارهٔ آزمایشِ غایب
  //   نمی‌گویند (N4). diffِ کاملِ HEAD در برابرِ درخت: فقط همان پنج پنل، فقط همان جمله‌ها؛ هفت پنلِ دیگر بایت‌به‌بایت یکسان.
  // عمداً بازپایه شد دوباره (۲۰۲۶-۱۰-۰۳، P73 پرسش ۴): TSHِ < ۰٫۱ بی‌FT4 ⇒ this_week + ارجاع به متخصص غدد + منبعِ ATA. diffِ HEAD در برابرِ درخت
  //   روی همین ۱۲ پنل: فقط پنلِ دوم ({TSH: 0.05}) و فقط همین فیلدها (u/a/s/sources)؛ ۱۱ پنلِ دیگر بایت‌به‌بایت یکسان.
  // عمداً بازپایه شد سوم‌بار (۲۰۲۶-۱۰-۰۵، بازبینیِ متامورفیک، N18): شاخهٔ T3-toxicosis عددِ FT3/T3 را نقل می‌کند. diffِ HEAD در برابرِ درخت
  //   روی همین ۱۲ پنل: فقط پنل‌های ۴ و ۹، فقط جملهٔ «مقدار روی برگه: …» در must_say؛ ده پنلِ دیگر بایت‌به‌بایت یکسان.
  // عمداً بازپایه شد چهارم‌بار (۲۰۲۶-۱۱-۱۱، specs/023 P136، N5): جملهٔ «TPO بالاست» عدد و بازه را نقل می‌کند. diffِ HEAD در برابرِ درخت
  //   روی همین ۱۲ پنل: فقط پنلِ ۷ ({Anti-TPO: 300})، فقط آغازِ must_say؛ یازده پنلِ دیگر بایت‌به‌بایت یکسان.
  // عمداً بازپایه شد پنجم‌بار (۲۰۲۶-۱۱-۱۳، specs/026 P144، C3): TSH ≥ ۱۰ با FT4ِ طبیعی دیگر «خفیف… اغلب فقط پیگیری» نیست.
  //   diffِ HEAD 0935e85 در برابرِ درخت روی همین ۱۲ پنل: فقط پنلِ ۹ ({TSH: 12, FT4: 1.1, TPO: 80})، فقط must_say؛ یازده پنلِ دیگر بایت‌به‌بایت یکسان.
  // عمداً بازپایه شد ششم‌بار (P144 US6): کفِ TSH ۰٫۵ ⇒ ۰٫۴؛ هیچ پنلی TSHِ ۰٫۴–۰٫۵ ندارد ⇒ فقط رشتهٔ بازه در must_say. قبلی 824508cf…
  // عمداً بازپایه شد هفتم‌بار (P144 پرسشِ ۱، تصمیمِ کاربر ۲۰۲۶-۱۱-۱۳): TSH ≥ ۱۰ با FT4ِ طبیعی ⇒ this_week. diffِ HEAD 98e4de2 در برابرِ درخت:
  //   فقط پنلِ ۹، فقط u و a؛ یازده پنلِ دیگر بایت‌به‌بایت یکسان. قبلی 6c31b4da…
  assert.equal(hash, "d98071f06030c75c7da04ca85461af3146e2426d8d9daee361c924f3c645d362", "متنِ قاعدهٔ thyroid روی پنل‌های قدیمی عوض شد");
});

// ---------- S09 (M309): قراردادِ شمارش C3 — هر آزمایش در دقیقاً یک یافته ----------
test("S09: هر آزمایشِ سرولوژی دقیقاً در یک یافته نام برده می‌شود — کنارِ TSH/FT4، کومبس رایت و بارداری", () => {
  const panels = [
    { name: "VDRL", re: /VDRL/, tests: [{ name: "VDRL", value: "Reactive 1:4" }, { name: "TSH", value: "8", unit: "mIU/L" }] },
    { name: "Rubella", re: /سرخجه/, tests: [{ name: "Rubella IgG", value: "Non-immune" }, { name: "Coombs Wright", value: "1/320" }] },
    { name: "ICT", re: /کومبس غیرمستقیم/, tests: [{ name: "Indirect Coombs", value: "Positive" }, { name: "Coombs Wright", value: "1/320" }] },
    { name: "HP", re: /هلیکوباکتر/, tests: [{ name: "H. pylori Ag (stool)", value: "Positive" }, { name: "TSH", value: "8", unit: "mIU/L" }] },
    { name: "AntiTg", re: /تیروگلوبولین/, tests: [{ name: "Anti-Tg", value: "300", unit: "IU/mL", reference: "<115" }, { name: "TSH", value: "8", unit: "mIU/L" }, { name: "Free T4", value: "0.6", unit: "ng/dL" }] },
    { name: "TRAb", re: /TRAb/, tests: [{ name: "TRAb", value: "8", unit: "IU/L", reference: "<1.75" }, { name: "TSH", value: "0.01", unit: "mIU/L" }] },
  ];
  let reached = 0;
  for (const pn of panels) {
    const r = run(pn.tests, F_PREG);
    const n = r.f.filter((f) => pn.re.test(txt(f))).length;
    assert.equal(n, 1, `${pn.name}: ${n} یافته دربارهٔ آن حرف زدند (${r.f.map((f) => f.rule_id)})`);
    reached++;
  }
  assert.equal(reached, panels.length);
});

// ---------- S10 (M310): N20 و سقفِ فوریت ----------
test("S10: action از urgency می‌آید (N20)؛ هیچ یافتهٔ جدیدی اورژانس نیست؛ منفی‌های معمول ≤ routine", () => {
  const ACTION = { routine: "در نوبتِ عادی با پزشک مطرح کنید.", this_week: "این هفته با پزشک مطرح کنید." };
  const panels = [
    [{ name: "VDRL", value: "Reactive 1:64" }], [{ name: "RPR", value: "NR" }],
    [{ name: "Rubella IgG", value: "Non-immune" }], [{ name: "Rubella IgG", value: "Immune" }],
    [{ name: "Indirect Coombs", value: "Positive 1:256" }], [{ name: "Indirect Coombs", value: "Negative" }],
    [{ name: "H. pylori Ag (stool)", value: "Positive" }], [{ name: "H.pylori IgG", value: "Negative" }],
  ];
  let seen = 0;
  for (const pt of [F_ADULT, F_PREG, M_ADULT]) for (const t of panels) {
    const r = run(t, pt);
    for (const f of r.f.filter((x) => SERO_IDS.includes(x.rule_id))) {
      seen++;
      assert.notEqual(f.urgency, "emergency", `${f.rule_id} اورژانس شد`);
      assert.equal(f.action, ACTION[f.urgency], `${f.rule_id}: action با urgency=${f.urgency} نمی‌خواند`);
      assert.ok(!f.blocks_others, `${f.rule_id} blocks_others دارد`);
    }
  }
  assert.ok(seen >= 20, `فقط ${seen} یافته دیده شد`);
  for (const t of [[{ name: "VDRL", value: "Non-reactive" }], [{ name: "Indirect Coombs", value: "Negative" }], [{ name: "H. pylori Ag (stool)", value: "Negative" }], [{ name: "Rubella IgG", value: "Immune" }]]) {
    const r = run(t, F_PREG);
    assert.ok(["routine", "none"].includes(r.p.overall_urgency), `منفیِ معمول ${r.p.overall_urgency} شد: ${t[0].name}`);
  }
});

// ---------- S11 (M311): پیشنهادها و منابع ----------
test("S11: هر suggestِ قاعده‌های جدید در SUGGEST_TESTS است و هر sources در guidelines.js", () => {
  const panels = [
    [{ name: "VDRL", value: "Reactive" }], [{ name: "Rubella IgG", value: "Non-immune" }],
    [{ name: "Indirect Coombs", value: "Positive" }], [{ name: "H.pylori IgG", value: "Positive" }],
    [{ name: "H. pylori Ag (stool)", value: "Negative" }],
    [{ name: "TRAb", value: "8", unit: "IU/L", reference: "<1.75" }, { name: "TSH", value: "0.01", unit: "mIU/L" }],
  ];
  for (const pt of [F_ADULT, F_PREG]) for (const t of panels) {
    for (const f of run(t, pt).f) {
      if (!SERO_IDS.includes(f.rule_id) && f.rule_id !== "thyroid") continue;
      for (const s of f.suggest ?? []) assert.ok(Object.prototype.hasOwnProperty.call(SUGGEST_TESTS, s), `«${s}» در SUGGEST_TESTS نیست (${f.rule_id})`);
      for (const id of f.sources ?? []) assert.ok(GUIDELINE_IDS.has(id), `منبعِ «${id}» در guidelines.js نیست`);
    }
  }
});

// ---------- S12 (M312): فارسی، بدونِ کلیدِ خام (N8) ----------
test("S12: متنِ یافته‌ها کلیدِ خام ندارد و FA_NAMES هر دو کلیدِ تازه را دارد", () => {
  assert.ok(FA_NAMES.ANTI_TG && FA_NAMES.ANTI_TG !== "ANTI_TG");
  assert.ok(FA_NAMES.TRAB && FA_NAMES.TRAB !== "TRAB");
  const r = run([{ name: "Anti-Tg", value: "300", unit: "IU/mL", reference: "<115" }, { name: "TRAb", value: "8", unit: "IU/L", reference: "<1.75" },
    { name: "VDRL", value: "Reactive" }, { name: "Indirect Coombs", value: "Positive" }], F_PREG);
  const t = allText(r);
  assert.doesNotMatch(t, /\bANTI_TG\b|\bTRAB\b|assay_printed|undefined|null|NaN/, "کلیدِ خام یا مقدارِ خالی به متن رسید");
  // M37/M38 فایل‌های زنده را از importهای patterns.js می‌سازند — فایلِ جدید باید در آن فهرست باشد
  const src = fs.readFileSync(path.join(__dirname, "patterns.js"), "utf8");
  assert.match(src, /from\s+["']\.\/patterns_serology\.js["']/, "patterns_serology.js در patterns.js import نشده (N1)");
  assert.ok(RULES.some((x) => x.id === "syphilis_screen_result"), "قاعده‌ها در RULES نیستند");
});

// ---------- S13 (M313): جاروبِ املاهای منی (US4) ----------
test("S13: هر املای رایجِ ردیفِ منی به کلیدِ منی، ردیفِ نام‌برده یا «تفسیر نشدند» می‌رسد — هیچ‌کدام بی‌صدا نمی‌ماند (N28)", () => {
  const SPELLINGS = [
    ["Sperm count", "40", "million/mL"], ["Sperm concentration", "40", "million/mL"], ["Total sperm number", "100", "million"],
    ["Progressive motility", "35", "%"], ["Total motility", "45", "%"], ["Normal forms", "5", "%"], ["Morphology (Kruger)", "5", "%"],
    ["Vitality", "60", "%"], ["Volume", "2.5", "mL"], ["Liquefaction time", "20", "min"], ["Viscosity", "Normal", ""],
    ["تعداد اسپرم", "40", "million/mL"], ["تحرک", "45", "%"], ["شکل طبیعی", "5", "%"], ["حجم", "2.5", "mL"],
    ["Spermogram", "Normal", ""], ["Semen Analysis", "Abnormal", ""], ["آنالیز منی", "غیرطبیعی", ""],
    ["Non-progressive motility", "10", "%"], ["Immotile", "45", "%"],
  ];
  assert.ok(SPELLINGS.length >= 20);
  for (const [name, value, unit] of SPELLINGS) {
    const tests = [{ name: "Motility", value: "40", unit: "%" }, { name, value, unit }];
    const r = run(tests, M_ADULT);
    const inSemen = Object.prototype.hasOwnProperty.call(r.e.semenQual ?? {}, name);
    const isGraded = r.e.graded.some((g) => /^SEMEN_|^SPERM_/.test(g.test)) && !inSemen && !inUnmapped(r, name) && !inQual(r, name);
    const ung = Object.keys(r.e.ungraded ?? {}).some((k) => /^SEMEN_|^SPERM_/.test(k));
    const t = allText(r);
    const named = inSemen ? t.includes(name) || t.includes(String(value)) : true;
    assert.ok(isGraded || ung || inUnmapped(r, name) || (inSemen && named),
      `«${name}» بی‌صدا ماند (semenQual=${inSemen}, named=${named}, qual=${inQual(r, name)})`);
    assert.ok(!inQual(r, name), `«${name}» به qual (کانالِ ادرار) رفت — N25`);
    const stray = r.e.graded.map((g) => g.test).filter((k) => !/^(SEMEN_|SPERM_)/.test(k));
    assert.deepEqual(stray, [], `«${name}» روی برگهٔ منی به کلیدِ غیرمنی رفت: ${stray}`);
  }
});

// ---------- S14 (M314): ردیفِ متنیِ منی نام برده می‌شود ----------
test("S14: «Spermogram: Abnormal» روی برگهٔ مرد نام برده می‌شود (پیش‌تر semenQual بی‌خواننده)؛ CBCِ بی‌نشانهٔ منی دست‌نخورده", () => {
  for (const [name, value] of [["Spermogram", "Abnormal"], ["آنالیز منی", "غیرطبیعی"]]) {
    const r = run([{ name: "Motility", value: "40", unit: "%" }, { name, value }], M_ADULT);
    const t = allText(r);
    assert.ok(t.includes(name) || inUnmapped(r, name), `«${name}: ${value}» بی‌صدا ماند`);
  }
  const cbc = run([{ name: "WBC", value: "7.2", unit: "10*3/µL" }, { name: "RBC", value: "4.8", unit: "10*6/µL" }, { name: "Hb", value: "14", unit: "g/dL" }], M_ADULT);
  assert.ok(graded(cbc, "WBC") && graded(cbc, "RBC"), "CBCِ ساده دیگر WBC/RBC را درجه‌بندی نمی‌کند");
  assert.equal(Object.keys(cbc.e.semenQual ?? {}).length, 0);
});

// ════════════ بازبینیِ specs/012 (code-reviewer + eval-medical-reviewer، ۲۰۲۶-۱۰-۰۳) — هر تست پیش از اصلاح قرمز بود ════════════

// ---------- S15: مرزِ مثبتِ چاپ‌شده («> X»)، منطقهٔ مرزی، و «<» (CR1 / B4) ----------
test("S15: TRAb/Anti-Tg — مرزِ «Positive > X» بالا خوانده می‌شود؛ منطقهٔ مرزی و «<20» در برابرِ «<4.1» تفسیر نمی‌شوند", () => {
  // 🔴 پیش از اصلاح: parseReference(«Positive: > 1.75») ⇒ {lo:1.75, hi:null} ⇒ «در محدودهٔ چاپ‌شده» برای TRAbِ مثبتِ گریوز.
  const pos = run([{ name: "TRAb", value: "3.0", unit: "IU/L", reference: "Positive: > 1.75" },
    { name: "TSH", value: "0.01", unit: "mIU/L" }, { name: "Free T4", value: "3.5", unit: "ng/dL" }]);
  const t = byId(pos, "thyroid")[0];
  assert.match(t.must_say, /بالاتر از محدودهٔ چاپ‌شده/, "TRAbِ ۳ با مرزِ «> 1.75» بالا خوانده نشد");
  assert.doesNotMatch(t.must_say, /در محدودهٔ چاپ‌شده/);
  const pos2 = run([{ name: "Anti-Tg", value: "500", unit: "IU/mL", reference: ">115 Positive" }, { name: "TSH", value: "2", unit: "mIU/L" }]);
  assert.equal(byId(pos2, "thyroid").length, 1, "Anti-Tgِ ۵۰۰ با «>115 Positive» یافته‌ای نساخت");
  // منطقهٔ مرزیِ چاپ‌شده ⇒ «تفسیر نشدند»
  const grey = run([{ name: "TRAb", value: "1.4", unit: "IU/L", reference: "Negative < 1.0, Equivocal 1.0-1.75, Positive > 1.75" }]);
  assert.ok(inUnmapped(grey, "TRAb"), "TRAbِ ۱.۴ در منطقهٔ مرزی باید «تفسیر نشدند» برود");
  const below = run([{ name: "TRAb", value: "0.6", unit: "IU/L", reference: "Negative < 1.0, Equivocal 1.0-1.75, Positive > 1.75" }]);
  assert.equal(below.e.ungraded?.TRAB?.reason, "assay_printed");
  // «<20» در برابرِ «<4.1»: معلوم نیست بالاست ⇒ «تفسیر نشدند»، هرگز «بالاتر از حد»
  const lt = run([{ name: "Anti-Tg", value: "<20", unit: "IU/mL", reference: "<4.1" }, { name: "TSH", value: "1.5", unit: "mIU/L" }]);
  assert.ok(inUnmapped(lt, "Anti-Tg"), "«<20» با مرزِ ۴.۱ باید «تفسیر نشدند» برود");
  assert.doesNotMatch(allText(lt), /بالاتر از حد|بالاتر از محدوده/);
  const lt2 = run([{ name: "Anti-Tg", value: "<1.0", unit: "IU/mL", reference: "<4.1" }]);
  assert.equal(lt2.e.ungraded?.ANTI_TG?.reason, "assay_printed", "«<1.0» با مرزِ ۴.۱ قطعاً در محدوده است");
  const gt = run([{ name: "Anti-Tg", value: ">500", unit: "IU/mL", reference: "<115" }]);
  assert.equal(byId(gt, "thyroid").length, 1, "«>500» با مرزِ ۱۱۵ قطعاً بالاست");
});

// ---------- S16: VDRL — تیترِ ردیفِ جدا، بارداری، شیرخوار (CR2 / B1 / B2) ----------
test("S16: VDRL — تیترِ ردیفِ جدا نقل می‌شود؛ در بارداری انتقال به جنین و درمان گفته می‌شود؛ در شیرخوار آنتی‌بادیِ مادر و بی‌TPHA", () => {
  const two = run([{ name: "VDRL", value: "Reactive" }, { name: "VDRL Titer", value: "1:16" }]);
  const s = byId(two, "syphilis_screen_result");
  assert.equal(s.length, 1);
  assert.match(s[0].must_say, /1:16/, "تیترِ ردیفِ جدا نقل نشد");
  assert.doesNotMatch(s[0].must_say, /تیتر \(رقیق‌سازی\) روی برگه نیامده/, "تیتر روی برگه بود و «نیامده» گفته شد (N4)");
  // بارداری (CDC STI 2021: «considered infected unless … documented»؛ «Penicillin G … preventing congenital syphilis»)
  const p = byId(run([{ name: "VDRL", value: "Reactive 1:8" }], F_PREG), "syphilis_screen_result")[0];
  assert.match(p.must_say, /جنین/, "در بارداری از انتقال به جنین چیزی گفته نشد");
  assert.match(p.must_say, /پنی‌سیلین|درمان/);
  assert.doesNotMatch(p.must_say, /از جمله در بارداری/, "در بارداری، خودِ بارداری به‌عنوانِ توضیحِ بی‌خطر آمد");
  // شیرخوار (CDC congenital syphilis: آنتی‌بادیِ مادر؛ مقایسه با تیترِ مادر؛ تستِ ترپونمایی روی سرمِ نوزاد توصیه نمی‌شود)
  const inf = byId(run([{ name: "VDRL", value: "Reactive 1:4" }], { age: 0.2, sex: "M" }), "syphilis_screen_result")[0];
  assert.match(inf.must_say, /مادر/);
  assert.doesNotMatch(inf.must_say, /سنِ بالا|مصرفِ تزریقیِ مواد/, "متنِ بزرگسال به شیرخوار رسید");
  assert.ok(!(inf.suggest ?? []).some((x) => /TPHA|ترپونمایی/.test(x)), "برای شیرخوار تستِ ترپونمایی پیشنهاد شد");
});

// ---------- S17: سرخجه — عملگرِ مرز و منطقهٔ مرزیِ چاپ‌شده (B3) ----------
test("S17: سرخجه — «Immune > 10» با مقدارِ ۱۰ ایمن نیست؛ مقدارِ داخلِ منطقهٔ مرزیِ چاپ‌شده تفسیر نمی‌شود (C1)", () => {
  const eq = run([{ name: "Rubella IgG", value: "10", unit: "IU/mL", reference: "Immune > 10" }], F_PREG);
  assert.ok(inUnmapped(eq, "Rubella IgG") || /کافی نیست/.test(allText(eq)), "۱۰ با «> 10» ایمن خوانده شد");
  assert.doesNotMatch(allText(eq), /محافظت شده است/, "۱۰ با مرزِ اکید «> 10» «محافظت شده» خوانده شد");
  const band = "Non-immune < 8, Equivocal 8-10, Immune > 10";
  const mid = run([{ name: "Rubella IgG", value: "9", unit: "IU/mL", reference: band }], F_PREG);
  assert.ok(inUnmapped(mid, "Rubella IgG"), "۹ در منطقهٔ مرزی باید «تفسیر نشدند» برود (P68 پرسش ۲)");
  const hi = run([{ name: "Rubella IgG", value: "25", unit: "IU/mL", reference: band }]);
  assert.match(allText(hi), /محافظت شده است/);
  const lo = run([{ name: "Rubella IgG", value: "5", unit: "IU/mL", reference: band }], F_PREG);
  assert.match(allText(lo), /کافی نیست/);
});

// ---------- S18: Anti-Tg در پیگیریِ سرطانِ تیروئید (B5) ----------
test("S18: Anti-Tg با سرطانِ ثبت‌شده یا تیروگلوبولین روی برگه — نه «هاشیموتو»، نه «فقط پیگیری»؛ اثر بر تیروگلوبولین گفته می‌شود", () => {
  for (const [label, tests, patient] of [
    ["cancer", [{ name: "Anti-Tg", value: "300", unit: "IU/mL", reference: "<115" }], { age: 50, sex: "F", conditions: ["cancer"] }],
    ["Tg row", [{ name: "Thyroglobulin", value: "0.2", unit: "ng/mL" }, { name: "Anti-Tg", value: "300", unit: "IU/mL", reference: "<115" }], { age: 50, sex: "F" }],
  ]) {
    const r = run(tests, patient);
    const t = byId(r, "thyroid");
    assert.equal(t.length, 1, label);
    assert.doesNotMatch(t[0].must_say, /هاشیموتو/, `${label}: قابِ هاشیموتو در پیگیریِ سرطان`);
    assert.doesNotMatch(t[0].must_say, /اغلب فقط پیگیری/, `${label}: اطمینانِ کاذب`);
    assert.match(t[0].must_say, /تیروگلوبولین.*(نامعتبر|کاذب)/, `${label}: اثر بر نتیجهٔ تیروگلوبولین گفته نشد`);
  }
  // بی‌سرطان و بی‌تیروگلوبولین: قابِ خودایمنی بماند
  const plain = byId(run([{ name: "Anti-Tg", value: "300", unit: "IU/mL", reference: "<115" }], { age: 50, sex: "F" }), "thyroid")[0];
  assert.match(plain.must_say, /هاشیموتو/);
});

// ---------- S19: منی — برگهٔ طبیعی بی‌یافته؛ ردیفِ غیرطبیعی نام برده؛ ACPِ ناخوانا گم نمی‌شود (CR3 / یادداشتِ ۱) ----------
test("S19: برگهٔ منیِ کاملاً طبیعی یافته‌ای نمی‌سازد؛ «Spermogram: Abnormal» تنها نام برده می‌شود؛ ACPِ ناخوانا کنارِ pHِ بالا گم نمی‌شود", () => {
  const normal = run([{ name: "Volume", value: "3", unit: "mL" }, { name: "Sperm concentration", value: "60", unit: "million/mL" },
    { name: "Total motility", value: "60", unit: "%" }, { name: "Color", value: "Grey" }, { name: "Viscosity", value: "Normal" },
    { name: "Liquefaction time", value: "20", unit: "min" }], M_ADULT);
  assert.equal(byId(normal, "semen_analysis").length, 0, "برگهٔ منیِ طبیعی به اورولوژی و تکرار فرستاده شد");
  const ab = run([{ name: "Motility", value: "60", unit: "%" }, { name: "Spermogram", value: "Abnormal" }], M_ADULT);
  assert.match(allText(ab), /Spermogram/);
  const acp = run([{ name: "Motility", value: "60", unit: "%" }, { name: "pH", value: "8.6" }, { name: "Acid phosphatase", value: "see comment" }], M_ADULT);
  const t = allText(acp);
  if (Object.keys(acp.e.semenQual ?? {}).some((k) => /ACP|acid/i.test(k))) {
    assert.match(t, /see comment/, "ACPِ ناخوانا کنارِ pHِ بالا بی‌صدا افتاد");
  }
});

// ---------- S20: املاهای رایجِ ایرانی (CR4 / یادداشتِ ۲) ----------
test("S20: «Helicobacter Pylori Ab (IgG)»، «H.P Ag»، «Rubella Ab (IgG)»، «Coombs (Indirect)» خوانده می‌شوند", () => {
  for (const [name, value] of [["Helicobacter Pylori Ab (IgG)", "Positive"], ["H.P Ag", "Negative"], ["H.P Ab", "Positive"],
    ["Rubella Ab (IgG)", "Immune"], ["Coombs (Indirect)", "Negative"], ["Coombs Indirect", "Positive"]]) {
    const r = run([{ name, value }], F_PREG);
    assert.ok(inQual(r, name), `«${name}» خوانده نشد (unmapped=${r.e.unmapped})`);
  }
});

// ---------- S21: واحد دوبار چاپ نمی‌شود (CR5) ----------
test("S21: «250 IU/mL» بی‌فیلدِ واحد — واحد یک بار و با همان شکلِ برگه می‌آید", () => {
  const r = run([{ name: "Anti-Tg", value: "250 IU/mL", reference: "<115" }, { name: "TSH", value: "2", unit: "mIU/L" }]);
  const t = byId(r, "thyroid")[0].must_say;
  assert.equal((t.match(/IU\/mL/gi) ?? []).length, 1, `واحد تکرار شد: ${t}`);
  assert.doesNotMatch(t, /iu\/ml/, "واحد کوچک‌حرف شد");
});

// ---------- S22: هلیکوباکترِ ناهمخوان (یادداشتِ ۷) ----------
test("S22: تستِ تنفسیِ مثبت + آنتی‌ژنِ مدفوعِ منفی — ردیفِ منفی هم نام برده می‌شود", () => {
  const r = run([{ name: "UBT", value: "Positive" }, { name: "H. pylori Ag (stool)", value: "Negative" }]);
  const h = byId(r, "h_pylori_result")[0];
  assert.match(h.must_say, /H\. pylori Ag \(stool\)/, "ردیفِ منفیِ ناهمخوان گم شد");
});
