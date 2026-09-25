# Tasks: Leukocyte Differential and Smear-Morphology Rules

**Input**: Design documents from `specs/009-leukocyte-differential-rules/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/engine-output.md](contracts/engine-output.md), [quickstart.md](quickstart.md)

**Tests**: REQUIRED. FR-011 and constitution IV say every behaviour change needs a test that was **red on `0d8c782`**,
and every exclusion needs a freeze test that is green on both trees. Tests go in `khanesh-server/rules/engine.test.js`,
numbered from `M200` (a concurrent session holds `M194`/`M200` for its PCT fix; research R13 was wrong), with Persian comments, one per behaviour.

**Conventions**:
- Run commands from `khanesh-server/` unless a task says otherwise.
- Persian text goes through Write/Edit or Bash only. Never use PowerShell `Get-Content`/`Set-Content`/`Add-Content` (N15(d)).
- Every adopted number carries this source comment: «تأییدِ کاربر؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم».
- No patient-facing string may name a diagnosis (CML, AML, leukaemia by name) — the Diagnosis-labeling boundary in spec.md.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (baseline and evidence)

- [X] T001 Save the rule-id set before any change. From `khanesh-server/`, run `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"` and write the output to `specs/009-leukocyte-differential-rules/ids-before.txt`. Expect 144 lines.
- [X] T002 [P] Add the extra panels listed in quickstart §2 to `specs/009-leukocyte-differential-rules/probe.mjs`: the three-way `monocytopenia` WBC arms (low/normal/absent WBC); «Pseudo-Pelger cells: Present»; «Blasts: Few»; «Auer rods: +/-» (equivocal); WBC 45 with baso 3 % (no `cml_suspicion` hand-off, so `basophilia` fires beside `leukocytosis`); an `acute_leukemia_suspicion` panel (WBC 60, Hb 7, PLT 40) with «Blasts 30 %»; a urine-page panel with a «Pelger» row (must not become a smear item); a neonate (age 0.1) with eos 1800 (in `PED_REFS`, no finding). Re-run and confirm the original 28 panels are byte-identical. Re-save `probe-before.txt`.
- [X] T003 [P] Create the pre-change copy for "red before" runs, per quickstart §1: `git archive 0d8c782 khanesh-server` into `<scratchpad>/pre009/`, then junction in `node_modules`. Confirm `node --test rules/engine.test.js` there reports `682 · 663 · 0 · 19 todo`.
- [X] T004 [P] Re-measure and record the full baseline in the task report: `npm test` (working tree) and `RULES.length` (expect 144). This is the number every later phase's "green" checkpoint is compared against.

---

## Phase 2: Foundational (blocking prerequisites)

The coverage-net defect in research R6 means a finding suppressed under an emergency still marks its keys "covered".
The new count rules (US1) and the smear finding (US2) both read keys that can sit under an emergency
(`extreme_leukocytosis`, `pancytopenia`, `acute_leukemia_suspicion`), so this is fixed **before** either story, on its
own, so its blast radius is measured in isolation.

- [X] T005 `M200` in `khanesh-server/rules/engine.test.js`: on the `cml_like` probe panel (WBC 80, baso 5 %, eos 6 %, lymph 8 %, mono 4 %), assert that `_engine`'s uncovered/orphan list includes `BASO_ABS` and `LYMPH_ABS` (today's defect: they vanish with no mention anywhere). Confirm this assertion is **red** on the working tree before T006, and red on `pre009/`.
- [X] T006 In `khanesh-server/rules/patterns.js`, change the `covered` set and the coverage text (around the `RULE_READS`/`willBrief` block) so both are built only from findings that will be **shown in full** — i.e. exclude findings suppressed by `blocks_others` (rank below the blocker), in addition to the existing `briefed` exclusion. Suppressed findings contribute nothing to `covered`; briefed findings keep contributing through `brief`/`brief_warnings` only, unchanged.
- [X] T007 Run `M200` again (must now be green) and the full `npm test`. Diff the full JSON output of every existing probe panel (`node specs/009-leukocyte-differential-rules/probe.mjs` against a copy of `probe-before.txt` taken before T006) and confirm the **only** differences are orphan/uncovered lists growing on panels with a suppressed finding — no finding text, urgency, or `has_critical` changes. For every freeze-hash test in `engine.test.js` that moves, re-baseline it only after this diff confirms the change is orphan-list-only (the specs/008 `freezediff` procedure).
- [X] T008 Append the N18 recurrence paragraph to `CLAUDE.md`'s Lab Notebook, under N18, with a new hash for this fix: what was tried (a finding suppressed by `blocks_others` still marked its keys covered), what it did to the patient (basophils and lymphocytes vanished with no mention, not even in the "not explained" list, on a WBC-80 sheet), and the rule that generalizes (coverage is a property of what is shown, not of what matched).

