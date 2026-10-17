// ساختِ پیش‌رندر استاتیک (Static Pre-rendering & Head Injection) برای تمام ۳۰۳ مسیر سایت آزمایار
// اجرا: node scripts/gen-static-heads.mjs (در انتهای vite build اجرا می‌شود)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { GUIDES, testPath, catPath, extraBySlug, catOfTest } from "../src/testCatalog.js";
import { REF } from "../src/labRefs.js";
import { CATEGORY_PAGES } from "../src/guideContent.js";
import { EXTRA_TESTS } from "../src/content/extraTests.js";

const BRAND_FA = "آزمایار";
const ORIGIN = process.env.SITE_ORIGIN || "https://azmayarapp.ir";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "../dist");
const indexPath = join(distDir, "index.html");

if (!existsSync(indexPath)) {
  console.error("❌ dist/index.html پیدا نشد؛ لطفاً اول vite build را اجرا کنید.");
  process.exit(1);
}

const template = readFileSync(indexPath, "utf-8");

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanDesc(str, max = 175) {
  if (!str) return "";
  return String(str).replace(/\s+/g, " ").trim().slice(0, max);
}

// ناوبریِ مشترک بالای صفحات
const navHtml = `
<header class="site-hdr" style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
  <a href="/" style="font-weight:700;font-size:1.25rem;color:#0f172a;text-decoration:none">${BRAND_FA}</a>
  <nav style="display:flex;gap:1rem;align-items:center;font-size:0.95rem">
    <a href="/tests" style="color:#475569;text-decoration:none">فهرست آزمایش‌ها</a>
    <a href="/reference-ranges" style="color:#475569;text-decoration:none">محدوده مرجع</a>
    <a href="/units-guide" style="color:#475569;text-decoration:none">واحدهای سنجش</a>
    <a href="/how-to-capture" style="color:#475569;text-decoration:none">راهنمای عکس گرفتن</a>
    <a href="/app" style="background:#0284c7;color:#fff;padding:0.4rem 0.9rem;border-radius:0.5rem;text-decoration:none">ورود به تفسیر</a>
  </nav>
</header>
`;

const footerHtml = `
<footer class="site-ftr" style="margin-top:3rem;padding:2rem 1.5rem;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:0.875rem">
  <div style="max-width:960px;margin:0 auto;display:flex;flex-direction:column;gap:1rem">
    <p><strong>${BRAND_FA}</strong> — سامانهٔ ارزیابی و تفسیر آزمایش‌های پزشکی بر پایهٔ قواعد معتبر بالینی.</p>
    <p style="font-size:0.8rem;line-height:1.6">تذکر مهم پزشکی: آزمایار یک ابزار کمکی آموزشی و بالینی برای درک بهتر برگهٔ آزمایش است و به‌هیچ‌وجه جایگزین معاینه و تصمیم پزشک معالج نیست.</p>
    <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
      <a href="/tests" style="color:#64748b;text-decoration:none">آزمایش‌ها</a>
      <a href="/reference-ranges" style="color:#64748b;text-decoration:none">مقادیر مرجع</a>
      <a href="/units-guide" style="color:#64748b;text-decoration:none">واحدهای آزمایشگاهی</a>
      <a href="/how-to-capture" style="color:#64748b;text-decoration:none">کیفیت عکس برگه</a>
    </div>
  </div>
</footer>
`;

