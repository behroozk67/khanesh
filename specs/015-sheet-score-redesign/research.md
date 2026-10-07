# Research: Sheet Score Redesign (015)

All facts below were measured on 2026-10-07, on the working tree (branch `recovery`, `HEAD` `707a8ed` + uncommitted changes), unless marked otherwise.

## R1 — Where the graded range comes from, and whether it can be parsed

- **Decision**: Parse the numeric bounds from `graded[i].range` in `score.js`. Do not add `low`/`high` fields to the graded output.
- **Rationale**: `adapter.js` builds `range` in only two shapes: `` `${lo}–${hi}` `` (en dash, lines 2294, 2464, 2547) and `` `≥ ${lo}` `` (line 2499). The regex `^(-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)$` covers the first shape. The `≥` shape is one-sided, so it takes the FR-003 fallback. Measured: `{"test":"PT","value":14,"range":"11–13.5","mode":"binary","abnormal":true,"dir":"high","level":null}`.
- **Alternatives considered**: Adding numeric `low`/`high` in the adapter. Rejected: `graded` is serialized to the client and fed into the hash-freeze tests (`U10`, `PN02`, …). New fields there would re-baseline freezes for a change that is not clinical.
- **Guard**: a test asserting that every `graded` entry produced by a sweep across `ADULT_REFS` either parses or is one-sided. A third shape appearing later turns it red, instead of silently getting 0.5.

## R2 — Distance formula (clarification Q2)

- **Decision**: `relW = |value − violated bound| / (high − low)`, `p = 1 / (1 + relW²)`. The violated bound is `high` when `dir === "high"` and `low` when `dir === "low"`. `dir` is used, not a comparison, per Principle II.
- **Rationale**: narrow-range keys without a CTCAE level. These are the keys with the largest bound ÷ width ratio:

  | key | range | bound ÷ width |
  |---|---|---|
  | PH | 7.35–7.45 | 74.5 |
  | OSM | 275–295 | 14.8 |
  | CL | 95–103 | 12.9 |
  | MCHC | 32–36 | 9.0 |
  | INR | 0.9–1.1 | 5.5 |
  | PT | 11–13.5 | 5.4 |

  A bound-relative formula scored pH 7.25 at 0.997.
- **Alternatives**: bound-relative (rejected, see the clarification); bound-relative with a per-key exception list (rejected, because a key missing from the list fails silently).

## R3 — Which keys need a system

- **Decision**: one table, `SCORE_TABLE` in `rules/score.js`, mapping each key to `{ system, bucket }`, plus an `EXCLUDED` map from key to reason.
- **Measured**: the union of `ADULT_REFS`, `PED_REFS`, `CLASSIFIERS` and `CTCAE_MAP` is **109 keys**. That count includes six semen keys (`SEMEN_PH`, `SEMEN_VOL`, `SPERM_*`), which go to `EXCLUDED`.
- **Rationale**: a table and a guard (FR-006) is the shape `M32` already uses for `FA_NAMES`. The frontend's `testCategories.js` is a 14-group presentation file and stays that way (spec, clarification Q2 of /speckit-specify).
- **Placement judgment calls** (each is in `data-model.md`; all are open for the reviewer in `P97`):
  - CK and myoglobin → heart (cardiac-panel use). They are mainly muscle markers.
  - Amylase and lipase → liver (digestive). There is no pancreas system.
  - Acid-base (pH, HCO3, lactate, osmolality) → electrolytes & minerals.
  - Vitamin D and PTH → electrolytes & minerals (bone/mineral axis). B12 and folate → blood-forming.
  - Serology titres (Wright, Coombs-Wright, 2ME) and RF → inflammation & immunity. Anti-TPO → metabolic & endocrine (thyroid).

## R4 — Which findings cap which system (deferred from /speckit-clarify)

