# Contract: patient-facing strings (draft, Persian)

These are drafts. They become final only when implemented and quoted in the commit report. `{v}` and `{r}` are the graded value and range.

## C1: `hypothyroid` with low TSH (`thyroid_hyper_*`)

- **Replaces:** «TSH پایین یعنی هورمون تیروئید بیش از نیاز بدن ساخته می‌شود؛ پرکاری تیروئید می‌تواند باعث … شود. شایع‌ترین علت آن بیماری خودایمنی گریوز است.» and the following overt/subclinical sentence.
- **New text:** «TSH شما {v} است (حد طبیعی {r}). چون کم‌کاری تیروئید دارید: اگر لووتیروکسین (قرص تیروئید) مصرف می‌کنید، شایع‌ترین علتِ TSHِ پایین این است که دوزِ قرص بیش از نیازِ بدن است. اگر دارو مصرف نمی‌کنید، پزشک علت‌های دیگر را بررسی می‌کند. دوز را فقط پزشک تغییر می‌دهد؛ خودسرانه قرص را کم یا قطع نکنید.»
- **Clauses added:**
  - TSH < 0.1: «TSHِ شما بسیار پایین (کمتر از ۰٫۱) است.»
  - FT4 high: «FT4 هم بالاست ({v}؛ حد طبیعی {r}).»
  - FT4 absent: `missingFa("FT4")`.
- **Headline:** «TSH شما پایین‌تر از حد طبیعی است».
- `warnings`, `action` and urgency are unchanged.

## C2: `hypothyroid` with high TSH (`thyroid_hypo_*`)

- **Replaces:** «تیروئید غده‌ای در گردن است … کم‌کار را بیشتر تحریک می‌کند.» and the overt/subclinical/missing sentence.
- **New text:** «TSH شما {v} است (حد طبیعی {r}). چون کم‌کاری تیروئید دارید، این یعنی بدن هنوز هورمونِ تیروئیدِ کافی ندارد. اگر لووتیروکسین مصرف می‌کنید، شایع‌ترین علت این است که دوزِ فعلی کافی نیست یا قرص به‌طورِ منظم خورده نشده است. پزشک دوز را با همین عدد تنظیم می‌کند و معمولاً چند هفته پس از هر تغییرِ دوز آزمایش تکرار می‌شود.»
- **FT4 clause:**
  - overt: «FT4 هم پایین است ({v}؛ حد طبیعی {r}).»
  - normal: «FT4 در محدوده است ({v}).»
  - absent: `missingFa("FT4")` + «برای تنظیمِ دوز، FT4 هم کمک می‌کند.»
- **TSH ≥ 10:** «TSHِ شما خیلی بالاتر از حد است.»
- The existing T3, TPO, secondary-hits and pregnancy clauses are kept, appended in the same order.
- **Drift from spec US1-2:** «همراهِ غذا» is dropped. It is not in the extraction.

## C3: TSH ≥ 10, FT4 normal, no condition

- **Replaces** «چون هورمون تیروئید (FT4) هنوز طبیعی است، این کم‌کاری خفیف («تحت‌بالینی») است؛ برای تأیید معمولاً چند هفته بعد تکرار می‌شود و اغلب فقط پیگیری لازم دارد.» with:
- «هورمون تیروئید (FT4) هنوز طبیعی است، پس این کم‌کاریِ «تحت‌بالینی» است؛ ولی TSHِ ۱۰ یا بالاتر حدی است که پزشکان معمولاً در آن درمان را در نظر می‌گیرند. برای تأیید معمولاً چند هفته بعد تکرار می‌شود و تصمیم با پزشک است.»

## C4: TSH < 0.1, FT4 normal, no condition

- **Replaces** «چون FT4 هنوز طبیعی است، این پرکاری خفیف («تحت‌بالینی») است؛ برای تأیید معمولاً چند هفته بعد تکرار می‌شود.» with:
- «FT4 هنوز طبیعی است، پس این پرکاریِ «تحت‌بالینی» است؛ ولی TSHِ کمتر از ۰٫۱ یعنی کاملاً سرکوب شده و این دیگر نوعِ خفیف نیست. برای تأیید معمولاً تکرار می‌شود و پزشک باید آن را بررسی کند.»

## C5: `hypothyroid` tails for TPO and anti-Tg

- `thyroid_tpo_positive` **replaces** «در این مرحله اگر بقیه‌ی هورمون‌ها طبیعی باشند، اغلب فقط پیگیری لازم است، چون گاهی با گذر زمان به کم‌کاری تیروئید می‌انجامد.» with:
  - «چون کم‌کاری تیروئید دارید، این آنتی‌بادی به احتمالِ زیاد همان علتِ کم‌کاریِ شماست (التهابِ خودایمنیِ تیروئید، هاشیموتو) و یافتهٔ تازه‌ای نیست.»
