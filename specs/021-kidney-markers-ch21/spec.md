# Feature Specification: Kidney Markers, Package 2 (Tietz, chapter 21)

**Feature Branch**: `021-kidney-markers-ch21` (spec directory only; no git branch created)

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: «مارکرهای کلیوی بستهٔ دوم (Tietz فصل ۲۱، ص ۳۶۰–۳۶۵): اوره/BUN، نسبت اوره به کراتینین، اسید اوریک، پروتئینوری و آلبومینوری. اول قواعدِ موجودِ موتور خوانده شود؛ موارد تکراری قاعده نشوند؛ فقط موارد لازم و مفید اجرا شوند. با همان اصولِ specs/020.» The input is a NotebookLM extraction ("package 2") of Tietz chapter 21, pp. 360–365. It contains a reference-range table, 8 IF-THEN rules, non-renal and spurious causes, pre-analytical interferences, clinical use, follow-up tests, and two source ambiguities.

## Current Behaviour (what the spec starts from)

This was measured on the working tree on 2026-11-10 by running `snapshots/probe.mjs`, which feeds 17 panels through `runEngine` and `runPatterns`. Its output is in `snapshots/before.txt`. The counts below describe that tree only and are not quotable.

**Already in the engine. These are duplicates and get no new rule:**

| Source item | Existing owner |
|---|---|
| Urea/creatinine ratio > 81 mmol/mmol (BUN/Cr > 20) means prerenal is more likely | `kidney`: `prerenal_pattern` when `bun_cr > 20`, plus the sentence «نسبت اوره به کراتینین بالاست که به کم‌آبی اشاره دارد». `isolated_urea_elevation` uses the same threshold of 20. |
| Non-renal causes of high urea (protein intake, GI bleeding, corticosteroids, dehydration) | `isolated_urea_elevation` names each one. It also has the BUN/Cr > 30 + low Hb flag for upper-GI bleeding (P59). |
| Low urea from low protein intake or liver disease | `urea_low` (P127) |
| Very high urea | `urea_bun_emergency` (urea-equivalent ≥ 200 mg/dL, P85) |
| High urate, gout/stone risk, «6.8 solubility», no drug for asymptomatic hyperuricaemia | `hyperuricemia` (ACR 2020, P110) |
| ACR categories A1/A2/A3, the old term "microalbuminuria", confirmation in 2 of 3 samples, transient causes (fever, exercise, UTI, menses), diabetic context | `interpret.js` `ACR` classifier and `albuminuria_pattern` |
| Proteinuria > 0.3 g/day in pregnancy | `pregnancy_proteinuria_24h` (≥ 300 mg/24 h; emergency when severe features are present) |
| Nephrotic-range proteinuria | `nephrotic_pattern` |
| ACR conversion between mg/mmol and mg/g (source factor 0.1136) | `BRANCH_FACTORS.ACR_MGMMOL_TO_MGG = 8.84`, the same factor inverted (1/0.1131) |
| Unit conversions: urea mmol/L, urate µmol/L or mmol/L | `units.js`. Urea is never converted to BUN. |
| Sex-dependent urate range with the sex unknown | `sex_unknown_value`. A value that one sex's range calls high is not graded. |

**Gaps found by the probe:**

