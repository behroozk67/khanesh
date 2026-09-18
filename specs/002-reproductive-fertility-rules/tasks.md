# Tasks: Reproductive, Fertility & hCG Rules — Henry ch.26

**Input**: Design documents from `specs/002-reproductive-fertility-rules/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/engine-output.md](contracts/engine-output.md), [quickstart.md](quickstart.md)

**Tests**: **Required, not optional.** Spec FR-027 and constitution Principle IV require every new rule and fix to be locked by a regression test that was observed to **fail** first. Behavior stories therefore run in this order: tests → red check → (reviewer gate, Stage B only) → implementation → green check → committed-tree check.

**Organization**: tasks are grouped by user story, with two orderings forced by the design:
- **US4** (duplicate freeze) goes **first**. It is P1, and it has to exist before the first code change so it can catch that change.
- **US1** (semen read as urine) is **Stage A** and needs no reviewer. **US2, US3 and US5** are **Stage B**: each of their implementation tasks waits for its `P47` row to be approved.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (a different file, and no dependency on an incomplete task)
- **[Story]**: US1–US5 from spec.md

## Conventions that apply to every task

- Backend commands run from `khanesh-server/`; frontend commands from `khanesh/`.
- **Persian text is never moved through PowerShell 5.1 cmdlets** (`Get-Content`, `Set-Content`, `Add-Content`, `Out-File`): constitution V, N15(d). Append to `rules/engine.test.js` with the Write/Edit tools or `node -e "require('fs').appendFileSync(...)"`.
- New engine test ids start at **`M104`**, contract tests at **`T18`**, and the register entry is **`P47`**. All three were re-measured free on `8ccd67d`; re-check with `grep` before writing. Test comments are in Persian, one test per behavior.
- Every number used in code comes from an **approved** `P47` row. No task invents a number. A Stage B guard stays `{ todo: "P47 #<n> — …" }` until its row is approved.
- "Red" means: run `npm test` and quote the failing test names plus the `ℹ tests / pass / fail / todo` line.
- "Committed-tree check" means the `git archive HEAD khanesh-server` + `node_modules` junction recipe in `CLAUDE.md` → Commands. Remove the junction with `cmd /c rmdir` before deleting the temp dir.
- Another session may be editing this tree (see `001`). Before each phase, `git status --porcelain`. If files you didn't touch changed, measure your delta by isolating your own change (CLAUDE.md, "a total is not an attribution").

---

## Phase 1: Setup (Shared)

**Purpose**: measure the starting state; never quote it (constitution III).

- [X] T001 Measure the baseline in `khanesh-server/`: run `npm test`, `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.length))"`, and the id-set dump from `specs/002-reproductive-fertility-rules/quickstart.md` §0 into the scratchpad. Record `tests / pass / fail / todo`, the rule count (expected 113) and `git rev-parse --short HEAD` + "working tree"
- [X] T002 Re-run the probes from `specs/002-reproductive-fertility-rules/spec.md` → «زمینه» (semen probe → `hematuria`; `Testosterone`, `LH`, `FSH`, `Beta HCG`, `Progesterone`, `AMH`, `DHEA-S`, `17-OH Progesterone`, `Estradiol`, `Volume`, `Count` → `unmapped`; the pre-eclampsia component panel → 4 findings; `Urine Protein 2+` → `proteinuria_2plus`). If any row differs, update the spec table and `research.md` before continuing
- [X] T003 [P] Collect real Iranian lab-sheet spellings (English + Persian) for every analyte in `data-model.md` §2 and for the semen-only row names and units in `research.md` R1, including the day-3/day-21 name forms («FSH روز ۳», «Day 3 FSH», «پروژسترون روز ۲۱»). Use the `research` agent (N2: real sheets, not guesses), and add the results as a spelling column to `specs/002-reproductive-fertility-rules/data-model.md` §2 — *done via web search of Iranian lab/urology sites (sources in data-model.md §2), not the `research` agent; real printed-sheet verification is still open (N2)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the clinical register, recognition and module plumbing. None of it makes a clinical claim: mapped keys without an approved range land in `noRef`, and hormone-only sheets still take the legacy path (research R6, R10).

