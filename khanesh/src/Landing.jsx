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
      <Standards />
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
          <LabMateLogo height={72} />
        </Link>

        <div className="site-links">
          {NAV_LINKS.map((l) => (
            <Link key={l.label} to={l.to}>{l.label}</Link>
          ))}
        </div>

        {search("site-nav-q")}

        <Link to="/app" className="btn btn--primary btn--pill site-nav-cta">شروع تحلیل</Link>

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
            شروع تحلیل
          </Link>
        </div>
      )}
    </nav>
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
            {BRAND} برگهٔ آزمایش شما را به زبان ساده توضیح می‌دهد: هر عدد چه چیزی را
            می‌سنجد، محدودهٔ طبیعی‌اش کجاست، و اگر بیرون از آن محدوده باشد یعنی چه.
          </p>
          <p className="site-hero-lede">
            ده‌ها آزمایش رایج پوشش داده شده است. محدوده‌های مرجع از منابع بالینی معتبر
            می‌آیند و طبیعی یا غیرطبیعی بودن هر عدد را یک موتور قاعده‌محور تعیین می‌کند،
            نه یک مدل زبانی؛ کار مدل زبانی فقط ساده‌نویسی همان یافته‌هاست.
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

        {/* عکسِ واقعی است (Unsplash، پروانهٔ آزاد)؛ اعتبارِ همهٔ عکس‌ها در
            public/lab/CREDITS.md ثبت شده. قابِ گرد و دایرهٔ یاسیِ پشتش حذف
            شدند — عکس حالا یک مربعِ تمیز با همان شعاعِ بقیهٔ سطح‌هاست، و
            چون فایل خودش مربع است هیچ‌جای عکس بریده نمی‌شود.
            ⚠️ width/height باید ابعادِ **واقعیِ** فایل باشد (۹۰۰×۹۰۰). عددِ
               دل‌بخواه، نسبتِ رزروشده را غلط می‌کند و صفحه هنگام رسیدنِ عکس
               می‌پرد. همهٔ فایل‌های این پوشه عمداً دقیقاً به نسبتِ قابِ خودشان
               بریده شده‌اند، پس این عددها با aspect-ratio در site.css یکی‌اند. */}
        <div className="site-figure site-figure--hero">
          <img
            src="/lab/hero.png"
            alt="دو کارشناس آزمایشگاه با روپوش سفید، پشت دستگاه‌های آنالایزر و رایانهٔ آزمایشگاه"
            width="1024" height="1024" decoding="async"
          />
        </div>
      </div>
    </header>
  );
}

function HowItWorks() {
  return (
    <section className="site-wrap site-sec" id="how">
      <h2 className="site-h2">چطور کار می‌کند</h2>

      {/* تنها تابلوی پُررنگِ صفحه. سه تابلوی رنگیِ دیگرِ نسخهٔ قبل به متنِ
          ساده و یک تابلوی کم‌رنگ تبدیل شدند: وقتی همه‌چیز تأکید داشته باشد،
          هیچ‌چیز تأکید ندارد. */}
      <div className="site-panel site-panel--solid">
        <h3>همه‌چیز از روی داده گفته می‌شود</h3>
        <p>
          راهنماهای {BRAND} همان چیزی را می‌گویند که برای مراقبت از خودتان لازم دارید: هر
          آزمایش، محدودهٔ مرجعِ متناسب با سن و جنسیت شما، و اینکه آن عدد چه چیزی را اندازه
          می‌گیرد و بالا یا پایین بودنش چه معنایی دارد.
        </p>
        <Link to="/tests" className="btn btn--secondary btn--pill">راهنمای آزمایش‌ها</Link>
      </div>

      <Band tone="warm" />

      <div className="site-block">
        <h3 className="site-h3">آزمایش‌ها کنار هم معنا پیدا می‌کنند</h3>
        <p>
          موتور، آزمایش‌ها را تک‌تک نمی‌بیند؛ کنار هم می‌بیند. هموگلوبین پایین به‌تنهایی فقط
          یک عدد است، اما هموگلوبین پایین همراه با فریتین پایین و MCV پایین یعنی کم‌خونی فقر
          آهن. برای هر الگویی که پیدا شود، مشخص می‌شود رسیدگی به آن چقدر فوری است.
        </p>
      </div>

      <div className="site-panel site-panel--soft">
        <h3>پشت هر یافته، منبعش هم نوشته می‌شود</h3>
        <p>
          کنار هر یافته، منبعی که آن را پشتیبانی می‌کند نشان داده می‌شود. اگر چیزی در
          نمونه‌گیری توانسته باشد روی عدد اثر بگذارد — ناشتا نبودن، همولیز نمونه یا لخته شدن
          پلاکت‌ها — همان هم گفته می‌شود؛ بدون این نکته ممکن است عدد را اشتباه بفهمید.
        </p>
      </div>

      <Band tone="cool" />

      <div className="site-block">
        <h3 className="site-h3">بدانید قدم بعدی چیست</h3>
        <p>
          نتیجه نقطهٔ شروع است، نه پایان کار. برای هر یافته می‌بینید کدام آزمایش باید تکرار
          شود، با چه فاصلهٔ زمانی، و چه چیزی را در ویزیت با پزشک مطرح کنید.
        </p>
        <Link to="/app" className="btn btn--secondary btn--pill">شروع تحلیل</Link>
      </div>
    </section>
  );
}

// قابِ تصویریِ عریض میانِ بخش‌ها. عکس‌ها واقعی‌اند و از Unsplash با پروانهٔ
// آزاد؛ اعتبارِ هر عکس در public/lab/CREDITS.md ثبت شده است.
const BANDS = {
  warm: { src: "/lab/band-1.png", alt: "طراحی سه‌بعدی انتزاعی تجهیزات آزمایشگاهی" },
  cool: { src: "/lab/band-2.png", alt: "طراحی مینیمال از ابزارهای آزمایشگاهی و داده‌های پزشکی" },
};

