// تستِ sitemap و فهرستِ مسیرهای عمومی.  اجرا: npm test
// تست‌های بخشِ «خروجیِ build» فقط وقتی dist/ وجود دارد اجرا می‌شوند (npm run build && npm test).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { GUIDES, testPath, catPath } from "../src/testCatalog.js";
import { REF } from "../src/labRefs.js";
import { publicRoutes, publicPaths, testKeys, EXCLUDED_PREFIXES, STATIC_PAGES } from "./site-routes.mjs";
import { sitemapEntries, renderSitemap, gitLastmod } from "./gen-sitemap.mjs";

const APP = fileURLToPath(new URL("..", import.meta.url));
const ORIGIN = "https://azmayarapp.ir";
const locsOf = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test("S1 هر آزمایشِ کاتالوگ و هر دسته در sitemap هست", () => {
  const paths = new Set(publicPaths());
  for (const g of GUIDES) {
    assert.ok(paths.has(catPath(g.id)), `دسته جا مانده: ${g.id}`);
    for (const i of g.items) assert.ok(paths.has(testPath(i.k || i.slug)), `آزمایش جا مانده: ${i.k || i.slug}`);
  }
  // شمار: صفحه‌های ثابت + دسته‌ها + آزمایش‌های یکتا — هیچ آدرسی بی‌صدا حذف یا تکرار نشده
  assert.equal(paths.size, STATIC_PAGES.length + GUIDES.length + testKeys().length);
});

test("S2 هر آزمایشِ فرم (REF) که در دسته‌ها آمده صفحه دارد", () => {
  const keys = new Set(testKeys());
  const listed = new Set(GUIDES.flatMap((g) => g.items.filter((i) => i.k).map((i) => i.k)));
  for (const k of listed) {
    assert.ok(REF[k], `کلیدِ ${k} در دسته‌ها هست ولی در REF نیست`);
    assert.ok(keys.has(k));
  }
});

test("S3 آدرس‌ها یکتا، مطلق، بدون اسلشِ پایانی و بدون نویسهٔ ناامن‌اند", () => {
  const entries = sitemapEntries({ origin: ORIGIN, lastmodOf: () => "2026-01-01" });
  const locs = entries.map((e) => e.loc);
  assert.equal(new Set(locs).size, locs.length, "آدرسِ تکراری");
  for (const loc of locs) {
    assert.ok(loc.startsWith(`${ORIGIN}/`), loc);
    const path = loc.slice(ORIGIN.length);
    if (path !== "/") assert.ok(!path.endsWith("/"), `اسلشِ پایانی: ${loc}`);
    assert.match(path, /^\/[A-Za-z0-9\-._~/]*$/, `نویسهٔ خارج از محدودهٔ امنِ URL: ${loc}`);
    assert.equal(new URL(loc).pathname, path);
  }
});

test("S4 هیچ مسیرِ خصوصی یا تراکنشی در sitemap نیست", () => {
  for (const p of publicPaths())
    for (const x of EXCLUDED_PREFIXES)
      assert.ok(!(p === x || p.startsWith(`${x}/`)), `مسیرِ مستثنا در sitemap: ${p}`);
});

test("S5 robots.txt هیچ آدرسِ sitemap را نمی‌بندد و به sitemap اشاره می‌کند", () => {
  const robots = readFileSync(join(APP, "public/robots.txt"), "utf-8");
  assert.match(robots, new RegExp(`^Sitemap:\\s*${ORIGIN}/sitemap\\.xml\\s*$`, "m"));
  const disallows = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
  assert.ok(!disallows.includes("/"), "Disallow: / کلِ سایت را می‌بندد");
  for (const p of publicPaths())
    for (const d of disallows) assert.ok(!p.startsWith(d), `robots.txt آدرسِ ${p} را با «Disallow: ${d}» می‌بندد`);
});

test("S6 هر Route عمومیِ App.jsx یا در sitemap است یا صریحاً مستثنا شده", () => {
  const app = readFileSync(join(APP, "src/App.jsx"), "utf-8");
  const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== "*");
  assert.ok(routes.length > 10, "الگوی Route در App.jsx پیدا نشد؛ این تست را به‌روز کنید");
  const paths = new Set(publicPaths());
  for (const r of routes) {
    if (EXCLUDED_PREFIXES.some((x) => r === x || r.startsWith(`${x}/`))) continue;
    if (r.includes(":")) {
      // مسیرِ پارامتری باید دست‌کم یک نمونه در sitemap داشته باشد
      const prefix = r.slice(0, r.indexOf(":"));
      assert.ok([...paths].some((p) => p.startsWith(prefix)), `مسیرِ پارامتریِ بی‌نمونه: ${r}`);
    } else {
      assert.ok(paths.has(r), `Route عمومیِ «${r}» نه در sitemap است نه در EXCLUDED_PREFIXES`);
    }
  }
});

