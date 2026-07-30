# اعتبارِ عکس‌ها — public/lab/

همهٔ عکس‌های این پوشه از **Unsplash** گرفته شده‌اند و زیر
[پروانهٔ Unsplash](https://unsplash.com/license) منتشر شده‌اند: استفادهٔ رایگان،
شاملِ استفادهٔ تجاری، بدونِ الزام به ذکرِ منبع. با این حال منبع را اینجا ثبت
می‌کنیم، هم چون Unsplash خودش این کار را توصیه می‌کند و هم برای اینکه بعداً
معلوم باشد هر فایل از کجا آمده.

> ⚠️ عکس‌های **Unsplash+** (اشتراکی/پولی) عمداً کنار گذاشته شدند. دو گزینهٔ
> خوب در جست‌وجوی اولیه پیدا شد که پرچمِ `plus` داشتند و به همین دلیل حذف
> شدند. اگر روزی عکسی به این پوشه اضافه شد، اول باید مطمئن شد که
> Unsplash+ نیست.

| فایل | کاربرد در صفحه | ابعاد | عکاس | شناسهٔ عکس |
|---|---|---|---|---|
| `hero.jpg`  | عکسِ بالای صفحهٔ فرود             | ۹۰۰×۹۰۰   | Chidera Faustina Okeke (@thefourthwxll)   | [XLQuTdktpa8](https://unsplash.com/photos/XLQuTdktpa8) |
| `band-1.jpg`| نوارِ عریضِ اول («چطور کار می‌کند») | ۱۴۴۰×۴۸۰ | Adam Bezer (@bezer)                       | [ulSn5MdlSOw](https://unsplash.com/photos/ulSn5MdlSOw) |
| `band-2.jpg`| نوارِ عریضِ دوم                   | ۱۴۴۰×۴۸۰ | ThisisEngineering (@thisisengineering)    | [8yS04veb1TQ](https://unsplash.com/photos/8yS04veb1TQ) |
| `res-1.jpg` | منابع — «عکس گرفتن از برگه»       | ۷۶۸×۴۳۲   | Malcolm Choong 鍾声耀 (@malcolm_choong)    | [h4l-G5-xzzU](https://unsplash.com/photos/h4l-G5-xzzU) |
| `res-2.jpg` | منابع — «محدودهٔ مرجع» (کارتِ اصلی)| ۹۰۰×۶۰۰   | Mezidi Zineb (@mezidi_zineb)              | [P6ayjlwUe7c](https://unsplash.com/photos/P6ayjlwUe7c) |
| `res-3.jpg` | منابع — «واحدهای SI»              | ۷۶۸×۴۳۲   | Mezidi Zineb (@mezidi_zineb)              | [6XVdhgyls-k](https://unsplash.com/photos/6XVdhgyls-k) |
| `news.jpg`  | آخرین به‌روزرسانی‌ها               | ۹۰۰×۶۰۰   | Stephan HK (@chromatograph)               | [c4AVTGjLP2s](https://unsplash.com/photos/c4AVTGjLP2s) |

> **بازآوریِ ۷ مرداد ۱۴۰۵ — هر هفت عکس عوض شد.** مجموعهٔ قبلی از نظر پروانه
> درست بود ولی به‌دیداری قدیمی می‌نمود: صفحه‌کلیدهای بژ، مانیتورهای CRT و
> راهروهای اداریِ اواخرِ دههٔ ۲۰۰۰. صفحه‌ای که ادعا می‌کند برگهٔ آزمایش را با
> یک موتورِ به‌روز می‌خواند، نباید عکسِ آزمایشگاهِ بیست سال پیش را نشان دهد.
> جایگزین‌ها همه آزمایشگاهِ مدرن‌اند: میزِ کارِ روشن، آنالایزرِ خودکار، نمایشگرِ
> لمسی، جالولهٔ نمونه.
>
> ⚠️ هر فایل **دقیقاً** به نسبتِ قابِ خودش در `site.css` بریده شده
> (`crop=entropy` روی CDNِ Unsplash)، نه به نسبتِ اصلیِ عکس. برای همین
> `width`/`height` در `Landing.jsx` با `aspect-ratio` یکی است و `object-fit:
> cover` چیزی نمی‌بُرد. اگر فایلی را عوض کردید، هر سه عدد را با هم عوض کنید.

## فونتِ لوگو

`public/fonts/Poppins-600-latin.woff2` و `Poppins-700-latin.woff2` —
[Poppins](https://fonts.google.com/specimen/Poppins) از Indian Type Foundry و
Jonny Pinhorn، زیرِ پروانهٔ **SIL Open Font License 1.1**. فقط زیرمجموعهٔ لاتین
دانلود شده (هرکدام حدود ۸ کیلوبایت)، چون تنها جایی که به کار می‌رود لوگوتایپِ
«LabMate» است؛ متنِ فارسی همچنان با Vazirmatn رندر می‌شود.
