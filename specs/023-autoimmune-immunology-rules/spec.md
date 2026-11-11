# Feature Specification: Autoimmune Disease Rules (user's Google Drive guide)

**Feature Branch**: `023-autoimmune-immunology-rules` (spec directory only; no git branch)

**Created**: 2026-11-11

**Status**: Draft

**Input**: «میخواهم براساس داده ها فایل گوگل درایو برای بخش بیماری خود ایمن قواعد کامل کنی». The Google Doc is «راهنمای جامع و مرجع بالینی آزمایش‌های تشخیصی بیماری‌های سیستم ایمنی», exported as plain text to [source-gdoc.txt](source-gdoc.txt) (280 lines, 108 KB). It has eight parts:

1. SLE (EULAR/ACR 2019);
2. ARF/RHD (AHA 2015 Jones) and RA (ACR/EULAR 2010);
3. APS (ACR/EULAR 2023), Sjögren, SSc, ANCA vasculitis;
4. celiac disease (ACG 2023 / ESPGHAN / AGA);
5. autoimmune liver disease (EASL / AASLD / IAIHG);
6. autoimmune thyroid disease, myasthenia gravis, multiple sclerosis;
7. inborn errors of immunity (ESID / AAAAI / IUIS);
8. works cited.

The workflow follows specs/021–022: probe the engine first, add no rule for duplicates, and implement only the gaps the probe shows.

## Current Behaviour

This was measured on `HEAD` (b0cae21), which matches the working tree because `khanesh-server/` is clean. Three probe scripts under [snapshots/](snapshots/) feed rows through `runEngine` + `runPatterns`:

- `probe_rows.mjs` sends 57 single rows for a woman aged 35.
- `probe_panels.mjs` sends combined panels.
- `probe_edges.mjs` covers printed-range, spelling and method edges.

The output is in [snapshots/before.txt](snapshots/before.txt).

**Source premise.**
- The guide is a secondary summary. Its "Works cited" URLs were not opened, so under N39/N46 nothing from it is cited in `sources:` or `guidelines.js`.
- Every number taken from it is a reviewer question under **P136** (the number is free in `MEDICAL_RULES.md`; checked with grep).
- Several of the guide's own table cells are corrupted. This is true in both the txt and the HTML export: the two ASO protocols, the IgG1–IgG4 age bands, and the IgA-aCL APL bands. **No number is taken from a corrupted cell.**
- The P77 decision stands: antibody cut-offs depend on the kit, so verdicts come from **the range printed on the sheet**. Fixed numbers are used only where a guideline states them in units of the printed ULN (Anti-CCP 3×ULN, tTG 10×ULN) or as fixed criteria units (APS 40/80).

**Already in the engine. These are duplicates and get no new rule:**

| Guide item | Existing owner |
|---|---|
| ANA ≥ 1:80 is the lupus entry criterion; < 1:80 is negative; an ANA ELISA verdict comes from the printed range | `ana_family_result` (P76/P77) |
| anti-dsDNA / Sm worth 6 points, assay needs ≥ 90 % specificity | `ana_family_result` |
| U1-RNP high titre points to MCTD; Ro/La in Sjögren; Ro/La in pregnancy (congenital heart block) | `ana_family_result` (Sjögren + pregnancy branches) |
| C3 or C4 low (3 points), both low (4 points) | `complement_result` |
| Anti-CCP > 3×ULN is strong positive (2010 criteria) | `anti_ccp_result` |
| RF positive is not RA on its own; Anti-CCP is more specific | `rf_positive` |
| aPL must be repeated ≥ 12 weeks apart; LA, aCL IgG/IgM, β2GPI IgG/IgM | `antiphospholipid_result` |
| Scl-70 / centromere / RNA pol III in SSc 2013 | `ssc_antibody_result` |
| Jo-1 and antisynthetase syndrome | `myositis_antibody_result` |
| PR3 / MPO / c-ANCA / p-ANCA | `anca_result` |
| ASO with an age-dependent upper limit | `aso_result` |
| Anti-Tg, TRAb/TSI quoted against the printed range | `thyroid` |
| HLA-B27 | `hla_b27_result` |
| ESR / CRP | `esr_elevated`, `crp_elevated`, `crp_pos_esr_normal` |
| Leukopenia, thrombocytopenia, haemolysis + DAT, proteinuria | `leukopenia`, `thrombocytopenia`, `hemolysis_pattern`, `spherocytes_dat`, `proteinuria_pattern` |

