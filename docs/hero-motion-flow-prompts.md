# موشنِ هیرو — پرامپت‌های Google Flow

> این سند **پرامپت** است، نه کد. هیچ فایلی را عوض نمی‌کند.
> هر عددی که از Flow انتظار داریم، از دو صفحهٔ رسمی پشتیبانی گوگل گرفته شده
> («Learn about Google Flow models & supported features» و «Where you can use
> Google Flow») و در §۴ با همان قیدها آمده — نه از حافظه.

---

## ۰. تصمیم در یک پاراگراف

تصویرِ فعلیِ هیرو (`khanesh/public/lab/hero_ai_desk.webp`، ۲۱۶۰×۲۱۶۰) را
**نباید** به همان شکل متحرک کرد. دلیلش سلیقه نیست؛ سه قاعدهٔ نوشته‌شدهٔ خودِ
این ریپو است که تصویر نقضشان می‌کند. موشن باید «مکانیزمِ واقعیِ محصول» را
نشان دهد، نه «هولوگرامِ مغزِ هوش مصنوعی» را: یک **ارزش** داخل یک **محدودهٔ
مرجع** می‌نشیند. آن لحظه، کلِ حرفِ محصول است و هستهٔ آن هم در کد وجود دارد.

---

## ۱. چرا این تصویر را دست‌نخورده متحرک نکنیم

سه نقضِ مستند، هر سه با ارجاع:

**۱.۱ — «نمرهٔ سلامت» و «درصد» ساختگی است و صریحاً ممنوع شده.**
تصویر دو پنل دارد: `OVERALL HEALTH SCORE 91/100` و `IRON DEFICIENCY 94%`.
هیچ‌کدام در موتور وجود ندارد (`rules/` چنین فیلدی ندارد). سه سند جدا این را
ممنوع کرده‌اند:

- `.specs/reports/design-reference.md:672` —
  «A single overall health score or percentage (the 82 ring, "Heart Health 68%").
  No engine field means this and there is no defensible way to compute one from a
  lab sheet. Any ring we ship must display a COUNT («۳ مورد خارج از محدوده») or an
  urgency level, never an invented score.»
- `.specs/reports/eval-spec.yaml:179` (نقصِ DQ6) — «a client-side "risk score",
  "health score", "biological age", or 0–100 gauge synthesised from the numbers».
- `khanesh/src/Scorecard.jsx:8-12` — «چیزی که اینجا عمداً **نیست**: نمرهٔ سلامت،
  درصد، «سن زیستی» … موتور هیچ فیلدی برای «نمره» ندارد و ساختنش از روی برگهٔ
  آزمایش قابل دفاع نیست.»

یک تصویرِ ساکن، سهواً از این قاعده رد شده. اگر همان پنل‌ها را در ۱۵ ثانیه
بزرگ و متحرک کنیم، دیگر سهو نیست: محصول دارد می‌گوید «۹۴٪ کمبود آهن داری».

**۱.۲ — تصویر، خلافِ متنِ بالای خودش حرف می‌زند.**
`khanesh/src/Landing.jsx:179-180` می‌گوید: «وضعیت طبیعی یا غیرطبیعی بودن
نتایج توسط یک سیستم دقیقِ علمی سنجیده می‌شود، **نه هوش مصنوعی**. نقش هوش
مصنوعی در اینجا، تنها ساده‌سازی این یافته‌های تخصصی برای شماست.»
اما تصویر، شبکهٔ عصبیِ نورانیِ درخشان را در مرکز قاب گذاشته. موشن دقیقاً
همان چیزی را پررنگ می‌کند که متن نفی می‌کند.

**۱.۳ — پالت، رنگِ دومِ ممنوعه است.**
`khanesh/src/index.css:14` — «**هیچ هگز و هیچ rgba() بیرون از این فایل نوشته
نمی‌شود** … اگر جایی رنگِ خام دیدید، یعنی منبعِ حقیقتِ دوم دارد ساخته
می‌شود.» کلِ محصول سبزآبیِ گرم (`--brand #2f6f6b`) روی کرمِ گرم
(`--page #faf7f0`) است؛ هولوگرامِ آبی-فیروزه‌ایِ سای‌فای در تصویر، همان
«آبیِ سومِ خارج از پالت» است که `index.css:86-87` یک بار در کامنتِ پاصفحه
حذفش کرده.

