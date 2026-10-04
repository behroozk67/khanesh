# Tasks: Prenatal Serum Screening (Double / Quad Marker)

**Input**: `specs/013-prenatal-serum-screening/` — plan.md, spec.md, research.md, data-model.md, contracts/engine-prenatal.md, quickstart.md

**Tests**: REQUIRED. FR-015 and constitution principle IV: every behavioural test must be shown failing on the pre-change tree. All new tests go in `khanesh-server/rules/prenatal.test.js` (ids `PN01…`), not `engine.test.js`.

**Red-before recipe** (used by every "verify red" step): `git archive HEAD khanesh-server | tar -x -C <tmp>`, junction `node_modules` (`New-Item -ItemType Junction <tmp>/khanesh-server/node_modules -Target <repo>/khanesh-server/node_modules`), copy only `rules/prenatal.test.js` in, run `node --test rules/prenatal.test.js`, and record the fail count. Never append Persian with PowerShell cmdlets (N15(d)); use Edit/Write.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 double marker · US2 quad marker · US3 dating validity · US4 printed risk and confounders · US5 never-normal sweep

---

## Phase 1: Setup

- [X] T001 Measure the baseline: run `npm test` in `khanesh-server/` on the working tree and record `tests · pass · fail`, naming the tree (branch + `git rev-parse --short HEAD` + "dirty"). Record the rule count with `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.length))"` and save the sorted id list to the scratchpad for the N16 diff in T040. Write the numbers into `specs/013-prenatal-serum-screening/research.md` under a new "Baseline" heading.
- [X] T002 Collect real sheet spellings. Ask the user for photos/OCR text of real Iranian double- and quad-marker sheets, or run the `research` agent. Record every printed spelling (English + Persian, e.g. «Free β-hCG», «F-βhCG», «PAPP-A», «پاپ‌اِی», «uE3», «Unconjugated Estriol», «Inhibin-A», «NT», «Nuchal Translucency», «Risk T21», «Down Syndrome Risk», «MSAFP») with units and how risk/GA/dating rows are printed, in `specs/013-prenatal-serum-screening/research.md` under "Sheet spellings". If none can be obtained, write that explicitly and use only the starting set from the plan (N2: no invented spellings presented as real).
- [X] T003 Create `khanesh-server/rules/prenatal.test.js` with the `run(tests, patient)` helper copied from `rules/serology.test.js` (imports `runEngine`, `runPatterns`, `RULES`, `SUGGEST_TESTS`, `FA_NAMES`), a `PREG_F = { sex: "F", age: 30, pregnant: true }` profile, and no tests yet.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the channel, the identity claim, the stand-down of the old readers, and the routing gate. Until this phase is done, no prenatal rule can read anything.

- [X] T004 Write test `PN01` (P13 in quickstart) in `khanesh-server/rules/prenatal.test.js`: profile `PREG_F`, rows AFP 35 IU/mL · «Estriol (uE3)» 4.1 nmol/L · «Total hCG» 29000 mIU/mL · «Inhibin-A» 179 pg/mL. Assert `tumor_markers_result` and `hcg_result` are **not** in fired patterns, and `e.prenatal.markers` holds `AFP_MAT`, `UE3`, `HCG_TOT`, `INHA`. Verify red on HEAD (measured today: both wrong findings fire).
- [X] T005 [P] Write freeze test `PN02` in `khanesh-server/rules/prenatal.test.js`: for the existing single-analyte panels «AFP 35 ng/mL» (tumour marker), «Beta HCG 25000 mIU/mL», «hCG positive», «AFP 12 IU/mL + CEA 3» with no companion and no MoM, assert the fired patterns and `findings` text are byte-identical to a hash captured on HEAD before any change (sha256 of `JSON.stringify(findings)`; compute the hashes on HEAD and paste them in as constants). This must stay green before and after (negative control for the D2 claim).
- [X] T006 Add the `prenatal` channel to the adapter in `khanesh-server/rules/adapter.js`. Add a two-pass claim inside `ocrToEngineInput`, placed **before** the generic `if (/^mom$/i.test(...)) { unmapped.push … }` branch and before `NAME_MAP` lookup:
  - **Pass 1** marks the sheet "prenatal" if any row's normalised name is a strong screening name (free β-hCG, PAPP-A, uE3/unconjugated estriol, Inhibin A, NT/nuchal translucency, a «risk … trisomy/T21/T18/T13/NTD» row) or any row has a `MoM` unit.
  - **Pass 2** claims strong names always. It claims weak names (AFP, hCG/total hCG/β-hCG, estriol) only when the sheet is prenatal or that row's unit is MoM.
  - Each claimed row becomes an `Item {key, raw, mom, value, unit, claimed_by}` under `prenatal.markers[KEY]`, with keys `FBHCG`, `PAPPA`, `NT`, `AFP_MAT`, `UE3`, `HCG_TOT`, `INHA`. Never use `AFP` or `HCG`.
  - Risk rows become `prenatal.risk[T21|T18|T13|NTD] = {raw, denominator, category}`, where category comes from printed words (high/low/screen positive/negative/پرخطر/کم‌خطر).
  - Printed gestational age and dating basis go to `prenatal.dating`.
  - MoM parsing reuses `commaToDot` and Persian-digit normalisation.
  - Duplicates follow the hemostasis rule (first wins; a conflicting second value goes to `unmapped`).
  - Use the spellings from T002.
