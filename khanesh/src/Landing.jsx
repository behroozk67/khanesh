import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { REF, ALL } from "./labRefs.js";
import { BRAND_FA } from "./Logo.jsx";
import { LabMateLogo } from "./LabMateLogo.jsx";
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
      <Nav />
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
export function Nav() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  // ⚠️ جست‌وجویی که هیچ‌جا نمی‌رود یک کنترلِ مرده است. این یکی نامِ آزمایش را
  //    در همان جدولِ ورودِ دستی می‌گیرد و اگر پیدا شد مستقیم همان خانهٔ فرم را
  //    باز می‌کند («/?test=<key>»)، وگرنه فهرستِ کاملِ آزمایش‌ها را نشان می‌دهد.
  function onSearch(e) {
    e.preventDefault();
    const needle = q.trim().toLowerCase();
    setOpen(false);
    if (!needle) { navigate("/tests"); return; }
    const hit = ALL.find(
      (k) => REF[k].label.toLowerCase().includes(needle) || k.includes(needle)
    );
    navigate(hit ? `/app?test=${hit}` : "/tests");
  }

  const search = (id) => (
    <form className="site-search" role="search" onSubmit={onSearch}>
      <label className="sr-only" htmlFor={id}>جست‌وجوی نام آزمایش</label>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M16.5 16.5 L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="جست‌وجوی آزمایش"
      />
    </form>
  );

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

// ویدیوی هیرو: یک بار پخش می‌شود و روی آخرین فریم (صفحهٔ تفسیر) می‌ماند، نه حلقه.
// با prefers-reduced-motion فقط همان فریمِ آخر نشان داده می‌شود. صفحهٔ تبلت در
// ویدیو ساختهٔ مدل نیست؛ فریم‌به‌فریم جایگزین شده (جزئیات در public/lab/CREDITS.md).
const HERO_ALT = "دست‌هایی تبلتی را گرفته‌اند که ابتدا بارگذاریِ برگهٔ آزمایش و سپس تفسیرِ یک آزمایش را در آزمایار نشان می‌دهد";
function HeroVideo() {
  const [still] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  if (still) {
    return <img src="/lab/hero-tablet-poster.webp" alt={HERO_ALT} width="640" height="800" />;
  }
  return (
    <video autoPlay muted playsInline preload="auto" poster="/lab/hero-tablet-poster.webp"
           width="640" height="800" aria-label={HERO_ALT}>
      <source src="/lab/hero-tablet.mp4" type="video/mp4" />
      <source src="/lab/hero-tablet.webm" type="video/webm" />
    </video>
  );
}

function Hero() {
  // ⚠️ ترتیب نسبت به نسخهٔ قبل عوض شد. آنجا هر سه بندِ معرفی داخلِ یک کادرِ
  //    حاشیه‌دار **بالای** <h1> می‌نشستند، به این نیت که خواننده اول بفهمد
  //    ابزار چه می‌کند و چه نمی‌کند و بعد به دکمه برسد. آن نیت درست است ولی
  //    راهش این نبود: کادر پیش از تیتر، هم عنوانِ صفحه را از نگاهِ اول حذف
  //    می‌کرد و هم برای کاربرِ اسکرین‌ریدر <h1> را پشتِ یک بلوکِ متنی می‌بُرد.
  //    حالا تیتر اول است و هر سه بند بلافاصله زیرِ آن — دکمه همچنان بعد از
  //    همهٔ متن می‌آید، پس همان نیت حفظ شده است.
  return (
    <header className="site-wrap site-hero">
      <div className="site-hero-grid">
        <div>
          {/* ⚠️ بدونِ <br /> عمدی. تیتر ۴۵ نویسه است و .site-hero h1 هم
              text-wrap: balance دارد، پس مرورگر خودش دو سطرِ هم‌وزن می‌سازد و
              نقطهٔ شکست را روی همان ویرگول می‌گذارد. با <br />ِ دستی سه سطر
              می‌شد و «را بفهمید،» تنها روی سطرِ دوم می‌ماند — اندازه‌گیری‌شده
              در ۱۲۸۰ پیکسل. */}
          <h1>جواب آزمایشتان را بفهمید، آگاهانه تصمیم بگیرید</h1>

          <p className="site-hero-lede">
            {BRAND} نتیجهٔ آزمایش شما را با زبانی ساده و روشن توضیح می‌دهد: اینکه هر عدد دقیقاً
            چه چیزی را می‌سنجد، محدودهٔ طبیعی آن کجاست و اگر خارج از این محدوده باشد چه معنایی دارد.
          </p>
          <p className="site-hero-lede">
            ما ده‌ها آزمایش رایج را پوشش داده‌ایم. برای اطمینان خاطر شما، محدوده‌های مرجع از معتبرترین
            منابع پزشکی استخراج شده‌اند و وضعیت طبیعی یا غیرطبیعی بودن نتایج توسط یک سیستم دقیقِ علمی
            سنجیده می‌شود، نه هوش مصنوعی. نقش هوش مصنوعی در اینجا، تنها ساده‌سازی این یافته‌های تخصصی برای شماست.
          </p>

          <div className="site-intro">
            <p className="site-intro-fine">
              {BRAND} جای پزشک را نمی‌گیرد و تشخیص نمی‌دهد. هدفش این است که آماده‌تر و با
              پرسش‌های روشن‌تر به ویزیت بروید. محدودیت‌ها و منابع را{" "}
              <Link to="/tests">اینجا</Link> بخوانید.
            </p>
          </div>

          <Link to="/tests" className="btn btn--primary btn--pill btn--lg">همهٔ آزمایش‌ها</Link>
        </div>

        <div className="site-figure site-figure--hero">
          <HeroVideo />
        </div>
      </div>
    </header>
  );
}

