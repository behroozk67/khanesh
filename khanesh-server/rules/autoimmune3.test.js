// ============================================================
// autoimmune3.test.js — specs/023 (P136): قواعدِ خودایمن از راهنمای گوگل‌درایوِ کاربر
// ------------------------------------------------------------
// منبع: خلاصهٔ ثانویهٔ کاربر (specs/023-autoimmune-immunology-rules/source-gdoc.txt)؛ منابعِ اصلی باز نشدند، تأییدِ بازبین ندارد.
// 🔴 پیش از specs/023 (اندازه‌گیری‌شده روی b0cae21، snapshots/before.txt):
//    - «Anti-TPO 20، برگه <30» با بازهٔ داخلیِ ۰–۹ «بالاست» گفته می‌شد؛ «RF 18، برگه <15» «طبیعی» و بی‌یافته بود (G1).
//    - سلیاک (tTG/DGP/EMA/IgA تام)، کبدِ خودایمن (ASMA/LKM1/SLA/AMA)، میاستنی (AChR/MuSK)، ایمونوگلوبولین‌ها، هیستون،
//      کاردیولیپین IgA، Anti-DNase B، CH50، «ANA (IIF)»، «FANA»، «Anti-dsDNA (CLIFT)»، «Anti-Centromere B» همه unmapped بودند.
// هر تست روی b7eb497 قرمز است (quickstart گامِ ۳).
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { runEngine } from "./adapter.js";
import { runPatterns, RULES, SUGGEST_TESTS } from "./patterns.js";
import { FA_NAMES } from "./names.js";
import { RULE_GROUP } from "./groups.js";

const F = { age: 35, sex: "F" };
const T = (name, value, unit = "", reference = "") => ({ name, value: String(value), unit, reference });
const run = (tests, patient = F) => {
  const e = runEngine({ patient, tests });
  const p = runPatterns(e);
  return { e, p, f: p.findings };
};
const one = (r, id) => {
  const x = r.f.filter((f) => f.rule_id === id);
  assert.equal(x.length, 1, `${id} باید دقیقاً یک بار بیاید؛ آمد: ${r.f.map((f) => f.rule_id).join(",")}`);
  return x[0];
};
const NEW_IDS = ["celiac_serology_result", "liver_autoantibody_result", "mg_antibody_result", "immunoglobulin_result", "dnaseb_result"];
const NEW_KEYS = ["ACL_IGA", "ANTI_HISTONE", "ANTI_DNASEB", "CH50", "TTG_IGA", "TTG_IGG", "DGP_IGG", "DGP_IGA", "EMA_IGA",
  "IGA_TOTAL", "IGG", "IGM", "IGE", "ASMA", "ANTI_LKM1", "ANTI_SLA", "AMA", "AMA_M2", "ACHR", "ANTI_MUSK"];

test("AI3-00: شناسه‌های تازه در RULES، در گروهِ immune، و نام‌های فارسیِ کلیدها", () => {
  const ids = new Set(RULES.map((r) => r.id));
  for (const id of NEW_IDS) {
    assert.ok(ids.has(id), `${id} در RULES نیست`);
    assert.equal(RULE_GROUP[id], "immune", `${id} گروه ندارد`);
  }
  for (const k of NEW_KEYS) assert.ok(FA_NAMES[k] && FA_NAMES[k] !== k, `FA_NAMES.${k}`);
  for (const s of ["بررسی توسط متخصص گوارش", "بررسی توسط متخصص مغز و اعصاب", "Total IgA (IgA تام)", "DGP-IgG یا tTG-IgG", "Anti-MuSK"]) assert.ok(SUGGEST_TESTS[s], s);
});

// ── US1 (G1): بازهٔ چاپ‌شدهٔ TPO و RF ──
test("AI3-01: Anti-TPO 20 با برگهٔ «<30» بالا نیست؛ 35 بالاست و عدد و بازه نقل می‌شود", () => {
  const a = run([T("Anti-TPO", 20, "IU/mL", "<30")]);
  const g = a.e.graded.find((x) => x.test === "ANTI_TPO");
  assert.equal(g.abnormal, false, `TPO 20 «<30» نباید غیرطبیعی باشد: ${g.range}`);
  assert.ok(!a.f.some((f) => /TPO.*بالاست/.test(f.must_say ?? "")));
  const b = run([T("Anti-TPO", 35, "IU/mL", "<30")]);
  const t = one(b, "thyroid");
  assert.match(t.must_say, /35/);
  assert.match(t.must_say, /0–30/);
});