- [X] T007 Forward `prenatal` from `runEngine` to the engine output in `khanesh-server/rules/adapter.js`, exactly as `hemostasis` is forwarded (next to the `hemostasis,` line in the return object). In `khanesh-server/server.js`, also strip it from the payload sent to the model and to the graph path, as is done for `hemostasis: undefined` (N13).
- [X] T008 Add `FA_NAMES` entries in `khanesh-server/rules/names.js` for `FBHCG` «بتا اچ‌سی‌جیِ آزاد», `PAPPA` «PAPP-A (پروتئینِ پلاسماییِ وابسته به بارداری)», `NT` «ضخامتِ پشتِ گردنِ جنین (NT)», `AFP_MAT` «آلفافتوپروتئینِ سرمِ مادر», `UE3` «استریولِ غیرکونژوگه (uE3)», `HCG_TOT` «اچ‌سی‌جیِ کلِ سرمِ مادر», `INHA` «اینهیبین A». Show the user these strings verbatim before commit (global CLAUDE.md: user-facing strings).
- [X] T009 Add a `hasPrenatal` term to the fallback gate in `khanesh-server/server.js` (next to `hasHemostasis`, ~line 1138), so that a sheet whose only recognised rows are prenatal stays on the engine path and does not reach `buildUninterpretedResult`/the legacy path. Add test `T52` in `khanesh-server/api-contract.test.js`: a MoM-only double-marker request returns `_engine` with a `prenatal_*` pattern. Verify red on HEAD.
- [X] T010 Create `khanesh-server/rules/patterns_prenatal.js` with an empty `RULES_PRENATAL` export and shared helpers:
  - `present(e,key)`, `mom(e,key)`.
  - `missingFa(e, keys)`: names the absent markers in Persian, three-way present/printed-unreadable/absent (N4).
  - `SCREENING_LINE`: the constant «این نتیجهٔ غربالگری است، نه تشخیص.»
  - `actionFor(urgency)`: derives the action sentence from urgency; the only place timelines are written (N20).
  - `prenatalOwns(e, key)`: the single ownership helper the isolated rules call.

  Import and spread `RULES_PRENATAL` into `RULES` in `khanesh-server/rules/patterns.js`. Confirm with the rule-count one-liner that the file is wired (N1).
- [X] T011 Write test `PN03` in `khanesh-server/rules/prenatal.test.js`: every prenatal key (`FBHCG`…`INHA`) has an `FA_NAMES` entry, and for any panel holding prenatal markers that no rule reads, the key appears in `_engine.uncovered`/«تفسیر نشدند» by Persian name, never dropped (N18/N28). Verify red before T010 is wired.

**Checkpoint**: PN01, PN02, PN03 and T52 pass, and `npm test` shows no newly failing test against T001.

---

## Phase 3: User Story 1 — First-trimester double marker (P1) 🎯 MVP

**Goal**: free β-hCG / PAPP-A / NT in MoM produce a correct screening finding, never a diagnosis.

**Independent test**: panels P1, P2, P9 (quickstart) through `run()`; check fired ids, urgency, and missing-marker sentences.

### Tests (write first, verify red)

