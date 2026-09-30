// ============================================================
// نشانِ دایره‌ای — تنها دارایی‌ای که از Landing.jsx نجات داده شد.
// (خودِ Landing.jsx در این بازطراحی حذف شد: از وقتی "/" را خودِ ابزار
//  گرفت، هیچ مسیری به آن نمی‌رفت و فقط یک کپیِ دومِ همین نشان را داشت.)
//
// ✅ تصمیمِ برند: برند «LabMate» است و املای لاتینش در نشان LABMATE.
//    تاریخچه‌اش را عمداً اینجا نگه می‌داریم تا کسی دوباره برشگرداند: اول
//    نشان «LABMATE» می‌گفت و هدرِ ابزار «خوانش» — دو برند در یک اپ. یک‌بار
//    روی «خوانش» یکی شد و حالا به خواستِ صاحبِ محصول روی «LabMate» یکی
//    شده است. نکتهٔ ماندگار همان است: هدرِ Tafsir هم BRAND_FA را از همین‌جا
//    می‌خواند، پس این فایل تنها منبعِ نامِ برند است و دو اسم نمی‌توانند از
//    هم جدا بیفتند. اگر روزی برند عوض شد، فقط همین دو خط + <title> در
//    index.html عوض می‌شود.
// ============================================================

// نامِ برند لاتین است حتی در متنِ فارسی — همان کاری که صفحهٔ فرودِ اصلی
// می‌کرد («چرا LabMate؟»). یک واژهٔ لاتینِ تنها داخلِ بندِ RTL مشکلِ
// دوجهته‌نویسی نمی‌سازد، چون علامتِ چسبیده‌ای کنارش نیست.
export const BRAND_FA = "LabMate";
export const BRAND_LATIN = "LABMATE";

// ⚠️ این نشان تا امروز پالتِ خودش را داشت — سرمه‌ای #1b3a5c و آبی #0F6C81 —
//    که هیچ نسبتی با برندِ سبزآبیِ اپ (--brand) نداشت. یعنی دقیقاً همان
//    اتفاقی که سرِ *نامِ* برند افتاده بود (LABMATE در نشان، «خوانش» در هدر)
//    یک‌بار دیگر سرِ *رنگِ* برند تکرار شده بود. حالا نشان از همان توکن‌های
//    index.css می‌خواند، پس نمی‌تواند دوباره از اپ جدا بیفتد.
//    (fill/stroke خاصیت‌های CSSاند، پس var() داخلشان کار می‌کند.)
const teal = "var(--brand)";
const mark = "var(--brand)";
const ink = "var(--ink)";
const inkSoft = "var(--ink-2)";

export default function LogoBadge({ size = 170 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" aria-label={BRAND_FA}>
      <defs>
        <path id="arcTop" d="M 100,100 m -80,0 a 80,80 0 0,1 160,0" />
      </defs>

      {/* حلقه بیرونی */}
      <circle cx="100" cy="100" r="88" stroke={ink} strokeWidth="2.5" fill="none" />
      <circle cx="100" cy="100" r="72" stroke={teal} strokeWidth="1.5" fill="none" opacity="0.5" />

      {/* متن حلقوی بالا */}
      <text fill={ink} fontSize="11" fontWeight="700" letterSpacing="2.5">
        <textPath href="#arcTop" startOffset="50%" textAnchor="middle">
          {`${BRAND_LATIN} • هوشمند • دقیق`}
        </textPath>
      </text>

      {/* نقطه‌های جداکننده کناری */}
      <circle cx="14" cy="100" r="2.5" fill={teal} />
      <circle cx="186" cy="100" r="2.5" fill={teal} />

      {/* ===== لوگوتایپ: لوله آزمایش = L ===== */}
      <g transform="translate(100,96) scale(0.205) translate(-373,-115)">
        <g fill="none" stroke={mark} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <line x1="86" y1="62" x2="130" y2="62" />
          <path d="M92 62 V150 a16 16 0 0 0 16 16 H188" />
          <path d="M124 62 V128" />
          <line x1="94" y1="112" x2="122" y2="112" strokeWidth="4" opacity="0.5" />
        </g>

        <g fill={mark}>
          <circle cx="108" cy="140" r="6" />
          <circle cx="115" cy="124" r="3.4" />
          <circle cx="103" cy="118" r="2.2" />
        </g>

        <g fill="none" stroke={mark} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="226" cy="140" r="26" />
          <line x1="252" y1="114" x2="252" y2="166" />
          <line x1="292" y1="60" x2="292" y2="166" />
          <circle cx="318" cy="140" r="26" />
          <path d="M374 166 V96 l30 44 l30 -44 v70" />
          <circle cx="490" cy="140" r="26" />
          <line x1="516" y1="114" x2="516" y2="166" />
          <path d="M556 88 V152 a14 14 0 0 0 14 14" />
          <line x1="540" y1="114" x2="576" y2="114" />
          <path d="M596 140 h52 a26 26 0 1 0 -8 18" />
        </g>
      </g>

      {/* خط جداکننده کوتاه */}
      <line x1="66" y1="136" x2="134" y2="136" stroke={teal} strokeWidth="1.5" strokeLinecap="round" />

      {/* زیرنویس فارسی */}
      <text x="100" y="151" textAnchor="middle" fill={inkSoft} fontSize="8.5" fontWeight="600">
        همراه و راهنمای هوشمند
      </text>
      <text x="100" y="162" textAnchor="middle" fill={inkSoft} fontSize="8.5" fontWeight="600">
        نتایج آزمایش
      </text>
    </svg>
  );
}
