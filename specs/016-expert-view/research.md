# Research: Expert View (specs/016)

All measurements on 2026-10-08, working tree, branch `recovery` at `f53e269` (backend clean; frontend has a concurrent session's uncommitted edits in `ResultView.jsx`, `ResultDashboard.jsx/.css`, `Tafsir.jsx`, `onboarding/*`).

## R1 — Where the expert data is built

- **Decision:** a new module `khanesh-server/rules/expert.js` exporting `buildExpertView(engineOut, patternOut, score)`. `server.js` calls it inside the same `_engine` builder that already assembles `score`, `guidelines`, `preanalytical` and `unitConversions`, and stores the result as `_engine.expert`.
- **Rationale:** the `_engine` builder runs after `runPatterns` has selected, briefed and ordered the findings, so the expert view describes exactly what the patient is shown (FR-003). `_engine` is never sent to the model: `buildEnginePrompt` reads `engineOut`/`patternOut`, not `_engine` (FR-017).
- **Alternatives rejected:** building it in the frontend from `_engine.tests` (the frontend never receives findings, and N12 forbids clinical text without an engine); building it inside `runPatterns` (would change every freeze hash, see R2).

## R2 — Hidden findings without changing `runPatterns`' output

- **Measured:** `runPatterns` returns `suppressed_ids` (ids only). The demoted finding objects are not returned. Several freeze tests (`specimen.test.js`, `prenatal.test.js`, `serology.test.js`, `engine.test.js`) hash `JSON.stringify(runPatterns(e))`, so adding any enumerable field to the return value re-baselines every freeze.
- **Decision:** `patterns.js` exports a `WeakMap` `HIDDEN_FINDINGS`, keyed by the returned object, holding the demoted findings. It is invisible to `JSON.stringify`, so no freeze changes.
- **Alternatives rejected:** an enumerable `hidden` field (re-baselines all freezes for no clinical reason); a non-enumerable property (works, but is invisible to readers of the code; the WeakMap is explicit and exported).

## R3 — Which tests a finding is "about"

- **Measured:** `score.js` already solves this for P97 with `cappedKeys`: the union of the rule's source reads (`ruleReads`), the finding's `uncovered`, and the keys whose Persian name appears in the finding's text. The source scan alone misses `K` and keys read through helpers (the N32 review finding).
- **Decision:** move that function to an exported helper (`findingKeys(f, candidateKeys)`) in `score.js` and call it from both modules. Triggers = attributed keys among abnormal graded tests; context = attributed keys among in-range graded tests, shown with their status. Neither list is ever "all graded tests".
- **Alternative rejected:** `explains` / `key_number` only (28 of 81 sampled findings have `key_number`).

## R4 — Labels without raw ids

- **Measured:** no Persian label exists for rule ids. E2 in `MEDICAL_RULES.md` forbids rendering ids.
- **Decision:** the finding's own `headline` is its label. Hidden findings use their `headline` too. A finding with no `headline` gets the fixed label «یافتهٔ بی‌عنوان» and is counted in a test that must stay at 0.

## R5 — Suggested tests

- **Measured:** `suggest` exists on 68 of 81 sampled findings. `alreadyMeasured` (exported from `patterns.js`) and `dropSubsumedTests` (private in `prompt.js`) already de-duplicate against the sheet and against larger panels.
- **Decision:** export `dropSubsumedTests`; the expert view lists bare test names (no «درخواست … از پزشک» wrapper, which is patient phrasing), per finding and once for the sheet, filtered by `alreadyMeasured` over graded **and** ungraded keys (P88).
- **Note:** briefed findings have `suggest: []` in the shown copy. The expert view reads suggestions from the shown copy, so a briefed finding contributes none; that is the existing patient behaviour and is kept.

## R6 — Values: printed, converted, corrected, derived

- **Measured:** `engineOut.printedRanges` (`{CA: "8.5–10.5"}`) holds the sheet's printed range per key; `engineOut.unitConversions` holds `raw/from → value/to` with `basis`; `engineOut.indices` holds `egfr`, `anion_gap`, `anion_gap_corr`, `ca_measured`, `ca_corrected`, `ca_correction_applied` (and `na_measured` when sodium is glucose-corrected). Graded `CA` is the corrected value when the correction applied.
- **Decision:** each trigger test carries `printed` (value and unit as on the sheet), `graded` (value and unit the engine used), `printed_range`, `engine_range`, `range_source`, and `derived_from` («اصلاح با آلبومین», «تبدیل واحد»). Indices are listed separately with a fixed Persian label and a fixed sentence on how the engine computed them:
  - eGFR: CKD-EPI 2021 from creatinine, age and sex; assumes a stable creatinine.
  - Anion gap: Na − (Cl + HCO3); the albumin-corrected value adds 2.5 × (4.0 − albumin).
  - Corrected calcium: the formula already in `adapter.js`.
  These sentences describe the engine's own arithmetic; they add no threshold. They are recorded in `MEDICAL_RULES.md` (P100) with the `pro` batch.

## R7 — The `pro` block and the first batch

- **Decision (shape):** an optional `pro` property on the **rule object**, not on the finding: `{ cautions: string[], differential: string[], workup: string[], sources: string[] }`. Static text, no function, so it cannot depend on a value it might misread. `expert.js` looks it up by `rule_id`. Findings, freezes and `M36` are unaffected.
- **Decision (guards):** a new test file `rules/expert.test.js` scans every `pro` string for: mojibake (the `M37` set), non-Persian text (the `M38` allowlist), raw engine keys, outpatient wording, and **numbers**. A digit run in `pro` text must also appear in the same rule's own source (`toString()` with comments stripped), so `pro` text can only restate a number the rule already uses and can never introduce a threshold (Constitution, Clinical Change Constraints). Every `pro.sources` id must exist in `guidelines.js` (the `G6` shape).
- **Measured frequency (synthetic):** a sweep of every `ADULT_REFS` key at five magnitudes, both sexes, plus 13 common combined panels (784 panels), fired 88 of 250 rules. The ranking is dominated by single-analyte coverage rules (`unmatched_abnormal` 156, `thyroid` 50, `lipid_profile` 24, `coagulation_abnormal` 20, …), so it is a coverage measure, not a clinical-frequency measure. No real-sheet dataset is in the repository.
- **Decision (batch, 30 rules):** chosen by the panels Iranian sheets print most (CBC, glucose and lipids, thyroid, liver, kidney and electrolytes, iron, inflammation, coagulation, urinalysis), and each confirmed to exist in `RULES`:
  - Blood (12): `microcytic_anemia`, `iron_deficiency_panel`, `thal_trait_no_anemia`, `macrocytic_anemia`, `normocytic_anemia`, `anemia_chronic_disease`, `overt_b12_deficiency`, `leukocytosis`, `mild_neutropenia`, `lymphopenia`, `thrombocytopenia`, `isolated_thrombocytopenia`.
  - Chemistry (12): `glycemia`, `lipid_profile`, `thyroid`, `liver_pattern`, `kidney`, `potassium_critical`, `sodium_critical`, `calcium_abnormal`, `hyperuricemia`, `vitamin_d_abnormal`, `iron_markers_high`, `high_anion_gap`.
  - Inflammation and coagulation (3): `crp_elevated`, `esr_elevated`, `coagulation_abnormal`.
  - Urine (3): `uti_pattern`, `proteinuria_pattern`, `hematuria_pattern`.
  - `unmatched_abnormal` is excluded: it has no clinical subject of its own.
- **Sources for `pro` text:** only ids already in `guidelines.js` (for example `KDIGO_CKD`, `ADA_SOC`, `ESC_EAS_LIPID`, `ATA_HYPER_2016`, `WHO_ANAEMIA`, `WHO_FERRITIN`, `ACG_LIVER`, `UKKA_HYPERK`, `ENDO_VIT_D`, `CTCAE`, `HENRY`, `MERCK_PRO`). A rule whose caution needs a source not in the registry gets no caution until the source is added.

## R8 — Frontend placement

- **Measured:** the result page is `ResultView.jsx` (engine path renders `summary`, `interpretation`, recommendations, `ResultDashboard`, extracted tests, unit conversions, derived values). It already contains a graph-path block «گزارش تخصصی برای پزشک» that renders **LLM** text (`result.labmat.doctorSection`); the expert view must never read it. `Segmented.jsx` is an accessible radiogroup already used by the intake.
- **Decision:** new files `khanesh/src/ExpertView.jsx` and `ExpertView.css`. `ResultView.jsx` gets only: a `Segmented` switch under the urgency banner and context line (both stay visible in both modes), the stored mode (`localStorage`, wrapped in try/catch, key `azmayar_view_mode_v1`), and a conditional that renders `ExpertView` in place of the simple-view body when the mode is «تخصصی» and `_engine` exists. The switch is not rendered off the engine path.
- **Rationale:** keeps the diff in the entangled `ResultView.jsx` to a few lines, so it can be committed hunk by hunk.

## R9 — Older server

- **Decision:** `ExpertView` with no `_engine.expert` renders the per-test table from `_engine.tests`, the indices and the conversions that already exist, plus one sentence: «جزئیاتِ یافته‌ها برای این نتیجه در دسترس نیست (نسخهٔ قدیمیِ سرور)». It never throws on a missing or malformed field (FR-015).

## R10 — Inpatient voice

- **Measured:** `applyInpatientVoice` runs inside `runPatterns` before selection, so every shown finding's `action` already carries the inpatient sentence. The expert view shows `action` verbatim, so it inherits it with no code of its own (Story 6). A test asserts the outpatient phrases are absent from the whole `_engine.expert` object for hospitalized panels.