test("S7 XML خوش‌ساخت است و lastmod تاریخِ معتبرِ غیرِآینده دارد", () => {
  const entries = sitemapEntries({ origin: ORIGIN });
  const xml = renderSitemap(entries);
  assert.ok(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`));
  assert.ok(xml.trimEnd().endsWith("</urlset>"));
  assert.equal((xml.match(/<url>/g) || []).length, entries.length);
  assert.equal((xml.match(/<\/url>/g) || []).length, entries.length);
  assert.deepEqual(locsOf(xml), entries.map((e) => e.loc));
  assert.ok(entries.length <= 50000, "سقفِ پروتکلِ sitemap");
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  for (const e of entries) {
    assert.match(e.lastmod, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!Number.isNaN(Date.parse(e.lastmod)) && e.lastmod <= tomorrow, `lastmod نامعتبر: ${e.lastmod}`);
  }
});

test("S8 lastmod پایدار است: دو بار ساختن، خروجیِ یکسان می‌دهد و بدون git به fallback می‌افتد", () => {
  const lastmodOf = (sources) => (sources.includes("src/labRefs.js") ? "2026-10-01" : null);
  const a = renderSitemap(sitemapEntries({ lastmodOf, fallback: "2026-11-01" }));
  const b = renderSitemap(sitemapEntries({ lastmodOf, fallback: "2026-11-01" }));
  assert.equal(a, b);
  assert.match(a, /<loc>https:\/\/azmayarapp\.ir\/test\/tsh<\/loc><lastmod>2026-10-01<\/lastmod>/);
  assert.match(a, /<loc>https:\/\/azmayarapp\.ir\/contact<\/loc><lastmod>2026-11-01<\/lastmod>/);
  assert.equal(gitLastmod(["src/labRefs.js"], "/"), null, "بیرون از مخزن باید null بدهد، نه خطا");
});

test("S9 فایل‌های منبعِ lastmod واقعاً وجود دارند", () => {
  const all = new Set(publicRoutes().flatMap((r) => r.sources));
  for (const s of all) assert.ok(existsSync(join(APP, s)), `منبعِ lastmod پیدا نشد: ${s}`);
});

// ---------- خروجیِ build ----------
const DIST = join(APP, "dist");
const built = existsSync(join(DIST, "index.html"));
const skip = built ? false : "dist/ نیست — اول npm run build";

const htmlFor = (p) => join(DIST, p === "/" ? "index.html" : `${p.slice(1)}/index.html`);

test("B1 هر آدرسِ sitemap یک HTML پیش‌رندرشده با canonical خودش دارد", { skip }, () => {
  for (const p of publicPaths()) {
    const f = htmlFor(p);
    assert.ok(existsSync(f), `HTML ساخته نشده: ${p}`);
    const html = readFileSync(f, "utf-8");
    assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN}${p}" />`), `canonical غلط: ${p}`);
    assert.match(html, /<meta name="robots" content="index,follow" \/>/, `robots: ${p}`);
    assert.match(html, /<h1[\s>]/, `بدون h1: ${p}`);
    assert.ok(!/<div id="root"><\/div>/.test(html), `root خالی (پیش‌رندر نشده): ${p}`);
  }
});

test("B2 هیچ HTML پیش‌رندرشده‌ای بیرون از sitemap نیست", { skip }, () => {
  const found = [];
  const walk = (dir, rel) => {
    for (const n of readdirSync(dir)) {
      const full = join(dir, n);
      if (statSync(full).isDirectory()) {
        if (rel === "" && ["assets", "fonts", "lab", "wasm", "standard_fonts", "cmaps"].includes(n)) continue;
        walk(full, `${rel}/${n}`);
      } else if (n === "index.html") found.push(rel || "/");
    }
  };
  walk(DIST, "");
  const paths = new Set(publicPaths());
  for (const p of found) assert.ok(paths.has(p), `صفحهٔ ساخته‌شده ولی بیرون از sitemap: ${p}`);
  assert.equal(found.length, paths.size);
});

test("B3 dist/sitemap.xml همان فهرست را دارد", { skip }, () => {
  const xml = readFileSync(join(DIST, "sitemap.xml"), "utf-8");
  assert.deepEqual(locsOf(xml), publicPaths().map((p) => `${ORIGIN}${p}`));
});

test("B4 title و description هر صفحه یکتاست و JSON-LD پارس می‌شود", { skip }, () => {
  const titles = new Map();
  const descs = new Map();
  for (const p of publicPaths()) {
    const html = readFileSync(htmlFor(p), "utf-8");
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    assert.ok(title && title.length > 10, `title ندارد: ${p}`);
    assert.ok(!titles.has(title), `title تکراری: ${p} و ${titles.get(title)}`);
    titles.set(title, p);
    const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    assert.ok(desc && desc.length > 40, `description ندارد یا کوتاه است: ${p}`);
    assert.ok(!descs.has(desc), `description تکراری: ${p} و ${descs.get(desc)}`);
    descs.set(desc, p);
    for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))
      assert.doesNotThrow(() => JSON.parse(m[1]), `JSON-LD خراب: ${p}`);
  }
});
