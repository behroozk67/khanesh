---

description: "Task list for tumour-marker clinical rules (specs/019)"
---

# Tasks: Tumour-Marker Clinical Rules

**Input**: `/specs/019-tumor-marker-rules/` — plan.md, spec.md, research.md, data-model.md, contracts/engine-tests-tumor-rows.md, quickstart.md

**Tests**: REQUESTED (spec FR-016, Constitution IV). Every test is run against the unmodified tree first and must be red. Test comments in Persian, in `khanesh-server/rules/engine.test.js` (end-to-end) and `khanesh-server/rules/tumor_markers.test.js` (pure module).

**Golden rule (every task)**: no threshold, range or clinical sentence from memory. A claim needs a verbatim passage from a source opened in this session (section/table cited); otherwise it is «بدون قاعدهٔ بالینی» or removed. If a needed source cannot be opened, **stop and report**.

**Stronger model**: tasks marked 🧠 are run with `model: "fable"` (researcher / eval-medical-reviewer) or the `advisor`.

**Shared dirty tree**: `server.js`, `Tafsir.jsx`, `CLAUDE.md` carry other sessions' uncommitted edits. Never `git add` those whole; stage own hunks (T054).

## Format: `[ID] [P?] [Story] Description` — paths relative to repo root; backend commands from `khanesh-server/`, frontend from `khanesh/`.

---

## Phase 1: Setup (measure before editing)

- [X] T001 Re-measure the baseline: `npm test` in `khanesh-server/`; record tree (`main` @ `git rev-parse --short HEAD` + dirty), exit code and runner counts (tests/pass/fail/todo) in `specs/019-tumor-marker-rules/research.md` §1 (replace the earlier line if different).
- [X] T002 [P] Re-run the probes (live sheet; separators `/ ; | ، \n`; boundaries; wordings; synonyms from research.md §1) with a script in the session scratchpad, confirm they still match research.md §1; note any drift.
- [X] T003 [P] Snapshot the rule-id set before changes: `node -e "import('./rules/patterns.js').then(m=>console.log(JSON.stringify(m.RULES.map(r=>r.id))))" > <scratchpad>/rules-before.json` (N16).
- [X] T004 [P] Allocate the register number: `grep -o "^#\{2,4\} P[0-9]*" MEDICAL_RULES.md | sed 's/.*P//' | sort -n | tail -1`; expect 121 ⇒ use P122; re-check at commit time (N37).
- [X] T005 [P] Record `git diff --stat` and `git diff -U0` of the files this feature will touch that are already dirty (`khanesh-server/server.js`, `khanesh/src/Tafsir.jsx`, `CLAUDE.md`) into the scratchpad so own hunks can be separated later.

---

## Phase 2: Foundational (blocks all stories)

- [X] T006 Read `khanesh-server/rules/urine_rows.js` and the `AI_*` section of `khanesh-server/rules/serology.js` (lines ~255–410) to copy the module pattern; then create `khanesh-server/rules/tumor_markers.js` exporting stubs: `TM_KEYS` (`CEA`, `CA125`, `CA153`, `CA199`), `parseTmRange(text)`, `tmVerdict(value, cmp, range)`, `tumorMarkerRows(engineOut)` per data-model.md (stubs return `null`/`[]`).
- [X] T007 [P] Create `khanesh-server/rules/tumor_markers.test.js` with the `node:test` scaffold and one smoke test that imports the module (Persian comments).
- [X] T008 [P] Complete the reader inventory (research.md §5): grep `state === "above"|"within"|"noref"` and `ungraded` across `khanesh-server/rules/*.js` (non-test) incl. coverage nets, `expert.js`, `score.js`, `metamorphic.test.js` `ALLOWED_DROPS`; and grep the frontend for `.abnormal`, `.dir`, `_engine.tests`. Append the final list to research.md §5.

**Checkpoint**: baseline + inventory recorded; module skeleton exists.

---

## Phase 3: User Story 5 — Sourced research table first (Priority: P1) 🎯 GATE

**Goal**: one repo file where every clinical claim is sourced or flagged; nothing downstream is written before it exists.

**Independent Test**: `MEDICAL_RULES_TUMOR_MARKERS.md` exists; every cell has a verbatim passage + source (name, year, URL/PMID, section/table) or «بدون قاعدهٔ بالینی»; unopened sources listed.

