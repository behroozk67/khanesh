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
  <a href="/" style="font-weight:800;font-size:1.25rem;color:#0f172a;text-decoration:none" title="تفسیر آزمایش خون آنلاین — آزمایار">${BRAND_FA} <span style="font-size:0.85rem;font-weight:600;color:#0284c7">| تفسیر آزمایش خون</span></a>
  <nav style="display:flex;gap:1rem;align-items:center;font-size:0.95rem">
    <a href="/" style="color:#0284c7;text-decoration:none;font-weight:600">تفسیر آزمایش خون</a>
    <a href="/tests" style="color:#475569;text-decoration:none">فهرست آزمایش‌ها</a>
    <a href="/reference-ranges" style="color:#475569;text-decoration:none">محدوده مرجع</a>
    <a href="/units-guide" style="color:#475569;text-decoration:none">واحدهای سنجش</a>
    <a href="/how-to-capture" style="color:#475569;text-decoration:none">راهنمای عکس گرفتن</a>
    <a href="/methodology" style="color:#475569;text-decoration:none">روش‌شناسی</a>
    <a href="/app" style="background:#0284c7;color:#fff;padding:0.4rem 0.9rem;border-radius:0.5rem;text-decoration:none">ورود به تفسیر</a>
  </nav>
</header>
`;

const footerHtml = `
<footer class="site-ftr" style="margin-top:3rem;padding:2rem 1.5rem;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:0.875rem">
  <div style="max-width:960px;margin:0 auto;display:flex;flex-direction:column;gap:1rem">
    <p><strong><a href="/" style="color:#0f172a;text-decoration:none;font-weight:700">تفسیر آزمایش خون</a> با ${BRAND_FA}</strong> (AzmayarApp.ir) — سامانهٔ هوشمند تفسیر آنلاین آزمایش‌های پزشکی بر پایهٔ قواعد معتبر بالینی.</p>
    <p style="font-size:0.8rem;line-height:1.6">© ۱۴۰۵ ${BRAND_FA} — تمامی حقوق محفوظ است.</p>
    <p style="font-size:0.8rem;line-height:1.6">تذکر مهم پزشکی: آزمایار یک ابزار کمکی آموزشی و بالینی برای درک بهتر برگهٔ آزمایش است و به‌هیچ‌وجه جایگزین معاینه و تصمیم پزشک معالج نیست.</p>
    <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
      <a href="/" style="color:#0284c7;font-weight:600;text-decoration:none">تفسیر آزمایش خون</a>
      <a href="/tests" style="color:#64748b;text-decoration:none">آزمایش‌ها</a>
      <a href="/reference-ranges" style="color:#64748b;text-decoration:none">مقادیر مرجع</a>
      <a href="/units-guide" style="color:#64748b;text-decoration:none">واحدهای آزمایشگاهی</a>
      <a href="/how-to-capture" style="color:#64748b;text-decoration:none">کیفیت عکس برگه</a>
      <a href="/methodology" style="color:#64748b;text-decoration:none">روش‌شناسی</a>
    </div>
  </div>
