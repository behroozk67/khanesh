# Tasks: Kidney Markers, Package 2 (Tietz ch. 21)

**Input**: Design documents from `specs/021-kidney-markers-ch21/`.

**Prerequisites**:
- [plan.md](plan.md)
- [spec.md](spec.md)
- [research.md](research.md) (R1–R6)
- [data-model.md](data-model.md)
- [contracts/engine-output-acr-pcr.md](contracts/engine-output-acr-pcr.md)
- [quickstart.md](quickstart.md)

**Tests**: these are REQUIRED. FR-009 / N10 says every fix gets a regression test that fails on `HEAD` first. Tests go in `khanesh-server/rules/engine.test.js` as `KD1…`, with Persian comments in the house style.

**Paths**:
- Backend files are relative to `khanesh-server/`.
- `MEDICAL_RULES.md` and `CLAUDE.md` are at the repo root.

**Persian text**: write it only with Write/Edit or Node `fs`, never through PowerShell (N15).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Copy `HEAD` into a clean baseline at `$TEMP/khanesh-021-base`:
  - extract `git archive HEAD khanesh-server`;
  - junction `node_modules` in;
  - run `node --test` and record pass/fail counts in `specs/021-kidney-markers-ch21/snapshots/BASELINE.md`.
- [X] T002 [P] Record the before rule-id set into `specs/021-kidney-markers-ch21/snapshots/rule-ids-before.txt`:
  `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"`
- [X] T003 [P] Confirm `specs/021-kidney-markers-ch21/snapshots/before.txt` was produced by the current `snapshots/probe.mjs`. Re-run it if the probe changed after that.

## Phase 2: Foundational

- [X] T004 Allocate **P133** in `MEDICAL_RULES.md` before any code (N37). Under its heading add:
  - the source: Tietz ch. 21, pp. 360–365, edition unknown, raw text not opened;
  - the user decision of 2026-11-10 (G1–G5; G4 recognition only);
  - the duplicate table from spec «Current Behaviour»;
  - the six numeric conflicts, left unresolved;
  - the needs-unavailable-input list;
  - G6 as a candidate;
  - paediatric urate ranges as an out-of-scope gap.

  Each gap's behaviour paragraph is filled in by its own story.

## Phase 3: User Story 1, ACR printed in mg/mmol is never read as normal when KDIGO calls it raised (P1) 🎯 MVP

**Goal**: an ACR printed in mg/mmol is classified on KDIGO's mg/mmol edges (A1 < 3, A2 3–30, A3 > 30). The text quotes the printed value and unit.

**Independent test**: probe panels `AB ACR 2.9…34 mg/mmol`, `AB2`, `AB3`, `AB4`.

- [X] T005 [US1] Add tests to `rules/engine.test.js`, then run them on the T001 baseline and confirm each fails there.
  - **KD1**: ACR 3.2 mg/mmol → tag A2, `albuminuria_pattern` present, `must_say` contains «3.2» and «میلی‌مول», `key_number` 3.2. 2.9 mg/mmol → A1 with no finding.
  - **KD2**: 33 mg/mmol → A3. Exactly 30 mg/mmol → A2.
  - **KD3**: ACR 28 and 45 mg/g → tags and text byte-identical to today (A1, then A2 with «45 میلی‌گرم بر گرم»).
  - **KD4**: `_engine`/`engineOut.unitConversions` contains `{test:"ACR", from:"mg/mmol", raw:3.2}`.
