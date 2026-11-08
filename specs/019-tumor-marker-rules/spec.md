# Feature Specification: Tumour-Marker Clinical Rules (CEA, CA 125, CA 15-3 and family)

**Feature Branch**: `019-tumor-marker-rules` (spec directory only; no git branch created)

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: bring the clinical rules of tumour markers into the engine on the basis of the latest guidelines. Live defect (real sheet, OCR correct): «C.E.A 27.97 ng/mL — printed "Non smoker: < 5   Smokers: < 10"», «CA 125 10.3 U/mL — printed "0-35"», «CA 15-3 11.6 U/mL — printed "At or below: 31.0"»; the interpretation said «بازهٔ مرجع روی همان ردیف خوانده نشد». Two-phase task: Phase 1 = sourced research table (before any code), Phase 2 = execution from that table. Golden rule: no threshold or clinical rule from memory; if primary sources cannot be reached, stop and say so.

## Current Behaviour (measured facts the spec starts from)

Measured 2026-11-08 on the working tree (branch `main`, `HEAD` = `8c15edf` + uncommitted changes), 45-year-old female profile, by calling the engine directly. **The request's premise is partly wrong, and this table is why the scope below is narrower than "tumour markers are not mapped".**

| Input (name · value · printed range) | Engine output today |
|---|---|
| `C.E.A` · 27.97 ng/mL · «Non smoker: < 5   Smokers: < 10» | mapped to `CEA`, but lands in `ungraded`; printed range **not read** → «بازهٔ مرجعِ چاپ‌شده روی همان ردیف خوانده نشد، … برگه را به پزشک نشان دهید» |
| `CA 125` · 10.3 U/mL · «0-35» | mapped to `CA125`, printed range **read** → «داخلِ محدودهٔ چاپ‌شدهٔ همان ردیف است» (the request listed this row as a failure; it is not) |
| `CA 15-3` · 11.6 U/mL · «At or below: 31.0» | mapped to `CA153`, printed range **not read** → same «خوانده نشد» sentence |
| same three + Vitamin D 53.61 | only `VIT_D` is in `graded`; the three tumour markers are in `ungraded`, finding `tumor_markers_result`, urgency `routine` |
| `CEA` · 27.97 · «< 5» (simple range) | in `ungraded`; finding says «بالاتر از مرزِ چاپ‌شده»; **urgency `this_week`** |
| `CA 19-9` · 50 · «< 37» | same path; urgency `this_week` |
| any tumour marker with no printed range | «محدودهٔ مرجع روی همان ردیف چاپ نشده» (correct wording for that case) |

What this means:

- Tumour markers are **already in the engine** (P77, 2026-10-04): names in the serology reader, an aggregate pattern `tumor_markers_result`, per-marker Persian caveats («CEA ابزارِ غربالگری … نیست»). They have no engine reference range, no grade, and are not in `graded`, hence not in `_engine.tests`.
- P77's own register entry says its **primary sources were never opened** and it has **no human reviewer sign-off**. This feature's research phase is therefore not a re-check of verified content; it is the first sourced pass.
- The genuinely failing behaviours are: (a) two-band printed range with smoker/non-smoker labels; (b) the «At or below: N» phrasing; (c) tumour-marker rows never appear in `_engine.tests`, so the app cannot show a row for them; (d) the existing `this_week` urgency above a printed bound has no recorded source.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The printed range on my sheet is read, whatever its wording (Priority: P1)

A patient photographs a sheet where CEA is printed with separate non-smoker and smoker limits, and CA 15-3 with «At or below: 31.0». They get a verdict against the range the lab printed, not «range not read».

**Why this priority**: This is the live defect. A sheet whose range is printed but unread tells the patient "we can't say" about numbers the lab already judged; for CEA 27.97 it hides a value ~5× above the highest printed limit.

