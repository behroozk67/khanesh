// ═══════════════════════════════════════════════════════════════════════════════
// P113 — سن زیستی فنوتیپی (Levine PhenoAge)
//
// منبعِ اصلی: Levine ME, Lu AT, Quach A, Chen BH, Assimes TL, Bandinelli S, et al.
//   "An epigenetic biomarker of aging for lifespan and healthspan."
//   Aging (Albany NY). 2018;10(4):573-591. PMID: 29676998. doi:10.18632/aging.101414
//   جدولِ ۱ همان مقاله، واحدِ هر بیومارکر در معادله را صریح می‌دهد.
// تصحیحِ معادله (مرحلهٔ گم‌شدهٔ تبدیلِ مورتالیتی به سال):
//   Liu Z, Kuo PL, Horvath S, Crimmins E, Ferrucci L, Levine M.
//   PLoS Med. 2019;16(2):e1002760 (Correction to PLoS Med 2018;15(12):e1002718). PMID: 30802240
//
// ⚠️ واحدها: معادلهٔ منتشرشده با واحدهای SIِ جدولِ ۱ نوشته شده است —
//   آلبومین g/L، کراتینین µmol/L، قند mmol/L، CRP با لگاریتمِ طبیعی بر حسب mg/dL،
//   لنفوسیت %، MCV fL، RDW %، ALP U/L، WBC 1000 cells/µL، سن سال.
//   با واحدهای رایجِ آمریکایی (g/dL، mg/dL) به‌جای این‌ها، جملهٔ قند و آلبومین
//   از تعادل خارج می‌شود و mورتالیتی به ۱ (اشباع) می‌رسد؛ یعنی خروجی بی‌معنا.
//   پس این ماژول واحدهای داخلیِ موتور را *پیش از* ورود به معادله به واحدهای فرمول می‌برد.
//   اعتبارسنجیِ پیاده‌سازی (نمونهٔ کارشدهٔ منتشرشده): مردِ ۴۰ ساله با آلبومین ۴٫۷ g/dL،
//   کراتینین ۰٫۸ mg/dL، قند ۹۹ mg/dL، CRP ۱٫۰ mg/L، لنفوسیت ۳۳٪، MCV ۹۰، RDW ۱۳،
//   ALP ۵۰، WBC ۵٫۰ ⇒ xb ≈ −۱۰٫۰۶، مورتالیتیِ ۱۰ساله ≈ ۰٫۸۴٪، PhenoAge ≈ ۳۲٫۷ سال.
//
// اصولِ پروژه: هیچ imputation و هیچ حدسِ واحدی. نبودِ هر یک از ۹ مارکر ⇒ INSUFFICIENT_DATA
//   با فهرستِ دقیقِ مارکرهای غایب؛ واحدِ ناشناخته ⇒ UNIT_UNKNOWN؛ مقدارِ نامعتبر ⇒ INVALID_DATA.
//   تنها استثنای عددی، کفِ CRP است: ln(0) تعریف‌نشده است، پس CRPِ صفر/منفی روی کفِ
//   ۰٫۰۱ mg/dL (معادلِ ۰٫۱ mg/L) بسته می‌شود — همان کفی که پیاده‌سازی‌های مرجع به کار می‌برند.
// ═══════════════════════════════════════════════════════════════════════════════

/** سنِ اعتبار: مدل روی بزرگسالان (NHANES III/IV، ۲۰ سال و بالاتر) ساخته و اعتبارسنجی شده است. */
export const PHENO_AGE_MIN_AGE = 20;

// ثابت‌های منتشرشده (PLoS Med 2019 correction)
const GAMMA = 0.0076927;                          // نرخِ گامپرتز
const MONTHS_10Y = 120;                           // افقِ ۱۰ ساله بر حسبِ ماه
const GOMPERTZ_10Y = Math.exp(GAMMA * MONTHS_10Y) - 1;   // = 1.51714
const CRP_FLOOR_MG_DL = 0.01;                     // کفِ CRP در واحدِ فرمول
const GLU_MGDL_PER_MMOLL = 18.0182;               // تبدیلِ قند (وزنِ مولکولیِ گلوکز)
const CREAT_UMOLL_PER_MGDL = 88.4;                // تبدیلِ کراتینین (KDIGO)

