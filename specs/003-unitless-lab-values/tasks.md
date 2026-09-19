---

description: "Task list — واحدِ درست برای ردیف‌هایی که روی برگه واحد ندارند"
---

# Tasks: واحدِ درست برای ردیف‌هایی که روی برگه واحد ندارند

**Input**: Design documents from `specs/003-unitless-lab-values/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/engine-output.md](contracts/engine-output.md), [quickstart.md](quickstart.md)

**Tests**: REQUIRED. FR-011 and Constitution IV say every fixed wrong output needs a test that was **red on the pre-fix code first**. Every test task below says which tree it must fail on.

**Organization**: Tasks are grouped by user story. Phase A (no new clinical numbers) covers US1, US2 and the recording part of US3. Phase B (magnitude cut-offs) is gated on reviewer approval of `P48`.

## Baseline (T001, measured 2026-09-19)

| tree | tests | pass | fail | todo |
|---|---|---|---|---|
| working tree on `edec069`, before specs/003 | 459 | 442 | 0 | 17 |
| same, after connecting the unit logic, **before** giving the fixtures units | 459 | 297 | **145** | 17 |
| working tree after specs/003 (M121–M125, T20) | 471 | 454 | 0 | 17 |
| `edec069` rules with the new test files dropped in (`prefix003`) | 470 | 440 | 13 (exactly the 11 new + `G1b`, `M115`) | 17 |
| working tree with `unit_unknown_values` filtered out of `RULES` | 470 | 446 | 7 (`M115`, `M122`, `M122c`, `M123`, `M123c`, `M123d`, `T20`) | 17 |

Rule ids: 118 → 119 (+`unit_unknown_values`, 0 removed). `npm run lint` (khanesh): 0 errors.
**Unplanned:** 342 unitless fixture rows in `engine.test.js`/`api-contract.test.js`/`geriatric.test.js` leaned on the old "unitless = conventional" guess. They got the conventional unit via an insertion-only codemod (stripping the insertions reproduces the old files exactly), and all 342 pass on `prefix003` too, so their meaning is unchanged. Tests that deliberately check for a missing unit (`G1b`, `M83d`, `M103c`, `M115`) were handled by hand.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1, US2, US3)
- All paths are repo-relative. Backend commands run in `khanesh-server/`; frontend commands in `khanesh/`.

---

## Phase 1: Setup (measure before touching anything)

**Purpose**: Constitution III: every number is measured on the tree being changed, never quoted.

- [X] T001 Measure the baseline: `cd khanesh-server && npm test`. Record `tests · pass · fail · todo`, naming the tree (`git rev-parse --short HEAD` plus "working tree"), at the top of `specs/003-unitless-lab-values/tasks.md` under a `## Baseline` heading. Expect 459 · 442 · 0 · 17 on `edec069`, but record what you actually measure
- [X] T002 Record the rule-id set before any change: `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > <scratchpad>/ids-before.txt` in `khanesh-server/` (N16). Expect 118 ids
- [X] T003 [P] Snapshot `khanesh-server/rules/` and `khanesh-server/server.js` into `<scratchpad>/prefix003/` with a `node_modules` junction (PowerShell `New-Item -ItemType Junction`). Every "red before the fix" check in this list runs against this copy
- [X] T004 [P] Inventory every unit string the suite and fixtures use. From `khanesh-server/`, grep `unit:` and the third element of every `[name, value, unit]` row in `rules/engine.test.js` and `api-contract.test.js`; normalize each with the same lowercase/strip-spaces rule as `normUnit` in `rules/units.js`; save the unique list to `<scratchpad>/units-in-tests.txt`. T008's alias table must cover every conventional spelling on that list (research R5 regression risk)

---

## Phase 2: Foundational (blocking — the resolver and its owner ship together)

