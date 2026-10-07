---

description: "Task list for 015 — sheet score redesign"
---

# Tasks: Redesign of the Sheet Score («امتیازِ این برگه»)

**Input**: Design documents from `specs/015-sheet-score-redesign/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/score-output.md, quickstart.md

**Tests**: REQUIRED. FR-020 and Constitution Principle IV require every new test to be observed **red on the pre-change code** before the implementation lands. "Red-first check" below always means the same three steps:

1. `git stash push khanesh-server/rules/score.js khanesh-server/rules/patterns.js`
2. `cd khanesh-server && node --test rules/score.test.js`, and record which tests fail
3. `git stash pop`

**Paths**: backend `khanesh-server/`, frontend `khanesh/src/`. All commands run from inside the owning sub-project. Persian text goes through Write/Edit only, never PowerShell cmdlets (Principle V).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup

- [X] T001 Measure and record the baseline on the working tree: run `npm test` in `khanesh-server/` and `npm run lint` in `khanesh/`, and write the exact `tests · pass · fail` and lint error/warning counts into the commit-message draft at `specs/015-sheet-score-redesign/baseline.txt` (Principle III: measured, naming the tree `recovery` @ `HEAD` + uncommitted).

---

## Phase 2: Foundational (blocks every story)

- [X] T002 [P] Add `export function ruleReads(id)` to `khanesh-server/rules/patterns.js`. It returns `new Set(RULE_READS.get(id) ?? [])`. Extend the comment above `RULE_READS` to name the second, non-clinical consumer (`score.js` per-system caps, research R4). Change nothing else in the file.
- [X] T003 [P] Write the failing guard test «SCORE_TABLE همهٔ ۱۰۹ کلید را دقیقاً یک‌بار پوشش می‌دهد» in `khanesh-server/rules/score.test.js`. It asserts that the union of `ADULT_REFS`, `PED_REFS`, `CLASSIFIERS` and `CTCAE_MAP` equals the keys of `SCORE_TABLE` ∪ `EXCLUDED`, with no key in both, and that every `SCORE_TABLE[k].system` is one of the 8 ids in data-model.md.
- [X] T004 [P] Write the failing test «هر بازهٔ graded یا `lo–hi` است یا یک‌طرفه» in `khanesh-server/rules/score.test.js`. It runs `runEngine` on one in-range and one out-of-range row for every `ADULT_REFS` key that `NAME_MAP` can reach, and asserts that `parseRange(g.range)` returns `{lo, hi}` or `null` only for the `≥ x` shape (research R1).
- [X] T005 Run the red-first check for T003–T004 and confirm both fail (the import of `SCORE_TABLE`/`parseRange` is missing).
- [X] T006 In `khanesh-server/rules/score.js`, add `SCORE_TABLE` (key → `{ system, bucket }`), `EXCLUDED` (key → Persian reason), `SYSTEMS` (ordered `[{ id, fa, weight }]`) exactly as in data-model.md, and `parseRange(range)` (regex `^(-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)$`, returning `null` otherwise). Run `node --test rules/score.test.js` and confirm T003/T004 are green.
- [X] T007 Change the signature to `healthScore(engineOut, patternOut)` in `khanesh-server/rules/score.js`, where a string second argument becomes `{ overall_urgency: arg, findings: [] }`. Update the single call site in `khanesh-server/server.js` (≈ line 230) to pass `patternOut`. Verify: `npm test` in `khanesh-server/` has the same counts as T001.

**Checkpoint**: the table, the parser and the call shape are in place; scores are still computed the old way.

---

## Phase 3: User Story 1 — A mild deviation reads as mild (P1) 🎯 MVP

**Goal**: PT 14 / INR 1.2 on an otherwise normal sheet totals above 80 (SC-001), and PT and INR count once.

**Independent test**: quickstart §2, row 1: value ≈ 96, coag 75, all other systems 100.

### Tests (write first, must be red)

- [X] T008 [P] [US1] In `khanesh-server/rules/score.test.js`, add «SC-001: PT 14 + INR 1.2 روی برگهٔ طبیعی ⇒ کل > ۸۰». Build it with the real engine: `runEngine` on the measured base panel (research R5) → `runPatterns` → `healthScore(e, p)`. Assert `value > 80`, `systems` with id `coag` has `cap === 75` and `score === 75`, and every other non-null system scores ≥ 95.
- [X] T009 [P] [US1] Add «فاصله برحسبِ عرضِ بازه» to `khanesh-server/rules/score.test.js`. Using hand-built graded rows with `range`, assert `testPoints` gives PT 14 (11–13.5) ≈ 0.96, INR 1.2 (0.9–1.1) = 0.80, pH 7.25 (7.35–7.45) = 0.50, Cl 85 (95–103) ≈ 0.39, each ± 0.01.
- [X] T010 [P] [US1] Add «سطل: PT+INR+aPTT یک‌بار شمرده می‌شوند» to `khanesh-server/rules/score.test.js`. The coag system's `raw` with PT+INR equals its `raw` with PT+INR+APTT-slightly-high whenever APTT's points ≥ INR's.
- [X] T011 [P] [US1] Add «سقفِ this_week فقط روی دستگاهِ خودش» to `khanesh-server/rules/score.test.js`. On the T008 panel, assert that `blood`, `kidney`, `liver` and `metabolic` have `cap === null`.
- [X] T012 [US1] Run the red-first check for T008–T011 and record the failing names in `specs/015-sheet-score-redesign/baseline.txt`.

### Implementation

- [X] T013 [US1] Rewrite `testPoints(g)` in `khanesh-server/rules/score.js` per data-model.md «Test score» (width-relative `relW`, direction from `g.dir`, `min` with `POINTS[level]`, 0.5 only as the no-range/no-level fallback). Remove `outNoLevel` from `POINTS`.
- [X] T014 [US1] Implement buckets and systems in `khanesh-server/rules/score.js`. Bucket = min of scored members. System `raw = (0.65·mean + 0.35·min) × 100`. Fill `keys`, `critical`, and `worst = { key, name: faName(key), points }`.
- [X] T015 [US1] Implement per-system caps in `khanesh-server/rules/score.js` per research R4. For each `patternOut.findings` entry with urgency `soon|this_week|routine`, the capped keys are abnormal graded keys in `ruleReads(f.rule_id)` ∪ `f.uncovered`; `unmatched_abnormal` caps every key in `engineOut.abnormal`. `system.score = round(min(raw, cap ?? 100))`. Remove the whole-sheet cap for non-emergency levels.
- [X] T016 [US1] Implement the total in `khanesh-server/rules/score.js`: the weighted mean of non-null systems (weights from `SYSTEMS`), with `version: 2`, `covered`, `systems` (all 8, in order) and `points` kept. **Keep the emergency ⇒ ≤ 35 cap in this same task.** Removing the whole-sheet cap without it, even for one commit, would let K 7.0 average up. Run `node --test rules/score.test.js` and confirm T008–T011 are green.

**Checkpoint**: the reported defect is fixed in the API output.

---

## Phase 4: User Story 2 — A dangerous value is never averaged away (P1)

**Goal**: the emergency cap holds at 35, a CTCAE level floors the distance score, and the total never exceeds the worst system + 30.

**Independent test**: quickstart §2, row 3 (K 7.0 ≤ 35), plus the metamorphic sweeps.

### Tests

- [X] T017 [P] [US2] Rewrite the existing test «امتیاز هرگز از سقفِ فوریتش بیشتر نیست (همهٔ سطح‌ها)» in `khanesh-server/rules/score.test.js` to assert only the `emergency` ⇒ ≤ 35 half. Add a Persian comment that the non-emergency whole-sheet cap was retired on purpose (spec FR-011, FR-020).
- [X] T018 [P] [US2] Add «سطحِ CTCAE کف است» to `khanesh-server/rules/score.test.js`. A K row with `level: "marked"` and a value 1% above the ULN scores exactly 0.15, not the distance value.
- [X] T019 [P] [US2] Add «کل ≤ بدترین دستگاه + ۳۰» to `khanesh-server/rules/score.test.js`. Build 7 normal systems plus one system with raw 40 and no emergency; assert `value ≤ 70`.
- [X] T020 [P] [US2] Add the metamorphic test «بدترشدن هرگز امتیاز را بالا نمی‌برد» to `khanesh-server/rules/score.test.js`. Through the real engine, walk PT, INR, K, GLU_F, ALT, CREAT, HGB (low), PLT (low) and PH (low) out in 10 steps from the bound on a ≥ 2-system base panel, and assert `value` is non-increasing at each step (SC-003).
- [X] T021 [P] [US2] Add the metamorphic test «افزودنِ آزمایشِ طبیعی امتیاز را پایین نمی‌آورد» to `khanesh-server/rules/score.test.js`. With the findings held fixed (call `healthScore` with the same `patternOut`), adding an in-range graded row in any system never lowers `value` (SC-004).
- [X] T022 [US2] Run the red-first check for T018–T021 and record the result in `baseline.txt`. Note that T020/T021 may already be green before the change (monotonicity largely held before), so they are guards, not red-first proofs; say so in the test comment, as M241d/M241e did.

### Implementation

- [X] T023 [US2] In `khanesh-server/rules/score.js`, apply `value = min(weightedMean, minSystem + 30)` before the emergency cap that T016 already keeps. Set `cap` and `capped`. Run `node --test rules/score.test.js` and confirm all of US1 and US2 is green.

---

## Phase 5: User Story 4 — Not enough data, no number (P2)

**Goal**: `too_few` / `one_system` / `neonate` reasons. System scores are still returned when the total is null.

**Independent test**: quickstart §2, row 5 (CBC only ⇒ `one_system`, the blood system scored).

- [X] T024 [P] [US4] Rewrite the existing tests «کمتر از حداقل آزمایش» and «نوزاد» in `khanesh-server/rules/score.test.js` to count **buckets** (< 5 ⇒ `too_few`) and to assert the newborn gets a filled `count` and all-null `systems`.
- [X] T025 [P] [US4] Add «یک دستگاه ⇒ one_system و نمرهٔ آن دستگاه می‌ماند» to `khanesh-server/rules/score.test.js`: Hb, WBC, PLT, MCV, RDW, ferritin through the real engine.
- [X] T026 [US4] Run the red-first check for T024–T025 and record the result in `baseline.txt`.
- [X] T027 [US4] Implement reason ordering in `khanesh-server/rules/score.js`: `neonate`, then `too_few` (< 5 buckets), then `one_system` (< 2 non-null systems). `value` and `band` are null when a reason is set. Run `node --test rules/score.test.js` and confirm it is green.

---

## Phase 6: User Story 3 — The patient sees why (P2)

**Goal**: the count line comes first, the number carries a label, the lowest test in each system is named in Persian, and the frontend has no formula of its own.

**Independent test**: quickstart §4.

### Backend part (tests first)

- [X] T028 [P] [US3] Add «شمارشِ ساده» to `khanesh-server/rules/score.test.js`. On a panel with one mild, one critical and two no-level out-of-range rows, assert `count.out === 4`, `levels.mild === 1`, `levels.critical === 1`, `no_level === 2`, and the contract invariant `out === Σ levels + no_level`. Add an invariant sweep over all 8 `systems[].worst.name`: `name === faName(key)` (N8).
- [X] T029 [US3] Run the red-first check for T028, then implement `count` (`scored`, `out`, `levels`, `no_level`, `excluded`) in `khanesh-server/rules/score.js`. Excluded keys go to `excluded` only. Run `node --test rules/score.test.js` and confirm it is green.

### Frontend part (no test runner; verify by reading + lint + browser)

- [X] T030 [US3] In `khanesh/src/ResultDashboard.jsx`, delete `systemScore()` and its comment block (lines ≈ 167–177). Build `scoreSystems = (score?.systems ?? []).filter(s => s.score != null)`, each with `rows = all.filter(r => s.keys.includes(r.key))`. Pass `scoreSystems` to `RadarCard` instead of the display groups. Display groups keep rendering the test list but no longer carry a `score`.
- [X] T031 [US3] In `RadarCard` in `khanesh/src/ResultDashboard.jsx`:
  - read `s.fa`, `s.score` and `s.critical` (tone) from the server systems;
  - a click focuses the derived rows from T030;
  - under each system's number, render «پایین‌ترین: {worst.name}» when `worst` is set;
  - replace the overall caption with «امتیازِ این برگه — خلاصهٔ مرورِ سریعِ همین برگه، نه حکمِ پزشکی».
- [X] T032 [US3] Above the number in `khanesh/src/ResultDashboard.jsx`, render the count line from `score.count` exactly as in contracts/score-output.md: «از {N} آزمایش، {k} مورد خارج از محدوده» plus the non-zero parts «کمی خارج / خارج / خیلی خارج / بحرانی / بدون درجهٔ شدت», or «از {N} آزمایش، همه در محدوده». Use `toFa` for the digits.
- [X] T033 [US3] Update `NO_SCORE_FA` in `khanesh/src/ResultDashboard.jsx`: the new `too_few` text, and `one_system` interpolating `score.systems.filter(s => s.score != null).map(s => s.fa).join('، ')` (contract strings verbatim). An absent `score.version` (older server) falls back to showing the number without systems, and never calls a deleted formula.
- [X] T034 [US3] Verify in `khanesh/`: `npm run lint` (0 errors), `npm run build` (success), and `grep -n "systemScore\|0\.65\|0\.35" src/ResultDashboard.jsx` returns nothing.

---

## Phase 7: Polish & cross-cutting

- [X] T035 [P] Rewrite the P97 entry in `MEDICAL_RULES.md` (Persian, Edit/Write only):
  - what it does now;
  - every constant marked «پیشنهادیِ من، بی‌اعتبارسنجی»: the curve (1 width ⇒ 0.5), 0.65/0.35, the weights, +30, 5 buckets / 2 systems, the per-system caps;
  - the placement calls (CK/myoglobin → heart, amylase/lipase → liver, semen excluded);
  - the open question «آیا this_week برای PT 14 / INR 1.2 درست است؟».
- [X] T036 [P] Append a Lab Notebook entry to `CLAUDE.md` (N32 or the next free number):
  - the fixed 0.5 for level-less rows, plus the whole-sheet cap, turned PT 14 / INR 1.2 into 75 (about 50 on longer sheets);
  - the first proposed fix (bound-relative distance) would have scored pH 7.25 at 0.997;
  - the generalizing rule: a display score built on reference-range geometry must be checked on the narrowest ranges, not the ordinary ones;
  - also the `levels` vocabulary: the engine never says «خفیف/متوسط/شدید».
- [X] T037 Run the quickstart §2 probe and paste the six measured rows into `specs/015-sheet-score-redesign/baseline.txt` next to the expected values. Any mismatch is a defect, not a note.
- [X] T038 Run the full `npm test` in `khanesh-server/` and compare against T001. Expected: `fail 0`, with the test count raised by exactly the tests added here. Read past the summary to the first error if anything is red (CLAUDE.md, 2026-08-06 note).
- [X] T039 Browser check per quickstart §4. Run `npm run dev` in both sub-projects and submit the PT/INR panel and a CBC-only panel through the manual path. Confirm the count line, radar systems, the coag 75 + «پایین‌ترین: INR», the label, and the `one_system` sentence. Record what was seen (post-interaction state, not a top-of-page screenshot; N11).
- [X] T040 Dispatch the `code-reviewer` agent on the diff (engine boundary, `faName`, Persian strings, the frontend/backend contract) and fix any finding before commit.

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → stories.** T002–T004 can run in parallel. T006 needs T003–T005. T007 needs T006.
- **US1 (Phase 3)** needs Phase 2. It is the MVP.
- **US2 (Phase 4)** needs T016 (total exists). Its tests T017–T021 can be written alongside US1's.
- **US4 (Phase 5)** needs T016.
- **US3 (Phase 6)**: the backend half (T028–T029) needs T016; the frontend half (T030–T034) needs T029, so that `count` and `systems` exist in the payload.
- **Polish** comes after all stories. T035 and T036 are parallel. T038–T040 run last, in order.

## Parallel examples

- After T001: T002 (`patterns.js`), T003 and T004 (`score.test.js`, written as one edit).
- US1 tests T008–T011 are one batch edit to `score.test.js`. US2 tests T017–T021 can go in the same batch to save a red-first cycle (record them separately in `baseline.txt`).
- T035 (`MEDICAL_RULES.md`) and T036 (`CLAUDE.md`) are fully independent.

## Implementation Strategy

1. **MVP = Phases 1–3 (US1).** This alone fixes the reported PT/INR case in the API, and it is safe to ship because the frontend keeps reading `value` and `points`, which are unchanged in shape.
2. Add US2 before any release. The emergency cap survives from T016, but without US2 the "worst + 30" bound is missing, so a single non-emergency system scoring 40 could hide in a mean of 90 (the safety half of the same change).
3. Then US4, then US3 (UI), then Polish. Commit after Polish with the measured counts from T038 in the message (memory: commits allowed, never push).
