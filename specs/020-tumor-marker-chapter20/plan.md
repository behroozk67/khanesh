# Implementation Plan: Tumour-Marker Rules from Reference Chapter 20

**Branch**: `020-tumor-marker-chapter20` (spec directory only) | **Date**: 2026-11-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/020-tumor-marker-chapter20/spec.md`

## Summary

Option C (Clarifications 2026-11-10): code changes are mechanical only, and the chapter's clinical content goes into
the register.

- **Code** (one commit, P132):
  - Route the seven tumour-marker keys that already exist (`AFP, B2M, CALCITONIN, CGA, PSA_TOTAL, PSA_FREE, PSA_RATIO`)
    through the specs/019 printed-range reader. This gives them rows in `_engine.tests` and removes them from the score.
  - Extend the score exemption to `psa_result`.
  - Add a sentence for PSA on a female profile. It is additive and does not replace the verdict.
- **Measured side effects** ([research.md](research.md) R2):
  - fixes a live inverted Free-PSA-ratio verdict;
  - flips two boundary values (PSA 4.0 / AFP 7.0 against a strict «<») to above, which raises urgency to `this_week`;
  - gives age-banded PSA an `unreadable` row (the text was already «خوانده نشد»; corrected after measurement);
  - removes PSA from the score (a normal PSA had cut 98 «high» to 90 «mid»).
- **Register**: P132 in `MEDICAL_RULES.md`. `MEDICAL_RULES_TUMOR_MARKERS.md` §6 gets the 40 extracted rules, the source
  contradictions and the R5 gap table, all marked "secondary, unverified" until the raw chapter text arrives.

**Scope change from the spec, stated plainly**: FR-007 is narrowed to PSA in a female profile and made additive.
CA 125 in a male profile goes to the register. Reason: R4 (Principle II, and CA 125 has legitimate uses in men).
The spec is amended to match.

## Technical Context

- **Language/Version**: Node.js 26.5 (ESM), backend only.
- **Primary Dependencies**: none new.
- **Storage**: N/A.
- **Testing**: `node --test` (`npm test` in `khanesh-server/`). New tests go in `rules/tumor_markers.test.js`; the
  free-PSA bug goes in `rules/engine.test.js`, one test per real fixed bug.
- **Target Platform**: Express server, unchanged.
- **Project Type**: web service (rules engine module).
- **Performance Goals**: N/A (string parsing per row).
- **Constraints**:
  - no chapter threshold in code (FR-009);
  - no frontend change;
  - prenatal AFP/hCG untouched (FR-008);
  - suite fail count must equal the R0 baseline (1, T15e).
- **Scale/Scope**:
  - 7 keys;
  - about 4 files: `tumor_markers.js`, `score.js`, `patterns_autoimmune.js`, the tests;
  - 2 register files.

## Constitution Check

| Principle | Status |
|---|---|
| I. Engine decides | ✅ No prompt or model change. The verdict is computed by the engine against the printed range. |
| II. Missing ≠ normal | ✅ `abnormal:null` for `noref/unreadable/between`. The FR-007 flag is additive, because "instead of graded" would have hidden an above-range value (spec amended). |
| III. Measure, never quote | ✅ R0 baseline and R2 probe were measured on a named tree. The after-state is measured in tasks. |
| IV. Test fails first | ⚠️ Gate: every Q1–Q10 test must be run against the pre-change tree and seen red. Q5/Q7 are negative controls that must pass on both trees; their red version is the filtered-out implementation. No rule-id is deleted, but the id set is diffed anyway. |
| V. Persian | ✅ One new patient sentence (R4), shown verbatim for review. All writes go through the Write/Edit tools. No raw key reaches text (`faName`). |
| Clinical change constraints | ⚠️ The urgency flips and the score exclusion are reviewer items. They are recorded under P132 "در انتظار بازبینی" in the same commit (N37). They follow the already-recorded P122 strictness rule, and no new threshold is introduced. The rest of the chapter's numbers stay in the register. |
| One owner per analyte | ✅ `tmBuild` owns AFP/B2M/CALCITONIN/CGA, and `psaBuild` owns PSA_*. Both are unchanged. The swap does not move ownership. |

**Gate result**: PASS. There are no unjustified violations; the two ⚠️ rows are process gates for the tasks.

**Post-design re-check**: PASS. The data model adds one optional field. Contract v2 is backward compatible.

## Project Structure

### Documentation (this feature)

```text
specs/020-tumor-marker-chapter20/
├── spec.md
├── plan.md                                  # this file
├── research.md                              # R0–R6
├── data-model.md
├── quickstart.md                            # Q1–Q10 validation scenarios
├── contracts/engine-tests-tumor-rows-v2.md
├── checklists/requirements.md
└── tasks.md                                 # /speckit-tasks (not yet)
```

### Source Code

```text
khanesh-server/rules/
├── tumor_markers.js         # TM_KEYS += 7 keys; tumorMarkerRows adds sexMismatch
├── serology.js              # no edit expected (assayRoute already branches on TM_KEYS); verify
├── score.js                 # exempt psa_result like tumor_markers_result
├── patterns_autoimmune.js   # psaBuild: R4 sentence when context sex is female
├── tumor_markers.test.js    # Q2–Q10
└── engine.test.js           # Q1 (the real fixed bug), Persian comment
MEDICAL_RULES.md             # P132 (allocated before code)
MEDICAL_RULES_TUMOR_MARKERS.md  # §6 chapter-20 register
CLAUDE.md                    # Lab Notebook: free-PSA inversion entry
```

**Structure Decision**: backend rules module only. This is the same layout as specs/019.

## Open items carried into tasks

1. **Raw chapter text, book title and edition**: needed for FR-001/SC-001. Until they arrive, those requirements are
   reported as not started.
2. **Source of `context.sex`**: check whether it is profile-first or sheet-first (R4), and avoid duplicating the
   sheet/profile conflict sentence that `server.js` already writes.
3. **Real-sheet age-banded PSA ranges and censored values («<0.01»)**: probe them before closing.
4. **T15e**: pre-existing failure, not in scope. Name it in the report.
5. **P106 is decoupled from the score.** PSA ≥ 20 with no printed range stays `this_week` (a user decision of
   2026-10-13). Once `psa_result` is exempt, it no longer lowers the score. P132 names this explicitly as a reviewer
   item.
6. **Checked at planning, no change needed**:
   - `faName` resolves all 7 keys to Persian.
   - The frontend groups unknown keys under `other` (`testCategories.js` `MAP[key] ?? "other"`), the same as the
     specs/019 keys.
   - `resultStates.js` already excludes `source:"tumor_marker_printed"` from the abnormal count.
   - History skips `abnormal === null` (`historyRoutes.js:55`).
   - `expert.ungradedRow` reads `tmDisplay`, so there is one row per key and no duplicate.

   Lint is not required.
7. **The `engine.test.js` real-bug test is ratio 18 against «> 25»** (an under-read). Measure its exact current
   text in the task-0 snapshot before writing the Lab Notebook entry.

## Complexity Tracking

No violations requiring justification.