test("AI3-02: RF 18 با برگهٔ «<15» بالاست (rf_positive)؛ RF 12 «<15» طبیعی", () => {
  const a = run([T("RF", 18, "IU/mL", "<15")]);
  assert.equal(a.e.graded.find((x) => x.test === "RF").abnormal, true);
  assert.match(one(a, "rf_positive").must_say, /18/);
  const b = run([T("RF", 12, "IU/mL", "<15")]);
  assert.equal(b.e.graded.find((x) => x.test === "RF").abnormal, false);
  assert.ok(!b.f.some((f) => f.rule_id === "rf_positive"));
  // آنتی‌بادیِ پایین غیرطبیعی نیست: «RF 3، برگه 5–20» و «TPO 2، برگه 1–34» نه «پایین» و نه «توضیح نداریم».
  for (const [n, v, ref, key] of [["RF", 3, "5-20", "RF"], ["Anti-TPO", 2, "1-34", "ANTI_TPO"]]) {
    const r = run([T(n, v, "IU/mL", ref)]);
    assert.equal(r.e.graded.find((x) => x.test === key).abnormal, false, n);
    assert.ok(!r.f.some((f) => f.rule_id === "unmatched_abnormal"), n);
  }
});

test("AI3-03: بی‌بازهٔ چاپی، TPO و RF مثلِ قبل با بازهٔ داخلی سنجیده می‌شوند", () => {
  assert.equal(run([T("Anti-TPO", 20, "IU/mL", "")]).e.graded.find((x) => x.test === "ANTI_TPO").range, "0–9");
  assert.equal(run([T("RF", 18, "IU/mL", "")]).e.graded.find((x) => x.test === "RF").range, "0–20");
});

// ── US2: سلیاک ──
test("AI3-04: tTG-IgA 150 «<10» ⇒ this_week، «۱۵ برابر»، بدونِ حکمِ تشخیص؛ ارجاعِ گوارش؛ قیدِ گلوتن", () => {
  for (const pt of [F, { age: 6, sex: "M" }]) {
    const r = run([T("Anti-tTG IgA", 150, "U/mL", "<10")], pt);
    const f = one(r, "celiac_serology_result");
    assert.equal(f.urgency, "this_week");
    assert.match(f.must_say, /150/);
    assert.match(f.must_say, /حدود 15 برابر/);
    assert.match(f.must_say, /گلوتن/);
    assert.ok(!/سلیاک دارید|مبتلا به سلیاک هستید/.test(f.must_say));
    assert.ok(f.suggest.includes("بررسی توسط متخصص گوارش"));
    assert.deepEqual(r.e.unmapped, []);
  }
});

test("AI3-05: tTG-IgA منفی + IgA تامِ پایین ⇒ «قابلِ اعتماد نیست» و پیشنهادِ IgG؛ IgA طبیعی ⇒ معتبر؛ IgA غایب ⇒ «روی این برگه نیست»", () => {
  const low = one(run([T("tTG IgA", 2, "U/mL", "<10"), T("Total IgA", 5, "mg/dL", "70-400")]), "celiac_serology_result");
  assert.match(low.must_say, /قابلِ اعتماد نیست/);
  assert.ok(low.suggest.includes("DGP-IgG یا tTG-IgG"));
  const ok = one(run([T("tTG IgA", 2, "U/mL", "<10"), T("Total IgA", 150, "mg/dL", "70-400")]), "celiac_serology_result");
  assert.match(ok.must_say, /معتبر است/);
  assert.equal(ok.urgency, "routine");
  const abs = one(run([T("tTG IgA", 2, "U/mL", "<10")]), "celiac_serology_result");
  assert.match(abs.must_say, /IgA تام روی این برگه نیست/);
  assert.ok(!/IgA تام[^.]*(طبیعی|داخلِ محدوده)/.test(abs.must_say), "N4: IgAِ اندازه‌گیری‌نشده «طبیعی» نیست");
  assert.ok(abs.suggest.includes("Total IgA (IgA تام)"));
});

test("AI3-06: IgA تام وقتی آزمایشِ سلیاک هست فقط یک مالک دارد (سلیاک)؛ بی‌سلیاک، immunoglobulin_result", () => {
  const a = run([T("tTG IgA", 2, "U/mL", "<10"), T("Total IgA", 5, "mg/dL", "70-400")]);
  one(a, "celiac_serology_result");
  assert.ok(!a.f.some((f) => f.rule_id === "immunoglobulin_result"), "IgA دو مالک گرفت");
  const b = run([T("Total IgA", 5, "mg/dL", "70-400")]);
  assert.match(one(b, "immunoglobulin_result").must_say, /IgA/);
  assert.ok(!b.f.some((f) => f.rule_id === "celiac_serology_result"));
});

