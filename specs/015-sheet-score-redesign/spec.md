# Feature Specification: Redesign of the Sheet Score («امتیازِ این برگه»)

**Feature Branch**: `015-sheet-score-redesign` (spec directory; work continues on branch `recovery`)

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: redesign the sheet score (`P97`, `khanesh-server/rules/score.js`). Every out-of-range test with no severity level (`binary` mode: PT, INR, HCT, ferritin, …) is scored a fixed 0.5, so PT 14 and INR 1.2 drag a patient's score to about 50. The score is a plain mean over every row, correlated rows are counted several times, and the whole-sheet urgency caps the whole score. The agreed proposal: (1) a continuous per-test score from the distance to the nearest reference bound, floored by the engine's severity level; (2) correlated rows collapse into buckets, worst row only; (3) server-side organ systems; (4) a weighted total, never more than the worst system + 30, with the urgency cap applied per system except for `emergency`; (5) display a plain count first and the number second, with the test that pulled each system down named in Persian; (6) tests that fail on the old code, and every number registered in `MEDICAL_RULES.md` `P97` as a proposal awaiting review.

## Current Behaviour (measured facts the spec starts from)

Measured 2026-10-07 on the working tree (branch `recovery`, `HEAD` `707a8ed` + uncommitted changes), calling `runEngine` → `runPatterns` → `healthScore` directly. The base panel is male, 40 years old: Hb 14.5, WBC 6.5, PLT 250, creatinine 0.9, ALT 20, AST 22, FBS 90, all normal. Each row adds the named tests to it.

| Panel | `overall_urgency` | Score today | Points below 1 | Findings |
|---|---|---|---|---|
| + PT 14 · INR 1.2 | `this_week` | **75** (capped by urgency) | PT 0.5 · INR 0.5 | `coagulation_abnormal` |
| + PT 14 · INR 1.2 · aPTT 36 | `this_week` | 75 | PT 0.5 · INR 0.5 · APTT 0.5 | `coagulation_abnormal` |
| + K 7.0 | `emergency` | 35 | K 0.15 | `hyperkalemia` |
| + ferritin 320 | `routine` | 90 | FERRITIN 0.5 | `iron_markers_high` |
| Hb 17.6 · HCT 52 · RBC 6.0 (+ rest of base) | `this_week` | 75 | HGB 0.65 · RBC 0.5 | `erythrocytosis_who_screen` |

⚠️ **Correction made during implementation.** The first measurement passed `sex`/`age` at the top level of the `runEngine` input. The engine reads them only under `patient`, so it silently graded with unknown sex: ferritin was graded against «15–150», and HCT 52 counted as abnormal. The table above was re-measured with `patient: { sex: "M", age: 40 }` on the pre-change `score.js`. Only the last row changed (it was `hct_rbc_high`, with HCT 0.5).

- **Two defects stack on the PT/INR sheet.** Without the cap, the mean would be about 89. PT 14 sits 3.7 % above its upper bound of 13.5, and INR 1.2 sits 9 % above 1.1, yet each scores the same 0.5 as a ferritin of 320. Then `coagulation_abnormal`'s `this_week` caps the **whole** sheet at 75, even though the blood count, kidney, liver and glucose are all normal.
- **The patient's ~50 was not reproduced.** The original sheet was not available. A longer sheet with several mildly out-of-range rows at 0.5 each (HCT, MCH, RDW, …), or one `soon` finding (cap 55), reaches that range. Both mechanisms are in scope.
- **Correlated rows are counted separately.** PT, INR and aPTT are three votes for one coagulation picture. Hb, HCT and RBC are three votes for one red-cell mass.
- **The frontend has its own formula.** `ResultDashboard.jsx` `systemScore()` computes 0.65 × mean + 0.35 × worst per display category and caps a critical category at 40. Those 14 display categories come from `khanesh/src/testCategories.js`. That makes two sources for one number.

## Clarifications

### Session 2026-10-07

- Q: Is distance measured relative to the range's bound or relative to its width? → A: **Width**, with `p = 1 / (1 + relW²)`, so a value one full range-width outside scores 0.5. The originally proposed bound-relative formula (`rel/0.25`) was rejected. Measured on `ADULT_REFS`, it scores pH 7.25 at 0.997, osmolality 260 at 0.95 and chloride 85 at 0.85, and none of those keys has a CTCAE level to floor it. Width-relative gives PT 14 0.96, INR 1.2 0.80, pH 7.25 0.50, Cl 85 0.39, ferritin 320 0.995.
- Q: Which categories does the radar show: the 14 display categories or the 8 scoring systems? → A: The **8 scoring systems**, from the server. The 14 display categories still group the test list. Grouping is presentation; a score is a computation, and it has one source.
- Q: Is the `this_week` urgency of `coagulation_abnormal` for PT 14 / INR 1.2 itself correct? → A: **Out of scope.** That is a clinical rule decision. It is recorded as an open question under `P97`, and this feature does not change any rule's urgency.
- Q: In the count line, what is a test with no engine severity level called (PT, INR, ferritin, HCT)? → A: **Only tests that have an engine severity level get a severity word.** The others are counted separately as «خارج از محدوده، بدون درجهٔ شدت». No severity word is ever derived from the distance score.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A mild deviation reads as mild (Priority: P1)