function HowItWorks() {
  return (
    <section className="site-wrap site-sec" id="how">
      <h2 className="site-h2" style={{ marginBottom: "3rem", marginTop: "-1rem" }}>فرآیند تحلیل نتایج</h2>

      {/* پنل جایگزین‌شده مشابه اسکرین‌شات (دوستونی با گوشهٔ گرد) */}
      <div className="site-how-hero">
        <div className="site-how-hero-content">
          <h3>تحلیل هوشمند، تصمیم‌گیری آگاهانه</h3>
          <p>
            پشت هر عدد در برگه آزمایش، پیامی درباره سلامتی شما نهفته است. سیستم هوشمند ما این اعداد را از زبان پزشکی به زبان ساده ترجمه می‌کند تا دقیقاً بدانید هر فاکتور چه معنایی دارد و وضعیت سلامتی‌تان در چه سطحی است.
          </p>
          <Link to="/tests" className="btn btn--secondary btn--pill">راهنمای آزمایش‌ها</Link>
        </div>
        <div className="site-how-hero-image">
          <img src="/lab/couple.webp" alt="یک زوج جوان خندان" width="1024" height="1024" decoding="async" />
        </div>
      </div>

      <Band tone="warm" />

      <div className="site-block">
        <h3 className="site-h3">نگاه جامع به نتایج، نه فقط یک عدد ساده</h3>
        <p>
          بدن شما یک سیستم یکپارچه است و ما نیز نتایج آزمایش شما را با همین رویکرد بررسی می‌کنیم. سیستم هوشمند ما فراتر از ارزیابی تک‌تک اعداد عمل کرده و با تحلیل ارتباط میان شاخص‌های مختلف، تصویری دقیق و جامع از وضعیت سلامتی‌تان ارائه می‌دهد. ما الگوهای پنهان را شناسایی می‌کنیم تا شما با اطمینان و آرامش خاطر، درک کاملی از شرایط خود داشته باشید.
        </p>
      </div>

      <div className="site-panel site-panel--soft">
        <h3>پشت هر یافته، منبعش هم نوشته می‌شود</h3>
        <p>
          دقت و شفافیت، پایه و اساس تحلیل‌های ماست. هر آستانه و تفسیری که دریافت می‌کنید، مستقیماً به معتبرترین استانداردهای بالینی جهانی ارجاع داده شده و منبع علمی آن در کنار هر یافته درج می‌شود. همچنین، اگر عوامل محیطی مانند ناشتا نبودن یا شرایط خاص نمونه‌گیری بر نتایج اثر گذاشته باشند، با شفافیت کامل به شما اطلاع می‌دهیم تا هیچ ابهامی در درک اعداد باقی نماند.
        </p>
      </div>

      <Band tone="cool" />

      <div className="site-block">
        <h3 className="site-h3">قدم بعدی را آگاهانه بردارید</h3>
        <p>
          جواب آزمایش پایان راه نیست، بلکه نقطه شروعی برای سلامتی شماست. ما به شما می‌گوییم هر یافته چه معنایی دارد، چه زمانی نیاز به تکرار آزمایش است و دقیقاً چه نکاتی را با پزشک خود در میان بگذارید.
        </p>
        <Link to="/app" className="btn btn--secondary btn--pill">تحلیل نتایج من</Link>
      </div>
    </section>
  );
}

// قابِ تصویریِ عریض میانِ بخش‌ها. عکس‌ها واقعی‌اند و از Unsplash با پروانهٔ
// آزاد؛ اعتبارِ هر عکس در public/lab/CREDITS.md ثبت شده است.
const BANDS = {
  warm: { src: "/lab/doctor-tablet.webp", alt: "پزشک زن در حال بررسی اطلاعات پزشکی در تبلت" },
  cool: { src: "/lab/lab_modern_tech.webp", alt: "محیط مدرن آزمایشگاهی با تمرکز بر فناوری‌های پیشرفته" },
};

