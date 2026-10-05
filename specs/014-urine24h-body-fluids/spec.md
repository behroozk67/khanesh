# Feature Specification: 24-Hour Urine and Body-Fluid Chemistry

**Feature Branch**: `014-urine24h-body-fluids` (spec directory; work continues on branch `recovery`)

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: implement the clinical rules for 24-hour urine and body fluids in the rules engine, following the attached document `RULES_urine24h_body_fluids.md`. The document covers: Section 0, data prerequisites D1–D6; Section 1, 24-hour urine (collection-completeness gate U24-C, volume U24-V, protein U24-P, creatinine clearance U24-K, urea U24-U, calcium U24-CA, uric acid U24-UA); Section 2, body fluids (F0, pleural FL-P, ascites FL-A, CSF FL-C, synovial FL-S, pericardial FL-K, other FL-X); Section 3, the test cases for requests 27 and 28; Section 4, open decisions. The document's status is "draft, needs clinical approval". Its general rule is that until a section is approved, its tests are only *recognised*: they stay unscored and have no effect on urgency, so that N1 does not repeat. Context: 24-hour urine and body-fluid rows in the hospital LIS export (lis1005) are still unmapped, because nothing reads them.

## Current Behaviour (measured facts the spec starts from)

Measured 2026-10-05 on the working tree (branch `recovery`, `HEAD` `8e0d769` + uncommitted changes), calling `runEngine` + `runPatterns` directly:

| Panel | Engine output today |
|---|---|
| **Request 27** (F 25): `Urine Volume/24h 1700 · Urine Prot/24h 153 · Urine Cr/24h 700` | all three `unmapped`; no finding; `overall_urgency: none` |
| Same values, spelled `24h Urine Volume / Protein / Creatinine`, plus `Urine Urea/24h` | all `unmapped`; no finding |
| **Request 28** (F 46): `Fluid Type 4 · Fluid Glucose 122 · Fluid Protein 5.5 · Fluid LDH 306` + serum `Total Protein 6.6 · LDH 367` | the four fluid rows `unmapped`; serum LDH → `isolated_ldh_elevation`; serum TP → `unit_unknown_values` |
| `Urine Ca/24h 320 · Urine Uric Acid/24h 900` (M 40) | both `unmapped`, even though a `U_CA` key with the range 100–300 mg/24h already exists (it only matches spellings like `24h urine calcium`) |
| `CSF Glucose 30 · CSF Protein 150` + `FBS 100` | CSF rows `unmapped`; a CSF glucose of 30, which is a bacterial-meningitis pattern, produces no sentence |
| Single rows `Pleural LDH`, `Ascitic Glucose`, `Body Fluid LDH`, `Glucose (CSF)`, `Total Protein (Fluid)`, `Creatinine 24h`, `Uric Acid 24h` | all `unmapped`. **None collides with a serum key today.** |
| `Urine Protein 100` | goes to the **urine dipstick** channel (`qual`). A 24-hour protein printed under that bare name would be read as a dipstick row (N25). |

- No fluid row is read as serum today. That safety is accidental: it depends on `NAME_MAP` happening not to contain these spellings. Adding a spelling such as `fluidldh` or `ldhfluid` to the wrong place would put a pleural LDH of 306 on the serum LDH key.
- A sheet with only these rows is uninterpreted. Since P78 the patient gets `buildUninterpretedResult()`, «تفسیر نشد». That is honest, but it says nothing about the numbers.
- The source document is a **draft**. ✅ items were read directly from a source by its author. 📘 items were not re-opened. No section has passed a human clinical review.

## Clarifications

### Session 2026-10-05

