// ============================================================
// LabMate — تاریخچهٔ آزمایش‌ها و مقایسهٔ نوبت‌ها (P120)
//
// چه چیزی را حل می‌کند:
//   موتور تا امروز هر برگه را *در لحظهٔ خودش* می‌سنجید. بیمار که برگهٔ تازه
//   می‌آورد، هیچ‌جا نمی‌گفت «نسبت به نوبتِ قبل چه شد». RCV در biovar.js عددِ
//   «تغییرِ واقعی» را می‌داد، ولی نتیجهٔ قبلی در دسترس نبود.
//
// ⚠️ مرزِ ادعا (مهم):
//   1. این ماژول هیچ آستانهٔ بالینیِ تازه نمی‌سازد. تنها آستانهٔ «تغییرِ
//      معنادار» همان RCVِ مستندِ EFLM/Ricos است (biovar.js).
//   2. «بهتر/بدتر» اینجا *هندسی* است: فاصلهٔ نرمال‌شده تا محدودهٔ مرجعِ همان
//      برگه کم/زیاد شده؟ این حساب است، نه قضاوتِ بالینی. اگر دو عدد هر دو
//      داخلِ محدوده باشند و تغییر از RCV کمتر باشد ⇒ «بی‌تغییر».
//   3. «یادآوریِ تکرار» فاصلهٔ زمانیِ بالینی ادعا نمی‌کند. فقط دو واقعیتِ
//      ثبت‌شده را می‌گوید: آخرین نتیجه خارج از محدوده بوده، و چند روز از آن
//      گذشته. تجویزِ «چه وقت تکرار کن» کارِ پزشک است، نه این ماژول.
//   4. مقایسهٔ دو نوبت فقط وقتی معنا دارد که واحد یکی باشد و فاصله صفر نباشد
//      (بارگذاریِ دوبارهٔ همان برگه). گاردها در `compareSeries`.
//
// منبعِ RCV: EFLM Biological Variation Database (biologicalvariation.eu)؛
// مقادیرِ CVi از پایگاهِ «desirable biological variation» (Ricos و همکاران،
// ویرایشِ ۲۰۱۴) — جزئیات در biovar.js.
// ============================================================

import { rcv, BV } from './biovar.js';
import { faName } from './names.js';
import { joinFaNumber } from './faText.js';

/** کمتر از این فاصله (روز) = همان نوبت / بارگذاریِ دوباره، نه مقایسه. */
export const MIN_COMPARABLE_GAP_DAYS = 1;

/** بعد از این فاصله (روز) نتیجه «کهنه» شمرده می‌شود — واقعیتِ تقویمی، نه توصیهٔ بالینی. */
export const STALE_DAYS = 365;

const DAY = 24 * 60 * 60 * 1000;

/** «70–110» / «0-200» / «< 530» / «4.0 - 10.0» ⇒ [low, high] یا null. */
export function parseRange(str) {
  if (typeof str !== 'string') return null;
  const s = str.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
               .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
               .replace(/٫/g, '.')          // جداکنندهٔ اعشارِ عربی
               .replace(/،/g, ',');
  if (/^\s*[<>]/.test(s)) return null;                 // یک‌طرفه — فاصله معنا ندارد
  // مرجعِ ترکیبی («70-80 years: 4.0-6.5») هم می‌آید؛ بازهٔ واقعی آخرین جفت است.
  const all = [...s.matchAll(/(-?\d+(?:[.,]\d+)?)\s*[–—−-]\s*(-?\d+(?:[.,]\d+)?)/g)];
  const m = all[all.length - 1];
  if (!m) return null;
  const lo = Number(m[1].replace(',', '.'));
  const hi = Number(m[2].replace(',', '.'));
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return null;
  return [lo, hi];
}

/**
 * فاصلهٔ نرمال‌شده تا محدوده (۰ = داخل).
 * نرمال‌سازی با پهنای محدوده، تا کراتینین (پهنای ۰٫۶) و تری‌گلیسرید (پهنای ۱۵۰)
 * هم‌مقیاس شوند.
 */
