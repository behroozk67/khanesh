---
description: "Task list for specs/025 — Tietz ch 22/33 carbohydrates and diabetes, gaps only"
---

# Tasks: Carbohydrates and Diabetes (Tietz ch 22/33): gaps only

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/findings.md](contracts/findings.md), [quickstart.md](quickstart.md)

**Tests**: these are required. FR-010 and constitution IV say every behaviour gets one test in `khanesh-server/rules/engine.test.js`, with Persian comments, and that test must fail on `HEAD 2252643`.

All paths are relative to the repository root. Commands run from `khanesh-server/`.

## Phase 1: Setup

- [ ] T001 Allocate **P143** in `MEDICAL_RULES.md`. Grep `^### P14` and confirm that P142 is the last entry (N37). Add a stub heading «P143 — کربوهیدرات و دیابت (Tietz فصل‌های ۲۲/۳۳، specs/025): فقط شکاف‌ها — پیاده‌شده؛ در انتظارِ بازبینیِ بالینی».
- [ ] T002 Save the rule-id set before any change to `specs/025-diabetes-carbohydrates-ch33/snapshots/ids_before.txt`. Run `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"` (N16).

## Phase 2: Foundational

These tasks block US2 and US5.

- [ ] T003 Read the conversion path in `khanesh-server/rules/adapter.js` and `khanesh-server/rules/units.js`. The question is how a printed range travels when the row's value is converted. Use HbA1c mmol/mol with a printed range as the reference case, and record the answer in a one-line note in `specs/025-diabetes-carbohydrates-ch33/research.md` (D3, "verify while implementing"). Nothing else is decided until this is read.
- [ ] T004 Add `PRINTED_FIRST_BOTH_KEYS = new Set(["INSULIN", "C_PEPTIDE"])` next to `PRINTED_FIRST_KEYS` in `khanesh-server/rules/adapter.js`. Use it in the `printedOwn` chain (around line 3289) so that `printedRangePair(printedRefsAll[key])` is returned with **both** edges. If T003 shows a converted value would be compared to an original-unit range, grade in the printed unit instead (N12).

## Phase 3: User Story 1 — Reported diabetic: target, not diagnosis (P1) 🎯 MVP

**Goal**: with `dm2` active and the patient not pregnant, `diabetes_range` and `prediabetes_range` speak about control and the < 7 % HbA1c target. Urgency is unchanged.

**Independent test**: the probe panels «G3 …» in `snapshots/probe_ch33.mjs`. Without the condition and in pregnancy, the text is byte-identical.

- [ ] T005 [US1] Add tests to `khanesh-server/rules/engine.test.js`:
  - dm2 with HbA1c 6.9 is «در محدودهٔ هدف», and 7.0 and 7.8 are «بالاتر از هدف».
  - dm2 with HbA1c 6.2 does not contain «پیش‌دیابت».
  - dm2 with FBS 150 does not contain «قطعی‌شدن تشخیص».
  - Each of those keeps the same urgency as without the condition.
  - With no condition, HbA1c 7.8 is unchanged.
  - With dm2 and pregnancy, `gestational_diabetes_range` keeps ownership.
- [ ] T006 [US1] Add a helper `knownDiabetic(e)` in `khanesh-server/rules/patterns_biochem.js`, returning `e.conditions?.includes("dm2") && !e.pregnant`, and a constant `A1C_TARGET = 7` with a comment pointing to P143.
- [ ] T007 [US1] In the `glycemia` build in `khanesh-server/rules/patterns_biochem.js`:
  - When `knownDiabetic(e)`, replace `dxPhrase` (around line 1406) and the prediabetes sentence (around line 1456) with the contract D1/D2 strings.
  - Add `applied_conditions: ["dm2"]`.
  - Leave the urgency expressions untouched.
  - Keep the anaemia branch (`a1c_diabetes_range_unreliable`) as today, only adding the dm2 target clause when the condition is active.
- [ ] T008 [US1] Run T005 against `HEAD` through `git archive` with `node_modules` linked (quickstart §3). Every new test must be red there, and green on the tree.

## Phase 4: User Story 2 — Insulin and C-peptide read, not dropped (P1)

**Goal**: the five files are wired (N1), the printed range is used first, and the hyperinsulinaemia finding appears during hypoglycaemia.

**Independent test**: the probe panels «G4 …».

