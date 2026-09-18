# Data Model — 002 Reproductive, Fertility & hCG

The engine has no persistent storage. The "entities" here are engine keys, page classification,
classifier labels, constants and the register entry.

## 1. Page classification (adapter, Stage A)

```
detectSemenPages(ocrTests) → Set<pageIndex>
  page ∈ set  ⇔  ∃ row on page: norm(name) ∈ SEMEN_ONLY_MARKERS
                 ∨ ∃ row on page: unit matches /(million|mil|10\^?\*?6|×10\^?6)\s*\/\s*ml/i  (mL, never µL)
isSemenPage(pageTests) → boolean      // exported; used by mergePages before merging (R3)
```

| key on a semen page | before (today) | after |
|---|---|---|
| `pH` | `qual["Urine pH"]` | `SEMEN_PH` |
| `WBC`, `RBC`, `pus cells` | urine `qual`, or CBC | `SEMEN_WBC`, `SEMEN_RBC` — **unless** the page also has `BLOOD_ONLY_MARKERS`, in which case today's behavior is kept |
| `Volume` | unmapped | `SEMEN_VOL` |
| `Count` / `Concentration` | unmapped | `SPERM_CONC` (per mL) or `SPERM_TOTAL` (per ejaculate, if the unit or name says "total") |

Layer order in `ocrToEngineInput`: **0 semen** → 1 `/hpf` → 2 pH → 3 urine-page → … (R2).

`mergePages` dedupe key: `(isSemenPage(page) ? "semen:" : "") + normName(name)`.

## 2. Engine keys

All keys get `FA_NAMES` entries in Stage A (for example `SPERM_CONC` → «غلظت اسپرم»,
`SPERM_MOT_PROG` → «تحرک پیش‌رونده», `TESTO` → «تستوسترون», `FSH_D3` → «FSH روز سوم»,
`HCG` → «بتا اچ‌سی‌جی»). The final Persian strings are listed in
[contracts/engine-output.md](contracts/engine-output.md) and are to be reviewed verbatim.