**۱.۴ (فرعی) — برگهٔ داخل تصویر لاتینِ انگلیسی است** با یک «Logo» جعلی در
سربرگش، برای محصولی که تماماً RTL و فارسی است.

**نتیجه:** اول قابِ اول را بازتولید کنید (پرامپتِ تصویر در §۲)، بعد متحرکش
کنید. اگر نمی‌خواهید قاب را عوض کنید، حداقل موشن را روی چیزی ببرید که آن
پنل‌ها در آن دیده نشوند (کادرِ بسته روی فنجان و گوشهٔ کاغذ).

---

## ۲. چهار ایده

### ایدهٔ ۱ ⭐ — «ورود به محدودهٔ مرجع»

**حرف:** محصول یک هولوگرامِ هوشمند نیست؛ یک قاعدهٔ دقیق است که می‌گوید یک
عدد کجای بازهٔ مرجع نشسته. گرامرِ بصری‌اش هم در خودِ اپ هست (نوارِ
محدوده/`RangeBand`). این ایده همان را به هیرو می‌آورد.

**قابِ اول (تولید تصویر — مدل تصویریِ داخل Flow):**

```
Photorealistic macro product shot, 16:9, of a warm wooden desk in a calm home
office, seen from a low table-height angle. Objects: a plain printed laboratory
report sheet with abstract grey ruled lines and NO readable writing, a white
ceramic coffee cup with a thin wisp of steam, a closed dark tablet at the left
edge, a softly blurred living-room window and a potted plant in the background.
Above the sheet floats one clean horizontal translucent band, like a measuring
ruler seen through glass: mint-teal glass (#2f6f6b tinted), matte, no glow
bloom, no sci-fi circuitry, no sphere, no brain, no neural network, no graphs.
A single small solid teal dot hangs on a thin vertical hairline just below the
band's lower edge. Palette: warm cream, warm wood, sage green, deep teal accents.
Soft morning window light from the left. Shallow depth of field, 50mm, focus on
the sheet. Editorial product photography, calm and clinical-warm, not futuristic.
Absolutely no text, no letters, no numbers, no logos, no user-interface panels,
no people, no faces anywhere in the frame.
```

**پرامپتِ موشن (Frames to Video: First — ۸ ثانیه، ۱۶:۹):**

```
Use the provided image as the exact first frame; keep its composition, framing,
colour and lighting unchanged. Add only this motion, in this order:
[00:00-00:02] Almost imperceptible: the scene breathes. Steam rises from the
coffee cup and drifts slowly to the right. Fine dust motes float through the
window light.
[00:02-00:05] The horizontal band brightens softly as if lit from within, then
steadies. Its mint-teal edge gains a thin, crisp rim. Nothing else moves.
[00:05-00:09] The small teal dot slides smoothly to the right along the band,
crosses the band's lower edge, and comes to rest just below it. The band's lower
edge warms to a soft amber for a moment, then returns to teal.
Camera: locked-off tripod, 50mm lens, no movement, no zoom, no handheld shake.
Lighting: soft and stable; no flicker, no lens flare, no colour shift.
Audio: quiet room tone, a faint paper rustle, one soft ceramic clink. No music,
no voice, no whoosh, no riser.
Negative: no text, letters, numbers, glyphs or logos appear anywhere; no new
objects; no people or hands; no red flashing; no alarm; no glitch; no glitchy
hologram; no additional graphs or panels; do not change the shape of the objects.
```

> ⚠️ رنگِ هشدار **کهربایی** است، نه قرمز. قاعدهٔ پروژه:
> `index.css:108` — «قرمز انحصاراً برای اورژانس است — نه در لینک، نه در خطای
> فرم، نه در دکمهٔ حذف.» یک «کمی پایین‌تر از بازه» اورژانس نیست.

