---
description: "Task list for 014 — 24-hour urine and body-fluid chemistry, Stage A (recognition only)"
---

# Tasks: 24-Hour Urine and Body-Fluid Chemistry (Stage A — recognition only)

**Input**: Design documents from `specs/014-urine24h-body-fluids/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/engine-specimen.md, quickstart.md

**Tests**: REQUIRED. Constitution IV: every guard must fail on the pre-change tree before it is accepted. Freezes
(U09, U10, U12, U14) are green-before by design and must say so in their comment.

**Scope**: Only User Story 1 is implemented. Stories 2–4 are deferred by clarification (Stage A only). Their whole
deliverable in this feature is the P87 register entry (T020). No interpretive rule is written.

**Paths**: backend only, `khanesh-server/` (run commands from there). Never move Persian text through PowerShell
`Get-Content`/`Add-Content`/`Set-Content` (N15(d)). Use the Write/Edit tools.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Measure the baseline: run `node --test 2>&1 | tail -8` in `khanesh-server/` and record tests/pass/fail plus `git rev-parse --short HEAD` + "working tree" in `specs/014-urine24h-body-fluids/quickstart.md` under step 0 (constitution III; never quote a number from CLAUDE.md)
- [X] T002 Capture the freeze snapshot before any code change: write a scratch script that runs `runEngine`+`runPatterns` over every panel in `khanesh-server/rules/lis1005.test.js`, 12 ordinary panels (CBC, BMP, lipid, liver, thyroid, urinalysis, iron, coag, `24h urine calcium 320 + Ca 11.2 + PTH 90`, …) and requests 27/28, and saves JSON to the scratchpad as `pre-014.json`. This is the reference for U09/U10

---

## Phase 2: Foundational (blocking)

- [X] T003 Create `khanesh-server/rules/specimen.js` (pure, no imports from adapter): `SPECIMEN_FA` and `FLUID_TYPE_FA` exactly as in contracts/engine-specimen.md §1 and the data-model table; `fluidTypeOf(name, value)` (research R5: type words in the name or value; numeric → `{type:"unknown", code}`); `specimenSheetEvidence(tests, norm)` (R1: `u24` from 24-h name token + urine analyte word, or a 24-h unit `/24h|mg/24h|g/24h|mmol/24h|mL/24h`; `fluidTypeRow`); `specimenClaim(row, evidence, norm, mapKey)` (R1(a) name match → U24_* ids; fluid prefix/suffix words `fluid|pleural|ascit|periton|csf|cerebrospinal|synov|pericard|body fluid|مایع` + analyte `glu|glucose|قند`, `prot|protein|پروتئین`, `ldh` → FL_* ids; `fluidtype|نوع مایع` → FL_TYPE; returns `null` when `mapKey(norm(name))` resolves, except bare `urineprotein|urinecreatinine|urinecr|urinevolume` with `evidence.u24` → `claimed_by:"evidence"` (R3)). Head comment in Persian naming specs/014, P87 and N25
- [X] T004 Export `mapKey` (or pass it as a callback) from `khanesh-server/rules/adapter.js` so `specimenClaim` can apply the R3 "never steal an existing mapping" rule without an import cycle

**Checkpoint**: `node -e "import('./rules/specimen.js').then(m=>console.log(Object.keys(m)))"` lists the five exports.

---

## Phase 3: User Story 1 — 24-hour urine and body-fluid rows are recognised, named and shown (Priority: P1) 🎯 MVP

**Goal**: every 24-h urine and fluid row leaves `unmapped`, enters no serum/dipstick/spot key, and is named in Persian on
the «تفسیر نشدند» line. Findings, urgency and `has_critical` are unchanged.

**Independent Test**: quickstart.md §1 table (U01–U14, T54–T56) and §2 commands.

### Tests for User Story 1 (write first, run on the unchanged tree, record red/green) ⚠️

- [X] T005 [P] [US1] Create `khanesh-server/rules/specimen.test.js` (header comment in Persian like `serology.test.js`: separate file to avoid clashing with `engine.test.js`) with U01–U08 exactly as specified in quickstart.md §1: request 27 (F 25) → three `e.specimen.u24` rows, `unmapped` empty, no findings, `overall_urgency` `none`; request 28 (F 46) → three fluid rows + FL_TYPE `{type:"unknown",code:"4"}`, serum LDH 367 is the only graded LDH; the single-row spelling list → correct id/type; `Pleural LDH 306`+`LDH 367` → graded LDH 367; `Urine Protein 153`+`Urine Volume/24h 1700` → `U24_PROT` with `claimed_by:"evidence"`; `Urine Protein +1` alone → still in `qual`; `Urine Ca/24h 320` → `U24_CA` and no `U_CA`; conflicting duplicate → first kept, second in `unmapped`
- [X] T006 [US1] Add U09–U14 to `khanesh-server/rules/specimen.test.js`: U09 mineral-axis freeze and U10 byte-identical freeze over the T002 panel set (inline the panels; compare against the pre-change output recomputed by stashing, NOT against a file in the scratchpad); U11 `specimenLine` for requests 27/28 equals the contract §3 strings exactly and contains no `U24_`/`FL_` and none of «بالا»، «پایین»، «طبیعی است»، «نرمال»، «امروز»، «این هفته»، «اورژانس»; U12 `CSF Glucose 30`+`FBS 100` → same findings/urgency as without the CSF row; U13 `Fluid Type 4`+bare `Glucose 122`+`LDH 306` → still `GLU_F`/`LDH`, `bareServingFluidNames` lists both, and the caution sentence names them; U14 grep every `rules/patterns_*.js` source for `specimen` → zero hits. Mark U09/U10/U12/U14 as green-before freezes in their comments
- [X] T007 [P] [US1] Add T54–T56 to `khanesh-server/api-contract.test.js` (follow the existing T53 style, manual JSON input): T54 request 27 only → response has the "recognised" uninterpreted interpretation (contract §3), `ocr_warnings` contains the specimen line, no «نشناخت» about these rows, trace `llm_called:false`; T55 request 28 → engine path, `ocr_warnings` contains the specimen line, `has_critical` equals the value without fluid rows; T56 a normal BMP + `Urine Prot/24h 153` → summary is «مقادیری که موتور می‌سنجد در محدودهٔ طبیعی‌اند، ولی چند مقدارِ این برگه تفسیر نشدند.» and the interpretation names «پروتئین ادرار ۲۴ساعته»
- [X] T008 [US1] Run `node --test rules/specimen.test.js` and `node --test api-contract.test.js` on the unchanged tree and record the result in the test header comment: expected red U01–U08, U11, U13, T54–T56; green U09, U10, U12, U14. If any expected-red test passes, fix the test before going on (N10)

### Implementation for User Story 1

- [X] T009 [US1] In `khanesh-server/rules/adapter.js` `ocrToEngineInput`: declare `const specimen = { u24: [], fluid: [], bareServingFluidNames: [] }`; compute `specimenSheetEvidence(ocr?.tests || [], norm)` beside `isPrenatalSheet`; in the row loop, after the glued-unit split block and **before** the specs/013 prenatal claim, call `specimenClaim(t, ev, norm, mapKey)`. On a hit, push `{id, name:t.name, raw:String(t.value ?? ""), unit: t.unit || null, fluid?, claimed_by}` into `u24`/`fluid` (fluid rows get `fluidTypeOf`; R7 duplicate rule: same id and same fluid type with a different raw → `unmapped.push(t.name)`), then `continue`. Persian comment citing specs/014, R2, R3
- [X] T010 [US1] In `khanesh-server/rules/adapter.js`: after the row loop, when `ev.fluidTypeRow` is true, collect the printed names of rows that mapped to `GLU_F`/`GLU_RANDOM`/`LDH`/`TP` with a bare name (no fluid word) into `specimen.bareServingFluidNames` (R6; do not reassign them). Return `specimen` from `ocrToEngineInput` and pass it through `runEngine` as `e.specimen` (always present; empty arrays by default)
- [X] T011 [US1] In `khanesh-server/rules/prompt.js`: add and export `specimenLine(specimen)` building the contract §3 line (24-h group first; one fluid group per type with `{typeFa}`; FL_TYPE fills the label and is not listed; value + unit when printed; the R6 caution appended when `bareServingFluidNames` is non-empty; `null` when both arrays are empty), importing `SPECIMEN_FA`/`FLUID_TYPE_FA` from `./specimen.js`
- [X] T012 [US1] In `khanesh-server/rules/prompt.js`: extend `buildUninterpretedResult(unmapped, { listShown, recognized })`. When `recognized` is non-empty, prepend the contract §3 "recognised" sentence and drop «هیچ‌کدام از مقادیرِ این برگه را نشناخت». Keep «مقادیرِ نشناخته: …» only for a non-empty `unmapped`, and the summary unchanged. Add the specimen branch to `buildNormalResultAdult` (contract §3 text, combined with the noRef branch when both apply; the neonatal voice wrapper still applies)
- [X] T013 [US1] In `khanesh-server/server.js` `/api/analyze` (and the async job path that shares the handler; confirm by grep for `buildUninterpretedResult` and `unexplainedNoRef`): import `specimenLine`; capture `const recognizedLine = specimenLine(engineCandidate.specimen)` before `engineCandidate = null` in the fallback gate; push `specimenLine(engineOut.specimen)` into `ocrWarnings` right after the unmapped line on the engine path; in the P78 uninterpreted path pass `{ recognized: recognizedLine }` and push the line into `ocrWarnings`. Do NOT widen the fallback gate condition (R4.4). Do NOT add `specimen` to `_engine`, `safeEngineOut` or the prompt payload (N13)
- [X] T014 [US1] Confirm `buildNormalResult` receives the specimen branch on the engine path: it reads `engineOut.specimen` inside `buildNormalResultAdult`, so no server change is needed; verify by API test T56 going green
- [X] T015 [US1] Run `node --test rules/specimen.test.js` and `node --test api-contract.test.js` and quote the output. All U01–U14 and T54–T56 green. Fix the implementation, not the tests, unless a test contradicts the contract

**Checkpoint**: User Story 1 complete. Requests 27/28 read as recognised, with no verdict and no urgency change.

---

## Phase 4: User Stories 2–4 — deferred (P87 only)

- [X] T016 [US2] Record U24-C1–C3 (the creatinine-excretion bands table with ✅ sources, the incomplete/over-collection messages, routine urgency) in the P87 entry drafted in T020. No code
- [X] T017 [US3] Record U24-V, U24-P0–P4 (including the ACOG 2013 vs 2002 note and the paediatric per-m² thresholds), U24-K, U24-U0–U1, U24-CA0–CA5 (Mayo 250/200 vs Roche range, open decision 8), U24-UA0–UA4 in P87 with ✅/📘 per number and each proposed urgency. No code
- [X] T018 [US4] Record F0, FL-P1–P4, FL-A1–A3, FL-C0–C5 (flag FL-C1 as the first proposed `emergency`), FL-S1–S3, FL-K1, FL-X1 in P87 with sources and proposed urgencies. No code

---

## Phase 5: Polish & Cross-Cutting

- [X] T019 Run the full suite `node --test` and `node --test rules/metamorphic.test.js` in `khanesh-server/`. Quote tests/pass/fail and compare with the T001 baseline: the only delta may be the new tests. Any other change is an FR-004 violation and must be fixed
- [X] T020 Write the `#### P87` entry in `MEDICAL_RULES.md` (Persian, «در انتظار بازبینی»): source document name and date; the Stage A decision (user, 2026-10-05); the T016–T018 content; the Section 4 open decisions (D1 code table, D2 units incl. urea vs UUN, weight/height, same-visit definition, infant CSF protein, urgencies, calcium/uric-acid column names, hypercalciuria threshold, 📘 verification list); plus R3 (U_CA dual identity) and R6 (bare Glucose/LDH beside Fluid Type). Write with the Edit tool only
- [X] T021 [P] Update `CLAUDE.md`: add `rules/specimen.js` to the File Structure tree under `rules/` (one line: specs/014, identity only, channel `e.specimen`, no reader until P87) and add the `specimen.test.js` row to the Tech Stack test table; add an N2 recurrence bullet: "24-h urine / body-fluid rows on the LIS export were unmapped; Stage A recognises them without a reader on purpose (P87), and a bare Glucose/LDH beside Fluid Type is still read as serum (known limit)". Edit tool only
- [X] T022 Run `code-reviewer` on the diff (adapter.js, specimen.js, prompt.js, server.js, tests). Fix any finding about N8 (raw ids), N13 (channel reaching the model), N25 (collision) or FR-004 (changed existing output), then re-run T019
- [X] T023 Run quickstart.md §3 (live probe): `npm start` with `USE_GRAPH` off, POST request 27 manual JSON to `/api/analyze`, and confirm `ocr_warnings` holds the specimen line verbatim and the trace shows `llm_called:false`. **Run 2026-10-05** (port 8799, temp `DB_FILE`, `TRACE=1 TRACE_DISK=1`, request 27 + `Microalbumin 24h 250 mg/24h`): `has_critical:false`, one `ocr_warnings` line starting with the U11 prefix and naming all four rows in Persian, no `U24_`/`FL_` in the body, trace `path: uninterpreted | llm_called: false`. Trace file deleted afterwards.

