import LogoBadge, { BRAND_FA, BRAND_LATIN } from "./Logo.jsx";

const LOGO_FONT = "'Poppins', 'Segoe UI', system-ui, Arial, sans-serif";
const FA_FONT = "'Vazirmatn', system-ui, sans-serif";
export const BRAND_SLOGAN = "دستیار هوشمند تفسیر آزمایش";

export function LabMateMark({ size = 44, title }) {
  return (
    <span role="img" aria-label={title || BRAND_FA} style={{ display: "inline-flex" }}>
      <LogoBadge size={size} />
    </span>
  );
}

export function LabMateLogo({ height = 68, variant = "dark", title = BRAND_FA }) {
  const ink = variant === "light" ? "var(--on-ink)" : "var(--ink)";
  const sloganInk = variant === "light" ? "var(--on-ink-2)" : "var(--ink-2)";

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} title={`${title} — ${BRAND_SLOGAN}`}>
      <LogoBadge size={height} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '6px' }}>
        <span style={{ 
          fontFamily: LOGO_FONT, 
          fontSize: `${height * 0.45}px`, 
          fontWeight: "var(--w-bold)",
          lineHeight: 1,
          color: ink 
        }}>
          {BRAND_LATIN}
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
