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
  return v === 0 ? "منفی" : `1/${v}`;
}

// نام‌های کیفیِ CRP و RF (پس از نرمال‌سازی). یک‌جا تعریف می‌شوند تا بین
// الگوها drift نکنند.
const CRP_RE = /^crp$|crpqual|crplatex|creactive|سیآرپی|پروتئینواکنشی/;
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
export const RULES = [
  // ═══════════ سرولوژی غربالگری (هپاتیت B/C، HIV) ═══════════
  // اصل CDC: یک نتیجه مثبت غربالگری هرگز تشخیص قطعی نیست.
  //   نتایج واکنش‌گر گاهی مثبت کاذب‌اند و همه نیاز به تست تأییدی دارند.
  // طراحی: سرتیتر خنثی (حریم خصوصی)، جزئیات و تست تأییدی در متن.
  //   نه blocks_others (نباید بقیه یافته‌ها را بپوشاند)، نه emergency (وحشت‌آفرین).

  {
    id: "hcv_screen_reactive",
    match: (e) => serologyReactive(e, /hcv|hepatitisc|هپاتیتc|آنتیبادیc/i),
    build: () => ({
      pattern: "hcv_ab_reactive",
      urgency: "this_week",
      // سرتیتر خنثی — نام بیماری در سرتیتر نمی‌آید
      headline: "یکی از تست‌های غربالگری شما نیاز به یک آزمایش تکمیلی دارد",
      must_say:
        "یکی از تست‌های غربالگری (آنتی‌بادی هپاتیت C) واکنش‌گر شده است. " +
        "این یک تست غربالگری است، نه تشخیص قطعی — و حتماً باید با یک آزمایش تکمیلی بررسی شود. " +
        "دو نکته مهم: اول اینکه گاهی این تست می‌تواند «مثبت کاذب» باشد یعنی فرد اصلاً عفونت ندارد. " +
        "دوم اینکه حتی اگر واقعی باشد، آنتی‌بادی مثبت می‌تواند نشان‌دهنده‌ی عفونت گذشته‌ای باشد که بدن از آن عبور کرده، نه لزوماً عفونت فعال. " +
        "برای روشن شدن قطعی، آزمایش تکمیلی لازم است.",
      // تست تأییدی مفصل با توضیح در suggest
      suggest: [
        "آزمایش HCV RNA (PCR) — این تست مشخص می‌کند که آیا ویروس همین حالا در خون فعال است یا نه؛ تنها راه تأیید عفونت فعلی همین است",
        "مراجعه به پزشک برای تفسیر درست و تعیین مراحل بعدی",
      ],
      warnings: [
        "تا وقتی آزمایش تکمیلی انجام نشده، نتیجه را قطعی نگیرید و نگران نشوید. این نتیجه به‌تنهایی تشخیص نیست.",
      ],
    }),
  },

  {
    id: "hbv_screen_reactive",
    // ⚠️ «hbs» تنها عمداً حذف شد: Anti-HBs (ایمنیِ واکسن) هم آن را جور می‌کرد و
    //    به فردِ واکسینه گفته می‌شد ممکن است هپاتیت B داشته باشد. فقط آنتی‌ژنِ
    //    سطحی — که نشانهٔ عفونت است — این قاعده را فعال می‌کند. Anti-HBc هم
    //    خارج است: تفسیرش با HBsAg یکی نیست.
    match: (e) => serologyReactive(
      e,
      /hbsag|hepatitisbsurface|هپاتیتb|استرالیا/i,
      /^anti|آنتیبادی/i,
    ),
    build: () => ({
      pattern: "hbsag_reactive",
      urgency: "this_week",
      headline: "یکی از تست‌های غربالگری شما نیاز به یک آزمایش تکمیلی دارد",
      must_say:
        "یکی از تست‌های غربالگری (آنتی‌ژن سطحی هپاتیت B یا HBsAg) واکنش‌گر شده است. " +
        "این یک تست غربالگری است، نه تشخیص قطعی. نتایج واکنش‌گر گاهی می‌توانند مثبت کاذب باشند، " +
        "و برای اطمینان حتماً باید با آزمایش‌های تکمیلی بررسی شوند. " +
        "این آزمایش‌ها همچنین مشخص می‌کنند که آیا عفونت تازه است یا مزمن، و چقدر فعال است.",
      suggest: [
        "تکرار HBsAg همراه با تست تأییدی تخصصی — برای رد کردن احتمال مثبت کاذب",
        "پنل کامل هپاتیت B (HBeAg، Anti-HBc، Anti-HBs) — برای تعیین مرحله و وضعیت عفونت",
        "آزمایش HBV DNA — برای اندازه‌گیری میزان فعالیت ویروس",
        "مراجعه به پزشک یا متخصص گوارش و کبد برای تفسیر و پیگیری",
      ],
      warnings: [
        "تا وقتی آزمایش‌های تکمیلی انجام نشده، نتیجه را قطعی نگیرید. این نتیجه به‌تنهایی تشخیص نیست.",
      ],
    }),
  },

  {
    id: "hiv_screen_reactive",
    match: (e) => serologyReactive(e, /hiv|ایدز|ایچآیوی/i),
    build: () => ({
      pattern: "hiv_screen_reactive",
      urgency: "this_week",
      // حریم خصوصی: سرتیتر کاملاً خنثی، هیچ نامی برده نمی‌شود
      headline: "یکی از تست‌های غربالگری شما نیاز به یک آزمایش تکمیلی دارد",
      must_say:
        "یکی از تست‌های غربالگری واکنش‌گر شده است و نیاز به بررسی تکمیلی دارد. " +
        "بسیار مهم است بدانید که این یک تست غربالگری است، نه تشخیص — و نتایج غربالگری واکنش‌گر گاهی مثبت کاذب هستند. " +
        "به همین دلیل، تأیید قطعی نیاز به آزمایش‌های تأییدی جداگانه دارد و هرگز از روی یک نتیجه‌ی مثبت نمی‌توان نتیجه‌گیری قطعی کرد. " +
        "آرام باشید و مرحله‌ی بعدی را با یک پزشک انجام دهید.",
      suggest: [
        "آزمایش تأییدی تخصصی که نوع دقیق را مشخص می‌کند (تست تفکیکی HIV-1/HIV-2) — برای رد کردن مثبت کاذب",
        "در صورت نیاز، آزمایش HIV RNA (بار ویروسی) — که مستقیماً وجود ویروس را می‌سنجد",
        "مراجعه به پزشک یا مراکز مشاوره‌ی مخصوص برای انجام تست تأییدی و راهنمایی محرمانه",
      ],
      warnings: [
        "این نتیجه به‌تنهایی تشخیص نیست. تا انجام آزمایش تأییدی، آن را قطعی در نظر نگیرید.",
      ],
    }),
  },

  // ═══════════ بروسلوز (تب مالت) ═══════════
  // آستانه‌ها: راهنمای کشوری تشخیص و درمان بروسلوز، وزارت بهداشت، ص ۴۰ —
  //   رایت ≥۱/۸۰، 2ME ≥۱/۴۰، کومبس رایت ≥۱/۴۰. عمداً از عددِ CDC (SAT ≥۱:۱۶۰)
  //   پایین‌تر است چون گونهٔ غالبِ انسانی در ایران B. melitensis است ولی آنتی‌ژنِ
  //   تست B. abortus، و عیارِ به‌دست‌آمده ≈ نصفِ رقمِ حقیقی (همان راهنما، ص ۳۴).
  //
  // فوریت هرگز emergency نیست: بروسلوز تحتِ‌حاد است و از روی سرولوژیِ تنها
  //   اورژانس نمی‌شود — ولی هفته‌ها آنتی‌بیوتیکِ ترکیبی می‌خواهد و درمان‌نشده
  //   به اندوکاردیت/اسپوندیلیت می‌رسد. پس this_week.
  {
    id: "brucella_active",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WRIGHT");
      const m = e.graded.find((g) => g.test === "ME2");
      const c = e.graded.find((g) => g.test === "COOMBS_WRIGHT");
      const wSig = w?.value >= 80;
      const mSig = m?.value >= 40;
      const cSig = c?.value >= 40;
      // تعریفِ موردِ فعال: (رایت باارزش + 2ME باارزش) یا (رایتِ زیرِ آستانه ولی کومبسِ باارزش)
      return (wSig && mSig) || (!wSig && cSig);
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WRIGHT");
      const m = e.graded.find((g) => g.test === "ME2");
      const c = e.graded.find((g) => g.test === "COOMBS_WRIGHT");
      const esr = e.graded.find((g) => g.test === "ESR");
      const wSig = w?.value >= 80;
      const blocked = !wSig && c?.value >= 40;
      const esrHigh = esr?.value > 40;
      const parts = [];
      if (w) parts.push(`رایت ${titreFa(w.value)}`);
      if (m) parts.push(`2ME ${titreFa(m.value)}`);
      if (c) parts.push(`کومبس رایت ${titreFa(c.value)}`);
      return {
        pattern: "brucella_active",
        urgency: "this_week",
        headline: "نتایج سرولوژی شما به تب مالت (بروسلوز) اشاره دارد",
        must_say:
          `${parts.join("، ")} گزارش شده. ` +
          "تب مالت عفونتی است که معمولاً از شیر و لبنیاتِ غیرپاستوریزه یا تماس با دام می‌گیرند. " +
          (blocked
            ? "نکتهٔ مهم اینجا این است که رایتِ ساده زیر آستانه مانده ولی کومبس رایت مثبت است؛ این حالت وقتی رخ می‌دهد که آنتی‌بادی‌های «بلوک‌کننده» جلوی واکنشِ رایت را می‌گیرند و بیشتر در شکل‌های طولانی‌شده دیده می‌شود. "
            : "مثبت بودنِ 2ME در کنار رایت، به‌سود عفونتِ فعال است — چون 2ME فقط IgG را می‌سنجد و در تب مالت همین IgG است که با بیماریِ فعال و علامت‌دار همراهی دارد. ") +
          (esrHigh ? `ESR شما هم ${esr.value} است؛ ESR بالای ۴۰ با درگیریِ موضعی مثل مهره یا مفصل همراهی دارد و باید جدی گرفته شود. ` : "") +
          "درمانِ تب مالت چند هفته آنتی‌بیوتیکِ ترکیبی است و نیمه‌کاره رها کردنش باعث عود می‌شود، پس حتماً زیر نظر پزشک انجام شود. " +
          "یک نکته که پزشک لازم دارد: تیترِ منفرد به‌تنهایی «عفونتِ فعال» را از «تماسِ قبلی» جدا نمی‌کند؛ آنچه ارزش دارد افزایشِ چهاربرابریِ تیتر در فاصلهٔ دو هفته است.",
        action:
          "این هفته حتماً به پزشک (ترجیحاً عفونی) مراجعه کنید و همین برگه را همراه ببرید. " +
          "حتماً بگویید آیا شیر یا پنیرِ محلیِ غیرپاستوریزه مصرف کرده‌اید، یا با دام (گوسفند، بز، گاو) تماس داشته‌اید، و آیا تب، تعریق شبانه، درد مفاصل و کمردرد دارید.",
        suggest: ["کشت خون", "تکرار تیتر پس از دو هفته", "CRP", "ESR"],
        warnings: [
          "درمان را خودسرانه شروع یا قطع نکنید؛ دورهٔ ناقص شایع‌ترین علتِ عودِ تب مالت است.",
          "اگر کمردردِ شدید، تنگی نفس یا تپش قلب داشتید زودتر مراجعه کنید — تب مالت گاهی مهره یا قلب را درگیر می‌کند.",
          "تا روشن شدن وضعیت، از مصرف لبنیاتِ غیرپاستوریزه پرهیز کنید و به سایر افراد خانواده هم بگویید.",
        ],
        ...(w?.value ? { key_number: w.value } : {}),
      };
    },
  },
  // رایتِ باارزش ولی 2ME زیر آستانه — تماسِ قبلی/عفونتِ خیلی زودرس، نه موردِ قطعی.
  {
    id: "brucella_wright_only",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WRIGHT");
      const m = e.graded.find((g) => g.test === "ME2");
      const c = e.graded.find((g) => g.test === "COOMBS_WRIGHT");
      return w?.value >= 80 && !(m?.value >= 40) && !(c?.value >= 40);
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WRIGHT");
      const m = e.graded.find((g) => g.test === "ME2");
      return {
        pattern: "brucella_wright_only",
        urgency: "this_week",
        headline: "تیتر رایت شما باارزش است ولی تصویر هنوز کامل نیست",
        must_say:
          `رایت ${titreFa(w.value)} گزارش شده که در ایران آستانهٔ باارزش (۱/۸۰) را رد کرده` +
          (m ? `، اما 2ME ${titreFa(m.value)} است و زیر آستانهٔ ۱/۴۰ مانده` : "، اما 2ME انجام نشده") +
          ". " +
          "این ترکیب یک تشخیصِ قطعیِ تب مالت نیست: رایتِ مثبتِ تنها می‌تواند از تماسِ قبلی، عفونتِ خیلی زودرس، یا واکنشِ متقاطع با باکتری‌های دیگر باشد. " +
          "در افرادی که با دام سروکار دارند، تیترِ پایدار بدون بیماریِ فعال شایع است. " +
          "راهِ روشن‌شدن، تکرارِ آزمایش پس از دو هفته و دیدنِ افزایشِ چهاربرابریِ تیتر است — نه قضاوت از روی همین یک نوبت.",
        action:
          "این هفته با پزشک مطرح کنید و دربارهٔ تکرارِ تیتر پس از دو هفته تصمیم بگیرید. " +
          "اگر تب، تعریق شبانه، درد مفاصل یا کمردرد دارید حتماً بگویید، و همچنین سابقهٔ مصرف لبنیاتِ غیرپاستوریزه یا تماس با دام.",
        suggest: ["2ME", "کومبس رایت", "تکرار تیتر پس از دو هفته"],
        warnings: [
          "بدون نظر پزشک آنتی‌بیوتیک شروع نکنید؛ درمانِ بی‌مورد هم عوارض دارد هم تفسیرِ آزمایش‌های بعدی را سخت می‌کند.",
        ],
        ...(w?.value ? { key_number: w.value } : {}),
      };
    },
  },

  // ═══════════ تحلیل ادرار (U/A) ═══════════
  // همه از e.qual خوانده می‌شوند. محتاطانه: الگو «مطرح می‌کند»، نه «تشخیص».

  // ── عفونت ادراری (UTI) ──
  // لکوسیت‌استراز مثبت + نیتریت مثبت + WBC بالا در ادرار = تصویر کلاسیک.
  {
    id: "uti_pattern",
    match: (e) => {
      const le = urinePositive(e, /leukocyte|استراز|esterase/i);
      const nit = urinePositive(e, /nitrite|نیتریت/i);
      const wbc = urineCellCount(e, /wbc|puscell|پوسسل|leukocyt/i);
      const wbcHigh = wbc != null && wbc > 5;
      // حداقل دو نشانه برای احتیاط
      return [le, nit, wbcHigh].filter(Boolean).length >= 2;
    },
    build: (e) => {
      const nit = urinePositive(e, /nitrite|نیتریت/i);
      return {
        pattern: "uti_likely",
        urgency: "this_week",
        headline: "الگوی آزمایش ادرار به یک عفونت ادراری اشاره دارد",
        must_say:
          "چند نشانه در آزمایش ادرار با هم دیده می‌شوند که معمولاً با عفونت ادراری همراه‌اند. " +
          (nit ? "مثبت بودن نیتریت اغلب به عفونت باکتریایی اشاره دارد. " : "") +
          "این نتیجه باید توسط پزشک تأیید شود و گاهی کشت ادرار برای مشخص شدن نوع باکتری لازم است.",
        action: "این هفته با پزشک مطرح کنید. اگر سوزش ادرار، تب یا درد پهلو دارید، زودتر مراجعه کنید.",
        suggest: ["کشت ادرار و آنتی‌بیوگرام — برای شناسایی باکتری و انتخاب داروی درست"],
        warnings: [
          "خودسرانه آنتی‌بیوتیک شروع نکنید — انتخاب و دوز درست را پزشک تعیین می‌کند.",
        ],
      };
    },
  },

  // ── باکتری در ادرار بدون نشانه‌ی عفونت ──
  // باکتری قابل‌توجه (many/moderate) ولی WBC نرمال و بدون لکوسیت‌استراز/نیتریت.
  // این معمولاً UTI واقعی نیست — اغلب آلودگی نمونه یا باکتریوری بی‌علامت.
  // فقط وقتی فعال می‌شود که UTI فعال نشده باشد.
  {
    id: "bacteriuria_no_inflammation",
    match: (e) => {
      // باکتری قابل‌توجه؟ (many یا moderate — few را نمی‌گیریم)
      const bactSignificant = Object.entries(e.qual || {}).some(
        ([k, v]) => /bacteria|باکتری/i.test(k) &&
                    /many|moderate|numerous|زیاد|فراوان|متوسط|\+{2,}/i.test(String(v))
      );
      if (!bactSignificant) return false;
      // نشانه‌های عفونت — اگر باشند، UTI فعال است و این الگو نباید بیاید
      const le = urinePositive(e, /leukocyte|استراز|esterase/i);
      const nit = urinePositive(e, /nitrite|نیتریت/i);
      const wbc = urineCellCount(e, /wbc|puscell|پوسسل|leukocyt/i);
      const wbcHigh = wbc != null && wbc > 5;
      const inflammation = [le, nit, wbcHigh].filter(Boolean).length >= 2;
      return !inflammation;
    },
    build: () => ({
      pattern: "bacteriuria_no_inflammation",
      urgency: "routine",
      headline: "در آزمایش ادرار شما باکتری دیده شده است",
      must_say:
        "در نمونه‌ی ادرار شما باکتری گزارش شده است. " +
        "یکی از دلایل شایع این موضوع می‌تواند آلوده شدن نمونه هنگام جمع‌آوری باشد — " +
        "مثلاً وقتی نمونه وسط ادرار و در ظرف استریل گرفته نشده باشد. " +
        "برای تفسیر درست، بهتر است با پزشک مطرح شود.",
      action: "اگر علامتی مثل سوزش، تکرر ادرار یا تب دارید، یا اگر باردار هستید، با پزشک مطرح کنید. گاهی تکرار آزمایش با نمونه‌ی درست کمک‌کننده است.",
      suggest: ["تکرار آزمایش ادرار با نمونه‌ی وسط ادرار (midstream) و ظرف استریل"],
      warnings: [
        "⚠️ اگر باردار هستید، وجود باکتری در ادرار حتی بدون علامت مهم است و باید حتماً با پزشک زنان مطرح شود.",
      ],
    }),
  },

  // ── پروتئینوری ──
  {
    id: "proteinuria_pattern",
    match: (e) => {
      const g = urineGrade(e, /protein|پروتئین/i);
      if (!(g != null && g >= 0.5)) return false;   // trace به بالا
      // اگر تصویر خاص‌تر (نفروتیک یا گلومرولونفریت) هست، واگذار کن
      if (isNephrotic(e) || isGlomerulonephritis(e)) return false;
      return true;
    },
    build: (e) => {
      const g = urineGrade(e, /protein|پروتئین/i);
      const pregWarn = "اگر باردار هستید، وجود پروتئین در ادرار — به‌خصوص همراه با فشار خون بالا — مهم است و باید بدون تأخیر با پزشک زنان مطرح کنید.";

      if (g <= 0.5) {
        // trace
        return {
          pattern: "proteinuria_trace",
          urgency: "routine",
          headline: "در آزمایش ادرار شما مقدار بسیار کمی پروتئین (رگه/trace) دیده شده است",
          must_say:
            "مقدار پروتئین در حد «رگه» (خیلی کم) است. این اغلب اهمیت زیادی ندارد و می‌تواند به‌خاطر کم‌آبی، تب، ورزش، یا غلیظ بودن نمونه باشد. " +
            "معمولاً با یک نمونه‌ی صبحگاهی تکرار می‌شود.",
          action: "نوبت عادی. اگر تکرار شد یا علامت دارید، با پزشک مطرح کنید.",
          suggest: ["تکرار آزمایش با نمونه‌ی اول صبح"],
          warnings: [pregWarn],
        };
      }

      if (g === 1) {
        // +1
        return {
          pattern: "proteinuria_1plus",
          urgency: "routine",
          headline: "در آزمایش ادرار شما پروتئین خفیف (+۱) دیده شده است",
          must_say:
            "مقدار پروتئین کم (حدود +۱) است. این می‌تواند علت‌های موقتی و بی‌خطر داشته باشد (تب، ورزش، کم‌آبی)، " +
            "ولی بهتر است تکرار و در صورت تداوم بررسی شود. یک نمونه‌ی تکی قطعی نیست.",
          action: "نوبت عادی. برای اطمینان تکرار و در صورت تداوم با پزشک مطرح کنید.",
          suggest: ["تکرار آزمایش ادرار", "نسبت آلبومین به کراتینین (ACR) در صورت تداوم"],
          warnings: [pregWarn],
        };
      }

      if (g === 2) {
        // +2
        return {
          pattern: "proteinuria_2plus",
          urgency: "this_week",
          headline: "در آزمایش ادرار شما پروتئین متوسط (+۲) دیده شده است",
          must_say:
            "مقدار پروتئین متوسط (حدود +۲) است. این باید با یک آزمایش دقیق‌تر تأیید شود تا مشخص شود چقدر پروتئین دفع می‌شود و آیا مربوط به کلیه است یا نه.",
          action: "این هفته با پزشک مطرح کنید.",
          suggest: [
            "نسبت آلبومین به کراتینین ادرار (ACR) — برای اندازه‌گیری دقیق",
            "بررسی عملکرد کلیه (کراتینین، eGFR)",
          ],
          warnings: [pregWarn],
        };
      }

      // +3 یا +4
      return {
        pattern: "proteinuria_heavy",
        urgency: "this_week",
        headline: "در آزمایش ادرار شما پروتئین قابل‌توجه (+۳ یا بیشتر) دیده شده است",
        must_say:
          "مقدار پروتئین در ادرار زیاد است. این حتماً باید توسط پزشک بررسی شود، چون می‌تواند نشانه‌ای از کار کلیه باشد. " +
          "یک آزمایش دقیق‌تر (ACR) و بررسی کلیه لازم است.",
        action: "این هفته با پزشک مطرح کنید. اگر همراه ورم پا/صورت، خون در ادرار، یا فشار خون بالا هستید، زودتر مراجعه کنید.",
        suggest: [
          "نسبت آلبومین به کراتینین ادرار (ACR)",
          "بررسی عملکرد کلیه (کراتینین، eGFR)",
          "بررسی توسط پزشک",
        ],
        warnings: [pregWarn],
      };
    },
  },

  // ── هماچوری (خون در ادرار) ──
  {
    id: "hematuria_pattern",
    match: (e) => {
      const blood = urinePositive(e, /urine\s*blood|ur\s*blood|خون\s*ادرار|hematuria/i);
      const rbc = urineCellCount(e, /rbc|گلبول\s*قرمز/i);
      const rbcHigh = rbc != null && rbc > 3;
      if (!(blood || rbcHigh)) return false;
      // اگر تصویر خاص‌تر (گلومرولونفریت) هست، واگذار کن
      if (isGlomerulonephritis(e)) return false;
      // رابدومیولیز: CK خیلی بالا + خون ادرار → آن الگو پوشش می‌دهد
      const ck = e.graded.find((g) => g.test === "CK");
      const ckVeryHigh = ck?.abnormal && ck.dir === "high" && ck.value > 1000;
      if (ckVeryHigh && blood) return false;
      return true;
    },
    build: () => ({
      pattern: "hematuria",
      urgency: "this_week",
      headline: "در آزمایش ادرار شما خون (گلبول قرمز) دیده شده است",
      must_say:
        "وجود خون در ادرار می‌تواند علت‌های متعددی داشته باشد — از عفونت و سنگ کلیه تا علل دیگر. " +
        "گاهی هم موقتی است (مثلاً در دوره‌ی قاعدگی نمونه آلوده می‌شود). یک نمونه به‌تنهایی قطعی نیست، ولی باید پیگیری شود.",
      action: "این هفته با پزشک مطرح کنید تا علت بررسی شود.",
      suggest: [
        "تکرار آزمایش ادرار (در خانم‌ها بهتر است خارج از دوره قاعدگی)",
        "کشت ادرار",
        "بررسی تصویربرداری کلیه و مجاری ادرار در صورت صلاحدید پزشک",
      ],
      warnings: [],
    }),
  },

  // ── گلوکوزوری (قند در ادرار) ──
  {
    id: "glycosuria_pattern",
    match: (e) => urinePositive(e, /urine\s*glucose|u\s*glucose|glucose\s*urine|قند\s*ادرار|گلوکز\s*ادرار|ur\s*glucose/i),
    build: () => ({
      pattern: "glycosuria",
      urgency: "this_week",
      headline: "در آزمایش ادرار شما قند دیده شده است",
      must_say:
        "وجود قند در ادرار معمولاً وقتی رخ می‌دهد که قند خون بالا رفته باشد و کلیه بخشی از آن را دفع کند. " +
        "این می‌تواند سرنخی از دیابت کنترل‌نشده باشد، ولی گاهی علل دیگری هم دارد. باید با آزمایش قند خون بررسی شود.",
      action: "این هفته با پزشک مطرح کنید و آزمایش قند خون بدهید.",
      suggest: [
        "قند خون ناشتا (FBS)",
        "HbA1c — میانگین قند سه ماه اخیر",
        "قند دو ساعته در صورت صلاحدید پزشک",
      ],
      warnings: [],
    }),
  },

  // ── کتونوری (کتون در ادرار) ──
  {
    id: "ketonuria_pattern",
    match: (e) => {
      const g = urineGrade(e, /ketone|کتون/i);
      return g != null && g >= 1;   // +1 به بالا (trace کتون معمولاً نادیده)
    },
    build: (e) => {
      const g = urineGrade(e, /ketone|کتون/i);
      const glu = urinePositive(e, /urine\s*glucose|u\s*glucose|قند\s*ادرار|گلوکز\s*ادرار/i);
      const heavy = g >= 3;   // +3

      // پایه‌ی توضیح مشترک
      const base =
        "کتون‌ها وقتی در ادرار ظاهر می‌شوند که بدن به‌جای قند از چربی برای انرژی استفاده کند — " +
        "مثلاً در روزه‌داری، گرسنگی، رژیم کم‌کربوهیدرات، یا استفراغ. ";

      // اگر کتون + قند ادرار → مهم‌تر (احتمال زمینه‌ی دیابتی)
      if (glu) {
        return {
          pattern: "ketonuria_with_glucose",
          urgency: "this_week",
          headline: `در آزمایش ادرار شما کتون (${g === 1 ? "+۱" : g === 2 ? "+۲" : "+۳"}) همراه با قند دیده شده است`,
          must_say:
            base +
            "چون قند ادرار هم مثبت است، این ترکیب در افراد دیابتی می‌تواند مهم باشد و نیاز به بررسی دارد.",
          action: "این هفته با پزشک مطرح کنید، به‌خصوص اگر دیابت دارید.",
          suggest: ["قند خون", "بررسی وضعیت دیابت با پزشک"],
          warnings: [
            "اگر دیابت دارید و علائمی مثل تشنگی شدید، تنفس تند یا تهوع دارید، فوراً به پزشک مراجعه کنید.",
          ],
        };
      }

      if (heavy) {
        // کتون زیاد بدون قند
        return {
          pattern: "ketonuria_heavy",
          urgency: "this_week",
          headline: "در آزمایش ادرار شما کتون قابل‌توجه (+۳) دیده شده است",
          must_say:
            base +
            "مقدار کتون زیاد است. اگر به‌خاطر روزه‌داری یا رژیم باشد معمولاً با غذا خوردن برطرف می‌شود، " +
            "ولی مقدار زیاد بهتر است با پزشک بررسی شود — به‌خصوص اگر دیابت دارید یا حالتان خوب نیست.",
          action: "این هفته با پزشک مطرح کنید. اگر دیابت دارید یا علائمی مثل تهوع و تنفس تند دارید، زودتر مراجعه کنید.",
          suggest: ["قند خون", "تکرار آزمایش در حالت عادی"],
          warnings: [],
        };
      }

      // کتون +1 یا +2 بدون قند → معمولاً خفیف
      return {
        pattern: "ketonuria",
        urgency: "routine",
        headline: `در آزمایش ادرار شما کتون (${g === 1 ? "+۱" : "+۲"}) دیده شده است`,
        must_say:
          base +
          "معمولاً اگر علت آن روزه‌داری یا رژیم باشد، خطرناک نیست.",
        action: "اگر ناشتا نبوده‌اید یا رژیم خاصی ندارید، با پزشک مطرح کنید.",
        suggest: ["تکرار آزمایش در حالت عادی (نه ناشتای طولانی)"],
        warnings: [],
      };
    },
  },

  // ═══════════ پرچم قرمز ═══════════
  {
    id: "troponin_positive",
    match: (e) => {
      // کیفی: کلمه‌ی مثبت در qual
      const qualPos = Object.entries(e.qual).some(
        ([k, v]) => /troponin|ctn[it]|hs.?ctn|cardiac.?troponin/i.test(k) && /positive|مثبت|reactive|واکنش/i.test(v)
      );
      // عددی: TROPONIN_I بالای حد مرجع (از graded)
      const trop = e.graded.find((g) => g.test === "TROPONIN_I");
      const numHigh = trop?.abnormal && trop.dir === "high";
      return qualPos || numHigh;
    },
    build: () => ({
      pattern: "troponin_positive",
      urgency: "emergency",
      headline: "یکی از نتایج نیاز به رسیدگی فوری دارد",
      must_say: "تروپونین پروتئینی است که هنگام آسیب عضلهٔ قلب وارد خون می‌شود؛ مثبت بودن آن می‌تواند نشانهٔ یک مشکل حاد قلبی باشد و باید همین حالا بررسی شود.",
      action: "همین حالا به اورژانس مراجعه کنید. این برگه را همراه ببرید.",
      suggest: [],
      blocks_others: true,   // بقیه یافته‌ها زیر این می‌روند
    }),
  },
  {
    id: "dic_pattern",
    match: (e) => isDIC(e),
    build: (e) => {
      const t = val(e);
      const d = e.graded.find((g) => g.test === "DDIMER");
      // فقط شاخص‌هایی را نام ببر که واقعاً غیرطبیعی‌اند (چون تریگرِ ISTH ممکن است
      // بدون پایین بودنِ فیبرینوژن هم فعال شود).
      const parts = [];
      if (t.PLT != null && t.PLT < 100) parts.push("پلاکت پایین");
      if (t.PT != null && t.PT > 15) parts.push("طولانی شدن زمان انعقاد (PT)");
      if (t.FIB != null && t.FIB < 150) parts.push("فیبرینوژن پایین");
      if (d?.abnormal && d.dir === "high") parts.push("D-dimer بالا");
      return {
        pattern: "possible_DIC",
        urgency: "emergency",
        headline: "چند شاخص لخته شدن خون همزمان غیرطبیعی است",
        must_say:
          `${parts.join("، ")} با هم می‌توانند نشانهٔ یک اختلال جدی انعقاد باشند که همزمان لخته و خونریزی ایجاد می‌کند. این ترکیب نیاز به بررسی فوری دارد.`,
        action: "همین امروز به اورژانس مراجعه کنید.",
        suggest: [],
        blocks_others: true,
      };
    },
  },
  // دی‌دایمرِ بالای تنها — وقتی تصویر DIC نباشد. باینری است و هیچ الگویی
  // برنمی‌داشتش، پس «خوانده می‌شد ولی تفسیر نداشت». D-dimer غیراختصاصی است:
  // فوریت this_week با لحن اطمینان‌بخش + هشدارِ علائم لخته.
  {
    id: "d_dimer_elevated",
    match: (e) => {
      const d = e.graded.find((g) => g.test === "DDIMER");
      if (!(d?.abnormal && d.dir === "high")) return false;
      return !isDIC(e);   // اگر DIC فعال است، آن الگوی اورژانسی پوشش می‌دهد
    },
    build: (e) => {
      const d = e.graded.find((g) => g.test === "DDIMER");
      return {
        pattern: "d_dimer_elevated",
        urgency: "this_week",
        // حتی وقتی یک یافتهٔ اورژانسیِ دیگر (blocks_others) فعال است، دی‌دایمر
        // نباید کاملاً پنهان شود — زیر اورژانس نسخهٔ کوتاه (brief) نمایش داده می‌شود.
        always_show: true,
        headline: "شاخص D-dimer خون شما بالاتر از حد طبیعی است",
        must_say:
          `مقدار D-dimer شما ${d.value} است (حد طبیعی ${d.range}). ` +
          "D-dimer وقتی بالا می‌رود که در بدن لخته‌ای ساخته و سپس تجزیه شده باشد. " +
          "اما این شاخص «غیراختصاصی» است و به دلایل بی‌خطر بسیاری هم بالا می‌رود — مانند بارداری، سن بالا، التهاب یا عفونت، و جراحی یا آسیب اخیر. " +
          "بنابراین D-dimer بالا به‌تنهایی به معنای وجود لختهٔ خطرناک نیست و باید در کنار علائم شما و نظر پزشک تفسیر شود. ارزش اصلی این تست وقتی است که نتیجه‌اش طبیعی باشد و لخته را کنار بگذارد.",
        // نسخهٔ کوتاه برای وقتی زیر یک اورژانسِ مهم‌تر نمایش داده می‌شود.
        brief:
          `شاخص D-dimer شما هم بالاتر از حد طبیعی است (${d.value}، حد طبیعی ${d.range}). ` +
          "این یک شاخص غیراختصاصی است و باید در کنار موارد فوریِ بالا توسط پزشک بررسی شود.",
        action: "این هفته با پزشک مطرح کنید تا در کنار شرح‌حال شما بررسی شود.",
        suggest: ["بررسی توسط پزشک برای تفسیر در کنار علائم بالینی"],
        warnings: [
          "اگر همین حالا نشانه‌های احتمالِ لخته دارید — تورم، درد یا قرمزیِ یک‌طرفهٔ ساق پا، یا تنگی نفس ناگهانی، درد قفسهٔ سینه و سرفهٔ خونی — منتظر نمانید و فوراً به اورژانس مراجعه کنید.",
        ],
      };
    },
  },

  // ═══════════ لکوسیتوز شدید — پرچم قرمز ═══════════
  // 🔴 این قاعده نبود و WBC=258 «طبیعی» گزارش شد.
  {
    id: "extreme_leukocytosis",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return w?.abnormal && w.dir === "high" && w.value >= 50;
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return {
        pattern: "extreme_leukocytosis",
        urgency: "emergency",
        headline: "تعداد گلبول‌های سفید خون شما بسیار بالاست",
        must_say:
          `گلبول سفید ${w.value} است — چندین برابر حد بالای طبیعی (${w.range}). ` +
          "این عدد نیاز به بررسی فوری توسط پزشک دارد." +
          (e.diffFailed
            ? " دستگاه نتوانست انواع گلبول سفید را بشمارد — این خودش نشانه‌ی همان مشکل است و لام دستی لازم دارد."
            : ""),
        action: "همین امروز به پزشک یا اورژانس مراجعه کنید. این برگه را همراه ببرید.",
        suggest: [],
        warnings: [],
        blocks_others: true,
      };
    },
  },
  {
    id: "leukocytosis",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return w?.abnormal && w.dir === "high" && w.value < 50;
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      const marked = w.value >= 20;
      return {
        pattern: "leukocytosis",
        urgency: marked ? "this_week" : "routine",
        headline: "تعداد گلبول‌های سفید خون شما بالاتر از حد طبیعی است",
        must_say:
          `گلبول سفید شما ${w.value} است (حد طبیعی ${w.range}). ` +
          "گلبول سفید بالا اغلب پاسخ بدن به عفونت یا التهاب است؛ استرس، ورزش شدید یا برخی داروها (مثل کورتون) هم موقتاً آن را بالا می‌برند. " +
          (marked
            ? "این افزایش قابل‌توجه است و بهتر است زودتر بررسی شود."
            : "یک آزمایش به‌تنهایی علت را مشخص نمی‌کند؛ روند آن در تکرار مهم‌تر است."),
        action: marked ? "این هفته با پزشک وقت بگیرید." : "نوبت عادی با پزشک.",
        suggest: ["CRP", "تکرار CBC"],
        warnings: [],
      };
    },
  },
  {
    id: "leukopenia",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      return w?.abnormal && w.dir === "low";
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WBC");
      const severe = w.value < 2;
      return {
        pattern: "leukopenia",
        urgency: severe ? "emergency" : "this_week",
        headline: "تعداد گلبول‌های سفید خون شما کم است",
        must_say: severe
          ? `گلبول سفید شما ${w.value} است — خیلی کم (حد طبیعی ${w.range}). توان بدن برای مقابله با عفونت کاهش یافته و همین باعث اهمیت فوری آن است.`
          : `گلبول سفید شما ${w.value} است (حد طبیعی ${w.range}). ` +
            "گلبول سفید دفاع بدن در برابر عفونت است؛ کم بودن خفیف آن می‌تواند موقت باشد (مثلاً پس از یک عفونت ویروسی یا با برخی داروها) یا نیاز به بررسی مغز استخوان داشته باشد. تکرار آزمایش معمولاً اولین قدم است.",
        action: severe
          ? "همین امروز با پزشک تماس بگیرید. اگر تب دارید، فوراً به اورژانس بروید."
          : "این هفته با پزشک وقت بگیرید.",
        suggest: ["تکرار CBC", "شمارش افتراقی"],
        warnings: severe ? ["اگر تب کردید، منتظر نمانید — همان ساعت به اورژانس بروید."] : [],
        blocks_others: severe,
      };
    },
  },
  {
    id: "severe_neutropenia",
    match: (e) => {
      const n = e.graded.find((g) => g.test === "NEUT_ABS");
      return n?.abnormal && n.dir === "low" && n.value < 500;
    },
    build: () => ({
      pattern: "severe_neutropenia",
      urgency: "emergency",
      headline: "یکی از انواع گلبول سفید بسیار کم است",
      must_say:
        "نوتروفیل — سلولی که با عفونت باکتریایی مقابله می‌کند — بسیار کم است. " +
        "این وضعیت نیاز به رسیدگی فوری دارد.",
      action: "همین امروز به پزشک مراجعه کنید. اگر تب دارید، به اورژانس بروید.",
      suggest: [],
      warnings: ["از تماس با افراد بیمار و مکان‌های شلوغ پرهیز کنید تا پزشک را ببینید."],
      blocks_others: true,
    }),
  },
  {
    id: "severe_thrombocytopenia",
    match: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return p?.abnormal && p.dir === "low" && p.value < 50;
    },
    build: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return {
        pattern: "severe_thrombocytopenia",
        urgency: "emergency",
        headline: "پلاکت خون شما بسیار کم است",
        must_say:
          `پلاکت ${p.value} است. پلاکت سلولی است که جلوی خونریزی را می‌گیرد.`,
        action: "همین امروز به پزشک یا اورژانس مراجعه کنید.",
        suggest: [],
        warnings: [
          "آسپرین یا مسکن‌های ضدالتهاب مصرف نکنید.",
          "اگر خونریزی، کبودی بی‌دلیل یا نقطه‌های قرمز روی پوست دیدید، فوراً به اورژانس بروید.",
        ],
        blocks_others: true,
      };
    },
  },
  {
    id: "thrombocytopenia",
    match: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return p?.abnormal && p.dir === "low" && p.value >= 50;
    },
    build: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return {
        pattern: "thrombocytopenia",
        urgency: "this_week",
        headline: "پلاکت خون شما کمتر از حد طبیعی است",
        must_say:
          `پلاکت شما ${p.value} است (حد طبیعی ${p.range}). ` +
          "پلاکت‌ها جلوی خونریزی را می‌گیرند. کاهش خفیف اغلب علت موقتی دارد (عفونت ویروسی، برخی داروها) و باید فقط پیگیری شود؛ خطر خونریزی معمولاً وقتی جدی می‌شود که پلاکت خیلی پایین‌تر بیاید.",
        action: "این هفته با پزشک وقت بگیرید.",
        suggest: ["تکرار CBC"],
        warnings: ["اگر خونریزی یا کبودی بی‌دلیل دیدید، زودتر مراجعه کنید."],
      };
    },
  },
  {
    id: "thrombocytosis",
    match: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return p?.abnormal && p.dir === "high";
    },
    build: (e) => {
      const p = e.graded.find((g) => g.test === "PLT");
      return {
        pattern: "thrombocytosis",
        urgency: "routine",
        headline: "پلاکت خون شما بالاتر از حد طبیعی است",
        must_say:
          `پلاکت شما ${p.value} است (حد طبیعی ${p.range}). ` +
          "پلاکت بالا در بیشتر موارد یک واکنش موقت بدن است — به التهاب، عفونت، کمبود آهن، یا پس از خونریزی (به این حالت «واکنشی» می‌گویند). کمتر پیش می‌آید که از خود مغز استخوان باشد. تکرار آزمایش و بررسی آهن معمولاً تصویر را روشن می‌کند.",
        action: "نوبت عادی با پزشک.",
        suggest: ["CRP", "فریتین", "تکرار CBC"],
        warnings: [],
      };
    },
  },
  {
    id: "pancytopenia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      return (
        hgb?.abnormal && hgb.dir === "low" &&
        t.WBC != null && t.WBC < 4 &&
        t.PLT != null && t.PLT < 150
      );
    },
    build: () => ({
      pattern: "pancytopenia",
      urgency: "emergency",
      headline: "هر سه نوع سلول خونی کمتر از حد طبیعی هستند",
      must_say:
        "گلبول قرمز، گلبول سفید و پلاکت — هر سه پایین هستند. " +
        "وقتی هر سه ردهٔ سلولی با هم افت می‌کنند، معمولاً مشکل از خودِ مغز استخوان (کارخانهٔ ساخت سلول‌های خونی) یا تخریب گستردهٔ آن‌هاست و نیاز به بررسی فوری دارد.",
      action: "همین امروز با پزشک تماس بگیرید.",
      suggest: [],
      warnings: [],
      blocks_others: true,
    }),
  },

  {
    id: "sepsis_markers",
    match: (e) => {
      const t = val(e);
      return (t.LACTATE != null && t.LACTATE >= 4) ||
             (t.PCT_SEPSIS != null && t.PCT_SEPSIS >= 2);
    },
    build: (e) => {
      const t = val(e);
      return {
        pattern: "sepsis_markers",
        urgency: "emergency",
        headline: "نشانگرهای عفونت شدید در خون شما بالاست",
        must_say:
          (t.LACTATE >= 4 ? `لاکتات ${t.LACTATE} است. ` : "") +
          (t.PCT_SEPSIS >= 2 ? `پروکلسی‌تونین ${t.PCT_SEPSIS} است. ` : "") +
          "این اعداد نیاز به رسیدگی فوری دارند.",
        action: "همین حالا به اورژانس مراجعه کنید. این برگه را همراه ببرید.",
        suggest: [],
        warnings: [],
        blocks_others: true,
      };
    },
  },
  {
    id: "severe_acidosis",
    match: (e) => {
      const t = val(e);
      const acidotic = (t.HCO3 != null && t.HCO3 < 15) || (t.PH != null && t.PH < 7.25);
      if (!acidotic) return false;
      // اگر تصویر کتواسیدوز دیابتی کامل است (گلوکز بالا + کتون)،
      // به الگوی اختصاصی DKA واگذار کن که پیام دقیق‌تری دارد.
      const gluHigh = (t.GLU_F != null && t.GLU_F >= 250) ||
                      (t.GLU_RANDOM != null && t.GLU_RANDOM >= 250);
      const ketone = urinePositive(e, /ketone|کتون|hydroxybutyrate|بتاهیدروکسی/i);
      if (gluHigh && ketone) return false;
      return true;
    },
    build: () => ({
      pattern: "severe_acidosis",
      urgency: "emergency",
      headline: "تعادل اسید و باز خون شما به‌هم خورده است",
      must_say:
        "خون شما بیش از حد اسیدی شده است (بی‌کربنات خیلی پایین یا pH پایین). این می‌تواند از دیابت کنترل‌نشده، مشکل کلیه، یا کاهش اکسیژن‌رسانی به بافت‌ها باشد و نیاز به رسیدگی فوری دارد.",
      action: "همین حالا به اورژانس مراجعه کنید.",
      suggest: [],
      warnings: [],
      blocks_others: true,
    }),
  },

  // ═══════════ شکاف آنیونی بالا ═══════════
  // Na − (Cl + HCO3) > 12. قاعدهٔ افزایشی: اسیدوزِ با آنیون‌گپ بالا را حتی وقتی
  // HCO3 فقط کمی پایین است می‌گیرد. اگر DKA/اسیدوز شدید (اورژانس، blocks_others)
  // فعال باشند، این یافتهٔ this_week به‌طور خودکار زیر آن‌ها پنهان می‌شود.
  {
    id: "high_anion_gap",
    match: (e) => {
      const ag = e.indices.anion_gap_corr ?? e.indices.anion_gap;
      return ag != null && ag > 12;
    },
    build: (e) => {
      const ag = e.indices.anion_gap_corr ?? e.indices.anion_gap;
      return {
        pattern: "high_anion_gap",
        urgency: "this_week",
        headline: "شکاف آنیونی خون شما بالاتر از حد معمول است",
        ...(ag != null ? { key_number: ag } : {}),
        must_say:
          `شکاف آنیونی (محاسبه‌ای از روی املاح خون) حدود ${ag} است، بالاتر از حد معمول (~۱۲). ` +
          "این می‌تواند نشانهٔ تجمع اسید در بدن باشد — از علل شایع آن قند خیلی بالا (کتواسیدوز)، " +
          "کاهش کار کلیه، یا اسید لاکتیک است. باید توسط پزشک بررسی شود.",
        action: "این هفته با پزشک مطرح کنید. اگر تنفس تند، گیجی یا حال عمومی بد دارید، زودتر مراجعه کنید.",
        suggest: ["بررسی توسط پزشک", "قند خون", "عملکرد کلیه", "لاکتات در صورت صلاحدید"],
        warnings: [],
      };
    },
  },

  // ═══════════ الکترولیت‌ها ═══════════

  // ── پتاسیم (مهم‌ترین: خطر آریتمی قلبی) ──
  {
    id: "potassium_critical",
    match: (e) => {
      const t = val(e);
      return t.K != null && (t.K >= 6.0 || t.K <= 2.9);
    },
    build: (e) => {
      const t = val(e);
      const kg = e.graded.find((g) => g.test === "K");
      const high = t.K >= 6.0;
      const veryHigh = t.K >= 6.0;   // مقدار بحرانی/پنیک پتاسیم در اغلب آزمایشگاه‌ها ≥ ۶.۰ است
      const veryLow = t.K <= 2.5;
      const critical = veryHigh || veryLow;
      const rangeTxt = kg?.range ? ` (حد طبیعی ${kg.range})` : "";
      return {
        pattern: high ? "hyperkalemia" : "hypokalemia",
        urgency: critical ? "emergency" : "this_week",
        blocks_others: critical,
        ...(t.K != null ? { key_number: t.K } : {}),
        headline: high
          ? "پتاسیم خون شما بالاست"
          : "پتاسیم خون شما پایین است",
        must_say:
          `پتاسیم خون شما ${t.K}${rangeTxt} است و ${high ? "بالاتر" : "پایین‌تر"} از حد طبیعی قرار دارد. ` +
          "پتاسیم جریان برقی‌ای را که ضربان قلب را تنظیم می‌کند کنترل می‌کند؛ " +
          (high
            ? "پتاسیمِ خیلی بالا می‌تواند ضربان قلب را کند یا بی‌نظم کند و در حد بحرانی خطر ایست قلبی دارد"
            : "پتاسیمِ خیلی پایین باعث ضعف عضلانی و بی‌نظمی ضربان قلب می‌شود") +
          (critical ? " — و در این حد نیاز به رسیدگی فوری دارد." : "، پس باید بررسی شود."),
        action: critical
          ? "همین حالا به اورژانس مراجعه کنید. این برگه را همراه ببرید."
          : "این هفته با پزشک مطرح کنید. اگر تپش قلب، ضعف شدید یا بی‌حسی دارید، زودتر مراجعه کنید.",
        suggest: critical
          ? []
          : [
              "تکرار آزمایش پتاسیم (نمونهٔ همولیزشده می‌تواند پتاسیم را کاذب بالا نشان دهد)",
              "نوار قلب در صورت صلاحدید پزشک",
            ],
        warnings: [],
      };
    },
  },

  // ── سدیم ──
  {
    id: "sodium_critical",
    match: (e) => {
      const t = val(e);
      return t.NA != null && (t.NA >= 155 || t.NA <= 125);
    },
    build: (e) => {
      const t = val(e);
      const nag = e.graded.find((g) => g.test === "NA");
      const high = t.NA >= 155;
      const critical = t.NA >= 160 || t.NA <= 120;
      const rangeTxt = nag?.range ? ` (حد طبیعی ${nag.range})` : "";
      const corrNote = e.indices.na_correction_applied
        ? ` (این مقدار به‌خاطر قند خیلی بالا تصحیح شده؛ عددِ اندازه‌گیری‌شده روی برگه ${e.indices.na_measured} است.)`
        : "";
      return {
        pattern: high ? "hypernatremia" : "hyponatremia",
        urgency: critical ? "emergency" : "this_week",
        blocks_others: critical,
        ...(t.NA != null ? { key_number: t.NA } : {}),
        headline: high
          ? "سدیم خون شما بالاست"
          : "سدیم خون شما پایین است",
        must_say:
          `سدیم خون شما ${t.NA}${rangeTxt} است. ` +
          (high
            ? "سدیم بالاتر از حد طبیعی اغلب یعنی بدن نسبت به آب، نمک بیش‌ازحد دارد (معمولاً کم‌آبی یا کم‌نوشیدن آب). "
            : "سدیم پایین‌تر از حد طبیعی یعنی نسبت آب به نمک بدن به‌هم خورده؛ علت‌های مختلفی دارد (از مصرف بعضی داروها تا مشکل کلیه/قلب/هورمونی). ") +
          "چون سدیم تعادل آب داخل و بیرون سلول‌های مغز را تنظیم می‌کند، تغییر شدید یا سریع آن می‌تواند باعث ورم یا کم‌آبیِ مغز و در نتیجه گیجی و تشنج شود" +
          (critical ? " — و در این حد نیاز به رسیدگی فوری دارد." : " و باید بررسی شود.") +
          corrNote,
        action: critical
          ? "همین حالا به اورژانس مراجعه کنید. اگر گیجی، سردرد شدید یا تشنج رخ داد، فوری‌تر."
          : "این هفته با پزشک مطرح کنید.",
        suggest: critical ? [] : ["تکرار آزمایش سدیم", "بررسی توسط پزشک"],
        warnings: critical
          ? ["اصلاح سدیم باید آهسته و زیر نظر پزشک باشد؛ خودسرانه مقدار زیاد آب یا نمک مصرف نکنید."]
          : [],
      };
    },
  },

  // ── کلسیم ──
  // ⚠️ قبلاً فقط CA≥13 یا ≤7.0 قاعده داشت؛ هایپر/هایپوکلسمیِ متوسط (گرید ۱–۲)
  //    به unmatched_abnormal می‌افتاد و «توضیح آماده نداریم» + urgency پایین می‌داد.
  //    حالا هر کلسیمِ غیرطبیعی پوشش دارد، با فوریتِ متناسبِ گرید CTCAE.
  {
    id: "calcium_abnormal",
    match: (e) => {
      const ca = e.graded.find((g) => g.test === "CA");
      return ca?.abnormal === true;
    },
    build: (e) => {
      const ca = e.graded.find((g) => g.test === "CA");
      const v = ca.value;
      const high = ca.dir === "high";
      const grade = ca.ctcaeGrade ?? 0;
      const critical = v >= 14 || v <= 6.5;      // نیاز به اورژانس
      const corrNote = e.indices.ca_correction_applied
        ? ` (این مقدار با آلبومین تصحیح شده؛ اندازه‌گیری‌شده روی برگه ${e.indices.ca_measured}.)`
        : "";
      // فوریت: بحرانی→اورژانس، متوسط/شدید (گرید ۲+)→این هفته، خفیف (گرید ۱)→عادی
      const urgency = critical ? "emergency" : (grade >= 2 ? "this_week" : "routine");
      const mild = urgency === "routine";
      const rangeTxt = ca?.range ? ` (حد طبیعی ${ca.range})` : "";
      return {
        pattern: high ? "hypercalcemia" : "hypocalcemia",
        urgency,
        blocks_others: critical,
        ...(v != null ? { key_number: v } : {}),
        headline: high ? "کلسیم خون شما بالاست" : "کلسیم خون شما پایین است",
        must_say:
          `کلسیم خون شما ${v}${rangeTxt} است و ${high ? "بالاتر" : "پایین‌تر"} از حد طبیعی قرار دارد. ` +
          (high
            ? "شایع‌ترین علت‌های کلسیم بالا پرکاری غدهٔ پاراتیروئید و بعضی بیماری‌ها هستند و حتماً باید علت‌یابی شود. "
            : "کلسیم پایین می‌تواند از کمبود ویتامین D، مشکل پاراتیروئید یا کاهش منیزیم باشد. ") +
          "کلسیم علاوه بر استخوان، در انقباض عضله، کار اعصاب و ضربان قلب نقش دارد؛ به همین دلیل تغییر زیاد آن می‌تواند باعث گرفتگی عضلانی یا بی‌نظمی ضربان قلب شود" +
          (critical ? " — و در این حد نیاز به رسیدگی فوری دارد." : ".") +
          corrNote,
        action: critical
          ? "همین حالا به اورژانس مراجعه کنید."
          : mild
            ? "با پزشک مطرح کنید تا علت بررسی شود."
            : "این هفته با پزشک مطرح کنید. اگر گرفتگی عضلانی، بی‌حسی دور دهان یا تشنج دارید، زودتر.",
        suggest: critical
          ? []
          : high
            ? ["تکرار کلسیم", "آلبومین (برای تصحیح کلسیم)", "هورمون پاراتیروئید (PTH)", "بررسی توسط پزشک"]
            : ["تکرار کلسیم", "آلبومین (برای تصحیح کلسیم)", "ویتامین D", "منیزیم", "بررسی توسط پزشک"],
        warnings: [],
      };
    },
  },

  // ── الگوی زنجیره‌ای منیزیم ──
  // نکته بالینی مهم (کیس Alyssa): منیزیم پایین می‌تواند باعث پتاسیم و
  //   کلسیم پایینِ مقاوم به درمان شود — تا منیزیم اصلاح نشود بقیه درست نمی‌شوند.
  {
    id: "magnesium_depletion",
    match: (e) => {
      const t = val(e);
      const mg = e.graded.find((g) => g.test === "MG");
      const mgLow = mg?.abnormal && mg.dir === "low";
      if (!mgLow) return false;
      // همراه با پتاسیم یا کلسیم پایین
      const k = e.graded.find((g) => g.test === "K");
      const ca = e.graded.find((g) => g.test === "CA");
      const kLow = k?.abnormal && k.dir === "low";
      const caLow = ca?.abnormal && ca.dir === "low";
      return kLow || caLow;
    },
    build: (e) => {
      const mg = e.graded.find((g) => g.test === "MG");
      const k = e.graded.find((g) => g.test === "K");
      const ca = e.graded.find((g) => g.test === "CA");
      const kLow = k?.abnormal && k.dir === "low";
      const caLow = ca?.abnormal && ca.dir === "low";
      const both = [kLow && "پتاسیم", caLow && "کلسیم"].filter(Boolean).join(" و ");
      // Table 11.15 (Mistler, «Electrolytes»): کم‌بودِ منیزیم به‌ویژه با پتاسیمِ
      //   پایین، خطرِ آریتمی قلبی و تشدیدِ مسمومیت با دیجوکسین را بالا می‌برد.
      return {
        pattern: "magnesium_depletion_pattern",
        urgency: "this_week",
        headline: "منیزیم خون شما پایین است و ممکن است روی سایر املاح اثر گذاشته باشد",
        must_say:
          `منیزیم خون شما ${mg.value} است (حد طبیعی ${mg.range}) و همراه آن ${both} هم پایین است. ` +
          "نکته‌ی مهم این است که وقتی منیزیم کم باشد، بدن نمی‌تواند این املاح دیگر را به‌درستی متعادل کند — " +
          "و معمولاً تا منیزیم اصلاح نشود، بقیه هم درست نمی‌شوند (اصلاحِ منیزیم اغلب خودش پتاسیم و کلسیم را هم درست می‌کند). این نکته برای پزشک مهم است.",
        action: "این هفته با پزشک مطرح کنید و حتماً به پایین بودن منیزیم اشاره کنید.",
        suggest: ["اصلاح منیزیم پیش از سایر املاح", "تکرار پنل الکترولیت", "بررسی توسط پزشک"],
        warnings: [
          ...(kLow
            ? ["پایین بودنِ همزمانِ منیزیم و پتاسیم خطرِ بی‌نظمیِ ضربان قلب را بالا می‌برد؛ اگر تپش قلب، ضربان نامنظم یا سرگیجه دارید زودتر مراجعه کنید."]
            : []),
          "اگر داروی قلبیِ دیگوکسین (دیجیتال) مصرف می‌کنید، منیزیمِ پایین سمّیتِ آن را بیشتر می‌کند — حتماً به پزشک بگویید.",
        ],
        key_number: mg.value,
      };
    },
  },

  {
    id: "hyperammonemia",
    match: (e) => {
      const t = val(e);
      return t.NH3 != null && t.NH3 > 100;
    },
    build: () => ({
      pattern: "hyperammonemia",
      urgency: "emergency",
      headline: "آمونیاک خون شما بالاست",
      must_say:
        "آمونیاک ماده‌ای است که کبد معمولاً آن را از خون پاک می‌کند. بالا بودن آن (اغلب در مشکلات کبدی) می‌تواند بر هوشیاری اثر بگذارد و نیاز به رسیدگی فوری دارد.",
      action: "همین امروز به پزشک یا اورژانس مراجعه کنید.",
      suggest: [],
      warnings: [],
      blocks_others: true,
    }),
  },

  // ═══════════ تالاسمی مینور — بدون کم‌خونی ═══════════
  // 🔴 باگ بالینی: قاعده microcytic_anemia فقط وقتی Hb پایین باشد
  //    فعال می‌شد. ولی تالاسمی مینور اغلب Hb نرمال دارد —
  //    بدن با ساختن گلبول بیشتر (RBC بالا) جبران می‌کند.
  //
  //    نمونه واقعی: RBC 7.13↑ | MCV 67.3↓ | MCH 22.2↓ | HGB 15.8 (نرمال)
  //    Mentzer = 9.4 → کلاسیک‌ترین تالاسمی مینور. موتور هیچ نگفت.
  {
    id: "thal_trait_no_anemia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      const anemic = hgb?.abnormal && hgb.dir === "low";
      // میکروسیتوز + بدون کم‌خونی + RBC بالا یا Mentzer پایین
      return (
        !anemic &&
        t.MCV != null && t.MCV < 80 &&
        ((t.RBC != null && t.RBC > 5.5) ||
         (e.indices.mentzer != null && e.indices.mentzer < 13))
      );
    },
    build: (e) => {
      const t = val(e);
      const mi = e.indices.mentzer;
      return {
        pattern: "thal_trait_likely",
        urgency: "routine",
        headline: "گلبول‌های قرمز شما کوچک هستند ولی تعدادشان زیاد است",
        must_say:
          "هموگلوبین شما طبیعی است، پس کم‌خونی ندارید. " +
          "ولی گلبول‌ها کوچک‌ترند و تعدادشان بیشتر از حد معمول است. " +
          "این الگو معمولاً به یک ویژگی ارثی اشاره دارد که از پدر یا مادر به ارث می‌رسد " +
          "و خودش معمولاً بی‌خطر است. کمبود آهن هم می‌تواند شبیهش باشد، " +
          "ولی این الگو بیشتر به حالت ارثی می‌خورد." +
          (mi != null ? ` (شاخص Mentzer = ${mi})` : ""),
        action: "نوبت عادی با پزشک. آزمایش الکتروفورز هموگلوبین و فریتین را مطرح کنید.",
        suggest: ["الکتروفورز هموگلوبین", "فریتین"],
        warnings: [
          "بدون تجویز پزشک قرص آهن نخورید. اگر علت آهن نباشد، آهن اضافی به بدن آسیب می‌زند.",
          "⚠️ اگر قصد بچه‌دار شدن دارید، این نتیجه مهم است — حتماً با پزشک و همسرتان مطرح کنید. " +
            "اگر هر دو والد این ویژگی را داشته باشند، فرزند ممکن است شکل شدید بیماری را بگیرد.",
        ],
      };
    },
  },
  {
    id: "erythrocytosis",
    match: (e) => {
      const t = val(e);
      const rbc = e.graded.find((g) => g.test === "RBC");
      const hgb = e.graded.find((g) => g.test === "HGB");
      // RBC بالا + MCV نرمال یا بالا + Hb بالا → پلی‌سیتمی، نه تالاسمی
      return (
        rbc?.abnormal && rbc.dir === "high" &&
        t.MCV != null && t.MCV >= 80 &&
        hgb?.abnormal && hgb.dir === "high"
      );
    },
    build: (e) => {
      const hgb = e.graded.find((g) => g.test === "HGB");
      return {
        pattern: "erythrocytosis",
        urgency: "this_week",
        headline: "تعداد گلبول‌های قرمز و هموگلوبین شما بالاست",
        must_say:
          (hgb ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range})؛ ` : "") +
          "یعنی خون غلیظ‌تر از حد معمول است. علت‌های شایع: کم‌آبی (که موقت است)، سیگار، آپنهٔ خواب، یا زندگی در ارتفاع. کمتر پیش می‌آید که از یک اختلال مغز استخوان (پلی‌سیتمی) باشد.",
        action: "این هفته با پزشک وقت بگیرید. اگر کم‌آب هستید، آزمایش پس از آب‌رسانی کافی تکرار شود.",
        suggest: ["تکرار CBC", "اریتروپویتین", "اشباع اکسیژن خون"],
        warnings: ["اگر سردرد شدید، تاری دید، یا درد و تورم یک‌طرفهٔ ساق پا دارید، زودتر مراجعه کنید — خون غلیظ خطر لخته را کمی بالا می‌برد."],
      };
    },
  },

  // ═══════════ کم‌خونی ═══════════
  {
    id: "macrocytic_anemia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      return hgb?.abnormal && hgb.dir === "low" && t.MCV > 100;
    },
    build: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      const rdwHigh = t.RDW_CV > 15 || t.RDW_SD > 56;
      return {
        pattern: "macrocytic_anemia",
        urgency: "this_week",
        headline: "گلبول‌های قرمز شما کم و بزرگ‌تر از حد معمول هستند",
        must_say:
          (hgb ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range}) و ` : "") +
          `گلبول‌های قرمز بزرگ‌تر از حد معمول‌اند (MCV حدود ${t.MCV}). ` +
          "این نوع کم‌خونی («ماکروسیتیک») اغلب از کمبود ویتامین B12 یا فولات می‌آید — این ویتامین‌ها برای ساخت درست سلول لازم‌اند و بدون آن‌ها گلبول‌ها بزرگ و ناقص ساخته می‌شوند. کم‌کاری تیروئید هم می‌تواند علت باشد. " +
          (rdwHigh
            ? "تفاوت اندازهٔ گلبول‌ها هم زیاد است (RDW بالا) که سرنخ مهمی است."
            : ""),
        action:
          "این هفته با پزشک عمومی یا داخلی وقت بگیرید و این آزمایش‌ها را بخواهید.",
        // ⚠️ آهن اینجا نیست — مدل قبلاً اشتباهاً پیشنهاد می‌داد
        suggest: ["ویتامین B12", "فولات", "رتیکولوسیت", "TSH"],
        forbid: ["آهن", "فریتین", "iron", "ferritin"],
        warnings: [
          "خودتان مکمل B12 شروع نکنید — اگر قبل از آزمایش مصرف کنید، نتیجه گمراه‌کننده می‌شود.",
        ],
      };
    },
  },
  {
    id: "microcytic_anemia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      return hgb?.abnormal && hgb.dir === "low" && t.MCV < 80;
    },
    build: (e) => {
      const t = val(e);
      const mi = e.indices.mentzer;
      const thal = mi != null && mi < 13;
      const hgb = e.graded.find((g) => g.test === "HGB");
      // شدت کم‌خونی به‌سبک WHO: خفیف تا حد ۱۱، متوسط ۸ تا ۱۱، شدید زیر ۸.
      const hb = hgb?.value;
      const sev =
        hb == null ? null : hb < 8 ? "شدید" : hb < 11 ? "متوسط" : "خفیف";
      // بزرگیِ کم‌خونی: مقدار هموگلوبین + محدودهٔ طبیعی، و اندازهٔ گلبول (MCV).
      const mag =
        hgb != null
          ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range})${sev ? ` — کم‌خونیِ ${sev}` : ""}` +
            (t.MCV != null ? `، و اندازهٔ متوسط گلبول‌ها (MCV) ${t.MCV} است که کوچک‌تر از حد طبیعی (۸۰ تا ۱۰۰) است` : "") +
            ". "
          : "";
      // مکانیسم: چرا گلبول‌ها کوچک شده‌اند.
      const mechThal =
        "دو علت شایعِ گلبولِ کوچک وجود دارد: کمبود آهن، یا یک ویژگی ارثی خون (صفت تالاسمی) که معمولاً بی‌خطر است. " +
        `یک شاخص محاسباتی (اندکس منتزر${mi != null ? ` حدود ${mi}` : ""}) در اینجا زیر ۱۳ است که بیشتر به سمت صفت تالاسمی می‌خورد تا کمبود آهن — ولی این فقط یک احتمال است و آزمایش قطعی (فریتین و الکتروفورز هموگلوبین) لازم است.`;
      const mechIda =
        "آهن جزء اصلیِ هموگلوبین است؛ وقتی ذخیرهٔ آهن کم می‌شود، مغز استخوان مجبور می‌شود گلبول‌های کوچک‌تر و کم‌رنگ‌تر بسازد — که همین الگوی آزمایش شماست. " +
        (mi != null
          ? `شاخص محاسباتی منتزر (حدود ${mi}) بالای ۱۳ است که با کمبود آهن سازگارتر است تا صفت تالاسمی. `
          : "") +
        "برای تأیید، فریتین باید اندازه‌گیری شود (فریتین زیر ۳۰ کمبود آهن را تأیید می‌کند؛ ولی چون فریتین در التهاب بالا می‌رود، مقدار طبیعی هم گاهی کمبود آهن را رد نمی‌کند).";
      return {
        pattern: thal ? "microcytic_thal_likely" : "microcytic_ida_likely",
        urgency: thal ? "routine" : "this_week",
        ...(hb != null ? { key_number: hb } : {}),
        headline: thal
          ? "گلبول‌های قرمز شما کوچک هستند ولی تعدادشان زیاد است"
          : "گلبول‌های قرمز شما کم و کوچک‌تر از حد معمول هستند",
        must_say:
          mag +
          "این یعنی کم‌خونیِ میکروسیتیک (گلبولِ کوچک). " +
          (thal ? mechThal : mechIda),
        action: thal
          ? "نوبت عادی با پزشک. آزمایش فریتین و الکتروفورز هموگلوبین را مطرح کنید."
          : `${sev === "شدید" ? "چون کم‌خونی شدید است، همین چند روز با پزشک وقت بگیرید" : "این هفته با پزشک وقت بگیرید"}؛ در بزرگسالان، کمبود آهن باید علت‌یابی شود (به‌ویژه منبع خونریزی پنهان گوارشی).`,
        suggest: thal
          ? ["فریتین", "الکتروفورز هموگلوبین"]
          : ["فریتین", "آهن سرم", "TIBC", "بررسی خون مخفی در مدفوع (FOBT)"],
        forbid: ["B12", "فولات"],
        warnings: [
          "بدون تجویز پزشک قرص آهن نخورید. اگر علت آهن نباشد، آهن اضافی به بدن آسیب می‌زند.",
          ...(sev === "شدید"
            ? ["اگر تنگی نفس، تپش قلب، یا احساس ضعف و سرگیجهٔ شدید دارید، زودتر به پزشک مراجعه کنید."]
            : []),
          ...(thal
            ? ["اگر در خانواده‌تان کسی تالاسمی دارد یا قصد بچه‌دار شدن دارید، حتماً به پزشک بگویید."]
            : []),
        ],
      };
    },
  },
  {
    id: "normocytic_anemia",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      return hgb?.abnormal && hgb.dir === "low" && t.MCV >= 80 && t.MCV <= 100;
    },
    build: (e) => {
      // رتیکولوسیت کلید تفکیک کم‌خونیِ کم‌تولید از پرتخریب/خونریزی است.
      const retic = e.graded.find((g) => g.test === "RETIC");
      const reticHigh = retic?.abnormal && retic.dir === "high";
      const reticLow = retic?.abnormal && retic.dir === "low";
      const hgb = e.graded.find((g) => g.test === "HGB");
      const hb = hgb?.value;
      const sev =
        hb == null ? null : hb < 8 ? "شدید" : hb < 11 ? "متوسط" : "خفیف";
      const mag =
        hgb != null
          ? `هموگلوبین شما ${hgb.value} است (حد طبیعی ${hgb.range})${sev ? ` — کم‌خونیِ ${sev}` : ""}. `
          : "";
      let extra = "";
      let suggest = ["رتیکولوسیت", "فریتین", "کراتینین", "CRP"];
      if (reticHigh) {
        extra = " شمارش رتیکولوسیت بالاست — یعنی مغز استخوان در حال جبران است؛ این بیشتر به خونریزی یا تجزیهٔ گلبول‌ها (همولیز) می‌خورد.";
        suggest = ["هاپتوگلوبین", "LDH", "بیلی‌روبین مستقیم و غیرمستقیم", "بررسی منبع خونریزی"];
      } else if (reticLow) {
        extra = " شمارش رتیکولوسیت پایین است — یعنی مغز استخوان پاسخ کافی نمی‌دهد؛ علت‌هایی مثل کمبود آهن/ویتامین، کم‌کاری کلیه یا مشکل مغز استخوان مطرح است.";
        suggest = ["فریتین", "ویتامین B12 و فولات", "کراتینین", "بررسی توسط پزشک"];
      }
      return {
        pattern: "normocytic_anemia",
        urgency: "this_week",
        ...(hb != null ? { key_number: hb } : {}),
        headline: "خون شما کم‌خونی نشان می‌دهد",
        must_say:
          mag +
          "گلبول‌ها اندازهٔ طبیعی دارند ولی تعدادشان کم است (کم‌خونیِ نورموسیتیک)." + extra +
          " شمارش رتیکولوسیت (گلبول‌های تازه‌ساز) کلید تعیین علت است و برای پیدا کردن ریشهٔ کم‌خونی چند آزمایش دیگر لازم است.",
        action:
          sev === "شدید"
            ? "چون کم‌خونی شدید است، همین چند روز با پزشک وقت بگیرید."
            : "نوبت با پزشک بگیرید.",
        suggest,
        warnings:
          sev === "شدید"
            ? ["اگر تنگی نفس، تپش قلب، یا سرگیجهٔ شدید دارید، زودتر مراجعه کنید."]
            : [],
      };
    },
  },

  // ═══════════ التهاب ═══════════
  {
    id: "crp_pos_esr_normal",
    match: (e) => {
      const crpPos = Object.entries(e.qual).some(
        ([k, v]) => /crp/i.test(k) && /\+|positive|مثبت/i.test(v)
      );
      const esr = e.graded.find((g) => g.test === "ESR");
      return crpPos && esr && !esr.abnormal;
    },
    build: () => ({
      pattern: "acute_inflammation_recent",
      urgency: "this_week",
      headline: "نشانه‌ای از التهاب تازه در بدن دیده می‌شود",
      must_say:
        "CRP بالا با ESR طبیعی معمولاً یعنی التهاب خیلی تازه است — ESR هنوز وقت نکرده بالا برود.",
      action: "با پزشک وقت بگیرید.",
      suggest: [],
      warnings: [],
    }),
  },

  // ── CRPِ کیفی («۳+»، «مثبت») ──
  // 🔴 باگ واقعی: «crp» در فهرست QUALITATIVE بود و به e.qual می‌رفت، ولی همهٔ
  //    الگوها دنبال کلیدِ عددیِ CRP_Q می‌گشتند. نتیجه: CRPِ ۳+ خوانده می‌شد،
  //    در جدولِ «مقادیر خوانده‌شده» می‌آمد، و در تفسیر هیچ‌جا ذکر نمی‌شد.
  //    (همان کلاسِ باگِ D-dimer: «خوانده می‌شد ولی تفسیر نداشت».)
  //
  // ⚠️ «۳+» را به mg/L ترجمه نمی‌کنیم: در کیت‌های نیمه‌کمی ضریبِ تبدیل روی
  //    برچسبِ همان کیت است (۵ تا ۱۰ mg/L) و در پلاکِ کیفی اصلاً فرمولی وجود
  //    ندارد — شدتِ لختگی را چشمی درجه می‌دهند. ساختنِ عدد یعنی جعلِ داده.
  {
    id: "crp_elevated",
    match: (e) => {
      const q = e.graded.find((g) => g.test === "CRP_Q");
      const quant = q?.abnormal && q.dir === "high";
      const qual = qualPositive(e, CRP_RE);
      // قاعدهٔ اختصاصی‌ترِ «CRP مثبت + ESR طبیعی» خودش متن دارد؛ دوباره‌گویی نکن.
      const esr = e.graded.find((g) => g.test === "ESR");
      if (qual && !quant && esr && !esr.abnormal) return false;
      return quant || qual;
    },
    build: (e) => {
      const q = e.graded.find((g) => g.test === "CRP_Q");
      const quant = q?.abnormal && q.dir === "high";
      const shown = quant ? `${q.value} (حد طبیعی ${q.range})` : `«${qualValue(e, CRP_RE)}»`;
      return {
        pattern: "crp_elevated",
        urgency: "this_week",
        headline: "شاخص التهاب (CRP) شما بالاست",
        must_say:
          `CRP شما ${shown} گزارش شده است. ` +
          "CRP پروتئینی است که کبد هنگام التهاب می‌سازد؛ بالا بودنش یعنی جایی در بدن التهاب فعال وجود دارد. " +
          (quant
            ? ""
            : "این آزمایش به‌شکلِ کیفی گزارش شده، یعنی فقط می‌گوید «بالاتر از حد آستانه است» و درجهٔ پلاسِ بیشتر یعنی التهابِ بیشتر — ولی عددِ دقیقی به دست نمی‌دهد و آن را نمی‌شود به mg/L ترجمه کرد، چون ضریبِ هر کیت فرق می‌کند. ") +
          "نکتهٔ مهم این است که CRP نمی‌گوید التهاب از کجاست: عفونت، آسیب بافتی، بیماری‌های خودایمنی و حتی یک سرماخوردگیِ ساده همه آن را بالا می‌برند. " +
          (quant
            ? "برای اینکه معلوم شود این عدد رو به بهبود است یا نه، معمولاً چند روز تا دو هفته بعد تکرار می‌شود. "
            : "برای پیگیریِ دقیق‌تر بهتر است CRP به‌صورت کمی (بر حسب mg/L) اندازه‌گیری شود تا بشود روند آن را با عدد دنبال کرد. ") +
          "پس این نتیجه به‌تنهایی تشخیص نیست؛ باید کنار علائم شما تفسیر شود.",
        action: "این هفته با پزشک مطرح کنید؛ اگر تب، درد موضعی یا علامت مشخصی دارید حتماً بگویید تا منشأ التهاب پیدا شود.",
        suggest: quant ? ["ESR", "تکرار CRP"] : ["CRP کمی (mg/L)", "ESR"],
        warnings: [],
        ...(quant ? { key_number: q.value } : {}),
      };
    },
  },

  // ── ESR بالا ──
  // 🔴 باگ واقعی: ESR باینری است و هیچ الگویی برنمی‌داشتش، پس «۸۵ با مرجعِ
  //    ۰–۲۰» به unmatched_abnormal می‌افتاد و به بیمار می‌گفت «برای این ترکیب
  //    توضیح آماده‌ای نداریم» — همان کلاسِ باگِ D-dimer.
  //
  // ⚠️ ESR غیراختصاصی است و مهم‌تر: خودِ کم‌خونی آن را کاذب بالا می‌برد.
  //    در بیمارِ کم‌خون، بخشی از عدد را همان کم‌خونی توضیح می‌دهد و این نکته
  //    باید گفته شود، وگرنه بیمار دنبال علتِ دومی می‌گردد که وجود ندارد.
  {
    id: "esr_elevated",
    match: (e) => {
      const esr = e.graded.find((g) => g.test === "ESR");
      return esr?.abnormal && esr.dir === "high";
    },
    build: (e) => {
      const esr = e.graded.find((g) => g.test === "ESR");
      const hgb = e.graded.find((g) => g.test === "HGB");
      const anemic = hgb?.abnormal && hgb.dir === "low";
      const marked = esr.value >= 100;
      const crpMeasured = e.graded.some((g) => g.test === "CRP_Q") || qualPositive(e, CRP_RE);
      return {
        pattern: "esr_elevated",
        urgency: marked ? "this_week" : "routine",
        // زیرِ یافته‌های مهم‌تر پنهان نشود — مثل D-dimer.
        always_show: true,
        headline: "سرعت رسوب گلبول‌ها (ESR) بالاتر از حد طبیعی است",
        must_say:
          `ESR شما ${esr.value} است (حد طبیعی ${esr.range}). ` +
          "ESR سرعتِ ته‌نشین شدن گلبول‌های قرمز را می‌سنجد و یک شاخصِ عمومیِ التهاب است؛ وقتی التهاب باشد پروتئین‌های خون بیشتر می‌شوند و گلبول‌ها سریع‌تر ته‌نشین می‌شوند. " +
          (anemic
            ? "نکتهٔ مهمی که باید بدانید: خودِ کم‌خونی ESR را بالا می‌برد، بنابراین بخشی از این عدد را همان کم‌خونیِ شما توضیح می‌دهد و لزوماً نشانهٔ یک مشکلِ جداگانه نیست. "
            : "") +
          (marked
            ? "با این حال مقدار شما بالای ۱۰۰ است؛ در این حد معمولاً یک علتِ مشخص وجود دارد (عفونتِ طول‌کشیده، التهابِ فعال، یا بیماری‌های خاص) و بررسی لازم است. "
            : "ESR به‌تنهایی نمی‌گوید علت چیست و با سن، جنسیت، بارداری و حتی خستگیِ ساده هم بالا می‌رود، پس باید کنار علائم شما تفسیر شود. ") +
          (crpMeasured
            ? ""
            : "معمولاً CRP را هم کنارش می‌سنجند: CRP سریع‌تر بالا و پایین می‌رود و برای تشخیصِ التهابِ تازه دقیق‌تر است. "),
        action: marked
          ? "این هفته با پزشک مطرح کنید تا علت پیدا شود؛ اگر تب، کاهش وزن بی‌دلیل، تعریق شبانه یا دردِ مداوم دارید حتماً بگویید."
          : "با پزشک مطرح کنید. اگر علامتی ندارید، معمولاً تکرارِ آزمایش پس از چند هفته کافی است.",
        suggest: ["CRP کمی (mg/L)", "تکرار ESR"],
        warnings: [],
        key_number: esr.value,
      };
    },
  },

  // ── فاکتور روماتوئید مثبت ──
  // ⚠️ RF مثبت ≠ آرتریت روماتوئید. ارزشِ اخباریِ مثبتِ آن در جمعیتِ عمومی
  //    حدود ۲۴٪ است؛ ۵٪ بزرگسالان و ۱۰–۲۵٪ سالمندانِ سالم مثبت‌اند.
  //    ACR/EULAR 2010 «مثبتِ کم» را ≤۳×ULN و «مثبتِ زیاد» را >۳×ULN می‌گیرد،
  //    و می‌گوید RFِ گزارش‌شده به‌صورت صرفاً «مثبت» باید «مثبتِ کم» شمرده شود.
  {
    id: "rf_positive",
    match: (e) => {
      const rf = e.graded.find((g) => g.test === "RF");
      if (rf?.abnormal && rf.dir === "high") return true;
      return qualPositive(e, RF_RE);
    },
    build: (e) => {
      const rf = e.graded.find((g) => g.test === "RF");
      const uln = rf ? Number(String(rf.range).split(/[–-]/).pop()) : null;
      const high = rf && uln ? rf.value > 3 * uln : false;
      const crpPos = e.graded.some((g) => g.test === "CRP_Q" && g.abnormal) ||
                     qualPositive(e, CRP_RE);
      return {
        pattern: "rf_positive",
        urgency: "routine",
        headline: "فاکتور روماتوئید (RF) شما مثبت است",
        must_say:
          (rf ? `فاکتور روماتوئید شما ${rf.value} است (حد طبیعی ${rf.range})` : "فاکتور روماتوئید شما مثبت گزارش شده") +
          (high ? " — بیش از سه برابرِ حد بالای طبیعی، که در طبقه‌بندی‌های تخصصی «مثبتِ قوی» شمرده می‌شود. " : ". ") +
          "نکته‌ای که باید بدانید: RFِ مثبت به‌تنهایی به‌معنای روماتیسم مفصلی نیست. " +
          "حدود ۵ درصد بزرگسالانِ سالم و تا یک‌چهارمِ سالمندانِ سالم RF مثبت دارند، و بیماری‌های دیگری مثل سندرم شوگرن، لوپوس، هپاتیت مزمن و عفونت‌های طولانی هم آن را بالا می‌برند. " +
          (crpPos ? "شاخص التهاب (CRP) شما هم مثبت است؛ این ترکیب یعنی التهابی وجود دارد، اما همچنان علتش را مشخص نمی‌کند. " : "") +
          "تشخیصِ روماتیسم مفصلی بر پایهٔ علائم (تورم و خشکیِ صبحگاهیِ مفاصل)، معاینه و آزمایشِ اختصاصی‌ترِ Anti-CCP گذاشته می‌شود، نه RF تنها.",
        action: "نوبت عادی با پزشک. اگر تورم، خشکی صبحگاهی بیش از نیم‌ساعت، یا درد قرینه در مفاصل کوچک دست دارید، حتماً مطرح کنید — این علائم تعیین‌کننده‌ترند تا خودِ عدد.",
        suggest: ["Anti-CCP", "CRP کمی (mg/L)", "ESR"],
        warnings: [],
      };
    },
  },

  // ═══════════ قند ═══════════

  // ── کتواسیدوز دیابتی (DKA) — الگوی اورژانسی ──
  // ترکیب: گلوکز خیلی بالا + بی‌کربنات پایین + کتون مثبت.
  // اعتبارسنجی با کیس‌های فصل: John (گلوکز۶۰۰، HCO3=۶، کتون زیاد)،
  //   Myra (گلوکز۵۰۰، کتون مثبت). محتاط: نیاز به چند نشانه با هم.
  {
    id: "dka_pattern",
    match: (e) => {
      const t = val(e);
      // قند بالا: ناشتا یا تصادفی — «BS/blood sugar» رایج‌ترین برچسب است و
      // به GLU_RANDOM نگاشت می‌شود؛ اگر اینجا لحاظ نشود DKA با قند تصادفی جا می‌ماند.
      const gluHigh = (t.GLU_F != null && t.GLU_F >= 250) ||
                      (t.GLU_RANDOM != null && t.GLU_RANDOM >= 250);
      // بی‌کربنات پایین (اسیدوز)
      const hco3 = e.graded.find((g) => g.test === "HCO3");
      const hco3Low = hco3?.abnormal && hco3.dir === "low";
      // کتون: ادرار یا سرم
      const ketone = urinePositive(e, /ketone|کتون|hydroxybutyrate|بتاهیدروکسی/i);
      // برای احتیاط: گلوکز بالا + حداقل یکی از (بی‌کربنات پایین، کتون)
      // یا هر دوی بی‌کربنات پایین و کتون (حتی اگر گلوکز ثبت نشده)
      return (gluHigh && (hco3Low || ketone)) || (hco3Low && ketone);
    },
    build: (e) => {
      const t = val(e);
      const hco3 = e.graded.find((g) => g.test === "HCO3");
      const hco3Low = hco3?.abnormal && hco3.dir === "low";
      const ketone = urinePositive(e, /ketone|کتون|hydroxybutyrate|بتاهیدروکسی/i);
      // اگر هم بی‌کربنات پایین و هم کتون → تصویر کامل‌تر و جدی‌تر
      const fullPicture = hco3Low && ketone;
      return {
        pattern: "dka_pattern",
        urgency: "emergency",
        blocks_others: true,
        headline: "این نتایج ممکن است نشانه‌ی یک وضعیت جدی و فوری باشند",
        must_say:
          "ترکیب قند خون بسیار بالا" +
          (ketone ? "، وجود کتون" : "") +
          (hco3Low ? "، و اسیدی شدن خون" : "") +
          " می‌تواند نشانه‌ی وضعیتی به نام «کتواسیدوز دیابتی» باشد که نیاز به رسیدگی فوری پزشکی دارد. " +
          "این وضعیت به‌خصوص در افراد دیابتی و هنگام بیماری یا نرسیدن انسولین رخ می‌دهد.",
        action: "همین حالا به اورژانس مراجعه کنید. این برگه را همراه ببرید. معطل نکنید.",
        suggest: [],
        warnings: fullPicture
          ? ["علائم هشدار: تنفس تند و عمیق، بوی میوه‌ای دهان، تهوع و استفراغ، گیجی — در صورت وجود، فوراً اورژانس."]
          : [],
      };
    },
  },

  // ═══════════ HHS — حالت هایپراسمولارِ هایپرگلیسمیک (کمای غیرکتونی) ═══════════
  // Freeman, «Carbohydrates»، بخش Pathophysiology of Diabetes Mellitus:
  //   تصویرِ شایعِ دیابت تیپ ۲ درمان‌نشده و جدا از DKA — قند از ۶۰۰ می‌گذرد
  //   (گاه >۱۰۰۰)، کم‌آبی شدید، BUN/کراتینین بالا، اسمولالیتهٔ >۳۲۰، و «کتون
  //   دیده نمی‌شود» چون خودِ حالتِ هایپراسمولار جلوی لیپولیزِ گلوکاگون را می‌گیرد.
  //   عین جملهٔ فصل: «Mortality is high with this condition.»
  // ⚠️ باگی که این قاعده رفع می‌کند: قندِ ۹۵۰ با کتونِ منفی هیچ قاعدهٔ اورژانسی را
  //    فعال نمی‌کرد و فقط «diabetes_range / این هفته وقت بگیرید» می‌گرفت.
  {
    id: "hhs_pattern",
    match: (e) => {
      const t = val(e);
      const glu = Math.max(
        t.GLU_F ?? -Infinity,
        t.GLU_RANDOM ?? -Infinity,
        t.GLU_2H ?? -Infinity,
      );
      if (!(glu >= 600)) return false;
      // اگر تصویرِ کتواسیدوز است، به قاعدهٔ اختصاصیِ DKA واگذار کن (پیامش دقیق‌تر است).
      const hco3 = e.graded.find((g) => g.test === "HCO3");
      const hco3Low = hco3?.abnormal && hco3.dir === "low";
      const ketone = urinePositive(e, /ketone|کتون|hydroxybutyrate|بتاهیدروکسی/i);
      return !(hco3Low || ketone);
    },
    build: (e) => {
      const cand = ["GLU_F", "GLU_RANDOM", "GLU_2H"]
        .map((k) => e.graded.find((g) => g.test === k))
        .filter((g) => g?.value != null);
      const g = cand.reduce((a, b) => (b.value > a.value ? b : a));
      // شواهدِ کم‌آبی/ازوتمیِ پیش‌کلیوی که فصل مشخصهٔ HHS می‌شمارد
      const bun = e.graded.find((x) => x.test === "UREA_N" || x.test === "UREA");
      const cr = e.graded.find((x) => x.test === "CREAT");
      const dehydration =
        (bun?.abnormal && bun.dir === "high") || (cr?.abnormal && cr.dir === "high");
      // آیا کتونِ ادرار اصلاً اندازه‌گیری شده؟ (منفی‌بودنش کتواسیدوز را رد نمی‌کند)
      const ketoneTested =
        !!e.qual && Object.keys(e.qual).some((k) => /ketone|کتون/i.test(k));
      return {
        pattern: "hhs_pattern",
        urgency: "emergency",
        blocks_others: true,
        headline: "قند خون شما در حدی است که وضعیت اورژانسی محسوب می‌شود",
        key_number: g.value,
        must_say:
          `قند خون شما ${g.value} است (حد طبیعی ${g.range}) — چندین برابرِ حد طبیعی. ` +
          "در این حد، کلیه برای دفعِ قند مقدار زیادی آب هم از بدن بیرون می‌کشد؛ بدن به‌شدت کم‌آب " +
          "و خون غلیظ می‌شود. این حالت اسمی دارد: «وضعیت هایپراسمولار»، و می‌تواند به خواب‌آلودگی " +
          "و کاهش سطح هوشیاری برسد. " +
          (dehydration ? "بالا بودنِ اوره/کراتینین شما هم با همین کم‌آبی می‌خواند. " : "") +
          "این با «قند بالا»ی معمولی یکی نیست: درمانش مایعاتِ وریدی و انسولین در بیمارستان است، " +
          "نه تنظیمِ دارو در مطب — پس آن را به نوبتِ بعدی موکول نکنید." +
          // این قید عمداً در must_say است نه warnings: هشدارها ضامنِ سرور ندارند و
          // مدل یک‌بار همین جمله را حذف کرد، ولی must_sayِ اورژانسی force-append می‌شود.
          (ketoneTested
            ? " ضمناً منفی بودنِ کتونِ ادرار اینجا خیال‌تان را راحت نکند: نوارِ ادرار عمدتاً استواستات را می‌سنجد و بتاهیدروکسی‌بوتیرات را — که حدود ۷۸٪ کتون‌های بدن است — نشان نمی‌دهد، پس رد کردنِ کتواسیدوز کارِ آزمایشِ خون در اورژانس است."
            : ""),
        action: "همین حالا به اورژانس مراجعه کنید. این برگه را همراه ببرید. معطل نکنید.",
        suggest: [],
        warnings: [
          "علائم هشدار: خواب‌آلودگی و گیجی، خشکیِ شدید دهان، کم‌شدنِ ادرار، ضعفِ یک طرفِ بدن، تشنج — با هر یک از این‌ها فوراً اورژانس.",
        ],
      };
    },
  },

  {
    id: "glycemia",
    match: (e) => {
      const t = val(e);
      return (t.GLU_F != null && t.GLU_F >= 100) ||
             (t.HBA1C != null && t.HBA1C >= 5.7) ||
             (t.GLU_2H != null && t.GLU_2H >= 140) ||
             // قند تصادفی معیار پیش‌دیابت ندارد؛ فقط ≥۲۰۰ (معیار دیابت ADA) لحاظ می‌شود
             (t.GLU_RANDOM != null && t.GLU_RANDOM >= 200);
    },
    build: (e) => {
      const t = val(e);
      // HbA1c در کم‌خونی/اندیس غیرطبیعی نامعتبر است (به قند نمی‌چسبد → عدد گمراه‌کننده)
      const hgb = e.graded.find((g) => g.test === "HGB");
      const a1cBad = t.HBA1C != null && (hgb?.abnormal || t.MCV < 80 || t.MCV > 100);

      // آستانه‌های تشخیص ADA (Standards of Care 2025, بخش ۲):
      //   ناشتا ≥۱۲۶، دو ساعته ≥۲۰۰، HbA1c ≥۶.۵، تصادفی ≥۲۰۰ → دیابت.
      // هر شرط = یک «آزمایشِ مستقلِ در محدودهٔ دیابت». A1c نامعتبر شمرده نمی‌شود.
      const dmHits = [
        t.GLU_F != null && t.GLU_F >= 126,
        t.HBA1C != null && !a1cBad && t.HBA1C >= 6.5,
        t.GLU_2H != null && t.GLU_2H >= 200,
        t.GLU_RANDOM != null && t.GLU_RANDOM >= 200,
      ].filter(Boolean).length;
      const dm = dmHits >= 1;
      // ADA: دو آزمایشِ متفاوتِ غیرطبیعی روی یک نمونه = تشخیص قطعی، بدون نیاز به تکرار.
      // (باگ قبلی: برای FBS۴۰۰+A1c۱۲ می‌گفت «باید تکرار شود» که غلط بود.)
      const confirmed = dmHits >= 2;

      // eAG — میانگین قند سه ماه از HbA1c (فرمول ADAG/Nathan 2008: 28.7×A1c − 46.7)
      const eag = (t.HBA1C != null && !a1cBad) ? Math.round(28.7 * t.HBA1C - 46.7) : null;

      // هایپرگلیسمی شدید → خطر تیپ‌کردن به DKA/HHS. برگه اغلب کتون/بی‌کربنات ندارد،
      // پس نمی‌توان بحران را با آزمایش رد کرد؛ تنها راه، هشدار علائم است.
      const marked = (t.GLU_F != null && t.GLU_F >= 250) ||
                     (t.GLU_2H != null && t.GLU_2H >= 250) ||
                     (t.GLU_RANDOM != null && t.GLU_RANDOM >= 250) ||
                     (t.HBA1C != null && !a1cBad && t.HBA1C >= 10);

      const eagPhrase = eag != null
        ? `HbA1c شما ${t.HBA1C}٪ است؛ یعنی میانگین قند خون شما در سه ماه گذشته حدود ${eag} بوده (میانگین طبیعی حدود ۱۰۰). `
        : "";
      const a1cWarn = a1cBad
        ? ["چون شمارش خون شما طبیعی نیست، عدد HbA1c ممکن است دقیق نباشد. حتماً به پزشک بگویید."]
        : [];

      if (dm) {
        const dxPhrase = confirmed
          ? "چون دو آزمایشِ مستقل هر دو در محدودهٔ دیابت هستند، طبق معیارها این نتیجه به‌تنهایی برای تشخیص دیابت کافی است و برای اثبات نیازی به تکرار ندارد."
          : "برای قطعی‌شدن تشخیص، این آزمایش باید یک بار دیگر تکرار شود — نتیجه را نهایی نگیرید، ولی معطل هم نکنید.";
        const warnings = [];
        if (marked) {
          warnings.push(
            "قند شما بسیار بالاست. اگر تشنگی و ادرار زیاد، تاری دید، تهوع و استفراغ، تنفس تند و عمیق، یا گیجی دارید، همین امروز به پزشک یا اورژانس مراجعه کنید.",
          );
        }
        warnings.push(...a1cWarn);
        return {
          pattern: "diabetes_range",
          urgency: "this_week",
          headline: marked ? "قند خون شما بسیار بالاتر از حد طبیعی است" : "قند خون شما بالاتر از حد طبیعی است",
          ...(eag != null ? { key_number: eag } : {}),
          must_say: eagPhrase + dxPhrase,
          action: "این هفته وقت بگیرید" + (marked ? "؛ در صورت داشتن علائم بالا همین امروز." : "."),
          // فهرست پایهٔ دیابتِ تازه‌تشخیص (ADA بخش ۲/۴/۱۲). اگر قطعی است دیگر «تکرار قند» لازم نیست.
          suggest: confirmed
            ? ["HbA1c برای پایش", "ACR ادرار", "eGFR", "پروفایل چربی", "معاینهٔ ته‌چشم"]
            : ["تکرار قند ناشتا", "HbA1c", "ACR ادرار", "eGFR", "پروفایل چربی"],
          warnings,
        };
      }
      return {
        pattern: "prediabetes_range",
        urgency: "routine",
        headline: "قند خون شما کمی بالاتر از حد طبیعی است",
        must_say: eagPhrase +
          "این در محدودهٔ «پیش‌دیابت» است. در این مرحله تغییر رژیم غذایی و تحرک بیشترین اثر را دارد و می‌تواند از پیشرفت به دیابت جلوگیری کند.",
        action: "نوبت عادی با پزشک.",
        suggest: ["تکرار قند ناشتا", "HbA1c"],
        warnings: a1cWarn,
      };
    },
  },

  // ═══════════ هایپوگلیسمی (قند پایین) ═══════════
  // سطوح از فصل: <۷۰ هشدار، <۵۴ بالینی مهم، <۵۰ علائم معمولاً بارز.
  // اعتبارسنجی با کیس‌های فصل: Angela (۶۰=خفیف)، نوزاد Martha (۲۵=شدید).
  {
    id: "hypoglycemia",
    match: (e) => {
      const t = val(e);
      // هر قندی که پایین باشد: ناشتا، دو ساعته، یا تصادفی
      const g = t.GLU_F ?? t.GLU_2H ?? t.GLU_RANDOM ?? null;
      return g != null && g < 70;
    },
    build: (e) => {
      const t = val(e);
      const g = t.GLU_F ?? t.GLU_2H ?? t.GLU_RANDOM;
      const severe = g < 54;   // سطح بالینی مهم
      return {
        pattern: severe ? "hypoglycemia_significant" : "hypoglycemia_mild",
        urgency: severe ? "this_week" : "routine",
        headline: severe
          ? "قند خون شما پایین‌تر از حد طبیعی است"
          : "قند خون شما کمی پایین است",
        must_say: severe
          ? "قند خون شما به‌طور قابل‌توجهی پایین است. قند پایین می‌تواند علائمی مثل لرزش، تعریق، ضعف و گیجی ایجاد کند. " +
            "علت‌های مختلفی دارد و باید بررسی شود — به‌خصوص اگر داروی دیابت مصرف می‌کنید."
          : "قند خون شما کمی پایین‌تر از حد طبیعی است. این می‌تواند به‌خاطر ناشتا بودن طولانی، فاصله از وعده‌ی غذایی، یا علل دیگر باشد. " +
            "گاهی یک اندازه‌گیری تکی پایین اهمیت زیادی ندارد، ولی بهتر است با پزشک مطرح شود.",
        action: severe
          ? "این هفته با پزشک مطرح کنید. اگر همین حالا علائم شدید (گیجی، ضعف شدید، تعریق سرد) دارید، چیزی شیرین بخورید و در صورت ادامه به پزشک مراجعه کنید."
          : "نوبت عادی. اگر تکرار می‌شود یا همراه با علائم است، با پزشک مطرح کنید.",
        suggest: severe
          ? ["تکرار قند خون", "بررسی توسط پزشک", "اگر داروی دیابت مصرف می‌کنید حتماً بگویید"]
          : ["تکرار قند ناشتا"],
        warnings: (g != null && g < 40)
          ? ["⚠️ اگر واقعاً چنین قند پایینی دارید و علامت‌دار هستید، این وضعیت جدی است و نیاز به رسیدگی فوری دارد."]
          : [],
      };
    },
  },

  // ═══════════ پروفایل چربی (کلسترول/LDL/HDL/تری‌گلیسرید) ═══════════
  // طبقه‌بندی TG از NCEP: مرزی ۱۵۰–۲۰۰، بالا ۲۰۰–۵۰۰، خیلی بالا >۵۰۰،
  //   خطر پانکراتیت >۸۸۰. پیام ساده و بدون اصطلاح.
  {
    id: "lipid_profile",
    match: (e) => {
      const t = val(e);
      const chol = e.graded.find((g) => g.test === "CHOL");
      const ldl = e.graded.find((g) => g.test === "LDL");
      const hdl = e.graded.find((g) => g.test === "HDL");
      const cholHigh = chol?.abnormal && chol.dir === "high";
      const ldlHigh = ldl?.abnormal && ldl.dir === "high";
      const hdlLow = hdl?.abnormal && hdl.dir === "low";
      const tgHigh = t.TG != null && t.TG >= 150;
      return cholHigh || ldlHigh || hdlLow || tgHigh;
    },
    build: (e) => {
      const t = val(e);
      const chol = e.graded.find((g) => g.test === "CHOL");
      const ldl = e.graded.find((g) => g.test === "LDL");
      const hdl = e.graded.find((g) => g.test === "HDL");
      const cholHigh = chol?.abnormal && chol.dir === "high";
      const ldlHigh = ldl?.abnormal && ldl.dir === "high";
      const hdlLow = hdl?.abnormal && hdl.dir === "low";

      // طبقه‌بندی تری‌گلیسرید
      const tg = t.TG;
      const tgSevere = tg != null && tg > 880;    // خطر پانکراتیت
      const tgVeryHigh = tg != null && tg > 500;
      const tgHigh = tg != null && tg >= 200;
      const tgBorderline = tg != null && tg >= 150;

      // خطر پانکراتیت → جدی‌ترین، اولویت دارد
      if (tgSevere) {
        return {
          pattern: "triglyceride_pancreatitis_risk",
          urgency: "this_week",
          ...(tg != null ? { key_number: tg } : {}),
          headline: "تری‌گلیسرید خون شما بسیار بالاست",
          must_say:
            `تری‌گلیسرید (یک نوع چربی خون) شما ${tg} است، در حالی‌که حد مطلوب زیر ۱۵۰ است. ` +
            "وقتی تری‌گلیسرید از حدود ۵۰۰ عبور می‌کند، ذرات چربی می‌توانند لوزالمعده را تحریک کنند و خطر التهاب لوزالمعده (پانکراتیت) بالا می‌رود — که وضعیت جدی و گاهی اورژانسی است. علاوه بر این، چربی خونِ بالا خطر قلبی‌عروقی را هم افزایش می‌دهد. این حد باید زود بررسی و درمان شود.",
          action: "این هفته حتماً با پزشک مطرح کنید. اگر درد شدید شکم همراه تهوع و استفراغ دارید، فوراً به اورژانس بروید.",
          suggest: ["پروفایل چربی ناشتا (۱۲ ساعت)", "بررسی توسط پزشک", "قند خون"],
          warnings: ["تا کنترل تری‌گلیسرید، از الکل و غذاهای خیلی چرب/شیرین به‌شدت پرهیز کنید."],
        };
      }

      // ساخت توضیح ترکیبی با عددِ هر جزء + محدودهٔ مطلوب
      const parts = [];
      if (cholHigh) parts.push(`کلسترول تام ${chol.value} (مطلوب زیر ۲۰۰)`);
      if (ldlHigh) parts.push(`کلسترول بد (LDL) ${ldl.value} (مطلوب زیر ۱۰۰؛ برای افراد پرخطر قلبی زیر ۷۰)`);
      if (hdlLow) parts.push(`کلسترول خوب (HDL) ${hdl.value} که پایین است (مطلوب: مردان بالای ۴۰، زنان بالای ۵۰)`);
      if (tgVeryHigh) parts.push(`تری‌گلیسرید ${tg} که خیلی بالاست`);
      else if (tgHigh) parts.push(`تری‌گلیسرید ${tg} که بالاست (مطلوب زیر ۱۵۰)`);
      else if (tgBorderline) parts.push(`تری‌گلیسرید ${tg} که مرزی است (مطلوب زیر ۱۵۰)`);

      const summary = parts.join("، ");
      // اگر فقط مرزی و خفیف → routine؛ اگر LDL/کلسترول واضح بالا یا TG بالا → this_week
      const significant = ldlHigh || cholHigh || tgHigh || tgVeryHigh;
      // LDL ≥۱۹۰ سطحی است که راهنماها مستقل از سایر عوامل خطر، درمان دارویی پرقدرت را توصیه می‌کنند.
      const ldlVeryHigh = ldl != null && ldl.value >= 190;
      const keyNum = ldlHigh ? ldl.value : tgHigh || tgVeryHigh ? tg : cholHigh ? chol.value : null;

      // non-HDL (Kenwright, «Lipids and Lipoproteins»): پیش‌بینی‌کنندهٔ مستقلِ خطر،
      //   به‌ویژه در دیابت و تری‌گلیسریدِ بالا؛ هدف ≈ هدفِ LDL + ۳۰ (یعنی زیر ۱۳۰).
      const nonHdl = e.indices?.non_hdl;
      const nonHdlHigh = nonHdl != null && nonHdl >= 130;
      // تلهٔ فریدوالد: با TG>۴۰۰ محاسبهٔ LDL نامعتبر می‌شود.
      const friedewaldInvalid = tg != null && tg > 400 && ldl != null;

      return {
        pattern: "dyslipidemia",
        urgency: significant ? "this_week" : "routine",
        ...(keyNum != null ? { key_number: keyNum } : {}),
        headline: "چربی خون شما در حد مطلوب نیست",
        must_say:
          `در پروفایل چربی شما ${summary} دیده می‌شود. ` +
          (nonHdlHigh
            ? `مجموعِ چربی‌های بدِ خون (کلسترول تام منهای HDL) ${nonHdl} است، در حالی‌که مطلوب زیر ۱۳۰ است؛ این عدد همهٔ ذرات چربیِ رسوب‌کننده در رگ را با هم می‌سنجد و پیش‌بینی‌کنندهٔ خوبی برای خطر قلبی است — به‌ویژه اگر دیابت یا تری‌گلیسرید بالا داشته باشید. `
            : "") +
          "کلسترول بد (LDL) اضافی به‌مرور در دیوارهٔ رگ‌ها رسوب می‌کند و پلاک می‌سازد؛ این پلاک‌ها رگ را تنگ می‌کنند و خطر حملهٔ قلبی و سکته را بالا می‌برند — معمولاً بدون هیچ علامتی تا سال‌ها بعد. " +
          (ldlVeryHigh
            ? "مقدار LDL شما به حدی است که معمولاً فارغ از سایر عوامل، درمان دارویی جدی لازم می‌شود و بهتر است علت ارثی (چربی خون خانوادگی) هم بررسی شود. "
            : "") +
          "خبر خوب اینکه با تغییر رژیم غذایی، ورزش، و در صورت لزوم دارو، قابل کنترل است.",
        action: significant
          ? "این هفته با پزشک مطرح کنید تا سطح خطر قلبی شما و برنامهٔ مناسب (رژیم، ورزش، احیاناً استاتین) تعیین شود."
          : "نوبت عادی با پزشک. تغذیه و تحرک را جدی بگیرید.",
        suggest: ["پروفایل چربی ناشتا (۱۲ ساعت) برای تأیید", "قند خون", "مشاوره با پزشک دربارهٔ خطر قلبی‌عروقی"],
        warnings: [
          "این آزمایش باید ناشتا (۱۲ ساعت) گرفته شده باشد؛ به‌ویژه تری‌گلیسرید با غذای اخیر کاذب بالا می‌رود. اگر ناشتا نبوده‌اید، با یک نمونهٔ ناشتا تکرار شود.",
          ...(friedewaldInvalid
            ? ["چون تری‌گلیسرید شما بالای ۴۰۰ است، عددِ LDL در بیشتر آزمایشگاه‌ها محاسبه‌ای است و در این حالت قابل اعتماد نیست؛ برای تصمیم درمانی بهتر است پزشک به مجموعِ چربی‌های بد (non-HDL) یا LDLِ مستقیم تکیه کند."]
            : []),
        ],
      };
    },
  },

  // ═══════════ کبد ═══════════
  {
    id: "liver_pattern",
    match: (e) => {
      const alt = e.graded.find((g) => g.test === "ALT");
      const ast = e.graded.find((g) => g.test === "AST");
      const alp = e.graded.find((g) => g.test === "ALP");
      const altHigh = alt?.abnormal && alt.dir === "high";
      const astHigh = ast?.abnormal && ast.dir === "high";
      const alpHigh = alp?.abnormal && alp.dir === "high";
      // اگر فقط ALP بالاست و ALT/AST طبیعی‌اند، این حالت را به الگوی
      // تخصصی ALP واگذار کن (استخوان/بارداری/صفراوی) تا پیام تکراری نشود.
      if (alpHigh && !altHigh && !astHigh) return false;
      return altHigh || astHigh || alpHigh;
    },
    build: (e) => {
      const t = val(e);
      const ck = e.graded.find((g) => g.test === "CK");
      const ast = e.graded.find((g) => g.test === "AST");
      const alt = e.graded.find((g) => g.test === "ALT");

      // CK بالا + AST بالا + ALT نرمال → عضله، نه کبد
      if (ck?.abnormal && ck.dir === "high" && ast?.abnormal && !alt?.abnormal) {
        return {
          pattern: "muscle_origin_not_liver",
          urgency: "routine",
          headline: "یکی از آنزیم‌ها بالاست، ولی احتمالاً از عضله می‌آید نه کبد",
          must_say:
            "آنزیم AST بالا رفته، ولی چون CK (آنزیم مخصوص عضله) هم بالاست و ALT طبیعی مانده، این الگو بیشتر به عضله می‌خورد تا کبد. ورزش سنگین چند روز اخیر هم می‌تواند این را بسازد.",
          action: "نوبت عادی. اگر ورزش سنگین کرده‌اید حتماً بگویید.",
          suggest: ["تکرار CK", "GGT"],
          warnings: [],
        };
      }

      // R (نسبت R) فقط وقتی محاسبه می‌شود که ALT و ALP هر دو باشند.
      // بدون ALP، R === undefined بود و همیشه «mixed» می‌داد؛ حالا صریحاً
      // "unspecified" می‌گذاریم تا اشتباهاً cholestatic/hepatocellular نگوییم.
      const R = e.indices.r_ratio;
      const kind =
        R == null ? "unspecified"
        : R >= 5 ? "hepatocellular"
        : R <= 2 ? "cholestatic"
        : "mixed";
      const maxG = Math.max(alt?.ctcaeGrade || 0, ast?.ctcaeGrade || 0);

      // شدت آنزیم: خیلی بالا (چند برابر) → اشاره به آسیب حاد کبدی (مثل هپاتیت حاد)
      // کیس Verlita فصل: ALT/AST > ۱۰۰۰. آستانه محتاطانه: >۱۰ برابر سقف مرجع.
      const altVeryHigh = alt != null && alt.value > 360;   // ~۱۰× سقف ۳۶
      const astVeryHigh = ast != null && ast.value > 330;   // ~۱۰× سقف ۳۳
      const marked = altVeryHigh || astVeryHigh;

      return {
        pattern: `liver_${kind}`,
        urgency: maxG >= 4 || marked ? "emergency" : "this_week",
        blocks_others: maxG >= 4,
        headline: marked
          ? "شاخص‌های کبد شما بسیار بالا هستند"
          : "بعضی از شاخص‌های کبد بالاتر از حد طبیعی هستند",
        must_say:
          (marked
            ? "آنزیم‌های کبدی خیلی بالا هستند، که می‌تواند نشانه‌ی یک آسیب فعال و قابل‌توجه کبد باشد (مثلاً التهاب حاد کبد). این حتماً و سریع باید بررسی شود. "
            : "") +
          (kind === "cholestatic"
            ? "این الگو بیشتر به مسیر خروج صفرا مربوط است تا خود سلول‌های کبد."
            : kind === "unspecified"
              ? "این اعداد نشان می‌دهند سلول‌های کبد تحریک شده‌اند. برای تعیین دقیق‌تر نوع درگیری، آنزیم ALP هم لازم است."
              : "این اعداد نشان می‌دهند سلول‌های کبد تحریک شده‌اند. علت‌های زیادی دارد."),
        action: marked
          ? "هرچه زودتر (همین چند روز) به پزشک مراجعه کنید. اگر زردی چشم/پوست، گیجی یا استفراغ دارید، به اورژانس بروید."
          : "این هفته وقت بگیرید. لیست کامل داروها و مکمل‌هایتان را همراه ببرید.",
        suggest:
          kind === "cholestatic"
            ? ["GGT", "بیلی‌روبین مستقیم و غیرمستقیم", "سونوگرافی شکم"]
            : kind === "unspecified"
              ? ["ALP", "GGT", "هپاتیت B و C", "سونوگرافی شکم"]
              : ["AST", "GGT", "هپاتیت B و C", "سونوگرافی شکم"],
        warnings: ["تا وقتی پزشک نگفته، مکمل گیاهی یا دوز بالای استامینوفن مصرف نکنید."],
      };
    },
  },

  // ═══════════ افتراق یرقان بر اساس نوع بیلی‌روبین ═══════════
  // غیرمستقیم غالب → پیش‌کبدی (همولیز) یا گیلبرت (خوش‌خیم و شایع).
  // مستقیم غالب → مشکل دفع/انسداد. متن ساده و بدون ترساندن.
  {
    id: "bilirubin_pattern",
    match: (e) => {
      const bt = e.graded.find((g) => g.test === "BILI_T");
      // فقط وقتی بیلی‌روبین تام بالاست و اجزا موجودند
      const btHigh = bt?.abnormal && bt.dir === "high";
      const t = val(e);
      if (!btHigh || (t.BILI_D == null && t.BILI_I == null)) return false;
      // اگر تصویر همولیز کامل است (LDH بالا + هاپتوگلوبین پایین)، به الگوی
      // همولیز واگذار کن تا پیام تکراری درباره‌ی بیلی‌روبین غیرمستقیم ندهد.
      const ldh = e.graded.find((g) => g.test === "LDH");
      const hapto = e.graded.find((g) => g.test === "HAPTO");
      const ldhHigh = ldh?.abnormal && ldh.dir === "high";
      const haptoLow = hapto?.abnormal && hapto.dir === "low";
      if (ldhHigh && haptoLow) return false;
      return true;
    },
    build: (e) => {
      const t = val(e);
      const btG = e.graded.find((g) => g.test === "BILI_T");
      // اگر مستقیم نداریم ولی تام و غیرمستقیم داریم، مستقیم را حساب کن
      const direct = t.BILI_D != null ? t.BILI_D
                   : (t.BILI_T != null && t.BILI_I != null ? t.BILI_T - t.BILI_I : null);
      const total = t.BILI_T;
      const indirect = t.BILI_I != null ? t.BILI_I
                     : (total != null && direct != null ? total - direct : null);
      const rangeTxt = btG?.range ? ` (حد طبیعی ${btG.range})` : "";
      // سهم مستقیم از کل
      const directDominant = direct != null && total != null && (direct / total) > 0.5;
      // آیا آنزیم‌های کبدی هم درگیرند؟ (اگر بله، الگوی گیلبرت را نمی‌دهیم)
      const alt = e.graded.find((g) => g.test === "ALT");
      const ast = e.graded.find((g) => g.test === "AST");
      const alp = e.graded.find((g) => g.test === "ALP");
      const enzymesHigh = (alt?.abnormal && alt.dir === "high") ||
                          (ast?.abnormal && ast.dir === "high") ||
                          (alp?.abnormal && alp.dir === "high");
      // یرقانِ قابل‌مشاهده: صلبیهٔ چشم از حدود ۲–۲.۵ و پوست از ~۳ mg/dL زرد می‌شود.
      const visible = total != null && total >= 2.5;
      const visiblePhrase = visible
        ? " — در این حد معمولاً زردیِ سفیدیِ چشم و گاهی پوست هم دیده می‌شود"
        : "";
      const magHead = total != null
        ? `بیلی‌روبین تامِ خون شما ${total}${rangeTxt} است${visiblePhrase}. `
        : "";

      if (directDominant) {
        // بیلی‌روبین مستقیم غالب → مشکل دفع/انسداد
        return {
          pattern: "bilirubin_direct_dominant",
          urgency: "this_week",
          ...(total != null ? { key_number: total } : {}),
          headline: "بیلی‌روبین خون شما بالاست (بیشتر از نوع مستقیم)",
          must_say:
            magHead +
            "بیلی‌روبین از تجزیهٔ طبیعیِ گلبول‌های قرمز ساخته می‌شود و کبد آن را به شکل «مستقیم» (کونژوگه، محلول در آب) درمی‌آورد تا از راه صفرا دفع شود. " +
            "چون در شما بیشترِ بیلی‌روبین از نوع مستقیم است، یعنی کبد آن را پردازش کرده ولی در دفعِ آن به مجاری صفرا مانعی هست — بیشتر به انسداد یا اختلالِ جریان صفرا می‌خورد تا به خودِ سلول‌های کبد. " +
            "در این حالت اغلب ادرار تیره و مدفوع کم‌رنگ/خاکی‌رنگ می‌شود.",
          action: "این هفته با پزشک مطرح کنید. اگر زردی چشم/پوست، ادرار تیره یا مدفوع کم‌رنگ دارید، زودتر مراجعه کنید.",
          suggest: ["سونوگرافی شکم", "آنزیم‌های کبدی", "ALP و GGT", "بیلی‌روبین مستقیم و غیرمستقیم"],
          warnings: [
            // سه‌گانهٔ شارکو (کیس Felicia): تب + لرز + درد ربع‌فوقانیِ راست + زردی = کلانژیتِ صعودی، اورژانس.
            "اگر همراهِ این زردی، تب و لرز و درد سمت راستِ بالای شکم دارید، همین حالا به اورژانس بروید — می‌تواند نشانهٔ عفونتِ مجاری صفرا باشد.",
          ],
        };
      }

      // بیلی‌روبین غیرمستقیم غالب
      // اگر آنزیم‌ها طبیعی و بیلی‌روبین خیلی بالا نیست → احتمال گیلبرت (خوش‌خیم)
      const mildIndirect = total != null && total < 5 && !enzymesHigh;
      return {
        pattern: "bilirubin_indirect_dominant",
        urgency: mildIndirect ? "routine" : "this_week",
        ...(total != null ? { key_number: total } : {}),
        headline: "بیلی‌روبین خون شما بالاست (بیشتر از نوع غیرمستقیم)",
        must_say:
          magHead +
          "بیلی‌روبین از تجزیهٔ طبیعیِ گلبول‌های قرمز ساخته می‌شود؛ در شما بیشترِ آن از نوع «غیرمستقیم» (هنوز توسط کبد پردازش‌نشده) است. " +
          (mildIndirect
            ? "وقتی آنزیم‌های کبدی طبیعی‌اند و بالا رفتن هم خفیف است، شایع‌ترین و بی‌خطرترین علت «سندرم ژیلبر» است — یک ویژگی ارثیِ خیلی رایج (حدود ۱ نفر از هر ۲۰ نفر) که در آن آنزیمِ پردازش بیلی‌روبین کمی کندتر کار می‌کند. در ژیلبر بیلی‌روبین معمولاً زیر ۳ می‌ماند، هنگام گرسنگی/استرس/بیماری کمی بالاتر می‌رود، هیچ آسیبی به کبد نمی‌زند و درمانی لازم ندارد. برای اطمینان کافی است آزمایش در حالت عادیِ بدن تکرار شود و شمارش خون طبیعی باشد. البته تجزیهٔ بیش از حد گلبول‌ها (همولیز) هم می‌تواند همین الگو را بسازد که با چند آزمایش رد می‌شود."
            : "بالا بودنِ قابل‌توجهِ نوعِ غیرمستقیم بیشتر به تجزیهٔ بیش از حد گلبول‌های قرمز (همولیز) اشاره دارد و بهتر است بررسی شود."),
        action: mildIndirect
          ? "نوبت عادی. برای اطمینان با پزشک مطرح کنید."
          : "این هفته با پزشک مطرح کنید.",
        suggest: mildIndirect
          ? ["تکرار بیلی‌روبین در حالت عادی بدن", "شمارش خون (CBC) و رتیکولوسیت"]
          : ["شمارش خون (CBC)", "رتیکولوسیت", "هاپتوگلوبین", "LDH"],
        warnings: [],
      };
    },
  },

  // ═══════════ ALP بالای ایزوله (منبع: استخوان/بارداری/صفراوی) ═══════════
  // فقط وقتی ALP بالاست و ALT/AST طبیعی — liver_pattern این حالت را واگذار کرده.
  // GGT منبع را روشن می‌کند: بالا → کبدی/صفراوی، طبیعی → استخوان/بارداری.
  // متن ساده نگه داشته می‌شود؛ بدون واژه‌ی تخصصی.
  {
    id: "alp_isolated",
    match: (e) => {
      const alp = e.graded.find((g) => g.test === "ALP");
      const alt = e.graded.find((g) => g.test === "ALT");
      const ast = e.graded.find((g) => g.test === "AST");
      const alpHigh = alp?.abnormal && alp.dir === "high";
      const altHigh = alt?.abnormal && alt.dir === "high";
      const astHigh = ast?.abnormal && ast.dir === "high";
      return alpHigh && !altHigh && !astHigh;
    },
    build: (e) => {
      const ggt = e.graded.find((g) => g.test === "GGT");
      const ggtHigh = ggt?.abnormal && ggt.dir === "high";
      const ggtKnown = ggt != null;

      if (ggtHigh) {
        // GGT هم بالا → به سمت کبد/مجاری صفراوی
        return {
          pattern: "alp_high_liver_source",
          urgency: "this_week",
          headline: "آنزیم ALP شما بالاست",
          must_say:
            "آنزیم ALP بالاتر از حد طبیعی است. چون آنزیم دیگری به نام GGT هم بالاست، " +
            "این حالت بیشتر به کبد یا مجاری صفراوی مربوط می‌شود تا استخوان. برای بررسی بهتر است با پزشک مطرح شود.",
          action: "این هفته با پزشک مطرح کنید.",
          suggest: ["سونوگرافی شکم", "بیلی‌روبین"],
          warnings: [],
        };
      }

      // GGT طبیعی یا نامشخص → استخوان/بارداری محتمل‌تر، ولی مطمئن نیستیم
      return {
        pattern: "alp_high_nonliver",
        urgency: "routine",
        headline: "آنزیم ALP شما بالاست",
        must_say:
          "آنزیم ALP بالاتر از حد طبیعی است. این آنزیم فقط از کبد نمی‌آید — " +
          "در استخوان هم ساخته می‌شود و بالا بودن آن همیشه به معنی مشکل کبد نیست. " +
          "اگر باردار هستید، بالا بودن ALP در دوران بارداری معمولاً طبیعی است. " +
          (ggtKnown
            ? "چون آنزیم GGT شما طبیعی است، احتمال منشأ کبدی کمتر است."
            : "یک آزمایش ساده به نام GGT می‌تواند مشخص کند منبع آن کبد است یا نه."),
        action: "نوبت عادی. اگر باردار هستید یا علامت خاصی دارید، با پزشک مطرح کنید.",
        suggest: ggtKnown ? [] : ["GGT — برای مشخص شدن منبع ALP"],
        warnings: [],
      };
    },
  },

  // ═══════════ افتراق پانکراتیت (آمیلاز/لیپاز) ═══════════
  // هر دو بالا → پانکراس. فقط آمیلاز بالا → می‌تواند منشأ دیگری داشته باشد.
  {
    id: "pancreas_pattern",
    match: (e) => {
      const amy = e.graded.find((g) => g.test === "AMYLASE");
      const lps = e.graded.find((g) => g.test === "LIPASE");
      const amyHigh = amy?.abnormal && amy.dir === "high";
      const lpsHigh = lps?.abnormal && lps.dir === "high";
      return amyHigh || lpsHigh;
    },
    build: (e) => {
      const amy = e.graded.find((g) => g.test === "AMYLASE");
      const lps = e.graded.find((g) => g.test === "LIPASE");
      const amyHigh = amy?.abnormal && amy.dir === "high";
      const lpsHigh = lps?.abnormal && lps.dir === "high";

      if (amyHigh && lpsHigh) {
        // هر دو بالا → قوی‌ترین اشاره به پانکراس
        return {
          pattern: "pancreas_both_high",
          urgency: "this_week",
          headline: "دو آنزیم مربوط به لوزالمعده (پانکراس) بالا هستند",
          must_say:
            "آنزیم‌های آمیلاز و لیپاز هر دو بالاتر از حد طبیعی‌اند. این ترکیب بیشتر به " +
            "التهاب لوزالمعده اشاره دارد و باید توسط پزشک بررسی شود.",
          action: "این هفته با پزشک مطرح کنید. اگر درد شدید شکم (به‌خصوص همراه تهوع و استفراغ) دارید، زودتر مراجعه کنید.",
          suggest: ["سونوگرافی شکم", "بررسی توسط پزشک"],
          warnings: [],
        };
      }

      if (lpsHigh && !amyHigh) {
        // لیپاز بالا (اختصاصی‌تر برای پانکراس)
        return {
          pattern: "lipase_high",
          urgency: "this_week",
          headline: "آنزیم لیپاز شما بالاست",
          must_say:
            "لیپاز آنزیمی است که بیشتر به لوزالمعده مربوط می‌شود. بالا بودن آن باید بررسی شود.",
          action: "این هفته با پزشک مطرح کنید.",
          suggest: ["آمیلاز", "سونوگرافی شکم"],
          warnings: [],
        };
      }

      // فقط آمیلاز بالا → می‌تواند منشأ غیرپانکراسی داشته باشد
      return {
        pattern: "amylase_isolated",
        urgency: "routine",
        headline: "آنزیم آمیلاز شما بالاست",
        must_say:
          "آمیلاز بالاتر از حد طبیعی است. این آنزیم فقط از لوزالمعده نمی‌آید — " +
          "غدد بزاقی هم آن را می‌سازند (مثلاً در اوریون). چون آنزیم لیپاز " +
          (lps != null ? "شما طبیعی است، احتمال منشأ لوزالمعده کمتر است." : "می‌تواند به روشن شدن منبع کمک کند."),
        action: "نوبت عادی، مگر علامت خاصی داشته باشید. با پزشک مطرح کنید.",
        suggest: lps != null ? [] : ["لیپاز — برای مشخص شدن منبع"],
        warnings: [],
      };
    },
  },

  // ═══════════ CK-MB بالا (مارکر قلبی — نسخه ساده و محتاط) ═══════════
  // فقط بالای مرجعِ همان برگه را چک می‌کند (بدون محاسبه شاخص نسبی،
  //   چون واحدها متفاوت‌اند و خطر خطا زیاد). پیام محتاط، نه اورژانسِ ترسناک.
  // اگر تروپونین هم بالا باشد، troponin_positive اورژانس می‌دهد و این زیرش می‌رود.
  {
    id: "ckmb_high",
    match: (e) => {
      const mb = e.graded.find((g) => g.test === "CK_MB");
      return mb?.abnormal && mb.dir === "high";
    },
    build: (e) => {
      // اگر CK کل هم خیلی بالاست، احتمال منشأ عضله بیشتر است (نه فقط قلب)
      const ck = e.graded.find((g) => g.test === "CK");
      const ckHigh = ck?.abnormal && ck.dir === "high";
      return {
        pattern: "ckmb_high",
        urgency: "this_week",
        headline: "یکی از آنزیم‌های مرتبط با قلب کمی بالاست",
        must_say:
          "آنزیمی به نام CK-MB بالاتر از حد طبیعی است. این آنزیم بیشتر به عضله‌ی قلب مربوط است، " +
          "ولی بالا بودن آن همیشه به معنی مشکل قلبی نیست و می‌تواند از عضلات بدن هم بیاید" +
          (ckHigh ? " (به‌خصوص چون آنزیم CK کل شما هم بالاست، که بیشتر به عضله اشاره دارد)" : "") +
          ". برای تفسیر درست باید با پزشک بررسی شود.",
        action:
          "این هفته با پزشک مطرح کنید. اگر همین حالا درد قفسه‌ی سینه، تنگی نفس یا تعریق سرد دارید، فوراً به اورژانس بروید.",
        suggest: ["تروپونین — دقیق‌ترین آزمایش برای عضله‌ی قلب", "بررسی توسط پزشک"],
        warnings: [],
      };
    },
  },

  // ═══════════ کلیه ═══════════
  {
    id: "kidney",
    match: (e) => {
      const cr = e.graded.find((g) => g.test === "CREAT");
      const crHigh = cr?.abnormal && cr.dir === "high";
      const egfr = e.indices.egfr;
      const egfrLow = egfr != null && egfr < 60;   // کراتینین طبیعی ولی eGFR پایین (سالمند/لاغر)
      if (!crHigh && !egfrLow) return false;
      // اگر تصویر خاص‌تر (رابدومیولیز یا گلومرولونفریت) هست، به آن‌ها واگذار کن
      // تا پیام عمومی کلیه تکراری نشود.
      const ck = e.graded.find((g) => g.test === "CK");
      const ckVeryHigh = ck?.abnormal && ck.dir === "high" && ck.value > 1000;
      const bloodUrine = urinePositive(e, /urine\s*blood|ur\s*blood|خون\s*ادرار|hematuria/i);
      const rbcHigh = urineCellCount(e, /rbc|گلبول\s*قرمز/i);
      const proteinuria = urineGrade(e, /protein|پروتئین/i) >= 1;
      // رابدومیولیز: CK خیلی بالا + خون ادرار
      if (ckVeryHigh && bloodUrine) return false;
      // گلومرولونفریت: هماچوری + پروتئینوری با هم
      if ((bloodUrine || (rbcHigh != null && rbcHigh > 3)) && proteinuria) return false;
      return true;
    },
    build: (e) => {
      const cr = e.graded.find((g) => g.test === "CREAT");
      const crHigh = cr?.abnormal && cr.dir === "high";
      const egfr = e.indices.egfr;
      const ratio = e.indices.bun_cr;
      const prerenal = ratio != null && ratio > 20;
      const crG = cr?.ctcaeGrade ?? 0;
      // فوریت بر پایهٔ eGFR (مرحله‌بندی CKD) یا شدت CTCAE کراتینین
      const severe = crG >= 3 || (egfr != null && egfr < 15);          // G5
      const moderate = crG >= 2 || (egfr != null && egfr < 45);        // G3b/G4
      const mildEgfrOnly = !crHigh && egfr != null && egfr >= 45 && egfr < 60;  // G3a با کراتینین طبیعی
      const urgency = severe ? "emergency" : moderate ? "this_week" : mildEgfrOnly ? "routine" : "this_week";
      // مرحله‌بندی KDIGO بر اساس eGFR (فقط برای زبان ساده به بیمار؛ ≥۹۰ نام نمی‌بریم)
      const stage =
        egfr == null || egfr >= 90 ? null
        : egfr >= 60 ? "مرحلهٔ ۲ (کاهش خفیف)"
        : egfr >= 45 ? "مرحلهٔ ۳-الف (کاهش خفیف تا متوسط)"
        : egfr >= 30 ? "مرحلهٔ ۳-ب (کاهش متوسط تا شدید)"
        : egfr >= 15 ? "مرحلهٔ ۴ (کاهش شدید)"
        : "مرحلهٔ ۵ (نارسایی)";
      return {
        pattern: prerenal ? "prerenal_pattern" : "kidney_impairment",
        urgency,
        blocks_others: severe,
        // عددِ کلیدیِ بزرگی که تور ایمنی سرور تضمین می‌کند در متن بماند
        ...(egfr != null ? { key_number: egfr } : {}),
        headline: crHigh
          ? "شاخص کار کلیه بالاتر از حد طبیعی است"
          : "شاخص تخمینی کار کلیه (eGFR) پایین‌تر از حد مطلوب است",
        must_say:
          (egfr != null
            ? `از روی کراتینین شما، شاخص تخمینی کار کلیه (eGFR) حدود ${egfr} به‌دست می‌آید — یعنی کلیه‌ها حدود ${egfr}٪ ظرفیت طبیعی کار می‌کنند${stage ? `؛ در طبقه‌بندی بیماری کلیه این ${stage} است` : ""}. `
            : "") +
          "یک آزمایش به‌تنهایی این را قطعی نمی‌کند — گاهی کم‌آبی یا یک داروی موقت هم این عدد را جابه‌جا می‌کند؛ برای اینکه «مزمن» به‌حساب بیاید باید این کاهش بیش از سه ماه پایدار بماند." +
          (prerenal ? " نسبت اوره به کراتینین بالاست که به کم‌آبی اشاره دارد." : ""),
        action: mildEgfrOnly
          ? "نوبت عادی با پزشک و تکرار آزمایش کلیه پس از چند هفته."
          : "با پزشک وقت بگیرید و بخواهید این آزمایش تکرار شود.",
        suggest: ["تکرار کراتینین", "ACR ادرار", "الکترولیت‌ها"],
        warnings: ["داروهای مسکن مثل ایبوپروفن و ناپروکسن را بدون مشورت پزشک مصرف نکنید."],
      };
    },
  },

  // ═══════════ آلبومین ادرار (ACR) — نفروپاتی زودرس ═══════════
  // منبع: فصل کلیهٔ «اصول بیوشیمی بالینی» + KDIGO 2024. ACR زودترین نشانهٔ
  // آسیب کلیه در دیابت/فشارخون است — پیش از تغییر کراتینین/eGFR — و کنترل
  // زودهنگام قند و فشار می‌تواند از پیشرفت به نارسایی جلوگیری کند.
  {
    id: "albuminuria_pattern",
    match: (e) => {
      const acr = e.graded.find((g) => g.test === "ACR");
      return acr?.abnormal === true;   // A2 یا A3
    },
    build: (e) => {
      const t = val(e);
      const acr = e.graded.find((g) => g.test === "ACR");
      const v = acr.value;
      const severe = acr.tag === "A3";   // ≥۳۰۰ mg/g
      // زمینهٔ دیابت (قند/HbA1c بالا) → این آلبومینوری احتمالاً نفروپاتی دیابتی است
      // ⚠️ کلیدِ موتور GLU_RANDOM است؛ پیش‌تر GLU_R نوشته شده بود که هیچ‌وقت وجود
      //    ندارد، پس قندِ تصادفیِ ۳۰۰+ زمینهٔ دیابت شمرده نمی‌شد. GLU_2H هم جا افتاده بود.
      //    آستانه‌ها = معیارهای تشخیصی ADA (Table 9.5، Freeman، «Carbohydrates»).
      const dm = (t.HBA1C != null && t.HBA1C >= 6.5) ||
                 (t.GLU_F != null && t.GLU_F >= 126) ||
                 (t.GLU_2H != null && t.GLU_2H >= 200) ||
                 (t.GLU_RANDOM != null && t.GLU_RANDOM >= 200);
      return {
        pattern: severe ? "albuminuria_A3" : "albuminuria_A2",
        urgency: "this_week",
        ...(v != null ? { key_number: v } : {}),
        headline: "در ادرار شما آلبومین (نوعی پروتئین) دفع می‌شود",
        must_say:
          `نسبت آلبومین به کراتینین ادرار شما ${v} میلی‌گرم بر گرم است` +
          (severe
            ? "، که در ردهٔ «افزایش شدید» (A3، بالای ۳۰۰) قرار می‌گیرد. "
            : "، که در ردهٔ «افزایش متوسط» (A2، بین ۳۰ تا ۳۰۰) قرار می‌گیرد. ") +
          "کلیهٔ سالم پروتئین را در خون نگه می‌دارد و نمی‌گذارد وارد ادرار شود؛ دفع آلبومین یعنی " +
          "صافیِ کلیه کمی نشت پیدا کرده و این یکی از زودترین نشانه‌های آسیب کلیه است — به‌ویژه در " +
          "دیابت و فشارخون، حتی پیش از آنکه کراتینین یا eGFR تغییر کند. " +
          "نکتهٔ امیدوارکننده این است که اگر همین حالا قند و فشارخون به‌خوبی کنترل شوند، اغلب می‌توان از " +
          "پیشرفتِ آن به نارسایی کلیه جلوگیری کرد. " +
          "یک نمونهٔ منفرد قطعی نیست؛ تب، ورزش سنگین، عفونت ادراری، قاعدگی و قند خیلی بالا هم می‌توانند " +
          "آن را موقتاً بالا ببرند، پس باید در ۲ نمونه از ۳ نمونه طی ۳ تا ۶ ماه تأیید شود.",
        action:
          "این هفته با پزشک مطرح کنید تا کنترل قند و فشارخون بررسی شود" +
          (dm ? " (به‌ویژه چون قند شما هم بالاست، این می‌تواند نشانهٔ درگیری کلیه در دیابت باشد)" : "") +
          ". دربارهٔ راه‌های محافظت از کلیه (از جمله داروهای فشارخونی که از کلیه هم محافظت می‌کنند) با پزشک مشورت کنید.",
        suggest: [
          "تکرار ACR ادرار (۲ از ۳ نمونه طی ۳–۶ ماه)",
          "کراتینین و eGFR",
          "فشارخون",
          ...(dm ? [] : ["قند خون و HbA1c"]),
        ],
        warnings: [],
      };
    },
  },

  // ═══════════ رابدومیولیز → آسیب کلیه (کیس George) ═══════════
  // CK خیلی بالا + خون ادرار (میوگلوبینوری). خطر نارسایی حاد کلیه.
  {
    id: "rhabdomyolysis_pattern",
    match: (e) => {
      const ck = e.graded.find((g) => g.test === "CK");
      const ckVeryHigh = ck?.abnormal && ck.dir === "high" && ck.value > 1000;
      const bloodUrine = urinePositive(e, /urine\s*blood|ur\s*blood|خون\s*ادرار|hematuria/i);
      return ckVeryHigh && bloodUrine;
    },
    build: (e) => {
      const ck = e.graded.find((g) => g.test === "CK");
      const cr = e.graded.find((g) => g.test === "CREAT");
      const k = e.graded.find((g) => g.test === "K");
      const ca = e.graded.find((g) => g.test === "CA");
      const crHigh = cr?.abnormal && cr.dir === "high";
      // ⚠️ باگ واقعی: شرطِ «!crHigh» سه حالتِ کاملاً متفاوت را یکی می‌کرد —
      //    کراتینینِ طبیعی، کراتینینِ پایین، و «اصلاً کراتینین نداده». روی برگهٔ
      //    فقط-هماتولوژی (بدون کراتینین) به بیمار گفته می‌شد «شاخص کلیه هنوز
      //    طبیعی است»؛ یعنی موتور نتیجه‌ای را از خودش می‌ساخت — آن هم داخل
      //    یافته‌ای اورژانسی با blocks_others که تنها متنِ دیدهٔ بیمار است.
      const crMeasured = cr != null;
      const caLow = ca?.abnormal && ca.dir === "low";
      // پتاسیمِ بالا فقط از آستانهٔ بحرانی (۶.۰، همان آستانهٔ potassium_critical)
      //   «فوری‌ترین بخش» است؛ ۵.۱ با ۷.۵ یک جمله نمی‌گیرد.
      const kHigh = k?.abnormal && k.dir === "high";
      const kCritical = kHigh && k.value >= 6;
      // CK بالای ~۵۰۰۰ آستانه‌ای است که خطرِ آسیبِ حادِ کلیه از آن به بعد
      //   به‌طور مشخص بالا می‌رود (تعریفِ رابدومیولیز خودش ≈ ۵ برابرِ حدِ بالا).
      const ckExtreme = ck?.value != null && ck.value > 5000;
      return {
        pattern: "rhabdomyolysis_pattern",
        urgency: "emergency",
        blocks_others: true,
        headline: "این نتایج می‌توانند نشانه‌ی یک وضعیت جدی عضلانی-کلیوی باشند",
        must_say:
          `آنزیم عضلانی CK شما ${ck.value} است (حد طبیعی ${ck.range}) و در آزمایش ادرار هم «خون» گزارش شده. ` +
          "این ترکیب می‌تواند نشانهٔ تخریب بافت عضلانی (رابدومیولیز) باشد: وقتی سلول‌های عضله آسیب می‌بینند، محتویاتشان — از جمله رنگ‌دانه‌ای به نام میوگلوبین و مقدار زیادی پتاسیم — وارد خون می‌شود؛ میوگلوبین در کلیه رسوب می‌کند و می‌تواند ظرف چند ساعت تا چند روز به آسیب حاد کلیه منجر شود. " +
          (ckExtreme ? "مقدار CK شما در محدوده‌ای است که خطر درگیری کلیه در آن به‌طور مشخص بیشتر است. " : "") +
          (kHigh
            ? `پتاسیم شما هم ${k.value} است (حد طبیعی ${k.range})` +
              (kCritical
                ? " — این فوری‌ترین بخشِ ماجراست، چون پتاسیمِ آزادشده از عضله می‌تواند ضربان قلب را بی‌نظم کند. "
                : "؛ پتاسیمِ آزادشده از عضله می‌تواند بالاتر هم برود، پس باید تحت نظر تکرار شود. ")
            : "") +
          // ⚠️ eGFR عمداً اینجا نمی‌آید: CKD-EPI کراتینینِ پایدار را فرض می‌کند و
          //    رابدومیولیز نمونهٔ کتابیِ حالتِ ناپایدار است (کراتینین از خودِ عضلهٔ
          //    آسیب‌دیده هم آزاد می‌شود). عددِ مزمن روی آسیبِ حاد گمراه‌کننده است.
          (crHigh
            ? `کراتینین شما ${cr.value} است (حد طبیعی ${cr.range})، یعنی احتمالاً کلیه‌ها هم درگیر شده‌اند. `
            : crMeasured
            ? "کراتینینِ این نوبتِ شما هنوز خارج از محدوده نیست، اما این خطر را منتفی نمی‌کند — آسیب کلیه در این وضعیت اغلب با تأخیر و در آزمایش‌های بعدی خود را نشان می‌دهد. "
            : "در این برگه کراتینین (شاخص کار کلیه) اندازه‌گیری نشده؛ با توجه به CK بالا، بررسی آن جزو کارهای فوری است. ") +
          (caLow
            ? `کلسیم شما هم پایین است، که در این وضعیت شایع و قابل‌انتظار است، چون کلسیم وارد عضلهٔ آسیب‌دیده می‌شود؛ معمولاً خودبه‌خود برمی‌گردد و نیازی به مکملِ خودسرانه ندارد. `
            : "") +
          "نکته‌ای که برای پزشک مهم است: در رابدومیولیز نوار ادرار اغلب «خون» را مثبت نشان می‌دهد در حالی‌که در بررسی میکروسکوپی گلبول قرمزی دیده نمی‌شود — چون نوار، میوگلوبین را از هموگلوبین تشخیص نمی‌دهد. پس این «خون در ادرار» لزوماً به‌معنای خونریزی نیست. " +
          "ضمناً CK معمولاً ۲۴ تا ۷۲ ساعت پس از آسیب به اوج می‌رسد، بنابراین یک بار اندازه‌گیری تصویر کامل را نشان نمی‌دهد و باید همراه پتاسیم و کراتینین تکرار شود. " +
          "این وضعیت نیاز به رسیدگی فوری دارد.",
        action:
          "همین حالا به اورژانس مراجعه کنید؛ ترجیحاً خودتان رانندگی نکنید. درمان اصلی، شروعِ زودهنگامِ سرم وریدی است و هرچه زودتر آغاز شود احتمال آسیب کلیه کمتر می‌شود. " +
          "اگر ادرار تیره (رنگ چای)، درد یا ضعف شدید عضلانی، یا کاهش حجم ادرار دارید معطل نکنید. " +
          "حتماً بگویید در روزهای اخیر چه چیزی می‌تواند به عضله فشار آورده باشد: ورزش خیلی سنگین، بی‌حرکتیِ طولانی یا زمین‌خوردن و ماندن روی زمین، تشنج، ضربه، یا گرمازدگی.",
        // ⚠️ اینجا منظور «پایشِ سریالی» است نه درخواستِ تستِ نداشته. پس با قالبِ
        //    «تکرارِ …» نوشته می‌شود؛ نامِ خالیِ «پتاسیم» به بیمارِ پتاسیم‌داده‌شده
        //    می‌گفت آن را درخواست کن (همان باگِ «درخواست آزمایش فریتین»).
        suggest: ["تکرار CK", "تکرار پتاسیم و کراتینین", "میوگلوبین ادرار", "نوار قلب (ECG)"],
        warnings: [
          // گزگزِ اطرافِ دهان نشانهٔ کلاسیکِ کلسیمِ پایین است نه پتاسیمِ بالا؛
          //   نسبت‌دادنش به پتاسیم غلط بود (هر دو اینجا محتمل‌اند، پس هر دو گفته می‌شوند).
          "اگر تپش قلب، ضربان نامنظم یا ضعف شدید پیدا کردید، فوراً به کادر درمان بگویید — می‌تواند مربوط به پتاسیم بالا باشد. گزگزِ اطراف دهان و انگشتان یا گرفتگیِ عضلات هم باید گفته شود؛ این یکی معمولاً به کلسیمِ پایین مربوط است.",
          "اگر داروی کاهندهٔ چربی از خانوادهٔ استاتین مصرف می‌کنید، حتماً به پزشک بگویید؛ استاتین‌ها از علل شناخته‌شدهٔ آسیب عضلانی‌اند و ممکن است لازم باشد موقتاً قطع شود. داروهای دیگر و مکمل‌های ورزشی‌تان را هم نام ببرید.",
          "تا رسیدن به پزشک، از داروهای مسکّنِ ضدالتهاب (مثل ایبوپروفن و دیکلوفناک) استفاده نکنید — این داروها در این شرایط به کلیه فشار بیشتری می‌آورند.",
        ],
        key_number: ck.value,
      };
    },
  },

  // ═══════════ سندرم نفروتیک ═══════════
  // پروتئینوری شدید (+3/+4) + آلبومین خون پایین (± چربی بالا).
  {
    id: "nephrotic_pattern",
    match: (e) => isNephrotic(e),
    build: (e) => {
      const chol = e.graded.find((g) => g.test === "CHOL");
      const cholHigh = chol?.abnormal && chol.dir === "high";
      return {
        pattern: "nephrotic_pattern",
        urgency: "this_week",
        headline: "الگوی آزمایش‌های شما به یک مشکل کلیوی به نام سندرم نفروتیک اشاره دارد",
        must_say:
          "مقدار زیادی پروتئین از ادرار دفع می‌شود و در نتیجه پروتئین خون (آلبومین) پایین آمده است. " +
          (cholHigh ? "بالا بودن چربی خون هم اغلب همراه این وضعیت دیده می‌شود. " : "") +
          "این الگو باید حتماً توسط پزشک بررسی شود.",
        action: "این هفته با پزشک مطرح کنید. اگر ورم پا، صورت یا دور چشم دارید، حتماً بگویید.",
        suggest: ["نسبت پروتئین به کراتینین ادرار", "آلبومین خون", "عملکرد کلیه", "بررسی توسط پزشک"],
        warnings: [],
      };
    },
  },

  // ═══════════ الگوی گلومرولونفریت (کیس Geraldine) ═══════════
  // هماچوری + پروتئینوری + (کراتینین بالا یا کم‌خونی) با هم.
  {
    id: "glomerulonephritis_pattern",
    match: (e) => isGlomerulonephritis(e),
    build: (e) => {
      const cr = e.graded.find((g) => g.test === "CREAT");
      const crHigh = cr?.abnormal && cr.dir === "high";
      return {
        pattern: "glomerulonephritis_pattern",
        urgency: "this_week",
        headline: "ترکیب نتایج ادرار و خون شما به یک التهاب کلیه اشاره دارد",
        must_say:
          "هم خون و هم پروتئین در ادرار دیده می‌شود" +
          (crHigh ? " و شاخص کار کلیه هم بالاست" : "") +
          ". این ترکیب می‌تواند نشانه‌ی نوعی التهاب در کلیه (گلومرولونفریت) باشد که باید حتماً و به‌زودی بررسی شود.",
        action: "این هفته با پزشک مطرح کنید. این برگه را همراه ببرید. اگر ورم، کاهش ادرار یا فشار خون بالا دارید، زودتر مراجعه کنید.",
        suggest: ["بررسی توسط پزشک (احتمالاً نفرولوژی)", "عملکرد کلیه", "آزمایش کامل ادرار با بررسی کست"],
        warnings: [],
      };
    },
  },


  {
    id: "coagulation_abnormal",
    match: (e) => {
      const pt = e.graded.find((g) => g.test === "PT");
      const aptt = e.graded.find((g) => g.test === "APTT");
      const fib = e.graded.find((g) => g.test === "FIB");
      const inr = e.graded.find((g) => g.test === "INR");
      return (pt?.abnormal && pt.dir === "high") ||
             (aptt?.abnormal && aptt.dir === "high") ||
             (fib?.abnormal && fib.dir === "low") ||
             (inr?.abnormal && inr.dir === "high");
    },
    build: (e) => {
      const pt = e.graded.find((g) => g.test === "PT");
      const fib = e.graded.find((g) => g.test === "FIB");
      const inr = e.graded.find((g) => g.test === "INR");
      // PT>25، فیبرینوژن<100، یا INR>3 → فوری
      const severe = (pt && pt.value > 25) || (fib && fib.value < 100) ||
                     (inr && inr.value > 3);
      return {
        pattern: "coagulation_abnormal",
        urgency: severe ? "emergency" : "this_week",
        headline: "شاخص‌های لخته شدن خون شما غیرطبیعی هستند",
        must_say:
          "زمان لخته شدن خون طولانی‌تر از حد معمول است. " +
          "داروهای رقیق‌کننده خون هم می‌توانند این را بسازند.",
        action: severe
          ? "همین امروز با پزشک تماس بگیرید."
          : "این هفته با پزشک وقت بگیرید. حتماً بگویید چه داروهایی مصرف می‌کنید.",
        suggest: ["تکرار آزمایش انعقاد"],
        warnings: [
          "تا مشخص شدن علت، آسپرین یا مسکن‌های ضدالتهاب مصرف نکنید.",
          "اگر خونریزی غیرعادی یا کبودی بی‌دلیل دیدید، همان روز به پزشک مراجعه کنید.",
        ],
        blocks_others: severe,
      };
    },
  },

  // ═══════════ تیروئید ═══════════
  {
    id: "thyroid",
    match: (e) => {
      const tsh = e.graded.find((g) => g.test === "TSH");
      const ft4 = e.graded.find((g) => g.test === "FT4");
      const ft3 = e.graded.find((g) => g.test === "FT3");
      const t3 = e.graded.find((g) => g.test === "T3");
      const tpo = e.graded.find((g) => g.test === "ANTI_TPO");
      return tsh?.abnormal || ft4?.abnormal || ft3?.abnormal || t3?.abnormal || tpo?.abnormal;
    },
    build: (e) => {
      const tsh = e.graded.find((g) => g.test === "TSH");
      const ft4 = e.graded.find((g) => g.test === "FT4");
      const ft3 = e.graded.find((g) => g.test === "FT3");
      const t3 = e.graded.find((g) => g.test === "T3");
      const tpo = e.graded.find((g) => g.test === "ANTI_TPO");
      const tshLow = tsh?.abnormal && tsh.dir === "low";
      const tshHigh = tsh?.abnormal && tsh.dir === "high";
      const tshNormal = tsh != null && !tsh.abnormal;
      const ft4Low = ft4?.abnormal && ft4.dir === "low";
      const ft4High = ft4?.abnormal && ft4.dir === "high";
      const ft3Low = ft3?.abnormal && ft3.dir === "low";
      const t3High = (ft3?.abnormal && ft3.dir === "high") || (t3?.abnormal && t3.dir === "high");
      const t3Low = (ft3?.abnormal && ft3.dir === "low") || (t3?.abnormal && t3.dir === "low");
      const tpoHigh = tpo?.abnormal && tpo.dir === "high";

      // ── سندرم بیماری غیرتیروئیدی (euthyroid sick) ──
      // TSH نرمال/پایین + FT4 پایین + T3 پایین → لزوماً کم‌کاری واقعی نیست؛
      // اغلب در بیماری‌های شدید غیرتیروئیدی دیده می‌شود.
      if ((tshNormal || tshLow) && (ft4Low || ft3Low) && t3Low && !tshHigh) {
        return {
          pattern: "thyroid_nonthyroidal_illness",
          urgency: "routine",
          headline: "الگوی هورمون‌های تیروئید شما غیرمعمول است",
          must_say:
            "برخی هورمون‌های تیروئید پایین هستند در حالی که TSH طبیعی یا پایین است. " +
            "این الگو گاهی به‌جای مشکل خود تیروئید، در جریان یک بیماری یا استرس جسمی دیگر دیده می‌شود و ممکن است موقت باشد. " +
            "برای تفسیر درست بهتر است در زمان مناسب و توسط پزشک بررسی شود.",
          action: "نوبت عادی. اگر اخیراً بیماری شدیدی داشته‌اید به پزشک بگویید؛ معمولاً آزمایش بعداً تکرار می‌شود.",
          suggest: ["تکرار پنل تیروئید پس از بهبود", "بررسی توسط پزشک"],
          warnings: [],
        };
      }

      // ── تیروتوکسیکوز T3 (فقط T3 بالا، FT4 نرمال) ──
      if (t3High && !ft4High && (tshLow || tshNormal)) {
        return {
          pattern: "thyroid_t3_toxicosis",
          urgency: "this_week",
          headline: "یکی از هورمون‌های تیروئید (T3) شما بالاست",
          must_say:
            "هورمون T3 بالاست در حالی که هورمون دیگر (T4) طبیعی است. این می‌تواند نوعی پرکاری تیروئید باشد " +
            "که باید توسط پزشک بررسی شود.",
          action: "این هفته با پزشک مطرح کنید.",
          suggest: ["TSH", "FT4", "بررسی توسط پزشک"],
          warnings: [],
        };
      }

      // ── حالت ثانویه (هیپوفیزی): TSH پایین + FT4 پایین ──
      // در حالت عادی اگر تیروئید کم‌کار باشد TSH بالا می‌رود؛ اگر TSH هم
      // پایین باشد یعنی مشکل از هیپوفیز است، نه خود تیروئید. این پرکاری نیست.
      if (tshLow && ft4Low) {
        return {
          pattern: "thyroid_central_hypo",
          urgency: "this_week",
          headline: "الگوی تیروئید شما غیرمعمول است و نیاز به بررسی دقیق‌تر دارد",
          must_say:
            "هم هورمون تیروئید (FT4) و هم هورمون تنظیم‌کننده‌ی آن (TSH) پایین هستند. " +
            "این ترکیب غیرمعمول است و می‌تواند نشان‌دهنده‌ی مشکلی در غده‌ی تنظیم‌کننده در مغز (هیپوفیز) باشد، نه خود تیروئید. " +
            "حتماً باید توسط پزشک بررسی شود.",
          action: "این هفته با پزشک مطرح کنید و این نکته را بگویید که هر دو هورمون پایین هستند.",
          suggest: ["بررسی توسط پزشک (احتمالاً غدد)", "سایر هورمون‌های هیپوفیز در صورت صلاحدید"],
          warnings: [],
        };
      }

      // ── FT4 بالا ولی TSH پایین نیست (ناهماهنگ) ──
      // باید پیش از شاخهٔ «TSH بالا» بررسی شود، وگرنه FT4ِ بالا با TSHِ بالا
      // اشتباهاً «کم‌کاریِ تحت‌بالینی» برچسب می‌خورد (باگ).
      //  • TSH بالا + FT4 بالا → پرکاریِ ثانویه (تومورِ ترشح‌کنندهٔ TSH در هیپوفیز)
      //    یا مقاومت به هورمونِ تیروئید، یا تداخلِ آزمایش (Table 13.3، Moore؛ Table 14.1).
      //  • TSH طبیعی + FT4 بالا → در پرکاریِ واقعیِ اولیه TSH سرکوب می‌شود؛ پس
      //    اغلب خطای پیش‌تحلیلی (خون‌گیری ۶–۹ ساعت پس از لووتیروکسین) یا بیوتین است.
      if (ft4High && !tshLow) {
        const bothHigh = tshHigh;
        return {
          pattern: bothHigh ? "thyroid_secondary_hyper" : "thyroid_discordant_ft4_high",
          urgency: bothHigh ? "this_week" : "routine",
          headline: bothHigh
            ? "هم هورمون تیروئید و هم TSH بالا هستند — یک الگوی نادر که باید بررسی شود"
            : "هورمون تیروئید (FT4) بالاست ولی TSH طبیعی است — نیاز به بررسی",
          must_say: bothHigh
            ? `هورمون تیروئید FT4 بالاست (${ft4.value}؛ حد طبیعی ${ft4.range}) و TSH هم بالاست (${tsh.value}؛ حد طبیعی ${tsh.range}). ` +
              "در حالت طبیعی وقتی هورمون تیروئید بالا می‌رود TSH باید پایین بیاید؛ بالا بودنِ هر دو یک الگوی غیرمعمول است که می‌تواند نشان‌دهندهٔ علتی در غدهٔ هیپوفیز (مثلاً تومورِ خوش‌خیمِ ترشح‌کنندهٔ TSH)، مقاومتِ بدن به هورمون تیروئید، یا تداخلِ آزمایشگاهی باشد. " +
              "این نیاز به بررسی تخصصیِ غدد دارد؛ اولین گام، تکرارِ آزمایش برای رد کردنِ تداخل است."
            : `هورمون تیروئید FT4 بالاست (${ft4.value}؛ حد طبیعی ${ft4.range}) اما TSH طبیعی است. ` +
              "در پرکاریِ واقعیِ تیروئید معمولاً TSH پایین می‌آید؛ بنابراین این ترکیب اغلب به‌جای بیماری، ناشی از خطای آزمایشگاهی یا تداخل است — " +
              "مثلاً خون‌گیری ۶ تا ۹ ساعت پس از دوز لووتیروکسین، یا مصرف مکمل بیوتین. به‌ندرت می‌تواند علتی نادر داشته باشد. " +
              "بهتر است آزمایش در شرایط استاندارد تکرار و توسط پزشک بررسی شود.",
          action: bothHigh
            ? "این هفته با پزشک مطرح کنید؛ احتمالاً به متخصص غدد ارجاع می‌شوید و آزمایش نخست تکرار می‌شود."
            : "نوبت عادی. اگر مکمل بیوتین می‌خورید چند روز پیش از آزمایش با نظر پزشک قطع کنید؛ در صورت مصرف لووتیروکسین، خون‌گیری را پیش از دوز روزانه انجام دهید.",
          suggest: bothHigh
            ? ["تکرار FT4 و TSH", "بررسی توسط متخصص غدد", "FT3"]
            : ["تکرار FT4 و TSH در شرایط استاندارد"],
          warnings: [],
          key_number: ft4.value,
        };
      }

      // ── کم‌کاری اولیه: TSH بالا ──
      if (tshHigh) {
        const overt = ft4Low;
        // یافته‌های آزمایشگاهیِ همراه که کم‌کاری تیروئید می‌تواند خودش توضیح‌شان دهد
        // (Nishizawa-Brennen, «Thyroid Function»): هیپوناترمی، CK بالا، کم‌خونی، چربی بالا.
        const naG = e.graded.find((g) => g.test === "NA");
        const ckG = e.graded.find((g) => g.test === "CK");
        const hgbG = e.graded.find((g) => g.test === "HGB");
        const secondaryHits = [];
        if (naG?.abnormal && naG.dir === "low") secondaryHits.push("سدیم پایین");
        if (ckG?.abnormal && ckG.dir === "high") secondaryHits.push("آنزیم عضلانی CK بالا");
        if (hgbG?.abnormal && hgbG.dir === "low") secondaryHits.push("کم‌خونی");
        return {
          pattern: `thyroid_hypo_${overt ? "overt" : "subclinical"}`,
          urgency: overt ? "this_week" : "routine",
          headline: "غده تیروئید شما کندتر از حد معمول کار می‌کند",
          must_say:
            `TSH شما ${tsh.value} است (حد طبیعی ${tsh.range})` +
            (overt && ft4 != null ? ` و هورمون تیروئید FT4 پایین است (${ft4.value}؛ حد طبیعی ${ft4.range})` : "") +
            ". تیروئید غده‌ای در گردن است که سرعت سوخت‌وساز بدن را تنظیم می‌کند؛ TSH بالا یعنی بدن دارد غدهٔ کم‌کار را بیشتر تحریک می‌کند. " +
            (overt
              ? "چون هورمون تیروئید (FT4) هم پایین است، این یک کم‌کاری واضح است و معمولاً با علائمی مثل خستگی، سرمایی‌شدن، یبوست، خشکی پوست و افزایش وزن همراه است."
              : "چون هورمون تیروئید (FT4) هنوز طبیعی است، این کم‌کاری خفیف («تحت‌بالینی») است؛ برای تأیید معمولاً چند هفته بعد تکرار می‌شود و اغلب فقط پیگیری لازم دارد.") +
            (tpoHigh
              ? " آنتی‌بادی TPO هم بالاست، که اغلب نشان می‌دهد علت، نوعی التهاب خودایمنی تیروئید (هاشیموتو) است — این شایع‌ترین علت کم‌کاری تیروئید است."
              : "") +
            (secondaryHits.length
              ? ` ضمناً ${secondaryHits.join(" و ")} هم در نتایج شما دیده می‌شود؛ کم‌کاری تیروئید می‌تواند خودش عاملِ این‌ها باشد و با درمانِ تیروئید اغلب بهتر می‌شوند — این را با پزشک مطرح کنید.`
              : ""),
          action: overt ? "این هفته وقت بگیرید." : "نوبت عادی. معمولاً این آزمایش چند هفته بعد تکرار می‌شود.",
          suggest: tpoHigh ? ["FT4"] : ["FT4", "آنتی‌بادی TPO"],
          warnings: [],
          key_number: tsh.value,
        };
      }

      // ── پرکاری اولیه: TSH پایین (± FT4 بالا) ──
      // FT4ِ بالا فقط وقتی «واضح» است که TSH هم سرکوب شده باشد (پرکاریِ اولیه).
      if (tshLow) {
        const overt = ft4High;
        return {
          pattern: `thyroid_hyper_${overt ? "overt" : "subclinical"}`,
          urgency: overt ? "this_week" : "routine",
          headline: "غده تیروئید شما پرکارتر از حد معمول است",
          must_say:
            `TSH شما ${tsh.value} است (حد طبیعی ${tsh.range})` +
            (overt && ft4 != null ? ` و هورمون تیروئید FT4 بالاست (${ft4.value}؛ حد طبیعی ${ft4.range})` : "") +
            ". TSH پایین یعنی هورمون تیروئید بیش از نیاز بدن ساخته می‌شود؛ پرکاری تیروئید می‌تواند باعث تپش قلب، لاغری، لرزش، تعریق، گرمایی‌شدن و بی‌قراری شود. شایع‌ترین علت آن بیماری خودایمنی گریوز است. " +
            (overt ? "چون هورمون تیروئید (FT4) هم بالاست، این یک پرکاری واضح است." : "چون FT4 هنوز طبیعی است، این پرکاری خفیف («تحت‌بالینی») است؛ برای تأیید معمولاً چند هفته بعد تکرار می‌شود."),
          action: overt ? "این هفته وقت بگیرید." : "نوبت عادی. معمولاً این آزمایش چند هفته بعد تکرار می‌شود.",
          suggest: ["FT4", "FT3", "آنتی‌بادی گیرندهٔ TSH (TRAb)"],
          warnings: overt
            ? [
                "اگر تپش قلب شدید یا نامنظم، تنگی نفس یا درد سینه دارید، زودتر مراجعه کنید.",
                "اگر تب بالا همراه ضربان قلب بسیار تند و بی‌قراری یا گیجی شدید پیدا کردید، فوراً به اورژانس بروید (می‌تواند نشانهٔ «طوفان تیروئیدی»، یک وضعیت اورژانسی، باشد).",
              ]
            : [],
          key_number: tsh.value,
        };
      }

      // ── anti-TPO بالا با تیروئید ظاهراً طبیعی ──
      if (tpoHigh && !tshHigh && !tshLow && !ft4Low && !ft4High) {
        return {
          pattern: "thyroid_tpo_positive",
          urgency: "routine",
          headline: "آنتی‌بادی تیروئید (TPO) شما بالاست",
          must_say:
            "آنتی‌بادی TPO بالاست. این نشان می‌دهد سیستم ایمنی بدن با تیروئید تعامل دارد که می‌تواند به نوعی التهاب خودایمنی تیروئید مربوط باشد. " +
            "در این مرحله اگر بقیه‌ی هورمون‌ها طبیعی باشند، اغلب فقط پیگیری لازم است، چون گاهی با گذر زمان به کم‌کاری تیروئید می‌انجامد.",
          action: "نوبت عادی با پزشک. معمولاً تیروئید به‌صورت دوره‌ای پایش می‌شود.",
          suggest: ["پایش دوره‌ای TSH", "بررسی توسط پزشک"],
          warnings: [],
        };
      }

      // ── FT4/FT3 پایین با TSH طبیعی → ارجاع محتاط ──
      // Table 14.1 (Nishizawa-Brennen): TSHِ طبیعی + FT4ِ پایین می‌تواند کم‌کاریِ
      //   ثانویه (هیپوفیزی) یا اثرِ بیماریِ شدیدِ غیرتیروئیدی باشد؛ گاهی هم خطای
      //   آزمایشگاهی/تداخل (مثل بیوتین) — نه لزوماً کم‌کاریِ اولیهٔ تیروئید.
      return {
        pattern: "thyroid_ft4_abnormal",
        urgency: "routine",
        headline: "الگوی هورمون‌های تیروئید شما ناهماهنگ است و نیاز به بررسی دارد",
        must_say:
          (ft4Low && ft4 != null
            ? `هورمون تیروئید FT4 پایین است (${ft4.value}؛ حد طبیعی ${ft4.range}) در حالی که TSH طبیعی مانده است. `
            : "یکی از هورمون‌های تیروئید خارج از محدودهٔ طبیعی است در حالی که TSH طبیعی است. ") +
          "در کم‌کاریِ معمولِ تیروئید انتظار می‌رود TSH بالا برود؛ وقتی TSH بالا نرفته، این الگو می‌تواند نشانهٔ کم‌کاریِ ثانویه (مشکل در غدهٔ هیپوفیزِ مغز) یا اثرِ یک بیماریِ شدیدِ غیرتیروئیدی باشد، یا خطای آزمایشگاهی/تداخل (مثلاً مکمل بیوتین). " +
          "برای تفسیر درست باید با پزشک بررسی شود.",
        action: "نوبت عادی با پزشک. در صورت لزوم آزمایش در شرایط استاندارد تکرار می‌شود.",
        suggest: ["تکرار پنل تیروئید", "TSH و FT4"],
        warnings: [],
      };
    },
  },

  // ═══════════ کم‌کاری تیروئید + چربی بالا (نکته‌ی کیس ابونی) ═══════════
  // اگر کم‌کاری تیروئید و چربی بالا با هم باشند، ممکن است چربی ثانویه به
  //   تیروئید باشد و با درمان تیروئید بهتر شود. یک بینش مکمل (نه جایگزین).
  {
    id: "hypothyroid_dyslipidemia_link",
    match: (e) => {
      const tsh = e.graded.find((g) => g.test === "TSH");
      const tshHigh = tsh?.abnormal && tsh.dir === "high";
      if (!tshHigh) return false;
      // چربی بالا؟ کلسترول یا LDL بالا
      const chol = e.graded.find((g) => g.test === "CHOL");
      const ldl = e.graded.find((g) => g.test === "LDL");
      const cholHigh = chol?.abnormal && chol.dir === "high";
      const ldlHigh = ldl?.abnormal && ldl.dir === "high";
      return cholHigh || ldlHigh;
    },
    build: () => ({
      pattern: "hypothyroid_dyslipidemia_link",
      urgency: "this_week",
      headline: "کم‌کاری تیروئید و چربی خون بالا ممکن است به هم مربوط باشند",
      must_say:
        "هم نشانه‌ی کم‌کاری تیروئید و هم چربی خون بالا در نتایج شما دیده می‌شود. " +
        "نکته‌ی مهم این است که کم‌کاری تیروئید خودش می‌تواند باعث بالا رفتن چربی خون شود — " +
        "و در این حالت، با درمان تیروئید اغلب چربی هم بهتر می‌شود. این نکته را حتماً با پزشک در میان بگذارید.",
      action: "این هفته با پزشک مطرح کنید و به هر دو یافته اشاره کنید.",
      suggest: ["FT4", "پیگیری تیروئید پیش از تصمیم‌گیری نهایی درباره‌ی داروی چربی"],
      warnings: [],
    }),
  },

  // ═══════════ فقر آهن — با پنل آهن (نه فقط CBC) ═══════════
  // رویکرد الف: فقط وقتی پنل آهن موجود است فعال می‌شود.
  // اگر فقط CBC باشد، microcytic_anemia قبلی کار می‌کند.
  // گایدلاین (Labcorp/AAFP): فقر آهن = فریتین پایین + TIBC بالا + TSAT پایین.
  {
    id: "iron_deficiency_panel",
    match: (e) => {
      const t = val(e);
      // حداقل فریتین لازم است — قوی‌ترین نشانگر
      if (t.FERRITIN == null) return false;
      const ferr = e.graded.find((g) => g.test === "FERRITIN");
      const ferrLow = ferr?.abnormal && ferr.dir === "low";
      // فریتین پایین به‌تنهایی تقریباً قطعیِ فقر آهن است (اگر التهاب نباشد)
      const tsatLow = t.TSAT != null && t.TSAT < 20;
      const tibcHigh = (() => {
        const g = e.graded.find((x) => x.test === "TIBC");
        return g?.abnormal && g.dir === "high";
      })();
      return ferrLow || (tsatLow && tibcHigh);
    },
    build: (e) => {
      const t = val(e);
      const ferr = e.graded.find((g) => g.test === "FERRITIN");
      const ferrLow = ferr?.abnormal && ferr.dir === "low";
      // اگر CRP بالا باشد، فریتین ممکن است کاذب طبیعی باشد — احتیاط
      const crp = e.graded.find((g) => g.test === "CRP_Q");
      const inflam = crp?.abnormal && crp.dir === "high";
      return {
        pattern: "iron_deficiency",
        urgency: "this_week",
        headline: "الگوی آزمایش‌ها به کمبود آهن اشاره دارد",
        must_say:
          "ذخیره آهن بدن شما پایین است" +
          (ferrLow ? " (فریتین پایین، قوی‌ترین نشانه کمبود آهن)" : "") +
          ". شایع‌ترین علت‌ها خون‌ریزی مزمن (مثلاً قاعدگی سنگین یا دستگاه گوارش) و دریافت ناکافی آهن است." +
          (inflam ? " توجه: CRP شما بالاست و ممکن است تصویر آهن را پیچیده کند — پزشک باید تفسیر کند." : ""),
        action: "این هفته با پزشک وقت بگیرید. اگر خون‌ریزی گوارشی یا قاعدگی سنگین دارید حتماً بگویید.",
        suggest: ["پنل کامل آهن", "بررسی علت خون‌ریزی"],
        warnings: [
          "قبل از تأیید پزشک و مشخص شدن علت، خودتان دوز بالای آهن شروع نکنید.",
        ],
      };
    },
  },

  // ═══════════ کم‌خونی بیماری مزمن ═══════════
  // گایدلاین: آهن پایین + TIBC پایین/طبیعی + فریتین طبیعی/بالا + TSAT پایین.
  // تمایز کلیدی از فقر آهن: در فقر آهن TIBC بالاست، اینجا پایین.
  {
    id: "anemia_chronic_disease",
    match: (e) => {
      const t = val(e);
      const hgb = e.graded.find((g) => g.test === "HGB");
      const anemic = hgb?.abnormal && hgb.dir === "low";
      if (!anemic) return false;
      // نیاز به پنل آهن برای تمایز
      if (t.IRON == null || t.FERRITIN == null) return false;
      const iron = e.graded.find((g) => g.test === "IRON");
      const ferr = e.graded.find((g) => g.test === "FERRITIN");
      const ironLow = iron?.abnormal && iron.dir === "low";
      // فریتین طبیعی یا بالا (نه پایین) — این فقر آهن را رد می‌کند
      const ferrNotLow = !(ferr?.abnormal && ferr.dir === "low");
      // TIBC پایین یا طبیعی (نه بالا)
      const tibc = e.graded.find((g) => g.test === "TIBC");
      const tibcNotHigh = !(tibc?.abnormal && tibc.dir === "high");
      return ironLow && ferrNotLow && tibcNotHigh;
    },
    build: (e) => {
      const crp = e.graded.find((g) => g.test === "CRP_Q");
      const inflam = crp?.abnormal && crp.dir === "high";
      return {
        pattern: "anemia_of_chronic_disease",
        urgency: "this_week",
        headline: "الگوی کم‌خونی شما بیشتر به التهاب یا بیماری زمینه‌ای می‌خورد تا کمبود آهن",
        must_say:
          "برخلاف کمبود آهن، اینجا ذخیره آهن بدن پایین نیست — ولی بدن نمی‌تواند از آهن موجود خوب استفاده کند. " +
          "این الگو معمولاً همراه یک التهاب یا بیماری مزمن دیده می‌شود." +
          (inflam ? " CRP شما هم بالاست که با این تصویر همخوانی دارد." : ""),
        action: "این هفته با پزشک وقت بگیرید تا علت زمینه‌ای بررسی شود.",
        suggest: ["CRP", "بررسی بیماری زمینه‌ای", "عملکرد کلیه"],
        // مهم: در این نوع کم‌خونی آهن خوراکی کمکی نمی‌کند و گاهی مضر است
        forbid: ["آهن خوراکی", "قرص آهن", "iron supplement"],
        warnings: [
          "در این نوع کم‌خونی، مصرف خودسرانه قرص آهن معمولاً کمکی نمی‌کند. درمان روی علت اصلی است.",
        ],
      };
    },
  },

  // ═══════════ همولیز ═══════════
  // گایدلاین (AAFP/ARUP): LDH بالا + بیلی‌روبین غیرمستقیم بالا +
  //   هاپتوگلوبین پایین + رتیکولوسیت بالا → همولیز.
  // تله مهم (منبع): LDH+AST بالا با هاپتوگلوبین طبیعی → عضله، نه همولیز.
  {
    id: "hemolysis_pattern",
    match: (e) => {
      const t = val(e);
      // حداقل دو نشانگر از نشانگرهای اصلی همولیز لازم است
      const ldhHigh = (() => {
        const g = e.graded.find((x) => x.test === "LDH");
        return g?.abnormal && g.dir === "high";
      })();
      const haptoLow = (() => {
        const g = e.graded.find((x) => x.test === "HAPTO");
        return g?.abnormal && g.dir === "low";
      })();
      const reticHigh = (() => {
        const g = e.graded.find((x) => x.test === "RETIC");
        return g?.abnormal && g.dir === "high";
      })();
      // بیلی‌روبین غیرمستقیم بالا = توتال بالا با مستقیم طبیعی
      const indirectHigh = t.BILI_T != null && t.BILI_D != null &&
                           (t.BILI_T - t.BILI_D) > 1.0;
      const markers = [ldhHigh, haptoLow, reticHigh, indirectHigh].filter(Boolean).length;

      // تله عضله: LDH بالا + AST/CK بالا + هاپتوگلوبین طبیعی → عضله، نه همولیز.
      // این حالت هم باید الگو را فعال کند تا توضیح درست به کاربر برسد
      // (وگرنه در تور ایمنی عمومی می‌افتد و پیام گمراه‌کننده می‌دهد).
      const ast = e.graded.find((g) => g.test === "AST");
      const ck = e.graded.find((g) => g.test === "CK");
      const muscleTrap = ldhHigh && !haptoLow &&
                         ck?.abnormal && ck.dir === "high" &&
                         ast?.abnormal && ast.dir === "high";

      // هاپتوگلوبین پایین قوی‌ترین نشانه است؛ اگر باشد یک نشانه دیگر کافی است
      return muscleTrap || (haptoLow && markers >= 2) || markers >= 3;
    },
    build: (e) => {
      const t = val(e);
      // تله عضله: اگر AST و CK بالا و هاپتوگلوبین طبیعی → احتمالاً عضله
      const ast = e.graded.find((g) => g.test === "AST");
      const ck = e.graded.find((g) => g.test === "CK");
      const hapto = e.graded.find((g) => g.test === "HAPTO");
      const haptoLow = hapto?.abnormal && hapto.dir === "low";
      const muscleTrap = !haptoLow &&
                         ck?.abnormal && ck.dir === "high" &&
                         ast?.abnormal && ast.dir === "high";
      if (muscleTrap) {
        return {
          pattern: "ldh_muscle_not_hemolysis",
          urgency: "routine",
          headline: "چند شاخص بالا هستند، ولی الگو بیشتر به عضله می‌خورد تا خون",
          must_say:
            "LDH و برخی آنزیم‌ها بالا هستند، ولی هاپتوگلوبین طبیعی است — " +
            "این به آسیب یا فعالیت عضلانی اشاره دارد نه شکستن گلبول قرمز. ورزش سنگین اخیر هم می‌تواند علت باشد.",
          action: "نوبت عادی. اگر ورزش سنگین کرده‌اید حتماً به پزشک بگویید.",
          suggest: ["CK", "تکرار آزمایش پس از استراحت"],
          warnings: [],
        };
      }
      return {
        pattern: "hemolysis_likely",
        urgency: "this_week",
        headline: "الگوی آزمایش‌ها به شکستن گلبول‌های قرمز (همولیز) اشاره دارد",
        must_say:
          "چند شاخص با هم نشان می‌دهند که گلبول‌های قرمز شما ممکن است زودتر از حد معمول تجزیه شوند. " +
          "علت‌های زیادی دارد — از ارثی تا خودایمنی و دارویی — و برای مشخص شدن باید بررسی شود.",
        action: "این هفته با پزشک وقت بگیرید. این برگه را همراه ببرید.",
        suggest: ["هاپتوگلوبین", "رتیکولوسیت", "بیلی‌روبین مستقیم و غیرمستقیم", "اسمیر خون محیطی", "تست کومبس"],
        warnings: [],
      };
    },
  },

  // ═══════════ سیروز / نارسایی مزمن کبد ═══════════
  // الگوی کلاسیک: آلبومین پایین + بیلی‌روبین بالا + پلاکت پایین
  //   (هایپراسپلنیسم) + INR بالا (اختلال ساخت فاکتورهای انعقادی).
  {
    id: "cirrhosis_pattern",
    match: (e) => {
      const t = val(e);
      const alb = e.graded.find((g) => g.test === "ALB");
      const albLow = alb?.abnormal && alb.dir === "low";
      const plt = e.graded.find((g) => g.test === "PLT");
      const pltLow = plt?.abnormal && plt.dir === "low";
      const biliHigh = (() => {
        const g = e.graded.find((x) => x.test === "BILI_T");
        return g?.abnormal && g.dir === "high";
      })();
      const inrHigh = t.INR != null && t.INR > 1.3;
      // نیاز به حداقل ۳ نشانه از ۴ برای احتیاط (این تشخیص سنگینی است)
      const markers = [albLow, pltLow, biliHigh, inrHigh].filter(Boolean).length;
      return markers >= 3;
    },
    build: () => ({
      pattern: "chronic_liver_disease_pattern",
      urgency: "this_week",
      headline: "چند شاخص با هم به مشکل مزمن کبد اشاره دارند",
      must_say:
        "ترکیبی از نتایج (پروتئین سازنده کبد پایین، پلاکت پایین، و شاخص‌های دیگر) " +
        "می‌تواند نشانه‌ای از کاهش عملکرد کبد در طول زمان باشد. این یک تشخیص قطعی نیست، " +
        "ولی الگویی است که حتماً باید توسط پزشک بررسی شود.",
      action: "این هفته با پزشک وقت بگیرید. لیست کامل داروها، مکمل‌ها و سابقه مصرف الکل را همراه ببرید.",
      suggest: ["سونوگرافی کبد", "آنزیم‌های کبدی", "هپاتیت B و C", "فیبرواسکن"],
      warnings: [
        "تا وقتی پزشک بررسی نکرده، از داروهای بدون نسخه (به‌خصوص استامینوفن) و مکمل گیاهی پرهیز کنید.",
      ],
    }),
  },

  // ═══════════ الگوی کبد الکلی ═══════════
  // نسبت De Ritis: AST/ALT ≥ 2 + GGT بالا + گاهی MCV بالا → منشأ الکلی.
  {
    id: "alcoholic_liver_pattern",
    match: (e) => {
      const t = val(e);
      if (t.AST == null || t.ALT == null || t.ALT === 0) return false;
      const ast = e.graded.find((g) => g.test === "AST");
      const alt = e.graded.find((g) => g.test === "ALT");
      // حداقل یکی از آنزیم‌ها باید بالا باشد
      const anyHigh = (ast?.abnormal && ast.dir === "high") ||
                      (alt?.abnormal && alt.dir === "high");
      const deRitis = t.AST / t.ALT >= 2;
      const ggtHigh = (() => {
        const g = e.graded.find((x) => x.test === "GGT");
        return g?.abnormal && g.dir === "high";
      })();
      // نسبت ≥۲ به‌تنهایی گمراه‌کننده است؛ GGT بالا هم لازم است
      return anyHigh && deRitis && ggtHigh;
    },
    build: (e) => {
      const t = val(e);
      const mcvHigh = t.MCV != null && t.MCV > 100;
      const ratio = t.ALT ? +(t.AST / t.ALT).toFixed(1) : null;
      return {
        pattern: "alcoholic_liver_pattern",
        urgency: "this_week",
        ...(ratio != null ? { key_number: ratio } : {}),
        headline: "الگوی آنزیم‌های کبدی شما نوع خاصی دارد که باید بررسی شود",
        must_say:
          `دو آنزیم کبدی شما AST برابر ${t.AST} و ALT برابر ${t.ALT} است؛ ` +
          `نسبت AST به ALT حدود ${ratio} می‌شود و همراه با بالا بودن GGT الگویی می‌سازد که ` +
          "وقتی این نسبت بالای ۲ باشد، بیشتر به آسیب کبدیِ ناشی از الکل می‌خورد (هرچند بعضی علل دیگر هم ممکن است). " +
          "نکته: در آسیب کبدیِ الکلی این آنزیم‌ها معمولاً زیر ۳۰۰ می‌مانند؛ اگر خیلی بالاتر (چند هزار) بودند، علت‌های دیگری مثل هپاتیت حاد ویروسی یا مسمومیت مطرح‌تر است." +
          (mcvHigh ? " بزرگ بودن گلبول‌های قرمز (MCV بالا) هم گاهی همراه این الگو دیده می‌شود." : ""),
        action: "این هفته با پزشک وقت بگیرید و درباره مصرف الکل صادقانه صحبت کنید — این به تشخیص درست کمک می‌کند.",
        suggest: ["GGT", "سونوگرافی کبد", "آنزیم‌های کبدی تکراری"],
        warnings: [
          "اگر الکل مصرف می‌کنید، قطع ناگهانی در برخی افراد خطرناک است — با پزشک درباره روش ایمن مشورت کنید.",
        ],
      };
    },
  },

  // ═══════════ عفونت ویروسی — لنفوسیتوز ═══════════
  {
    id: "viral_lymphocytosis",
    match: (e) => {
      const lymph = e.graded.find((g) => g.test === "LYMPH_ABS");
      const lymphHigh = lymph?.abnormal && lymph.dir === "high";
      // نوتروفیل بالا نباشد (که به باکتریایی می‌خورد)
      const neut = e.graded.find((g) => g.test === "NEUT_ABS");
      const neutHigh = neut?.abnormal && neut.dir === "high";
      return lymphHigh && !neutHigh;
    },
    build: () => ({
      pattern: "viral_lymphocytosis",
      urgency: "routine",
      headline: "افزایش لنفوسیت‌ها معمولاً به یک عفونت ویروسی اشاره دارد",
      must_say:
        "لنفوسیت‌ها نوعی گلبول سفیدند که در عفونت‌های ویروسی بالا می‌روند. " +
        "این معمولاً موقتی است و پس از بهبود عفونت به حالت عادی برمی‌گردد.",
      action: "اگر علائم دارید یا این عدد خیلی بالاست، با پزشک مطرح کنید. در غیر این صورت تکرار آزمایش بعد از چند هفته کافی است.",
      suggest: ["تکرار CBC پس از بهبود", "اسمیر خون محیطی در صورت تداوم"],
      warnings: [],
    }),
  },

  // ═══════════ ویتامین D ═══════════
  // تک‌تست، ولی بدون این قاعده کمبود ویتامین D (شایع‌ترین اختلال این جمعیت)
  // به unmatched_abnormal می‌افتاد و به بیمار می‌گفت «توضیح آماده‌ای نداریم».
  // آستانه‌ها Endocrine Society 2011 (در interpret.js/refs.js مستند شده).
  {
    id: "vitamin_d_abnormal",
    match: (e) => {
      const d = e.graded.find((g) => g.test === "VIT_D");
      return ["deficiency", "insufficiency", "above_target", "possible_toxicity"].includes(d?.tag);
    },
    build: (e) => {
      const d = e.graded.find((g) => g.test === "VIT_D");
      const high = d.tag === "above_target" || d.tag === "possible_toxicity";
      if (high) {
        const toxic = d.tag === "possible_toxicity";
        return {
          pattern: "vitamin_d_high",
          urgency: "routine",
          headline: "ویتامین D خون شما بالاتر از حد مطلوب است",
          must_say: toxic
            ? `سطح ویتامین D شما ${d.value} است (محدودهٔ مطلوب حدود ۳۰ تا ۱۰۰). این معمولاً ناشی از مصرف زیاد مکمل است، نه بیماری. ` +
              "ویتامین D خیلی زیاد می‌تواند باعث بالا رفتن کلسیم خون شود، پس بهتر است بررسی شود."
            : `سطح ویتامین D شما ${d.value} است (محدودهٔ مطلوب حدود ۳۰ تا ۱۰۰) — کمی بالاتر از حد مطلوب. این معمولاً از مصرف مکمل است و نگران‌کننده نیست.`,
          action: "مصرف مکمل ویتامین D و دوز آن را با پزشک در میان بگذارید.",
          suggest: [],
          warnings: [],
        };
      }
      const deficient = d.tag === "deficiency";
      return {
        pattern: "vitamin_d_deficiency",
        urgency: "routine",
        headline: deficient
          ? "ویتامین D خون شما کم است"
          : "ویتامین D خون شما کمی کمتر از حد مطلوب است",
        must_say: deficient
          ? `سطح ویتامین D شما ${d.value} است (محدودهٔ مطلوب حدود ۳۰ تا ۱۰۰) — یعنی کمبود. ` +
            "کمبود ویتامین D بسیار شایع است و معمولاً با قرار گرفتن کم در معرض آفتاب و دریافت ناکافی از غذا ارتباط دارد. این وضعیت " +
            "معمولاً جدی نیست ولی بهتر است اصلاح شود، چون ویتامین D برای سلامت استخوان و عضله لازم است."
          : `سطح ویتامین D شما ${d.value} است (محدودهٔ مطلوب حدود ۳۰ تا ۱۰۰) — کمی کمتر از حد مطلوب. ` +
            "این یافتهٔ رایجی است و معمولاً با اصلاح تغذیه و نور آفتاب یا مکمل قابل بهبود است.",
        action:
          "دربارهٔ مصرف مکمل ویتامین D و دوز مناسب با پزشک مشورت کنید — دوز خودسرانه‌ی بالا لازم نیست و می‌تواند مضر باشد.",
        suggest: [],
        warnings: [],
      };
    },
  },
];

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
//    پیشنهادها («تکرار CBC»، «پایش دوره‌ای TSH»، «تکرار کراتینین») دقیقاً دربارهٔ
//    آزمایشی هستند که همین حالا داریم و باید بمانند. تطبیق دقیق تضمین می‌کند
//    فقط پیشنهادِ «آزمایشی بده که همین الان دستت هست» حذف شود.
//    ورودی چندتستی فقط وقتی حذف می‌شود که همهٔ اجزایش موجود باشد.
export const SUGGEST_TESTS = {
  "فریتین": ["FERRITIN"],
  "آهن سرم": ["IRON"],
  "TIBC": ["TIBC"],
  "پنل کامل آهن": ["FERRITIN", "IRON", "TIBC"],
  "TSH": ["TSH"],
  "FT4": ["FT4"],
  "FT3": ["FT3"],
  "TSH و FT4": ["TSH", "FT4"],
  "PLT": ["PLT"],
  "WBC": ["WBC"],
  "CRP": ["CRP_Q"],
  "ALP": ["ALP"],
  "AST": ["AST"],
  "GGT": ["GGT"],
  "PT": ["PT"],
  "FIB": ["FIB"],
  "CK": ["CK"],
  "HbA1c": ["HBA1C"],
  "بیلی‌روبین": ["BILI_T"],
  "آلبومین خون": ["ALB"],
  "آلبومین (برای تصحیح کلسیم)": ["ALB"],
  "ویتامین B12": ["B12"],
  "فولات": ["FOLATE"],
  "آمیلاز": ["AMYLASE"],
  "رتیکولوسیت": ["RETIC"],
  "هاپتوگلوبین": ["HAPTO"],
  "قند خون ناشتا (FBS)": ["GLU_F"],
  // ⚠️ اگر قند/ESR/CRP همین حالا روی برگه هست، «درخواستش» همان باگِ
  //    «درخواست آزمایش فریتین» است. قالبِ «تکرارِ …» عمداً اینجا نیست —
  //    پایشِ سریالی درخواستِ تکراری نیست.
  "قند خون": ["GLU_F"],
  "ESR": ["ESR"],
  "CRP کمی (mg/L)": ["CRP_Q"],
  "شمارش خون (CBC)": ["HGB", "WBC", "PLT"],
  // ⚠️ Na+K تنها، الکترولیت‌ها را «کامل» نمی‌کند. در نارسایی کلیه، Ca/فسفات/
  //    بی‌کربناتِ غایب همان‌هایی‌اند که پیشنهاد باید بخواهد. مجموعهٔ کامل را شرط می‌کنیم
  //    تا پیشنهاد فقط وقتی حذف شود که واقعاً همه‌شان موجود باشند.
  "الکترولیت‌ها": ["NA", "K", "CA", "PHOS", "HCO3"],
};

/** آیا این پیشنهاد، آزمایشی است که همین حالا اندازه‌گیری شده؟ */
export function alreadyMeasured(suggestion, measuredKeys) {
  const keys = SUGGEST_TESTS[suggestion];
  return !!keys && keys.every((k) => measuredKeys.has(k));
}

export function runPatterns(engineOut) {
  const findings = [];
  for (const rule of RULES) {
    try {
      if (!rule.match(engineOut)) continue;
      const f = rule.build(engineOut);
      if (f) findings.push({ rule_id: rule.id, ...f });
    } catch {
      /* قاعده خراب نباید موتور را بخواباند */
    }
  }

  // ⚠️ باگ واقعی: در پنل فقر آهن که فریتین/آهن/TIBC هر سه وارد شده بودند،
  //    به کاربر گفته می‌شد «درخواست آزمایش فریتین از پزشک».
  //    اینجا فیلتر می‌شود — نه در ساخت توصیه‌ها — چون suggest از طریق پرامپت
  //    به LLM هم می‌رود و مدل صادقانه بازگویش می‌کند. سرِ منبع باید پاک باشد.
  const measured = new Set((engineOut?.graded ?? []).map((g) => g.test));
  for (const f of findings) {
    if (f.suggest?.length) {
      f.suggest = f.suggest.filter((s) => !alreadyMeasured(s, measured));
    }
  }

  // ═══ تور ایمنی ═══
  // 🔴 باگ واقعی: WBC=258 هیچ قاعده‌ای نداشت → findings خالی →
  //    سرور گفت «نتایج شما طبیعی است».
  //
  // هیچ‌وقت نمی‌شود همه‌ی الگوها را از قبل نوشت. پس اگر تستی
  // غیرطبیعی بود ولی قاعده‌ای نداشت، یک finding عمومی بساز.
  if (findings.length === 0 && engineOut.abnormal.length > 0) {
    const worst = [...engineOut.abnormal].sort(
      (a, b) => (rankOf(b) - rankOf(a))
    )[0];
    const hasCritical = engineOut.abnormal.some((a) => a.level === "critical");
    const hasMarked = engineOut.abnormal.some(
      (a) => a.level === "marked" || a.ctcaeGrade >= 3
    );
    // بحرانی → emergency، شدید → this_week، بقیه → routine
    const urgency = hasCritical ? "emergency" : hasMarked ? "this_week" : "routine";
    findings.push({
      rule_id: "unmatched_abnormal",
      pattern: "unmatched_abnormal",
      urgency,
      blocks_others: hasCritical,
      headline: "بعضی از نتایج خارج از محدوده طبیعی هستند",
      must_say:
        `${engineOut.abnormal.length} مورد خارج از محدوده مرجع است` +
        (worst ? `، از جمله ${faName(worst.test)} با مقدار ${worst.value} (طبیعی ${worst.range})` : "") +
        ". برای این ترکیب توضیح آماده‌ای نداریم.",
      action: hasCritical
        ? "همین امروز با پزشک تماس بگیرید و این برگه را همراه ببرید."
        : hasMarked
        ? "این هفته با پزشک وقت بگیرید و این برگه را همراه ببرید."
        : "نتایج را با پزشک خود در میان بگذارید.",
      suggest: [],
      warnings: [],
    });
  }

  // ═══ انتخاب یافته‌ها ═══
  // 🔴 باگ قبلی: .find() فقط اولین blocks_others را برمی‌داشت و
  //    بقیه را دور می‌ریخت. بیمار با تروپونین مثبت + پلاکت ۳۰ +
  //    لاکتات ۶ فقط تروپونین را می‌دید — سه اورژانس ناپدید.
  //
  //    خطر واقعی: پلاکت ۳۰ یعنی خطر خونریزی. اگر پنهان بماند و
  //    بیمار برای «مشکل قلبی» آسپرین بگیرد، کشنده است.
  //
  // درست: blocks_others یعنی «موارد کم‌اهمیت‌تر را بپوشان»،
  //       نه «بقیه‌ی اورژانس‌ها را حذف کن».
  const order = { emergency: 0, this_week: 1, routine: 2 };
  const rank = (u) => (u in order ? order[u] : 2);  // urgency نامعتبر → routine

  // blocks_others یعنی «موارد کم‌اهمیت‌تر را بپوشان» — یعنی هرچه فوریتش از
  // خودِ blocker پایین‌تر است. نه هاردکد "emergency": اگر روزی blocker با
  // فوریت this_week تعریف شود، فیلترِ === "emergency" خودِ blocker را هم
  // حذف می‌کرد و selected خالی می‌شد → overall_urgency اشتباهاً "none".
  const blockerRank = Math.min(
    ...findings.filter((f) => f.blocks_others).map((f) => rank(f.urgency))
  );
  const hasBlocker = Number.isFinite(blockerRank);

  // always_show: یافته‌ای که حتی زیر یک blockerِ مهم‌تر هم نباید پنهان شود
  //   (مثل D-dimer که همیشه باید دست‌کم یک اشارهٔ کوتاه داشته باشد). بقیهٔ
  //   موارد کم‌اهمیت‌تر طبق روال پنهان می‌شوند تا پیام اورژانس رقیق نشود.
  const selected = hasBlocker
    ? findings.filter((f) => rank(f.urgency) <= blockerRank || f.always_show)
    : findings;

  // یافتهٔ always_show که فقط به‌خاطر همین استثنا زیر یک blocker مانده،
  //   نسخهٔ کوتاهش (brief) را می‌گیرد تا پیام اورژانس را شلوغ نکند.
  const shown = selected.map((f) =>
    hasBlocker && f.always_show && rank(f.urgency) > blockerRank && f.brief
      ? { ...f, must_say: f.brief, warnings: [], suggest: [] }
      : f
  );

  shown.sort((a, b) => rank(a.urgency) - rank(b.urgency));

  return {
    findings: shown,
    overall_urgency: shown[0]?.urgency ?? "none",
    has_critical: shown.some((f) => f.urgency === "emergency"),
    // چند مورد کم‌اهمیت‌تر پنهان شد — برای شفافیت
    suppressed: hasBlocker ? findings.length - shown.length : 0,
  };
}
