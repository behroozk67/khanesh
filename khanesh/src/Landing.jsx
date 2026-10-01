import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { searchHref, searchTests } from "./testSearch.js";
import { BRAND_FA } from "./Logo.jsx";
import { LabMateLogo } from "./LabMateLogo.jsx";
import { FAQ_ITEMS } from "./landingFaqData.jsx";
import { FaqModal } from "./LandingFaq.jsx";
import "./site.css";

// ============================================================
// LabMate — صفحهٔ فرود
//
// ⚠️ پالتِ محلیِ این صفحه حذف شد. تا امروز اینجا (و در Tests.jsx و Guide.jsx)
//    یک دستگاهِ دیداریِ دومِ کامل زندگی می‌کرد — سرمه‌ای/مرجانی/یاسی/صورتی از
//    الگوی Testing.com — که با سبزآبیِ خودِ ابزار هیچ نسبتی نداشت. یعنی رفتن
//    از «/» به «/app» شبیه رفتن به یک محصولِ دیگر بود. حالا هر سه صفحه از
//    site.css می‌خوانند و site.css فقط از توکن‌های index.css.
//
// ⚠️ نامِ برند از Logo.jsx خوانده می‌شود، نه از یک ثابتِ محلی — آن فایل تنها
//    منبعِ نامِ برند است.
//
// ⚠️ سه جای الگو عمداً «مو‌به‌مو» کپی نشد، چون کپیِ دقیقشان یعنی جعل:
//
//    ۱. «Medical Review Board» — الگو نُه پزشک با عکس و مدرک (MD، PhD،
//       MT(ASCP)) نشان می‌دهد. LabMate هیئتِ بازبینیِ پزشکی ندارد. ساختنِ
//       نُه نامِ پزشکِ خیالی روی یک محصولِ سلامت، جعلِ مدرکِ پزشکی است.
//       همان چیدمانِ دوستونی نگه داشته شد، اما محتوایش چیزی است که واقعاً
//       پشتِ موتور ایستاده: منابع و استانداردهای بالینیِ نام‌برده.
//
//    ۲. «Partners» — ردیفِ لوگوی AACC/ASCLS/CLMA/COLA یعنی این سازمان‌ها
//       شریکِ محصول‌اند. هیچ‌کدام شریکِ ما نیستند؛ ما فقط به اسنادشان ارجاع
//       می‌دهیم. عنوان به «استانداردهای مرجع» تغییر کرد و به‌جای لوگو،
//       نامِ متنی نشسته — ارجاع، نه ادعای شراکت یا تأیید.
//
//    ۳. «Latest News» — خبرِ ساختگی با تاریخ، جعلِ خبر است. این بخش به
//       «آخرین به‌روزرسانی‌ها» تبدیل شد با تغییرِ واقعیِ موتور و تاریخِ واقعی.
// ============================================================

const BRAND = BRAND_FA;

/* ------------------------------------------------------------------ */

export default function Landing() {
  return (
    <div className="site" dir="rtl">
      <Hero />
      <HowItWorks />
      <FeaturedGuides />
      <ReviewBasis />
      <Resources />
      <Updates />
      <Footer />
    </div>
  );
}

// Nav/Footer از این فایل بیرون داده می‌شوند تا «راهنمای آزمایش‌ها» و صفحه‌های
// مقاله همان سرصفحه و پاصفحه را داشته باشند و دو نسخهٔ واگرا از یک نوارِ
// ناوبری به وجود نیاید.
// پیوندهای نوارِ کپسولیِ صفحهٔ محتوا. پیش‌فرضِ PillNav همین است؛ لندینگ
// پیوندهای لنگریِ خودش را صریحاً می‌فرستد. صادر نمی‌شود تا صادراتِ فایل
// فقط کامپوننت بماند (هشدارِ fast-refresh در oxlint).
const NAV_LINKS = [
  { to: "/tests", label: "راهنمای آزمایش‌ها" },
  { to: "/tests", label: "منابع" },
  { to: "/landing", label: "استانداردها" },
];

