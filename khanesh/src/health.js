// ============================================================
// یک درخواستِ مشترکِ /api/health برای همهٔ مصرف‌کننده‌های فرانت.
//
// چرا: هم AuthGuard (برای authRequired) و هم صفحهٔ ورود (برای اینکه کدام کانال
// واقعاً پیامک/ایمیل می‌فرستد) به همین پاسخ نیاز دارند. دو fetchِ جدا یعنی دو
// منبعِ حقیقت (کلاسِ N20) و یک لحظه که صفحهٔ ورود هنوز نمی‌داند ایمیل خاموش است.
//
// ⚠️ «mock» در /health یعنی فرستنده‌ای وصل نیست و کد فقط در لاگِ سرور چاپ
//    می‌شود. با AUTH_REQUIRED=true، نشان‌دادنِ چنین کانالی یعنی کاربر تا ابد
//    منتظرِ کدی می‌ماند که هرگز نمی‌رسد.
// ============================================================
let cached = null;

export function fetchHealth() {
  if (!cached) {
    cached = fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return cached;
}

/**
 * کانال‌های زندهٔ ورود. null یعنی «قضاوت نکن» (پاسخ نیامد، یا هر دو mock ⇒
 * محیطِ توسعهٔ لوکال بدونِ کلید؛ آنجا هر دو دکمه می‌مانند تا توسعه ممکن باشد).
 */
export function channelsOf(health) {
  if (!health || (health.smsOtp == null && health.emailOtp == null)) return null;
  const phone = health.smsOtp !== 'mock';
  const email = health.emailOtp !== 'mock';
  return phone || email ? { phone, email } : null;
}
