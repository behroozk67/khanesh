// ============================================================
// minor.js — «انحرافِ جزئی»: جدولِ سه‌ردهٔ آستانه، و سقفِ «نوبتِ عادی» برای برگهٔ تقریباً سالم (P108-ب، تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶)
//
// چرا جدول، نه یک ۱۰٪ِ ثابت: سدیمِ ۱۲۵ فقط ۷٫۴٪ زیرِ حد است و پتاسیمِ ۵٫۵ حدودِ ۸٪ بالای حد؛ هر دو مهم‌اند. در عوض کلسترولِ ۲۱۰
//   (۵٪ بالای ۲۰۰) «این هفته» می‌گرفت. پس هر آزمایش ردهٔ خودش را دارد:
//   ردهٔ ۱ — تغییرِ کوچک هم بالینی است (الکترولیت، قند، Hb، انعقاد، قلب، …): هرگز «جزئی» نیست.
//   ردهٔ ۲ — تغییرپذیریِ بالا؛ مرزِ بالینیِ منبع‌دار (ALT/AST < ۲×ULN، CK < ۳×ULN، TG < ۲۰۰، …) یا، بی‌مرزِ منبع‌دار، نوارِ EFLM.
//   ردهٔ ۳ — بقیه: نوارِ EFLM اگر CVi در biovar.js هست، وگرنه ۱۰٪.
// نوارِ EFLM = عدمِ قطعیتِ ۹۵٪ِ *یک* نتیجه حولِ نقطهٔ تنظیمِ خودِ فرد: 1.96 × √(CVi² + CVa²)، با CVa = ۰٫۵ × CVi (همان فرضِ APSِ
//   «مطلوب» در rcv()). یعنی ≈ ۲٫۱۹ × CVi. عددی کمتر از این بیرونِ مرز، از نوسانِ طبیعیِ بدن و خطای دستگاه جدا نمی‌شود.
//   (RCV در biovar.js برای *دو* نتیجه است، √2 بزرگ‌تر؛ این‌جا یک نتیجه داریم.)
// ⚠️ کلیدی که این‌جا نیست ردهٔ ۱ است: سقف هرگز بی‌تصمیمِ صریح روی آزمایشی نمی‌نشیند (N16/N29 — مالکِ صریح، نه پیش‌فرض).
// ⚠️ این جدول هیچ عددی را «غیرطبیعی» یا «طبیعی» نمی‌کند (آن کارِ refs.js است) و هیچ فوریتی را بالا نمی‌برد.
// ============================================================
import { BV } from "./biovar.js";
import { ACTIVE_CONDITIONS } from "./conditions.js";

const T1 = { tier: 1 };
const eflm = (tier = 3) => ({ tier, eflm: true });
const pct10 = { tier: 3, pct: 10 };
const both = (spec) => ({ low: spec, high: spec });

/** منبعِ هر مرزِ ردهٔ ۲ — در جدولِ MEDICAL_RULES.md (P108-ب) هم آمده. */
export const MINOR_SOURCES = {
  ACG_2017: "ACG 2017 (Kwo و همکاران): ALT/AST کمتر از ۲×ULN «مرزی» است",
  USER_CK: "تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶: CK کمتر از ۳×ULN",
  ATLANTA_2012: "Revised Atlanta 2012: تشخیصِ پانکراتیت با آمیلاز/لیپاز ≥ ۳×ULN",
  NCEP_ATP3: "NCEP ATP III: TG ۱۵۰–۱۹۹، کلسترول ۲۰۰–۲۳۹ و LDL ۱۳۰–۱۵۹ «مرزی»",
  AHA_CDC_2003: "AHA/CDC 2003 (Pearson): CRP بالای ۱۰ mg/L نشانهٔ التهاب/عفونتِ حاد؛ ۳–۱۰ التهابِ خفیف",
  ETA_2013: "ETA 2013: TSH بالا تا زیرِ ۱۰ کم‌کاریِ تحت‌بالینیِ خفیف",
  ATA_2016: "ATA 2016: TSH ۰٫۱–۰٫۴ پرکاریِ تحت‌بالینیِ درجهٔ ۱",
};

