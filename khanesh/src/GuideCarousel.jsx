import { useCallback, useEffect, useRef, useState } from "react";
import { toFaDigits } from "./digits.js";

// ============================================================
// نوارِ لغزانِ کارت‌ها — «راهنماهای منتخب» و «آزمایش‌های پرکاربرد» در /tests.
//
// قبلاً هر کدام فقط دو کارتِ ثابت داشت (تیروئید و آلرژی؛ CMP و کلامیدیا) و
// بقیهٔ راهنماها از آنجا دیده نمی‌شد. حالا کارت‌ها روی یک ریلِ افقی‌اند:
//   • روی موبایل با انگشت کشیده می‌شوند (scroll-snapِ بومی، بدونِ کتابخانه)؛
//   • دکمه‌های قبلی/بعدی و نقطه‌ها برای ماوس و صفحه‌کلید؛
//   • هر چند ثانیه خودش جلو می‌رود — فقط وقتی دیده می‌شود، ماوس/فوکوس رویش
//     نیست و کاربر «کاهشِ حرکت» را نخواسته است.
//
// ⚠️ جابه‌جایی با scrollBy و فاصلهٔ فیزیکیِ لبه‌ها، نه scrollIntoView:
//    scrollIntoView صفحه را هم عمودی می‌کشد و پخشِ خودکار، کاربری را که
//    پایینِ صفحه است به بالا می‌پراند. scrollLeft هم در RTL بینِ مرورگرها
//    یکسان نیست؛ فاصلهٔ getBoundingClientRect در هر دو جهت درست است.
// ============================================================

const AUTO_MS = 6000;

export default function GuideCarousel({ label, items, renderItem, getKey }) {
  const track = useRef(null);
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);   // ماوس یا فوکوس روی نوار
  const [seen, setSeen] = useState(false);   // نوار در دیدِ کاربر است

  const reduce = typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // چند کارت هم‌زمان دیده می‌شود (۱ روی موبایل، ۲ یا ۳ روی صفحهٔ بزرگ)
  const perView = useCallback(() => {
    const el = track.current;
    const first = el?.children[0];
    if (!el || !first) return 1;
    return Math.max(1, Math.round(el.clientWidth / first.getBoundingClientRect().width));
  }, []);

  const go = useCallback((i) => {
    const el = track.current;
    if (!el) return;
    const n = items.length;
    const j = ((i % n) + n) % n;
    const child = el.children[j];
    if (!child) return;
    // RTL: شروعِ ریل لبهٔ راست است؛ لبهٔ راستِ کارت را بر لبهٔ راستِ ریل می‌نشانیم.
    const dx = child.getBoundingClientRect().right - el.getBoundingClientRect().right;
    el.scrollBy({ left: dx, behavior: reduce ? "auto" : "smooth" });
  }, [items.length, reduce]);

  // کارتِ فعال = کارتی که لبهٔ راستش به لبهٔ راستِ ریل نزدیک‌تر است.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect().right;
        let best = 0, bestD = Infinity;
        [...el.children].forEach((c, i) => {
          const d = Math.abs(c.getBoundingClientRect().right - r);
          if (d < bestD) { bestD = d; best = i; }
        });
        setActive(best);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  // پخشِ خودکار فقط وقتی نوار دیده می‌شود.
  useEffect(() => {
    const el = track.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || hold || !seen || items.length < 2) return;
    const t = setInterval(() => {
      // آخرین موقعیتِ ممکن که برسد، به اول برمی‌گردد.
      const next = active + perView() >= items.length ? 0 : active + 1;
      go(next);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [active, hold, seen, reduce, items.length, go, perView]);

  const step = (d) => {
    const pv = perView();
    const last = Math.max(0, items.length - pv);
    let next = active + d;
    if (next > last) next = 0;
    if (next < 0) next = last;
    go(next);
  };

  return (
    <div
      className="gc"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHold(false); }}
    >
      <div className="gc-track" ref={track}>
        {items.map((it, i) => (
          <div
            className="gc-slide"
            key={getKey(it)}
            role="group"
            aria-roledescription="slide"
            aria-label={`${toFaDigits(i + 1)} از ${toFaDigits(items.length)}`}
          >
            {renderItem(it, i)}
          </div>
        ))}
      </div>

      <div className="gc-ctrl">
        <button type="button" className="gc-btn" aria-label="قبلی" onClick={() => step(-1)}>
          {/* RTL: «قبلی» به سمتِ راست اشاره می‌کند */}
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="gc-dots">
          {items.map((it, i) => (
            <button
              type="button"
              key={getKey(it)}
              className={`gc-dot${i === active ? " is-on" : ""}`}
              aria-label={`رفتن به کارتِ ${toFaDigits(i + 1)}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
        {/* روی موبایل نقطه‌ها جا نمی‌شوند؛ جایشان شمارنده (CSS یکی را نشان می‌دهد) */}
        <span className="gc-count" aria-live="polite">
          {toFaDigits(active + 1)} از {toFaDigits(items.length)}
        </span>
        <button type="button" className="gc-btn" aria-label="بعدی" onClick={() => step(1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
