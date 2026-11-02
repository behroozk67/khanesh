import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { searchHref, searchTests } from "./testSearch.js";
import { BRAND_FA } from "./Logo.jsx";
import { LabMateLogo } from "./LabMateLogo.jsx";
import { FAQ_ITEMS } from "./landingFaqData.jsx";
import { createPortal } from "react-dom";
import { FaqModal } from "./LandingFaq.jsx";
import HowArt from "./howArt.jsx";
import { useSeoHead } from "./useSeoHead.js";
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

const BLOOD_FACTORS = [
  {
    name: "شمارش کامل خون (CBC)",
    sub: "WBC, RBC, Hb, Plt, MCV",
    to: "/test/cbc",
    cat: "خون‌شناسی",
    purpose: "بررسی کم‌خونی، عفونت فعال و تعداد پلاکت‌ها",
    synergy: "تحلیل همزمان MCV و هموگلوبین برای افتراق فقر آهن از تالاسمی مینور",
  },
  {
    name: "قند خون ناشتا (FBS)",
    sub: "Fasting Blood Sugar",
    to: "/test/fbs",
    cat: "دیابت و متابولیسم",
    purpose: "غربالگری دیابت و بررسی سطح گلوکز پلاسما",
    synergy: "ارزیابی در کنار HbA1c جهت تفکیک نوسان لحظه‌ای از میانگین ۳ ماهه",
  },
  {
    name: "هموگلوبین A1c",
    sub: "HbA1c",
    to: "/test/hba1c",
    cat: "دیابت و متابولیسم",
    purpose: "میانگین قند خون در ۹۰ تا ۱۲۰ روز گذشته",
    synergy: "معیار طلایی کنترل دیابت بدون وابستگی به رژیم غذایی روز آزمایش",
  },
  {
    name: "پروفایل چربی (Lipid Panel)",
    sub: "Chol, TG, LDL, HDL",
    to: "/test/lipid-panel",
    cat: "قلب و عروق",
    purpose: "سنجش کلسترول، تری‌گلیسرید و ریسک رسوب عروقی",
    synergy: "محاسبه نسبت کلسترول تام به HDL و Non-HDL جهت تخمین ریسک قلبی",
  },
  {
    name: "آنزیم‌های کبدی (ALT و AST)",
    sub: "SGPT, SGOT",
    to: "/test/alt",
    cat: "کبد و گوارش",
    purpose: "سنجش التهاب و آسیب سلول‌های کبدی و کبد چرب",
    synergy: "نسبت De Ritis (AST/ALT) در کنار ALP جهت افتراق الگوهای مختلف کبدی",
  },
  {
    name: "کراتینین و اوره (Cr & BUN)",
    sub: "Creatinine, Blood Urea Nitrogen",
    to: "/test/cr",
    cat: "کلیه و مجاری",
    purpose: "ارزیابی قدرت تصفیه گلومرولی کلیه و دفع سموم نیتروژنی",
    synergy: "تخمین دقیق eGFR با در نظر گرفتن سن و جنسیت کاربر",
  },
  {
    name: "هورمون محرک تیروئید (TSH)",
    sub: "Thyroid Stimulating Hormone",
    to: "/test/tsh",
    cat: "غدد درون‌ریز",
    purpose: "غربالگری کم‌کاری و پرکاری تیروئید",
    synergy: "سنجش در کنار Free T4 جهت تشخیص کم‌کاری اولیه از ساب‌کلینیکال",
  },
  {
    name: "فریتین و آهن (Ferritin)",
    sub: "Serum Iron, Ferritin",
    to: "/test/ferritin",
    cat: "خون‌شناسی",
    purpose: "سنجش ذخایر آهن کبد و پروتئین ترانسفرین",
    synergy: "کلید تشخیصی افتراق فقر آهن پیش از افت شدید هموگلوبین",
  },
  {
    name: "ویتامین D3 (25-OH D)",
    sub: "25-Hydroxy Vitamin D",
    to: "/test/vitd",
    cat: "ویتامین‌ها و املاح",
    purpose: "ارزیابی سلامت اسکلتی، سطح جذب کلسیم و سیستم ایمنی",
    synergy: "بررسی در کنار کلسیم و فسفر خون جهت تعیین دوز ایمن مکمل",
  },
];

