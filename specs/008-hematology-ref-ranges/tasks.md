# Tasks: Anaemia, Iron and Haemoglobin-Variant Reference Ranges

**Input**: Design documents from `specs/008-hematology-ref-ranges/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/engine-output.md](contracts/engine-output.md), [quickstart.md](quickstart.md)

**Tests**: REQUIRED. FR-011 and constitution IV say every behaviour change needs a test that was **red on `9deba20`**,
and every exclusion needs a freeze test that is green on both trees. Tests go in `khanesh-server/rules/engine.test.js`,
numbered from `M184`, with Persian comments, one per behaviour.

**Conventions**:
- Run commands from `khanesh-server/` unless a task says otherwise.
- Persian text goes through Write/Edit or Bash only. Never use PowerShell `Get-Content`/`Set-Content`/`Add-Content` (N15(d)).
- Every adopted number carries this source comment: «تأییدِ کاربر ۱۴۰۵/۰۷/۰۱؛ مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم».

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (baseline and evidence)

- [X] T001 Save the rule-id set before any change. Run `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"` and write the output to `specs/008-hematology-ref-ranges/ids-before.txt`. Expect 135 lines.
- [X] T002 [P] Dump the current ranges to `specs/008-hematology-ref-ranges/refs-before.json`: `ADULT_REFS`, `GERIATRIC_REFS` and `PED_REFS` for HGB, HCT, RBC, MCV, MCH, MCHC, RDW_CV, RDW_SD, RETIC, IRON, TIBC, TSAT, FERRITIN. This is the evidence for SC-001 that the duplicate keys are unchanged.
- [X] T003 Add the extra panels listed in quickstart §2 to `specs/008-hematology-ref-ranges/probe.mjs`:
  - age-band edges: M 13.6/13.7 at age 30; M age 19 vs 20 with Hb 13.65; M age 49 vs 50 with Hb 13.5; M age 69 vs 70 with Hb 12.5; F age 69 vs 70 with Hb 11.9
  - F age 49 vs 50 with ferritin 25
  - M age 13 with Hb 13.8
  - HbA2 alone at 3.7, 3.9 and 1.0; HbA2 5 at age 1
  - «HBsAg Positive»; «HbS Positive» alone; «HbC 30 %» with «HbA2 3»; «HbC Positive» alone; «Anti-HBc Positive»

  Also print each finding's `must_say`/`action` for the iron and thalassaemia panels. Re-save `probe-before.txt`, then check that the original 23 panels are byte-identical to the first run.
- [X] T004 [P] Create the pre-change copy for "red before" runs, per quickstart §1: `git archive 9deba20 khanesh-server` into `<scratchpad>/pre008/`, then junction in `node_modules`. Confirm that `node --test rules/engine.test.js` there reports the same counts as the working tree's engine suite.

---

## Phase 2: Foundational (blocking prerequisites)

Every story adds keys or thresholds that patterns read. These shared pieces have to exist first.

- [X] T005 Add a `getRefSource` branch in `khanesh-server/rules/refs.js`. It returns the label `"User-approved 1405/07/01 (specs/008)"` for `HGB` at age ≥ 16 or unknown, for `IRON`, and for `FERRITIN` at age ≥ 16 or unknown. It must be keyed so that later tasks can reuse it for `HBA2`/`HBF`. Verify with `node -e` on `getRefSource("HGB", 40)` and `getRefSource("HGB", 10)`; the second must still return the RCPCH source.
- [X] T006 [P] Add the patient-facing names to `FA_NAMES` in `khanesh-server/rules/names.js`, using data-model §4 (HBA, HBA2, HBF, HBS, HBC, HBE, ZPP, STFR, EPO). Show the nine Persian strings verbatim in the task report.

**Checkpoint**: `npm test` is green, with the same counts as the T004 baseline.

---

## Phase 3: User Story 1 — Anaemia judged against the right age/sex threshold (Priority: P1) 🎯 MVP

**Goal**: Hb lower limits follow the approved age/sex table (FR-003). This removes the false anaemia on common adult
values (G1/G2) and the silence for the elderly (G3).