- [ ] T009 [P] [US2] Add tests to `khanesh-server/rules/engine.test.js`:
  - insulin 30 against «2.6–24.9» is graded high, with `insulin_result`;
  - insulin 18 against «< 10» is high (printed beats fallback);
  - pmol/L with a printed pmol/L range is graded in pmol/L;
  - a unitless insulin with no range is not graded and is listed;
  - the endogenous, `endogenous_cp_unknown` and exogenous states at glucose 45 and 40;
  - glucose 54 with insulin gives no hyperinsulinaemia finding, and 53 does;
  - `hypoglycemia_significant` stays an emergency;
  - «Insulin Antibody» and «HOMA-IR» stay in `unmapped`.
- [ ] T010 [P] [US2] Add `INSULIN: { both: [2.6, 24.9], unit: 'µIU/mL' }` and `C_PEPTIDE: { both: [1.1, 4.4], unit: 'ng/mL' }` to `khanesh-server/rules/refs.js`, with a comment: «condition 2 (رایج‌ترین بازهٔ کیت‌های ایران)، fallback فقط؛ P143».
- [ ] T011 [P] [US2] Add `FA_NAMES.INSULIN` «انسولین» and `FA_NAMES.C_PEPTIDE` «سی‌پپتید (C-peptide)» in `khanesh-server/rules/names.js`.
- [ ] T012 [US2] Add the NAME_MAP spellings from data-model.md to `khanesh-server/rules/adapter.js`. Then probe that `insulinantibody`, `antiinsulin`, `iaa`, `homair` and `proinsulin` do **not** resolve to `INSULIN` through `resolveAlias`. If one does, exclude it explicitly (N25).
- [ ] T013 [US2] Add unit conversions to `khanesh-server/rules/units.js`, applied only when the unit is printed:
  - insulin pmol/L → µIU/mL (÷ 6.945, citing P69), and accept µU/mL and mIU/L as identity;
  - C-peptide nmol/L → ng/mL (÷ 0.331) and pmol/L → ng/mL (÷ 331).
  Then check that `G7` (every convertible key exists in `FA_NAMES`) passes.
- [ ] T014 [US2] Add `insulin_result` to `khanesh-server/rules/patterns_biochem.js`.
  - It matches when INSULIN or C_PEPTIDE is graded and there is no glucose < 54.
  - It uses the contract US2-6 text, quotes every value it owns (N52), and is `routine`.
  - It names no HOMA threshold.
- [ ] T015 [US2] Add `hypoglycemia_insulin_not_suppressed` to `khanesh-server/rules/patterns_biochem.js`.
  - It covers the D4 states and is `soon`, `always_show` with a `brief`.
  - It sends a `suggest` for C-peptide (only when absent), proinsulin and a sulfonylurea screen.
  - It must never lower urgency: test it beside `hypoglycemia_significant` (N20).
- [ ] T016 [US2] Add `RULE_GROUP` entries for `insulin_result` (hormones/immunology) and `hypoglycemia_insulin_not_suppressed` (biochemistry) in `khanesh-server/rules/groups.js`. Add `SUGGEST_TESTS` rows for «سی‌پپتید», «پروانسولین» and «غربالگری سولفونیل‌اوره» in `khanesh-server/rules/patterns.js`.

## Phase 5: User Story 3 — Low or extreme HbA1c explained (P2)

**Independent test**: the probe panels «G1 …» and «G2 …».

- [ ] T017 [P] [US3] Add tests to `khanesh-server/rules/engine.test.js`:
  - HbA1c 3.5 and 3.9 give `hba1c_low` and no `unmatched_abnormal`;
  - 4.0 and 15.0 are unchanged;
  - 15.1 and 16 carry the variant sentence with the same urgency;
  - a variant read by `hbVariantState` is named.
- [ ] T018 [US3] Add `hba1c_low` to `khanesh-server/rules/patterns_biochem.js`. It matches HBA1C `dir === "low"` (the graded range, so children use `PED_REFS`). It is `routine`, or `this_week` when HGB is abnormal or MCV is < 80 or > 100. It uses the contract D5 text and has a `RULE_GROUP` entry in `khanesh-server/rules/groups.js`.
- [ ] T019 [US3] Append the > 15 sentence to `diabetes_range` in `khanesh-server/rules/patterns_biochem.js`. The edge is strict (`> 15`).

