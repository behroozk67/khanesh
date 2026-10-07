# Data Model: Sheet Score Redesign (015)

Everything here is computed per request from `engineOut` and `patternOut`. Nothing is stored and nothing flows back into the engine (FR-013).

## Test score

| Field | Meaning |
|---|---|
| `key` | engine key (`graded[i].test`) |
| `points` | ∈ [0, 1] |

Rules (FR-001 to FR-003, research R1/R2):

1. Skip when `mode === "unknown"`, or when the key is in `EXCLUDED`. The excluded key still appears in the count.
2. If `!abnormal`: `nearLimit ? 0.9 : 1`.
3. Parse `range` as `lo–hi`. If the range is two-sided and `hi > lo`: `relW = (dir === "high" ? value − hi : lo − value) / (hi − lo)`, clamped at ≥ 0, and `p = 1 / (1 + relW²)`. Otherwise `p = null`.
4. With a `level`: `points = min(p ?? 1, POINTS[level])`. Without one: `points = p ?? 0.5`.

`POINTS` is unchanged: mild 0.65, moderate 0.4, marked 0.15, critical 0. `outNoLevel` is removed as a table entry; 0.5 survives only as the fallback in step 4.

## Bucket

A set of correlated keys that counts as one measurement. Its score is the **minimum** of its scored members. A key that appears in no bucket below is a singleton bucket.

| Bucket id | Keys | System |
|---|---|---|
| `coag_time` | PT, INR, APTT | coagulation |
| `transaminase` | AST, ALT | liver |
| `bilirubin` | BILI_T, BILI_D, BILI_I | liver |
| `red_mass` | HGB, HCT, RBC | blood-forming |
| `red_indices` | MCV, MCH, MCHC | blood-forming |
| `rdw` | RDW_CV, RDW_SD | blood-forming |
| `renal_n` | CREAT, UREA, UREA_N | kidney |
| `atherogenic` | LDL, CHOL, APOB | heart |
| `troponin` | TROPONIN_I, TROPONIN_T | heart |
| `natriuretic` | BNP, NTPROBNP | heart |
| `glucose` | GLU_F, GLU_RANDOM | metabolic & endocrine |
| `thyroxine` | T4, FT4 | metabolic & endocrine |
| `triiodo` | T3, FT3 | metabolic & endocrine |
| `iron_transport` | IRON, TIBC, TSAT, TRANSFERRIN | blood-forming |
| `crp` | CRP, CRP_Q | inflammation & immunity |
| `brucella` | WRIGHT, COOMBS_WRIGHT, ME2 | inflammation & immunity |
| `cortisol` | CORTISOL_AM, CORTISOL_DST | metabolic & endocrine |
| `flc` | KAPPA_FLC, LAMBDA_FLC | blood-forming |

## System assignment (singletons and buckets)

| System id | fa | Weight | Keys |
|---|---|---|---|
| `blood` | خون‌سازی | 1.0 | red_mass, red_indices, rdw, iron_transport, flc, WBC, PLT, MPV, NEUT_ABS, LYMPH_ABS, MONO_ABS, EOS_ABS, BASO_ABS, BAND_ABS, RETIC, FERRITIN, B12, FOLATE, HAPTO, LDH, HBA2, HBF |
| `liver` | کبد | 0.8 | transaminase, bilirubin, ALP, GGT, ALB, TP, NH3, AMYLASE, LIPASE |
| `kidney` | کلیه | 1.0 | renal_n, ACR, U_CA |
| `heart` | قلب | 1.0 | atherogenic, troponin, natriuretic, HDL, TG, CK, CK_MB, MYOGLOBIN, HCY |
| `metabolic` | متابولیک و غدد | 1.0 | glucose, thyroxine, triiodo, cortisol, GLU_2H, HBA1C, URIC, TSH, ANTI_TPO, PRL, TESTO |
| `coag` | انعقاد | 0.8 | coag_time, FIB, DDIMER, ATIII, TT |
| `inflam` | التهاب و ایمنی | 0.6 | crp, brucella, ESR, PCT_SEPSIS, RF |
| `lytes` | الکترولیت و مواد معدنی | 0.8 | NA, K, CL, HCO3, CA, MG, PHOS, PH, OSM, LACTATE, PTH, VIT_D |

`EXCLUDED`: SEMEN_PH, SEMEN_VOL, SPERM_CONC, SPERM_MORPH, SPERM_MOT_PROG, SPERM_MOT_TOTAL. Reason: «تحلیلِ منی دربارهٔ کارِ یک دستگاهِ بدن حکمی نمی‌دهد».

Exactly 109 keys total, across the systems and `EXCLUDED`. That is the measured union (research R3). The guard is FR-006: the union of `ADULT_REFS`, `PED_REFS`, `CLASSIFIERS` and `CTCAE_MAP` must equal the table's keys, and no key may appear twice.

`U_CA` is the 24-hour urinary calcium, so it goes to kidney (excretion); it is not a serum mineral. `HBA2`/`HBF` are haemoglobin electrophoresis, so they go to blood-forming.

## System result

| Field | Rule |
|---|---|
| `id`, `fa`, `weight` | from the table |
| `keys` | the scored keys of this sheet that belong to the system (for the frontend's focus view) |
| `raw` | `(0.65 × mean(buckets) + 0.35 × min(buckets)) × 100`, or `null` when there are no buckets |
| `cap` | `min` of `URGENCY_CAP[u]` over the findings that cap it (research R4), or `null` |
| `score` | `round(min(raw, cap ?? 100))`, or `null` |
| `capped` | `cap != null && raw > cap` |
| `critical` | any member has `level === "critical"` |
| `worst` | `{ key, name: faName(key), points }` for the lowest-scoring member, or `null` when every member scores 1 |

## Sheet score (`_engine.score`)

| Field | Rule |
|---|---|
| `version` | `2` |
| `value` | `null` when `reason` is set. Otherwise `round(min(weightedMean(systems), minSystem + 30))`; if overall urgency is `emergency`, `min(…, 35)` |
| `band` | ≥ 85 `high`, ≥ 60 `mid`, else `low`; `null` when `value` is null |
| `reason` | `neonate` (age < 28 days, checked first), then `too_few` (< 5 buckets), then `one_system` (< 2 systems), else `null` |
| `cap` | 35 when emergency, else `null` |
| `capped` | whether the emergency cap lowered the value |
| `systems` | the 8 system results, in table order, nulls included |
| `covered` | the ids of the non-null systems |
| `count` | `{ scored, out, levels: { mild, moderate, marked, critical }, no_level, excluded }` |
| `points` | `{ key: points }`, kept for backward compatibility |
| `counted`, `total` | kept: number of scored tests and length of `graded` |

`neonate`: `systems` are all null and `count` is still filled. That differs from today, where the count does not exist. The newborn sees how many rows were read, and no number is given.

## State transitions

None. The score is a pure function of one response.