**Independent Test**: Run every G1–G3 panel and every band-edge panel from T003. Each must fall on the side the table
says. The crisis and paediatric panels must be byte-identical.

### Tests for User Story 1 (write first; confirm red on `pre008/`)

- [X] T007 [P] [US1] `M184` in `khanesh-server/rules/engine.test.js`. For M age 30, Hb 13.8 and 13.7 must be `abnormal: false` with no anaemia finding, and Hb 13.6 must be low. For F age 30, Hb 12.1 must be normal and 11.9 low. Red before.
- [X] T008 [P] [US1] `M184b`. M age 80 with Hb 11.5, and F age 80 with Hb 11.0, must both be low and fire an anaemia finding (G3, previously silent). M age 72 with Hb 12.6 and F age 72 with Hb 11.9 must be normal. Red before.
- [X] T009 [P] [US1] `M184c`, the band-edge sweep. Test ages 19/20 (M 13.65), 49/50 (M 13.5) and 69/70 (M 12.5, F 11.9). Each pair must land on opposite or equal sides exactly as R1's table says. Assert on the `range` string, not only on `abnormal`. Red before.
- [X] T010 [P] [US1] `M184d` freeze. Check against the `pre008/` copy:
  - M age 13 with Hb 13.8 still reads range 14–17.5;
  - upper limits unchanged: M age 40 with Hb 17.0 is normal and 17.6 is high;
  - Hb 6.5 at ages 30/80/unknown gives a `severe_anemia_crisis` action identical to the old one;
  - an unknown-age man uses 13.7.

  Green on both trees.
- [X] T011 [US1] Update `khanesh-server/rules/geriatric.test.js`. Hb 12.3 for a 75-year-old man is now **low** (range 12.4–17.5). Rewrite the assertion and message to say so, with a comment citing specs/008 Q1. MCV 101 must stay normal (GERIATRIC_REFS.MCV is unchanged).

### Implementation for User Story 1

- [X] T012 [US1] Implement `hgbRef(sex, age)` in `khanesh-server/rules/refs.js`, following R1's table:
  - 16–19, 20–49 (also used for unknown age), 50–69 and ≥ 70 bands;
  - unknown sex uses the F row;
  - highs are M 17.5 / F 15.3;
  - ages < 16 with no PED row keep `[14, 17.5]` / `[12.3, 15.3]` exactly.

  In `getRef`, call it after the paediatric lookup and before the geriatric lookup. Delete `GERIATRIC_REFS.HGB` and mark the deletion with a comment: «P2 بسته شد — specs/008». Add the source comment to the new code.