## Phase 6: User Story 4 — Direction of HbA1c doubt (P2)

- [ ] T020 [P] [US4] Add tests to `khanesh-server/rules/engine.test.js`:
  - IDA (MCV 72, ferritin 8) gives «بیشتر از واقع»;
  - RETIC 6 % high gives «کمتر از واقع»;
  - anaemia alone keeps the two-sided text.
- [ ] T021 [US4] In `a1c_diabetes_range_unreliable` in `khanesh-server/rules/patterns_biochem.js`, add a direction clause.
  - Iron deficiency = MCV < 80 && `ferritinBelowIdCut(e)`; import it from `patterns_utils.js` if it is not already imported.
  - Haemolysis = RETIC graded `dir === "high"`.
  - If both are present, keep today's text.

## Phase 7: User Story 5 — Anti-GAD and IA-2 (P3)

**Independent test**: the probe panels «G6 …».

- [ ] T022 [P] [US5] Add tests to `khanesh-server/rules/engine.test.js`:
  - «Anti-GAD 25 (<10)» is positive;
  - «Negative» goes through `qualVerdict`, and the text does not say «مثبت»;
  - with no cut-off, it is «تفسیر نشد», never negative;
  - IA-2 behaves the same way.
- [ ] T023 [US5] Register `ANTI_GAD` and `ANTI_IA2` in `khanesh-server/rules/serology.js`, using the same shape as `ANTI_CCP` on the `assay_printed` path, and add their `FA_NAMES` to `khanesh-server/rules/names.js`.
- [ ] T024 [US5] Add `islet_autoantibody_result` to `khanesh-server/rules/patterns_autoimmune.js` with `explainsOf`. Use the contract D7 text. It is `this_week` when positive and the same sheet has glucose or HbA1c in the diabetes range, otherwise `routine`. Give it a `RULE_GROUP` entry (hormones/immunology) in `khanesh-server/rules/groups.js`.

## Phase 8: Polish and Cross-Cutting

- [ ] T025 Run the probe and save the result to `specs/025-diabetes-carbohydrates-ch33/snapshots/after.txt`. Diff it against `before.txt`; every changed panel must be one listed in quickstart §2, and nothing else.
- [ ] T026 Run the rule-id diff against `ids_before.txt`. It must add exactly `hba1c_low`, `insulin_result`, `hypoglycemia_insulin_not_suppressed` and `islet_autoantibody_result`, and remove nothing.
- [ ] T027 Run `npm test` in `khanesh-server/`. The expected result is that only T15e fails. `metamorphic.test.js` stays green with no new `ALLOWED_DROPS`, and GR1, M32, M36, M37 and G6 are green.
- [ ] T028 Write the full P143 entry in `MEDICAL_RULES.md`:
  - the duplicates table and the not-executable list;
  - D1–D9, each with its source status («منبع در این جلسه باز نشد»);
  - the conflicts table;
  - an «if rejected, remove …» line for each item;
  - a cross-reference to P69.
- [ ] T029 Mark the tasks `[X]` in `specs/025-diabetes-carbohydrates-ch33/tasks.md`. Commit the behaviour and P143 together (N37), without SKIP_HOOKS, and do not push.

## Dependencies

- T001 and T002 come first. T003 must finish before T004, and T004 before US2 (T013–T015).
- US1 (T005–T008) depends only on Phase 1, so it is the MVP.
- US2 depends on Phase 2. US3 and US4 are independent of US2.
- US3 and US4 both edit `patterns_biochem.js`, so they run in sequence with US1 and US2: same file, no `[P]` across them.
- US5 is independent; it touches serology.js and patterns_autoimmune.js.
- Phase 8 comes after all stories.

## Parallel Opportunities

- T009, T010 and T011 (tests, refs.js, names.js) can run together.
- The test-writing tasks T017, T020 and T022 can be drafted in parallel, but all of them go into `engine.test.js`, so merge them in sequence.
- US5 (T023–T024) can run in parallel with US3 and US4.

## Implementation Strategy

1. **MVP**: Phases 1–3 (US1). This is the most common diabetic follow-up sheet and has the smallest diff: text only.
2. Then US2. It is the largest piece and needs the five-file wiring.
3. Then US3, US4 and US5, which are small owners and text clauses.
4. Phase 8 lands everything in one commit with P143.
