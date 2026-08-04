// ============================================================
// سنجشِ «آیا مدل این یافته را واقعاً منتقل کرد؟»
//
// ⚠️ باگ واقعی (با فراخوانیِ زندهٔ gpt-4o-mini تأیید شد): تورِ ایمنیِ
//    اورژانس در server.js حضورِ یافته را با «زیررشتهٔ عینیِ کلِ must_say»
//    می‌سنجید. مدل یافتهٔ رابدومیولیز (۱۰ جمله) را خلاصه نوشت، تطبیقِ عینی
//    شکست خورد، و تور کلِ بلوک را دوباره append کرد → بیمار توضیح را دو بار
//    دید (۱۹ جمله، ۴ جملهٔ عیناً تکراری).
//
//    هرچه must_say غنی‌تر شود، کپیِ کلمه‌به‌کلمه بعیدتر است؛ یعنی آن تور
//    دقیقاً با هدفِ «تفسیر حرفه‌ای» در تضاد بود.
//
// راه‌حل: جمله‌به‌جمله بسنج. هر جمله با توکن‌های متمایزش (اعداد + واژه‌های
//    نه‌چندان رایج) سنجیده می‌شود، نه با زیررشتهٔ عینی — پس بازنویسیِ مدل
//    «منتقل‌شده» حساب می‌شود. فقط جمله‌هایی که واقعاً غایب‌اند برمی‌گردند.
//
// جهتِ خطا عمداً محافظه‌کارانه است: اگر شک داشتیم، جمله را غایب می‌گیریم و
//    اضافه می‌کنیم. تکرارِ یک جمله بد است؛ گم‌شدنِ یک هشدارِ اورژانسی خطرناک.
// ============================================================

import { FA_NAMES } from "./names.js";

// واژه‌های پرتکرار که حضورشان چیزی را اثبات نمی‌کند
const STOP_FA = new Set([
  "است", "هست", "بود", "شما", "این", "آن", "که", "برای", "با", "در", "از", "را",
  "هم", "یا", "ولی", "اما", "چون", "تا", "بر", "هر", "خود", "می‌شود", "میشود",
  "می‌تواند", "میتواند", "باید", "دارد", "دارید", "شده", "شود", "کنید", "نیست",
  "حد", "طبیعی", "مقدار", "خون", "بالا", "پایین", "بیشتر", "کمتر", "معمولاً",
]);