- **G1, a live under-read.** An ACR printed in mg/mmol is converted to mg/g and then classified on the mg/g cut-offs. 3.0–3.39 mg/mmol therefore becomes 26.5–29.9 mg/g, which is A1, «طبیعی». KDIGO puts A2 at ≥ 3 mg/mmol, and the sheet's own printed «< 3.0» says the same. The patient gets no finding at all. Likewise 30–33.9 mg/mmol becomes A2 where KDIGO says A3 (> 30 mg/mmol).
- **G2, a coverage hole (N18).** When both creatinine and urea are high, `kidney` explains the creatinine only. The urea row then falls into `unexplained_abnormal` («برای این‌ها توضیحِ آمادهٔ اختصاصی نداریم»), right under a kidney card. This is the most common kidney panel there is (Urea 80 + Cr 2.0, Urea 60 + Cr 1.6, Urea 100 + Cr 3.5).
- **G3, an unowned verdict (N1).** No rule reads a low uric acid. Uric 2.2 (F) and 1.5 (M) produce only `unmatched_abnormal`. The source defines hypouricaemia as < 2.0 mg/dL.
- **G4, unmapped names (N2).** «Urine Protein/Creatinine Ratio», «UPCR» and «Protein Creatinine Ratio» are unmapped, so the row is reported as unrecognised. The source gives PCR thresholds: ≤ 15 mg/mmol (≈ 130 mg/g) is normal, and ≈ 50 mg/mmol is equivalent to ACR 30 mg/mmol.
- **G5, missing context.** `urea_low` for a declared-pregnant patient (urea 12) does not mention pregnancy. The source names physiological hyperfiltration in pregnancy as a cause of low urea.
- **G6, by design.** A 24-hour urine protein outside pregnancy is shown as «شناخته شد، تفسیر نشد» (recognised, not interpreted). That was P87's deliberate decision. The source gives < 150–300 mg/day. Grading it would be a new clinical decision.

**Source items that are numeric conflicts with the engine.** These are recorded and not changed. Each engine value was chosen deliberately, and the source is an unverified summary.

| Item | Source | Engine |
|---|---|---|
| BUN | 6–20 mg/dL | 7–20 (MedlinePlus) |
| Urea/BUN in older adults | > 60 y: BUN 8–23 | ≥ 70 y: AACB (P65). 8–23 was removed earlier because it read mild azotaemia as normal. |
| Urate, adult women | 2.6–6.0 mg/dL | 2.5–6.2 |
| Persistent albuminuria timing | 2 further early-morning urine samples within 2 months, 1–2 weeks apart | text says «۲ از ۳ نمونه طی ۳ تا ۶ ماه» |
| BUN↔urea factor | «BUN × 2.8 = urea mmol/L» | Dimensionally wrong; the correct form is × 0.357. The engine is unaffected because it never converts. |
| pKa of uric acid | 5.75 (p. 362) vs 5.57 (p. 364) | Not used |

**Source rules that need an input no sheet carries.** These are not implemented:

- known AKI (as a diagnosis);
- postrenal obstruction;
- gout treatment target < 6 mg/dL, which needs "on urate-lowering therapy";
- normal urate during an acute gout attack, which needs symptoms;
- persistently acid urine as a stone risk, which needs more than one sample;
- diabetes screening schedule, which needs years since diagnosis;
- rasburicase and IV ascorbate interference;
- freezing the sample at −20 °C;
- the urease interference.

## Clarifications

### Session 2026-11-10

- Q: Which gaps get implemented, and does G4 grade the PCR? → A: All of G1–G5 (user: «همون از جی یک تا جی پنج»). G4 is recognition only, with no grading. The G3 and G5 wording ships with P133, as with the user-delegated decisions in specs/020.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An ACR printed in mg/mmol is never read as normal when KDIGO calls it raised (Priority: P1)

A diabetic patient's sheet prints «ACR 3.2 mg/mmol (< 3.0)». Today the result shows nothing about it. After this feature the patient gets the existing albuminuria finding (A2), with no new wording.

**Why this priority**: this is a live under-read of the earliest kidney-damage marker. It contradicts the lab's own printed range, and it is the case Principle II forbids.

**Independent Test**: run ACR at 2.9, 3.0, 3.2, 3.4, 29.9, 30, 30.1, 33 and 34 mg/mmol, plus the equivalent mg/g values. Read the category and the finding.

**Acceptance Scenarios**:

1. **Given** ACR 3.2 mg/mmol, **When** analysed, **Then** it is A2 and `albuminuria_pattern` fires with its existing text.
2. **Given** ACR 33 mg/mmol, **When** analysed, **Then** it is A3.
3. **Given** ACR 2.9 mg/mmol, or 28 mg/g, **When** analysed, **Then** it is A1, exactly as today.
4. **Given** any ACR printed in mg/g or µg/mg, **When** analysed, **Then** the category is unchanged from today.

---

### User Story 2 - A high urea next to a high creatinine is explained, not labelled «توضیح نداریم» (Priority: P1)

