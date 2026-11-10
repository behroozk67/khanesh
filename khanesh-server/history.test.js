// ============================================================
// تست‌های تاریخچه و مقایسهٔ نوبت‌های آزمایش (P120)
//
// چه چیزی را قفل می‌کند:
//   ۱. آستانهٔ «تغییرِ معنادار» فقط از RCVِ مستندِ biovar.js می‌آید.
//   ۲. گاردهایی که مقایسه را بی‌معنا می‌کنند (واحدِ متفاوت، همان روز، یک نوبت).
//   ۳. «بهتر/بدتر» فقط هندسی است (فاصله تا محدوده)، نه قضاوتِ بالینی.
//   ۴. ردیفِ کیفی واردِ تاریخچه نمی‌شود.
// ============================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRange, distanceFromRange, buildSeries, compareMarker, compareSeries,
  comparisonFa, logPctChange, pctChange, rcvThresholdPct, MIN_COMPARABLE_GAP_DAYS, STALE_DAYS,
  calculateTrend5,
} from './rules/history.js';
import { rcv } from './rules/biovar.js';
import { observationsFromResult, takenAtOf, ownerOf } from './historyRoutes.js';

// ── helper: ساختِ ردیفِ مشاهده ────────────────────────────────
const obs = (date, key, value, extra = {}) => ({
  lab_id: extra.labId ?? `lab-${date}`,
  taken_at: date,
  marker_key: key,
  value,
  unit: extra.unit ?? 'mg/dL',
  ref_range: extra.range ?? '0.7–1.3',
  abnormal: extra.abnormal ?? 0,
  dir: extra.dir ?? null,
});

// ══════════════════════════════════════════════════════════════
// H01 — بازهٔ مرجع از رشته
// ══════════════════════════════════════════════════════════════
test('H01: parseRange بازه‌های چاپی را می‌خواند', () => {
  assert.deepEqual(parseRange('70–110'), [70, 110]);
  assert.deepEqual(parseRange('0-200'), [0, 200]);
  assert.deepEqual(parseRange('4.0 - 10.0'), [4, 10]);
  assert.deepEqual(parseRange('۰٫۷–۱٫۳'), [0.7, 1.3]);
  // یک‌طرفه: فاصله معنا ندارد
  assert.equal(parseRange('< 530'), null);
  assert.equal(parseRange('> 40'), null);
  // مرجعِ ترکیبی: آخرین بازهٔ عددی، نه «70-80 years»
  assert.deepEqual(parseRange('70-80 years: 4.0-6.5'), [4, 6.5]);
  assert.equal(parseRange(null), null);
  assert.equal(parseRange(''), null);
});

// ══════════════════════════════════════════════════════════════
// H02 — فاصلهٔ نرمال‌شده تا محدوده
// ══════════════════════════════════════════════════════════════
test('H02: distanceFromRange داخل=۰ و بیرون=نسبت به پهنای بازه', () => {
  assert.equal(distanceFromRange(1.0, [0.7, 1.3]), 0);
  assert.ok(Math.abs(distanceFromRange(1.5, [0.7, 1.3]) - 1 / 3) < 1e-9);
  assert.ok(Math.abs(distanceFromRange(0.4, [0.7, 1.3]) - 0.5) < 1e-9);
  assert.equal(distanceFromRange(NaN, [0.7, 1.3]), null);
  assert.equal(distanceFromRange(1, null), null);
});

// ══════════════════════════════════════════════════════════════
// H03 — سری‌سازی و حذفِ تکرارِ همان روز
// ══════════════════════════════════════════════════════════════
test('H03: buildSeries مرتب می‌کند و تکرارِ همان روز را یکی می‌کند', () => {
  const s = buildSeries([
    obs('2026-05-01', 'CREAT', 1.4),
    obs('2026-01-10', 'CREAT', 1.0),
    obs('2026-05-01', 'CREAT', 1.5),           // بارگذاریِ دوبارهٔ همان روز ⇒ آخری می‌ماند
    obs('2026-03-01', 'HGB', 13.1, { unit: 'g/dL', range: '13–17' }),
  ]);
  const creat = s.get('CREAT');
  assert.equal(creat.length, 2);
  assert.equal(creat[0].value, 1.0);
  assert.equal(creat[1].value, 1.5);
  assert.equal(s.get('HGB').length, 1);
});