**⚠️ CRITICAL**: no user-story work can begin until this phase is complete.

- [X] T004 Write `P47` in `MEDICAL_RULES.md` under «در انتظار بازبینی», inserted after `P46` and before `## رویه نسخه‌بندی و بایگانی`, in the shape of `P46`. Include:
  - the 22 rows of `data-model.md` §5, each with its source (Henry ch.26 / WHO edition / "no source in DSL") and what the patient reads if approved and if not;
  - the coverage map from `spec.md` (duplicate / in-flight with `001` / lab-interpreted / out-of-scope / treatment);
  - the four DSL defects (`research.md` R9);
  - the clarify decisions and their costs: pregnancy flag not read, no verdict under 16 (pediatric CAH not interpreted), progesterone silenced next to a positive hCG;
  - the OCR-`section`-field follow-up (R1) and the `Protein (urine)` spelling gap;
  - the guard ids `M104`–`M111b`, `T18`, `T19`.
- [X] T005 Write guard `M105b` in `khanesh-server/rules/engine.test.js`: every key in `contracts/engine-output.md` → «Persian display names» is in `FA_NAMES` with the exact Persian string listed there. Run it and confirm **red**
- [X] T006 [P] Add the 26 `FA_NAMES` entries to `khanesh-server/rules/names.js`, copying the strings verbatim from `contracts/engine-output.md`. Rerun `M105b` → green
- [X] T007 [P] Add `HENRY_REPRO` to `khanesh-server/rules/guidelines.js`, in the same shape as `HENRY_ENDOCRINE` (title «Reproductive Function and Pregnancy (فصل ۲۶)», year 2022, `access: 'open'`). Confirm `G6` still passes
- [X] T008 Write guard `M105` in `khanesh-server/rules/engine.test.js`: every spelling from T003 resolves to its key through `runEngine`. It also asserts the negative collisions from `research.md` R4: `17-OH Progesterone` ↛ `PROG`; `Free Beta hCG` and any row with unit `MoM` ↛ `HCG`; `Testosterone Free` ↛ `TESTO`; `AFP` stays unmapped; the day-3/day-21 names map to `FSH_D3`/`LH_D3`/`E2_D3`/`PROG_D21`. Confirm **red** (depends on T003)
- [X] T009 Add the `NAME_MAP` entries in `khanesh-server/rules/adapter.js` for every non-semen key of `data-model.md` §2: `TESTO`, `LH`, `FSH`, `LH_D3`, `FSH_D3`, `E2`, `E2_D3`, `PROG`, `PROG_D21`, `AMH`, `DHEAS`, `OHP17`, `HCG`. Add an explicit exclusion for the R4 collisions, so that `resolveAlias` prefix matching cannot reach them. Qualitative `Beta HCG: Positive/Negative/مثبت/منفی` goes to `qual`. Rerun `M105` → green for these keys (depends on T008)
- [X] T010 [P] Write guard `M105c` in `khanesh-server/rules/engine.test.js` for the exact conversions in `research.md` R8: `TESTO` nmol/L × 28.84; `E2` pmol/L ÷ 3.671; `PROG` nmol/L ÷ 3.180; `OHP17` nmol/L ÷ 3.026; `DHEAS` µmol/L × 36.85; `LH`/`FSH`/`HCG` IU/L identity. **`AMH` pmol/L is NOT converted** (`P47` #17), and no conversion runs without a printed unit. Confirm **red**
- [X] T011 Add those conversions to `khanesh-server/rules/units.js`, each gated on the printed unit (N3). Rerun `M105c` → green (depends on T010)
- [X] T012 Create `khanesh-server/rules/patterns_reproductive.js` exporting an empty `RULES_REPRODUCTIVE` array, then import and spread it into `RULES` in `khanesh-server/rules/patterns.js`
- [X] T013 Run `npm test` in `khanesh-server/`. Required: all green; test count = T001 + 3 (`M105`, `M105b`, `M105c`); `RULES.length` still 113; id set identical to T001's; a `node -e` engine run shows the T002 hormone probes moved from `unmapped` to `noRef` — *measured: all Stage A guards were written as one block before any code, so the count went 424 → 433 (+9) in one step; `RULES.length` 113; id set identical*

**Checkpoint**: recognition is in place with no clinical behavior change, and `P47` awaits the reviewer.

---

## Phase 3: User Story 4 — Duplicates add nothing (Priority: P1)

**Goal**: the duplicate DSL rules (pre-eclampsia components, the proteinuria pregnancy sentence, primary hypothyroidism) and the prolactin branches owned by `001` produce exactly today's findings, and no pre-eclampsia or hyperprolactinemia finding ever appears.

**Independent Test**: the `M111` panels give byte-identical findings before and after every later phase.

- [X] T014 [US4] Write freeze guard `M111` in `khanesh-server/rules/engine.test.js`. It pins the full `(pattern, urgency, headline, must_say)` output of:
  - `PLT 90 · Cr 1.2 · AST 90 · ALT 80` (female, 29);
  - `Urine Protein 2+` (female, 29);
  - `TSH 8 / FT4 0.6`;
  - `Prolactin 80 + TSH 8 + FT4 0.6`.

  It also asserts that no finding's `pattern` matches `/preeclampsia|پره.?اکلامپسی/` or `/hyperprolactin/` from this feature's module. Take the expected values by **running the engine now**, not by copying `spec.md`
- [X] T015 [US4] Run `M111` → green (a freeze passes by design). As the negative control, change one expected headline character in a scratch copy and confirm it goes red, then discard the copy

**Checkpoint**: the duplicate freeze is in place and catches any later change to these panels.

---

## Phase 4: User Story 1 — A semen page is no longer read as a urine test (Priority: P1) 🎯 MVP

**Goal**: pH, WBC, RBC and Volume on a semen page never produce a urinary (or CBC) finding, and a semen page can never erase a CBC row during the page merge. Stage A: no threshold, so no reviewer gate (FR-024).

**Independent Test**: the R2 probe panel produces no urinary finding, and a CBC + semen upload in either order keeps both `WBC` rows.

### Tests for User Story 1 ⚠️ (write first, observe red)

- [X] T016 [P] [US1] Write guard `M104` in `khanesh-server/rules/engine.test.js`: the R2 probe (`Volume 2.5 · pH 8.4 · Count 40 · WBC 15-20 · RBC 8-10`, male, 35) plus a variant with `Sperm Motility 35` as the only semen-only row. It asserts:
  - no finding whose pattern is `hematuria`, `pyuria` or any other urine rule;
  - `qual["Urine pH"]` is absent;
  - `pH`/`WBC`/`RBC` resolve to `SEMEN_PH`/`SEMEN_WBC`/`SEMEN_RBC`.
- [X] T017 [P] [US1] Write guard `M104b`: a page whose only semen signal is a `million/mL` unit is treated as semen. A CBC page with `RBC 4.5` in `10*6/µL` is **not** treated as semen, and its RBC is graded exactly as today. Rows printed `/hpf` on a semen page go to `SEMEN_*`, not to urine (layer 0 runs before layer 1, R2)
- [X] T018 [P] [US1] Write freeze guard `M104c`: one page carrying both CBC markers (`MCV`, `PLT`) and a semen-only row. Its `WBC`/`RBC` keep today's grading and findings; only the semen-only rows become `SEMEN_*`
- [X] T019 [P] [US1] Write freeze guard `M104d`: 6 urine-only panels and 6 CBC-only panels, including a urine page with `WBC 15-20 /hpf` and `RBC 8-10 /hpf`. Findings are byte-identical to values captured by running the engine now (SC-002)
- [X] T020 [P] [US1] Write contract guard `T18` in `khanesh-server/api-contract.test.js`: `mergePages` given a CBC page (`WBC 7.2`) and a semen page (`WBC 3-4`, `Motility 40`) returns **both** `WBC` rows, in both upload orders, and reports no "conflicting duplicate" for them
- [X] T021 [US1] Run `npm test`. Quote the red lines: `M104`, `M104b` (semen part) and `T18` red; `M104c`, `M104d` green (freezes). If `T18` can't import `mergePages`, that import failure is the expected red; say so explicitly

### Implementation for User Story 1

- [X] T022 [US1] In `khanesh-server/rules/adapter.js`:
  - add `SEMEN_ONLY_MARKERS` (row names from R1, plus the T003 spellings) and a unit test that requires **mL, not µL**;
  - add `detectSemenPages(ocrTests)` and an exported `isSemenPage(pageTests)`, modelled on `detectUrineOnlyPages`;
  - apply the mixed-page guard: a page with `BLOOD_ONLY_MARKERS` does not re-key `wbc`/`rbc` (R2).
- [X] T023 [US1] In `ocrToEngineInput()` in `khanesh-server/rules/adapter.js`, add **layer 0** before the `/hpf` layer. On a semen page, route `ph`, `wbc`, `rbc`, `puscells`, `volume`, `count`, `concentration` and the semen-only names to their `SEMEN_*`/`SPERM_*` keys per `data-model.md` §1 and `continue`: numeric into `tests`, `SEMEN_WBC`/`SEMEN_RBC`/`SEMEN_FRUCTOSE`/`SEMEN_ACP`/`SEMEN_NAG` into a **separate `semenQual` channel** (implementation finding: `qual` is regex-searched by the urine rules, N25). Add a Persian comment naming the bug (`hematuria` fired on a semen page) and the guard `M104` (depends on T022)
- [X] T024 [US1] In `khanesh-server/server.js`:
  - change the `mergePages` dedupe key to `(isSemenPage(pageTests) ? "semen:" : "") + normName(t.name)`, computing semen pages per OCR page **before** the loop (import `isSemenPage` from `rules/adapter.js`);
  - export `mergePages`;
  - add a Persian comment explaining the lost-CBC-WBC case (R3) and guard `T18` (depends on T022).
- [X] T025 [US1] Run `npm test` → `M104`, `M104b`, `M104c`, `M104d`, `T18`, `M111` green, 0 fail. The id set is identical to T001's. Run the R2 probe with `node -e` and quote its findings (expected: none about urine)
- [X] T026 [US1] Committed-tree check (N10): with the archive recipe, drop the new `M104`/`M104b`/`T18` into a `HEAD` copy and confirm they are **red** there. Quote the numbers and name the tree — *measured on `8ccd67d`: `433 · 413 · 6 fail` — exactly `M104`, `M104b`, `M105`, `M105b`, `M105c`, `T18`; freezes green*
- [X] T027 [US1] Append a Lab Notebook entry to `CLAUDE.md`. It is a new entry: a semen page read as urine by shared row names, plus `mergePages` first-wins dedupe dropping a CBC row. Include what the patient read («در آزمایش ادرار شما خون … دیده شده است»), the fix, the guards, and the rule that generalizes: *a row name is not an identity; the page it sits on is part of the key*. Add the hash once committed

**Checkpoint**: Stage A is complete. The misreading is gone, and nothing else moved. This is the MVP and can ship without any reviewer decision.

---

## Phase 5: User Story 2 — Semen analysis is interpreted (Priority: P1) — Stage B

**Goal**: one `semen_analysis` finding that names every abnormal parameter correctly, without "infertile" or "excellent fertility".

**Independent Test**: the `M106` panels (each parameter alone, the combinations, azoospermia with fructose in all three states, abstinence in all three states, all normal) produce exactly the texts in `data-model.md` §4.

### Tests for User Story 2 ⚠️ (write as `todo` naming `P47` rows #1–#9)

- [X] T028 [P] [US2] Write `M106`–`M106f` in `khanesh-server/rules/engine.test.js` as `{ todo: "P47 #1–9 — …" }`:
  - (a) each parameter below its limit gives one finding with the right term;
  - (b) `SEMEN_VOL` low with `SPERM_CONC` normal says low volume, **not** «الیگواسپرمی»;
  - (c) azoospermia × fructose absent / present / not measured gives three distinct sentences;
  - (d) abstinence 1 / 3 / 7 days / not printed gives three distinct arms, plus no claim when it is absent;
  - (e) `SPERM_MORPH` exactly at the approved LLN counts as normal, and just below it as terato (both band edges, N19);
  - (f) all normal gives no semen finding, and no string contains «نابارور» or «باروری عالی».

  Every abnormal case asserts the "one sample is not enough; repeat" sentence and a `SUGGEST_TESTS`-listed suggestion.
- [X] T029 [P] [US2] Extend `M111b` (write it now if absent, as `todo`): no rule in `patterns_reproductive.js` emits `emergency`, and no patient string matches drug/dose/procedure instruction patterns (`/میلی‌گرم|قرص .* بخورید|بیوپسی کنید|جراحی کنید/`)

### Implementation for User Story 2 (after reviewer approval of `P47` #1–#9)

- [X] T030 [US2] Reviewer gate: confirm `P47` rows #1–#9 are marked approved in `MEDICAL_RULES.md`, then remove the `todo` from `M106`–`M106f` and run them → **red**. Quote the result
- [X] T031 [US2] Add the approved semen ranges (`SEMEN_VOL`, `SPERM_CONC`, `SPERM_MOT_TOTAL`, `SPERM_MOT_PROG`, `SPERM_MORPH`, `SEMEN_PH`) to `ADULT_REFS` in `khanesh-server/rules/refs.js`, with a comment naming `P47` and the chosen WHO edition. `SPERM_TOTAL`, `SEMEN_ABSTINENCE`, `SEMEN_WBC`, `SEMEN_RBC` get **no** range
- [X] T032 [US2] Implement `semen_analysis` in `khanesh-server/rules/patterns_reproductive.js` exactly per `data-model.md` §4: one finding; azoospermia xor a subset of {low volume, oligo, astheno, terato}; the three-way abstinence, fructose, ACP+pH and NAG arms; the viability suggestion below the approved motility trigger; direction from `graded.dir` (N12); `urgency` from one computation feeding both field and sentence (`actionFor`, N20); `sources: ["HENRY_REPRO"]`
- [X] T033 [US2] Add the `SUGGEST_TESTS` rows the rule emits («تکرار آنالیز منی», «فروکتوز مایع منی», «رنگ‌آمیزی زنده‌مانی اسپرم») in `khanesh-server/rules/patterns.js`, in the same change (N8)
- [X] T034 [US2] Run `npm test` → `M106*`, `M111`, `M111b`, `M104*` green. Paste the Persian of the finding for 3 panels (oligo+astheno, azoospermia with fructose absent, low volume only) into the change description **verbatim** for review

**Checkpoint**: the semen analysis is interpreted, with one owner.

---

## Phase 6: User Story 3 — The male and female hormone axes (Priority: P2) — Stage B

**Goal**: `maleAxis`, `femaleAxis`, female androgens, luteal progesterone and AMH, each with a single owner. No verdict under 16, with unknown sex, or for a woman's hormone without a printed cycle day.

**Independent Test**: the `M107`/`M108`/`M109d`/`M110` panels.

### Tests for User Story 3 ⚠️ (write as `todo` naming their `P47` rows)

- [X] T035 [P] [US3] Write `M107`–`M107d` (`todo P47 #10–11`):
  - each `maleAxis` label from `data-model.md` §4;
  - the LH/FSH three-way arm (high / low-normal / absent);
  - no string ever says «تأیید» or «قطعی» about low testosterone, and every `testo_low_*` says two morning samples are needed;
  - `tubular_failure` needs a low `SPERM_CONC` (FSH high with normal semen does **not** produce it).
- [X] T036 [P] [US3] Write `M108`–`M108d` (`todo P47 #12–14`):
  - `FSH_D3` high at age 30 gives `ovarian_insufficiency_pattern`; at age ≥ the approved `MENOPAUSE_AGE` it gives `menopause_consistent` (probe both edges);
  - `FSH_D3` and `LH_D3` normal with no low E2 gives **no** `central_pattern`;
  - a bare `FSH 12` for a woman gives no verdict and the `cycle_day_unknown` sentence verbatim.
- [X] T037 [P] [US3] Write `M109d` (`todo`): at age 12 (male and female) and with sex unknown, every sex-hormone key gives no verdict. The `pediatric` / `sex_unknown` sentences appear verbatim. `getRef` returns `null` for these keys (not the female range).
- [X] T038 [P] [US3] Write the `luteal_progesterone`, `amh_level` and `female_androgen_excess` cases inside `M108`–`M108d` or a new `M108e` (`todo P47 #15, #16, #18–20`):
  - PROG_D21 above/below the approved threshold;
  - AMH low / high, where high never says «سندرم تخمدان پلی‌کیستیک دارید»;
  - TESTO/DHEAS/OHP17 each high / normal / absent.
- [X] T039 [P] [US3] Write `M110` (`todo`), the two-sided sweep. For every family (semen, male axis, female axis, androgens, PROG_D21, AMH, HCG), push each key out of range one at a time on an otherwise normal panel. Assert: exactly one finding owns it; `_engine.uncovered` never lists it; no key appears in two findings (N18, N20)

### Implementation for User Story 3 (after reviewer approval of the relevant `P47` rows)

- [X] T040 [US3] Reviewer gate: confirm the approved rows, un-`todo` only the matching guards, and run them → **red**. Quote the result
- [X] T041 [US3] Build or consume the `ungraded` channel in `khanesh-server/rules/adapter.js` per `data-model.md` §3 (`{ value, reason }`). If `001` has already built it, extend it with `reason` only, and don't fork it. Route reproductive keys there when sex is unknown, age < 16, the cycle day is unknown (women's `LH`/`FSH`/`E2`/`PROG`), or `HCG` is positive or grey on the same sheet (`PROG_D21`). It must not be serialized into `_engine` (check `serializeGraded` in `server.js`)
- [X] T042 [US3] In `khanesh-server/rules/refs.js`, add the approved ranges and make `getRef()` return `null` for every reproductive key when `sex` is null or `age < 16` (today it falls back to `r.F` and to adult ranges, `data-model.md` §2). Add a Persian comment naming FR-011 and guard `M109d`
- [ ] T043 [US3] Add the diagnostic constants (`TESTO_LOW_M`, `MENOPAUSE_AGE`, `PROG_OVULATION`, the AMH thresholds) to `khanesh-server/rules/patterns_utils.js`, each with a `P47 #n` comment. They are separate from the reference ranges ("one number, one job") — **partial:** constants shipped in `patterns_reproductive.js` for approved rows only (`PROG_OVULATION_NGML`, abstinence, viability); `MENOPAUSE_AGE`/AMH pending P47 #16–#20
- [ ] T044 [US3] Implement `maleAxis(e)` and `male_gonadal_axis`, then `femaleAxis(e)` and `female_ovarian_axis`, in `khanesh-server/rules/patterns_reproductive.js`. Each classifier returns exactly one label or `null` (the `mineralAxis` shape); the labels and conditions are those in `data-model.md` §4; urgency and action come from one computation — **partial:** male half shipped (`male_gonadal_axis`); female axis pending P47 #11–#14
- [ ] T045 [US3] Implement `female_androgen_excess`, `luteal_progesterone` and `amh_level` in `khanesh-server/rules/patterns_reproductive.js`, with a three-way arm per analyte (Constitution II); never a diagnosis of PCOS, CAH or a tumor — **partial:** `luteal_progesterone` shipped; `female_androgen_excess`/`amh_level` pending P47 #16–#20
- [X] T046 [US3] Implement `reproductive_hormone_context` in `khanesh-server/rules/patterns_reproductive.js`. It owns every `ungraded` reproductive key and emits one `routine` finding that lists them with the reason sentences from `contracts/engine-output.md`, verbatim
- [X] T047 [US3] Write contract guard `T19` in `khanesh-server/api-contract.test.js`: a text-only request with only `FSH 12` (female, 30, no cycle day) takes the engine path, returns `reproductive_hormone_context`, and never returns the `buildNormalResult` body. Confirm **red**
- [X] T048 [US3] In `khanesh-server/server.js`, change the routing condition at the `engineCandidate.graded.length === 0` check to "nothing graded **and** nothing in `ungraded` **and** no semen key" (research R6). Ship it **in the same change** as T046, never alone. Rerun `T19` → green
- [ ] T049 [US3] Add the `SUGGEST_TESTS` rows («LH و FSH», «تستوسترون صبحگاهی», «DHEA-S», «17-OHP», «استرادیول روز سوم») in `khanesh-server/rules/patterns.js` (N8) — **partial:** «LH و FSH» shipped; the rest belong to unshipped rules
- [ ] T050 [US3] Run `npm test` → `M107*`, `M108*`, `M109d`, `M110` (for the families shipped), `T19`, and all freezes green. Paste the Persian of 4 panels verbatim for review: male low T with high LH/FSH; FSH_D3 high at 30; a bare FSH for a woman; age 12

