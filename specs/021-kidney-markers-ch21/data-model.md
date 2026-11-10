# Data Model: specs/021

These are engine-internal shapes. No database change.

## ACR graded row (`engineOut.graded[]`, `_engine.tests[]`)

| field | today | after (printed in mg/mmol) | after (mg/g, µg/mg, none) |
|---|---|---|---|
| `value` | mg/g (v × 8.84) | unchanged (mg/g) | unchanged |
| `range` | `0–30` | `0–26.5` (3 mg/mmol in mg/g) | `0–30` |
| `tag` | mg/g band | the mg/mmol band (A1 < 3, A2 3–30, A3 > 30), always ≥ the mg/g band | unchanged |
| `abnormal`, `fa`, `patient` | from the band | from the winning band (`CLASSIFIERS.ACR`) | unchanged |
| `printed` | — | `{ value: v, unit: "mg/mmol" }` | absent |

Invariant: for any printed mg/mmol value, the tag rank is ≥ the rank it gets today.

## `unitConversions[]`

A new entry for a mg/mmol ACR: `{ test: "ACR", raw: v, from: "mg/mmol", value: v×8.84, to: "mg/g", basis: "printed" }`. It is rendered by the existing `UnitConversions` card, which uses `name` via `faName`.

## `UPCR` (new engine key)

- Comes from `NAME_MAP` only, from the explicit spellings in research R4.
- No reference. It goes to `noRef` and is never in `graded`.
- `FA_NAMES.UPCR` is required (M32).

## Findings

| id | change |
|---|---|
| `albuminuria_pattern` | quotes `printed.value` and «میلی‌گرم بر میلی‌مول» with the mg/mmol band when `printed` exists. `key_number` is the printed value. |
| `kidney`, `glomerulonephritis_pattern`, `rhabdomyolysis_pattern` | append `ureaAlongside(e)` to `must_say` and `brief` (non-dialysis; empty when `urea_bun_emergency` matches) |
| `uric_acid_low` (**new**) | `routine` urgency, `RULE_GROUP.kidney`, same age gate as `hyperuricemia`. |
| `urea_low` | one pregnancy sentence when `pregnant === true`. |
