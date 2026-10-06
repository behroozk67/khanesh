// ============================================================
// پروفایلِ بیمار (specs/011): نام، جنس، سن، بارداری، بیماری‌های زمینه‌ای.
//
// ⚠️ فقط با AUTH_REQUIRED=true سمتِ سرور ذخیره می‌شود. در حالتِ خاموش همهٔ درخواست‌ها
//    userId=1اند (auth.js، ANON_USER)، پس ذخیرهٔ *نام* اینجا یعنی بیمارِ بعدی نامِ بیمارِ قبلی
//    را می‌بیند. در آن حالت 409 «local_only» برمی‌گردد و فرانت پروفایل را فقط روی دستگاه نگه می‌دارد.
// ⚠️ نام هرگز از این ماژول به مسیرِ تحلیل یا مدل نمی‌رود — فقط سن/جنس/بارداری/شناسهٔ بیماری.
// ============================================================

import express from 'express';
import { requireAuth, AUTH_REQUIRED } from './auth.js';
import { getProfile, upsertProfile } from './database.js';
import { CONDITIONS, NONE_ID } from './rules/conditions.js';

const router = express.Router();
const IDS = new Set(CONDITIONS.map((c) => c.id));

// بازهٔ هر واحدِ سن (data-model.md). «روز» تا ۶۰ و «ماه» تا ۲۳ — بعد از آن واحدِ بزرگ‌تر.
const AGE_RANGE = { year: [1, 120], month: [1, 23], day: [0, 60] };
const GEST_RANGE = [1, 42];   // هفتهٔ بارداری — همان بازهٔ GEST_WEEKS_RANGE در rules/adapter.js و profileStore.js

export function ageInYears(value, unit) {
  if (value == null || !unit) return null;
  return unit === 'year' ? value : unit === 'month' ? value / 12 : value / 365.25;
}

// بازبینیِ کد #1: سنِ «۱۰ روز» دو ماه بعد هنوز «۱۰ روز» بود و برگهٔ شیرخوار با بازهٔ نوزادی سنجیده می‌شد.
//   سنِ روز/ماهی که بیش از ۷ روز پیش ثبت شده دوباره پرسیده می‌شود (همان قاعدهٔ profileStore.js در فرانت).
export const STALE_INFANT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export function ageIsStale(p, now = Date.now()) {
  if (p?.ageUnit !== 'day' && p?.ageUnit !== 'month') return false;
  return !p.ageRecordedAt || now - p.ageRecordedAt > STALE_INFANT_AGE_MS;
}

export function intakeStep(p) {
  if (!p?.firstName || !p?.lastName) return 'name';
  if (!p.sex) return 'sex';
  if (p.ageValue == null || !p.ageUnit || ageIsStale(p)) return 'age';
  if (!p.conditionsAnswered) return 'conditions';
  return 'done';
}

const faDigits = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

