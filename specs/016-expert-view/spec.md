# Feature Specification: Expert View («نمای تخصصی») for the Result Page

**Feature Branch**: `016-expert-view` (spec directory; work continues on branch `recovery`)

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: add a «ساده / تخصصی» switch to the result page. The expert view is for clinical staff (physicians, nurses): a deeper interpretation and suggested follow-up tests. Everything in it comes from the rules engine's own verdicts and fields — no language model, no new thresholds, no new urgency. Phase 1 uses only data the engine already produces. Phase 2 (optional, rule by rule) adds an optional `pro` field {cautions, differential, workup}. Structural references: Care360 (Patient View / Doctor View), MSD Professional/Consumer, Mayo Interpretive Handbook. The user confirmed (2026-10-08): audience = clinical staff; the expert part may include suggested tests and deeper interpretation; the control is a switch on the same page.

## Current Behaviour (measured facts the spec starts from)

Measured 2026-10-08 on the working tree (branch `recovery`, `HEAD` `5ebdae8` + uncommitted changes of a concurrent session), by running `runEngine` → `runPatterns` on single-analyte panels for every `ADULT_REFS` key at three values (1.3×, 3× the upper bound, 0.6× the lower bound), and by reading `server.js`.

- **The client never receives the findings.** `_engine.patterns` is a list of rule ids only. A finding's `headline`, `must_say`, `warnings`, `suggest`, `sources` and `key_number` reach the page only as the model's rewritten `summary` / `interpretation` and as `general_recommendations`. A clinician reading the page sees patient prose, not the engine's verdict structure.
- **Fields a finding carries** (measured): `rule_id`, `pattern`, `urgency`, `headline`, `must_say`, `action`, `warnings`, `suggest`, `sources`, `key_number`, `brief`, `brief_warnings`, `explains`, `always_show`, `blocks_others`, `urgency_floor_from`, `applied_conditions`.
- **Coverage across 81 distinct rules that fired in the sweep:** `action` 81, `suggest` 68, `key_number` 28, `warnings` 36, `sources` 32. So suggested tests exist for most findings, but a source citation exists for fewer than half.
- **The text is in the patient's voice.** `must_say` addresses «شما». There is no `cautions`, `differential` or `workup` field on any rule today. A "deeper interpretation" written for clinicians **does not exist in the engine yet**; Phase 1 can show the structure behind the verdict (which values, which range, which grade, which source) but cannot author new clinical prose.
- **Data already serialized but never rendered:** `_engine.guidelines` (with `substituted`), `_engine.preanalytical`, `_engine.unitConversions` (partly rendered), `_engine.indices`, and per-test `ctcaeGrade`, `source`, `refSource`, `nearLimit`. `.claude/rules/frontend.md` records that `GuidelineSources` and `Preanalytical` are still not rendered.
- **Printed range vs engine range:** `applyPrintedRange` (a concurrent session, uncommitted) adds the sheet's own printed range next to the engine range inside finding text. The expert view needs both, side by side, as structured data.

## Clarifications

### Session 2026-10-08

- Q: Who is the expert view for? → A: **Clinical staff** (physicians, nurses), not the curious patient.
- Q: What may it contain? → A: **Suggested follow-up tests and a deeper interpretation**, in addition to the verdict's numbers and sources.
- Q: Switch or separate page? → A: **A switch on the same page**, default «ساده».
- Q: How much new clinician-facing text (`pro`) ships with this feature? → A: **The slot, the rendering, and a first batch of about 20–30 of the most frequent rules**, each written as a proposal and recorded in `MEDICAL_RULES.md`.
- Q: In the expert view, how much of a finding hidden under an emergency blocker is shown? → A: **Name, triggering values and sources only, collapsed; no action and no warnings**, so a second instruction never sits beside the emergency one.
- Q: Does the expert view show the sheet score's per-system breakdown? → A: **Yes, read-only**: the total and band, then the eight systems with their keys, cap and lowest test, taken from the score output as it is. No formula is shown and nothing is recomputed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch to the expert view and see why the engine said what it said (Priority: P1)

A physician opens a patient's result, flips the switch to «تخصصی», and sees, for each shown finding, the rule's Persian name, its urgency, the measured values that triggered it, the engine's range next to the sheet's printed range, the CTCAE grade where one exists, and the sources behind the thresholds.

**Why this priority**: This is the whole feature. The page today shows only patient prose, and a clinician cannot tell which numbers drove the verdict.