**Independent Test**: Feed the three live rows through the engine; CEA 27.97 and CA 15-3 11.6 each get a verdict (above / within), CA 125 10.3 stays «within»; no «خوانده نشد» sentence appears for any of the three.

**Acceptance Scenarios**:

1. **Given** CEA 27.97 ng/mL with printed «Non smoker: < 5   Smokers: < 10», **When** interpreted, **Then** the value is reported as above both printed limits, and the text states which limits were applied.
2. **Given** CA 15-3 11.6 U/mL with «At or below: 31.0», **When** interpreted, **Then** it is reported as within the printed range (boundary: exactly 31.0 is within; 31.1 is above).
3. **Given** CA 125 10.3 U/mL with «0-35», **When** interpreted, **Then** it is within range, as today.
4. **Given** the range forms «< 35», «up to 35», «≤ 35», «0-35», «At or below: 31.0», **When** each is printed beside a marker, **Then** each is read to the same boundary semantics the sheet states (strict `<` vs inclusive «at or below / up to / ≤» are not interchangeable).
5. **Given** a range text the engine truly cannot parse, **When** interpreted, **Then** the «could not read the range» sentence still appears — and appears **only** in that case (never when the range was printed and parseable).

---

### User Story 2 - CEA with smoker and non-smoker limits is never silently guessed (Priority: P1)

The patient's smoking status is not known to the engine. CEA must be judged without a hidden assumption.

**Why this priority**: The printed ranges differ by 2×. Picking one silently would either flag healthy smokers or reassure unflagged non-smokers.

**Independent Test**: CEA at 3, 7 and 12 against «Non smoker: < 5   Smokers: < 10» gives three different, explicit outcomes.

**Acceptance Scenarios**:

1. **Given** CEA below the lower printed limit, **When** interpreted, **Then** it is within range for both groups, said once.
2. **Given** CEA between the two limits (e.g. 7), **When** interpreted, **Then** the text says it is above the non-smoker limit and within the smoker limit, that the engine does not know the patient's smoking status, and that the answer depends on it — it is not flagged as abnormal for everyone.
3. **Given** CEA above the higher limit, **When** interpreted, **Then** it is above range for both groups.
4. **Given** a smoking status is available in future input, **When** present, **Then** the matching limit is used; absent, the three-band behaviour above applies (no new profile field is introduced by this feature).

---

### User Story 3 - Tumour-marker rows appear in the result list, with or without a range (Priority: P1)

The app shows each extracted number with a status. A tumour marker with a verdict shows it; one with no usable range shows «بدون محدوده مرجع», not a missing row.

**Why this priority**: Today the three markers are invisible in `_engine.tests`, so the result screen cannot give them a row at all.

**Independent Test**: The live sheet's response lists CEA, CA 125 and CA 15-3 in `_engine.tests` with Persian names; a marker with no printed range is a row with no verdict fields.

**Acceptance Scenarios**:

1. **Given** the live sheet, **When** the response is built, **Then** `_engine.tests` includes the three markers with `name` (Persian), `value`, the range used and its source (`printed`), and a verdict consistent with the research table.
2. **Given** a marker with no printed range and no source-backed default, **When** the response is built, **Then** its row has no abnormal/direction/level fields and the app can render «بدون محدوده مرجع».
3. **Given** the existing response contract, **When** these rows are added, **Then** no existing field changes meaning; an older client that ignores them still works.

---

### User Story 4 - What the patient is told is sourced, calm and non-diagnostic (Priority: P1)

The text says a tumour marker is not a screening test for people without symptoms, that a result outside the range neither diagnoses nor excludes cancer, which non-cancer conditions raise it (only those a source states), and to show the sheet to a doctor.

**Why this priority**: Constitution Principle I/II — the engine decides; wrong or frightening wording on a cancer marker is a patient-safety defect.

**Independent Test**: Read the generated Persian for each of the three markers, in range and out of range; confirm no diagnosis wording, no emergency wording, and that every clinical claim has a row in the research table.

