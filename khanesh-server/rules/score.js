// ============================================================
// «امتیازِ این برگه» — خلاصهٔ حسابیِ حکم‌های خودِ موتور (۲۰۲۶-۱۰-۰۷، تصمیمِ کاربر).
//
// ⚠️ این‌جا هیچ آستانهٔ بالینیِ تازه‌ای نیست. ورودی فقط چیزی است که موتور از قبل گفته:
//    طبیعی/نزدیکِ‌مرز/خارج، شدتِ `level` (CTCAE) و فوریتِ کلِ برگه. عددها (۰٫۶۵، ۰٫۴، سقف‌ها)
//    پیش‌فرضِ پیشنهادیِ من‌اند و در MEDICAL_RULES.md «در انتظارِ بازبینی» ثبت شده‌اند (P97).
// ⚠️ میانگین به‌تنهایی خطرناک است (یک پتاسیمِ بحرانی بینِ ۲۰ آزمایشِ طبیعی ≈ ۹۵ می‌شود)،
//    پس امتیاز هرگز از سقفِ فوریتِ همان برگه بیشتر نیست.
// ⚠️ ورودیِ گراف و پرامپت نیست و به موتور برنمی‌گردد (N9).
// ============================================================

import { isNeonate } from './refs.js';

export const MIN_SCORED = 5;

/** نمرهٔ هر آزمایش ∈ [0,1] از حکمِ موتور. null = در امتیاز نمی‌آید. */
export const POINTS = { normal: 1, near: 0.9, mild: 0.65, moderate: 0.4, marked: 0.15, critical: 0, outNoLevel: 0.5 };

/** سقفِ امتیاز به‌ازای فوریتِ کلِ برگه (`overall_urgency`). */
export const URGENCY_CAP = { emergency: 35, soon: 55, this_week: 75, routine: 90, none: 100 };

export function testPoints(g) {
  if (!g || g.mode === 'unknown') return null;
  if (!g.abnormal) return g.nearLimit ? POINTS.near : POINTS.normal;
  return POINTS[g.level] ?? POINTS.outNoLevel;
}

/**
 * @returns {{ value:number|null, band:'high'|'mid'|'low'|null, counted:number, total:number,
 *             cap:number, capped:boolean, reason:string|null, points:Object<string,number> }}
 */
export function healthScore(engineOut, urgency) {
  const graded = Array.isArray(engineOut?.graded) ? engineOut.graded : [];
  const points = {};
  for (const g of graded) {
    const p = testPoints(g);
    if (p != null) points[g.test] = p;
  }
  const vals = Object.values(points);
  const cap = URGENCY_CAP[urgency] ?? 100;
  const base = { cap, counted: vals.length, total: graded.length, points };
  if (engineOut?.age != null && isNeonate(engineOut.age)) {
    return { ...base, value: null, band: null, capped: false, reason: 'neonate' };
  }
  if (vals.length < MIN_SCORED) {
    return { ...base, value: null, band: null, capped: false, reason: 'too_few' };
  }
  const mean = (vals.reduce((a, b) => a + b, 0) / vals.length) * 100;
  const value = Math.round(Math.min(mean, cap));
  return { ...base, value, band: value >= 85 ? 'high' : value >= 60 ? 'mid' : 'low', capped: mean > cap, reason: null };
}