**Purpose**: The pure `decideUnit` function, its wiring into the adapter, and the owner rule. ⚠️ These must land **in the same change**. `server.js` already sends any `ungraded` reason other than `no_range` down the engine path, so wiring without an owner would turn an "all unitless" sheet into `buildNormalResult()` (N2). This is the same trap as `T19` in `P47`.

### Tests for the foundation (write first; each must be red on `prefix003`)

- [X] T005 [P] Add `M121` to `khanesh-server/rules/engine.test.js`: a unit table for `decideUnit` with no engine involved. It covers:
  - printed `mg/dl`, `mg%` and `mgr/dl` give `conv/printed`;
  - printed `µmol/l` gives `si/printed`;
  - empty, `"-"` and `null` units fall through;
  - `reference: "53-115"` for `CREAT` gives `si/reference`, `"0.6-1.2"` gives `conv/reference`, and `"۵۳-۱۱۵"` (Persian digits) gives `si/reference`;
  - an unparseable reference (`"see note"`) and a two-sex line give `null`;
  - no unit and no reference gives `null` (Phase A: `plausible` is null for every key).

  Red on `prefix003`, where the import fails, which counts as red. Paste the failure
- [X] T006 [P] Add `M121b` to `khanesh-server/rules/engine.test.js`: every key in `SI_CONVERSIONS`, plus `TROPONIN_I`, `T3`, `CRP_Q`, `ACR` and `TESTO`, has a `UNIT_PROFILE` row with a non-empty `convAliases` and both LOINC codes. It also asserts that no `UNIT_PROFILE` row stores its own factor literal: rows read `SI_CONVERSIONS`, or the named branch-factor exports for the five bespoke keys ("one number, one job"). This is the SC-003 guard
- [X] T007 [P] Add `M121c` to `khanesh-server/rules/engine.test.js`: the R4 decisiveness proof. For every key where `decideUnit` allows step 2, the ratio between its two systems is ≥ 1.5² = 2.25, so no printed range can be within 1.5× of both. Compute it from `SI_CONVERSIONS` at run time; don't hard-code it. It also asserts that the keys below 2.25 are exactly `B12` (1.36) and `FT3` (1.54), and that for both, `decideUnit` with a printed range and no unit returns `null`. If a future key falls below 2.25, this test goes red until it is handled

### Implementation

- [X] T008 Add to `khanesh-server/rules/units.js`:
  - `CONV_ALIASES`: per-key recognized spellings of the conventional unit, after `normUnit`. It must cover every conventional spelling from T004's list, plus `mg%`, `mgr/dl`, `mg/100ml`, `gr/dl`, `gr%`, `mcg/dl` and `ug/dl`.
  - `UNIT_PROFILE`: `{ key, convAliases, loinc: { mass, substance }, plausible: null }` for every key in R1. `siRe` and `factor` are read from `SI_CONVERSIONS` and never copied. The LOINC codes are verified with `curl "https://clinicaltables.nlm.nih.gov/api/loinc_items/v3/search?terms=<code>&df=LOINC_NUM,LONG_COMMON_NAME&ef=PROPERTY"`; the `PROPERTY` must be `MCnc` or `SCnc` respectively. Record each code in a Persian comment.

  Keep `plausible: null` for all keys. Filling it is Phase B (T031).
  - **Keys with their own adapter branch** (`TROPONIN_I` ×1000, `T3` nmol/L→ng/dL, `CRP_Q` mg/dL→mg/L ×10, `ACR` mg/mmol→mg/g ×8.84, `TESTO` ng/mL ×100 and nmol/L): move each branch's factor into one named export in `units.js`. The branch and `UNIT_PROFILE` both read that export, so the number exists once
- [X] T009 Add `parseReference(str)` to `khanesh-server/rules/units.js`, per research R4.
  - Formats: `a-b`, `a–b`, `a to b`, `<b`, `≤b`, `up to b`, `>a`.
  - Map Persian and Arabic digits to Latin first.
  - Return `{lo, hi}` or `null`.
  - A line with two ranges (e.g. `M: … F: …`) returns `null`
