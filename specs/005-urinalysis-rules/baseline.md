# Baseline & Verification Record — Urinalysis Stage A

Every figure here was produced by running the command named beside it. None was copied from
`CLAUDE.md` or from an earlier session.

## T001 — Test baseline (before any change)

- **Tree**: working tree on `395a5d7` (branch `recovery`), 2026-09-22. The working tree carries
  pre-existing uncommitted changes to `.gitignore`, both `package.json`/`package-lock.json`, and
  untracked `.specify/`, `specs/`, `promptfoo/`, `labmate-bot/` — none under `khanesh-server/rules/`.
- **Command**: `npm test` in `khanesh-server/`
- **Result**: `tests 525 · pass 506 · fail 0 · cancelled 0 · skipped 0 · todo 19`

⚠️ **Read the summary counters, not the "✖ failing tests:" block.** Node's runner lists failing
`todo` tests under that heading (e.g. `⚠ M101 … # P46 — در انتظارِ تأییدِ بازبین`), which looks like a
red baseline at a glance. They are counted as `todo`, not `fail`. The gate is `fail 0`.

## T002 — Rule-id set

- `ids-before.txt`: **121** ids (matches the figure measured by `engine-inventory.mjs` during
  `/speckit-specify`).

## T003 — Pre-fix probe

`probe-before.txt` matches `quickstart.md` §1 line for line:

```
D1 rbc cast misread    → hematuria/this_week
D2 wbc cast misread    → uti_likely/this_week
D2 other spelling      → (nothing)
X1 blood argues        → hematuria/this_week
X2 esterase argues     → (nothing)
```

## T004 — Freeze corpus

`frozen-before.json` — six panels, full finding text, plus a 16-hex sha256 prefix per panel. The
guards pin the hashes inline (the `M125` convention), so the test suite does not depend on this file.

| Panel | Hash | Fires |
|---|---|---|
| F1 urine, blood + RBC 20-30 + protein, no cast | `3e7cffff98ebb543` | `proteinuria_2plus`, `hematuria` |
| F2 ordinary UTI (nitrite+, LE +2, WBC 15-20) | `0c01081d2bd2a9c9` | `uti_likely` |
| F3 CBC only | `4813c62a8307e26b` | `microcytic_ida_likely`, `iron_deficiency` |
| F4 combined CBC + biochem + urine, no cast | `b2d1f1b03a6f0341` | `normocytic_anemia` |
| F5 blood agrees (Blood +2, RBC 20-30) | `79c3b1c3edcc6952` | `hematuria` |
| F7 bacteriuria many, no esterase | `fa883df5ac4f000c` | `bacteriuria_no_inflammation` |

## ⚠️ Deviation found during T004 — a third live defect

The freeze corpus originally had a panel **F6** (`LE +1 · WBC 8-10 /hpf`, the esterase *agrees*
state). It fired **nothing**, where two UTI signals should have fired `uti_likely`. Measured cause:

```
urineCellCount({"Leukocyte Esterase":"+1","Urine WBC":"8-10"}, /wbc|puscell|پوسسل|leukocyt/i) = 1
urineCellCount({"Urine WBC":"8-10","Leukocyte Esterase":"+1"}, /wbc|puscell|پوسسل|leukocyt/i) = 10
urineCellCount({"Leukocyte Esterase":"+2"},                   /wbc|puscell|پوسسل|leukocyt/i) = 2
```

The white-cell *count* lookup's regex includes `leukocyt`, so it matches the leukocyte-*esterase*
**pad** row, reads its grade `+1` as "1 cell/hpf", and returns whichever row comes first. Iranian
sheets print the dipstick section before microscopy, so on the ordinary layout the real WBC count is
never read. Consequences:

1. `uti_pattern` loses its WBC signal: `LE +1 · WBC 8-10` fires nothing.
2. An esterase row with **no** WBC row returns a count (`2`), so US2's planned *not done* arm would
   instead report *argues against* — violating data-model V10.

Same class as the cast misread (a row of one kind consumed by a lookup for another — CLAUDE.md N25),
and a hard prerequisite for US2's correctness (V10, V11). **Folded into Stage A's foundation**: T007
gains guard `M164e`, T010 gains the pad-row exclusion. F6 left the freeze corpus because it is
*supposed* to change; it becomes the red-first guard `M164e` instead.