**Checkpoint**: the hormone axes are interpreted with no false verdicts.

---

## Phase 7: User Story 5 — Beta hCG read as a pregnancy-test result (Priority: P2) — Stage B

**Goal**: `hcg_result` says negative / indeterminate / positive for a woman, "not a pregnancy test" for a man, and nothing about ectopic pregnancy or viability.

**Independent Test**: the `M109`–`M109c` panels.

- [X] T051 [P] [US5] Write `M109`–`M109c` (`todo P47 #21`):
  - women: below `HCG_NEG`, both grey-zone edges, above `HCG_POS`, qualitative «مثبت»/«Negative»;
  - a man above `HCG_NEG`, which gives `this_week` and no pregnancy wording;
  - unknown sex, which gives only the number and a referral;
  - `Free Beta hCG 1.8 MoM`, which is not read as `HCG`;
  - no string matching `/نابجا|سقط|سالم بودن بارداری|هفته.? بارداری/`;
  - `PROG_D21 10` next to a positive hCG, which gives no `luteal_progesterone` and the `hcg_positive` sentence.
- [X] T052 [US5] Reviewer gate for `P47` #21: un-`todo` and run → **red**. The qualitative sub-cases (positive/negative) need no threshold and may ship even before #21 is approved. Record which cases shipped
- [ ] T053 [US5] Add `HCG_NEG` / `HCG_POS` to `khanesh-server/rules/patterns_utils.js`, and implement `hcg_result` in `khanesh-server/rules/patterns_reproductive.js` per the `data-model.md` §4 table, with the sex three-way arm (Constitution II) and `sources: ["HENRY_REPRO"]` — **partial:** `HCG_POSITIVE_ABOVE` shipped; no grey zone (`HCG_NEG` has no source)
- [X] T054 [US5] Run `npm test` → `M109*`, `M110` (HCG family), and the freezes green. Paste the Persian for a woman at 1200, a woman in the grey zone, and a man at 50, verbatim

