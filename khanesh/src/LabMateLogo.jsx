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

export function LabMateLogo({ height = 68, variant = "dark", title = BRAND_FA }) {
  const ink = variant === "light" ? "#ffffff" : NAVY;
  const sloganInk = variant === "light" ? "#e7ecf8" : "#111111";

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} title={`${title} — ${BRAND_SLOGAN}`}>
      <img
        src="/logo-transparent.png"
        alt={title}
        style={{
          height: height,
          objectFit: 'contain',
          /* زمینهٔ نشان شفاف است تا همرنگِ محیط شود. روی زمینهٔ تیره (variant="light") خطوطِ سیاهِ
             میکروسکوپ گم می‌شدند، پس رنگ‌ها وارونه و رنگ‌مایه برگردانده می‌شود. */
          filter: variant === "light" ? "invert(1) hue-rotate(180deg)" : undefined,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '6px' }}>
        <span style={{ 
          fontFamily: FA_FONT,
          fontSize: `${height * 0.45}px`,
          fontWeight: "800",
          lineHeight: 1.1,
          direction: "rtl",
          color: ink 
        }}>
          {BRAND_FA}
        </span>
        <span style={{ 
          fontFamily: FA_FONT, 
          fontSize: `${height * 0.18}px`, 
          fontWeight: "600", 
          color: sloganInk,
          direction: "rtl",
          marginTop: '4px'
        }}>
          {BRAND_SLOGAN}
        </span>
      </div>
    </div>
  );
}
