// P113 — سن زیستی فنوتیپی (Levine PhenoAge): تست‌های ماژول `pheno_age.js` و اتصالش به موتور.
//
// لنگرِ اعتبارسنجی: نمونهٔ کارشدهٔ منتشرشده (Levine 2018 / تصحیحِ PLoS Med 2019):
//   مردِ ۴۰ ساله، آلبومین ۴٫۷ g/dL، کراتینین ۰٫۸ mg/dL، قند ناشتا ۹۹ mg/dL، CRP ۱٫۰ mg/L،
//   لنفوسیت ۳۳٪، MCV ۹۰ fL، RDW ۱۳٪، ALP ۵۰ U/L، WBC ۵٫۰ ⇒ PhenoAge ≈ ۳۲٫۷ سال،
//   مورتالیتیِ ۱۰ساله ≈ ۰٫۸٪. عددهای انتظارِ بقیهٔ تست‌ها با پیاده‌سازیِ مستقلِ همین معادله
//   (پایتون، واحدهای جدولِ ۱ لوین) حساب شده‌اند، نه از خروجیِ خودِ ماژول.
import { describe, it } from "node:test";
import assert from "node:assert";
import { computePhenoAge, PHENO_AGE_MIN_AGE, PHENO_AGE_MARKERS, PHENO_AGE_SOURCES, phenoAgeCard } from "./pheno_age.js";
import { runEngine } from "./adapter.js";

// ── مقادیر با واحدهای داخلیِ موتور (همان شکلِ tests در adapter) ──
//   ALB g/dL · CREAT mg/dL · GLU_F mg/dL · CRP_Q mg/L · LYMPH_PCT % · MCV fL · RDW_CV % · ALP U/L · WBC 10^3/µL
const NORMAL45 = { ALB: 4.4, CREAT: 0.9, GLU_F: 90, CRP_Q: 0.3, LYMPH_PCT: 30, MCV: 90, RDW_CV: 12.5, ALP: 70, WBC: 6.5 };
const ACCEL50 = { ALB: 4.0, CREAT: 1.1, GLU_F: 150, CRP_Q: 4.5, LYMPH_PCT: 20, MCV: 88, RDW_CV: 16, ALP: 110, WBC: 9 };
const YOUNG55 = { ALB: 4.8, CREAT: 0.7, GLU_F: 85, CRP_Q: 0.3, LYMPH_PCT: 35, MCV: 92, RDW_CV: 12, ALP: 55, WBC: 5.2 };
const REF40 = { ALB: 4.7, CREAT: 0.8, GLU_F: 99, CRP_Q: 1.0, LYMPH_PCT: 33, MCV: 90, RDW_CV: 13, ALP: 50, WBC: 5.0 };

const near = (actual, expected, tol = 0.3) =>
  assert.ok(Math.abs(actual - expected) <= tol, `انتظار ${expected}±${tol} بود، ${actual} آمد`);

// ── برگهٔ کامل با نام‌های چاپیِ رایجِ آزمایشگاه‌های ایران ──
const T = (name, value, unit = "") => ({ name, value: String(value), unit });
const FULL_SHEET = () => [
  T("Albumin", 4.4, "g/dL"), T("Creatinine", 0.9, "mg/dL"), T("FBS", 90, "mg/dL"),
  T("hs-CRP", 0.3, "mg/L"), T("Lymph %", 30, "%"), T("MCV", 90, "fL"),
  T("RDW-CV", 12.5, "%"), T("ALP", 70, "U/L"), T("WBC", 6.5, "x10^3/uL"),
];
const run = (tests, age = 45, sex = "M") => runEngine({ tests, patient: { sex, age } });

