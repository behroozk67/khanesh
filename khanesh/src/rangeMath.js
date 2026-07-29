// ============================================================
// ریاضیِ نوارِ محدودهٔ مرجع — جدا از کامپوننت، چون هم ResultView به
// parseRange نیاز دارد هم خودِ نوار، و یک فایل نباید هم‌زمان کامپوننت و
// تابعِ کمکی صادر کند.
// ============================================================

const EN_DASH = "–";
const EM_DASH = "—";

/**
 * «lln–uln» → {low, high}. اگر هر چیزِ دیگری بود، null.
 *
 * موتور بازه را همیشه به شکل `${lln}–${uln}` با خط تیرهٔ کوتاه می‌سازد
 * (adapter.js). اگر رشته به دو عددِ متناهی تجزیه نشد — نتیجهٔ کیفی
 * («مثبت»)، تیتر («1/320»)، یا هر شکلِ ناشناخته — عمداً null برمی‌گردد و
 * نوار اصلاً رندر نمی‌شود. یک نوارِ ساختگی برای «مثبت» دادهٔ جعلی است با
 * لباسِ عدد (درسِ N6: کیفی، کیفی می‌ماند).
 */
export function parseRange(range) {
  if (typeof range !== "string") return null;
  let parts = range.split(EN_DASH);
  if (parts.length !== 2) parts = range.split(EM_DASH);
  if (parts.length !== 2) return null;
  const low = Number(parts[0].trim());
  const high = Number(parts[1].trim());
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return null;
  return { low, high };
}

/**
 * هندسهٔ نوار: درصدِ شروعِ باندِ طبیعی، عرضش، و موقعیتِ نشانگر.
 *
 * پنجره تا خودِ مقدار باز می‌شود، حتی اگر مقدار خیلی بیرون باشد. یعنی برای
 * WBC=100 با بازهٔ 4.4–11، باندِ طبیعی یک نوارِ باریک کنارِ لبه می‌شود و
 * نشانگر آن‌طرفِ ریل می‌ایستد — که دقیقاً حقیقت را می‌گوید. جایگزینش
 * (سنجاق کردنِ نشانگر به لبه) دربارهٔ موقعیت دروغ می‌گفت.
 */
export function bandGeometry(low, high, value) {
  const span = (high - low) || Math.abs(high) || 1;
  let lo = Math.min(low - 0.6 * span, value);
  let hi = Math.max(high + 0.6 * span, value);
  const pad = (hi - lo) * 0.06;
  lo -= pad;
  hi += pad;
  // محورِ منفی برای آزمایشی که کفِ مرجعش صفر است بی‌معناست.
  if (low >= 0 && value >= 0 && lo < 0) lo = 0;
  const width = hi - lo || 1;
  const pct = (x) => Math.max(0, Math.min(100, ((x - lo) / width) * 100));
  const start = pct(low);
  return {
    bandStart: start,
    bandWidth: Math.max(1, pct(high) - start),
    pos: pct(value),
  };
}