- Q: Which sections of the document become executable in this feature? → A: **Stage A only.** Every 24-hour and body-fluid row is recognised and named, with no verdict and no effect on urgency. Every interpretive rule (U24-C/V/P/K/U/CA/UA, FL-P/A/C/S/K/X) is registered in `MEDICAL_RULES.md` as P87, pending clinical review, and is not executed. User Stories 2–4 are kept below as the acceptance contract for that later stage only.
- Q: Where does the patient see the recognised-but-uninterpreted rows? → A: On the existing «تفسیر نشدند» / `ocr_warnings` line, with separate wording: «شناخته شد: ادرار ۲۴ساعته/مایع بدن — موتور هنوز تفسیرشان نمی‌کند», plus each row's value and unit. No finding is created, so urgency and `has_critical` are untouched.
- Q: Does Stage A print fluid-to-serum ratios (e.g. 5.5 ÷ 6.6 = 0.83) as numbers with no verdict? → A: No. Stage A shows printed values only. Ratios, gradients, creatinine clearance and every other derived number arrive with the approved rules in P87.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 24-hour urine and body-fluid rows are recognised, named and shown (Priority: P1)

A patient (or a clinician reading an LIS export) uploads a sheet with 24-hour urine rows (volume, protein, creatinine, urea, calcium, uric acid) or body-fluid rows (glucose, protein, LDH, with or without a fluid type). Each row is named in Persian with its value and unit, and the report says plainly that these rows were recognised but not interpreted. The rows are not dropped, not sent to «تفسیر نشدند» as unknown names, and not mistaken for serum or dipstick values.

**Why this priority**: This is the document's own general rule, and it is safe without clinical approval. It closes the N2/N28 silent drop and removes the N25 collision risk before any threshold exists.

**Independent Test**: Run requests 27 and 28 and the single-row spellings above. Every row resolves to its own specimen-specific key. No finding changes urgency. No serum or dipstick key receives a fluid or 24-hour value.

**Acceptance Scenarios**:

1. **Given** request 27, **When** interpreted, **Then** the volume, protein and creatinine rows are each named with their printed value on the «تفسیر نشدند» line, under the «شناخته شد: ادرار ۲۴ساعته» wording. No finding is added, and `overall_urgency` stays `none`.
2. **Given** request 28, **When** interpreted, **Then** the three fluid rows are named as body-fluid values. The fluid type is reported as printed («نوع مایع: ۴») with a statement that the code is not known. No sentence calls the fluid an exudate or transudate. Serum LDH and serum TP behave exactly as they do today.
3. **Given** `Pleural LDH 306` and serum `LDH 367` on one sheet, **When** interpreted, **Then** serum LDH is graded from 367 only, and 306 never appears as the serum LDH value.
4. **Given** `Urine Prot/24h 153` with no `mg/24h` unit, **When** interpreted, **Then** it is not read as a dipstick protein and does not fire any urinalysis finding.
5. **Given** a sheet whose only rows are 24-hour urine or fluid rows, **When** interpreted, **Then** the response names those rows rather than returning the generic «تفسیر نشد» with no numbers, and it never says «طبیعی».

---

### User Story 2 - Collection-completeness gate for 24-hour urine (Priority: P2) — *deferred to P87*

A patient with a 24-hour urine sheet reads whether the collection looks complete, judged against the expected creatinine excretion for their age and sex (U24-C). They are never told "no proteinuria" or "normal calcium" from a collection that looks incomplete.

**Why this priority**: Every other 24-hour rule depends on this gate. On its own it only ever adds a caution and never raises urgency, which makes it the lowest-risk interpretive step.

**Independent Test**: Run request 27 (creatinine 700 mg/24h, woman aged 25: inside 600–1600, so complete) and variants at 400 (low, so possibly incomplete) and 2000 (high, so possibly over-collected or a volume error).

**Acceptance Scenarios**:

1. **Given** a woman aged 25 with urine creatinine 700 mg/24h, **When** interpreted, **Then** the collection is described as consistent with complete.
2. **Given** a woman aged 25 with urine creatinine 400 mg/24h and protein 120, **When** interpreted, **Then** the report says the collection may be incomplete and recommends repeating it. It does not say protein is normal. Urgency is `routine`.
3. **Given** a child aged 8 with creatinine 400 mg/24h, **When** interpreted, **Then** the child band (200–700) is used, never the adult band.
4. **Given** no urine creatinine on the sheet, **When** interpreted, **Then** the report says completeness could not be checked. It does not assume the collection was complete.

