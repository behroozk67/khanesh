# Tasks: Electrolytes and Blood Gases (Tietz chapter 24): gaps only

**Input**: Design documents from `specs/024-electrolytes-blood-gases-ch24/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/findings.md](contracts/findings.md), [quickstart.md](quickstart.md)

**Tests**: required. The spec asks for them (FR-012) and so does constitution IV: every test must fail on `HEAD` before the change is accepted.

**Working directory for every command**: `khanesh-server/`. Persian text goes through Write/Edit or Node `fs`, never PowerShell `Set-Content` (constitution V).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 = pseudohyponatraemia caveat, US2 = sweat chloride

---

## Phase 1: Setup (gate and baseline)

**Purpose**: record the user's decisions and the measured baseline before any rule code.

- [X] T001 Record the user's answers to D1 (TG/TP cut-offs: A = TG ≥ 1000 mg/dL or TP ≥ 10 g/dL, B = engine "high", C = skip US1) and D3 (sweat-chloride urgencies from [research.md](research.md) §R2) at the top of `specs/024-electrolytes-blood-gases-ch24/research.md` under a new heading «تصمیمِ کاربر». If D1 = C, skip Phase 3. **Do not start T004 or later without this.**
- [X] T002 Measure the baseline on the current tree: run `node --test 2>&1 | grep -E "^ℹ (tests|pass|fail)|^✖"` and write the counts and failing ids (expected: T15e only) into `specs/024-electrolytes-blood-gases-ch24/snapshots/BASELINE.md`, naming the commit (`git rev-parse --short HEAD`).
- [X] T003 [P] Write the sorted rule-id list to `specs/024-electrolytes-blood-gases-ch24/snapshots/ids_before.txt` with `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"`, and re-run `node ../specs/024-electrolytes-blood-gases-ch24/snapshots/probe_ch24.mjs`. Confirm it matches `snapshots/before.txt` byte for byte; if not, the tree moved, so regenerate `before.txt` and note why in `BASELINE.md`.

---

## Phase 2: Foundational (register entry)

**Purpose**: the reviewer entry exists before the behaviour (N37).

- [X] T004 Re-check that P141 is free (`grep -c "P141" MEDICAL_RULES.md` must print 0). Draft `### P141` at the end of `MEDICAL_RULES.md` with:
  - the duplicates table from [spec.md](spec.md) «Already in the engine» (R2, R3, R4, pH and ranges, with owner ids);
  - the conflicts table (osmolality formula, Cl, K plasma);
  - the not-executable list (R7, R8, method, haemolysis index, tourniquet, sweat collection, temperature formulas);
  - D1 and D3 as decided in T001 (user decision, not physician review; no `sources: Tietz`);
  - the Persian strings from [contracts/findings.md](contracts/findings.md);
  - an «اگر رد شود» line naming what T009 and T015–T019 add.

  Write it with Node `fs.appendFileSync` or Edit, keeping the file's CRLF line endings.

**Checkpoint**: the register entry is drafted; the user stories can start.

---

## Phase 3: User Story 1 — pseudohyponatraemia caveat (Priority: P1) 🎯 MVP

**Goal**: a low sodium next to a very high TG or TP gets one caveat sentence on `sodium_critical`, with no change to urgency.

**Independent Test**: probe panels G1a–G1f; G1a, G1c and G1f gain the sentence, G1b, G1d and G1e do not, and every urgency is unchanged.

### Tests for User Story 1 ⚠️ (write first, they must fail on HEAD)

- [X] T005 [US1] Add test `CH24-1` to `khanesh-server/rules/engine.test.js` with a Persian comment. Na 128 (`135-145`) + TG 2000 mg/dL ⇒ the `sodium_critical` finding's caveat text contains «ذراتِ چربی یا پروتئین بخشی از حجمِ نمونه», its urgency is `this_week`, and its `must_say` and `key_number` are byte-identical to the same panel run without the caveat rule (compare against Na 128 alone for `must_say`).
- [X] T006 [US1] Add test `CH24-2` to `khanesh-server/rules/engine.test.js` covering the negative controls and edges:
  - TG 400 (below the cut-off) ⇒ no caveat;
  - Na alone ⇒ no caveat;
  - Na 120 + TG 2000 ⇒ no caveat and `emergency` (D2 gate); Na 121 + TG 2000 ⇒ caveat;
  - TG 999 ⇒ none, TG 1000 ⇒ caveat;
  - TP 9.9 ⇒ none, TP 10 ⇒ caveat;
  - TG 22.6 mmol/L ⇒ caveat (converted with the printed unit);
  - a hyperglycaemia-corrected sodium ⇒ no caveat.

  Use the D1 values from T001.
- [X] T007 [US1] Run `node --test rules/engine.test.js --test-name-pattern "CH24-"` on the unchanged tree and confirm `CH24-1` and the positive cases of `CH24-2` fail. Copy the failing output into `snapshots/BASELINE.md` (constitution IV).

