// عددِ بالینی همیشه لاتین و LTR: بیمار باید عددِ روی کاغذ را عیناً پیدا کند.
// بدون isolate، بازه («4.4–11») و تیتر («1/320») در متنِ RTL وارونه می‌شوند.
// کلاسِ .num در index.css هم tabular-nums را می‌گذارد تا ستونِ مقادیر
// هم‌عرض بماند — ستونِ ناهم‌عرض خودش خطای خواندن می‌سازد.
export default function Num({ children }) {
  return <span className="num">{children}</span>;
}
