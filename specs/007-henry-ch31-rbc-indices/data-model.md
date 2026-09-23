# Data model — specs/007

Engine-internal entities only. The engine has no database, and nothing here is persisted.

## 1. Reference interval — `ADULT_REFS.RBC` (`rules/refs.js`)

| field | before | after |
|---|---|---|
| `M` | [4.5, 5.9] | unchanged |
| `F` | [4.5, 5.1] | **[4.10, 5.10]** |
| `unit` | `M/µL` | unchanged |
| source comment | — | Henry ch.31 automated adult interval, user-approved 2026-09-22 (Q1 = B) |

Invariants (SC-001): HGB, HCT, MCV, MCH, MCHC, RDW_CV, RDW_SD, RETIC, `RBC.M`, `GERIATRIC_REFS` and `PED_REFS`
dump byte-identical before and after.

## 2. Unit conversions — `SI_CONVERSIONS` (`rules/units.js`)

| key | si pattern | factor | conv | new |
|---|---|---|---|---|
| `HCT` | `^l/l$` | ×100 | `%` | yes (R3) |
| `MCHC` | `^g/l$` | ×0.1 | `g/dL` | yes (R4) |

Unitless-value rule: HCT ≤ 1 and MCHC > 100 → `ungraded` (reason `unit_unknown`) → `unit_unknown_values`.
Unitless HCT > 1 and MCHC ≤ 100 are graded exactly as today.

## 3. Crisis predicate — `anemiaCrisisOwns(e)` (`rules/patterns_utils.js`)

```
HGB_CRISIS_GDL = 7.0                        (unchanged, P8)
HCT_CRISIS_PCT = HGB_CRISIS_GDL * 3         (derived; never a literal)

crisisArm(e) →
  "hgb"  if HGB graded and value < HGB_CRISIS_GDL
  "hct"  if HGB NOT graded
            and (age == null or age >= PED_MAX_AGE)
            and HCT graded and 1 <= value < HCT_CRISIS_PCT
  null   otherwise

anemiaCrisisOwns(e) = crisisArm(e) !== null
```

`crisisArm` is exported so that `severe_anemia_crisis.build` branches on the **same** computation as its `match`
(Clinical Change Constraints: one computation, every sentence derived from it).

## 4. Finding — `severe_anemia_crisis` (existing rule, new branch)

| field | arm `hgb` | arm `hct` |
|---|---|---|
| `urgency` | emergency | emergency |
| `action` | unchanged | **identical string** to arm `hgb` |
| `key_number` | Hb value | Hct value |
| `must_say` | unchanged | Hct value + «هموگلوبین روی این برگه اندازه‌گیری نشده» + "the emergency is inferred from the Hct" + low RBC if printed |

The Persian for the `hct` arm is drafted in the task and shown to the user verbatim before commit.

## 5. Finding — `rbc_indices_implausible` (new rule, `patterns_hematology.js`)

```
MCHC_ARTEFACT_GDL = 36.5    // تأییدِ کاربر ۱۴۰۵/۰۶/۳۱؛ عدد از استخراجِ Gemini از هنری فصل ۳۱

match(e) =
  MCHC graded, abnormal, dir "high", value > MCHC_ARTEFACT_GDL
  and HGB graded and HCT graded
  and not spherocytosisFires(e)
  and not anemiaCrisisOwns(e)
```

| field | value |
|---|---|
| `urgency` | `routine`. It never moves `overall_urgency`; asserted, not argued (R5) |
| `must_say` | MCHC value; the indices do not agree with each other; possible sample or analyser effect (cold agglutinin, lipaemia); names low HCT/RBC if graded low; no disease named |
| `action` | ask the lab / doctor to repeat the CBC on a fresh sample (warmed if the lab chooses) |
| `suggest` | «تکرار CBC», «لام خون محیطی». No B12, folate or iron |
| `sources` | none from `guidelines.js` (user approval, not a guideline) |

## 6. Hand-offs (two-sided, M91e shape)

| rule | stands down when | new |
|---|---|---|
| `low_rbc_hct_without_anemia` | `anemiaCrisisOwns(e)` (only reachable through the `hct` arm, since the `hgb` arm needs low Hb, which already excludes it) | yes |
| `low_rbc_hct_without_anemia` | `rbc_indices_implausible` fires | yes |
| `rbc_indices_implausible` | `spherocytosisFires(e)` or `anemiaCrisisOwns(e)` | yes |
| `spherocytosis_likely` | unchanged; its `match` body moves into `spherocytosisFires(e)` byte-for-byte | refactor |

## 7. New analyte — `RETIC_ABS`

| field | value |
|---|---|
| `NAME_MAP` | `arc`, `reticabs`, `retabs`, `absoluteretic`, `absolutereticulocyte`, `absolutereticulocytes`, `reticulocyteabsolute`, `رتیکولوسیتمطلق` |
| `FA_NAMES` | «شمارشِ مطلقِ رتیکولوسیت» |
| grading | none at any age. Explicit `noRef` (the existing dead `PED_REFS.RETIC_ABS` row is bypassed) |
| unit check | printed `%` → `unmapped` (a mislabelled RETIC %), never RETIC_ABS |
| readers | none; lands on the «تفسیر نشدند» line |