describe("PhenoAge — اعتبارسنجیِ معادله", () => {
  it("PA1 — نمونهٔ کارشدهٔ منتشرشده: ۴۰ ساله ⇒ PhenoAge ≈ ۳۲٫۷ و ریسکِ ۱۰ساله ≈ ۰٫۸٪", () => {
    const r = computePhenoAge({ tests: REF40, age: 40, sex: "M" });
    assert.equal(r.status, "CALCULATED");
    near(r.phenoAge, 32.7, 0.1);
    near(r.mortalityRisk10yr, 0.8, 0.1);
    near(r.ageDelta, -7.3, 0.1);
    assert.equal(r.chronoAge, 40);
  });

  it("PA2 — ۴۵ ساله با مقادیرِ نرمال: سنِ زیستی نزدیک/کمتر از سنِ شناسنامه‌ای (نه جابه‌جاییِ واحدها)", () => {
    const r = computePhenoAge({ tests: NORMAL45, age: 45 });
    assert.equal(r.status, "CALCULATED");
    near(r.phenoAge, 36.7);
    assert.ok(r.phenoAge < 45, "با پنلِ نرمال نباید بالاتر از سنِ شناسنامه‌ای باشد");
    assert.ok(r.phenoAge > 20 && r.phenoAge < 60, `عددِ بی‌معنا: ${r.phenoAge}`);
  });

  it("PA3 — پیریِ تسریع‌شده: قند ۱۵۰، hs-CRP ۴٫۵ و RDW ۱۶ در ۵۰ سالگی ⇒ به‌طورِ معنادار بالاتر از ۵۰", () => {
    const r = computePhenoAge({ tests: ACCEL50, age: 50 });
    assert.equal(r.status, "CALCULATED");
    near(r.phenoAge, 70.0, 0.5);
    assert.ok(r.phenoAge >= 60, `افزایش باید معنادار باشد، نه یک سال: ${r.phenoAge}`);
    assert.ok(r.ageDelta > 0, "ageDelta باید مثبت باشد");
    near(r.ageDelta, r.phenoAge - 50, 0.05);
  });

  it("PA4 — پیریِ کند: آلبومینِ بالا، التهابِ خیلی کم و قند ۸۵ در ۵۵ سالگی ⇒ پایین‌تر از ۵۵", () => {
    const r = computePhenoAge({ tests: YOUNG55, age: 55 });
    assert.equal(r.status, "CALCULATED");
    near(r.phenoAge, 38.6, 0.5);
    assert.ok(r.phenoAge < 55, `${r.phenoAge} باید کمتر از ۵۵ باشد`);
    assert.ok(r.ageDelta < 0, "ageDelta باید منفی باشد");
  });

  it("PA5 — کنترلِ مثبتِ عددی: هیچ‌کدام از سه پنل نباید NaN/∞ یا ریسکِ اشباع‌شده بدهند", () => {
    for (const [t, age] of [[REF40, 40], [NORMAL45, 45], [ACCEL50, 50], [YOUNG55, 55]]) {
      const r = computePhenoAge({ tests: t, age });
      assert.equal(r.status, "CALCULATED");
      assert.ok(Number.isFinite(r.phenoAge) && Number.isFinite(r.mortalityRisk10yr));
      assert.ok(r.mortalityRisk10yr > 0 && r.mortalityRisk10yr < 100, `ریسکِ اشباع: ${r.mortalityRisk10yr}`);
    }
  });
});

describe("PhenoAge — گیت‌کیپینگ و دادهٔ ناقص", () => {
  it("PA6 — نبودِ ALB ⇒ INSUFFICIENT_DATA با فهرستِ دقیق و phenoAge = null", () => {
    const { ALB, ...rest } = NORMAL45;
    const r = computePhenoAge({ tests: rest, age: 45 });
    assert.equal(r.status, "INSUFFICIENT_DATA");
    assert.deepEqual(r.missing, ["ALB"]);
    assert.equal(r.phenoAge, null);
    assert.equal(r.mortalityRisk10yr, undefined, "ریسکی نباید ساخته شود");
  });

  it("PA7 — نبودِ hs-CRP ⇒ همان گیت؛ و چند مارکرِ غایب همه در فهرست می‌آیند (ترتیبِ ثابت)", () => {
    const { CRP_Q, ALB, ...rest } = NORMAL45;
    const r = computePhenoAge({ tests: rest, age: 45 });
    assert.equal(r.status, "INSUFFICIENT_DATA");
    assert.deepEqual(r.missing, ["ALB", "HS_CRP"]);
    assert.equal(r.phenoAge, null);
    // هیچ imputation: مقدارِ صفر/جعلی جای ALB ننشسته است
    assert.equal(r.biomarkersUsed, undefined);
  });

  it("PA8 — برگهٔ کاملاً خالی ⇒ هر ۹ مارکر در فهرستِ غایب", () => {
    const r = computePhenoAge({ tests: {}, age: 60 });
    assert.equal(r.status, "INSUFFICIENT_DATA");
    assert.deepEqual(r.missing, PHENO_AGE_MARKERS.map((m) => m.id));
    assert.equal(r.missing.length, 9);
  });

  it("PA9 — سنِ ۱۷ سال ⇒ NOT_APPLICABLE_PEDIATRIC (پنلِ کامل هم بی‌فایده است)", () => {
    const r = computePhenoAge({ tests: NORMAL45, age: 17 });
    assert.equal(r.status, "NOT_APPLICABLE_PEDIATRIC");
    assert.equal(r.phenoAge, null);
    assert.ok(PHENO_AGE_MIN_AGE === 20);
  });

  it("PA10 — سنِ نامشخص یا نامعتبر ⇒ NOT_APPLICABLE_PEDIATRIC، بدونِ استثنا", () => {
    for (const age of [null, undefined, "", "abc"]) {
      const r = computePhenoAge({ tests: NORMAL45, age });
      assert.equal(r.status, "NOT_APPLICABLE_PEDIATRIC", `age=${String(age)}`);
      assert.equal(r.phenoAge, null);
    }
  });

  it("PA11 — مرزِ سنی: ۱۹ نه، ۲۰ بله", () => {
    assert.equal(computePhenoAge({ tests: NORMAL45, age: 19 }).status, "NOT_APPLICABLE_PEDIATRIC");
    assert.equal(computePhenoAge({ tests: NORMAL45, age: 20 }).status, "CALCULATED");
  });
});