| key | unit (engine) | channel | graded when (Stage B) |
|---|---|---|---|
| `SEMEN_VOL` | mL | tests | always (semen page) |
| `SPERM_CONC` | ×10⁶/mL | tests | always |
| `SPERM_TOTAL` | ×10⁶ per ejaculate | tests | never (context only) |
| `SPERM_MOT_TOTAL`, `SPERM_MOT_PROG` | % | tests | always |
| `SPERM_MORPH` | % normal forms (strict) | tests | always |
| `SEMEN_PH` | — | tests | always |
| `SEMEN_ABSTINENCE` | days | tests | never (context, for the 3-way arm) |
| `SEMEN_WBC`, `SEMEN_RBC` | as printed | **`semenQual`** | never (recognized, so they don't fall to urine). ⚠️ Not `qual`: the urine rules search `qual` with `/rbc/` and `/wbc/` on any key name, so «Semen RBC» in `qual` would still fire `hematuria` (found during implementation, N25) |
| `SEMEN_FRUCTOSE`, `SEMEN_ACP`, `SEMEN_NAG` | qualitative | `semenQual` | classifier inside `semen_analysis` |
| `TESTO` | ng/dL | tests / ungraded | sex known ∧ age ≥ 16 |
| `LH`, `FSH` | mIU/mL | tests / ungraded | M: sex known ∧ age ≥ 16. F: only as `LH_D3`/`FSH_D3` |
| `LH_D3`, `FSH_D3`, `E2_D3` | mIU/mL, pg/mL | tests | F ∧ age ≥ 16 |
| `E2` | pg/mL | ungraded | never (day unknown) |
| `PROG` | ng/mL | ungraded | never (day unknown) |
| `PROG_D21` | ng/mL | tests / ungraded | F ∧ age ≥ 16 ∧ HCG not positive/grey |
| `AMH` | ng/mL | tests / ungraded | F ∧ age ≥ 16 |
| `DHEAS` | µg/dL | tests / ungraded | sex known ∧ age ≥ 16 |
| `OHP17` | ng/mL | tests / ungraded | sex known ∧ age ≥ 16 |
| `HCG` | mIU/mL, or qual | tests or qual | always (the sex decides the text, not the grading) |

### Spellings (T003, seed list)

These come from the parameter names that Iranian lab and urology sites print, via the searches
of 2026-09-18 ([vahidlab.ir](https://vahidlab.ir/seminal-fluid/), [niloulab.com](https://www.niloulab.com/ArticleDetail/291/),
[jordanmedlab.com](https://jordanmedlab.com/), [drkarami.com](https://drkarami.com/1202/), [homeca.ir](https://www.homeca.ir/articles/blood-test-on-the-third-day-of-menstruation/),
[doctoreto.com](https://doctoreto.com/blog/hormone-test/)). ⚠️ They were **not** taken from a photographed
printed sheet, so N2 is still open, exactly as it was for `P46`.

| key / signal | spellings (after `norm()`) |
|---|---|
| semen-only markers | motility, spermmotility, progressivemotility, progressive, rapidprogressive, slowprogressive, nonprogressive, nonprogressivemotility, immotile, gradea/b/c/d, morphology, spermmorphology, normalforms, normalmorphology, liquefaction, liquefactiontime, viscosity, vitality, agglutination, spermcount, spermconcentration, totalspermcount, totalspermnumber, abstinence, abstinencedays, semenvolume, semenanalysis, spermogram, اسپرم, تعداداسپرم, تحرک, تحرکپیشرونده, مورفولوژی, مرفولوژی, زمانمایعشدن, مایعشدگی, ویسکوزیته, مدتپرهیز, مایعمنی, اسپرموگرام |
| semen units | million/ml, mil/ml, 10^6/ml, 10*6/ml, ×10^6/ml, x10^6/ml (**never** /µl or /ul) |
| `SEMEN_VOL` | volume, semenvolume, حجم |
| `SPERM_CONC` | count, spermcount, concentration, spermconcentration, تعداداسپرم, غلظتاسپرم |
| `SPERM_TOTAL` | totalcount, totalspermcount, totalspermnumber |
| `SPERM_MOT_TOTAL` | motility, totalmotility, spermmotility, تحرک, تحرککل |
| `SPERM_MOT_PROG` | progressivemotility, progressive, pr, تحرکپیشرونده |
| `SPERM_MORPH` | morphology, normalforms, normalmorphology, strictmorphology, krugermorphology, مورفولوژی, مرفولوژی |
| `SEMEN_ABSTINENCE` | abstinence, abstinencedays, abstinenceperiod, مدتپرهیز |
| `TESTO` | testosterone, totaltestosterone, testosteronetotal, تستوسترون |
| `LH` / `LH_D3` | lh, luteinizinghormone / lhday3, day3lh, lhروز۳, lhروزسوم |
| `FSH` / `FSH_D3` | fsh, folliclestimulatinghormone / fshday3, day3fsh, fshروز۳, fshروزسوم |
| `E2` / `E2_D3` | estradiol, e2, oestradiol, استرادیول / estradiolday3, e2day3, استرادیولروزسوم |
| `PROG` / `PROG_D21` | progesterone, پروژسترون / progesteroneday21, day21progesterone, پروژسترونروز۲۱, پروژسترونروزبیستویکم |
| `AMH` | amh, antimullerianhormone, antimüllerianhormone, هورمونآنتیمولرین |
| `DHEAS` | dheas, dheasulfate, dheasulphate, dehydroepiandrosteronesulfate |
| `OHP17` | 17ohprogesterone, 17hydroxyprogesterone, 17ohp, 17αohp, ۱۷هیدروکسیپروژسترون |
| `HCG` | betahcg, bhcg, βhcg, hcg, serumhcg, totalhcg, quantitativebhcg, تستبارداری, بتاhcg |
| **never mapped** | freebetahcg, freebhcg, freetestosterone, testosteronefree, afp, afpmom (and any row with unit MoM) |

**Ref lookup guard (`refs.js`):** today `getRef()` returns `r.F` when sex is unknown
(`sex === 'M' ? r.M : r.F`, [refs.js:330](../../khanesh-server/rules/refs.js#L330)), and falls
through to adult ranges under 16. For every reproductive key it MUST instead return `null`, and
the adapter routes the value to `ungraded` with the reason code. This is the single mechanism
behind FR-011.

## 3. `ungraded` channel (shared with `001`)

```
e.ungraded = { [key]: { value, reason } }
reason ∈ "cycle_day_unknown" | "pediatric" | "sex_unknown" | "hcg_positive"
```
The channel is internal and is never serialized into `_engine`. `val(e)` does not read it.

## 4. Classifiers and labels

`maleAxis(e)` — defined only when sex = M, age ≥ 16, and at least one of TESTO/LH/FSH is graded:

| label | condition | urgency |
|---|---|---|
| `testo_low_primary` | TESTO < `TESTO_LOW_M` ∧ LH high ∧ FSH high | this_week |
| `testo_low_secondary` | TESTO low ∧ LH ∈ {low, normal} ∧ FSH ∈ {low, normal} | this_week |
| `testo_low_axis_unmeasured` | TESTO low ∧ (LH or FSH absent) | this_week |
| `testo_low_discordant` | TESTO low ∧ LH and FSH point in opposite directions | this_week |
| `tubular_failure` | TESTO normal ∧ LH normal ∧ FSH high ∧ (SPERM_CONC low or 0) | routine |
| `male_axis_nonspecific` | any other abnormal TESTO/LH/FSH | routine |

Every `testo_low_*` text says that the diagnosis needs **two separate morning samples**
(SC-006: never "confirmed").

`femaleAxis(e)` — sex = F, age ≥ 16, at least one of FSH_D3/LH_D3/E2_D3 graded:

| label | condition | urgency |
|---|---|---|
| `menopause_consistent` | FSH_D3 high ∧ age ≥ `MENOPAUSE_AGE` | routine |
| `ovarian_insufficiency_pattern` | FSH_D3 high ∧ LH_D3 ∈ {high, absent} ∧ age < `MENOPAUSE_AGE` | this_week |
| `central_pattern` | E2_D3 low ∧ FSH_D3 ∈ {low, normal} ∧ LH_D3 ∈ {low, normal, absent} | this_week |
| `female_axis_nonspecific` | any other abnormal day-3 value | routine |

Partition check: the labels are mutually exclusive by construction (FSH_D3 high splits on age;
`central_pattern` requires FSH not high).

`semen_analysis` — one finding. Its body is composed of: azoospermia **xor** subset of {low
volume, oligo, astheno, terato}; the abstinence arm (outside 2–5 / in range / not printed); the
fructose arm (azoospermia only: absent / present / not measured); the ACP + pH arm and the NAG arm
when those are present; the viability suggestion when `SPERM_MOT_TOTAL < 30`; and a fixed
"one sample is not enough; repeat" sentence.

`hcg_result`:

| sex | value | text | urgency |
|---|---|---|---|
| F | < `HCG_NEG` | negative; a very early test can be falsely negative | routine |
| F | `HCG_NEG`–`HCG_POS` | indeterminate; repeat in 48 h | routine |
| F | ≥ `HCG_POS`, or qual positive | positive — consistent with pregnancy; follow up with a doctor | routine |
| M | ≥ `HCG_NEG`, or qual positive | not a pregnancy test in men; must be reviewed by a doctor | this_week |
| unknown | any | the number, plus "discuss with your doctor" | routine |

`female_androgen_excess` (F): one arm per analyte, three-way — TESTO high → ovarian/PCOS
evaluation; DHEAS high → adrenal source evaluation; OHP17 high → CAH evaluation; each normal arm
says so; each absent arm suggests it. It never *diagnoses* PCOS (FR-015).

`amh_level`: low → "reserve may be reduced; AMH normally falls with age". High → "can be seen
with polycystic ovaries; not a diagnosis alone".

`luteal_progesterone`: `PROG_D21 > PROG_OVULATION` → consistent with ovulation; otherwise
"possibly anovulatory this cycle; repeat next cycle".

## 5. Constants — all go to `P47`, none executable before approval

| # | constant | DSL value | source status |
|---|---|---|---|
| 1 | semen reference edition (sets 2–6) | WHO 1999/2010 mix | **reviewer picks WHO 2010 or 2021** |
| 2 | `SEMEN_VOL` LLN | 2.0 mL | 1.5 (2010) / 1.4 (2021) |
| 3 | `SPERM_CONC` LLN | 15 ×10⁶/mL | 15 / 16 |
| 4 | `SPERM_MOT_TOTAL` LLN | 40 % | 40 / 42 |
| 5 | `SPERM_MOT_PROG` LLN | 32 % | 32 / 30 |
| 6 | `SPERM_MORPH` LLN (inclusive) | 4 % (gap at 4) | 4 |
| 7 | `SEMEN_PH` range | 7.2–8.0 | DSL |
| 8 | abstinence window | 2–5 days | DSL |
| 9 | viability-stain trigger | total motility < 30 % | DSL |
| 10 | `TESTO_LOW_M` | 300 ng/dL | DSL; male ULN needs a source |
| 11 | LH / FSH male range | — | **no source in DSL** |
| 12 | FSH_D3 / LH_D3 / E2_D3 female ranges | — | **no source in DSL** |
| 13 | `MENOPAUSE_AGE` | — | **no source in DSL** |
| 14 | `central_pattern` requires a low E2_D3 | — | design decision (R7) for the reviewer to confirm |
| 15 | `PROG_OVULATION` | > 3.0 ng/mL | DSL |
| 16 | AMH low / high thresholds | "markedly" | **no number in DSL** |
| 17 | AMH pmol/L ÷ 7.14 | — | convention (R8) |
| 18 | DHEAS female range (age-banded) | — | **no source in DSL** |
| 19 | OHP17 female ULN (follicular) | — | **no source in DSL** |
| 20 | TESTO female ULN | — | **no source in DSL** |
| 21 | `HCG_NEG` / `HCG_POS` | 5 / — | 5 from DSL; the upper grey-zone edge needs a source (commonly 25) |
| 22 | urgency caps (the table above) | — | FR-025: no `emergency`; `this_week` maximum |

## 6. Register entry `P47`

Same structure as `P46`: the table above with "if approved / if not" columns; the coverage map
from the spec (duplicate / in-flight / lab-interpreted / out); the four DSL defects (R9); the
decisions made in clarify, with their costs (pediatric CAH not interpreted; progesterone silenced
next to a positive hCG; the pregnancy flag not read). Guideline id: `HENRY_REPRO` (ch.26).