**Acceptance Scenarios**:

1. **Given** any tumour-marker result, **When** the report is built, **Then** `has_critical` is false and urgency is never `emergency` unless a cited source explicitly says so (none is expected to).
2. **Given** a result above range, **When** the text is written, **Then** it states it does not mean cancer, names the benign causes the sources list, and recommends discussing it with a doctor.
3. **Given** a known-cancer profile (`cancer` condition), **When** a marker is reported, **Then** the text may mention monitoring use but does not alter the verdict.

---

### User Story 5 - Phase 1: a sourced research table exists before any rule changes (Priority: P1)

A reviewer can open one file and see, per marker, the use, reference range (with kit/sex/age/smoking dependence), adjustments, false-positive causes, units, and the exact source (name, year, URL/PMID, section) behind each rule — and which markers have **no** citable source.

**Why this priority**: This is the golden rule and the precondition of everything else. P77 shipped without opened sources; this must not repeat.

**Independent Test**: The table exists in the repo next to `MEDICAL_RULES.md`; every row either cites a source that was opened in the session or is marked «بدون قاعدهٔ بالینی»; priority markers (CEA, CA 125, CA 15-3) are filled; no cell is unsourced.

**Acceptance Scenarios**:

1. **Given** primary sources are reachable, **When** the research runs, **Then** each cited guideline records its version and year (NACB/AACC, EGTM, ASCO, NCCN, ESMO, ACOG/SGO, manufacturer package inserts for Roche/Abbott/Siemens where used).
2. **Given** a source cannot be opened (paywall, fetch blocked, no web access), **When** a row depends on it, **Then** that row is marked «بدون قاعدهٔ بالینی» and stays observational (no-range row), and the final report lists it under "could not verify".
3. **Given** web/PubMed access is unavailable for the session as a whole, **When** research begins, **Then** work stops and says so; no number is written from memory.
4. **Given** a marker beyond the three required (CA 19-9, AFP, PSA total/free/ratio, β-hCG, thyroglobulin, calcitonin, HE4), **When** no clear source is found, **Then** it is not given a rule — only the observational row.

---

### User Story 6 - Tumour markers stay out of the health score and biological age (Priority: P2)

**Why this priority**: These markers do not belong in a general wellness score; including them would let an unscreened, non-diagnostic number move a patient-facing score.

**Independent Test**: Adding the three markers to a normal panel changes neither the sheet score nor the biological-age estimate; the report states where and why they are excluded.

**Acceptance Scenarios**:

1. **Given** a panel with tumour markers, **When** the score is computed, **Then** they contribute nothing unless a cited source requires otherwise (default: excluded, reason recorded).

---

### Edge Cases