describe("PhenoAge — واحدها", () => {
  it("PA12 — hs-CRP: ۴٫۵ mg/L و ۰٫۴۵ mg/dL یک عدد می‌دهند (ضریبِ ÷۱۰)", () => {
    const a = computePhenoAge({ tests: ACCEL50, age: 50, units: { HS_CRP: "mg/L" } });
    const b = computePhenoAge({ tests: { ...ACCEL50, CRP_Q: 0.45 }, age: 50, units: { HS_CRP: "mg/dL" } });
    assert.equal(a.status, "CALCULATED");
    assert.equal(b.status, "CALCULATED");
    assert.equal(a.phenoAge, b.phenoAge);
    near(a.biomarkersUsed.crpMgDl, 0.45, 1e-9);
    near(b.biomarkersUsed.crpMgDl, 0.45, 1e-9);
  });

  it("PA13 — آلبومین: ۴٫۴ g/dL و ۴۴ g/L یک عدد می‌دهند (ضریبِ ×۱۰)", () => {
    const a = computePhenoAge({ tests: NORMAL45, age: 45, units: { ALB: "g/dL" } });
    const b = computePhenoAge({ tests: { ...NORMAL45, ALB: 44 }, age: 45, units: { ALB: "g/L" } });
    assert.equal(a.phenoAge, b.phenoAge);
    near(a.biomarkersUsed.alb, 44, 1e-9);
  });

  it("PA14 — کراتینین و قند: mmol/L و µmol/L همان عددِ واحدهای رایج را می‌دهند", () => {
    const mg = computePhenoAge({ tests: NORMAL45, age: 45 });
    const si = computePhenoAge({
      tests: { ...NORMAL45, CREAT: 79.56, GLU_F: 90 / 18.0182 },
      age: 45,
      units: { CREAT: "µmol/L", GLU: "mmol/L" },
    });
    near(si.phenoAge, mg.phenoAge, 0.05);
  });

  it("PA15 — کفِ CRP: صفر و منفی ⇒ NaN نمی‌سازد و روی کفِ ۰٫۰۱ mg/dL بسته می‌شود", () => {
    for (const crp of [0, -3]) {
      const r = computePhenoAge({ tests: { ...NORMAL45, CRP_Q: crp }, age: 45 });
      assert.equal(r.status, "CALCULATED", `CRP=${crp}`);
      near(r.biomarkersUsed.crpMgDl, 0.01, 1e-9);
      assert.ok(Number.isFinite(r.phenoAge));
    }
  });

  it("PA16 — واحدِ ناشناخته ⇒ UNIT_UNKNOWN (حدس زده نمی‌شود), مقدارِ نامعتبر ⇒ INVALID_DATA", () => {
    const bad = computePhenoAge({ tests: NORMAL45, age: 45, units: { MCV: "pg" } });
    assert.equal(bad.status, "UNIT_UNKNOWN");
    assert.deepEqual(bad.unknownUnits, [{ id: "MCV", unit: "pg" }]);
    assert.equal(bad.phenoAge, null);

    const invalid = computePhenoAge({ tests: { ...NORMAL45, MCV: 0 }, age: 45 });
    assert.equal(invalid.status, "INVALID_DATA");
    assert.deepEqual(invalid.invalid, ["MCV"]);
    assert.equal(invalid.phenoAge, null);

    const notNumber = computePhenoAge({ tests: { ...NORMAL45, WBC: "بالا" }, age: 45 });
    assert.equal(notNumber.status, "INVALID_DATA");
    assert.deepEqual(notNumber.invalid, ["WBC"]);
  });

  it("PA17 — قند: فقط ناشتا پذیرفته است؛ قندِ تصادفیِ تنها ⇒ INSUFFICIENT_DATA (P113-Q1)", () => {
    const { GLU_F, ...rest } = NORMAL45;
    assert.equal(computePhenoAge({ tests: rest, age: 45 }).status, "INSUFFICIENT_DATA");
    // ⚠️ قندِ تصادفی جایگزینِ ناشتا نیست: مدل روی قندِ ناشتا ساخته شده و قندِ بعدِ غذا سن را کاذب بالا می‌برد.
    const withRandom = computePhenoAge({ tests: { ...rest, GLU_RANDOM: 140 }, age: 45 });
    assert.equal(withRandom.status, "INSUFFICIENT_DATA");
    assert.deepEqual(withRandom.missing, ["GLU"]);
    assert.equal(withRandom.phenoAge, null);
    // ناشتا ⇒ عدد، همان عددِ پنلِ مرجع
    assert.equal(
      computePhenoAge({ tests: NORMAL45, age: 45 }).phenoAge,
      computePhenoAge({ tests: { ...rest, GLU_F: 90 }, age: 45 }).phenoAge
    );
  });
});