export function distanceFromRange(value, range) {
  if (!Array.isArray(range) || !Number.isFinite(value)) return null;
  const [lo, hi] = range;
  const width = hi - lo || Math.max(Math.abs(hi), 1);
  if (value < lo) return (lo - value) / width;
  if (value > hi) return (value - hi) / width;
  return 0;
}

/** روزِ اختلاف بین دو تاریخ (ISO یا 'YYYY-MM-DD HH:MM:SS'). */
export function daysBetween(a, b) {
  const ta = toTime(a), tb = toTime(b);
  if (ta == null || tb == null) return null;
  return Math.abs(tb - ta) / DAY;
}

export function toTime(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  if (!s) return null;
  // SQLite: 'YYYY-MM-DD HH:MM:SS' (UTC بی‌منطقه) ⇒ ISO با Z
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) s = s.replace(' ', 'T') + 'Z';
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/** برچسبِ فارسیِ تاریخِ شمسی‌نما — بدونِ وابستگی به Intl در محیط‌های قدیمی. */
export function faDate(iso) {
  const t = toTime(iso);
  if (t == null) return '';
  try {
    return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(t));
  } catch {
    return String(iso).slice(0, 10);
  }
}

/**
 * ردیف‌های مشاهده (از DB) ⇒ سریِ هر مارکر.
 * ورودی: [{ lab_id, taken_at, marker_key, value, unit, range, abnormal, dir }]
 */
export function buildSeries(rows) {
  const byKey = new Map();
  for (const r of rows ?? []) {
    // ⚠️ `Number(null)` و `Number('')` هر دو ۰ می‌دهند — بدونِ این گارد، ردیفِ
    //    بی‌مقدار به‌عنوان «صفر» واردِ سری می‌شد و نمودار یک افتِ دروغ می‌ساخت.
    if (r.value == null || r.value === '') continue;
    const v = Number(r.value);
    if (!Number.isFinite(v)) continue;                 // کیفی/بی‌عدد واردِ تاریخچه نمی‌شود
    const t = toTime(r.taken_at);
    if (t == null) continue;
    if (!byKey.has(r.marker_key)) byKey.set(r.marker_key, []);
    byKey.get(r.marker_key).push({
      labId: r.lab_id,
      time: t,
      date: new Date(t).toISOString().slice(0, 10),
      value: v,
      unit: r.unit ?? '',
      // DB ستونِ `ref_range` را می‌دهد؛ تست/فرانت `range`. هر دو پذیرفته می‌شوند.
      range: r.range ?? r.ref_range ?? null,
      abnormal: r.abnormal === 1 || r.abnormal === true,
      dir: r.dir ?? null,
    });
  }
  for (const list of byKey.values()) {
    list.sort((a, b) => a.time - b.time);
    // همان روز و همان مارکر دوبار ثبت شده (بارگذاریِ دوبارهٔ یک برگه) ⇒ آخری بماند.
    for (let i = list.length - 1; i > 0; i--) {
      if (list[i].date === list[i - 1].date) list.splice(i - 1, 1);
    }
  }
  return byKey;
}

/**
 * درصدِ تغییر **نسبت به مقدارِ قبلی (Baseline)** — همان چیزی که هر آزمایشگاه و
 * هر کاربری روی کاغذ حساب می‌کند: (new − old) / old × 100.
 *
 * ⚠️ چرا جدا از `logPctChange`: آزمونِ RCV روی مقیاسِ لگاریتمی تعریف می‌شود
 *    (نسبت‌ها، چون تغییرپذیریِ زیستی ضربی است)، ولی درصدی که به کاربر نشان
 *    می‌دهیم باید همان درصدِ خطیِ مبنا-نسبی باشد؛ وگرنه عددِ روی کارت با
 *    محاسبهٔ ذهنیِ خودِ بیمار نمی‌خوانَد (۷.۳ → ۴.۸ لگاریتمی ۴۲٪، خطی ۳۴٪).
 *    اعتبارِ آماری دست‌نخورده می‌ماند؛ فقط زبانِ نمایش یکی می‌شود.
 */
export function pctChange(prev, next) {
  if (!Number.isFinite(prev) || !Number.isFinite(next) || prev === 0) return null;
  return ((next - prev) / Math.abs(prev)) * 100;
}

