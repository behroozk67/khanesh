# Implementation Plan: ویتامین‌ها و عناصرِ کمیاب (فصلِ هنری)

**Branch**: `004-vitamins-trace-elements` (شاخهٔ git ساخته نشده است؛ کار روی `recovery`) | **Date**: 2026-09-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-vitamins-trace-elements/spec.md`

## Summary

سه کار:

1. **فولاتِ پایین یک مالک می‌گیرد** و هر یافته‌ای که از فولات یا B12 نام می‌برد عددِ همان برگه را سه‌حالته می‌خواند.
   - قاعدهٔ تازهٔ `folate_deficiency` با فوریتِ `routine`.
   - `macrocytic_anemia` مالکِ فولات است هر وقت فعال شود. واگذاری از طریقِ `match` مشترکِ آن است (N20).
   - هشت املای ازدست‌رفته نگاشت می‌شوند.
2. **بیست آنالیتِ تازه بی‌قضاوت شناخته می‌شوند**: ۱۴ آنالیتِ داستانِ ۲ و ۶ عنصرِ نادر.
   - هیچ‌کدام بازه ندارد، پس سازوکارِ موجودِ `noRef` آن‌ها را به خطِ «تفسیر نشدند» می‌برد.
   - دو آنتی‌بادی کیفی‌اند، ولی عمداً **به `qual` نمی‌روند** (R5، N25).
3. **داستانِ ۳ فقط `P49` و آزمون‌های `todo` است.** هیچ کدِ یافته‌ای نوشته نمی‌شود.

فرانت‌اند و شکلِ پاسخ عوض نمی‌شوند ([contracts/engine-output.md](contracts/engine-output.md)).

## Technical Context

- **Language/Version**: Node ≥18، ESM (`khanesh-server/`).
- **Primary Dependencies**: هیچ وابستگیِ تازه‌ای نیست. ماژول‌های موجودِ `rules/`: `adapter.js`، `names.js`، `patterns_hematology.js`، `patterns_utils.js` و `patterns.js` (فقط `SUGGEST_TESTS`).
- **Storage**: N/A.
- **Testing**: `node --test` (`npm test`). آزمون‌های تازه در `rules/engine.test.js` (`M141`+) و `api-contract.test.js` (`T21`) می‌آیند.
- **Target Platform**: همان سرورِ Express.
- **Project Type**: web-service (موتورِ قواعدِ قطعی).
- **Performance Goals**: N/A، چون چند جست‌وجوی جدول به حلقهٔ موجود افزوده می‌شود.
- **Constraints**:
  - هیچ عددِ بالینیِ تازه‌ای وارد کدِ اجرایی نمی‌شود (FR-012، SC-007).
  - متنِ بیمار فارسی است و پیش از ثبت به کاربر نشان داده می‌شود.
  - متنِ فارسی هرگز از cmdletهای PowerShell نمی‌گذرد.
- **Scale/Scope**: یک قاعدهٔ تازه، یک قاعدهٔ ویرایش‌شده، ۲۰ کلیدِ تازه و ۸ املا. `RULES` از ۱۱۹ به ۱۲۰ می‌رسد (اندازه‌گیری شود).
- **NEEDS CLARIFICATION**: هیچ. چهار پرسشِ clarify پاسخ گرفته‌اند. سه نکته باید پیش از کد **اندازه‌گیری** شوند (R4، R8)، نه اینکه پرسیده شوند.

## Constitution Check

| اصل | این طرح | وضعیت |
|---|---|---|
| **I. موتور تصمیم می‌گیرد** | همهٔ متن در `patterns_hematology.js` است. هیچ پرامپتی عوض نمی‌شود. | ✅ |
| **II. نبودن ≠ طبیعی** | فولات و B12 در هر دو یافته سه‌حالته‌اند و «اندازه‌گیری‌نشده» شاخهٔ خودش را دارد. برگهٔ فقط-noRef هرگز «همه‌چیز طبیعی» نمی‌گیرد (`T19`/`T21`). | ✅ |
| **II. تورِ ایمنی روی «پوشش‌نیافته»** | `folate_deficiency` جای `unmatched_abnormal` را برای فولات می‌گیرد و خودِ تور دست نمی‌خورد. پنلِ فولات + اورژانس آزمون دارد (N18). | ✅ |
| **III. اندازه بگیر، نقل نکن** | خطِ پایه، `RULES.length` و `unmapped` پیش و پس اندازه‌گیری می‌شوند (quickstart §۱ و §۴). | ✅ |
| **IV. آزمون اول قرمز** | هر `M141`+ پیش از کد اجرا می‌شود. مجموعهٔ شناسه‌ها diff می‌شود و فقط `+ folate_deficiency` مجاز است. | ✅ |
| **V. فارسی** | ۲۰ نامِ تازه در `FA_NAMES` می‌آیند و یک آزمون برای کلیدهای بی‌بازه دارند (`M32` فقط کلیدهای بازه‌دار را می‌بیند). | ✅ |
| **یک عدد، یک کار** | مرزِ B12 «مرزی» همان ۱۵۰/۴۰۰ِ قواعدِ موجود است و عددِ تازه‌ای نیست. آستانهٔ فولات همان `refs.js` است. | ✅ |
| **یک مالک برای هر آنالیت** | واگذاری فولات به ماکروسیتیک با «آیا آن قاعده فعال می‌شود» نوشته می‌شود و آزمونِ دوطرفه دارد (SC-002). | ✅ |
| **عدد از کتاب = پیشنهاد** | داستانِ ۳ کلاً در `P49` و `todo` است. | ✅ |

**Gate: PASS.** نقضی نیست و جدولِ Complexity خالی است.

**بازبینیِ پس از طراحی (Phase 1)**: یک خطرِ تازه دیده شد. «کیفیِ بی‌خواننده در `qual`» بی‌صدا حذف می‌شد (N25). طراحی آن را با `QUAL_NO_READER` → `noRef` بست (R5). Gate همچنان **PASS** است.

## Project Structure

### Documentation (this feature)

```text
specs/004-vitamins-trace-elements/
├── spec.md              # clarify شده (۴ پرسش)
├── plan.md              # این فایل
├── research.md          # R1 تا R10
├── data-model.md        # ۲۰ کلید، دو ساختارِ adapter، یافتهٔ فولات
├── quickstart.md        # پنل‌ها و دستورها
├── contracts/
│   └── engine-output.md # شکلِ پاسخ بی‌تغییر؛ محتوای عوض‌شده
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code

