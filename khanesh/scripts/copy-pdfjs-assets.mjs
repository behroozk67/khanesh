// ============================================================
// دارایی‌های جانبیِ pdf.js را در public/ می‌گذارد (specs/017).
//
// چرا: pdf.js 6 برای دیکودِ تصویرهای JBIG2 (اسکنِ سیاه‌وسفیدِ بسیاری از
// آزمایشگاه‌ها)، JPEG2000 و پروفایل رنگِ ICC از WebAssembly استفاده می‌کند و
// فونت‌های استاندارد را از مسیرِ standardFontDataUrl می‌خواند. این فایل‌ها در
// تارِ Vite نیستند؛ اگر نباشند، برگه‌های اسکن‌شده با خطای رندر می‌شکنند.
// مسیرها در pdfIntake.js همین نام‌ها را انتظار دارند: /wasm/ و /standard_fonts/
// ============================================================

import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const src = join(root, "node_modules", "pdfjs-dist");
const dest = join(root, "public");

if (!existsSync(src)) {
  console.error("copy-pdfjs-assets: pdfjs-dist نصب نیست؛ رد شد.");
  process.exit(0);
}

const jobs = [
  ["wasm", (f) => f.endsWith(".wasm")],
  ["standard_fonts", (f) => /\.(pfb|ttf|otf)$/.test(f)],
];

for (const [dir, keep] of jobs) {
  const from = join(src, dir);
  const to = join(dest, dir);
  if (!existsSync(from)) continue;
  await mkdir(to, { recursive: true });
  const files = (await readdir(from)).filter(keep);
  for (const f of files) await cp(join(from, f), join(to, f));
  console.log(`copy-pdfjs-assets: ${dir} → public/${dir} (${files.length} فایل)`);
}