test("AI3-07: tTG 7 در باندِ چاپ‌شدهٔ «4-10 Weak positive» مرزی است؛ ≥۱۰×ULN جملهٔ بدون‌بیوپسیِ کودکان؛ EMA و DGP یافته دارند", () => {
  const b = one(run([T("tTG IgA", 7, "U/mL", "<4 Negative, 4-10 Weak positive, >10 Positive")]), "celiac_serology_result");
  assert.match(b.must_say, /مرزی/);
  const nb = one(run([T("tTG IgA", 150, "U/mL", "<10"), T("EMA IgA", "Positive")], { age: 6, sex: "M" }), "celiac_serology_result");
  assert.match(nb.must_say, /بدونِ نمونه‌برداری/);
  assert.match(nb.must_say, /اندومیزیوم/);
  assert.match(one(run([T("DGP IgG", 40, "U", "<20")]), "celiac_serology_result").must_say, /40/);
});

test("AI3-08: tTG-IgGِ مثبت با IgAِ طبیعی ⇒ «ارزشِ تشخیصیِ کمتری»", () => {
  const f = one(run([T("tTG IgG", 12, "U/mL", "<6"), T("Total IgA", 150, "mg/dL", "70-400")]), "celiac_serology_result");
  assert.match(f.must_say, /ارزشِ تشخیصیِ کمتری/);
});

// ── US3: کبدِ خودایمن و میاستنی ──
test("AI3-09: ASMA 1:80 بی‌واژه ⇒ مثبت (مرزِ ۱:۴۰)؛ ALT/AST و IgG سه‌حالته نقل می‌شوند", () => {
  const f = one(run([T("ASMA", "1:80"), T("ALT", 250, "U/L", "<40")]), "liver_autoantibody_result");
  assert.equal(f.urgency, "this_week");
  assert.match(f.must_say, /هپاتیت خودایمنی/);
  assert.match(f.must_say, /250/);
  assert.match(f.must_say, /IgG سرم روی این برگه نیست/);
  const neg = one(run([T("ASMA", "1:20")]), "liver_autoantibody_result");
  assert.equal(neg.urgency, "routine");
  assert.match(neg.must_say, /منفی/);
  assert.match(neg.must_say, /آنزیم‌های کبد|رد نمی‌کند/);
});

test("AI3-10: AMA 1:160 ⇒ PBC؛ ALPِ بالای همان برگه نقل می‌شود، و غایبش گفته می‌شود", () => {
  const f = one(run([T("AMA", "1:160"), T("ALP", 420, "U/L", "<306")]), "liver_autoantibody_result");
  assert.match(f.must_say, /کلانژیتِ صفراویِ اولیه/);
  assert.match(f.must_say, /420/);
  assert.match(one(run([T("AMA-M2", 50, "U", "<20")]), "liver_autoantibody_result").must_say, /ALP\) روی این برگه نیست/);
  for (const n of ["Anti-LKM1", "Anti-SLA/LP"]) assert.equal(one(run([T(n, "Positive")]), "liver_autoantibody_result").urgency, "this_week", n);
});

test("AI3-11: AChR 0.8 nmol/L ⇒ this_week + متخصصِ مغز و اعصاب + هشدارِ تنفس/بلع؛ بی‌بازه با مرزِ 0.02؛ منفی ⇒ «رد نمی‌کند» + MuSK", () => {
  for (const ref of ["<=0.02", ""]) {
    const f = one(run([T("AChR binding Ab", 0.8, "nmol/L", ref)]), "mg_antibody_result");
    assert.equal(f.urgency, "this_week", `ref=${ref}`);
    assert.ok(f.suggest.includes("بررسی توسط متخصص مغز و اعصاب"));
    assert.match(f.warnings.join(" "), /اورژانس/);
    assert.notEqual(f.urgency, "emergency");
  }
  const n = one(run([T("AChR binding Ab", 0.01, "nmol/L", "<=0.02")]), "mg_antibody_result");
  assert.equal(n.urgency, "routine");
  assert.match(n.must_say, /رد نمی‌کند/);
  assert.ok(n.suggest.includes("Anti-MuSK"));
  assert.equal(one(run([T("Anti-MuSK", "Positive")]), "mg_antibody_result").urgency, "this_week");
});