// ۱. تولید صفحه لندینگ
function renderLanding() {
  return `
<div class="site" dir="rtl" style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7">
  ${navHtml}
  <main style="max-width:960px;margin:2rem auto;padding:0 1.5rem">
    <h1 style="font-size:2rem;font-weight:800;color:#0f172a;margin-bottom:1rem">تفسیر هوشمند برگهٔ آزمایش با قواعد بالینی</h1>
    <p style="font-size:1.15rem;color:#334155;margin-bottom:2rem">عکس برگهٔ آزمایش یا اعدادش را وارد کنید؛ آزمایار با قواعد بالینی مشخص، نتیجه را به فارسی ساده توضیح می‌دهد: چه چیزی خارج از محدوده است، چقدر فوری است و قدم بعدی چیست.</p>
    <div style="display:flex;gap:1rem;margin-bottom:3rem">
      <a href="/app" style="background:#0284c7;color:#fff;padding:0.75rem 1.5rem;border-radius:0.5rem;font-weight:600;text-decoration:none">تفسیر برگهٔ آزمایش</a>
      <a href="/tests" style="background:#e0f2fe;color:#0369a1;padding:0.75rem 1.5rem;border-radius:0.5rem;font-weight:600;text-decoration:none">مشاهده ۳۰۰+ آزمایش</a>
    </div>
    <section style="margin-top:2.5rem">
      <h2 style="font-size:1.4rem;font-weight:700;margin-bottom:1rem">دسته‌بندی‌های آزمایشگاهی</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem">
        ${GUIDES.map(g => `<div style="border:1px solid #e2e8f0;padding:1rem;border-radius:0.5rem"><a href="${catPath(g.id)}" style="font-weight:600;color:#0284c7;text-decoration:none;display:block;margin-bottom:0.4rem">${escapeHtml(g.t)}</a><p style="font-size:0.875rem;color:#64748b;margin:0">${escapeHtml(cleanDesc(g.d, 90))}</p></div>`).join("")}
      </div>
    </section>
  </main>
  ${footerHtml}
</div>
`;
}

// ۲. تولید صفحه فهرست کلی آزمایش‌ها
function renderTestsIndex() {
  return `
<div class="site" dir="rtl" style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7">
  ${navHtml}
  <main style="max-width:960px;margin:2rem auto;padding:0 1.5rem">
    <nav style="font-size:0.875rem;color:#64748b;margin-bottom:1.5rem">
      <a href="/" style="color:#64748b;text-decoration:none">خانه</a> / <span>راهنمای آزمایش‌ها</span>
    </nav>
    <h1 style="font-size:2rem;font-weight:800;color:#0f172a;margin-bottom:1rem">راهنمای جامع آزمایش‌های پزشکی و چکاپ</h1>
    <p style="font-size:1.1rem;color:#475569;margin-bottom:2.5rem">راهنمای تخصصی بیش از ۳۰۰ آزمایش پزشکی در ۱۶ دسته بالینی؛ رنج نرمال، علت بالا یا پایین بودن مقادیر، شرایط نمونه‌گیری و تفسیر تشخیصی.</p>
    
    ${GUIDES.map(g => `
      <section style="margin-bottom:3rem">
        <h2 style="font-size:1.35rem;font-weight:700;border-bottom:2px solid #e2e8f0;padding-bottom:0.5rem;margin-bottom:1rem">
          <a href="${catPath(g.id)}" style="color:#0f172a;text-decoration:none">${escapeHtml(g.t)}</a>
        </h2>
        <p style="font-size:0.95rem;color:#64748b;margin-bottom:1rem">${escapeHtml(g.d || "")}</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.75rem">
          ${g.items.map(item => `
            <a href="${item.to || testPath(item.k || item.slug)}" style="display:block;padding:0.75rem 1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0.5rem;text-decoration:none">
              <strong style="color:#0284c7;display:block">${escapeHtml(item.n || item.k)}</strong>
              ${item.u ? `<span style="font-size:0.8rem;color:#64748b">${escapeHtml(item.u)}</span>` : ""}
              <span style="font-size:0.85rem;color:#475569;display:block;margin-top:0.25rem">${escapeHtml(cleanDesc(item.d, 80))}</span>
            </a>
          `).join("")}
        </div>
      </section>
    `).join("")}
  </main>
  ${footerHtml}
</div>
`;
}