function Band({ tone }) {
  const b = BANDS[tone];
  return (
    <div className="site-figure site-figure--band">
      <img src={b.src} alt={b.alt} loading="lazy" decoding="async" width="1440" height="480" />
    </div>
  );
}

function Standards() {
  // ⚠️ عنوان عمداً «Partners» نیست — این‌ها شریکِ ما نیستند، منابعی‌اند که
  //    موتور به اسنادشان ارجاع می‌دهد. لوگو هم گذاشته نشد، چون لوگو یعنی
  //    تأییدیه.
  const bodies = ["CLSI", "IFCC", "EFLM", "KDIGO", "ADA", "ESC", "WHO", "RCPCH", "CTCAE v5"];
  return (
    <section className="site-wrap site-sec">
      <h2 className="site-h2">استانداردهای مرجع</h2>
      <p className="site-lede">
        آستانه‌هایی که موتور با آن‌ها کار می‌کند، به اسناد منتشرشدهٔ این نهادها برمی‌گردند.
        این فهرست فقط ارجاع به منبع است؛ نه شراکت با این نهادها و نه تأییدی از سوی آن‌ها.
      </p>
      <div className="site-marks">
        {bodies.map((b) => <span key={b}>{b}</span>)}
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
      t: "آزمایش عملکرد تیروئید",
      d: "TSH و T4 نشان می‌دهند تیروئید چقدر فعال است. این راهنما توضیح می‌دهد هر عدد چه چیزی را می‌سنجد و چرا معمولاً TSH اولین آزمایشی است که پزشک درخواست می‌کند.",
      to: "/tests/thyroid",
    },
    {
      tone: "soft", kicker: "شمارش", kicker2: "کامل خون",
      t: "شمارش کامل خون (CBC)",
      d: "CBC گلبول‌های قرمز، گلبول‌های سفید و پلاکت‌ها را می‌شمارد و شاخص‌هایی مثل MCV و MCH را به دست می‌دهد؛ همان‌هایی که انواع کم‌خونی را از هم جدا می‌کنند.",
      to: "/tests/wellness",
    },
    {
      tone: "warm", kicker: "قند", kicker2: "و دیابت",
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
        {cards.map((c) => (
          <Link to={c.to} className="site-tile" key={c.t} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <span className={`site-tile-art site-tile-art--${c.tone}`} aria-hidden="true">
              <b>{c.kicker}</b>
              <span>{c.kicker2}</span>
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
            <img src="/lab/res-1.png" alt="دست‌های دستکش‌پوش، دو لولهٔ نمونهٔ خون را بالای سانتریفیوژ نگه داشته‌اند" loading="lazy" decoding="async" width="1024" height="1024" />
          </div>
          <h3>چطور از برگهٔ آزمایش عکس بگیریم</h3>
          <p>
            نور یکنواخت باشد، برگه صاف و بدون سایه بیفتد، و اگر چند صفحه است همه را با هم
            بفرستید. هر عددی که درست خوانده نشود، درست هم تفسیر نمی‌شود.
          </p>
          <Link className="site-more" to="/app">بیشتر بدانید ←</Link>
        </article>

        <article className="site-res site-res--lead">
          <span className="site-pick">پیشنهاد ویژه</span>
          <div className="site-figure">
            <img src="/lab/res-2.png" alt="جالوله‌ای پر از لوله‌های نمونهٔ خون با درپوش‌های آبی، سبز، قرمز و بنفش" loading="lazy" decoding="async" width="1024" height="1024" />
          </div>
          <h3>محدودهٔ مرجع یعنی چه؟</h3>
          <p>
            محدودهٔ مرجع مرز میان سلامت و بیماری نیست؛ بازه‌ای است که بیشتر افراد سالمِ هم‌سن
            و هم‌جنس شما در آن قرار می‌گیرند. پس عددی که کمی بیرون از این بازه باشد لزوماً
            به معنای بیماری نیست، و عددی که داخل بازه باشد هم همیشه خیال را راحت نمی‌کند.
            این نوشته توضیح می‌دهد چرا این بازه‌ها در آزمایشگاه‌های مختلف فرق می‌کنند و چطور
            باید آن‌ها را خواند.
          </p>
          <Link className="site-more" to="/tests">بیشتر بدانید ←</Link>
        </article>

        <article className="site-res">
          <div className="site-figure">
            <img src="/lab/res-3.png" alt="دستگاه آنالایزر خودکار آزمایشگاه در کنار یک نمایشگر لمسی" loading="lazy" decoding="async" width="1024" height="1024" />
          </div>
          <h3>واحدهای SI و واحدهای متعارف</h3>
          <p>
            اگر برگهٔ شما HbA1c را با mmol/mol نوشته باشد و نتیجه آن را با درصد نشان دهد، این
            دو عدد شبیه یک اشتباه به نظر می‌رسند. برای همین هر تبدیل واحدی که انجام شود، کنارِ
            عدد اصلیِ برگه نشان داده می‌شود.
          </p>
          <Link className="site-more" to="/app">بیشتر بدانید ←</Link>
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
          <img src="/lab/news.png" alt="کاروسل نمونهٔ یک دستگاه آنالایزر، پر از لوله‌های درپوش‌دار" loading="lazy" decoding="async" width="1024" height="1024" />
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
        <Link to="/app" className="btn btn--primary btn--pill">شروع تحلیل</Link>
      </div>
    </footer>
  );
}