describe("PhenoAge — اتصال به موتور (adapter)", () => {
  it("PA18 — برگهٔ کاملِ ۴۵ ساله ⇒ indices.pheno_age همان عددِ ماژول است", () => {
    const e = run(FULL_SHEET(), 45);
    assert.equal(typeof e.indices.pheno_age, "number");
    assert.equal(e.indices.pheno_age, computePhenoAge({ tests: NORMAL45, age: 45 }).phenoAge);
  });

  it("PA19 — نبودِ hs-CRP روی برگه ⇒ کلید در indices ساخته نمی‌شود (بی‌عدد، نه عددِ فرضی)", () => {
    const e = run(FULL_SHEET().filter((t) => !/crp/i.test(t.name)), 45);
    assert.equal(e.indices.pheno_age, undefined);
  });

  it("PA20 — برگهٔ اطفال (۱۷ ساله) ⇒ هیچ عددی، حتی با پنلِ کامل", () => {
    const e = run(FULL_SHEET(), 17);
    assert.equal(e.indices.pheno_age, undefined);
  });

  it("PA21 — واحدهای SIِ برگه (آلبومین g/L، کراتینین µmol/L، قند mmol/L) به همان عددِ واحدهای رایج می‌رسند", () => {
    const si = [
      T("Albumin", 44, "g/L"), T("Creatinine", 79.56, "umol/L"), T("FBS", 4.995, "mmol/L"),
      T("hs-CRP", 0.3, "mg/L"), T("Lymph %", 30, "%"), T("MCV", 90, "fL"),
      T("RDW-CV", 12.5, "%"), T("ALP", 70, "U/L"), T("WBC", 6.5, "10^3/uL"),
    ];
    const eSi = run(si, 45);
    const eConv = run(FULL_SHEET(), 45);
    assert.equal(typeof eSi.indices.pheno_age, "number");
    near(eSi.indices.pheno_age, eConv.indices.pheno_age, 0.2);
  });

  it("PA22 — CRPِ با واحدِ mg/dL روی برگه (تبدیلِ موتور به mg/L) عددِ یکسان می‌دهد", () => {
    const sheet = FULL_SHEET().map((t) => (/crp/i.test(t.name) ? T("hs-CRP", 0.03, "mg/dL") : t));
    const e = run(sheet, 45);
    assert.equal(typeof e.indices.pheno_age, "number");
    near(e.indices.pheno_age, run(FULL_SHEET(), 45).indices.pheno_age, 0.1);
  });
});

