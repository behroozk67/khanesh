# Data model — specs/008

Engine-level entities only. No database, and no API field is added (see [contracts/engine-output.md](contracts/engine-output.md)).

## 1. Hb reference interval (`refs.js` → `hgbRef(sex, age)`)

| field | value |
|---|---|
| key | `HGB` |
| unit | g/dL |
| low | by sex × age band — table in [research.md](research.md) R1 |
| high | unchanged: M 17.5, F 15.3 |
| source label | «تأییدِ کاربر ۱۴۰۵/۰۷/۰۱؛ مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم» (≥ 16 y or unknown age) |

**Validation / selection order:**
1. age < 16 → `PED_REFS` row, or today's adult M 14 / F 12.3 when no row covers the age (12–15, byte-identical).
2. 16–19, 20–49, 50–69, ≥ 70 → the approved rows. Unknown age → the 20–49 row.
3. Unknown sex → the F row, as today.

`GERIATRIC_REFS.HGB` is removed. `GERIATRIC_REFS.MCV` and `.ALP` stay (≥ 75).

## 2. Iron-marker intervals

| key | range | notes |
|---|---|---|
| `IRON` | both 50–160 µg/dL | < 16 y: `PED_REFS` |
| `FERRITIN` | M 12–300; F < 50 y 12–150; F ≥ 50 y 30–300 ng/mL | via `ferritinRef(sex, age)`; a female of unknown age → 12–150; < 16 y: `PED_REFS` |

## 3. Rule-held thresholds (`patterns_utils.js`) — N23

| name | value | read by | status |
|---|---|---|---|
| `ferritinIdCut(e)` | M 30 · F ≥ 50 y 30 · F < 50 or unknown 15 | `iron_deficiency_panel` (match + build), `anemia_of_chronic_disease` (ferritin not low) | M and F < 50 = held (today's values); F ≥ 50 = clarified change |
| `IRON_ACD_LOW_UGDL` | 60 µg/dL | `anemia_of_chronic_disease` | held |

**Invariant:** no rule in scope reads `dir` for `FERRITIN` or `IRON`. Rules read the value against the cut.

## 4. Haemoglobin fractions and related analytes (new keys)

| key | FA name (draft, shown to the user for review) | range | graded when |
|---|---|---|---|
| `HBA2` | هموگلوبین A2 | 1.5–3.5 % | age ≥ 2 or unknown |
| `HBF` | هموگلوبین جنینی (HbF) | 0–2 % | age ≥ 2 or unknown |
| `HBA` | هموگلوبین A | none → `noRef` | — |
| `HBS` | هموگلوبین S (داسی‌شکل) | none → `noRef` | — |
| `HBC` | هموگلوبین C | none → `noRef` | — |
| `HBE` | هموگلوبین E | none → `noRef` | — |
| `ZPP` | روی‌پروتوپورفیرین (ZPP) | none → `noRef` | — |
| `STFR` | گیرندهٔ محلول ترانسفرین (sTfR) | none → `noRef` | — |
| `EPO` | اریتروپویتین | none → `noRef` | — |

**Identity rules (R4):**
- `hbs`, `hbc` and `hbe` resolve to a variant key only with a `%` unit **or** an unambiguous electrophoresis row
  (`HBA2`/`HBF`/`HBA`) on the same sheet.
- Otherwise `hbc` and `hbe` stay `unmapped` (as today).
- A bare `hbs` with a non-numeric value moves from `qual` to `unmapped`. A bare `hbs` with a number and no evidence also
  goes to `unmapped`, **never** to `HGB`.
- Exact `NAME_MAP` entries always win over `resolveAlias`.
- A non-numeric value on a variant row goes to `unmapped` under its printed name.

## 5. HbA2 finding (`hba2_elevated`, new, `routine`)

| state | condition | owner |
|---|---|---|
| trait-consistent | HBA2 > 3.8 | a thalassaemia owner if one fires (clause), else `hba2_elevated` |
| borderline | 3.5 < HBA2 ≤ 3.8 | same hand-off; no trait claim |
| none | HBA2 ≤ 3.5, absent, or ungraded (< 2 y) | — (a low value goes to the `unexplained_abnormal` net) |

**Invariant:** exactly one finding mentions HbA2 per sheet. Urgency is never above `routine` because of HbA2.

The thalassaemia owners are `thal_trait_no_anemia` and `microcytic_anemia` (both branches). `thalOwnerFires(e)` is
derived from their own `match`.
