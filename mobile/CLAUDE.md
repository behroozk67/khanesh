# Azmayar Mobile

اپ موبایل (Expo + React Native + expo-router) معادل سایت آزمایار/خوانش. تفسیر نتایج آزمایش به فارسی.
این پوشه **مستقل** از `../khanesh-project` است؛ فقط خواندنی به‌عنوان مرجع به آن نگاه می‌کنیم و هرگز داخلش نمی‌نویسیم.

## مرجع (فقط خواندنی)

| چه | کجا |
|---|---|
| مسیرها و صفحات وب | `../khanesh-project/khanesh/src/App.jsx` |
| ابزار اصلی (عکس/PDF) | `../khanesh-project/khanesh/src/Tafsir.jsx`, `labRefs.js`, `imageIntake.js`, `analyzeJob.js` |
| نمایش نتیجه | `../khanesh-project/khanesh/src/ResultView.jsx` (شکل `_engine` در `.claude/rules/frontend.md` آنجا) |
| بک‌اند | `../khanesh-project/khanesh-server` (`POST /api/analyze/start`, `GET /api/analyze/job/:id`, `GET /health`) |

## قواعد

- **قضاوت بالینی فقط در بک‌اند است.** اپ هیچ آستانه/محدودهٔ بالینی را خودش نمی‌سازد؛ نتیجه را از API می‌گیرد.
- هر رشتهٔ کاربرپسند فارسی است. کلید خام موتور (`HGB`) هرگز نمایش داده نمی‌شود؛ `name`/`fa` سرور را رندر کن.
- RTL اجباری است: native با `forcesRTL` در پلاگینِ `expo-localization` در `app.json` (Expo Go در SDK 58 فراخوانیِ `I18nManager.forceRTL` را نادیده می‌گیرد) و `RTL` در `ui.tsx` روی ریشه و هر `T` (اندروید فارسی را زیر چیدمان LTR به چپ می‌برد)، وب با `document.dir` در `src/app/_layout.tsx`. عدد+واحد یک واحد bidi است.
- API: `EXPO_PUBLIC_API_URL` (نمونه: `.env.example`). از `/health` نه `/api/health` — بک‌اند مستقیماً روی `:8787` است، پروکسی nginx ندارد.
- تحلیل async است (۹۰–۱۵۰ ثانیه): job id را در AsyncStorage نگه دار تا با رفتن به پس‌زمینه از دست نرود (مثل `analyzeJob.js`).
- هیچ شناسهٔ بیمار (نام، کدملی، تلفن) به مدل نمی‌رود؛ عکس برگه خودش شامل آن‌هاست — در متن کاربر ادعای «هیچ شناسه‌ای ارسال نمی‌شود» نکن.

## دستورها

```bash
npx expo install <pkg>   # همیشه به‌جای npm install برای پکیج جدید
npx expo start           # dev server
npx expo lint
npx tsc --noEmit
npx expo-doctor
```

پیش از «تمام شد» lint و tsc را اجرا کن. Expo هر SDK چیزهای زیادی را عوض می‌کند: `AGENTS.md` را بخوان و از docs نسخهٔ `expo` در `package.json` استفاده کن.

## ساختار

کد برنامه در `src/`؛ فقط صفحه‌ها و `_layout` در `src/app/`.

## معماری