**Checkpoint**: every story in scope is complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T055 [P] Add a «باروری و هورمون‌های جنسی» group to `khanesh/src/testCategories.js` containing the keys that shipped (presentation only). Run `npm run lint` in `khanesh/` → 0 errors
- [X] T056 [P] Record in `khanesh-server/rules/REF_DIFF.md` that the manual-entry `REF` (`khanesh/src/labRefs.js`) deliberately has none of these keys, and why (sex, cycle day and age dependence make a single client range wrong)
- [X] T057 Update `P47` in `MEDICAL_RULES.md`: mark each row's status (in code / pending), and list the guards that are still `todo`
- [X] T058 Update `CLAUDE.md`:
  - a new baseline row naming the tree (tests / pass / fail / todo);
  - the rule count (`node -e` one-liner);
  - the patterns-file count under «Where a pattern lives»;
  - the file-tree line for `patterns_reproductive.js`.
- [X] T059 Final gate: `npm test` in `khanesh-server/` (0 fail; todo count = the unapproved `P47` rows); diff the id set against T001's (additions only, exactly the shipped rule ids of the 8); the committed-tree check for every guard added since T026
- [X] T060 Run the `code-reviewer` agent on the full diff (engine boundary, `faName`, units, urgency, Persian strings), then the `eval-medical-reviewer` agent on `khanesh-server/rules/`. Fix every confirmed finding before reporting done

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2**: T003 (spellings) blocks T008/T009. Everything else in Phase 2 depends only on Phase 1.
- **Phase 2 → US4 → US1**: US4's freeze must exist before any adapter change. US1 needs T012 (the module wiring is not required) and T009 (so semen keys don't collide with the new hormone names).
- **US1 is independent of the reviewer.** US2, US3 and US5 each wait on their own `P47` rows, not on each other. Exceptions:
  - `tubular_failure` (US3, T044) reads `SPERM_CONC`, so it needs US2's semen range (T031);
  - `luteal_progesterone`'s silencing by hCG (T041) needs `HCG` recognized (T009, already done in Phase 2), not US5's thresholds;
  - T046 + T048 (context rule + routing) must land together, with or after the first hormone rule.
