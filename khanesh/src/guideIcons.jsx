// ============================================================
// آیکون‌های خطیِ کارت‌های «راهنماهای منتخب» و «آزمایش‌های پرکاربرد».
// ساختِ خودمان (بدونِ کتابخانه و بدونِ مجوزِ جدا). یک viewBox (۶۴×۶۴)، یک
// ضخامتِ خط، رنگ از currentColor — تا روی هر سه تُنِ کارت درست بنشیند.
// تزئینی‌اند (aria-hidden)؛ معنای کارت در متنِ کنارش است.
// ============================================================

const P = {
  thyroid: (
    <>
      <path d="M32 18v10" />
      <path d="M32 28c-4-8-16-10-18 2-2 10 4 18 10 18 5 0 8-4 8-10" />
      <path d="M32 28c4-8 16-10 18 2 2 10-4 18-10 18-5 0-8-4-8-10" />
      <path d="M26 40h12" />
    </>
  ),
  allergy: (
    <>
      <circle cx="32" cy="32" r="6" />
      <path d="M32 14v8M32 42v8M14 32h8M42 32h8M19 19l6 6M39 39l6 6M45 19l-6 6M25 39l-6 6" />
      <circle cx="32" cy="12" r="2" /><circle cx="32" cy="52" r="2" /><circle cx="12" cy="32" r="2" /><circle cx="52" cy="32" r="2" />
    </>
  ),
  heart: (
    <>
      <path d="M32 50S12 38 12 24c0-7 5-12 11-12 4 0 7 2 9 6 2-4 5-6 9-6 6 0 11 5 11 12 0 14-20 26-20 26z" />
      <path d="M16 30h9l3-6 5 12 3-6h12" />
    </>
  ),
  pill: (
    <>
      <rect x="10" y="24" width="44" height="16" rx="8" transform="rotate(-35 32 32)" />
      <path d="M26 21l12 22" />
    </>
  ),
  baby: (
    <>
      <circle cx="32" cy="22" r="9" />
      <path d="M18 52c0-9 6-16 14-16s14 7 14 16" />
      <path d="M29 22h.01M35 22h.01M30 26c1 1 3 1 4 0" />
    </>
  ),
  hormone: (
    <>
      <path d="M22 14h20M26 14v12L14 46c-2 4 1 6 4 6h28c3 0 6-2 4-6L38 26V14" />
      <path d="M19 40h26" />
      <circle cx="28" cy="46" r="1.5" /><circle cx="36" cy="44" r="1.5" />
    </>
  ),
  virus: (
    <>
      <circle cx="32" cy="32" r="12" />
      <path d="M32 12v8M32 44v8M12 32h8M44 32h8M18 18l6 6M40 40l6 6M46 18l-6 6M24 40l-6 6" />
      <circle cx="28" cy="29" r="2" /><circle cx="36" cy="35" r="2" />
    </>
  ),
  ribbon: (
    <>
      <path d="M32 30c-6-6-8-12-4-16 2-2 6-2 8 0 4 4 2 10-4 16z" />
      <path d="M32 30L20 52l-2-8-6 2 14-22M32 30l12 22 2-8 6 2-14-22" />
    </>
  ),
  dna: (
    <>
      <path d="M22 10c0 14 20 16 20 30s-20 14-20 14" />
      <path d="M42 10c0 14-20 16-20 30s20 14 20 14" />
      <path d="M25 18h14M24 32h16M25 46h14" />
    </>
  ),
  shield: (
    <>
      <path d="M32 10l18 7v13c0 12-8 20-18 24-10-4-18-12-18-24V17z" />
      <path d="M24 32l6 6 11-12" />
    </>
  ),
  drop: (
    <>
      <path d="M32 10C24 22 18 30 18 38a14 14 0 0 0 28 0c0-8-6-16-14-28z" />
      <path d="M26 40a6 6 0 0 0 6 6" />
    </>
  ),
  blood: (
    <>
      <circle cx="24" cy="26" r="10" /><circle cx="24" cy="26" r="4" />
      <circle cx="42" cy="40" r="10" /><circle cx="42" cy="40" r="4" />
    </>
  ),
  kidney: (
    <>
      <path d="M38 12c-10 0-18 8-18 20s8 20 18 20c6 0 10-4 10-9 0-4-3-6-6-8 3-2 6-5 6-10 0-8-4-13-10-13z" />
      <path d="M30 32h-10v20" />
    </>
  ),
  liver: (
    <>
      <path d="M10 26c0-8 8-12 20-12 14 0 24 4 24 12 0 10-10 22-26 22-6 0-8-4-8-8 0-6-10-6-10-14z" />
      <path d="M32 14c-2 10 0 18 6 24" />
    </>
  ),
  sun: (
    <>
      <circle cx="32" cy="32" r="10" />
      <path d="M32 10v6M32 48v6M10 32h6M48 32h6M16 16l4 4M44 44l4 4M48 16l-4 4M20 44l-4 4" />
    </>
  ),
  flask: (
    <>
      <path d="M26 10h12M28 10v14L16 48c-2 3 0 6 3 6h26c3 0 5-3 3-6L36 24V10" />
      <path d="M20 40h24" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M18 10v14a10 10 0 0 0 20 0V10" />
      <path d="M28 34v6a10 10 0 0 0 20 0v-4" />
      <circle cx="48" cy="32" r="4" />
    </>
  ),
};

export default function GuideIcon({ name, size = 72 }) {
  const body = P[name] || P.flask;
  return (
    <svg
      className="gc-ic"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  );
}