// سرصفحه: نشان در ابتدای ردیف، بعد لینک‌ها، بعد جست‌وجو، و دکمه در انتها.
// صفحه RTL است، پس «ابتدای ردیف» سمتِ راست است و دکمه سمتِ چپ می‌افتد.
//
// زیر ۹۸۰ پیکسل همین سه بخش داخلِ منوی کشویی می‌روند و فقط نشان و دکمهٔ
// همبرگری می‌مانند.
// ⚠️ جست‌وجویی که هیچ‌جا نمی‌رود یک کنترلِ مرده است — و یکی که حینِ تایپ
//    هیچ نشان نمی‌دهد همین‌طور: قبلاً اینجا فقط نامِ لاتینِ REF می‌گشت و
//    عبارتِ فارسیِ ناموجود بی‌صدا به «/tests» برمی‌گشت، یعنی از دیدِ کاربر
//    «جست‌وجو کار نمی‌کند». حالا هم submit و هم پیشنهادهای زنده از ایندکسِ
//    مشترکِ testSearch.js می‌خوانند: نامِ فارسی/لاتین، توضیح و اسلاگ، با
//    یکسان‌سازیِ «ي/ك» و ارقامِ فارسی. مقصد را همان ماژول می‌دهد (searchHref)
//    تا Enter و کلیک روی پیشنهاد به جایِ مختلف نروند: آزمایشِ فرمی → خانهٔ
//    ورودِ دستیِ همان آزمایش در برنامه، بقیه → صفحهٔ راهنمایشان.
//
//    منطق در یک جا می‌نشیند چون حالا دو نوارِ سرصفحه (کپسولی و معمولی) هر دو
//    سرچ دارند؛ رفتارِ دوگانه یعنی دو نسخهٔ واگرا از یک جستجو.
function useTestSearch() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  function submit(e) {
    e.preventDefault();
    const hit = searchTests(q, 1)[0];
    // بی‌نتیجه: به فهرستِ کامل. پیامِ «پیدا نشد» را خودِ پیشنهادهای زنده
    // حینِ تایپ نشان می‌دهند، پس اینجا سکوتِ بی‌بازخورد معنا ندارد.
    navigate(hit ? searchHref(hit) : "/tests");
  }

  return { q, setQ, submit };
}

