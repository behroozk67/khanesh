import { useId } from "react";
import { BRAND_FA } from "./Logo.jsx";

// ============================================================
// نشانِ LabMate — فلاسکِ آزمایشگاهی که گوشیِ پزشکی دورش پیچیده.
//
// طرح از روی یک نشانِ مرجع «آزمایشگاه پزشکی» بازکشیده شده، نه کپی‌شده:
// همان ایده (فلاسکِ گردنِ قرمز + مایعِ آبی + حباب + گوشیِ سرمه‌ای + لوگوتایپِ
// دورنگ) با مختصاتِ خودمان دوباره رسم شده. تصویرِ مرجع واترمارکِ بانکِ تصویر
// داشت، پس ردیابیِ خودِ فایل انجام نشد.
//
// ⚠️ نامِ برند از Logo.jsx می‌آید — همان قاعدهٔ همیشگی: یک منبع برای نام.
//    شعار عمداً انگلیسی است چون بخشی از خودِ نشان است، نه متنِ رابط.
//
// ⚠️ شناسه‌های clipPath با useId ساخته می‌شوند. اگر ثابت بودند، رندرِ دوم
//    نشان (هدر + فوتر) شناسهٔ تکراری می‌ساخت و کلیپِ اولی روی دومی می‌افتاد.
// ============================================================

const NAVY = "#16256b";
const RED = "#cc2229";
const CYAN = "#29a8dd";

// شعارِ زیرِ لوگوتایپ، به خواستِ صاحبِ محصول. فارسی است و بخشی از خودِ نشان،
// نه متنِ رابط — پس اینجا زندگی می‌کند و نه در متنِ صفحه.
// ⚠️ اگر عوض شد، طولش را بسنجید: دو خطِ کوتاهِ کنارِ آن (x=313–347 و 743–777)
//    برای همین اندازه ثابت شده‌اند و متنِ خیلی بلندتر از زیرشان بیرون می‌زند.
export const BRAND_SLOGAN = "دستیار هوشمند تفسیر آزمایش";

// فونتِ لوگوتایپ. Poppins (SIL OFL 1.1) زیرمجموعهٔ لاتین، خودمیزبان در
// public/fonts — همان کاری که با Vazirmatn شده. هندسی و گرد است و کنارِ
// Vazirmatn می‌نشیند بی‌آنکه از آن جدا بیفتد.
const LOGO_FONT = "'Poppins', 'Segoe UI', system-ui, Arial, sans-serif";
const FA_FONT = "'Vazirmatn', system-ui, sans-serif";

// نشانِ تنها (بدون لوگوتایپ) — برای جاهایی که فقط آیکن لازم است.
export function LabMateMark({ size = 44, title }) {
  const uid = useId();
  const clip = `lm-clip-${uid}`;
  return (
    <svg
      viewBox="0 0 300 210"
      width={size * (300 / 210)}
      height={size}
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : "true"}
    >
      <FlaskAndScope clip={clip} />
    </svg>
  );
}

// قفلِ کاملِ نشان: فلاسک + «LabMate» + شعار.
export function LabMateLogo({ height = 68, variant = "dark", title = BRAND_FA }) {
  const uid = useId();
  const clip = `lm-clip-${uid}`;
  const gradCyan = `grad-cyan-${uid}`;
  const ink = variant === "light" ? "#ffffff" : NAVY;
  const rule = variant === "light" ? "#ffffff" : "#111111";
  const sloganInk = variant === "light" ? "#e7ecf8" : "#111111";

  return (
    <svg
      viewBox="0 0 790 210"
      height={height}
      width={height * (790 / 210)}
      role="img"
      aria-label={`${title} — ${BRAND_SLOGAN}`}
    >
      <defs>
        <linearGradient id={gradCyan} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#29a8dd" />
          <stop offset="100%" stopColor="#0a69a3" />
        </linearGradient>
      </defs>
      <FlaskAndScope clip={clip} onDark={variant === "light"} gradCyan={`url(#${gradCyan})`} />

      {/* لوگوتایپِ دورنگ با استایل بهبودیافته و گرادیان */}
      <text
        x="545" y="112" textAnchor="middle"
        fontFamily={LOGO_FONT} fontSize="76" fontWeight="700" letterSpacing="-1"
      >
        <tspan fill={ink}>Lab</tspan><tspan fill={`url(#${gradCyan})`}>Mate</tspan>
      </text>

      {/* شعارِ فارسی میانِ دو خطِ کوتاه. */}
      <line x1="313" y1="163" x2="347" y2="163" stroke={rule} strokeWidth="6" />
      <line x1="743" y1="163" x2="777" y2="163" stroke={rule} strokeWidth="6" />
      <text
        x="545" y="174" textAnchor="middle" direction="rtl"
        fontFamily={FA_FONT} fontSize="30" fontWeight="600" fill={sloganInk}
      >
        {BRAND_SLOGAN}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* خودِ نقش: فلاسک + گوشی. مختصات نسبت به viewBox «0 0 300 200».        */
/* ------------------------------------------------------------------ */
function FlaskAndScope({ clip, onDark = false, gradCyan = CYAN }) {
  const scope = onDark ? "#ffffff" : NAVY;
  const chestRing = onDark ? NAVY : "#ffffff";
  return (
    <g>
      {/* حباب‌هایی که از دهانهٔ فلاسک بالا می‌روند */}
      <g fill={gradCyan}>
        <circle cx="98" cy="26" r="9" />
        <circle cx="82" cy="15" r="5" />
        <circle cx="106" cy="7" r="3.4" />
      </g>

      {/* مایعِ آبی با سطحِ موج‌دار و حبابِ سفید — داخلِ بدنه بریده می‌شود */}
      <clipPath id={clip}>
        <circle cx="95" cy="128" r="41" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <path
          d="M 50 126 C 64 112, 76 141, 95 133 C 114 125, 124 139, 140 126 L 140 176 L 50 176 Z"
          fill={gradCyan}
        />
        <g fill="#ffffff">
          <circle cx="73" cy="150" r="5" />
          <circle cx="89" cy="165" r="3.4" />
          <circle cx="105" cy="152" r="2.4" />
        </g>
      </g>

      {/* حباب‌های داخلِ گردن */}
      <g fill={gradCyan}>
        <circle cx="95" cy="108" r="4" />
        <circle cx="87" cy="93" r="2.8" />
        <circle cx="100" cy="80" r="2.2" />
      </g>

      {/* قابِ قرمز: لبه، دو دیوارهٔ گردن، و شانه‌ها تا خطِ استوای بدنه */}
      <g fill="none" stroke={RED} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 70 40 H 120" />
        <path d="M 79 44 V 84 A 48 48 0 0 0 47 128" />
        <path d="M 111 44 V 84 A 48 48 0 0 1 143 128" />
      </g>

      {/* گوشیِ پزشکی: لوله دورِ بدنه می‌پیچد و بعد به سمتِ راست بالا می‌رود */}
      <g fill="none" stroke={scope} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 49.7 106.9 A 50 50 0 1 0 143.3 140.9" />
        <path d="M 143.3 140.9 C 168 170, 202 170, 214 138 C 226 106, 224 74, 244 66" />
      </g>

      {/* سرِ گوشی */}
      <circle cx="268" cy="62" r="27" fill={scope} />
      <circle cx="268" cy="62" r="17" fill="none" stroke={chestRing} strokeWidth="6" />
    </g>
  );
}