/**
 * جدول. هر سمت (low/high) یکی از این‌ها:
 *   { tier: 1 }                         هرگز جزئی نیست
 *   { tier, maxX, src }                 بالا: جزئی اگر مقدار < maxX × ULN
 *   { tier, max, src } / { tier, min }  مرزِ مطلق: جزئی اگر مقدار < max (بالا) یا ≥ min (پایین)
 *   { tier, eflm: true }                نوارِ EFLM (کلید باید در BV باشد)
 *   { tier, pct }                       نوارِ درصدیِ ثابت
 */
export const MINOR_TABLE = {
  // ── ردهٔ ۱: الکترولیت، اسید-باز، قند، Hb، انعقاد، قلب، عفونتِ شدید، غربالگری‌های تشخیصی ──
  NA: both(T1), K: both(T1), CL: both(T1), CA: both(T1), HCO3: both(T1), PH: both(T1), OSM: both(T1), LACTATE: both(T1), NH3: both(T1),
  // Mg بالا: تصمیمِ بازبین P77-پاسخ A(2) «بالای مرجع ⇒ this_week» — تا تصمیمِ تازه ردهٔ ۱ (پرسشِ باز در P108-ب).
  MG: both(T1), PHOS: { low: T1, high: eflm() },
  // کلسیمِ ادرارِ ۲۴ساعته: آستانهٔ جنسیتیِ تصمیم‌شده (W04، P87) خودش مرزِ بالینی است.
  U_CA: both(T1),
  GLU_F: both(T1), GLU_2H: both(T1), GLU_RANDOM: both(T1), HBA1C: both(T1),
  HGB: both(T1), HCT: both(T1), HBA2: both(T1), HBF: both(T1), BAND_ABS: both(T1),
  PT: both(T1), INR: both(T1), APTT: both(T1), FIB: both(T1), DDIMER: both(T1), ATIII: both(T1), TT: both(T1),
  TROPONIN_I: both(T1), CK_MB: both(T1), BNP: both(T1), NTPROBNP: both(T1), PCT_SEPSIS: both(T1),
  ACR: both(T1), KAPPA_FLC: both(T1), LAMBDA_FLC: both(T1), CORTISOL_AM: both(T1), CORTISOL_DST: both(T1),
  WRIGHT: both(T1), ME2: both(T1), COOMBS_WRIGHT: both(T1),
  BILI_D: both(T1),
  // کمبود با خودِ مرز تعریف می‌شود (فریتینِ زیرِ ۳۰ یعنی ذخیرهٔ آهنِ کم، نه «کمی پایین»):
  FERRITIN: { low: T1, high: eflm(2) }, HAPTO: { low: T1, high: eflm() },
  SEMEN_VOL: both(T1), SPERM_CONC: both(T1), SPERM_MOT_TOTAL: both(T1), SPERM_MOT_PROG: both(T1), SPERM_MORPH: both(T1), SEMEN_PH: both(T1),

  // ── ردهٔ ۲: تغییرپذیریِ بالا ──
  ALT: { low: pct10, high: { tier: 2, maxX: 2, src: "ACG_2017" } },
  AST: { low: pct10, high: { tier: 2, maxX: 2, src: "ACG_2017" } },
  CK: { low: pct10, high: { tier: 2, maxX: 3, src: "USER_CK" } },
  AMYLASE: { low: pct10, high: { tier: 2, maxX: 3, src: "ATLANTA_2012" } },
  LIPASE: { low: pct10, high: { tier: 2, maxX: 3, src: "ATLANTA_2012" } },
  TG: { low: pct10, high: { tier: 2, max: 200, src: "NCEP_ATP3" } },
  CHOL: { low: pct10, high: { tier: 2, max: 240, src: "NCEP_ATP3" } },
  LDL: { low: pct10, high: { tier: 2, max: 160, src: "NCEP_ATP3" } },
  CRP_Q: { low: pct10, high: { tier: 2, max: 10, src: "AHA_CDC_2003" } },
  TSH: { low: { tier: 2, min: 0.1, src: "ATA_2016" }, high: { tier: 2, max: 10, src: "ETA_2013" } },
  UREA: both(eflm(2)), UREA_N: both(eflm(2)), URIC: both(eflm(2)), BILI_T: both(eflm(2)), IRON: both(eflm(2)),

  // ── ردهٔ ۳: نوارِ EFLM ──
  CREAT: both(eflm()), ALP: both(eflm()), GGT: both(eflm()), LDH: both(eflm()), ALB: both(eflm()), TP: both(eflm()),
  RBC: both(eflm()), MCV: both(eflm()), MCH: both(eflm()), MCHC: both(eflm()), RDW_CV: both(eflm()), MPV: both(eflm()),
  WBC: both(eflm()), PLT: both(eflm()), TIBC: both(eflm()),
  FT4: both(eflm()), FT3: both(eflm()), T3: both(eflm()), T4: both(eflm()), HDL: both(eflm()), FOLATE: { low: pct10, high: eflm() }, RF: both(eflm()),
  // ── ردهٔ ۳: بی CVi در جدولِ EFLMِ ما ⇒ ۱۰٪ ──
  RETIC: both(pct10), RDW_SD: both(pct10), NEUT_ABS: both(pct10), LYMPH_ABS: both(pct10), MONO_ABS: both(pct10),
  EOS_ABS: both(pct10), BASO_ABS: both(pct10), MYOGLOBIN: both(pct10), TRANSFERRIN: both(pct10), BILI_I: both(pct10),
  TSAT: both(pct10), B12: both(pct10), VIT_D: both(pct10), ANTI_TPO: both(pct10), APOB: both(pct10), PTH: both(pct10),
  HCY: both(pct10), PRL: both(pct10), TESTO: both(pct10),
};

