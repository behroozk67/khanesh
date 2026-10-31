// sitemap.xml را از خودِ کاتالوگ می‌سازد تا با افزودن آزمایش جدید از تاریخ نیفتد.
// اجرا: node scripts/gen-sitemap.mjs  (پیش از build خودکار اجرا می‌شود)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GUIDES, testPath, catPath } from "../src/testCatalog.js";

const ORIGIN = process.env.SITE_ORIGIN || "https://azmayarapp.ir";
const today = new Date().toISOString().slice(0, 10);

const paths = ["/", "/tests", "/reference-ranges", "/units-guide", "/how-to-capture", "/methodology", "/contact"];
for (const g of GUIDES) paths.push(catPath(g.id));
const keys = new Set();
for (const g of GUIDES) for (const i of g.items) keys.add(i.k || i.slug);
for (const k of [...keys].sort()) paths.push(testPath(k));

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  [...new Set(paths)].map((p) => `  <url><loc>${ORIGIN}${p}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`;

writeFileSync(fileURLToPath(new URL("../public/sitemap.xml", import.meta.url)), xml);
console.log(`sitemap: ${new Set(paths).size} آدرس`);