test('H03b: مقدارِ غیرعددی واردِ سری نمی‌شود', () => {
  const s = buildSeries([
    obs('2026-01-01', 'CREAT', 1.0),
    obs('2026-02-01', 'CREAT', 'Positive'),
    obs('2026-03-01', 'CREAT', null),
  ]);
  assert.equal(s.get('CREAT').length, 1);
});

// ══════════════════════════════════════════════════════════════
// H04 — معناداری از RCV (نه آستانهٔ ساختگی)
// ══════════════════════════════════════════════════════════════
test('H04: آستانه همان RCVِ biovar است و تغییرِ بالای آن «معنادار» می‌شود', () => {
  const r = rcv('CREAT');
  assert.equal(r, 18);           // CVi=5.95 ⇒ ۳.۱×CVi ≈ ۱۸٪ (روی این عدد قفل است)
  const pts = buildSeries([
    obs('2026-01-10', 'CREAT', 1.0),
    obs('2026-04-10', 'CREAT', 1.5, { abnormal: 1, dir: 'high' }),
  ]).get('CREAT');
  const m = compareMarker('CREAT', pts, { today: Date.parse('2026-05-01') });
  assert.equal(m.comparable, true);
  assert.equal(m.rcvPct, 18);
  assert.equal(m.significant, true);
  assert.equal(m.direction, 'up');
  assert.equal(m.zone.from, 'in');
  assert.equal(m.zone.to, 'high');
  assert.equal(m.zone.kind, 'to_abnormal');
  assert.equal(m.followUp, true);
});

test('H04b: تغییرِ زیرِ RCV «بی‌تغییر» است، نه بهتر/بدتر', () => {
  const pts = buildSeries([
    obs('2026-01-10', 'CREAT', 1.0),
    obs('2026-04-10', 'CREAT', 1.05),
  ]).get('CREAT');
  const m = compareMarker('CREAT', pts);
  assert.equal(m.significant, false);
  assert.equal(m.direction, 'up');
  assert.equal(m.zone.kind, 'in_to_in');
  assert.equal(m.towardsRange, null);     // قبلی داخل بود ⇒ این سنجه معنا ندارد
});

test('H04c: مارکرِ بی‌RCV ⇒ عدد گفته می‌شود ولی حکمِ معناداری نه', () => {
  const pts = buildSeries([
    obs('2026-01-10', 'NONEXISTENT_KEY', 10, { unit: 'x' }),
    obs('2026-04-10', 'NONEXISTENT_KEY', 20, { unit: 'x' }),
  ]).get('NONEXISTENT_KEY');
  const m = compareMarker('NONEXISTENT_KEY', pts);
  assert.equal(m.rcvPct, null);
  assert.equal(m.rcvKnown, false);
  assert.equal(m.significant, null);
  assert.equal(m.reason, 'no_rcv');
  assert.equal(m.comparable, true);
});

// ══════════════════════════════════════════════════════════════
// H05 — گاردها
// ══════════════════════════════════════════════════════════════
test('H05: یک نوبت ⇒ مقایسه انجام نمی‌شود', () => {
  const pts = buildSeries([obs('2026-01-10', 'CREAT', 1.0)]).get('CREAT');
  const m = compareMarker('CREAT', pts);
  assert.equal(m.count, 1);
  assert.equal(m.comparable, false);
  assert.equal(m.reason, 'single');
  assert.equal(m.previous, null);
});

test('H05b: واحدِ متفاوت ⇒ مقایسه ممنوع', () => {
  const pts = buildSeries([
    obs('2026-01-10', 'CREAT', 1.0, { unit: 'mg/dL' }),
    obs('2026-04-10', 'CREAT', 88, { unit: 'µmol/L' }),
  ]).get('CREAT');
  const m = compareMarker('CREAT', pts);
  assert.equal(m.comparable, false);
  assert.equal(m.reason, 'unit_mismatch');
  assert.equal(m.significant, null);
});