- [X] T012 [P] [US1] `PN10` in `khanesh-server/rules/prenatal.test.js`: FBHCG 1.8 MoM · PAPPA 0.3 MoM · NT 3.2 mm. Expect `prenatal_t21_pattern_fts` (`this_week`) + `prenatal_nt_raised` (`this_week`). Text contains `SCREENING_LINE`, «مشاورهٔ ژنتیک», and CVS or amniocentesis with microarray; it contains no «دارید»/«مبتلا». Exactly one action timeline across the two findings.
- [X] T013 [P] [US1] `PN11`: PAPPA 0.35 MoM alone. Expect `prenatal_papp_a_low` (`routine`), with no aspirin and no growth/BP-protocol sentence (pending). The text names FBHCG and NT as «روی برگه نیست» and never «طبیعی».
- [X] T014 [P] [US1] `PN12`: boundaries. FBHCG exactly 1.5, PAPPA exactly 0.5, NT exactly 3.0 fire **no** `t21_fts`; NT exactly 3.0 **does** fire `prenatal_nt_raised` (source: "≥ 3.0"); PAPPA exactly 0.4 fires no `papp_a_low` (source: "< 0.4").
- [X] T015 [P] [US1] `PN13`: FBHCG 40 IU/L only. Expect `prenatal_concentration_unread`, nothing graded, no `hcg_result`.

### Implementation

- [X] T016 [US1] Implement `firstTrimesterAxis(e)` in `khanesh-server/rules/patterns_prenatal.js`. It returns `"t21_fts"` iff FBHCG > 1.5 ∧ PAPPA < 0.5 ∧ (NT ≥ 3.0 mm or NT printed as raised/≥ 99th centile); otherwise `null`. No T18/T13/Turner/triploid label (pending; data-model.md).
- [X] T017 [US1] Add rule `prenatal_t21_pattern_fts` (`this_week`) to `patterns_prenatal.js`:
  - `match` reads the axis.
  - `must_say` quotes each MoM as printed and names the pattern as «الگویی شبیه به الگوی سندرم داون در غربالگری».
  - It says the result is not a diagnosis (`SCREENING_LINE`) and that the definitive answer comes from CVS (10–13 weeks) or amniocentesis (from week 15) with microarray, or cell-free DNA as the counsellor advises.
  - `suggest` holds «مشاورهٔ ژنتیک».
- [X] T018 [US1] Add rule `prenatal_nt_raised` (`this_week`) to `patterns_prenatal.js`:
  - Fires on NT ≥ 3.0 mm independent of any label or risk (FR-006).
  - Text covers: diagnostic offer with microarray, detailed anatomy scan at 18–22 weeks, and fetal echocardiography at 16–22 weeks.
  - States that a raised NT needs evaluation even with a normal chromosome result.
  - When both NT and `t21_fts` fire, only one carries the action (hand-off via `prenatalOwns`) — N20.
- [X] T019 [US1] Add rule `prenatal_papp_a_low` (`routine`) to `patterns_prenatal.js`:
  - Fires on PAPPA < 0.4 when the axis is not `t21_fts`.
  - Text states the ✅ associations only (preterm birth, fetal growth restriction, pregnancy hypertension/pre-eclampsia, fetal loss) as association, not prediction; says it is not a chromosome result; says a normal ultrasound does not remove the risk.
  - Generic follow-up: «با متخصص زنان در میان بگذارید».
  - No aspirin; no serial-growth protocol.
- [X] T020 [US1] Add rule `prenatal_concentration_unread` (`routine`) to `patterns_prenatal.js`: for any claimed marker with `value` and no `mom`/risk, one sentence per marker: «… روی برگهٔ شما {raw} است؛ این عدد فقط به‌صورتِ MoM یا خطرِ محاسبه‌شده توسطِ آزمایشگاه معنا دارد و اینجا ارزیابی نمی‌شود.» (Q6).
- [X] T021 [US1] Add `SUGGEST_TESTS` rows in `khanesh-server/rules/patterns.js` for every suggestion string the new rules use (e.g. «سونوگرافیِ دقیقِ آناتومی» and «اکوکاردیوگرافیِ جنین» → []; «غربالگریِ سه‌ماههٔ اول» → `["FBHCG","PAPPA"]`). Exact-string match (N8), so the sheet never "re-requests" a marker it printed. Add any non-lab item to `NON_LAB` in `phraseSuggestion` so it is not wrapped as «درخواست آزمایش … از پزشک» (N8, M306).

**Checkpoint**: PN10–PN13 green; red-before recorded.

---

## Phase 4: User Story 2 — Second-trimester quad and NTD (P1)

**Goal**: the quad markers and the NTD arm produce correct findings.

**Independent test**: quickstart panels P3, P4, P8, P13.

### Tests