const latin = (s) => String(s ?? '')
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/** بدنهٔ PATCH را با پروفایلِ موجود می‌سنجد. { patch } یا { error } (جملهٔ فارسی). */
export function validatePatch(body, current) {
  const patch = {};
  const b = body ?? {};
  for (const [k, fa] of [['firstName', 'نام'], ['lastName', 'نام خانوادگی']]) {
    if (!(k in b)) continue;
    const v = String(b[k] ?? '').trim();
    if (!v) return { error: `${fa} را وارد کنید.` };
    if (v.length > 50) return { error: `${fa} حداکثر ۵۰ حرف است.` };
    patch[k] = v;
  }
  if ('sex' in b) {
    if (b.sex !== 'male' && b.sex !== 'female') return { error: 'جنسیت را انتخاب کنید.' };
    patch.sex = b.sex;
  }
  if ('ageValue' in b || 'ageUnit' in b) {
    const unit = b.ageUnit ?? current?.ageUnit;
    const raw = 'ageValue' in b ? latin(b.ageValue).trim() : current?.ageValue;
    const n = typeof raw === 'number' ? raw : /^\d+$/.test(String(raw ?? '')) ? Number(raw) : NaN;
    const range = AGE_RANGE[unit];
    if (!range) return { error: 'واحدِ سن را انتخاب کنید (سال، ماه یا روز).' };
    if (!Number.isInteger(n) || n < range[0] || n > range[1]) {
      return { error: `سن باید عددی بین ${faDigits(range[0])} و ${faDigits(range[1])} ${unit === 'year' ? 'سال' : unit === 'month' ? 'ماه' : 'روز'} باشد.` };
    }
    patch.ageValue = n;
    patch.ageUnit = unit;
    patch.ageRecordedAt = Date.now();
  }
  if ('conditions' in b) {
    const list = Array.isArray(b.conditions) ? b.conditions.map(String) : null;
    if (!list) return { error: 'فهرستِ بیماری‌ها نامعتبر است.' };
    if (list.includes(NONE_ID) && list.length > 1) return { error: '«هیچ‌کدام» را نمی‌شود با بیماریِ دیگری با هم انتخاب کرد.' };
    const bad = list.filter((id) => id !== NONE_ID && !IDS.has(id));
    if (bad.length) return { error: 'بیماریِ ناشناخته در فهرست است.' };
    patch.conditions = [...new Set(list.filter((id) => id !== NONE_ID))];
    patch.conditionsAnswered = true;
  }
  // بارداری فقط برای زنِ ۱۰ سال و بالاتر (همان شرطِ صفحهٔ سن)؛ تغییرِ جنس/سن بارداریِ نامعتبر را خاموش می‌کند.
  const merged = { ...current, ...patch };
  const eligible = merged.sex === 'female' && (ageInYears(merged.ageValue, merged.ageUnit) ?? 0) >= 10;
  if ('pregnant' in b) {
    if (b.pregnant === true && !eligible) return { error: 'گزینهٔ بارداری فقط برای زنِ ۱۰ سال و بالاتر است.' };
    patch.pregnant = b.pregnant === true;
  } else if (current?.pregnant && !eligible) {
    patch.pregnant = false;
  }
  // سنِ بارداری (هفته): اختیاری، فقط همراهِ بارداری؛ زمانِ ثبت نگه داشته می‌شود تا هفتهٔ امروز حساب شود.
  const pregnantNow = 'pregnant' in patch ? patch.pregnant : current?.pregnant === true;
  if ('gestWeeks' in b) {
    const raw = latin(b.gestWeeks).trim();
    if (b.gestWeeks == null || raw === '') {
      patch.gestWeeks = null; patch.gestRecordedAt = null;
    } else {
      const n = /^\d+$/.test(raw) ? Number(raw) : NaN;
      if (!pregnantNow) return { error: 'هفتهٔ بارداری فقط وقتی معنا دارد که «باردار هستم» انتخاب شده باشد.' };
      if (!Number.isInteger(n) || n < GEST_RANGE[0] || n > GEST_RANGE[1]) {
        return { error: `هفتهٔ بارداری باید عددی بین ${faDigits(GEST_RANGE[0])} و ${faDigits(GEST_RANGE[1])} باشد.` };
      }
      patch.gestWeeks = n; patch.gestRecordedAt = Date.now();
    }
  }
  if (!pregnantNow && current?.gestWeeks != null && !('gestWeeks' in patch)) { patch.gestWeeks = null; patch.gestRecordedAt = null; }
  return { patch };
}

function localOnly(_req, res, next) {
  if (!AUTH_REQUIRED) {
    return res.status(409).json({ error: 'در این نسخه پروفایل فقط روی همین دستگاه ذخیره می‌شود.', code: 'local_only' });
  }
  return next();
}

router.get('/', localOnly, requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.userId);
    return res.json({ profile, intakeStep: intakeStep(profile) });
  } catch (e) {
    console.error('DB Error in GET /api/profile:', e.message);
    return res.status(500).json({ error: 'خواندنِ پروفایل انجام نشد. کمی بعد دوباره تلاش کنید.' });
  }
});

router.patch('/', localOnly, requireAuth, async (req, res) => {
  try {
    const current = await getProfile(req.user.userId);
    const { patch, error } = validatePatch(req.body, current);
    if (error) return res.status(400).json({ error });
    const profile = await upsertProfile(req.user.userId, patch);
    return res.json({ profile, intakeStep: intakeStep(profile) });
  } catch (e) {
    console.error('DB Error in PATCH /api/profile:', e.message);
    return res.status(500).json({ error: 'ذخیرهٔ پروفایل انجام نشد. کمی بعد دوباره تلاش کنید.' });
  }
});

export default router;
