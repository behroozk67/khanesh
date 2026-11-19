# اپ موبایل آزمایار اپ (Expo + React Native)

برنامهٔ اندروید/iOS آزمایار اپ — همان سرویس تفسیر برگهٔ آزمایشِ سایت (`azmayarapp.ir`)، با همان موتور قواعد بالینی که در `khanesh-server/rules/` اجرا می‌شود. اپ یک کلاینت است: هیچ قضاوت بالینی در آن نوشته نشده.

| مشخصه | مقدار |
|---|---|
| نام/نسخه | آزمایار اپ · `1.0.3` (`android.versionCode` = ۳) |
| شناسه | `ir.azmayarapp.app` (اندروید و iOS) |
| پشته | Expo SDK 58 · React Native 0.88 · React 19 · expo-router (typed routes + React Compiler) |
| سرور | `khanesh-server/` همین مخزن — `POST /api/analyze/start`، `GET /api/analyze/job/:id`، `GET /health` |
| زبان/جهت | فارسی، RTL اجباری (`forcesRTL` در پلاگین `expo-localization`)، فونت وزیرمتن |

## مرز بالینی

اپ هیچ بازهٔ مرجع، آستانه، شدت یا فوریت ارجاعی نمی‌سازد. تمام قضاوت از موتور دترمینستیک سرور می‌آید و اپ فقط رندر می‌کند (`src/lib/engine.ts`)؛ کلید خام موتور (`HGB`, `LDH`) هرگز نمایش داده نمی‌شود و نام فارسی سرور (`name`/`fa`) رندر می‌شود. آستانهٔ امتیاز و آستانهٔ رادار هم از `resultModel.js` سایت کپی می‌شوند، نه هاردکد اپ. متنِ تفسیر بیرون از `_engine` است (`summary` + `interpretation` + `general_recommendations`) و بخش «پزشک» (`labmat.doctorSection`) هرگز نمایش داده نمی‌شود.

## امکانات

- **خوانش برگه** از دوربین، گالری و **PDF** (pdf.js داخل اپ، بدون CDN و بدون Worker) و **ورود دستی** اعداد — `src/app/interpret.tsx`، `src/lib/manual.ts`، `src/lib/pdf-html.ts`.
- **پروفایل**: سن (سال/ماه/روز برای نوزاد)، جنس، بیماری‌های زمینه‌ای به‌صورت شناسهٔ سایت (`src/lib/conditions.ts`)؛ تفسیر هر بار از همین پروفایل می‌خواند.
- **نتیجه**: نمرهٔ برگه، رادار دستگاه‌های بدن، سن زیستی فنوتیپی، مقایسه با نوبت‌های قبلی (RCV)، متن تفسیر و پیشنهاد آزمایش‌های بعدی — `src/app/result/[id].tsx`.
- **گزارش PDF** از همان نتیجه با چیدمان کارت‌ها و پالت روشن (قابل چاپ) — `src/lib/report.ts` روی `expo-print`.
- **تاریخچهٔ روی دستگاه** با نمودار روند هر مارکر — `src/lib/history.ts` (منطق خالص، بدون import از RN تا در `node` اجرا شود).
- **چالش‌های عادت/مقداری** (۳/۷/۱۴/۳۰ روزه) با یادآوری محلی — `src/lib/challenges.ts` + `expo-notifications`.
- **دانشنامه**: کاتالوگ ۳۰۰+ آزمایش، دسته‌ها و صفحهٔ هر آزمایش، هم‌متن با سایت؛ دادهٔ آن با `scripts/sync-content.mjs` از `khanesh/src` کپی می‌شود.
- **حساب و پلن**: ورود پیامکی، کارت پلن، خرید از درگاه سایت و تأیید پرداخت در اپ (`authority` نگه داشته می‌شود چون درگاه به سایت برمی‌گردد) — `src/lib/pay.ts`، `src/lib/token-store.ts` (SecureStore روی دستگاه).
- **پشتیبان‌گیری/بازگردانی** تاریخچه و چالش‌ها با فایل JSON — `src/lib/backup.ts`.
- **تم روشن/تیره** با دو پالت کامل (`src/lib/theme.ts`)؛ گزارش PDF همیشه روشن.

## نقشهٔ کد

