> **Stage B of [specs/005](../005-urinalysis-rules/spec.md).** Stage A (User Stories 1–2) shipped in `c287812`.
> This pass implements User Stories 3–6 and FR-013–FR-028 only. Stage A text below is context, not scope.

# Feature Specification: Urinalysis Interpretation (Henry ch.29)

**Feature Branch**: `005-urinalysis-rules`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "قواعد آنالیز ادرار (فصل ۲۹ هنری) را به موتور قواعد اضافه کن — محدوده‌های مرجع، قواعد فیزیکی/شیمیایی/میکروسکوپی، و ماتریس تطبیق بیماری‌ها. شرط: هیچ مورد تکراری با موتور فعلی اضافه نشود."

## Context: What the engine already does — measured, not assumed

Measured on the working tree at `395a5d7` (2026-09-22) with
`node .claude/skills/clinical-knowledge-extraction/scripts/engine-inventory.mjs`: **121 rules in
16 files**. The urinalysis surface that is already live:

| Already covered | Where |
|---|---|
| Dipstick protein, graded trace/+1/+2/+3 | `proteinuria_pattern` |
| Albumin-to-creatinine ratio, KDIGO bands | `albuminuria_pattern`, `ACR` classifier |
| Blood / RBC in urine, and the persistent case | `hematuria_pattern`, `persistent_microhematuria` |
| Urine glucose present | `glycosuria_pattern` |
| Ketones, including ketones + glucose → DKA | `ketonuria_pattern` |
| Nitrite + leukocyte esterase + WBC → UTI | `uti_pattern` |
| Bacteria without inflammation → contamination | `bacteriuria_no_inflammation` |
| Nephrotic-range picture | `nephrotic_pattern` / `isNephrotic` |
| Glomerulonephritis picture | `glomerulonephritis_pattern` / `isGlomerulonephritis` |
| Myoglobinuria with raised CK | `rhabdomyolysis_pattern` |
| Kidney function, with urine findings folded in | `kidney`, `ckd_pattern_diagnostic` |
| 24-hour urine calcium | `urine_calcium_abnormal`, `U_CA` |
| Reading semi-quantitative urine rows | `urinePositive` / `urineCellCount` / `urineGrade` |
| Telling a urine page from a blood or semen page | `detectUrineOnlyPages`, `URINE_ONLY_MARKERS` |

**Everything in that table is out of scope.** This feature adds only what the chapter covers and
the engine does not. Two named row types — casts and crystals — are already recognised as evidence
that a page *is* a urine page, and then **no rule reads them**: they are recognised and discarded,
which is the silent-drop shape this project has been bitten by before.

### One of them is worse than discarded — measured, not argued

A cast row printed per low-power field reaches the qualitative channel, and the existing red-cell
lookup matches any row whose name contains "RBC". So a cast count is consumed as a free red-cell
count. Measured on the working tree at `395a5d7`:

```
panel:  Nitrite Negative · WBC 2-3 /hpf · RBC Casts 5-8 /lpf
qual:   {"Urine WBC":"2-3", "Urine RBC Casts":"5-8"}
fired:  hematuria
text:   «در آزمایش ادرار شما خون (گلبول قرمز) دیده شده است»
```

The patient is told loose blood cells were seen in their urine. What the lab actually reported was
red-cell **casts**, which mean bleeding from inside the kidney itself — a more serious finding with
a different cause and a different next step. The report is not silent; it is confidently wrong, and
it is wrong in the direction of under-reading. This is a live defect, not a gap.

## Clarifications

### Session 2026-09-22

- Q: Should the cast-misread fix be carved out and shipped as its own first slice, ahead of the
  rest of the chapter? → A: Stage A = the misread fix plus the P1 cast findings; Stage B = crystals,
  specific gravity, bilirubin/urobilinogen, and cells.
- Q: Should specific gravity become a graded engine key with its own reference range, or stay a
  qualitative row that only a pattern rule reads? → A: Qualitative row only — no reference range, no
  band, no abnormal flag; one pattern rule states all three directions in words.
- Q: Where should the "this sample may be contaminated" caveat from abundant squamous cells go —
  into a finding the patient reads, or into the sample-quality caveat layer? → A: A finding the
  patient reads, because the caveat layer has no renderer and would make the sentence invisible.
- Q: When red-cell casts appear on a sheet that also satisfies the existing kidney-inflammation
  pattern, which finding tells the patient when to see a doctor? → A: The existing inflammation
  finding; the cast sentence folds into it, and a standalone cast finding fires only when the
  inflammation pattern does not.