**ادامه برای رسیدن به ۱۵ ثانیه (Extend videos — فقط روی کلیپِ ۸ ثانیه‌ای و
فقط با Veo 3.1 Lite؛ §۴):**

```
Continue from the last frame of the previous clip without any cut. Keep the
camera locked and the lighting identical. The band lifts gently off the desk by
a few centimetres, then settles back down and fades into the paper. The dot
stays where it stopped. The steam above the coffee keeps drifting. In the final
two seconds the scene returns to complete stillness, with the paper and the cup
in the same positions they had at the start.
No text, letters, numbers or logos. No new objects, no people, no red, no alarm.
```

---

### ایدهٔ ۲ — «تنفس» (امن‌ترین؛ ۸ ثانیهٔ لوپ‌شو)

جای `animation: breathing-pov` فعلی (`site.css:943`) را می‌گیرد: همان قاب،
ولی با حرکتی که واقعاً اتفاق افتاده. چون فریمِ آخر = فریمِ اول، لوپش دیده
نمی‌شود و در هیرو هیچ‌وقت «تمام نمی‌شود».

```
Using the provided image as the exact first frame, create a subtle seamless
loop. A locked-off camera, 50mm, shallow depth of field. Only ambient life
moves: steam rises from the coffee cup in a slow curl, fine dust motes drift
through the window light on the left, the floating data columns above the sheet
rise by a couple of pixels and settle, one slow soft pulse travels along the rim
of the glass sphere, and the near corner of the printed sheet lifts two
millimetres and settles once. The final frame must match the first frame exactly
so the clip loops invisibly. Calm, quiet, almost still — the mood of an early
morning at a desk.
Audio: soft room tone only, no music, no voice.
Negative: no camera movement, no zoom, no text, no numbers, no new objects, no
people, no flicker, no glitch, no red.
```

> اگر تصمیم گرفتید قابِ اول همان تصویر فعلی بماند، این تنها پرامپتی است که
> می‌شود با خیال راحت داد: پنل‌های `91/100` و `94%` تکان نمی‌خورند، پس
> توجّهی به‌سویشان جلب نمی‌شود. ولی §۱.۱ با این حال باز می‌مانَد.

---

### ایدهٔ ۳ — «دو زبان، یک برگه» (فیلمِ برند، برای شبکه‌های اجتماعی)

یک حرکتِ پیوسته از سرد به گرم: همان برگه تنها شیئی است که از قابِ اول به
قابِ دوم می‌رسد. تزِ بصری‌اش این است: «آزمایشگاه به زبان خانه».

```
A single continuous shot, no cuts. It starts in a cold clinical laboratory
corridor under cool white fluorescent light: stainless steel, pale blue-grey
surfaces, an empty waiting bench, completely deserted, no people anywhere. A
single printed laboratory report sheet lies on the bench. The camera pushes in
slowly toward the sheet until it fills the frame, and as the sheet's white paper
fills the entire frame, the light changes from cold clinical white to warm cream
and the shot resolves into a home desk under a soft morning lamp, with a white
coffee cup, a closed tablet, and a potted plant. The sheet is now resting on the
warm wooden desk, lit by warm window light with a calm deep-teal reflection on
its surface. The camera slowly pulls back to a medium shot and holds.
Camera: 35mm, smooth dolly, one continuous take, no cuts, no whip pans.
Lighting: the only change is the colour temperature of the light, cold to warm.
Audio: fluorescent hum and footsteps-free silence in the first half, then quiet
room tone, a distant bird, and a soft ceramic settle in the second half. No
music, no voice.
Negative: no text, letters, numbers or logos on the sheet; no people, no faces,
no hands, no doctors; no cyan sci-fi glow; no graphics or holograms.
```

---

### ایدهٔ ۴ — «برگی که بلند می‌شود» (برای بخشِ «چطور کار می‌کند»، نه هیرو)

این را در پنلِ `.site-how-hero` بگذارید (تیتر: «تحلیل هوشمند، تصمیم‌گیری
آگاهانه»)، نه در هیرو — چون هیرو نباید ۱۵ ثانیه توضیح بدهد.