// خانهٔ جستجو + پیشنهادهای زنده. dir="rtl" روی خودِ فرم عمدی است: نوارِ
// کپسولی dir="ltr" دارد (چیدمانِ فیزیکیِ طرحِ مرجع)، و بدونِ این، آیکن به
// سمتِ چپِ ورودی می‌رفت و متنِ فارسی چپ‌چین می‌شد — یعنی همان خانه در دو
// صفحه دو شکلِ مختلف.
function SearchForm({ id, q, setQ, onSubmit }) {
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => searchTests(q, 8), [q]);
  const typed = q.trim().length >= 2;   // همان دستِ کمِ testSearch (MIN_LEN)
  const show = open && typed;

  return (
    <form
      className="site-search"
      role="search"
      dir="rtl"
      onSubmit={onSubmit}
      // بیرون‌رفتنِ فوکوس از خانه (کلیک روی نتیجه یا جایِ خالی) پیشنهاد را
      // می‌بندد؛ جلوی mousedown تا پیش از کلیک بسته نشود.
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
      onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
    >
      <label className="sr-only" htmlFor={id}>جست‌وجوی نام آزمایش</label>
      {/* آیکن داخلِ دکمهٔ submit است: کلیکِ روی ذره‌بین باید جست‌وجو کند،
          نه اینکه بی‌اثر باشد (svg با pointer-events: none کلیک را نمی‌گرفت). */}
      <button className="site-search-go" type="submit" aria-label="جست‌وجو">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16.5 16.5 L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="جست‌وجوی آزمایش"
        autoComplete="off"
        enterKeyHint="search"
        aria-expanded={show}
        aria-controls={`${id}-pop`}
      />
      {show && (
        <ul className="site-search-pop" id={`${id}-pop`} aria-live="polite">
          {hits.length ? (
            hits.map((it) => (
              <li key={it.n}>
                {/* mousedown روی خودِ پیشنهاد جلوی blurِ زودهنگام را می‌گیرد؛
                    onMouseDown لازم است چون preventDefault روی لینک، کلیکِ
                    معمولی/میانی را هم نادیده نمی‌گیرد — فقط فوکوس را نگه می‌دارد. */}
                <Link to={searchHref(it)} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(false)}>
                  <b>{it.n}</b>
                  {it.d && <span>{it.d}</span>}
                </Link>
              </li>
            ))
          ) : (
            <li className="site-search-note">
              آزمایشی با این نام پیدا نشد. نامِ لاتین یا بخشی از آن را امتحان کنید.
            </li>
          )}
        </ul>
      )}
    </form>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const { q, setQ, submit } = useTestSearch();

  // بستنِ منوی کشویی پس از جستجو بخشِ همین نوار است، نه منطقِ جستجو.
  const onSearch = (e) => { submit(e); setOpen(false); };
  const search = (id) => <SearchForm id={id} q={q} setQ={setQ} onSubmit={onSearch} />;

  return (
    <nav className="site-nav">
      <div className="site-nav-in">
        {/* ⚠️ این عدد باید با ارتفاعِ .site-brand svg در site.css یکی باشد.
            CSS برنده است (خصیصهٔ height روی SVG فقط راهنمای ارائه است)، پس
            اگر این دو از هم جدا بیفتند خطا نمی‌دهند — فقط اندازهٔ رزروشدهٔ
            پیش از رندر غلط می‌شود و نوار یک تکان می‌خورد.
            جفتِ سوم هم هست: --nav-h در site.css از همین ارتفاع ساخته می‌شود. */}
        <Link to="/landing" className="site-brand" aria-label={BRAND}>
          <LabMateLogo height={86} />
        </Link>

        <div className="site-links">
          {NAV_LINKS.map((l) => (
            <Link key={l.label} to={l.to}>{l.label}</Link>
          ))}
        </div>

        {search("site-nav-q")}

        <Link to="/app" className="btn btn--primary btn--pill site-nav-cta">تحلیل نتایج من</Link>

        <button
          type="button"
          className="site-burger"
          aria-expanded={open}
          aria-label="منو"
          onClick={() => setOpen(!open)}
        >
          <span /><span /><span />
        </button>
      </div>

      {open && (
        <div className="site-menu">
          {search("site-menu-q")}
          {NAV_LINKS.map((l) => (
            <Link key={l.label} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <Link to="/app" className="btn btn--primary btn--pill" onClick={() => setOpen(false)}>
            تحلیل نتایج من
          </Link>
        </div>
      )}
    </nav>
  );
}

// هیروی تمام‌عرض: عکس پس‌زمینه است و متن روی آن می‌نشیند. نوارِ کپسولیِ بالا فقط
// در همین صفحه است؛ Nav صادرشده در بالای فایل سرصفحهٔ بقیهٔ صفحه‌هاست.
// ⚠️ تصویر تولیدِ مدل است و رابطِ روی تبلتش ساختگی است (جزئیات در public/lab/CREDITS.md).
const HERO_ALT = "مردی روی مبل نشسته و تبلتی در دست دارد که نمایی از شاخص‌های آزمایش را نشان می‌دهد";

const HERO_LINKS = [
  { to: "/tests", label: "راهنمای آزمایش‌ها" },
  { href: "#faq", label: "پرسش‌های متداول" },
  { href: "#basis", label: "منابع و استانداردها" },
];

// منوی تمام‌صفحهٔ کنارِ دکمهٔ نُه‌نقطه: ورقِ سفیدِ گرد، عنوان، دکمه، پیوندهای درشت و دو ستونِ کوچک.
// ⚠️ فقط به صفحه‌هایی لینک می‌دهد که وجود دارند؛ چیزی از طرحِ مرجع (وبلاگ، فرصت‌های شغلی…) نیامده.
const MENU_MAIN = [
  { to: "/tests", label: "راهنمای آزمایش‌ها" },
  { href: "#how", label: "چطور کار می‌کند" },
  { href: "#faq", label: "پرسش‌های متداول" },
  { href: "#basis", label: "منابع و استانداردها" },
];
const MENU_COLS = [
  {
    h: "بیشتر بدانید",
    items: [
      { to: "/how-to-capture", label: "عکس‌برداری از برگه" },
      { to: "/reference-ranges", label: "محدودهٔ مرجع" },
      { to: "/units-guide", label: "واحدهای آزمایش" },
    ],
  },
  {
    h: "دسته‌های آزمایش",
    items: [
      { to: "/tests/thyroid", label: "تیروئید" },
      { to: "/tests/cardiac", label: "قلب و چربی خون" },
      { to: "/tests/hormone", label: "هورمون‌ها" },
    ],
  },
];

function DotsIcon({ open }) {
  // بسته: نُه نقطهٔ پُر. باز: الگوی شطرنجی با نقطه‌های کم‌رنگ، مثل طرحِ مرجع.
  return (
    <span className={open ? "lh-dots is-open" : "lh-dots"} aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => <i key={i} />)}
    </span>
  );
}