/** ۹ بیومارکرِ الزامیِ مدل. `keys` = کلیدهای پذیرفته‌شده در شیءِ `tests`؛ اولی نامِ گزارشی است. */
export const PHENO_AGE_MARKERS = [
  { id: "ALB", keys: ["ALB"], engineUnit: "g/dL" },
  { id: "CREAT", keys: ["CREAT"], engineUnit: "mg/dL" },
  { id: "GLU", keys: ["GLU_F", "GLU_RANDOM"], engineUnit: "mg/dL" },
  { id: "HS_CRP", keys: ["HS_CRP", "CRP_QUANT", "CRP_Q"], engineUnit: "mg/L" },
  { id: "LYMPH_PCT", keys: ["LYMPH_PCT"], engineUnit: "%" },
  { id: "MCV", keys: ["MCV"], engineUnit: "fL" },
  { id: "RDW_CV", keys: ["RDW_CV"], engineUnit: "%" },
  { id: "ALP", keys: ["ALP"], engineUnit: "U/L" },
  { id: "WBC", keys: ["WBC"], engineUnit: "10^3/uL" },
];

/** ضریبِ تبدیلِ هر مارکر از واحدِ ورودی به واحدِ معادله (جدولِ ۱ لوین). */
const UNIT_SCALE = {
  ALB: { "g/l": 1, "g/dl": 10 },                                   // → g/L
  CREAT: { "umol/l": 1, "micromol/l": 1, "mg/dl": CREAT_UMOLL_PER_MGDL },   // → µmol/L
  GLU: { "mmol/l": 1, "mg/dl": 1 / GLU_MGDL_PER_MMOLL },           // → mmol/L
  HS_CRP: { "mg/l": 1, "mg/dl": 10 },                              // → mg/L
  LYMPH_PCT: { "%": 1, "percent": 1 },
  MCV: { "fl": 1 },
  RDW_CV: { "%": 1, "percent": 1 },
  ALP: { "u/l": 1, "iu/l": 1 },
  WBC: { "10^3/ul": 1, "10*3/ul": 1, "10^9/l": 1, "x10^3/ul": 1, "k/ul": 1 },
};

const normUnit = (u) => String(u ?? "").trim().toLowerCase()
  .replace(/[µμ]/g, "u").replace(/\s+/g, "");

/** اولین مقدارِ موجود از میانِ کلیدهای پذیرفته‌شده (بدونِ هیچ پرکردنِ فرضی). */
function firstValue(tests, keys) {
  for (const k of keys) {
    const v = tests?.[k];
    if (v != null && v !== "") return v;
  }
  return null;
}

/**
 * محاسبهٔ سن زیستی فنوتیپی.
 *
 * @param {object} input
 * @param {object} input.tests  مقادیرِ عددی؛ به‌طورِ پیش‌فرض با واحدهای داخلیِ موتور
 *                              (ALB g/dL، CREAT mg/dL، GLU mg/dL، CRP_Q mg/L، LYMPH_PCT %،
 *                              MCV fL، RDW_CV %، ALP U/L، WBC 10^3/µL)
 * @param {number} input.age    سنِ شناسنامه‌ای (سال)
 * @param {"M"|"F"|null} [input.sex]  در معادلهٔ PhenoAge جملهٔ جنسیت وجود ندارد؛ فقط برای هم‌شکلیِ API.
 * @param {object} [input.units] نگاشتِ اختیاریِ واحدِ ورودی به‌ازای هر مارکر، مثل `{ HS_CRP: "mg/dL" }`
 * @returns {object} یکی از وضعیت‌های CALCULATED / NOT_APPLICABLE_PEDIATRIC / INSUFFICIENT_DATA /
 *                   UNIT_UNKNOWN / INVALID_DATA / OUT_OF_RANGE
 */
