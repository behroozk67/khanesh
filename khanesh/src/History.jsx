// ============================================================
// تاریخچهٔ آزمایش‌ها و مقایسهٔ نوبت‌ها (P120)
//
// چه چیزی نشان می‌دهد:
//   • فهرستِ نوبت‌های آزمایشِ همین بیمار (تاریخ، تعداد مارکر، تعداد خارج از محدوده)
//   • برای هر مارکر: آخرین مقدار، مقدارِ نوبتِ قبل، تغییر، و اینکه تغییر از
//     حدِ نوسانِ طبیعی (RCV) گذشته یا نه
//   • نمودارِ کوچکِ روند با نوارِ محدودهٔ مرجع
//   • امکانِ اصلاحِ تاریخِ نمونه و حذفِ نوبت
//
// ⚠️ مرزِ ادعا (همان مرزِ rules/history.js):
//   هیچ حکمِ بالینیِ تازه‌ای این‌جا ساخته نمی‌شود. عدد، جهت، و آستانهٔ RCV از
//   سرور می‌آید؛ فرانت فقط می‌چیند. «بهتر/بدتر» فقط وقتی گفته می‌شود که
//   سرور فاصله تا محدودهٔ مرجع را کم‌شده/زیادشده حساب کرده باشد.
//
// ⚠️ درسِ بازبینیِ بصری (N41) — چهار نکته‌اش این‌جا رعایت شده:
//   ۱) درصدِ تغییر و آستانهٔ نوسان هم‌زبان‌اند (هر دو مبنا-نسبی، محاسبه در سرور).
//   ۲) هر کارت **یک** برچسبِ وضعیت دارد: بج. سطرِ «وضعیت:» و تکرارِ عددها حذف شد.
//   ۳) عدد و واحد در قالبِ nowrap و ایزوله (bdi/LTR) هستند؛ M/µL نمی‌شکند.
//   ۴) چیدمانِ ستون‌ها ثابت است، پس درصدِ تغییر جای ثابتی در همهٔ کارت‌ها دارد.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toFaDigits } from './digits.js';
import { apiJson } from './deviceId.js';
import { LabMateLogo } from './LabMateLogo.jsx';
import { useActivePlan } from './userPlan.js';
import { PlanBadge, UpgradeModal } from './PlanGate.jsx';
import './History.css';

const fa = (n) => (n == null ? '—' : toFaDigits(typeof n === 'number' ? String(n) : n));

/** «۱.۲» یا «۱.۲ mg/dL» — عدد و واحد در یک قالبِ نشکن و ایزوله (RTL-safe). */
function Val({ value, unit, small = false }) {
  const cls = `hist-val${small ? ' hist-val-prev' : ''}`;
  if (value == null) return <span className={cls}>—</span>;
  const num = Number.isInteger(value) ? value : +Number(value).toFixed(2);
  return (
    <span className={cls}>
      <bdi className="hist-num" dir="ltr">{toFaDigits(String(num))}</bdi>
      {unit && <bdi className="hist-unit" dir="ltr">{unit === '%' ? '٪' : unit}</bdi>}
    </span>
  );
}

/** نمودارِ کوچکِ روند: نوارِ محدوده + خطِ مقادیر. بدونِ وابستگیِ خارجی. */
function Spark({ points, range }) {
  const W = 132, H = 44, PAD = 4;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals, ...(range ? [range[0]] : []));
  const hi = Math.max(...vals, ...(range ? [range[1]] : []));
  // حاشیهٔ ۸٪ در دامنه: نه نقطه و نه مرزِ نوار به لبه نچسبد. نبودِ همین حاشیه
  // باعث می‌شد نوارِ سبز و نقطه‌ها «ناهم‌تراز» دیده شوند (نکتهٔ بازبینی).
  const raw = hi - lo || Math.abs(hi) || 1;
  const dlo = lo - raw * 0.08;
  const dspan = raw + raw * 0.16;
  const x = (i) => PAD + (i * (W - 2 * PAD)) / Math.max(points.length - 1, 1);
  const y = (v) => H - PAD - ((v - dlo) / dspan) * (H - 2 * PAD);
  const band = range ? { y1: y(range[1]), y2: y(range[0]) } : null;
  const last = points.length - 1;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  return (
    <svg className="hist-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="روند مقدار در نوبت‌ها؛ قدیم در چپ، جدید در راست">
      {band && <rect x={PAD} y={band.y1} width={W - 2 * PAD} height={Math.max(band.y2 - band.y1, 1)} className="hist-spark-band" />}
      <path d={path} className="hist-spark-line" fill="none" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 3.2 : 2.2}
          className={`hist-spark-dot${p.abnormal ? ' is-out' : ''}${i === last ? ' is-last' : ''}`}
        />
      ))}
    </svg>
  );
}

