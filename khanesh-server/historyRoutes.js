// ============================================================
// LabMate — ذخیره و ارائهٔ تاریخچهٔ آزمایش‌ها (P120)
//
// دو کار:
//   ۱. `recordAnalysis` — بعد از هر تحلیلِ موفق، ردیف‌های *عددی* را از خروجیِ
//      موتور بیرون می‌کشد و در `lab_observations` می‌نشاند. عمداً از خروجیِ
//      نهاییِ خودِ تحلیل (`_engine.tests`) خوانده می‌شود، نه از استیتِ داخلیِ
//      موتور — تا افزودنِ این قابلیت یک بایت هم از پاسخِ موتور را عوض نکند
//      (قفل‌های بایتیِ پنل‌ها).
//   ۲. مسیرهای `/api/history/*` — فهرستِ نوبت‌ها، روند، و مقایسه.
//
// مالکیت: `u:<userId>` برای کاربرِ واردشده، `d:<hash>` برای شناسهٔ دستگاه
// (هدرِ `x-device-id`) وقتی احراز هویت خاموش است. توضیحِ چرایی در database.js.
// ============================================================

import express from 'express';
import { createHash, randomUUID } from 'crypto';
import { requireAuth } from './auth.js';
import { getUnit } from './rules/refs.js';
import { compareSeries, comparisonFa, faDate, toTime } from './rules/history.js';
import {
  insertLabEvent, listLabEvents, getLabEvent, getLabEventByJob,
  getOwnerObservations, deleteLabEvent, deleteOwnerHistory,
} from './database.js';

const router = express.Router();

/** مالکِ تاریخچه از روی درخواست. null ⇒ نه کاربرِ واردشده، نه شناسهٔ دستگاه. */
export function ownerOf(req) {
  const u = req?.user;
  if (u && u.userId && !u.anonymous) return `u:${u.userId}`;
  const dev = String(req?.get?.('x-device-id') ?? '').trim();
  if (/^[A-Za-z0-9_-]{8,64}$/.test(dev)) {
    return `d:${createHash('sha256').update(dev).digest('hex').slice(0, 24)}`;
  }
  return null;
}

/**
 * خروجیِ تحلیل ⇒ ردیف‌های مشاهده.
 * ⚠️ فقط عدد: ردیفِ کیفی («Positive»، «ندید») در سریِ عددی معنا ندارد و
 *    مقایسهٔ آن با نوبتِ بعد گمراه‌کننده است.
 * @param {object} result بدنهٔ پاسخِ تحلیل (همان که در jobs ذخیره می‌شود)
 */
export function observationsFromResult(result) {
  const tests = result?._engine?.tests;
  if (!Array.isArray(tests)) return [];
  const out = [];
  const seen = new Set();
  for (const t of tests) {
    if (!t?.key || seen.has(t.key)) continue;
    if (t.value == null || t.value === '') continue;   // Number(null) === 0 — گاردِ اجباری
    if (t.key.startsWith('URINE_')) continue;   // ردیفِ ادرارِ غیرطبیعی (rules/urine_rows.js): «+1» نه عدد است نه سری
    const v = Number(t.value);
    if (!Number.isFinite(v)) continue;
    seen.add(t.key);
    out.push({
      marker_key: t.key,
      value: v,
      unit: getUnit(t.key) || null,
      range: typeof t.range === 'string' ? t.range : null,
      abnormal: !!t.abnormal,
      dir: t.dir ?? null,
    });
  }
  return out;
}

/** تاریخِ نمونه: تاریخِ چاپ‌شده روی برگه (P108) اگر بود، وگرنه زمانِ تحلیل. */
export function takenAtOf(result, fallbackIso = new Date().toISOString()) {
  const s = result?._engine?.context?.sample_date;
  const t = toTime(s);
  return t != null ? new Date(t).toISOString() : fallbackIso;
}

/**
 * ثبتِ یک تحلیل در تاریخچه. بی‌صدا برمی‌گردد اگر چیزی برای ثبت نباشد.
 * ⚠️ هرگز throw نمی‌کند؛ تحلیل نباید به‌خاطرِ تاریخچه شکست بخورد.
 */
export async function recordAnalysis({ owner, jobId, result, source = 'upload' }) {
  if (!owner || !jobId) return null;
  try {
    const observations = observationsFromResult(result);
    if (!observations.length) return null;
    const existing = await getLabEventByJob(owner, jobId);
    const id = existing?.id ?? randomUUID();
    await insertLabEvent({
      id, owner, jobId,
      takenAt: takenAtOf(result),
      source,
      labName: result?._engine?.context?.lab_name ?? null,
      observations,
    });
    return id;
  } catch (e) {
    console.error('History record error:', e.message);
    return null;
  }
}