### Implementation for User Story 1

- [X] T008 [US1] Add the D1 cut-offs as named constants next to the rule in `khanesh-server/rules/preanalytical.js`: `PSEUDO_HYPONA_TG_MGDL` and `PSEUDO_HYPONA_TP_GDL`, each with a one-line comment naming P141 and «unsourced, user decision». Export them so the test reads them instead of restating them.
- [X] T009 [US1] Append `pseudohyponatremia_lipid_protein` to `PREANALYTICAL_RULES` in `khanesh-server/rules/preanalytical.js` with `attachTo: ['sodium_critical']`.
  - `match`: `isLow(g(e,'NA'))`, `NA.value > 120` (the owner's emergency edge; comment that it mirrors `sodium_critical`'s `v <= 120`), `!e.indices?.na_correction_applied`, and (`g(e,'TG')?.value >= PSEUDO_HYPONA_TG_MGDL` or `g(e,'TP')?.value >= PSEUDO_HYPONA_TP_GDL`).
  - `text`: the exact Persian string from [contracts/findings.md](contracts/findings.md) §1.
- [X] T010 [US1] Run `node --test rules/engine.test.js --test-name-pattern "CH24-"`; all `CH24-1`/`CH24-2` cases pass.

**Checkpoint**: US1 works alone. The probe shows the caveat on G1a, G1c and G1f only.

---

## Phase 4: User Story 2 — sweat chloride (Priority: P2)

**Goal**: a printed sweat chloride in mmol/L gets one finding in its band. The other states give no verdict, and serum chloride is untouched.

**Independent Test**: probe G2a–G2f plus the edge sweep in [quickstart.md](quickstart.md) §4.

### Tests for User Story 2 ⚠️ (write first, they must fail on HEAD)

- [X] T011 [P] [US2] Add test `CH24-3` to `khanesh-server/rules/engine.test.js`. For «Sweat Chloride», «Sweat chloride», «Chloride (sweat)», «Sweat Cl» and «کلرید عرق» at 65 mmol/L for a 4-year-old ⇒ one `sweat_chloride_result` finding, headline «نتیجهٔ آزمایشِ کلرید عرق شما», urgency per D3, and the row is **not** in `e.unmapped`. «Sweat conductivity 55» stays in `e.unmapped` and has no finding.
- [X] T012 [P] [US2] Add test `CH24-4` to `khanesh-server/rules/engine.test.js` for the bands:
  - 29 ⇒ unlikely; 29.5 and 30 ⇒ intermediate; 59.5 and 60 ⇒ consistent; 160 ⇒ consistent; 160.5 and 161 ⇒ implausible, with no «فیبروز کیستیک هم‌خوان»;
  - the same values with `mEq/L` give the same states;
  - no unit ⇒ unread; age 0.02 years ⇒ too_young; age 0.05 years ⇒ banded;
  - each state's `must_say` equals the contract string with `${v}` filled in.
- [X] T013 [P] [US2] Add test `CH24-5` to `khanesh-server/rules/engine.test.js` for the N25 guard: a sheet with `Chloride 100 mmol/L (98-107)` and `Sweat Chloride 65 mmol/L` grades serum `CL` 100 normal (identical to the sheet without the sweat row), and `SWEAT_CL` never appears in `e.graded`. Also assert no raw key `SWEAT_CL` appears in any `headline`, `must_say`, `action` or `suggest`.
- [X] T014 [US2] Run `node --test rules/engine.test.js --test-name-pattern "CH24-[345]"` on the unchanged tree and confirm the positive cases fail. Append the output to `snapshots/BASELINE.md`.

### Implementation for User Story 2

- [X] T015 [P] [US2] Add `SWEAT_CL: "کلرید عرق"` to `FA_NAMES` in `khanesh-server/rules/names.js`.
- [X] T016 [US2] In `khanesh-server/rules/adapter.js`:
  - add the `NAME_MAP` entries `sweatchloride`, `sweatcl`, `chloridesweat`, `sweatchlorideconcentration`, `کلریدعرق` and `کلرعرق` → `"SWEAT_CL"` (normalised form, next to the existing `cl`/`chloride` entries);
  - add `"SWEAT_CL"` to `UNIT_KEPT`, with a comment naming specs/024 and why it is ungraded.

  Then verify with a one-off `node -e` that «Sweat Chloride 65 mmol/L» yields `e.ungraded.SWEAT_CL = {value: 65, unit: "mmol/L", reason: "no_range"}` and that the FA_EQUIV/affix stripping (P137) does not turn «کلرید عرق» into serum `CL`.
- [X] T017 [US2] Add rule `sweat_chloride_result` to `khanesh-server/rules/patterns_specimen.js` and include it in `RULES_SPECIMEN`.
  - `match`: `e.ungraded?.SWEAT_CL` present.
  - `build`: compute the state per [data-model.md](data-model.md). Accept a unit only if it normalises to `mmol/l` or `meq/l`. `too_young` means `e.age != null && e.age < 14/365`.
  - Output: headline, `must_say`, `action`, urgency, `key_number` and `suggest` exactly as in [contracts/findings.md](contracts/findings.md) §2, with D3 urgencies from T001.
  - No `blocks_others` and no `emergency`.
