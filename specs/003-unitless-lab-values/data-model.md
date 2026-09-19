# Data Model: واحدِ ردیف‌های بی‌واحد

## 1. ردیفِ برگه (ورودی، بی‌تغییر)

خروجیِ OCR، همان که امروز هست: `{ name, value, unit, reference, flag, confidence, _page }`.
`unit` و `reference` ممکن است `null`، رشتهٔ خالی یا `"-"` باشند.

## 2. جدولِ واحدِ آنالیت (`UNIT_PROFILE`، تازه — `rules/units.js`)

یک ورودی برای هر کلیدِ دو‌سیستمی (R1). منبعِ ضریب همان `SI_CONVERSIONS` است؛ این جدول **ضریب تکرار
نمی‌کند** («یک عدد، یک کار»)، فقط آنچه برای تعیینِ واحد لازم است:

| فیلد | معنا | منبع |
|---|---|---|
| `key` | کلیدِ موتور | — |
| `convAliases` | املاهای شناخته‌شدهٔ واحدِ متعارف (پس از `normUnit`) | UCUM + برگه‌ها (R5) |
| `siRe` | همان `SI_CONVERSIONS[key].si` (ارجاع، نه کپی) | `units.js` |
| `factor` | همان `SI_CONVERSIONS[key].factor` (ارجاع) | `units.js`؛ منبع در `P48` |
| `loinc` | `{ mass, substance }` — دو کدِ LOINC | NLM LOINC API (R2) |
| `plausible` | `[lo, hi]` به واحدِ متعارف — **فقط پس از تأییدِ `P48`**؛ تا آن زمان `null` | `P48` (R6) |

⚠️ `plausible: null` یعنی شاهدِ ۳ (اندازه) برای آن کلید **خاموش** است. مرحلهٔ ب فقط این فیلد را پر
می‌کند و کدِ تازه‌ای نمی‌خواهد.

## 3. تصمیمِ واحد (`UnitDecision`، تازه — خروجیِ یک تابعِ خالص)

```
decideUnit(key, value, unit, reference, sex) → {
  system: "conv" | "si" | null,          // null = نامعلوم
  basis:  "printed" | "reference" | "magnitude" | null,
  detail: string | null,                 // مثلاً محدودهٔ چاپ‌شده‌ای که تصمیم را گرفت — برای اشکال‌زدایی
}
```

قواعد (R3–R6)، به ترتیب، اولین قاطع برنده:

| گام | شرط | نتیجه |
|---|---|---|
| ۱ | `unit` با `convAliases` می‌خواند | `conv`, `printed` |
| ۱ | `unit` با `siRe` می‌خواند | `si`, `printed` |
| ۲ | نسبتِ دو سیستمِ کلید ≥ ۲.۲۵ (نه B12/FT3)، و `reference` قابلِ تجزیه، و قاطع طبقِ R4، و عدد در حدودِ ممکنِ آن سیستم (اگر `plausible` تعریف شده) | آن سیستم، `reference` |
| ۳ | `plausible` تعریف شده و عدد بیرون از ناحیهٔ مبهم | آن سیستم، `magnitude` |
| ۴ | هیچ‌کدام | `null`, `null` |

**تابعِ خالص** است: نه `tests` را می‌نویسد نه `unitConversions` را؛ `adapter.js` نتیجه را اعمال می‌کند.
این یعنی می‌شود آن را جدا آزمود (هر گام، هر دو سمتِ هر مرز).

## 4. اثر روی خروجیِ `ocrToEngineInput` / `runEngine`

| حالت | `tests[key]` | `unitConversions` | `ungraded[key]` |
|---|---|---|---|
| `conv` (هر basis) | عدد، بی‌تبدیل | اگر basis ≠ printed: `{test, raw, from: <متعارف>, value, to, basis}` تا بیمار بداند واحد تعیین شد | — |
| `si` | عددِ تبدیل‌شده | `{…, basis}` | — |
| `null` | **نوشته نمی‌شود** در graded | — | `{ value: <خام>, reason: "unit_unknown", alt: { conv: verdict, si: verdict } }` |

- `verdict` = `"normal" | "abnormal"` از `evaluate()` با بازهٔ موتور، یک‌بار به متعارف و یک‌بار به SI.
  **`dir` عمداً نگه داشته نمی‌شود** — جهت در ناحیهٔ مبهم معنا ندارد (R7).
- `unitUnknown` (مجموعهٔ `P47` برای `TESTO`) در همین سازوکار ادغام می‌شود؛ رفتارش همان می‌ماند.

## 5. قاعدهٔ `unit_unknown_values` (تازه — `rules/patterns_unit_unknown.js`)

- `match`: هر `ungraded[k].reason === "unit_unknown"`.
- یک یافته برای همهٔ ردیف‌ها.
- `urgency` (یک محاسبه، N20): `this_week` اگر برای **دست‌کم یک** ردیف هر دو `alt` غیرطبیعی باشد؛ وگرنه
  `routine`. `action` از همان مقدار با `actionFor(urgency, …)`.
- `warnings`: اگر `TROPONIN_I` در فهرست است، هشدارِ شرطیِ دردِ قفسهٔ سینه (R7).
- `sources`: `["AMA_SI_UNITS", "LOINC"]` (هر دو به `guidelines.js` اضافه می‌شوند).
- مالکیت: `reproductive_hormone_context` دیگر `unit_unknown` را نمی‌خواند (`CONTEXT_REASONS` بی آن).

## 6. حالت‌ها برای یک ردیف (خلاصه)

```
unit شناخته‌شده ──► printed ──► همان رفتارِ امروز
      │ نه
reference قاطع؟ ──► reference ──► graded + سطرِ تبدیل با basis
      │ نه
plausible تأییدشده و بیرون از مبهم؟ ──► magnitude ──► graded + سطرِ تبدیل
      │ نه
unit_unknown ──► ungraded ──► یافتهٔ unit_unknown_values (routine | this_week، هرگز emergency)
```