/**
 * یک برچسبِ وضعیت برای هر کارت — از همان دادهٔ سرور، بی‌تکرار در متن و پانویس.
 * ok = سبز (در محدوده) · watch = کهربایی (تغییرِ واقعی ولی هنوز در محدوده)
 * out = قرمز (خارج از محدوده در آخرین نوبت).
 */
function statusOf(m) {
  if (m.followUp) return { cls: 'is-out', text: 'خارج از محدوده' };
  if (!m.previous || !m.comparable || !m.zone) return { cls: 'is-ok', text: 'در محدوده' };
  switch (m.zone.kind) {
    case 'to_normal':
      return { cls: 'is-ok', text: 'برگشت به محدوده' };
    case 'to_abnormal':
      return { cls: 'is-out', text: 'خارج از محدوده شد' };
    case 'in_to_in':
      return m.significant
        ? { cls: 'is-watch', text: 'تغییرِ واقعی، در محدوده' }
        : { cls: 'is-ok', text: 'در محدوده' };
    default: // abnormal_to_abnormal
      return m.towardsRange
        ? { cls: 'is-watch', text: 'به محدوده نزدیک‌تر' }
        : { cls: 'is-out', text: 'دورتر از محدوده' };
  }
}

/** جملهٔ نتیجه‌محورِ یک‌خطی. اعداد بالای کارت آمده‌اند، پس این‌جا تکرار نمی‌شوند. */
function verdictOf(m) {
  if (m.reason === 'same_day') return 'دو نوبت کمتر از یک روز فاصله دارند — همان برگه دوباره بارگذاری شده؛ مقایسه معنا ندارد.';
  if (m.reason === 'unit_mismatch') return 'واحدِ دو نوبت یکی نیست؛ اعداد را نمی‌شود با هم سنجید.';
  if (m.significant === true) {
    if (m.zone?.kind === 'to_normal') return 'تغییرِ واقعی، فراتر از نوسانِ فردی — و بازگشت به محدودهٔ مرجع.';
    if (m.zone?.kind === 'to_abnormal') return 'تغییرِ واقعی، فراتر از نوسانِ فردی — و خروج از محدودهٔ مرجع.';
    if (m.towardsRange === true) return 'تغییرِ واقعی و نزدیک‌شدن به محدودهٔ مرجع.';
    if (m.towardsRange === false) return 'تغییرِ واقعی و دورشدن از محدودهٔ مرجع.';
    return 'تغییرِ واقعی، فراتر از نوسانِ فردی.';
  }
  if (m.significant === false) return 'کمتر از حدِ نوسانِ فردی — نوسانِ طبیعیِ بدن و خطای آزمایشگاه.';
  return 'دادهٔ نوسانِ فردی برای این آزمایش در دست نیست؛ فقط عدد و جهت گفته می‌شود.';
}