- Q: Should dysmorphic red-cell percentage and urine eosinophil percentage stay in scope, given that
  Iranian outpatient sheets rarely print either? → A: Drop both, and record them in the clinical
  register as deliberately excluded with the reason.

## Scope Staging

This feature ships in two stages, each independently reviewable and mergeable.

| Stage | Contents | Why here |
|---|---|---|
| **A** | The cast misread fix (FR-004a) and the cast findings (User Story 1), plus the dipstick-versus-microscope cross-checks (User Story 2) | Stage A closes a wrong sentence that reaches patients today, and the cross-checks are the same class — a claim the sheet's own second test contradicts. Both are corrections, not additions. |
| **B** | Crystals, urine concentration, bilirubin/urobilinogen, and the cell types (User Stories 3–6) | Purely additive. None of it changes an existing sentence, so it can wait for its own clinical review without leaving a wrong claim in production. |

A requirement carries its stage in parentheses where it is not obvious from its user story.
Stage B MUST NOT be started before Stage A has been measured green.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Casts are read instead of misread (Priority: P1, Stage A)

A patient uploads a urinalysis sheet whose microscopy line reads «RBC Casts: 2-4 /lpf» or
«WBC casts: present» or «Waxy casts: few». Today a red-cell cast row is counted as if it were loose
red cells, so the report makes a wrong claim; other cast types are dropped, so the report is silent
about the most specific finding on the page. The patient should be told what kind of cast was seen,
what it points at, and how soon to act.

**Why this priority**: Casts are the chapter's highest-specificity findings — a red-cell cast means
bleeding from inside the kidney, and a white-cell cast separates kidney infection from bladder
infection. They are the one place where a urine sheet changes the urgency of the whole answer, and
today the engine either misreads them or reads them as nothing at all.

**Independent Test**: Run a panel containing only a cast row through the engine and confirm a
finding naming that cast type appears, with no change at all to a panel that has no cast row.

**Acceptance Scenarios**:

1. **Given** a urine sheet with red-cell casts reported, **When** the sheet is interpreted, **Then**
   the report states that these point to bleeding originating inside the kidney rather than in the
   bladder or urethra, and asks for medical review within the week or sooner.
2. **Given** a urine sheet with white-cell casts, pyuria and bacteria, **When** it is interpreted,
   **Then** the report distinguishes a kidney infection from a bladder infection and says why.
3. **Given** a urine sheet whose only cast row is «Hyaline casts: 1-2 /lpf», **When** it is
   interpreted, **Then** the report states this is a normal finding and does not raise urgency.
4. **Given** a urine sheet with no cast row at all, **When** it is interpreted, **Then** the output
   is byte-for-byte what it was before this feature.
5. **Given** a urine sheet whose only red-cell row is a red-cell **cast** count, **When** it is
   interpreted, **Then** the report does not claim that loose red blood cells were seen, and the
   cast finding is what the patient reads instead.
6. **Given** a urine sheet reporting both loose red cells and red-cell casts, **When** it is
   interpreted, **Then** each count is attributed to the row it came from and neither is used as
   the other.

---

### User Story 2 - A dipstick result the microscope contradicts is flagged (Priority: P1, Stage A)

The chapter's cross-validation rules: blood positive with no red cells seen means the pigment is
haemoglobin or muscle protein, not intact cells; leukocyte esterase positive with no white cells
seen means the cells broke down or the cause is not bacterial. Today each half is read by a
separate rule that never looks at the other, so the patient reads «blood was seen in your urine»
when no red cell was on the slide.

**Why this priority**: This is a wrong statement, not a missing one, and it appears on the most
common abnormal urine sheet there is. A report that says "blood" when the lab saw none sends the
patient down the wrong path.

**Independent Test**: Run a panel with dipstick blood positive and RBC 0-2/hpf and confirm the
report names the haemoglobin/muscle-pigment possibility instead of asserting intact red cells.

**Acceptance Scenarios**:

1. **Given** dipstick blood positive and microscopic red cells at or below the normal count,
   **When** interpreted, **Then** the report says the colour reaction can come from free
   haemoglobin or muscle pigment rather than whole cells, and names the test that tells them apart.
2. **Given** dipstick blood positive and red cells above the abnormal threshold, **When**
   interpreted, **Then** the existing haematuria finding is unchanged and this sentence does not
   appear.