- [X] T009 [US5] 🧠 Dispatch `researcher` (`model: "fable"`) for **CEA**: from the readable sources only (NACB 2008/2009 PDF colorectal ch. 4; EGTM 2014 GI [PMC4217376](https://pmc.ncbi.nlm.nih.gov/articles/PMC4217376/)) return verbatim passages with section/table for: intended use, screening statement, smoking and benign/inflammatory causes, any decision limit (expected: none). Raw output saved to the scratchpad.
- [X] T010 [P] [US5] 🧠 Same for **CA 125** (EGTM ovarian [PMC4679342](https://pmc.ncbi.nlm.nih.gov/articles/PMC4679342/): "Nonmalignant conditions causing elevated CA125", monitoring; NACB ch. 6), plus **HE4** from the same EGTM paper.
- [X] T011 [P] [US5] 🧠 Same for **CA 15-3** (ASCO 2015 [PMC5478102](https://pmc.ncbi.nlm.nih.gov/articles/PMC5478102/) Recommendation 3; NACB ch. 5; liver/kidney and early-treatment rise).
- [X] T012 [P] [US5] 🧠 Same for **CA 19-9** (NACB; Lewis-negative, cholestasis) — only if the passage is found in an opened source, else mark «بدون قاعدهٔ بالینی». Also one pass for AFP, PSA total/free/ratio, β-hCG, thyroglobulin, calcitonin: NACB readable chapters only; anything else flagged.
- [X] T013 [US5] Write `MEDICAL_RULES_TUMOR_MARKERS.md` (repo root, via Write tool, Persian intact): table **نشانگر | کاربرد | محدودهٔ مرجع (+وابستگی کیت/جنس/سن/سیگار) | تعدیل‌ها | منبع (نام، سال، URL/PMID، بند/جدول) | تصمیمِ کد**, then a section listing sources not opened (NCCN, ACOG, SGO, ESMO, EGTM 2017 breast, ASCO 2006/2007, all manufacturer inserts) and what each blocks. Reference range column for CEA/CA 125/CA 15-3 = «محدودهٔ چاپیِ برگه؛ پیش‌فرضِ ما نداریم» (no insert opened).
- [X] T014 [US5] Compare each existing `TM_CONTEXT` sentence (`khanesh-server/rules/patterns_autoimmune.js` ~424–431) and the `tmBuild` closing sentences to the table; list per sentence: confirmed (cite passage) / soften / remove. Save the list in the table file under «ممیزیِ متنِ P77».
- [X] T015 [US5] 🧠 `advisor` review of the table and the keep/soften/remove list before any code depends on it. If a required claim has no verbatim passage, **stop and report** to the user.

**Checkpoint**: table accepted; Phase 6 (text) may now start. Phases 4–5 (reading logic) need only printed-text semantics, not clinical sources, and may run in parallel with T009–T015.

---

## Phase 4: User Story 1 — Printed range read whatever its wording (Priority: P1) 🎯 MVP

**Goal**: CEA/CA 15-3/CA 125 live rows get verdicts; «خوانده نشد» only when truly unreadable.

**Independent Test**: live sheet rows → CEA `above`, CA 15-3 `within`, CA 125 `within`; no unread sentence.

### Tests (red first)

- [X] T016 [P] [US1] In `khanesh-server/rules/tumor_markers.test.js`: table-driven wordings → bands: `< 35`, `<35`, `up to 35`, `Up to: 35`, `≤ 35`, `<= 35`, `0-35`, `0 - 35`, `At or below: 31.0`, `Less than 35`, `Normal: <35`; assert `loStrict/hiStrict` per data-model.md (`<` strict; the rest inclusive).
- [X] T017 [P] [US1] Same file: boundary table for each wording — exactly on the limit, and one least-significant unit below/above (e.g. 35 / 34.9 / 35.1; strict `< 5`: 5 ⇒ `above`, 4.9 ⇒ `within`).
- [X] T018 [P] [US1] Same file: contradictory labelled print (nonsmoker.hi ≥ smoker.hi) and labelled multi-band that cannot be read whole ⇒ `kind: "unreadable"`, never first band.
- [X] T019 [US1] In `khanesh-server/rules/engine.test.js`: end-to-end live-sheet test via `runEngine` (CEA 27.97 «Non smoker: < 5   Smokers: < 10», CA 125 10.3 «0-35», CA 15-3 11.6 «At or below: 31.0») — expect verdicts `above/within/within` and no «خوانده نشد» in the finding text; plus one test per separator `/ ; | ، \n` (CEA 7 must not be `above` via first band). **Run on the unmodified tree and record the red output (N10).**

### Implementation

- [X] T020 [US1] Implement `parseTmRange` in `khanesh-server/rules/tumor_markers.js`: detect labelled bands (non-smoker / smoker, English; Persian «غیرسیگاری/سیگاری» only if found on a real sheet — see T024) on the **whole** string before any split; single-range fallback with strictness; Persian digits via the same normalisation as `units.asciiRef` (import, don't copy).
- [X] T021 [US1] Implement `tmVerdict` for single bands (`below|within|above|unknown`), honouring `loStrict/hiStrict`; censored values («<0.5») stay `noref` (existing behaviour).
- [X] T022 [US1] Wire `khanesh-server/rules/serology.js` `assayRoute`: for `TM_KEYS` call `parseTmRange/tmVerdict` **instead of** `cleanPrintedRef` + `abVerdict`; other keys untouched. Distinguish `noref` (no range printed) from `unreadable` (range printed, unparseable) in the `state` stored on `ungraded[key]`.
- [X] T023 [US1] In `khanesh-server/rules/patterns_autoimmune.js` `lineOf`: the «بازهٔ مرجعِ چاپ‌شده … خوانده نشد» sentence only for `unreadable`; `noref` keeps «محدودهٔ مرجع روی همان ردیف چاپ نشده». Edit Persian via the Edit tool only.
- [X] T024 [US1] Names (FR-020): extend only the TM entries of `AI_RE` in `serology.js` with spellings found in the user's list or on real sheets. First `grep -rn "سی ?ای ?ای\|کارسینو\|CA ?125\|CA ?15" khanesh-server khanesh/src --include=*.js --include=*.jsx --include=*.json` (and `.claude/skills/clinical-knowledge-extraction` fixtures) for real Persian spellings; add none that are not found. Do **not** touch `refs.js`/`NAME_MAP` (second reader, N25). Add a probe test listing mapped vs deliberately unmapped spellings.
- [X] T025 [US1] Run the T016–T019 tests (green) and `node --test rules/metamorphic.test.js rules/geriatric.test.js`; fix, don't re-baseline.

**Checkpoint**: US1 delivers the live-sheet verdicts for CA 15-3 and CA 125 and the correct unread/no-range wording.

---

## Phase 5: User Story 2 — CEA smoker / non-smoker without hidden guess (Priority: P1)

**Goal**: three regions, explicit outcome each.

**Independent Test**: CEA 3 / 7 / 12 against «Non smoker: < 5   Smokers: < 10» ⇒ `within / between / above`.

- [X] T026 [US2] Tests first (`tumor_markers.test.js` + `engine.test.js`): regions 3/7/12; strict boundaries at 5 and 10 (5 ⇒ `between`, 10 ⇒ `above`, since `<` is strict); CEA 27.97 ⇒ `above`; urgency monotone (3→7→12 never lower; `between` ⇒ `routine`, `above` ⇒ `this_week`). Run on the unmodified tree; record red.
- [X] T027 [US2] Implement the `between` verdict in `tmVerdict` for labelled two-band ranges (smoking status unknown; no profile field added).
- [X] T028 [US2] `patterns_autoimmune.js`: handle `between` in `lineOf`/`tmBuild` — not counted as `above`, `isPos/isNeg` false, headline stays the neutral «نتیجهٔ تومورمارکرهای شما»; sentence says the value is above the non-smoker limit, within the smoker limit, and that the engine does not know smoking status. Use only reviewer-confirmed wording from T014/T015 (draft is flagged for review).
- [X] T029 [US2] Audit every reader listed by T008 for the new `between` state (coverage nets, `expert.js` `ungradedRow`, `score.js` unread count); add a test that `between` does not fall into `unmatched_abnormal` or vanish from the brief (N18/N28).
- [X] T030 [US2] Run `node --test rules/metamorphic.test.js`; any `ALLOWED_DROPS` need is a finding, not an edit.

**Checkpoint**: CEA never silently picks a band.

---

## Phase 6: User Story 3 — Rows in `_engine.tests`, never looking normal (Priority: P1)

**Goal**: contract rows + client no-verdict state.

**Independent Test**: live sheet response lists CEA/CA125/CA153 with Persian `name`; a no-range marker renders «بدون محدوده مرجع», not «در محدوده».

### Tests (red first)

- [X] T031 [P] [US3] `tumor_markers.test.js`: `tumorMarkerRows` — shape per contract (all verdicts), `abnormal: null` for `noref|between|unreadable`, `dir: "high"` only for `above`, `name` Persian with no Latin engine key (N8), never added to `graded`.
- [X] T032 [US3] `khanesh-server/api-contract.test.js` (follow an existing `T*` case for how analyze is mocked): response `_engine.tests` contains the three live markers; run on unmodified tree, record red.

### Implementation

- [X] T033 [US3] Implement `tumorMarkerRows` in `khanesh-server/rules/tumor_markers.js` from `engineOut.ungraded` entries with `reason === "assay_printed"` and key ∈ `TM_KEYS`; Persian `fa` strings drafted from the reviewed text, flagged for T043.
- [X] T034 [US3] `khanesh-server/server.js` `serializeGraded` (~line 345): add one spread `...tumorMarkerRows(engineOut)` next to `...urineAbnormalRows(engineOut)` plus the import — one hunk only; check with `git diff -U0 khanesh-server/server.js` that only this hunk is mine.
- [X] T035 [US3] `khanesh/src/resultStates.js`: add `STATES.norange` (label «بدون محدوده مرجع», icon, class `st-norange`); in `stateOf`, return it when `t.abnormal === null` or `t.verdict` ∈ `{noref, between, unreadable}` **before** the `!t.abnormal` branch; in `buildVerdictContext`, skip rows with `source === "tumor_marker_printed"` when building `emergencyKeys`.
- [X] T036 [P] [US3] Add the `.st-norange` style beside the existing `.st-missing` rules (find with `grep -rn "st-missing" khanesh/src/*.css`): neutral colour, dashed border, not red/green; light and dark if the file themes.
- [X] T037 [US3] Read each consumer from T008 — `ExpertView.jsx`, `ResultDashboard.jsx` (≈101, 260–269), `ResultReport.jsx` (≈210, 273–275, 416), `ResultView.jsx`, `Tafsir.jsx` — and fix any place that maps falsy `abnormal` to "normal"/"in range", counts `norange` rows as in-range, or shows a tumour-marker `above` row as «بحرانی». Edit `Tafsir.jsx` with a minimal hunk (shared dirty file).
- [X] T038 [US3] `npm run lint` in `khanesh/`; quote the real output.
- [X] T039 [US3] Check `khanesh-server/rules/expert.js` `ungradedRow` against `specs/016-expert-view/contracts/expert-output.md`; keep it consistent with the new rows (no contract change unless the contract already allows `printed_range`), record the decision.

**Checkpoint**: US3 complete; rows visible and never mislabelled.

---

## Phase 7: User Story 4 — Calm, sourced patient text (Priority: P1)

**Goal**: only table-backed claims; never diagnostic, never emergency.

**Independent Test**: for each marker × {within, above, between, noref, unreadable}: Persian text has no diagnosis wording, says it is not a screening test for people without symptoms where sourced, recommends a doctor; `has_critical` false.

**Depends on**: T015 (table accepted).

- [X] T040 [US4] Tests first (`engine.test.js`): invariants over all verdicts — `has_critical === false`, urgency ≠ `emergency`; text contains no «سرطان دارید/ابتلا» style diagnosis phrasing and no raw key; closing sentence appears per above/not-above as today. Run on unmodified tree (the `خوانده نشد` assertions will be red).
- [X] T041 [US4] Rewrite `TM_CONTEXT` entries and `tmBuild` closing sentences in `khanesh-server/rules/patterns_autoimmune.js` per the keep/soften/remove list (T014); every retained clinical claim carries its table row id in a code comment. Edit tool only; ZWNJ preserved.
- [X] T042 [US4] Run the guards `M36`–`M38` (RULES integrity, mojibake `?` runs, language) via `npm test`; fix, don't skip.
- [X] T043 [US4] 🧠 Dispatch `eval-medical-reviewer` (`model: "fable"`) with the final Persian strings + `MEDICAL_RULES_TUMOR_MARKERS.md`; every flagged claim is fixed or removed, then re-reviewed.
- [X] T044 [US4] Extract every new/changed patient string (finding text, `fa` labels, `between` sentence, `norange` label) verbatim into the scratchpad file for the delivery report (user-facing strings are shown verbatim).

**Checkpoint**: text reviewed and sourced.

---

## Phase 8: User Story 6 — Out of score and biological age (Priority: P2)

**Goal**: tumour markers change neither score nor PhenoAge.

**Independent Test**: a normal panel ± the three markers ⇒ identical `healthScore` and PhenoAge output.

- [X] T045 [US6] Test in `khanesh-server/rules/engine.test.js` (or `score.test.js` pattern): `healthScore(engineOut, patternOut)` and the PhenoAge builder return byte-equal results with and without the markers; markers present in `ungraded`, absent from `graded`/`SCORE_TABLE`. Note it passes on old code too (it is a guard, not a fix) — say so in a comment.
- [X] T046 [US6] Record in the P122 entry where and why they are excluded (kept in `ungraded`, only counted in `unread`).

---

## Phase 9: Polish, register, commit

- [X] T047 Rule-id diff after changes against T003's snapshot; empty diff expected, a missing id is a blocker (N16).
- [X] T048 `MEDICAL_RULES.md`: add the P122 entry (same commit as behaviour): what changed, sources opened/not opened, **open reviewer questions** — (a) `this_week` above printed range is still unsourced (P77), (b) `between` ⇒ `routine`, (c) CEA smoking handling without a profile field, (d) strict `<` reading. Mark «در انتظار بازبینی».
- [X] T049 `CLAUDE.md` Lab Notebook: append the next free `N` entry (re-grep) for "labelled multi-band range silently reduced to its first band + no-verdict row rendered as normal"; hunk-stage only (file is dirty from other sessions).
- [X] T050 Full `npm test` in `khanesh-server/`; compare with T001 baseline (tree named); each moved freeze test explained individually as intentional or fixed; never `SKIP_HOOKS=1`.
- [X] T051 Walk `specs/019-tumor-marker-rules/quickstart.md` §1–§7 and quote the real output of each step.
- [X] T052 🧠 `advisor` call before committing: pass it the diff summary, the red-then-green evidence and the open reviewer questions.
- [X] T053 Verify what the commit would contain: `git diff` per file; confirm `server.js`, `Tafsir.jsx`, `CLAUDE.md` hunks are only mine.
- [X] T054 Stage own hunks only (patch + `git apply --cached`; interactive add unsupported), then one separate commit with a clear Persian/English message ending with the required `Co-Authored-By` line. **No push, no deploy.** (Commit authorised for my own hunks by the user's standing note.)
- [X] T055 Final report: (1) Phase-1 table with source links, (2) changed files, (3) every Persian patient string verbatim, (4) what could not be verified (NCCN/ACOG/SGO/ESMO/EGTM-2017 breast/manufacturer inserts; no default ranges added), plus before/after test output.

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2** (setup, skeleton) → everything else.
- **US5 (Phase 3)** is a gate only for *clinical text* (Phase 7 and the `fa`/`between` wording drafts). US1, US2, US3 logic depends on printed-text semantics, not clinical sources, and can proceed in parallel with T009–T015.
- **US1 → US2** (labelled bands extend the same reader/verdict) → **US3** (rows need final verdict states) → **US4** (text needs table + verdict set) → **US6** (guard) → Polish.
- Shared files — avoid parallel edits: `serology.js` (T022, T024), `patterns_autoimmune.js` (T023, T028, T041), `tumor_markers.js` (T020, T021, T027, T033), `engine.test.js` (T019, T026, T040, T045), `resultStates.js` (T035).

### Parallel opportunities

- Setup: T002–T005 together.
- Research: T010, T011, T012 together after T009's format is confirmed.
- US1 tests: T016, T017, T018 together.
- US3: T031 with T036.
- Research (T009–T015) in parallel with US1/US2 code work.

## Implementation Strategy

- **MVP = Phase 1 + 2 + US1 (+ US5 research running alongside)**: the live sheet's CA 15-3 and CA 125 get correct verdicts and wording; stop and validate with quickstart §1–§2.
- Then US2 (CEA), US3 (rows + client — Principle II fix), US4 (text, after the table gate), US6 (guard), Polish.
- Do **not** ship US3's rows without the client change in the same commit: rows with `abnormal: null` would display as «در محدوده» on an old client.

## Notes

- A test counts only after it is observed red on the unmodified tree (N10).
- Persian text only via Write/Edit/Bash/Node — never PowerShell 5.1 `Get-Content/Set-Content` (N15).
- Don't add `refs.js`/`NAME_MAP`/`interpret.js` rows for these keys: the five-file checklist doesn't fit (printed-range-only, serology reader; a second reader breaks N25).
- Don't change `units.parseReference`/`parseSegment` (feeds every analyte; N36).