```text
khanesh-server/
├── rules/
│   ├── adapter.js              # NAME_MAP (+۸ املا، +۲۰ کلید)، UNIT_GATED_ALIASES، QUAL_NO_READER
│   ├── names.js                # FA_NAMES (+۲۰)
│   ├── patterns_hematology.js  # macrocyticMatch، macrocytic_anemia سه‌حالته، folate_deficiency
│   ├── patterns.js             # SUGGEST_TESTS («ویتامین B12» اگر نیست)
│   ├── REF_DIFF.md             # بخشِ «عمداً غایب از ورودِ دستی»
│   └── engine.test.js          # M141+ و todoهای P49
├── api-contract.test.js        # T21: برگهٔ فقط-آنالیت‌های تازه → مسیرِ موتور
MEDICAL_RULES.md                # P49، پیش از هر کد
CLAUDE.md                       # ردیفِ خطِ پایه، شمارِ قواعد، Lab Notebook اگر خطایی اصلاح شد
```

**Structure Decision**: فقط بک‌اند تغییر می‌کند. `khanesh/` دست نمی‌خورد (clarify Q3). `REF`ِ سمتِ کاربر هم عمداً به‌روز نمی‌شود و این تصمیم در `REF_DIFF.md` ثبت می‌شود.

## ترتیبِ اجرا (برای `/speckit-tasks`)

1. خطِ پایه و فهرستِ شناسه‌ها اندازه‌گیری می‌شود. سه نکتهٔ R4/R8 اندازه‌گیری می‌شوند.
2. **`P49`** در `MEDICAL_RULES.md` نوشته می‌شود.
3. **داستانِ ۱**: اول آزمون‌ها (قرمز)، بعد `macrocyticMatch`، `folate_deficiency`، متنِ سه‌حالتهٔ ماکروسیتیک و املاها. متنِ فارسی به کاربر نشان داده می‌شود.
4. **داستانِ ۲**: اول آزمون‌ها (قرمز)، بعد کلیدها، `FA_NAMES`، `UNIT_GATED_ALIASES`، `QUAL_NO_READER` و `T21`.
5. **داستانِ ۳**: آزمون‌های `todo` با ارجاع به بندهای `P49`.
6. `REF_DIFF.md`، diffِ شناسه‌ها، `npm test`، lint، سپس `code-reviewer` و `eval-medical-reviewer`.

## Complexity Tracking

خالی است؛ Constitution Check نقضی ندارد.
