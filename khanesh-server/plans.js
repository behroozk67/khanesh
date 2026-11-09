// دسترسی به قابلیت‌ها بر اساس پلنِ ثبت‌شده در سرور (users.active_plan).
// پلن را فقط verify موفقِ پرداخت عوض می‌کند؛ کلاینت فقط آن را نمایش می‌دهد.
import { getUserPlan } from './database.js';

// هم‌خوان با khanesh/src/userPlan.js — قابلیت‌هایی که سرور خودش قفل می‌کند.
// shortcut: PDF چاپِ مرورگر است و سمتِ کلاینت می‌ماند؛ فقط تاریخچه و نمای تخصصی (داده) سمتِ سرور قفل است.
const PAID = new Set(['empire', 'unicorn']);
const FEATURE_PLANS = { history: PAID, expert: PAID };

// تا فعال‌شدنِ درگاه: REQUIRE_PAYMENT=false ⇒ همه چیز رایگان و باز (همان سوییچی که تحلیل را هم رایگان می‌کند).
const paymentsOff = () => process.env.REQUIRE_PAYMENT === 'false';

/** پلنِ مؤثرِ کاربر. ناشناس (AUTH خاموش، dev/test) محدود نمی‌شود. */
export async function planOf(user) {
  if (paymentsOff() || !user || user.anonymous || !user.userId) return 'unicorn';
  const row = await getUserPlan(user.userId);
  return row?.active_plan || 'starter';
}

export async function planAllows(user, feature) {
  return FEATURE_PLANS[feature].has(await planOf(user));
}

export function requirePlanFeature(feature) {
  return async (req, res, next) => {
    try {
      if (await planAllows(req.user, feature)) return next();
      return res.status(403).json({
        error: 'این بخش مخصوص پلن پایش سلامت یا بالاتر است.',
        code: 'plan_required',
        feature,
      });
    } catch (e) {
      console.error('[plans] خطا:', e.message);
      return res.status(500).json({ error: 'خطای سرور.' });
    }
  };
}

/** نمای تخصصی بخشی از پاسخ است؛ برای پلن پایه از بدنهٔ ارسالی حذف می‌شود (کپی، نه تغییرِ نتیجهٔ ذخیره‌شده). */
export async function withPlanLocks(user, body) {
  if (!body?._engine?.expert || (await planAllows(user, 'expert'))) return body;
  const { expert: _locked, ...engine } = body._engine;
  return { ...body, _engine: engine };
}