export function computePhenoAge({ tests, age, sex = null, units = {} } = {}) {
  void sex;   // مدلِ فنوتیپی جملهٔ جنسیت ندارد
  const chronoAge = age == null || age === "" ? null : Number(age);

  // گام ۱ — گیتِ سنی: مدل برای بزرگسالان (≥ ۲۰ سال) ساخته شده است.
  if (chronoAge == null || !Number.isFinite(chronoAge)) {
    return { status: "NOT_APPLICABLE_PEDIATRIC", phenoAge: null, chronoAge: null, reason: "age_unknown" };
  }
  if (chronoAge < PHENO_AGE_MIN_AGE) {
    return { status: "NOT_APPLICABLE_PEDIATRIC", phenoAge: null, chronoAge, reason: "under_20" };
  }

  // گام ۲ — گردآوری، تبدیلِ واحد و اعتبارسنجیِ عددی (بدونِ هیچ پرکردنِ فرضی).
  const values = {};
  const missing = [];
  const invalid = [];
  const unknownUnits = [];
  for (const m of PHENO_AGE_MARKERS) {
    const raw = firstValue(tests, m.keys);
    if (raw == null) { missing.push(m.id); continue; }
    const n = Number(raw);
    // CRPِ صفر/منفی خطای داده نیست؛ فقط لگاریتم‌پذیر نیست و روی کف بسته می‌شود (پایین‌تر).
    if (!Number.isFinite(n) || (n <= 0 && m.id !== "HS_CRP")) { invalid.push(m.id); continue; }
    const printed = units?.[m.id] ?? units?.[m.keys[0]] ?? m.engineUnit;
    const scale = UNIT_SCALE[m.id][normUnit(printed)];
    if (scale == null) { unknownUnits.push({ id: m.id, unit: String(printed) }); continue; }
    values[m.id] = n * scale;
  }
  if (missing.length) return { status: "INSUFFICIENT_DATA", phenoAge: null, chronoAge, missing };
  if (unknownUnits.length) return { status: "UNIT_UNKNOWN", phenoAge: null, chronoAge, unknownUnits };
  if (invalid.length) return { status: "INVALID_DATA", phenoAge: null, chronoAge, invalid };

  // گام ۳ — معادله (واحدها همان واحدهای جدولِ ۱ لوین).
  const alb = values.ALB;               // g/L
  const creat = values.CREAT;           // µmol/L
  const glucose = values.GLU;           // mmol/L
  const crpMgDl = Math.max(values.HS_CRP / 10, CRP_FLOOR_MG_DL);   // mg/dL، با کفِ ۰٫۰۱
  const lymphPct = values.LYMPH_PCT;    // %
  const mcv = values.MCV;               // fL
  const rdw = values.RDW_CV;            // %
  const alp = values.ALP;               // U/L
  const wbc = values.WBC;               // 10^3/µL

  const xb = -19.9067
    - 0.0336 * alb
    + 0.0095 * creat
    + 0.1953 * glucose
    + 0.0954 * Math.log(crpMgDl)
    - 0.0120 * lymphPct
    + 0.0268 * mcv
    + 0.3306 * rdw
    + 0.00188 * alp
    + 0.0554 * wbc
    + 0.0804 * chronoAge;

  // مورتالیتیِ ۱۰ ساله (تبدیلِ گامپرتزِ تناسبی)
  const mortality = 1 - Math.exp(-(Math.exp(xb) * GOMPERTZ_10Y) / GAMMA);

  // سنِ معادل: معکوسِ مدلِ گامپرتزِ سنِ شناسنامه‌ای (تصحیحِ ۲۰۱۹)
  const phenoAge = 141.50 + Math.log(-0.00553 * Math.log(1 - mortality)) / 0.09165;

  // گاردِ عددی: خروجیِ NaN/∞ یا مورتالیتیِ اشباع‌شده هرگز به بیمار و به مدل نمی‌رود.
  if (!Number.isFinite(phenoAge) || !(mortality > 0 && mortality < 1) || phenoAge <= 0) {
    return { status: "OUT_OF_RANGE", phenoAge: null, chronoAge, xb: +xb.toFixed(3) };
  }

  return {
    status: "CALCULATED",
    phenoAge: +phenoAge.toFixed(1),
    chronoAge,
    ageDelta: +(phenoAge - chronoAge).toFixed(1),        // مثبت = پیریِ تسریع‌شده، منفی = جوان‌تر از سنِ شناسنامه‌ای
    mortalityRisk10yr: +(mortality * 100).toFixed(1),     // درصدِ ریسکِ ۱۰ ساله
    // مقادیر در واحدهای معادله (جدولِ ۱ لوین) — همان چیزی که در فرمول نشسته است، نه واحدِ برگه.
    biomarkersUsed: {
      alb, creat, glucose, crpMgDl, lymphPct, mcv, rdw, alp, wbc,
    },
  };
}

/**
 * دادهٔ کارتِ «سنِ زیستی» برای نمای سادهٔ کلاینت — فقط سه عددِ ساخته‌شده، بی‌هیچ متنِ بالینی.
 * ⚠️ چرا سمتِ سرور: فرانت قرارداد دارد فرمول/اشتقاق نداشته باشد (همان قاعدهٔ `score` در
 *    specs/015). کلاینت این سه عدد را می‌چیند و بس؛ جمله‌های بالینی از rules می‌آیند.
 * @param {{indices?: object, age?: number|null}} engineOut خروجیِ runEngine
 * @returns {{years:number, chronoAge:number, deltaYears:number}|null}
 */
export function phenoAgeCard({ indices, age } = {}) {
  const years = indices?.pheno_age;
  const chronoAge = age;
  if (typeof years !== "number" || !Number.isFinite(years)) return null;
  if (typeof chronoAge !== "number" || !Number.isFinite(chronoAge)) return null;
  return { years, chronoAge, deltaYears: +(years - chronoAge).toFixed(1) };
}