**Gaps found by the probe.** Each is reproduced in `before.txt`.

- **G1, wrong verdict against the lab's own range (N3/N23).** These keys are graded against an engine range even though the sheet prints a different one.
  - **Anti-TPO 20 IU/mL, sheet `<30`:** graded against the engine's `0–9` and told «آنتی‌بادی TPO بالاست». The lab calls it negative.
  - **RF 18 IU/mL, sheet `<15`:** graded against `0–20` and called normal, with no finding at all. The lab calls it positive.
  - The `thyroid` Anti-TPO text also quotes no number (N5).
- **G2, spelling and method suffixes go unmapped (N2).** Each of these lands in «تفسیر نشدند» with no finding:
  - `ANA (IIF)` with `1:160`;
  - `FANA`;
  - `Anti-dsDNA (CLIFT)` with `1:20`;
  - `Anti-Centromere B` (plain `Anti-Centromere` maps);
  - `Anti-Histone`;
  - `Anticardiolipin IgA`;
  - `Anti-DNase B`;
  - `CH50`.
- **G3, celiac serology is entirely unknown (N2).** None of these is mapped: `Anti-tTG IgA`, `tTG IgA`, `Anti Tissue Transglutaminase IgA`, `Anti-tTG IgG`, `DGP IgG`, `EMA IgA`, `Total IgA`. Total IgA is the partner that decides whether a negative tTG-IgA can be believed.
- **G4, autoimmune liver serology is unknown (N2).** `ASMA`, `Anti-LKM1`, `Anti-SLA/LP`, `AMA`, `AMA-M2` are not mapped. P77 already listed AMA as «باز».
- **G5, myasthenia serology is unknown (N2).** `AChR binding Ab` and `Anti-MuSK` are not mapped.
- **G6, APS titre level is not stated.** aCL IgG 30 GPL (against `<20`) and 85 GPL get the same text. Under the 2023 criteria only ≥ 40 counts (40–79 moderate, ≥ 80 high), and isolated aCL-IgA is not a criteria antibody.
- **G7, serum immunoglobulins are not mapped (N2).** IgG, IgA, IgM and IgE are unmapped. Celiac (Total IgA) and autoimmune hepatitis (IgG > ULN) both read them as partners.

## Clarifications

### Session 2026-11-11

- Scope was decided from the request («بخش بیماری خود ایمن»), not asked. Standing preference: no questions. See Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The verdict agrees with the lab's own printed range for thyroid and rheumatoid antibodies (Priority: P1)

A patient's sheet prints Anti-TPO 20 IU/mL with «<30», or RF 18 IU/mL with «<15». Today the patient is told the opposite of what the lab printed. In the first case that is a false alarm about thyroid autoimmunity. In the second, a positive RF is silently called normal.

**Why this priority**: This is wrong output on keys that already exist and are common on Iranian sheets. Everything else in this spec adds coverage; this story removes a contradiction.

**Independent Test**: Run the two rows (and the same values with no printed range) through the engine. The verdict, the sentence and the score must follow the printed range when one is printed.

**Acceptance Scenarios**:

1. **Given** Anti-TPO 20 IU/mL with printed `<30`, **When** analysed, **Then** it is not called high, and the text quotes 20 and the printed range.
2. **Given** Anti-TPO 250 IU/mL with printed `<30`, **When** analysed, **Then** it is called above the printed range, quoting 250 and `<30`, with the same urgency as today (`routine`).
3. **Given** RF 18 IU/mL with printed `<15`, **When** analysed, **Then** it is called above the printed range and `rf_positive` (or its successor) speaks, quoting 18.
4. **Given** RF 12 with printed `<15`, or Anti-TPO 8 with printed `<9`, **When** analysed, **Then** neither is called abnormal.
5. **Given** Anti-TPO or RF with **no** printed range, **When** analysed, **Then** the behaviour is unchanged from today, or any change is listed in the decision record.

---

### User Story 2 - Celiac serology is read, including the IgA-deficiency trap (Priority: P1)