/**
 * درصدِ تغییر روی مقیاسِ لگاریتمی — همان تعریفِ RCV (نسبت‌ها، نه اختلافِ خطی).
 * برای مقدارِ صفر/منفی تعریف نشده ⇒ null.
 */
export function logPctChange(prev, next) {
  if (!(prev > 0) || !(next > 0)) return null;
  return (Math.log(next / prev) * 100);
}

/**
 * همان آزمونِ RCV، ولی بیان‌شده با درصدِ مبنا-نسبی؛ تا عددِ آستانه و عددِ
 * تغییر در یک زبان باشند.
 *
 *   RCV:  |ln(new/old)| ≥ r/100
 *   ⇔ افزایش: (new−old)/old ≥ e^(r/100) − 1
 *   ⇔ کاهش:   (old−new)/old ≥ 1 − e^(−r/100)
 *
 * (کاهش و افزایش آستانهٔ هم‌اندازه ندارند؛ این ویژگیِ ذاتیِ مقیاسِ لگاریتمی است.)
 */
export function rcvThresholdPct(rcvPct, direction) {
  if (rcvPct == null || !Number.isFinite(rcvPct)) return null;
  const k = rcvPct / 100;
  if (direction === 'up') return (Math.exp(k) - 1) * 100;
  if (direction === 'down') return (1 - Math.exp(-k)) * 100;
  return null;
}


/**
 * مقایسهٔ کاملِ یک مارکر.
 * @returns {object} ورودیِ نمایش؛ هیچ متنِ بالینیِ تازه‌ای نمی‌سازد.
 */
export function compareMarker(key, points, { today = Date.now() } = {}) {
  const list = points ?? [];
  const last = list[list.length - 1];
  const prev = list.length > 1 ? list[list.length - 2] : null;
  const first = list[0];
  const base = {
    key,
    label: faName(key) || key,
    unit: last?.unit ?? '',
    points: list.map((p) => ({
      date: p.date,
      value: p.value,
      unit: p.unit,
      abnormal: p.abnormal,
      dir: p.dir,
      range: p.range,
      labId: p.labId,
    })),
    count: list.length,
    latest: last ? { date: last.date, value: last.value, abnormal: last.abnormal, dir: last.dir, range: last.range } : null,
    previous: prev ? { date: prev.date, value: prev.value, abnormal: prev.abnormal, dir: prev.dir, range: prev.range } : null,
    baseline: first ? { date: first.date, value: first.value, abnormal: first.abnormal } : null,
    rcvPct: rcv(key),
    rcvKnown: Boolean(BV[key]),
    spanDays: list.length > 1 ? Math.round(daysBetween(first.time, last.time)) : 0,
    comparable: false,
    reason: null,
    delta: null,
    pct: null,            // درصدِ نمایشی: نسبت به مقدارِ قبلی (Baseline)
    pctLog: null,         // درصدِ لگاریتمی: مبنای آزمونِ RCV
    rcvPctRef: null,      // همان آستانه، ترجمه‌شده به درصدِ مبنا-نسبی
    significant: null,
    direction: null,
    zone: null,
    towardsRange: null,
    daysSinceLatest: last ? Math.round((today - last.time) / DAY) : null,
    stale: false,
    followUp: false,
  };
  if (!last) return base;

  base.stale = base.daysSinceLatest != null && base.daysSinceLatest > STALE_DAYS;
  base.followUp = last.abnormal === true;

  if (!prev) { base.reason = 'single'; return base; }

  // ── گاردها ───────────────────────────────────────────────
  if ((last.unit || '') !== (prev.unit || '')) {
    base.reason = 'unit_mismatch';
    return base;
  }
  // ⚠️ فاصله با timestamp سنجیده می‌شود، نه با رشتهٔ تاریخ: دو ثبت در ۲۳:۰۰ و
  //    ۰۱:۰۰ روزِ بعد «یک روز» به‌نظر می‌رسند و از گارد فرار می‌کردند.
  const gap = Math.round(daysBetween(prev.time, last.time));
  if (gap < MIN_COMPARABLE_GAP_DAYS) {
    base.reason = 'same_day';
    return base;
  }
  base.delta = +(last.value - prev.value).toFixed(4);
  // `pct` = درصدِ نمایشی (مبنا-نسبی) · `pctLog` = مبنای آزمونِ RCV
  base.pct = pctChange(prev.value, last.value);
  base.pctLog = logPctChange(prev.value, last.value);
  base.direction = base.delta > 0 ? 'up' : base.delta < 0 ? 'down' : 'flat';

  // ── معناداری: RCV (لگاریتمی) ────────────────────────────
  const r = base.rcvPct;
  if (r != null && base.pctLog != null) {
    base.significant = Math.abs(base.pctLog) >= r;
    base.rcvPctRef = rcvThresholdPct(r, base.direction);
    base.comparable = true;
  } else {
    // RCV نداریم ⇒ عدد و جهت را می‌گوییم، ولی «واقعی است یا نوسان» را نه.
    base.significant = null;
    base.comparable = true;
    base.reason = 'no_rcv';
  }

  // ── ناحیه: داخل/بالا/پایین در هر نوبت ────────────────────
  const zoneOf = (p) => (p.abnormal ? (p.dir === 'high' ? 'high' : p.dir === 'low' ? 'low' : 'out') : 'in');
  base.zone = { from: zoneOf(prev), to: zoneOf(last) };
  if (base.zone.from === 'in' && base.zone.to === 'in') base.zone.kind = 'in_to_in';
  else if (base.zone.to === 'in') base.zone.kind = 'to_normal';
  else if (base.zone.from === 'in') base.zone.kind = 'to_abnormal';
  else base.zone.kind = 'abnormal_to_abnormal';

  // ── «به محدوده نزدیک‌تر شد؟» — فقط حساب، وقتی قبلی بیرون بوده ──
  const rp = parseRange(prev.range), rl = parseRange(last.range);
  if (rp && rl && base.zone.from !== 'in') {
    const dPrev = distanceFromRange(prev.value, rp);
    const dLast = distanceFromRange(last.value, rl);
    if (dPrev != null && dLast != null) base.towardsRange = dLast < dPrev;
  }
  return base;
}

