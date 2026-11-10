# Feature Specification: Tumour-Marker Rules from Reference Chapter 20 (second pass)

**Feature Branch**: `020-tumor-marker-chapter20` (spec directory only; no git branch created)

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: a NotebookLM extraction of "chapter 20" (tumour markers) of a laboratory-medicine reference text — a table of thresholds, per-marker profiles for 12 markers (CEA, CA 19-9, CA 125, CA 15-3, AFP, hCG, PSA total/free, calcitonin, thyroglobulin, NSE, β2-microglobulin, LDH) plus a list of minor markers, 40 numbered IF-THEN rules, and a list of the source's own ambiguities. Goal: bring the clinical and diagnostic rules from it into the engine as new rules.

## Current Behaviour (what the spec starts from)

Read from the tree on 2026-11-10 (not re-run against the engine; counts are not quotable).

- Spec 019 (P122) already gave tumour markers a printed-range reader, a row in `_engine.tests`, exclusion from the sheet score, and sourced text — **only for `CEA`, `CA125`, `CA153`, `CA199`** (`TM_KEYS` in `khanesh-server/rules/tumor_markers.js`). Its register `MEDICAL_RULES_TUMOR_MARKERS.md` §2 marks AFP, PSA (total/free/ratio), β-hCG, thyroglobulin, calcitonin and HE4 as **«بدون قاعدهٔ بالینی — دست‌نخورده»** because no primary source was opened, and lists as open question 4 whether CA 19-9, AFP, B2M, calcitonin and CgA text stays unsourced or is removed.
- Names for AFP, B2M, calcitonin, CgA, PSA already exist in `serology.js`/`names.js`. AFP has two meanings (tumour marker vs. prenatal MoM screening, M105); hCG is routed to the pregnancy-test key.
- The extraction supplied here is **a secondary summary produced by a language model, not the book**. The previous round (N46) found that a summariser's "verbatim" quotes were absent from the raw text. Every quotation in the extraction is therefore unverified until compared with the raw chapter.

## Clarifications

### Session 2026-11-10

- Q: Can text taken from this chapter reach patients before a human clinical reviewer approves it? → A: Mixed. Code changes only for printed-range reading, the row in the extracted-tests output, and sex-mismatch flags; all clinical wording and thresholds stay register-only until a reviewer approves.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every number and quote taken from the chapter is checked against the chapter's own text before it can reach a patient (Priority: P1)

A maintainer receives the extraction and must know which of its claims are the book's words and which are the summariser's. Nothing patient-facing is derived from a claim until it has been matched to the raw text.

**Why this priority**: it is the precondition for all other stories. A wrong threshold here becomes a wrong sentence on a patient's screen (N46, N39).

**Independent Test**: take any rule from the extraction and trace it to a page and a raw sentence; the register shows "verified" or "not found" for every one of the 40 rules and every table row.

**Acceptance Scenarios**:

1. **Given** the 40 numbered rules and the threshold table, **When** each is compared with the raw chapter, **Then** each is recorded as verified (with the raw sentence), corrected (with the difference), or not found.
2. **Given** a claim marked "not found", **When** the feature is delivered, **Then** it appears nowhere in patient-facing text.
3. **Given** the extraction's own list of source contradictions (AFP unit conversion factors, the ±25 % versus 30 % change criteria, mesothelioma listed as non-malignant, CA 125 surveillance), **When** the register is written, **Then** each is carried over as an open item, not silently resolved.

---

### User Story 2 - A sheet with AFP, PSA or another chapter marker gets a correct printed-range reading (Priority: P2)

A patient uploads a sheet containing a tumour marker that the engine currently reads without a row of its own. The result shows a row stating, from the sheet's own printed range, whether the value is inside or outside it, or that no range was printed. No clinical sentence from the chapter (benign causes, next tests, thresholds, prognosis) is added in this feature; those are proposals in the register awaiting a reviewer.

**Why this priority**: it is the user-visible gain, but it can only follow Story 1.

**Independent Test**: feed realistic panels containing each in-scope marker, with and without a printed range, and read the Persian output.

**Acceptance Scenarios**:

1. **Given** PSA 6.2 with printed range «< 4.0», **When** analysed, **Then** the row is shown as above the printed range and no chapter-derived clinical sentence appears.
2. **Given** AFP with no printed range on a non-pregnant adult, **When** analysed, **Then** no range is invented and the row says no range was printed, as for the four existing markers.
3. **Given** the same name «AFP» on a prenatal sheet in MoM, **When** analysed, **Then** the prenatal path still owns it and no tumour-marker row appears.
4. **Given** a marker with no printed range and no verified chapter text, **When** analysed, **Then** it has a row with no verdict and no clinical sentence.

---

### User Story 3 - Rules that depend on facts a single sheet cannot supply are not guessed (Priority: P2)

Many of the 40 rules need context the engine does not have: a previous value, post-operative state, a symptom, imaging, histology or the Lewis phenotype. The patient is never told something that depends on such a fact unless the fact is present.

**Why this priority**: telling a patient about a situation they are not in (N4) is the failure this protects against.

**Independent Test**: for each such rule, a test shows that without the fact the text is absent or is phrased as a question for the physician, and with the fact present (where the engine accepts it) the text appears.

**Acceptance Scenarios**:

1. **Given** PSA 0.3 on a sheet with no stated history, **When** analysed, **Then** nothing is said about "recurrence after prostatectomy".
2. **Given** two dated values of the same marker, **When** analysed, **Then** no change-significance sentence is produced; the chapter's percentage criteria (and their contradiction) are recorded in the register only.
3. **Given** PSA on a female profile, **When** analysed, **Then** the row keeps its printed-range verdict and additionally carries a sex-mismatch flag and sentence; CA 125 on a male profile gets no flag.

---

### User Story 4 - Everything is recorded for a human reviewer and nothing is claimed as approved (Priority: P3)

A clinical reviewer opens one register and sees every proposed change: the number, the text, the source sentence, the patient impact and the decision still needed.

**Why this priority**: project rule — a threshold or clinical rule change needs a recorded reviewer entry in the same commit as its behaviour (N37).

**Independent Test**: for every behaviour change in the diff, a register entry with a P-number exists in the same commit.

**Acceptance Scenarios**:

1. **Given** the delivered change, **When** the register is read, **Then** each new behaviour has an entry with proposal, source sentence, page and patient impact.
2. **Given** a rule excluded as out of scope or unverified, **When** the register is read, **Then** it is listed with the reason.

---

### Edge Cases