A parent uploads a child's celiac panel (tTG-IgA, Total IgA, maybe EMA or DGP-IgG). Today every row is «تفسیر نشد». The patient needs four things:
- whether tTG-IgA is above the printed limit, and by how many multiples of it;
- that a **negative** tTG-IgA next to a **low Total IgA** cannot rule celiac out;
- that the result must be read while still eating gluten;
- that a very high tTG (≥ 10×ULN), together with EMA, is what specialists use for the no-biopsy route in children. The engine must not declare the diagnosis.

**Why this priority**: Celiac panels are common, especially for children, and today they get nothing. The IgA-deficiency false negative is the one place where a "normal" number is actively misleading.

**Independent Test**: Run the celiac panels listed below for a child of 6 and an adult of 35. Every row ends in a finding that quotes its number. None lands in «تفسیر نشدند» or «توضیح نداریم».

**Acceptance Scenarios**:

1. **Given** tTG-IgA 150 U/mL with printed `<10`, **When** analysed, **Then** the text quotes 150, says it is above the printed limit and about 15× it, and mentions EMA confirmation and the gastroenterologist. It does not say "you have celiac disease".
2. **Given** tTG-IgA 2 U/mL (`<10`) and Total IgA 5 mg/dL (below its printed range), **When** analysed, **Then** the text says the negative tTG-IgA cannot be relied on because IgA is low, and names an IgG-based test (DGP-IgG or tTG-IgG) to ask about.
3. **Given** tTG-IgA 2 U/mL (`<10`) with a normal Total IgA, **When** analysed, **Then** the result is negative, with the "only valid while eating gluten" caveat and no alarm.
4. **Given** tTG-IgA 2 U/mL with **no** Total IgA on the sheet, **When** analysed, **Then** the text says Total IgA was not measured and is needed to trust a negative result. It does not say IgA is normal (N4).
5. **Given** tTG-IgA 7 U/mL with printed «<4 negative, 4–10 weak positive», **When** analysed, **Then** it is reported as borderline (weak positive), not negative and not strongly positive.
6. **Given** EMA-IgA «Positive» or DGP-IgG above its printed range, **When** analysed, **Then** each gets a finding that quotes its value.
7. **Given** tTG-IgG positive with a normal Total IgA, **When** analysed, **Then** the text notes that tTG-IgG alone has little diagnostic value when IgA is normal.

---

### User Story 3 - Autoimmune liver and myasthenia serology are read (Priority: P2)

A patient with raised liver enzymes brings ASMA, AMA, Anti-LKM1 or Anti-SLA/LP. A patient with drooping eyelids brings AChR-binding antibody or Anti-MuSK. Today all of these are unmapped.

**Why this priority**: These are less common on Iranian sheets than celiac or rheumatology panels. They are specialist-ordered, and the patient is usually already under care.

**Independent Test**: Run each analyte positive and negative, as a titre and as a number. Each ends in a finding that quotes the value. A positive result names the right specialist without naming a diagnosis.

**Acceptance Scenarios**:

1. **Given** ASMA 1:80 (or Anti-LKM1 1:80, or Anti-SLA/LP «Positive»), **When** analysed, **Then** the text says this is an autoimmune-hepatitis-associated antibody and that the diagnosis needs liver enzymes, IgG and often a biopsy. If ALT/AST are on the sheet, they are referred to.
2. **Given** AMA 1:160 or AMA-M2 50 U (printed `<20`), **When** analysed, **Then** the text names primary biliary cholangitis as the association. If ALP is raised on the same sheet, it says so.
3. **Given** ASMA 1:20 (below the printed limit or the 1:40 threshold), **When** analysed, **Then** it is negative, with no alarm.
4. **Given** AChR binding 0.8 nmol/L (printed `≤0.02`), **When** analysed, **Then** it is above the limit and the text names the neurologist. If the patient reports trouble breathing or swallowing, they are told to seek urgent care; the engine cannot know symptoms, so the text gives this conditional red flag.
5. **Given** AChR binding ≤ 0.02 nmol/L, **When** analysed, **Then** it is negative, and the text notes that a negative result does not rule out myasthenia (the eye-only form, MuSK).
6. **Given** Anti-MuSK «Positive», **When** analysed, **Then** it gets a finding.

---

### User Story 4 - Unmapped spellings and secondary antibodies of the existing panels are read (Priority: P2)

Labs print `ANA (IIF)`, `FANA`, `Anti-dsDNA (CLIFT)`, `Anti-Centromere B`, `Anti-Histone`, `Anticardiolipin IgA`, `Anti-DNase B` and `CH50`. Today these go to «تفسیر نشدند», even though their siblings are interpreted.