/**
 * مقایسهٔ همهٔ مارکرها.
 * @param {Array} rows ردیف‌های مشاهده
 * @param {object} opts { today, keys }
 * @returns {{markers: Array, summary: object}}
 */
export function compareSeries(rows, opts = {}) {
  const series = buildSeries(rows);
  const only = opts.keys ? new Set(opts.keys) : null;
  const markers = [];
  for (const [key, pts] of series) {
    if (only && !only.has(key)) continue;
    markers.push(compareMarker(key, pts, opts));
  }
  // ترتیب: اول آن‌هایی که تغییرِ معنادارِ خارج از محدوده دارند (فوریت)، بعد بقیه.
  const rank = (m) => {
    if (!m.latest) return 9;
    if (m.followUp && m.significant) return 0;
    if (m.zone?.kind === 'to_abnormal') return 1;
    if (m.followUp) return 2;
    if (m.significant) return 3;
    if (m.zone?.kind === 'to_normal') return 4;
    return 5;
  };
  markers.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, 'fa'));

  const summary = {
    markers: markers.length,
    compared: markers.filter((m) => m.count > 1 && m.comparable).length,
    significant: markers.filter((m) => m.significant === true).length,
    toAbnormal: markers.filter((m) => m.zone?.kind === 'to_abnormal').length,
    toNormal: markers.filter((m) => m.zone?.kind === 'to_normal').length,
    abnormalNow: markers.filter((m) => m.followUp).length,
    stale: markers.filter((m) => m.stale).length,
    labs: new Set((rows ?? []).map((r) => r.lab_id)).size,
  };
  return { markers, summary };
}

/**
 * جملهٔ فارسیِ مقایسه — از عددهای همان ورودی، بدونِ قضاوتِ بالینیِ تازه.
 *
 * ⚠️ ارقامِ *عددها* فارسی می‌شوند، ولی خودِ `m.label` دست‌نخورده می‌ماند:
 *    تبدیلِ سراسریِ ارقام، «HbA1c» را به «HbA۱c» می‌شکند (باگِ واقعیِ دیده‌شده
 *    در بازبینیِ چشمی) و «Vitamin B12» هم همین‌طور. جای هر عدد که پس از نامِ
 *    لاتین می‌آید با `joinFaNumber` (RLM) تعیین می‌شود (قراردادِ faText.js).
 */