- `src/lib/api.ts` تنها کلاینت شبکه است (پورتِ `analyzeJob.js` وب): `startJob` ← ذخیرهٔ job id در AsyncStorage ← `pollJob` (هر ۲ ثانیه). قطعی شبکه شکست تحلیل نیست (`degraded`، تا ۶ تلاش)؛ فراخوانی `onProgress` با `degraded` را روی حالت قبلی merge کن، نه جایگزین. هدرهای `x-device-id` و `Authorization` در **هر دو** مسیر start و poll لازم‌اند.
- ۵ مسیر و نه بیشتر (`src/app/(tabs)/`)؛ در نوار پایین به ترتیب `index` (خانه)، `history` (فقط برای کاربرِ واردشده)، `tests`، `challenges`، `profile` (در `(tabs)/_layout.tsx` با `onTokenChange` از `token-store`؛ هر دو نسخهٔ native و web باید آن را بدهند). `index` فقط صفحهٔ اصلی است (داشبورد: برند و نشانِ اعتبار، کارتِ «تحلیل نتایج آزمایش من»، دو میان‌بر، آخرین آزمایش از `overview`، هشدارِ «جایگزین پزشک نیست»؛ شمارِ آزمایش‌ها از کاتالوگ شمرده می‌شود) و تبِ «خانه» آن را باز می‌کند (دکمهٔ خانه در هدر دیگر نیست). قابِ آیکونِ تب را navigator ثابت ~۳۱×۲۸ می‌گیرد؛ کپسولِ تب فعال فقط با `tabBarIconStyle` ِ پهن‌تر جا می‌شود وگرنه آیکون له می‌شود؛ تفسیر صفحهٔ جداست: `src/app/interpret.tsx` روی Stack ریشه (دوربین/گالری/PDF مستقیم روی صفحه ← پیشرفت ← push به `result/[id]`؛ پنجرهٔ کشویی ندارد). `index` هنگام باز شدن اگر job معلق باشد به آن push می‌کند؛ `history` از پروفایل و صفحهٔ نتیجه.
- مسیر اول کار (`missing` در `ready.ts`): «تحلیل نتایج من» ← پروفایل با `setup=1` (مشخصات، بیماری، علاقه‌مندی اختیاری، پلن) ← دکمهٔ «ورود به پروفایل» در کارتِ حساب‌وپلن (با `setup=1` کارتِ مشخصات بالای صفحه است، وگرنه کارتِ حساب) ← `signin?next=interpret` ← `interpret`. ورود همیشه لازم است، حتی با `authRequired=false`. خرید پلن پیش از ورود ممکن نیست چون `/api/payment/request` توکن می‌خواهد؛ پس انتخاب پلن کاربرِ واردنشده را اول به ورود می‌برد. بیماری انتخاب‌نشده یعنی «هیچ‌کدام». نتیجه و `test/[key]` روی Stack ریشه push می‌شوند. بقیه (`signin`، `pricing`، `onboarding`، `info/[page]`، `contact`) هم روی Stack ریشه‌اند و از پروفایل/تفسیر/منوی هیرو باز می‌شوند؛ صفحه‌های اطلاعاتی و تماس از «پروفایل ← راهنما و اطلاعات». هدرِ پروفایل آیکون تنظیمات دارد (پنجره: تم، خروج، حذف حساب). رنگ‌های نوار پایین tokenهای `bar/barLine/barInk/barActive/barCapsule` در هر دو پالت‌اند. رنگ‌های ظاهرِ پروفایل و چالش‌ها tokenهای `surface/hair/chip/chipInk/brandTint/brandInk/noteBg/noteInk/brandLine/emerald/amber/gold/faint/subtle` در هر دو پالت‌اند؛ کارتِ ملایم `u.soft` و `outline()` (نسخهٔ outline ِ آیکونِ ذخیره‌شده) در `ui.tsx`. «چالش جدید» در هدرِ چالش‌هاست. فهرستِ «آزمایش‌ها» نامِ کاتالوگ را با `splitName` (`src/lib/names.ts`) به نامِ فارسی و نشانِ انگلیسی جدا می‌کند. اسپک‌ها: `specs/001-health-app-upgrade/`، `specs/002-conditions-habits-v2/`، `specs/003-site-parity/`، قانون اساسی: `.specify/memory/constitution.md`.
- `src/lib/history.ts` و `challenges.ts` منطقِ خالص‌اند (بدون import از RN) تا `node src/lib/selfcheck.ts` اجرا شود؛ ذخیره و اعلان‌ها فقط در `store.ts`. تاریخچه فقط روی دستگاه است (`/api/history` سرور پولی است و ورود می‌خواهد).
- بیماری‌های زمینه‌ای: `src/lib/conditions.ts` (شناسه و برچسب عیناً از `conditions.js` سایت) فقط به‌صورت شناسه در `patient.conditions` می‌رود، هرگز در متنِ `patientInfo`. آنچه موتور واقعاً لحاظ کرد از `_engine.context.conditions_applied` («تفسیر بر پایهٔ …»).
- چالش‌ها (v2): عادتِ `check` (روزی یک بار) یا `amount` (چند بار در روز تا `goal`)؛ چالشِ ۳/۷/۱۴/۳۰ روزه با فرصتِ اضافهٔ `ceil(length/3)` روز. وضعیت در `azmayar_habits_v2` (`logs`، `attempts`، `reminders`، `badges`)؛ `settle` در هر بارگذاری و ثبت، کامل‌شده‌ها یک بار `Celebration` نشان می‌دهند (`celebrated`). دادهٔ v1 مهاجرت داده نشد.
- یادآوری‌ها: برنامه از state ساخته می‌شود (`plannedReminders` در `challenges.ts`) و `syncReminders` در `store.ts` همه را لغو و دوباره با trigger یک‌بارهٔ DATE برای ۱۴ روز آینده زمان‌بندی می‌کند؛ پس چالشِ تمام‌شده و روزِ ثبت‌شده یادآوری ندارد. بعد از هر تغییر در چالش یا ثبت و هنگام برگشت به اپ صدا زده می‌شود. اهمیتِ کانال اندروید بعد از ساخت عوض نمی‌شود؛ برای تغییرش شناسهٔ کانال را عوض کن. نشان‌های رشتهٔ ۳/۷/۳۰ روزه (`newBadge`) برای هر رشته یک بار.
- پشتیبان: `backup.ts` منطق خالص (اعتبارسنجی کامل چون فایل از بیرون می‌آید؛ بازگردانی فقط ادغام می‌کند و چیزی را بازنویسی نمی‌کند)، `backup-file.ts` ورودی/خروجیِ فایل. توکن در فایل نیست.
- پیشنهاد چالش در صفحهٔ نتیجه (`suggestedHabits`): فقط از پرچم `abnormal`/`dir` موتور برای قند و چربی؛ روی برگهٔ بحرانی و با بیماری کلیه، دیالیز، سرطان یا بستری چیزی پیشنهاد نمی‌شود.
- چالش‌های مورد علاقه و ساختهٔ کاربر: `favorites` و `custom` در همان `azmayar_habits_v2`، فقط روی دستگاه و بدون وابستگی به ورود. چالشِ حذف‌شده `archived` می‌ماند تا تلاش‌ها و جام‌های قدیمی نشکنند؛ `habitById` چالش‌های کاربر را از `setCustomHabits` می‌خواند که `loadHabits` صدا می‌زند. فهرست انتخاب را با `availableHabits(st.custom)` از state بساز: خواندنِ مستقیمِ متغیرِ ماژول در render را React Compiler کش می‌کند.
- React Compiler: `Math.random()`/`Date.now()` هنگامِ render خطای lint می‌دهد (`react-hooks/purity`).
- متنِ تفسیر بیرون از `_engine` است: `summary` + `interpretation` (پاراگراف با خطِ خالی) + `general_recommendations` (از موتور)؛ مسیرِ گراف `labmat.patientSection`. همه از `interpretationOf` در `engine.ts`؛ `labmat.doctorSection` هرگز نمایش داده نمی‌شود.
- `_engine.tests[].name` نامِ فارسی است و `fa` برچسبِ وضعیت — جابه‌جا نکن. امتیاز/سن زیستی/دستگاه‌ها از `_engine.score` و `_engine.phenoAge`؛ قرارداد: `specs/001-health-app-upgrade/contracts/engine-result.md`.
- دانشنامه: `node scripts/sync-content.mjs` فایل‌های داده‌ای سایت را عیناً در `src/content/khanesh/` کپی می‌کند (دستی ویرایش نکن؛ lint آن را نادیده می‌گیرد). چیدمانِ صفحه در `src/lib/encyclopedia.ts` پورتِ `TestPage/ExtraTestPage/CategoryPage.jsx` است.
- PDF ورودی: سرور فقط عکس می‌گیرد، پس `src/lib/pdf-html.ts` با pdf.js صفحه‌ها را JPEG می‌کند؛ میزبان WebView (`pdf-renderer.tsx`) یا iframe روی وب (`pdf-renderer.web.tsx`، با `sandbox="allow-scripts"` و بدون `allow-same-origin` تا PDF مخرب به توکنِ localStorage نرسد). pdf.js در `assets/pdfjs/` داخل اپ است (نسخهٔ legacy 4.10.38، با پسوند `.txt` که `metro.config.js` آن را asset می‌شناسد) و بدون CDN و بدون Worker روی همان صفحه اجرا می‌شود؛ علت خطا با `[pdf]` در لاگ Metro می‌آید.
- RTL روی وب: react-native-web از `document.dir` پیروی می‌کند، نه `forceRTL` (در `_layout.tsx` ست می‌شود). `direction: "ltr"` روی وب خطا می‌دهد؛ فقط native.
- تم: `src/lib/theme.ts` دو پالت (تیره با تاکید سبز، روشن به‌سبکِ صفحهٔ آزمایش‌های سایت) و `C` در `ui.tsx` هنگام import ساخته می‌شود؛ پس تغییر حالت (سوئیچ خورشید/ماه در تنظیماتِ هدرِ پروفایل (`theme-toggle.tsx`). جنسیت/سن/بیماری‌های زمینه‌ای هم در پروفایل ویرایش می‌شوند و صفحهٔ «تفسیر» هر بار از آن می‌خواند) ذخیره و برنامه را reload می‌کند. رنگ ثابت در کد نگذار؛ از `C` بخوان. `good/warn/bad` رنگ وضعیتِ بالینی‌اند، نه برند. ذخیرهٔ تم روی وب localStorage است (`theme-store.web.ts`) چون wasm ِ expo-sqlite باندل نمی‌شود.
- توکن ورود فقط از `src/lib/token-store.ts`: روی native در SecureStore با `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (poll با گوشیِ قفل ادامه دارد و خواندنِ ناموفق به ۴۰۱ و خروج می‌رسد) و یک بار مهاجرت از AsyncStorage؛ روی وب همان AsyncStorage. `android.allowBackup` خاموش است: بکاپ ابری (که بسته به سازندهٔ گوشی فرق می‌کند) تاریخچهٔ روی دستگاه را نمی‌برد، ولی انتقال مستقیم گوشی‌به‌گوشی در Android 12+ با این پرچم بسته نمی‌شود. بررسی: `node --experimental-test-module-mocks scripts/token-store-check.mjs`.
- ورود: `/health.authRequired` برای خودِ درخواست‌ها منبعِ حقیقت است (`needsSignIn`)؛ مسیر اول کار جداگانه ورود را اجباری می‌کند؛ کانالِ `mock` دکمه ندارد. پرداخت: درگاه به `/payment/verify` ِ **سایت** برمی‌گردد نه اپ، پس اپ `authority` را نگه می‌دارد و بعد از بسته‌شدنِ مرورگر خودش `verifyPayment` می‌زند (`pay.ts`). مبلغِ کارت‌های سایت با `PLAN_CONFIG` سرور فرق دارد؛ فقط مبلغِ پیش‌فاکتورِ سرور را نشان بده.
- ورود دستی (`manual.ts` + `manual-entry.tsx`، چهارمین منبع در `interpret.tsx`) به درخواست کاربر برگردانده شد؛ ورودی: عکس، PDF، دستی. در ورود تیکِ «۱۸ سال تمام + پذیرش شرایط» لازم است. متن شرایط/حریمِ سایت در `sync-content.mjs` (`ADDED_TERMS`) در سمت اپ اصلاح می‌شود، نه در سایت.
- صفحه‌های اطلاعاتی: `sync-content.mjs` متنِ h1–h3/p/li را از JSXِ سایت در `pages.js` استخراج می‌کند (`basis` از `Landing.jsx`؛ سرور برایش مسیری ندارد)؛ اگر عبارتِ `{…}` در متن ببیند خطا می‌دهد.
- نوار پنج‌ناحیه‌ای هر آزمایش (`bandOf` در `engine.ts`): ناحیه فقط از `abnormal/dir/level` موتور؛ قرمز فقط `critical`. روی وب ردیف با `row-reverse` برمی‌گردد چون `dir=rtl` آن را آینه می‌کند ولی `left` را نه.
- غذاهای مفید: `src/lib/foods.ts`، کلیدش کلیدِ دانشنامه. فهرستِ غذا (`items`) عیناً از جدول‌های NIH ODS برای `ferritin`، `iron`، `b12`، `folate`، `vitd`؛ الگوی بیشتر/کمتر (`more`/`less`) از AHA 2021 برای `chol`، `ldl`، `tg` و از اجماعِ ADA 2019 برای `fbs`، `hba1c`. آزمایشی که غذا عددش را جابه‌جا نمی‌کند (هماتوکریت، HDL، کلسیم سرم…) عمداً ورودی ندارد. NIH به fetch خودکار ۴۰۳ و ahajournals چالش Cloudflare می‌دهد؛ از مرورگر و PubMed/PMC بخوان.
- مسیر `@/…` به `src/` اشاره می‌کند. تست‌رانر نصب نیست.
- دکمهٔ «تحلیل نتایج آزمایش من» در خانه تند است چون مسیرش از پیش حساب می‌شود: `useFocusEffect` صفحهٔ `index` نتیجهٔ `missing()` را در `nextStep` می‌گذارد و `onPress` بدون await push می‌کند. `missing()` در `ready.ts` ورود را اول می‌پرسد و بعد پروفایل و پلن را **هم‌زمان** می‌گیرد (پلن شبکه است و قبلاً بعد از دو خواندنِ محلی await می‌شد)؛ فراخوانی‌های هم‌زمان یک اجرا را شریک می‌شوند.
- بارداری: فقط زنِ ۱۷ تا ۴۵ ساله در پروفایل گزینهٔ «الان باردار هستم» و «هفتهٔ بارداری (۱ تا ۴۲، اختیاری)» را می‌بیند (`pregnancyEligible`/`currentGestWeeks`/`pregnancyPatient` در `gate.ts`؛ قاعده در `Profile` ِ `store.ts` ذخیره می‌شود و `loadProfile` هفتهٔ ثبت‌شده را با گذشتِ تقویم جلو می‌برد و حالتِ بارداری را برای غیرواجد شرایط پاک می‌کند). `pregnant`/`gestWeeks` فقط به‌صورت فیلدهای `patient` به سرور می‌روند و موتور خودش تفسیر می‌کند؛ در ورود دستی هم `buildManual` محدوده‌ها را با همین پرچم می‌سازد.
- هپتیک: `feedback.ts` یک کلید `ENABLED` دارد و **خاموش** است (به درخواست کاربر، ۱۸ نوامبر ۲۰۲۶: هر دکمه ویبره می‌داد). `tap/thump/success/failure` در همهٔ صفحه‌ها صدا زده می‌شوند ولی کاری نمی‌کنند؛ برای برگرداندن، فقط همان کلید را `true` کن.
- PDF خروجی (`report.ts`): اندروید فایل را در پوشهٔ انتخابیِ کاربر می‌نویسد و **یک نسخه در cache** را با `getContentUriAsync` + `startActivityAsync` (`expo-intent-launcher`، داخل Expo Go هست) یک بار در viewerِ سیستم باز می‌کند (بدون viewer، برگهٔ اشتراک‌گذاری)؛ intent عمداً await نمی‌شود تا دکمه تا برگشتِ کاربر قفل نماند. iOS برگهٔ share (همان «باز کردن در») و وب دیالوگ چاپ را دارد. `expo-intent-launcher` را با `npx expo install` اضافه کن، نه npm دستی.

## اجرای محلی

- بک‌اند واقعی `AUTH_REQUIRED=true` دارد؛ برای تست درخواست‌ها بی‌ورود (مسیر اول کار در اپ همچنان ورود می‌خواهد و پیامک واقعی می‌فرستد): در `khanesh-server` اجرا کن `AUTH_REQUIRED=false node server.js` (پورت ۸۷۸۷، روی همهٔ اینترفیس‌ها). rate limit: ۲۰ درخواست/۱۵ دقیقه و هر poll یکی حساب می‌شود.
- `EXPO_PUBLIC_API_URL` را در `.env.local` (در گیت نمی‌رود) بگذار: شبیه‌ساز اندروید `10.0.2.2`، گوشی/وب = IP شبکهٔ کامپیوتر. `curl` به IP شبکه از این ماشین بدون `--noproxy '*'` ۵۰۳ می‌دهد (HTTP_PROXY محیط).
- `npx expo start` وب را هم روی `localhost:8081` سرو می‌کند (بدون Expo Go).

## وضعیت

پورت‌شده (specs/001): ورودی دوربین/گالری/PDF، تحلیل async با هپتیک و انیمیشن، صفحهٔ نتیجه (امتیاز، سن زیستی، دستگاه‌ها، روند ≤۵ نوبتِ یک‌ساله، فهرست، خروجی PDF)، تاریخچه با مقایسهٔ هر آزمایش، دانشنامهٔ کامل، چالش‌ها با یادآوری. specs/002: رادار در بخشِ امتیاز (نتیجه و تاریخچه)، بیماری‌های زمینه‌ای با آیکون، عادت‌های روزانه/حجمی، چالش‌های زمان‌دار با پاداش، تاریخچهٔ تلاش‌ها و نمودار ثبات. روی وب با دادهٔ ساختگی امتحان شده؛ تحلیلِ زنده با سرور، WebViewِ PDF روی گوشی، اعلان و هپتیک روی Expo Go هنوز امتحان نشده. specs/003: ورود OTP، پرداخت و تعرفه‌ها، پروفایل و حذف حساب، آشنایی اول، صفحه‌های اطلاعاتی و تماس. ورودِ واقعی (پیامکِ زنده) و پرداختِ واقعی امتحان نشده. پورت‌نشده: نمای تخصصی، پروفایل‌های خانواده، فرمِ پیامِ تماس، همگام‌سازیِ پروفایل با سرور.
