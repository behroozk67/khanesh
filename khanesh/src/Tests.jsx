import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toFaDigits } from "./digits.js";
import { BRAND_FA } from "./Logo.jsx";
import { Footer, PillNav } from "./Landing.jsx";
import { GUIDES, tierLabel, catPath } from "./testCatalog.js";
import GuideCarousel from "./GuideCarousel.jsx";
import GuideIcon from "./guideIcons.jsx";
import "./site.css";

// ============================================================
// «راهنمای آزمایش‌ها» — بخش‌به‌بخش:
//
//   ۱. سربرگ با تیتر، متنِ کوتاه و عکس
//   ۲. «راهنماهای منتخب» — دو کارتِ بزرگ با بلوکِ رنگی
//   ۳. «راهنماهای بیشتر» — شبکهٔ جعبه‌ها؛ هر ۱۷ دسته
//   ۴. «آزمایش‌های پرکاربرد» روی یک نوارِ فرورفته
//   ۵. «فهرست الفبایی» — نوارِ حروف و ستون‌های حرف‌به‌حرف
//
// فهرستِ آزمایش‌های هر دسته در این صفحه تکرار نمی‌شود؛ هر جعبهٔ بخشِ ۳ به
// صفحهٔ خودش («/tests/<id>») می‌رود و آن فهرست آنجاست. یک بخشِ پنجمِ جدا که
// همان فهرست را اینجا هم بیاورد، ۱۷ دسته × ده‌ها ردیف به یک صفحهٔ بلند
// اضافه می‌کرد و با فهرستِ الفبایی دقیقاً همان آزمایش‌ها را دوباره می‌شمرد.
//
// ⚠️ بخشِ ۵ **یک حرف در هر بار** نشان می‌دهد، نه هر ۳۰۱ آزمایش را با هم. سه
//    دلیل، به همین ترتیبِ اهمیت:
//      • ۳۰۱ ردیفِ پشتِ‌هم فهرست نیست، دیوار است؛ چشم حرفِ T را پیدا نمی‌کند.
//      • حرفِ انتخاب‌شده در «?az=» می‌نشیند، پس «/tests?az=T» یک نشانیِ
//        اشتراک‌گذاشتنی است و دکمهٔ برگشتِ مرورگر کار می‌کند.
//      • بخشِ ۴ (آزمایش‌های پرکاربرد) بلافاصله بالای همین بخش است؛ دو فهرستِ
//        بلندِ پشتِ سرِ هم یعنی هیچ‌کدام خوانده نمی‌شود.
//    حالتِ پیش‌فرض «A» است و ستون‌های عددی (۱، ۲، ۵) داخلِ همان حالت‌اند —
//    هفت آزمایشِ عددی به‌تنهایی یک نمایِ کامل را نمی‌ارزند.
//
// ⚠️ **همهٔ نام‌ها لاتین نیستند.** ۱۸ ردیف (همگی از نوعِ panel) با «پنل…»،
//    «عملکرد…»، «شمارش…» شروع می‌شوند. اگر نوارِ حروف فقط A تا Z باشد، این
//    هجده تا در هیچ حالتی دیده نمی‌شوند — قبلاً ستونشان ساخته می‌شد ولی هیچ
//    حرفی در نوار به آن نمی‌رسید. برای همین یک کلیدِ «فا» در انتهای نوار هست.
//    نوار از روی خودِ داده ساخته می‌شود، پس افزودنِ آزمایشِ تازه به
//    testCatalog خودبه‌خود کلیدش را هم می‌سازد.
//
// ⚠️ مهم‌ترین نکتهٔ این صفحه: **هر آزمایشی که اینجا نوشته شده، ابزارِ ما آن را
//    تفسیر نمی‌کند.** دسته‌ها کامل آورده شده‌اند (آلرژی، سرطان، ژنتیک، اعتیاد،
//    فلزات سنگین…)، اما یک برچسبِ صریح روی تک‌تکِ آزمایش‌ها می‌گوید کدام یک از
//    سه حالت است:
//
//      form  → در فرمِ ورودِ دستی هست (REF) و صفحهٔ آزمایشِ خودش را دارد.
//      photo → موتور می‌شناسدش ولی در فرم نیست؛ از روی عکسِ برگه خوانده
//              می‌شود (کلیدش در NAME_MAP/QUALITATIVE آداپتور هست).
//      soon  → اصلاً پوشش داده نمی‌شود.
//
//    بدونِ این برچسب، صفحه به کاربر می‌گوید «آزمایش سرطان» تفسیر می‌شود و
//    نمی‌شود؛ این همان کلاسِ خطایی است که در Landing.jsx هم از آن پرهیز شد.
//    اگر روزی آزمایشی به فرم اضافه شد، برچسبش را همین‌جا به form تغییر دهید.
//
// ⚠️ **همهٔ آزمایش‌ها لینک دارند، ولی لینک به معنای پوشش نیست.** قبلاً soon و
//    photo عمداً بی‌لینک بودند تا وعدهٔ تفسیر ندهند؛ حالا صفحهٔ آموزشیِ خودشان
//    را دارند (ExtraTestPage) و همان وعده را برچسبِ کنارِ کارت و کادرِ بالای
//    آن صفحه رد می‌کند، نه نبودِ لینک. اگر روزی برچسب از کارت حذف شود، تنها
//    چیزی که «این را تفسیر نمی‌کنیم» را می‌گفت از بین می‌رود — پس برچسب
//    اختیاری نیست.
//
// ⚠️ دو چیزِ الگو عمداً کپی نشد:
//    ۱. دکمهٔ «Get Tested» — الگو آزمایش می‌فروشد، ما نمی‌فروشیم. دکمه‌ها به
//       فرمِ ورودِ عدد می‌روند و متنشان هم همین را می‌گوید.
//    ۲. عددِ «میلیاردها آزمایش در سال» — آماری است که منبعش را نخوانده‌ایم.
//
// ⚠️ آزمایش‌های form از REF خوانده می‌شوند، نه از یک کپیِ تازه؛ برچسب و
//    توضیحشان همان است که فرم نشان می‌دهد. یک آرایهٔ دستیِ دوم یعنی روزی که
//    آزمایشی به فرم اضافه شود، این صفحه بی‌صدا از آن عقب می‌ماند. اگر کلیدی
//    در REF نباشد، testCatalog در کنسول هشدار می‌دهد و COVERAGE_GAP هم می‌گوید
//    کدام آزمایشِ فرم در هیچ دسته‌ای نیامده.
//
// ⚠️ محدودهٔ مرجع اینجا **نمایش داده نمی‌شود**. REF[k].range(sex, months) بدون
//    سن و جنسیت معنا ندارد و برای چند آزمایش (کراتینین، HDL، اسید اوریک،
//    فریتین…) جواب متفاوتی می‌دهد. چاپِ یک بازهٔ بی‌صاحب روی صفحه‌ای که هیچ
//    مشخصاتی از کاربر ندارد، همان کاری است که درسِ N3 دربارهٔ عددِ بی‌زمینه
//    می‌گوید؛ به‌جایش لینک می‌رود به فرم، جایی که بازه با سن و جنسیت ساخته
//    می‌شود.
//
// لینکِ هر آزمایش به «/test/<key>» می‌رود (صفحهٔ آزمایش) و لینکِ هر جعبه به
// «/tests/<id>» (صفحهٔ دسته). دکمهٔ «وارد کردن عدد» در آن صفحه‌هاست که به
// «/?test=<key>» می‌رود و Tafsir همان خانه را باز و فوکوس می‌کند. هر سه مسیر
// در testCatalog.js تعریف شده‌اند.
// ============================================================