3. **Given** leukocyte esterase positive with no white cells seen, **When** interpreted, **Then**
   the report names sample handling and non-bacterial causes rather than asserting pyuria.

---

### User Story 3 - Crystals that are always pathologic are never treated as incidental (Priority: P2, Stage B)

Most crystals on a urine sheet mean nothing — amorphous urates and phosphates are a property of a
cold, concentrated or alkaline sample. Four are different: cystine, tyrosine, leucine and
cholesterol are abnormal in every context. The report should reassure about the first group and
escalate on the second, rather than being silent about both.

**Why this priority**: The always-pathologic four are rare, so the everyday value here is the
reassurance — a patient who reads «crystals» on their own sheet and gets no comment assumes the
worst. Both directions matter, and neither exists today.

**Independent Test**: Run one panel per crystal class and confirm the pathologic group produces a
finding asking for medical review while the incidental group produces an explicitly reassuring
sentence at routine urgency.

**Acceptance Scenarios**:

1. **Given** cystine crystals reported, **When** interpreted, **Then** the report states these are
   never a normal finding and asks the patient to take the sheet to a doctor.
2. **Given** amorphous urates reported, **When** interpreted, **Then** the report states this is
   usually a property of the sample rather than a disease, and does not raise urgency.
3. **Given** calcium oxalate crystals with no other abnormality, **When** interpreted, **Then** the
   report gives the common benign reading and mentions stones as a possibility, without asserting
   that a stone is present.

---

### User Story 4 - Urine concentration is interpreted (Priority: P2, Stage B)

Specific gravity is printed on essentially every Iranian urine sheet and is already recognised by
the page detector, but it has no reference range, no grading and no rule. A value under the dilute
threshold and a value over the concentrated threshold each mean something the patient can act on.

**Why this priority**: It is the most frequently printed urine row that the engine says nothing
about, and the dilute end is what makes the rest of the dipstick unreliable — so it also qualifies
other findings on the same sheet.

**Independent Test**: Run a panel whose only urine row is a specific gravity value and confirm one
finding appears, naming the direction and the everyday explanation.

**Acceptance Scenarios**:

1. **Given** a concentrated specific gravity on an otherwise unremarkable sheet, **When**
   interpreted, **Then** the report names concentrated urine with dehydration as the ordinary
   explanation.
2. **Given** a very dilute specific gravity, **When** interpreted, **Then** the report names dilute
   urine and states that a very dilute sample can hide other findings on the same dipstick.
3. **Given** a specific gravity inside the usual band, **When** interpreted, **Then** no
   concentration finding appears.

---

### User Story 5 - Urine bilirubin and urobilinogen answer the jaundice question (Priority: P3, Stage B)

The chapter's matrix separates bile-duct obstruction, liver-cell disease and red-cell breakdown by
two urine rows. Both are on every dipstick and neither is read by any rule today.

**Why this priority**: Real diagnostic content, but actionable mainly alongside serum bilirubin,
which the engine already interprets — so it extends an existing conversation rather than filling a
gap that leaves the patient with nothing.

**Independent Test**: Run a panel with urine bilirubin positive and confirm a finding appears
naming the processed form of bilirubin reaching the urine, and that it does not contradict the
serum bilirubin finding on the same panel.

**Acceptance Scenarios**:

1. **Given** urine bilirubin positive, **When** interpreted, **Then** the report states that only
   the processed form of bilirubin reaches urine, and that this points at the liver or bile ducts.
2. **Given** urine bilirubin positive on a sheet that also produces a serum bilirubin finding,
   **When** interpreted, **Then** the two carry one timeline between them, not two.
3. **Given** urobilinogen raised with urine bilirubin negative, **When** interpreted, **Then** the
   report names red-cell breakdown as a possibility rather than obstruction.

---

### User Story 6 - Cells that name a specific injury (Priority: P3, Stage B)

Renal tubular cells name an injury the engine cannot name today. Squamous epithelial cells answer a
different question: they say the sample was contaminated, which qualifies everything else on the
page.

**Why this priority**: Renal tubular cells are an uncommon row, but the contamination caveat applies
to a large share of real sheets and changes how the rest should be read.

**Independent Test**: Run one panel per cell type and confirm the matching finding, and confirm the
contamination caveat attaches without changing any other finding's urgency.

**Acceptance Scenarios**:

1. **Given** abundant squamous epithelial cells, **When** interpreted, **Then** the report notes the
   sample may be contaminated and suggests repeating with a midstream sample, without downgrading
   any other finding.