- `thyroid_antibody_positive` tail: «اغلب فقط پیگیریِ دوره‌ای لازم است» is dropped under the condition.

## C6: pregnancy tails for TPO and anti-Tg (TSH not abnormal)

- **Replaces** the «اغلب فقط پیگیری…» tail with:
- «چون باردار هستید، این یافته اهمیتِ بیشتری دارد: آنتی‌بادی‌های تیروئید حتی وقتی TSH طبیعی است با خطرِ بیشتری برای بارداری و با التهابِ تیروئید پس از زایمان همراه‌اند. معمولاً TSH (و FT4) در طولِ بارداری و پس از زایمان دوباره سنجیده می‌شود؛ این نتیجه را به پزشکِ زنانِ خود نشان دهید.»
- With both `hypothyroid` and `pregnant`: C5 comes first, then C6.

## C7: thyroglobulin

- **Main sentence:** «تیروگلوبولینِ شما {shown}{ unit} است{ (محدودهٔ چاپ‌شده: {ref})}. تیروگلوبولین بیشتر برای پیگیریِ کسانی به کار می‌رود که برای سرطانِ تیروئید درمان شده‌اند؛ معنای عددش به این بستگی دارد که تیروئید برداشته شده یا نه و آزمایش در چه شرایطی انجام شده، پس تفسیرش با پزشکِ معالج است. این آزمایش به‌تنهایی آزمایشِ تشخیصِ سرطان نیست.»
- **Anti-Tg within/neg:** «آنتی‌بادی ضد تیروگلوبولین (Anti-Tg) روی همین برگه منفی است، پس بعید است این آنتی‌بادی عددِ تیروگلوبولین را به هم زده باشد.»
- **Anti-Tg absent:** «برای تفسیرِ تیروگلوبولین، آنتی‌بادی ضد تیروگلوبولین (Anti-Tg) هم باید سنجیده شود؛ روی این برگه نیست.» `suggest` gets «آنتی‌بادی ضد تیروگلوبولین (Anti-Tg)».
- **Anti-Tg above/pos:** no extra sentence. The existing cancer-context anti-Tg sentence follows.
- **`thyroid_thyroglobulin`:**
  - headline: «نتیجهٔ تیروگلوبولینِ شما»
  - action: «در نوبتِ پیگیریِ خود به پزشکِ معالج نشان دهید.»
  - urgency: `routine`
- **Forbidden:** «تومور ندارید», «درمان شده‌اید», «پاک», and any verdict against a range.

## C8: newborn, TSH graded high on the `< 3 days` row

- **Appended:** «غربالگریِ تیروئیدِ نوزاد معمولاً روزِ ۳ تا ۵ پس از تولد انجام می‌شود؛ این نتیجه باید در همان بازه، طبقِ نظرِ پزشک یا برنامهٔ غربالگری، تکرار یا تأیید شود.»
- **Forbidden:** any phrase that the value is normal, physiological or explained.

## Invariants

1. Without `hypothyroid`, `pregnant` or Tg, and outside the TSH ≥ 10 / < 0.1 FT4-normal panels and the newborn, output is byte-identical to `before.txt` (before US6).
2. No string changes urgency. `overall_urgency` is equal on every `before.txt` panel (before US6).
3. No raw key (`THYROGLOBULIN`) appears in any patient string (M32).
4. Every `suggest` string has a `SUGGEST_TESTS` row.
5. A clean sheet's health score is unchanged by a Tg row.

## Drift from the drafts (as implemented, 2026-11-13)

The implemented strings live in `khanesh-server/rules/patterns_endocrine_rheum.js`, under `knownHypoLowText`, `knownHypoHighText`, `antibodyContextTail`, `thyroglobulinSentence` and `NEWBORN_TSH_TIMING`. `snapshots/after_us1-5.txt` prints them in full.

- **C1:** FT4 is three-state. A normal FT4 also gets «FT4 در محدوده است ({v}؛ حد طبیعی {r}).», and absent gets `missingFa("FT4")`. The draft only had high and absent.
- **C1/C2:** the magnitude clause («TSHِ شما بسیار پایین (کمتر از ۰٫۱) است.» or «TSHِ شما خیلی بالاتر از حد است.») comes right after the TSH sentence, not at the end.
- **C5/C6 in `thyroid_antibody_positive`:** when TSH is measured, the tail reads «TSHِ این برگه طبیعی است. {C5}{ C6}». When TSH is absent, the «TSH لازم است» sentence is kept and C5/C6 follow it.
- **C7, anti-Tg within the printed range:** «… روی همین برگه داخلِ محدودهٔ چاپ‌شده است، پس بعید است…». «منفی» is used only for a qualitative negative.
- **C7, Tg-only finding:** `explains: ["THYROGLOBULIN"]`, `score_neutral: true`.
- **Urgency:** `T7 tg alone` went from `none` to `routine`. A previously dropped row now has an owner, so urgency only rises. SC-004 is read as "no urgency falls".
