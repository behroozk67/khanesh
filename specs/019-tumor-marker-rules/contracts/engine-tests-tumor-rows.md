# Contract: tumour-marker rows in `_engine.tests` (as built, 2026-11-08)

Scope: additive extension of the `_engine.tests[]` shape in `.claude/rules/frontend.md`. (`specs/001-health-app-upgrade/contracts/engine-result.md`, named in the request, does not exist; this file and `specs/016-expert-view/contracts/expert-output.md` are the written references.)

## Compatibility rule

No existing field changes meaning. Rows are appended after graded rows and urine rows. A client that ignores `verdict`/`source` still gets a well-formed row. **A client that maps a falsy `abnormal` to «در محدوده» would show a no-verdict row as normal** — the client change below ships in the same commit.

## Row

```
{ key, name, value, unit, range, refSource: "printed",
  abnormal: true | false | null, dir: "high" | "low" | null,
  fa, level: null, ctcaeGrade: null, nearLimit: false,
  source: "tumor_marker_printed",
  verdict: "above" | "below" | "within" | "between" | "noref" | "unreadable" }
```

`value` is the number, or the printed string for a censored value («<0.5»). `range` is the printed range text of that row, or `null`. `name` is `faName(key)` (the engine's established display name; «CEA» and «CA 125» are the names Persian readers use) — never the raw key `CA125`.

| verdict | abnormal | dir | fa (server-written, shown verbatim in the report) |
|---|---|---|---|
| above | true | high | بالاتر از محدودهٔ چاپ‌شده |
| below | true | low | پایین‌تر از محدودهٔ چاپ‌شده |
| within | false | null | داخلِ محدودهٔ چاپ‌شده |
| between | null | null | بین حدِ غیرسیگاری و حدِ سیگاری — بسته به سیگاری بودن |
| noref | null | null | محدودهٔ مرجع روی برگه چاپ نشده |
| unreadable | null | null | محدودهٔ چاپ‌شده خوانده نشد |

`unreadable` is **derived**, not stored: the engine's `ungraded[key].state` is `noref` for both «no range printed» and «range printed but unreadable»; the row builder (and `lineOf`) tell them apart by whether `reference` is non-empty (the P114 convention). `between` *is* a stored `ungraded` state (new).

## Client obligations (implemented)

1. `resultStates.stateOf`: `abnormal === null` or `verdict ∈ {noref, unreadable, between}` ⇒ new state `norange` («بدون محدوده مرجع», dashed neutral) **before** the `!t.abnormal` branch; `countRows` reports `noRange` separately (not in «در محدوده»); `Scorecard` no longer says «همه داخل محدودهٔ مرجع بودند» when no-range rows exist.
2. `resultModel.normTest`: a no-verdict row is not re-derived from the range text (no gauge, no guessed direction); label comes from `fa`.
3. Rows with `source === "tumor_marker_printed"` never enter `emergencyKeys`.
4. History (`historyRoutes.observationsFromResult`): `abnormal === null` rows and all `tumor_marker_printed` rows are not recorded (assays are not interchangeable across labs; history does not know the assay).
5. Expert view (`expert.js` `ungradedRow`): same `fa` and printed range as the simple view instead of «بدون حکم».

## Invariants (tests)

- `has_critical === false` and urgency ≠ `emergency` for every tumour-marker verdict (TM7).
- Score value/band/`unread`/`total` and PhenoAge identical with and without tumour markers (TMM7); markers are never in `graded`.
- A sheet with only tumour markers takes the engine path (T64c).