// ── US4: املاها و آنتی‌بادی‌های جانبی ──
test("AI3-12: «ANA (IIF)» و «FANA» همان یافتهٔ ANA؛ «Anti-Centromere B» همان سانترومر", () => {
  const strip = (f) => f.must_say.replace(/«[^»]*»/g, "").replace(/(ANA \(IIF\)|FANA|ANA)/g, "X");
  assert.equal(strip(one(run([T("ANA (IIF)", "1:160")]), "ana_family_result")), strip(one(run([T("ANA", "1:160")]), "ana_family_result")));
  assert.equal(one(run([T("FANA", "Positive 1:320 speckled")]), "ana_family_result").must_say.includes("speckled"), true);
  assert.equal(one(run([T("Anti-Centromere B", 3, "U", "<1.0")]), "ssc_antibody_result").must_say,
    one(run([T("Anti-Centromere", 3, "U", "<1.0")]), "ssc_antibody_result").must_say);
});

test("AI3-13: «Anti-dsDNA (CLIFT)» 1:20 با «<1:10» مثبت است و روشِ CLIFT نام برده می‌شود", () => {
  const f = one(run([T("Anti-dsDNA (CLIFT)", "1:20", "", "<1:10")]), "ana_family_result");
  assert.equal(f.urgency, "this_week");
  assert.match(f.must_say, /CLIFT/);
  assert.match(one(run([T("Anti-dsDNA (CLIFT)", "1:5", "", "<1:10")]), "ana_family_result").must_say, /داخلِ/);
});

test("AI3-14: هیستونِ مثبت ⇒ لوپوسِ دارویی + «خودسرانه قطع نکنید»، بی‌نامِ یک داروی خاص به‌عنوانِ علت", () => {
  const f = one(run([T("Anti-Histone", 2.5, "U", "<1.0")]), "ana_family_result");
  assert.match(f.must_say, /ناشی از دارو/);
  assert.match(f.must_say, /خودسرانه قطع/);
  assert.match(f.headline, /هیستون/);
});

test("AI3-15: کاردیولیپین IgAِ تنها ⇒ routine با «جزو معیار نیست»؛ کنارِ IgGِ مثبت ⇒ this_week", () => {
  const a = one(run([T("Anticardiolipin IgA", 25, "APL", "<15")]), "antiphospholipid_result");
  assert.equal(a.urgency, "routine");
  assert.match(a.must_say, /جزو آنتی‌بادی‌های معیارِ/);
  assert.equal(one(run([T("Anticardiolipin IgA", 25, "APL", "<15"), T("Anticardiolipin IgG", 50, "GPL", "<20")]), "antiphospholipid_result").urgency, "this_week");
});

test("AI3-16: Anti-DNase B بی‌بازه با سقفِ سنی (۳ سال ۲۵۰، ۱۰ سال ۳۷۵، بزرگسال ۳۰۰)؛ با بازهٔ چاپی، همان بازه", () => {
  const at = (age, v, ref = "") => one(run([T("Anti-DNase B", v, "U/mL", ref)], { age, sex: "M" }), "dnaseb_result");
  assert.match(at(3, 300).headline, /بالاتر/);
  assert.doesNotMatch(at(10, 300).headline, /بالاتر/);
  assert.match(at(30, 350).headline, /بالاتر/);
  assert.match(at(30, 350).must_say, /ASO روی این برگه نیست/);
  assert.doesNotMatch(at(30, 350, "<400").headline, /بالاتر/);
  assert.equal(at(30, 350).urgency, "routine");
});

test("AI3-17: CH50ِ پایین با C3 و C4ِ طبیعی ⇒ «کمبودِ ارثی»، بی‌ادعای فعالیتِ لوپوس", () => {
  const f = one(run([T("CH50", 10, "U/mL", "31-60"), T("C3", 120, "mg/dL", "90-180"), T("C4", 25, "mg/dL", "10-40")]), "complement_result");
  assert.match(f.must_say, /CH50/);
  assert.match(f.must_say, /ارثی/);
  assert.doesNotMatch(f.must_say, /EULAR/);
  assert.ok(f.explains.includes("CH50"));
});

// ── US5: باندهای APS ──
test("AI3-18: کاردیولیپین IgG در ۳۰/۴۵/۸۵ GPL سه جملهٔ جدا، فوریتِ یکسانِ this_week", () => {
  const m = (v) => one(run([T("Anticardiolipin IgG", v, "GPL", "<20")]), "antiphospholipid_result");
  assert.match(m(30).must_say, /زیرِ ۴۰ واحد/);
  assert.match(m(45).must_say, /«متوسط»/);
  assert.match(m(85).must_say, /«بالا»/);
  for (const v of [30, 45, 85]) assert.equal(m(v).urgency, "this_week");
});