- [X] T013 [US1] Grep every `test === "HGB"` reader in `khanesh-server/rules/patterns_*.js` (30 reads across 8 files, R2). For each one, confirm that its meaning is "anaemic" or that it has its own numeric gate (the malignancy files: `< 10`, `< 8`). If a reader means something else, pin it with a named constant (N23) and add it to this task. Record the list in a comment block in `specs/008-hematology-ref-ranges/research.md` R2.
- [X] T014 [US1] Check the text of `thal_trait_no_anemia` and `microcytic_anemia` for the M30_Hb138_micro panel (Hb 13.8 is now normal, MCV 72). No sentence may call the patient anaemic when Hb is not low. If one does, branch it on the graded `dir` in `khanesh-server/rules/patterns_hematology.js`.
- [X] T015 [P] [US1] Make the frontend follow the backend lower limits in `khanesh/src/labRefs.js` `hb.range`, using months:
  - ≥ 16 y (192 mo): M 13.6 / F 12.0
  - ≥ 20 y (240 mo): M 13.7
  - ≥ 50 y (600 mo): M 13.3
  - ≥ 70 y (840 mo): M 12.4 / F 11.8
  - adult highs 17.5 / 16.0 (the frontend's existing high is kept)

  Remove the `m >= 900` 11.0/10.5 row. Leave the < 6 y rows as they are. Verify with `npm run lint` in `khanesh/` and a `node` probe of `range("male", 360)`, `range("female", 960)`, `range("male", null)`.
- [X] T016 [US1] Run `M184`–`M184d` and `geriatric.test.js` on the tree (green) and on `pre008/` (M184–M184c red, M184d green). Quote the counts.

**Checkpoint**: US1 is shippable on its own. Hb grading is correct by age and sex, and the crisis is unchanged.

---

## Phase 4: User Story 2 — Iron markers use approved ranges without disabling the iron rules (Priority: P2)

**Goal**: FR-005/FR-006. The grading ranges move, and the IDA/ACD rules read named cut-offs. For women ≥ 50 the
ferritin cut-off becomes < 30.

**Independent Test**: The G4–G6 panels plus F age 49/50 with ferritin 25. The finding text never contradicts the
grading shown beside it.

### Tests for User Story 2

- [X] T017 [P] [US2] `M185`. M age 40, ferritin 20: FERRITIN is graded normal on 12–300, and `iron_deficiency` still fires. Its `must_say` must **not** contain «فریتین پایین». Red before (the graded range was 30–300).
- [X] T018 [P] [US2] `M185b`. F age 55, ferritin 25: graded low on 30–300 and `iron_deficiency` fires. F age 49, ferritin 25: graded normal and no iron-deficiency finding. Red before.
- [X] T019 [P] [US2] `M185c`. M age 40, iron 55 alone: normal, with no `unmatched_abnormal` for IRON. The ACD panel (Hb 11, MCV 85, iron 55, ferritin 250, TIBC 220) still fires `anemia_of_chronic_disease`. Iron 165: high. Red before.
- [X] T020 [P] [US2] `M185d` freeze. Check against `pre008/`:
  - F age 30 ferritin 13: `iron_deficiency` fires;
  - WHO inflammation branch (CRP 40, ferritin 45): `iron_deficiency_masked_by_inflammation`, with the same `must_say`;
  - the classic IDA panel (Hb 9.5, MCV 70, ferritin 6): same patterns and actions;
  - TIBC and TSAT ranges unchanged.

  Green on both trees.

### Implementation for User Story 2

- [X] T021 [US2] In `khanesh-server/rules/refs.js`:
  - `IRON` becomes `{ both: [50, 160] }`;
  - add `ferritinRef(sex, age)`: M 12–300; F age ≥ 50 30–300; otherwise F 12–150;
  - route `FERRITIN` through it in `getRef` after the paediatric lookup;
  - add the source comment.
- [X] T022 [US2] In `khanesh-server/rules/patterns_utils.js`, add `ferritinIdCut(e)` and `IRON_ACD_LOW_UGDL = 60`, and export both. `ferritinIdCut(e)` returns M 30, F with age ≥ 50 30, and otherwise 15 (including unknown sex or age). Comment each one "held" or "clarified change", with an N23 reference.
- [X] T023 [US2] In `iron_deficiency_panel` in `khanesh-server/rules/patterns_hematology.js`, replace `ferrLow` (graded `dir`) in both `match` and `build` with `ferrBelowCut = t.FERRITIN < ferritinIdCut(e)`. The `whoOnly` branch becomes `!ferrBelowCut && whoInflamIronDeficiency(e)`. Make the `must_say` parenthetical three-way:
  - below the graded range: today's text;
  - inside the range but below the cut: a new sentence saying the value is at the low edge of the lab's range and is below the level usually used for iron deficiency;
  - otherwise: none.

  Show the new Persian sentence verbatim.
- [X] T024 [US2] In `anemia_of_chronic_disease` in `khanesh-server/rules/patterns_hematology.js`, `ironLow` becomes `t.IRON < IRON_ACD_LOW_UGDL` and `ferrNotLow` becomes `!(t.FERRITIN < ferritinIdCut(e))`. Confirm the text never states that iron is below the normal range.
- [X] T025 [US2] Run `M185`–`M185d` (green on the tree, red or green on `pre008/` as specified), plus the whole iron block of existing tests. Quote the counts.

**Checkpoint**: US2 is independently verifiable. The grading moved and no iron rule changed silently.

---

## Phase 5: User Story 3 — Printed haemoglobin-variant results are read, not dropped (Priority: P2)

**Goal**: FR-007/FR-008 plus the clarify decision. Rows get the right identity (with no hepatitis collision and no
HbS→HGB trap). HbA2 and HbF are graded. There is exactly one HbA2 mention per sheet, and electrophoresis is no longer
requested when it is already on the sheet.

**Independent Test**: The spelling list resolves to one key each. The HbA2 panels from T003 produce one HbA2 mention
each. The hepatitis panels are byte-identical.

### Tests for User Story 3

- [X] T026 [P] [US3] `M186`, identity. Each spelling must resolve to its key and `unmapped` must be empty for them:
  - HBA2: `HbA2`, `Hb A2`, `Hemoglobin A2`, «هموگلوبین A2», and `A2` with a `%` unit
  - HBF: `HbF`, `Hb F`, `Fetal Hb`, «هموگلوبین جنینی»
  - HBA: `HbA`, `HbA0`
  - HBS: `Sickle Hb`
  - ZPP: `ZPP`
  - STFR: `sTfR`
  - EPO: `Erythropoietin`

  `HbA1c` must still map to `HBA1C`. Red before.
- [X] T027 [P] [US3] `M186b`, the collision guards:
  - «HbS 40 %» becomes key `HBS` and **never** `HGB`. Assert that no graded HGB exists.
  - «HbC 30 %» with «HbA2 3 %» becomes `HBC`.
  - «HbS Positive» alone goes to `unmapped` and not `qual`, and is not a normal result: `engineOut.unmapped` includes it.
  - «HbC Positive» alone stays `unmapped`.

  Red before.
- [X] T028 [P] [US3] `M186c` freeze. «HBsAg Positive» fires `hbv_screen_reactive`, with byte-identical output. «Anti-HBs Positive» and «Anti-HBc Positive» give byte-identical engine output to `pre008/`. Green on both trees.
- [X] T029 [P] [US3] `M186d`, grading:
  - HbA2 2.8 and HbF 0.6 on an adult are normal;
  - HbA2 5.2 is high;
  - HbA2 5 at age 1, and HbF 70 at age 0.1, are in `noRef` and not graded;
  - HBA, HBS, ZPP, STFR and EPO are in `noRef` with their Persian names.

  Red before.
- [X] T030 [P] [US3] `M186e`. The HbA2_52 panel (MCV 66, RBC 6.1, HbA2 5.2) fires a thalassaemia owner whose text names HbA2 as consistent with β-thalassaemia trait. Neither `suggest` nor `action` asks for «الکتروفورز هموگلوبین», and `hba2_elevated` does not fire. Red before.
- [X] T031 [P] [US3] `M186f`. HbA2 3.9 alone fires `hba2_elevated` (routine) with the trait wording. HbA2 3.7 alone fires `hba2_elevated` with the borderline wording and no trait claim. HbA2 1.0 alone appears in `unexplained_abnormal`'s `orphans`. Red before.
- [X] T032 [P] [US3] `M186g`, two-sided sweep (the M91e shape). Across at least 8 panels with HbA2 above 3.5 (with or without a microcytic picture, IDA branch, thal branch, thal trait without anaemia, borderline), exactly **one** finding mentions HbA2. At least one panel must reach each owner and each `hba2_elevated` branch; assert this, so the test cannot pass by firing nothing (N15). Red before.

### Implementation for User Story 3

- [X] T033 [US3] Map the unambiguous rows in `NAME_MAP` in `khanesh-server/rules/adapter.js`, per R4:
  - HBA2: `hba2`, `hemoglobina2`, `haemoglobina2`, «هموگلوبینa2»
  - HBF: `hbf`, `fetalhb`, `fetalhemoglobin`, `hemoglobinf`, «هموگلوبینf», «هموگلوبینجنینی»
  - HBA: `hba`, `hba0`, `hemoglobina`
  - ZPP: `zpp`, `zincprotoporphyrin`
  - STFR: `stfr`, `solubletransferrinreceptor`
  - EPO: `epo`, `erythropoietin`, «اریتروپویتین»
  - HBS: `sicklehb`, `sickle`, «هموگلوبینs»

  Put `a2 → HBA2` in `UNIT_GATED_ALIASES`, allowed only with a `%` unit. Before adding each alias, check it against the whole `NAME_MAP` and against `resolveAlias`'s split and plural rules, and record the result in a comment. `hemoglobina` must not shadow `hemoglobina1c`.
- [X] T034 [US3] Gate `hbs`, `hbc` and `hbe` on electrophoresis evidence in `khanesh-server/rules/adapter.js`. Before the `isQualitative` check, map them to `HBS`/`HBC`/`HBE` only when the row's unit is `%` **or** the sheet has an unambiguous `HBA2`/`HBF`/`HBA` row. Detect this once per sheet, before the row loop.
  - A bare `hbs` without evidence and with a non-numeric value goes to `unmapped`, with a comment noting that nothing read `hbs` in `qual` (`patterns_infectious.js:40`).
  - A numeric bare `hbs` without evidence goes to `unmapped`, **never** through `resolveAlias`, because of the plural trap.
  - Leave the `/^(anti)?hbs$|^antihbs/` pattern in place for `antihbs`.
  - A non-numeric value on a variant row goes to `unmapped` under its printed name.
- [X] T035 [US3] In `khanesh-server/rules/refs.js`, add `ADULT_REFS.HBA2 = { both: [1.5, 3.5], unit: '%' }` and `ADULT_REFS.HBF = { both: [0, 2], unit: '%' }` with the source comment. Extend T005's `getRefSource` branch. In `khanesh-server/rules/adapter.js`, next to the `RETIC_ABS` gate, send `HBA2`/`HBF` to `noRef` when age < 2, and send `HBA`, `HBS`, `HBC`, `HBE`, `ZPP`, `STFR` and `EPO` to `noRef` at every age.
- [X] T036 [US3] In `khanesh-server/rules/patterns_utils.js`, add three exported helpers:
  - `thalOwnerFires(e)`, derived from the `match` of `thal_trait_no_anemia` and `microcytic_anemia`. Extract a shared predicate so the rule and the helper cannot drift, the same way as `spherocytosisFires`.
  - `hba2State(e)`, returning `"trait"` (> 3.8), `"borderline"` (> 3.5 and ≤ 3.8) or `null`.
  - `hba2Clause(e, branch)`, returning the Persian clause. The IDA branch variant says trait and iron deficiency can coexist.
- [X] T037 [US3] In `thal_trait_no_anemia` and in both branches of `microcytic_anemia` in `khanesh-server/rules/patterns_hematology.js`, append `hba2Clause`. When `HBA2` is graded, drop «الکتروفورز هموگلوبین» from `suggest` and rewrite `action` so it doesn't ask for it: branch the action string, keeping the ferritin request.
- [X] T038 [US3] Add the new rule `hba2_elevated` in `khanesh-server/rules/patterns_hematology.js`:
  - `match`: `hba2State(e) != null && !thalOwnerFires(e)`
  - `urgency: "routine"`
  - two text branches: trait-consistent, and borderline
  - `suggest: ["شمارش خون (CBC)", "فریتین"]`, each dropped when already measured
  - a warning that this is not a diagnosis, and that a doctor or genetic counsellor interprets it, especially before pregnancy

  Confirm that `RULES_HEMATOLOGY` is spread in `patterns.js`. Show all new Persian text verbatim.
- [X] T039 [US3] In `SUGGEST_TESTS` in `khanesh-server/rules/patterns.js`, add `"الکتروفورز هموگلوبین": ["HBA2"]` and `"گیرندهٔ محلول ترانسفرین (sTfR)": ["STFR"]`.
- [X] T040 [US3] Run `M186`–`M186g` (green on the tree; red on `pre008/` as specified, freezes green) plus `M32` (FA names) and `M36`–`M38`. Quote the counts.

**Checkpoint**: all three stories are complete.

---

## Phase 6: Polish & Cross-Cutting

- [X] T041 Full suite: `npm test` in `khanesh-server/` must be green; quote tests/pass/fail/todo. Run the whole `engine.test.js` + `geriatric.test.js` on `pre008/` and confirm the red set is exactly: M184, M184b, M184c, M185, M185b, M185c, M186, M186b, M186d, M186e, M186f, M186g, and the changed geriatric case. Quote the counts.
- [X] T042 [P] Diff the rule-id set against `ids-before.txt`; the only difference must be `+hba2_elevated` (136 rules). Diff the range dump against `refs-before.json`; only HGB (the geriatric row gone and the new bands), IRON and FERRITIN may differ, plus the new HBA2 and HBF keys.
- [X] T043 [P] Run `probe.mjs` into `specs/008-hematology-ref-ranges/probe-after.txt`. Diff it against `probe-before.txt` and confirm every change matches the quickstart §2 table and nothing else changed.
- [X] T044 [P] `cd khanesh && npm run lint` must report 0 errors; quote the warning count. `npm run build` must succeed.
- [X] T045 Update `MEDICAL_RULES.md`:
  - mark `P2` closed, with a pointer to specs/008;
  - add `P53`: the provenance note, a table of approved-and-implemented numbers (Q1, Q2, Q3, the F ≥ 50 cut, the HbA2 hand-off) with their guards, and the pending proposals from research R8 (12–15 Hb rows, pregnancy, ferritin < 50–60 under inflammation, sTfR index, ZPP > 100, PV criteria, HbF age bands, HbS/C/E bands, HbA2 3.6–3.8, the Mentzer-override question, adult 13.7 vs WHO 13.0).

  Write it with the Edit tool only.
- [X] T046 [P] Add a specs/008 section to `khanesh-server/rules/REF_DIFF.md`: the frontend Hb follows the backend; frontend ferritin (`labRefs.js`) and iron do not, with the numbers; the paediatric rows of the pasted reference compared with `PED_REFS`.
- [X] T047 Update `CLAUDE.md`:
  - add a baseline row with the tree, date, counts, rule count 136 and the red set;
  - change the rule count in "Where a pattern lives" to 136;
  - add hashes and short notes to **N23** (grading range split from the rule cut-off: ferritin, iron) and **N25** (HbS/HbC/HbE identity, and the `resolveAlias` plural trap `hbs`→`hb`→HGB).
- [ ] T048 Show the user every new Persian string, verbatim: FA_NAMES ×9, the ferritin edge sentence, the HbA2 clauses (trait, borderline, IDA-branch), the `hba2_elevated` headline/must_say/action/warning, and the rewritten thalassaemia actions.
- [ ] T049 Run the `code-reviewer` and `eval-medical-reviewer` agents on the diff (two rounds, per note.md §D). Record the findings and fixes in `specs/008-hematology-ref-ranges/medical_review.md`. Any fix gets a new test that is red before the fix.

---

## Dependencies & Execution Order

- **Setup (T001–T004)** comes first. T002 and T004 are [P].
- **Foundational (T005–T006)** blocks every story.
- **US1 (T007–T016)** depends only on Foundational.
- **US2 (T017–T025)** depends on Foundational and is independent of US1. It edits `refs.js` like US1 does, so run it sequentially, not in parallel, with T012.
- **US3 (T026–T040)** depends on Foundational. It edits `refs.js` (T035) and `patterns_hematology.js` (T037/T038), which US1 and US2 also touch, so run it after them.
- **Polish (T041–T049)** runs after all stories. T045 comes before T047, because CLAUDE.md cites P53.

Within each story: tests → confirmed red on `pre008/` → implementation → confirmed green.

## Parallel Opportunities

- T002 ∥ T004; T005 ∥ T006.
- The test-writing tasks within each story (T007–T010, T017–T020, T026–T032) touch one file but are independent tests. They can be drafted in parallel and appended in sequence.
- T015 (frontend) ∥ T012–T014 (backend).
- T042 ∥ T043 ∥ T044 ∥ T046.

## Implementation Strategy

1. **MVP = US1.** It fixes the most common false alarm and the elderly silence, and ships alone.
2. **Next, US2.** It changes the ranges while keeping the iron rules intact.
3. **Then US3.** It handles row identity, HbA2 grading and the hand-off.
4. **Then Polish.** It covers the registers, the Lab Notebook, the Persian review and the review agents.

Stop at any checkpoint. Each one leaves the suite green.