// نوارِ کپسولی — سرصفحهٔ لندینگ و صفحه‌هایی که همان چیدمان را می‌خواهند
// (الان /tests). ⚠️ نسخهٔ دومِ این نوار نسازید: هر تغییرِ دیداری باید هر دو
// صفحه را یک‌جا عوض کند؛ تفاوتِ دو صفحه فقط در همین چهار پراپ است.
//   links      → پیوندهای داخلِ کپسول (پیش‌فرض: پیوندهای نوارِ معمولی؛ لندینگ
//                لنگرهای داخلیِ خودش را می‌فرستد)
//   sheetMain  → پیوندهای منوی نُه‌نقطه (پیش‌فرض: همان پیوندهای داخلِ کپسول)
//   withSearch → خانهٔ جستجو داخلِ کپسول و داخلِ منو (زیرِ ۹۸۰ فقط داخلِ منو)
//   page       → روی صفحهٔ محتوایی؛ چند قاعدهٔ بُعدیِ فقط-آن-صفحه را روشن می‌کند
export function PillNav({ links = NAV_LINKS, sheetMain = links, withSearch = false, page = false }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { q, setQ, submit } = useTestSearch();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);
  // جستجو هم منوی نُه‌نقطه را می‌بندد، هم به مقصد می‌رود (رفتارِ نوارِ معمولی).
  const onSearch = (e) => { submit(e); close(); };
  const item = (l, cls) =>
    l.to ? (
      <Link key={l.label} to={l.to} className={cls} onClick={close}>{l.label}</Link>
    ) : (
      <a key={l.label} href={l.href} className={cls} onClick={close}>{l.label}</a>
    );

  // dir="ltr" روی خودِ nav: چیدمانِ فیزیکیِ طرحِ مرجع (نُه‌نقطه سمتِ چپ، دکمهٔ
  // اصلی سمتِ راست) مستقل از زبانِ صفحه است؛ متنِ داخلِ خودشان rtl دارند.
  return (
    <nav
      dir="ltr"
      className={
        [scrolled ? "lh-nav" : "lh-nav lh-nav--top", page ? "lh-nav--page" : ""]
          .filter(Boolean)
          .join(" ")
      }
      aria-label="ناوبری اصلی"
    >
      <button
        type="button"
        className="lh-grid"
        aria-label="باز کردن منو"
        aria-expanded={open}
        aria-controls="lh-menu"
        onClick={() => setOpen(true)}
      >
        <DotsIcon open={false} />
      </button>

      <div className="lh-pill">
        {/* ستونِ اول: لینک‌ها و — فقط وقتی withSearch — خانهٔ جستجو.
            لینک‌ها همان `direction: rtl` قبلی را دارند؛ ظرفِ جدید فقط
            جایِ دو فرزند در یک ستونِ grid است. */}
        <div className="lh-pill-start">
          <div className="lh-pill-links">{links.map((l) => item(l))}</div>
          {withSearch && <SearchForm id="pill-q" q={q} setQ={setQ} onSubmit={onSearch} />}
        </div>
        <Link to="/landing" className="lh-pill-brand" aria-label={BRAND}>
          {scrolled ? <span className="lh-pill-name">{BRAND}</span> : <LabMateLogo height={83} variant="dark" />}
        </Link>
        <Link to="/app" className="lh-pill-cta">
          <span>تحلیل نتایج من</span>
          {/* پیکان به چپ = «جلو» در متنِ راست‌به‌چپ؛ خطیِ نازک، داخلِ دایرهٔ روشن */}
          <i className="lh-pill-cta-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                 strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </i>
        </Link>
      </div>

      {open && (
        <>
          <div className="lh-scrim" onClick={close} aria-hidden="true" />
          <div id="lh-menu" className="lh-sheet" role="dialog" aria-modal="true" aria-label="منو" dir="rtl">
            <div className="lh-sheet-head">
              <h2>منو</h2>
              <Link to="/app" className="lh-sheet-cta" onClick={close}>تحلیل نتایج من</Link>
              <button type="button" className="lh-sheet-x" aria-label="بستن منو" onClick={close} autoFocus>
                <DotsIcon open />
              </button>
            </div>
            {/* زیرِ ۹۸۰ خانهٔ جستجوی داخلِ کپسول پنهان است، پس تنها راهِ
                دیدنش همین‌جاست — همان الگوی نوارِ معمولی (site-menu). */}
            {withSearch && (
              <div className="lh-sheet-search">
                <SearchForm id="pill-menu-q" q={q} setQ={setQ} onSubmit={onSearch} />
              </div>
            )}
            <p className="lh-sheet-h">کاوش</p>
            <div className="lh-sheet-main">{sheetMain.map((l) => item(l))}</div>
            <div className="lh-sheet-cols">
              {MENU_COLS.map((c) => (
                <div key={c.h}>
                  <p className="lh-sheet-h">{c.h}</p>
                  {c.items.map((l) => item(l))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

function Hero() {
  const [faq, setFaq] = useState(null);
  return (
    <header className="lh" dir="ltr">
      <img className="lh-bg" src="/lab/labmate_hero_mockup.webp" alt={HERO_ALT}
           width="2752" height="1929" fetchpriority="high" decoding="async" />
      <PillNav links={HERO_LINKS} sheetMain={MENU_MAIN} />

      <div className="lh-body">
        <div className="lh-copy" dir="rtl">
          <h1>فهمِ آزمایش، با زبانی روشن و منبعی معتبر</h1>
          <p className="lh-sub">
            برگهٔ آزمایش را عکس بگیرید یا عددها را وارد کنید؛ شرحی روشن و منبع‌دار دریافت می‌کنید.
          </p>

          <div className="lh-faq" id="faq">
            {/* فقط سه پرسشِ اول روی هیرو؛ بقیه در ستونِ کناریِ ورقِ پرسش‌ها هستند (اندیس‌ها یکی‌اند). */}
            {FAQ_ITEMS.slice(0, 3).map((f, i) => (
              <button key={f.q} type="button" className="lh-acc lh-acc-btn"
                      aria-haspopup="dialog" onClick={() => setFaq(i)}>
                <span>{f.q}</span><i aria-hidden="true" />
              </button>
            ))}
          </div>

          <p className="lh-fine">
            {BRAND} جایگزین پزشک نیست و بیماری را تشخیص نمی‌دهد. محدودیت‌ها و منابع را{" "}
            <a href="#basis">اینجا</a> بخوانید.
          </p>
        </div>

      </div>

      {faq !== null && <FaqModal index={faq} onSelect={setFaq} onClose={() => setFaq(null)} />}
    </header>
  );
}

// چهار گامِ کار: عکس + کارتِ شیشه‌ایِ شناور + عنوان و توضیح زیرِ عکس.
// ⚠️ کارت‌های شناور نمونهٔ توضیحی‌اند، نه نتیجهٔ واقعی؛ زیرِ شبکه هم همین نوشته شده.
// عکس‌ها تزئینی‌اند (alt خالی): معنا را عنوان و کارتِ شیشه‌ای می‌رساند.
function HowItWorks() {
  const steps = [
    {
      img: "/lab/res-1.webp",
      t: "عکس یا ورودِ عددها",
      d: "از برگه عکس بگیرید (تا پنج عکس) یا مقدارها را خودتان تایپ کنید.",
      glass: (
        <>
          <div className="hw-glass-t"><span>برگهٔ آزمایش بارگذاری شد</span><b aria-hidden="true">✓</b></div>
          <div className="hw-glass-s">۳ صفحه · عددها خوانده شد</div>
        </>
      ),
    },
    {
      img: "/lab/lab_modern_tech.webp",
      t: "سنجش با منابعِ معتبر",
      d: "هر عدد با محدودهٔ مرجعِ متناسب با سن و جنسِ شما سنجیده می‌شود و نامِ راهنما کنارِ یافته می‌آید.",
      glass: (
        <>
          <div className="hw-glass-t"><span>هموگلوبین ۱۱٫۲</span><em className="hw-chip hw-chip--warn">پایین‌تر از محدوده</em></div>
          <div className="hw-glass-s">محدودهٔ مرجع ۱۲ تا ۱۶ · منبع: Henry's</div>
        </>
      ),
    },
    {
      img: "/lab/labmate_hero_mockup.webp", pos: "38% center",
      t: "شرحی روشن",
      d: "عددها کنارِ هم دیده می‌شوند: هموگلوبینِ پایین در کنارِ MCV و فریتینِ پایین معنایی دیگر دارد.",
      glass: (
        <>
          <div className="hw-glass-t"><span>الگوی کمبودِ آهن مطرح است</span></div>
          <div className="hw-glass-s">هموگلوبین، MCV و فریتین هر سه پایین‌اند</div>
        </>
      ),
    },
    {
      img: "/lab/couple.webp",
      t: "گامِ بعدی",
      d: "می‌گوییم چه آزمایشی تکرار شود و چه چیزهایی را به پزشک بگویید؛ مقدارِ نگران‌کننده اول از همه می‌آید.",
      glass: (
        <>
          <div className="hw-glass-t"><span>برای گفت‌وگو با پزشک</span><em className="hw-chip hw-chip--ok">آماده</em></div>
          <div className="hw-glass-s">آزمایش فریتین · سابقهٔ خونریزی و رژیم غذایی</div>
        </>
      ),
    },
  ];
  return (
    <section className="site-wrap site-sec" id="how">
      <div className="hw-head">
        <h2 className="site-h2">از برگهٔ آزمایش تا شرحی روشن</h2>
        <p>همه‌چیز با یک عکس از برگه شروع می‌شود.</p>
      </div>

      <div className="hw-grid">
        {steps.map((s, i) => (
          <article className="hw-card" key={s.t}>
            <div className="hw-media">
              <img src={s.img} alt="" loading="lazy" decoding="async" width="1024" height="1024"
                   style={s.pos ? { objectPosition: s.pos } : undefined} />
              <span className="hw-badge" aria-hidden="true">{["۱", "۲", "۳", "۴"][i]}</span>
              <div className="hw-glass">{s.glass}</div>
            </div>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </article>
        ))}
      </div>

      <p className="hw-note">کارت‌های روی عکس‌ها نمونه‌اند و برای توضیحِ روند آمده‌اند؛ نتیجهٔ آزمایشِ واقعی نیستند.</p>
      <div className="hw-cta">
        <Link to="/app" className="btn btn--primary btn--pill btn--lg">تحلیل نتایج من</Link>
      </div>
    </section>
  );
}

function FeaturedGuides() {
  // ⚠️ این سه کارت عمداً لینکِ اختصاصی ندارند. «شمارش کامل خون» و «قند و
  //    دیابت» دستهٔ خودشان را در testCatalog ندارند (دسته‌ها thyroid،
  //    wellness، disease… هستند)، و لینک‌کردنشان به نزدیک‌ترین دسته یعنی
  //    فرستادنِ کاربر به صفحه‌ای که تیترش را وعده نداده‌ایم. لینکِ بخش، یعنی
  //    «همهٔ راهنماها»، کنارِ تیتر است.
  const cards = [
    {
      tone: "deep", kicker: "تیروئید", kicker2: "آزمایش",
      img: "/lab/thyroid_card.webp",
      t: "آزمایش عملکرد تیروئید",
      d: "TSH و T4 نشان می‌دهند تیروئید کم‌کار است یا پرکار. این راهنما شرح می‌دهد هر شاخص چه چیزی را می‌سنجد و چرا پزشک معمولاً نخست TSH را درخواست می‌کند.",
      to: "/tests/thyroid",
    },
    {
      tone: "soft", kicker: "شمارش", kicker2: "کامل خون",
      img: "/lab/cbc_card.webp",
      t: "شمارش کامل خون (CBC)",
      d: "شمارش کامل خون سه رده را می‌سنجد: گلبول قرمز (حمل اکسیژن)، گلبول سفید (دفاع در برابر عفونت) و پلاکت (انعقاد). شاخص‌هایی چون MCV و MCH نوعِ کم‌خونی را از یکدیگر بازمی‌شناسانند.",
      to: "/tests/wellness",
    },
    {
      tone: "warm", kicker: "قند", kicker2: "و دیابت",
      img: "/lab/diabetes_card.webp",
      t: "قند خون و HbA1c",
      d: "قند ناشتا وضعیتِ همان لحظه را نشان می‌دهد و HbA1c میانگینِ سه ماهِ اخیر را. آستانه‌ها از راهنمای ADA برگرفته شده است.",
      to: "/tests/disease",
    },
  ];
  return (
    <section className="site-wrap site-sec">
      <div className="site-sec-head">
        <h2 className="site-h2">راهنمای آزمایش‌های پرکاربرد</h2>
        <Link to="/tests" className="btn btn--secondary btn--pill">همهٔ راهنماها</Link>
      </div>
      <div className="site-tiles">
        {cards.map((c, idx) => (
          <Link to={c.to} className="site-tile" key={c.t} style={{ textDecoration: 'none', color: 'inherit', display: 'block', '--index': idx }}>
            <span className={`site-tile-art site-tile-art--${c.tone}`} aria-hidden="true" style={c.img ? { padding: 0, position: 'relative', overflow: 'hidden' } : {}}>
              {c.img && (
                <img src={c.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, right: 0 }} />
              )}
            </span>
            <h3>{c.t}</h3>
            <p>{c.d}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ReviewBasis() {
  // ⚠️ الگو اینجا نُه پزشکِ نام‌دار با عکس دارد. LabMate هیئتِ بازبینی ندارد،
  //    و ساختنِ پزشکِ خیالی روی محصولِ سلامت جعلِ مدرک است. چیدمان همان
  //    ماند، محتوا شد آنچه واقعاً پشتِ اعداد ایستاده.
  const sources = [
    { k: "H", n: "Henry's Clinical Diagnosis", r: "محدوده‌های مرجع بزرگسالان" },
    { k: "R", n: "RCPCH ۲۰۱۶", r: "محدوده‌های مرجع کودکان زیر ۱۶ سال" },
    { k: "C", n: "CTCAE v5", r: "درجه‌بندی شدت (G1 تا G4)" },
    { k: "K", n: "KDIGO", r: "آستانه‌های کلیه و آلبومینوری" },
    { k: "A", n: "ADA", r: "آستانه‌های قند و HbA1c" },
    { k: "E", n: "ESC", r: "آستانه‌های چربی خون" },
    { k: "W", n: "WHO", r: "تعریف کم‌خونی و شاخص‌های جهانی" },
    { k: "L", n: "CLSI", r: "کیفیت نمونه و نکته‌های پیش از آزمایش" },
    { k: "I", n: "IFCC / EFLM", r: "واحدهای SI و تغییر معنادار نتیجه" },
  ];
  return (
    <section className="site-basis" id="basis">
      <div className="site-wrap site-sec">
        <h2 className="site-h2">مبنای علمی</h2>
        <p className="site-lede">
          {BRAND} هیئت بازبینی پزشکی ندارد و چنین ادعایی نیز نمی‌کند. مبنای کار همین منابعِ
          منتشرشده است و منبعِ هر یافته در کنارِ آن نمایش داده می‌شود.
        </p>
        <div className="site-basis-grid">
          {sources.map((s) => (
            <div className="site-source" key={s.n}>
              <span className="site-source-mark" aria-hidden="true">{s.k}</span>
              <span className="site-source-txt">
                <b>{s.n}</b>
                <i>{s.r}</i>
              </span>
            </div>
          ))}
        </div>
        <Link to="/tests" className="btn btn--secondary btn--pill">راهنمای آزمایش‌ها</Link>
      </div>
    </section>
  );
}

function Resources() {
  return (
    <section className="site-wrap site-sec">
      <h2 className="site-h2">منابع</h2>
      <div className="site-res-grid">
        <article className="site-res">
          <div className="site-figure">
            <img src="/lab/res-1.webp" alt="دست‌های دستکش‌پوش، دو لولهٔ نمونهٔ خون را بالای سانتریفیوژ نگه داشته‌اند" loading="lazy" decoding="async" width="1024" height="1024" />
          </div>
          <h3>شیوهٔ عکس‌برداری از برگهٔ آزمایش</h3>
          <p>
            برگه را بر سطحی صاف، زیرِ نورِ یکنواخت و بی‌سایه قرار دهید و اگر چندصفحه‌ای است،
            همهٔ صفحات را با هم بفرستید. عددی که درست خوانده نشود، درست تفسیر هم نخواهد شد.
          </p>
          <Link className="site-more" to="/how-to-capture">بیشتر بدانید ←</Link>
        </article>

        <article className="site-res site-res--lead">
          <span className="site-pick">پیشنهاد ویژه</span>
          <div className="site-figure">
            <img src="/lab/res-2.webp" alt="جالوله‌ای پر از لوله‌های نمونهٔ خون با درپوش‌های آبی، سبز، قرمز و بنفش" loading="lazy" decoding="async" width="1024" height="1024" />
          </div>
          <h3>محدودهٔ مرجع (رنج نرمال) به چه معناست؟</h3>
          <p>
            در کنارِ هر مقدار روی برگه، یک «محدودهٔ مرجع» (همان رنجِ نرمال) چاپ شده است. بیرون از محدوده بودن همواره نشانهٔ بیماری نیست و درون آن بودن نیز سلامتِ کامل را تضمین نمی‌کند. این نوشته توضیح می‌دهد این محدوده‌ها چگونه تعیین می‌شوند و چرا از آزمایشگاهی به آزمایشگاهِ دیگر تفاوت دارند.
          </p>
          <Link className="site-more" to="/reference-ranges">بیشتر بدانید ←</Link>
        </article>

        <article className="site-res">
          <div className="site-figure">
            <img src="/lab/res-3.webp" alt="دستگاه آنالایزر خودکار آزمایشگاه در کنار یک نمایشگر لمسی" loading="lazy" decoding="async" width="1024" height="1024" />
          </div>
          <h3>واحدهای SI و واحدهای متعارف</h3>
          <p>
            اگر برگه HbA1c را بر حسبِ mmol/mol گزارش کرده باشد و نتیجه با درصد نمایش داده شود،
            دو عددِ ناهمخوان به نظر می‌رسند. از این رو هر تبدیلِ واحد در کنارِ مقدارِ اصلیِ
            برگه نشان داده می‌شود.
          </p>
          <Link className="site-more" to="/units-guide">بیشتر بدانید ←</Link>
        </article>
      </div>
    </section>
  );
}

function Updates() {
  // ⚠️ الگو «Latest News» دارد. خبرِ ساختگی جعل است، پس این بخش
  //    تغییرِ واقعیِ موتور را با تاریخِ واقعی نشان می‌دهد.
  return (
    <section className="site-wrap site-sec">
      <h2 className="site-h2">آخرین به‌روزرسانی‌ها</h2>
      <article className="site-news">
        <div>
          <span className="site-news-date">۵ مرداد ۱۴۰۵</span>
          <h3>اکنون منبعِ هر یافته نیز ذکر می‌شود</h3>
          <p>
            از این نسخه، هر آستانه‌ای که برگرفته از راهنمایی منتشرشده باشد، منبعِ آن در کنارِ
            همان یافته می‌آید. تبدیلِ واحدهای SI، نکاتِ کیفیتِ نمونه (CLSI) و «کمترین تغییرِ
            معنادار» (EFLM) نیز به نتیجه افزوده شد.
          </p>
          <Link className="site-more" to="/app">بیشتر بدانید ←</Link>
        </div>
        <div className="site-figure">
          <img src="/lab/news.webp" alt="کاروسل نمونهٔ یک دستگاه آنالایزر، پر از لوله‌های درپوش‌دار" loading="lazy" decoding="async" width="1024" height="1024" />
        </div>
      </article>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="site-foot-in">
        <Link to="/landing" className="site-brand" aria-label={BRAND}>
          <LabMateLogo height={52} variant="light" />
        </Link>
        <p>
          {BRAND} جایگزین مشاورهٔ پزشکی، تشخیص یا درمان نیست؛ برای هر تصمیمِ درمانی با پزشک
          مشورت کنید. بخشی از متن‌های آموزشی از{" "}
          <a href="https://medlineplus.gov" target="_blank" rel="noopener noreferrer">MedlinePlus</a>{" "}
          (کتابخانهٔ ملی پزشکی آمریکا) گرفته شده است.
        </p>
        <Link to="/app" className="btn btn--primary btn--pill">تحلیل نتایج من</Link>
      </div>
    </footer>
  );
}