// ۳. تولید صفحه دسته آزمایشگاهی
function renderCategoryPage(catId) {
  const g = GUIDES.find(item => item.id === catId);
  const cp = CATEGORY_PAGES[catId] || {};
  const title = cp.title || g?.t || catId;
  const desc = cp.card?.p?.[0] || cp.p?.[0] || g?.d || "";

  return `
<div class="site" dir="rtl" style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7">
  ${navHtml}
  <main style="max-width:960px;margin:2rem auto;padding:0 1.5rem">
    <nav style="font-size:0.875rem;color:#64748b;margin-bottom:1.5rem">
      <a href="/" style="color:#64748b;text-decoration:none">خانه</a> / 
      <a href="/tests" style="color:#64748b;text-decoration:none">آزمایش‌ها</a> / 
      <span>${escapeHtml(title)}</span>
    </nav>
    <article>
      <h1 style="font-size:2rem;font-weight:800;color:#0f172a;margin-bottom:1rem">${escapeHtml(title)}</h1>
      <p style="font-size:1.1rem;color:#334155;margin-bottom:2rem">${escapeHtml(desc)}</p>
      
      ${cp.p ? cp.p.slice(1).map(para => `<p style="color:#475569;margin-bottom:1rem">${escapeHtml(para)}</p>`).join("") : ""}
      
      <section style="margin-top:2.5rem">
        <h2 style="font-size:1.4rem;font-weight:700;margin-bottom:1.25rem">فهرست آزمایش‌های این دسته</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.75rem">
          ${(g?.items || []).map(item => `
            <a href="${item.to || testPath(item.k || item.slug)}" style="display:block;padding:0.75rem 1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0.5rem;text-decoration:none">
              <strong style="color:#0284c7;display:block">${escapeHtml(item.n || item.k)}</strong>
              ${item.u ? `<span style="font-size:0.8rem;color:#64748b">${escapeHtml(item.u)}</span>` : ""}
              <span style="font-size:0.85rem;color:#475569;display:block;margin-top:0.25rem">${escapeHtml(cleanDesc(item.d, 80))}</span>
            </a>
          `).join("")}
        </div>
      </section>
    </article>
  </main>
  ${footerHtml}
</div>
`;
}