test('H05c: فاصلهٔ کمتر از یک روز ⇒ بارگذاریِ دوباره، نه مقایسه', () => {
  // تکرارِ همان «روز» در buildSeries یکی می‌شود؛ ولی دو ثبت در دو روزِ مجاور با
  // فاصلهٔ چند ساعت (۲۳:۰۰ و ۰۱:۰۰) از گاردِ فاصله رد می‌شود.
  const pts = buildSeries([
    { lab_id: 'a', taken_at: '2026-01-10T23:00:00Z', marker_key: 'CREAT', value: 1.0, unit: 'mg/dL', ref_range: '0.7–1.3', abnormal: 0, dir: null },
    { lab_id: 'b', taken_at: '2026-01-11T01:00:00Z', marker_key: 'CREAT', value: 1.5, unit: 'mg/dL', ref_range: '0.7–1.3', abnormal: 1, dir: 'high' },
  ]).get('CREAT');
  assert.equal(pts.length, 2);
  const m = compareMarker('CREAT', pts);
  assert.equal(m.comparable, false);
  assert.equal(m.reason, 'same_day');
  assert.ok(MIN_COMPARABLE_GAP_DAYS >= 1);
});

// ══════════════════════════════════════════════════════════════
// H06 — جهتِ حرکت نسبت به محدوده (حساب، نه قضاوت)
// ══════════════════════════════════════════════════════════════
test('H06: بیرون‌بودنِ قبلی ⇒ «به محدوده نزدیک‌تر شد» محاسبه می‌شود', () => {
  const pts = buildSeries([
    obs('2026-01-10', 'CREAT', 1.9, { abnormal: 1, dir: 'high' }),
    obs('2026-04-10', 'CREAT', 1.5, { abnormal: 1, dir: 'high' }),
  ]).get('CREAT');
  const m = compareMarker('CREAT', pts);
  assert.equal(m.significant, true);
  assert.equal(m.towardsRange, true);      // 0.6 → 0.2 فاصله
  assert.equal(m.zone.kind, 'abnormal_to_abnormal');
});

test('H06b: برگشت به محدوده = to_normal', () => {
  const pts = buildSeries([
    obs('2026-01-10', 'CREAT', 1.9, { abnormal: 1, dir: 'high' }),
    obs('2026-04-10', 'CREAT', 1.1),
  ]).get('CREAT');
  const m = compareMarker('CREAT', pts);
  assert.equal(m.zone.kind, 'to_normal');
  assert.equal(m.followUp, false);
});

// ══════════════════════════════════════════════════════════════
// H07 — کهنگی و پیگیری (واقعیتِ تقویمی، نه توصیهٔ بالینی)
// ══════════════════════════════════════════════════════════════
test('H07: کهنگی فقط بر پایهٔ فاصلهٔ تقویمی', () => {
  const pts = buildSeries([obs('2025-01-01', 'CREAT', 1.0)]).get('CREAT');
  const fresh = compareMarker('CREAT', pts, { today: Date.parse('2025-06-01') });
  const stale = compareMarker('CREAT', pts, { today: Date.parse('2025-01-01') + (STALE_DAYS + 5) * 86400000 });
  assert.equal(fresh.stale, false);
  assert.equal(stale.stale, true);
  assert.equal(stale.daysSinceLatest, STALE_DAYS + 5);
});

// ══════════════════════════════════════════════════════════════
// H08 — جمع‌بندی و ترتیبِ فوریت
// ══════════════════════════════════════════════════════════════
test('H08: compareSeries خلاصه را درست می‌شمارد و غیرطبیعی‌ها را اول می‌آورد', () => {
  const rows = [
    obs('2026-01-10', 'CREAT', 1.0, { labId: 'l1' }),
    obs('2026-04-10', 'CREAT', 1.6, { labId: 'l2', abnormal: 1, dir: 'high' }),
    obs('2026-01-10', 'HGB', 13.0, { labId: 'l1', unit: 'g/dL', range: '13–17' }),
    obs('2026-04-10', 'HGB', 14.2, { labId: 'l2', unit: 'g/dL', range: '13–17' }),
  ];
  const { markers, summary } = compareSeries(rows);
  assert.equal(summary.markers, 2);
  assert.equal(summary.labs, 2);
  assert.equal(summary.compared, 2);
  assert.equal(summary.abnormalNow, 1);
  assert.equal(summary.toAbnormal, 1);
  assert.equal(markers[0].key, 'CREAT');       // غیرطبیعیِ معنادار اول
  assert.equal(markers[1].key, 'HGB');
});

