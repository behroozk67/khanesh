// ارسالِ آدرس‌های سایت به IndexNow (موتورهای Bing/Yandex/Seznam/Naver).
// چرا: سابمیتِ سایتمپ در گوگل دستی است، ولی این‌ها یک API عمومی دارند و
// «تازه‌منتشرشده» را در چند دقیقه خبردار می‌کنند — برای سایتِ تازه حیاتی است.
//
// پیش‌نیاز: فایلِ public/<KEY>.txt با محتوای خودِ KEY روی سایت سرو شود
// (Vite پوشهٔ public را در build کپی می‌کند؛ پس با هر استقرار باقی می‌ماند).
// اجرا: node scripts/indexnow.mjs

const KEY = process.env.INDEXNOW_KEY || "9f2c7a4e6b8d1c3f5a7e9b0d2c4f6a81";
const HOST = "azmayarapp.ir";
const ORIGIN = `https://${HOST}`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

const res = await fetch(`${ORIGIN}/sitemap.xml`);
if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`);
const xml = await res.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!urls.length) throw new Error("هیچ آدرسی در سایتمپ نبود");

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `${ORIGIN}/${KEY}.txt`,
  urlList: urls,
};

const post = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
const text = await post.text();
console.log(`IndexNow: ${post.status} ${post.statusText} — ${urls.length} آدرس`);
if (text.trim()) console.log(text.slice(0, 400));
// 200/202 = پذیرفته شد؛ 403 = کلید پیدا نشد؛ 422 = آدرس‌ها با host نمی‌خوانند
if (![200, 202].includes(post.status)) process.exitCode = 1;
