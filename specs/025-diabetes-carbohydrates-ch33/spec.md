# Feature Specification: Carbohydrates and Diabetes (Tietz chapters 22 and 33): gaps only

**Feature Branch**: `025-diabetes-carbohydrates-ch33` (spec directory only; no git branch)

**Created**: 2026-11-13

**Status**: Draft

**Input**: A Persian NotebookLM/Gemini extraction of Tietz chapter 22 («Carbohydrates») and chapter 33 («Diabetes Mellitus»), pasted by the user as `code_artifactduiabet.md`. The user set two conditions:
1. «قواعد تکراری اجرا نکن، فقط قواعدی که به تشخیص و تفسیر بهتر موتور کمک می‌کند». No rule the engine already has is implemented again.
2. «بازه‌های نرمال اگر تفاوتی وجود داشت، بازه‌ای انتخاب کن که در ایران بیشتر استفاده می‌شود». Where a normal range differs, the one most used in Iran wins.

## Current Behaviour

These were probed on the working tree, which equals `HEAD` (`2252643`). `git status` shows only the `.impeccable` submodule. Each panel was run through `runEngine` and then `runPatterns`, with an adult patient.

**Source premise.** The extraction is secondary and unverified. The raw chapters were not opened, so under N39/N46 nothing from them goes into `sources:` or `guidelines.js`, and no quote is treated as verbatim. Every number this feature contributes is a reviewer question under the next free number, **P143**. `MEDICAL_RULES.md` ends at P142, checked with grep.

The extraction's own counts are inconsistent. §7 says 12 🆕 and then lists 13; it says 8 ➕ and then lists 13. They are not reused here. Each item below was classified against the code.

### Already in the engine: duplicates that get no new rule (condition 1)

| Extraction item | Existing owner |
|---|---|
| Diabetes cut-offs: FPG ≥ 126, HbA1c ≥ 6.5, 2-h ≥ 200, random ≥ 200 (`RULE_DM_DIAG_*`) | `glycemia` / `diabetes_range` (ADA 2025), `patterns_p109.js` (`A1C_DM`) |
| Prediabetes: FPG 100–125, 2-h 140–199 (IGT), HbA1c 5.7–6.4 (`RULE_PREDM_*`) | `prediabetes_range`. FBS 105 printed against «70–110» already gets «پیش‌دیابت», as probed. |
| HbA1c unreliable when blood counts are abnormal (`RULE_HBA1C_INVALID_*`) | `a1cBad` and `a1c_diabetes_range_unreliable` |
| Gestational diabetes: 75 g IADPSG 92/180/153, 50 g GCT ≥ 140, 100 g Carpenter–Coustan 95/180/155/140 (`RULE_GDM_*`) | `gestational_diabetes_range`, from the Iranian 2021 guideline and `IR_MOH_GDM` (P93). This is already the Iran-specific choice. |
| Neonatal hypoglycaemia (`RULE_NEONATAL_HYPO_*`) | `neonatal_hypoglycemia` at < 40 mg/dL (user decision, P63/P107l). Tietz's < 30 and < 20 are looser, and prematurity is not on a sheet, so they are not applied. |
| Negative urine nitroprusside does not exclude DKA (`RULE_DKA_BETAHYDROXYBUTYRATE`) | Text in `dka_pattern` and `ketonuria_pattern` («نوارِ ادرار عمدتاً استواستات را می‌سنجد…»). `bhb_result` owns the BHB row. |
| Lactate, and lactic acidosis with low pH (`RULE_LACTIC_ACIDOSIS_SEVERE`) | `lactate_elevated` (< 4), the sepsis rule (≥ 4), `blood_ph_abnormal`, `severe_acidosis` |
| ACR classes (`RULE_ALBUMINURIA_CONFIRMATION`) | the ACR classifier (P133). «2 of 3 samples in 3–6 months» needs a history no sheet carries. |
| eAG from HbA1c | `patterns_p109.js` (`EAG_MGDL`) |

### Not executable from a lab sheet: these stay out

- `RULE_DM_DIAG_RANDOM_SYMPT` and `RULE_WHIPPLE_TRIAD_EVAL`. Both need symptoms, and relief after glucose, as inputs.
- History-based inputs: haemolysis, transfusion, recent blood loss, the 72-hour fast protocol, OGTT preparation (3 days of carbohydrate intake, sitting, no smoking).
- Glycated albumin, 1,5-anhydroglucitol, proinsulin, glucagon, pyruvate and the lactate/pyruvate ratio. These are almost never on Iranian sheets, so they fail condition 1.
- HOMA-IR thresholds. The extraction itself marks them «غیرقابلِ پیاده‌سازی»: no formula or cut-off is in the text. P69 keeps its own unreviewed proposal.