## T014 — After the foundation (Phase 2)

- **Red-first, observed** (before any engine change, working tree on `395a5d7` + the new guards only):
  `M164`, `M164b`, `M164c`, `M164e` **red**; freeze `M164d` **green**; `node --test rules/engine.test.js`
  → `fail 4` — exactly those four, nothing else.
- **After T009–T013**: all five green. `node --test rules/engine.test.js` → `491 · 472 · 0 fail · 19 todo`.
- **Full suite** (`npm test`): `530 · 511 · 0 fail · 19 todo`. Delta vs T001: **+5 tests, +5 pass** =
  the five `test(...)` calls added, and nothing else moved.
- **Probe after the foundation** — D1/D2 silent is the correct *intermediate* state (US1 adds the
  findings that replace the misread):

```
D1 rbc cast misread    → (nothing)
D2 wbc cast misread    → (nothing)
D2 other spelling      → (nothing)
X1 blood argues        → hematuria/this_week
X2 esterase argues     → (nothing)
```

## After US1 (T029) and US2 (T040)

| Point | `npm test` | Delta | Accounted for by |
|---|---|---|---|
| T001 baseline | `525 · 506 · 0 · 19 todo` | — | — |
| after foundation (T014) | `530 · 511 · 0 · 19 todo` | +5 | `M164`–`M164e` (5 `test()` calls) |
| after US1 (T029) | `540 · 521 · 0 · 19 todo` | +10 | `M165`–`M165g`, `M166`–`M166c` (10) |
| after US2 (T040) | `547 · 528 · 0 · 19 todo` | +7 | `M167`–`M167d`, `M168`–`M168c` (7) |

Total +22 tests, +22 pass: exactly the 22 `test(...)` calls added. Nothing pre-existing moved.

## T041 — Red-first, proved in isolation

**Method**: `git archive HEAD khanesh-server` (HEAD = `395a5d7`, whose `rules/` is the untouched pre-fix
engine) into the scratchpad, `node_modules` junctioned in (`mklink /J`), and **only** the new
`rules/engine.test.js` copied over. `node --test rules/engine.test.js`:

```
tests 508 · pass 470 · fail 19 · todo 19
```

**Red set — exactly the 19 behavioural guards, nothing else:**
`M164`, `M164b`, `M164c`, `M164e`, `M165`, `M165b`, `M165c`, `M165e`, `M165f`, `M165g`, `M166`, `M166b`,
`M166c`, `M167`, `M167b`, `M167d`, `M168`, `M168b`, `M168c`.

- The three **freeze** guards `M164d`, `M165d`, `M167c` are **green** on the pre-fix engine, as required.
- **No pre-existing test is red**: 470 pass = 467 pre-existing non-todo tests + the 3 freezes.
- Matches T041's expected list exactly, with `M164e` added by the recorded deviation above.

## T042 — Rule-id set

`ids-after.txt`: **129** ids. `diff ids-before.txt ids-after.txt` shows exactly eight `>` lines and no
`<` lines — Stage A deletes nothing (`FR-003`):

```
> urine_cast_fatty            > urine_cast_tubular
> urine_cast_granular         > urine_cast_waxy_broad
> urine_cast_hyaline          > urine_cast_wbc
> urine_cast_rbc              > urine_esterase_without_cells
```

## T043 — Probe after the fix (`probe-after.txt`)

| Panel | Before | After | quickstart §3 |
|---|---|---|---|
| D1 rbc cast | `hematuria` | `urine_cast_rbc/this_week` | ✅ |
| D2 wbc cast (`Leukocyte Casts`) | `uti_likely` | `urine_cast_wbc/this_week` | ✅ |
| D2 other spelling (`WBC Casts`) | *(nothing)* | `urine_cast_wbc/this_week` — deep-equal to D2 (`M165b`) | ✅ |
| X1 blood argues | `hematuria`, text claims red cells seen | `hematuria`, text names haemoglobin/myoglobin (`M167`) | ✅ |
| X2 esterase argues | *(nothing)* | `urine_esterase_without_cells/routine` | ✅ |

## T044 — Contract (`contracts/engine-output.md`)

