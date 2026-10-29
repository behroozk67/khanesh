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
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toFaDigits } from './digits.js';
import { apiJson } from './deviceId.js';
import { LabMateLogo } from './LabMateLogo.jsx';
import './History.css';

const fa = (n) => (n == null ? '—' : toFaDigits(typeof n === 'number' ? String(n) : n));

function fmtVal(v, unit) {
  if (v == null) return '—';
  const num = Number.isInteger(v) ? v : +Number(v).toFixed(2);
  const s = toFaDigits(String(num));
  if (!unit) return s;
  return unit === '%' ? `${s}٪` : `${s} ${unit}`;
}

/** نمودارِ کوچکِ روند: نوارِ محدوده + خطِ مقادیر. بدونِ وابستگیِ خارجی. */
function Spark({ points, range }) {
  const W = 132, H = 44, PAD = 4;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals, ...(range ? [range[0]] : []));
  const hi = Math.max(...vals, ...(range ? [range[1]] : []));
  const span = hi - lo || 1;
  const x = (i) => PAD + (i * (W - 2 * PAD)) / Math.max(points.length - 1, 1);
  const y = (v) => H - PAD - ((v - lo) / span) * (H - 2 * PAD);
  const band = range
    ? { y1: y(range[1]), y2: y(range[0]) }
    : null;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  return (
    <svg className="hist-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="روند مقدار در نوبت‌ها">
      {band && <rect x={PAD} y={band.y1} width={W - 2 * PAD} height={Math.max(band.y2 - band.y1, 1)} className="hist-spark-band" />}
      <path d={path} className="hist-spark-line" fill="none" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 3.2 : 2.2}
          className={p.abnormal ? 'hist-spark-dot is-out' : 'hist-spark-dot'}
        />
      ))}
    </svg>
  );
}

const ZONE_FA = {
  to_normal: 'برگشت به محدوده',
  to_abnormal: 'خروج از محدوده',
  in_to_in: 'در محدوده',
  abnormal_to_abnormal: 'بیرون از محدوده',
};

function MarkerCard({ m }) {
  const comparable = m.count > 1 && m.comparable;
  const badge = m.followUp
    ? { cls: 'is-out', fa: 'خارج از محدوده' }
    : m.count > 1
      ? { cls: 'is-ok', fa: 'در محدوده' }
      : null;
  const rng = useMemo(() => {
    const r = m.latest?.range;
    if (!r) return null;
    // سرور بازه را به شکلِ "0.7–1.3" می‌دهد؛ همان‌جا فقط برای نوار خوانده می‌شود.
    const all = [...String(r).matchAll(/(-?\d+(?:[.,]\d+)?)\s*[–—−-]\s*(-?\d+(?:[.,]\d+)?)/g)];
    const hit = all[all.length - 1];
    return hit ? [Number(hit[1].replace(',', '.')), Number(hit[2].replace(',', '.'))] : null;
  }, [m.latest?.range]);

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
        {badge && <span className={`hist-badge ${badge.cls}`}>{badge.fa}</span>}
      </header>

      <div className="hist-card-body">
        <div className="hist-values">
          <div className="hist-now">
            <span className="hist-val">{fmtVal(m.latest?.value, m.unit)}</span>
            <span className="hist-val-label">آخرین مقدار</span>
          </div>
          {m.previous && (
            <div className="hist-prev">
              <span className="hist-val-prev">{fmtVal(m.previous.value, m.unit)}</span>
              <span className="hist-val-label">نوبت قبل{m.previous_fa ? ` · ${m.previous_fa}` : ''}</span>
            </div>
          )}
          {m.previous && (
            <div className={`hist-delta ${m.significant === true ? 'is-sig' : ''}`}>
              <span className="hist-delta-v">
                {m.direction === 'flat' ? 'بی‌تغییر' : `${m.direction === 'up' ? '▲' : '▼'} ${fa(Math.abs(m.pct ?? 0).toFixed(0))}٪`}
              </span>
              <span className="hist-val-label">
                {m.rcvKnown ? `حدِ نوسانِ طبیعی: ${fa(m.rcvPct)}٪` : 'بی‌دادهٔ نوسان'}
              </span>
            </div>
          )}
        </div>
        {m.points.length > 1 && <Spark points={m.points} range={rng} />}
      </div>

      {m.count > 1 && (
        <p className={`hist-note ${m.significant === true ? 'is-sig' : ''}`}>
          {m.fa || (m.reason === 'same_day'
            ? 'این دو نوبت کمتر از یک روز فاصله دارند؛ معمولاً یعنی همان برگه دوباره بارگذاری شده — مقایسه معنادار نیست.'
            : '')}
        </p>
      )}
      {m.count === 1 && (
        <p className="hist-note">
          با ثبتِ نوبتِ بعدی، تغییر این آزمایش و معنادار بودنش همین‌جا نشان داده می‌شود.
        </p>
      )}
      {comparable && m.zone && (
        <p className="hist-zone">
          وضعیت: {ZONE_FA[m.zone.kind] || '—'}
          {m.significant === false ? ' · تغییر در محدودهٔ نوسانِ طبیعی' : ''}
        </p>
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

export default function History() {
  const [labs, setLabs] = useState([]);
  const [trends, setTrends] = useState({ markers: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

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
  const shown = showAll ? [...multi, ...single] : multi;
  const s = trends.summary;

  return (
    <div className="hist-page">
      <header className="hist-top">
        <Link to="/app" className="hist-logo" aria-label="آزمایار"><LabMateLogo /></Link>
        <Link to="/profile" className="hist-back">پروفایل</Link>
      </header>

      <main className="hist-main">
        <h1 className="hist-title">تاریخچهٔ آزمایش‌ها</h1>
        <p className="hist-lead">
          هر برگه‌ای که تفسیر می‌کنید این‌جا می‌ماند تا نوبتِ بعد ببینید نسبت به قبل چه تغییری کرده —
          و چه تغییری واقعاً «تغییر» است و چه چیزی فقط نوسانِ طبیعیِ بدن و خطای آزمایشگاه.
        </p>

        {error && <div className="hist-error" role="alert">{error}</div>}

        {loading ? (
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
                <div className="hist-grid">
                  {shown.map((m) => <MarkerCard key={m.key} m={m} />)}
                </div>
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
          این صفحه تغییرها را با «حدِ نوسانِ طبیعی» هر آزمایش می‌سنجد (تغییرپذیریِ زیستی — EFLM).
          تغییری که از این حد کمتر است، معمولاً نوسانِ بدن و خطای آزمایشگاه است. تفسیرِ بالینی و
          تصمیم دربارهٔ تکرارِ آزمایش با پزشکِ شماست.
        </p>
      </main>
    </div>
  );
}
