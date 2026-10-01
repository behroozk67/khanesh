import { useEffect } from "react";
import { FAQ_ITEMS } from "./landingFaqData.jsx";

const FA_DIGITS = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

// دو نوارِ مقایسه‌ای زیرِ مقدمه: هر نوار پنج خانه دارد و خانه‌های پرشده یعنی آن جنبه در خروجی هست.
function CompareBars({ title, rows }) {
  const total = 5;
  return (
    <section className="fq-bars" aria-label={title}>
      <h3>{title}</h3>
      {rows.map((r, i) => (
        <div className={i === rows.length - 1 ? "fq-bar is-ours" : "fq-bar"} key={r.label}>
          <div className="fq-bar-head">
            <b>{r.label}</b>
            <span>{FA_DIGITS(r.filled)} از {FA_DIGITS(total)}</span>
          </div>
          <div className="fq-bar-track" role="img" aria-label={`${FA_DIGITS(r.filled)} از ${FA_DIGITS(total)}`}>
            {Array.from({ length: total }, (_, k) => <i key={k} className={k < r.filled ? "on" : undefined} />)}
          </div>
          <p>{r.note}</p>
        </div>
      ))}
    </section>
  );
}

// ورقِ تمام‌صفحهٔ پرسش‌های هیرو؛ محتوا در landingFaqData.jsx است.
export function FaqModal({ index, onSelect, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const item = FAQ_ITEMS[index];
  return (
    <div className="fq" dir="ltr">
      <div className="fq-scrim" onClick={onClose} aria-hidden="true" />

      <aside className="fq-rail" dir="rtl" aria-label="پرسش‌های متداول">
        <p>پرسش‌های متداول</p>
        {FAQ_ITEMS.map((f, i) => (
          <button
            key={f.q}
            type="button"
            className={i === index ? "is-on" : undefined}
            aria-current={i === index ? "true" : undefined}
            onClick={() => onSelect(i)}
          >
            {f.q}
          </button>
        ))}
      </aside>

      <div className="fq-card" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="fq-title">
        <div className="fq-media">
          <img src={item.img} alt="" width="1600" height="900" decoding="async" />
          <button type="button" className="fq-x" aria-label="بستن" onClick={onClose} autoFocus>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="fq-body">
          <h2 id="fq-title">{item.title}</h2>
          <p className="fq-lead">{item.lead}</p>
          {item.bars && <CompareBars {...item.bars} />}
          {item.body}
        </div>
      </div>
    </div>
  );
}