**Independent Test**: Run a panel with PT 14 · INR 1.2 through the engine and open the result with the switch on «تخصصی». The `coagulation_abnormal` finding appears with PT and INR values, both ranges, urgency `this_week`, and no raw engine key anywhere.

**Acceptance Scenarios**:

1. **Given** a result with at least one finding, **When** the switch is moved to «تخصصی», **Then** each shown finding is listed with its Persian name, urgency label, the triggering values and ranges, and its sources.
2. **Given** the same result, **When** the switch is moved back to «ساده», **Then** the page is exactly what it was before this feature.
3. **Given** a finding whose rule carries no source, **When** the expert view lists it, **Then** it states that no published source is attached to that rule; it does not omit the row and does not invent one.

---

### User Story 2 - Suggested follow-up tests for the clinician (Priority: P1)

In the expert view, each finding shows the tests the engine suggests next (`suggest`), already de-duplicated against tests that are on the sheet, and a combined list for the whole sheet.

**Why this priority**: The user asked for suggested tests explicitly, and 68 of 81 sampled rules already carry them. Zero new clinical content is needed.

**Independent Test**: A panel with Hb 9.5 · MCV 70 · ferritin 6. The suggested list contains no test that is already on the sheet, and every item reads as a test name in Persian.

**Acceptance Scenarios**:

1. **Given** a finding with `suggest` entries, **When** the expert view renders it, **Then** the suggestions appear as test names, and none names a test already measured on this sheet.
2. **Given** a finding with no `suggest`, **When** it renders, **Then** no empty "suggested tests" heading is shown.
3. **Given** several findings suggesting the same test, **When** the sheet-level list is built, **Then** it appears once.

---

### User Story 3 - Measured value, corrected value and unit conversion kept apart (Priority: P1)

The expert view shows the number as printed on the sheet, the number the engine graded (converted or corrected), and what changed it — in separate, labelled places.

**Why this priority**: A clinician comparing the page against the paper sheet must not see a calcium or sodium that is not on the paper presented as if it were (N5).

**Independent Test**: A sheet with Ca 6.2 · albumin 2.1. The expert view shows 6.2 as «روی برگه» and the albumin-corrected value as «اصلاح‌شده با آلبومین», never the corrected value alone.

**Acceptance Scenarios**:

1. **Given** a corrected calcium or sodium, **When** the expert view shows it, **Then** the as-printed value is shown first and the corrected value is labelled as derived.
2. **Given** an SI-to-conventional unit conversion, **When** the expert view shows the test, **Then** both numbers and both units are shown.
3. **Given** a derived index (eGFR, anion gap), **When** it is shown, **Then** it is labelled as calculated, not as a sheet value, and its precondition is stated (for example, eGFR is not valid during rhabdomyolysis).

---

### User Story 4 - Optional deeper interpretation per rule (Priority: P2)

For rules that carry an optional `pro` block, the expert view also shows its clinician-written cautions, differential and work-up. Rules with no `pro` block show nothing extra and nothing breaks.

**Why this priority**: The user wants a deeper interpretation, which does not exist in the engine today. This story delivers the slot, the rendering, and a first batch of about 20–30 of the most frequent rules; the remaining rules are added rule by rule over time.

**Independent Test**: Give one rule a `pro` block in a test fixture. The expert view shows its three sections. A rule without it shows none, and the page does not error.

**Acceptance Scenarios**:

1. **Given** a rule with `pro.cautions`, **When** the expert view renders its finding, **Then** the cautions appear under a «احتیاط‌ها» heading.
2. **Given** a rule without `pro`, **When** its finding renders, **Then** the finding still shows everything from Stories 1–3 and no empty section.
3. **Given** any `pro` text, **When** the suite runs, **Then** it passes the same Persian-language and engine-key guards as patient text, and is recorded in `MEDICAL_RULES.md` before use.

---

### User Story 5 - The switch is a convenience, never a source of truth (Priority: P2)

The chosen mode is remembered in the browser only. A new visit, or a browser with storage blocked, opens «ساده». The sheet score, urgency and every finding are the same in both modes.

**Why this priority**: The two modes are two views of one verdict. If they could disagree, the clinician and the patient would hold different results.

**Independent Test**: Compare the score value, `overall_urgency` and the list of finding ids with the switch on each side. They are identical.

**Acceptance Scenarios**:

