// تنها منبعِ فهرستِ صفحه‌های عمومی و ایندکس‌شدنیِ سایت.
// هم sitemap (gen-sitemap.mjs) و هم پیش‌رندر (gen-static-heads.mjs) از همین می‌خوانند،
// تا دیگر یکی صفحه‌ای را بسازد که دیگری از آن خبر ندارد (پیش‌تر /pricing چنین بود).
import { GUIDES, testPath, catPath } from "../src/testCatalog.js";

// صفحه‌های ثابت + فایل‌هایی که محتوایشان از آن‌ها می‌آید (برای lastmod).
export const STATIC_PAGES = [
  { path: "/", sources: ["src/Landing.jsx", "src/landingFaqData.jsx"] },
  { path: "/tests", sources: ["src/Tests.jsx", "src/testCatalog.js"] },
  { path: "/reference-ranges", sources: ["src/ReferenceRanges.jsx"] },
  { path: "/units-guide", sources: ["src/UnitsGuide.jsx"] },
  { path: "/how-to-capture", sources: ["src/HowToCapture.jsx"] },
  { path: "/methodology", sources: ["src/Methodology.jsx"] },
  { path: "/contact", sources: ["src/ContactPage.jsx"] },
  { path: "/terms", sources: ["src/TermsPage.jsx"] },
  { path: "/privacy", sources: ["src/PrivacyPage.jsx"] },
  { path: "/pricing", sources: ["src/PricingPage.jsx", "src/LandingPricing.jsx"] },
];

const CATEGORY_SOURCES = ["src/CategoryPage.jsx", "src/guideContent.js", "src/testCatalog.js"];
const TEST_SOURCES = [
  "src/TestPage.jsx",
  "src/ExtraTestPage.jsx",
  "src/labRefs.js",
  "src/testCatalog.js",
  "src/testContent.js",
  "src/content",
];

// مسیرهایی که عمداً در sitemap نیستند (خصوصی، تراکنشی یا تغییرمسیر).
// تستِ sitemap هر Route تازه در App.jsx را که نه اینجا باشد نه در فهرستِ عمومی، رد می‌کند.
export const EXCLUDED_PREFIXES = ["/app", "/signin", "/profile", "/history", "/payment", "/tafsir", "/landing"];

/** کلیدِ همهٔ صفحه‌های تک‌آزمایش، یکتا و مرتب. */
export function testKeys() {
  const keys = new Set();
  for (const g of GUIDES) for (const i of g.items) keys.add(i.k || i.slug);
  return [...keys].sort();
}

/** همهٔ صفحه‌های عمومی: [{ path, kind, sources }] — یکتا، با ترتیبِ پایدار. */
export function publicRoutes() {
  const out = [];
  const seen = new Set();
  const add = (path, kind, sources) => {
    if (seen.has(path)) return;
    seen.add(path);
    out.push({ path, kind, sources });
  };
  for (const p of STATIC_PAGES) add(p.path, "static", p.sources);
  for (const g of GUIDES) add(catPath(g.id), "category", CATEGORY_SOURCES);
  for (const k of testKeys()) add(testPath(k), "test", TEST_SOURCES);
  return out;
}

export const publicPaths = () => publicRoutes().map((r) => r.path);
