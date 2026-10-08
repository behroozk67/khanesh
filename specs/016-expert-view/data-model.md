# Data Model: Expert View (specs/016)

All entities are built on the server by `buildExpertView(engineOut, patternOut, score)` and serialized as `_engine.expert`. Nothing here is stored. The frontend renders it and computes nothing clinical.

## ExpertView (root)

| Field | Type | Rule |
|---|---|---|
| `version` | `1` | bump on any breaking change |
| `findings` | `ExpertFinding[]` | the shown findings, in the order `runPatterns` returned them |
| `hidden` | `HiddenFinding[]` | findings demoted under a blocker and not shown as supplementary |
| `recommendations` | `string[]` | the simple view's list (`buildEngineRecommendations`): one final action, then content, tests, warnings |
| `suggested` | `string[]` | sheet-level suggested tests, de-duplicated, none already measured, `forbid`-filtered |
| `tests` | `TestRow[]` | every graded test (abnormal first), plus ungraded rows as «بدون حکم» |
| `indices` | `DerivedValue[]` | computed values, each labelled and explained |
| `score` | `ScoreBreakdown \| null` | read-only copy of the P97 output |
| `urgency` | `string` | `patternOut.overall_urgency`, unchanged |

## ExpertFinding

| Field | Type | Rule |
|---|---|---|
| `label` | `string` | the finding's `headline`; never a rule id |
| `urgency` | `emergency\|soon\|this_week\|routine` | unchanged from the finding |
| `urgency_fa` | `string` | the Persian label already used by the prompt (`URGENCY_FA`) |
| `supplementary` | `boolean` | true for «یافتهٔ تکمیلی» |
| `briefed` | `boolean` | true when the patient saw the short form under a blocker |
| `triggers` | `TestRow[]` | attributed abnormal tests (R3) |
| `context` | `TestRow[]` | attributed in-range tests the finding speaks about |
| `warnings` | `string[]` | the finding's `warnings`, verbatim |
| `suggest` | `string[]` | bare test names, filtered by `alreadyMeasured` |
| `sources` | `Source[]` | from `RULE_SOURCES` + `f.sources`, through `sourceList` (paywall substitution) |
| `no_source` | `boolean` | true when `sources` is empty; the UI says so, never invents one |
| `pro` | `ProBlock \| null` | from the rule object, when present |

## HiddenFinding

`label`, `urgency`, `urgency_fa`, `triggers`, `sources`, `no_source`. **No `action`, no `warnings`, no `pro`** (FR-016, clarification Q2).

## TestRow

| Field | Type | Rule |
|---|---|---|
| `name` | `string` | `faName(key)`; the key itself is never serialized |
| `printed` | `{ value, unit } \| null` | as on the sheet, **only** when the engine kept it and `derived_from` says why it differs; `unit` is null unless the sheet printed it |
| `unit_assumed` | `string` (optional) | the unit the engine inferred when the sheet printed none |
| `graded` | `{ value, unit }` | what the engine graded |
| `derived_from` | `unit_conversion` \| `albumin_correction` \| `glucose_correction` \| `unit_conversion_and_albumin_correction` \| `unit_conversion_and_glucose_correction` \| `percent_of_wbc` \| `null` | why `graded` differs from `printed` |
| `engine_range` | `string \| null` | the range the engine used |
| `printed_range` | `string \| null` | from `printedRanges`, when the sheet printed one |
| `range_source` | `string \| null` | `refSource` (Henry, RCPCH, geriatric, …) |
| `status_fa` | `string` | the engine's own Persian verdict (`fa`); «بدون حکم» for ungraded rows |
| `level` | `string \| null` | the engine level (`mild`…`critical`) |
| `ctcae_grade` | `number \| null` | only when the engine graded with CTCAE |
| `grading_source` | `string \| null` | `source` from grading |

Rule: `printed` is non-null only together with `derived_from`; otherwise the expert view does not claim a sheet value (N5, review fix: WBC 7000 was shown as «7 K/µL روی برگه»).

## DerivedValue

`label` (Persian), `value`, `unit`, `method_fa` (fixed sentence from R6), `inputs` (Persian names of the tests used). Only indices the engine actually produced appear.

## ScoreBreakdown

`value`, `band`, `reason`, and per system: `fa`, `score`, `cap`, `capped`, `keys` → Persian names, `worst` → Persian name. Copied from `healthScore()` output; no field is recomputed (FR-020).

## ProBlock (on the rule object, not the finding)

| Field | Type | Rule |
|---|---|---|
| `cautions` | `string[]` | interferences, populations where the rule does not hold |
| `differential` | `string[]` | what else the same pattern can mean |
| `workup` | `string[]` | next steps a clinician would consider |
| `sources` | `string[]` | ids in `guidelines.js` |

Validation (tests in `rules/expert.test.js`): Persian; no mojibake; no raw engine key; no outpatient wording; any digit run also appears in the rule's own code; every source id exists; at least one of the three lists non-empty.

## ViewMode (frontend only)

`"simple" | "expert"`, stored under `azmayar_view_mode_v1`, default `"simple"`, read/write in try/catch.