- **The `ungraded` channel (T041)** is shared with `001`. Coordinate with whichever session reaches `P46` Stage B.
- **Polish** runs after whichever stories shipped.

## Parallel Opportunities

- Phase 1: T003 runs in parallel with T001/T002.
- Phase 2: T006 ∥ T007 ∥ T010 (different files) after their guards are written.
- US1 tests: T016–T020 are all [P]: four live in `engine.test.js` but are independent blocks and can be written as one append; T020 is in `api-contract.test.js`.
- Stage B: once their rows are approved, US2 (T028–T034) and US5 (T051–T054) can proceed in parallel, since `hcg_result` and `semen_analysis` share no key. US3 is the largest and is best done alone.

### Parallel example — User Story 1 tests

```text
T016 M104  (semen probe, no urinary finding)       → rules/engine.test.js
T017 M104b (unit signal; µL is not semen)          → rules/engine.test.js
T018 M104c (mixed CBC + semen page freeze)         → rules/engine.test.js
T019 M104d (urine/CBC-only freeze)                 → rules/engine.test.js
T020 T18   (mergePages keeps both WBC rows)        → api-contract.test.js
```

## Implementation Strategy

1. **MVP = Stage A = Phases 1–4.** It removes a wrong patient output (semen → «خون در ادرار») and a silent CBC-row loss, adds recognition, and registers `P47`. It ships with **no** reviewer decision and changes no clinical number. Commit it on its own.
2. **Hand `P47` to the clinical reviewer.** The fastest unblock is row #1 (the WHO edition), which by itself unblocks rows #2–#6 and the whole of US2.
3. **Stage B, row by row.** US2 first (the most common input), then US5 (small, and its qualitative part needs no number), then US3. Each approved row is its own commit: guard un-`todo`'d → red → code → green → committed-tree check.
4. **Never** ship T048 (routing) without T046 (context rule). An ungraded-only sheet would get «همه‌چیز طبیعی است».