const BRAND = BRAND_FA;

// ---------- «راهنماهای منتخب» — نوارِ لغزان ----------
// قبلاً فقط تیروئید و آلرژی؛ حالا یک نوار از راهنماهای اصلی (GuideCarousel).
// ⚠️ توضیحِ هر کارت از خودِ GUIDES می‌آید (g.d) و شمارِ «در فرم» از tierِ
//    آیتم‌ها شمرده می‌شود — هیچ ادعای پوششی دستی نوشته نمی‌شود، چون ادعای
//    دستی روزی که آزمایشی به فرم اضافه شود بی‌صدا غلط می‌شود.
const FEATURED_IDS = [
  ["thyroid", "تیروئید", "thyroid"],
  ["allergy", "آلرژی", "allergy"],
  ["cardiac", "قلب و چربی", "heart"],
  ["vitamins", "ویتامین‌ها", "pill"],
  ["pregnancy", "بارداری", "baby"],
  ["hormone", "هورمون‌ها", "hormone"],
  ["infectious", "عفونت‌ها", "virus"],
  ["immunity", "ایمنی و واکسن", "shield"],
  ["cancer", "نشانگرهای سرطان", "ribbon"],
  ["genetic", "ژنتیک", "dna"],
];
const TONES = ["deep", "soft", "warm"];
const FEATURED = FEATURED_IDS.map(([id, k1, icon], i) => {
  const g = GUIDES.find((x) => x.id === id);
  if (!g) return null;
  const form = g.items.filter((it) => it.tier === "form").length;
  return {
    key: id, to: catPath(id), tone: TONES[i % 3], k1, k2: "راهنما", icon,
    t: g.t, d: g.d,
    meta: form
      ? `${toFaDigits(g.items.length)} آزمایش · ${toFaDigits(form)} تا در فرمِ ورودِ دستی`
      : `${toFaDigits(g.items.length)} آزمایش · فقط راهنمای آموزشی`,
  };
}).filter(Boolean);

