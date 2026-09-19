# Quickstart — اعتبارسنجیِ 004

## پیش‌نیاز

- درختِ کاری روی `2d32dd3` یا بعد از آن (specs/003 کامیت شده است).
- `khanesh-server/node_modules` نصب باشد.

## ۱. خطِ پایه — پیش از هر تغییر

```bash
cd khanesh-server
npm test                    # بشمار و با نامِ درخت ثبت کن؛ از این فایل نقل نکن
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.length))"
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > /tmp/ids-before.txt
```

## ۲. «پیش قرمز، پس سبز»

هر آزمونِ تازه (`M141`+، `T21`) اول روی کدِ پیش از تغییر اجرا و قرمز دیده می‌شود. دو راه:
- پیش از نوشتنِ کد اجرا شود (ساده‌ترین)؛
- یا بعداً روی یک کپیِ `git archive 2d32dd3` که `node_modules` در آن junction شده است (دستور در `CLAUDE.md` > Commands).

## ۳. پنل‌هایی که باید اجرا شوند (موتورِ زنده، مردِ ۴۵ساله مگر گفته شود)

| پنل | انتظار |
|---|---|
| `Folate 2 ng/mL` | `folate_deficiency`، routine؛ «B12 اندازه‌گیری نشده … پیش از اسیدفولیک»؛ بی `unmatched_abnormal` |
| `Folate 5 nmol/L` | همان؛ متن عددِ چاپ‌شده (۵ nmol/L) را هم می‌گوید (N5) |
| `Folate 2 + B12 120` | `folate_deficiency` + `overt_b12_deficiency`؛ فولات فقط در یکی |
| `Folate 2 + B12 450` | «B12 روی همین برگه طبیعی است» |
| `Folate 2 + Hb 9 + MCV 110` | فقط `macrocytic_anemia` از فولات می‌گوید (با عددِ ۲)؛ `folate_deficiency` نیست |
| `Folate 8 + Hb 9 + MCV 110` | ماکروسیتیک: «فولات طبیعی است»؛ B12 «اندازه‌گیری نشده» |
| `Hb 9 + MCV 110` | ماکروسیتیک: فولات و B12 «اندازه‌گیری نشده»؛ هیچ «طبیعی» |
| `Folate 2 + K 7.0` | اورژانسِ پتاسیم + فولات پنهان یا نمایان، ولی **نه** در `unmatched_abnormal` (N18) |
| هشت املای FR-005 | `unmapped` از ۸ به ۰ |
| `Zinc 80 µg/dL` تنها | `noRef: [ZINC]`، `none`، مسیرِ موتور، خطِ «تفسیر نشدند» با «روی» |
| `Zn 80 µg/dL` / `Zn 80` بی‌واحد | اولی `ZINC`؛ دومی `unmapped` |
| `Anti-Intrinsic Factor: Positive` | `noRef: [ANTI_IF]`، نه `qual`؛ بی‌یافته |
| `RBC Folate 300 ng/mL` | `noRef: [RBC_FOLATE]`؛ هرگز `FOLATE` |
| `Folate 300` بی‌پیشوند | نمره نمی‌گیرد (ناممکن برای فولاتِ سرم) — اندازه‌گیری و ثبت |
| `Urine Copper 24h 120 µg/24h` / `Urine Copper 120 µg/L` | اولی `U_COPPER_24H`؛ دومی `unmapped` |
| `Chromium 0.5`، `Cr 1.1 mg/dL`، `Mn 10` | `CHROMIUM` noRef؛ `CREAT`؛ `unmapped` |
| ۱۲ پنلِ ثابتِ بی‌آنالیتِ فصل | بایت‌به‌بایت برابرِ پیش از تغییر |

## ۴. پس از تغییر

```bash
npm test                                  # 0 fail؛ عددها را با نامِ درخت گزارش کن
node -e "…RULES.map(r=>r.id)…" > /tmp/ids-after.txt; diff /tmp/ids-before.txt /tmp/ids-after.txt   # فقط + folate_deficiency
cd ../khanesh && npm run lint             # فرانت دست نخورده، ولی hook اجرا می‌کند
grep -nE "\b(20|100|125|6\.8|227|322|368)\b" ../khanesh-server/rules/patterns_hematology.js   # SC-007: عددِ تازه بی‌P49 نیست
```

سپس عاملِ `code-reviewer` و `eval-medical-reviewer`؛ هر متنِ فارسیِ بیمار عیناً به کاربر نشان داده شود.