- [X] T010 Add the pure function `decideUnit(key, value, unit, reference, sex)` to `khanesh-server/rules/units.js`, exactly per the data-model §3 table.
  - The engine range comes from `getRef(key, sex, 40)` in `refs.js`, divided by the factor for SI.
  - Step 2 is skipped for any key whose two-system ratio is < 2.25 (`B12`, `FT3`; research R4).
  - A range is decisive when the log-distance to one system is < `Math.log(1.5)` and to the other is > it.
  - If `plausible` is set and the value falls outside the chosen system's plausible range, the result is `null` (a conflict, not a guess).
  - Add a Persian comment that names N3 and says this function never writes `tests`
- [X] T011 Wire `decideUnit` into the general numeric path of `khanesh-server/rules/adapter.js`, in the IFCC block just before `toConventional`. This applies only to keys in `UNIT_PROFILE`.
  - `conv`: leave `v` as is. If basis ≠ `printed`, push `{test, raw, from, value, to, basis}` with `raw === value`.
  - `si`: convert with the existing factor (via `toConventional` with the resolved SI unit) and push the entry with `basis`.
  - `null`: don't write `tests[key]`. Record it in a local `unitUnknown` map `{key: rawValue}` and `continue`.

  Add `basis: "printed"` to the existing printed-SI conversions so every entry carries a basis
- [X] T012 Apply the same resolver inside the bespoke branches of `khanesh-server/rules/adapter.js`:
  - **Troponin branch:** a missing unit and no decisive reference gives `unitUnknown`, instead of today's silent `µg/L`. Keep the existing `hsUnit`/`hsName` logic for printed units untouched, and update its Persian comment, which currently claims the unit is "deliberately not guessed" while it is in fact assumed.
  - **`T3`, `CRP_Q`, `ACR`:** the same pattern.
  - **`TESTO`:** replace the `P47` `unitUnknown` Set with the new map; the `ng/mL` ×100 branch stays.
  - **`DDIMER`:** untouched (research R1; recorded in `P48`)
- [X] T013 In `runEngine` in `khanesh-server/rules/adapter.js`, turn each `unitUnknown` entry into `ungraded[key] = { value, reason: "unit_unknown", alt: { conv, si } }`.
  - `conv` and `si` are `"normal"`/`"abnormal"` from `evaluate()` against the engine range: the raw value as conventional, and the raw value converted as SI.
  - Don't store `dir` (research R7).
  - Remove the old `TESTO`-only `unit_unknown` branch so there is one path.

  Confirm `ungraded` is still not serialized into `_engine` (`serializeGraded` in `server.js`)
- [X] T014 Create `khanesh-server/rules/patterns_unit_unknown.js` exporting `RULES_UNIT_UNKNOWN = [unit_unknown_values]`, per `contracts/engine-output.md`.
  - **Text:** Persian text verbatim from the contract, one clause per row via `faName(key)` and the raw value.
  - **Urgency:** computed once: `this_week` if any row has `alt.conv === "abnormal" && alt.si === "abnormal"`, else `routine`. Never `emergency`.
  - **Action:** `action` from the same urgency value.
  - **Troponin:** the chest-pain warning only when `TROPONIN_I` is listed.
  - **Sources:** `sources: ["AMA_SI_UNITS", "LOINC"]`.
  - **Wording:** no «بالا»/«پایین» anywhere in the module's strings; T018 asserts it
- [X] T015 Spread `RULES_UNIT_UNKNOWN` into `RULES` in `khanesh-server/rules/patterns.js`, and remove `unit_unknown` from `CONTEXT_REASONS` in `khanesh-server/rules/patterns_reproductive.js`, which transfers ownership (N20). Update `M115` in `khanesh-server/rules/engine.test.js` so unitless testosterone is expected under `unit_unknown_values`, not `reproductive_hormone_context`
- [X] T016 [P] Add `AMA_SI_UNITS` to `khanesh-server/rules/guidelines.js` with `access: 'paywalled'` and `substitutedBy` the open "Laboratory Units Conversion Table (adapted from AMA Manual of Style)", cmeinfo.com. Also add `LOINC` (Regenstrief, open, via the NLM Clinical Tables API). `G6` must stay green
- [X] T017 Run `npm test` in `khanesh-server/`: T005–T007 are green, and every pre-existing test is green except the intentionally updated `M115`. Diff the rule ids against T002: exactly one addition (`unit_unknown_values`), zero removals. Quote both outputs