A patient whose sheet is normal except for PT 14 and INR 1.2 opens the result. The sheet score reflects one slightly prolonged clotting test in an otherwise healthy sheet. It is not a number that suggests something is broadly wrong.

**Why this priority**: This is the reported defect. A score that alarms a healthy patient is worse than no score.

**Independent Test**: Run the measured PT/INR panel above through the engine and the score. The total and every system except coagulation are high. The coagulation system is the lowest, and its explanation names «زمان پروترومبین» and «INR».

**Acceptance Scenarios**:

1. **Given** the base panel + PT 14 + INR 1.2, **When** the score is computed, **Then** the total is above 80, and every system other than coagulation that has data scores at least 95.
2. **Given** the same panel, **When** the score is computed, **Then** PT and INR together count once (one coagulation bucket), not twice.
3. **Given** the base panel + PT 25 + INR 3.5, **When** the score is computed, **Then** the coagulation system scores lower than in scenario 1, and the total is lower than in scenario 1.

---

### User Story 2 - A dangerous value is never averaged away (Priority: P1)

A patient with one critical result among many normal ones (for example K 7.0) sees a low score. A single dangerous system cannot hide behind several good ones.

**Why this priority**: Removing over-alarm must not create under-alarm (N3's "floor, not ceiling" rule). This is the patient-safety half of the change.

**Independent Test**: Run K 7.0 + 19 normal tests. The total is at most 35. Separately, run a sheet where only one system is markedly abnormal (no emergency). The total is at most that system's score + 30.

**Acceptance Scenarios**:

1. **Given** any sheet whose overall urgency is `emergency`, **When** the score is computed, **Then** the total is at most 35.
2. **Given** a test with an engine severity level, **When** its continuous distance score would be higher than that level's point value, **Then** the level's value is used. A nearby number never softens a CTCAE grade.
3. **Given** a sheet with no emergency, **When** one system scores S, **Then** the total is at most S + 30.

---

### User Story 3 - The patient sees why (Priority: P2)

Under the score, the patient first reads a plain count, such as «از ۹ آزمایش، ۲ مورد خارج از محدوده (بدون درجهٔ شدت)». Each system shows the Persian name of the test that pulled it down. The number carries the label «خلاصهٔ مرورِ سریعِ همین برگه، نه حکمِ پزشکی».

**Why this priority**: A number with no reason is what produced this report. The count is the honest primary signal (FI-Lab style), and the number is secondary.

**Independent Test**: Render the PT/INR result. The count line appears above the number, the coagulation system names its pulling test in Persian, and no raw engine key appears.

**Acceptance Scenarios**:

1. **Given** any scored result, **When** the dashboard renders, **Then** the count line appears before the numeric score.
2. **Given** a system below 100, **When** it renders, **Then** it names the lowest-scoring test with its server-provided Persian name, never the engine key (N8).
3. **Given** the dashboard, **When** a system score is shown, **Then** it is the server's value. The frontend computes no score of its own.

---

### User Story 4 - Not enough data, no number (Priority: P2)

A sheet that covers only one system, or very few distinct measurements, gets no total. Instead the patient reads which systems the sheet covers, for example «امتیاز فقط برای: خون‌سازی».

**Why this priority**: A CBC-only sheet scored 100 "for health" over-claims, which is the same class as N4 (absent read as normal).

**Independent Test**: Run a CBC-only sheet. The total is null with a reason, and the blood-forming system still has its own score.

**Acceptance Scenarios**:

1. **Given** fewer than 5 buckets with data, or fewer than 2 systems with data, **When** the score is computed, **Then** the total is null with reason `too_few` or `one_system`.
2. **Given** a newborn under 28 days, **When** the score is computed, **Then** there is no total and no system score (unchanged behaviour).

### Edge Cases

- **A range that is missing, one-sided or zero-width**: no distance can be computed. Use the severity level's value if there is one, otherwise the level-free fallback (FR-003).
- **A narrow-range test with no severity level** (pH, osmolality, chloride, MCHC): its distance is measured in range-widths, so pH 7.25 scores 0.50 and pH 7.10 scores 0.14. A small absolute deviation on a tight range is not mistaken for a small one.
- **A test in `unknown` mode, ungraded, `noRef`, or `unit_unknown`**: it is not scored, as today. It does not count toward coverage and is not reported as normal (Principle II).
- **A corrected value** (calcium, sodium): the score uses the graded value the engine judged, the same value the abnormal flag came from.
- **A derived index with no own range** (eGFR in `indices`): it is not scored separately. It belongs to the kidney bucket only if the engine grades it.
- **An engine key not in any bucket or system table**: a test fails. No key may silently fall out of the score (Principle IV: a skip must be counted).
- **A finding that reads keys from two systems** (for example `cirrhosis_pattern`: liver and blood): its urgency caps every system whose abnormal key it reads.
- **A finding with urgency below `emergency` that reads no abnormal scored key** (for example a qualitative-only finding): it caps nothing. The plain count still shows it, because it counts findings, not only graded rows.
- **Pediatric sheet**: bounds come from the graded range already chosen by the engine (`PED_REFS` or adult). The score adds no age logic of its own.

## Requirements *(mandatory)*

### Functional Requirements

**Per-test score**

- **FR-001**: A graded, in-range test MUST score 1, and an in-range test flagged near its limit MUST score 0.9 (unchanged).
- **FR-002**: An out-of-range test MUST score `p = 1 / (1 + relW²)`, where `relW = |value − violated bound| / (high − low)`. The value and range are the ones the engine graded, so pediatric and geriatric ranges apply automatically.
- **FR-003**: When the engine gives the test a severity level, the score MUST be `min(p, POINTS[level])`, using the existing level table (mild 0.65, moderate 0.4, marked 0.15, critical 0). When `relW` cannot be computed (the range is missing, one-sided, or zero-width), the score MUST be the level's value, or 0.5 if there is no level. This fallback is the only remaining use of 0.5.
- **FR-004**: Making a single test's value worse in its direction of deviation MUST never raise its score. That includes the step across the bound: an out-of-range test scores at most 0.9, the near-limit value. *(Added after code review: without this, HbA2 3.54 scored 1.0 while 3.4 scored 0.9.)*

**Buckets (correlated rows)**

- **FR-005**: Correlated rows MUST be grouped into buckets that each count once, scored by their worst row. At least these buckets: {PT, INR, APTT}, {AST, ALT}, {HGB, HCT, RBC}, {MCV, MCH, MCHC}, {CREAT, UREA, UREA_N}, {LDL, CHOL}. Every key that no bucket names is its own bucket. The full table, which adds a few same-analyte pairs (bilirubin fractions, RDW-CV/SD, troponin I/T, BNP/NT-proBNP, …), is in `data-model.md`.
- **FR-006**: The bucket and system assignment MUST be one explicit table. A test MUST fail if any key in `ADULT_REFS`, `PED_REFS`, `CLASSIFIERS` or `CTCAE_MAP` is missing from it. Today that is 109 keys, measured 2026-10-07.

**Systems**

- **FR-007**: Every scored key MUST belong to exactly one of the eight systems listed below, or to an explicit **excluded** list with a written reason. Today the excluded list is the semen-analysis keys: a semen analysis says nothing about an organ system's function. Excluded keys still appear in the plain count (FR-014). They are not in any system and not in the total. The eight systems: blood-forming («خون‌سازی»), liver («کبد»), kidney («کلیه»), heart («قلب»), metabolic & endocrine («متابولیک و غدد»), coagulation («انعقاد»), inflammation & immunity («التهاب و ایمنی»), electrolytes & minerals («الکترولیت و مواد معدنی»).
- **FR-008**: A system's score MUST be `(0.65 × mean + 0.35 × worst)` of its buckets × 100. A system with no scored bucket MUST be null and MUST NOT be shown as normal.

**Total**

- **FR-009**: The total MUST be `min(weighted mean of non-null systems, worst system + 30)`. Weights: heart, kidney, metabolic, blood-forming 1.0; liver, coagulation, electrolytes 0.8; inflammation 0.6.
- **FR-010**: If overall urgency is `emergency`, the total MUST be at most 35.
- **FR-011**: A finding with urgency `soon`, `this_week` or `routine` MUST cap only the systems of the abnormal scored keys that the finding's rule reads (the engine's own record of which keys each rule reads). Caps: `soon` 55, `this_week` 75, `routine` 90. The whole-sheet cap for these levels is removed. Findings that were suppressed (not shown), or shown only as a compact «یافتهٔ تکمیلی», MUST NOT cap anything.
  - *Added after code review:* the keys a finding is about are the union of three things: the keys its rule's source reads, the keys it lists as uncovered, and the keys its own text names. The source scan alone misses single-letter `K`. When a finding cannot be attributed to any graded abnormal key (for example a `unit_unknown_values` finding about an ungraded urea), its cap applies to the **whole sheet**. A finding is never left without a cap.