/** ارقام فارسی → لاتین، حذف نیم‌فاصله، یکسان‌سازی ی/ک عربی، حذف نشانه‌گذاری */
export function normalizeFa(s) {
  return String(s ?? "")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/‌/g, "")
    .replace(/[ىي]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** همان تقسیم‌بندیِ جمله که تورهای ایمنیِ server.js استفاده می‌کنند */
export function splitSentences(s) {
  return String(s ?? "")
    .split(/(?<=[.؟!])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** توکن‌های متمایزِ یک جمله: عددها + واژه‌های ≥۴ حرف که stop-word نیستند */
export function distinctiveTokens(sentence) {
  const words = normalizeFa(sentence).split(" ").filter(Boolean);
  return [...new Set(words.filter((w) => /\d/.test(w) || (w.length >= 4 && !STOP_FA.has(w))))];
}

/**
 * جمله‌هایی از must_say که در متنِ مدل پیدا نمی‌شوند.
 *
 * @param {string} mustSay   متنِ قطعیِ موتور
 * @param {string} modelText متنی که مدل نوشته (summary + interpretation)
 * @param {number} threshold نسبتِ توکنِ لازم برای «منتقل شده» (پیش‌فرض ۰.۶)
 * @returns {string[]} جمله‌های غایب، به همان ترتیبِ must_say
 */
export function missingSentences(mustSay, modelText, threshold = 0.6) {
  if (!mustSay) return [];
  // مسیرِ سریع: اگر عیناً آمده، هیچ‌چیز غایب نیست
  if (modelText && String(modelText).includes(mustSay)) return [];

  const modelTokens = new Set(normalizeFa(modelText).split(" ").filter(Boolean));
  return splitSentences(mustSay).filter((sent) => {
    const toks = distinctiveTokens(sent);
    // جمله‌ای که هیچ توکنِ متمایزی ندارد قابلِ سنجش نیست → غایب فرضش نکن
    if (!toks.length) return false;
    const hits = toks.filter((t) => modelTokens.has(t)).length;
    return hits / toks.length < threshold;
  });
}

/**
 * برای یک یافتهٔ اورژانسی، متنی که باید به تفسیر اضافه شود (یا "" اگر لازم نیست).
 * اگر هیچ جمله‌ای منتقل نشده باشد، سرتیتر هم می‌آید تا معلوم باشد دربارهٔ چیست.
 */
export function missingFindingText(finding, modelText, threshold = 0.6) {
  const missing = missingSentences(finding?.must_say, modelText, threshold);
  if (!missing.length) return "";
  const total = splitSentences(finding.must_say).length;
  const whollyAbsent = missing.length === total;
  return (whollyAbsent && finding.headline ? `${finding.headline}. ` : "") + missing.join(" ");
}

// ============================================================
// ادعای وضعیت دربارهٔ تستی که روی برگه نیست  (N4 / T10)
//
// دو تورِ بالا فقط چیزِ *افتاده* را برمی‌گردانند. این یکی مسئلهٔ برعکس است:
// چیزی که مدل *اضافه* کرده. مدل دیده «کراتینین اندازه‌گیری نشده» و نوشته
// «کراتینین شما طبیعی است» — یعنی بیمار دربارهٔ آزمایشی که اصلاً نداده،
// اطمینانِ خاطرِ کاذب می‌گیرد. این بدترین شکلِ خطاست، چون بی‌سروصداست.
//
// تطبیق از FA_NAMES می‌آید، نه regex روی نام تست: «کراتینین» → CREAT.
// هر جای دیگر این پروژه کلید را با faName() به متن تبدیل می‌کند؛ اینجا
// همان نگاشت برعکس خوانده می‌شود، پس افزودنِ یک تستِ جدید به names.js
// خودبه‌خود این تور را هم پوشش می‌دهد و هیچ فهرستِ دومی نگهداری نمی‌شود.
//
// ⚠️ جهتِ خطا اینجا برعکسِ دو تورِ بالاست و باید باشد. آن‌ها متن *اضافه*
//    می‌کنند، پس شک به نفعِ اضافه‌کردن است. این یکی متن *حذف* می‌کند، و
//    حذفِ نابه‌جا یعنی گم‌شدنِ حرفِ درست. پس سه شرط با هم لازم است:
//      ۱) جمله ادعای وضعیت داشته باشد (نه صرفاً نامِ تست را بیاورد)،
//      ۲) به تستی اشاره کند که اندازه‌گیری نشده،
//      ۳) و به هیچ تستِ اندازه‌گیری‌شده‌ای اشاره نکند.
//    شرط ۳ یعنی جملهٔ مخلوط («هموگلوبین پایین است و کراتینین طبیعی») نگه
//    داشته می‌شود. این حفره است و آگاهانه پذیرفته شده: بریدنِ نیمهٔ درستِ
//    یک جمله بدتر از نگه‌داشتنِ نیمهٔ غلط آن است، و N7 می‌گوید تورِ ایمنی
//    نباید با متنِ خوب بجنگد. اگر روزی لازم شد، جای درستش «بندِ ادعا» است
//    نه جمله.
// ============================================================

// جمله باید *ادعا* کند، نه فقط نام ببرد. روی متنِ نرمال‌شده تست می‌شود،
// پس نیم‌فاصله‌ها قبلاً حذف شده‌اند («اندازه‌گیری» → «اندازهگیری»).
const CLAIM_RX =
  /طبیعی|نرمال|در محدوده|سالم|مشکلی ندار|مشکلی نیست|بالاست|پایین است|بالا رفته|افزایش|کاهش/;

// «اندازه‌گیری نشده» خودش حرفِ درستِ موتور است — هرگز حذفش نکن. اگر مدل
// همان را بازنویسی کرده باشد، این جمله باید بماند.
const ABSENCE_RX =
  /اندازهگیری نشده|اندازهگیری نشد|انجام نشده|گزارش نشده|در دسترس نیست|موجود نیست/;

/** نام فارسی/لاتینِ یک کلید → شکل‌های قابلِ تطبیق در متن */
function surfaceForms(key, name) {
  const forms = [];
  const paren = String(name).match(/\(([^)]*)\)/)?.[1];
  forms.push(String(name).replace(/\([^)]*\)/g, " "));   // برچسبِ اصلی
  if (paren) forms.push(paren);                           // توضیحِ داخلِ پرانتز
  for (const tok of String(name).match(/[A-Za-z][A-Za-z0-9-]+/g) ?? []) forms.push(tok);
  if (/^[A-Z0-9_]+$/.test(key) && !key.includes("_")) forms.push(key);
  return [...new Set(forms.map(normalizeFa).filter((f) => f.length >= 2))];
}

/**
 * جمله‌هایی را که دربارهٔ تستِ اندازه‌گیری‌نشده ادعای وضعیت می‌کنند حذف می‌کند.
 *
 * @param {string}   text         متنِ مدل (summary یا interpretation)
 * @param {string[]} measuredKeys کلیدهایی که واقعاً روی برگه بوده‌اند
 * @param {object}   names        نگاشتِ کلید→نام (پیش‌فرض FA_NAMES)
 * @returns {string} همان متن، منهای جمله‌های ادعای کاذب
 */
export function stripUnmeasuredClaims(text, measuredKeys, names = FA_NAMES) {
  if (!text) return text ?? "";
  const measured = new Set(measuredKeys ?? []);

  // فقط کلیدهایی که *نامِ* قابلِ تطبیق دارند. کلیدِ بدونِ نام در FA_NAMES
  // اصلاً نباید در متن باشد (کلاسِ N8) و اینجا هم قضاوتش نمی‌کنیم.
  const index = Object.entries(names).map(([key, name]) => ({
    key,
    forms: surfaceForms(key, name),
  }));

  const kept = splitSentences(text).filter((sent) => {
    const norm = ` ${normalizeFa(sent)} `;
    if (!CLAIM_RX.test(norm)) return true;      // ادعایی در کار نیست
    if (ABSENCE_RX.test(norm)) return true;     // خودش می‌گوید اندازه‌گیری نشده

    const hit = index.filter(({ forms }) => forms.some((f) => norm.includes(` ${f} `)));
    if (hit.some(({ key }) => measured.has(key))) return true;
    const unmeasured = hit.filter(({ key }) => !measured.has(key));
    if (!unmeasured.length) return true;

    // ⚠️ نامِ دو تستِ هم‌خانواده می‌تواند تا یک واژه به هم نزدیک باشد:
    //    «قند خون» (GLU_RANDOM) و «قند ناشتا» (GLU_F). اگر برگه فقط قند ناشتا
    //    داشته باشد و مدل بنویسد «قند خون شما بالاست»، تطبیقِ سرراست آن را
    //    ادعای کاذب می‌شمارد و یک جملهٔ *درست* را می‌بُرد. پس اگر نامِ تستِ
    //    اندازه‌گیری‌نشده حتی یک واژهٔ معنادار با نامِ یک تستِ اندازه‌گیری‌شده
    //    مشترک داشته باشد، مرجعِ جمله مبهم است و حذف نمی‌کنیم.
    const measuredTokens = new Set(
      index.filter(({ key }) => measured.has(key))
        .flatMap(({ forms }) => forms.flatMap((f) => f.split(" ")))
        .filter((w) => w.length >= 3),
    );
    const ambiguous = unmeasured.some(({ forms }) =>
      forms.flatMap((f) => f.split(" ")).some((w) => w.length >= 3 && measuredTokens.has(w)),
    );
    return ambiguous;
  });

  return kept.join(" ");
}