- [X] T022 [P] [US2] `PN20`: AFP_MAT 3.1 MoM · UE3 1.0 · INHA 1.2, GA 17w. Expect `prenatal_ntd_afp` (`this_week`). Text says most raised AFP is **not** a neural-tube defect; the first steps are confirming gestational age, then a targeted ultrasound, then possibly amniocentesis with AFP and acetylcholinesterase. It names the non-defect causes (dating error, twins, fetal death, abdominal-wall defect, placenta).
- [X] T023 [P] [US2] `PN21`: UE3 0.08 MoM. Expect `prenatal_ue3_very_low` (`this_week`), naming steroid-sulfatase deficiency, SLOS and fetal adrenal causes as reasons for genetic counselling. Boundary: 0.10 fires, 0.11 does not.
- [X] T024 [P] [US2] `PN22`: isolated markers, one panel each: AFP 0.45 → `prenatal_afp_low`; UE3 0.45 → `prenatal_ue3_low`; INHA 2.0 → `prenatal_inhibin_high` (source "≥ 2.0"). Each is `routine` with association text. hCG 2.5 MoM alone fires **no** hCG-high finding (pending cut-off) and is named in the unread line.
- [X] T025 [P] [US2] `PN23`: AFP 0.6 · UE3 0.6 · hCG 2.4 · INHA 2.1 MoM (T21-type direction). Expect **no** engine-assigned quad T21 label (hCG cut pending). Each marker's isolated finding or the naming line fires; nothing says «طبیعی».

### Implementation