**Why this priority**: Each one is a known family with an existing owner rule. Most fixes route the row to that owner.

**Independent Test**: Every spelling in G2 resolves to the same finding as its sibling spelling, with the same urgency.

**Acceptance Scenarios**:

1. **Given** `ANA (IIF)` 1:160, **When** analysed, **Then** the output is identical to `ANA` 1:160. The same holds for `FANA` «Positive 1:320 speckled» against `ANA`.
2. **Given** `Anti-dsDNA (CLIFT)` 1:20 with printed `<1:10`, **When** analysed, **Then** `ana_family_result` reports it as positive. The text notes that CLIFT is the high-specificity confirmation method.
3. **Given** `Anti-Centromere B` 3 U (`<1.0`), **When** analysed, **Then** the output equals `Anti-Centromere`.
4. **Given** `Anti-Histone` above its printed range, **When** analysed, **Then** the text says it is common in drug-induced lupus and also in lupus without a drug, and asks about recent medicines. It does not name a drug as the cause.
5. **Given** `Anticardiolipin IgA` above its printed range, **When** analysed, **Then** the text says IgA is not one of the APS classification antibodies, and urgency is no higher than for IgG/IgM.
6. **Given** `Anti-DNase B` 500 U/mL, **When** analysed for a child of 10 and for an adult, **Then** the verdict follows the printed range when present. With no printed range, the age bands are used: < 5 y ≤ 250, 5–17 y ≤ 375, ≥ 18 y ≤ 300 U/mL (P136 reviewer question).
7. **Given** `CH50` below its printed range, **When** analysed, **Then** `complement_result` (or a sibling) quotes it. When C3 and C4 are normal, the text mentions possible inherited complement deficiency and does not mention lupus activity.

---

### User Story 5 - APS titre levels follow the 2023 criteria (Priority: P3)

aCL or β2GPI IgG/IgM 30 units and 85 units currently get the same sentence. The 2023 ACR/EULAR criteria count 40–79 as moderate and ≥ 80 as high; below 40 is not counted.

**Why this priority**: The text is not wrong today, only less informative. Urgency must not drop, because the metamorphic rule says a worse value never gets lower urgency.

**Independent Test**: The same aCL IgG row at 30, 45 and 85 GPL gives three distinct, correctly ordered sentences with non-decreasing urgency.

**Acceptance Scenarios**:

1. **Given** aCL IgG 30 GPL (`<20`), **When** analysed, **Then** the text says it is above the lab's limit, below the 40-unit level the 2023 criteria count, and still needs repeating at 12 weeks.
2. **Given** aCL IgG 45 or 85 GPL, **When** analysed, **Then** the text says "moderate" or "high" per the 2023 bands. This applies only when the printed unit is GPL/MPL/U (no conversion).
3. **Given** a lupus anticoagulant result, **When** analysed, **Then** the text notes that anticoagulant drugs can affect that test, while the ELISA tests are not affected.

---

### User Story 6 - Serum immunoglobulins have a reader (Priority: P3)

IgG, IgA, IgM and IgE are printed on many sheets, and US2/US3 need IgA and IgG as partners. Today they are unmapped.

**Why this priority**: These rows are needed as partners. Interpreting them on their own (immunodeficiency) is out of scope, so their reader is minimal: quote the value against the printed range.

**Independent Test**: Each immunoglobulin row with a printed range gives a finding quoting value and range, or appears in a partner sentence. None lands in «تفسیر نشدند».

**Acceptance Scenarios**:

1. **Given** IgG 150 mg/dL (`700–1600`), **When** analysed, **Then** the text quotes the value, says it is below the printed range, and suggests seeing a doctor or immunologist. It names no immunodeficiency diagnosis and gives no treatment threshold.
2. **Given** IgE 900 IU/mL (`<100`), **When** analysed, **Then** the text quotes it as above the range and names allergy and parasitic infection as common causes.
3. **Given** a child aged 2 with IgG below an adult printed range, **When** analysed, **Then** the text does not call it low on an adult range alone. It quotes the value and says children's levels are lower (N39/N53).

---

### Edge Cases

