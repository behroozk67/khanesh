# Quickstart: اعتبارسنجیِ واحدِ ردیف‌های بی‌واحد

## پیش‌نیاز

- `khanesh-server/node_modules` نصب باشد (`npm install`).
- خطِ پایه را **اندازه بگیرید، نقل نکنید** (اصلِ III): `cd khanesh-server && npm test` و عددها را با
  نامِ درخت ثبت کنید.

## ۱. اورژانس‌های کاذب بسته شده‌اند (US1، SC-001)

یک ردیفِ بی‌واحد برای هر کدام از موتور عبور دهید (الگوی `scratchpad/probe.mjs`):
`Creatinine 80`، `Calcium 2.4`، `Total Bilirubin 17`، `Troponin I 8` — مرد ۴۰ ساله.

**انتظار (مرحلهٔ الف، بی‌محدوده):** هیچ `emergency`؛ هر چهار در یافتهٔ `unit_unknown_values`.
**انتظار (با محدودهٔ چاپ‌شده):** `Creatinine 80` + `reference: "53-115"` ⇐ `CREAT ≈ 0.9` طبیعی، و سطرِ
`unitConversions` با `basis: "reference"`.

## ۲. جهتِ وارونه و سکوت بسته شده‌اند (US2، SC-002)

- `FBS 15` بی‌واحد، بی‌محدوده ⇐ **نه** `hypoglycemia_*`؛ `unit_unknown_values` با `this_week` (هر دو
  تفسیر غیرطبیعی‌اند: ۱۵ mg/dL پایین، ۱۵ mmol/L بالا).
- `FBS 15` + `reference: "3.9-6.1"` ⇐ SI ⇐ ~۲۷۰ mg/dL ⇐ یافتهٔ قندِ بالا.
- `Cholesterol 8` بی‌واحد ⇐ **نه** سکوت: مرحلهٔ الف `unit_unknown_values`؛ مرحلهٔ ب (پس از تأییدِ `P48`)
  ⇐ SI ⇐ ~۳۱۰ mg/dL ⇐ یافتهٔ چربی.

## ۳. واحدِ چاپ‌شده بی‌تغییر است (FR-009، SC-004)

`npm test` ⇐ ۰ شکست، و آزمونِ فریزِ هش‌دار روی پنل‌های «واحد چاپ‌شده» سبز. تعدادِ کل = خطِ پایه +
آزمون‌های تازه.

## ۴. برگهٔ «فقط بی‌واحد» به «همه‌چیز طبیعی است» نمی‌رسد (FR-005)

`node --test api-contract.test.js` ⇐ `T20` سبز: پاسخ `_engine` دارد، `patterns` شاملِ
`unit_unknown_values` است، و متنِ `buildNormalResult` نیست.

## ۵. کنترلِ منفی (اصلِ IV)

آزمون‌های تازه را روی کپیِ `git archive HEAD` (با junctionِ `node_modules`) اجرا کنید ⇐ دقیقاً آزمون‌های
تازه قرمز، بقیه سبز. سپس `unit_unknown_values` را در یک کپیِ موقت از `RULES` بیرون بکشید ⇐ `T20` و
آزمون‌های US1/US2 قرمز (مالک واقعاً بار می‌کشد).

## ۶. فرانت‌اند

`cd khanesh && npm run lint` ⇐ ۰ خطا. در مرورگر (Playwright MCP): پاسخی با `unitConversions[].basis =
"reference"` ⇐ بلوکِ تبدیل زیرِ اعدادِ استخراج‌شده با جملهٔ فارسیِ `basis` دیده می‌شود؛ `test` خام دیده نمی‌شود.
