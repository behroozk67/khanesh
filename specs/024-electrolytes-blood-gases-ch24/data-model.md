# Data Model: specs/024

No storage or API shape changes. Two engine-internal additions.

## SWEAT_CL (new engine key)

| Field | Value |
|---|---|
| Key | `SWEAT_CL` |
| `NAME_MAP` spellings (normalised) | `sweatchloride`, `sweatcl`, `chloridesweat`, `sweatchlorideconcentration`, `کلریدعرق`, `کلرعرق` |
| Not mapped | `sweatconductivity` (different test), plain `cl`/`chloride`/«کلر» (serum `CL`, unchanged) |
| `refs.js` | none (no blood range applies) |
| Channel | `UNIT_KEPT` ⇒ `e.ungraded.SWEAT_CL = { value, unit, reason: "no_range" }` |
| `FA_NAMES` | `SWEAT_CL: "کلرید عرق"` |
| Score | outside the score. The probe showed a regression (normal sweat chloride: 98 «high» → 90 «mid»), so `score.js` exempts `SWEAT_CL` and `sweat_chloride_result` when the rule read the value (`explains`); a unitless row still counts as «خوانده‌نشده» (CH24-6) |

### Validation and states (FR-005, FR-006)

```
unit ∉ {mmol/L, mEq/L} or value not numeric   → state "unread"      (no verdict)
age known and < 14 days                        → state "too_young"   (no verdict)
value ≤ 29                                     → "unlikely"
29 < value ≤ 59                                → "intermediate"  (29.5 goes up: bands are written as integers, over-read is the safer error)
59 < value ≤ 160                               → "consistent"
value > 160                                    → "implausible"
```

Age unknown is not "too young": the bands apply (the ordinary sweat-test patient is a child with a profile age).

## pseudohyponatremia_lipid_protein (new pre-analytical caveat)

| Field | Value |
|---|---|
| File | `rules/preanalytical.js`, appended to `PREANALYTICAL_RULES` |
| `attachTo` | `['sodium_critical']` |
| Inputs | graded `NA` (dir, value), graded `TG`, graded `TP`, `e.indices.na_correction_applied` |
| Fires when | `NA.dir === "low"` AND `NA.value > 120` (owner's emergency edge, D2) AND not glucose-corrected AND (`TG.value ≥ TG_CUT` OR `TP.value ≥ TP_CUT`) |
| Never | changes urgency, `blocks_others`, `key_number`, headline, score |
| Cut-offs | D1 (user decision): recommended `TG_CUT = 1000` mg/dL, `TP_CUT = 10` g/dL, compared in the engine's graded unit (TG mmol/L is already converted with a printed unit, G1f) |

Absent TG and TP ⇒ the caveat does not fire (constitution II: an absent test is not evidence).