function BloodTestFactors() {
  return (
    <section className="site-sec site-wrap" id="factors">
      <div className="site-sec-head">
        <h2 className="site-h2">راهنمای فاکتورهای کلیدی در تفسیر آزمایش خون</h2>
        <p className="site-lede">
          برگهٔ آزمایش خون معمولاً از چندین پنل تخصصی تشکیل شده است. در فهرست زیر، پرکاربردترین شاخص‌ها،
          کاربرد بالینی و دلیل اهمیت ارزیابی ترکیبی آن‌ها را مشاهده می‌کنید:
        </p>
      </div>

      <div className="factors-table-wrap">
        <table className="factors-table">
          <thead>
            <tr>
              <th scope="col">نام شاخص خونی</th>
              <th scope="col">دسته بالینی</th>
              <th scope="col">هدف آزمایش</th>
              <th scope="col">اهمیت بررسی یکپارچه در تفسیر</th>
            </tr>
          </thead>
          <tbody>
            {BLOOD_FACTORS.map((f, i) => (
              <tr key={i}>
                <td>
                  <Link to={f.to} className="factor-name">
                    <span>{f.name}</span>
                    <small>{f.sub}</small>
                  </Link>
                </td>
                <td><span className="factor-cat">{f.cat}</span></td>
                <td>{f.purpose}</td>
                <td><span className="factor-synergy">{f.synergy}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--card)', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid var(--line-soft)' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-2)' }}>
          آیا آزمایش دیگری روی برگه دارید؟ بیش از ۳۰۰ آزمایش در پایگاه داده آزمایار مدلسازی شده‌اند.
        </p>
        <Link to="/tests" className="btn btn--secondary btn--pill" style={{ fontWeight: 600 }}>
          مشاهده فهرست ۳۰۰+ آزمایش ←
        </Link>
      </div>
    </section>
  );
}

const LANDING_FAQS = [
  {
    q: "تفسیر آزمایش خون در آزمایار چگونه انجام می‌شود؟",
    a: "کافی است عکس واضحی از برگهٔ آزمایش خود بارگذاری کنید یا مقادیر فاکتورها را به‌صورت دستی وارد نمایید. موتور هوشمند آزمایار بر پایهٔ راهنماهای بالینی معتبر (Henry، WHO و انجمن‌های تخصصی)، فاکتورها را در کنار یکدیگر می‌سنجد، فوریت بالینی را تعیین می‌کند و نتایج را به زبان ساده توضیح می‌دهد.",
  },
  {
    q: "آیا آزمایار می‌تواند عکس برگه آزمایش خون را بخواند؟",
    a: "بله، با موتور اختصاصی پردازش تصویر و بینایی ماشین، می‌توانید تا ۵ تصویر از صفحات مختلف برگه آزمایش را بارگذاری کنید. سامانه به‌طور خودکار نام آزمایش، مقادیر عددی و بازه‌های مرجع درج‌شده روی برگه را استخراج و تحلیل می‌کند.",
  },
  {
    q: "چرا تفسیر همزمان چند فاکتور دقیق‌تر از خواندن رنج‌های روی برگه است؟",
    a: "شاخص‌های آزمایشگاهی در بدن به‌هم‌پیوسته‌اند. برای مثال، هموگلوبین پایین به‌تنهایی فقط نشانهٔ کم‌خونی است؛ اما همراه شدن آن با MCV پایین و فریتین پایین نشان‌دهنده کم‌خونی فقر آهن است. برگهٔ آزمایش ارتباط بین این فاکتورها را نشان نمی‌دهد، اما آزمایار الگوی کل برگه را بررسی می‌کند.",
  },
  {
    q: "آیا نتیجهٔ تفسیر آنلاین آزمایش خون جایگزین نظر پزشک است؟",
    a: "خیر. آزمایار یک ابزار بالینی و آموزشی برای افزایش آگاهی بیمار و آماده‌سازی برای گفت‌وگوی مؤثر با پزشک است و هرگز جایگزین معاینه حضوری، سابقهٔ دارویی و تشخیص پزشک معالج نخواهد بود.",
  },
  {
    q: "چه آزمایش‌هایی در سامانه آزمایار پوشش داده شده‌اند؟",
    a: "بیش از ۳۰۰ آزمایش شامل شمارش کامل خون (CBC)، قند خون و دیابت (FBS و HbA1c)، چربی‌های خون، سلامت کبد و کلیه، تیروئید، املاح و الکترولیت‌ها، ویتامین‌ها (از جمله ویتامین D و B12)، آزمایش ادرار و نشانگرهای غربالگری در آزمایار مدلسازی شده‌اند.",
  },
];

function FaqSection() {
  return (
    <section className="site-sec site-wrap" id="faq-section">
      <div className="site-sec-head">
        <h2 className="site-h2">پرسش‌های متداول درباره تفسیر آزمایش خون</h2>
        <p className="site-lede">
          پاسخ به سوالات متداول درباره نحوه تفسیر آنلاین برگه آزمایش، دقت تحلیل بالینی و امنیت اطلاعات:
        </p>
      </div>

      <div className="site-faq-list">
        {LANDING_FAQS.map((item, idx) => (
          <details className="site-faq-item" key={idx} open={idx === 0}>
            <summary>{item.q}</summary>
            <div className="site-faq-body">{item.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function Landing() {
  useSeoHead({
    title: `تفسیر آزمایش خون آنلاین | هوشمند و بر پایه منابع بالینی — ${BRAND_FA}`,
    description: "تفسیر آنلاین برگه آزمایش خون و چکاپ با هوش مصنوعی و بر پایه راهنماهای معتبر بالینی. عکس برگه را بارگذاری کنید یا مقادیر فاکتورها را وارد نمایید تا نتیجه به زبان ساده تحلیل شود.",
    canonical: "/",
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          "name": BRAND_FA,
          "alternateName": ["AzmayarApp", "LabMate", "تفسیر آزمایش خون آزمایار"],
          "url": "https://azmayarapp.ir/",
          "description": "سامانه تفسیر هوشمند برگه آزمایش پزشکی بر پایه قواعد و منابع بالینی",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "All",
          "inLanguage": "fa-IR",
        },
        {
          "@type": "FAQPage",
          "mainEntity": LANDING_FAQS.map((item) => ({
            "@type": "Question",
            "name": item.q,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": item.a,
            },
          })),
        },
      ],
    },
  });

  return (
    <div className="site" dir="rtl">
      <Hero />
      <HowItWorks />
      <FeaturedGuides />
      <BloodTestFactors />
      <ReviewBasis />
      <FaqSection />
      <Resources />
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
  { to: "/methodology", label: "روش‌شناسی" },
  { href: "/#resources", label: "منابع" },
  { to: "/contact", label: "تماس" },
  { href: "/#basis", label: "استانداردها" },
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
        <Link to="/" className="site-brand" aria-label={BRAND}>
          <LabMateLogo height={86} />
        </Link>

        <div className="site-links">
          {NAV_LINKS.map((l) =>
            l.to ? <Link key={l.label} to={l.to}>{l.label}</Link> : <a key={l.label} href={l.href}>{l.label}</a>
          )}
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
          {NAV_LINKS.map((l) =>
            l.to
              ? <Link key={l.label} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>
              : <a key={l.label} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          )}
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
const HERO_ALT = "میکروسکوپ و رکِ لولهٔ آزمایش روی میزِ روشن، با نورِ مورب بر دیوارِ سبزآبی";

// ⚠️ «فاکتورهای آزمایش خون» از نوارِ بالا و از منوی نُه‌نقطه برداشته شد
// (درخواستِ صریح): چهار پیوند در قابِ ۱۲۰۰ پیکسلی از ستونِ خودشان سرریز
// می‌کردند و «راهنمای آزمایش‌ها» می‌رفت زیرِ نشان. بخشِ #factors روی خودِ
// صفحه مانده است (محتوای سئو) و از طریقِ لینکِ «راهنمای آزمایش‌ها» و فهرستِ
// پایینِ همان بخش در دسترس است.
const HERO_LINKS = [
  { to: "/tests", label: "راهنمای آزمایش‌ها" },
  { href: "#faq-section", label: "پرسش‌های متداول" },
  { to: "/contact", label: "تماس با ما" },
  { href: "#basis", label: "منابع بالینی" },
];

// منوی تمام‌صفحهٔ کنارِ دکمهٔ نُه‌نقطه: ورقِ سفیدِ گرد، عنوان، دکمه، پیوندهای درشت و دو ستونِ کوچک.
// ⚠️ فقط به صفحه‌هایی لینک می‌دهد که وجود دارند؛ چیزی از طرحِ مرجع (وبلاگ، فرصت‌های شغلی…) نیامده.
const MENU_MAIN = [
  { to: "/tests", label: "راهنمای آزمایش‌ها" },
  { href: "#faq-section", label: "پرسش‌های متداول" },
  { href: "#basis", label: "منابع بالینی" },
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
export function PillNav({ links = NAV_LINKS, sheetMain = links, withSearch = false, page = false, onDark = false }) {
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
        <Link to="/" className="lh-pill-brand" aria-label={BRAND}>
          {scrolled ? <span className="lh-pill-name">{BRAND}</span> : <LabMateLogo height={83} variant={onDark ? "light" : "dark"} />}
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
      {/* عکس به‌صورتِ پس‌زمینهٔ div رندر می‌شود؛ <img> با آلفا در برخی موتورها
          تا اولین repaint کشیده نمی‌شد. */}
      <div className="lh-bg" role="img" aria-label={HERO_ALT} />
      <PillNav links={HERO_LINKS} sheetMain={MENU_MAIN} />

      <div className="lh-body">
        <div className="lh-copy" dir="rtl">
          <h1>آزمایش خود را بهتر بفهمید؛ آگاهانه‌تر پیگیری کنید</h1>
          <p className="lh-sub">
            برگهٔ آزمایش خود را بارگذاری کنید یا مقدارها را وارد کنید. توضیحی ساده دریافت می‌کنید دربارهٔ معنای نتایج و محدوده‌های مرجع، و اینکه کدام نتایج ممکن است به پیگیری نیاز داشته باشند.
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
            {BRAND} جایگزین پزشک نیست و بیماری را تشخیص نمی‌دهد. درباره محدودیت‌ها و منابع کار{" "}
            <a href="#basis">اینجا</a> بخوانید.
          </p>
        </div>

      </div>

      {/* ⚠️ پورتال به <body>: داخلِ .lh (isolation+overflow:clip+z-index:40) هم لایهٔ
          بُرندهٔ نوار و هم backdrop-filter از کار می‌افتاد و متنِ هیرو از پشتِ پرده
          خوانده می‌شد (گزارشِ ۲۰۲۶-۱۰-۲۹: «نوشته‌ها قاطی می‌شوند»). */}
      {faq !== null && createPortal(
        <FaqModal index={faq} onSelect={setFaq} onClose={() => setFaq(null)} />,
        document.body
      )}
    </header>
  );
}

// چهار گامِ کار: تصویرِ تزئینی (howArt.jsx) + عنوان و توضیح زیرِ آن.
function HowItWorks() {
  const steps = [
    {
      art: "tubes",
      t: "ثبت نتیجه‌ها",
      d: "از برگه عکس بگیرید (حداکثر پنج عکس) یا مقدارها را خودتان تایپ کنید.",
    },
    {
      art: "testtube",
      t: "سنجش با منابع معتبر",
      d: "هر مقدار با محدودهٔ مرجع مناسب سن و جنس شما سنجیده می‌شود و منبع هر یافته کنار آن نوشته می‌شود.",
    },
    {
      art: "steth",
      t: "توضیح روشن",
      d: "مقدارها در کنار یکدیگر بررسی می‌شوند. برای نمونه، هموگلوبین پایین همراه با فریتین پایین معنای دیگری دارد تا هموگلوبین پایین به‌تنهایی.",
    },
    {
      art: "app",
      t: "گام بعدی",
      d: "مشخص می‌شود کدام آزمایش را باید تکرار کنید و چه نکته‌هایی را به پزشک بگویید. اگر مقداری نگران‌کننده باشد، پیش از همه می‌آید.",
    },
  ];
  return (
    <section className="site-wrap site-sec" id="how">
      <div className="hw-head">
        <h2 className="site-h2">از برگهٔ آزمایش تا توضیحی روشن</h2>
        <p>کار با یک عکس از برگه آغاز می‌شود.</p>
      </div>

      <div className="hw-grid">
        {steps.map((s) => (
          <article className="hw-card" key={s.t}>
            <div className="hw-media">
              <HowArt kind={s.art} />
            </div>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </article>
        ))}
      </div>

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
      tone: "deep",
      img: "/lab/thyroid_card.webp",
      t: "آزمایش عملکرد تیروئید",
      d: "TSH و T4 نشان می‌دهند تیروئید کم‌کار است یا پرکار. این راهنما توضیح می‌دهد هر شاخص چه چیزی را می‌سنجد و چرا پزشکان معمولاً ابتدا TSH را درخواست می‌کنند.",
      to: "/tests/thyroid",
    },
    {
      tone: "soft",
      img: "/lab/cbc_card.webp",
      t: "شمارش کامل خون (CBC)",
      d: "این آزمایش سه گروه سلول خون را می‌شمارد: گلبول‌های قرمز که اکسیژن را حمل می‌کنند، گلبول‌های سفید که با عفونت مقابله می‌کنند و پلاکت‌ها که به لخته شدن خون کمک می‌کنند. شاخص‌هایی مانند MCV و MCH به تشخیص نوع کم‌خونی کمک می‌کنند.",
      to: "/tests/wellness",
    },
    {
      tone: "warm",
      img: "/lab/diabetes_card.webp",
      t: "قند خون و HbA1c",
      d: "قند ناشتا وضعیت همان لحظه را نشان می‌دهد و HbA1c میانگین قند خون در سه ماه گذشته را. آستانه‌ها از راهنمای انجمن دیابت آمریکا (ADA) گرفته شده است.",
      to: "/tests/disease",
    },
  ];
  return (
    <section className="site-wrap site-sec">
      <div className="site-sec-head">
        <h2 className="site-h2">راهنمای آزمایش‌های پرکاربرد</h2>
        <Link to="/tests" className="btn btn--secondary btn--pill">همهٔ راهنماها</Link>
      </div>
      <div className="site-tiles site-tiles--lead">
        {cards.map((c, idx) => (
          <Link to={c.to} className={idx ? "site-tile site-tile--compact" : "site-tile"} key={c.t} style={{ "--index": idx }}>
            <span className={`site-tile-art site-tile-art--${c.tone}${c.img ? " site-tile-art--img" : ""}`} aria-hidden="true">
              {c.img && <img src={c.img} alt="" />}
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
    { n: "Henry's Clinical Diagnosis", r: "محدوده‌های مرجع بزرگسالان" },
    { n: "RCPCH ۲۰۱۶", r: "محدوده‌های مرجع کودکان زیر ۱۶ سال" },
    { n: "CTCAE v5", r: "درجه‌بندی شدت (G1 تا G4)" },
    { n: "KDIGO", r: "آستانه‌های کلیه و آلبومینوری" },
    { n: "ADA", r: "آستانه‌های قند و HbA1c" },
    { n: "ESC", r: "آستانه‌های چربی خون" },
    { n: "WHO", r: "تعریف کم‌خونی و شاخص‌های جهانی" },
    { n: "CLSI", r: "کیفیت نمونه و نکته‌های پیش از آزمایش" },
    { n: "IFCC / EFLM", r: "واحدهای SI و تغییر معنادار نتیجه" },
  ];
  return (
    <section className="site-basis" id="basis">
      <div className="site-wrap site-sec">
        <h2 className="site-h2">مبنای علمی</h2>
        <p className="site-lede">
          {BRAND} هیئت بازبینی پزشکی ندارد و چنین ادعایی هم نمی‌کند. مبنای کار همین منابع منتشرشده است و منبع هر یافته کنار آن نمایش داده می‌شود.
        </p>
        <div className="site-basis-grid">
          {sources.map((s) => (
            <div className="site-source" key={s.n}>
              <span className="site-source-txt">
                <b>{s.n}</b>
                <i>{s.r}</i>
              </span>
            </div>
          ))}
        </div>
        <Link to="/tests" className="btn btn--secondary btn--pill">راهنمای آزمایش‌ها</Link>
        <Link to="/methodology" className="site-more" style={{ marginInlineStart: "1rem" }}>روش‌شناسی کامل ←</Link>
      </div>
    </section>
  );
}

function Resources() {
  return (
    <section className="site-wrap site-sec" id="resources">
      <h2 className="site-h2">منابع</h2>
      <div className="site-res-grid">
        <article className="site-res">
          <div className="site-figure">
            <img src="/lab/how-capture.webp" alt="دو دست، گوشی را موازی با برگهٔ آزمایش نگه داشته‌اند و قاب‌بندیِ برگه روی صفحهٔ گوشی دیده می‌شود" loading="lazy" decoding="async" width="1024" height="1024" />
          </div>
          <h3>شیوهٔ عکس‌برداری از برگهٔ آزمایش</h3>
          <p>
            برگه را روی سطحی صاف و در نور کافی قرار دهید و گوشی را موازی با برگه نگه دارید تا سایهٔ دست یا بازتاب نور روی نوشته‌ها نیفتد. پیش از ارسال مطمئن شوید نام آزمایش، عدد نتیجه و محدودهٔ مرجع خوانا هستند و اگر برگه چندصفحه‌ای است، همهٔ صفحه‌ها را با هم بفرستید.
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
            «محدودهٔ مرجع» (همان رنج نرمال) بازه‌ای است که نتیجهٔ حدود ۹۵ درصد افراد سالمِ هم‌سن و هم‌جنس شما در آن قرار می‌گیرد. چون بدن در نوزادی، کودکی، بزرگسالی و بارداری فرق می‌کند، این بازه برای هر فرد متفاوت است. عددی که کمی بیرون از بازه باشد همیشه نشانهٔ بیماری نیست و گاهی به کیت آزمایشگاه، رژیم غذایی یا شرایط پیش از نمونه‌گیری بستگی دارد؛ به همین دلیل هر نتیجه را باید در کنار بقیهٔ ردیف‌ها و نظر پزشک سنجید.
          </p>
          <Link className="site-more" to="/reference-ranges">بیشتر بدانید ←</Link>
        </article>

        <article className="site-res">
          <div className="site-figure">
            <img src="/lab/res-3.webp" alt="دستگاه آنالایزر خودکار آزمایشگاه در کنار یک نمایشگر لمسی" loading="lazy" decoding="async" width="1024" height="1024" />
          </div>
          <h3>واحدهای SI و واحدهای متعارف</h3>
          <p>
            اگر برگه HbA1c را با واحد mmol/mol گزارش کرده باشد و نتیجه با درصد نمایش داده شود، این دو عدد ناهمخوان به نظر می‌رسند. به همین دلیل هر تبدیل واحد کنار مقدار اصلی برگه نشان داده می‌شود.
          </p>
          <Link className="site-more" to="/units-guide">بیشتر بدانید ←</Link>
        </article>
      </div>

      {/* ⚠️ الگو «Latest News» دارد. خبرِ ساختگی جعل است، پس این سطر
          تغییرِ واقعیِ موتور را با تاریخِ واقعی نشان می‌دهد. */}
      <aside className="site-news-line" aria-label="آخرین به‌روزرسانی">
        <span className="site-news-date">آخرین به‌روزرسانی · ۵ مرداد ۱۴۰۵</span>
        <h3>اکنون منبع هر یافته هم ذکر می‌شود</h3>
        <p>
          از این نسخه به بعد، هر آستانه‌ای که از یک راهنمای منتشرشده گرفته شده باشد، منبع آن کنار همان یافته نوشته می‌شود. تبدیل واحدهای SI، نکته‌های کیفیت نمونه (CLSI) و «کمترین تغییر معنادار» (EFLM) نیز به نتیجه اضافه شده است.{" "}
          <Link className="site-more" to="/app">بیشتر بدانید ←</Link>
        </p>
      </aside>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="site-foot-in">
        <Link to="/" className="site-brand" aria-label={BRAND}>
          <LabMateLogo height={52} variant="light" />
        </Link>
        <p className="site-foot-copy" lang="fa">
          © ۱۴۰۵ {BRAND} (AzmayarApp.ir) — سامانهٔ هوشمند تفسیر آزمایش‌های پزشکی بر پایهٔ قواعد معتبر بالینی.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', margin: '0.75rem 0', fontSize: '0.9rem' }}>
          <Link to="/tests" style={{ color: 'inherit' }}>فهرست آزمایش‌ها</Link>
          <span style={{ opacity: 0.5 }}>•</span>
          <Link to="/reference-ranges" style={{ color: 'inherit' }}>محدوده مرجع</Link>
          <span style={{ opacity: 0.5 }}>•</span>
          <Link to="/units-guide" style={{ color: 'inherit' }}>واحدهای سنجش</Link>
          <span style={{ opacity: 0.5 }}>•</span>
          <Link to="/how-to-capture" style={{ color: 'inherit' }}>راهنمای عکس گرفتن</Link>
          <span style={{ opacity: 0.5 }}>•</span>
          <Link to="/methodology" style={{ color: 'inherit' }}>روش‌شناسی</Link>
          <span style={{ opacity: 0.5 }}>•</span>
          <Link to="/terms" style={{ color: 'inherit' }}>شرایط استفاده</Link>
          <span style={{ opacity: 0.5 }}>•</span>
          <Link to="/privacy" style={{ color: 'inherit' }}>حریم خصوصی</Link>
          <span style={{ opacity: 0.5 }}>•</span>
          <Link to="/contact" style={{ color: 'inherit' }}>تماس با آزمایار</Link>
        </div>
        <p>
          {BRAND} جایگزین مشاورهٔ پزشکی، تشخیص یا درمان نیست؛ برای هر تصمیم درمانی با پزشک مشورت کنید. بخشی از متن‌های آموزشی از{" "}
          <a href="https://medlineplus.gov" target="_blank" rel="noopener noreferrer">MedlinePlus</a>{" "}
          (کتابخانهٔ ملی پزشکی آمریکا) برگرفته شده است.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '1.25rem' }}>
          <Link to="/app" className="btn btn--primary btn--pill">تحلیل نتایج من</Link>
          <a
            referrerPolicy="origin"
            target="_blank"
            href="https://trustseal.enamad.ir/?id=8488659&Code=M4ajbdzV1RRAtLResAT3LFUtlu4MDGuu"
            style={{
              background: '#ffffff',
              borderRadius: '10px',
              padding: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
            title="نماد اعتماد الکترونیکی آزمایار (اینماد)"
          >
            <img
              referrerPolicy="origin"
              src="https://trustseal.enamad.ir/logo.aspx?id=8488659&Code=M4ajbdzV1RRAtLResAT3LFUtlu4MDGuu"
              alt="نماد اعتماد الکترونیکی اینماد"
              style={{ cursor: 'pointer', width: '85px', height: 'auto', display: 'block' }}
              code="M4ajbdzV1RRAtLResAT3LFUtlu4MDGuu"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