- **FR-021** *(added after code review)*: When overall urgency is `soon` or `this_week`, the band MUST NOT be `high`. The number may still be high, because caps are per system, but its tone is never «مطلوب» next to an instruction to see a doctor.
- **FR-012**: The total MUST be null with reason `too_few` when fewer than 5 buckets are scored, and with reason `one_system` when fewer than 2 systems are scored. System scores are still returned. Newborns under 28 days get reason `neonate` and no scores (unchanged).
- **FR-013**: The score MUST NOT feed back into the engine, the prompt, urgency, `has_critical` or any finding (unchanged, N9).

**Output and display**

- **FR-014**: The score output MUST carry, per system: its id, Persian title, score, cap if applied, and the lowest-scoring test (engine key + `faName()` name + its points). It MUST also carry a count: tests scored, tests out of range, the number at each engine severity level (mild, moderate, marked, critical), the number out of range with no level, and the number of rows the engine read but gave no verdict (`unread`: unmapped plus ungraded). The count line names those as «{n} ردیف بدون حکم», so «همه در محدوده» never covers them.
- **FR-015**: The dashboard MUST show the count line before the numeric score, in the form «از N آزمایش، k مورد خارج از محدوده». It is followed by the breakdown, using the engine's own severity words only for tests that have a level. Tests with no level are listed as «بدون درجهٔ شدت». A severity word MUST NOT be derived from the distance score (Principle I).
- **FR-016**: The numeric score MUST carry the label «خلاصهٔ مرورِ سریعِ همین برگه، نه حکمِ پزشکی». The word «سلامت» MUST NOT be used for this number.
- **FR-017**: The radar and system cards MUST read system scores from the server. `systemScore()` and its critical-40 cap MUST be removed from the frontend. The 14 display categories continue to group the test list only.
- **FR-018**: When the total is null, the dashboard MUST show the reason in Persian. For `one_system` it MUST name the system(s) the sheet covers, for example «امتیاز فقط برای: خون‌سازی».