- **Name collisions (N2/N25):** each pair below is probed in both directions.
  - `Anti-Tg` (antibody) vs `Tg` / `Thyroglobulin` (tumour marker);
  - `Total IgA` vs `tTG IgA` vs `Anticardiolipin IgA`;
  - `IgG` vs `IgG index` vs `IgG4` vs `tTG IgG` vs `DGP IgG`;
  - `ASMA` vs `SMA`;
  - `AMA` vs `AMA-M2` vs any prefix match;
  - `EMA` vs any name it could prefix;
  - `Anti-Histone` vs `Histone`.
- **A censored value** («<0.5», «>300»): this follows the existing P77 censored path, so it gets no invented verdict.
- **Titre vs number:** a titre is read as a titre and a number as a number (`parseTitre`). A titre is never compared with a numeric range.
- **Borderline / equivocal** («Equivocal», «+/-», the printed borderline band): this gets the existing `equiv` state, neither positive nor negative.
- **No printed range:** this follows P77 round 2 (`noref`). The value is quoted, no high/low claim is made, and urgency is `routine`. The exceptions are the explicit fixed thresholds in this spec (ANA titre, AChR, Anti-DNase B age bands, APS 40/80), each a P136 question.
- **A child:** celiac no-biopsy wording is paediatric. Anti-DNase B and immunoglobulins are age dependent. ASO keeps its existing age-banded owner.
- **Pregnancy:** the TRAb/TSI text keeps its current behaviour. The Ro/La pregnancy text keeps its current numbers. The guide says 1–2 % / 5 % while the engine says ~2 % / ~3 %; this is listed as a reviewer question, not silently changed.
- **CSF rows** (OCB, IgG index, κFLC) must not be read as serum IgG (N25). They stay out of scope, unmapped or `specimen` as today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a sheet prints a reference range for Anti-TPO or RF, the verdict (above / within) MUST come from that printed range, not the engine's internal range.
- **FR-002**: Every reader of these keys' direction MUST be re-checked on a boundary panel (N23). That covers `thyroid`, `hypothyroid_dyslipidemia_link`, `rf_positive`, the score and the expert view. Each changed output MUST be listed in the decision record.
- **FR-003**: Each spelling in G2 MUST resolve to the same engine identity as its existing sibling. The output for the variant spelling MUST equal the sibling's.
- **FR-004**: The engine MUST recognise:
  - celiac serology: tTG-IgA, tTG-IgG, DGP-IgG (and DGP-IgA), EMA-IgA;
  - Total serum IgA.

  Each of them, positive or negative, MUST end in a finding that quotes the printed value.
- **FR-005**: A negative tTG-IgA next to a low Total IgA MUST be reported as unreliable, naming an IgG-based test.
- **FR-006**: A negative tTG-IgA with no Total IgA on the sheet MUST say that IgA was not measured. It MUST never claim IgA is normal.
- **FR-007**: tTG-IgA at ≥ 10× the printed upper limit MUST be described as a level specialists use (with EMA in a second sample) in the no-biopsy pathway for children. The engine MUST NOT state a diagnosis.
- **FR-008**: Every celiac finding MUST carry the caveat that the tests are valid only while the person is still eating gluten.
- **FR-009**: The engine MUST recognise ASMA (incl. F-actin), Anti-LKM1, Anti-SLA/LP, AMA and AMA-M2 as titres or numbers. Each MUST get a finding that names its disease association (AIH type 1 / type 2 / PBC) without stating a diagnosis.
- **FR-010**: The liver-antibody findings MUST refer to liver enzymes, IgG or ALP when those are on the same sheet. When they are absent, the findings MUST say so (N4/N21).
- **FR-011**: The engine MUST recognise AChR-binding antibody and Anti-MuSK. A positive result names the neurologist. The text carries the conditional red flag for breathing or swallowing difficulty. A negative result says it does not exclude myasthenia.
- **FR-012**: Anti-Histone, aCL-IgA, Anti-DNase B and CH50 MUST each get a reader that quotes the value.
  - aCL-IgA MUST NOT carry higher urgency than aCL-IgG/IgM.
  - Anti-DNase B without a printed range MUST use the age bands in US4-6.
- **FR-013**: aCL and β2GPI IgG/IgM findings MUST state the 2023 titre level (< 40 not counted, 40–79 moderate, ≥ 80 high) when the printed unit is GPL, MPL or U. The urgency of an existing positive MUST NOT decrease.
- **FR-014**: IgG, IgA, IgM and IgE MUST be recognised and quoted against the printed range.
  - Under 16 years, a verdict MUST NOT be taken from an adult range alone.
  - No immunoglobulin replacement threshold or immunodeficiency diagnosis may be stated.