A patient with urea 80 and creatinine 2.0 reads a kidney card about creatinine. Directly below it, today, is «اوره 80 … برای این‌ها توضیحِ آمادهٔ اختصاصی نداریم». After this feature the kidney finding names the urea value itself, and the "unexplained" line no longer lists urea.

**Why this priority**: this is the most common abnormal kidney panel. The current output tells the patient the engine has no view on a number that the card above it is about.

**Independent Test**: run the three panels from G2. Check that `unexplained_abnormal` is absent, or no longer lists urea, and that urgency is unchanged.

**Acceptance Scenarios**:

1. **Given** urea 80 + creatinine 2.0, **When** analysed, **Then** the kidney finding quotes urea 80 with its printed range, and no "unexplained" line mentions urea.
2. **Given** BUN instead of urea, **When** analysed, **Then** the same holds for BUN.
3. **Given** the same panels, **When** compared with today, **Then** overall urgency and `has_critical` are identical.

---

### User Story 3 - A low uric acid has an owner (Priority: P2)

A patient with uric acid 2.2 (F) or 1.5 (M) today gets only the generic «بعضی از نتایج خارج از محدوده طبیعی هستند». After this feature a routine-urgency finding states the value and range in plain words. The wording is recorded in P133.

**Why this priority**: this is an N1 gap. It is less frequent and less dangerous than US1 and US2.

**Independent Test**: run uric acid 2.2 (F), 1.5 (M) and 2.5 (F, on the boundary). Check that `unmatched_abnormal` is gone and urgency is `routine`.

**Acceptance Scenarios**:

1. **Given** uric acid 1.5 (M), **When** analysed, **Then** one finding with `routine` urgency owns it, and `unmatched_abnormal` is absent.
2. **Given** uric acid inside its range, **When** analysed, **Then** no new finding appears.
3. **Given** age < 16, **When** analysed, **Then** the rule follows the same age gate as `hyperuricemia`.

---

### User Story 4 - A protein/creatinine ratio row is recognised (Priority: P2)

A sheet prints «Urine Protein/Creatinine Ratio 60 mg/mmol». Today it is reported as an unrecognised row. After this feature it is recognised. Whether it is graded, or only shown as recognised-not-interpreted, is a clinical decision recorded in P133 (G4).

**Why this priority**: this is an N2 gap. Kidney sheets use PCR in place of ACR.

**Independent Test**: run the three spellings with mg/mmol, mg/g and mg/mg units. None may be unmapped, and none may be shown as «طبیعی» without a verdict.

**Acceptance Scenarios**:

1. **Given** any of the three spellings, **When** analysed, **Then** the row is not in `unmapped`.
2. **Given** a PCR with no approved threshold, **When** analysed, **Then** it is shown as recognised but not interpreted, never as normal.
3. **Given** the unit is missing, **When** analysed, **Then** it is not graded (N3).

---

### User Story 5 - Low urea in a declared pregnancy is put in context (Priority: P3)

A declared-pregnant patient with urea 12 is told about low protein intake and liver disease, but not about pregnancy, which is the most likely reason. After this feature `urea_low` adds one pregnancy sentence when `pregnant === true`. Urgency is unchanged.

**Why this priority**: a missing reassurance. This is not a safety defect.

**Independent Test**: run urea_low with pregnant true, false and unknown. The sentence appears only for true, and urgency stays `routine`.

**Acceptance Scenarios**:

1. **Given** pregnant true and low urea, **When** analysed, **Then** the pregnancy sentence appears.
2. **Given** pregnant false or not declared, **When** analysed, **Then** the text is byte-identical to today.

### Edge Cases

