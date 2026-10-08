# Tasks: Expert View («نمای تخصصی»)

**Input**: Design documents from `specs/016-expert-view/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/expert-output.md](contracts/expert-output.md), [quickstart.md](quickstart.md)

**Tests**: REQUIRED. Constitution IV: every test is observed red before the code that makes it green. Backend tests live in the new file `khanesh-server/rules/expert.test.js`, commented in Persian. The frontend has no test runner, so frontend tasks are verified with `npm run lint`, `npm run build` and a browser check.

**Standing constraints for every task**
- No Persian text through PowerShell `Get-Content`/`Set-Content`/`Add-Content`/`Out-File`. Use the Write/Edit tools, Bash, or Node `fs`.
- `runEngine` reads sex/age only under `patient` (N32): `runEngine({ patient: { sex, age, conditions }, tests })`.
- No freeze hash may change. `runPatterns`' enumerable return value stays byte-identical (research R2).
- `_engine.expert` never reaches `buildEnginePrompt`.
- `khanesh/src/ResultView.jsx` holds a concurrent session's uncommitted edits. Touch it minimally and commit only your own hunks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US6 from spec.md

---

## Phase 1: Setup

- [X] T001 Measure the working-tree baselines and write them to `specs/016-expert-view/baseline.txt`: `npm test` in `khanesh-server/` (tests · pass · fail · todo), `npm run lint` and `npm run build` in `khanesh/` (exit codes), and the rule count from `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.length))"`. Name the tree (branch, `HEAD`, uncommitted files).
- [X] T002 Create `khanesh-server/rules/expert.js` as a stub that exports `buildExpertView(engineOut, patternOut, score)` returning `null`, and `khanesh-server/rules/expert.test.js` with the Persian header comment (purpose, R-references, red-first note) and the shared helpers `run(tests, patient)` → `{ e, p, s, x }` (engine, patterns, `healthScore`, `buildExpertView`) and `T(name, value, unit, reference)`.

---

## Phase 2: Foundational (blocks every story)

- [X] T003 Write test X0 in `khanesh-server/rules/expert.test.js`: for 12 fixed panels (PT/INR, K 7.0, K 5.5, iron deficiency, Ca + albumin, urea unitless, CBC-only, lipid, thyroid, liver, kidney, all-normal), `JSON.stringify(healthScore(e, p))` equals a value captured in the same test file from the current `score.js`, and `JSON.stringify(runPatterns(e))` is unchanged by importing `expert.js`. This is the "refactor-neutral" guard for T004–T006.
- [X] T004 In `khanesh-server/rules/score.js`, rename `cappedKeys` to an exported `findingKeys(f, candidateKeys)` with identical behaviour; keep `healthScore` calling it. Run X0 and the full `rules/score.test.js` green.
- [X] T005 [P] In `khanesh-server/rules/prompt.js`, add `export` to `dropSubsumedTests` and `URGENCY_FA`. No other change.
- [X] T006 In `khanesh-server/rules/patterns.js`, add `export const HIDDEN_FINDINGS = new WeakMap();` with a Persian comment (R2: invisible to `JSON.stringify`, so freezes stay byte-identical), and at the end of `runPatterns` set `HIDDEN_FINDINGS.set(result, demoted.filter((f) => !supplementary.includes(f)))` on the object it returns. Run the whole suite: every freeze test green, count unchanged from T001.

**Checkpoint**: shared helpers exported; suite equals the T001 baseline.

---

## Phase 3: User Story 1 — Switch to the expert view and see why the engine said what it said (P1) 🎯 MVP

**Goal**: `_engine.expert.findings` lists every shown finding with label, urgency, triggers, context, action, warnings and sources; the page has a «ساده / تخصصی» switch that renders it.

**Independent Test**: PT 14 · INR 1.2 → one finding labelled with `coagulation_abnormal`'s headline, triggers PT and INR with both ranges, `urgency_fa` «این هفته», and no engine key anywhere (quickstart §1 row 1, §3).

### Tests (write first, observe red against the T002 stub)