- [X] T006 [US1] In `rules/adapter.js`, ACR branch: when the unit matches mg/mmol, also set `tests._acr_mgmmol = v`, and push a `unitConversions` entry `{ test:"ACR", raw:v, from:"mg/mmol", value:tests.ACR, to:"mg/g", basis: t._basis ?? "printed" }`. The mg/g value and M17 stay unchanged.
- [X] T007 [US1] In `rules/adapter.js`, right after the generic `graded.push` for `key === "ACR"`: when `tests._acr_mgmmol != null`, recompute the tag from the printed value against the mg/mmol edges. Copy `tag`, `fa`, `patient` and `abnormal` (and `dir: "high"` when abnormal) from the matching band of `CLASSIFIERS.ACR` in `rules/interpret.js`. Set `range` to `0–${(3*BRANCH_FACTORS.ACR_MGMMOL_TO_MGG).toFixed(1)}` and `printed: { value, unit: "mg/mmol" }`. Confirm the `_acr_mgmmol` key is skipped by the grading loop's `key.startsWith("_")` guard.
- [X] T008 [US1] In `rules/patterns_nephrology.js` `albuminuria_pattern.build`: when `acr.printed` exists, quote `acr.printed.value` with «میلی‌گرم بر میلی‌مول» and the band «(A2، بین ۳ تا ۳۰ میلی‌گرم بر میلی‌مول)» or «(A3، بالای ۳۰ میلی‌گرم بر میلی‌مول)», and set `key_number` to the printed value. The mg/g text must stay byte-identical.
- [X] T009 [US1] Write the G1 paragraph in `MEDICAL_RULES.md` P133. Record it as a **clinical decision**:
  - it takes KDIGO's pragmatic 3 mg/mmol ≈ 30 mg/g;
  - unit invariance is broken on purpose (28.3 mg/g → A1 vs 3.2 mg/mmol → A2);
  - sex-specific printed limits stay ignored (panel AB4);
  - the display edge at exactly 3.0 («26.5 (0–26.5)»);
  - patient impact.
- [X] T010 [US1] Run KD1–KD4 and M17 on the working tree. All must be green.

## Phase 4: User Story 2, high urea next to a high creatinine is explained (P1)

**Goal**: no «توضیح نداریم» line names urea or BUN on panels B4 and G2a–G2f. Urgency and `has_critical` are unchanged.

**Independent test**: probe panels B4, G2a–G2h.

- [X] T011 [US2] Add tests to `rules/engine.test.js` and confirm each fails on baseline.
  - **KD5**: for urea 80 + Cr 2.0 (also BUN 40 + Cr 2.0), the `unexplained_abnormal` finding is absent or does not list UREA/UREA_N; some shown text quotes «80» next to «اوره»; urgency equals baseline (`this_week`).
  - **KD6**: run the same check over glomerulonephritis (G2c), rhabdomyolysis (G2d), creatinine emergency (G2e) and K 6.8 (G2f). No unexplained urea; `overall_urgency` and `has_critical` are equal to baseline values hard-coded in the test.
  - **KD7**: dialysis (G2g) and `urea_bun_emergency` (G2h) give text identical to baseline. The emergency number appears once, from `urea_bun_emergency`.
- [X] T012 [US2] Add `ureaAlongside(e)` in `rules/patterns_nephrology.js`.
  - It returns one sentence per high `UREA`/`UREA_N` graded row: «اوره ${v} (حد طبیعی ${range}) هم بالاتر از حد طبیعی است و کنارِ کراتینین تفسیر می‌شود.», with «BUN» for `UREA_N`.
  - It returns "" when `RULES_NEPHROLOGY_NEW.find(r => r.id === "urea_bun_emergency").match(e)` is true, or when on dialysis.
- [X] T013 [US2] Append `ureaAlongside(e)` to `must_say` and, if present, to `brief` of `kidney` (non-dialysis branch), `glomerulonephritis_pattern` and `rhabdomyolysis_pattern` in `rules/patterns_nephrology.js`.
- [X] T014 [US2] Re-run the probe. If G2f (K 6.8) still orphans urea, read how `kidney` is shown there (hidden, briefed or rescued) in `rules/patterns.js`. Fix it in the owner's `brief`, not in the net. Then re-run KD5–KD7.
- [X] T015 [US2] Write the G2 paragraph in `MEDICAL_RULES.md` P133: the sentence verbatim, the three rules it is added to, and that it introduces no threshold and no urgency change.

## Phase 5: User Story 3, low uric acid has an owner (P2)

**Goal**: one `routine` finding owns a low uric acid in an adult or unknown-age patient.

**Independent test**: probe U1, U2, U6, U7.