- An ACR row printed in mg/mmol whose printed range is in mg/g, or the reverse. Classify on the value's own unit; never compare across units (N39).
- An ACR with no unit. Today a unitless value is taken as mg/g. That stays as it is, but the probe records it.
- Both urea and BUN on one sheet next to a high creatinine. Both are named, as `isolated_urea_elevation` already does.
- Urea high together with creatinine *emergency*. The kidney card has `blocks_others`, so the added urea mention must stay inside that card and not create a second card.
- A dialysis patient (`kidney_dialysis`). The urea mention follows the dialysis wording or is omitted, and never says «بالاتر از حد».
- Low uric acid together with `sex_unknown_value`. A value low for one sex only must not be called low (N50).
- «Microalbumin» in mg/L stays unmapped on purpose (comment in `adapter.js`). The source gives no mg/L threshold for albumin.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A printed ACR in mg/mmol MUST be classified on KDIGO's mg/mmol cut-offs: A1 < 3, A2 3–30, A3 > 30. The category MUST never be lower than the one its mg/g equivalent gets. This changes no threshold. It applies the classifier's own source (KDIGO 2024) in the unit printed on the sheet.
- **FR-002**: When `kidney` (or `kidney_dialysis`) owns a high creatinine and urea/BUN is also high, the finding MUST name the urea/BUN value and its printed range, and MUST leave that key out of `unexplained_abnormal`. No new threshold and no change to urgency.
- **FR-003**: A low uric acid MUST have exactly one owner finding with `routine` urgency. Its patient wording MUST be recorded in `MEDICAL_RULES.md` P133 in the same commit (N37).
- **FR-004**: The PCR spellings in G4 MUST be recognised. A PCR without an approved threshold MUST be shown as recognised-not-interpreted. It MUST never be graded from a guessed unit, and never be shown as normal.
- **FR-005**: `urea_low` MUST add a pregnancy sentence when, and only when, `pregnant === true`. The wording is recorded in P133.
- **FR-006**: No other rule is added. The before/after rule-id diff MUST show only the id(s) added for FR-003 (N16).
- **FR-007**: `MEDICAL_RULES.md` P133 MUST classify every source item as duplicate (with its owner), conflict (with both values), needs-unavailable-input, or implemented. The six numeric conflicts MUST stay unresolved in code.
- **FR-008**: Urea MUST never be converted to BUN. No value may be read lower than today (Principle II). `metamorphic.test.js` MUST stay green with no new `ALLOWED_DROPS`.
- **FR-009**: Each fix MUST have a regression test that fails on the pre-change tree (N10).

### Key Entities

- **ACR row**: value, printed unit (mg/mmol | mg/g | µg/mg | none), printed range, and KDIGO category (A1/A2/A3).
- **PCR row**: value, printed unit, and printed range. A new recognised key.
- **P133 register entry**: the source item, its classification, the engine owner or conflicting values, and its decision status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Of the 9 ACR boundary panels in US1, 0 are reported as A1 when the mg/mmol value is ≥ 3.0 (today: 2 of them).
- **SC-002**: Across the G2 panels in `snapshots/probe.mjs` (B4, G2a–G2f), «توضیح نداریم» lines that name urea or BUN go from 7 to 0. This includes the hand-offs to glomerulonephritis and rhabdomyolysis, the creatinine emergency, and `kidney` under a potassium blocker. Urgency and `has_critical` are unchanged on every panel.
- **SC-003**: The low-uric-acid panels produce 0 `unmatched_abnormal` findings (today: 2 of 2).
- **SC-004**: All three PCR spellings are recognised (today: 0 of 3).
- **SC-005**: The full backend suite passes on a clean copy of the commit, and the rule-id diff adds only the FR-003 id.
- **SC-006**: The 17 probe panels in `snapshots/probe.mjs` show no change except in G1–G5.

## Assumptions

- The source is Tietz (edition unknown), chapter 21, pp. 360–365. Only the NotebookLM summary was supplied. Every "verbatim" quote is unverified (N46), so no quote reaches the patient as a citation.
- The principles of specs/020 option C apply: mechanical changes (unit-correct classification, coverage, recognition) go into code. New patient wording (FR-003, FR-005) goes into P133. Whether that wording ships before a reviewer approves it is decided in `/speckit-clarify`.
- Package 1 (creatinine, eGFR, cystatin C) was not supplied and is out of scope. So are electrolytes, the full urinalysis, FENa/FEUrea and immunology, which the source itself says are not in this chapter.
- G6, grading 24-hour protein outside pregnancy, stays as P87 decided. It is listed in P133 as a candidate.