const faDigits = (v) => String(v).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

/** «۱.۲ mg/dL» — درصد چسبیده به عدد، بقیه با یک فاصله. */
function numFa(value, unit) {
  const n = typeof value === 'number'
    ? (Number.isInteger(value) ? String(value) : String(+value.toFixed(2)))
    : String(value);
  const s = faDigits(n);
  if (!unit) return s;
  return unit === '%' ? `${s}٪` : `${s} ${unit}`;
}

export function comparisonFa(m) {
  if (!m || !m.previous || !m.latest) return null;
  const from = numFa(m.previous.value, m.unit);
  const to = numFa(m.latest.value, m.unit);
  const named = (val) => joinFaNumber(m.label, val);   // RLM فقط وقتی نام لاتین‌پایان است
  const when = faDate(m.previous.date);

  if (m.reason === 'unit_mismatch') {
    return `واحدِ این آزمایش در نوبتِ ${when} با نوبتِ آخر یکی نبود؛ اعداد را نمی‌شود با هم سنجید.`;
  }
  if (m.significant === true) {
    const pctFa = m.pct == null ? '' : ` (${faDigits(Math.abs(m.pct).toFixed(0))}٪)`;
    const dirFa = m.direction === 'up' ? 'بالاتر' : 'پایین‌تر';
    // ⚠️ برچسب یک‌بار می‌آید: «... مقدار کراتینین ۱.۱۲ ... و در آخرین آزمایش ۱.۴۲».
    //    تکرارِ نام در هر دو مقدار، جمله را به‌شکلِ «کراتینین ... کراتینین» درمی‌آورد
    //    (باگِ دیده‌شده در بازبینیِ چشمی). عددِ دوم بعد از واژهٔ فارسی است، پس
    //    نشانگرِ جهت لازم ندارد.
    // آستانه با همان درصدِ مبنا-نسبی گفته می‌شود که تغییر؛ وگرنه کاربر عددِ ۳۴٪
    // را کنارِ آستانهٔ ۳۵٪ می‌بیند و انتظارِ «معنادار نیست» دارد (باگِ بازبینی).
    const thrFa = m.rcvPctRef != null ? `حدود ${faDigits(Math.round(m.rcvPctRef))}٪` : null;
    let s = `در آزمایشِ ${when} مقدار ${named(from)} بود و در آخرین آزمایش ${to} — یعنی ${dirFa}${pctFa}. ` +
            (thrFa
              ? `این تغییر از حدِ نوسانِ فردیِ همین آزمایش (${thrFa}) بیشتر است`
              : 'این تغییر از حدِ نوسانِ فردیِ همین آزمایش بیشتر است');
    if (m.zone?.kind === 'to_normal') s += ' و مقدار به محدودهٔ مرجع برگشته است.';
    else if (m.zone?.kind === 'to_abnormal') s += ' و مقدار از محدودهٔ مرجع بیرون رفته است.';
    else if (m.towardsRange === true) s += ' و به محدودهٔ مرجع نزدیک‌تر شده است.';
    else if (m.towardsRange === false) s += ' و از محدودهٔ مرجع دورتر شده است.';
    else s += '.';
    return s;
  }
  // تغییرِ زیرِ RCV یا بی‌RCV ⇒ صادقانه «قابلِ تفسیر نیست»
  const rTxt = m.rcvPctRef != null
    ? `کمتر از حدود ${faDigits(Math.round(m.rcvPctRef))}٪`
    : 'در حدی که با دادهٔ تغییرپذیریِ زیستیِ این آزمایش نمی‌شود سنجید';
  return `مقدار ${named(from)} (${when}) به ${to} رسیده؛ این تغییر ${rTxt} است، ` +
         `یعنی در محدودهٔ نوسانِ طبیعیِ بدن و خطای آزمایشگاه — نه بهتر شدن و نه بدتر شدن.`;
}
