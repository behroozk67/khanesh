# Tasks: Hemostasis & Coagulation Decision Rules

**Input**: Design documents from `specs/010-hemostasis-coagulation-rules/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/engine-output.md](contracts/engine-output.md), [quickstart.md](quickstart.md)

**Tests**: REQUIRED (constitution IV, FR-014). Every behaviour change needs a test that was **red on `e285030`**; every
"unchanged" claim needs a freeze test that is green on both trees. Tests go in `khanesh-server/rules/engine.test.js`
(numbered from `M247` to `M258`; re-check the last id at T003 because a concurrent session may have taken some) and `khanesh-server/api-contract.test.js` (`T32`). Persian comments, one test per behaviour.

**Conventions**:
- Run commands from `khanesh-server/` unless a task says otherwise.
- Persian text goes through Write/Edit or Bash only. Never PowerShell `Get-Content`/`Set-Content`/`Add-Content` (N15(d)).
- Every adopted number carries the source comment «تأییدِ کاربر؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم» (FR-009).
- No patient-facing string names a disease as the patient's (hemophilia, von Willebrand, DIC, TTP, HUS; FR-010).
- No new `emergency` path anywhere. No change to any bucket B/C item (D1–D5 sub-values, D7–D9, D11–D13; FR-007).
- Every new Persian string is printed verbatim in the final report for review (FR-011).

**Analyze remediation (2026-09-29)**: this file was amended after `/speckit-analyze` — new tasks T008 (server.js engine-path gate), T009 (OCR prompt sentence) and T037 (scan test M258); the inhibitor and vWF tasks are quote-only (no 0.5 BU, no 0.6); the factor bands take age; the ISTH tier excludes PLT < 50.

**Story map**: `US1` factor activity + inhibitor (spec Story 1) · `US2` vWF (spec Story 2) · `US3` held items visible in
P61 + freeze (spec Story 3) · `US4` ISTH lower tier (FR-015, from clarification Q1 = C) · `US5` PLT ≥ 1000 (FR-017, from D6 = B).
US4 and US5 came from the clarify session, not from a spec story, so they carry their own phase.

## Format: `- [ ] [ID] [P?] [Story] Description`

---

## Phase 1: Setup (baseline and evidence)

- [X] T001 Confirm `specs/010-hemostasis-coagulation-rules/ids-before.txt` (157 ids) still matches the live set: from `khanesh-server/` run `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"` and `diff` it against that file. If `HEAD` moved from `e285030`, regenerate both `ids-before.txt` and `probe-before.txt` and note the new commit.
- [X] T002 [P] Create the pre-change copy for red-first runs, per CLAUDE.md Commands: `git archive e285030 khanesh-server` into `<scratchpad>/pre010/`, then junction `node_modules` in (`mklink /J` from cmd, or `New-Item -ItemType Junction`). Confirm `node --test rules/engine.test.js` runs there.
- [X] T003 [P] Re-measure and record the baseline in the task report: `npm test` on the working tree (last measured `764 · 745 pass · 0 fail · 19 todo` at `e285030`; do not copy it) and the last `M`/`T` test id (`grep -oE 'test\("M[0-9]+' rules/engine.test.js | sort -V | tail -1`).
- [X] T004 [P] In `specs/010-hemostasis-coagulation-rules/probe.mjs` add the extra panels quickstart §2 needs and the ones the tests below use: `factor_only_fviii` (**a sheet whose only row is «Factor VIII Activity 0.5 %»** — nothing graded; analyze H1), `fix_neonate` (FIX 30 %, age 3 days; pass the age the way the M139/M140 tests do), `fviii_child` (FVIII 20 %, age 8 years), `isth_plt49` (PLT 45 · D-dimer 3 µg/mL · PT 12), `factor_vii` («Factor VII 40 %»), `factor_x`, `factor_v`, `bare_inhibitor_pos` («Inhibitor: Positive»), `inhib_num_noref` («FVIII Inhibitor 2.4 BU», no printed range), `inhib_num_ref` (same value with printed reference «<0.6»), `fviii_ref_printed` (FVIII 45 % with reference «50-150»), `fviii_31_noref`, `fviii_unitless` (FVIII 3, no unit), `fviii_normal_fix_normal_aptt_high`, `vwf_ratio_ok` (Ag 80 · RCo 75), `vwf_ract_only`, `vwf_noref` (Ag 25 · RCo 10, no printed range), `plt_999`, `plt_1000`, `isth_score5_ctrl` (PLT 70 · D-dimer 4.5 µg/mL · PT 14 with printed control 10 — scores 1+3+1 = 5 while `isDIC` stays false; D-dimer 5 µg/mL or PT > 15 would make `isDIC` true and hide the tier), `vwf_with_fviiic` (Ag 25 · RCo 10 · FVIII:C 40 %). Re-run and regenerate `probe-before.txt` from the **pre010 copy** (adjust the import path) so "before" is `e285030`, not the working tree.