### Real gaps, each shown by a probe

| # | Probe | What the patient gets today |
|---|---|---|
| G1 | HbA1c 3.5 % | `unmatched_abnormal`: «برای این ترکیب توضیح آماده‌ای نداریم». No owner for a low HbA1c (N1/N18). |
| G2 | HbA1c 16 % | Ordinary `diabetes_range` text, with no word that a value this far out can come from a haemoglobin variant or a method problem. |
| G3 | HbA1c 7.8 % with the active `dm2` condition | «برای قطعی‌شدن تشخیص، این آزمایش باید یک بار دیگر تکرار شود». A known diabetic is told to confirm a diagnosis they already have, and hears nothing about the treatment target (N22). |
| G4 | «Insulin 30 µIU/mL (2.6–24.9)» with FBS 45 | `Insulin` is unmapped, so it is silently ignored (N2). Inappropriately high insulin during hypoglycaemia is never mentioned. C-peptide is the same. |
| G5 | HbA1c 6.7 + Hb 10.5, MCV 72, ferritin 8 | «HbA1c ممکن است بیشتر یا کمتر از واقع باشد». The same sheet proves iron deficiency, which pushes HbA1c **up**, yet the text names no direction (N21). |

## User Scenarios & Testing *(mandatory)*

### User Story 1: A known diabetic reads their HbA1c against a target, not a diagnosis (Priority: P1)

A patient who reported type 2 diabetes uploads a sheet with HbA1c 7.8 %. Today they are told to repeat the test to confirm a diagnosis. They should be told that the number is above the common treatment target (below 7 %, ADA). This is a target, separate from the reference range, and the treating doctor sets the target for each patient.

**Why this priority**: This is the most common diabetes sheet in Iran: a follow-up HbA1c for a known patient. The current sentence is wrong for every one of them.

**Independent Test**: Run HbA1c 6.8, 7.0 and 7.8 with and without the active `dm2` condition, and compare the text.

**Acceptance Scenarios**:

1. **Given** the `dm2` condition is active and HbA1c is 7.8 %, **When** the sheet is interpreted, **Then** the text says the value is above the common target below 7 %, quotes 7.8, and does not ask to «confirm the diagnosis».
2. **Given** the `dm2` condition is active and HbA1c is 6.8 %, **When** the sheet is interpreted, **Then** the text says the value is within the common target and still says the doctor sets each patient's target.
3. **Given** no condition is reported and HbA1c is 7.8 %, **When** the sheet is interpreted, **Then** the output is byte-identical to today (`diabetes_range`).
4. **Given** the `dm2` condition is active and HbA1c is exactly 7.0 %, **Then** it is «at or above the target» (the edge belongs to the upper side), and 6.9 is within target.

---

### User Story 2: Insulin and C-peptide on the sheet are read, not dropped (Priority: P1)

A patient's sheet prints fasting insulin and/or C-peptide with the lab's range. Today both rows are unmapped and disappear. The engine must recognise them, grade them against the printed range first, and say what the pair means next to a low glucose.

**Why this priority**: Fasting insulin is very common on Iranian sheets (insulin-resistance work-ups). A silently dropped row is N2, and a high insulin during hypoglycaemia is a finding that must not be lost.

**Independent Test**: Panels of insulin alone, C-peptide alone, insulin + FBS normal, and insulin + C-peptide + FBS < 54, with and without a printed range, in µIU/mL and pmol/L.

**Acceptance Scenarios**:

1. **Given** «Insulin 30 µIU/mL (2.6–24.9)», **Then** the row is graded high against the printed range, appears in the results, and is never in `unmapped`.
2. **Given** «Insulin 18 µIU/mL (< 10)» from a highly specific assay, **Then** it is high against the printed range. The engine fallback does not override a printed range (N55).
3. **Given** insulin in pmol/L with a printed pmol/L range, **Then** it is graded in pmol/L. A unitless insulin with no range is not graded (N3).
4. **Given** FBS < 54 mg/dL with insulin and C-peptide both high or within range (not low), **Then** a finding says that insulin is not suppressed as it should be when glucose is low. It frames this as a possibility for a doctor to investigate, never as a diagnosis («انسولینوما» is not asserted). The finding sits beside the existing hypoglycaemia emergency and never lowers its urgency.
5. **Given** FBS < 54 with high insulin and low C-peptide, **Then** the text says this pattern can come from insulin injected from outside the body, and still frames it as a possibility. A sulfonylurea screen is named only as a test to order.
6. **Given** insulin high with a normal glucose and no hypoglycaemia, **Then** the text does not mention insulinoma. It states the high value and that the doctor interprets it with glucose (insulin resistance), without a HOMA threshold.
7. **Given** C-peptide is absent from the sheet, **Then** no sentence asserts a C-peptide state (N4).