test('H08b: فیلترِ keys فقط همان مارکرها را می‌دهد', () => {
  const rows = [obs('2026-01-10', 'CREAT', 1.0), obs('2026-01-10', 'HGB', 13, { unit: 'g/dL' })];
  const { markers } = compareSeries(rows, { keys: ['HGB'] });
  assert.equal(markers.length, 1);
  assert.equal(markers[0].key, 'HGB');
});

// ══════════════════════════════════════════════════════════════
// H09 — جملهٔ فارسی
// ══════════════════════════════════════════════════════════════
test('H09: جملهٔ تغییرِ معنادار آستانه را هم‌زبانِ درصدِ تغییر می‌گوید', () => {
  const pts = buildSeries([
    obs('2026-01-10', 'CREAT', 1.0),
    obs('2026-04-10', 'CREAT', 1.6, { abnormal: 1, dir: 'high' }),
  ]).get('CREAT');
  const m = compareMarker('CREAT', pts);
  // افزایشِ ۶۰٪ خطی؛ آستانهٔ RCV=۱۸٪ لگاریتمی ⇒ e^0.18−1 = ۱۹.۷٪ خطی
  assert.equal(Math.round(m.pct), 60);
  assert.equal(Math.round(m.rcvPctRef), 20);
  const fa = comparisonFa(m);
  assert.match(fa, /بالاتر/);
  assert.match(fa, /۲۰٪/);              // آستانه، در همان زبانِ درصدِ مبنا-نسبی
  assert.match(fa, /بیرون رفته/);        // to_abnormal
});

test('H09b: تغییرِ زیرِ RCV صریحاً «نوسانِ طبیعی» خوانده می‌شود', () => {
  const pts = buildSeries([
    obs('2026-01-10', 'CREAT', 1.0),
    obs('2026-04-10', 'CREAT', 1.02),
  ]).get('CREAT');
  const fa = comparisonFa(compareMarker('CREAT', pts));
  assert.match(fa, /نوسانِ طبیعیِ بدن/);
  // هیچ ادعای بهبود/بدترشدنی نمی‌کند — عیناً می‌گوید «نه بهتر و نه بدتر»
  assert.match(fa, /نه بهتر شدن و نه بدتر شدن/);
  // عدد فارسی است، ولی نامِ لاتین و واحد دست‌نخورده می‌مانند
  assert.match(fa, /۱\.۰۲/);
  assert.doesNotMatch(fa, /HbA۱c/);
});

test('H09c: واحدِ ناهم‌خوان ⇒ جملهٔ «نمی‌شود سنجید» و بی‌عدد', () => {
  const pts = buildSeries([
    obs('2026-01-10', 'CREAT', 1.0, { unit: 'mg/dL' }),
    obs('2026-04-10', 'CREAT', 88, { unit: 'µmol/L' }),
  ]).get('CREAT');
  const fa = comparisonFa(compareMarker('CREAT', pts));
  assert.match(fa, /یکی نبود/);
});

test('H09d: بی‌مقایسه ⇒ null (چیزی نگو)', () => {
  assert.equal(comparisonFa(null), null);
  const pts = buildSeries([obs('2026-01-10', 'CREAT', 1.0)]).get('CREAT');
  assert.equal(comparisonFa(compareMarker('CREAT', pts)), null);
});

// ══════════════════════════════════════════════════════════════
// H09f — درصدِ نمایشی = مبنا-نسبی، نه تقسیم بر مقدارِ جدید/لگاریتمی
// ══════════════════════════════════════════════════════════════
test('H09f: درصدِ تغییر نسبت به مقدارِ قبلی حساب می‌شود (۷.۳ → ۴.۸ = ۳۴٪)', () => {
  assert.equal(pctChange(7.3, 4.8).toFixed(1), '-34.2');
  assert.equal(pctChange(3.36, 4.42).toFixed(1), '31.5');
  assert.equal(pctChange(100, 110).toFixed(1), '10.0');
  assert.equal(pctChange(0, 5), null);       // مخرجِ صفر ⇒ تعریف‌نشده
  assert.equal(pctChange(NaN, 5), null);
});