1. **Given** storage is unavailable, **When** the page loads, **Then** it opens in «ساده» without error.
2. **Given** either mode, **When** the sheet score and the urgency banner are read, **Then** they are identical.
3. **Given** an older server response with none of the new fields, **When** the page is switched to «تخصصی», **Then** it shows what it can and says that detail is unavailable; it does not fail.

---

### User Story 6 - Inpatient wording carries over (Priority: P3)

For a patient marked as hospitalized (P99), the expert view shows the same inpatient action wording as the simple view and never reintroduces «اورژانس / مطب / وقت بگیرید».

**Why this priority**: The expert view reads the same findings; it must not undo the inpatient voice.

**Independent Test**: A hospitalized K 7.0 panel in the expert view contains no outpatient phrase.

**Acceptance Scenarios**:

1. **Given** a hospitalized patient, **When** the expert view shows each finding's recommended action, **Then** it is the inpatient sentence from the engine and contains none of the outpatient phrases.

---

### Edge Cases

- A sheet with no findings at all («همه در محدوده»): the expert view shows the graded values and units, no findings list, and says there are no findings.
- A finding hidden under an emergency blocker (`suppressed_ids`): the expert view lists it as hidden by name, so a clinician knows it was considered; it does not show its full text as if it were displayed to the patient.
- A supplementary finding («یافتهٔ تکمیلی»): shown in its compact form, labelled as supplementary.
- A row the engine could not grade (unit unknown, no range, impossible value): shown as «بدون حکم» with the printed value, never as normal (N4/N28).
- A finding addressing a patient in the second person («شما»): the expert view does not print the patient prose; it prints structured facts. Where a sentence is quoted, it is the engine's own text, unmodified.
- Neonate, child, pregnancy and geriatric profiles: the range shown is the one the engine used for that age band, labelled with its source.
- A rule id with no Persian name: it is not printed raw (N8/E2); it is omitted from the name column and the finding is identified by its headline.
- Very long sheets: the expert view is collapsible per finding and does not load all detail at once.
- Print: out of scope for this feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The result page MUST have a switch labelled «ساده» and «تخصصی». «ساده» MUST be the default and MUST render exactly as before.
- **FR-002**: The expert view MUST be produced only from the engine's own outputs (findings, graded tests, indices, guidelines, pre-analytical caveats, unit conversions). No language model MAY take part in producing it.
- **FR-003**: The server's response MUST carry the expert view's data as one structured field, built after the final selection and ordering of findings, so that it describes the findings the patient actually sees and names the hidden ones.
- **FR-004**: For each shown finding the expert view MUST show: its Persian name, its urgency, the triggering tests with value, unit and the engine's range, the sheet's printed range where the sheet printed one, the CTCAE grade and its source where one exists, and the rule's cited sources.
- **FR-005**: A source citation MUST appear only when the rule or the finding carries it. The expert view MUST NOT infer or add a source. A paywalled source MUST be shown through its open substitute, as `guidelines` already does.
- **FR-006**: The expert view MUST show suggested follow-up tests per finding and once for the whole sheet. A test already on the sheet MUST NOT be suggested. Each item MUST be a Persian test name.
- **FR-007**: A measured value, a converted value and a corrected or derived value MUST be shown in separate labelled places, and a derived value MUST state its precondition (N5).
- **FR-008**: No raw engine key (for example `HGB`, `BILI_T`) and no raw rule id MAY appear in the expert view. Every name MUST be a Persian label supplied by the server (N8).
- **FR-009**: The expert view MUST NOT introduce any threshold, range, urgency, score or timeline that is not already produced by the engine. The engine's urgency, `has_critical` and the sheet score MUST be identical in both modes.
- **FR-010**: A test or row the engine did not grade MUST appear as «بدون حکم» with its printed value; "not measured" and "normal" MUST stay distinct (Constitution II).
- **FR-011**: A rule MAY carry an optional `pro` block with `cautions`, `differential` and `workup`. A rule without it MUST render fully without error and without empty headings.
- **FR-019**: This feature MUST ship `pro` text for a first batch of about 20–30 of the most frequent rules, chosen by how often they fire in the engine's own sweep, and every other rule MUST keep working without it.
- **FR-012**: Any `pro` text MUST be Persian, MUST pass the same guards as patient text (encoding, language, no raw engine key, no outpatient wording for inpatients) and MUST be recorded in `MEDICAL_RULES.md` as a proposal for clinical review before it ships.
- **FR-013**: For a hospitalized patient (P99) the expert view MUST use the engine's inpatient action wording and MUST NOT contain «اورژانس», «مطب» or «وقت بگیرید».
- **FR-014**: The chosen mode MUST be stored only on the user's device, MUST be read and written defensively, and MUST fall back to «ساده» when storage is unavailable.
- **FR-015**: Against an older server response without the new field, the expert view MUST degrade to the data it has and state that detail is unavailable; it MUST NOT throw and MUST NOT show an empty page.
- **FR-016**: The findings hidden under a blocker, and the supplementary findings, MUST be identifiable in the expert view as such. A hidden finding MUST show its Persian name, triggering values and sources in a collapsed form, and MUST NOT show its action or warnings.
- **FR-020**: The expert view MUST show the sheet score's total and band and, read-only, each system's score, contributing tests, applied cap and lowest test, exactly as the server computed them. It MUST NOT recompute, re-weight or explain a formula.
- **FR-017**: The new field MUST NOT be sent to the language model, MUST NOT feed the prompt, and MUST NOT change `overall_urgency` or `has_critical`.
- **FR-018**: The new server field MUST be covered by tests that fail against the code without it (red first), including a sweep that no engine key or rule id leaks into it.

