import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Nav, Footer } from "./Landing.jsx";
import { SRC } from "./sources.js";
import { useSeoHead } from "./useSeoHead.js";
import "./site.css";

// ============================================================
// پوستهٔ مشترکِ «صفحهٔ راهنما» — چیدمانِ صفحهٔ دستهٔ آزمایش و صفحهٔ تکِ آزمایش
// یکی است، پس یک پوسته هر دو را می‌سازد:
//
//   سربرگ (تاریخِ به‌روزرسانی، تیتر، «نام‌های دیگر»، نشانِ منبع)
//   → کادرِ تعریف → بخش‌ها (h2/h3/بند/فهرست/جدول) → نوارِ «انواع آزمایش»
//   → فهرستِ آزمایش‌های بیشتر → بخش‌های دوم → دکمهٔ ورودِ عدد
//   → منابعِ بیشتر → «منابع»
//
// کنارِ متن، جعبهٔ چسبانِ «فهرست مطالب» می‌ایستد و بخشی را که جلوی چشم است
// برجسته می‌کند. زیرِ عرضِ لازم، جای آن نوارِ بازشوی بالای متن می‌آید.
//
// ⚠️ استایل از site.css می‌آید، نه از یک رشتهٔ CSS داخلِ همین فایل. آن رشته
//    یک پالتِ موازیِ خودش داشت و محصول را دو دستگاهِ دیداری می‌کرد.
//
// ⚠️ نشانِ «Board Approved» الگو کپی نشد. آن نشان یعنی یک هیئتِ پزشکی متن را
//    تأیید کرده؛ ما هیئت نداریم و ساختنش جعلِ اعتبارِ پزشکی است. جای آن نشانِ
//    «بر پایهٔ منابع بالینی» نشسته که چیزی را می‌گوید که واقعاً درست است، و
//    خودِ آن منابع پایینِ همان صفحه فهرست شده‌اند.
//
// ⚠️ «تاریخِ آخرین به‌روزرسانی» تاریخِ واقعیِ نوشتنِ محتواست، نه تاریخِ
//    تصادفی برای شبیه شدن به الگو.
// ============================================================

/* ---------- ساختِ شناسه برای فهرستِ مطالب ---------- */
const slug = (prefix, i) => `${prefix}-${i}`;

// رنگِ بلوکِ کارت‌های «انواع آزمایش»، به ترتیبِ جایگاه: یکی پُر، بقیه کم‌رنگ.
const TONES = ["deep", "soft", "warm"];