**Checkpoint**: The resolver, the owner and ownership transfer are live, and nothing that has a printed unit has changed.

---

## Phase 3: User Story 1 — a normal unitless value no longer becomes an "emergency" (Priority: P1) 🎯 MVP

**Goal**: The 4 false emergencies in the spec's context table are gone. A unitless value either resolves from the printed range or is left without a verdict.

**Independent Test**: Run `Creatinine 80`, `Calcium 2.4`, `Total Bilirubin 17` and `Troponin I 8` without a unit, with and without a printed reference range. There are 0 `emergency` findings.

### Tests for User Story 1 (red on `prefix003` first)

- [X] T018 [P] [US1] Add `M122` to `khanesh-server/rules/engine.test.js`. The 4 panels, unitless and with no reference, must give no finding with `urgency: "emergency"` and `unit_unknown_values` present listing each `faName`. It also asserts that no string of the finding matches `/بالا|پایین/`. Run on `prefix003` and confirm red with `kidney_impairment,creatinine_emergency`, `hypocalcemia`, `bilirubin_emergency` and `troponin_positive`
- [X] T019 [P] [US1] Add `M122b` to `khanesh-server/rules/engine.test.js`: `Creatinine 80` with `reference: "53-115"` gives graded `CREAT` ≈ 0.9 (normal) and a `unitConversions` entry with `basis: "reference"`. `Calcium 2.4` with `"2.1-2.6"` gives `CA` ≈ 9.6, normal. Red on `prefix003` (emergency)
- [X] T020 [P] [US1] Add `M122c` to `khanesh-server/rules/engine.test.js`: unitless `Troponin I 8` gives the chest-pain warning **verbatim** from the contract, and `urgency !== "emergency"`. `hs-cTnI 8 ng/L` (printed unit) still gives the existing behaviour, a normal value with no finding, which locks `M83`'s territory unchanged
- [X] T021 [P] [US1] Add `T20` to `khanesh-server/api-contract.test.js`. A sheet whose only row is unitless `Creatinine 80` goes through `/api/analyze` with a mocked OCR as the other contract tests do. The response has `_engine`, `_engine.patterns` includes `unit_unknown_values`, `has_critical` is false, and the text is not `buildNormalResult`'s. Red on `prefix003` (`has_critical: true`)

### Implementation for User Story 1

- [X] T022 [US1] Run `npm test`: T018–T021 green. Paste the Persian `headline`, `must_say` and `warnings` for the 4-panel sheet into this task's notes **verbatim**, for review (global instruction: show patient-facing strings)
- [X] T023 [P] [US1] Add a small "units" block to `khanesh/src/ResultView.jsx`, right under the extracted-numbers box. It renders `_engine.unitConversions` when non-empty. Each row shows `name` (never `test`, N8), the sheet's number with `from`, the graded number with `to` when they differ, and the `basis` sentence verbatim from `contracts/engine-output.md`. A missing `basis` is treated as `printed`. Persian RTL, reusing the existing classes in `ui.css`. Run `npm run lint` in `khanesh/`: 0 errors
- [X] T024 [US1] Check T023 in a browser with the Playwright MCP. Run `npm run dev` in `khanesh/` against the server, feed a response with `basis: "reference"` (the `Creatinine 80 / 53-115` sheet), and assert the block's text with `browser_snapshot`: it contains «از محدودهٔ مرجعی که آزمایشگاه» and not «CREAT». Record what you observed