**Governance**

- **FR-019**: Every constant introduced (the distance curve, where one range-width outside scores 0.5, then 0.65/0.35, system weights, +30, the bucket table, 5 buckets / 2 systems) MUST be recorded in `MEDICAL_RULES.md` under `P97` as "proposed by the implementer, unvalidated, awaiting clinical review". The urgency of `coagulation_abnormal` at PT 14 / INR 1.2 MUST be recorded there as an open question.
- **FR-020**: Each new test MUST be observed to fail on the code before this change (Principle IV). Tests that asserted the retired 0.5 fixed score or the whole-sheet cap MUST be updated on purpose, with a comment explaining why.

### Key Entities

- **Test score**: one graded test's points ∈ [0, 1], derived from its distance to the bound and its severity level.
- **Bucket**: a set of correlated keys that count as one measurement, scored by its worst member.
- **System**: one of eight organ groups. It holds buckets, a weight, an optional cap from findings, and a score or null.
- **Sheet score**: the total, band, reason when null, per-system results, and the plain count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the measured PT 14 / INR 1.2 panel, the total is above 80 (today: 75). Worked by hand from FR-002–FR-011: PT 0.96, INR 0.80, so the coagulation bucket is 0.80. `this_week` caps coagulation at 75. The other four systems are at 100. Weighted mean = 440 / 4.6 ≈ 96, which is below 75 + 30, so the total is 96.
- **SC-002**: On every panel whose overall urgency is `emergency`, the total stays at most 35, the same as today. Checked on the measured K 7.0 panel and on at least five other emergency panels already present in the test suite.
- **SC-003**: Across a sweep in which one test is moved progressively further out of range, the total never rises (0 violations).
- **SC-004**: Adding a normal test never lowers the total for a fixed set of findings (0 violations).
- **SC-005**: 100 % of engine keys with a reference range, classifier or CTCAE entry belong to a bucket and a system.
- **SC-006**: No raw engine key appears anywhere in the score's patient-facing text.
- **SC-007**: The full backend suite and frontend lint pass, and every new test was observed red on the pre-change code.

## Assumptions

- The constants in FR-002 to FR-012 are reasoned defaults, not validated values. Commercial scores surveyed (SmarterBlood, OptimalDX, VitaDash, Superpower, InsideTracker) either do not publish their method or publish no validation. PhenoAge is validated, but only for mortality on its nine analytes, and it is not adopted here.
- No new clinical threshold is introduced. Distances come from the reference ranges the engine already uses, and severity comes from the existing CTCAE levels.
- Scoring systems live server-side in the rules folder, next to the score. They are a scoring table, not a change to `refs.js`.
- The display-category file (`testCategories.js`) is unchanged and keeps grouping the test list.
- Work stays on branch `recovery`, like specs 011–014.
- Out of scope: any change to a rule's urgency, history/trend scoring, and an "optimal range" concept separate from the reference range.