2. **Given** renal tubular cells reported as increased, **When** interpreted, **Then** the report
   names injury to the kidney's own tubules and asks for medical review.
3. **Given** a sheet reporting a dysmorphic red-cell or urine eosinophil percentage, **When** it is
   interpreted, **Then** no rule claims to interpret it, and the row is surfaced as one the system
   does not read rather than being silently dropped.

---

### Edge Cases

- **A cast or crystal row reported as «negative», «0-1» or «none»** must produce the reassuring
  branch or no finding at all — never the pathologic one. A recognised row whose value is normal is
  not an abnormal row.
- **A crystal or cast name the system does not know** (there are dozens of spellings, English and
  Persian) must be surfaced as "we saw a row we could not interpret" rather than dropped silently
  or mapped to the nearest known name.
- **Specific gravity printed alongside protein or glucose** is falsely raised by both, and the
  chapter gives a correction. Whether the engine applies the correction or only states the caveat
  is a decision for the clinical reviewer, not for implementation.
- **A dipstick row and a microscopy row that disagree** must never produce two findings carrying
  two different timelines about the same physical finding.
- **A page the system did not recognise as a urine page** must not have any of these rules fire on
  it — every new rule is gated on the same page detection the existing urine rules use.
- **A newly-read row must not be taken away from the "nothing explains this" net silently.** A rule
  that reads a row only for context still has to say something about every value that row can hold,
  including the values it does not care about.
- **None of these rows carries a unit**, so none can be graded against a reference range the way a
  serum value is; the chapter's numeric thresholds are counts per microscope field, which is the
  convention the existing urine helpers already use.

## Requirements *(mandatory)*

### Functional Requirements

**Coverage and non-duplication**

- **FR-001**: The engine MUST NOT gain a second rule about any finding listed in the "already
  covered" table above. Where the chapter adds nuance to one of those findings, that nuance MUST be
  added inside the existing rule, not beside it.
- **FR-002**: Every new rule MUST be checked against every existing rule that reads the same urine
  row, and where both can fire on one sheet, exactly one of them MUST own the patient's timeline.
- **FR-003**: The full set of rule identifiers MUST be recorded before and after the change, and
  any identifier that leaves the set MUST be accounted for as a deliberate clinical deletion.

**Casts (P1, Stage A)**

- **FR-004a**: A cast row MUST NOT be consumed by any rule that counts loose cells. A row naming a
  cast MUST be attributable to casts and to nothing else, and the correction MUST hold for every
  cell type a cast can be named after, not only red cells.
- **FR-004b**: Fixing FR-004a MUST NOT change the output of any sheet that reports loose cells
  without casts.
- **FR-004**: The system MUST read cast rows from a urine sheet and distinguish at minimum hyaline,
  red-cell, white-cell, renal-tubular-cell, granular, waxy, broad and fatty casts.
- **FR-005**: The system MUST report hyaline casts within the normal count as a normal finding and
  MUST NOT raise urgency for them.
- **FR-006**: The system MUST report red-cell casts as pointing to bleeding originating in the
  kidney, and white-cell casts as separating kidney infection from bladder infection.
- **FR-007**: The system MUST report waxy and broad casts as pointing to long-standing kidney
  damage, and fatty casts as belonging with heavy protein loss.
- **FR-008**: Where a cast finding and an existing kidney or urine finding both apply to one sheet,
  the report MUST carry a single instruction about when to see a doctor.
- **FR-008a**: When the existing kidney-inflammation pattern fires, it owns the timeline. The
  red-cell cast sentence MUST be folded into that finding rather than delivered as a second one, and
  the existing finding's urgency MUST NOT change as a result.
- **FR-008b**: A standalone red-cell cast finding MUST fire only when the kidney-inflammation
  pattern does not. The hand-off MUST be expressed as "did that rule fire", never as a restatement
  of the conditions under which it would have.
- **FR-008c**: Folding the cast sentence in MUST NOT remove anything the inflammation finding
  already said, and MUST NOT take the cast row away from the "nothing explains this" net for the
  values that neither rule speaks to.

**Dipstick-versus-microscope cross-checks (P1, Stage A)**

- **FR-009**: When the dipstick reports blood but the microscope reports no meaningful red cells,
  the system MUST report free haemoglobin or muscle pigment as the explanation rather than
  asserting that blood cells were seen.