- **FR-015**: No new key may land in «برای این‌ها توضیحِ آمادهٔ اختصاصی نداریم» (unmatched abnormal) or «تفسیر نشدند» on any panel in the probe set.
- **FR-016**: Every new user-facing string MUST be Persian, and every key MUST pass through the Persian display name (N8).
- **FR-017**: Urgency MUST stay at or below `this_week` for every new antibody finding. Nothing in this spec creates an emergency. The worse-value-never-lower rule (metamorphic) MUST hold, with no new allowed exceptions.
- **FR-018**: Every new fixed number MUST be recorded under **P136** in the clinical decision register as a reviewer question, in the same change. That covers ANA titre reuse, AChR 0.02 nmol/L, the Anti-DNase B bands, APS 40/80, tTG 10×ULN and the 1:40 liver-antibody titre. Its source MUST be marked as the user's secondary guide, not opened.
- **FR-019**: Each fixed bug and each new reader MUST have a regression test that fails on the current tree.

### Key Entities

- **Antibody result row**: the printed name, the value (number, titre, or qualitative word), the printed unit, and the printed range. Its state is above / within / borderline / no-range / censored.
- **Partner analyte**: a measurement that changes how another result is read. Examples: Total IgA for tTG-IgA; IgG, ALT and AST for the liver antibodies; ALP for AMA; C3 and C4 for CH50.
- **P136 decision record**: each new fixed threshold, the guide text it came from, the patient-facing effect, and the open reviewer question.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All in-scope analytes from the guide (G2–G5, G7: 25 distinct unmapped spellings in `before.txt`; the 8 out-of-scope rows, IgG1–4, CD4, C1-INH, OCB and IgG index, are excluded) move from «تفسیر نشدند» to a finding that quotes the printed value. The count is measured with the same probe scripts.
- **SC-002**: Anti-TPO and RF agree with the printed verdict in 100 % of the boundary panels (value just below, at, and just above the printed limit).
- **SC-003**: In the probe set, the number of new-key rows in «توضیح نداریم» or «تفسیر نشدند» is 0.
- **SC-004**: The full backend test suite is green except for already-known failures, which are named. The metamorphic suite is green with no new allowed exceptions.
- **SC-005**: The only existing locked outputs that change are the ones listed in the decision record, each with a reason.
- **SC-006**: A reviewer can read every new patient-facing sentence verbatim in the decision record or the probe output, and no sentence states a diagnosis.

## Assumptions

- **Scope is the autoimmune part of the guide (parts 1–6).** Part 7 (inborn errors of immunity) is out of scope. That covers IgG subclasses, CD4 counts, DHR/CD18, CH50 as a PID screen, C1-INH, and IGRT thresholds. The user asked for «بخش بیماری خود ایمن», and the subclass table is corrupted in the source. Immunoglobulins enter only as partners (US6).
- **MS CSF markers are out of scope.** OCB, IgG index and κFLC need a CSF specimen identity (N25), and they are not on the sheets the app receives.
- **Clinical scoring is out of scope.** The engine does not compute an EULAR/ACR, Jones, IAIHG or SLEDAI score; scoring needs clinical findings the app does not collect. Lab-only criteria weights already quoted by existing rules stay as they are.
- **ARF needs no new rule.** The Jones criteria need clinical major/minor signs. The ESR/CRP population cut-offs need local epidemiology the engine doesn't have, and the guide's ASO protocol cells are corrupted.
- **"CRP high in known SLE suggests infection"** needs the condition "known lupus". That is not an active condition (P66), so it is deferred.
- **TSH targets, the circadian TSH note, and Free-T4 method notes** belong to thyroid function, not autoimmunity, so they are left to the existing `thyroid` owner.
- **No treatment content.** Drug doses, biopsy counts, VCTE kPa cut-offs and thymoma CT advice are deliberately excluded. Prescribing and procedures are not the engine's job (P77 precedent).
- **The guide is a secondary summary**, and its works-cited links were not opened. Its percentages (sensitivity, specificity, prevalence) are not quoted to patients unless an existing rule already quotes them.
- No question was asked: the standing preference is to decide, record the decision, and proceed.
