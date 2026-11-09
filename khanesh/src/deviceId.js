// ============================================================
// شناسهٔ دستگاه (P120)
//
// چرا لازم است: تاریخچهٔ آزمایش‌ها باید بینِ دو نوبتِ *همان بیمار* مقایسه شود.
// با احراز هویتِ روشن، مالک `u:<userId>` است. ولی در حالتِ خاموش (پیش‌فرضِ
// نصب) همهٔ درخواست‌ها userId=1 می‌گیرند و مقایسهٔ تاریخچهٔ یک بیمار با بیمارِ
// بعدی فاجعه است. پس یک UUID تصادفی روی همین دستگاه می‌سازیم و در هدرِ
// `x-device-id` می‌فرستیم؛ سرور آن را هش می‌کند و مالک می‌شود.
//
// ⚠️ این شناسه هویت نیست و نباید هویت شود: فقط یک کلیدِ تفکیکِ دستگاه است،
//    به‌اندازهٔ کشِ localStorage محرمانه. با ورودِ کاربر، مالکیت به حساب می‌رود.
// ============================================================

const LS_DEVICE = 'labmate_device_id';

function randomId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, '');
  } catch { /* مرورگرِ قدیمی */ }
  // پشتیبانِ بدونِ crypto: ۳۲ نویسهٔ تصادفی از Math.random
  let s = '';
  while (s.length < 32) s += Math.floor(Math.random() * 36).toString(36);
  return s.slice(0, 32);
}

export function deviceId() {
  try {
    let v = localStorage.getItem(LS_DEVICE);
    if (!v || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) {
      v = randomId();
      localStorage.setItem(LS_DEVICE, v);
    }
    return v;
  } catch {
    // حالتِ خصوصی/بلاک‌شده: شناسهٔ موقتِ همین نشست. تاریخچه در این حالت بینِ
    // بازکردن‌های مجدد گم می‌شود، ولی چیزی نمی‌شکند.
    return randomId();
  }
}

/** عضوِ خانوادهٔ فعال؛ null یعنی خودِ صاحبِ حساب. */
export function activeMemberId() {
  try { return localStorage.getItem('azmayar_active_member') || null; } catch { return null; }
}

/** هدرهای مشترکِ API: توکنِ ورود (اگر بود) + شناسهٔ دستگاه + عضوِ فعال. */
export function apiHeaders(extra = {}) {
  const h = { 'x-device-id': deviceId(), ...extra };
  const member = activeMemberId();
  if (member) h['x-member-id'] = member;
  try {
    const t = localStorage.getItem('auth_token');
    if (t) h.Authorization = `Bearer ${t}`;
  } catch { /* بی‌اثر */ }
  return h;
}

/** GET/PATCH/DELETE کوتاه با پیامِ خطای فارسیِ آماده. */
export async function apiJson(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: apiHeaders(opts.headers || {}) });
  let data = null;
  try { data = await res.json(); } catch { /* پاسخِ غیر-JSON */ }
  if (!res.ok) {
    const err = new Error(data?.error || `خطای سرور (${res.status})`);
    err.code = data?.code || null;
    err.status = res.status;
    throw err;
  }
  return data;
}