- **FR-010**: When the dipstick reports leukocyte esterase but the microscope reports no white
  cells, the system MUST name sample handling and non-bacterial causes rather than asserting
  pyuria.
- **FR-011**: Each cross-check MUST state a three-way result — the second test agrees, the second
  test argues against, or the second test was not done — and MUST NOT treat "not done" as either of
  the other two.
- **FR-012**: The cross-checks MUST NOT fire when both tests agree; on those sheets the existing
  findings MUST be unchanged.

**Crystals (P2, Stage B)**

- **FR-013**: The system MUST classify a reported crystal as always-pathologic (cystine, tyrosine,
  leucine, cholesterol), as stone-associated (uric acid, calcium oxalate, triple phosphate), or as
  incidental (amorphous urates, amorphous phosphates, ammonium biurate).
- **FR-014**: An always-pathologic crystal MUST produce a finding that asks for medical review and
  states plainly that this crystal is not a normal finding.
- **FR-015**: An incidental crystal MUST produce an explicitly reassuring finding at routine
  urgency that names the sample property responsible.
- **FR-016**: A crystal name the system does not recognise MUST be surfaced as uninterpreted rather
  than dropped or mapped to the nearest known name.

**Urine concentration (P2, Stage B)**

- **FR-017**: The system MUST interpret specific gravity in three directions — dilute, usual and
  concentrated — and MUST name the everyday explanation for each.
- **FR-017a**: Specific gravity MUST be treated as a qualitative row, not as a graded measurement.
  It MUST NOT be given a reference range, MUST NOT appear with a range band in the patient's list of
  read numbers, and MUST NOT carry an abnormal/normal flag. All three of its directions are stated
  in words by the rule that reads it.
- **FR-017b**: Specific gravity currently reaches the uninterpreted list rather than the qualitative
  channel. Routing it to the qualitative channel is part of this feature, and MUST NOT change the
  routing of any other row.
- **FR-018**: When specific gravity indicates a very dilute sample, the report MUST state that other
  dipstick results from that sample are less reliable.
- **FR-019**: The system MUST NOT claim a fixed-concentration (isosthenuric) pattern from a single
  sheet, because the chapter defines it across repeated tests.
- **FR-019a**: A concentrated specific gravity MUST NOT be reported as an abnormality on its own.
  The report states what it means about the sample; a dehydrated patient's concentrated urine is an
  expected result, not a finding against them.

**Bilirubin, urobilinogen and cells (P3, Stage B)**

- **FR-020**: The system MUST interpret urine bilirubin and urobilinogen together, distinguishing
  obstruction, liver-cell disease and red-cell breakdown per the chapter's matrix.
- **FR-021**: Where a urine bilirubin finding and a serum bilirubin finding both apply, the two MUST
  NOT give the patient two different timelines.
- **FR-022**: The system MUST report renal tubular cells as injury to the kidney's own tubules.
- **FR-022a**: Dysmorphic red-cell percentage and urine eosinophil percentage are OUT of scope. Both
  require a specialist microscopy report — phase-contrast examination or a specific stain — that a
  routine urinalysis does not include, so no rule reading them could be verified against a real
  sheet. Both MUST be recorded in the clinical decision register as deliberately excluded, with this
  reason, so a later session does not rediscover them as gaps.
- **FR-023**: Abundant squamous epithelial cells MUST produce a finding the patient reads, at
  routine urgency, stating that the sample may have been contaminated during collection and
  suggesting a repeat midstream sample. It MUST NOT downgrade the urgency of any other finding.
- **FR-023a**: This caveat MUST NOT be delivered through the sample-quality caveat layer. That layer
  is not rendered by the frontend, so a sentence placed there reaches no patient — which is the
  failure this feature exists to close. If a renderer for that layer is built later, moving the
  caveat there is a separate decision.

**Patient-facing text**

- **FR-024**: Every sentence added by this feature MUST be in Persian and MUST NOT contain a raw
  engine identifier, a Latin row name, or an untranslated cast or crystal name where a Persian name
  exists.
- **FR-025**: No finding added by this feature may state or imply a result for a row that was not on
  the sheet.
- **FR-026**: No finding added by this feature may name a diagnosis as established; each states what
  the finding points at and what would confirm it.

**Reviewer gate**

- **FR-027**: Every numeric threshold this feature introduces MUST be recorded in the clinical
  decision register for human review, with its source, before it governs patient-facing text.
- **FR-028**: Any chapter content deliberately left out MUST be recorded with the reason, so that a
  later session does not rediscover it as a gap.