describe("PhenoAge — دادهٔ کارتِ نمای ساده (phenoAgeCard)", () => {
  it("PA23 — سه عدد + نشانِ سقف می‌دهد و هیچ متنِ بالینی نمی‌سازد؛ نبودِ عدد یا سن ⇒ null", () => {
    assert.deepEqual(
      phenoAgeCard({ indices: { pheno_age: 36.7 }, age: 45 }),
      { years: 36.7, chronoAge: 45, deltaYears: -8.3, capped: false }
    );
    // پیریِ تسریع‌شده هم مثبت می‌شود، نه صفر
    assert.equal(phenoAgeCard({ indices: { pheno_age: 51.2 }, age: 45 }).deltaYears, 6.2);
    // P113-Q4: عددِ زیرِ ۲۰ سال ⇒ capped (کارت به‌جای عدد «کمتر از ۲۰» می‌نویسد)
    const low = phenoAgeCard({ indices: { pheno_age: 15.4 }, age: 25 });
    assert.equal(low.capped, true);
    assert.equal(low.years, 15.4, "عددِ محاسبه‌شده باید حفظ شود، فقط نمایش سقف می‌خورد");
    assert.equal(phenoAgeCard({ indices: { pheno_age: 20 }, age: 40 }).capped, false);
    // هر ورودیِ بی‌عدد/بی‌سن ⇒ کارت رندر نمی‌شود (نه عددِ صفر، نه NaN)
    for (const bad of [
      { indices: {}, age: 45 },
      { indices: { pheno_age: 36.7 }, age: null },
      { indices: { pheno_age: NaN }, age: 45 },
      { indices: { pheno_age: "36.7" }, age: 45 },
      {},
    ]) {
      assert.equal(phenoAgeCard(bad), null, JSON.stringify(bad));
    }
    assert.equal(phenoAgeCard(), null);
  });

  it("PA24 — از خروجیِ موتور: پنلِ کامل کارت دارد، برگهٔ ناقص و اطفال ندارند", () => {
    const full = phenoAgeCard(run(FULL_SHEET(), 45));
    assert.deepEqual(Object.keys(full).sort(), ["capped", "chronoAge", "deltaYears", "years"]);
    assert.equal(full.chronoAge, 45);
    assert.equal(full.capped, false);
    near(full.deltaYears, full.years - 45, 0.05);
    assert.equal(phenoAgeCard(run(FULL_SHEET().filter((t) => !/crp/i.test(t.name)), 45)), null);
    assert.equal(phenoAgeCard(run(FULL_SHEET(), 17)), null);
  });

  it("PA26 — برگه‌ای که فقط قندِ تصادفی دارد: نه عدد در indices، نه کارت", () => {
    const sheet = FULL_SHEET().map((t) => (/^FBS$/i.test(t.name) ? T("BS", 140, "mg/dL") : t));
    const e = run(sheet, 45);
    assert.equal(e.indices.pheno_age, undefined);
    assert.equal(phenoAgeCard(e), null);
  });

  it("PA27 — «چرا ساخته نشد» با diagnostics:true می‌آید و پیش‌فرض خاموش است (فریزها دست‌نخورده)", () => {
    const diag = (tests, age) => runEngine({ tests, patient: { sex: "M", age } }, { diagnostics: true }).phenoAgeDiag;
    // برگهٔ کامل: هیچ کلیدی — نه در حالتِ پیش‌فرض، نه با diagnostics
    assert.equal("phenoAgeDiag" in run(FULL_SHEET(), 45), false);
    assert.equal("phenoAgeDiag" in runEngine({ tests: FULL_SHEET(), patient: { sex: "M", age: 45 } }, { diagnostics: true }), false);
    // CRP غایب ⇒ نامِ دقیقِ مارکر
    assert.deepEqual(diag(FULL_SHEET().filter((t) => !/crp/i.test(t.name)), 45), { status: "INSUFFICIENT_DATA", missing: ["HS_CRP"] });
    // قندِ تصادفی (Q1) ⇒ GLU، نه GLU_RANDOM
    assert.deepEqual(diag(FULL_SHEET().map((t) => (/^FBS$/i.test(t.name) ? T("BS", 140, "mg/dL") : t)), 45), { status: "INSUFFICIENT_DATA", missing: ["GLU"] });
    // سنِ زیرِ ۲۰ ⇒ دلیلِ سنی، بی‌فهرستِ مارکر
    assert.deepEqual(diag(FULL_SHEET(), 17), { status: "NOT_APPLICABLE_PEDIATRIC" });
  });

  it("PA25 — هر دو منبعِ P113 در رجیستریِ guidelines.js هست (بی‌منبعِ معلق)", async () => {
    const { guideline } = await import("./guidelines.js");
    for (const id of PHENO_AGE_SOURCES) {
      const g = guideline(id);
      assert.ok(g, `منبعِ ثبت‌نشده: ${id}`);
      assert.ok(g.org && g.year && g.url, id);
      assert.ok(/[؀-ۿ]/.test(g.fa), `${id}: نامِ فارسی ندارد`);
    }
  });
});
