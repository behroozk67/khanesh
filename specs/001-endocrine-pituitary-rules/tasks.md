# Tasks: Endocrine & Pituitary Rules — Henry ch.25 (Prolactin, Cortisol/ACTH)

**Input**: Design documents from `specs/001-endocrine-pituitary-rules/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/engine-output.md](contracts/engine-output.md), [quickstart.md](quickstart.md)

**Tests**: **Required, not optional.** Spec FR-022 and constitution Principle IV require every new rule to be locked by a regression test that was observed to **fail** first. Every story therefore runs *tests → red check → reviewer gate → implementation → green check → committed-tree check*.

**Organization**: Tasks are grouped by user story. US3 is placed **before** US1: both are P1, and US3 is the duplicate-freeze guard, which must exist before the first rule lands so it can catch that rule.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 from spec.md

## Conventions that apply to every task

- Backend commands run from `khanesh-server/`; frontend from `khanesh/`.
- **Persian text is never moved through PowerShell 5.1 cmdlets** (`Get-Content`, `Set-Content`, `Add-Content`, `Out-File`) — constitution V, N15(d). Append to `rules/engine.test.js` with the Write tool or `node -e "require('fs').appendFileSync(...)"`.
- New test ids start at **`M101`**; the new register entry is **`P46`** (both re-measured free on 2026-09-18). Test comments are in Persian, one test per behavior.
- Every number used in code comes from `P46`; none is invented in a task.
- "Red" means: run `npm test`, quote the failing test names and the `ℹ tests / pass / fail` line.
- "Committed-tree check" means the `git archive HEAD khanesh-server` + `node_modules` junction recipe in `CLAUDE.md` → Commands; remove the junction with `cmd /c rmdir` before deleting the temp dir.

---

## Phase 1: Setup (Shared)

**Purpose**: Measure the starting state — never quote it (constitution III).

- [X] T001 Measure the baseline in `khanesh-server/`: run `npm test` and `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.length))"`; record `tests / pass / fail` and the rule count (expected 113) with the tree they came from (`git rev-parse --short HEAD` + "working tree")
- [X] T002 Re-run the duplicate-panel freeze command from `specs/001-endocrine-pituitary-rules/quickstart.md` §0 and confirm its output still matches the table in `specs/001-endocrine-pituitary-rules/research.md` R7; if any row differs, update R7 before continuing
- [X] T003 [P] Collect real Iranian lab-sheet spellings (English and Persian) for prolactin, serum cortisol with and without a morning label, cortisol after dexamethasone, salivary cortisol, 24-h urinary free cortisol and ACTH, using the `research` agent (N2: from real sheets, not guesses); add them to the spelling column of `specs/001-endocrine-pituitary-rules/data-model.md` §1

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Clinical register, recognition, and module plumbing. None of this makes a clinical claim — mapped keys without a range land in `noRef`.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [X] T004 Write `P46` in `MEDICAL_RULES.md` under «در انتظار بازبینی», inserted before `## رویه نسخه‌بندی و بایگانی`, in the shape of `P43`–`P45`: the 12 numbers of `research.md` R8 each with its source (Henry ch.25) and what the patient reads either way; the three measured conflicts (TSH 4.5 vs 5.0 → `TSH 4.8/FT4 1.2`; Na correction 2.4 vs 1.6 → `Na 128/Glu 400`; central-hypothyroid arm → `TSH 1.0/FT4 0.6`) with their measured outputs; the "next feature" list with the calcitonin/procalcitonin name-collision warning; the excluded-input and excluded-treatment rule lists from the spec's coverage map; the all-ages decision and its infant-prolactin cost; the medication-text decision (FR-023); the guard ids `M101`–`M103e`
- [X] T005 Write guard `M103e` in `khanesh-server/rules/engine.test.js`: `FA_NAMES` contains `PRL`, `CORTISOL_AM`, `CORTISOL`, `CORTISOL_DST`, `CORTISOL_SAL`, `UFC`, `ACTH`, each Persian and none equal to its key (catches `CORTISOL`, which `M32` cannot see); run it and confirm **red**
- [X] T006 [P] Add the seven `FA_NAMES` entries in `khanesh-server/rules/names.js`; rerun `M103e` → green
- [X] T007 [P] Add `HENRY_ENDOCRINE` to `khanesh-server/rules/guidelines.js`, same shape as `HENRY_MINERAL` (title «Endocrine and Pituitary Function (فصل ۲۵)», year 2022, `access: 'open'`); confirm `G6` still passes
- [X] T008 Add `NAME_MAP` entries in `khanesh-server/rules/adapter.js` for the seven keys, using the spellings from T003 and `data-model.md` §1; morning-labelled spellings map to `CORTISOL_AM`, all other serum-cortisol spellings (including PM/evening) map to `CORTISOL` (depends on T003)
- [X] T009 [P] Add the three **exact** molar conversions to `khanesh-server/rules/units.js` per `research.md` R4 — cortisol family `nmol/L ÷ 27.59`, `ACTH pmol/L × 4.541`, `UFC nmol/24h ÷ 2.759` — each converting only when the sheet states the SI unit. Do **not** add the prolactin mIU/L factor here (it is `P46` #11 and waits for the US1 gate)
- [X] T010 Create `khanesh-server/rules/patterns_endocrine_pituitary.js` exporting an empty `RULES_ENDOCRINE_PITUITARY` array, then import and spread it into `RULES` in `khanesh-server/rules/patterns.js`
- [X] T011 Run `npm test` in `khanesh-server/`: all green; the test count equals T001's baseline **+ 1 (`M103e`)** (the plan said + 2 for `M37`/`M38` subtests; measured + 0 — they loop inside one test, research R6 corrected); `RULES.length` is still 113; and a `node -e` engine run shows `Prolactin`, `Cortisol`, `ACTH` moved from `unmapped` to `noRef`

**Checkpoint**: Recognition is in place with no clinical behavior change; `P46` awaits the reviewer.

---

## Phase 3: User Story 3 — Duplicates add nothing (Priority: P1)

**Goal**: The seven duplicate DSL rules (thyroid states, osmolal gap, calculated osmolality) produce exactly today's findings.

**Independent Test**: the research R7 panels give byte-identical findings before and after every later phase.

### Tests for User Story 3

- [X] T012 [US3] Write guard `M103` in `khanesh-server/rules/engine.test.js`: each `research.md` R7 panel (the four thyroid states, both central-hypothyroid arms, osmolal gap > 10, `Na 128 / Glu 400`) asserts the **exact** list of `pattern[urgency]` measured in T002 — nothing added, nothing removed

### Implementation for User Story 3

- [X] T013 [US3] Run `M103` in `khanesh-server/rules/engine.test.js` → green now, and record in this task that it must stay green through Phases 4–6; it is a "nothing changed" guard and is green on both trees by design (constitution IV exception for freeze guards, precedent `M94`)

**Checkpoint**: Any later rule that duplicates an existing finding turns `M103` red.

---

## Phase 4: User Story 1 — Prolactin no longer ends in "all normal" (Priority: P1) 🎯 MVP

**Goal**: A sheet with a high prolactin gets a `hyperprolactinemia` finding with the thyroid context, the common non-tumor causes, and — above 200 ng/mL — the pituitary sentence.

**Independent Test**: `Prolactin 80` alone (female, age 40) yields `hyperprolactinemia` and not the all-normal response.

### Tests for User Story 1 (write first, confirm red)

- [X] T014 [US1] Write `M101` in `khanesh-server/rules/engine.test.js`: `Prolactin 80` alone → a `hyperprolactinemia` finding; the pattern list is non-empty (so `buildNormalResult` would not be used)
- [X] T015 [US1] Write `M101b` in `khanesh-server/rules/engine.test.js`: `Prolactin 22` → female normal, male high, unknown sex high (research R3)
- [X] T016 [US1] Write `M101c` in `khanesh-server/rules/engine.test.js`: the four thyroid arms of `data-model.md` §4 (TSH high or FT4 low / TSH normal / TSH absent with suggestion «TSH و FT4» / TSH low) each produce distinct, correct text, and the thyroid finding itself is not restated
- [X] T017 [US1] Write `M101d` in `khanesh-server/rules/engine.test.js`: `Prolactin 250` → pituitary sentence present, urgency `this_week`; `Prolactin 200` → no pituitary sentence, `routine` (band edge); every prolactin finding names بارداری، شیردهی and داروها; no finding contains a "confirmed prolactinoma" phrase, a reassurance that normal prolactin excludes a tumor, or any drug/dose
- [X] T018 [US1] Write `M101e` in `khanesh-server/rules/engine.test.js`: `Prolactin 30`, male, age 1 → graded against the adult range (documents the all-ages decision; fails if a pediatric branch appears without a register decision)
- [X] T019 [US1] Run `npm test` in `khanesh-server/`: confirm `M101`–`M101e` are all **red**, quoting the failing lines, with `M103` still green

### Reviewer gate

- [ ] T020 [US1] **GATE** — confirm `P46` items #1 (PRL ULN 25/20), #2 (> 200), #11 (mIU/L ÷ 21.2) are marked approved in `MEDICAL_RULES.md`. If they are not, stop this story here; Stage A is complete and nothing clinical has shipped

### Implementation for User Story 1

- [ ] T021 [US1] Add `ADULT_REFS.PRL` (`M`/`F`, `ng/mL`) and a `prlRef(sex)` branch in `getRef()` beside `ESR`/`CREAT` in `khanesh-server/rules/refs.js`; unknown sex returns the male (lower) range; no pediatric branch (research R3)
- [ ] T022 [P] [US1] Add the prolactin `mIU/L ÷ 21.2` conversion to `khanesh-server/rules/units.js` with a comment naming it assay-dependent and pointing to `P46` #11
- [ ] T023 [US1] Implement `hyperprolactinemia` in `khanesh-server/rules/patterns_endocrine_pituitary.js` per `data-model.md` §4: the single `PRL` owner; the `PRL_PITUITARY_LIKELY` constant kept separate from the range; the four thyroid arms reading `graded.dir` (N12); pregnancy/breastfeeding/medications always named; urgency `routine` / `this_week` with the action derived via `actionFor()` (N20); `sources: ["HENRY_ENDOCRINE"]`; all text Persian through `faName()`
- [ ] T024 [US1] Run `npm test`: `M101`–`M101e` green, `M103` green, everything else green; then run the US1 rows of `specs/001-endocrine-pituitary-rules/quickstart.md` Stage B and quote the output
- [ ] T025 [US1] Committed-tree check of `khanesh-server/rules/engine.test.js` against `HEAD`: `M101`–`M101e` must be **red** against `HEAD` (N10); quote the numbers

**Checkpoint**: MVP — the measured silence is closed; US1 is shippable on its own.

---

## Phase 5: User Story 2 — Cortisol and ACTH without false alarms (Priority: P2)

**Goal**: Cortisol is interpreted through one classifier (`adrenalAxis`) with exactly one finding per sheet, ACTH as a companion, draw time respected, and medication confounders named.

**Independent Test**: `Cortisol (8 AM) 2` → `adrenal_insufficiency_likely`; `Cortisol 2` with no time → `cortisol_untimed` only, with no verdict.

### Tests for User Story 2 (write first, confirm red)

- [X] T026 [US2] Write `M102` in `khanesh-server/rules/engine.test.js`: a sweep of cortisol panels covering every `AdrenalLabel` in `data-model.md` §5 asserts **exactly one** adrenal finding per panel (fails on silence and on contradiction, like `M91e`) and that every label was reached at least once
- [X] T027 [US2] Write `M102b` in `khanesh-server/rules/engine.test.js`: untimed `Cortisol 3` → only `cortisol_untimed`; `CORTISOL` absent from `abnormal` and from graded tests; no verdict words («نارسایی», «کوشینگ», «پایین», «بالا» as a verdict)
- [X] T028 [US2] Write `M102c` in `khanesh-server/rules/engine.test.js`: `Cortisol post dex 1.5` → no insufficiency finding
- [X] T029 [US2] Write `M102d` in `khanesh-server/rules/engine.test.js`: the four ACTH arms (< 10 / > 20 / between / absent with suggestion «ACTH») for the Cushing labels
- [X] T030 [US2] Write `M102e` in `khanesh-server/rules/engine.test.js`: low morning cortisol + high UFC → `adrenal_discordant` and nothing else adrenal
- [X] T031 [US2] Write `M102f` in `khanesh-server/rules/engine.test.js`: every low-cortisol label names steroid medicines, every high-cortisol label names estrogen/birth-control pills, `adrenal_discordant` names both, `cortisol_untimed` names neither, and no finding advises stopping or changing a medicine (FR-023, SC-010)
- [X] T032 [US2] Write `M103b` in `khanesh-server/rules/engine.test.js`: `CORTISOL` is not a key of `ADULT_REFS`, and `runEngine(...).ungraded.CORTISOL` equals the printed value
- [X] T033 [US2] Write `M103c` in `khanesh-server/rules/engine.test.js`: `Cortisol (8 AM) 190 nmol/L` converts to ≈ 6.9 µg/dL with a `unitConversions` row carrying a Persian `name`; unitless `Cortisol 400` is not graded and its finding says the unit is unclear
- [X] T034 [US2] Write `M103d` in `khanesh-server/rules/engine.test.js`: across all `M101*`/`M102*` panels, no finding of this feature has `urgency: "emergency"`, and every one of the 8 feature patterns was reached (so the sweep cannot pass by firing nothing — N15)
- [X] T035 [US2] Run `npm test` in `khanesh-server/`: confirm `M102`–`M102f` and `M103b`–`M103d` are all **red**, quoting the failing lines; `M101*` and `M103` stay green

### Reviewer gate

- [ ] T036 [US2] **GATE** — read the approval state of `P46` #3–#10 and #12 in `MEDICAL_RULES.md` and, per the plan's "Stage B ordering" table in `specs/001-endocrine-pituitary-rules/plan.md`, list which labels/signals are unblocked. Implement only those; for each blocked piece, mark its guard assertions `todo` with a `t.diagnostic` naming the `P46` item (a visible, not silent, exemption — CLAUDE.md "skipped" rule)

### Implementation for User Story 2

- [ ] T037 [US2] In `khanesh-server/rules/adapter.js` `runEngine()`: populate a new `ungraded` object (key → value) at the `noRef` branch without changing `noRef`; add the unitless cortisol-family `> 100` guard (not graded, with a flag the finding reads). Do **not** add `ungraded` to `engineDebug()` in `server.js` (contract §1)
- [ ] T038 [US2] Add the approved ranges to `khanesh-server/rules/refs.js`: `CORTISOL_AM` (#4), `ACTH` (#6), `UFC` (#7), `CORTISOL_DST` as `[0, 1.8]` (#9), `CORTISOL_SAL` as `[0, 0.337]` µg/dL = 9.3 nmol/L (#10); never add `CORTISOL`
- [ ] T039 [US2] Implement `adrenalAxis(e)` in `khanesh-server/rules/patterns_endocrine_pituitary.js` per `data-model.md` §5: the signals, the precedence table (discordant → cushing_likely → cushing_screen_positive → insufficiency_likely → insufficiency_indeterminate → am_high_nonspecific → untimed → null), and the constants `AM_INSUFFICIENCY_LIKELY`, `UFC_STRONG_MULTIPLE`, `DST_POSITIVE` (≥, not the range's >), `SAL_POSITIVE`, `ACTH_INDEPENDENT`, `ACTH_DEPENDENT` kept separate from the ranges (data-model §6)
- [ ] T040 [US2] Implement the seven label rules in `khanesh-server/rules/patterns_endocrine_pituitary.js`, each `match: (e) => adrenalAxis(e) === "<label>"`, with pattern ids from `contracts/engine-output.md` §2: ACTH arms (four for the Cushing labels; present/absent without a threshold for the insufficiency labels); the medication sentences (FR-023); urgency per the data-model precedence table, action via `actionFor()`; `sources: ["HENRY_ENDOCRINE"]`; `cortisol_untimed` reads `e.ungraded.CORTISOL` only
- [ ] T041 [P] [US2] Add `SUGGEST_TESTS` rows `«ACTH»: ["ACTH"]` and `«کورتیزول صبح»: ["CORTISOL_AM"]` in `khanesh-server/rules/patterns.js` (N8: same commit as the rules that suggest them)
- [ ] T042 [US2] Run `npm test`: `M102`–`M102f`, `M103b`–`M103d` green; `M101*`, `M103`, `M103e` still green; then run the US2 rows of `specs/001-endocrine-pituitary-rules/quickstart.md` Stage B and quote the output
- [ ] T043 [US2] Committed-tree check of `khanesh-server/rules/engine.test.js` against `HEAD`: `M102`–`M102f` and `M103b`–`M103d` must be **red** against `HEAD` (N10); quote the numbers

**Checkpoint**: All three stories work independently; no emergency urgency from this feature.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T044 [P] Add the six graded keys to the endocrine group in `khanesh/src/testCategories.js` (presentation only), then run `npm run lint` in `khanesh/` and quote the result
- [X] T045 [P] Record in `khanesh-server/rules/REF_DIFF.md` that the manual-entry `REF` (`khanesh/src/labRefs.js`) deliberately does not include `PRL`, cortisol keys or `ACTH`, and why (research R9)
- [ ] T046 Diff the rule-id set in `khanesh-server/` (N16 one-liner): exactly 8 additions, 0 removals, `RULES.length` = 121
- [X] T047 Re-run the duplicate freeze from `specs/001-endocrine-pituitary-rules/quickstart.md` and `diff` it against T002's output: it must print nothing (FR-014)
- [ ] T048 Update `CLAUDE.md`: Lab Notebook **N2** recurrence (unmapped prolactin → the all-normal response, with the measured panel and guard `M101`); the rule count (113 → 121) in "Where a pattern lives"; the new module in the File Structure tree; baseline rows for the working tree and for `HEAD` with the new tests dropped in (from T024/T025/T042/T043) — expected total = T001 baseline **+ 16** (16 guards; no automatic subtests — see T011)
- [ ] T049 Run the `code-reviewer` agent over the full diff of `khanesh-server/rules/`, `khanesh/src/testCategories.js`, `MEDICAL_RULES.md` and `CLAUDE.md` (engine boundary, `faName`, units, ownership, urgency, Persian text) and fix every confirmed finding before commit
- [X] T050 Final verification: `npm test` in `khanesh-server/` and `npm run lint` in `khanesh/`, quoting the real output lines; state which tree was measured

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **US3 (Phase 3)** → **US1 (Phase 4)** → **US2 (Phase 5)** → **Polish (Phase 6)**.
- **US3 before US1**: `M103` must exist before the first rule lands, or it cannot catch that rule.
- **US2 after US1**: not a code dependency (the modules are separate). The order is set by priority, and because `M103d` sweeps the panels of both stories.
- **Reviewer gates (T020, T036)** are external: Stage A (everything up to and including T019 / T035) can be finished and merged without any approval, because it makes no clinical claim.

### Within each story

Tests → red check → gate → implementation → green check → committed-tree check. The tests all live in one file (`rules/engine.test.js`), so they are **sequential**, never `[P]`.

### Parallel opportunities

| phase | parallel group | why safe |
|---|---|---|
| Setup | T003 alongside T001–T002 | agent research vs local commands |
| Foundational | T006, T007, T009 | `names.js`, `guidelines.js`, `units.js` — distinct files, no mutual dependency |
| US1 | T022 alongside T021/T023 | `units.js` vs `refs.js` / the patterns module |
| US2 | T041 alongside T037–T040 | `patterns.js` row vs `adapter.js` / `refs.js` / the patterns module |
| Polish | T044, T045 | frontend file vs `REF_DIFF.md` |

### Parallel example — Foundational

```text
Task: "T006 Add the seven FA_NAMES entries in khanesh-server/rules/names.js"
Task: "T007 Add HENRY_ENDOCRINE to khanesh-server/rules/guidelines.js"
Task: "T009 Add the three exact molar conversions to khanesh-server/rules/units.js"
```

### Parallel example — User Story 1

```text
Task: "T021 prlRef(sex) branch in khanesh-server/rules/refs.js"
Task: "T022 prolactin mIU/L conversion in khanesh-server/rules/units.js"
```

### Parallel example — User Story 2

```text
Task: "T037 ungraded field + unitless guard in khanesh-server/rules/adapter.js"
Task: "T041 SUGGEST_TESTS rows in khanesh-server/rules/patterns.js"
```

---

## Implementation Strategy

### MVP first

1. Phases 1–2 (recognition, `P46`), then Phase 3 (freeze guard).
2. Phase 4 up to the gate (T014–T019): the prolactin tests are red and Stage A is **mergeable today**.
3. After the reviewer approves `P46` #1, #2, #11 → T021–T025. **Stop and validate**: the measured silence is closed. This is the MVP.

### Incremental delivery

- **Increment 1 — Stage A (no approval needed):** T001–T019 and T026–T035. The register entry, recognition and every red guard land together.
- **Increment 2 — prolactin (US1):** after #1/#2/#11 approval.
- **Increment 3 — cortisol/ACTH (US2):** after #3–#10/#12. It can ship partially: the gate (T036) implements only the unblocked labels, and the blocked guards are visible `todo`s rather than silent skips.
- **Increment 4 — Polish.**

### Task counts

| phase | tasks |
|---|---|
| Setup | 3 |
| Foundational | 8 |
| US3 | 2 |
| US1 | 12 |
| US2 | 18 |
| Polish | 7 |
| **Total** | **50** |