- **Printed range on a different unit** (e.g. µg/L vs ng/mL; kU/L vs U/mL): equivalent units compare directly; a genuinely different unit follows the existing unit rules (no guessing).
- **CA 125 physiology**: menstruation, pregnancy, endometriosis, ascites, pelvic inflammation raise it; the text names only those the sources state, and an elevated value in a premenopausal patient is not worded as suspicious on its own.
- **CA 19-9 in Lewis-negative patients**: a "normal" value is not reassuring; wording must not imply it is.
- **PSA**: total/free/ratio interplay, age- and 5-ARI-dependent interpretation exist only if a source is opened; otherwise observational.
- **AFP**: two meanings (tumour marker vs prenatal MoM) — the existing disambiguation (prenatal spec 013) must keep working; an AFP row on a pregnant profile must not become a cancer-marker statement.
- **Boundary values**: exactly on the printed limit, one least-significant unit above and below, for both strict («<») and inclusive («at or below») wordings.
- **Several markers, one printed range string shared across lines** (OCR merges): each marker uses only the range on its own row.
- **Footnote marks in the name** («CEA(*1)», «CA 125†») must not break the match (already fixed in `8c15edf`; must keep working).
- **Sheet with only tumour markers**: must not fall to the "uninterpreted" result.
- **Existing `this_week` urgency above a printed bound**: no recorded source (P77). It is kept unchanged and flagged for the reviewer; it is neither silently kept as "verified" nor silently lowered.
- **A row with no verdict must never look normal**: the result screen today shows any row whose `abnormal` is falsy as «در محدوده». A no-range or between-bands tumour marker must render as «بدون محدوده مرجع» / «بسته به سیگاری بودن», not as in-range (Constitution Principle II).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST complete the Phase 1 research table before changing any rule, threshold or patient text, and MUST NOT write any clinical threshold or rule from memory.
- **FR-002**: If primary sources cannot be reached in the session, the system MUST stop and report that, rather than proceed on recollection.
- **FR-003**: The Phase 1 table MUST list, per marker: use (screening / monitoring / treatment follow-up), reference range with kit-, sex-, age- and smoking-dependence, adjustments, false-positive causes, action thresholds if any, units/conversions, source (name, year, URL/PMID, section), and the code decision. Rows without a citable source MUST be marked «بدون قاعدهٔ بالینی».
- **FR-004**: CEA, CA 125 and CA 15-3 MUST be covered; CA 19-9, AFP, PSA (total/free/ratio), β-hCG, thyroglobulin, calcitonin and HE4 MUST be covered only where a clear source exists.
- **FR-005**: The printed range on the sheet row MUST take precedence over any default range, for kit-dependent markers.
- **FR-006**: The range reader MUST accept at least: «< N», «up to N», «≤ N», «0-N», «At or below: N», and a two-band «Non smoker: < A   Smokers: < B», preserving strict vs inclusive boundary semantics as printed (measured today: CEA 5 against «< 5» is read as *within*, i.e. strict `<` is treated as `≤`). The two-band form MUST be recognised whatever separator the sheet uses (spaces, `/`, `;`, `|`, `،`, line break, «Non-smoker <5 Smoker <10»); today the `/ ; | ،` forms silently keep only the first band (CEA 7 → *above*) and the space/newline forms are unread.
- **FR-006b**: A labelled multi-band range MUST never be reduced to its first parseable band; if it cannot be read as a whole it is reported as unreadable, not guessed.
- **FR-007**: For a two-band CEA range with unknown smoking status, the system MUST apply the three-band behaviour of User Story 2 explicitly and say in the text that smoking status was not known; it MUST NOT silently choose one band. No new profile field is added by this feature.
- **FR-008**: Marker names MUST map from the common spellings (including «C.E.A», «Carcinoembryonic Antigen», «CA-125», «CA125», «Cancer Antigen 125», «CA15.3», «CA 15 3», «CA 19-9» and Persian equivalents) with exact/normalised matching only; no fuzzy guessing.
- **FR-009**: Each marker MUST have a Persian display name; no raw engine key may reach the patient.
- **FR-010**: Tumour-marker rows MUST appear in `_engine.tests`; a marker with no usable range MUST appear as a row without a verdict. Any change to the response contract MUST be the smallest backward-compatible one, with the reason written down.
- **FR-011**: The sentence «بازهٔ مرجع روی همان ردیف خوانده نشد» MUST appear only when the range was truly unreadable; the no-range sentence only when none was printed.
- **FR-012**: A tumour marker MUST NOT set `has_critical` nor produce `emergency` urgency unless a cited source explicitly requires it. The existing `this_week` urgency for a marker above its printed range is recorded in P77 as «بی‌منبع؛ پیشنهادِ من» with reviewer questions still open; this feature MUST NOT change it silently — it stays as is, is re-listed as an open reviewer question in the new register entry, and any change needs a cited source plus a named user decision.
- **FR-013**: Patient text MUST be Persian, simple and non-alarming; MUST say the result neither diagnoses nor excludes cancer; MUST say the marker is not a screening test for people without symptoms where the sources say so; MUST list non-cancer causes only as stated by sources; MUST recommend discussing with a doctor.
- **FR-014**: Tumour markers MUST be excluded from the health score and biological-age estimate by default; where and why MUST be recorded.
- **FR-015**: Every threshold, range or rule added MUST be recorded in the clinical decision register (`MEDICAL_RULES.md`, next free `P` number) in the same commit as its behaviour, marked as pending human review.
- **FR-016**: Tests MUST cover, per marker: boundaries (on the threshold, one unit above/below), smoker/non-smoker adjustment, synonym names, the printed-range wordings above, and an end-to-end test of the live sheet (CEA 27.97 under all three smoking-knowledge cases, CA 125 10.3, CA 15-3 11.6). Each new test MUST fail against the pre-change code.
- **FR-017**: The full backend suite MUST be run before and after with real output recorded; any byte-for-byte freeze test that changes MUST be explained as intentional, not silently re-baselined.
- **FR-018**: The work MUST end in a separate, clearly described commit containing only this feature's hunks (the tree is shared with other uncommitted work), with no push and no deploy.
- **FR-019**: Every reader of `_engine.tests` on the result screen MUST treat a row with no verdict as a distinct, non-normal, non-alarming state; verified by reading each consumer and by `npm run lint` in the frontend.
- **FR-020**: Name matching for the required markers MUST be verified by probing every synonym in the request (and the Persian names seen on real sheets), recording which map and which stay «تفسیر نشد»; unmatched spellings are listed, not fuzzily guessed.

