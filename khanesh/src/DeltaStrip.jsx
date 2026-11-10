// ============================================================
// «نسبت به نوبتِ قبل» — نوارِ مقایسه در صفحهٔ نتیجه (P120)
//
// چرا این‌جا و نه فقط در صفحهٔ تاریخچه: بیمار بلافاصله بعد از دیدنِ برگه
// می‌پرسد «از دفعهٔ قبل بهتر شد یا نه؟». جواب باید کنارِ همان نتیجه باشد،
// نه پشتِ یک کلیکِ دیگر.
//
// ⚠️ این مؤلفه هیچ محاسبه‌ای نمی‌کند: عدد، درصد، آستانهٔ RCV و جملهٔ فارسی
//    همه از `/api/history/trends` می‌آیند (rules/history.js). اگر تاریخچه‌ای
//    نبود یا خطا داد، هیچ چیز رندر نمی‌شود — نوارِ خالی یا صفرِ ساختگی نه.
// ============================================================

import { useEffect, useState } from 'react';
import { apiJson } from './deviceId.js';
import { toFaDigits } from './digits.js';
import './DeltaStrip.css';

const fa = (n) => (n == null ? '—' : toFaDigits(String(n)));

function fmt(v, unit) {
  if (v == null) return '—';
  const n = Number.isInteger(v) ? v : +Number(v).toFixed(2);
  return `${toFaDigits(String(n))}${unit ? ' ' + unit : ''}`;
}

export default function DeltaStrip({ tests, hidden = false, until = null }) {
  const [rows, setRows] = useState([]);
  const keys = (tests || []).map((t) => t.key).filter(Boolean);

  useEffect(() => {
    if (hidden || !keys.length) return undefined;
    let alive = true;
    apiJson(`/api/history/trends?keys=${encodeURIComponent(keys.join(','))}${until ? `&until=${encodeURIComponent(until)}` : ''}`)
      .then((d) => {
        if (!alive) return;
        // فقط مارکرهایی که واقعاً نوبتِ قبلی دارند و مقایسه‌شان معنا دارد.
        setRows((d.markers || []).filter((m) => m.previous && m.count > 1));
      })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(','), hidden, until]);

  if (hidden || !rows.length) return null;

  const changed = rows.filter((m) => m.significant === true);
  const lead = changed.length
    ? `${fa(changed.length)} آزمایش از ${fa(rows.length)} تغییرِ فراتر از نوسانِ طبیعی داشته است.`
    : `هیچ‌کدام از ${fa(rows.length)} آزمایشِ تکراری تغییرِ فراتر از نوسانِ طبیعی نداشته است.`;

  return (
    <section className="card delta-strip" aria-labelledby="delta-title">
      <div className="delta-head">
        <h2 className="block-title" id="delta-title">نسبت به نوبتِ قبل</h2>
      </div>
      <p className="delta-lead">{lead}</p>
      <ul className="delta-list">
        {rows.map((m) => (
          <li key={m.key} className={`delta-row${m.significant ? ' is-sig' : ''}`}>
            <span className="delta-name">{m.label}</span>
            <span className="delta-move">
              <span className="delta-prev">{fmt(m.previous.value, m.unit)}</span>
              <span className="delta-arrow" aria-hidden="true">←</span>
              <span className="delta-now">{fmt(m.latest.value, m.unit)}</span>
            </span>
            <span className={`delta-chip${m.significant ? ' is-sig' : ''}`}>
              {m.trend5?.direction && m.count >= 3 && (
                <span className={`hist-trend-badge is-${m.trend5.direction}`} style={{ fontSize: '0.7rem', padding: '2px 6px', marginInlineEnd: '6px' }}>
                  {m.trend5.directionFa}
                </span>
              )}
              {m.reason === 'unit_mismatch'
                ? 'بی‌قابلیتِ مقایسه'
                : m.rcvPctRef != null
                  ? `${fa(Math.abs(m.pct ?? 0).toFixed(0))}٪ · حدِ نوسان ${fa(Math.round(m.rcvPctRef))}٪`
                  : `${fa(Math.abs(m.pct ?? 0).toFixed(0))}٪`}
            </span>
          </li>
        ))}
      </ul>
      {changed.length > 0 && (
        <details className="delta-details">
          <summary>توضیحِ هر تغییر</summary>
          {changed.map((m) => (
            <p key={m.key} className="delta-note">{m.fa}</p>
          ))}
        </details>
      )}
      <p className="delta-fine">
        «حدِ نوسان» یعنی تغییری کمتر از آن، معمولاً نوسانِ طبیعیِ بدن و خطای آزمایشگاه است، نه بهتر یا بدتر شدن
        (تغییرپذیریِ زیستی — EFLM).
      </p>
    </section>
  );
}