- A marker value printed in a unit the chapter does not state (no unit and no conversion in the source for calcitonin, thyroglobulin, NSE, B2M, LDH, CgA, HE4): the value is read against the printed range only and no conversion is made.
- AFP conversions between µg/L and kU/L: the source's own factors disagree slightly (≈0.85 and ≈0.83); no conversion is applied unless the sheet prints both.
- hCG very large values (hook effect, carry-over): a single high value must not be read as "low"; whether the engine can see a dilution is unknown.
- A tumour marker on a sheet for a child or newborn (AFP is physiologically high until about 6–12 months): no adult reading.
- PSA or CA 125 on a patient of the wrong sex.
- Sample taken after a procedure that raises the marker (rectal exam, catheter, biopsy, menstruation, surgery): the sheet rarely states it; the text may only warn, never discount a high value (existing rule: pre-analytical caveats never lower urgency).
- LDH is already a general chemistry test; a tumour-marker reading of it must not change its existing grading.
- The chapter's "reject the request" statements (panel requests, PSA in women, CA 125 in men) are guidance to laboratories, not instructions to a patient.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every claim imported from the chapter MUST be matched to a raw sentence in the chapter text and recorded as verified, corrected or not found before it is used in any patient-facing sentence or threshold.
- **FR-002**: The extraction's quotations MUST NOT be treated as verbatim; only the raw chapter text counts as the source.
- **FR-003**: The system MUST NOT invent a reference range for any chapter marker; the printed range on the sheet is the reference, as in the four existing markers.
- **FR-004**: For each in-scope marker the system MUST produce a row in the extracted-tests output with a verdict state of its own (inside, outside, or no verdict), consistent with the existing four markers, and MUST NOT count it in the sheet score.
- **FR-005**: This feature MUST NOT add patient-facing clinical wording derived from the chapter (benign causes, next tests, thresholds, prognosis, change criteria). Such wording exists only as register proposals until a reviewer approves it.
- **FR-006**: Rules whose condition needs data the engine lacks (previous value, surgery or treatment state, symptoms, imaging, histology, phenotype, gestational age) MUST NOT fire without that data.
- **FR-007**: A PSA row (total, free or ratio) on a patient whose engine-recorded sex is female MUST carry a mismatch flag and one sentence asking the patient to check the sheet/profile, **in addition to** its printed-range verdict; the verdict and urgency are not suppressed (Principle II). CA 125 in a male is not flagged in this feature (it has non-gynaecological uses; the chapter's sentence is laboratory request guidance) and goes to the register. *(Amended at planning, 2026-11-10 — research.md R4.)*
- **FR-008**: The prenatal reading of AFP/hCG MUST remain unchanged; the tumour-marker path MUST NOT claim a row that the prenatal path owns.
- **FR-009**: Thresholds quoted in the chapter (for example 130 kU/L, 35 kU/L, 65 kU/L, 500 kU/L, 20 µg/L, 200 µg/L, 1200 µg/L, 0.2 µg/L, 2.0 µg/L, 15 months) MUST NOT appear in code in this feature; they are recorded in the register only, and none may replace a printed range.
- **FR-010**: No new text MAY raise or lower the urgency of a sheet on the strength of a chapter threshold unless the register records that urgency as a reviewer decision.
- **FR-011**: The extraction's list of source contradictions MUST be carried into the register as open items.
- **FR-012**: Every behaviour change MUST land in the same commit as its register entry (P-number allocated first), and a regression test MUST fail on the pre-change code.
- **FR-013**: Rules judged out of scope by FR-006 MUST be listed in the register with the missing input named, so a later feature can pick them up when that input exists.
- **FR-014**: Code changes in this feature are limited to (a) reading each in-scope marker's printed range, (b) its row in the extracted-tests output, and (c) the sex-mismatch flag of FR-007. Everything else from the chapter is delivered as register proposals only (Clarifications, 2026-11-10).

### Key Entities

- **Chapter claim**: one threshold, rule or caveat from the extraction, with its raw-text sentence, page, verification state and the engine input it needs.
- **Tumour-marker row**: a marker's value, printed range, unit and verdict state as shown in the extracted-tests output.
- **Register entry**: a P-numbered proposal with source sentence, page, patient impact and reviewer decision still needed.
- **Open source contradiction**: a place where the chapter disagrees with itself, carried unresolved.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % of the 40 extracted rules and every table row have a recorded state (verified, corrected, not found) with a raw-text sentence for the first two.
- **SC-002**: 0 patient-facing sentences or constants derive from any chapter claim, verified or not (this feature adds none).
- **SC-003**: For each in-scope marker, a panel with a printed range and one without both produce the correct row and the correct "no range printed" wording in a reviewed set of fixtures.
- **SC-004**: 0 chapter-rule sentences appear on any fixture sheet lacking the context that rule needs (checked rule by rule).
- **SC-005**: The existing prenatal fixtures and the existing four-marker fixtures produce unchanged output, and the full backend test suite passes.
- **SC-006**: A reviewer can read one register and find, for every behaviour change, the source sentence and the patient impact without opening the code.

## Assumptions

- The raw chapter text will be supplied (or can be reached) so FR-001 can be done; without it the feature delivers only the register and no code. The book title and edition are not given in the input.
- "Chapter 20" is from one book; its numbers are one source's view and may differ from the NACB/EGTM sources used in spec 019. Where they differ, both are recorded and neither wins silently.
- Ordering by value: markers whose rule is a single sheet (printed range plus sex/age) come first; rules needing history, imaging, surgery, symptoms, phenotype or assay identity are deferred, not approximated.
- The extraction's laboratory-management guidance (internal quality control levels, carry-over, dilution practice) concerns the laboratory, not the patient, and is out of scope for patient text.
- Screening and diagnostic claims for the general public are not made for any marker; the chapter's rejection of screening is the only screening statement used.
- Out of scope: new graph-agent behaviour, expert-view layout changes, frontend range tables (`labRefs.js` is a separate copy and is only touched if a range actually changes).
