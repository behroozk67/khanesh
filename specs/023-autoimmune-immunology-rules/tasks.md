---
description: "Task list for specs/023 autoimmune disease rules"
---

# Tasks: Autoimmune Disease Rules (user's Google Drive guide)

**Input**: Design documents from `specs/023-autoimmune-immunology-rules/` (spec.md, plan.md, research.md, data-model.md, quickstart.md).

**Tests**: These are required. FR-019 asks for one regression test per fixed bug or new reader, and each must fail on b7eb497.

**Paths**: All are relative to the repo root. Backend files are under `khanesh-server/rules/`.

## Phase 1: Setup

- [X] T001 Write `specs/023-autoimmune-immunology-rules/snapshots/probe_023.mjs`. It covers the new panels from quickstart step 1:
  - celiac for ages 6 and 35;
  - IgA deficiency;
  - IgA absent;
  - tTG borderline;
  - liver antibodies with and without ALT/ALP;
  - MG positive and negative;
  - Anti-DNase B at ages 3, 10 and 30, with and without a range;
  - aCL IgG at 30/45/85 and IgA alone;
  - immunoglobulins at ages 2 and 35;
  - the collision rows `IgG4`, `IgG index`, `SMA`, `Thyroglobulin`, `Anti-Tg`, `H. pylori IgA`.

  Run it on the current tree and append the output to `snapshots/before.txt`.
- [X] T002 Create `khanesh-server/rules/autoimmune3.test.js` with the shared helpers (`run(tests, patient)`, `f(id)`), following `autoimmune2.test.js`.

## Phase 2: Foundational (blocks US2–US6)

- [X] T003 In `khanesh-server/rules/serology.js`, add the new `AI_RE` entries and widenings from data-model.md.
  - Extend `AI_RANGE_ONLY` with CH50, IGG, IGA_TOTAL, IGM and IGE.
  - Exclude `IGG/IGA_TOTAL/IGM/IGE/CH50` from word-only verdicts.
  - In `readAutoValue`, add bare-titre handling for ASMA, ANTI_LKM1 and AMA (≥ 1:40 positive, `LIVER_AB_TITRE_CUT`), alongside the ANA case.
- [X] T004 Check that `adapter.js` reaches `routeSerology` for the new names before any `NAME_MAP` or unmapped decision. Add gating if needed, for example an exclusion list.
- [X] T005 [P] Add `FA_NAMES` for every new key in `khanesh-server/rules/names.js`.
- [X] T006 [P] Add the new rule ids to the `immune` group in `khanesh-server/rules/groups.js`.
- [X] T007 [P] In `khanesh-server/rules/patterns.js`, add the new `SUGGEST_TESTS` strings, mapped to keys or `_REFERRAL_*` placeholders.

## Phase 3: US1, TPO and RF follow the printed range (P1) 🎯 MVP

**Independent test**: TPO 20 «<30» is not high; RF 18 «<15» is high, with `rf_positive`. With no printed range, nothing changes.

- [X] T008 [US1] In `khanesh-server/rules/autoimmune3.test.js`, add tests:
  - TPO 20 «<30» is not abnormal;
  - TPO 250 «<30» is high and the text contains 250;
  - RF 18 «<15» is high and `rf_positive` fires;
  - RF 12 «<15» is normal;
  - TPO 20 with no range is unchanged (high against 0–9).
- [X] T009 [US1] Add `PRINTED_FIRST_KEYS` to the `printedOwn` branch in `khanesh-server/rules/adapter.js`.
- [X] T010 [US1] Make the TPO sentence in `thyroid` quote the value and range, in `khanesh-server/rules/patterns_endocrine_rheum.js`.
- [X] T011 [US1] Run the boundary panel (limit − ε, limit, limit + ε) across `thyroid`, `hypothyroid_dyslipidemia_link`, `rf_positive`, `anti_ccp_result` and `score`. Record any moved output.

## Phase 4: US2, celiac (P1)

**Independent test**: Acceptance scenarios US2-1 to US2-7.

- [X] T012 [US2] Add tests for each US2 acceptance scenario (child and adult) and for the IGA_TOTAL ownership hand-off (two-sided) in `autoimmune3.test.js`.
- [X] T013 [US2] Implement `celiacBuild` and rule `celiac_serology_result` in `khanesh-server/rules/patterns_autoimmune.js`, following D4.

## Phase 5: US3, autoimmune liver and MG (P2)

- [X] T014 [US3] Add tests for US3-1 to US3-6 in `autoimmune3.test.js`.
- [X] T015 [US3] Implement `liver_autoantibody_result`, following D5, with ALT/AST/ALP/IGG three-way sentences.
- [X] T016 [US3] Implement `mg_antibody_result` in `patterns_autoimmune.js`, following D6.

## Phase 6: US4, spellings and secondary antibodies (P2)

- [X] T017 [US4] Add tests in `autoimmune3.test.js`:
  - `ANA (IIF)` equals `ANA`;
  - `FANA`;
  - CLIFT;
  - `Anti-Centromere B`;
  - Histone;
  - aCL-IgA alone is `routine`;
  - Anti-DNase B at 3 ages;
  - CH50 low with C3/C4 normal.
- [X] T018 [US4] Add the histone line to `anaBuild`. Add ACL_IGA to `aplBuild`, with the IgA-only routine rule. Add CH50 to `complementBuild`, with the inherited-deficiency sentence. All three are in `patterns_autoimmune.js`.
- [X] T019 [US4] Implement `dnaseb_result`, following D8.

## Phase 7: US5, APS bands (P3)

- [X] T020 [US5] Add tests in `autoimmune3.test.js`: aCL IgG at 30/45/85 gives three distinct band sentences and urgency `this_week` for all three. Add the LA anticoagulant-drug sentence test.
- [X] T021 [US5] Add band sentences and the LA drug note in `aplBuild`, following D9.

## Phase 8: US6, immunoglobulins (P3)

- [X] T022 [US6] Add tests in `autoimmune3.test.js`:
  - IgG 150 is low and routine;
  - IgE 900 is high;
  - a 2-year-old with low IgG gets the age sentence;
  - the collision rows keep their old outcome.
- [X] T023 [US6] Implement `immunoglobulin_result` in `patterns_autoimmune.js`, following D7.

## Phase 9: Polish

- [X] T024 Run `npm test` in `khanesh-server/`. Fix or explain every red result. No `ALLOWED_DROPS` addition is allowed.
- [X] T025 Prove that `autoimmune3.test.js` fails on the b7eb497 archive (quickstart step 3).
- [X] T026 Generate `snapshots/after.txt` and check SC-001 to SC-003 against it.
- [X] T027 Write the `MEDICAL_RULES.md` P136 entry (the decisions, every constant, the verbatim new sentences, and the reviewer questions) and CLAUDE.md N55 (G1). Update the `.claude/rules/` docs if needed.
- [X] T028 Commit; the pre-commit hook must pass.

## Dependencies

- T003–T007 block every story.
- US1 is independent of T003, because it touches only adapter and thyroid.
- US2–US6 each depend on T003–T007 only. They share `patterns_autoimmune.js`, so their implementation runs in sequence.
- Phase 9 runs last.

## Parallel opportunities

- T005, T006 and T007 can run in parallel.
- US1 (T008–T011) can run in parallel with Phase 2.

## Implementation strategy

The MVP is US1 together with US2, which removes the wrong verdicts and covers the most common missing panel. The rest follows in priority order, all in one commit, because P136 must land with its behaviour (N37).