test('H09g: آستانهٔ RCV به درصدِ مبنا-نسبی ترجمه می‌شود (همان آزمون، زبانِ دیگر)', () => {
  const up = rcvThresholdPct(18, 'up');
  const down = rcvThresholdPct(18, 'down');
  assert.equal(up.toFixed(1), '19.7');       // e^0.18 − 1
  assert.equal(down.toFixed(1), '16.5');     // 1 − e^−0.18
  // همان آزمونِ لگاریتمی: آستانه دقیقاً معادلِ |ln ratio| = 0.18 است
  assert.equal(Math.abs(logPctChange(1, 1 + up / 100)).toFixed(2), '18.00');
  assert.equal(Math.abs(logPctChange(1, 1 - down / 100)).toFixed(2), '18.00');
  assert.equal(rcvThresholdPct(null, 'up'), null);
  assert.equal(rcvThresholdPct(18, 'flat'), null);
});

test('H09h: کاهشِ ۷.۳ → ۴.۸ از RCV عبور می‌کند، با اعدادِ هم‌زبان', () => {
  const pts = buildSeries([
    { lab_id: 'a', taken_at: '2026-01-10T09:00:00Z', marker_key: 'WBC', value: 7.3, unit: 'K/µL', ref_range: '4.5–11.0', abnormal: 0, dir: null },
    { lab_id: 'b', taken_at: '2026-04-10T09:00:00Z', marker_key: 'WBC', value: 4.8, unit: 'K/µL', ref_range: '4.5–11.0', abnormal: 0, dir: null },
  ]).get('WBC');
  const m = compareMarker('WBC', pts);
  assert.equal(m.direction, 'down');
  assert.equal(Math.round(Math.abs(m.pct)), 34);          // نمایشی: مبنا-نسبی
  assert.equal(Math.round(Math.abs(m.pctLog)), 42);       // لگاریتمی: مبنای RCV
  assert.equal(m.significant, Math.abs(m.pctLog) >= m.rcvPct);   // آزمون همان RCV است
  // آستانه در همان زبان: ۳۴٪ > ۳۰٪ ⇒ پیام و عدد با هم نمی‌جنگند
  assert.ok(Math.abs(m.pct) > m.rcvPctRef);
});

test('H09e: logPctChange روی مقیاسِ لگاریتمی است', () => {
  assert.equal(Math.round(logPctChange(100, 110)), 10);
  assert.equal(Math.round(logPctChange(110, 100)), -10);
  assert.equal(logPctChange(0, 10), null);
});

test('H09_trend5: تحلیل و بررسیِ روند ۵ نوبت اخیر', () => {
  const pts5Rising = buildSeries([
    obs('2025-01-10', 'CREAT', 0.8),
    obs('2025-04-10', 'CREAT', 0.9),
    obs('2025-07-10', 'CREAT', 1.0),
    obs('2025-10-10', 'CREAT', 1.15),
    obs('2026-01-10', 'CREAT', 1.3),
  ]).get('CREAT');

  const mRising = compareMarker('CREAT', pts5Rising);
  assert.equal(mRising.count, 5);
  assert.equal(mRising.recentPoints.length, 5);
  assert.equal(mRising.trend5.direction, 'rising');
  assert.equal(mRising.trend5.directionFa, 'صعودی');
  assert.ok(mRising.trend5.summaryFa.includes('صعودی'));

  const fa = comparisonFa(mRising);
  assert.ok(fa.includes('صعودی'));

  // نوسانی
  const pts5Fluct = buildSeries([
    obs('2025-01-10', 'CREAT', 1.0),
    obs('2025-04-10', 'CREAT', 1.3),
    obs('2025-07-10', 'CREAT', 0.9),
    obs('2025-10-10', 'CREAT', 1.25),
    obs('2026-01-10', 'CREAT', 1.0),
  ]).get('CREAT');

  const mFluct = compareMarker('CREAT', pts5Fluct);
  assert.equal(mFluct.trend5.direction, 'fluctuating');
  assert.equal(mFluct.trend5.directionFa, 'نوسانی');

  // پایدار
  const pts5Stable = buildSeries([
    obs('2025-01-10', 'CREAT', 1.0),
    obs('2025-04-10', 'CREAT', 1.01),
    obs('2025-07-10', 'CREAT', 1.0),
    obs('2025-10-10', 'CREAT', 1.02),
    obs('2026-01-10', 'CREAT', 1.01),
  ]).get('CREAT');

  const mStable = compareMarker('CREAT', pts5Stable);
  assert.equal(mStable.trend5.direction, 'stable');
  assert.equal(mStable.trend5.directionFa, 'پایدار');
});

