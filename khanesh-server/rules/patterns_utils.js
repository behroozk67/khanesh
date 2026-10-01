// ============================================================
// LabMate — قواعد الگو
//
// موتور تصمیم می‌گیرد. AI فقط فارسی می‌نویسد.
//
// چرا این فایل لازم شد:
//   با gpt-4o-mini تفسیر گفت «نوع خاصی از کم‌خونی» — یعنی نفهمید.
//   با gpt-4o درست گفت ولی ۳۵ برابر گران بود، و باز هم گفت
//   «رژیم غنی از آهن» برای کم‌خونی ماکروسیتیک — که غلط است.
//
//   راه‌حل: الگو را کد تعیین کند، نه مدل.
// ============================================================

import { faName } from "./names.js";
import { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";
import { repeatDeltaFa } from "./biovar.js";
import { SURVIVAL_LIMITS, printedVerdict } from "./units.js";
import { GERIATRIC_REFS, GERIATRIC_FROM_AGE } from "./refs.js";

// ─── مرزِ «گلبولِ درشت» (ماکروسیتیک) — تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴ ───
// 🔴 پیش‌تر ۱۰۰ برای همه: مردِ ۷۶ ساله با MCV 101 در فهرستِ اعداد «طبیعی» (بازهٔ سالمندِ ۸۲–۱۰۲) و در متن «بزرگ‌تر از حد
//    معمول» می‌دید. از ۷۵ سالگی مرز همان سقفِ GERIATRIC_REFS.MCV است — عدد اینجا دوباره نوشته نمی‌شود (M91e).
export const MACRO_MCV_ABOVE = 100;
export function macroMcvCut(e) {
  return e?.age != null && e.age >= GERIATRIC_FROM_AGE ? GERIATRIC_REFS.MCV.both[1] : MACRO_MCV_ABOVE;
}

export function levelGrade(g) {
  if (!g) return 0;
  if (g.ctcaeGrade != null) return g.ctcaeGrade;
  if (g.level === 'critical') return 4;
  if (g.level === 'marked') return 3;
  if (g.level === 'moderate') return 2;
  if (g.level === 'mild') return 1;
  return 0;
}

const has = (t, ...ks) => ks.every((k) => t[k] != null);

// آیا یک تست سرولوژی (که نامش با nameRe جور است) واکنش‌گر/مثبت است؟
// مقادیر کیفی در e.qual با کلیدِ نام خام ذخیره می‌شوند.
// واژگان مثبت: reactive / واکنش‌گر / positive / مثبت / detected / پازیتیو
// واژگان منفی که باید رد شوند: non-reactive / غیرواکنش‌گر / negative / منفی
// ⚠️ نام باید مثل adapter نرمال شود. قبلاً کلیدِ خام تست می‌شد در حالی که
//    الگوها بی‌فاصله بودند (hepatitisc)، پس «Hepatitis C Antibody» جور نمی‌شد —
//    همان باگی که برای «RA factor» رخ داد و در qualPositive رفع شده بود.
// excludeRe: نامی که نباید این قاعده را فعال کند حتی اگر nameRe جور شود
//    (Anti-HBs نشانهٔ ایمنی/واکسن است، نه عفونت — نباید HBsAg تلقی شود).
function serologyReactive(e, nameRe, excludeRe) {
  if (!e.qual) return false;
  const norm = (s) => String(s).toLowerCase().replace(/[\s.\-_()/%#:]/g, "");
  return Object.entries(e.qual).some(([rawK, v]) => {
    const k = norm(rawK);
    if (excludeRe && excludeRe.test(k)) return false;
    if (!nameRe.test(k)) return false;
    const val = String(v);
    // اول منفی‌ها و نتایج نامشخص را رد کن (چون "non-reactive" شامل "reactive" است)
    if (/non[-\s]?reactive|nonreactive|غیرواکنش|negative|منفی|not\s*detected|indeterminate|equivocal|borderline|نامشخص|مرزی/i.test(val)) {
      return false;
    }
    return /reactive|واکنش|positive|مثبت|detected|پازیتیو|reactive/i.test(val);
  });
}

// ═══ کمکی‌های سرولوژی ═══
// ⚠️ urinePositive نامِ خام را تست می‌کند، پس «RA factor» با /rafactor/ جور
//    نمی‌شد و RFِ کیفی بی‌صدا می‌افتاد. اینجا نام مثل adapter نرمال می‌شود.
function qualPositive(e, nameRe) {
  if (!e.qual) return false;
  const norm = (s) => String(s).toLowerCase().replace(/[\s.\-_()/%#:]/g, "");
  return Object.entries(e.qual).some(([k, v]) => {
    if (!nameRe.test(norm(k))) return false;
    const s = String(v).trim().toLowerCase();
    if (/^(neg|negative|منفی|nil|none|no|-)$/i.test(s)) return false;
    return /pos|positive|مثبت|\+|reactive|واکنش/i.test(s);
  });
}

/** مقدارِ کیفیِ گزارش‌شده برای نمایش («3+»، «Positive») */
function qualValue(e, nameRe, fallback = "مثبت") {
  const norm = (s) => String(s).toLowerCase().replace(/[\s.\-_()/%#:]/g, "");
  const hit = Object.entries(e.qual ?? {}).find(([k]) => nameRe.test(norm(k)));
  return hit ? String(hit[1]).trim() : fallback;
}

/** تیتر → متنِ فارسی. ۰ یعنی منفی، نه «۱/۰». */
function titreFa(v) {
  if (v === 0 || (typeof v === 'string' && /^(negative|منفی)$/i.test(v.trim()))) return "منفی";
  return `1/${v}`;
}

// نام‌های کیفیِ CRP و RF (پس از نرمال‌سازی). یک‌جا تعریف می‌شوند تا بین
// الگوها drift نکنند.
const CRP_RE = /^crp$|crpqual|crplatex|creactive|سیآرپی|پروتئینواکنشی/;

// ═══ WHO — فریتین در حضورِ التهاب ═══
// فریتین واکنش‌گرِ فاز حاد است. WHO 2020 برای همین دو آستانه دارد:
//   فردِ سالم        → کمبود آهن: فریتین < ۱۵ µg/L (کودکِ زیر ۵ سال < ۱۲)
//   با عفونت/التهاب  → کمبود آهن: فریتین < ۷۰ µg/L در بزرگسال (کودک < ۳۰)
// آستانهٔ دوم بالاتر است چون التهاب عددِ فریتین را بالا می‌کشد و آستانهٔ
// معمولی در آن وضعیت، کمبودِ واقعی را رد می‌کند — کم‌خوانیِ خاموش.

/** آیا نشانهٔ التهابِ فعال روی همین برگه هست؟ (CRP کمی/کیفی یا ESR) */
function hasInflammation(e) {
  const crp = e.graded?.find((g) => g.test === "CRP_Q");
  if (crp?.abnormal && crp.dir === "high") return true;
  const esr = e.graded?.find((g) => g.test === "ESR");
  if (esr?.abnormal && esr.dir === "high") return true;
  return qualPositive(e, CRP_RE);
}

/** آستانهٔ WHO برای کمبودِ آهن، متناسب با وجودِ التهاب و سن. */
function whoFerritinThreshold(e) {
  const child = e.age != null && e.age < 5;
  if (hasInflammation(e)) return child ? 30 : 70;
  return child ? 12 : 15;
}

// ═══ specs/008 — آستانهٔ قاعده جدا از بازهٔ درجه‌بندی (N23) ═══
// بازهٔ فریتین/آهن در refs.js عوض شد (فریتینِ مرد ۱۲–۳۰۰، آهن ۵۰–۱۶۰). اگر قاعده‌ها dir را می‌خواندند، مردِ فریتینِ
// ۲۰ یافتهٔ کمبودِ آهن را از دست می‌داد و کم‌خونیِ بیماری مزمن با آهنِ ۵۰–۵۹ خاموش می‌شد — تصمیمی که کسی نگرفته.
//   مرد ۳۰ و زنِ زیرِ ۵۰ ۱۵: همان آستانهٔ پیشین، نگه‌داشته.
//   زنِ ≥۵۰ ساله ۳۰: تغییرِ عمدی (clarify ۱۴۰۵/۰۷/۰۱) — برچسبِ «پایین» و یافته یکی می‌شوند.
//   🔴 بازبینیِ پزشکی B3: جنسِ نامعلوم همان ردیفِ refs.js ferritinRef را می‌گیرد (غیرِمرد ⇒ ردیفِ زن)، وگرنه
//      «۵۵ ساله، بی‌جنس، فریتین ۲۰» برچسبِ «پایین» می‌گرفت و کم‌خونیِ بیماری مزمن «ذخیره آهن پایین نیست» می‌گفت.
function ferritinIdCut(e) {
  if (e.sex === "M") return 30;
  if (e.age != null && e.age >= 50) return 30;
  return 15;
}
const IRON_ACD_LOW_UGDL = 60; // نگه‌داشته — کفِ پیشینِ بازهٔ آهن (specs/008)
// ⚠️ زیرِ ۱۶ سال بازه از PED_REFS است و specs/008 به آن دست نزد؛ آنجا همان dir (رفتارِ پیشین) حاکم است،
//    وگرنه کودکی با فریتینِ ۲۰ (طبیعیِ RCPCH ۱۲–۲۰۰) ناگهان «کمبودِ آهن» می‌گرفت.
const isPedAge = (e) => e.age != null && e.age < 16;
function ferritinBelowIdCut(e) {
  const f = e.graded?.find((g) => g.test === "FERRITIN");
  if (!f || f.value == null) return false;
  if (isPedAge(e)) return !!(f.abnormal && f.dir === "low");
  return f.value < ferritinIdCut(e);
}
function ironLowForAcd(e) {
  const i = e.graded?.find((g) => g.test === "IRON");
  if (!i || i.value == null) return false;
  if (isPedAge(e)) return !!(i.abnormal && i.dir === "low");
  return i.value < IRON_ACD_LOW_UGDL;
}

// ═══ specs/008 Q3 + clarify — HbA2 ═══
// «آیا مالکِ تالاسمی فعال است» (thalOwnerFires) در patterns_hematology.js است و خودِ matchِ قاعده‌ها را می‌پرسد.
// hba2State فقط بالا را برمی‌گرداند (hba2_elevated همین را می‌خواهد):
//   >۱۲ «very_high» — بالاتر از صفتِ بتا (مرجع: ۳.۸ تا ۷–۱۲)؛ اغلب HbE/لپور هم‌جا اندازه می‌شود (بازبینیِ پزشکی، یادداشت ۱)
//   >۳.۸ «trait» · ۳.۵ تا ۳.۸ «borderline» (بی‌ادعا) · بقیه null.
// ۳.۸ و ۱۲ از مرجعِ چسبانده‌شده‌اند (تأییدِ کاربر ۱۴۰۵/۰۷/۰۱)؛ سقفِ ۳.۵ از بازهٔ خودِ ردیف (refs.js) خوانده می‌شود.
const HBA2_TRAIT_ABOVE = 3.8;
// P53 پرسش ۱۲ و ۱۵ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴: «بر اساسِ گایدلاین»): BSH 2023 (Significant haemoglobinopathies؛ از خلاصهٔ جست‌وجو، متنِ کامل 403)
//   — HbA2ِ ظاهراً ≥۸٪ روی HPLC ⇒ هموگلوبین لپور مطرح؛ >۱۵٪ ⇒ صفتِ HbE (هم‌جا با HbA2). پیش‌تر ۱۲ (مرجعِ چسبانده‌شده)،
//   و ۸ تا ۱۲ «صفتِ بتا» خوانده می‌شد که برای صفتِ بتا نامعمول است.
const HBA2_BEYOND_TRAIT_FROM = 8;
const HBA2_HBE_ABOVE = 15;
const hba2Row = (e) => e.graded?.find((x) => x.test === "HBA2" && x.value != null);
function hba2State(e) {
  const g = hba2Row(e);
  if (!g || !(g.abnormal && g.dir === "high")) return null;
  return g.value >= HBA2_BEYOND_TRAIT_FROM ? "very_high" : g.value > HBA2_TRAIT_ABOVE ? "trait" : "borderline";
}
// 🔴 بازبینیِ کد #۶: هر ردیفِ الکتروفورز (HbA2/HbF/HbA) یعنی الکتروفورز انجام شده — درخواستِ دوباره نه (N8).
const hba2Measured = (e) => !!e.graded?.some((x) => ["HBA2", "HBF"].includes(x.test)) ||
  !!e.noRef?.some((k) => ["HBA", "HBA2", "HBF", "HBS", "HBC", "HBE"].includes(k));
// جملهٔ HbA2. owner=true (یافته‌های مالکِ تالاسمی): HbA2ِ طبیعی و پایین هم جمله دارند (بازبینیِ کد #۳، N21) —
// «صفتِ تالاسمی محتمل‌تر است» کنارِ HbA2ِ طبیعیِ همان برگه بی‌حرف نمی‌ماند.
function hba2Clause(e, { idaBranch = false, owner = false } = {}) {
  const g = hba2Row(e);
  if (!g) return "";
  const v = g.value;
  const st = hba2State(e);
  if (!st) {
    if (!owner) return "";
    if (g.abnormal && g.dir === "low") {
      return ` هموگلوبین A2 شما ${v}٪ و کمتر از حدِ طبیعی (${g.range}) است؛ این بیشتر در کمبودِ آهن یا صفتِ تالاسمیِ آلفا ` +
        "دیده می‌شود تا صفتِ تالاسمیِ بتا.";
    }
    return ` هموگلوبین A2 شما ${v}٪ و در محدودهٔ طبیعی (${g.range}) است؛ این صفتِ تالاسمیِ بتا را کمتر محتمل می‌کند، ` +
      "ولی صفتِ تالاسمیِ آلفا را رد نمی‌کند، و کمبودِ هم‌زمانِ آهن هم می‌تواند HbA2 را پایین‌تر نشان دهد.";
  }
  if (st === "borderline") {
    return ` هموگلوبین A2 شما ${v}٪ است؛ کمی بالاتر از محدودهٔ طبیعی (${g.range}) و در ناحیهٔ مرزی — ` +
      "از این عدد به‌تنهایی نمی‌شود دربارهٔ ناقل بودنِ تالاسمی نتیجه گرفت و پزشک باید آن را کنارِ شمارشِ خون تفسیر کند.";
  }
  if (st === "very_high") {
    return ` هموگلوبین A2 شما ${v}٪ است، که از حدی که معمولاً در «صفتِ تالاسمیِ بتا» دیده می‌شود (کمتر از ۸٪) بالاتر است؛ ` +
      (v > HBA2_HBE_ABOVE
        ? "در این مقدار معمولاً هموگلوبین E هم‌جای HbA2 اندازه‌گیری می‌شود (صفتِ HbE). "
        : "در این مقدار ممکن است یک هموگلوبینِ دیگر (مثلاً هموگلوبین لپور) هم‌جای HbA2 اندازه‌گیری شده باشد. ") +
      "پزشک باید نتیجهٔ کاملِ الکتروفورز را ببیند و گاهی روشِ دومی لازم است.";
  }
  return ` هموگلوبین A2 شما ${v}٪ است که از ۳.۸ بالاتر است؛ این مقدار معمولاً با «صفتِ تالاسمیِ بتا» ` +
    "(ناقل بودن، نه بیماری) می‌خواند." +
    (idaBranch
      ? " کمبودِ آهن و صفتِ تالاسمی می‌توانند هم‌زمان باشند (و کمبودِ آهن HbA2 را کمی پایین می‌آورد)؛ پزشک باید هر دو را کنارِ هم بسنجد."
      : "");
}

// ═══ P53 پرسش ۱۴ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴: «بر اساسِ گایدلاین‌ها») — فریتین کنارِ گلبولِ کوچک ═══
// زیرِ آستانهٔ کمبود ⇒ iron_deficiency_panel مالک است. بالای آن، بزرگسال:
//   بی‌التهاب: <۴۵ خنثی («رد نمی‌کند»)؛ ≥۴۵ «کم‌احتمال‌تر».
//   با التهاب: <۱۰۰ خنثی (زیرِ ۷۰ WHO، پرسش ۳، مالکش iron_deficiency_panel است)؛ ≥۱۰۰ «کم‌احتمال‌تر».
//   ⚠️ ۴۵/۱۰۰ پیشنهادِ بازبینِ دور ۳ است (با ارجاع به Guyatt)؛ AGA 2020 و Guyatt 1992 باز نشدند — منبعِ خوانده‌شده ادعا نمی‌شود.
// زیرِ ۱۶ سال: رفتارِ پیشین — داخلِ بازه خنثی، بالاتر از بازه «کم‌احتمال‌تر».
const FERRITIN_ID_UNLIKELY_FROM = 45;
const FERRITIN_ID_UNLIKELY_INFLAM_FROM = 100;
/** جملهٔ فریتینِ روی برگه برای یافته‌های گلبولِ کوچک. state: low | masked | neutral | unlikely | high؛ null اگر فریتین نیست. */
function ferritinMicroClause(e) {
  const f = e.graded?.find((g) => g.test === "FERRITIN");
  if (!f || f.value == null) return null;
  const inflam = hasInflammation(e);
  if (ferritinBelowIdCut(e)) {
    return { state: "low", text: `فریتینِ همین برگه ${f.value} است (حد طبیعی ${f.range}) که زیرِ حدِ کمبودِ آهن است و کمبودِ آهن را تأیید می‌کند` };
  }
  if (whoInflamIronDeficiency(e)) {
    return { state: "masked", text: `فریتینِ همین برگه ${f.value} است؛ با التهابی که نشانه‌اش در همین برگه هست، این مقدار کمبودِ آهن را رد نمی‌کند` };
  }
  if (f.abnormal && f.dir === "high") {
    return { state: "high", text: `فریتینِ همین برگه ${f.value} است که بالاتر از حد طبیعی (${f.range}) است؛ این کمبودِ آهن را کم‌احتمال‌تر می‌کند، ولی فریتینِ بالا خودش (مثلاً در التهاب یا بیماریِ کبد) باید با پزشک بررسی شود` };
  }
  const unlikelyFrom = isPedAge(e) ? null : inflam ? FERRITIN_ID_UNLIKELY_INFLAM_FROM : FERRITIN_ID_UNLIKELY_FROM;
  if (unlikelyFrom != null && f.value >= unlikelyFrom) {
    return { state: "unlikely", text: `فریتینِ همین برگه ${f.value} است (حد طبیعی ${f.range})؛ این مقدار کمبودِ آهن را کم‌احتمال‌تر می‌کند` +
      (inflam ? " (با وجودِ التهابی که نشانه‌اش در همین برگه هست)" : "") };
  }
  return { state: "neutral", text: `فریتینِ همین برگه ${f.value} است (حد طبیعی ${f.range})؛ این مقدار کمبودِ آهن را رد نمی‌کند، و پزشک آن را کنارِ اندازهٔ گلبول‌ها می‌سنجد` +
    (inflam ? " (التهاب — که نشانه‌اش در همین برگه هست — فریتین را بالا می‌برد و می‌تواند کمبودِ آهن را بپوشاند)" : "") };
}

// ═══ P53 پرسش ۴ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴): sTfR/log فریتین و ZPP تفسیر می‌شوند ═══
// عددها همان پیشنهادِ مرجعِ چسبانده‌شده است (SPECS008_SOURCE، منبعِ اصلی نامعلوم): نسبتِ sTfR/log₁₀(فریتین) >۲ ⇒
// کمبودِ آهن (حتی با التهاب)؛ ZPP >۱۰۰ µmol/mol heme ⇒ ساختِ گلبول با آهنِ ناکافی (کمبودِ آهن یا سرب).
// ⚠️ فقط با واحدِ چاپ‌شده (N3): sTfR با mg/L (= µg/mL) — کیت‌های nmol/L عددِ دیگری دارند؛ ZPP با µmol/mol — ZPPِ
//    µg/dL ِ خونِ کامل مقیاسِ دیگری است. بی‌واحد یا واحدِ دیگر ⇒ مثلِ پیش در «تفسیر نشدند».
const STFR_INDEX_ID_ABOVE = 2;
const ZPP_HIGH_ABOVE = 100;
const STFR_UNIT_RE = /^\s*(mg\s*\/\s*l|[µu]g\s*\/\s*ml|mcg\s*\/\s*ml)\s*$/i;
const ZPP_UNIT_RE = /[µu]mol\s*\/\s*mol|micromol\s*\/\s*mol/i;
/** {value, stfr, ferritin} یا null. */
function stfrIndex(e) {
  const s = e.ungraded?.STFR;
  const f = e.graded?.find((g) => g.test === "FERRITIN");
  if (!s || s.value == null || !STFR_UNIT_RE.test(String(s.unit ?? ""))) return null;
  if (!f || f.value == null || !(Number(f.value) > 1)) return null;
  return { value: +(Number(s.value) / Math.log10(Number(f.value))).toFixed(2), stfr: s.value, ferritin: f.value };
}
const stfrIndexHigh = (e) => (stfrIndex(e)?.value ?? 0) > STFR_INDEX_ID_ABOVE;
/** "high" | "unjudged" (واحد درست، ≤۱۰۰) | null (نیست یا واحدش خوانده نشد). */
function zppState(e) {
  const z = e.ungraded?.ZPP;
  if (!z || z.value == null || !ZPP_UNIT_RE.test(String(z.unit ?? ""))) return null;
  return Number(z.value) > ZPP_HIGH_ABOVE ? "high" : "unjudged";
}

// ═══ P53 پرسش ۶ (تصمیمِ کاربر ۲۰۲۶-۰۹-۲۴): HbS/HbC/HbE — صفت یا بیماری ═══
// ASH 2021 (Hemoglobin Electrophoresis in SCD: a primer — باز شد) و BSH 2023 (خلاصهٔ جست‌وجو): در صفت HbA بیشتر از واریانت است (AS حدودِ ۶۰:۴۰)؛
// در بیماری (SS بیش از ۹۰٪، S/β+ بیش از ۶۰٪، S/β0 بیش از ۸۰٪، SC حدودِ ۵۰:۵۰) HbA کمتر است یا نیست.
//   ⇒ «صفت»: واریانت <۵۰٪ و (HbA روی برگه نیست یا بیشتر از واریانت است).
//   ⇒ «بیماریِ احتمالی»: واریانت ≥۵۰٪، یا HbA ≤ واریانت، یا دو واریانت هر کدام ≥۱۵٪ (مثلِ SC).
const HB_VARIANT_TRAIT_BELOW = 50;
const HB_VARIANT_COMPOUND_MIN = 15;
const HB_VARIANT_FA = { HBS: "هموگلوبین S (داسی)", HBC: "هموگلوبین C", HBE: "هموگلوبین E" };
/** { state: "trait" | "disease", variants: [{key, value}], hba } یا null. */
function hbVariantState(e) {
  const variants = ["HBS", "HBC", "HBE"]
    .map((key) => ({ key, value: Number(e.ungraded?.[key]?.value) }))
    .filter((x) => Number.isFinite(x.value) && x.value > 0);
  if (!variants.length) return null;
  const hbaRaw = e.ungraded?.HBA?.value;
  const hba = hbaRaw != null && Number.isFinite(Number(hbaRaw)) ? Number(hbaRaw) : null;
  const compound = variants.filter((x) => x.value >= HB_VARIANT_COMPOUND_MIN).length >= 2;
  const disease = compound || variants.some((x) => x.value >= HB_VARIANT_TRAIT_BELOW || (hba != null && hba <= x.value));
  return { state: disease ? "disease" : "trait", variants, hba, compound };
}

/** فریتینِ «طبیعیِ» آزمایشگاه که با معیارِ التهابیِ WHO کمبود است. */
function whoInflamIronDeficiency(e) {
  const f = e.graded?.find((g) => g.test === "FERRITIN");
  if (!f || f.value == null) return false;
  if (!hasInflammation(e)) return false;
  return f.value < whoFerritinThreshold(e);
}
const RF_RE  = /^rf$|rheumatoid|rafactor|ralatex|rflatex|فاکتورروماتوئید|فاکتورروماتیسمی|رومافاکتور|آرافاکتور/;

// ═══ کمکی‌های ادرار ═══
// مقادیر ادراری در e.qual با کلید نام خام ذخیره می‌شوند.
// مقدار می‌تواند باشد: negative/trace/+1/+2/+3، positive/مثبت، یا عدد/بازه («۵-۱۰»).

// ═══ سیلندر (cast) — نوعی دیگر از ردیفِ ادرار، نه سلولِ آزاد (specs/005، N25) ═══
// 🔴 باگِ واقعی روی 395a5d7: «RBC Casts 5-8 /lpf» با کلیدِ «Urine RBC Casts» در qual می‌نشست و
//    هر جست‌وجوی /rbc/ آن را شمارشِ گلبولِ قرمزِ *آزاد* می‌خواند ⇒ hematuria («خون در ادرار»)؛
//    «Leukocyte Casts» هم نوارِ استراز را مثبت می‌کرد و هم شمارشِ WBC را ⇒ uti_likely.
//    سیلندر یعنی منشأ از *درونِ کلیه* — خواندنش به‌جای سلولِ آزاد، کم‌خوانی است.
// اصلاح عمداً در این کمکی‌هاست، نه در هشت محلِ فراخوانی: هر قاعدهٔ تازه‌ای هم که فردا /rbc/ بجوید ارث می‌برد.
// «کست» فقط به‌صورتِ واژهٔ جدا — «شکست» نباید جور شود.
// ⚠️ بازبینی #۸: «کست‌ گلبول قرمز» با نیم‌فاصله، «کستِ …» با کسره و «کست‌ها» هم سیلندرند (M169h).
const CAST_KEY_RE = /\bcasts?\b|cylind|سیلندر|(^|[\s‌])کست(?=$|[\s‌ِ]|ها)/i;
function isCastKey(key) {
  return CAST_KEY_RE.test(String(key));
}
// نوارِ استراز شمارشِ سلول نیست. /leukocyt/ در عبارتِ شمارشِ WBC ردیفِ «Leukocyte Esterase» را هم
// می‌گرفت و «+1» را «۱ گلبول در میدان» می‌خواند — و ردیفِ اول برنده بود (M164e).
const PAD_ROW_RE = /esterase|استراز/i;

// نوعِ سیلندر، به ترتیبِ اختصاصیتِ بالینی (data-model §3): هرچه جای مشکل در کلیه را دقیق‌تر بگوید، بالاتر.
// «hyaline» عمداً آخر است: برگه‌ای که فقط «Casts» می‌نویسد معمولاً همین را منظور دارد.
const CAST_TYPES = [
  ["rbc", /rbc|red\s*(blood\s*)?cell|erythrocyt|گلبول\s*قرمز/i],
  ["wbc", /wbc|white\s*(blood\s*)?cell|leukocyt|pus|گلبول\s*سفید/i],
  ["tubular", /epithelial|tubular|\brte\b|اپی\s*تلیال|اپیتلیال|توبولار/i],
  ["waxy_broad", /waxy|broad|مومی|پهن/i],
  ["fatty", /fatty|\bfat\b|lipid|چرب/i],
  ["granular", /granular|گرانول/i],
  ["hyaline", /hyalin|هیالن|هیالین/i],
];
/** نوعِ سیلندرِ یک ردیف، اول از نام و بعد از مقدار («Casts: Hyaline, few»)؛ ناشناخته ⇒ null. */
function castTypeOf(key, value) {
  for (const src of [String(key), String(value ?? "")]) {
    for (const [type, re] of CAST_TYPES) if (re.test(src)) return type;
  }
  return null;
}
/** همهٔ نوع‌هایی که یک متن نام می‌برد — «Hyaline 0-1, RBC cast 0» دو نوع است، نه یکی. */
function castTypesIn(text) {
  const s = String(text ?? "");
  return new Set(CAST_TYPES.filter(([, re]) => re.test(s)).map(([t]) => t));
}

/**
 * مقدارِ یک ردیفِ سیلندر: "absent" | "present" | "unknown" (بازبینی #۱، B1).
 * 🔴 نسخهٔ اول فقط فهرستِ کوتاهی از منفی‌ها را می‌شناخت و هر متنِ بی‌عددِ دیگر را «حاضر» می‌گرفت ⇒
 *    «RBC Casts: Absent» / «مشاهده نشد» / «Nil seen» ⇒ urine_cast_rbc «این هفته» روی برگهٔ طبیعی.
 * N6: نتیجهٔ کیفی مجموعه‌ای بسته از واژه‌هاست؛ ردکردنِ منفی‌ها اول، فهرست را هرگز نمی‌بندد. پس «حاضر»
 * فقط عددِ مثبت یا واژه‌ای از فهرستِ *حضور* است، و هرچه نه این باشد نه منفیِ شناخته، «نامعلوم» است و
 * آداپتر آن را به «تفسیر نشدند» می‌فرستد — نه به یافته.
 * نفی پیش از حضور سنجیده می‌شود: «Nil seen» و «not seen» و «ندارد» هر سه واژهٔ حضور را در خود دارند.
 */
const EQUIVOCAL_RE = /^(\+\s*\/\s*-|-\s*\/\s*\+|±|equivocal|borderline|مشکوک|بینابینی)$/i;
const CAST_ABSENT_RE = /\b(neg(ative)?|nil+|none|absent|no|not\s*(seen|found|detected|observed))\b|-ve\b|^-+$|منفی|دیده\s*نشد|مشاهده\s*نشد|یافت\s*نشد|ندارد|وجود\s*ندارد/i;
const CAST_PRESENT_RE = /\b(rare|few|occasional|many|moderate|numerous|present|seen|positive|plenty|full\s*field|loaded)\b|\+|نادر|اندک|کم|گاه|زیاد|فراوان|متوسط|انبوه|مثبت|دیده\s*شد|مشاهده\s*شد|دارد/i;
function castValueState(value) {
  const s = String(value ?? "").trim().replace(/[.,;:،؛]+$/, "").trim();
  if (!s) return "unknown";
  if (/^<|کمتر|less\s*than/i.test(s)) return "absent";   // «<1»، «کمتر از ۱» — زیرِ حدِ شمارش، مثلِ urineCellCount
  // «+/-» و «±» مبهم‌اند، نه حاضر: «+/-» شاملِ «+» است و فهرستِ حضور آن را می‌گرفت (N6، بازبینیِ specs/006 #۲).
  if (EQUIVOCAL_RE.test(s)) return "unknown";
  if (CAST_ABSENT_RE.test(s)) return "absent";
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(parseFloat);
  if (nums.length) return Math.max(...nums) > 0 ? "present" : "absent";   // «0-0» غایب، «0-1» حاضر (مرجع ۰)
  return CAST_PRESENT_RE.test(s) ? "present" : "unknown";
}
/**
 * سرنوشتِ یک ردیفِ سیلندر در آداپتر: "qual" یا "unmapped" (V6، بازبینی #۵ و #۷).
 * - ردیفِ بی‌نوع که مقدارش چند نوع را نام می‌برد («Hyaline 0-1, RBC cast 0») ⇒ unmapped؛ شمارشِ هر نوع
 *   از هم جدا نمی‌شود و بیشینهٔ کل به اختصاصی‌ترین نوع نسبت داده می‌شد.
 * - مقدارِ نامعلوم ⇒ unmapped. منفی ⇒ qual، حتی بی‌نوع («Casts: Not seen» نبودِ همه است، مبهم نیست).
 * - حاضر و بی‌نوع («Casts: few») ⇒ unmapped.
 */
function castRoute(name, value) {
  const nameType = castTypeOf(name, "");
  const valueTypes = castTypesIn(value);
  if (!nameType && valueTypes.size > 1) return "unmapped";
  const st = castValueState(value);
  if (st === "unknown") return "unmapped";
  if (st === "absent") return "qual";
  return nameType || valueTypes.size === 1 ? "qual" : "unmapped";
}

/**
 * وضعیتِ یک شمارشِ سلولیِ ادرار نسبت به حدِ بالای طبیعی: "absent" | "low" | "high" | "unknown".
 * 🔴 بازبینی #۲: urineCellCount برای مقدارِ بی‌عدد null می‌دهد، و شاخه‌های تازه null را «ردیف روی برگه نیست»
 *    می‌خواندند ⇒ «Blood +3 · RBC: Many» ⇒ «شمارشِ میکروسکوپی روی این برگه نیست» دربارهٔ ردیفی که چاپ شده بود،
 *    و «LE +2 · WBC: Many» ⇒ «نشانهٔ عفونت نیست». «نیست» فقط وقتی گفته می‌شود که ردیف واقعاً نیست (N4).
 * همان کنارگذاشتن‌های urineCellCount را دارد (سیلندر، نوارِ استراز).
 */
const CELL_HIGH_RE = /many|numerous|moderate|full|loaded|plenty|packed|tntc|فراوان|زیاد|انبوه|متوسط|(^|\s)پر(\s|$)/i;
const CELL_LOW_RE = /^(neg|negative|nil|none|no|rare|few|occasional|منفی|نادر|کم|اندک)$|not\s*seen|دیده\s*نشد|مشاهده\s*نشد/i;
function urineCellState(e, nameRe, upper) {
  for (const [k, v] of Object.entries(e?.qual || {})) {
    if (isCastKey(k) || PAD_ROW_RE.test(k) || !nameRe.test(k)) continue;
    const s = String(v).trim().replace(/[.,;:،؛]+$/, "").trim();
    if (/^<|کمتر|less\s*than/i.test(s)) return "low";
    const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(parseFloat);
    if (nums.length) return Math.max(...nums) > upper ? "high" : "low";
    if (CELL_LOW_RE.test(s)) return "low";
    if (CELL_HIGH_RE.test(s)) return "high";
    return "unknown";
  }
  return "absent";
}
/** همهٔ ردیف‌های سیلندرِ برگه — همان‌هایی که کمکی‌های زیر کنار می‌گذارند.
 *  ⚠️ اصلِ چهارم: محافظی که داده را رد می‌کند باید بشمارد چه رد کرد. این فهرست همان شمارش است و
 *  M165g شرط می‌کند هر ردیفش را castAxis مصرف کرده باشد — ردیفی که هم کنار گذاشته شود و هم خوانده نشود،
 *  باید آزمون را قرمز کند، نه بی‌صدا گم شود. */
function castRows(e) {
  return Object.entries(e?.qual || {}).filter(([k]) => isCastKey(k));
}

// حدِ بالای طبیعیِ سیلندرِ هیالن — Henry فصل ۲۹ (۰–۲ در میدانِ کم‌بزرگ‌نمایی). ⚠️ در انتظارِ بازبین: P50.
const HYALINE_CAST_UPPER_LPF = 2;
const CAST_MANY_RE = /many|moderate|numerous|زیاد|فراوان|متوسط|\+{2,}/i;
const CAST_LABEL = {
  rbc: "rbc_cast", wbc: "wbc_cast", tubular: "tubular_cast", waxy_broad: "waxy_or_broad_cast",
  fatty: "fatty_cast", granular: "granular_cast",
};
/** نامِ فارسیِ هر نوع — برای جملهٔ «سیلندرهای دیگرِ همین برگه» (B4). */
const CAST_FA = {
  rbc: "گلبولِ قرمز", wbc: "گلبولِ سفید", tubular: "سلول‌های اپی‌تلیالِ کلیه", waxy_broad: "مومی یا پهن",
  fatty: "چربی", granular: "گرانولار",
};
/**
 * محورِ سیلندر: یک برچسب برای کلِ برگه، یا null (data-model §3؛ شکلِ mineralAxis).
 * دو *یافتهٔ* سیلندر روی یک گزارش ناممکن است، نه چون matchها با دقت نوشته شده‌اند، بلکه چون این تابع
 * یک برچسب برمی‌گرداند. read = هر ردیفی که *قضاوت* شد — منفی و هیالنِ طبیعی هم.
 * others = نوع‌های بیماری‌زای حاضرِ دیگر (هیالن نه): 🔴 بازبینیِ پزشکی B4 — «RBC Casts · Waxy Casts» فقط
 *   یافتهٔ گلبولِ قرمز می‌داد و سیلندرِ مومی هیچ‌جا نبود؛ و چون «خوانده» شده بود به «تفسیر نشدند» هم نمی‌رفت
 *   (N18). یافتهٔ برنده نامِ این‌ها را می‌برد (othersSentence).
 */
function castAxis(e) {
  const read = [];
  const present = new Map();   // نوع → بیشینهٔ شمارش؛ Infinity = حاضر با مقدارِ توصیفی
  for (const [k, v] of castRows(e)) {
    read.push(k);
    if (castValueState(v) !== "present") continue;         // منفی = غایب (V5)؛ نامعلوم را آداپتر نگه نمی‌دارد
    const type = castTypeOf(k, v);
    if (!type) continue;                                    // بی‌نوعِ منفی («Casts: Not seen»)
    const s = String(v ?? "");
    const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(parseFloat);
    let n = nums.length ? Math.max(...nums) : Infinity;     // «۵-۸» ⇒ سقفِ بازه، مثلِ urineCellCount
    // هیالنِ توصیفی: «few/rare» طبیعی است، «many/moderate» نه.
    if (type === "hyaline" && !nums.length) n = CAST_MANY_RE.test(s) ? Infinity : 0;
    present.set(type, Math.max(present.get(type) ?? 0, n));
  }
  const types = [...present.keys()];
  for (const [type] of CAST_TYPES) {
    if (!present.has(type)) continue;
    if (type === "hyaline") {
      return { label: present.get(type) > HYALINE_CAST_UPPER_LPF ? "hyaline_cast_raised" : "hyaline_cast_normal", read, types, others: [] };
    }
    const others = types.filter((t) => t !== type && t !== "hyaline");
    return { label: CAST_LABEL[type], read, types, others };
  }
  return { label: null, read, types, others: [] };
}
/** جملهٔ «سیلندرهای دیگرِ همین برگه» — با یک پیشوندِ فاصله؛ اگر چیزی نیست، رشتهٔ خالی (B4). */
function othersSentence(e) {
  const o = castAxis(e).others.map((t) => CAST_FA[t]);
  if (!o.length) return "";
  const list = o.length === 1 ? `سیلندرِ ${o[0]}` : `سیلندرهای ${o.slice(0, -1).join("، ")} و ${o[o.length - 1]}`;
  return ` در همین برگه ${list} هم گزارش شده است؛ پزشک همه را کنارِ هم می‌خواند.`;
}

// آیا یک تست ادراری (نامش با nameRe جور است) «مثبت/غیرطبیعی» است؟
// negative/trace/منفی را رد می‌کند. +1 به بالا یا positive/مثبت را می‌گیرد.
function urinePositive(e, nameRe, { traceCounts = false } = {}) {
  if (!e.qual) return false;
  return Object.entries(e.qual).some(([k, v]) => {
    if (isCastKey(k)) return false;   // سیلندر نوار نیست (N25، M164c)
    if (!nameRe.test(k)) return false;
    const s = String(v).trim().toLowerCase();
    // منفی صریح
    if (/^(neg|negative|منفی|nil|none|no|clear|-)$/i.test(s)) return false;
    // trace: بسته به تنظیم
    if (/trace|کم|رگه/i.test(s)) return traceCounts;
    // مثبت صریح یا +1..+4 یا ≥1
    if (/pos|positive|مثبت|\+/i.test(s)) return true;
    // مقادیر نیمه‌کمی توصیفی: many/moderate/زیاد/متوسط/numerous
    if (/many|moderate|numerous|زیاد|فراوان|متوسط|زياد/i.test(s)) return true;
    // مقادیر نواری خون/دیگر: small/large/زیاد (Trace قبلاً بررسی شده)
    if (/small|large|بزرگ|کوچک/i.test(s)) return true;
    // عدد (مثل شمارش سلولی) — بزرگ‌تر از صفر یعنی حضور دارد
    const num = parseFloat(s.replace(/[^\d.]/g, ""));
    return Number.isFinite(num) && num > 0;
  });
}

// حداقلِ یک شمارش سلولی ادراری (مثل WBC/HPF = «۵-۱۰»).
// برای بازه، سقف بازه را برمی‌گرداند (محتاطانه‌تر: «۵-۱۰» یعنی تا ۱۰).
// مقدار با «<» (مثل «<5») را کمتر از آستانه در نظر می‌گیرد و صفر برمی‌گرداند.
function urineCellCount(e, nameRe) {
  if (!e.qual) return null;
  for (const [k, v] of Object.entries(e.qual)) {
    if (isCastKey(k)) continue;       // سیلندر سلولِ آزاد نیست (N25، M164)
    if (PAD_ROW_RE.test(k)) continue; // نوارِ استراز شمارشِ سلول نیست (M164e)
    if (!nameRe.test(k)) continue;
    const s = String(v).trim();
    // «<5» یا «کمتر از ۵» → زیر آستانه، صفر برگردان
    if (/^<|کمتر|less\s*than|<\s*\d/i.test(s)) return 0;
    // همه‌ی اعداد را بگیر و بزرگ‌ترین (سقف بازه) را برگردان
    const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(parseFloat);
    if (nums.length) return Math.max(...nums);
  }
  return null;
}

// شدت یک تست نیمه‌کمی ادرار را برمی‌گرداند:
//   0=منفی، 0.5=trace، 1=+1، 2=+2، 3=+3، 4=+4. اگر تست نبود null.
// معادل‌های توصیفی: many/زیاد→3، moderate/متوسط→2، few/کم→1.
function urineGrade(e, nameRe) {
  if (!e.qual) return null;
  for (const [k, v] of Object.entries(e.qual)) {
    if (isCastKey(k)) continue;       // سیلندر نوار نیست (N25)
    if (!nameRe.test(k)) continue;
    const s = String(v).trim().toLowerCase();
    if (/^(neg|negative|منفی|nil|none|no|clear|-)$/i.test(s)) return 0;
    if (/trace|رگه|کم‌رنگ/i.test(s)) return 0.5;
    // تعداد علامت + (مثل +2 یا ++)
    const plusCount = (s.match(/\+/g) || []).length;
    if (plusCount > 0) {
      // «+2» → عدد ۲؛ «++» → شمارش
      const numMatch = s.match(/\+\s*(\d)/) || s.match(/(\d)\s*\+/);
      if (numMatch) return Math.min(4, parseInt(numMatch[1], 10));
      return Math.min(4, plusCount);
    }
    // عدد تنها (مثل «۳»)
    const n = parseInt(s.replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n) && /^\d/.test(s.replace(/[^\d]/g, ""))) return Math.min(4, n);
    // توصیفی
    if (/many|numerous|زیاد|فراوان|high|large|بزرگ/i.test(s)) return 3;
    if (/moderate|متوسط/i.test(s)) return 2;
    if (/few|کم|اندک|low|small|کوچک/i.test(s)) return 1;
    if (/pos|positive|مثبت/i.test(s)) return 2;  // «مثبت» بدون درجه → متوسط فرض
  }
  return null;
}

/**
 * آستانهٔ «آلبومینِ پایین» برای قاعده‌های چندنشانه‌ای — g/dL.
 *
 * ⚠️ این عددْ بازهٔ مرجع **نیست** و عمداً از آن جدا است. تا ۱۹ مرداد ۱۴۰۵
 *    حدِ پایینِ `ADULT_REFS.ALB` همین ۳.۵ بود، و `isNephrotic` و
 *    `cirrhosis_pattern` هر دو با `abnormal && dir === "low"` نوشته شده بودند —
 *    یعنی بدونِ اینکه کسی تصمیم بگیرد، آستانهٔ بالینی‌شان به بازهٔ مرجع گره خورده بود.
 *
 *    وقتی بازهٔ مرجع به منبعِ هنری (۳.۹–۵.۱) رفت، هر دو قاعده **بی‌سروصدا شل شدند**:
 *    اندازه‌گیری‌شده، نه حدس‌زده — `ALB 3.7 + PLT 120 + BILI_T 1.5` که دیروز
 *    ۲ نشانه بود و ساکت، امروز ۳ نشانه می‌شد و `chronic_liver_disease_pattern`
 *    می‌داد؛ و `پروتئینِ ادرار 3+ با ALB 3.7` که نفروتیک نبود، نفروتیک می‌شد.
 *    هیچ‌کدام تصمیمِ بازبین نبود؛ عارضهٔ جانبیِ یک تغییرِ بازهٔ مرجع بود.
 *
 *    پس رفتارِ پیشین حفظ شد. این «هلد-د-لاین» است، نه آستانهٔ بالینیِ تازه:
 *    هیچ ادعای جدیدی نمی‌کند و منبعِ تازه‌ای هم لازم ندارد. اگر بازبین تصمیم
 *    بگیرد که آلبومینِ ۳.۵–۳.۸ باید نشانهٔ سیروز/نفروتیک به حساب بیاید، همین
 *    یک عدد را بردارید — رجوع به MEDICAL_RULES.md بندِ P44-ج. گاردها: M94f، M94h.
 *
 *    درسِ عمومی (کلاسِ N22 از سمتِ مقابل): بازهٔ مرجع به «آیا این عدد برای یک
 *    بزرگسالِ عادی غیرمعمول است؟» جواب می‌دهد. آستانهٔ عضویت در یک الگوی
 *    چندنشانه‌ای سؤالِ دیگری است. هر جا قاعده‌ای `dir === "low"` را به‌عنوانِ
 *    نشانهٔ یک تشخیصِ سنگین می‌شمارد، آن قاعده به بازهٔ مرجع وابسته است و
 *    اولین تغییرِ بازه شلش می‌کند.
 */
const ALB_LOW_MARKER_GDL = 3.5;

/** آیا آلبومین به‌قدرِ نشانه‌بودن در یک الگوی چندنشانه‌ای پایین است؟ */
function albLowMarker(e) {
  const alb = e.graded.find((g) => g.test === "ALB");
  if (!alb || alb.value == null) return false;
  // جهت از graded.dir می‌آید، نه از مقایسه با آستانه — N12. آستانه فقط شدت را می‌بُرد.
  return alb.abnormal && alb.dir === "low" && alb.value < ALB_LOW_MARKER_GDL;
}

/*
 * ── مالکیتِ اورژانسِ آمیلاز و بیلی‌روبین ─────────────────────────────────
 *
 * 🔴 باگِ واقعی (اندازه‌گیری‌شده، ۲۰۲۶-۰۹-۱۷، کلاسِ N20): دو قاعدهٔ اورژانسی در
 *    patterns_biochem_new.js با دو الگوی قدیمی‌ترِ patterns_biochem.js روی
 *    عددِ یکسان هم‌زمان فعال می‌شدند و هیچ‌کدام `blocks_others` نداشت، پس
 *    منطقِ سرکوب هرگز درگیر نمی‌شد. بیمارِ آمیلاز ۸۰۰ هم‌زمان می‌خواند:
 *      «فوراً به بخش اورژانس مراجعه کنید.»  و  «نوبت عادی، مگر علامت خاصی…»
 *    و بیمارِ بیلی‌روبینِ ۱۸: «بدون تأخیر به اورژانس» و «این هفته با پزشک».
 *    بدتر از موارد ثبت‌شدهٔ قبلیِ N20 (D-dimer، DKA، liver_injury_pattern):
 *    آن‌ها تکرارِ جمله بودند، این یک چرخشِ کاملِ اورژانس/غیرفوری است.
 *
 *    واگذاری از سمتِ الگوی کم‌فوریت‌تر بسته شد، نه با `blocks_others` روی
 *    اورژانس: آن پرچم هر یافتهٔ کم‌فوریت‌ترِ کلِ برگه را پنهان می‌کند، پس
 *    بیمارِ بیلی‌روبینِ ۱۸ کم‌خونی‌اش را هم از دست می‌داد. این همان شکلی است
 *    که `severe_hyperglycemia_uncertain_ketosis` برای DKA/HHS به کار می‌برد.
 *
 *    ⚠️ آستانه‌ها اینجا می‌مانند و از دو جا خوانده می‌شوند (قاعدهٔ اورژانسی و
 *    گیتِ الگوی مالک)، چون N20 دقیقاً دربارهٔ یک تصمیمِ کپی‌شده در دو متغیر
 *    است. عددها تازه نیستند — همان‌هایی‌اند که در درخت بودند؛ منبعشان ثبت
 *    نشده و در MEDICAL_RULES.md بندِ P45 برای بازبین باز است. گاردها: M97، M98.
 */
const AMYLASE_EMERGENCY_UL = 500;
const BILI_T_EMERGENCY_MGDL = 15.0;

/** آیا قاعدهٔ اورژانسِ آمیلاز مالکِ این برگه است؟ */
function amylaseEmergencyOwns(e) {
  const amy = val(e).AMYLASE;
  return amy != null && amy >= AMYLASE_EMERGENCY_UL;
}

/** آیا قاعدهٔ اورژانسِ بیلی‌روبین مالکِ این برگه است؟ */
function biliEmergencyOwns(e) {
  const bili = val(e).BILI_T;
  return bili != null && bili >= BILI_T_EMERGENCY_MGDL;
}

/*
 * ─── N20: هموگلوبینِ زیر ۷ — یک عدد، یک دستور ───────────────────────────────
 * severe_anemia_crisis «فوراً به اورژانس» می‌گوید و قاعده‌های طبقه‌بندیِ کم‌خونی
 * که *همان* هموگلوبین را می‌خوانند در کنارش «این هفته» یا «همین چند روز» یا
 * «همین امروز» می‌گفتند. بیمار سه زمان‌بندیِ متفاوت برای یک عدد می‌خواند و هیچ
 * راهی برای انتخاب ندارد. blocks_others ابزارِ درستی نیست: یافتهٔ ماکروسیتیک/
 * میکروسیتیک *محتوای* بالینی دارد (اندازهٔ گلبول، آزمایش‌های بعدی) که نباید حذف
 * شود — فقط جملهٔ اقدامش باید کنار برود.
 *
 * آستانه اینجا یک بار تعریف می‌شود و match خودِ severe_anemia_crisis هم از همین
 * تابع می‌خواند، تا شرط «آن قاعده واقعاً فعال است» باشد نه «عدد از آستانه گذشته»
 * — همان درسی که M91e در گلوکز ثبت کرد.
 *
 * ⚠️ دامنه عمدی است: فقط قاعده‌هایی که دربارهٔ *همین* هموگلوبین‌اند. یافته‌های
 *    علت‌شناسی (کمبود B12، کمبود آهن، CRP) زمان‌بندیِ آنالیتِ خودشان را دارند و
 *    دست‌نخورده می‌مانند؛ پهن‌کردنِ این گیت روی آن‌ها همان خاموش‌کردنِ فراگیری است
 *    که N20 دربارهٔ blocks_others هشدار می‌دهد.
 */
const HGB_CRISIS_GDL = 7.0;

/*
 * ─── specs/007 (N19، Q2=A): هماتوکریتِ زیرِ ۲۱ وقتی هموگلوبین اندازه‌گیری نشده ─────
 * 🔴 پیش از 007: «Hct 18» بدونِ Hb ⇒ low_rbc_hct_without_anemia «در نوبت عادی»، در حالی که همان
 *    خون با Hb روی برگه اورژانس بود. هرچه اطلاعاتِ غایب بدتر، بیمار کمتر می‌شنید.
 * ⚠️ عددِ تازه نیست: همان Hb < ۷ (P8، هنوز بی‌منبع) × ۳ — قاعدهٔ سه‌تاییِ هنری فصل ۳۱. خودِ ۲۱ هرگز
 *    جداگانه نوشته نشود، تا اگر آستانهٔ Hb عوض شد این هم با آن برود.
 * - فقط وقتی Hb *سنجیده نشده*: عددِ اندازه‌گیری‌شده همیشه بر عددِ برآوردی حاکم است (Hct 18 + Hb 9 ⇒ Hb).
 * - همهٔ سنین، مثلِ بازوی Hb (تصمیمِ کاربر ۱۴۰۵/۰۷/۰۱، P52 پرسش ۵ — در نسخهٔ اول فقط بزرگسال بود).
 * - هماتوکریتِ < ۱ کسری است نه درصد (0.18 L/L) — adapter تبدیلش می‌کند یا کنارش می‌گذارد (M177)؛
 *   این مرز فقط کمربندِ دوم است و عددِ بالینی نیست.
 */
const HCT_CRISIS_PCT = HGB_CRISIS_GDL * 3;
const HCT_SURVIVAL_MIN = SURVIVAL_LIMITS.HGB[0] * 3;

/**
 * کدام بازوی بحرانِ کم‌خونی این برگه را مالک است: "hgb"، "hct" یا null.
 * match و build ِ severe_anemia_crisis هر دو از همین می‌خوانند — یک محاسبه، نه دو نسخه.
 */
function crisisArm(e) {
  const hgb = e.graded.find((g) => g.test === "HGB");
  if (hgb) return hgb.value !== null && Number(hgb.value) < HGB_CRISIS_GDL ? "hgb" : null;
  // 🔴 بازبینی B1/B2: Hbِ *چاپ‌شده* که واحدش معلوم نشد (ungraded) یا بازه نداشت (noRef) «اندازه‌گیری‌نشده» نیست —
  //    متنِ بازوی Hct همین را ادعا می‌کرد، کنارِ یافته‌ای که همان Hb را نقل می‌کرد. Hb حاکم است (FR-004)، و فوریتش
  //    با unit_unknown_values است؛ هماتوکریت اینجا بحران نمی‌سازد (M182).
  if (e.ungraded?.HGB || e.noRef?.includes("HGB")) return null;
  // ⚠️ هیچ گیتِ سنی نیست (تصمیمِ کاربر ۱۴۰۵/۰۷/۰۱، P52 پرسش ۵): بازوی Hb هم برای هر سنی است، و Hctِ زیرِ ۲۱ در
  //    کودک و نوزاد همان‌قدر بحرانی است (بازهٔ Hctِ نوزاد ۴۴–۶۴). پیش‌تر کودکِ Hct 18 «در نوبت عادی» می‌گرفت (M183c).
  const hct = e.graded.find((g) => g.test === "HCT");
  const v = hct && hct.value !== null ? Number(hct.value) : NaN;
  // کفِ مشتق، نه عددِ تازه: کمترین Hbِ زنده‌ماندنی (SURVIVAL_LIMITS، specs/003) × ۳. «HCT 4.5» ردیفِ جابه‌جاست (M182b).
  return v >= HCT_SURVIVAL_MIN && v < HCT_CRISIS_PCT ? "hct" : null;
}

/** آیا قاعدهٔ اورژانسِ کم‌خونیِ شدید مالکِ دستورِ این برگه است؟ */
function anemiaCrisisOwns(e) {
  return crisisArm(e) !== null;
}

const ANEMIA_CRISIS_DEFER =
  "همان دستورِ فوریِ بالا را دنبال کنید و این برگه را همراه ببرید؛ ادامهٔ بررسی با پزشک است.";

/** جملهٔ اقدام، مگر آنکه بحرانِ کم‌خونی مالکِ برگه باشد. */
function actionUnlessAnemiaCrisis(e, action) {
  return anemiaCrisisOwns(e) ? ANEMIA_CRISIS_DEFER : action;
}

// آیا تصویر سندرم نفروتیک هست؟ (پروتئینوری شدید + آلبومین پایین)
function isNephrotic(e) {
  const protGrade = urineGrade(e, /protein|پروتئین/i);
  const heavyProt = protGrade != null && protGrade >= 3;
  return heavyProt && albLowMarker(e);
}

// آیا تصویر گلومرولونفریت هست؟ (هماچوری + پروتئینوری + درگیری کلیه)
function isGlomerulonephritis(e) {
  const bloodUrine = urinePositive(e, /urine\s*blood|ur\s*blood|خون\s*ادرار|hematuria/i);
  const rbc = urineCellCount(e, /rbc|گلبول\s*قرمز/i);
  const hematuria = bloodUrine || (rbc != null && rbc > 3);
  const proteinuria = (urineGrade(e, /protein|پروتئین/i) || 0) >= 1;
  if (!(hematuria && proteinuria)) return false;
  const cr = e.graded.find((g) => g.test === "CREAT");
  const crHigh = cr?.abnormal && cr.dir === "high";
  const hgb = e.graded.find((g) => g.test === "HGB");
  const anemic = hgb?.abnormal && hgb.dir === "low";
  return crHigh || anemic;
}

// آیا تصویر DIC (انعقاد منتشر داخل عروقی) هست؟
// معیارِ اصلیِ قبلی: پلاکت پایین + PT طولانی + فیبرینوژن پایین (هر سه با هم).
// معیارِ افزوده بر پایهٔ امتیاز ISTH: پلاکت پایین + D-dimerِ شدیداً بالا +
//   حداقل یک اختلال انعقادی (PT طولانی یا فیبرینوژن پایین). این معیارِ دوم
//   موارد DIC ای را می‌گیرد که قاعدهٔ قبلی به‌خاطر نبودِ همهٔ سه شرط از دست می‌داد.
function isDIC(e) {
  const t = val(e);
  const pltLow = t.PLT != null && t.PLT < 100;
  const ptLong = t.PT != null && t.PT > 15;
  const fibLow = t.FIB != null && t.FIB < 150;
  if (pltLow && ptLong && fibLow) return true;   // تریگرِ اصلی — بدون تغییر
  const d = e.graded.find((g) => g.test === "DDIMER");
  const dStrong = d?.abnormal && d.dir === "high" && d.value >= 5000;  // ≈۱۰ برابرِ حد بالا (۵۰۰) = «افزایش شدید» ISTH
  return Boolean(dStrong && pltLow && (ptLong || fibLow));
}

// urgency: emergency | soon (۲۴ تا ۴۸ ساعت) | this_week | routine
// رتبه شدت — برای پیدا کردن بدترین یافته
const LEVEL_RANK = { critical: 4, marked: 3, moderate: 2, mild: 1 };
function rankOf(g) {
  if (g.level && LEVEL_RANK[g.level]) return LEVEL_RANK[g.level];
  return g.abnormal ? 1 : 0;
}

// کمکی: مقادیر خام
function val(e) {
  const t = {};
  for (const g of e.graded) t[g.test] = g.value;
  return t;
}

/**
 * اجرای قواعد روی خروجی موتور
 */
// پیشنهادهایی که «نام خالص یک آزمایش»‌اند → کلید(های) موتور.
// ⚠️ فقط تطبیق دقیق. عمداً هیچ تطبیق فازی/زیررشته‌ای نیست، چون بخش بزرگی از

// ═════════════ آنالیز ادرار، مرحلهٔ ب — specs/006، P51 ═════════════
// 🔴 روی b9068df (research R1): وزنِ مخصوص، کریستال و سلول‌های اپی‌تلیال یا به «تفسیر نشدند» می‌رفتند
//    یا — با واحدِ /hpf — در qual می‌نشستند و هیچ قاعده‌ای نمی‌خواندشان. تصمیمِ مسیر اینجاست (یک تابعِ
//    خالص برای هر نوع)، تا لایه‌های ۱ و ۱ج آداپتر هر دو یک پاسخ بدهند — با واحد و بی‌واحد.

// ── وزنِ مخصوص ──
// ⚠️ در انتظارِ بازبین (P51): Henry فصل ۲۹، به نقل از متنِ کاربر (ادرارِ تصادفی ۱.۰۰۳–۱.۰۳۵).
// ⚠️ مرزها *انحصاری*اند (بازبینیِ specs/006 #۶): ۱.۰۰۵ و ۱.۰۳۰ درونِ بازهٔ مرجعِ ۱.۰۰۳–۱.۰۳۵اند و یافته نمی‌سازند؛
//    نوارِ ادرار گام‌های ۰.۰۰۵ دارد، پس «رقیق» عملاً ۱.۰۰۰ است و «غلیظ» از ۱.۰۳۵.
const SG_DILUTE_MAX = 1.005;
const SG_CONCENTRATED_MIN = 1.030;
const SG_KEY = "Urine Specific Gravity";
// «Sp. Gravity»، «Spec. Grav.»، «Specific Gravity (SG)» هم (بازبینی #۹).
const SG_NAME_RE = /^(urine\s*)?(sp(ecific|ec)?\.?\s*gr(av(ity)?)?\.?(\s*\(\s*s\.?\s*g\.?\s*\))?|s\.?\s*g\.?)$|وزن\s*مخصوص/i;
function isSgKey(name) {
  return SG_NAME_RE.test(String(name).trim());
}
/** عددِ وزنِ مخصوص یا null. «1030» بی‌ممیز همان ۱.۰۳۰ است؛ بیرون از ۱.۰۰۰–۱.۰۶۰ ناخواناست. */
function sgValue(v) {
  // ⚠️ عدد باید *کلِ* مقدار باشد (بازبینیِ پزشکی، غیرمسدودکننده): «1/025» و «1.0 25» (خطای OCR) پیش‌تر ۱.۰۰۰ خوانده
  //    می‌شدند و «رقیق» گزارش می‌شد. رقم‌های فارسی/عربی و «٫» پذیرفته‌اند.
  const s = String(v ?? "").trim()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٫,]/g, ".");
  const m = s.match(/^[<>≤≥]?\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (n >= 1000 && n <= 1060) n /= 1000;
  return n >= 1.0 && n <= 1.06 ? n : null;
}
/** "dilute" | "usual" | "concentrated" | "unknown" | "absent" */
function sgState(e) {
  if (!(SG_KEY in (e?.qual || {}))) return "absent";
  const n = sgValue(e.qual[SG_KEY]);
  if (n == null) return "unknown";
  if (n < SG_DILUTE_MAX) return "dilute";
  if (n > SG_CONCENTRATED_MIN) return "concentrated";
  return "usual";
}

// ── کریستال‌ها ──
// ⚠️ «Uric Acid»، «Cholesterol»، «Cystine» و … *تنها* آزمایشِ خون‌اند؛ فقط با واژهٔ «کریستال» کریستال‌اند.
//    خواندنِ «Cholesterol 240 mg/dL» به‌عنوانِ «کریستالِ بیماری‌زا» بدترین شکلِ N25 بود (M171c).
//    فقط چند نامِ ترکیبی هستند که جز کریستال معنایی ندارند.
const CRYSTAL_KEY_RE = /crystal|کریستال|(calcium|ca)\.?\s*oxalat|اگزالات\s*کلسیم|اکسالات\s*کلسیم|amorph|آمورف|triple\s*phos|تریپل\s*فسفات|biurate|بی\s*اورات/i;
function isCrystalKey(name) {
  return CRYSTAL_KEY_RE.test(String(name)) && !isCastKey(name);
}
// ترتیب مهم است: «Amorphous urates» باید پیش از «urate» جور شود.
const CRYSTAL_TYPES = [
  ["cystine", /cystin|سیستین/i, "pathologic"],
  ["tyrosine", /tyrosin|تیروزین/i, "pathologic"],
  ["leucine", /leucin|لوسین/i, "pathologic"],
  ["cholesterol", /cholesterol|کلسترول/i, "pathologic"],
  ["amorphous_urate", /amorph\w*\s*urat|urat\w*\s*amorph|اورات\s*(ها\s*)?آمورف|آمورف\s*اورات/i, "incidental"],
  ["amorphous_phosphate", /amorph\w*\s*phosph|phosph\w*\s*amorph|فسفات\s*(ها\s*)?آمورف|آمورف\s*فسفات/i, "incidental"],
  ["ammonium_biurate", /biurate|بی\s*اورات/i, "incidental"],
  ["amorphous", /amorph|آمورف/i, "incidental"],
  ["triple_phosphate", /triple|struvite|تریپل|استروویت/i, "stone"],
  ["calcium_oxalate", /oxalat|اگزالات|اکسالات/i, "stone"],
  // «Hippuric acid» شاملِ «uric» است — مرزِ واژه لازم است، وگرنه کریستالِ ناشناخته اسید اوریک خوانده می‌شد (FR-016).
  ["uric_acid", /\buric\b|\burates?\b|اسید\s*اوریک|(^|\s)اورات/i, "stone"],
];
const CRYSTAL_CLASS_RANK = ["pathologic", "stone", "incidental"];
const CRYSTAL_FA = {
  cystine: "سیستین", tyrosine: "تیروزین", leucine: "لوسین", cholesterol: "کلسترول",
  amorphous_urate: "اورات‌های آمورف", amorphous_phosphate: "فسفات‌های آمورف", ammonium_biurate: "بی‌اوراتِ آمونیوم",
  amorphous: "رسوبِ آمورف", triple_phosphate: "تریپل‌فسفات", calcium_oxalate: "اگزالاتِ کلسیم", uric_acid: "اسید اوریک",
};
function crystalTypeIn(text) {
  for (const [type, re, cls] of CRYSTAL_TYPES) if (re.test(String(text ?? ""))) return { type, cls };
  return null;
}
function crystalTypesIn(text) {
  const s = String(text ?? "");
  const out = new Set();
  let rest = s;
  // هر جورشدن را از متن برمی‌داریم تا «Amorphous urates» یک نوع شمرده شود نه دو (آمورف + اسید اوریک).
  for (const [type, re] of CRYSTAL_TYPES) {
    if (re.test(rest)) { out.add(type); rest = rest.replace(new RegExp(re.source, "gi"), " "); }
  }
  return out;
}
/** نوعِ ردیف: اول از نام، بعد از مقدار («Crystals: Calcium oxalate») — نوعِ نام برنده است. */
function crystalTypeOf(name, value) {
  return crystalTypeIn(String(name).replace(/crystals?|کریستال(ها)?/gi, " ")) || crystalTypeIn(value);
}
/**
 * وضعیتِ مقدار: "absent" | "present" | "unknown". همان فهرستِ بستهٔ castValueState (N6، B1 مرحلهٔ الف)،
 * با یک تفاوت: در ردیفِ عام («Crystals: Cystine») نامِ نوع در مقدار *خودش* یعنی «دیده شد».
 */
function crystalValueState(name, value) {
  const st = castValueState(value);
  if (st !== "unknown") return st;
  return crystalTypesIn(value).size ? "present" : "unknown";
}
/** سرنوشت در آداپتر: نوعِ شناخته یا منفی ⇒ qual؛ بی‌نوعِ حاضر، چندنوعی یا نامعلوم ⇒ unmapped (FR-016). */
function crystalRoute(name, value) {
  const nameType = crystalTypeIn(String(name).replace(/crystals?|کریستال(ها)?/gi, " "));
  const valueTypes = crystalTypesIn(value);
  if (!nameType && valueTypes.size > 1) return "unmapped";
  const st = crystalValueState(name, value);
  if (st === "unknown") return "unmapped";
  if (st === "absent") return "qual";
  return nameType || valueTypes.size === 1 ? "qual" : "unmapped";
}
/** محورِ کریستال — یک برچسب برای کلِ برگه (شکلِ castAxis): pathologic > stone > incidental > null. */
function crystalAxis(e) {
  const present = new Map();   // type → cls
  for (const [k, v] of Object.entries(e?.qual || {})) {
    if (!isCrystalKey(k)) continue;
    if (crystalValueState(k, v) !== "present") continue;
    const t = crystalTypeOf(k, v);
    if (t) present.set(t.type, t.cls);
  }
  for (const cls of CRYSTAL_CLASS_RANK) {
    const mine = [...present].filter(([, c]) => c === cls).map(([t]) => t);
    if (!mine.length) continue;
    const others = [...present].filter(([, c]) => c !== cls).map(([t]) => t);
    return { label: cls, types: mine, others };
  }
  return { label: null, types: [], others: [] };
}

// ── سلول‌های اپی‌تلیال ──
// ⚠️ در انتظارِ بازبین (P51). سلولِ اپی‌تلیالِ کلیه بیش از ۲ در میدان آسیبِ لوله‌ها را نشان می‌دهد (Henry ۲۹).
//    سلولِ سنگفرشیِ زیاد (≥۱۵ در میدانِ پربزرگ‌نمایی، یا «Many») یعنی نمونه هنگامِ جمع‌آوری آلوده شده.
const RTEC_UPPER_HPF = 2;
const SQUAMOUS_CONTAM_HPF = 15;
const EPI_KEY_RE = /epithel|\bepi\.?\s*cells?\b|اپی\s*تلیال|اپیتلیال|squam|سنگفرش|\brtec?\b|renal\s*tubular\s*cell/i;
/** "renal_tubular" | "transitional" | "squamous" | null. برگه‌های ایرانی سنگفرشی را «Epithelial cells» می‌نویسند. */
function epithelialKind(name) {
  const s = String(name);
  if (!EPI_KEY_RE.test(s) || isCastKey(s)) return null;
  if (/renal|tubular|\brtec?\b|توبول|کلیوی|کلیه/i.test(s)) return "renal_tubular";
  if (/transitional|urothel|ترانزیشنال|یوروتلیال/i.test(s)) return "transitional";
  // «Round epithelial» در نام‌گذاریِ قدیمی یعنی سلولِ کلیه یا ترانزیشنال، نه سنگفرشی (بازبینی #۷) ⇒ بیرون از دامنه.
  if (/round|گرد/i.test(s)) return "transitional";
  return "squamous";
}
// «Moderate» برای سنگفرشی هنوز آلودگی نیست؛ فقط «زیاد/پر».
const SQUAMOUS_HIGH_RE = /many|numerous|full|loaded|plenty|packed|tntc|فراوان|زیاد|انبوه|(^|\s)پر(\s|$)/i;
/** وضعیتِ یک مقدارِ سلولی: "absent" | "low" | "high" | "unknown" — همان منطقِ urineCellState، روی یک مقدار. */
function epithelialValueState(kind, value) {
  const s = String(value ?? "").trim().replace(/[.,;:،؛]+$/, "").trim();
  if (!s) return "unknown";
  if (/^<|کمتر|less\s*than/i.test(s)) return "low";
  if (CAST_ABSENT_RE.test(s)) return "absent";
  const plus = (s.match(/\+/g) || []).length;
  if (plus) {
    const d = s.match(/\+\s*(\d)|(\d)\s*\+/);
    const g = d ? parseInt(d[1] ?? d[2], 10) : plus;
    return g >= (kind === "squamous" ? 3 : 2) ? "high" : "low";
  }
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(parseFloat);
  if (nums.length) {
    const n = Math.max(...nums);
    return kind === "squamous" ? (n >= SQUAMOUS_CONTAM_HPF ? "high" : "low") : (n > RTEC_UPPER_HPF ? "high" : "low");
  }
  if (kind === "squamous" ? SQUAMOUS_HIGH_RE.test(s) : CELL_HIGH_RE.test(s)) return "high";
  if (CELL_LOW_RE.test(s) || /\b(rare|few|occasional|moderate)\b|نادر|کم|اندک|متوسط/i.test(s)) return "low";
  return "unknown";
}
/** سرنوشت در آداپتر: ترانزیشنال (خارج از دامنه) یا مقدارِ نامعلوم ⇒ unmapped؛ بقیه ⇒ qual. */
function epithelialRoute(name, value) {
  const kind = epithelialKind(name);
  if (!kind || kind === "transitional") return "unmapped";
  return epithelialValueState(kind, value) === "unknown" ? "unmapped" : "qual";
}
/** جملهٔ سلول‌های سنگفرشی برای یافته‌ای که خودش دربارهٔ WBC/باکتری/استراز حرف می‌زند (FR-023، بازبینی #۵):
 *  یک یافته، یک خوانش از همان WBC — نه دو یافتهٔ کنارِ هم. بی‌زمان‌بندی (N20). */
function squamousSentence(e) {
  return epithelialState(e, "squamous") === "high"
    ? " در همین نمونه سلول‌های سنگفرشیِ زیادی هم گزارش شده است، که آلودگیِ نمونه هنگامِ جمع‌آوری را محتمل‌تر می‌کند؛ تکرار با نمونهٔ وسطِ ادرار این را روشن می‌کند."
    : "";
}
/** وضعیتِ یک نوع روی برگه: "absent" اگر ردیفش نیست. */
function epithelialState(e, kind) {
  let st = "absent";
  for (const [k, v] of Object.entries(e?.qual || {})) {
    if (epithelialKind(k) !== kind) continue;
    const s = epithelialValueState(kind, v);
    if (s === "high") return "high";
    if (s !== "unknown") st = s;
  }
  return st;
}

// ── بیلی‌روبین و اوروبیلینوژنِ نوار ──
const UBILI_KEY_RE = /bilirubin|بیلی\s*روبین/i;
/**
 * مقدارِ نوارِ بیلی‌روبین: "positive" | "negative" | "unknown". فهرستِ *بسته* روی کلِ مقدار (N6، بازبینیِ پزشکی B3):
 * 🔴 نسخهٔ اول «+» و «کم» را زیررشته می‌گرفت و هر عددِ بزرگ‌تر از صفر را مثبت: «<0.5»، «کمتر از 0.5» و «+/-» ⇒ «مثبت، این هفته»،
 *    و «Bilirubin 0.8 mg/dL»ِ سرم روی صفحهٔ مخلوط ⇒ همان (B4). عددِ تنها روی نوارِ بیلی‌روبین مبهم است ⇒ نامعلوم.
 */
const UBILI_POS_RE = /^(trace|رگه|\+{1,4}|[1-4]\s*\+|\+\s*[1-4]|pos(itive)?|مثبت|present|seen|small|moderate|large|many|کم|متوسط|زیاد|دارد)$/i;
function urineBiliValueState(v) {
  const s = String(v ?? "").trim().replace(/[.,;:،؛]+$/, "").trim();
  if (!s || EQUIVOCAL_RE.test(s)) return "unknown";
  if (/^<|کمتر|less\s*than/i.test(s) || CAST_ABSENT_RE.test(s)) return "negative";
  return UBILI_POS_RE.test(s) ? "positive" : "unknown";
}
/** "positive" | "negative" | "unknown" | "absent" */
function urineBiliState(e) {
  for (const [k, v] of Object.entries(e?.qual || {})) {
    if (!UBILI_KEY_RE.test(k) || /urobil|اوروبیل/i.test(k) || isCastKey(k) || isCrystalKey(k)) continue;
    return urineBiliValueState(v);
  }
  return "absent";
}
/**
 * مقدارِ اوروبیلینوژن (با واحدی که آداپتر کنارش نگه می‌دارد): "raised" | "normal" | "unknown".
 * 🔴 بازبینیِ پزشکی B2 و کد #۳: واحد دور ریخته می‌شد ⇒ «3.2 µmol/L» (پدِ طبیعی) «بالا» و «70 µmol/L» بی‌صدا؛
 *    «Not increased» بالا (/increas/) و «Abnormal» طبیعی (/norm/). حالا فهرستِ بسته روی کلِ مقدار، و عدد فقط با واحد:
 *    mg/dL یا EU/dL بالای ۱، µmol/L بالای ۱۷. عددِ بی‌واحد فقط وقتی قطعی است که در هر دو واحد یک معنا بدهد.
 * نوار «کاهش» را قابلِ اعتماد نشان نمی‌دهد؛ منفی = طبیعی.
 */
const UROBIL_NORMAL_RE = /^(norm(al)?|نرمال|طبیعی|neg(ative)?|منفی|nil|none|trace|رگه|not\s*increased|within\s*normal\s*limits?|wnl)$/i;
const UROBIL_RAISED_RE = /^(abnormal|increased|high|raised|pos(itive)?|مثبت|بالا|زیاد|افزایش(\s*یافته)?|\+{1,4}|[1-4]\s*\+|\+\s*[1-4])$/i;
function urobilValueState(v) {
  const s = String(v ?? "").trim().replace(/[.,;:،؛]+$/, "").trim();
  if (!s || EQUIVOCAL_RE.test(s)) return "unknown";
  if (/^[<≤]|کمتر|less\s*than/i.test(s) || UROBIL_NORMAL_RE.test(s)) return "normal";
  if (UROBIL_RAISED_RE.test(s)) return "raised";
  const m = s.match(/^[>≥]?\s*(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return "unknown";
  const n = parseFloat(m[1]);
  const unit = m[2];
  if (/µ|u\s*mol|micro/i.test(unit)) return n > 17 ? "raised" : "normal";
  if (/mg|eu|ehrlich/i.test(unit)) return n > 1 ? "raised" : "normal";
  if (!unit) { if (n <= 1) return "normal"; if (n > 17) return "raised"; }   // ≤۱ در هر دو طبیعی؛ >۱۷ در هر دو بالا
  return "unknown";
}
/** "raised" | "normal" | "unknown" | "absent" */
function urobilState(e) {
  for (const [k, v] of Object.entries(e?.qual || {})) {
    if (!/urobil|اوروبیل/i.test(k)) continue;
    return urobilValueState(v);
  }
  return "absent";
}
/**
 * جملهٔ نوارِ ادرار برای یافتهٔ بیلی‌روبینِ خون یا همولیز (FR-021: یک زمان‌بندی، مالکِ آن یافته).
 * رشتهٔ خالی اگر نوار چیزی برای گفتن ندارد. بی‌زمان‌بندی — دستورِ اقدام مالِ یافتهٔ مالک است (N20).
 */
function urineBiliSentence(e, { direct = true } = {}) {   // direct=false: مالکی که جزءِ مستقیم را غالب نمی‌گوید (غیرمستقیم، همولیز، اورژانس)
  const b = urineBiliState(e);
  const u = urobilState(e);
  if (b === "positive") {
    return " نوارِ ادرار هم بیلی‌روبین را مثبت نشان داده است؛ فقط شکلِ «پردازش‌شده» (مستقیم) بیلی‌روبین به ادرار می‌رسد، " +
      (direct
        ? "پس این با سهمِ کبد یا مجاری صفرا در همین یافته جور است."
        : "و تجزیهٔ گلبول‌ها به‌تنهایی این را توضیح نمی‌دهد — پزشک کبد و مجاری صفرا را هم کنارش می‌سنجد.");
  }
  if (u === "raised") {
    return " نوارِ ادرار اوروبیلینوژن را هم بالا نشان داده است — ماده‌ای که وقتی بیلی‌روبینِ بیشتری ساخته و از روده بازجذب می‌شود بالا می‌رود" +
      (direct ? "؛ این با انسدادِ کاملِ مجاری صفرا جور نیست." : ".");
  }
  return "";
}

export { urineBiliValueState, urobilValueState, EQUIVOCAL_RE, squamousSentence };
export { isSgKey, sgValue, sgState, SG_KEY, SG_DILUTE_MAX, SG_CONCENTRATED_MIN, isCrystalKey, crystalTypeOf, crystalRoute, crystalAxis,
  CRYSTAL_FA, epithelialKind, epithelialRoute, epithelialState, RTEC_UPPER_HPF, SQUAMOUS_CONTAM_HPF, urineBiliState, urobilState,
  urineBiliSentence };
export { isCastKey, castTypeOf, castTypesIn, castValueState, castRoute, castRows, castAxis, othersSentence,
  urineCellState, CAST_TYPES, HYALINE_CAST_UPPER_LPF };
export { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, ferritinIdCut, isPedAge, IRON_ACD_LOW_UGDL, ferritinBelowIdCut, ironLowForAcd, hba2State, hba2Measured, hba2Clause, HBA2_TRAIT_ABOVE, HBA2_BEYOND_TRAIT_FROM, ferritinMicroClause, stfrIndex, stfrIndexHigh, STFR_INDEX_ID_ABOVE, zppState, ZPP_HIGH_ABOVE, hbVariantState, HB_VARIANT_FA, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, has, CRP_RE, RF_RE, albLowMarker, ALB_LOW_MARKER_GDL,
         amylaseEmergencyOwns, biliEmergencyOwns, AMYLASE_EMERGENCY_UL, BILI_T_EMERGENCY_MGDL,
         anemiaCrisisOwns, actionUnlessAnemiaCrisis, ANEMIA_CRISIS_DEFER, HGB_CRISIS_GDL, crisisArm, HCT_CRISIS_PCT };

// ═══ specs/009 — شمارشِ افتراقیِ گلبول سفید (P56، در انتظارِ بازبینی) ═══
// عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم — تا تأییدِ کاربر در MEDICAL_RULES.md P56.
// هیچ‌کدام مرزِ سنجش نیست (آن کارِ refs.js است، N23): فقط مرزِ جمله/فوریت در قاعده، و همیشه همراهِ «سنجیده‌شده بالا».
const MONOCYTOSIS_ABS_UL = 1000;         // «> 1.0 ×10⁹/L» — زیرِ آن و بالای حدِ مرجع: «کمی بالاتر»
const HYPEREOSINOPHILIA_ABS_UL = 1500;   // «≥ 1.5 ×10⁹/L» — هایپرائوزینوفیلی
// P56 پرسش ۴ (تصمیمِ بازبین ۲۰۲۶-۰۹-۲۸): مونوسیتِ زیرِ حدِ مرجع به‌تنهایی هشدار نمی‌سازد؛ فقط زیرِ ۵۰ یا کنارِ پان‌سیتوپنی.
const MONOCYTOPENIA_SEVERE_ABS_UL = 50;
export { MONOCYTOSIS_ABS_UL, HYPEREOSINOPHILIA_ABS_UL, MONOCYTOPENIA_SEVERE_ABS_UL };

// ═══ specs/009 — ردیف‌های لامِ خونِ محیطی (کانالِ smear) ═══
// واژگانِ بسته، تطبیق با *نامِ* ردیف (FR-008a)؛ توصیفِ بی‌نام («هستهٔ دولوبه») خوانده نمی‌شود. حضور با castValueState
// (فهرستِ بستهٔ حضور/نفیِ N6، M169) — «نامعلوم» هرگز آیتم نمی‌شود و ردیف در «تفسیر نشدند» می‌ماند.
// کانالِ جدا، نه qual: قاعده‌های ادرار qual را با regex روی هر کلیدی می‌گردند (N25).
const BLAST_EMERGENCY_PCT = 20;          // P56: «≥ 20 % blasts» — عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم
const SMEAR_ORDER = ["blasts", "auer", "pseudo_pelger", "toxic_granulation", "dohle", "pelger", "may_hegglin", "alder_reilly", "chediak_higashi"];
const smearNorm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[\s._\-\/()%#:,]/g, "").replace(/\u200c/g, "");
const SMEAR_NAME = [
  [/^(blasts?|blastcells?|myeloblasts?|lymphoblasts?|monoblasts?|immaturemononuclearcells?|بلاست(ها)?)$/, "blasts"],
  [/^auer(rods?|bod(y|ies))?$/, "auer"],
  [/^toxic(granulations?|granules?|changes?)$/, "toxic_granulation"],
  [/^dohle(bod(y|ies))?$/, "dohle"],
  [/^pseudopelger/, "pseudo_pelger"],
  [/^pelger/, "pelger"],
  [/^mayhegglin/, "may_hegglin"],
  [/^alderreilly/, "alder_reilly"],
  [/^chediak/, "chediak_higashi"],
];
// ردیف‌های عمومیِ لام/توضیح: متنشان بندبه‌بند برای همان واژگان گشته می‌شود.
// «شمارش دستی» / «Manual diff» — سرِ ردیفِ شمارشِ دستیِ لام (P56، تصمیمِ بازبین ۲۰۲۶-۰۹-۲۸).
const SMEAR_GENERIC = /^(peripheral(blood)?smear(pbs)?|pbs|pbf|morphologyreview|manualdiff(erential)?(count)?|شمارشدستی|bloodsmear|bloodfilm|smear|morphology|wbcmorphology|comments?|remarks?|note|لامخونمحیطی|لامخون|گسترشخونمحیطی|توضیحات|توضیح)$/;
const SMEAR_TEXT = [
  // P56 پرسش ۵: «Immature mononuclear cells» (و «Atypical/Immature …») اصطلاحِ لام برای بلاستِ احتمالی است. «Immature cells»/IG
  //   تنها عمداً نه — روی دستگاهِ Sysmex یعنی گرانولوسیتِ نابالغ، و «Atypical mononuclear/lymphocytes» تنها لنفوسیتِ واکنشی است (N2).
  [/\b(blasts?|blast\s*cells?|myeloblasts?|lymphoblasts?|monoblasts?)\b|\bimmature\s+mononuclear\s+cells?\b|بلاست/i, "blasts"],
  [/\bauer\b/i, "auer"],
  [/\btoxic\s*(granul|change)/i, "toxic_granulation"],
  [/d[oö]hle/i, "dohle"],
  [/pseudo[\s-]*pelger/i, "pseudo_pelger"],
  [/may[\s-]*hegglin/i, "may_hegglin"],
  [/alder[\s-]*reilly/i, "alder_reilly"],
  [/ch[eé]diak/i, "chediak_higashi"],
];
// «without blasts»، «no blasts seen»، «بدونِ بلاست» — نفی در همان بند.
const SMEAR_NEG_RE = /\b(no|not|nil|none|absent|negative|without)\b|free\s+of|منفی|بدون|دیده\s*نشد|مشاهده\s*نشد|یافت\s*نشد|ندارد|نیست/i;
// «not evaluated»، «pending»، «بررسی نشد» — بندی که چیزی را نفی نمی‌کند، فقط می‌گوید سنجیده نشده؛
//   نباید با SMEAR_NEG_RE (که یعنی «سنجیده شد و منفی بود») یکی گرفته شود، وگرنه «بلاستِ بررسی‌نشده» به‌جای
//   «تفسیر نشدند» به‌صورت «بلاست حاضر نیست» گزارش می‌شود (N4).
const SMEAR_DEFER_RE = /\bnot\s+(evaluated|assessed|done|available|reported|performed|counted|seen\s+due)\b|\bpending\b|بررسی\s*نشد|ارزیابی\s*نشد|انجام\s*نشد|گزارش\s*نشد|سنجیده\s*نشد/i;

function smearKindOf(name) {
  const n = smearNorm(name);
  for (const [re, kind] of SMEAR_NAME) if (re.test(n)) return kind;
  return null;
}
/** درصدِ بلاستِ ردیفِ نام‌دار: عددِ ۰ تا ۱۰۰ با واحدِ ٪ یا بی‌واحد. واحدِ شمارشی (10^3/µL) یا عددِ ناممکن ⇒ undefined (نامعلوم). */
function blastPct(value, unit) {
  const v = String(value ?? "").trim();
  const m = v.match(/^(\d+(?:\.\d+)?)\s*%?$/);
  if (!m) return null;
  if (unit && String(unit).trim() && !/%/.test(String(unit))) return undefined;
  const n = parseFloat(m[1]);
  return n >= 0 && n <= 100 ? n : undefined;
}
/**
 * یک ردیفِ OCR ⇒ null (ردیفِ لام نیست) یا { handled, items }.
 *   handled: "read" (نام‌دار و خوانده‌شده — از «تفسیر نشدند» بیرون) | "unmapped" (نام‌دار ولی مبهم) |
 *            "generic" (متنِ آزاد — آیتم‌هایش خوانده شد، ولی نامِ ردیف در «تفسیر نشدند» می‌ماند تا بقیهٔ متنش گم نشود).
 */
function smearRow(name, value, unit) {
  const raw = { name: String(name ?? ""), value: String(value ?? "") };
  const kind = smearKindOf(name);
  if (kind) {
    if (kind === "blasts") {
      const pct = blastPct(value, unit);
      if (pct === undefined) return { handled: "unmapped", items: [] };
      if (pct != null) return { handled: "read", items: [{ kind, state: pct > 0 ? "present" : "absent", pct: pct > 0 ? pct : null, raw }] };
    }
    const st = castValueState(value);
    if (st === "unknown") return { handled: "unmapped", items: [] };
    return { handled: "read", items: [{ kind, state: st, pct: null, raw }] };
  }
  if (!SMEAR_GENERIC.test(smearNorm(name))) return null;
  const items = [];
  // دامنهٔ نفی یک «پاره» است، نه کلِ بند: «Toxic granulation without blasts» گرانول را نفی نمی‌کند. پاره‌ها با
  //   and/with/& و پیش از without (که خودش نفی است و با پارهٔ بعد می‌ماند) جدا می‌شوند؛ «No toxic granulation or blasts» یک پاره است.
  const clauses = String(value ?? "").split(/[,;.،؛\n]|\bbut\b|\bhowever\b/i)
    .flatMap((c) => c.split(/\b(?:and|with)\b|&|\s(?=without\b)|\s(?=و\s*بدون)|\sو\s/i));
  for (const clause of clauses) {
    if (SMEAR_DEFER_RE.test(clause)) continue; // سنجیده نشده؛ نه حاضر نه غایب — بیرون از این تابع unmapped می‌ماند
    const neg = SMEAR_NEG_RE.test(clause);
    for (const [re, k] of SMEAR_TEXT) {
      if (!re.test(clause)) continue;
      let pct = null;
      if (k === "blasts") {
        const m = clause.match(/(?:blasts?|blast\s*cells?|بلاست)\D{0,6}?(\d+(?:\.\d+)?)\s*%/i);
        if (m && parseFloat(m[1]) <= 100) pct = parseFloat(m[1]);
      }
      const absent = neg || pct === 0;
      items.push({ kind: k, state: absent ? "absent" : "present", pct: absent ? null : pct, raw });
    }
    // «Pelger» تنها (بی‌«pseudo» در همان بند) — جدا، چون الگوی pseudo آن را هم در بر دارد.
    if (/pelger/i.test(clause) && !/pseudo[\s-]*pelger/i.test(clause)) items.push({ kind: "pelger", state: neg ? "absent" : "present", pct: null, raw });
  }
  return items.length ? { handled: "generic", items } : null;
}
/** ادغامِ آیتم‌های همه‌ی ردیف‌ها: یک آیتم برای هر نوع؛ «حاضر» بر «غایب» می‌چربد؛ بیشترین درصدِ بلاست. */
function mergeSmear(items) {
  const by = new Map();
  for (const it of items) {
    const cur = by.get(it.kind);
    if (!cur) { by.set(it.kind, { ...it }); continue; }
    if (it.state === "present" && cur.state !== "present") by.set(it.kind, { ...it });
    else if (it.state === "present" && it.pct != null && (cur.pct == null || it.pct > cur.pct)) cur.pct = it.pct;
  }
  return SMEAR_ORDER.filter((k) => by.has(k)).map((k) => by.get(k));
}
/**
 * طبقه‌بندِ خالص (شکلِ mineralAxis): فقط e.smear را می‌خواند و هیچ قاعده‌ای را صدا نمی‌زند (تا چرخهٔ import با
 * patterns_malignancy پیش نیاید). exclude: "leukemic" ⇒ بلاستِ ≥۲۰٪ و اوئر کنار گذاشته می‌شوند (hand-off، data-model §3).
 * null ⇒ آیتمِ حاضری نمانده.
 */
/** شواهدِ نوعِ اکتسابیِ پلگر روی همین برگه — عبارت‌های فارسی همراهِ عددِ چاپ‌شده (N5). فقط «سنجیده‌شده پایین» (N4). */
function pelgerAcquiredEvidence(e) {
  const low = (k) => e?.graded?.find((g) => g.test === k && g.abnormal && g.dir === "low");
  const out = [];
  const hgb = low("HGB"), plt = low("PLT"), wbc = low("WBC") ?? low("NEUT_ABS");
  if (hgb) out.push(`کاهشِ هموگلوبین (${hgb.value})`);
  if (plt) out.push(`کاهشِ پلاکت (${plt.value})`);
  if (wbc) out.push(`کاهشِ گلبول‌های سفید (${wbc.value})`);
  if ((e?.smear ?? []).some((i) => i.state === "present" && i.kind === "blasts")) out.push("بلاست در لامِ خون");
  return out;
}
function smearAxis(e, { exclude } = {}) {
  const isLeukemic = (i) => i.kind === "auer" || (i.kind === "blasts" && i.pct != null && i.pct >= BLAST_EMERGENCY_PCT);
  let items = (e?.smear ?? []).filter((i) => i.state === "present");
  const leukemic = items.filter(isLeukemic);
  if (exclude === "leukemic") items = items.filter((i) => !isLeukemic(i));
  // P56 پرسش ۲ (تصمیمِ بازبین ۲۰۲۶-۰۹-۲۸): «Pelger» کنارِ سیتوپنی یا بلاست شبه‌پلگر (اکتسابی) خوانده می‌شود، نه ارثیِ خوش‌خیم.
  //   بلاستی که با exclude کنار رفته هم شاهد است، چون روی برگه هست.
  const pel = items.find((i) => i.kind === "pelger");
  if (pel) {
    const ev = pelgerAcquiredEvidence(e);
    if (ev.length) {
      items = items.filter((i) => i !== pel);
      if (!items.some((i) => i.kind === "pseudo_pelger")) items.push({ ...pel, kind: "pseudo_pelger", fromPelger: ev });
      items = SMEAR_ORDER.flatMap((k) => items.filter((i) => i.kind === k));
    }
  }
  if (!items.length) return null;
  const urgency = items.some(isLeukemic) ? "emergency"
    // P56: بلاستِ کم (۱ تا ۱۹٪ یا بی‌درصد) سطحِ جدای «۲۴ تا ۴۸ ساعت» است — نه اورژانس، نه «این هفته» (تصمیمِ بازبین ۲۰۲۶-۰۹-۲۸).
    : items.some((i) => i.kind === "blasts") ? "soon"
    : items.some((i) => i.kind === "pseudo_pelger") ? "this_week"
    : "routine";
  return { urgency, items, leukemic };
}
export { BLAST_EMERGENCY_PCT, smearKindOf, smearRow, mergeSmear, smearAxis };
// نامِ فارسیِ هر آیتمِ لام — متنِ بیمار فقط فارسی است (M38). درصدِ بلاست همان عددِ چاپ‌شده است (N5).
const SMEAR_FA = {
  blasts: "بلاست", auer: "میله‌های اوئر", pseudo_pelger: "سلول‌های شبه‌پلگر", toxic_granulation: "گرانول‌های سمی (توکسیک)",
  dohle: "اجسام دوهله", pelger: "ناهنجاریِ پلگر-هوئت", may_hegglin: "ناهنجاریِ می-هگلین", alder_reilly: "ناهنجاریِ آلدر-رایلی",
  chediak_higashi: "گرانول‌های چدیاک-هیگاشی",
};
const smearItemFa = (i) => (i.kind === "blasts" && i.pct != null ? `${SMEAR_FA.blasts} ${i.pct}٪`
  : i.fromPelger ? "ناهنجاریِ پلگر-هوئت (احتمالِ نوعِ اکتسابی)" : SMEAR_FA[i.kind]);
/** جملهٔ آیتم‌های «لوسمیک» (بلاستِ ≥۲۰٪، اوئر) — یک جمله برای هر دو، تا ادغام شوند (FR-006). بی‌زمان‌بندی (N20). */
function smearLeukemicSentence(leukemic) {
  const bl = leukemic.find((i) => i.kind === "blasts");
  const au = leukemic.some((i) => i.kind === "auer");
  const parts = [];
  if (bl) parts.push(`بلاست — سلولِ نابالغی که در خونِ سالم دیده نمی‌شود — ${bl.pct}٪ گزارش شده`);
  if (au) parts.push(bl ? "میله‌های اوئر (ساختارهای سوزنی‌شکل در همین سلول‌های نابالغ) هم دیده شده‌اند"
    : "میله‌های اوئر دیده شده‌اند — ساختارهای سوزنی‌شکلی که فقط در گلبول‌های سفیدِ نابالغ پیدا می‌شوند");
  return `در بررسیِ لامِ خونِ شما ${parts.join(" و ")}.`;
}
/** هر سه (هموگلوبین، گلبول سفید، پلاکت) روی برگه سنجیده شده‌اند؟ اینجاست، نه در قاعده، تا خواندنِ این کلیدها آن‌ها را
 *  برای تورِ «توضیح داده نشدند» پوشش‌داده نکند (M156). */
const smearCbcComplete = (e) => ["HGB", "WBC", "PLT"].every((k) => e?.graded?.some((g) => g.test === k));
// P56 پرسش ۶ (تصمیمِ بازبین ۲۰۲۶-۰۹-۲۸): نامِ تشخیص («لوسمی»، «بدخیمی») در متنِ بیمار نمی‌آید — فقط شاهد و اقدام.
//   acute_leukemia_suspicion نامِ داخلیِ پرچم است و به متن نمی‌رسد. متن همان جملهٔ پیشنهادیِ بازبین است.
const BLAST_EVAL_SENTENCE = "حضورِ سلول‌های نارس (بلاست) در گردشِ خون نیازمندِ ارزیابیِ فوریِ تخصصیِ خون (هماتولوژی) در سریع‌ترین زمانِ ممکن (اورژانسی) است.";
export { SMEAR_FA, smearItemFa, smearLeukemicSentence, smearCbcComplete, BLAST_EVAL_SENTENCE };

// ═══ specs/010 — هموستاز (P61) ═══
// تأییدِ کاربر؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم — مرزهای شدتِ فاکتور (D10 = گزینهٔ A، ۲۰۲۶-۰۹-۲۹).
// ⚠️ این تنها جای این مقایسه‌هاست (FR-018): خوانشِ «> ۵٪» و «۶٪»ِ متنِ چسبانده‌شده هر دو در کد نباشند.
const FACTOR_SEVERE_BELOW_PCT = 1;
const FACTOR_MODERATE_MAX_PCT = 5;
const FACTOR_MILD_MAX_PCT = 40;   // WFH: خفیف >۵ تا <۴۰٪ (بازبینیِ متخصص ۲۰۲۶-۰۹-۳۰؛ پیش‌تر ۳۰ بی‌منبع)
/**
 * ردهٔ فعالیتِ فاکتور ۸/۹ (٪). item: آیتمِ کانالِ hemostasis. age: سال یا null.
 * 'paediatric' | 'unit_unknown' | 'severe' | 'moderate' | 'mild' | 'reduced' | 'inRange' | 'notJudged'
 * ⚠️ سن دیگر ردهٔ کودک را حذف نمی‌کند (۲۰۲۶-۰۹-۳۰؛ WFH: ردهٔ <۱ / ۱–۵ / ۵–۴۰٪ برای کودک هم به کار می‌رود؛ FVIII و vWF از تولد
 *    نزدیکِ بزرگسال‌اند). فقط FIX در ماه‌های اول جمله‌ای دربارهٔ تأییدِ سنی می‌گیرد (patterns_hemostasis).
 */
function factorBand(item, age, sex = null) {
  if (!item || item.value == null) return "unit_unknown";
  if (item.unitState !== "ok") return "unit_unknown";
  const pct = item.value;
  // «<1٪» مرز است: کمتر از ۱ ⇒ شدید، حتی اگر عدد خودش ۱ باشد.
  if (pct < FACTOR_SEVERE_BELOW_PCT || (item.lessThan && pct <= FACTOR_SEVERE_BELOW_PCT)) return "severe";
  if (pct <= FACTOR_MODERATE_MAX_PCT) return "moderate";
  if (pct < FACTOR_MILD_MAX_PCT) return "mild";
  const pv = item.position ?? null;   // حکم با عددِ چاپ‌شده در برابرِ محدودهٔ چاپ‌شده، نه ٪ (adapter: hemostasisItem)
  if (pv === "below") return "reduced";
  if (pv === "within" || pv === "above") return "inRange";
  return "notJudged";
}

/** vWF:RCo / vWF:Ag فقط وقتی هر دو با واحدِ شناخته‌شده چاپ شده‌اند. بی‌آستانه (FR-021): فقط نقل می‌شود. */
function vwfRatio(h) {
  const ag = h?.VWF_AG, act = h?.VWF_ACT;
  if (!ag || !act) return { ratio: null, reason: "partner_missing" };
  if (ag.unitState !== "ok" || act.unitState !== "ok" || !ag.value) return { ratio: null, reason: "unit_unknown" };
  return { ratio: Math.round((act.value / ag.value) * 100) / 100, reason: null };
}

// امتیازِ ISTH برای DIC — فقط داخلِ ردهٔ پایینِ dic_isth_score (Q1 = گزینهٔ C). isDIC و refs دست نخوردند.
// ISTH خودش عددِ مطلقِ D-dimer نمی‌دهد (PMC7769303: «cut-off levels … have not been defined»). مبنا: مضربی از حدِ بالای مرجعِ خودِ موتور
// (ULN)، مثلِ ماشین‌حسابِ ISTHِ بیمارستانِ اولم (شدید > ۷×ULN). اینجا «متوسط» = بالای ULN (یعنی غیرطبیعی در موتور) و «شدید» = بیش از ۷×ULN.
// تصمیمِ چندعامله ۲۰۲۶-۰۹-۳۰ (پژوهشگر ⇒ راستی‌آزما ⇒ مدیر)؛ منبعِ دوم نیست. ⚠️ فرضِ D-dimer در FEU است؛ آزمایشگاهِ DDU حدودِ نصفِ عدد
// می‌دهد و کم‌امتیاز می‌گیرد. isDIC (≥ ۵۰۰۰) عمداً دست نخورد.
const ISTH_DDIMER_ULN_NGML = 500;   // = ADULT_REFS.DDIMER بالا (refs.js)
const ISTH_DDIMER_MODERATE_NGML = ISTH_DDIMER_ULN_NGML;
const ISTH_DDIMER_STRONG_MULT = 7;   // «شدید» = بیش از ۷×ULN (ماشین‌حسابِ Ulm؛ منبعِ دوم نیست)
const ISTH_DDIMER_STRONG_NGML = ISTH_DDIMER_STRONG_MULT * ISTH_DDIMER_ULN_NGML;
const ISTH_PT_OVER_CONTROL_1 = 3;
const ISTH_PT_OVER_CONTROL_2 = 6;
const ISTH_PLT_1 = 100;
const ISTH_PLT_2 = 50;
const ISTH_FIB_MGDL = 100;
const ISTH_OVERT_FROM = 5;
/** { plt, ddimer, pt, fib, total, missing[] } — جزءِ بی‌آنالیت null است، هرگز ۰ (N4). */
/** امتیازِ D-dimer در ISTH: با حدِ بالای چاپ‌شدهٔ برگه (مضرب از ULN) اگر باشد، وگرنه ULNِ موتور. null = اندازه‌گیری نشده. */
function isthDdimerPoints(e) {
  const t = val(e);
  if (t.DDIMER == null) return null;
  const ratio = e._ddimer_uln_ratio ?? t.DDIMER / ISTH_DDIMER_ULN_NGML;
  return ratio > ISTH_DDIMER_STRONG_MULT ? 3 : ratio > 1 ? 2 : 0;
}
function isthScore(e) {
  const t = val(e);
  const missing = [];
  const plt = t.PLT == null ? (missing.push("PLT"), null) : t.PLT < ISTH_PLT_2 ? 2 : t.PLT < ISTH_PLT_1 ? 1 : 0;
  const ddimer = isthDdimerPoints(e);
  if (ddimer == null) missing.push("DDIMER");
  const ctrl = e.hemostasis?.PT_CONTROL;
  const ctrlOk = ctrl?.value != null && (ctrl.unitState === "ok" || ctrl.unitState === "unknown");
  let pt = null;
  if (t.PT == null) missing.push("PT");
  else if (!ctrlOk) missing.push("PT_CONTROL");
  else {
    const d = t.PT - ctrl.value;
    pt = d >= ISTH_PT_OVER_CONTROL_2 ? 2 : d >= ISTH_PT_OVER_CONTROL_1 ? 1 : 0;
  }
  const fib = t.FIB == null ? (missing.push("FIB"), null) : t.FIB < ISTH_FIB_MGDL ? 1 : 0;
  const total = [plt, ddimer, pt, fib].reduce((s, x) => s + (x ?? 0), 0);
  return { plt, ddimer, pt, fib, total, missing };
}
export { factorBand, vwfRatio, isthScore, isthDdimerPoints, ISTH_OVERT_FROM, ISTH_DDIMER_MODERATE_NGML, ISTH_PLT_1, ISTH_PLT_2,
         FACTOR_SEVERE_BELOW_PCT, FACTOR_MODERATE_MAX_PCT, FACTOR_MILD_MAX_PCT };

// بارداری فقط برای زنِ در سنِ باروری معنا دارد. پیش‌تر جملهٔ «اگر باردار هستید» به مرد و زنِ ۷۸ ساله هم گفته می‌شد (۲۰۲۶-۱۰-۰۱).
// سن/جنسِ ناشناخته ⇒ true (جمله می‌ماند)؛ مرد، یا سنِ معلومِ < ۱۲ یا > ۵۵ ⇒ false. آستانه‌ها قراردادی‌اند و بازبین ببیند (P64).
export function canBePregnant(e) {
  if (e?.sex === "M") return false;
  const a = e?.age;
  if (typeof a === "number" && (a < 12 || a > 55)) return false;
  return true;
}
