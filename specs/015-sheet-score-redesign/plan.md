# Implementation Plan: Redesign of the Sheet Score («امتیازِ این برگه»)

**Branch**: `015-sheet-score-redesign` (spec directory; work on branch `recovery`) | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-sheet-score-redesign/spec.md`

## Summary

Replace the fixed 0.5 for level-less out-of-range tests with a continuous distance score, measured in range-widths and floored by the engine's CTCAE level. Collapse correlated rows into buckets. Score eight organ systems server-side. Build a weighted total bounded by the worst system + 30. Apply non-emergency urgency caps per system (from the keys each shown finding reads) instead of to the whole sheet. Expose all of it as `_engine.score` v2. On the frontend, delete the parallel `systemScore()` formula and show a plain count line before the number. No clinical rule, range or urgency changes (research R1–R7).

## Technical Context

**Language/Version**: Node.js (ESM), the same runtime as `khanesh-server`; React 19 + Vite 8 for `khanesh`

**Primary Dependencies**: none new. `score.js` imports `refs.js` (`isNeonate`), `names.js` (`faName`), and a new read-only `ruleReads()` export from `patterns.js`

**Storage**: N/A (pure function per response)

**Testing**: `node:test`, in `khanesh-server/rules/score.test.js`; the full `npm test`; `npm run lint` + `npm run build` in `khanesh/`

**Target Platform**: Express backend + browser SPA

**Project Type**: web application (two independent sub-projects)

**Performance Goals**: negligible. One pass over ≤ ~150 graded rows and ≤ ~40 findings per request

**Constraints**: no change to `runEngine`/`runPatterns` output (freeze hashes stay put); no Persian through PowerShell cmdlets (Principle V)

**Scale/Scope**: 109 keys in the scoring table; 3 backend files, 1 frontend file, 2 docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Engine decides | ✅ | The score only reads `graded`/`level`/findings. FR-013: it never reaches the prompt, urgency, `has_critical` or the graph. No severity word is derived from distance (clarification Q1). |
| II. Missing ≠ normal | ✅ | Systems without data are `null`, never 100. `unknown`/ungraded/`noRef` rows are not scored. A total over < 2 systems is withheld (`one_system`). Direction comes from `graded.dir`, not from a comparison (R2). |
| III. Measure, never quote | ✅ | Every figure in research.md is from a command run 2026-10-07 on a named tree. The 109-key count is checked by a test, not stated. |
| IV. Red first | ✅ (gate on implement) | Each new test is run against the stashed pre-change `score.js`/`patterns.js`. Two old tests change on purpose, with comments (R7). No rule id changes. |
| V. Persian | ✅ | All new strings are listed verbatim in contracts/score-output.md. Names go through `faName()`. Edits use Write/Edit only. |
| Clinical constraints: a number needs a source or a P-entry | ✅ | Every constant is registered in `MEDICAL_RULES.md` P97 as "proposed, unvalidated". None of them gates a clinical output. |
| One number, one job | ✅ | Reference ranges are reused only as geometry for a display score. No range or threshold is edited. |

Post-design re-check: ✅. One borderline item is documented under Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/015-sheet-score-redesign/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R7
├── data-model.md        # score / bucket / system tables (109 keys)
├── quickstart.md        # validation run
├── contracts/
│   └── score-output.md  # _engine.score v2 shape, invariants, Persian strings
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
khanesh-server/
├── rules/
│   ├── score.js          # rewrite: testPoints (R2), SCORE_TABLE/EXCLUDED (data-model), systems, caps (R4), healthScore v2
│   ├── score.test.js     # extend: SC-001, emergency, buckets, coverage, 109-key guard, metamorphic, pH; 2 tests changed on purpose
│   └── patterns.js       # + export ruleReads(id), read-only; RULE_READS comment names the second consumer
└── server.js             # healthScore(engineOut, patternOut) — one call site (line ~230)

khanesh/src/
└── ResultDashboard.jsx   # delete systemScore(); radar/legend from score.systems; count line; label; NO_SCORE_FA.one_system

MEDICAL_RULES.md          # P97: rewrite "what it does", list every constant + open questions (coag urgency, placements)
CLAUDE.md                 # Lab Notebook entry: fixed 0.5 + whole-sheet cap; bound- vs width-relative distance
```

**Structure Decision**: The existing two-project layout. The scoring table lives next to `score.js`, server-side, so the radar and the total share one source. `khanesh/src/testCategories.js` stays a 14-group presentation file for the test list.

## Implementation Order (each step has its verify command)

1. **Tests first** (`score.test.js`): add the new tests, then confirm they are red on the current code. Verify: `node --test rules/score.test.js` shows the expected red count.
2. **`patterns.js`**: add the `ruleReads` export. Verify: `node --test rules/engine.test.js rules/metamorphic.test.js` is unchanged.
3. **`score.js`**: rewrite. Verify: `node --test rules/score.test.js` is all green, and the quickstart §2 probe gives the expected values.
4. **`server.js`**: switch to the new signature. Verify: `npm test` shows fail 0, with the number measured on this tree.
5. **`ResultDashboard.jsx`**. Verify: `npm run lint && npm run build`; a grep shows no `systemScore`; a browser check per quickstart §4.
6. **Docs**: `MEDICAL_RULES.md` P97 and the `CLAUDE.md` notebook entry. Verify: read them back for Persian encoding (the `M37` scan covers only `rules/`, so check by eye).

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| `RULE_READS` gets a second, non-clinical consumer (per-system caps) | caps have to land on the system the finding is about (FR-011) | Text-naming alone had 6 false positives on a liver panel (N18). A whole-sheet cap is the reported defect. A wrong attribution can only lower an already-capped score and never touches clinical output. |