- [X] T026 [US2] Implement `secondTrimesterAxis(e)` in `patterns_prenatal.js`, returning `"ntd"` (AFP_MAT ≥ 2.5), else `"ue3_very_low"` (UE3 ≤ 0.10), else `null`. One label only; NTD takes precedence because it is the time-sensitive arm.
- [X] T027 [US2] Add rules `prenatal_ntd_afp` and `prenatal_ue3_very_low` (`this_week`) to `patterns_prenatal.js` with the text in T022/T023, `SCREENING_LINE`, and their `suggest` entries.
- [X] T028 [US2] Add the isolated rules `prenatal_afp_low`, `prenatal_ue3_low`, `prenatal_inhibin_high` (`routine`) to `patterns_prenatal.js`, each gated by `prenatalOwns` so they stand down when a label owns the marker (M91e: call the owner, don't restate its threshold). Do not write `prenatal_hcg_high_isolated` (reserved id, pending).
- [X] T029 [US2] Confirm the stand-down for `hcg_result` (`patterns_reproductive.js`) and `tumor_markers_result` (`patterns_autoimmune.js`). Both read only `ungraded.HCG`/`AFP`, which the claimed rows never reach, so no edit should be needed. If PN01 still fails, add an explicit `!e.prenatal?.markers?.HCG_TOT` / `AFP_MAT` gate there with a Persian comment citing this spec.

**Checkpoint**: PN20–PN23 green, and PN01/PN02 still green.

---

## Phase 5: User Story 5 — Never normal-and-done (P1)

**Goal**: sweep invariants across every prenatal panel.

**Independent test**: one sweep test over all PN panels.

- [X] T030 [US5] Write `PN50` in `prenatal.test.js` as a sweep over every panel in this file plus P11 (all markers in range, printed risk low). Assert:
  - (a) every `prenatal_*` finding contains `SCREENING_LINE`;
  - (b) no sentence calls an absent marker «طبیعی»;
  - (c) no raw key (`FBHCG|PAPPA|AFP_MAT|UE3|HCG_TOT|INHA`) and no English clinical sentence appears in patient text;
  - (d) no `prenatal_*` finding has urgency `emergency` and `has_critical` is false;
  - (e) every rule id in `RULES_PRENATAL` was reached by at least one panel (N15 meaningless-green guard);
  - (f) on each sheet, at most one prenatal finding carries an action timeline.
- [X] T031 [US5] Add a low-risk finding `prenatal_screen_low_risk` (`routine`) to `patterns_prenatal.js`. It fires when the lab prints a low/negative category, or a risk below the source's ✅ low band when no category is printed, and no other prenatal finding fires. Text: «خطرِ محاسبه‌شده کم است؛ این یعنی احتمال پایین است، نه اینکه بیماری رد شده باشد.» It names any absent markers.

---

## Phase 6: User Story 4 — Printed risk and confounders (P2)

**Goal**: the lab's printed risk and category are quoted and decide the tier; profile confounders produce one caveat.

**Independent test**: quickstart P6 + a «1:80 T21» panel + profile with twins/IVF.

- [X] T032 [P] [US4] `PN40`: «Risk Trisomy 21 1:80», no markers, no category. Expect `prenatal_printed_risk_partial` with `this_week` (engine band FMF > 1:100 ✅). Markers are named as missing, no pattern label, and the risk is quoted exactly as printed.
- [X] T033 [P] [US4] `PN41`: «Trisomy 18 risk 1:60 — High risk» printed. Expect `prenatal_printed_risk_t18_t13` (`soon`). A T18 risk with **no** printed category produces `prenatal_printed_risk_partial` at `routine` plus a sentence that the lab's own cut-off decides (FTS T18/T13 cut-off pending).
- [X] T034 [P] [US4] `PN42`: lab category «Low risk» printed beside 1:200 (which the engine band would call intermediate). The lab category wins and is quoted (FR-011).
- [X] T035 [US4] Implement `prenatal_printed_risk_high`, `prenatal_printed_risk_t18_t13` and `prenatal_printed_risk_partial` in `patterns_prenatal.js`:
  - Category parsing uses a closed word set (N6/N30: no substring match; «not high» ≠ high). Reuse `qualVerdict`-style whole-value matching.
  - Engine bands apply only with no printed category: FMF > 1:100 high, 1:100–1:1000 intermediate, < 1:1000 low; quad T21 1:270, quad T18 1:100.
  - `prenatal_printed_risk_t18_t13` urgency `soon`, with a Persian comment that this tier is an owner decision (spec Q1) recorded in the register.
- [X] T036 [US4] Add the confounder caveat to the same module. When the profile carries twins, IVF, insulin-dependent diabetes or smoking, read the profile fields that actually exist (check `rules/conditions.js` and the profile shape first; do not add new profile fields). Add one sentence to the owning finding: «آزمایشگاه باید این مورد را در محاسبهٔ MoM لحاظ کرده باشد.» If the profile has no such field, skip it and write that in research.md instead of inventing one.

---

## Phase 7: User Story 3 — Dating and window validity (P2)

**Goal**: an invalid window or dating is stated, never silently reinterpreted.

**Independent test**: quickstart P5 + discrepancy panel + no-GA panel.

- [X] T037 [P] [US3] `PN30`: quad markers with printed GA 13w. Expect `prenatal_window_invalid` saying the sample is outside 15–22 weeks and the lab must recalculate; other findings still fire with the caveat. FTS markers at GA 14+1 likewise; 9+0 and 13+6 are valid.
- [X] T038 [P] [US3] `PN31`: printed dating discrepancy of 12 days fires the recalculation sentence; 10 days does not. `PN32`: no GA printed adds one «پنجرهٔ زمانیِ نمونه‌گیری و تعیینِ سنِ بارداری روی برگه نیامده و بررسی نشد» sentence and changes no urgency.
- [X] T039 [US3] Implement `prenatal_window_invalid` and the no-GA caveat in `patterns_prenatal.js`. The caveat is a sentence appended to the owning finding, never a second action timeline (N20). It never lowers another finding's urgency.

---

## Phase 8: Profile mismatch (Edge case, clarification Q5)

- [X] T040 `PN60` in `prenatal.test.js` + rule `prenatal_profile_mismatch` in `patterns_prenatal.js`:
  - A male or child (< 16 y) profile leaves the rows unread, adds one sentence that the screening rows don't match the profile, and fires no pattern.
  - A not-pregnant or unset profile interprets normally and adds one note.
  - Verify red on HEAD.

---

## Phase 9: Polish and cross-cutting

- [X] T041 Run `npm test` in `khanesh-server/` and compare with T001, naming the tree. Every newly failing pre-existing test must either be fixed or re-baselined on purpose with a Persian comment explaining why. Diff the rule-id set against T001's list (N16): only `prenatal_*` ids added, none removed.
- [X] T042 Run red-before for the whole of `rules/prenatal.test.js` against HEAD using the recipe at the top. Record `pass · fail` and list any test that passes on HEAD; each must be a deliberate negative control (PN02) or be rewritten (N10).
- [X] T043 [P] Add the pending clinical item to `MEDICAL_RULES.md` under «در انتظار بازبینی», using the next free P number at write time (check with `grep -n "^### P" MEDICAL_RULES.md | tail -3`). Contents:
  - The 0.5–2.0 single-marker band.
  - hCG high > 2.0 vs > 3.0, which blocks the quad T21 label and `prenatal_hcg_high_isolated`.
  - Low-hCG / T18 / T13 / Turner / triploid MoM cut-offs.
  - The FTS T18/T13 risk cut-off.
  - The low-PAPP-A follow-up protocol and aspirin.
  - The `soon` tier for T18/T13/triploid (owner decision, no source).
  - Source caveats: secondary sources only; ACOG PB 226 and ISUOG 2022 not opened.

  For each item, give the proposal and the patient impact either way.
- [X] T044 [P] Edit `specs/013-prenatal-serum-screening/spec.md` per plan "Spec reconciliation":
  - Story 1 scenario 2 and Story 2 scenario 2 become printed-risk-driven.
  - Story 1 scenario 3 drops the growth/BP follow-up sentence.
- [X] T045 [P] Add a Lab Notebook entry to `CLAUDE.md` for the measured N25 recurrence: a concentration-unit quad sheet fired `tumor_markers_result` + `hcg_result` for a pregnant patient. Name the commit hash and guard `PN01`; append the hash to N25 rather than writing a separate entry. Add `patterns_prenatal.js` to the File Structure block and update the rule count with the measured number.
- [ ] T046 Run the `code-reviewer` agent on the diff, then show the user every new Persian patient string verbatim (`must_say`, `action`, `FA_NAMES`, caveats) for review before commit. Do not commit until the user approves.

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → stories.** T002 (spellings) blocks T006. T006 → T007 → T009/T010. PN01 (T004) must be red before T006 and green after T010 + T029.
- **US1 (Phase 3) and US2 (Phase 4)** depend only on Phase 2 and are independent of each other (different classifier functions, same file → do sequential edits within `patterns_prenatal.js`; their tests can be written in parallel).
- **US5 (Phase 5)** depends on US1 + US2 (it sweeps their panels).
- **US4 (Phase 6)** depends on Phase 2 only; T035 must exist before PN50 can reach its ids (re-run T030 after Phase 6/7/8).
- **US3 (Phase 7)** and **Phase 8** depend on Phase 2 only.
- **Polish** last; T046 is the gate before any commit.

## Parallel examples

- **Phase 2:** T004 and T005 (both test-only, same file, but independent `test()` blocks; write as one edit if one agent).
- **US1 tests:** T012, T013, T014, T015 together, then T016 → T017 → T018 → T019 → T020 sequentially (one file).
- **US4 tests:** T032, T033, T034 together.
- **Polish:** T043, T044, T045 together (different files).

## Implementation strategy

1. **MVP = Phase 1 + Phase 2 + US1.** Phase 2 alone already fixes the live defect (PN01: no cancer text on a pregnancy screen) and gets screening rows named instead of dropped. US1 adds the first-trimester findings.
2. Then US2 (quad + NTD) and US5 (sweep), then US4, US3, Phase 8.
3. Each phase ends with its checkpoint tests green and `npm test` compared with T001. No commit without T046.

## Implementation notes (2026-10-04)

- Deviations from this list are recorded in [research.md](research.md) under "Deviations from data-model.md". In short: the isolated quad
  rules were folded into `prenatal_marker_notes`; the printed-risk rules became `prenatal_risk_*`; T009's contract test is `T53`, because
  another session took `T52`; the register item is `P81`, because `P80` was taken; T002 found no real sheets; T036 uses one generic
  confounder sentence and adds no profile fields.
- Added beyond the list: `PN04`, `PN05`, `PN14`, `PN43`, `PN44` (identity, decimal comma, unitless NT, risk ownership, closed category set)
  and `PN51` (no truncated recommendation fragments — found while tracing `buildEngineRecommendations`).
- Re-baselined on purpose: `M105` (engine.test.js) and `B17` (autoimmune2.test.js). Both had locked in the old behaviour of sending MoM rows to `unmapped`.
- **T046 open:** the `code-reviewer` agent has not been run, and the owner has not yet reviewed the Persian strings. Do not commit before both.
- **Code review done (2026-10-04, `code-reviewer`):** 7 confirmed defects fixed with guards `PN70`–`PN78` (all red on the pre-fix code, 9/9); full suite then **1029 tests · 1028 pass · 0 fail · 1 todo**, 231 rules. Three low-severity items remain open (P81, «هنوز باز»). T046's second half — the owner's review of the Persian strings — is still open; do not commit before it.