**Checkpoint**: US1 stands alone. No false emergencies, and resolved units are visible to the patient.

---

## Phase 4: User Story 2 — a genuinely abnormal unitless value is neither lost nor reversed (Priority: P1)

**Goal**: `FBS 15` no longer reads as «قند پایین», and `Cholesterol 8` is no longer silent.

**Independent Test**: `FBS 15` and `Cholesterol 8` unitless give "high" or an explicit "not interpreted". They never give "low" and are never absent.

### Tests for User Story 2 (red on `prefix003` first)

- [X] T025 [P] [US2] Add `M123` to `khanesh-server/rules/engine.test.js`. `FBS 15` with no unit and no reference gives no `hypoglycemia_*` finding, a `unit_unknown_values` finding with `urgency: "this_week"`, and the both-abnormal clause verbatim. Red on `prefix003` (`hypoglycemia_significant`, «پایین‌تر»)
- [X] T026 [P] [US2] Add `M123b` to `khanesh-server/rules/engine.test.js`: `FBS 15` with `reference: "3.9-6.1"` gives `GLU_F` ≈ 270, graded high, and the existing high-glucose owner fires. Check which one with `runPatterns` and assert that exactly one glucose owner fires (the `M91e` shape). Red on `prefix003`
- [X] T027 [P] [US2] Add `M123c` to `khanesh-server/rules/engine.test.js`: `Cholesterol 8` unitless is **present** in the output under `unit_unknown_values`, as Phase A requires. Red on `prefix003`, where there is no finding (silence, N2)
- [X] T028 [P] [US2] Add `M123d` to `khanesh-server/rules/engine.test.js`, the both-edges sweep (N19). For `GLU_F`, `CREAT`, `CA` and `BILI_T`, take one unitless value where both readings are normal, one where exactly one reading is abnormal, and one where both are abnormal. Assert `routine`, `routine` and `this_week` respectively, and never `emergency`

### Implementation for User Story 2

- [X] T029 [US2] Run `npm test`: T025–T028 green. If `M123b` shows two glucose owners, or none, fix it through the existing hand-off (`severe_hyperglycemia_uncertain_ketosis` and friends in `rules/patterns_biochem_new.js`), never with a new rule. Paste the Persian for `FBS 15` (with and without a range) verbatim

**Checkpoint**: US1 and US2 both hold, with no new clinical number anywhere in the code.

---

## Phase 5: User Story 3 — a sourced unit table, recorded for the reviewer (Priority: P2)

**Goal**: Every two-system key has a sourced row in `MEDICAL_RULES.md`, and the magnitude cut-offs are proposed but not live.

**Independent Test**: `M121b` is green, and `P48` exists with the 42-row table and every open decision.

- [X] T030 [US3] Write `P48` in `MEDICAL_RULES.md` under «در انتظار بازبینی». It contains:
  - the full 42-row overlap table from `<scratchpad>/ov.mjs`, pasted unedited;
  - the rows for `T3`, `TROPONIN_I` and `CRP_Q`;
  - the proposed `plausible` extremes, one row per key, marked as proposals;
  - the verbatim chest-pain warning text and the residual troponin risk (a genuinely high unitless troponin is no longer an emergency);
  - the existing unregistered D-dimer size guess (`<50` means mg/L), for approval;
  - the magnesium mEq/L gap;
  - the sources: LOINC via NLM, the AMA table via the open adaptation, and the 22-factor comparison from research R2
