# Feature Specification: Prenatal Serum Screening (Double / Quad Marker)

**Feature Branch**: `013-prenatal-serum-screening`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: implement the clinical content of the reference document «غربالگری سرم مادر در بارداری: دابل مارکر (سه‌ماهه اول) و کوآد مارکر (سه‌ماهه دوم)» as deterministic rules in the clinical rules engine. Source: the document pasted by the user on 2026-10-04 (secondary sources only; the full texts of ACOG PB 226 and ISUOG 2022 were not opened by its author).

## Clarifications

### Session 2026-10-04

- Q: Urgency level for screen-positive patterns? → A: T21-type, NTD-type and NT ≥ 3.0 mm = `this_week`; T18/T13-type and triploid-type = `soon` (24–48 h); isolated-marker findings = `routine`.
- Q: Source of gestational age and dating basis? → A: The sheet only. If it isn't printed, the report says the collection window and dating were not checked; no profile field, no guess.
- Q: How is a bare «hCG» / «AFP» row classified as a screening marker? → A: Only with an explicit signal: a MoM unit, or a screening-only companion row (PAPP-A, uE3, Inhibin A, NT) on the same sheet. Otherwise it keeps today's meaning (pregnancy test / tumour marker) and no screening finding fires. The profile's pregnancy flag is not a signal.
- Q: A sheet with a printed lab risk/category but only some of the arm's markers? → A: One finding quoting the printed risk and category with the screening caveat, no pattern label, and the missing markers named.
- Q: Screening rows on a male, child, or not-pregnant profile? → A: Male or child profile: rows unread, one profile-mismatch sentence. Not-pregnant or unset: interpreted normally, with one note that the profile says not pregnant.
- Q: A screening marker printed as a plain concentration (no MoM, no printed risk)? → A: One sentence naming the marker and value, saying it can only be read as MoM/risk from the lab; no grading, no pattern.

## Current Behaviour (measured facts the spec starts from)

Measured 2026-10-04 on the working tree (branch `013-prenatal-serum-screening`, base `9b2f6c1` + uncommitted changes), pregnant 30-year-old female profile:

| Panel | Engine output today |
|---|---|
| Free β-hCG 1.8 MoM · PAPP-A 0.3 MoM · NT 3.2 mm | all three `unmapped`; no finding |
| Free β-hCG 40 IU/L (or unitless) | `unmapped` (deliberately: adapter comment, M105); no finding |
| AFP · uE3 · hCG · Inhibin A, all MoM | all four `unmapped`; no finding |
| «Risk Trisomy 21 1:250», «Risk Trisomy 18 1:60» | `unmapped`; no finding |
| Nuchal Translucency 3.4 mm | `unmapped`; no finding |
| **Quad in concentrations: AFP 35 IU/mL · Estriol (uE3) 4.1 nmol/L · Total hCG 29000 mIU/mL · Inhibin-A 179 pg/mL** | AFP → `tumor_markers_result`: «نتیجهٔ تومورمارکرهای شما … AFP برای پایشِ گروه‌های پرخطرِ کبد (سیروز، ناقلِ مزمنِ هپاتیت B) … غربالگریِ سرطان»; Total hCG → `hcg_result`: «تستِ بارداریِ خون مثبت است». uE3 and Inhibin A `unmapped`. |

- **The live defect is the last row (N25).** A pregnant woman's quad screen printed in concentrations is read as a cancer tumour-marker panel plus a pregnancy test. She sees cancer and liver-surveillance text about her pregnancy screening. This must be closed by this feature.
- Every MoM row is `unmapped` by design (P47/M105), so a pure screening sheet gets no interpretation at all, only «تفسیر نشدند».
- «Free β-hCG» is **not** mapped to the pregnancy-test key (an earlier draft of this spec said it was; the probe disproved it).
- The engine takes pregnancy only from the user's own profile input, never from the sheet text.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-trimester double marker with MoM values (Priority: P1)