function MarkerCard({ m }) {
  const status = statusOf(m);
  const rng = useMemo(() => {
    const r = m.latest?.range;
    if (!r) return null;
    // سرور بازه را به شکلِ "0.7–1.3" می‌دهد؛ همان‌جا فقط برای نوار خوانده می‌شود.
    const all = [...String(r).matchAll(/(-?\d+(?:[.,]\d+)?)\s*[–—−-]\s*(-?\d+(?:[.,]\d+)?)/g)];
    const hit = all[all.length - 1];
    return hit ? [Number(hit[1].replace(',', '.')), Number(hit[2].replace(',', '.'))] : null;
  }, [m.latest?.range]);

  const signFa = m.direction === 'flat'
    ? 'بی‌تغییر'
    : `${m.direction === 'up' ? '▲' : '▼'} ${fa(Math.abs(m.pct ?? 0).toFixed(0))}٪`;

  return (
    <article className={`hist-card${m.followUp ? ' is-out' : ''}`}>
      <header className="hist-card-head">
        <div>
          <h3 className="hist-card-title">{m.label}</h3>
          <p className="hist-card-sub">
            {m.count > 1
              ? `${fa(m.count)} نوبت · آخرین: ${m.latest_fa || fa(m.latest?.date)}`
              : `یک نوبت · ${m.latest_fa || fa(m.latest?.date)}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {m.trend5?.direction && m.trend5.direction !== 'single' && (
            <span className={`hist-trend-badge is-${m.trend5.direction}`}>
              روندِ {fa(m.trend5.count)} نوبت: {m.trend5.directionFa}
            </span>
          )}
          <span className={`hist-badge ${status.cls}`}>{status.text}</span>
        </div>
      </header>

      <div className="hist-card-body">
        {m.recentPoints && m.recentPoints.length > 2 ? (
          <div className="hist-timeline-5" dir="ltr" aria-label="روند نوبت‌های اخیر">
            {m.recentPoints.map((p, idx) => (
              <div
                key={idx}
                className={`hist-point-pill${idx === m.recentPoints.length - 1 ? ' is-latest' : ''}${p.abnormal ? ' is-out' : ''}`}
                title={`نوبت ${fa(idx + 1)}: ${p.dateFa || fa(p.date)} - مقدار: ${p.value} ${m.unit || ''}`}
              >
                <span className="hist-point-date">{p.dateFa ? p.dateFa.split(' ').slice(0, 2).join(' ') : `نوبت ${fa(idx + 1)}`}</span>
                <span className="hist-point-val"><Val value={p.value} unit={m.unit} small={idx < m.recentPoints.length - 1} /></span>
                <span className="hist-point-tag">{idx === m.recentPoints.length - 1 ? 'آخرین' : `نوبت ${fa(idx + 1)}`}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={`hist-values${m.previous ? '' : ' is-single'}`} dir="ltr">
            {m.previous && (
              <div className="hist-cell is-prev">
                <Val value={m.previous.value} unit={m.unit} small />
                <span className="hist-val-label">نوبتِ قبل{m.previous_fa ? ` · ${m.previous_fa}` : ''}</span>
              </div>
            )}
            <div className="hist-cell is-now">
              <Val value={m.latest?.value} unit={m.unit} />
              <span className="hist-val-label">آخرین مقدار</span>
            </div>
          </div>
        )}

        {m.points.length > 1 && <Spark points={m.points} range={rng} />}

        {m.previous && (
          <div className={`hist-delta${m.significant === true ? ' is-sig' : ''}`}>
            <span className="hist-delta-v">{signFa}</span>
            {m.rcvPctRef != null && (
              <span className="hist-delta-thr">حدِ نوسانِ فردی: {fa(Math.round(m.rcvPctRef))}٪</span>
            )}
            {m.trend5?.overallDelta != null && m.recentPoints?.length > 2 && (
              <span className="hist-delta-thr">
                تغییرِ {fa(m.recentPoints.length)} نوبت: {m.trend5.overallDelta > 0 ? '+' : ''}{fa(m.trend5.overallDelta)} {m.unit} ({m.trend5.directionFa})
              </span>
            )}
          </div>
        )}
      </div>

      <p className={`hist-note${m.significant === true ? ' is-sig' : ''}`}>
        {m.count > 1
          ? verdictOf(m)
          : 'با ثبتِ نوبتِ بعدی، تغییر این آزمایش و معنادار بودنش همین‌جا نشان داده می‌شود.'}
      </p>

      {/* متنِ کاملِ محاسبه (تاریخ و اعداد) پشتِ یک کلیک — نه تکرارِ اجباری در هر کارت */}
      {m.count > 1 && m.fa && (
        <details className="hist-details">
          <summary>جزئیاتِ محاسبه و روند</summary>
          <p className="hist-note-detail">{m.fa}</p>
        </details>
      )}
    </article>
  );
}

function LabRow({ lab, onDeleted, onPatched, busy }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState((lab.taken_at || '').slice(0, 10));

  const save = async () => {
    await onPatched(lab.id, date);
    setEditing(false);
  };

  return (
    <li className="hist-lab">
      <div className="hist-lab-main">
        <span className="hist-lab-date">{lab.taken_fa || fa(lab.taken_at)}</span>
        <span className="hist-lab-meta">
          {fa(lab.markers)} آزمایش
          {lab.abnormal > 0 && <span className="hist-lab-out"> · {fa(lab.abnormal)} خارج از محدوده</span>}
        </span>
      </div>
      {editing ? (
        <div className="hist-lab-edit">
          <label className="hist-sr" htmlFor={`d-${lab.id}`}>تاریخِ نمونه</label>
          <input
            id={`d-${lab.id}`} type="date" value={date}
            onChange={(e) => setDate(e.target.value)} disabled={busy}
          />
          <button type="button" className="hist-btn" onClick={save} disabled={busy || !date}>ذخیره</button>
          <button type="button" className="hist-btn hist-btn-ghost" onClick={() => setEditing(false)} disabled={busy}>انصراف</button>
        </div>
      ) : (
        <div className="hist-lab-actions">
          <button type="button" className="hist-btn hist-btn-ghost" onClick={() => setEditing(true)} disabled={busy}>
            اصلاحِ تاریخ
          </button>
          <button type="button" className="hist-btn hist-btn-ghost" onClick={() => onDeleted(lab.id)} disabled={busy}>
            حذف
          </button>
        </div>
      )}
    </li>
  );
}

const FILTERS = [
  { id: 'all', label: 'همه', test: () => true },
  { id: 'sig', label: 'تغییرِ معنادار', test: (m) => m.significant === true },
  { id: 'watch', label: 'نیازمند توجه', test: (m) => m.followUp === true },
  { id: 'better', label: 'برگشت به محدوده', test: (m) => m.zone?.kind === 'to_normal' },
];

export default function History() {
  const { can, plan, planId, setPlan } = useActivePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [labs, setLabs] = useState([]);
  const [trends, setTrends] = useState({ markers: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setError('');
    try {
      const [h, t] = await Promise.all([apiJson('/api/history'), apiJson('/api/history/trends')]);
      setLabs(h.labs || []);
      setTrends({ markers: t.markers || [], summary: t.summary || null });
    } catch (e) {
      setError(e.message || 'خواندنِ تاریخچه انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (fn) => {
    setBusy(true);
    try { await fn(); await load(); }
    catch (e) { setError(e.message || 'عملیات انجام نشد.'); }
    finally { setBusy(false); }
  };

  const del = (id) => act(() => apiJson(`/api/history/labs/${id}`, { method: 'DELETE' }));
  const patch = (id, takenAt) => act(() => apiJson(`/api/history/labs/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ takenAt: new Date(takenAt + 'T09:00:00').toISOString() }),
  }));

  const multi = trends.markers.filter((m) => m.count > 1);
  const single = trends.markers.filter((m) => m.count === 1);
  const active = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const filtered = multi.filter(active.test);
  const shown = showAll ? [...filtered, ...single] : filtered;
  const s = trends.summary;

  return (
    <div className="hist-page">
      <header className="hist-top">
        <Link to="/app" className="hist-logo" aria-label="آزمایار"><LabMateLogo /></Link>
        <Link to="/profile" className="hist-back">پروفایل</Link>
      </header>

      <main className="hist-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
          <h1 className="hist-title" style={{ margin: 0 }}>تاریخچهٔ آزمایش‌ها</h1>
          <PlanBadge />
        </div>
        <p className="hist-lead">
          هر برگه‌ای که تفسیر می‌کنید این‌جا می‌ماند تا نوبتِ بعد ببینید نسبت به قبل چه تغییری کرده —
          و چه تغییری واقعاً «تغییر» است و چه چیزی فقط نوسانِ طبیعیِ بدن و خطای آزمایشگاه.
        </p>

        {!can("trendsAndHistory") ? (
          <div className="pg-locked-card" style={{ marginTop: '24px' }}>
            <span className="pg-locked-badge">مختص پلن پایش سلامت (Empire) و خانواده</span>
            <div className="pg-locked-icon" aria-hidden="true">🔒</div>
            <h2 className="pg-locked-title">تحلیل روند ۵ نوبت اخیر در پرونده سلامت</h2>
            <p className="pg-locked-desc">
              پلن فعال شما در حال حاضر <b>{plan.name}</b> است که شامل تفسیر تک‌نوبت آزمایش می‌شود. قابلیت ذخیره پرونده، مقایسه نوبت‌های متوالی و تشخیص نوسان طبیعی (RCV) در پلن پایش سلامت فعال است.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary btn--pill"
                style={{ fontSize: '13.5px', padding: '8px 22px' }}
                onClick={() => setUpgradeOpen(true)}
              >
                ارتقا به پلن پایش سلامت
              </button>
              <Link to="/app" className="btn btn--secondary btn--pill" style={{ fontSize: '13.5px', padding: '8px 22px', textDecoration: 'none' }}>
                بازگشت به تفسیر آزمایش
              </Link>
            </div>
          </div>
        ) : error ? (
          <div className="hist-error" role="alert">{error}</div>
        ) : loading ? (
          <p className="hist-loading">در حال خواندنِ تاریخچه…</p>
        ) : labs.length === 0 ? (
          <div className="hist-empty">
            <p>هنوز آزمایشی ثبت نشده است.</p>
            <p className="hist-fine">
              از نسخهٔ فعلی، هر تحلیلی که انجام دهید خودکار این‌جا ثبت می‌شود. تحلیل‌هایی که
              <b> پیش از</b> فعال‌شدنِ این قابلیت انجام شده‌اند قابلِ بازیابی نیستند — برای دیدنِ روند،
              همان برگه را یک‌بار دیگر تحلیل کنید.
            </p>
            <Link to="/app" className="hist-btn hist-btn-primary">تفسیرِ اولین برگه</Link>
          </div>
        ) : (
          <>
            {s && (
              <section className="hist-summary" aria-label="خلاصه">
                <div className="hist-stat"><b>{fa(s.labs)}</b><span>نوبتِ ثبت‌شده</span></div>
                <div className="hist-stat"><b>{fa(s.compared)}</b><span>آزمایشِ قابلِ مقایسه</span></div>
                <div className="hist-stat"><b>{fa(s.significant)}</b><span>تغییرِ فراتر از نوسانِ طبیعی</span></div>
                <div className="hist-stat"><b>{fa(s.abnormalNow)}</b><span>خارج از محدوده در آخرین نوبت</span></div>
              </section>
            )}

            <section className="hist-section">
              <h2 className="hist-h2">تغییر نسبت به نوبت قبل</h2>
              {multi.length === 0 ? (
                <p className="hist-note-block">
                  برای مقایسه دست‌کم دو نوبت لازم است. الان فقط یک نوبت ثبت شده؛ بعد از برگهٔ بعدی
                  این بخش پر می‌شود.
                </p>
              ) : (
                <>
                  <div className="hist-chips" role="group" aria-label="صافیِ کارت‌ها">
                    {FILTERS.map((f) => {
                      const n = f.id === 'all' ? multi.length : multi.filter(f.test).length;
                      return (
                        <button
                          key={f.id} type="button"
                          className={`hist-chip${filter === f.id ? ' is-active' : ''}`}
                          aria-pressed={filter === f.id}
                          onClick={() => setFilter(f.id)}
                        >
                          {f.label} <span className="hist-chip-n">{fa(n)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {shown.length === 0 ? (
                    <p className="hist-note-block">در این دسته چیزی نیست.</p>
                  ) : (
                    <div className="hist-grid">
                      {shown.map((m) => <MarkerCard key={m.key} m={m} />)}
                    </div>
                  )}
                </>
              )}
              {single.length > 0 && (
                <button type="button" className="hist-btn hist-btn-ghost hist-more" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'فقط آزمایش‌های مقایسه‌شده' : `نمایش ${fa(single.length)} آزمایشِ تک‌نوبتی`}
                </button>
              )}
            </section>

            <section className="hist-section">
              <h2 className="hist-h2">نوبت‌ها</h2>
              <ul className="hist-labs">
                {labs.map((l) => (
                  <LabRow key={l.id} lab={l} busy={busy} onDeleted={del} onPatched={patch} />
                ))}
              </ul>
              <p className="hist-fine">
                تاریخِ هر نوبت از خودِ برگه خوانده می‌شود؛ اگر اشتباه بود، «اصلاحِ تاریخ» را بزنید تا
                ترتیبِ روند درست شود. حذف، فقط ردیفِ همان نوبت را از تاریخچه برمی‌دارد.
              </p>
            </section>
          </>
        )}

        <p className="hist-disc">
          این صفحه تغییرها را با «حدِ نوسانِ طبیعی» هر آزمایش می‌سنجد (تغییرپذیریِ زیستی — EFLM) و
          درصدِ تغییر را نسبت به مقدارِ نوبتِ قبل حساب می‌کند. تغییری که از این حد کمتر است، معمولاً
          نوسانِ بدن و خطای آزمایشگاه است. تفسیرِ بالینی و تصمیم دربارهٔ تکرارِ آزمایش با پزشکِ شماست.
        </p>

        {upgradeOpen && (
          <UpgradeModal
            targetFeatureTitle="تحلیل روند ۵ نوبت اخیر در پرونده سلامت"
            currentPlanId={planId}
            targetPlanId="empire"
            onSelect={(id) => {
              setPlan(id);
              setUpgradeOpen(false);
            }}
            onClose={() => setUpgradeOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
