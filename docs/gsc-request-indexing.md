# گام ۳ — Request Indexing در Search Console (چک‌لیستِ دقیق آزمایار)

> وضعیتِ تازه‌سنجی‌شدهٔ ۱۸ اکتبر ۲۰۲۶:
> * متاتگِ تأیید **زنده است**: `google-site-verification = r9-q14…uP88` روی `https://azmayarapp.ir/`.
> * **رکورد TXT وجود ندارد** (`nslookup -type=TXT azmayarapp.ir`) ⇒ پراپرتیِ **Domain** ساخته/تأیید **نمی‌شود**.
>   پس پراپرتی باید **URL prefix** با مقدار `https://azmayarapp.ir/` باشد.
> * `http://azmayarapp.ir` → `301` · `https://www.azmayarapp.ir` → `200` با `canonical=https://azmayarapp.ir/`
>   (پس www نیازی به پراپرتیِ جدا ندارد؛ گوگل از طریقِ canonical ادغام می‌کند).
> * `robots.txt` → `Allow: /` + `Sitemap: https://azmayarapp.ir/sitemap.xml`.
> * `sitemap.xml` → ۳۰۴ آدرس؛ همهٔ ۱۰ آدرسِ زیر `200` هستند.

---

## مرحلهٔ ۰ — انتخابِ پراپرتی (یک‌بار)

1. `search.google.com/search-console` را با حسابی باز کن که **مالکِ متاتگ** است.
2. اگر فهرستِ پراپرتی خالی است: **Add property** → ستونِ **URL prefix** (نه Domain) →
   `https://azmayarapp.ir/` (با اسلشِ پایانی).
3. روشِ تأیید: **HTML tag** — تگ از قبل روی سایت نشسته، پس **Verify** باید همان لحظه «Ownership verified» بدهد.
   اگر «Verification failed» داد، ۳۰ ثانیه صبر و دوباره؛ کشِ کلودفلر می‌تواند چند دقیقه دیر بدهد.
4. اگر پراپرتی از قبل هست و تأیید شده، برو مرحلهٔ ۱.

## مرحلهٔ ۱ — Sitemaps

1. منوی چپ → **Sitemaps**.
2. در کادر «Add a new sitemap» فقط `sitemap.xml` را بنویس (دامنه از قبل انتخاب شده) → **Submit**.
3. انتظار: `Status: Success` و `Discovered URLs: 304` (اگر `Couldn't fetch` داد، `Test live` را بزن؛
   `curl -s https://azmayarapp.ir/sitemap.xml | grep -c '<url>'` باید ۳۰۴ بدهد).

## مرحلهٔ ۲ — URL Inspection (اصلِ گام ۳)

برای هر آدرس، دقیقاً همین ترتیب:

1. کادرِ جست‌وجوی بالای سرچ‌کنسول (URL Inspection) → آدرس را پیست کن → **Enter**.
2. صبر کن تا «Retrieving data from Google Index» تمام شود.
3. دکمهٔ **Test Live URL** را بزن → بعد از چند ثانیه باید بگوید
   **«URL is available to Google»** با تیکِ سبز. این همان شاهدِ گام ۵ است (کلودفلر گوگل‌بات را چالش نمی‌کند).
4. برگرد به نمای **Google Index** → دکمهٔ **Request Indexing** را بزن → پیام
   «Indexing requested / Added to a priority crawl queue».
5. سهمیهٔ روزانه حدوداً ۱۰–۱۲ آدرس به‌ازای هر پراپرتی است؛ اگر **Quota exceeded** داد، بقیه را فردا بزن.
   درخواستِ دوبارهٔ یک آدرس اثرِ مثبتی ندارد — فقط در صف دوباره می‌نشیند.

### ترتیبِ پیشنهادیِ آدرس‌ها (اولویت از بالا)

```
https://azmayarapp.ir/
https://azmayarapp.ir/methodology
https://azmayarapp.ir/test/cbc
https://azmayarapp.ir/test/tsh
https://azmayarapp.ir/test/hba1c
https://azmayarapp.ir/test/vitd
https://azmayarapp.ir/test/ferritin
https://azmayarapp.ir/tests
https://azmayarapp.ir/reference-ranges
https://azmayarapp.ir/units-guide
```
(دستهٔ اول = صفحهٔ اصلی + ۵ صفحهٔ آزمایشیِ پرترافیک + روش‌شناسی؛ این ۶ تا را در روز اول بزن.)

## مرحلهٔ ۳ — پیگیری (نه زدنِ دوبارهٔ دکمه)

| چه چیزی | کجا | انتظار |
|---|---|---|
| تعدادِ ایندکس‌شده | **Indexing → Pages** | `Indexed` بالا، `Crawled - currently not indexed` کم‌کم کم می‌شود |
| چرا ایندکس نشد | همان صفحه → `Why pages aren't indexed` | برای `Crawled/discovered – currently not indexed` ریشه **کیفیت/اعتبار** است، نه دسترسی |
| وضعیتِ زندهٔ یک آدرس | URL Inspection | «URL is on Google» |
| کوئری‌های واقعی | **Performance → Queries** | از ۲–۳ هفته بعد معنا پیدا می‌کند |

`Crawled – currently not indexed` با «درخواستِ بیشتر» حل نمی‌شود؛ با **محتوا + لینکِ داخلی + بک‌لینک** حل می‌شود.
(پیامِ صریحِ گوگل: درخواست‌های مکرر فقط صف را شلوغ می‌کند.)

## مرحلهٔ ۴ — بعد از هر انتشارِ محتوای جدید

```bash
cd khanesh && npm run indexnow     # Bing/Yandex/Seznam — پاسخِ «200 — N آدرس» یعنی پذیرفته شده
```
و اگر صفحه واقعاً مهم بود، همان یک آدرس را در **URL Inspection → Request Indexing** بزن.