---

### User Story 3: A low or extreme HbA1c gets an explanation (Priority: P2)

**Why this priority**: An HbA1c below 4 % today ends in «توضیح آماده‌ای نداریم» (G1). Above 15 % gets no method caveat (G2).

**Independent Test**: HbA1c 3.5, 3.9, 4.0, 15.0, 15.1 and 16, each with a normal and with an abnormal blood count.

**Acceptance Scenarios**:

1. **Given** HbA1c 3.5 % on its own, **Then** a finding owns it: such a low value usually reflects a shorter red-cell lifespan (haemolysis, recent blood loss or transfusion) or a haemoglobin variant interfering with the method. `unmatched_abnormal` no longer names HbA1c.
2. **Given** HbA1c 16 %, **Then** the existing `diabetes_range` text is kept and one sentence is added: very high values are uncommon, and a haemoglobin variant or a method problem is worth excluding. Urgency is unchanged.
3. **Given** HbA1c 4.0 or 15.0, **Then** neither extra sentence appears (edges are strict: < 4 and > 15).

---

### User Story 4: HbA1c doubt says which way when the sheet argues it (Priority: P2)

**Why this priority**: N21. The sheet already contains the evidence.

**Acceptance Scenarios**:

1. **Given** HbA1c ≥ 6.5 with microcytosis and low ferritin, **Then** `a1c_diabetes_range_unreliable` says iron deficiency can push HbA1c **above** its true value.
2. **Given** HbA1c ≥ 6.5 with anaemia and high reticulocytes, or other haemolysis markers that the engine already reads, **Then** it says HbA1c can be **below** its true value.
3. **Given** anaemia with nothing that indicates a direction, **Then** today's two-sided sentence is kept.

---

### User Story 5: Anti-GAD and IA-2 antibodies are read from their printed cut-off (Priority: P3)

**Acceptance Scenarios**:

1. **Given** «Anti-GAD 25 IU/mL (< 10)», **Then** it is positive against the printed cut-off. The text says it supports an autoimmune type of diabetes (type 1 or LADA) and is never a diagnosis.
2. **Given** an anti-GAD row with no printed cut-off and no qualitative word, **Then** it is listed as read but not interpreted. It is never called negative (N4/N6).
3. **Given** «Anti-GAD Negative», **Then** it stays qualitative and is read through `qualVerdict` (N6/N30).

### Edge Cases