```text
mobile/
├── src/app/                     صفحه‌ها (expo-router؛ فقط صفحه و _layout اینجا)
│   ├── (tabs)/                  index (خانه) · history · tests · challenges · profile
│   ├── interpret.tsx            ورودی عکس/PDF/ورود دستی ← پیشرفت ← نتیجه
│   ├── result/[id].tsx · test/[key].tsx · info/[page].tsx
│   ├── signin.tsx · onboarding.tsx · pricing.tsx · pay.tsx · contact.tsx
│   └── _layout.tsx              Stack ریشه، تم، RTL وب
├── src/components/              ui.tsx (توکن‌های رنگ) · score-card · pheno-card · result-list · pdf-renderer · …
├── src/lib/                     api.ts (تنها کلاینت شبکه) · engine.ts · history.ts · challenges.ts · store.ts (ذخیره)
│                                token-store · theme · pay · report · backup · manual · encyclopedia · jdate · selfcheck
├── src/content/khanesh/         ⚙️ تولیدشده از khanesh/src — دستی ویرایش نکن
├── assets/pdfjs/                pdf.js داخل اپ (نسخهٔ legacy، با پسوند .txt تا Metro آن را asset ببیند)
├── scripts/sync-content.mjs     کپی دادهٔ دانشنامهٔ سایت + گاردِ واگراییِ آستانهٔ امتیاز
├── scripts/token-store-check.mjs
└── specs/                       اسپک‌های spec-kit (پاریتی سایت، پروفایل/چالش v2)
```

## راه‌اندازی

```bash
cd mobile
npm install
cp .env.example .env.local      # EXPO_PUBLIC_API_URL را ست کن
npx expo start
```

`EXPO_PUBLIC_API_URL` آدرس `khanesh-server` است: روی پروداکشن `https://azmayarapp.ir`، روی شبیه‌ساز اندروید `http://10.0.2.2:8787`، روی گوشی در شبکهٔ محلی `http://<IP ویندوز>:8787`. بیلدِ release آدرسی جز `https://` را رد می‌کند.

`npm start` و `npm run tsc` هر دو اول `scripts/sync-content.mjs` را اجرا می‌کنند (`prestart`/`pretsc`)؛ `npx tsc` این lifecycle را دور می‌زند و sync نمی‌کند. اسکریپت دو چیدمان را می‌شناسد: اپ به‌عنوان پوشهٔ `mobile/` این مخزن (منبع سایت در `../khanesh/src`) و اپ به‌عنوان چک‌اوت مستقل (منبع سایت در `../khanesh-project/khanesh/src`). اگر منبع پیدا نشود، کپیِ کامیت‌شدهٔ `src/content/khanesh/` دست‌نخورده می‌ماند (مثلاً در بیلد ابری EAS) — پس این پوشه همیشه باید همراه تغییرِ محتوای سایت کامیت شود. برای بررسیِ نبودِ drift بدونِ نوشتن: `npm run sync:check`.

## ساخت APK / AAB

```bash
bunx eas-cli build -p android --profile preview      # APK برای نصب دستی (فقط ARM، R8 و shrink روشن)
bunx eas-cli build -p android --profile production   # AAB برای Google Play
```

پروفایل‌ها در `eas.json` و پروژه در `app.json` (`extra.eas.projectId`). `appVersionSource` محلی است، پس شمارهٔ نسخه را در `app.json` بالا ببر.

آخرین بیلد منتشرشده: [Releases → v1.0.3](https://github.com/behroozk67/khanesh/releases/latest) (APK، اندروید).

## کیفیت

```bash
npx expo lint                        # باید بدون error باشد
npx tsc --noEmit
node src/lib/selfcheck.ts            # منطق خالص تاریخچه/چالش‌ها
node --experimental-test-module-mocks scripts/token-store-check.mjs
```

قبل از «تمام شد» هم lint و هم tsc باید سبز باشند.

## قواعد توسعه

- هر رشتهٔ کاربرپسند فارسی است؛ عدد و واحد یک واحد bidi در نظر گرفته می‌شوند.
- `src/lib/api.ts` تنها کلاینت شبکه است: `startJob` ← نگه‌داشتن job id در AsyncStorage ← `pollJob` هر ۲ ثانیه. قطعی شبکه شکست تحلیل نیست (`degraded`).
- یادآوری‌ها از state ساخته می‌شوند (`plannedReminders`) و هر بار همه لغو و از نو زمان‌بندی می‌شوند.
- شناسهٔ بیمار (نام، کدملی، تلفن) هرگز به مدل نمی‌رود، ولی عکس برگه خودش شامل آن‌هاست — در متن کاربر ادعای «هیچ شناسه‌ای ارسال نمی‌شود» نکن.
- تاریخچهٔ اپ **فقط روی دستگاه** است (`/api/history` سرور پولی است و ورود می‌خواهد).
- Expo هر SDK چیزهای زیادی عوض می‌کند: `AGENTS.md` این پوشه را بخوان و برای هر API از docs همان نسخهٔ `expo` در `package.json` استفاده کن.

جزئیات معماری، تصمیم‌های گرفته‌شده و درس‌های حین کار در [`CLAUDE.md`](CLAUDE.md) همین پوشه است؛ تصمیم‌های بالینی در [`../MEDICAL_RULES.md`](../MEDICAL_RULES.md) مرجعِ اصلی مخزن.