---

## Phase 2: Foundational (blocking prerequisites)

The register comes first so every number used later already has an entry; the channel plumbing comes next because US1,
US2 and US4 all read it.

- [X] T005 Add `P61` to `MEDICAL_RULES.md` under "در انتظار بازبینی": one sub-entry per D1–D13 with the input's value and citation, the engine's value and source, why they differ, what the patient sees under each choice, and the recorded decision (D1–D4 kept, D5 = C, D6 = B, D10 = A, D13 excluded; D7, D8, D9, D11, D12 awaiting). Add open questions **61-a** (ADAMTS13 thresholds, adult TT), **61-b** (ISTH ≥ 5 without `isDIC`: `emergency` or stay `soon`), **61-c** (factor bands never `emergency`), **61-d** (the input's 0.5 BU inhibitor cut-off and 0.6 vWF ratio: **not in code**, quote-only per FR-021, awaiting your approval), **61-e** (observation: `isolated_thrombocytopenia` emits `"today"`, which is in no rank table, and says «سایر رده‌ها طبیعی» while D-dimer/PT are raised). List ROTEM/TEG and HPC/CD34 as **excluded, with reason**. Write it with the Edit tool (Persian). Verify: `node .claude/skills/clinical-knowledge-extraction/scripts/engine-inventory.mjs --search PLT` lists P61.
- [X] T006 In `khanesh-server/rules/units.js` add the printed-unit conversions from research R3 for the hemostasis keys: `%`, `IU/dL`, `U/dL` → ×1; `IU/mL`, `U/mL` → ×100; inhibitor `BU`, `BU/mL`, `Bethesda`. Put them in a table **outside** `SI_CONVERSIONS`/`UNIT_PROFILE` (the M177 lesson: an entry there sends unitless values into `decideUnit`). A missing or unrecognised unit returns `unitState: "unknown"|"unrecognised"`, never a guess.
- [X] T007 In `khanesh-server/rules/adapter.js` add the exact `NAME_MAP` spellings from research R4: `FVIII`, `FIX`, `VWF_AG`, `VWF_ACT`, `FVIII_INHIB`, `PT_CONTROL` (spellings: «PT Control», «Control PT», «Control (PT)», «PT Control Time», «Normal Control» **only** when the sheet also has a PT row; never the bare word «Control»), including the Persian forms with explicit digits (`فاکتور۸`, `فاکتور8`, `فاکتورهشت`, …). **Before adding, run `resolveAlias` on every neighbour** (`factorvii`, `factorv`, `factorx`, `factorxi`, `factorxii`, `factorxiii`, `factorii`, bare `inhibitor`) and record the result in `research.md`. Do not widen `resolveAlias`. Route the six keys into a new `hemostasis` side channel (shape in data-model.md) built like `smear`: not in `tests`, not in `qual`, never in `semenQual`. Parse each row's own `reference` with the existing `parseReference`. Pass the channel through `runEngine` next to `smear`. Do **not** send it to the model or the graph (N13).
- [X] T008 In `khanesh-server/server.js` (the legacy-fallback condition at about line 991) keep the engine path when the `hemostasis` channel is non-empty: add `&& !Object.keys(engineCandidate.hemostasis ?? {}).length` beside the existing `noRef`/`ownedUngraded` terms, and make sure `runEngine` returns `hemostasis` (T007). Update the comment in Persian in the style of the `noRef` comment above it (why: a factor-only sheet has nothing graded, and the legacy path lets the model judge severity — N18 recurrence, FR-019). Verify: the `factor_only_fviii` probe panel takes the engine path and produces `factor_activity` (the log line «برگشت به مسیر قدیم» is absent).
- [X] T009 In `khanesh-server/server.js` `OCR_PROMPT` (about lines 317–340), next to the existing smear-row instruction, add one Persian extraction-only sentence asking to record rows for Factor VIII / Factor IX activity, vWF antigen / activity, inhibitor (Bethesda) and PT control time verbatim with name, value and unit (FR-022). Extraction only, no interpretation. Print the sentence verbatim in the report. Verify: the prompt-related tests (`M26`, any test that reads `OCR_PROMPT`) still pass.
- [X] T010 [P] In `khanesh-server/rules/adapter.js` implement the inhibitor reading (research R6, **quote-only, FR-021**): text values match the **whole** value against `positive|detected|present|مثبت` (positive) / `negative|not detected|undetected|non-detected|nondetected|absent|nil|منفی|یافت نشد` (negative); anything else, including `+/-`, weak, borderline, equivocal → `unknown`. `undetected` must not match `detected`. A numeric titre with a BU unit keeps its number and unit and gets a verdict **only** if the row prints its own reference (parsed with `parseReference`); with no printed reference it is `unknown`. **Do not** write 0.5 or any other inhibitor cut-off anywhere in code.
- [X] T011 [P] In `khanesh-server/rules/names.js` add the six `FA_NAMES` entries from data-model.md. `M32` must still pass (it sweeps `refs`/`CLASSIFIERS`/`CTCAE_MAP` keys; the new keys are outside those tables, so also add them to the explicit key list the test uses, if it has one).
- [X] T012 [P] In `khanesh-server/rules/patterns_utils.js` add `factorBand(pct, printedRef, age)` exactly as data-model.md defines it: age under 16 or neonatal → `paediatric` (no comparison, FR-020); otherwise `< 1` severe, `≤ 5` moderate, `≤ 30` mild, below printed low → reduced, at/above printed low → inRange, no printed range and `> 30` → notJudged. It is the **only** place these comparisons exist (FR-018). Source comment on the constants.
- [X] T013 `M247` and `M248` in `khanesh-server/rules/engine.test.js`. **M247** (spelling sweep): every row of the research R4 table maps where it says; `Factor V/VII/X/XI/XII/XIII/II` and bare «Inhibitor» stay in `unmapped`; Persian digit forms map. **M248** (units): `0.01 IU/mL` bands identically to `1 %`; unitless → `unitState: "unknown"`, value quoted and not banded; inhibitor 12 spellings incl. «Undetected», «Non-detected», «منفی», `+/-`. Run both on the pre010 copy: they must be **red** there (the keys do not exist); record the failure lines.
- [X] T014 `M249` in `khanesh-server/rules/engine.test.js`: `factorBand` at 0.99, 1, 5, 5.5, 30, 30.5, 31 (FR-018), each with a printed-range and a no-range arm; plus the age arms: age 25 bands normally; age 8 years and age 3 days return `paediatric` for every value including 30 % (FR-020). Red on pre010 (function does not exist), green after T012.
- [X] T015 Run `npm test`. Expected: fail 0 except M247/M248/M249 turning green; no other test changes. Regenerate `probe` output and confirm the only diffs are the six keys leaving `unmapped`.

**Checkpoint**: the six keys are read and unit-safe; nothing yet fires a finding.

---

## Phase 3: User Story 1 — Factor activity and inhibitor (Priority: P1) 🎯 MVP

**Goal**: FVIII/FIX/inhibitor values are never dropped and never answered with "normal".

**Independent Test**: the quickstart §2 rows `fviii_05`, `fviii_3_aptt`, `fviii_iu`, `fix_40`, `fa_8`, `inhib`, `factor_only_fviii` and `fix_neonate` behave as listed; `inhib_neg` (bare «Inhibitor») stays unmapped.

- [X] T016 [US1] Create `khanesh-server/rules/patterns_hemostasis.js` exporting `RULES_HEMOSTASIS` with `factor_activity` and `factor_inhibitor`:
  - `factor_activity` fires on FVIII or FIX in the channel, for **every** band and unit state (so `findings.length > 0` and the canned normal result is never reached).
  - Urgency comes from one computed band value (R8): severe/moderate → `this_week`; mild/reduced/inRange/notJudged/unknown-unit/`paediatric` → `routine`; an inhibitor that is positive, or that has no possible verdict (FR-021), → `this_week`.
  - The `action` sentence is derived from that urgency via `actionFor(...)` (N20).
  - Text is three-way for: below / inside printed range / not printed; unit unknown → quote the value and say the unit is missing; APTT raised / normal / not measured (N21); FVIII vs FIX both measured (a normal one argues against the other's implication).
  - No disease name (FR-010): «الگوی … که نیاز به ارزیابی هماتولوژیست دارد».
  - `factor_inhibitor` fires only when the inhibitor is present and `factor_activity` does **not** fire; otherwise the sentence is folded into `factor_activity` (one owner). Its verdict comes only from a closed-list word or the row's own printed reference (T010).
  - Under 16 years or on a neonatal age: quote the value, no band, say a paediatric source is needed, `routine` (FR-020). Unknown age: adult bands, and the text says the age was not on the sheet (I3).
  - **FVIII ownership (I2):** when any `VWF_AG`/`VWF_ACT` value is in the channel, `factor_activity` stands down for `FVIII` (the `FVIII:C` of a vWF work-up) and `vwf_panel` quotes it with no hemophilia band; FIX is still covered by `factor_activity`. The stand-down asks whether `vwf_panel` actually fires, never restates its condition.
  - List every channel key the rules read in `explains` so they leave «تفسیر نشدند».
- [X] T017 [US1] In `khanesh-server/rules/patterns.js` import `RULES_HEMOSTASIS` and spread it into `RULES` (file order: after `RULES_LEUKOCYTE`). Check `M36` (no holes, unique ids) passes.
- [X] T018 [US1] `M251` in `khanesh-server/rules/engine.test.js`: a factor-only sheet (`fviii_05`, `fix_40`, `fviii_iu`, `fa_8`, `fviii_unitless`, `fviii_31_noref`) produces `factor_activity`, no `unexplained_abnormal`, and the row is absent from `unmapped`; the unitless arm is quoted but not banded; a printed-range-inside arm says no bleeding-disorder wording. Arm **M251b**: `fix_neonate` and `fviii_child` are quoted with no band, `routine`, and the text asks for a paediatric source. Arm **M251c**: `inhib_num_noref` is quoted with no verdict at `this_week`; `inhib_num_ref` takes its verdict from the printed reference. Red on pre010 (no finding at all).
- [X] T019 [US1] `M252` (N21): FVIII 60 % and FIX 70 % printed with APTT 68 → `coagulation_abnormal` still fires and owns the APTT; the factor finding says both factors were measured and are not low. This test is red on pre010 only through its second assertion (the factor finding's sentence), so write that assertion first; also red-check the mirror arm (FVIII 3 % + APTT 68) in T021.
- [X] T020 [P] [US1] `T32` in `khanesh-server/api-contract.test.js`, two arms. **Arm 1**: post a sheet with `Factor VIII Activity 0.5 %` and `Hb 14`; assert the response is **not** the canned normal result, `_engine.patterns` contains `factor_activity`, and no raw key (`FVIII`) appears in any patient string (N8). **Arm 2 (FR-019)**: post a sheet whose **only** row is `Factor VIII Activity 0.5 %`; assert `_engine` is present (engine path, not legacy) and `factor_activity` is in `_engine.patterns`. Arm 2 is red on pre010 because the sheet takes the legacy path. Run with the OCR call injected the way the other T-tests do.
- [X] T021 [US1] Hand-off with `coagulation_abnormal` (research R8): add `factorOwnsAptt(e)` to `khanesh-server/rules/patterns_utils.js`. It calls the live `factor_activity` rule (never restates its condition) and is true only when the only abnormal coagulation value is APTT. Add `!factorOwnsAptt(e)` to `coagulation_abnormal.match` in `khanesh-server/rules/patterns_hematology.js`. Move into `factor_activity`'s text the APTT number, both of `coagulation_abnormal`'s warnings (no aspirin/NSAID; unusual bleeding → same day) and its "tell the doctor your medicines" sentence (M155 inventory).
- [X] T022 [US1] `M254` in `khanesh-server/rules/engine.test.js`: two-sided sweep over 6 panels (FVIII low + APTT high; FVIII low + APTT + PT high; FVIII low + APTT normal; FVIII normal + APTT high; no factor + APTT high; FIX low + APTT high). On each, **exactly one** of `factor_activity`/`coagulation_abnormal` owns the APTT; assert it fails both when a panel falls between them and when two claim it; assert both warnings present when the factor finding owns it; assert the no-factor panels' full output equals the pre010 output (hash). Also assert at least 5 owner findings were reached (N15 meaningless-green guard).
- [X] T023 [US1] Run `npm test`. Expect fail 0. Compare `probe` output with the quickstart §2 table for the US1 rows.

**Checkpoint**: US1 alone is a shippable MVP: the N2 hole for factor values is closed.

---

## Phase 4: User Story 2 — von Willebrand values (Priority: P2)

**Goal**: vWF antigen/activity are read with a three-way state and a quoted ratio; no subtype is named (D12 deferred).

**Independent Test**: `vwf`, `vwf_ag`, `vwf_ratio_ok`, `vwf_ract_only` probe rows.

- [X] T024 [P] [US2] Add `vwfRatio(hemostasis)` to `khanesh-server/rules/patterns_utils.js`: `VWF_ACT / VWF_AG` only when both are `unitState: "ok"`; otherwise `null` plus the reason (`partner_missing`, `unit_unknown`).
- [X] T025 [US2] Add `vwf_panel` to `khanesh-server/rules/patterns_hemostasis.js` (research R7, FR-021): fires on either value. Urgency is `this_week` if a value is below its own printed range **or** cannot be judged (no range printed); `routine` only when every printed value is inside its own range. The ratio is **quoted only** — no comparison with 0.6 or any other number, and the text says a hematologist interprets the pair. Missing partner → «… روی برگهٔ شما نیست» plus the missing test as a suggestion (N4). FVIII:C on the same panel is read from the `FVIII` key via the helper so `RULE_READS` does not double-count. No subtype name and no "low vWF 30–50" category. Register its keys in `explains`. It also owns FVIII when a vWF value is on the sheet (I2): the FVIII number is quoted here with no severity band.
- [X] T026 [US2] `M253` in `khanesh-server/rules/engine.test.js`: Ag 25 + RCo 10 with no printed range (`vwf_noref`: ratio 0.4 quoted, no threshold sentence, `this_week`, no subtype word), Ag alone (partner missing, suggestion present), Ag 80 + RCo 75 with printed ranges they sit inside (`routine`, no bleeding-disorder wording), RCo alone, unitless arm (quoted, not banded). Add `vwf_with_fviiic` and assert exactly one of `factor_activity`/`vwf_panel` speaks about FVIII (two-sided, N20), with no hemophilia band on it. Add one panel with platelets low + vWF low and assert no rival timeline between the two findings (N20). Red on pre010.
- [X] T027 [US2] Run `npm test`; expect fail 0.

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 — Held items are visible, engine unchanged (Priority: P1)

**Goal**: SC-002 and SC-004: everything that was not applied is provably unchanged and written down.

**Independent Test**: rule-id diff is additions only; the freeze test hashes match `e285030`.

- [X] T028 [US3] `M257` in `khanesh-server/rules/engine.test.js`: freeze. For every panel in `probe-before.txt` that has **no** new analyte, no `PLT ≥ 1000` and not the `50 ≤ PLT < 100 ∧ D-dimer > 400 ∧ !isDIC` combination (e.g. `plt_450`, `dic_emerg`, `isth5_no_dic`, `isth_plt49`, `tt`, `tt_abbr`, `adamts`, `pt_ctrl` minus the control row) assert the full `runPatterns` output hash equals the value recorded from the pre010 copy. Also assert `ADULT_REFS.PT/APTT/DDIMER/PLT` and the paediatric `TT` row are byte-identical (D1–D4, D9). Must be green on **both** trees by design; say so in the test comment.
- [X] T029 [P] [US3] Add the four rule ids and the (unchanged) other ids to a check: `diff specs/010-hemostasis-coagulation-rules/ids-before.txt <(new ids)` shows only `>` lines: `dic_isth_score`, `factor_activity`, `factor_inhibitor`, `vwf_panel`. Any `<` line is a failure (N16). Record the output in the task report.
- [X] T030 [US3] Confirm every D-item in `MEDICAL_RULES.md` P61 has the fields SC-004 lists (input value, engine value, reason, patient effect either way, decision). Fix gaps with Edit.

---

## Phase 6: User Story 4 — ISTH lower tier (Priority: P2, from Q1 = C)

**Goal**: FR-015: an ISTH-scored `soon` tier beside `dic_pattern`, which does not change.

**Independent Test**: `isth_nonovert` gains `dic_isth_score:soon`; `dic_emerg`, `isth5_no_dic` and `isth_plt49` are identical to before.

- [X] T031 [US4] Add `isthScore(e)` to `khanesh-server/rules/patterns_utils.js` per research R5: PLT (≥100→0, 50–99→1, <50→2), D-dimer in ng/mL (≤400→0, 400–4000→2, >4000→3), PT (needs `PT_CONTROL` in the channel: diff <3→0, 3–<6→1, ≥6→2; no control → `null`, never 0, never replaced by INR), FIB (≥100→0, <100→1). Absent analyte → `null`; `total` sums non-null; return `missing[]`. Source comment on every constant. Do **not** touch `isDIC`, `ADULT_REFS.DDIMER` or `ADULT_REFS.FIB`.
- [X] T032 [US4] Add `dic_isth_score` to `khanesh-server/rules/patterns_hematology.js`, directly after `dic_pattern`: `match` = `!isDIC(e)` ∧ **50 ≤ PLT graded < 100** ∧ D-dimer > 400 ng/mL (PLT < 50 stays with `severe_thrombocytopenia`; analyze H2). Urgency `soon`, action «تکرار در ۲۴ تا ۴۸ ساعت» derived from that urgency. Text quotes the components, names missing ones, states the entry requirement sentence from research R5 (underlying disease; diagnosis is the doctor's), and says «meets the ISTH overt threshold» when the total ≥ 5 while keeping `soon` (61-b). No `blocks_others`. Add the co-firing findings' warnings' equivalents if they would otherwise be the only place a bleeding warning appears (check `M187`/`M240` do not change).
- [X] T033 [US4] `M250` (isthScore components incl. PT without control = `null`, PT 14 with control 10 = 1, all-absent = `total 0` with all four in `missing`, PLT 45 scores 2) and `M255` (fires on `isth_nonovert` and `isth_score5_ctrl`; **does not** fire on `dic_emerg`, `isth5_no_dic`, `isth_plt49`, `plt_450`; the final recommendation is the tier's single action; no co-firing `must_say` carries a timeline; `possible_DIC` output byte-identical). Red on pre010.
- [X] T034 [US4] Run `npm test`; confirm `M86d`, the DIC tests, `M162`, `M187`, `M191`, `M240` are unchanged and green.

---

## Phase 7: User Story 5 — Platelets ≥ 1000 (Priority: P3, from D6 = B)

**Goal**: FR-017: a count of a million no longer gets the routine "usually reactive" wording.

**Independent Test**: `plt_1200`, `plt_1000` → `thrombocytosis:this_week`; `plt_450`, `plt_999` unchanged.

- [X] T035 [US5] In `khanesh-server/rules/patterns_hematology.js` change **only** `thrombocytosis.build`: `const extreme = p.value >= 1000` (K/µL, source line); `extreme` → urgency `this_week`, action derived from it, new `must_say` that does not call the rise mostly reactive without also saying a count this high needs a doctor's assessment, plus a warning (bleeding or clot symptoms → same day). Non-extreme output stays the current object, byte for byte. `match` is untouched. Do not touch `thrombocytopenia`/`severe_thrombocytopenia` and do not use the label «ITP».
- [X] T036 [US5] `M256` in `khanesh-server/rules/engine.test.js`: PLT 1000 and 1200 → `this_week`; PLT 999 and 500 → full output hash equals the pre010 output; raw `1,200,000 /µL` normalises to 1200 → extreme. Red on pre010 for the ≥ 1000 arm.


---

## Phase 8: Polish and cross-cutting

- [X] T037 `M258` in `khanesh-server/rules/engine.test.js` (FR-010, SC-005): run the whole new probe set (every panel that fires `factor_activity`, `factor_inhibitor`, `vwf_panel`, `dic_isth_score` or the PLT ≥ 1000 branch, across all bands, both ages and all unit states), collect every string the findings contain (`headline`, `must_say`, `action`, `warnings`, `suggest`, `brief`), and fail on (a) a disease name used as the patient's diagnosis — «هموفیلی», «فون ویلبراند», «TTP», «HUS», «DIC», «لخته‌شدگی منتشر» — unless it appears only in a negation or a "can be one of the causes" clause that the test lists explicitly, and (b) any raw engine key (`FVIII`, `FIX`, `VWF_AG`, `VWF_ACT`, `FVIII_INHIB`, `PT_CONTROL`). The test first asserts that at least 12 distinct panels were reached (N15 meaningless-green guard). Red on pre010 is not possible (no strings exist); state so in the test comment, and prove it can fail by feeding it one deliberately bad string in a temp copy.
- [X] T038 Red-first proof (N10): copy the final `engine.test.js` and `api-contract.test.js` into the pre010 tree and run. Record which of M247–M256, M258 and T32 fail there (expected: all except M256's 999/500 arm and M257, which pass by design; T32 arm 2 must fail because of the legacy path). Any new test that is green on pre010 and is not a designed freeze is removed or fixed.
- [X] T039 Print every new patient-facing Persian string verbatim (headlines, `must_say`, `action`, `warnings`, `suggest`, the six `FA_NAMES`) in the task report for review. Run `M37` and `M38` (encoding and language).
- [X] T040 Final measurement, all from `khanesh-server/`: `npm test` (fail 0; state the tree and the numbers), the probe diff against the quickstart §2 table (`node ../specs/010-hemostasis-coagulation-rules/probe.mjs > ../specs/010-hemostasis-coagulation-rules/probe-after.txt`), the rule-id diff (four `>` lines, no `<`), and `npm run lint` in `khanesh/` (unaffected, run for the gate).
- [X] T041 Update `CLAUDE.md`: add `patterns_hemostasis.js` to the File Structure block with its one-line description; re-measure and update the rule count text ("Where a pattern lives") with the `node -e` one-liner; add this commit's hash to the **N2** entry (an unmapped bleeding-disorder value read as normal; measured in research R1). Do not add an entry for mistakes whose only cost was effort.
- [X] T042 Update the spec status line in `spec.md` and tick the checklist: mark T-items done in this file. Do **not** commit or push unless asked.

---

## Dependencies and order

- Phase 1 → Phase 2 → US1. US2, US4 and US5 depend only on Phase 2 (US4 also reads the channel for the PT control).
- US3 (freeze + register check) runs after US1, US2, US4, US5 are built, because it proves nothing changed by accident.
- Phase 8 last.
- Within a phase: tests that need a helper wait for that helper; tasks marked [P] touch different files.

**Parallel opportunities**: T002/T003/T004; T010/T011/T012; T020 with T018/T019; T024 with T016–T018; US2, US4 and US5 can be built in parallel after Phase 2 (different rules; `patterns_hematology.js` is touched by T021, T032 and T035, so take those three in sequence).

## Implementation strategy

1. **MVP = Phase 1 + Phase 2 + US1** (T001–T023). That closes the measured N2 hole (a sheet with a factor value gets the normal result) with the smallest surface. Stop there if time is short and ship.
2. Add US2, then US4 and US5 in any order.
3. US3 and Phase 8 close the work; nothing is reported "done" before T040's real output is quoted.
4. Held items (D7–D9, D11, D12, 61-a…61-e) stay in P61; do not implement them without a recorded answer.