</footer>
`;

// ۱. تولید صفحه لندینگ
function renderLanding() {
  const bloodFactors = [
    { n: "شمارش کامل خون (CBC)", sub: "WBC, RBC, Hb, Plt, MCV", to: "/test/cbc", cat: "خون‌شناسی", p: "بررسی کم‌خونی، عفونت فعال و پلاکت‌ها", syn: "تحلیل همزمان MCV و هموگلوبین برای افتراق فقر آهن از تالاسمی مینور" },
    { n: "قند خون ناشتا (FBS)", sub: "Fasting Blood Sugar", to: "/test/fbs", cat: "دیابت و متابولیسم", p: "غربالگری دیابت و ارزیابی گلوکز پلاسما", syn: "ارزیابی در کنار HbA1c جهت تفکیک نوسان لحظه‌ای از میانگین ۳ ماهه" },
    { n: "هموگلوبین A1c", sub: "HbA1c", to: "/test/hba1c", cat: "دیابت و متابولیسم", p: "میانگین قند خون در ۹۰ تا ۱۲۰ روز گذشته", syn: "معیار طلایی کنترل دیابت بدون وابستگی به رژیم غذایی روز آزمایش" },
    { n: "پروفایل چربی (Lipid Panel)", sub: "Chol, TG, LDL, HDL", to: "/test/lipid-panel", cat: "قلب و عروق", p: "سنجش کلسترول، تری‌گلیسرید و رسوب عروقی", syn: "محاسبه نسبت کلسترول به HDL و Non-HDL جهت تخمین ریسک قلبی" },
    { n: "آنزیم‌های کبدی (ALT و AST)", sub: "SGPT, SGOT", to: "/test/alt", cat: "کبد و گوارش", p: "بررسی التهاب، کبد چرب و آسیب هپاتوسلولار", syn: "نسبت De Ritis (AST/ALT) در کنار ALP برای افتراق علل کبدی" },
    { n: "کراتینین و اوره (Cr & BUN)", sub: "Creatinine, BUN", to: "/test/cr", cat: "کلیه و مجاری", p: "ارزیابی سلامت فیلتراسیون گلومرولی و تصفیه کلیه", syn: "تخمین دقیق eGFR با در نظر گرفتن سن و جنسیت فرد" },
    { n: "هورمون محرک تیروئید (TSH)", sub: "TSH", to: "/test/tsh", cat: "غدد درون‌ریز", p: "غربالگری کم‌کاری یا پرکاری غده تیروئید", syn: "سنجش همزمان در کنار Free T4 جهت تشخیص تیروئید ساب‌کلینیکال" },
    { n: "فریتین و آهن سرم", sub: "Ferritin, Serum Iron", to: "/test/ferritin", cat: "خون‌شناسی", p: "سنجش ذخایر واقعی آهن کبد و پروتئین ترانسفرین", syn: "تشخیص دقیق فقر آهن پیش از بروز کم‌خونی در CBC" },
    { n: "ویتامین D3 (25-OH D)", sub: "25-Hydroxy Vitamin D", to: "/test/vitd", cat: "ویتامین‌ها و املاح", p: "سلامت استخوان، جذب کلسیم و سیستم ایمنی", syn: "بررسی در کنار کلسیم و فسفر خون جهت تعیین دوز ایمن مکمل" },
  ];

  const faqs = [
    { q: "تفسیر آزمایش خون در آزمایار چگونه انجام می‌شود؟", a: "کافی است عکس واضحی از برگهٔ آزمایش خود بارگذاری کنید یا مقادیر فاکتورها را به‌صورت دستی وارد فرم کنید. موتور آزمایار بر پایهٔ قواعد معتبر بالینی، تمامی شاخص‌ها را به‌صورت یکپارچه در کنار یکدیگر می‌سنجد، فوریت بالینی هر یافته را مشخص کرده و توصیه‌های بعدی را به فارسی روان ارائه می‌دهد." },
    { q: "آیا آزمایار می‌تواند عکس برگه آزمایش خون را بخواند؟", a: "بله، با موتور اختصاصی پردازش تصویر و OCR پزشکی، می‌توانید تا ۵ صفحه از برگه‌های آزمایش خود را بارگذاری نمایید تا نام آزمایش‌ها، مقادیر عددی و بازه‌های نرمال آزمایشگاه به‌صورت خودکار استخراج و تحلیل شوند." },
    { q: "چرا بررسی همزمان فاکتورها دقیق‌تر از خواندن محدوده مرجع تکی است؟", a: "شاخص‌های آزمایشگاهی در بدن به‌هم‌پیوسته‌اند؛ برای مثال، هموگلوبین پایین به‌تنهایی فقط نشانهٔ کم‌خونی است، اما اگر با MCV پایین و فریتین پایین همراه باشد الگوی کم‌خونی فقر آهن را نشان می‌دهد، در حالی که با MCV بالا ممکن است کمبود ویتامین B12 یا فولات مطرح باشد. آزمایار الگوی چندگانه کل برگه را بررسی می‌کند." },
    { q: "آیا نتیجهٔ تفسیر آنلاین آزمایش خون جایگزین نظر پزشک است؟", a: "خیر. آزمایار یک ابزار بالینی و آموزشی جهت ارتقای سواد سلامت و آماده‌سازی بیمار برای گفت‌وگوی آگاهانه‌تر با پزشک است و به‌هیچ‌عنوان جایگزین معاینه حضوری، اخذ شرح‌حال و قضاوت پزشک معالج نخواهد بود." },
    { q: "چه آزمایش‌هایی در سامانه آزمایار پوشش داده شده‌اند؟", a: "بیش از ۳۰۰ آزمایش تخصصی شامل شمارش کامل خون (CBC)، قند خون و دیابت، چربی‌ها، کبد، کلیه، تیروئید، املاح و الکترولیت‌ها، ویتامین‌ها، آزمایش کامل ادرار و مدفوع، و نشانگرهای غربالگری در سامانه تحلیل می‌شوند." },
  ];

  return `