**Checkpoint**: `npm test` is green, same total as T004 plus 1 (`M200`). The rule-id set is unchanged from T001 (this phase adds no rule).

---

## Phase 3: User Story 1 — Monocyte, eosinophil and basophil count findings (Priority: P1) 🎯 MVP

**Goal**: An isolated abnormal monocyte, eosinophil, or basophil count gets its own explained finding instead of
`unmatched_abnormal` (FR-001–003).

**Independent Test**: Run the mono/eos/baso probe panels (`mono_1400`, `mono_pct12_abs840`, `mono_900_pct9`,
`mono_150`, `mono_0`, `eos_600`, `eos_2000`, `eos_abs_row_1600`, `baso_250`, `child5_mono`) and confirm each produces
the named finding, per the quickstart §2 table. `cml_like`, `normal`, `plt_*`, `pv_*` panels stay byte-identical
except for the T006 orphan-list change already accounted for.

### Tests for User Story 1 (write first; confirm red on `pre009/`)

- [X] T009 [P] [US1] `M201` in `khanesh-server/rules/engine.test.js`: `monocytosis` fires on `mono_1400` (1400/µL, ≥ 1000 arm) and on `mono_pct12_abs840`/`mono_900_pct9` (800 < value < 1000, "slightly above" arm — not silent, not the net). Assert the finding is `routine`, not `unmatched_abnormal`. Red before.
- [X] T010 [P] [US1] `M201b`: `monocytosis` does **not** fire on `child5_mono` (880/µL, inside the paediatric range 300–1100) — confirms `refs_ped.js` bounds are used, not the adult 1000 constant. Also assert a relative-only monocytosis (absolute count in range, ≥ 10 % of WBC) produces **no** finding (research R3 decision — the spec's "either alone" edge case is deliberately overridden; document why in the test comment). Red before only for the paediatric-boundary half; the relative-only half is new coverage, not a behaviour change, so it may already pass — note this in the test comment per constitution IV ("a test that also passes on old behavior locks in nothing" — if it already passes, it is not counted as the red-before guard for this task).
- [X] T011 [P] [US1] `M201c`: `monocytopenia` fires on `mono_150` and `mono_0` (< 200/µL), `routine`. Three-way text: WBC low → "part of the same fall"; WBC normal → "usually not significant alone"; WBC absent from the sheet → says so explicitly (not "normal"). Add the three WBC-arm panels from T002. Red before.
- [X] T012 [P] [US1] `M201d`: `eosinophilia` fires on `eos_600` (`routine`) and `eos_2000`/`eos_abs_row_1600` (`this_week`, hypereosinophilia ≥ 1500). Band-edge panels at 450/451 and 1499/1500. Assert the finding never uses a diagnosis word. Red before.
- [X] T013 [P] [US1] `M201e`: `basophilia` fires on `baso_250` (`routine`). On `cml_like` (WBC 80, baso 4000, which also fires `cml_suspicion`), assert **exactly one** finding mentions basophils (the hand-off) — a two-sided sweep, per constitution's "hand-off asserted two-sided". On the T002 WBC-45/baso-3% panel (no `cml_suspicion`), assert `basophilia` fires. Red before.
- [X] T014 [P] [US1] `M201f` freeze: `normal`, `plt_500`, `plt_900`, `pv_m_168`, `pv_f_162`, `pv_m_180` produce byte-identical findings/urgency to `probe-before.txt` (T002's re-save), confirming PV/ET stay untouched (research R11). Green on both trees.

### Implementation for User Story 1

- [X] T015 [US1] In `khanesh-server/rules/refs.js`, change `ADULT_REFS.MONO_ABS` from `[0, 800]` to `[200, 800]`. Add the source comment (per Conventions) and register the number in the task report for `MEDICAL_RULES.md` `P56` (T029). Do not touch `refs_ped.js` (children keep their existing bands, per R2).
- [X] T016 [US1] In `khanesh-server/rules/patterns_utils.js`, add the named constants `MONOCYTOSIS_ABS_UL = 1000` and `HYPEREOSINOPHILIA_ABS_UL = 1500`, each with the source comment. These are the only new literals — the range ULN/LLN values are the grading limits (N23: one number, one job).
- [X] T017 [US1] Create `khanesh-server/rules/patterns_leukocyte.js`, exporting `RULES_LEUKOCYTE`, with a local `actionFor(urgency, {week, routine})` helper (copied, not imported, per the `patterns_cardiac.js` shape). Implement `monocytosis` (two arms, quotes `MONO_PCT` when printed, never a diagnosis word) and `monocytopenia` (three-way on WBC, per data-model.md §4).
- [X] T018 [US1] Add `eosinophilia` (two bands via `HYPEREOSINOPHILIA_ABS_UL`) and `basophilia` (with the `cml_suspicion` hand-off, using the local-to-`patterns_hematology.js` `ruleFiresById` shape — since `basophilia` lives in a different module, add a small module-local helper in `patterns_leukocyte.js` that takes `RULES` as an explicit dependency or re-implements the "find + call `.match`" pattern against an imported `RULES_MALIGNANCY`; do not duplicate `cml_suspicion`'s threshold as a literal) to `patterns_leukocyte.js`.
- [X] T019 [US1] Wire `RULES_LEUKOCYTE` into `khanesh-server/rules/patterns.js` (import + spread into `RULES`), and add the file to the aggregator's doc comment / `livePatternFiles()` inventory (the list is import-derived, so confirm no manual list needs updating — verify with `node -e` per N16).
- [X] T020 [US1] Run `M201`–`M201f` on the tree (green) and on `pre009/` (M201, M201c–e red as specified; M201b's paediatric half and M201f green-both as freezes). Quote the counts. Run `node -e` for the M32 sweep (every ranged key in `FA_NAMES`) — `MONO_ABS`/`EOS_ABS`/`BASO_ABS` already have names (names.js:17-18), confirm still green.

**Checkpoint**: US1 is shippable on its own. Isolated monocyte, eosinophil and basophil abnormalities get explained findings; PV/ET and every other existing finding are untouched.

---

## Phase 4: User Story 2 — Free-text morphology and blast flags on a CBC differential (Priority: P2)

**Goal**: Blasts ≥ 20 % or Auer rods produce a same-day/emergency finding (today: silently `unmapped`, or masked by a
milder `leukocytosis` finding); lesser morphology flags get an explained, correctly-scoped finding (FR-004–010).

**Independent Test**: Run `blasts_25`, `blasts_3`, `blasts_0`, `blasts_word`, `auer`, `toxic`, `dohle`, `pelger`,
`smear_remark`, `pancyto_blasts`, and the T002 additions, per the quickstart §2 table. `band_12` and `anisocytosis`
stay `unmapped` (out of scope, unchanged).

### Tests for User Story 2 (write first; confirm red on `pre009/`)

- [X] T021 [P] [US2] `M202` in `khanesh-server/rules/engine.test.js`: the smear-channel vocabulary sweep. Every spelling in data-model.md §2/research R8 (blasts, blast, blast cell(s), myeloblast(s), lymphoblast(s), monoblast(s), «بلاست»; auer/auer rod(s); toxic granul…; dohle/döhle (bod(y|ies)); pelger-huët vs pseudo-pelger-huët; may-hegglin; alder-reilly; chédiak-higashi) is read into `smear`, not `unmapped`. Red before (today every one goes to `unmapped`).
- [X] T022 [P] [US2] `M202b`: N6 sweep — absence words («Absent», «Not seen», «Nil», «منفی») and equivocal words («+/-», «Equivocal») on every smear kind produce `state: "unknown"`/`"absent"` correctly and **never** a present item; `blasts_0` and `blasts_word` produce no finding and leave `unmapped: []` (read as normal, not silently dropped — contract §`ocr_warnings`). Red before only for the "leaves `unmapped`" half; the "never a present item" half is new coverage (note per constitution IV, as in T010).
- [X] T023 [P] [US2] `M202c`: N25 sweep — a smear vocabulary term on a detected urine-only page (per `detectUrineOnlyPages`) is **not** read into `smear` (the T002 urine+Pelger panel). A generic smear/PBS/morphology header row is scanned for vocabulary terms in its value only, per data-model §2.
- [X] T024 [P] [US2] `M202d`: blast-percentage band sweep on `blasts_25` (25 %, emergency), `blasts_3` (3 %, this_week), and edge panels at 0/1/19/20 % (add 19 % and 20 % to `probe.mjs` if not already covered by T002). Assert the emergency text names no leukaemia subtype (spec Diagnosis-labeling boundary / FR-004). Red before.
- [X] T025 [P] [US2] `M202e`: Auer-rods sweep — `auer` alone (no blast %) is emergency; on the T002 panel with both blasts ≥ 20 % and Auer rods, assert **exactly one** merged finding names both (FR-006 merge decision), not two. Red before.
- [X] T026 [P] [US2] `M202f`: reactive/benign morphology sweep — `toxic`, `dohle` are `routine` and never raise `overall_urgency` beyond what a co-occurring `leukocytosis`/`extreme_leukocytosis` finding already states (N20: assert `overall_urgency` on `toxic` equals the urgency `leukocytosis` alone would give); `pelger` (true Pelger-Huët) is `routine` and explicitly benign; the T002 pseudo-Pelger panel is `this_week` (research R10 — deliberately not benign); Chédiak-Higashi's text names the recurrent-infection association (FR-008). Red before.
- [X] T027 [P] [US2] `M202g`: the `acute_leukemia_suspicion` hand-off, two-sided. On the T002 panel (WBC 60, Hb 7, PLT 40, «Blasts 30 %»), assert **exactly one** finding mentions blasts (via `firesById`), and that `peripheral_smear_findings` either does not fire or fires with the blast/Auer items excluded (data-model §3). On `pancyto_blasts` (existing emergency panel + «Blasts 30 %»), assert the smear finding is present via `always_show`/`brief` and does not introduce a second, independent action (N20 — check against `general_recommendations`'s single final action, unchanged mechanism). Red before.
- [X] T028 [P] [US2] `M202h` freeze: `band_12` and `anisocytosis` remain `unmapped` (out of scope, unchanged — confirms the smear vocabulary is closed, not a generic morphology-word scanner). Green on both trees.

### Implementation for User Story 2

- [X] T029 [US2] In `khanesh-server/rules/adapter.js`, add the `smear` channel: the closed vocabulary matcher (name-based, per FR-008a), the generic-header value scan, the `castValueState` presence decision (export it from `patterns_utils.js` — currently module-local per research R8/R13), and the page-kind gate (reuse `detectUrineOnlyPages`/the semen-page detection so smear rows are never read from a urine or semen page). Return `smear: SmearItem[]` from `runEngine()`. Route matched rows out of the generic `unmapped`/`qual` path (this must run **before** the existing `isQualitative`/`unmapped` fallthrough in the row loop).
- [X] T030 [US2] In `khanesh-server/rules/patterns_utils.js`, add the pure classifier `smearAxis(e, { exclude } = {})` per data-model.md §3: reads only `e.smear`, returns `null` or `{ urgency, items, leukemic }`, with the emergency/this_week/routine bands from data-model §3's table. No rule lookups inside this function (avoids the `patterns_utils` → `patterns_malignancy` import cycle noted in research R9).
- [X] T031 [US2] In `khanesh-server/rules/patterns_malignancy.js`, extend `acute_leukemia_suspicion`'s `build()` to append a smear clause when `smearAxis(e)?.leukemic.length > 0`, naming the blast % and/or Auer rods in Persian, with no diagnosis word beyond what the rule already says.
- [X] T032 [US2] In `khanesh-server/rules/patterns_leukocyte.js`, add `peripheral_smear_findings`: a module-local `firesById(e, id)` helper searching `RULES_MALIGNANCY` (imported) for `acute_leukemia_suspicion`'s live `match`; if it fires, call `smearAxis(e, { exclude: "leukemic" })`, else `smearAxis(e)`. The rule fires iff the result is non-`null`. Set `always_show: true` and a one-line `brief`; `must_say` carries no timeline (N20 — the sentence explains, `action` and `general_recommendations`'s `pickFinalAction()` carry the instruction). Write every Persian string per data-model §4's urgency table, with no Latin words outside `ALLOWED_TEST_NAMES` (M38).
- [X] T033 [US2] Wire `RULES_LEUKOCYTE`'s addition into `khanesh-server/rules/patterns.js` if not already exported from T019 (single spread point; confirm `peripheral_smear_findings` and the four count rules are all present in `RULES`).
- [X] T034 [US2] Run `M202`–`M202h` on the tree (green) and on `pre009/` (per each task's red-before note). Quote the counts. Run the full rule-id diff against `ids-before.txt` (T001): expect exactly `+monocytosis, +monocytopenia, +eosinophilia, +basophilia, +peripheral_smear_findings` (144 → 149), nothing removed (constitution IV).

**Checkpoint**: US2 is shippable on top of US1. Blast/Auer-rod emergencies are visible; reactive and benign morphology flags are explained without raising urgency; the acute-leukaemia hand-off is exclusive.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T035 [P] In `khanesh-server/server.js`, add Auer rods, blast percentage, toxic granulation, Döhle bodies and Pelger-Huët/pseudo-Pelger-Huët as named examples in `OCR_PROMPT`, alongside the existing «Anisocytosis (+++)» line (FR-008b). Grep to confirm exactly one `OCR_PROMPT` definition changed (research R12).
- [X] T036 [P] In `khanesh-server/labmat-agents/` (or wherever `safeEngineOut` is built for the graph path — locate via grep for the existing `note`/`patient` deletions), delete `smear` from the copy handed to the graph, per contracts/engine-output.md's internal contract (N13). `USE_GRAPH` is off by default, but this must not be left to the default alone.
- [X] T037 Run `api-contract.test.js` and confirm it stays green with no smear rows in its fixtures (the contract tests exercise the empty-`smear`-array path, per contracts/engine-output.md).
- [X] T038 Run the full `npm test` in `khanesh-server/` and `npm run lint` in `khanesh/` (frontend is untouched but must still pass, per the pre-commit gate). Quote both results.
- [X] T039 Add `MEDICAL_RULES.md` entry `P56`, listing every new number (mono LLN 200, monocytosis 1000, hypereosinophilia 1500, blast emergency cutoff 20%) with the non-claim source line, plus the open questions from plan.md's "Decisions made in planning that the user may want to overrule" (relative monocytosis not a trigger, pseudo-Pelger urgency, spellings unverified against a real sheet, bands/myelocytes deferred).
- [X] T040 Update `CLAUDE.md`: the measured-baseline table (new row, tree = this feature's commit, RULES 149), the rule count in "Where a pattern lives", a new bullet under [File Structure](../../CLAUDE.md) for `patterns_leukocyte.js`, and the N18 hash from T008 if not already appended.
- [ ] T041 Collect every new Persian string introduced in Phases 3–4 (the 5 findings' `headline`/`must_say`/`action`/`brief`, plus the `acute_leukemia_suspicion` smear clause) into the task report and show them to the user verbatim for approval (FR-011), before any commit.
- [ ] T042 After user approval, run `code-reviewer` and `eval-medical-reviewer` (two rounds — per note.md, "every round has found something the previous fix introduced"). Fix any blocking finding with its own red-before-the-fix guard, then re-run both agents on the fix hunks.
- [X] T043 Run `specs/009-leukocyte-differential-rules/probe.mjs` one final time and confirm its output equals the quickstart §2 table exactly (including the T002/T024 additions). Save as `probe-after.txt`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **BLOCKS both user stories** — the coverage-net fix must land and be
  verified in isolation before either story's rules can be trusted not to introduce a new instance of the same defect.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of User Story 2 — no shared files beyond
  `patterns_leukocyte.js` and `patterns.js` (both additive).
- **User Story 2 (Phase 4)**: Depends on Foundational. Can start in parallel with Phase 3 by a second developer, but
  both add rules to the same new file (`patterns_leukocyte.js`) and the same `patterns.js` import line — coordinate
  before editing, or do Phase 3 then Phase 4 sequentially (recommended for a single session, per the file-conflict
  note in the Notes section).
- **Polish (Phase 5)**: Depends on both user stories being complete.

### Within Each Phase

- Tests (marked, written first) must be red on `pre009/` before their implementation task.
- `refs.js`/`patterns_utils.js` constants before the rules that use them.
- Rule implementation before the rule is spread into `RULES` in `patterns.js`.
- Implementation before the "run tests, quote counts" verification task.

### Parallel Opportunities

- T001–T004 (Setup) can all run in parallel.
- T009–T014 (US1 tests) can be written in parallel; they touch only `engine.test.js` but as independent, non-overlapping test blocks.
- T021–T028 (US2 tests) can be written in parallel, same file, non-overlapping blocks.
- T015/T016 (US1 constants) can run in parallel with each other, not with T017/T018 (which use them).
- T035/T036 (Polish) can run in parallel.
- **Not parallel**: T017–T019 (same new file, sequential additions), T029–T033 (same reason), and any two tasks that
  both edit `patterns.js`'s `RULES` spread line.

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (different test blocks, same file — write sequentially in one editor session
# to avoid conflicting insertions, or split into a scratch file per test and merge):
Task: "M201 in khanesh-server/rules/engine.test.js — monocytosis two arms"
Task: "M201c in khanesh-server/rules/engine.test.js — monocytopenia three-way"
Task: "M201d in khanesh-server/rules/engine.test.js — eosinophilia two bands"
Task: "M201e in khanesh-server/rules/engine.test.js — basophilia + cml_suspicion hand-off"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (the coverage-net fix — this alone is worth shipping, since it is a real defect
   independent of the rest of the feature).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run the independent test (quickstart §2 mono/eos/baso rows), show the new Persian text,
   run both review agents.
5. Commit/demo if ready — this is a complete, shippable increment even without Story 2.

### Incremental Delivery

1. Setup + Foundational → coverage-net fix ready and independently valuable.
2. Add User Story 1 → validate independently → commit (MVP).
3. Add User Story 2 → validate independently → commit.
4. Polish (OCR prompt, docs, review) → final commit.

### Single-Session Strategy (this repo's usual mode — see CLAUDE.md Working Agreement)

Given the file-conflict notes above (`patterns_leukocyte.js` and `patterns.js` are touched by both stories), do
Phase 3 fully before starting Phase 4 in one session, rather than parallelizing — matches the "short prompt, long
unattended run" agreement and avoids merge friction within a single new file.

---

## Notes

- [P] tasks = different files, or non-overlapping regions of `engine.test.js` written independently and merged.
- [Story] label maps task to specific user story for traceability.
- Every task that adds or changes patient-facing text is subject to T041 (verbatim approval) before commit.
- Verify tests are red on `pre009/` before implementing (constitution IV) — this is not optional in this repo.
- The rule-id diff (T034) is the cheap, repo-standard detector for a silently-dropped or silently-duplicated rule
  (N16/N20) — run it, don't skip it because the individual tests passed.
- Commit only after Phase 5 (user approval + review agents), per this repo's `CLAUDE.md` — never mid-feature.