A pregnant patient photographs a first-trimester screening report that prints free β-hCG and PAPP-A as MoM (often with NT and the lab's own risk figure). She should read what each marker means in plain Persian, which direction it points, and the correct next step — and never be told the result is a diagnosis or that she is «healthy».

**Why this priority**: The most common prenatal report in Iran, and today it yields nothing. The N25 collision also makes it a risk of wrong output, not just a gap.

**Independent Test**: Run a panel with free β-hCG, PAPP-A, NT and an ultrasound-based gestational age; verify the finding, the urgency, and that no pregnancy-test/tumour-marker finding fires.

**Acceptance Scenarios**:

1. **Given** free β-hCG 1.8 MoM, PAPP-A 0.3 MoM, NT 3.2 mm, **When** interpreted, **Then** one finding describes the «الگوی شبیه سندرم داون» as a *screening* result, advises genetic counselling and a diagnostic option (CVS / amniocentesis, with microarray) or cell-free DNA per the counsellor, and says it is not a diagnosis.
2. **Given** the lab prints a high-risk category for trisomy 18 or 13, **When** interpreted, **Then** the printed risk is quoted with the `soon` timeline. *(Reconciled during planning: the source gives no number for "both markers very low", so a T18/T13 reading from MoM alone is not executable; P81 question 3.)*
3. **Given** PAPP-A 0.35 MoM alone and everything else unremarkable, **When** interpreted, **Then** the finding says this is not a chromosome result, notes the association with preterm birth, growth restriction, pregnancy hypertension/pre-eclampsia and fetal loss as association (not prediction), and refers to the obstetrician. It names no follow-up protocol and gives no aspirin advice (both ⚠️ in the source; P81 question 6).
4. **Given** only PAPP-A on the sheet (no free β-hCG, no NT), **When** interpreted, **Then** the report names the missing partner measurements and does not call the screening complete or normal.

---

### User Story 2 - Second-trimester quad marker and neural-tube screen (Priority: P1)

A patient with a quad-screen sheet (AFP, uE3, hCG, Inhibin A in MoM) reads which marker pattern her values form and what to do, including the neural-tube-defect arm (AFP ≥ 2.5 MoM) and the very-low-uE3 arm.

**Why this priority**: Same gap as Story 1, and AFP ≥ 2.5 MoM carries a time-sensitive follow-up (dating check, targeted ultrasound).

**Independent Test**: Quad panels for each pattern in the source's table; each fires exactly one pattern finding.

**Acceptance Scenarios**:

1. **Given** AFP low, uE3 low, hCG high, Inhibin A high, **When** interpreted, **Then** the Down-syndrome-type reading comes from the lab's printed T21 risk (quad cut-off 1:270 when no category is printed), with the counselling/diagnostic advice. Without a printed risk, the markers are named with their association sentences and no label is assigned, because the hCG-high cut-off conflicts in the source (> 2 vs > 3 MoM; P81 question 2).
2. **Given** AFP, uE3 and hCG all low with no printed risk, **When** interpreted, **Then** each marker is named with its ✅ association sentence and no trisomy label is assigned. A printed quad T18 risk of 1:100 or higher (or a lab "high" category) gives the `soon` risk finding. *(Reconciled: "hCG low" has no number in the source; P81 question 3.)*
3. **Given** AFP 3.1 MoM and other markers normal, **When** interpreted, **Then** the finding states that most raised AFP values are *not* a neural-tube defect; the first step is confirming gestational age and a targeted ultrasound; common non-defect causes are named.
4. **Given** uE3 ≤ 0.10 MoM, **When** interpreted, **Then** a specific genetics/obstetric referral finding fires (steroid-sulfatase deficiency, SLOS, adrenal causes), separate from the aneuploidy patterns.
5. **Given** a sheet missing one or more quad markers, **When** interpreted, **Then** only the markers actually present are described and the absent ones are named as not measured.

---

### User Story 3 - Gestational-age and input validity (Priority: P2)

The patient is told when a result cannot be trusted as printed: wrong collection window, gestational age not ultrasound-based, or ultrasound/last-period dating differing by more than 10 days.

**Why this priority**: AFP and every MoM are meaningless against the wrong median; a wrong date silently flips the meaning.

**Independent Test**: Panels with gestational age outside 9+0–13+6 (double marker) or 15–22 weeks (quad), and with a dating discrepancy.

**Acceptance Scenarios**:

1. **Given** a quad sheet at 13 weeks, **When** interpreted, **Then** the report says the sample is outside the valid window and the lab must recalculate.
2. **Given** a dating discrepancy > 10 days, **When** interpreted, **Then** the report asks for recalculation with the corrected age before the risk is relied on.

---

### User Story 4 - Confounders and the lab's own risk figure (Priority: P2)

The report states that MoM is already corrected by the lab for weight, ethnicity, smoking, IVF, diabetes and twins, and that the lab's printed risk (e.g. 1:250) and its own cut-off take precedence. The engine never recomputes a risk.

**Why this priority**: Keeps the engine out of the risk-calculation business and stops it re-judging a number the lab already adjusted.

**Independent Test**: Panel with printed risk «1:80» for trisomy 21; the engine quotes it, invents no other cut-off, and ranks urgency only from approved bands.

**Acceptance Scenarios**:

1. **Given** a printed combined-test risk, **When** interpreted, **Then** the sentence quotes the printed risk and the lab's category (if printed), never a recomputed one.
2. **Given** twins, IVF or insulin-dependent diabetes noted by the user profile, **When** interpreted, **Then** one caveat sentence says the lab must have applied the matching correction.

---

### User Story 5 - Nothing here ever reads as normal-and-done (Priority: P1)

Whatever the markers, the screening is never presented as a diagnosis, a low-risk screen is never presented as ruling out disease, and an absent marker is never reported as normal.

**Why this priority**: The architecture's central safety property (N4); a wrong reassurance here has a lifelong consequence.

**Independent Test**: Sweep panels (normal, partial, isolated-abnormal); assert no sentence calls an unmeasured marker «طبیعی» and every screening finding carries the «غربالگری است، نه تشخیص» statement.

**Acceptance Scenarios**:

1. **Given** all markers in range and risk low, **When** interpreted, **Then** the report says the screen is low-risk and that this does not rule out a condition.
2. **Given** NT ≥ 3.0 mm with low-risk markers, **When** interpreted, **Then** NT is still raised as its own finding (counselling, diagnostic offer, detailed anatomy scan, fetal echo).

### Edge Cases

- Free β-hCG (or any screening marker) printed in IU/L, mIU/mL or ng/mL (not MoM) with no printed risk: no pattern is drawn; one sentence names the marker and value and says it can only be read as MoM/risk from the lab; never graded, never mapped to the pregnancy-test key.
- «hCG» on a quad sheet (total hCG, MoM) versus «hCG» on a pregnancy-test sheet: distinguished by the sheet's own evidence (AFP/uE3/Inhibin present, MoM unit), never by the name alone.
- MoM printed with a decimal comma («0,45») and in Persian digits.
- Mixed sheet (integrated/sequential): both sets present; each is read against its own window with no cross-contamination.
- Male or child/neonate profile with these rows: not graded; the rows are named as unread with one profile-mismatch sentence.
- Not-pregnant or unset profile: interpreted normally, plus one note that the profile says not pregnant (the flag may simply be unset).
- A MoM exactly at a source cut-off (2.0, 2.5, 3.0; PAPP-A 0.4): boundary behaviour fixed explicitly.
- Twins: only the source's AFP 2.5 MoM statement is used; no other twin thresholds are invented.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST recognise the screening markers (free β-hCG, PAPP-A, NT, AFP, uE3, total hCG, Inhibin A) from the spellings real Iranian sheets print, and MUST keep them distinct from the pregnancy-test hCG and the tumour-marker AFP. A bare «hCG» or «AFP» is a screening marker only when the row has a MoM unit or the same sheet carries a screening-only companion (PAPP-A, uE3, Inhibin A, NT); the profile's pregnancy flag never decides it. «Free β-hCG», PAPP-A, uE3/estriol and a numeric NT are screening markers by name regardless. **Inhibin A is a weak name** (amended after code review, 2026-10-04): it is also an ovarian/sex-cord tumour marker, so it counts only with another screening signal (a MoM unit or name suffix, a printed T21/T18/T13 risk, a gestational-age row, or one of the strong names). A sheet with a gestational-age row also counts as a screening sheet.
- **FR-002**: A MoM row for these markers MUST be read as MoM (not a concentration) and MUST NOT be graded against any concentration range.
- **FR-003**: The system MUST NOT convert, correct or recompute MoM or risk. Printed MoM and printed risk are the inputs; correction for weight/ethnicity/IVF/smoking/diabetes/twins is the lab's job and is stated as such.
- **FR-004**: For each pattern in the source's tables (T21, T18, T13, Turner-type, diandric and digynic triploidy, NTD, very low uE3), the system MUST fire exactly one finding per sheet per trimester arm; patterns that partition the same input space are decided by one classifier, so two cannot fire together and no two findings give rival instructions.
- **FR-005**: Isolated markers (low PAPP-A, raised AFP, raised hCG, raised Inhibin A, low uE3, low AFP) MUST each map to their own non-chromosomal finding with the outcome associations the source gives, phrased as association, not prediction.
- **FR-006**: NT ≥ 3.0 mm (or at the 99th percentile when the sheet prints it) MUST raise a separate finding independent of the markers' risk category.
- **FR-007**: Every finding MUST state it is a screening result, not a diagnosis, and every follow-up it names MUST come from the source (diagnostic CVS/amniocentesis with microarray, cell-free DNA by counselling, targeted ultrasound, fetal echocardiography, growth and blood-pressure follow-up).
- **FR-008**: The system MUST validate the collection window (double marker 9+0–13+6; quad 15–22 weeks) and the dating basis/discrepancy (> 10 days) from what the sheet prints and nothing else (no profile field, no estimate), and say so when invalid, never silently reinterpret. When the sheet prints no gestational age or dating basis, the report states that the window and dating were not checked; the pattern findings still fire but carry that caveat.
- **FR-009a**: A sheet that prints the lab's own risk and/or category but only some of the arm's markers MUST still produce one finding quoting that printed risk and category with the screening caveat; it MUST NOT assign a pattern label (the label needs the markers) and MUST name the missing markers.
- **FR-009**: A missing partner marker, missing gestational age or missing printed risk MUST produce an explicit «اندازه‌گیری/چاپ نشده» sentence; a missing item MUST never be described as normal (N4).
- **FR-010**: Numeric thresholds the source marks ⚠️ (unverified / lab-dependent) MUST NOT become executable. Until a human reviewer approves them they are named without a verdict: the 0.5–2.0 MoM "normal band" for single markers; hCG/inhibin/uE3 cut-offs other than those the source marks ✅; the T18/T13 combined-test risk cut-off; approximate affected-fetus MoM medians; PAPP-A < 0.4 as an action trigger; any aspirin advice.
- **FR-011**: Risk-band urgency MUST come from the lab's printed category or from the source's ✅ bands only (FMF: > 1:100 high, 1:100–1:1000 intermediate, < 1:1000 low; quad T21 < 1:270, T18 < 1:100, NTD AFP < 2.5 MoM). Where the sheet prints a different lab cut-off, the lab's prevails and is quoted.
- **FR-012**: No screening finding MAY be an "emergency". Urgency is fixed: T21-type, NTD-type and NT ≥ 3.0 mm = `this_week`; T18/T13-type and triploid-type = `soon` (24–48 h); isolated-marker findings = `routine`. The `soon` tier for T18/T13/triploid has no timeline in the source document, so it is an owner decision and is entered in the pending register (FR-016) for reviewer confirmation. Timelines in text stay within the source's windows (CVS 10–13 weeks, amniocentesis from 15 weeks), with one final instruction per report; each finding's action sentence is derived from its urgency, never written beside it (N20).
- **FR-013**: All patient-facing text MUST be Persian, use Persian names for every marker (never raw engine keys), and every suggested test MUST be registered so it is not re-requested when already on the sheet.
- **FR-014**: When a pregnancy-test hCG finding and a screening finding could both read the same value, exactly one MUST own it; unread rows of these markers MUST be named, never dropped.
- **FR-015**: Every executable rule MUST have a regression test that fails against the pre-change engine, plus a sweep asserting every new rule id was reached by at least one panel.
- **FR-016**: Each decision the source leaves open MUST be entered in the clinical decision register as a numbered pending item with the proposal, reasoning, and patient impact either way; none is approved by this feature.

### Key Entities

- **Screening panel**: one trimester arm's markers with MoM, printed risk and category, gestational age, dating basis and collection window.
- **Marker pattern label**: the single classifier output per arm (T21-type, T18-type, triploid-type, NTD-type, none).
- **Isolated-marker finding**: a non-chromosomal outcome-association finding for one marker.
- **Pending decision item**: a register entry for a ⚠️ threshold, with proposal and patient impact.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On at least 12 realistic double-marker and 12 quad-marker panels (one per source pattern, plus normal, partial and window-invalid), 100 % produce a finding naming every present marker, and 0 % describe an unmeasured marker as normal.
- **SC-002**: 0 sweep sheets produce a pregnancy-test or tumour-marker finding from a screening-marker row, and 0 produce two findings with different instructions for the same marker.
- **SC-003**: 100 % of screening findings contain the "screening, not diagnosis" statement, and none contains a raw marker key or an English clinical sentence.
- **SC-004**: 0 findings carry `emergency` urgency or use a ⚠️ threshold as an executable trigger; every such threshold appears in the pending register.
- **SC-005**: Every new regression test is shown failing against the engine as it stood before this feature, and no previously passing test newly fails except those deliberately re-baselined with a written reason.
- **SC-006**: A reviewer can trace each patient-facing sentence to a line of the source document or a register item.

## Assumptions

- Input comes from OCR or manual rows; weight, ethnicity, smoking and IVF reach the engine only through the user profile where it exists, and risk is never recomputed.
- Pregnancy is known only from the user's profile; screening rows on a non-pregnant or male profile are flagged as inconsistent.
- The lab's printed risk and category take precedence over any engine-side band.
- Association statements are limited to what the source marks ✅; ⚠️ content is excluded until approved.
- Out of scope: cell-free DNA result interpretation, risk recalculation, pre-eclampsia aspirin advice, twin thresholds beyond the source, interpretation of karyotype/CMA results, a manual-entry form for these markers.
- Dependencies: the clinical decision register, the closed-set qualitative reader conventions, and the adapter's layer ordering (a new report kind shares vocabulary with existing ones, so N25 row-identity applies).
- The three material open choices (single-marker MoM bands, T18/T13 cut-offs, PAPP-A action threshold) are handled by FR-010 as pending-register items, so no clarification question blocks planning.