<div class="site" dir="rtl" style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7">
  ${navHtml}
  <main style="max-width:960px;margin:2rem auto;padding:0 1.5rem">
    <header style="margin-bottom:3rem">
      <h1 style="font-size:2.2rem;font-weight:800;color:#0f172a;margin-bottom:1rem;line-height:1.3">تفسیر آزمایش خون آنلاین با هوش مصنوعی و قواعد بالینی</h1>
      <p style="font-size:1.15rem;color:#334155;margin-bottom:2rem;line-height:1.8">
        عکس برگهٔ آزمایش خود را بارگذاری کنید یا مقادیر فاکتورها را دستی وارد نمایید؛ آزمایار با بررسی چندفاکتوره بر پایهٔ منابع بالینی معتبر، وضعیت شاخص‌ها، فوریت بالینی و توصیه‌های بعدی را به زبان ساده برای شما تشریح می‌کند.
      </p>
      <div style="display:flex;gap:1rem;flex-wrap:wrap">
        <a href="/app" style="background:#0284c7;color:#fff;padding:0.75rem 1.5rem;border-radius:0.5rem;font-weight:600;text-decoration:none">شروع تفسیر آزمایش خون</a>
        <a href="/tests" style="background:#e0f2fe;color:#0369a1;padding:0.75rem 1.5rem;border-radius:0.5rem;font-weight:600;text-decoration:none">راهنمای ۳۰۰+ آزمایش پزشکی</a>
      </div>
    </header>

    <section style="margin-top:3.5rem">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:0.75rem">راهنمای فاکتورهای کلیدی در تفسیر آزمایش خون</h2>
      <p style="font-size:1rem;color:#475569;margin-bottom:1.5rem;line-height:1.7">
        برگهٔ آزمایش خون معمولاً از چند پنل مجزا تشکیل شده است. در جدول زیر، پرکاربردترین شاخص‌های خون، کاربرد بالینی و دلیل اهمیت ارزیابی ترکیبی آن‌ها را مشاهده می‌کنید:
      </p>
      <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:0.75rem;background:#fff;margin-bottom:1.5rem">
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;text-align:right;min-width:640px">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#475569">
              <th style="padding:0.75rem 1rem">شاخص خونی</th>
              <th style="padding:0.75rem 1rem">دسته بالینی</th>
              <th style="padding:0.75rem 1rem">هدف آزمایش</th>
              <th style="padding:0.75rem 1rem">اهمیت بررسی یکپارچه در تفسیر</th>
            </tr>
          </thead>
          <tbody>
            ${bloodFactors.map(f => `
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:0.75rem 1rem">
                  <a href="${f.to}" style="font-weight:700;color:#0284c7;text-decoration:none;display:block">${escapeHtml(f.n)}</a>
                  <small style="color:#64748b;font-size:0.8rem;direction:ltr;display:block">${escapeHtml(f.sub)}</small>
                </td>
                <td style="padding:0.75rem 1rem;color:#475569">${escapeHtml(f.cat)}</td>
                <td style="padding:0.75rem 1rem;color:#334155">${escapeHtml(f.p)}</td>
                <td style="padding:0.75rem 1rem;color:#475569;font-size:0.85rem">${escapeHtml(f.syn)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section style="margin-top:3.5rem">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:1rem">دسته‌بندی‌های آزمایشگاهی و چکاپ</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem">
        ${GUIDES.map(g => `<div style="border:1px solid #e2e8f0;padding:1rem;border-radius:0.5rem;background:#fff"><a href="${catPath(g.id)}" style="font-weight:600;color:#0284c7;text-decoration:none;display:block;margin-bottom:0.4rem">${escapeHtml(g.t)}</a><p style="font-size:0.875rem;color:#64748b;margin:0">${escapeHtml(cleanDesc(g.d, 90))}</p></div>`).join("")}
      </div>
    </section>

    <section style="margin-top:3.5rem">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:0.75rem">پرسش‌های متداول درباره تفسیر آزمایش خون</h2>
      <p style="font-size:1rem;color:#475569;margin-bottom:1.5rem">
        پاسخ به سوالات متداول درباره نحوه کار با سامانه آزمایار، نحوه خواندن آزمایش و استانداردهای بالینی:
      </p>
      <div style="display:grid;gap:0.75rem">
        ${faqs.map(item => `
          <details style="background:#fff;border:1px solid #e2e8f0;border-radius:0.5rem;padding:0.75rem 1rem" open>
            <summary style="font-weight:700;color:#0f172a;cursor:pointer;margin-bottom:0.5rem">${escapeHtml(item.q)}</summary>
            <p style="font-size:0.92rem;color:#475569;margin:0;line-height:1.7">${escapeHtml(item.a)}</p>
          </details>
        `).join("")}
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
      <a href="/" style="color:#0284c7;text-decoration:none;font-weight:600">تفسیر آزمایش خون</a> / <span>راهنمای آزمایش‌ها</span>
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
      <a href="/" style="color:#0284c7;text-decoration:none;font-weight:600">تفسیر آزمایش خون</a> / 
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
      <a href="/" style="color:#0284c7;text-decoration:none;font-weight:600">تفسیر آزمایش خون</a> / 
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
          <strong style="color:#0369a1;display:block;font-size:1.05rem">تحلیل جامع برگه و تفسیر آنلاین آزمایش خون</strong>
          <p style="color:#0284c7;font-size:0.875rem;margin:0.35rem 0 0;line-height:1.6">
            شاخص ${escapeHtml(testName)} را به‌تنهایی بررسی نکنید؛ وضعیت بالینی آن در ارتباط با سایر فاکتورهای خون مشخص می‌شود. برای تحلیل یکپارچه کل برگه بر پایهٔ منابع بالینی، به سامانهٔ <a href="/" style="color:#0369a1;font-weight:700;text-decoration:underline">تفسیر آزمایش خون</a> آزمایار مراجعه فرمایید یا تصویر برگه را بارگذاری کنید.
          </p>
        </div>
        <a href="/app" style="background:#0284c7;color:#fff;padding:0.6rem 1.25rem;border-radius:0.5rem;text-decoration:none;font-weight:600">شروع تفسیر این آزمایش</a>
      </div>

      <p style="margin-top:1.5rem;font-size:0.875rem;color:#64748b;line-height:1.7">
        آزمایار به شما کمک می‌کند تا با <a href="/" style="color:#0284c7;font-weight:600;text-decoration:underline">تفسیر آنلاین آزمایش خون</a> بر پایهٔ منابع معتبر بالینی، نتیجه آزمایش ${escapeHtml(testName)} را در کنار سایر مقادیر بررسی کرده و با آگاهی بیشتر با پزشک معالج مشورت کنید.
      </p>

      ${cat && cat.items && cat.items.length > 1 ? `
      <section style="margin-top:3rem;border-top:1px solid #e2e8f0;padding-top:1.5rem">
        <h2 style="font-size:1.25rem;font-weight:700;color:#0f172a;margin-bottom:1rem">سایر آزمایش‌های مرتبط در دستهٔ ${escapeHtml(cat.t)}</h2>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          ${cat.items.slice(0, 8).map(it => `
            <a href="${it.to || testPath(it.k || item?.slug || it.slug)}" style="padding:0.4rem 0.8rem;background:#f8fafc;border:1px solid #cbd5e1;border-radius:0.375rem;font-size:0.875rem;color:#334155;text-decoration:none">${escapeHtml(it.n || it.k)}</a>
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
      <a href="/" style="color:#0284c7;text-decoration:none;font-weight:600">تفسیر آزمایش خون</a> / <span>${escapeHtml(title)}</span>
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
const paths = ["/", "/tests", "/reference-ranges", "/units-guide", "/how-to-capture", "/methodology"];
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
    title = `تفسیر آزمایش خون آنلاین | هوشمند و بر پایه منابع بالینی — ${BRAND_FA}`;
    description = "تفسیر آنلاین برگه آزمایش خون و چکاپ با هوش مصنوعی و بر پایه راهنماهای معتبر بالینی. عکس برگه را بارگذاری کنید یا مقادیر فاکتورها را وارد نمایید تا نتیجه به زبان ساده تحلیل شود.";
    ogType = "website";
    bodyHtml = renderLanding();
    jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          name: BRAND_FA,
          alternateName: ["AzmayarApp", "LabMate", "تفسیر آزمایش خون آزمایار"],
          url: `${ORIGIN}/`,
          description,
          applicationCategory: "HealthApplication",
          operatingSystem: "All",
          inLanguage: "fa-IR",
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "تفسیر آزمایش خون در آزمایار چگونه انجام می‌شود؟",
              acceptedAnswer: {
                "@type": "Answer",
                text: "کافی است عکس واضحی از برگهٔ آزمایش خود بارگذاری کنید یا مقادیر فاکتورها را به‌صورت دستی وارد فرم کنید. موتور آزمایار بر پایهٔ قواعد معتبر بالینی، تمامی شاخص‌ها را به‌صورت یکپارچه در کنار یکدیگر می‌سنجد، فوریت بالینی هر یافته را مشخص کرده و توصیه‌های بعدی را به فارسی روان ارائه می‌دهد."
              }
            },
            {
              "@type": "Question",
              name: "آیا آزمایار می‌تواند عکس برگه آزمایش خون را بخواند؟",
              acceptedAnswer: {
                "@type": "Answer",
                text: "بله، با موتور پردازش تصویر و OCR اختصاصی، می‌توانید تا ۵ صفحه از برگه‌های آزمایش خود را بارگذاری نمایید تا نام آزمایش‌ها، مقادیر عددی و بازه‌های نرمال آزمایشگاه به‌صورت خودکار استخراج و تحلیل شوند."
              }
            },
            {
              "@type": "Question",
              name: "چرا بررسی همزمان فاکتورها دقیق‌تر از خواندن محدوده مرجع تکی است؟",
              acceptedAnswer: {
                "@type": "Answer",
                text: "فاکتورهای آزمایشگاهی در بدن به هم وابسته‌اند. برای نمونه، هموگلوبین پایین به‌تنهایی فقط با هموگلوبین پایین همراه با فریتین و MCV پایین (الگوی کم‌خونی فقر آهن) یا در کنار پلاکت پایین معنای بالینی کاملاً متفاوتی دارد."
              }
            },
            {
              "@type": "Question",
              name: "آیا نتیجه تفسیر آنلاین آزمایش خون جایگزین نظر پزشک است؟",
              acceptedAnswer: {
                "@type": "Answer",
                text: "خیر. آزمایار ابزار کمکی آموزشی و بالینی برای درک بهتر برگه و آماده‌سازی برای گفت‌وگو با پزشک است و هرگز جایگزین معاینه و تصمیم پزشک معالج نخواهد بود."
              }
            },
            {
              "@type": "Question",
              name: "چه آزمایش‌هایی در سامانه آزمایار پوشش داده شده‌اند؟",
              acceptedAnswer: {
                "@type": "Answer",
                text: "بیش از ۳۰۰ آزمایش شامل شمارش کامل خون (CBC)، قند خون و HbA1c، چربی‌ها، کبد، کلیه، تیروئید، الکترولیت‌ها، ویتامین‌ها، آزمایش ادرار و نشانگرهای تشخیصی پوشش داده شده‌اند."
              }
            }
          ]
        }
      ]
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
  } else if (p === "/methodology") {
    title = `روش‌شناسی تفسیر آزمایش: از قاعده تا جملهٔ ساده — ${BRAND_FA}`;
    description = "آزمایار چطور تفسیر می‌کند: هر قاعده پیش از کد در سند قواعد بالینی ثبت می‌شود، منبعش کنار هر یافته می‌آید، واحد ناشناخته تفسیر نمی‌شود و هیچ تشخیصی داده نمی‌شود.";
    ogType = "article";
    bodyHtml = renderStaticArticle(title, description, [
      { t: "هر قاعده پیش از کد ثبت می‌شود", d: "هیچ آستانه‌ای حین کدنویسی اختراع نمی‌شود؛ هر قاعده با بازهٔ مرجع، آستانهٔ بحرانی، توصیهٔ پیگیری، سطح اطمینان، منبع و تاریخ بازبینی ثبت و سپس به موتور راه می‌یابد. منبع هر یافته کنار همان یافته در خروجی نمایش داده می‌شود." },
      { t: "عدد تا وقتی واحدش معلوم نباشد تفسیر نمی‌شود", d: "مقدار بی‌واحد یا ناخوانا حدس زده نمی‌شود و به فهرست «تفسیر نشدند» می‌رود؛ تبدیل واحد فقط با واحدِ چاپ‌شده روی برگه انجام می‌شود." },
      { t: "خروجی: یافته + سطح فوریت، نه تشخیص", d: "هر یافتهٔ خارج از محدوده یکی از چهار سطح «فوری — همین امروز»، «ظرفِ ۲۴ تا ۴۸ ساعت»، «این هفته» یا «نوبت عادی» را می‌گیرد. جملهٔ خروجی هرگز تشخیص قطعی نمی‌دهد." },
      { t: "هر تغییر در موتور از دروازهٔ تست رد می‌شود", d: "بیش از هزار تست خودکار روی موتور اجرا می‌شود تا اصلاح یک قاعده، خروجی موردهای دیگر را بی‌صدا خراب نکند. اگر قاعده‌ای وجود نداشته باشد، آن ردیف تفسیرنشده می‌ماند." },
      { t: "این سامانه چه کاری نمی‌کند", d: "معاینه و شرح‌حال نمی‌گیرد، تشخیص نمی‌دهد، توصیهٔ دارویی نمی‌دهد و جای پزشک معالج را نمی‌گیرد." },
    ]);
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `روش‌شناسی تفسیر آزمایش — ${BRAND_FA}`,
      url: `${ORIGIN}/methodology`,
      description,
      inLanguage: "fa-IR",
    };
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