---

**Review follow-up (T022, 2026-10-05):** `code-reviewer` found 2 HIGH, 1 MEDIUM and 4 LOW. Fixed: dipstick claimed as 24-h protein (U15, U16), the R6 caution saying «نادیده بگیرید» beside an emergency (U18), the `mergePages` key collision (T57 in api-contract, because importing server.js from a rules test hangs the runner), a Fluid-Type-only null line, and the empty-value render. LOW spelling gaps and label, fixed in a follow-up the same day (guard U19, red before the fix): `Glucose, CSF` / `Protein, CSF` / `LDH, Pleural` (commas are stripped only inside `specimen.js`; the global `norm()` comma change stays separate, per `E4`), `Pleural Fluid Protein (Total)` (`proteintotal`), `Microalbumin 24h` / `Urine Albumin/24h` (new recognition-only id `U24_ALB`, never `ACR` and never serum `ALB`), and `Fluid Type: Serum` now reads «نوع: «Serum»، ناشناخته» instead of «مایع دیگر».

## Dependencies & Execution Order

- T001 → T002 → T003 → T004 → (T005 → T006) ∥ T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T019 → T022
- T016–T018 feed T020. T020 and T021 can run any time after T015, in parallel with each other.
- T023 is optional, after T015.

## Parallel Example: User Story 1

```text
T005 specimen.test.js U01–U08   ∥   then T006 specimen.test.js U09–U14 (same file, after T005);   ∥ T007 api-contract.test.js T54–T56
```

## Implementation Strategy

- **MVP = Phase 1 + 2 + 3** (User Story 1). It is the whole executable scope of this feature.
- Stories 2–4 ship as documentation only (P87) and become a future feature once a reviewer approves them. The
  `e.specimen` channel is shaped so that the future `patterns_specimen.js` needs no adapter change.
- Commit only when asked. The pre-commit hook runs `npm test` on the index.
