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

// آیا یک تست ادراری (نامش با nameRe جور است) «مثبت/غیرطبیعی» است؟
// negative/trace/منفی را رد می‌کند. +1 به بالا یا positive/مثبت را می‌گیرد.
function urinePositive(e, nameRe, { traceCounts = false } = {}) {
  if (!e.qual) return false;
  return Object.entries(e.qual).some(([k, v]) => {
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

// آیا تصویر سندرم نفروتیک هست؟ (پروتئینوری شدید + آلبومین پایین)
function isNephrotic(e) {
  const protGrade = urineGrade(e, /protein|پروتئین/i);
  const heavyProt = protGrade != null && protGrade >= 3;
  const alb = e.graded.find((g) => g.test === "ALB");
  const albLow = alb?.abnormal && alb.dir === "low";
  return heavyProt && albLow;
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

// urgency: emergency | this_week | routine
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
export { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, has, CRP_RE, RF_RE };