```
Using the provided image as the exact first frame: the horizontal ruled rows of
the printed report sheet detach from the paper and rise ten centimetres into the
air as thin, clean, matte-cream ribbons. They hover, straighten themselves into
an orderly stacked list, hold for a moment, then slide back down and settle flat
onto the sheet, perfectly aligned with the printed lines. The camera slowly
orbits fifteen degrees around the desk, keeping the sheet centred, with visible
parallax between the coffee cup in the foreground and the blurred living room
behind. Warm morning light, shallow depth of field, calm and precise.
Audio: a soft paper whisper and a low warm hum. No music, no voice.
Negative: no text, no letters, no numbers, no logos, no readable writing on the
ribbons; no people, no hands, no faces; no cyan glow; no sparks; no glitch.
```

---

## ۳. روشِ دو لایه — متنِ فارسی را به Flow نسپارید

**هیچ‌کدام از پرامپت‌های بالا متن نمی‌خواهند، و این عمدی است.** دو دلیل:

۱. Veo در رندرِ متنِ داخل قاب ضعیف است، و در **فارسیِ راست‌به‌چپ** بدتر:
   حروف می‌چسبند، ناقص می‌آیند یا به شکلِ تزئینیِ بی‌معنا در می‌آیند.
۲. مهم‌تر: عددی که داخل فایلِ ویدیو پخته شود، **منبعِ حقیقتِ دوم** است —
   همان چیزی که `index.css:14` برای رنگ و `CLAUDE.md` برای متن منع کرده.

پس کار را دو لایه کنید:

| لایه | ابزار | محتوا |
|---|---|---|
| پلیتِ حرکتی | Google Flow | فقط نور، کاغذ، بخار، حرکتِ دوربین. بدون یک نویسه. |
| لایهٔ متن | خودِ وب (DOM/CSS) یا تدوینگر | متن و عددِ فارسی، با فونتِ خودِ پروژه |

مزیتِ لایهٔ وب: متنِ فارسی با `public/fonts/Vazirmatn-VF.woff2` (همان فونتی
که `index.css:41` تعریف کرده) رندر می‌شود، **قابلِ انتخاب و خواندن برای
اسکرین‌ریدر و ایندکسِ گوگل** است، و عددها می‌توانند زنده از خودِ موتور بیایند
نه از یک فایلِ ثابت. اگر روزی عدد عوض شد، ویدیو دوباره تولید نمی‌شود.

سکانسِ پیشنهادیِ لایهٔ متن، هم‌زمان با ایدهٔ ۱: نوار می‌نشیند ← بعد جملهٔ
ساده می‌آید. این ترتیب، همان ادعای متنِ هیرو را بصری می‌کند: **موتور تعیین
می‌کند، بعد هوش مصنوعی ساده‌سازی می‌کند** — نه برعکس.

---

## ۴. محدودیت‌های واقعیِ Flow (طبقِ صفحاتِ رسمیِ گوگل)

**طولِ کلیپ.** Veo 3.1 (Lite / Fast / Quality): فقط **۴، ۶ و ۸ ثانیه**.
Gemini Omni Flash 1.1: ۴، ۶، ۸ و **۱۰** ثانیه.
پس «۱۵ ثانیه در یک نسل» وجود ندارد؛ دو راه دارید:

- ۸ ثانیه + **Extend videos** (فقط روی کلیپِ ۸ ثانیه‌ای کار می‌کند، و طبق
  مستندات فقط با **Veo 3.1 Lite** می‌توان تمدید کرد) → ۱۶ ثانیه، بعد به ۱۵ برش.
- دو کلیپِ ۸ ثانیه‌ای جدا و یک دیزالو بینشان.

**نسبتِ تصویر.** فقط **۱۶:۹ و ۹:۱۶** («Both aspect ratios» در مستندات یعنی
همین دو). **۱:۱ وجود ندارد** — و قابِ فعلیِ هیرو مربع است (۲۱۶۰×۲۱۶۰).
سه انتخاب دارید:

