# Contract — engine output for 002

## `/api/analyze` response shape

**Unchanged.** No new top-level field, and no new `_engine` field. `ungraded` is internal
(research R5). What changes is the *content* of existing fields:

| field | change |
|---|---|
| `_engine.patterns` | may contain the new rule ids below |
| `_engine.tests[]` | new graded keys appear, with `name` already resolved through `faName()` |
| `_engine.uncovered` | must never list a key of this feature (every one has an owner; `M110`) |
| `ocr_warnings` | new keys that are recognized but have no approved range appear via `faName()` in the existing «محدوده مرجع نداریم» line (Stage A only) |
| `extracted_tests` | unchanged: it is built from OCR, and semen rows keep their printed names |

## Rule ids (Stage B)

`semen_analysis` · `male_gonadal_axis` · `female_ovarian_axis` · `female_androgen_excess` ·
`luteal_progesterone` · `amh_level` · `hcg_result` · `reproductive_hormone_context`

None of them may emit `emergency` (FR-025).

## Persian display names (`FA_NAMES`) — review verbatim

| key | نام فارسی |
|---|---|
| `SEMEN_VOL` | حجم مایع منی |
| `SPERM_CONC` | غلظت اسپرم |
| `SPERM_TOTAL` | تعداد کل اسپرم |
| `SPERM_MOT_TOTAL` | تحرک کل اسپرم |
| `SPERM_MOT_PROG` | تحرک پیش‌رونده اسپرم |
| `SPERM_MORPH` | شکل طبیعی اسپرم (مورفولوژی) |
| `SEMEN_PH` | pH مایع منی |
| `SEMEN_ABSTINENCE` | مدت پرهیز پیش از نمونه‌گیری |
| `SEMEN_WBC` | گلبول سفید در مایع منی |
| `SEMEN_RBC` | گلبول قرمز در مایع منی |
| `SEMEN_FRUCTOSE` | فروکتوز مایع منی |
| `SEMEN_ACP` | اسید فسفاتاز مایع منی |
| `SEMEN_NAG` | آلفاگلوکوزیداز خنثی مایع منی |
| `TESTO` | تستوسترون |
| `LH` | هورمون LH |
| `FSH` | هورمون FSH |
| `LH_D3` | هورمون LH (روز سوم قاعدگی) |
| `FSH_D3` | هورمون FSH (روز سوم قاعدگی) |
| `E2` | استرادیول |
| `E2_D3` | استرادیول (روز سوم قاعدگی) |
| `PROG` | پروژسترون |
| `PROG_D21` | پروژسترون (روز ۲۱ قاعدگی) |
| `AMH` | هورمون AMH (ذخیره تخمدان) |
| `DHEAS` | DHEA-S |
| `OHP17` | ۱۷-هیدروکسی‌پروژسترون |
| `HCG` | بتا اچ‌سی‌جی (تست بارداری خون) |

`LH`, `FSH`, `AMH`, `DHEA-S` and `pH` stay as printed abbreviations, the same convention as
`MCH`/`LDL` (N8, `M32` note). They are what the sheet prints.

## Reason sentences for `reproductive_hormone_context` — review verbatim

| reason | متن |
|---|---|
| `cycle_day_unknown` | «مقدار این هورمون در روزهای مختلفِ چرخهٔ قاعدگی بسیار فرق می‌کند و روزِ نمونه‌گیری روی برگه نیست؛ برای همین دربارهٔ بالا یا پایین بودنش قضاوت نمی‌کنیم. اگر روزِ چرخه را می‌دانید، با پزشک مطرح کنید.» |
| `pediatric` | «مقدار این هورمون پیش و در طولِ بلوغ به‌طورِ طبیعی با بزرگسالان فرق دارد و به مرحلهٔ بلوغ بستگی دارد؛ برای همین با محدودهٔ بزرگسالان سنجیده نمی‌شود. تفسیرش با پزشک است.» |
| `sex_unknown` | «محدودهٔ طبیعیِ این هورمون در زن و مرد بسیار متفاوت است و جنسیت روی برگه مشخص نیست؛ برای همین قضاوت نمی‌کنیم.» |
| `hcg_positive` | «با تستِ بارداریِ مثبت روی همین برگه، تفسیرِ این عدد با پزشک است.» |

The texts of the diagnostic findings are written in Stage B against the approved numbers, and
are reviewed verbatim in that change.

## Guards

| id | asserts | stage | red before? |
|---|---|---|---|
| `M104` | a semen page (row-name signal) produces no urinary finding; the probe panel from R2 | A | ✅ (`hematuria` today) |
| `M104b` | a semen page (unit signal `million/mL`) behaves the same; `10*6/µL` does **not** mark a page as semen | A | ✅ / freeze |
| `M104c` | a mixed CBC + semen page keeps the CBC's WBC/RBC exactly as today | A | freeze |
| `M104d` | urine-only and CBC-only panels: findings are byte-identical before and after (SC-002) | A | freeze |
| `T18` | `mergePages`: a CBC page and a semen page, in either upload order, keep both `WBC` rows | A | ✅ |
| `M105` | the name map: every new spelling resolves to its key; the negative collisions (17-OHP↛PROG, Free βhCG/MoM↛HCG, free testosterone↛TESTO, AFP unmapped) | A | ✅ |
| `M105b` | every key in §2 is in `FA_NAMES` and differs from the raw key where the table says so | A | ✅ |
| `M105c` | exact unit conversions, and AMH pmol/L is **not** converted | A | ✅ |
| `M106`–`M106f` | `semen_analysis`: each parameter, azoospermia, the fructose / abstinence 3-way arms, the 4 % edge, volume ≠ oligo, all normal → no finding | B (`todo P47 #1–9`) | ✅ |
| `M107`–`M107d` | `maleAxis`: each label, the LH/FSH 3-way arm, never "confirmed", `tubular_failure` | B (`todo P47 #10–11`) | ✅ |
| `M108`–`M108d` | `femaleAxis` + menopause age + no day → no verdict + `central_pattern` needs a low E2 | B (`todo P47 #12–14`) | ✅ |
| `M109`–`M109c` | hCG: F neg/grey/pos, M, unknown sex, the MoM exclusion, PROG_D21 silenced by a positive hCG | B (`todo P47 #21`) | ✅ |
| `M109d` | age < 16 and unknown sex: no verdict for any sex hormone; the pediatric sentence is present | B | ✅ |
| `M110` | two-sided sweep: for every family, exactly one owner per abnormal key (no silence, no double ownership) | B | ✅ |
| `M111` | duplicate freeze: the pre-eclampsia component panel, `Urine Protein 2+`, and `TSH 8/FT4 0.6` give byte-identical findings; no pre-eclampsia or hyperprolactinemia finding | A | freeze |
| `M111b` | no new rule emits `emergency`; no patient string contains a drug, dose or procedure instruction | B | ✅ |
| `T19` | routing: an ungraded-only sheet takes the engine path **and** gets the context finding, never `buildNormalResult` | B | ✅ |

"Freeze" guards are expected to pass before and after. They exist to prove that nothing changed
(the same convention as `M103` in `001`).