function Band({ tone }) {
  const b = BANDS[tone];
  return (
    <div className="site-figure site-figure--band">
      <img src={b.src} alt={b.alt} loading="lazy" decoding="async" width="1440" height="480" />
    </div>
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
      d: "TSH و T4 نشان می‌دهند تیروئید چقدر فعال است. این راهنما توضیح می‌دهد هر عدد چه چیزی را می‌سنجد و چرا معمولاً TSH اولین آزمایشی است که پزشک درخواست می‌کند.",
      to: "/tests/thyroid",
    },
    {
      tone: "soft", kicker: "شمارش", kicker2: "کامل خون",
      img: "/lab/cbc_card.webp",
      t: "شمارش کامل خون (CBC)",
      d: "CBC گلبول‌های قرمز، گلبول‌های سفید و پلاکت‌ها را می‌شمارد و شاخص‌هایی مثل MCV و MCH را به دست می‌دهد؛ همان‌هایی که انواع کم‌خونی را از هم جدا می‌کنند.",
      to: "/tests/wellness",
    },
    {
      tone: "warm", kicker: "قند", kicker2: "و دیابت",
      img: "/lab/diabetes_card.webp",
      t: "قند خون و HbA1c",
      d: "قند ناشتا وضعیت همان لحظه را نشان می‌دهد و HbA1c میانگین حدود سه ماه گذشته را. آستانه‌های این راهنما بر پایهٔ راهنمای ADA است.",
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
    <section className="site-basis">
      <div className="site-wrap site-sec">
        <h2 className="site-h2">اعداد بر چه مبنایی بررسی می‌شوند</h2>
        <p className="site-lede">
          {BRAND} هیئت بازبینی پزشکی ندارد و چنین ادعایی هم نمی‌کند. آنچه پشت هر عدد ایستاده
          همین منابع منتشرشده است، و منبع هر یافته کنار خودش نشان داده می‌شود.
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
          <h3>چطور از برگهٔ آزمایش عکس بگیریم</h3>
          <p>
            نور یکنواخت باشد، برگه صاف و بدون سایه بیفتد، و اگر چند صفحه است همه را با هم
            بفرستید. هر عددی که درست خوانده نشود، درست هم تفسیر نمی‌شود.
          </p>
          <Link className="site-more" to="/how-to-capture">بیشتر بدانید ←</Link>
        </article>

        <article className="site-res site-res--lead">
          <span className="site-pick">پیشنهاد ویژه</span>
          <div className="site-figure">
            <img src="/lab/res-2.webp" alt="جالوله‌ای پر از لوله‌های نمونهٔ خون با درپوش‌های آبی، سبز، قرمز و بنفش" loading="lazy" decoding="async" width="1024" height="1024" />
          </div>
          <h3>مقادیر مرجع (رنج نرمال) به چه معناست؟</h3>
          <p>
            پشت هر عدد در برگه آزمایش شما، یک «محدودهٔ مرجع» یا رنج نرمال قرار دارد. اما برخلاف تصور رایج، قرار گرفتن عدد شما خارج از این محدوده همیشه به معنای بیماری نیست؛ همان‌طور که طبیعی بودن آن هم تضمین‌کنندهٔ سلامت کامل نخواهد بود. در این نوشته با زبانی ساده توضیح داده‌ایم که این محدوده‌ها چگونه تعیین می‌شوند و چرا از یک آزمایشگاه به آزمایشگاه دیگر متفاوت‌اند.
          </p>
          <Link className="site-more" to="/reference-ranges">بیشتر بدانید ←</Link>
        </article>

        <article className="site-res">
          <div className="site-figure">
            <img src="/lab/res-3.webp" alt="دستگاه آنالایزر خودکار آزمایشگاه در کنار یک نمایشگر لمسی" loading="lazy" decoding="async" width="1024" height="1024" />
          </div>
          <h3>واحدهای SI و واحدهای متعارف</h3>
          <p>
            اگر برگهٔ شما HbA1c را با mmol/mol نوشته باشد و نتیجه آن را با درصد نشان دهد، این
            دو عدد شبیه یک اشتباه به نظر می‌رسند. برای همین هر تبدیل واحدی که انجام شود، کنارِ
            عدد اصلیِ برگه نشان داده می‌شود.
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
          <h3>لایهٔ استانداردها به موتور اضافه شد</h3>
          <p>
            از این نسخه، هر آستانه‌ای که از یک راهنمای منتشرشده آمده باشد، منبعش کنار همان
            یافته نوشته می‌شود. تبدیل واحدهای SI، نکته‌های کیفیت نمونه بر پایهٔ CLSI و
            «کمترین تغییر معنادار» بر پایهٔ EFLM هم به نتیجه اضافه شدند.
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
          {BRAND} جایگزین مشورت، تشخیص یا درمان پزشکی نیست. برای هر تصمیم درمانی با پزشک
          مشورت کنید. بخشی از متن‌های آموزشی از{" "}
          <a href="https://medlineplus.gov" target="_blank" rel="noopener noreferrer">MedlinePlus</a>{" "}
          (کتابخانهٔ ملی پزشکی آمریکا) گرفته شده است.
        </p>
        <Link to="/app" className="btn btn--primary btn--pill">تحلیل نتایج من</Link>
      </div>
    </footer>
  );
}