- [X] T007 [P] [US1] Test X1 in `khanesh-server/rules/expert.test.js`: PT 14 · INR 1.2 → `x.version === 1`, `x.urgency === p.overall_urgency`, one finding whose `label === headline` of the shown `coagulation_abnormal` finding, `urgency_fa === "این هفته"`, trigger names include the `faName` of PT and INR, each trigger has `engine_range` and `status_fa`.
- [X] T008 [P] [US1] Test X2: K 7.0 → the potassium finding's triggers include potassium (the single-letter key that `ruleReads` cannot see; N32), so attribution goes through `findingKeys`.
- [X] T009 [P] [US1] Test X3 (SC-002 sweep): every `ADULT_REFS` key, both sexes, at 1.3×hi, 3×hi, 0.6×lo, plus the 13 common panels from research R7 → no string anywhere in `x` (deep walk) equals an engine key (`ADULT_REFS`, `CLASSIFIERS`, `CTCAE_MAP` keys) or a rule id (`RULES.map(r=>r.id)`); assert ≥ 60 keys were reached and ≥ 60 distinct rules fired (N15).
- [X] T010 [P] [US1] Test X4: for each finding, `sources` equals `sourceList([...RULE_SOURCES[id] ?? [], ...f.sources ?? []])` and `no_source === (sources.length === 0)`; a paywalled id never appears with its own URL (the `G6` rule).
- [X] T011 [P] [US1] Test X5 (contract invariant 7): `buildEnginePrompt(e, p, "", patient)` output is byte-identical before and after `buildExpertView` runs on the same `e`/`p` (it must not mutate them), checked on 5 panels.
- [X] T012 [P] [US1] Test X6 (invariant 8): `buildExpertView` on a `patternOut` containing a finding with no `headline`, `suggest: null` and `sources: "x"` does not throw; the finding is labelled «یافتهٔ بی‌عنوان» and `x.malformed === 1`; on all sweep panels `x.malformed === 0`.

### Implementation