Combined sheet (CBC + ferritin + Mg + creatinine in µmol/L + full urinalysis), with vs without
`RBC Casts 5-8 /lpf`, reproducing exactly the inputs `engineDebug()` reads (it is not exported, and
importing `server.js` boots the server):

| Field | Result |
|---|---|
| `uncovered` | IDENTICAL (`[]` both — weak evidence on its own; the guarantee rests on cast rows never being graded keys) |
| `tests` | IDENTICAL |
| `unitConversions` | IDENTICAL — includes a real `CREAT` µmol/L→mg/dL conversion |
| `has_critical` | IDENTICAL (`false`) |
| `patterns` | gains `urine_cast_rbc` only; `rule_id` is set on the new finding |

## T045–T047 — Records

- **T045** `MEDICAL_RULES.md` § `P50`: three measured defects with before/after text, three thresholds with
  their named constants, four open questions (research's three + "is `0-1` absent for a pathologic cast?",
  found while writing `castAxis`), the design decisions a reviewer must know, the deliberate exclusions, and
  one **pre-existing N8 defect recorded but not fixed** (see below).
- **T046** `CLAUDE.md` Lab Notebook: dated **Recurred** paragraph on **N25** (not a new N26 — N25 already
  names the mechanism). Covers all three defects, why the fix is in the helper, and the `castRows`/`M165g`
  count that makes the skip safe.
- **T047** `CLAUDE.md`: `patterns_urine_casts.js` in § File Structure; § Where a pattern lives re-measured —
  **sixteen** modules (16 `patterns_*.js` imports excluding `patterns_utils`), **129** rules. Also three rows
  added to the baseline table (this run's before, pre-fix-with-new-tests, after).

## T048 — Final gate

- **Tree**: working tree on `395a5d7`, 2026-09-22.
- `npm test`: **`547 · 528 · 0 fail · 0 cancelled · 0 skipped · 19 todo`**.
- Delta vs T001 (`525 · 506`): **+22 tests, +22 pass**. `git diff -U0 -- rules/engine.test.js`: **22** added
  `test(` lines, **0** removed. The delta is fully attributed.
- Files changed under `khanesh-server/rules/`: `adapter.js` (+14), `engine.test.js` (+289), `patterns.js` (+4/−2),
  `patterns_nephrology.js` (+159/−44 — the `utiFires`/`bacteriuriaFires` extraction and three-arm hematuria),
  `patterns_utils.js` (+85), and new `patterns_urine_casts.js`.

## Found during implementation, NOT fixed — for the user's decision

**Pre-existing N8 in `hematuria_pattern` and `bacteriuria_no_inflammation`.** Their `suggest` entries
«تکرار آزمایش ادرار (…)» reach the patient through `phraseSuggestion` as
«درخواست آزمایش **تکرار آزمایش ادرار** (در خانم‌ها بهتر است خارج از دوره قاعدگی) از پزشک» — measured.
Left alone deliberately: the hematuria one sits in the *agrees* arm that freeze guard `M167c` pins
byte-for-byte (FR-004b is this feature's promise that sheets without the new rows are unchanged). Fixing it
is a one-line change plus re-pinning `M167c`'s hash, and is the user's call. All suggestions this feature
added use the «کامل ادرار — تکرار …» shape, which phrases correctly.

## T049 — Review round (code-reviewer + eval-medical-reviewer)

- **Medical review verdict before fixes: FAIL** (4 blocking); the code review reported 8 findings. Everything
  was reproduced before any change was made. #1/B1 and #2 were **regressions this feature introduced**.
- 11 new guards `M169`–`M169k` plus `M167d` changed on purpose. `node --test rules/engine.test.js` after the
  guards and before the fixes: `519 · 488 · fail 12` — exactly those 12, all seen red.
- After the fixes: `node --test rules/engine.test.js` → `519 · 500 · 0 · 19 todo`; **`npm test` → `558 · 539 · 0 fail · 19 todo`**.
  Delta vs T048 (`547`): +11 = the 11 `M169*` `test(` calls. `M167d` was edited in place, not added.
- The reviewers' own panels were re-run on the fixed engine: all fixed. The positive controls
  (`RBC Casts 5-8`, `Granular Casts: Few`) still fire, so the stricter reading didn't silence real findings.
- Full resolution table: `medical_review.md` § Resolution.