- **Decision**: for each **shown** finding (`patternOut.findings`; suppressed findings are not in it, `patterns.js:729`) with urgency `soon`, `this_week` or `routine`, the capped keys are the abnormal graded keys `k` for which either:
  - `ruleReads(f.rule_id).has(k)` holds, or
  - `f.uncovered?.includes(k)` holds (the `unexplained_abnormal` net, `patterns.js:606`).

  `unmatched_abnormal` (`patterns.js:496`) has neither, but it fires only when nothing else did, so its keys are every key in `engineOut.abnormal`. Each capped key's system takes `min(cap, URGENCY_CAP[urgency])`.
- **Needs**: a read-only export from `patterns.js`, `export function ruleReads(id)`, which returns a copy of the `RULE_READS` set or an empty set. `runPatterns` output is unchanged, so no freeze moves.
- **Rationale**: `RULE_READS` carries an explicit warning that "a rule read this key" is not "the rule said something about it" (N18). Restricting it to *abnormal* keys narrows it to "a rule whose urgency involves this abnormal value". A wrong attribution here only lowers a score that is already capped by the same urgency elsewhere, and it never touches clinical output (FR-013). The `RULE_READS` comment is updated to name this second, non-clinical consumer.
- **Alternatives**: text-naming (`textNamesTest`). Rejected as the sole signal: N18 measured six false positives on a liver panel. The same table also measured `liver_pattern` naming no keys at all while reading both of them.
- **Monotonicity**: MM1 (`metamorphic.test.js`) guarantees that a worse value never lowers urgency. A lower urgency is a higher cap, so caps are monotone in the value. FR-004 therefore holds end-to-end.

## R5 — Hand calculation for SC-001 (measured inputs, formula from R2)

Panel: Hb 14.5, WBC 6.5, PLT 250, Cr 0.9, ALT 20, AST 22, FBS 90, PT 14, INR 1.2. Male, 40.

- PT: (14 − 13.5) / 2.5 = 0.20, so p = 0.96. INR: 0.1 / 0.2 = 0.5, so p = 0.80. The bucket {PT, INR, APTT} is 0.80, which gives a coagulation score of 80. `coagulation_abnormal` is `this_week` and reads PT/INR, so coagulation is capped to **75**.
- Blood-forming (HGB, WBC, PLT buckets), kidney (CREAT), liver (AST/ALT), metabolic (GLU_F) are each 100.
- Weighted: (100 + 100 + 0.8·100 + 100 + 0.8·75) / (1 + 1 + 0.8 + 1 + 0.8) = 440 / 4.6 = **95.7**. The worst system is 75, plus 30 gives 105. The total is **96**.

## R6 — Frontend consumers

`ResultDashboard.jsx`:

- `systemScore()` (lines 170–177) and its critical-40 cap become dead and are deleted.
- `RadarCard` (594–670) reads `s.score`, `s.title` and `s.state` from display groups. It will instead read `score.systems`. A click on a radar system focuses a derived group whose rows are `all.filter(r => sys.keys.includes(r.key))`.
- `NO_SCORE_FA` (222) gains `one_system`.
- `history` is never passed by any caller (grep `history=` in `khanesh/src` returns nothing). So mixing old-formula and new-formula scores in a trend cannot happen today. The `score.version: 2` field is added anyway, so a future trend can refuse to mix versions.

## R7 — Tests that pin the old behaviour

`rules/score.test.js` holds 9 tests. Two of them assert retired behaviour and change on purpose (FR-020):

- «خارجِ بی‌درجه ۰٫۵» (`testPoints` → 0.5).
- «امتیاز هرگز از سقفِ فوریتش بیشتر نیست (همهٔ سطح‌ها)», which tests the whole-sheet cap for non-emergency levels.

The other seven stay. Their `N()` fixture has no `range`, so they take the FR-003 fallback path. They will be given ranges where the assertion depends on distance. `api-contract.test.js` and `engine.test.js` reference `score`; their exact assertions are checked during implementation.