// ══════════════════════════════════════════════════════════════
// H10 — پیوند با بدنهٔ تحلیل (observationsFromResult)
// ══════════════════════════════════════════════════════════════
test('H10: از خروجیِ تحلیل فقط ردیفِ عددی و یکتا برداشته می‌شود', () => {
  const result = {
    _engine: {
      tests: [
        { key: 'CREAT', value: 1.2, range: '0.7–1.3', abnormal: false, dir: null },
        { key: 'CREAT', value: 1.2, range: '0.7–1.3', abnormal: false, dir: null },   // تکرار
        { key: 'CRP', value: null, range: '0–5', abnormal: false, dir: null },          // بی‌عدد
        { key: 'HGB', value: 11.2, range: '13–17', abnormal: true, dir: 'low' },
      ],
      context: { sample_date: '2026-03-05T00:00:00.000Z' },
    },
  };
  const o = observationsFromResult(result);
  assert.equal(o.length, 2);
  assert.deepEqual(o.map((x) => x.marker_key), ['CREAT', 'HGB']);
  assert.equal(o[1].abnormal, true);
  assert.equal(o[1].dir, 'low');
  assert.equal(o[1].unit, 'g/dL');        // واحدِ متعارف از refs.js
  assert.equal(o[0].unit, 'mg/dL');
});

test('H10b: بی_engine ⇒ آرایهٔ خالی (نه خطا)', () => {
  assert.deepEqual(observationsFromResult({}), []);
  assert.deepEqual(observationsFromResult(null), []);
  assert.deepEqual(observationsFromResult({ _engine: { tests: 'x' } }), []);
});

test('H10c: تاریخِ نمونه از برگه، وگرنه زمانِ تحلیل', () => {
  const withDate = takenAtOf({ _engine: { context: { sample_date: '2026-03-05T00:00:00.000Z' } } }, '2026-10-01T00:00:00.000Z');
  assert.equal(withDate, '2026-03-05T00:00:00.000Z');
  const without = takenAtOf({ _engine: {} }, '2026-10-01T00:00:00.000Z');
  assert.equal(without, '2026-10-01T00:00:00.000Z');
});

// ══════════════════════════════════════════════════════════════
// H11 — مالکیت
// ══════════════════════════════════════════════════════════════
test('H11: ownerOf کاربرِ واردشده را بر شناسهٔ دستگاه مقدم می‌داند', () => {
  const authReq = { user: { userId: 7, anonymous: false }, get: () => 'device-12345678' };
  assert.equal(ownerOf(authReq), 'u:7');

  const anonReq = { user: { userId: 1, anonymous: true }, get: () => 'device-12345678' };
  const o = ownerOf(anonReq);
  assert.match(o, /^d:[0-9a-f]{24}$/);
  // همان دستگاه ⇒ همان مالک؛ دستگاهِ دیگر ⇒ مالکِ دیگر
  assert.equal(ownerOf(anonReq), o);
  assert.notEqual(ownerOf({ user: { userId: 1, anonymous: true }, get: () => 'other-device-99' }), o);
});

test('H11b: بی‌ورود و بی‌شناسه ⇒ null (مسیر می‌گوید 400)', () => {
  assert.equal(ownerOf({ user: null, get: () => null }), null);
  assert.equal(ownerOf({ user: { userId: 1, anonymous: true }, get: () => 'bad' }), null);
});