- [ ] T031 [US3] **Reviewer gate (Phase B).** Only for keys whose `plausible` a reviewer approved in `P48`: fill `plausible` in `UNIT_PROFILE` in `khanesh-server/rules/units.js`, with a `P48 #n` comment per key. Add `M124` to `khanesh-server/rules/engine.test.js`, one unitless panel on each side of every approved ambiguous zone (N19); `Cholesterol 8` and `Creatinine 80` with no range must resolve to SI. **If `P48` is not approved, leave this task open and `plausible` null**; do not mark it done
- [ ] T032 [US3] Run `npm test` after T031, if it ran. `M124` is green, and `M123c` is updated to expect graded high cholesterol instead of `unit_unknown` for an approved `CHOL`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T033 [P] Add a hashed freeze test `M125` to `khanesh-server/rules/engine.test.js`, shaped like `M104d`. Take 15 panels that **print** their units (conventional and SI, across glucose, lipids, creatinine, calcium, bilirubin, thyroid, troponin `ng/L`, D-dimer) and hash `graded`, `findings`, `urgency` and `unitConversions` minus `basis`. Take the expected hashes from `prefix003`, so they prove FR-009 byte-for-byte
- [X] T034 [P] Update `CLAUDE.md`:
  - add a recurrence line to N3 ("the unit nobody printed": the 4 false emergencies, the reversed glucose, the silent cholesterol, and the fix shape);
  - add a new baseline row with the measured `npm test`;
  - update the rule count (+1) and the `patterns_*.js` count in "Where a pattern lives";
  - add `patterns_unit_unknown.js` to the file tree
- [X] T035 [P] Correct `.claude/rules/frontend.md`: the `UnitConversions` block was absent from `khanesh/src` from `763c73d` until this change. Document the new block and the `basis` field
- [X] T036 Negative controls (Constitution IV, N16):
  - Run the full new `engine.test.js` against `prefix003`. Exactly the new tests should be red and everything else green. Quote the counts.
  - In a temp copy, filter `unit_unknown_values` out of `RULES`. `M122`, `M123`, `M123c` and `T20` should go red. Quote them
- [X] T037 Final gate. Run `npm test` in `khanesh-server/` (0 fail) and `npm run lint` in `khanesh/` (0 errors). Check the rule-id diff against T002 (+1 only). Do the committed-tree check with the `git archive` + junction recipe, and mark `[X]` on every task that actually ran
- [ ] T038 Run the `code-reviewer` agent on the full diff (engine boundary, `faName`, units, urgency, Persian strings, ownership transfer), then `eval-medical-reviewer` on `khanesh-server/rules/`. Fix every confirmed finding with a red-first test before reporting done

---

## Dependencies & Execution Order

- **Setup (T001–T004)**: no dependencies. T003 and T004 run in parallel.
- **Foundational (T005–T017)**: after Setup. The tests (T005–T007) are written first and run in parallel. T008 → T009 → T010 → T011/T012 → T013 → T014 → T015, all in the same change: **the resolver and its owner never ship apart**. T016 can run in parallel.
- **US1 (T018–T024)**: after Foundational. Its tests run in parallel; T023 (frontend) runs in parallel with T018–T021.
- **US2 (T025–T029)**: after Foundational. It is independent of US1 and uses the same owner.
- **US3**: T030 can start once research is done, in parallel with US1/US2. T031/T032 are **blocked on reviewer approval of `P48`**.
- **Polish (T033–T038)**: after the stories that are shipping. T033–T035 run in parallel; T036 → T037 → T038 in sequence.

### Parallel example: User Story 1

```text
T018 M122  (4 unitless emergencies)          ─┐
T019 M122b (printed range resolves)           ├─ same file, different test() blocks: write together, run once
T020 M122c (troponin warning)                 │
T021 T20   (api-contract, other file)         ─┘   [P]
T023 ResultView.jsx units block               ─── [P] frontend, independent of the backend tests
```

## Implementation Strategy

1. **MVP = Phase 1 + 2 + US1.** It closes every false emergency with no new clinical number, and is shippable on its own.
2. **Then US2.** It is mostly tests, because the foundation already handles it; any fix goes through an existing hand-off.
3. **US3 recording (T030)** ships with the MVP, so the reviewer sees the proposals. **Phase B (T031–T032)** ships only after approval, in its own commit.
4. Polish and the two review agents come before any commit, then commit when asked.