- [X] T013 [US1] Implement `buildExpertView` findings in `khanesh-server/rules/expert.js`: walk `patternOut.findings` in order; `label` from `headline` (fallback per R4, counted in `malformed`); `urgency`, `urgency_fa` (from `URGENCY_FA`); `supplementary`; `briefed` (shown copy whose `must_say` equals the rule's brief); `triggers` = `findingKeys(f, abnormalKeys)` → `TestRow`; `context` = `findingKeys(f, inRangeKeys)` → `TestRow`; `action`, `warnings` verbatim; `sources` via `sourceList`; `no_source`. Never mutate inputs (copy arrays). Persian comments.
- [X] T014 [US1] Implement `TestRow` in `khanesh-server/rules/expert.js` per data-model: `name = faName(key)` (the key itself is not serialized), `graded {value, unit}` (unit from `getUnit`), `engine_range`, `printed_range` from `engineOut.printedRanges`, `range_source = refSource`, `status_fa = fa`, `level`, `ctcae_grade`, `grading_source`. Leave `printed`/`derived_from` to US3 (set `printed: null`, `derived_from: null` for now).
- [X] T015 [US1] Wire it in `khanesh-server/server.js`: import `buildExpertView`, and in the `_engine` builder compute `const score = healthScore(engineOut, patternOut)` once, then `score` and `expert: buildExpertView(engineOut, patternOut, score)`. Persian comment pointing to `contracts/expert-output.md`. Run X1–X6 green and the full suite.
- [X] T016 [US1] Create `khanesh/src/ExpertView.jsx`: props `{ eng, asText }`; renders `eng.expert.findings` as collapsible cards (label, urgency chip, triggers table: name · value+unit · engine range · printed range · status · grade, context rows, action, warnings, sources list or «منبعِ منتشرشده‌ای به این قاعده پیوست نیست»). Every value through `asText`; never render a key. RTL, mobile-first.
- [X] T017 [P] [US1] Create `khanesh/src/ExpertView.css` with tokens from the existing theme (no new colours outside the token set), 16px gutters, no horizontal scroll at phone width, tables that stack below 480px.
- [X] T018 [US1] In `khanesh/src/ResultView.jsx`: import `Segmented` and `ExpertView`; add state `mode` initialised from `localStorage["azmayar_view_mode_v1"]` inside try/catch (default `"simple"`); render `<Segmented label="نمای نتیجه" options={[{value:"simple",label:"ساده"},{value:"expert",label:"تخصصی"}]}>` under `ContextLine` only when `hasEngine`; when `mode === "expert"` render `<ExpertView>` in place of the summary/interpretation/unmatched/recommendations/dashboard block and keep the banner, context line, extracted tests and disclaimer. Write the mode back in try/catch.
- [X] T019 [US1] Run `npm run lint` and `npm run build` in `khanesh/`; both exit 0.

**Checkpoint**: MVP — a clinician can switch views and see why each finding fired.

---

## Phase 4: User Story 2 — Suggested follow-up tests for the clinician (P1)

**Goal**: per-finding and sheet-level suggested tests, never already measured.

**Independent Test**: Hb 9.5 · MCV 70 · ferritin 6 → no suggestion names a measured test; each item is a Persian test name.

- [X] T020 [P] [US2] Test X7 in `khanesh-server/rules/expert.test.js` (SC-004): over the X3 sweep panels plus the iron-deficiency panel, no item in any `finding.suggest` or `x.suggested` satisfies `alreadyMeasured(item, measured)` where `measured` = graded ∪ ungraded keys; no item starts with «درخواست» or ends with «از پزشک».
- [X] T021 [P] [US2] Test X8: a panel where two findings suggest the same test → it appears once in `x.suggested`; a finding with empty `suggest` has `suggest: []`.
- [X] T022 [US2] Implement in `khanesh-server/rules/expert.js`: per finding `suggest` = shown `f.suggest` filtered by `alreadyMeasured`; `x.suggested` = `dropSubsumedTests` over the de-duplicated union, same filter.
- [X] T023 [US2] In `khanesh/src/ExpertView.jsx`, render per-finding «آزمایش‌های پیشنهادی» only when non-empty, and one sheet-level list at the top of the expert view. Lint + build.

---

## Phase 5: User Story 3 — Measured, converted and corrected values kept apart (P1)

**Goal**: `printed` vs `graded` with `derived_from`, and a labelled list of computed indices.

**Independent Test**: Ca 7.2 (printed range 8.5–10.5) · albumin 2.5 · creatinine 2.1 · Na 138 · Cl 100 · HCO3 18 → calcium row `printed.value === 7.2`, `derived_from === "albumin_correction"`; indices list eGFR and anion gap with `method_fa`.

- [X] T024 [P] [US3] Test X9 in `khanesh-server/rules/expert.test.js`: the panel above → calcium `TestRow` as stated; `x.indices` contains eGFR, anion gap and corrected anion gap, each with non-empty Persian `method_fa` and `inputs` as Persian names.
- [X] T025 [P] [US3] Test X10: HbA1c 53 mmol/mol → its row has `printed {53, "mmol/mol"}`, `graded.unit "%"`, `derived_from "unit_conversion"`. Glucose-corrected sodium, if the engine applies it on a hyperglycaemic panel, gets `"glucose_correction"`.
- [X] T026 [P] [US3] Test X11 (SC-005 sweep): over X3 panels, every row with `derived_from` non-null has `printed` non-null or `printed_unavailable === true`.
- [X] T027 [P] [US3] Test X12: unitless urea 150 → `x.tests` has a row for it with `status_fa === "بدون حکم"` and the printed value, and no row anywhere has `status_fa` «طبیعی» for an ungraded key (Constitution II).
- [X] T028 [US3] Implement `printed`/`derived_from` in `khanesh-server/rules/expert.js` from `engineOut.unitConversions` (`raw`, `from`) and `engineOut.indices` (`ca_measured`/`ca_correction_applied`, `na_measured`); `x.tests` = graded rows (abnormal first) + ungraded rows from `engineOut.ungraded` as «بدون حکم».
- [X] T029 [US3] Implement `x.indices` in `khanesh-server/rules/expert.js` with a module-level table of fixed Persian labels and `method_fa` sentences for `egfr`, `anion_gap`, `anion_gap_corr`, `ca_corrected`, `na_corrected` (research R6); only indices present in `engineOut.indices` appear. The sentences describe the engine's arithmetic and add no threshold.
- [X] T030 [US3] In `khanesh/src/ExpertView.jsx`, render «روی برگه» and «مقدارِ سنجیده‌شده» columns, a `derived_from` note («اصلاح با آلبومین», «تبدیلِ واحد»), the full `x.tests` table, and a «مقادیرِ محاسبه‌شده» section from `x.indices`. Lint + build.

---

## Phase 6: User Story 5 — The switch is a convenience, never a source of truth (P2)

**Goal**: the score breakdown is a read-only copy; both modes show the same score, urgency and `has_critical`; old server degrades.

**Independent Test**: score value/band, `overall_urgency` and finding list identical in both modes.

- [X] T031 [P] [US5] Test X13 in `khanesh-server/rules/expert.test.js` (SC-003, FR-020): over X3 panels, `x.score.value/band/reason` equal `healthScore` output; each system's `score/cap/capped` equal; `keys`/`worst` are Persian names; `x.urgency === p.overall_urgency`; `p.has_critical` is unchanged by calling `buildExpertView`.
- [X] T032 [US5] Implement `x.score` in `khanesh-server/rules/expert.js` as a copy of the passed `score` with keys mapped through `faName`; `null` when `score` is null.
- [X] T033 [US5] In `khanesh/src/ExpertView.jsx`, render the read-only score breakdown (total, band word, per-system score, cap marker, contributing tests, lowest test); when `eng.expert` is absent or malformed, render the per-test table from `eng.tests`, `eng.indices`, `eng.unitConversions` and the sentence «جزئیاتِ یافته‌ها برای این نتیجه در دسترس نیست (نسخهٔ قدیمیِ سرور)» (FR-015). No throw on any missing field.
- [X] T034 [US5] Verify by reading `khanesh/src/ResultView.jsx` in StrictMode terms: the mode read/write is wrapped in try/catch, a blocked storage opens «ساده», and the banner/context line render identically in both modes. Lint + build.

---

## Phase 7: User Story 4 — Optional deeper interpretation per rule (P2)

**Goal**: a guarded `pro` block on 30 rules (research R7), rendered under «احتیاط‌ها», «تشخیص‌های افتراقی», «بررسی‌های بعدی».

**Independent Test**: a rule with `pro` shows three sections; a rule without shows none; all `pro` text passes the guards.

### Guards first (observe red against a deliberately bad fixture)

- [X] T035 [P] [US4] Test X14 in `khanesh-server/rules/expert.test.js`: for every rule with `pro`: each of `cautions/differential/workup` is an array of non-empty strings; at least one list is non-empty; no string contains a mojibake character (the `M37` set) or a run of `???`; no string contains a raw engine key (word-boundary match against the X3 key set, excluding the printed-on-sheet abbreviations allowed by `M38`'s `ALLOWED_TEST_NAMES`); every `pro.sources` id exists in `guidelines.js`. Run once against an in-test fixture rule with each defect and confirm each check fires.
- [X] T036 [P] [US4] Test X15 (no new thresholds): every digit run in a rule's `pro` strings (Latin or Persian digits, normalised) also occurs in that rule's own `match`/`build` source (`toString()`, comments stripped). Fixture with an invented «۷۵» must go red.
- [X] T037 [P] [US4] Test X16: no `pro` string contains «اورژانس»، «مطب»، «وقت بگیرید»، «۱۱۵» or second-person patient wording («شما»); `pro` is read only by `expert.js` (grep: no other module references `.pro`).
- [X] T038 [P] [US4] Test X17: a finding of a rule with `pro` carries `pro` deep-equal to the rule's block; a finding of a rule without `pro` has `pro: null`; hidden findings have no `pro` key.

### Implementation

- [X] T039 [US4] In `khanesh-server/rules/expert.js`, attach `pro` from `RULES.find(r => r.id === f.rule_id)?.pro ?? null` to shown findings only.
- [X] T040 [US4] Write `pro` blocks for the 12 blood rules (research R7) in `khanesh-server/rules/patterns_hematology.js` (and `patterns_leukocyte.js` for `lymphopenia` if it lives there): static objects, Persian, clinician register, numbers only if already in the rule's code, `sources` only registry ids. Run X14–X17.
- [X] T041 [US4] Write `pro` blocks for the 12 chemistry rules in their files (`patterns_biochem.js`, `patterns_biochem_new.js`, `patterns_endocrine_rheum.js`, `patterns_nephrology.js`, `patterns_mineral_bone.js`, `patterns_p73_gaps.js` — locate each id with grep first). Run X14–X17.
- [X] T042 [US4] Write `pro` blocks for `crp_elevated`, `esr_elevated`, `coagulation_abnormal`, `uti_pattern`, `proteinuria_pattern`, `hematuria_pattern` in their files. Run X14–X17 and assert `RULES.filter(r => r.pro).length >= 20` (SC-009) and that all 30 batch ids carry `pro`.
- [X] T043 [US4] Add P100 to `MEDICAL_RULES.md` (before the «رفتار موتور» section): what `pro` is, that it is shown only in the expert view, the guard rules, the 30 rule ids, the index `method_fa` sentences, and open questions for the reviewer; status «در انتظار بازبینی» with the user's decision (clarification Q1) noted.
- [X] T044 [US4] In `khanesh/src/ExpertView.jsx`, render the `pro` sections under each finding with a small label «متنِ تخصصی — در انتظارِ بازبینیِ بالینی». No empty headings. Lint + build.

---

## Phase 8: User Story 6 — Inpatient wording carries over (P3)

**Goal**: no outpatient phrase in the expert object for a hospitalized patient.

**Independent Test**: hospitalized K 7.0 → no «اورژانس / مطب / وقت بگیرید / ۱۱۵» in `x`.

- [X] T045 [US6] Test X18 in `khanesh-server/rules/expert.test.js` (SC-006): the X3 sweep with `conditions: ["hospitalized"]`, deep walk of `x` excluding `label` and `pro` and `x.tests[*].status_fa`, no string matches the outpatient regex used in `rules/inpatient.test.js`. Observe that it would fail if `applyInpatientVoice` were skipped (comment out the call in a temp copy, or assert against the non-hospitalized run that the regex does match somewhere, as the negative control).
- [X] T046 [US6] If X18 exposes a field that bypasses the inpatient voice (for example `warnings` on a supplementary finding), fix it in `khanesh-server/rules/expert.js` by reading the already-voiced field, never by re-implementing the voice.

---

## Phase 9: Hidden findings (FR-016, clarification Q2) — part of US1, after US4 so `pro` exclusion is testable

- [X] T047 [P] [US1] Test X19: K 7.0 + Hb 9.5 · MCV 70 · ferritin 6 → `x.hidden` lists the demoted findings by their headlines with `triggers` and `sources`; none has `action`, `warnings` or `pro` keys; the count equals `p.suppressed_ids.length − p.supplementary_ids.length`.
- [X] T048 [US1] Implement `x.hidden` in `khanesh-server/rules/expert.js` from `HIDDEN_FINDINGS.get(patternOut) ?? []`.
- [X] T049 [US1] In `khanesh/src/ExpertView.jsx`, render «یافته‌های پنهان در نمای ساده» collapsed by default (name, triggers, sources). Lint + build.

---

## Phase 10: Polish & Cross-Cutting

- [X] T050 Run the full backend suite and compare with T001; record the numbers and the new test count in `specs/016-expert-view/baseline.txt`.
- [X] T051 [P] Update `.claude/rules/frontend.md` `_engine` shape with `expert` and its constraints (render `label`/`name`, never keys; absence = unavailable), and `CLAUDE.md` File Structure with `rules/expert.js`, `ExpertView.jsx`.
- [X] T052 Run the `code-reviewer` agent on the diff (engine boundary, raw keys, N5, N8, contract drift, Persian strings, `pro` content); fix each confirmed finding red-first; log any wrong output it caught in CLAUDE.md Lab Notebook.
- [X] T053 Browser check per `quickstart.md` §3 on a separate backend port and Vite instance (never the user's 8787/5173): PT/INR panel, switch, reload persistence, private window default, phone width without horizontal scroll. Stop your servers and delete any temporary config afterwards.
- [X] T054 Commit only your own hunks (`ResultView.jsx`, `MEDICAL_RULES.md`, `CLAUDE.md` are shared): stage with filtered patches, let the pre-commit hook test the index tree, never push.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T006)** → stories.
- **US1 (T007–T019)** is the MVP and blocks the frontend parts of every other story (`ExpertView.jsx` exists).
- **US2 (T020–T023)** and **US3 (T024–T030)** depend only on T013/T014 and can run in parallel with each other on the backend; their frontend tasks touch the same `ExpertView.jsx`, so run those sequentially.
- **US5 (T031–T034)** depends on T015 (score passed in).
- **US4 (T035–T044)** depends on T013; its guards (T035–T038) come before any `pro` text; T040–T042 touch different files and may run in parallel once the guards exist.
- **US6 (T045–T046)** depends on T013 and on P99 already committed (`5ebdae8`).
- **Hidden findings (T047–T049)** depend on T006 and T039 (so the "no `pro`" assertion is meaningful).
- **Polish (T050–T054)** last.

## Parallel Opportunities

- T005 alongside T004/T006 (different files).
- Within US1: T007–T012 (one test file, independent test blocks; write them in one edit), T017 alongside T016.
- US2 tests T020–T021 and US3 tests T024–T027 together.
- US4 guards T035–T038 together; `pro` authoring T040, T041, T042 across different `patterns_*.js` files.

## Implementation Strategy

- **MVP = Phases 1–3 (US1):** server field with findings, triggers and sources, plus the switch and a basic expert view. Demonstrable on the PT/INR panel.
- **Increment 2:** US2 + US3 (suggested tests; printed vs corrected values; indices). Still no new clinical text.
- **Increment 3:** US5 (score breakdown, old-server fallback), then US4 (guards, 30 `pro` blocks, P100), then US6 and hidden findings.
- Stop at any checkpoint with a green suite, and commit at each checkpoint (own hunks only).