- A printed HOMA-IR row is listed among the rows the engine read but did not interpret. It is never silently dropped (N53), and no threshold is applied.
- «Insulin» must not capture «Insulin antibody (IAA)» or «Anti-insulin» (N25). Each needs its own identity, or it stays unmapped and listed.
- C-peptide in nmol/L against ng/mL (× 0.331): convert only when the sheet prints the unit (N3).
- In pregnancy, `gestational_diabetes_range` keeps ownership of glucose. The new target arm (US1) never fires in pregnancy.
- Under-16 patients: the treatment target arm and the insulin/C-peptide findings use the same text with no adult-only threshold. A child gets no HOMA advice.
- Every new rule needs a `RULE_GROUP` entry (GR1) and is tested beside every emergency it can sit under (N20, `always_show`/`brief`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extraction items listed under "Already in the engine" and "Not executable" MUST NOT produce new rules or change existing thresholds.
- **FR-002**: With the active `dm2` condition and outside pregnancy, HbA1c MUST be described against a treatment target of < 7 % (≥ 7 = above target). This is separate from the reference range, and `refs.js` is not changed (N22). Without the condition, output MUST stay byte-identical.
- **FR-003**: `INSULIN` and `C_PEPTIDE` MUST be added through all five rules files (N1): range, `NAME_MAP` spellings, grading mode, pattern ownership, and `FA_NAMES`.
- **FR-004**: Insulin and C-peptide MUST be graded against the printed range first (`PRINTED_FIRST_KEYS`). The engine fallback is used only when no range is printed, and only with a stated unit.
- **FR-005**: A finding MUST describe non-suppressed insulin/C-peptide when the same sheet has glucose < 54 mg/dL. It MUST be a possibility for a doctor to investigate, MUST NOT lower urgency, and MUST quote the numbers.
- **FR-006**: HbA1c < 4 % MUST have an owner rule. HbA1c > 15 % MUST carry a method/variant sentence inside the existing diabetes finding.
- **FR-007**: `a1c_diabetes_range_unreliable` MUST state a direction when the sheet itself shows iron deficiency (up) or haemolysis (down). Otherwise it keeps today's text.
- **FR-008**: Anti-GAD and anti-IA-2 MUST be read from the printed cut-off or from a qualitative word. Without either, they are listed as read but not interpreted.
- **FR-009**: Every new number MUST be recorded under **P143** in `MEDICAL_RULES.md` «در انتظارِ بازبینی», in the same commit as its behaviour (N37). P69 is cross-referenced, not re-decided.
- **FR-010**: Each new behaviour MUST have a regression test that fails on `HEAD` `2252643` (N10). Edges MUST be probed at edge − ε, edge, and edge + ε (N51/N55).
- **FR-011**: Every new user-facing string MUST be Persian, use `faName()`, and use probabilistic, non-diagnostic wording.

### Reference-range decisions (condition 2: the range most used in Iran)

| Analyte | Tietz (extraction) | Engine today | Chosen | Why |
|---|---|---|---|---|
| Fasting glucose | 74–99 mg/dL | 70–110 | **70–110 (no change)** | This was a recorded user decision on 2026-10-03 (REF_DIFF). 70–110 is the range most Iranian sheets print. `prediabetes_range` already flags ≥ 100 whatever the range says. |
| HbA1c | 4.0–5.6 % | 4–5.6 | **no change** | Identical. |
| 2-h / random glucose | < 140 | 70–140 | **no change** | Identical upper limit. |
| Insulin (fasting) | 2–25 µIU/mL (12–150 pmol/L) | none | **2.6–24.9 µIU/mL** (fallback only) | The electrochemiluminescence kits common in Iranian labs print this. Tietz's 2–25 differs by under 1 µIU/mL at either edge. |
| C-peptide (fasting) | 0.78–1.89 ng/mL | none | **1.1–4.4 ng/mL** (fallback only) | Tietz's upper limit of 1.89 would mark ordinary Iranian sheets high (the N55 TPO/RF shape). The range printed in Iran is the safer fallback. |

The printed range always wins over a fallback (FR-004). Each chosen fallback is a P143 reviewer question.

### Key Entities

- **Insulin row**: value, unit (µIU/mL, mIU/L, pmol/L; 1 µIU/mL = 6.945 pmol/L), and printed range.
- **C-peptide row**: value, unit (ng/mL, nmol/L, pmol/L; 1 ng/mL = 0.331 nmol/L), and printed range.
- **Islet autoantibody row**: name (anti-GAD, anti-IA-2), value, and printed cut-off or qualitative word.
- **dm2 condition**: an already active reported condition (`ACTIVE_CONDITIONS`, P66). It is reused, not extended.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all five probe panels G1–G5, the patient-facing text changes as specified, and none of them shows «توضیح آماده‌ای نداریم» for a diabetes analyte.
- **SC-002**: A sheet that prints insulin or C-peptide never loses the row. Across the test panels, 0 such rows are left in the unmapped list.
- **SC-003**: Sheets without the new analytes and without the `dm2` condition produce output identical to today. The existing suite and `metamorphic.test.js` stay green, with no new `ALLOWED_DROPS`.
- **SC-004**: No new finding lowers the urgency of any panel (the metamorphic monotonicity holds).
- **SC-005**: Every new threshold and range appears in P143 with its source and its status, «در انتظارِ بازبینی».

## Assumptions

- "Most used in Iran" for fasting glucose is settled by the earlier user decision (70–110). If the user now wants 70–100, that is a one-line change, recorded under P143, with the N23 boundary panel re-run.
- The insulin and C-peptide fallbacks come from common commercial kits in Iranian labs, not from a document opened this session. They are fallback-only and reviewer-gated.
- Spellings come from the extraction §4-a (Insulin, Fasting Insulin, انسولین سرم, انسولین ناشتا, C-Peptide, سی‌پپتاید, پپتید C, Anti-GAD, GAD-Ab, IA-2A) plus the existing `resolveAlias` behaviour. No fuzzy matching is added.
- The hypoglycaemia cut-off for FR-005 reuses the engine's existing level-2 threshold (< 54 mg/dL). No new glucose threshold is introduced.
- Fructosamine is out of scope (rare on Iranian sheets, condition 1). It can be added later through the same five-file path.