test('H10d: ردیفِ ادرارِ غیرطبیعیِ _engine.tests («+1»، وزنِ مخصوص) وارد تاریخچه نمی‌شود', () => {
  const result = { _engine: { tests: [
    { key: 'URINE_PROTEIN', value: '+1', range: null, abnormal: true, dir: null },
    { key: 'URINE_SG', value: '1.003', range: '1.005–1.030', abnormal: true, dir: 'low' },
    { key: 'HGB', value: 11.2, range: '13–17', abnormal: true, dir: 'low' },
  ] } };
  assert.deepEqual(observationsFromResult(result).map((x) => x.marker_key), ['HGB']);
});

// H10TM (specs/019) — ردیفِ بی‌حکم (abnormal:null) در سری ثبت نمی‌شود؛ پیش‌تر `!!null` آن را «در محدوده» می‌کرد و نوبتِ بعد «از محدوده
// بیرون رفته» می‌گفت. تومورمارکر (حتی دارای حکم) هم ثبت نمی‌شود: مقدارِ دو آزمایشگاه/کیت قابل‌مقایسه نیست (NACB 2008 ص ۵۴) و تاریخچه
// کیت را نمی‌شناسد. ردیفِ عادیِ دارای حکم (HGB) ثبت می‌شود.
test('H10TM: abnormal:null و تومورمارکر ثبت نمی‌شوند؛ ردیفِ عادی ثبت می‌شود', () => {
  const result = {
    _engine: {
      tests: [
        { key: 'CEA', value: 7, range: 'Non smoker: < 5   Smokers: < 10', abnormal: null, dir: null, verdict: 'between', source: 'tumor_marker_printed' },
        { key: 'CA153', value: 11.6, range: null, abnormal: null, dir: null, verdict: 'noref', source: 'tumor_marker_printed' },
        { key: 'CA125', value: 10.3, range: '0-35', abnormal: false, dir: null, verdict: 'within', source: 'tumor_marker_printed' },
        { key: 'CA199', value: 90, range: '< 37', abnormal: true, dir: 'high', verdict: 'above', source: 'tumor_marker_printed' },
        { key: 'HGB', value: 11.2, range: '13–17', abnormal: true, dir: 'low' },
      ],
      context: { sample_date: '2026-03-05T00:00:00.000Z' },
    },
  };
  assert.deepEqual(observationsFromResult(result).map((x) => [x.marker_key, x.abnormal]), [['HGB', true]]);
});

// H10TM2 (specs/020، P132) — هفت کلیدِ تازهٔ TM_KEYS (PSA، AFP، …) حالا ردیفِ _engine.tests دارند؛ ردیف‌های *واقعیِ* موتور
//   (نه دست‌نوشته) هم به سریِ تاریخچه نمی‌روند، چون source همان «tumor_marker_printed» است. PSAِ دارای حکم (within/above) هم نه.
test('H10TM2: ردیف‌های واقعیِ PSA/AFP/کلسی‌تونین از tumorMarkerRows در تاریخچه ثبت نمی‌شوند', async () => {
  const { runEngine } = await import('./rules/adapter.js');
  const { tumorMarkerRows } = await import('./rules/tumor_markers.js');
  const T = (name, value, unit, reference) => ({ name, value: String(value), unit, reference });
  const e = runEngine({ patient: { age: 60, sex: 'M' }, tests: [T('PSA', 6, 'ng/mL', '< 4.0'), T('Free PSA Ratio', 30, '%', '> 25'), T('AFP', 3, 'ng/mL', '< 7.0'), T('Calcitonin', 2, 'pg/mL', '< 10')] });
  const rows = tumorMarkerRows(e);
  assert.deepEqual(rows.map((r) => r.key).sort(), ['AFP', 'CALCITONIN', 'PSA_RATIO', 'PSA_TOTAL'], 'پیش‌شرط: ردیف‌ها ساخته شوند');
  assert.ok(rows.some((r) => r.abnormal === true) && rows.some((r) => r.abnormal === false), 'پیش‌شرط: ردیفِ دارای حکم');
  const result = { _engine: { tests: [...rows, { key: 'HGB', value: 11.2, range: '13–17', abnormal: true, dir: 'low' }], context: { sample_date: '2026-03-05T00:00:00.000Z' } } };
  assert.deepEqual(observationsFromResult(result).map((x) => x.marker_key), ['HGB']);
});