### Key Entities

- **Tumour marker**: a lab analyte used for monitoring (rarely screening) of a malignancy; has a Persian name, units, optional source-backed default range, and printed range per sheet.
- **Printed range**: the reference text beside a specific row; one or more bands, each with a boundary type (strict / inclusive) and an optional population label (e.g. smoker).
- **Research table row**: marker × use × range × adjustments × source × code decision; the audit trail for every rule.
- **Marker row (in the result)**: name, value, unit, range used and its source, optional verdict; absent verdict means "no range".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the live sheet, 0 of the 3 tumour-marker rows produce the «range not read» sentence, and 3 of 3 appear in the result list with a Persian name.
- **SC-002**: For every supported printed-range wording, boundary tests pass at the limit, one unit below and one unit above (100% of the boundary cases listed in the research table).
- **SC-003**: For CEA with a two-band printed range, 100% of the three value regions (below both, between, above both) produce distinct, explicit outcomes with no unstated smoking-status assumption.
- **SC-004**: 0 tumour-marker results set `has_critical` or `emergency` urgency across the whole test set.
- **SC-005**: 100% of clinical claims in the new patient text trace to a row in the research table with an opened source; 0 claims from memory.
- **SC-006**: Adding tumour markers to any existing test panel changes its health score and biological-age output by 0.
- **SC-007**: The backend suite runs with 0 newly failing tests that are not individually explained as intentional.

## Assumptions

- The three required markers are already mapped and routed (P77); this feature fixes range reading, row visibility, sourcing and wording rather than re-adding names.
- No smoking field exists in the profile (conditions list has none); adding one is a privacy/UX decision outside this feature, so unknown smoking status is handled by the explicit three-band rule.
- Printed range is authoritative for kit-dependent markers; a source-backed default range is added only where the research table justifies one.
- Web / PubMed access may be unavailable or partial in a session; the golden rule makes that a stop-and-report condition, not a reason to estimate.
- Existing prenatal handling of AFP (spec 013) and the footnote-mark fix (`8c15edf`) are kept and regression-guarded.
- The result contract is extended, if at all, only additively (rows in `_engine.tests` without verdict fields).
- Dependencies: `MEDICAL_RULES.md` register; the five-file "add a test" checklist; pre-commit hook (runs backend tests on the index).
- Out of scope: new profile questions, frontend redesign beyond rendering the existing «بدون محدوده مرجع» state, push/deploy.
