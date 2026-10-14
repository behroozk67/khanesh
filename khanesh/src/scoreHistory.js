// ============================================================
// تاریخچهٔ «امتیازِ این برگه» — فقط روی همین دستگاه (localStorage)، برای نمودارِ روندِ داشبورد.
//
// ⚠️ حریم خصوصی: فقط {تاریخ، امتیاز، امضای کوتاهِ برگه} ذخیره می‌شود؛ نه مقدارِ آزمایش‌ها، نه
//    نام. کلیدِ هر نفر هم هشِ نام است، نه خودِ نام. هیچ‌چیز به سرور نمی‌رود.
// ⚠️ نسخهٔ فرمولِ امتیاز: اگر روشِ محاسبهٔ امتیاز (rules/score.js) عوض شد، SCORE_VERSION را
//    بالا ببرید؛ نقطه‌های قدیمی نادیده گرفته می‌شوند تا دو فرمولِ متفاوت روی یک خط نیایند.
// ⚠️ ذخیره‌سازی ممکن است در دسترس نباشد (حالت خصوصی، بلاک‌شده)؛ هر خطا فقط یعنی «بی‌تاریخچه».
// ============================================================

const KEY = 'azmayar_score_history_v1';
const MAX_PER_OWNER = 30;
// ۲: specs/015 — فاصلهٔ پیوسته، سطل‌ها، دستگاه‌ها، سقفِ دستگاهی (score.js v2). نقطه‌های v1 با v2 قابلِ مقایسه نیستند.
export const SCORE_VERSION = 2;

/** هشِ کوتاهِ پایدار (djb2) — برای امضای برگه و کلیدِ هر نفر، نه رمزنگاری. */
export function hashStr(s) {
  let h = 5381;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function readAll() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || '{}');
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}

/**
 * امتیازِ همین برگه را (اگر قبلاً ثبت نشده) ثبت می‌کند و نقطه‌های قبلیِ همان نفر را برمی‌گرداند.
 * هر بار فراخوانی با همان `sig` تکراری ثبت نمی‌کند (StrictMode، بازشدنِ دوبارهٔ همان نتیجه).
 * @returns {{ prev: {date:string, score:number}[], date: string|null }}
 */
export function recordScore(owner, score, sig) {
  try {
    const all = readAll();
    const list = (Array.isArray(all[owner]) ? all[owner] : []).filter(
      (e) => e && e.v === SCORE_VERSION && typeof e.date === 'string' && Number.isFinite(e.score)
    );
    let cur = list.find((e) => e.sig === sig);
    if (!cur) {
      cur = { date: new Date().toISOString(), score, sig, v: SCORE_VERSION };
      list.push(cur);
    }
    const kept = list.slice(-MAX_PER_OWNER);
    all[owner] = kept;
    localStorage.setItem(KEY, JSON.stringify(all));
    const prev = kept
      .filter((e) => e !== cur && Date.parse(e.date) < Date.parse(cur.date))
      .map((e) => ({ date: e.date, score: e.score }));
    return { prev, date: cur.date };
  } catch {
    return { prev: [], date: null };
  }
}