// ۴. تولید صفحه تک‌آزمایش (تفسیر، رنج نرمال، علل بالا و پایین)
function renderTestPage(key) {
  const m = REF[key];
  const found = extraBySlug(key);
  const item = found?.item;
  const cat = found?.cat || (m ? catOfTest(key) : null);
  const x = EXTRA_TESTS[key] || {};
  const testName = m?.label || item?.n || key;
  const unit = m?.unit || item?.u || "";

  let about = m?.about || x.purpose?.[0]?.t || item?.d || "";
  let highDesc = m?.high || (x.results && x.results[0]) || "";
  let lowDesc = m?.low || (x.results && x.results[1]) || "";

  return `
<div class="site" dir="rtl" style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7">
  ${navHtml}
  <main style="max-width:840px;margin:2rem auto;padding:0 1.5rem">
    <nav style="font-size:0.875rem;color:#64748b;margin-bottom:1.5rem">
      <a href="/" style="color:#64748b;text-decoration:none">خانه</a> / 
      <a href="/tests" style="color:#64748b;text-decoration:none">آزمایش‌ها</a> / 
      ${cat ? `<a href="${catPath(cat.id)}" style="color:#64748b;text-decoration:none">${escapeHtml(cat.t)}</a> / ` : ""}
      <span>${escapeHtml(testName)}</span>
    </nav>
    <article>
      <header style="margin-bottom:2rem;border-bottom:1px solid #e2e8f0;padding-bottom:1.5rem">
        <h1 style="font-size:2rem;font-weight:800;color:#0f172a;margin-bottom:0.75rem">تفسیر آزمایش ${escapeHtml(testName)}</h1>
        ${unit ? `<div style="display:inline-block;background:#f1f5f9;color:#475569;padding:0.2rem 0.6rem;border-radius:0.375rem;font-size:0.875rem;margin-bottom:1rem">واحد اندازه‌گیری: ${escapeHtml(unit)}</div>` : ""}
        <p style="font-size:1.1rem;color:#334155">${escapeHtml(about)}</p>
      </header>

      ${(highDesc || lowDesc) ? `
      <section style="margin-bottom:2.5rem">
        <h2 style="font-size:1.35rem;font-weight:700;color:#0f172a;margin-bottom:1rem">تفسیر مقادیر بالا و پایین</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          ${highDesc ? `
          <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:0.5rem;padding:1rem">
            <h3 style="font-size:1rem;color:#9f1239;margin-bottom:0.5rem;font-weight:700">بالا بودن ${escapeHtml(testName)}</h3>
            <p style="font-size:0.9rem;color:#881337;margin:0">${escapeHtml(highDesc)}</p>
          </div>` : ""}
          ${lowDesc ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:0.5rem;padding:1rem">
            <h3 style="font-size:1rem;color:#166534;margin-bottom:0.5rem;font-weight:700">پایین بودن ${escapeHtml(testName)}</h3>
            <p style="font-size:0.9rem;color:#14532d;margin:0">${escapeHtml(lowDesc)}</p>
          </div>` : ""}
        </div>
      </section>
      ` : ""}

      ${x.quick ? `
      <section style="margin-bottom:2.5rem">
        <h2 style="font-size:1.35rem;font-weight:700;color:#0f172a;margin-bottom:1rem">نکات مهم و سریع</h2>
        ${x.quick.map(q => `<p style="color:#475569;margin-bottom:0.75rem">${escapeHtml(q)}</p>`).join("")}
      </section>
      ` : ""}

      ${x.caveat ? `
      <section style="margin-bottom:2.5rem;background:#fffbeb;border:1px solid #fef3c7;padding:1rem;border-radius:0.5rem">
        <h2 style="font-size:1.15rem;font-weight:700;color:#92400e;margin-bottom:0.5rem">تداخلات و شرایط تأثیرگذار</h2>
        <p style="color:#78350f;font-size:0.92rem;margin:0">${escapeHtml(x.caveat)}</p>
      </section>
      ` : ""}

      <div style="margin-top:2.5rem;padding:1.5rem;background:#f0f9ff;border-radius:0.75rem;border:1px solid #bae6fd;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
        <div>
          <strong style="color:#0369a1;display:block;font-size:1.05rem">می‌خواهید برگه آزمایش خود را دقیق تحلیل کنید؟</strong>
          <span style="color:#0284c7;font-size:0.875rem">برگه آزمایش را بارگذاری کنید تا با سایر فاکتورها به‌صورت یکپارچه سنجیده شود.</span>
        </div>
        <a href="/app" style="background:#0284c7;color:#fff;padding:0.6rem 1.25rem;border-radius:0.5rem;text-decoration:none;font-weight:600">شروع تفسیر هوشمند</a>
      </div>

      ${cat && cat.items && cat.items.length > 1 ? `
      <section style="margin-top:3rem;border-top:1px solid #e2e8f0;padding-top:1.5rem">
        <h2 style="font-size:1.25rem;font-weight:700;color:#0f172a;margin-bottom:1rem">سایر آزمایش‌های مرتبط در دستهٔ ${escapeHtml(cat.t)}</h2>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          ${cat.items.slice(0, 8).map(it => `
            <a href="${it.to || testPath(it.k || it.slug)}" style="padding:0.4rem 0.8rem;background:#f8fafc;border:1px solid #cbd5e1;border-radius:0.375rem;font-size:0.875rem;color:#334155;text-decoration:none">${escapeHtml(it.n || it.k)}</a>
          `).join("")}
        </div>
      </section>
      ` : ""}
    </article>
  </main>
  ${footerHtml}
</div>
`;
}

// ۵. تولید صفحه راهنماها (محدوده مرجع، واحدها، عکس‌برداری)
function renderStaticArticle(title, description, points = []) {
  return `
<div class="site" dir="rtl" style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7">
  ${navHtml}
  <main style="max-width:840px;margin:2rem auto;padding:0 1.5rem">
    <nav style="font-size:0.875rem;color:#64748b;margin-bottom:1.5rem">
      <a href="/" style="color:#64748b;text-decoration:none">خانه</a> / <span>${escapeHtml(title)}</span>
    </nav>
    <article>
      <h1 style="font-size:2rem;font-weight:800;color:#0f172a;margin-bottom:1rem">${escapeHtml(title)}</h1>
      <p style="font-size:1.1rem;color:#334155;margin-bottom:2rem">${escapeHtml(description)}</p>
      ${points.map(pt => `
        <section style="margin-bottom:1.5rem;background:#f8fafc;padding:1.25rem;border-radius:0.5rem;border:1px solid #e2e8f0">
          <h2 style="font-size:1.2rem;font-weight:700;color:#0f172a;margin-bottom:0.5rem">${escapeHtml(pt.t)}</h2>
          <p style="color:#475569;margin:0">${escapeHtml(pt.d)}</p>
        </section>
      `).join("")}
      <div style="margin-top:2.5rem;display:flex;gap:1rem">
        <a href="/tests" style="background:#0284c7;color:#fff;padding:0.6rem 1.25rem;border-radius:0.5rem;text-decoration:none">فهرست کامل آزمایش‌ها</a>
        <a href="/app" style="background:#e0f2fe;color:#0369a1;padding:0.6rem 1.25rem;border-radius:0.5rem;text-decoration:none">تفسیر برگه آزمایش</a>
      </div>
    </article>
  </main>
  ${footerHtml}
</div>
`;
}

// استخراجِ تمام آدرس‌ها دقیقاً منطبق با sitemap.xml
const paths = ["/", "/tests", "/reference-ranges", "/units-guide", "/how-to-capture"];
for (const g of GUIDES) paths.push(catPath(g.id));
const keys = new Set();
for (const g of GUIDES) for (const i of g.items) keys.add(i.k || i.slug);
for (const k of [...keys].sort()) paths.push(testPath(k));

const uniquePaths = [...new Set(paths)];
let count = 0;

for (const p of uniquePaths) {
  let title = "";
  let description = "";
  let ogType = "website";
  let jsonLd = null;
  let bodyHtml = "";

  if (p === "/") {
    title = `${BRAND_FA} — تفسیر هوشمند برگهٔ آزمایش با قواعد بالینی`;
    description = "عکس برگهٔ آزمایش یا اعدادش را وارد کنید؛ آزمایار با قواعد بالینی مشخص، نتیجه را به فارسی ساده توضیح می‌دهد: چه چیزی خارج از محدوده است، چقدر فوری است و قدم بعدی چیست.";
    ogType = "website";
    bodyHtml = renderLanding();
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: BRAND_FA,
      alternateName: "LabMate",
      url: `${ORIGIN}/`,
      description,
      applicationCategory: "HealthApplication",
      operatingSystem: "All",
      inLanguage: "fa-IR",
    };
  } else if (p === "/tests") {
    title = `راهنمای آزمایش‌های پزشکی و چکاپ — فهرست کامل — ${BRAND_FA}`;
    description = "راهنمای جامع بیش از ۳۰۰ آزمایش پزشکی و ۱۷ دسته تخصصی؛ رنج نرمال، علت بالا و پایین بودن مقادیر و شرایط نمونه‌گیری به زبان ساده در آزمایار.";
    bodyHtml = renderTestsIndex();
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `راهنمای آزمایش‌های پزشکی — ${BRAND_FA}`,
      url: `${ORIGIN}/tests`,
      description,
      inLanguage: "fa-IR",
    };
  } else if (p === "/reference-ranges") {
    title = `مقادیر مرجع (رنج نرمال) در آزمایش‌های پزشکی به چه معناست؟ — ${BRAND_FA}`;
    description = "مفهوم محدوده مرجع (Reference Range) در برگه آزمایش چگونه تعیین می‌شود؟ بررسی علت تفاوت بازه نرمال در آزمایشگاه‌ها، عوامل موثر مانند سن و جنسیت و آستانه‌های بالینی.";
    ogType = "article";
    bodyHtml = renderStaticArticle(title, description, [
      { t: "محدودهٔ مرجع چیست؟", d: "بازهٔ اعدادی است که ۹۵ درصد از افراد سالم در آن قرار می‌گیرند؛ بنابراین ۵ درصد افراد سالم ممکن است خارج از این محدوده باشند." },
      { t: "چرا بازه در آزمایشگاه‌های مختلف تفاوت دارد؟", d: "به دلیل استفاده از کیت‌ها، روش‌های سنجش (الایزا، کمی‌لومینسانس و...) و کالیبراسیون دستگاه‌های مختلف آزمایشگاهی." },
      { t: "آستانهٔ تصمیم‌گیری بالینی (Decision Limits)", d: "در آزمایش‌هایی مانند قند خون یا کلسترول، به جای میانگین جامعه سالم، راهنماهای بالینی جهانی آستانه تعیین می‌کنند." },
    ]);
  } else if (p === "/units-guide") {
    title = `واحدهای آزمایشگاهی: SI در برابر واحدهای متعارف — ${BRAND_FA}`;
    description = "جدول و راهنمای علمی تبدیل واحدهای اندازه‌گیری آزمایشگاهی (SI و متعارف مانند HbA1c و الکترولیت‌ها) بر پایه استانداردهای IFCC و Henry's Clinical Diagnosis.";
    ogType = "article";
    bodyHtml = renderStaticArticle(title, description, [
      { t: "تفاوت واحدهای SI و واحدهای متعارف (Conventional)", d: "برخی آزمایشگاه‌ها نتایج را بر حسب mg/dL گزارش می‌کنند و برخی بر حسب mmol/L یا µmol/L." },
      { t: "آزمایش قند سه ماهه (HbA1c)", d: "گزارش به دو صورت درصد (%) یا واحد IFCC به صورت mmol/mol انجام می‌شود." },
      { t: "اهمیت وارد کردن دقیق واحد در آزمایار", d: "موتور بالینی آزمایار واحدها را به صورت خودکار تطبیق می‌دهد تا از هرگونه سوءتعبیر یا خطای تشخیصی جلوگیری شود." },
    ]);
  } else if (p === "/how-to-capture") {
    title = `چطور از برگهٔ آزمایش عکس بگیریم؟ — راهنمای کیفیت تصویر — ${BRAND_FA}`;
    description = "۴ اصل ساده برای ثبت عکس واضح و بدون خطای برگه آزمایش جهت تشخیص دقیق اعداد با OCR و هوش بالینی آزمایار.";
    ogType = "article";
    bodyHtml = renderStaticArticle(title, description, [
      { t: "۱. نور یکنواخت و مستقیم", d: "برگه را روی میز مسطح قرار دهید و از افتادن سایه موبایل یا دست روی برگه خودداری کنید." },
      { t: "۲. فوکوس دقیق روی متن", d: "دوربین را مستقیماً بالای برگه نگه دارید تا حروف و ارقام کج یا تار نشوند." },
      { t: "۳. پرهیز از تاخوردگی برگه", d: "تاخوردگی باعث برش خوردن سطرها و اعداد ستون‌های رنج مرجع می‌شود." },
      { t: "۴. وضوح و خوانایی اعداد", d: "در صورت کم‌رنگ بودن چاپ سوزنی برگه، ترجیحاً اعداد را به صورت دستی در فرم آزمایار وارد کنید." },
    ]);
  } else if (p.startsWith("/tests/")) {
    const catId = p.replace("/tests/", "");
    const cp = CATEGORY_PAGES[catId] || {};
    const catTitle = cp.title || catId;
    title = `${catTitle} — راهنمای جامع و فهرست آزمایش‌ها — ${BRAND_FA}`;
    description = cleanDesc(cp.card?.p?.[0] || cp.p?.[0] || `راهنمای جامع آزمایش‌های دستهٔ ${catTitle}، رنج نرمال و دلایل انجام آزمایش در آزمایار.`);
    ogType = "article";
    bodyHtml = renderCategoryPage(catId);
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${catTitle} — ${BRAND_FA}`,
      url: `${ORIGIN}${p}`,
      description,
      inLanguage: "fa-IR",
    };
  } else if (p.startsWith("/test/")) {
    const key = p.replace("/test/", "");
    const m = REF[key];
    ogType = "article";

    if (m) {
      title = `تفسیر آزمایش ${m.label} — رنج نرمال و علل خطا — ${BRAND_FA}`;
      description = cleanDesc(`${m.about || ""} راهنمای کامل خواندن جواب آزمایش ${m.label}، شرایط ناشتایی و تداخلات دارویی در آزمایار.`);
    } else {
      const found = extraBySlug(key);
      const item = found?.item;
      const x = EXTRA_TESTS[key] || {};
      const testName = item?.n || key;
      title = `تفسیر آزمایش ${testName} — رنج نرمال و علل خطا — ${BRAND_FA}`;
      const firstDesc = x.purpose?.[0]?.t || x.purpose?.[0] || x.measures?.[0] || item?.d || "";
      description = cleanDesc(`${firstDesc} راهنما و کاربرد بالینی آزمایش ${testName} در آزمایار.`);
    }

    bodyHtml = renderTestPage(key);
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: title.replace(` — ${BRAND_FA}`, ""),
      url: `${ORIGIN}${p}`,
      description,
      inLanguage: "fa-IR",
    };
  }

  const canonical = `${ORIGIN}${p}`;

  // ۱. جایگزینی در سربرگ‌های HTML الگو
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/s, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta name="description" content=".*?"\s*\/?>/s, `<meta name="description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<link rel="canonical" href=".*?"\s*\/?>/s, `<link rel="canonical" href="${canonical}" />`);
  html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/s, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/s, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/s, `<meta property="og:url" content="${canonical}" />`);
  html = html.replace(/<meta property="og:type" content=".*?"\s*\/?>/s, `<meta property="og:type" content="${ogType}" />`);

  if (jsonLd) {
    const jsonLdTag = `<script type="application/ld+json" id="seo-jsonld">${JSON.stringify(jsonLd)}</script>\n  `;
    html = html.replace("</head>", `  ${jsonLdTag}</head>`);
  }

  // ۲. تزریقِ محتوای پیش‌رندرشده درون <div id="root">
  if (bodyHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
  }

  if (p === "/") {
    writeFileSync(indexPath, html, "utf-8");
  } else {
    const targetDir = join(distDir, p.slice(1));
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(join(targetDir, "index.html"), html, "utf-8");
  }
  count++;
}

// ۳. ایجاد صفحه اختصاصی ۴۰۴ (برای جلوگیری از Soft 404 در Nginx)
const notFoundHtml = template
  .replace(/<title>[^<]*<\/title>/s, `<title>صفحه مورد نظر پیدا نشد (۴۰۴) — ${BRAND_FA}</title>`)
  .replace(/<meta name="robots" content=".*?"\s*\/?>/s, `<meta name="robots" content="noindex,nofollow" />`)
  .replace('<div id="root"></div>', `<div id="root" dir="rtl" style="font-family:system-ui;text-align:center;padding:4rem 1rem">
    <h1 style="font-size:2.5rem;color:#0f172a">خطای ۴۰۴ — صفحه پیدا نشد</h1>
    <p style="color:#64748b;margin:1rem 0 2rem">صفحه‌ای که به دنبال آن هستید وجود ندارد یا آدرس آن تغییر کرده است.</p>
    <a href="/" style="background:#0284c7;color:#fff;padding:0.75rem 1.5rem;border-radius:0.5rem;text-decoration:none">بازگشت به صفحهٔ اصلی</a>
  </div>`);

writeFileSync(join(distDir, "404.html"), notFoundHtml, "utf-8");
console.log(`✅ فایل dist/404.html ایجاد شد.`);

console.log(`🎉 پیش‌رندر استاتیک و سربرگ‌های سئو برای تمام ${count} مسیر با موفقیت ساخته شد!`);