---

### User Story 3 - 24-hour urine interpretation (Priority: P3) — *deferred to P87*

Volume (U24-V), protein (U24-P, with adult, pregnancy and paediatric arms), creatinine clearance (U24-K), calcium (U24-CA), uric acid (U24-UA) and urea (U24-U, report only) are interpreted behind the gate, with the urgencies the document proposes.

**Why this priority**: These rules carry new thresholds and urgencies. They need the clinical approval that the document itself requires.

**Independent Test**: The test cases in Section 3 of the document, plus one panel per threshold edge.

**Acceptance Scenarios**:

1. **Given** request 27 (post-partum ward, protein 153, collection complete), **When** interpreted, **Then** the report says the value is below the ACOG pre-eclampsia proteinuria criterion (300 mg/24h). Urgency is `routine`. Pre-eclampsia is never diagnosed.
2. **Given** an adult with protein 4000 mg/24h and a complete collection, **When** interpreted, **Then** the report states «محدودهٔ نفروتیک» with `soon`.
3. **Given** a patient under 18 with no weight or height, **When** protein is interpreted, **Then** it is not normalised and not graded, and the adult 150 mg/24h threshold is never applied.
4. **Given** urea printed as urea (not UUN), **When** interpreted, **Then** it is reported only, never graded, and never drives urgency.

---

### User Story 4 - Body-fluid interpretation by fluid type (Priority: P4) — *deferred to P87*

When the fluid type is known, the matching rule set runs: Light's criteria and parapneumonic signs for pleural fluid, Runyon's biochemical criteria for ascites, glucose and protein patterns for CSF, and the serum–fluid glucose gap for synovial fluid. Pericardial and other fluids stay unscored.

**Why this priority**: None of this can run until the fluid type is known (D1). The LIS prints only a numeric code whose table is not available. CSF FL-C1 proposes an `emergency` urgency, the first new emergency in this feature, and it needs approval.

**Independent Test**: Request 28 under each hypothesis in Section 3 of the document (code = pleural, code = ascites, code unknown), plus a CSF panel with glucose 30.

**Acceptance Scenarios**:

1. **Given** request 28 with the fluid type unknown, **When** interpreted, **Then** no exudate/transudate statement is made (F0).
2. **Given** request 28 with the fluid known to be pleural, **When** interpreted, **Then** the fluid/serum protein ratio (0.83) and LDH ratio (0.83) are both reported. The fluid is described as an exudate. FL-P2 does not fire, because glucose is 122 and LDH is below 1000.
3. **Given** CSF glucose 30 mg/dL in an adult, **When** interpreted, **Then** the report states a pattern consistent with bacterial (or TB/fungal) meningitis, at the urgency approved for FL-C1.
4. **Given** a fluid ratio rule with no same-visit serum value, **When** interpreted, **Then** the ratio is not computed, and the report says which serum value is missing.

---

### Edge Cases

- A 24-hour row printed as `Urine Protein` or `Urine Creatinine`, without "24h" in the name: identity is decided by a 24-hour unit (`/24h`, `mg/24h`, `g/24h`) or a 24-hour companion row (24-hour volume) on the same sheet. Without either, the row keeps its current meaning (dipstick / spot urine). Same shape as N25 and the prenatal rule in specs/013.
- A fluid row whose type is in its name (`Pleural LDH`, `CSF Glucose`, `Ascitic Protein`): the name supplies the fluid type, and the rule set for that type may run without the Fluid Type code.
- Two fluid rows with conflicting types on one sheet (e.g. `Pleural Protein` and `CSF Glucose`): each is read under its own type. A ratio is never computed across fluids.
- A unitless 24-hour value where the unit decides the meaning (urine creatinine 7 could be g/24h or mmol/24h; urea could be urea or UUN): it is not graded and goes to «تفسیر نشدند» with the reason (P48/N3).
- Fluid Type printed as a word (`Pleural`, `Ascites`, `CSF`, `Synovial`) rather than a code: the word is read. A numeric code stays unknown until the D1 table is supplied.
- A serum value exists, but from another visit or more than 24 hours apart: an LIS sheet carries one request, so serum values on the same sheet count as same-visit. Values merged from separate uploads do not.
- Collection duration printed and not 24 hours: no "per 24 h" interpretation, and the duration is named.
- Neonate or child: paediatric bands only (creatinine excretion, protein per m², CSF protein by age). Where the document has no paediatric band (uric acid under 18, CSF protein under 1 year until decided), the value is unscored.
- `U_CA` already exists and is read by `patterns_mineral_bone.js` (the FHH branch). Widening its spellings must not change the output of any existing mineral-axis panel.