/** نوارِ EFLM به درصد (گرد). کلیدِ بی CVi ⇒ null. */
export function eflmBandPct(key) {
  const cvi = BV[key]?.cvi;
  if (cvi == null) return null;
  return Math.round(1.96 * Math.sqrt(cvi * cvi + (0.5 * cvi) ** 2));
}

/** بازهٔ عددیِ یک نتیجهٔ graded («0–200»، «3.5-5») ⇒ [lo, hi]. */
function boundsOf(g) {
  const m = String(g?.range ?? "").match(/^\s*(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\s*$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** ردهٔ یک نتیجهٔ غیرطبیعی در جهتِ خودش (کلیدِ بی‌ردیف ⇒ ۱). */
export function minorTier(key, dir) {
  return MINOR_TABLE[key]?.[dir === "low" ? "low" : "high"]?.tier ?? 1;
}

/**
 * آیا این نتیجهٔ غیرطبیعی «انحرافِ جزئی» است؟ فقط برای ردهٔ ۲ و ۳، و فقط اگر بازه و جهت معلوم باشد.
 * هر ابهام ⇒ false (سقف نمی‌نشیند).
 */
export function isMinorDeviation(g) {
  if (!g?.abnormal || (g.dir !== "high" && g.dir !== "low") || typeof g.value !== "number") return false;
  const spec = MINOR_TABLE[g.test]?.[g.dir];
  if (!spec || spec.tier === 1) return false;
  const b = boundsOf(g);
  if (!b) return false;
  const [lo, hi] = b, v = g.value;
  if (g.dir === "high") {
    if (!(hi > 0)) return false;
    if (spec.maxX != null) return v < spec.maxX * hi;
    if (spec.max != null) return v < spec.max;
    const band = spec.eflm ? eflmBandPct(g.test) : spec.pct;
    return band != null && v <= hi * (1 + band / 100);
  }
  if (!(lo > 0)) return false;
  if (spec.min != null) return v >= spec.min;
  const band = spec.eflm ? eflmBandPct(g.test) : spec.pct;
  return band != null && v >= lo * (1 - band / 100);
}

/**
 * قاعده‌هایی که روی برگهٔ تقریباً سالم «این هفته» می‌دادند و سقف می‌گیرند (از جاروبِ همهٔ کلیدهای ردهٔ ۲/۳ در نوارِ جزئی،
 * تک و جفت — minor.test.js، MN4). هر یافتهٔ «این هفته»ی دیگری روی برگه سقف را برای *کلِ* برگه برمی‌دارد.
 */
export const MINOR_CAPPABLE = new Set([
  "lipid_profile", "thyroid", "crp_elevated", "pancreas_pattern",
  "leukopenia", "thrombocytopenia", "mild_neutropenia", "myoglobin_abnormal",
  "liver_pattern", "alp_isolated", "isolated_ldh_elevation", "bilirubin_total_alone", "bilirubin_pattern",
  "iron_markers_high", "phosphate_abnormal", "hypothyroid_dyslipidemia_link",
]);

const LOW_LINES = [["WBC", "NEUT_ABS"], ["PLT"]];

/** پیش‌شرط‌های برگه — هر کدام نباشد، سقف نمی‌نشیند. */
export function minorCapApplies(engineOut, findings) {
  const e = engineOut;
  if (!e || e._probe) return false;
  if (e.age != null && e.age < 16) return false;
  if (e.pregnant) return false;
  if ((e.conditions ?? []).some((id) => ACTIVE_CONDITIONS.has(id))) return false;
  const abn = e.abnormal ?? [];
  if (!abn.length) return false;
  for (const a of abn) {
    const g = e.graded.find((x) => x.test === a.test) ?? a;
    if (!isMinorDeviation(g)) return false;
  }
  // دو ردهٔ سلولیِ پایین با هم (WBC/نوتروفیل + پلاکت) دیگر «یک عددِ کمی پایین» نیست.
  const lowLines = LOW_LINES.filter((ks) => abn.some((a) => ks.includes(a.test) && a.dir === "low")).length;
  if (lowLines >= 2) return false;
  for (const f of findings) {
    if (f.urgency === "emergency" || f.urgency === "soon") return false;
    if (f.urgency === "this_week" && !MINOR_CAPPABLE.has(f.rule_id)) return false;
  }
  return true;
}

const minorNote = (many) => (many
  ? "این عددها فقط کمی بیرون از محدوده‌اند و چنین فاصله‌ای می‌تواند نوسانِ طبیعیِ بدن یا خطای اندازه‌گیری باشد؛ "
  : "این عدد فقط کمی بیرون از محدوده است و چنین فاصله‌ای می‌تواند نوسانِ طبیعیِ بدن یا خطای اندازه‌گیری باشد؛ ") +
  "تکرارِ آزمایش پس از چند هفته نشان می‌دهد این تغییر پایدار است یا نه.";
const WEEK_HEAD = /(^|[.؛]\s*)(این هفته|همین چند روز|در همین هفته‌های پیشِ رو|در هفته جاری)\s+/g;

/** «این هفته …» ⇒ «در نوبتِ عادی …»؛ جمله‌های دیگر (شرطی‌ها، محتوا) دست‌نخورده. */
export function routineAction(action, many = false) {
  const base = String(action ?? "").replace(WEEK_HEAD, "$1در نوبتِ عادی ").trim();
  return base ? `${base} ${minorNote(many)}` : `در نوبتِ عادی با پزشک مطرح کنید. ${minorNote(many)}`;
}

/** سقف را می‌نشاند. فقط this_week ⇒ routine؛ هرگز چیزی را بالا نمی‌برد. */
export function applyMinorCap(findings, engineOut) {
  if (!minorCapApplies(engineOut, findings)) return;
  const many = (engineOut.abnormal ?? []).length > 1;
  for (const f of findings) {
    if (f.urgency !== "this_week" || !MINOR_CAPPABLE.has(f.rule_id)) continue;
    f.urgency = "routine";
    f.minor_cap = true;
    f.action = routineAction(f.action, many);
  }
}