/* ---------- یک بند/فهرست/جدول ---------- */
function Block({ b, id }) {
  return (
    <div className="site-art-block">
      {b.h2 && <h2 className="site-art-h2" id={id}>{b.h2}</h2>}
      {b.h3 && <h3 className="site-art-h3" id={id}>{b.h3}</h3>}
      {b.p?.map((t, i) => <p className="site-art-p" key={i}>{t}</p>)}
      {b.ul && (
        <ul className="site-art-ul">
          {b.ul.map((it, i) => (
            <li key={i}>
              {typeof it === "string" ? it : (<><b>{it.b}</b> {it.t}</>)}
            </li>
          ))}
        </ul>
      )}
      {b.table && (
        <div className="site-art-tw">
          <table className="site-art-table">
            <thead>
              <tr>{b.table.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {b.table.rows.map((r, i) => (
                <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {b.note && <p className="site-art-note">{b.note}</p>}
    </div>
  );
}

/* ---------- «فهرست مطالب»ِ بازشو (نسخهٔ باریک) ---------- */
function Toc({ items }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <div className="site-toc">
      <button
        type="button"
        className="site-toc-head"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>فهرست مطالب</span>
        <i className={`site-chev${open ? " is-open" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <ul className="site-toc-list">
          {items.map((it) => (
            <li key={it.id} className={it.lvl === 3 ? "is-sub" : ""}>
              <a href={`#${it.id}`}>{it.t}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// کدام بخش الان جلوی چشم است — برای برجسته‌کردنِ همان سطر در جعبهٔ کناری.
//
// ⚠️ IntersectionObserver در رندرِ سمتِ سرور و در محیطِ تست وجود ندارد؛ بدونِ
//    این نگهبان، همان صفحه‌ای که در مرورگر سالم است موقعِ SSR می‌ترکد.
function useActiveHeading(ids) {
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return undefined;

    // وقتی هیچ عنوانی داخلِ نوار نیست — بالای صفحه، وسطِ یک بخشِ بلند، یا
    // پایینِ آخرین بخش — از روی موقعیت تصمیم می‌گیریم: آخرین عنوانی که از
    // خطِ بالا گذشته. بدونِ این، صفحه با هیچ بخشِ فعالی باز می‌شد و برگشتن
    // به بالا هم «منابع» را روشن نگه می‌داشت.
    const LINE = 100;   // بُعد: خطِ مرجع، کمی زیرِ لبهٔ بالای پنجره
    const fromPositions = () => {
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= LINE) cur = id;
      }
      setActive(cur);
    };

    const seen = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
        const first = ids.find((id) => seen.get(id));
        if (first) setActive(first);
        else fromPositions();
      },
      // نوارِ باریکی زیرِ بالای صفحه: عنوانی «فعال» است که تازه از بالا رد شده.
      { rootMargin: "-72px 0px -68% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    fromPositions();     // حالتِ اولِ بارگذاری، پیش از اولین اسکرول
    return () => io.disconnect();
  }, [ids]);

  return active;
}

/* ---------- جعبهٔ چسبانِ کناری ---------- */
function SideToc({ items }) {
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const active = useActiveHeading(ids);
  if (!items.length) return null;
  return (
    <aside className="site-art-side" aria-label="فهرست مطالب">
      <nav className="site-art-side-box">
        <h2 className="site-art-side-h">فهرست مطالب</h2>
        <ul>
          {items.map((it) => (
            <li key={it.id} className={it.id === active ? "is-active" : ""}>
              <a href={`#${it.id}`} aria-current={it.id === active ? "true" : undefined}>
                <i aria-hidden="true" />
                {it.t}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

/* ---------- خودِ صفحه ---------- */
export default function Guide({ c }) {
  const loc = useLocation();
  const pathname = loc.pathname;

  const isCat = pathname.startsWith("/tests/");
  const isTest = pathname.startsWith("/test/");

  const seoTitle = c.seo?.title || (
    isCat
      ? `${c.title} — راهنمای جامع و فهرست آزمایش‌ها`
      : isTest
        ? `تفسیر آزمایش ${c.title} — رنج نرمال و علل خطا`
        : c.title
  );

  const rawDesc = c.seo?.description || c.card?.p?.[0] || (typeof c.about === "string" ? c.about : null);
  const seoDesc = rawDesc
    ? (typeof rawDesc === "string" ? rawDesc : "").replace(/\s+/g, " ").trim()
    : "راهنمای جامع، محدوده مرجع و تفسیر بالینی آزمایش پزشکی به زبان ساده در آزمایار اپ.";

  const jsonLd = useMemo(() => {
    if (isTest) {
      return {
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        "name": c.title,
        "url": `https://azmayarapp.ir${pathname}`,
        "description": seoDesc,
        "inLanguage": "fa-IR",
      };
    }
    if (isCat) {
      return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": c.title,
        "url": `https://azmayarapp.ir${pathname}`,
        "description": seoDesc,
        "inLanguage": "fa-IR",
      };
    }
    return null;
  }, [isTest, isCat, c.title, pathname, seoDesc]);

  useSeoHead({
    title: seoTitle,
    description: seoDesc,
    canonical: pathname,
    ogType: isTest || isCat ? "article" : "website",
    jsonLd,
  });

  // فهرستِ مطالب از خودِ بخش‌ها ساخته می‌شود، نه از یک فهرستِ دستیِ دوم —
  // وگرنه اولین بخشی که اضافه شود، از فهرست جا می‌ماند.
  const toc = useMemo(() => {
    const out = [];
    if (c.card) out.push({ id: "card", t: c.card.h, lvl: 2 });
    (c.blocks || []).forEach((b, i) => {
      if (b.h2) out.push({ id: slug("s", i), t: b.h2, lvl: 2 });
      else if (b.h3) out.push({ id: slug("s", i), t: b.h3, lvl: 3 });
    });
    if (c.types) out.push({ id: "types", t: c.types.h, lvl: 2 });
    if (c.more) out.push({ id: "more", t: c.more.h, lvl: 2 });
    (c.blocks2 || []).forEach((b, i) => {
      if (b.h2) out.push({ id: slug("t", i), t: b.h2, lvl: 2 });
      else if (b.h3) out.push({ id: slug("t", i), t: b.h3, lvl: 3 });
    });
    if (c.resources) out.push({ id: "res", t: "منابع بیشتر", lvl: 2 });
    out.push({ id: "src", t: "منابع", lvl: 2 });
    return out;
  }, [c]);

  // جعبهٔ کناری فقط سرفصل‌های اصلی را نشان می‌دهد. زیربخش‌ها آن‌قدر زیادند که
  // فهرست را به دیوارِ متن تبدیل می‌کنند؛ نوارِ بازشو همه را دارد.
  const mainToc = useMemo(() => toc.filter((t) => t.lvl === 2), [toc]);

  return (
    // site--lab-bg: همان زمینهٔ صفحهٔ تست‌ها (site.css) — صفحه‌های راهنمای هر آزمایش و هر دسته از همین‌جا رد می‌شوند
    <div className="site site--lab-bg" dir="rtl">
      <Nav />

      <nav className="site-wrap site-wrap--read" aria-label="مسیر راهنما" style={{ paddingTop: '1.25rem', fontSize: '0.875rem' }}>
        <Link to="/tests" style={{ color: 'var(--brand-ink)', textDecoration: 'none', fontWeight: 600 }}>راهنمای آزمایش‌ها</Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--line-soft)' }}>/</span>
        <span style={{ color: 'var(--ink)' }}>{c.title}</span>
      </nav>

      {/* ---------- سربرگ ---------- */}
      <header className="site-wrap site-wrap--read site-art-hero">
        <span className="site-art-updated">آخرین به‌روزرسانی: {c.updated}</span>
        <h1>{c.title}</h1>
        {c.aka?.length > 0 && (
          <p className="site-art-aka">
            <b>نام‌های دیگر:</b> {c.aka.join("، ")}
          </p>
        )}
        <span className="site-art-badge">
          <i aria-hidden="true">✓</i> بر پایهٔ منابع بالینی
        </span>
      </header>

      {/* دو ستون: متن، و جعبهٔ چسبانِ فهرست مطالب کنارش. */}
      <div className="site-art-shell">
        <div className="site-art-main">
          {/* ---------- کادرِ تعریف ---------- */}
          {c.card && (
            <section className="site-art-card" id="card">
              <h2 className="site-art-card-h">{c.card.h}</h2>
              {c.card.p.map((t, i) => <p className="site-art-p" key={i}>{t}</p>)}
            </section>
          )}

          <Toc items={toc} />

          {(c.blocks || []).map((b, i) => <Block b={b} id={slug("s", i)} key={i} />)}

          {/* ---------- انواع آزمایش ---------- */}
          {c.types && (
            <section className="site-art-band" id="types">
              <h2 className="site-h2">{c.types.h}</h2>
              {c.types.p?.map((t, i) => <p className="site-art-p" key={i}>{t}</p>)}
              <div className="site-art-types">
                {c.types.cards.map((k, i) => (
                  <article className="site-tile" key={k.t}>
                    {/* رنگِ بلوکِ کارت از جایگاهش می‌آید، نه از یک فیلد در
                        محتوا: در هر سه‌تایی فقط یکی پُررنگ است. وقتی رنگ در
                        داده نوشته می‌شد، هر صفحه‌ای که اضافه می‌شد می‌توانست
                        سه بلوکِ پُررنگ کنار هم بگذارد. */}
                    <span
                      className={`site-tile-art site-tile-art--${TONES[i % TONES.length]}`}
                      aria-hidden="true"
                    >
                      <b>{k.k1}</b>
                      {k.k2 && <span>{k.k2}</span>}
                    </span>
                    <h3>{k.t}</h3>
                    {k.d && <p>{k.d}</p>}
                    {k.to ? (
                      <Link className="btn btn--secondary btn--pill" to={k.to}>بیشتر بدانید</Link>
                    ) : (
                      <span className="site-art-type-off">هنوز پوشش داده نمی‌شود</span>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ---------- فهرستِ دوستونیِ آزمایش‌های بیشتر ---------- */}
          {c.more && (
            <section className="site-art-more" id="more">
              <h2 className="site-h2">{c.more.h}</h2>
              <ul className="site-art-more-list">
                {c.more.items.map((it) => (
                  <li key={it.n}>
                    {it.to
                      ? <Link to={it.to}>{it.n}</Link>
                      : <span title={it.hint}>{it.n}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(c.blocks2 || []).map((b, i) => <Block b={b} id={slug("t", i)} key={i} />)}

          {/* ---------- دکمهٔ ورودِ عدد ---------- */}
          {c.cta && (
            <div className="site-art-cta">
              <p>{c.cta.t}</p>
              <Link className="btn btn--primary btn--pill" to={c.cta.to}>{c.cta.label}</Link>
            </div>
          )}

          {/* ---------- منابعِ بیشتر ---------- */}
          {c.resources?.length > 0 && (
            <section className="site-art-res" id="res">
              <h2 className="site-h2">منابع بیشتر</h2>
              {/* ⚠️ این بخش «جای مطالعهٔ بیشتر» است و مبنای نتیجهٔ موتور نیست —
                  همان تفکیکی که در ResultView بین منابعِ راهنما و MedlinePlus
                  برقرار است. مبنای اعداد، بخشِ «منابع» پایین‌تر است. */}
              <p className="site-art-res-note">
                این‌ها برای مطالعهٔ بیشترند و مبنای نتیجهٔ موتور نیستند؛ مبنای اعداد در بخش
                «منابع» پایین همین صفحه آمده است.
              </p>
              <div className="site-art-res-grid">
                {c.resources.map((r) => (
                  <article className="site-art-res-card" key={r.t}>
                    <h3>{r.t}</h3>
                    <p>{r.org}</p>
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      بیشتر بدانید ←
                    </a>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ---------- منابع ---------- */}
          <section className="site-art-src" id="src">
            <h2 className="site-h2">منابع</h2>
            <ol className="site-art-src-list">
              {(c.sources || []).map((id) => {
                const s = SRC[id];
                if (!s) return null;
                return (
                  <li key={id}>
                    <b>{s.org}</b> — {s.fa} ({s.year}).{" "}
                    {s.en && <i>{s.en}. </i>}
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <p className="site-art-disclaimer">
            این صفحه آموزشی است و جای معاینه، تشخیص یا نسخهٔ پزشک را نمی‌گیرد. تصمیم دربارهٔ
            درمان یا تکرار آزمایش با پزشک شماست.
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '1.5rem' }}>
            <Link to="/app" className="site-art-back" style={{ fontWeight: 600, color: 'var(--brand-ink)' }}>← ورود به برنامهٔ تحلیل نتایج</Link>
            <Link to="/tests" className="site-art-back">همهٔ آزمایش‌ها →</Link>
          </div>
        </div>

        <SideToc items={mainToc} />
      </div>

      <Footer />
    </div>
  );
}