## Requirements *(mandatory)*

### Functional Requirements

**Recognition (Stage A — no clinical judgement)**

- **FR-001**: The engine MUST give each 24-hour urine analyte (volume, protein, creatinine, urea, calcium, uric acid) and each body-fluid analyte (glucose, protein, LDH, fluid type) its own specimen-specific identity, separate from the serum, spot-urine and dipstick identities of the same analyte.
- **FR-002**: The engine MUST recognise the spellings seen in the LIS export (`Urine Cr/24h`, `Urine Prot/24h`, `Urine Urea/24h`, `Urine Volume/24h`, `Fluid Type`, `Fluid Glucose`, `Fluid Protein`, `Fluid LDH`), common English variants (`24h Urine …`, `… 24 hr`, `Pleural/Ascitic/Peritoneal/CSF/Synovial/Pericardial …`, `… (Fluid)`, `Body Fluid …`) and Persian equivalents. Each new spelling MUST be checked so that it does not resolve, through any alias rule, to a serum key.
- **FR-003**: A recognised but uninterpreted row MUST be named in Persian with its printed value and unit (the Persian name, never the raw key, N8). It MUST appear on the existing «تفسیر نشدند» / `ocr_warnings` line, grouped under its own wording («شناخته شد: ادرار ۲۴ساعته» / «شناخته شد: مایع بدن (نوع: …)» — «موتور هنوز تفسیرشان نمی‌کند»). That wording MUST be distinct from the wording for unknown names. No finding is created for these rows. No derived number (fluid/serum ratio, serum–fluid gradient, creatinine clearance, UUN, mg/kg excretion) MAY be computed or shown in Stage A. Only printed values are shown (N5). They MUST NOT be described as normal or abnormal.
- **FR-004**: Recognition MUST NOT change `overall_urgency`, `has_critical`, or any existing finding on any panel that does not contain these rows. Existing panels MUST be byte-identical before and after.
- **FR-005**: A fluid value MUST NEVER be graded on, or substitute for, the serum key of the same analyte. A 24-hour value MUST NEVER enter the dipstick channel.
- **FR-006**: The fluid type MUST be taken from a fluid-type word in the row name or in the Fluid Type value. A numeric code MUST be reported as unknown until a code table is supplied (D1). No fluid interpretation MAY run with an unknown type (F0).
- **FR-007**: A unitless value whose unit changes its meaning (24-hour creatinine, 24-hour urea vs UUN, 24-hour calcium, 24-hour uric acid) MUST NOT be graded. It MUST be named with the reason.
- **FR-008**: A sheet whose only rows are 24-hour urine or body-fluid rows MUST name those rows instead of returning a response with no numbers. It MUST NOT be routed to the model-judged path.

**Interpretation (Stage B onward — deferred; NOT implemented in this feature, recorded for P87)**