test("AI3-19: لوپوس‌آنتی‌کوآگولان ⇒ قیدِ داروهای ضدانعقاد", () => {
  assert.match(one(run([T("Lupus anticoagulant", "Positive")]), "antiphospholipid_result").must_say, /ضدانعقاد/);
});

// ── US6: ایمونوگلوبولین‌ها ──
test("AI3-20: IgG 150 پایین (routine، بی‌تشخیصِ نقصِ ایمنی)؛ IgE 900 بالا؛ کودکِ ۲ ساله «نمی‌توان پایین خواند»", () => {
  const a = one(run([T("IgG", 150, "mg/dL", "700-1600")]), "immunoglobulin_result");
  assert.equal(a.urgency, "routine");
  assert.match(a.must_say, /پایین‌تر از محدودهٔ/);
  assert.doesNotMatch(a.must_say, /CVID|ایمونوگلوبولین وریدی|IVIG/);
  assert.match(one(run([T("IgE", 900, "IU/mL", "<100")]), "immunoglobulin_result").must_say, /آلرژی/);
  assert.match(one(run([T("IgG", 450, "mg/dL", "700-1600")], { age: 2, sex: "M" }), "immunoglobulin_result").must_say, /نمی‌توان «پایین» خواند/);
});

test("AI3-21: هم‌نام‌ها (N25): IgGِ با AU/mL، IgG4، IgG index، SMA و Thyroglobulin همان مسیرِ قبلی", () => {
  const r = run([T("IgG", 250, "AU/mL", "<6"), T("IgG4", 300, "mg/dL", "6-130"), T("IgG index", 0.9, "", "<0.64"), T("SMA", "1:80")]);
  for (const n of ["IgG", "IgG4", "IgG index", "SMA"]) assert.ok(r.e.unmapped.includes(n), `${n} باید unmapped بماند`);
  assert.ok(!r.f.some((f) => NEW_IDS.includes(f.rule_id)));
  const tg = run([T("Thyroglobulin", 20, "ng/mL", "<55"), T("Anti-Tg", 200, "IU/mL", "<115")]);
  assert.ok(!tg.f.some((f) => NEW_IDS.includes(f.rule_id)));
  // «EMA» با ٪ آزمونِ eosin-5'-maleimide (اسفروسیتوز) است، نه آنتی‌بادی اندومیزیوم.
  for (const t of [T("EMA", 65, "%", ">80"), T("EMA binding test", 65, "%", ">80"), T("EMA", 40, "MCF", "")]) {
    const r = run([t]);
    assert.ok(!r.f.some((f) => f.rule_id === "celiac_serology_result"), `${t.name} ${t.unit} نباید سلیاک شود`);
  }
  assert.ok(run([T("EMA", "Positive")]).f.some((f) => f.rule_id === "celiac_serology_result"));
});

// ── FR-015: هیچ ردیفِ تازه‌ای در «تفسیر نشدند» یا «توضیح نداریم» ──
test("AI3-22: پنلِ ترکیبیِ همهٔ کلیدهای تازه ⇒ unmapped خالی، unmatched_abnormal نیست، هیچ اورژانسی نیست", () => {
  const r = run([T("tTG IgA", 150, "U/mL", "<10"), T("Total IgA", 90, "mg/dL", "70-400"), T("ASMA", "1:80"), T("AMA-M2", 50, "U", "<20"),
    T("AChR binding Ab", 0.8, "nmol/L", "<=0.02"), T("Anti-Histone", 2, "U", "<1"), T("Anticardiolipin IgA", 25, "APL", "<15"),
    T("Anti-DNase B", 500, "U/mL", "<300"), T("CH50", 10, "U/mL", "31-60"), T("IgG", 2100, "mg/dL", "700-1600"), T("IgE", 900, "IU/mL", "<100"),
    T("ANA (IIF)", "1:160"), T("Anti-dsDNA (CLIFT)", "1:20", "", "<1:10")]);
  assert.deepEqual(r.e.unmapped, []);
  assert.ok(!r.f.some((f) => f.rule_id === "unmatched_abnormal"));
  assert.notEqual(r.p.overall_urgency, "emergency");
  for (const id of NEW_IDS) one(r, id);
});