### Key Entities

- **Urine microscopy row**: a named finding counted per microscope field — casts per low-power
  field, cells per high-power field — reported as a count, a range, or a descriptive amount.
- **Specific gravity**: how concentrated the urine is, expressed as a bare number with no unit. It
  is a property of the sample rather than a verdict about the patient, which is why it is carried as
  a qualitative row and never as a measurement with a range.
- **Cast**: a cylindrical cell-and-protein structure formed inside a kidney tubule; its type names
  what was trapped inside it, and therefore which part of the kidney is involved.
- **Crystal**: a precipitate whose meaning depends on its chemical identity and on the sample's
  acidity and temperature — mostly a property of the sample, occasionally of the patient.
- **Dipstick pad**: a chemical reaction reported as negative, trace, or a plus-grade; it answers a
  different question from the microscope, and the two can legitimately disagree.
- **Urine page**: the sheet, or the page of a multi-page sheet, that these rows belong to; a row's
  meaning depends on which page it was printed on.
- **Cross-check pair**: a dipstick pad and the microscopy row that tests the same physical claim,
  whose disagreement is itself a finding.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a urine sheet reporting casts, the patient reads a sentence naming the cast type
  and what it points at; today they read nothing about it.
- **SC-002**: Zero sheets produce two different "when to see a doctor" instructions about the same
  urine finding.
- **SC-003**: Every sheet that produced a given report before this change produces a byte-identical
  report afterwards, unless it contains one of the newly-read rows.
- **SC-004**: On a sheet where the dipstick and the microscope disagree about blood or white cells,
  the report names the disagreement in every such case and asserts neither side as fact.
- **SC-005**: Every new patient-facing sentence is in Persian and contains no engine identifier,
  verified across the full rule set rather than by sampling.
- **SC-006**: No urine row the system recognises is left without a reader — "recognised and
  discarded" drops to zero for the row types this feature covers.
- **SC-007**: Every new rule is covered by at least one test that fails against the engine as it
  stands today.
- **SC-008**: The number of rules reading each urine row is known and asserted, so a later addition
  that re-opens a duplicate turns the suite red.
- **SC-009**: A sheet whose only red-cell row is a cast count no longer produces a sentence claiming
  loose red blood cells were seen — measured on that exact panel, which produces that sentence
  today.
- **SC-010**: Stage A is measured green on its own before any Stage B work begins, and the
  before/after rule-identifier sets are recorded for each stage separately.
- **SC-011**: Every sentence this feature adds is reachable by a patient — none is delivered through
  a layer the frontend does not render.

## Assumptions

- **Scope is the interpretation layer, not new sample collection.** Everything here is read from
  what a lab already prints; nothing requires the patient to produce a second specimen. That rules
  out the chapter's orthostatic-proteinuria protocol (two timed specimens), its 24-hour volume
  rules (polyuria, oliguria, anuria — a timed collection Iranian outpatient sheets rarely carry),
  the isosthenuria rule (repeated tests), and the confirmatory bench procedures (sulfosalicylic
  acid, Clinitest copper reduction, ether solubility, heat and acetic-acid solubility, polarised
  light).
- **Colour and appearance are excluded.** They are printed on most sheets, but the chapter's
  discriminator is the colour of the foam when the sample is shaken, which no lab reports and no
  photograph of a sheet can supply. Reading colour alone would mean guessing.
- **The chapter's numeric reference values enter as a reviewer proposal, not as live thresholds.**
  This matches how every previous chapter was adopted in this project: a textbook number is a
  proposal until a human clinical reviewer approves it.
- **New urine rows are read through the existing semi-quantitative helpers**, which already handle
  negative / trace / plus-grades / counts / ranges / Persian and English descriptive amounts. No
  new value-parsing convention is assumed.
- **Existing page detection is reused unchanged.** These rules apply only to rows the system already
  attributes to a urine page; no change to how a urine page is told apart from a blood or semen
  page is in scope.
- **Ascorbic-acid interference is handled as a caveat, not as a rule that changes a result.** When a
  sheet reports it, the report may say which pads can read falsely low; it must never re-interpret
  a negative pad as positive. Like the contamination caveat, it is delivered as a finding the
  patient reads rather than through the unrendered sample-quality layer.
- **Rules with no serum counterpart on the sheet still fire.** A urine-only sheet is common, and a
  finding that would benefit from a blood test the patient does not have says so, rather than
  staying silent.