// ---------- «آزمایش‌های پرکاربرد» — نوارِ لغزان ----------
// توضیح و برچسبِ پوشش از خودِ آیتمِ testCatalog (it.d و tierLabel) می‌آید.
const POPULAR_IDS = [
  ["cbc", "CBC", "شمارش خون", "blood"],
  ["fbs", "FBS", "قند ناشتا", "drop"],
  ["hba1c", "HbA1c", "قند سه‌ماهه", "drop"],
  ["lipid-panel", "چربی", "پروفایل لیپید", "heart"],
  ["tsh", "TSH", "تیروئید", "thyroid"],
  ["vitd", "ویتامین D", "۲۵-OH", "sun"],
  ["ferritin", "فریتین", "ذخیرهٔ آهن", "blood"],
  ["b12", "B12", "ویتامین", "pill"],
  ["cr", "کراتینین", "کلیه", "kidney"],
  ["alt", "ALT", "کبد", "liver"],
  ["u-a", "ادرار", "آزمایش کامل", "flask"],
  ["crp", "CRP", "التهاب", "stethoscope"],
];
const ITEM_BY_ID = (() => {
  const m = new Map();
  GUIDES.forEach((g) => g.items.forEach((it) => { const id = it.k || it.slug; if (!m.has(id)) m.set(id, it); }));
  return m;
})();
const POPULAR = POPULAR_IDS.map(([id, k1, k2, icon], i) => {
  const it = ITEM_BY_ID.get(id);
  if (!it) return null;
  return { key: id, to: it.to, tone: TONES[(i + 2) % 3], k1, k2, icon, t: it.n, d: it.d, meta: tierLabel(it) };
}).filter(Boolean);

// یک کارتِ گرافیکی — مشترکِ هر دو نوار.
function SlideCard({ c, cta }) {
  return (
    <article className="site-tile gc-card">
      <Link className={`site-tile-art site-tile-art--${c.tone} gc-art`} to={c.to} aria-hidden="true" tabIndex={-1}>
        <span className="gc-art-txt">
          <b>{c.k1}</b>
          <span>{c.k2}</span>
        </span>
        <GuideIcon name={c.icon} size={88} />
      </Link>
      <h3><Link to={c.to}>{c.t}</Link></h3>
      {c.d && <p>{c.d}</p>}
      {c.meta && <small className="gc-meta">{c.meta}</small>}
      <Link className="btn btn--secondary btn--pill" to={c.to}>{cta}</Link>
    </article>
  );
}

// ---------- فهرستِ الفبایی: کلیدها و سطل‌ها ----------
//
// هر کلیدِ نوار یک «سطل» است و هر سطل یک یا چند ستون دارد:
//   "A"  → ستون‌های ۱، ۲، ۵ و A   (ارقام عمداً داخلِ همین سطل‌اند)
//   "B"…"Z" → یک ستون
//   "fa" → یک ستونِ «فارسی» برای نام‌هایی که با حرفِ لاتین شروع نمی‌شوند
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const FA_KEY = "fa";
const HOME_KEY = "A";      // حالتِ پیش‌فرضِ نوار
const FA_COL = "فارسی";
const AZ_PARAM = "az";