/** گاردِ مالکیت — پیامِ راهنما وقتی نه ورود هست نه شناسهٔ دستگاه. */
function requireOwner(req, res, next) {
  const owner = ownerOf(req);
  if (!owner) {
    return res.status(400).json({
      error: 'تاریخچهٔ آزمایش‌ها به شناسهٔ این دستگاه یا حسابِ شما گره می‌خورد؛ شناسه در دسترس نیست. صفحه را دوباره باز کنید.',
      code: 'no_owner',
    });
  }
  req.historyOwner = owner;
  return next();
}

const guard = [requireAuth, requireOwner];

router.get('/', ...guard, async (req, res) => {
  try {
    const labs = await listLabEvents(req.historyOwner);
    return res.json({
      labs: labs.map((l) => ({ ...l, taken_fa: faDate(l.taken_at) })),
      count: labs.length,
      auth: !req.user?.anonymous,
    });
  } catch (e) {
    console.error('DB Error in GET /api/history:', e.message);
    return res.status(500).json({ error: 'خواندنِ تاریخچه انجام نشد. کمی بعد دوباره تلاش کنید.' });
  }
});

router.get('/trends', ...guard, async (req, res) => {
  try {
    const keys = typeof req.query.keys === 'string' && req.query.keys.trim()
      ? req.query.keys.split(',').map((s) => s.trim()).filter(Boolean)
      : null;
    const rows = await getOwnerObservations(req.historyOwner, { since: req.query.since || null });
    const { markers, summary } = compareSeries(rows, { keys });
    return res.json({
      markers: markers.map((m) => ({ ...m, latest_fa: m.latest ? faDate(m.latest.date) : null, previous_fa: m.previous ? faDate(m.previous.date) : null, fa: comparisonFa(m) })),
      summary,
    });
  } catch (e) {
    console.error('DB Error in GET /api/history/trends:', e.message);
    return res.status(500).json({ error: 'ساختِ روند انجام نشد.' });
  }
});

router.get('/labs/:id', ...guard, async (req, res) => {
  try {
    const ev = await getLabEvent(req.historyOwner, req.params.id);
    if (!ev) return res.status(404).json({ error: 'این آزمایش در تاریخچه پیدا نشد.' });
    return res.json({ lab: { ...ev, taken_fa: faDate(ev.taken_at) } });
  } catch (e) {
    console.error('DB Error in GET /api/history/labs/:id:', e.message);
    return res.status(500).json({ error: 'خواندنِ آزمایش انجام نشد.' });
  }
});

/** ویرایشِ تاریخِ نمونه (کاربر تاریخِ چاپ‌شده روی برگه را می‌داند، OCR همیشه نه). */
router.patch('/labs/:id', ...guard, async (req, res) => {
  try {
    const iso = String(req.body?.takenAt ?? '').trim();
    const t = toTime(iso);
    if (t == null) return res.status(400).json({ error: 'تاریخِ آزمایش را به شکلِ درست وارد کنید.' });
    if (t > Date.now() + 24 * 3600 * 1000) return res.status(400).json({ error: 'تاریخِ آزمایش نمی‌تواند در آینده باشد.' });
    const ev = await getLabEvent(req.historyOwner, req.params.id);
    if (!ev) return res.status(404).json({ error: 'این آزمایش در تاریخچه پیدا نشد.' });
    await insertLabEvent({
      id: ev.id, owner: req.historyOwner, jobId: ev.job_id,
      takenAt: new Date(t).toISOString(),
      source: ev.source,
      labName: String(req.body?.labName ?? ev.lab_name ?? '').slice(0, 80) || null,
      observations: (ev.observations ?? []).map((o) => ({
        marker_key: o.marker_key, value: o.value, unit: o.unit, range: o.ref_range,
        abnormal: o.abnormal === 1, dir: o.dir,
      })),
    });
    return res.json({ ok: true });
  } catch (e) {
    console.error('DB Error in PATCH /api/history/labs/:id:', e.message);
    return res.status(500).json({ error: 'ذخیرهٔ تاریخ انجام نشد.' });
  }
});

/** پاک‌کردنِ کلِ تاریخچه (همراهِ «حذف حساب و اطلاعات من»). */
router.delete('/', ...guard, async (req, res) => {
  try {
    await deleteOwnerHistory(req.historyOwner);
    return res.json({ ok: true });
  } catch (e) {
    console.error('DB Error in DELETE /api/history:', e.message);
    return res.status(500).json({ error: 'پاک‌کردنِ تاریخچه انجام نشد.' });
  }
});

router.delete('/labs/:id', ...guard, async (req, res) => {
  try {
    const ok = await deleteLabEvent(req.historyOwner, req.params.id);
    if (!ok) return res.status(404).json({ error: 'این آزمایش در تاریخچه پیدا نشد.' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('DB Error in DELETE /api/history/labs/:id:', e.message);
    return res.status(500).json({ error: 'حذف انجام نشد.' });
  }
});

export default router;
