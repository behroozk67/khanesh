// شماره‌های معاف از پرداختِ تفسیر (تست روی production) — از env: PAYMENT_EXEMPT_PHONES=0912...,0935...
// شماره هرگز در مخزن نمی‌ماند. فقط کاربرِ واردشدهٔ واقعی؛ ناشناس/بی‌شماره هیچ‌وقت معاف نیست.
import { normalizePhone } from "./auth.js";

export function paymentExempt(user, env = process.env.PAYMENT_EXEMPT_PHONES) {
  const mine = user && !user.anonymous ? normalizePhone(user.phone) : null;
  if (!mine || !env) return false;
  return String(env).split(",").some((p) => normalizePhone(p) === mine);
}