- [X] T016 [US3] Add tests to `rules/engine.test.js` and confirm each fails on baseline.
  - **KD8**: uric 1.5 (M, 50) → `uric_acid_low` present with `routine` urgency; `unmatched_abnormal` absent; `must_say` quotes 1.5 and the range. Uric 2.2 (F) gives the same.
  - **KD8b**: uric 3.0 with no sex → no `uric_acid_low` (stays `sex_unknown_value`). Age 10 → no `uric_acid_low`. Uric 4.0 (M) → no new finding.
- [X] T017 [US3] Add rule `uric_acid_low` to `rules/patterns_biochem.js`, directly after `hyperuricemia`.
  - **match**: `URIC` graded `abnormal && dir === "low"` and `(e.age == null || e.age >= 16)`.
  - **build**: urgency `routine`; `key_number` is the value.
  - **must_say**: «اسید اوریک شما ${v} است (حد طبیعی ${range}) و پایین‌تر از آن است. اسید اوریکِ پایین برخلافِ اسید اوریکِ بالا معمولاً مشکلی ایجاد نمی‌کند و اغلب به‌تنهایی معنای بیماری ندارد. بعضی داروها، از جمله داروهای کاهندهٔ اسید اوریک، آن را پایین می‌آورند؛ پزشک آن را کنارِ داروهای شما و بقیهٔ برگه می‌سنجد.» When v < 2.0, add: «مقدارِ زیرِ ۲ را در منابعِ آزمایشگاهی «هیپواوریسمی» می‌نامند و اگر در تکرار هم پایین ماند، پزشک ممکن است علتش را بررسی کند.»
  - **action**: «نوبت عادی؛ فهرستِ داروهایتان را به پزشک بگویید.»
  - `suggest: []`, `warnings: []`, no `sources`.
- [X] T018 [US3] Add `uric_acid_low` to `RULE_GROUP.kidney` in `rules/groups.js`, next to `hyperuricemia` (guard GR1).
- [X] T019 [US3] Write the G3 paragraph in `MEDICAL_RULES.md` P133:
  - the text verbatim;
  - the < 2.0 framing from Tietz (unverified);
  - «داروهای کاهندهٔ اسید اوریک» is unsourced general knowledge, flagged for the reviewer;
  - the child limitation (U7).

## Phase 6: User Story 4, a protein/creatinine ratio row is recognised (P2)

**Goal**: the PCR spellings map to `UPCR`, are never graded and never unmapped, and bare «PCR» is untouched.

**Independent test**: probe P1, P2, P3, P6, P7, plus a PCR-only sheet through `/api/analyze` (T033).

- [X] T020 [US4] Add tests to `rules/engine.test.js` and confirm each fails on baseline.
  - **KD9**: «Urine Protein/Creatinine Ratio», «UPCR», «Protein Creatinine Ratio» and «نسبت پروتئین به کراتینین» → not in `unmapped`, `UPCR` in `noRef`, and not in `graded`.
  - **KD9b**: «PCR: Positive» and «HCV PCR» stay unmapped (N25 negative control). A sheet with only UPCR → `buildNormalResult(engineOut).summary` does not contain «طبیعی است».
- [X] T021 [US4] Add `NAME_MAP` entries in `rules/adapter.js`, near the ACR block: `upcr`, `proteincreatinineratio`, `proteintocreatinineratio`, `urineproteincreatinineratio`, `urineproteintocreatinineratio`, `نسبتپروتئینبهکراتینین`, `پروتئینبهکراتینین` → `"UPCR"`. First print the `norm()` form of each probe spelling, so the map keys match exactly.
- [X] T022 [P] [US4] Add `UPCR: "نسبت پروتئین به کراتینین ادرار (PCR)"` to `FA_NAMES` in `rules/names.js` (M32).
- [X] T023 [US4] In `rules/patterns.js` `SUGGEST_TESTS`, map the exact suggest string used by `nephrotic_pattern` («نسبت پروتئین به کراتینین ادرار») to `["UPCR"]`, so a measured PCR is not re-requested (N8). Grep the exact string first.
- [X] T024 [US4] Confirm there is no `refs.js` entry and that `UPCR` is not in `PRINTED_REF_ONLY_KEYS`, so it is never graded from a printed range. Write the G4 paragraph in `MEDICAL_RULES.md` P133:
  - recognition only;
  - the source thresholds (≤ 15 mg/mmol; ≈ 50 mg/mmol ≈ ACR 30) recorded as a candidate for a later grading decision;
  - why bare «pcr» is excluded.

