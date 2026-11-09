// sitemap.xml را از خودِ کاتالوگ می‌سازد تا با افزودن آزمایش جدید از تاریخ نیفتد.
// اجرا: node scripts/gen-sitemap.mjs  (پیش از build خودکار اجرا می‌شود)
//
// lastmod تاریخِ آخرین کامیتی است که فایل‌های منبعِ همان صفحه را عوض کرده، نه «امروز».
// پیش‌تر هر build تاریخِ هر ۳۰۷ آدرس را به روزِ build می‌برد؛ گوگل lastmodی را که
// با تغییرِ واقعیِ صفحه نمی‌خواند نادیده می‌گیرد، و فایلِ کامیت‌شده هم هر روز کثیف می‌شد.
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { publicRoutes } from "./site-routes.mjs";

const APP_DIR = fileURLToPath(new URL("..", import.meta.url));
const today = () => new Date().toISOString().slice(0, 10);

/** تاریخِ (YYYY-MM-DD) آخرین کامیتِ این فایل‌ها؛ بدون git یا بدون تاریخچه → null. */
export function gitLastmod(sources, cwd = APP_DIR) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...sources], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

const xmlEscape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** فهرستِ [{ loc, lastmod }] برای همهٔ صفحه‌های عمومی. */
export function sitemapEntries({ origin = "https://azmayarapp.ir", lastmodOf = gitLastmod, fallback = today() } = {}) {
  const cache = new Map();
  return publicRoutes().map(({ path, sources }) => {
    const key = sources.join("|");
    if (!cache.has(key)) cache.set(key, lastmodOf(sources) || fallback);
    return { loc: `${origin}${path}`, lastmod: cache.get(key) };
  });
}

export function renderSitemap(entries) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map((e) => `  <url><loc>${xmlEscape(e.loc)}</loc><lastmod>${e.lastmod}</lastmod></url>`).join("\n") +
    `\n</urlset>\n`
  );
}

// فقط وقتی مستقیم اجرا شود فایل می‌نویسد؛ import در تست اثرِ جانبی ندارد.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const entries = sitemapEntries({ origin: process.env.SITE_ORIGIN || "https://azmayarapp.ir" });
  writeFileSync(fileURLToPath(new URL("../public/sitemap.xml", import.meta.url)), renderSitemap(entries));
  console.log(`sitemap: ${entries.length} آدرس`);
}