// حرفِ اولِ نامِ لاتین («Hb (هموگلوبین)» → H، «5-HIAA» → 5). نامِ فارسی
// («پنل کبد») به سطلِ fa می‌رود، وگرنه از نوار بیرون می‌افتد.
const colOf = (label) => {
  const c = label.trim().charAt(0).toUpperCase();
  if (c >= "0" && c <= "9") return c;
  if (c >= "A" && c <= "Z") return c;
  return FA_COL;
};
const bucketOf = (col) => (col === FA_COL ? FA_KEY : col >= "A" ? col : HOME_KEY);

export default function Tests() {
  const [params, setParams] = useSearchParams();
  const azRef = useRef(null);

  // فهرستِ الفبایی = همهٔ آزمایش‌های همهٔ دسته‌ها، یکتا‌شده بر اساس نام.
  const { buckets, total } = useMemo(() => {
    const uniq = new Map();
    GUIDES.forEach((g) =>
      g.items.forEach((it) => {
        if (!uniq.has(it.n)) uniq.set(it.n, it);
      })
    );
    const rows = [...uniq.values()];

    const m = new Map(); // key → Map(colLabel → items[])
    rows.forEach((it) => {
      const col = colOf(it.n);
      const key = bucketOf(col);
      if (!m.has(key)) m.set(key, new Map());
      const cols = m.get(key);
      if (!cols.has(col)) cols.set(col, []);
      cols.get(col).push(it);
    });

    // ⚠️ مرتب‌سازیِ سطلِ fa با locale فارسی، نه en — «پنل» و «عملکرد» با
    //    ترتیبِ لاتین بی‌معنا کنارِ هم می‌نشینند.
    const out = new Map();
    [...m.entries()].forEach(([key, cols]) => {
      const loc = key === FA_KEY ? "fa" : "en";
      const sorted = [...cols.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], loc))
        .map(([col, list]) => [col, list.sort((a, b) => a.n.localeCompare(b.n, loc))]);
      out.set(key, sorted);
    });
    return { buckets: out, total: rows.length, rows };
  }, []);

  // جستجوی میانِ صفحه حذف شد (بالای فایل)؛ `rows` همچنان پایهٔ سطل‌های الفبایی است.

  // کلیدِ نامعتبر در نشانی (?az=ZZ) به حالتِ پیش‌فرض برمی‌گردد، نه به صفحهٔ خالی.
  const asked = (params.get(AZ_PARAM) || "").trim();
  const wanted = asked.toLowerCase() === FA_KEY ? FA_KEY : asked.toUpperCase();
  const selected = buckets.has(wanted) ? wanted : HOME_KEY;
  const cols = buckets.get(selected) || [];

  const pick = useCallback(
    (key) => {
      const next = new URLSearchParams(params);
      if (key === HOME_KEY) next.delete(AZ_PARAM);
      else next.set(AZ_PARAM, key);
      // preventScrollReset: نوار همان‌جا که هست بماند؛ پرشِ صفحه به بالا
      // بعد از کلیک روی یک حرف، حرفِ انتخاب‌شده را از دید خارج می‌کند.
      setParams(next, { preventScrollReset: true });
    },
    [params, setParams]
  );

  // ورودِ مستقیم به «/tests?az=T»: بخشِ الفبایی انتهای یک صفحهٔ بلند است و
  // کاربر بالای صفحه فرود می‌آید بی‌آنکه بداند چرا لینک را باز کرده.
  useEffect(() => {
    if (!params.get(AZ_PARAM)) return;
    azRef.current?.scrollIntoView({ block: "start" });
    // فقط یک بار، هنگامِ ورود — نه با هر کلیکِ بعدی روی نوار.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // site--pill: جایِ نوارِ کپسولیِ fixed را از بالای صفحه کنار می‌گذارد
    // (قواعدش در انتهای site.css، کنارِ خودِ نوار).
    // site--lab-bg: فقط زمینه — آبیِ آزمایشگاهیِ روشن با مارپیچِ تار (public/lab/tests-helix.svg، ساختِ خودمان)
    <div className="site site--pill site--lab-bg" dir="rtl">
      <PillNav withSearch page />

      {/* ---------- ۱. سربرگ ---------- */}
      <header className="site-wrap site-hero">
        <div className="site-hero-grid">
          <div>
            <h1>دربارهٔ آزمایش‌های آزمایشگاهی بیشتر بدانید</h1>
            <p className="site-hero-lede">
              آزمایش آزمایشگاهی برای غربالگری، تشخیص و پیگیریِ بیماری‌ها انجام می‌شود، اما
              برگه‌ای که به دستتان می‌دهند معمولاً چیزی جز عدد و محدوده نیست. راهنماهای این
              صفحه می‌گویند هر آزمایش چه چیزی را می‌سنجد و چرا درخواست می‌شود.
            </p>
            <div className="site-intro">
              <p className="site-intro-fine">
                هر آزمایشِ این فهرست راهنمای خودش را دارد، اما کنارِ هر کدام نوشته شده که
                {" "}{BRAND} آن را تفسیر می‌کند یا نه: بعضی در فرمِ ورودِ دستی هستند، بعضی فقط
                از روی عکسِ برگه خوانده می‌شوند و بقیه هنوز پوشش داده نمی‌شوند و صفحه‌شان فقط
                توضیحِ آموزشی است.
              </p>
            </div>
          </div>
          {/* ابعاد = ابعادِ واقعیِ فایل (۹۰۰×۹۰۰)، نه عددِ دل‌بخواه */}
          <div className="site-figure site-figure--hero">
            <img
              src="/lab/tests-hero.webp"
              alt="برگهٔ آزمایش، دو لولهٔ نمونهٔ خون و تبلتی که نتیجهٔ آزمایش را با نوارِ محدودهٔ مرجع نشان می‌دهد"
              width="1800" height="1005" decoding="async" fetchPriority="high"
            />
          </div>
        </div>
      </header>

      {/* جستجوی آزمایشِ میانِ صفحه حذف شد: خانهٔ جستجوی داخلِ نوارِ کپسولی
          (PillNav) تنها نقطهٔ جستجوست؛ دو ورودیِ هم‌نام در یک صفحه، نتیجه را
          بین دو فهرست تقسیم می‌کرد و «کدام سرچ؟» را از کاربر می‌پرسید. */}

      {/* ---------- ۲. راهنماهای منتخب ---------- */}
      <section className="site-wrap site-sec">
        <h2 className="site-h2">راهنماهای منتخب</h2>
        <GuideCarousel
          label="راهنماهای منتخب"
          items={FEATURED}
          getKey={(c) => c.key}
          renderItem={(c) => <SlideCard c={c} cta="دیدن راهنما" />}
        />
      </section>

      {/* ---------- ۳. جعبه‌های راهنما ---------- */}
      <section className="site-wrap site-sec">
        <h2 className="site-h2">راهنماهای بیشتر</h2>
        <nav className="site-cats" aria-label="فهرست راهنماها">
          {GUIDES.map((g) => (
            <Link className="site-cat" key={g.id} to={catPath(g.id)}>{g.t}</Link>
          ))}
        </nav>
      </section>

      {/* ---------- ۴. آزمایش‌های پرکاربرد ---------- */}
      <section className="site-basis">
        <div className="site-wrap site-sec">
          <h2 className="site-h2">آزمایش‌های پرکاربرد</h2>
          <GuideCarousel
            label="آزمایش‌های پرکاربرد"
            items={POPULAR}
            getKey={(c) => c.key}
            renderItem={(c) => <SlideCard c={c} cta="دیدن راهنما" />}
          />
        </div>
      </section>

      {/* ---------- ۵. فهرست الفبایی ---------- */}
      <section className="site-wrap site-sec" ref={azRef}>
        <h2 className="site-h2">آزمایش‌ها از A تا Z</h2>
        <p className="site-lede">
          نامِ بیشترِ آزمایش‌ها روی برگه‌های آزمایشگاه لاتین چاپ می‌شود، پس فهرست هم بر پایهٔ
          همان نامِ لاتین مرتب شده است. {toFaDigits(total)} آزمایش در این فهرست هست و هر کدام
          راهنمای خودش را دارد؛ یک حرف را انتخاب کنید تا آزمایش‌هایش را ببینید. نام‌های
          پررنگ همان‌هایی‌اند که می‌توانید عددشان را در فرمِ ورودِ دستی وارد کنید.
        </p>

        <nav className="site-az-strip" aria-label="انتخابِ حرفِ اولِ نامِ آزمایش">
          {[HOME_KEY, ...ABC.filter((L) => L !== HOME_KEY), FA_KEY].map((key) => {
            const b = buckets.get(key);
            if (!b) {
              // «فا» فقط وقتی معنا دارد که نامِ فارسی‌ای در فهرست باشد.
              if (key === FA_KEY) return null;
              // حرفی که هیچ آزمایشی ندارد: دیده می‌شود تا نوار نپرد، ولی کلیدی نیست.
              return (
                <span className="site-az-key is-off" key={key} aria-hidden="true">
                  {key}
                </span>
              );
            }
            // برچسب از خودِ داده می‌آید: سطلِ A برچسبِ «1 2 5 A» می‌گیرد.
            const label = key === FA_KEY ? "فا" : b.map(([c]) => c).join(" ");
            const n = b.reduce((s, [, r]) => s + r.length, 0);
            const on = key === selected;
            return (
              <button
                type="button"
                className={`site-az-key${on ? " is-on" : ""}`}
                key={key}
                /* ⚠️ dir="ltr" روی برچسبِ لاتین. «1 2 5 A» در بندِ RTL چهار
                   دنبالهٔ جدا با فاصلهٔ خنثی است، پس الگوریتمِ دوجهته آن‌ها را
                   راست‌به‌چپ می‌چیند و کاربر «A 5 2 1» می‌بیند — همان کلید،
                   با ترتیبِ وارونه. تک‌حرفی‌ها اتفاقی درست بودند. */
                dir={key === FA_KEY ? undefined : "ltr"}
                aria-pressed={on}
                title={`${toFaDigits(n)} آزمایش`}
                aria-label={
                  key === FA_KEY
                    ? `آزمایش‌هایی با نامِ فارسی — ${toFaDigits(n)} آزمایش`
                    : `حرفِ ${label} — ${toFaDigits(n)} آزمایش`
                }
                onClick={() => pick(key)}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* key={selected} — با هر تعویضِ حرف، شبکه از نو سوار می‌شود تا
            انیمیشنِ ورود دوباره اجرا شود. محتوا از پیش در DOM است؛ انیمیشن
            فقط تعویض را روایت می‌کند و با prefers-reduced-motion خاموش است. */}
        <div className="site-az-grid site-az-grid--cards" key={selected}>
          {cols.map(([L, rows]) => (
            <section
              className="site-az-col"
              key={L}
              aria-labelledby={`azh-${L}`}
            >
              <h3 id={`azh-${L}`}>
                {L}
                <i>{toFaDigits(rows.length)}</i>
              </h3>
              <ul className="site-tests">
                {rows.map((it) => (
                  <li key={it.n}>
                    <Link
                      className={`site-test${it.tier === "form" ? "" : " site-test--info"}`}
                      to={it.to}
                    >
                      <b>
                        {it.n}
                        {it.u && <i>{it.u}</i>}
                      </b>
                      {it.d && <p>{it.d}</p>}
                      <em className={`site-t-${it.tier}`}>
                        {tierLabel(it) ? `${tierLabel(it)} — راهنما ←` : "راهنمای آزمایش ←"}
                      </em>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="site-note">
          محدودهٔ مرجعِ هر آزمایش به سن و جنسیت بستگی دارد، بنابراین در همین فهرست نوشته
          نشده است؛ وقتی مشخصاتتان را در فرم وارد کنید، بازهٔ متناسب با خودتان کنار هر عدد
          نشان داده می‌شود. {BRAND} جای پزشک را نمی‌گیرد و تشخیص نمی‌دهد.
        </p>

        <Link to="/app" className="btn btn--primary btn--pill btn--lg site-az-cta">
          شروع تحلیل برگهٔ آزمایش
        </Link>
      </section>

      <Footer />
      <ToTop />
    </div>
  );
}

// دکمهٔ «برو بالا». صفحه پنج بخش دارد و نوارِ حروف وسطِ آن است؛ بعد از باز
// کردنِ یک حرف، راهِ برگشت به نوار (و به سرصفحهٔ چسبان) اسکرولِ دستیِ بلند
// است. ⚠️ با visibility پنهان می‌شود، نه با opacity به‌تنهایی: دکمهٔ نامرئیِ
// با opacity:0 هنوز در ترتیبِ Tab و در درختِ دسترسی هست.
function ToTop() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const onScroll = () => setOn(window.scrollY > 900); /* بُعد: حدودِ یک نمای کامل */
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`site-totop${on ? " is-on" : ""}`}
      aria-label="بازگشت به بالای صفحه"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
    >
      {/* پیکانِ رو به بالا. ابعاد = viewBox، نه عددِ دل‌بخواه. */}
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <path
          d="M12 19V5M12 5l-6 6M12 5l6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
