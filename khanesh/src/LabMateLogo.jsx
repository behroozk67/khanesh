import { BRAND_FA } from "./Logo.jsx";

const NAVY = "#0B162C";
const FA_FONT = "'Vazirmatn', system-ui, sans-serif";
export const BRAND_SLOGAN = "دستیار تفسیر آزمایش";

export function LabMateMark({ size = 44, title }) {
  return (
    <img 
      src="/logo-transparent.png" 
      alt={title || "Logo"} 
      style={{ width: size, height: size, objectFit: 'contain' }} 
    />
  );
}

export function LabMateLogo({ height = 68, variant = "dark", title = BRAND_FA, hideText = false }) {
  const ink = variant === "light" ? "#ffffff" : NAVY;
  const sloganInk = variant === "light" ? "#e7ecf8" : "#1e293b";

  // اندازه از متغیرِ CSS (--lml-h / --lml-gap) با پیش‌فرضِ همین prop: نوارِ کپسولی روی گوشی کوچکش می‌کند
  // (site.css)، وگرنه inline style بر هر قاعدهٔ CSS می‌چربید و دکمهٔ «تحلیل نتایج من» از کادر بیرون می‌زد.
  const h = `var(--lml-h, ${height}px)`;
  return (
    <div className="lml" style={{ display: 'flex', alignItems: 'center', gap: 'var(--lml-gap, 16px)' }} title={`${title} — ${BRAND_SLOGAN}`}>
      <img
        src="/logo-transparent.png"
        alt={title}
        style={{
          height: h,
          objectFit: 'contain',
          /* زمینهٔ نشان شفاف است تا همرنگِ محیط شود. روی زمینهٔ تیره (variant="light") خطوطِ سیاهِ
             میکروسکوپ گم می‌شدند، پس رنگ‌ها وارونه و رنگ‌مایه برگردانده می‌شود. */
          filter: variant === "light" ? "invert(1) hue-rotate(180deg)" : undefined,
        }}
      />
      {!hideText && <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '6px' }}>
        <span style={{ 
          fontFamily: FA_FONT,
          fontSize: `calc(${h} * 0.45)`,
          fontWeight: "800",
          lineHeight: 1.1,
          direction: "rtl",
          whiteSpace: "nowrap", // «آزمایار اپ» دوکلمه‌ای است و در هدرِ صفحه‌های محتوا دوخطی می‌شد
          color: ink
        }}>
          {BRAND_FA}
        </span>
        <span className="lml-slogan" style={{ 
          fontFamily: FA_FONT, 
          fontSize: `calc(${h} * 0.18)`, 
          fontWeight: "700", 
          color: sloganInk,
          direction: "rtl",
          whiteSpace: "nowrap",
          marginTop: '4px'
        }}>
          {BRAND_SLOGAN}
        </span>
      </div>}
    </div>
  );
}