1. ⭐ قابِ هیرو را ۱۶:۹ کنید: `aspect-ratio` روی `.site-figure--hero` و
   به‌روزرسانیِ `width`/`height` در `Landing.jsx:198`. هیرو کوتاه‌تر و سبک‌تر
   می‌شود و ویدیو بدونِ برش می‌نشیند.
2. ویدیو را مربع ببرید و ابعادِ واقعیِ فایل را در `width`/`height` بنویسید.
3. `object-fit: cover` روی قابِ مربع — این کار `CREDITS.md` بند ۳ را نقض
   می‌کند («هر فایل باید **دقیقاً** به نسبتِ قابِ خودش بریده شود، نه به نسبتِ
   اصلیِ عکس»). اگر انتخابش کردید، دلیلش را کنارِ همان بند بنویسید.

**قابِ اول.** «Frames to Video: First» (و «First and last») روی Veo 3.1
پشتیبانی می‌شود — یعنی می‌توانید `hero_ai_desk.webp` را قابِ اول بدهید.
«Ingredients/References to Video» فقط ۸ ثانیه‌ای است.

**صدا.** Veo 3.1 صدای همزمان تولید می‌کند؛ ولی در صفحهٔ وب، پخشِ خودکار باید
`muted` باشد. صدا را «اتاق‌سکوت» نگه دارید، نه موسیقی.

**زبانِ پرامپت.** فارسی در فهرستِ زبان‌های پشتیبانی‌شده هست، ولی خودِ گوگل
می‌نویسد: «For best results with our tools, we recommend using English
prompts.» پس پرامپت‌های این سند انگلیسی‌اند.

**دسترسی.** **ایران در فهرستِ کشورهای پشتیبانی‌شده نیست** (عراق، ترکیه،
امارات، عربستان، پاکستان، آذربایجان، ارمنستان هستند؛ ایران نه). استفاده
نیاز به منطقهٔ پشتیبانی‌شده و حسابِ ۱۸+ دارد. محدودیت‌های دیگر که به کارِ ما
می‌خورد:

- «Generating videos of prominent people» در هیچ منطقه‌ای پشتیبانی نمی‌شود.
- «Editing uploaded videos of identifiable minors» در هیچ منطقه‌ای نیست.
- ویرایشِ ویدیوی آپلودی و Avatar در EEA / سوئیس / بریتانیا نیست.
- اعتبارِ AI در ژاپن قابلِ خرید نیست.

**نتیجهٔ عملی:** هیچ فردِ شناسایی‌پذیری در قاب نگذارید — نه چهره، نه دستِ
بیمار، نه برگهٔ واقعیِ یک نفر. این هم محدودیتِ Flow است و هم قاعدهٔ خودِ
پروژه (درسِ «نُه پزشکِ خیالی» در `Landing.jsx:22-24`).

---

## ۵. این ویدیو کجا بنشیند (و کجا ننشیند)

**توصیه: در هیرو به‌صورتِ پخشِ خودکار نگذارید.** سه دلیلِ فنی:

۱. **`prefers-reduced-motion` را دور می‌زند.** پروژه یک کلیدِ قطعِ سراسری
   دارد: `index.css:343` — هر انیمیشن و ترنزیشنی را خاموش می‌کند و کامنتش
   می‌گوید «آن نبود، نقص بود نه الگو». یک `<video autoPlay loop>` از این
   بلوک رد می‌شود؛ CSS هیچ‌وقت پخشِ ویدیو را متوقف نمی‌کند. اگر ویدیو
   گذاشتید، باید یک بلوکِ جدا بنویسید
   (`@media (prefers-reduced-motion: reduce) { … video { display: none } }`
   با یک `<img>` جایگزین) یا با `matchMedia` هرگز `play()` را صدا نزنید.
۲. **LCP و پهنا.** هیرو همان عنصری است که سرعتِ درکِ صفحه را تعیین می‌کند و
   کاربرِ موبایلِ ایران روی داده‌ی گران است. یک ویدیوی اینلاین، برندهٔ LCP
   می‌شود.
۳. **حواس‌پرتی.** تیتر «جواب آزمایشتان را بفهمید، آگاهانه تصمیم بگیرید»
   باید خوانده شود؛ حرکتِ مداوم در کنارش، آن را می‌خورد.