## Phase 7: User Story 5, low urea in a declared pregnancy is put in context (P3)

**Goal**: `urea_low` adds one pregnancy sentence only when `pregnant === true`.

**Independent test**: probe B2, plus not-pregnant and unknown variants.

- [X] T025 [US5] Add **KD10** to `rules/engine.test.js` and confirm it fails on baseline:
  - pregnant true + urea 12 → `must_say` contains «بارداری»;
  - pregnant false or unset → `must_say` equals the baseline string (compare against a literal);
  - urgency is `routine` in all cases.
- [X] T026 [US5] In `rules/patterns_nephrology.js` `urea_low.build`, when `e.pregnant === true`, append: «در بارداری جریانِ خون و صافیِ کلیه بیشتر می‌شود و اوره به‌طورِ طبیعی پایین‌تر از بازهٔ غیرِبارداری است؛ این شایع‌ترین توضیحِ اورهٔ پایین در بارداری است.»
- [X] T027 [US5] Write the G5 paragraph in `MEDICAL_RULES.md` P133: the text verbatim and the source (Tietz, physiological hyperfiltration, unverified).

## Phase 8: Polish and cross-cutting

- [X] T028 Re-run the probe into `snapshots/after.txt` and diff it with `before.txt`. Every hunk must belong to G1–G5. Write the diff summary into `snapshots/BASELINE.md`.
- [X] T029 [P] Record the rule-id set into `snapshots/rule-ids-after.txt` and diff it with T002. It must be exactly `+uric_acid_low` (N16).
- [X] T030 Run the full suite on the working tree with `node --test` in `khanesh-server`. Investigate every red test before touching any lock (N36).
- [X] T031 Run the full suite on a clean copy of the index: stage the changes, then `git write-tree`, `git archive`, junction `node_modules`, `node --test`. Expect 0 failures. Record the counts in `BASELINE.md`.
- [X] T032 Add **N51** (ACR in mg/mmol under-read by classifying the converted mg/g value) to the Lab Notebook in `CLAUDE.md`. Commit only my hunk via `git hash-object -w` + `git update-index --cacheinfo`, because the file carries another session's edits.
- [X] T033 Restart the local backend: stop the old process, start `node server.js`, and curl `/health` (N40). Then send one panel per gap through `/api/analyze`, including a PCR-only sheet. Read the Persian `summary`, `interpretation` and `_engine.tests`, and save them to `snapshots/e2e-output.txt`.
- [X] T034 Commit only my files and hunks. Never push, never use `SKIP_HOOKS`. The commit carries `MEDICAL_RULES.md` P133 together with the behaviour (N37). End the message with the attribution line.

## Dependencies and execution order

- Phase 1 runs first. T002 and T003 can run in parallel with T001.
- T004 (P133 allocation) blocks all story phases.
- **US1** (T005–T010) and **US2** (T011–T015) are both P1 and independent. Both touch `patterns_nephrology.js`, so run them one after the other.
- **US3**, **US4** and **US5** are independent of each other. US5 touches `patterns_nephrology.js`, so it runs after US2.
- Phase 8 runs after all stories. T033 needs the code complete. T034 runs last.

### Parallel opportunities

- T002 ∥ T003 (Setup).
- T022 (`names.js`) ∥ T021 (`adapter.js`) within US4.
- T029 ∥ T028 (Polish).
- US3 (`patterns_biochem.js`, `groups.js`) can be written while US1 is under test.

## Implementation strategy

- **MVP: US1** (G1, the live under-read). It is shippable alone.
- Then US2 (the most common panel), then US3–US5.
- Each story ends with its own tests green and its P133 paragraph written.
