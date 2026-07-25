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
