import { Easing, interpolate } from "remotion";

// همان منحنیِ گذارِ اصلیِ سایت: --ease: cubic-bezier(0.16, 1, 0.3, 1)
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

/** پیشرفتِ ۰→۱ از فریمِ start به مدتِ dur (پیش‌فرض ۱۰ فریم ≈ ۳۳۰ میلی‌ثانیه) */
export const prog = (f, start, dur = 10, easing = EASE) =>
  interpolate(f, [start, start + dur], [0, 1], { ...clamp, easing });

/** ورودِ نرم: کمی از پایین با محوشدگی */
export const enter = (f, start, dur = 10, dist = 24) => {
  const p = prog(f, start, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
};

/** ورود و خروجِ یک صحنه با محوشدگی در دو سر */
export const sceneFade = (f, [a, b], fade = 10) =>
  interpolate(f, [a, a + fade, b - fade, b], [0, 1, 1, 0], clamp);

export const lerp = (f, inR, outR, easing = EASE) => interpolate(f, inR, outR, { ...clamp, easing });

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
/** اعدادِ فارسی برای متن‌های روی صفحه (بریف). مقادیرِ آزمایش لاتین می‌مانند، مثلِ خودِ سایت. */
export const fa = (s) => String(s).replace(/[0-9]/g, (d) => FA_DIGITS[d]);

export const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};
