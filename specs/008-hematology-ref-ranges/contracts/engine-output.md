# Contract — what changes in `/api/analyze` for specs/008

No route, field or type is added or removed. `Tafsir.jsx` / `ResultView.jsx` need **no change**. Only these values change.

| field | change | consumer impact |
|---|---|---|
| `_engine.tests[]` (HGB) | `range` / `abnormal` / `dir` / `fa` follow the age-band table; `refSource` is the approval label instead of `Henry A5` / `Geriatric Override` | the existing render |
| `_engine.tests[]` (IRON, FERRITIN) | new ranges; a woman ≥ 50 has ferritin 30–300 | none |
| `_engine.tests[]` | new graded keys `HBA2`, `HBF`, with `name` from `faName()` | rendered like any test. `testCategories.js` has no row for them, so they appear in the uncategorised group. Checked, not changed. |
| `_engine.patterns[]` | new id `hba2_elevated`; anaemia ids (`normocytic_anemia`, …) appear or disappear at the moved band edges; `iron_deficiency` fires for F ≥ 50 with ferritin 15–29 | none |
| `_engine.urgency` / `has_critical` | may drop from `this_week` to `none` (e.g. M 30 with Hb 13.8) or rise from `none` to `this_week` (e.g. F 80 with Hb 11.0). `has_critical` is unaffected: the crisis is unchanged. | none |
| `_engine.uncovered[]` | `HBA2` is covered when a finding names it; HbA2 < 1.5 and HbF > 2 appear here | the «نیازمند بررسی» chip is decided per key, as today |
| `ocr_warnings` («تفسیر نشدند») | may list the Persian names of HBA/HBS/HBC/HBE/ZPP/STFR/EPO (noRef), or a printed «HbS»/«Hb S» row (unmapped) that was silently in `qual` | none |
| `general_recommendations` | «الکتروفورز هموگلوبین» is no longer suggested when HbA2 is on the sheet | none |

The response shape is unchanged, so `api-contract.test.js` must stay green. `M32` (every ranged key is in `FA_NAMES`)
covers `HBA2` and `HBF`.
