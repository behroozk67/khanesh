# Implementation Plan: واحدِ درست برای ردیف‌هایی که روی برگه واحد ندارند

**Branch**: `003-unitless-lab-values` *(شاخهٔ git ساخته نشد)* | **Date**: 2026-09-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-unitless-lab-values/spec.md`

## Summary

امروز موتور هر عددِ بی‌واحد را بی‌صدا با واحدِ متعارف می‌سنجد؛ روی برگه‌های SI این چهار اورژانسِ کاذب
(کراتینین ۸۰، کلسیم ۲.۴، بیلی‌روبین ۱۷، تروپونین ۸)، یک جهتِ وارونه (قندِ ۱۵) و یک سکوت (کلسترولِ ۸)
می‌سازد. رویکرد: یک تابعِ خالصِ `decideUnit` با زنجیرهٔ شواهد — **واحدِ چاپ‌شده ⇐ محدودهٔ مرجعِ چاپ‌شدهٔ
همان ردیف ⇐ اندازهٔ عدد (فقط با مرزِ تأییدشده) ⇐ نامعلوم** — و یک مالکِ واحد برای «نامعلوم»
(`unit_unknown_values`) که هرگز اورژانس نمی‌سازد و هرگز جهت نمی‌گوید. دو مرحله، مثلِ `P47`:
- **مرحلهٔ الف** (بی عددِ بالینیِ تازه): گام‌های ۱، ۲، ۴ + مالک + نمایش. به‌تنهایی SC-001 را برآورده می‌کند.
- **مرحلهٔ ب** (پس از تأییدِ `P48`): پر کردنِ `plausible` برای کلیدهایی که بازبین تأیید کرد (گام ۳).

«پایگاهِ معتبر»: LOINC (وجودِ دو سیستم — دو کدِ `MCnc`/`SCnc` برای هر آنالیت، از API عمومیِ NLM)، UCUM
(املای واحد)، و جدولِ SIِ AMA Manual of Style از طریقِ نسخهٔ باز (ضریب‌ها — هر ۲۲ ضریبِ مشترک با موتور
سازگارند؛ [research.md](research.md) R2).

## Technical Context

**Language/Version**: Node.js 26 (ES modules) · React 19 + Vite 8 برای یک بلوکِ نمایش
**Primary Dependencies**: هیچ وابستگیِ تازه‌ای. موتورِ قواعدِ موجود (`khanesh-server/rules/`)
**Storage**: N/A
**Testing**: `node:test` — `rules/engine.test.js` (`M121`+)، `api-contract.test.js` (`T20`)؛ فرانت‌اند: `npm run lint` + مرورگر
**Target Platform**: سرورِ Express؛ مرورگرِ موبایل برای نمایش
**Project Type**: web application (دو پروژهٔ مستقل: `khanesh-server/`، `khanesh/`)
**Performance Goals**: بی‌اثر — یک تابعِ خالص به‌ازای هر ردیف
**Constraints**: رفتارِ ردیف‌های با واحدِ چاپ‌شده بایت‌به‌بایت بی‌تغییر (FR-009)؛ هیچ عددِ بالینیِ تأییدنشده در کد
**Scale/Scope**: ۴۲ کلیدِ `SI_CONVERSIONS` + ۵ شاخهٔ اختصاصی (`TROPONIN_I`، `T3`، `CRP_Q`، `ACR`، `TESTO`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| اصل | وضعیت | چگونه |
|---|---|---|
| I. موتور تصمیم می‌گیرد | ✅ | تعیینِ واحد و فوریت کاملاً در `rules/`؛ پرامپت دست نمی‌خورد. `ungraded` به LLM نمی‌رسد. |
| II. تستِ غایب ≠ طبیعی | ✅ | «نامعلوم» حالتِ سوم است، نه «طبیعی»؛ برگهٔ «فقط نامعلوم» به `buildNormalResult` نمی‌رسد (`T20`). جهت از `dir` نه، اصلاً گفته نمی‌شود. |
| III. اندازه بگیر، نقل نکن | ✅ | همهٔ اعداد در research با اسکریپت از `refs.js`/`units.js` زنده؛ خطِ پایه پیش از کار اندازه‌گیری می‌شود. |
| IV. قفل با آزمونی که اول قرمز بود | ✅ | هر ردیفِ جدولِ «زمینه» یک آزمون، قرمز روی `edec069`؛ کنترلِ منفی با حذفِ مالک. شناسهٔ قاعده‌ها: فقط **یک افزوده** (`unit_unknown_values`)، هیچ حذف. |
| V. فارسی | ✅ | همهٔ متن‌ها فارسی و عیناً در `contracts/`؛ `faName` برای همهٔ کلیدها؛ بلوکِ فرانت `name` را رندر می‌کند نه `test`. |
| تغییرِ بالینی: منبع + بازبین | ✅ با مرحله‌بندی | مرزهای اندازه (`plausible`) و متنِ هشدارِ تروپونین و نگه‌داشتنِ حدسِ D-dimer ⇐ `P48`؛ تا تأیید در کد نیستند (`plausible: null`). آستانهٔ ۱.۵ در R4 ریاضی است (√کوچک‌ترین ضریب)، نه بالینی. |
| یک عدد، یک کار | ✅ | `UNIT_PROFILE` ضریب را تکرار نمی‌کند؛ محدودهٔ SI از تقسیمِ `refs.js` بر ضریب، نه جدولِ دوم. |
| یک مالک برای هر آنالیت | ✅ | `unit_unknown` فقط از `unit_unknown_values`؛ از `reproductive_hormone_context` برداشته می‌شود. |
| اورژانس: جهتِ خطا روی ورودیِ معمولی | ✅ | قاعدهٔ تازه هرگز `emergency` نمی‌دهد. تروپونینِ نامعلوم به‌جای «اورژانس» یک هشدارِ شرطی می‌گیرد — **ریسکِ باقی‌مانده** (تروپونینِ واقعاً بالا بی‌واحد دیگر اورژانس نمی‌گیرد) صریحاً در `P48` برای بازبین ثبت می‌شود. |

**Gate: PASS.** (بازبینی پس از فاز ۱: بدونِ تغییر — طراحی هیچ نقضی اضافه نکرد.)

## Project Structure

### Documentation (this feature)

```text
specs/003-unitless-lab-values/
├── plan.md              # این فایل
├── research.md          # R1–R9
├── data-model.md        # UNIT_PROFILE، decideUnit، اثر روی خروجی، قاعدهٔ مالک
├── quickstart.md        # سناریوهای اعتبارسنجی
├── contracts/
│   └── engine-output.md # basis، یافتهٔ unit_unknown_values، متن‌های فارسی
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
khanesh-server/
├── rules/
│   ├── units.js                    # + UNIT_PROFILE، normUnit/املاهای متعارف، decideUnit() (خالص)، parseReference()
│   ├── adapter.js                  # به‌کارگیریِ decideUnit در مسیرِ عمومی + شاخه‌های TROPONIN_I/T3/CRP_Q/ACR/TESTO؛
│   │                               #   ungraded.unit_unknown با alt؛ basis روی unitConversions
│   ├── patterns_unit_unknown.js    # تازه — RULES_UNIT_UNKNOWN = [unit_unknown_values]
│   ├── patterns.js                 # spread کردنِ RULES_UNIT_UNKNOWN
│   ├── patterns_reproductive.js    # حذفِ unit_unknown از CONTEXT_REASONS (انتقالِ مالکیت)
│   ├── guidelines.js               # + AMA_SI_UNITS (paywalled → substitutedBy نسخهٔ باز)، + LOINC
│   └── engine.test.js              # M121+ (قرمز پیش از اصلاح)، فریزِ هش‌دار، به‌روزرسانیِ M115
├── server.js                       # بی‌تغییرِ منطقی (unitConversions همین حالا با name سریال می‌شود)؛ فقط تأیید
└── api-contract.test.js            # T20
khanesh/src/
└── ResultView.jsx                  # بلوکِ کوچکِ «واحدها» زیرِ اعدادِ استخراج‌شده (name, raw, from → value, to, جملهٔ basis)
MEDICAL_RULES.md                    # P48 — جدولِ ۴۲ ردیفی، حدودِ ممکن، هشدارِ تروپونین، D-dimer، منیزیم mEq/L
CLAUDE.md, .claude/rules/frontend.md # N3 (تکرار: واحدِ نانوشته)، اصلاحِ ادعای UnitConversions، خطِ پایه
```

**Structure Decision**: دو پروژهٔ موجود. منطقِ تعیینِ واحد در `units.js` (جایی که ضریب‌ها هستند) به‌صورتِ
تابعِ خالص؛ `adapter.js` فقط آن را صدا می‌زند و نتیجه را اعمال می‌کند. مالکِ «نامعلوم» ماژولِ جدا دارد چون
به هیچ دستگاهِ بدن تعلق ندارد (مثلِ `patterns_utils.js` که فقط ابزار است).

## Phasing

| مرحله | محتوا | پیش‌شرط |
|---|---|---|
| الف | `decideUnit` گام ۱، ۲، ۴؛ مالک؛ `basis`؛ بلوکِ فرانت؛ آزمون‌ها؛ `P48` نوشته‌شده (در انتظار) | هیچ |
| ب | `plausible` برای کلیدهای تأییدشده؛ آزمون‌های دوطرفهٔ هر مرز | تأییدِ `P48` |

## Complexity Tracking

هیچ نقضی. (ماژولِ تازه یک قاعده دارد؛ جایگزینِ چیزی نیست، پس بندِ `_new` در قانونِ اساسی شامل نمی‌شود.)