### Key Entities *(include if feature involves data)*

- **Expert finding**: one shown finding in expert form — rule label, urgency, triggering tests, ranges, grade, sources, suggested tests, optional `pro` block, and a flag for supplementary.
- **Trigger test**: a graded test that a finding reads — Persian name, printed value and unit, graded value and unit, engine range, printed range, grade, direction, and what converted or corrected it.
- **Hidden finding**: a finding the engine considered but did not show because a blocker covered it — Persian label only.
- **Derived value**: a calculated index (eGFR, anion gap, corrected Ca/Na) with its label and precondition.
- **Pro block**: optional clinician-facing text on a rule — cautions, differential, work-up.
- **View mode**: «ساده» or «تخصصی», a browser-local preference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a panel with PT 14 · INR 1.2, a clinician reaches the triggering values, both ranges, the urgency and the suggested tests with one switch action and no further navigation.
- **SC-002**: On a 100-panel sweep (every adult test key out of range in each direction), the expert view contains zero raw engine keys and zero raw rule ids.
- **SC-003**: For every sweep panel, the sheet score value, band, `overall_urgency` and `has_critical` are identical between the two modes.
- **SC-004**: For every sweep panel, no suggested test in the expert view is a test already measured on that sheet.
- **SC-005**: For every sweep panel with a corrected or converted value, the as-printed value is shown and the derived value is labelled; none is shown alone.
- **SC-006**: For hospitalized panels in the sweep, no outpatient phrase appears anywhere in the expert view.
- **SC-007**: Against a response from before this feature, the page switched to «تخصصی» renders without error and states what is unavailable.
- **SC-009**: At least 20 rules carry a `pro` block, each with at least one of cautions, differential or work-up; each is recorded in the clinical decision register as pending review.
- **SC-008**: Every source shown in the expert view is traceable to the rule or the registry; a spot check of 20 rules finds none that the registry does not hold.

## Assumptions

- The audience is clinical staff reading the same page a patient sees; there is no separate login or role in this feature. The switch is a view preference, not an access control.
- "Deeper interpretation" is delivered in two steps. Phase 1 (this feature) shows the structure behind each verdict — values, ranges, grades, sources, preconditions, suggested tests. Phase 2 adds the `pro` slot and a first batch of about 20–30 authored rules (clarified 2026-10-08). Authoring the remaining rules is ongoing work, not a gate for this feature.
- No clinical prose for clinicians exists in the engine today (measured), so any `pro` text is new clinical content and goes through `MEDICAL_RULES.md` as a proposal. The first batch is about 20–30 rules, named in the plan, and is the reviewer's to approve.
- The expert view reuses the engine's text where it quotes any, unmodified. It does not paraphrase and does not translate the patient prose into clinical register.
- The sheet score (P97) is unchanged and shown identically in both modes.
- The inpatient wording (P99) is already applied inside the findings, so the expert view inherits it by reading the same fields.
- The concurrent session's uncommitted `applyPrintedRange` work is the source of the printed-range text. If it is not committed when planning starts, the printed range is read from the graded tests' own fields instead.
- Print and export of the expert view, a separate login for staff, and per-hospital customisation are out of scope.
- Out of scope: any change to rule thresholds, urgencies, the prompt, the score formula, or the patient-facing simple view.