- **FR-009**: The collection-completeness gate (U24-C1–C3) MUST run before any other 24-hour rule. If the collection is possibly incomplete or not checkable, no downstream rule MAY state that a value is normal or that a condition is absent.
- **FR-010**: Every 24-hour and fluid rule MUST use age- and sex-specific bands where the document gives them, and MUST NOT apply an adult threshold to a patient under 18.
- **FR-011**: Every rule that names a cause MUST state the three-way status of each discriminating value on the sheet: supporting, arguing against, or not measured (N21). Every ratio MUST name a missing serum partner rather than staying silent.
- **FR-012**: Pregnancy-arm and TLS-arm statements MUST say that the criterion is met. They MUST NOT diagnose pre-eclampsia or tumour lysis syndrome, because the engine has no blood pressure and no clinical context.
- **FR-013**: Every threshold, urgency and source citation in the document MUST be registered in `MEDICAL_RULES.md` as P87, with each section listed as «در انتظار بازبینی» and 📘-sourced numbers marked as not yet verified against the original source. **No interpretive rule (FR-009–FR-012, FR-014) MAY be executed in this feature.** P87 MUST also list the open decisions from Section 4 of the document (D1 code table, D2 units, weight/height, the same-visit definition, infant CSF protein, urgency levels, the calcium/uric-acid column names, the hypercalciuria threshold, and 📘 verification).
- **FR-014**: Any rule that reads `U_CA` MUST keep the current `patterns_mineral_bone.js` output on every existing mineral-axis panel. A new U24-CA finding MUST hand off to the mineral axis whenever that axis fires, and MUST NOT duplicate it (N20).

### Key Entities

- **24-hour urine analyte**: volume, protein, creatinine, urea (as urea or UUN), calcium, uric acid. Each has a value, a printed unit, and a collection duration (assumed 24 h unless printed otherwise).
- **Body-fluid analyte**: glucose, protein, LDH. Each belongs to one fluid type.
- **Fluid type**: pleural, ascites/peritoneal, CSF, synovial, pericardial, other, or unknown. Comes from the row name, a type word, or a code with a lookup table that is not yet supplied.
- **Same-visit serum partner**: serum total protein, LDH (with the lab's ULN), glucose, albumin and creatinine on the same sheet. Used for ratios and gradients only from Stage B (P87). Stage A computes none.
- **Collection-completeness verdict**: complete, possibly incomplete, possibly over-collected, or not checkable. Gates every other 24-hour finding.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For requests 27 and 28 and the 16 spellings measured above, 100% of 24-hour and fluid rows leave «unmapped». Each is named in the report with its value.
- **SC-002**: Zero fluid or 24-hour values reach a serum or dipstick key, across every spelling in FR-002 plus every alias rule that could apply.
- **SC-003**: Every existing test panel produces byte-identical output after recognition is added. The full backend suite stays green, measured on the tree after the change.
- **SC-004**: No sheet containing only 24-hour or fluid rows claims normality («طبیعی است», «نرمال») or gives a verdict on an uninterpreted row. The existing P78 negation «این به معنای «طبیعی» بودن نتایج نیست» is allowed.
- **SC-005**: The recognition guards (identity, no serum or dipstick collision, named in report, no urgency change) failed on the pre-change tree and pass after the change. P87 lists every threshold in the document with its source tag (✅/📘) and its pending status.
- **SC-006**: This feature adds no finding (`findings` and `overall_urgency` are identical with and without the new rows on every tested panel), and no text it adds contains «طبیعی», «بالا» or «پایین» about a 24-hour or fluid row.

## Assumptions

- The LIS export has no unit column (as with lis1005). Units are therefore unknown unless the row name or value carries them. Stage A does not grade anyway, but it still shows whatever unit is printed.
- Rows on one LIS sheet belong to one request, so serum values on the same sheet count as same-visit (D4). Values merged from separate photo uploads do not.
- Weight and height are not available from the sheet or the profile (D3). The weight-based arms (U24-C1, U24-P3 with BSA, U24-CA2) therefore always run in their "no weight" branch.
- Pregnancy comes only from the user's profile, as in the rest of the engine. The LIS "requesting ward" (obstetrics, LDR) is not available to the engine, and is not inferred.
- The Fluid Type code table (D1) will not be available during this feature. Body-fluid interpretation is therefore reachable only through type words in row names or values.
- The existing `U_CA` key and its 100–300 mg/24h range are reused, not duplicated.
- The frontend needs no change: recognised rows reach the patient through the existing finding/warning surfaces.