**جای پیشنهادی:**

- بخشِ «فرآیند تحلیل نتایج» / پنلِ `.site-how-hero` — پشتِ یک دکمهٔ پخش
  (`preload="none"` و `poster` از همان تصویر ساکن). اینجا ویدیو *توضیح*
  می‌دهد، که کارِ درستش است.
- هیرو: تصویرِ ساکن بماند با همان `float` فعلی (`site.css:309`).
- خروجیِ ۱۵ ثانیه‌ای برای معرفی در شبکه‌های اجتماعی و `og:video`.

---

## ۶. چک‌لیستِ پیش از انتشار

- [ ] هیچ **نمرهٔ سلامت**، **درصد**، «سن زیستی» یا گیجِ ۰–۱۰۰ در قاب نباشد
      (`design-reference.md:672` · `eval-spec.yaml:179` · `Scorecard.jsx:8`).
- [ ] هیچ **قرمزِ هشدار** و هیچ کلمهٔ تشخیص در قاب نباشد
      (`index.css:108` — قرمز فقط برای اورژانس).
- [ ] هیچ متنِ خواندنی، عدد، لوگو یا پنلِ UI داخلِ فایلِ ویدیو پخته نشده
      باشد (§۳).
- [ ] هیچ چهره، دست یا فردِ شناسایی‌پذیری در قاب نباشد (§۴).
- [ ] پالتِ ویدیو به سبزآبیِ برند نزدیک شده، نه آبی-فیروزه‌ایِ سای‌فای
      (`index.css:97` — `--brand: #2f6f6b`).
- [ ] نسبتِ تصویرِ فایل با نسبتِ قابِ CSS یکی است، و `width`/`height` با
      `aspect-ratio` می‌خواند (`CREDITS.md` بند ۳).
- [ ] `prefers-reduced-motion` پوشش داده شده (§۵).
- [ ] **منبع و پروانه ثبت شد.** این فایل، دوازدهمین قلمِ بدونِ سندِ
      `public/lab/` می‌شود و `CREDITS.md` بند ۲ می‌گوید آن جدول «**پیش از
      انتشار** باید حل شود».
- [ ] فایل واقعاً به git می‌رود:
      `git status --porcelain --ignored khanesh/public/lab` — قاعدهٔ قدیمیِ
      `*.png` در `.gitignore` یک بار همین تصاویرِ هیرو را روی کلونِ تازه ۴۰۴
      کرد (`CLAUDE.md:1099`). پس خروجی را `.mp4`/`.webm` بگیرید و همین دستور
      را اجرا کنید. `/*.png` فعلی امن است، ولی «امن به نظر می‌رسد» ≠ «تست شد».

---

## ۷. جایگزینی که از هر چهار ایده بهتر جواب می‌دهد (و رایگان است)

همان ایدهٔ ۱ را می‌شود **در خودِ کد** ساخت: یک نوارِ محدودهٔ مرجع با توکن‌های
برند، یک نشانگر که با `transition` وارد می‌شود، و متنِ فارسیِ واقعی که از
`labRefs.js` خوانده می‌شود.

- حجم: چند کیلوبایت، نه چند مگابایت.
- بدونِ VPN، بدونِ اعتبار، بدونِ مسئلهٔ پروانه.
- `prefers-reduced-motion` را از همان بلوکی می‌گیرد که پروژه دارد.
- متنِ فارسی، متنِ واقعی است: قابلِ جست‌وجو، قابلِ انتخاب، قابلِ خواندن با
  اسکرین‌ریدر — که برای صفحه‌ای با حرفِ «شفافیت» ارزش دارد.
- عددِ داخلش از موتور می‌آید، پس هرگز نمی‌تواند «۹۱/۱۰۰» جعلی بشود.

اگر خواستید، همین را می‌سازم: یک کامپوننتِ کوچک در `khanesh/src/` که جای
تصویرِ هیرو یا کنارش بنشیند و از توکن‌های `index.css` ارث ببرد.


