import { useParams, Navigate } from "react-router-dom";
import Guide from "./Guide.jsx";
import { toFaDigits } from "./digits.js";
import { guideById, TIER } from "./testCatalog.js";
import { CATEGORY_PAGES, SYMPTOMS } from "./guideContent.js";

// صفحهٔ یک دستهٔ آزمایش — «/tests/<id>».
//
// محتوا از دو جا می‌آید و عمداً از دو جا:
//   guideContent.js → متنِ مقاله (تعریف، نقش، هزینه، نمونه، تفسیر، منابع)
//   testCatalog.js  → فهرستِ آزمایش‌های همان دسته
// اگر فهرست هم داخلِ متن نوشته می‌شد، صفحهٔ «راهنمای آزمایش‌ها» و این صفحه
// دو فهرستِ واگرا پیدا می‌کردند.
export default function CategoryPage() {
  const { cat } = useParams();
  const g = guideById(cat);
  const c = CATEGORY_PAGES[cat];

  // شناسهٔ ناشناخته → برگشت به فهرست، نه صفحهٔ خالی
  if (!g || !c) return <Navigate to="/tests" replace />;

  // بخشِ «چه علائمی به این آزمایش‌ها می‌رسند؟» — از SYMPTOMS می‌آید و نه از
  // خودِ صفحه، تا هر ۱۷ دسته یک قالب و یک هشدارِ پایانی داشته باشند.
  const sx = SYMPTOMS[cat];

  const content = {
    ...c,
    blocks: sx
      ? [...(c.blocks || []), { h2: sx.h, p: sx.p, ul: sx.ul, note: sx.note }]
      : c.blocks,
    more: {
      h: c.more?.h || `آزمایش‌های بیشتر در این دسته (${toFaDigits(g.items.length)})`,
      items: g.items.map((it) => ({
        n: it.n,
        // هر آیتم صفحه‌ای دارد: آزمایشِ فرم → TestPage، بقیه → ExtraTestPage،
        // پنل → صفحهٔ همان دسته. `hint` وضعیتِ پوشش را نگه می‌دارد، چون لینک
        // داشتن دیگر معنایش «تفسیر می‌شود» نیست.
        to: it.to,
        hint: it.tier === "form" ? undefined : TIER[it.tier],
      })),
    },
  };

  return <Guide c={content} />;
}