- [X] T018 [P] [US2] Add `sweat_chloride_result` to the `general` group in `khanesh-server/rules/groups.js`, next to `csf_glucose_low` (GR1).
- [X] T019 [P] [US2] Add `SUGGEST_TESTS` rows in `khanesh-server/rules/patterns.js`: `"تکرار کلرید عرق": ["_REPEAT_SWEAT_CL"]` and `"آزمایش ژنتیک CFTR": ["_GENE_CFTR"]` (synthetic keys, the `_GENE_HFE` pattern, so they are never «already measured»). Then run `node --test rules/serology.test.js --test-name-pattern S11`.
- [X] T020 [US2] Run `node --test rules/engine.test.js --test-name-pattern "CH24-"`; all CH24 tests pass.

**Checkpoint**: US1 and US2 both work. G2a–G2e give one finding each, G2f is unchanged, and serum chloride is unchanged.

---

## Phase 5: Polish & cross-cutting verification

- [X] T021 Write `specs/024-electrolytes-blood-gases-ch24/snapshots/after.txt` with the probe and diff it against `before.txt`. Every changed line must be one listed in [quickstart.md](quickstart.md) §2; any other change is a regression to fix, not to re-baseline (N36). Record the diff summary in `BASELINE.md`.
- [X] T022 Write `snapshots/ids_after.txt` and diff it against `ids_before.txt`. The only difference allowed is `+sweat_chloride_result` (N16, SC-002).
- [X] T023 Measure the sheet score for a healthy panel with and without «Sweat Chloride 20 mmol/L» (the `score.js` unread-count risk in [data-model.md](data-model.md)). Record both values in `BASELINE.md` and state the effect in P141; do not change `score.js`.
- [X] T024 Run the full suite `node --test 2>&1 | grep -E "^ℹ (tests|pass|fail)|^✖"`. Nothing may fail except the baseline failures from T002; `metamorphic.test.js` must be green with no new `ALLOWED_DROPS` entry (FR-013).
- [X] T025 Finalise P141 in `MEDICAL_RULES.md` with the measured effect (T021–T023), the test ids `CH24-1`…`CH24-5`, and status «در انتظار بازبینی». Also set every row of [checklists/requirements.md](checklists/requirements.md) that this run touched.
- [X] T026 Add a Lab Notebook entry to `CLAUDE.md` only if T021 shows a wrong patient-facing output that this work corrected. Not logging is the default here, since this feature adds coverage and corrects nothing.
- [X] T027 Commit only the files this feature touched (`git add` by path, never `-A`): `khanesh-server/rules/{preanalytical,adapter,names,patterns_specimen,groups,patterns}.js`, `khanesh-server/rules/engine.test.js`, `MEDICAL_RULES.md` and `specs/024-electrolytes-blood-gases-ch24/`. The pre-commit hook must pass without `SKIP_HOOKS`. Do not push.

---

## Dependencies & Execution Order

- **T001 (user decision) blocks everything from T004 onward.** T002 and T003 can run before the decision.
- Phase 2 (T004) comes before both stories so the register entry lands with the behaviour.
- **US1 (T005–T010)** and **US2 (T011–T020)** are independent: different rules and files, except that both add tests to `engine.test.js` (edit it sequentially) and both write P141 text.
- Within each story: tests → failing run on HEAD → implementation → passing run.
- Phase 5 runs after every story that was implemented.

### Parallel opportunities

- T003 alongside T002.
- US2 tests T011, T012 and T013 are separate `test()` blocks in one file. Write them in one edit; [P] marks that they don't depend on each other.
- T015, T018 and T019 touch three different files and can run alongside T016/T017.
- With two people, US1 and US2 proceed in parallel after T004.

### Parallel example: User Story 2

```text
T015 names.js        ┐
T018 groups.js       ├─ in parallel, after T014
T019 patterns.js     ┘
T016 adapter.js → T017 patterns_specimen.js → T020 run
```

## Implementation Strategy

### MVP (User Story 1 only)

T001–T010, then T021, T022, T024, T025 and T027. This is the only item that can mislead a patient on common input.

### Incremental delivery

1. Setup and register (T001–T004).
2. US1 → probe and suite → commit (MVP).
3. US2 → probe, id diff, score check and suite → commit.
4. Each commit carries its own P141 lines (N37), so either story can be reverted alone using the «اگر رد شود» line.

## Notes

- R3, R4, R7, R8 and the reference-range rows get no task; they are duplicates or not executable (spec «Current Behaviour»).
- Never move Persian through PowerShell 5.1 content cmdlets; use Edit/Write, Bash heredoc or Node `fs`.
- A task that changes a number not listed in D1/D3 is out of scope.
