# Feature Specification: Leukocyte Differential, Morphology-Flag and MPN-Threshold Rules (Henry's, pasted 2026-09-25)

**Feature Branch**: `recovery` (no branch hook; spec directory is independent, per specs/007–008 convention)

**Created**: 2026-09-25

**Status**: Clarified — thresholds go straight to `MEDICAL_RULES.md` pending-review, Story 2 (free-text
morphology/blasts) is in scope and built now, Story 3 (CML-vs-leukemoid wording refinement) is dropped — ready for
`/speckit-plan`

**Input**: User description (Persian instruction + a pasted Markdown clinical reference, no named source):
«قواعد بالا در موتور قواعد اجرا کن، فیوچرز جدید موارد تکراری با این منبع جایگزین کن» — implement the rules above in the
rules engine; for anything new, replace duplicates with this source. The pasted document is titled "Clinical Laboratory
Reference Data & Decision Logic for Hematologic Interpretation Engine (v2.0)", structured as four sections: (1)
demographic/age-stratified reference ranges for WBC, ANC, ALC, monocytes, eosinophils, basophils, and PV/ET platelet
thresholds; (2) algorithmic decision trees for severe leukocytosis (CML/leukemoid reaction/CNL), acute leukemia vs. MDS
by blast percentage, and CMML subtyping; (3) a morphology table (toxic granulation, Döhle bodies, May-Hegglin,
Alder-Reilly, Pelger-Huët and pseudo-Pelger-Huët, Chédiak-Higashi, ring sideroblasts, Auer rods); (4) an
immunophenotype/molecular matrix for MPNs, mature B-cell/plasma-cell neoplasms, and cytogenetic AML subtypes (CD
markers, BCR-ABL1, JAK2/CALR/MPL, FISH translocations).

## Provenance of the input — read before using any number in it

The input names no source document and carries inline numbered citations (`[1]`–`[58]`) with no bibliography — the same
"AI-generated extract of unverified origin" class as the specs/007 and specs/008 inputs. Under the constitution's
*Clinical Change Constraints*, every threshold adopted from it is a proposal until the user, acting as clinical
reviewer, approves it in `MEDICAL_RULES.md` (the `P` register), and any code that lands must carry the same
non-claim source line already used for specs/007–008: «تأییدِ کاربر؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم» —
never cite it as Henry's or any other named textbook.

## Context: what the engine already does — measured, not assumed

Measured 2026-09-25 with `.claude/skills/clinical-knowledge-extraction/scripts/engine-inventory.mjs --search <term>`
against the working tree at `0d8c782` (144 rules).

### Duplicates — excluded from scope (zero code change)

| Input item | Engine today | Verdict |
|---|---|---|
| WBC 4.0–11.0 ×10³/µL adult | `ADULT_REFS.WBC` [4, 11] | duplicate |
| ANC 1.8–7.0 ×10⁹/L; mild 1.0–1.5, moderate 0.5–1.0, severe (SCN) < 0.5, agranulocytosis < 0.2–0.5 | `NEUT_ABS` graded via CTCAE + `mild_neutropenia`/`severe_neutropenia` (P54, pending) | duplicate in substance — banding differs slightly, not a new decision |
| ALC 1.5–4.0 ×10⁹/L adult, wider in children | `LYMPH_ABS` graded, `viral_lymphocytosis` reads the high side | duplicate on the range; **lymphopenia has no rule** — pre-existing gap noted in `note.md`, not introduced by this input |
| Ethnic ANC lower-limit variants (Black/African-descent adults ~1.2–1.3) | none | **new**, but the engine has no ethnicity input anywhere (`adapter.js` reads age/sex only) — out of scope unless the user adds that input, which is a much larger product change than this spec covers |
| Kostmann syndrome / SCN as a named diagnosis | none (ANC < 0.2 already reads as `severe_neutropenia` numerically) | the *number* is a duplicate of the SCN severity band; the *name* is a diagnosis label — see Diagnosis-labeling boundary below |
| CML: `t(9;22) BCR-ABL1`, immunophenotype (CD13/33/117/MPO+) | `cml_suspicion` exists in `patterns_malignancy.js` (numeric/morphologic trigger only, no genetic confirmation) | **decided out of scope**: refining `cml_suspicion`'s wording against §2.1's decision tree (formerly Story 3) is dropped — the rule already exists and already triggers on severe leukocytosis; the genetic/immunophenotype confirmation itself is out of scope regardless (§ Diagnosis-labeling boundary) |
| Erythrocytosis / PV | `erythrocytosis` rule exists (Hb-based) | the input's exact WHO PV cut-offs (Hb > 16.5 M / > 16.0 F) may differ from the engine's current threshold — needs a side-by-side check in planning, not assumed identical |

### Genuinely new to the engine (no rule, no reference range, confirmed via `--search`)

`leukemoid` (leukemoid reaction), `auer` (Auer rods), `blast` (blast percentage / blast count), `toxic granulation`,
`dohle` (Döhle bodies), `pelger` (Pelger-Huët / pseudo-Pelger-Huët), `polycythemia` search text (though `erythrocytosis`
exists under a different name), monocytosis/monocytopenia thresholds (`MONO_ABS` is graded but has no rule reading it
directionally other than gammopathy findings), eosinophilia/hypereosinophilia thresholds (`EOS_ABS` is graded, no rule),
basophilia thresholds (`BASO_ABS` is graded, referenced only inside malignancy gammopathy findings, not on its own),
ET platelet threshold as its own named criterion (PLT ≥ 450 is graded via CTCAE severity but not tied to an ET label),
May-Hegglin/Alder-Reilly/Chédiak-Higashi anomalies, ring sideroblasts, CMML/MDS/AML subtyping trees, and the entire
immunophenotype/molecular/cytogenetic matrix (§4 of the input).

## Diagnosis-labeling boundary — what this feature can and cannot do, and why

This is the load-bearing scoping decision for the whole feature, made explicit here because the user's instruction did
not draw this line and the input conflates several very different kinds of clinical information.

**In scope — numeric and free-text-morphology findings extractable from an OCR'd CBC-with-differential report:**
the engine already grades numeric analytes (WBC, ANC, ALC, MONO_ABS, EOS_ABS, BASO_ABS, PLT) from OCR'd lab-sheet
numbers via `adapter.js` → `refs.js`/`ctcae.js`, exactly like every other test in `khanesh-server/rules/`. A CBC
differential report can also carry short free-text morphology remarks from the pathologist/analyzer (e.g. "Toxic
granulation present", "Blasts 3%", "Auer rods seen") in the same way a urinalysis report carries free-text microscopy
remarks — and `patterns_urine_casts.js`/`patterns_urinalysis.js` already establish the architectural pattern for
reading a qualitative/free-text row that isn't a graded number (N25 in `CLAUDE.md`: a row's identity is `(page kind,
name)`, and rows without a reader must not be silently dropped — N18). This spec extends that same pattern to a CBC
differential page: new numeric thresholds for monocytosis/monocytopenia/eosinophilia/hypereosinophilia/basophilia/ET,
and new qualitative findings for blast percentage and named morphologic anomalies that are stated as plain text on the
report (present/absent, or a percentage for blasts).

**Out of scope — this feature does not, and structurally cannot, implement:**
1. **Immunophenotype and cytogenetic/molecular confirmation** (§4 of the input: CD-marker panels, flow cytometry,
   `BCR-ABL1`/`JAK2`/`CALR`/`MPL`/FISH translocations, IgH rearrangements). These come from bone-marrow biopsy, flow
   cytometry, and molecular-genetics reports — entirely different documents from a CBC, with no adapter, no
   `NAME_MAP`, and no OCR path in this codebase. Extracting them would require a new report type, the same scale of
   work as adding semen-analysis or urinalysis support was (N25), and is not something this spec's numeric/text CBC
   rules can piggyback on.
2. **Final diagnostic labels for hematologic malignancies** (CML, AML, ALL, MDS, CMML, CLL, HCL, MM, MCL, Burkitt
   lymphoma, and their WHO subtypes). The architecture's core rule (`architecture.md`, `notes.md`) is that the engine
   states findings, not diagnoses, and every existing "suspicion" rule (`cml_suspicion`, `acute_leukemia_suspicion`,
   `maha_ttp_suspicion`) is phrased as a same-day/this-week referral trigger, never a diagnosis the patient reads as
   fact — because the actual diagnosis requires the bone-marrow/cytogenetic workup named above. New rules from this
   input follow that same convention: they can say "this pattern needs urgent same-day medical evaluation and likely a
   bone-marrow work-up", never "you have CML" or "you have AML with t(8;21)".
3. **The full AML/MDS/CMML blast-percentage subtyping trees** (§2.2, §2.3 of the input) require a bone-marrow blast
   percentage, which is not a value a CBC-with-differential report carries (it reports the *peripheral blood* blast
   percentage only). The peripheral-blood blast trigger (≥ 20% is unambiguous acute leukemia; the "exceptions" list of
   named cytogenetic AML subtypes below 20% cannot be evaluated without the FISH/cytogenetics results) is in scope;
   the bone-marrow-specific bands (MDS-EB1/EB2, CMML-0/1/2 subtyping by BM blast %) are out of scope for the same
   reason as item 1.

This spec's functional requirements therefore only cover the peripheral-blood numeric thresholds and the free-text
morphology/blast findings a CBC report can actually contain — not the trees or the matrix in full.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Monocyte, eosinophil and basophil count findings (Priority: P1)

A patient's CBC differential shows an abnormal monocyte, eosinophil, or basophil count with no rule currently reading
it directionally (today these values are graded but silently fall to `unexplained_abnormal` unless a malignancy
gammopathy finding happens to also be present). After this feature, an abnormal monocyte count (monocytosis > 1.0 ×10⁹/L
or ≥ 10% of WBC; monocytopenia < 0.2 ×10⁹/L), eosinophil count (eosinophilia > 0.5 ×10⁹/L; hypereosinophilia ≥ 1.5
×10⁹/L), or basophil count (basophilia, in the context of the leukocytosis differential) produces its own explained
finding with a next-step recommendation, instead of an unexplained line.

**Why this priority**: this is the highest-volume gap — these three analytes are graded on essentially every CBC and
currently have no dedicated interpretation, which is exactly the `unmatched_abnormal`/N18 failure class this codebase's
own Lab Notebook repeatedly flags as the worst kind of silent gap.

**Independent Test**: run a CBC panel with an isolated abnormal monocyte/eosinophil/basophil count (all other values
normal) through the engine and confirm a named finding appears instead of `unexplained_abnormal`.

**Acceptance Scenarios**:

1. **Given** a CBC with MONO_ABS = 1.4 ×10⁹/L and everything else normal, **When** the panel is graded, **Then** the
   patient reads a monocytosis finding naming the value and a follow-up recommendation, not «توضیح داده نشدند».
2. **Given** a CBC with EOS_ABS = 2.0 ×10⁹/L (≥ 1.5, hypereosinophilic range), **When** graded, **Then** the finding's
   urgency and wording differ from an ordinary eosinophilia (0.5–1.5) finding, reflecting that hypereosinophilia
   warrants more urgent follow-up.
3. **Given** a CBC with MONO_ABS = 0.15 ×10⁹/L (monocytopenia) and no other abnormal value, **When** graded, **Then**
   the patient reads a finding, not silence — monocytopenia is a genuine (if less commonly checked) abnormal result.

---

### User Story 2 - Free-text morphology and blast flags on a CBC differential (Priority: P2)

A CBC-with-differential/peripheral-smear report includes a pathologist's free-text remark such as "Blasts 25%", "Auer
rods present", or "Toxic granulation, Döhle bodies noted" — the same way a urinalysis report carries free-text
microscopy remarks. Today these rows are not recognized at all (`--search` confirms zero matches), so they either fail
to map (`unmapped`) or, worse, could collide with an unrelated key the way N25 documents for semen/urine rows sharing a
name with something else.

**Why this priority**: a blast percentage ≥ 20% or a positive Auer-rod remark is a same-day emergency signal that the
current engine cannot see at all if it's printed as text rather than a number matched by an existing key — this is a
silent gap, not just a missing nicety, and the failure direction (an emergency going unrecognized) is the worst
direction per N3/N18.

**Independent Test**: run a differential report containing a "Blasts 25%" remark and confirm the engine produces an
emergency finding; run one with "Auer rods present" alone and confirm the same; run one with a benign flag (e.g.
"Toxic granulation present" with an otherwise normal-looking infection picture) and confirm it produces an
explanatory, non-alarming finding tied to the existing leukocytosis/infection context rather than a false emergency.

**Acceptance Scenarios**:

1. **Given** a differential report with a free-text blast percentage of 25%, **When** processed, **Then** the patient
   reads a same-day/emergency finding naming the blast percentage and instructing urgent hematology referral — never a
   named leukemia diagnosis (see Diagnosis-labeling boundary).
2. **Given** a report with "Auer rods present" and no numeric blast percentage stated, **When** processed, **Then** the
   engine still produces an emergency finding (Auer rods are pathognomonic on their own), rather than silently
   dropping the remark because no number was attached to it.
3. **Given** a report with "Toxic granulation, Döhle bodies present" alongside a high WBC and neutrophilia, **When**
   processed, **Then** the finding text explains this as a reactive/infectious pattern, and does not compete with or
   duplicate any existing leukocytosis finding's timeline (N20 class — one instruction per patient, not two).
4. **Given** a report naming a benign inherited anomaly (Pelger-Huët, May-Hegglin) explicitly as such, **When**
   processed, **Then** the engine states it is a benign incidental finding requiring no action — never treats it as
   an abnormal/urgent flag merely because it names an "anomaly".

---

### Edge Cases

- What happens when a differential report states a blast percentage between 1% and 19% (not the ≥ 20% acute-leukemia
  cutoff, but still abnormal — e.g. the CMML/MDS range)? The engine cannot subtype MDS/CMML (out of scope, see
  Diagnosis-labeling boundary), but must not stay silent either — the finding should say "blasts detected, abnormal,
  needs hematology follow-up" without naming a specific WHO subtype.
- How does the system handle a monocyte count that is both monocytosis by absolute count but not by percentage, or
  vice versa (the input's own "OR" criterion, e.g. `> 1.0 ×10⁹/L OR ≥ 10% of WBC`)? Both triggers must be checked;
  either one alone is sufficient, matching the input's stated logic.
- What happens when a morphology remark is written in a spelling variant real Iranian lab sheets might use (Persian
  transliteration, partial phrase, missing diacritics — "دوهله بادی" for Döhle bodies, "میله آور" for Auer rods)? Per
  N2 in `CLAUDE.md`, spelling coverage must come from real-sheet research, not invented Persian transliterations —
  flagged as a build-time task, not resolved in this spec.
- What happens when a blast percentage or morphology remark appears on a sheet from a patient already flagged with an
  existing emergency (e.g. `pancytopenia`, `severe_neutropenia`)? Per N20/N21, only one finding should carry the
  "how urgent, what to do" instruction — the new blast/Auer-rod finding must either defer to or merge with an existing
  emergency rather than producing a second, possibly conflicting, timeline.
- What happens when eosinophilia is present alongside a clearly infectious/allergic context already explained by
  another finding (e.g. an obvious parasitic-infection marker)? The new eosinophilia finding should not compete with
  or contradict an existing explanation on the same sheet (N21 class).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The engine MUST produce a distinct, explained finding for an abnormal monocyte count (monocytosis:
  absolute count > 1.0 ×10⁹/L OR ≥ 10% of total WBC; monocytopenia: absolute count < 0.2 ×10⁹/L), replacing the current
  `unexplained_abnormal`/`unmatched_abnormal` fallback for this analyte.
- **FR-002**: The engine MUST produce a distinct, explained finding for an abnormal eosinophil count, with two
  severity bands: eosinophilia (> 0.5 ×10⁹/L) and hypereosinophilia (≥ 1.5 ×10⁹/L), the latter carrying more urgent
  wording and a request for follow-up evaluation.
- **FR-003**: The engine MUST produce a distinct, explained finding for basophilia (elevated basophil count),
  independent of whether a co-occurring malignancy-gammopathy finding also fires.
- **FR-004**: The engine MUST recognize a free-text blast-percentage remark on a CBC-differential report and, when
  the stated percentage is ≥ 20%, produce a same-day/emergency finding instructing urgent hematology evaluation.
  The finding text MUST NOT name a specific leukemia subtype or diagnosis (see Diagnosis-labeling boundary).
- **FR-005**: The engine MUST recognize a free-text blast-percentage remark in the 1–19% range and produce a finding
  stating the abnormal result and recommending hematology follow-up, without attempting WHO MDS/CMML subtyping.
- **FR-006**: The engine MUST recognize a free-text "Auer rods present" (or equivalent stated spelling) remark, with
  or without an accompanying blast percentage, and produce a same-day/emergency finding — Auer rods are pathognomonic
  for acute myeloid leukemia on their own. **When both a ≥ 20% blast percentage (FR-004) and Auer rods are present on
  the same sheet, the two MUST be combined into one merged emergency finding** naming both, not two separate findings
  (N20: one instruction per patient).
- **FR-007**: The engine MUST recognize free-text remarks naming toxic granulation and/or Döhle bodies and produce a
  finding that explains them as a reactive/infectious pattern, without independently raising urgency beyond what any
  co-occurring leukocytosis/infection finding already states (N20: one instruction per patient).
- **FR-008**: The engine MUST recognize free-text remarks naming a benign inherited morphologic anomaly (Pelger-Huët,
  pseudo-Pelger-Huët distinguished per context, May-Hegglin, Alder-Reilly, Chédiak-Higashi) and produce a finding that
  states it as incidental/benign (except Chédiak-Higashi, which carries a distinct clinical association with recurrent
  infection and must say so) — never as an urgent or actionable abnormal flag on its own.
- **FR-008a**: All morphology-flag matching in FR-006–008 MUST be by named term as printed on the sheet (e.g. "Auer
  rods", "Toxic granulation", "Pelger-Huët"), the same keyword/whole-value matching every existing qualitative row in
  `adapter.js` uses. The engine MUST NOT attempt to infer an anomaly from a free-form morphologic description that
  does not name it (e.g. "bilobed nuclei" alone, with no "Pelger-Huët" label) — an unnamed description produces no
  finding, a known and bounded gap rather than a guess.
- **FR-008b**: `OCR_PROMPT` MUST be updated to name Auer rods, blast percentage, toxic granulation, Döhle bodies and
  Pelger-Huët/pseudo-Pelger-Huët explicitly as examples of qualitative notes to capture, alongside the existing
  "Anisocytosis (+++)" example, to reduce the risk of the vision model treating an unfamiliar term as noise and
  dropping the row.
- **FR-009**: The engine MUST NOT attempt to grade, interpret, or produce any finding based on immunophenotype markers
  (CD antigens), flow cytometry results, or cytogenetic/molecular findings (BCR-ABL1, JAK2, CALR, MPL, FISH
  translocations, IgH rearrangements) — these are out of scope per the Diagnosis-labeling boundary, and the adapter
  MUST NOT attempt to map rows describing them to any engine key.
- **FR-010**: Any new finding that reads a key already read by an existing emergency finding (e.g. blast percentage or
  Auer rods appearing on a sheet that also triggers `pancytopenia` or `severe_neutropenia`) MUST hand off to or defer
  its action/timeline to the existing higher-urgency finding, per the established `actionUnlessAnemiaCrisis`/N20
  pattern, rather than presenting a second, independent instruction.
- **FR-011**: Every new Persian patient-facing string introduced by this feature MUST go through the same review
  process as prior specs (drafted here, shown to the user verbatim before commit, guarded by a red-before-the-fix
  regression test per N10).
- **FR-012**: Every numeric threshold adopted from the pasted input MUST be recorded in `MEDICAL_RULES.md` under a new
  `P` entry and carry the non-claim source line (see Provenance section) rather than citing it as a named textbook,
  until a human clinical reviewer approves it.

### Key Entities *(include if feature involves data)*

- **Monocyte/eosinophil/basophil differential finding**: a new pattern-rule finding keyed on `MONO_ABS`/`EOS_ABS`/
  `BASO_ABS`, following the existing `severity`-graded-analyte finding shape (`headline`, `must_say`, `urgency`,
  `action`, `suggest`).
- **Free-text morphology/blast remark**: a new adapter-recognized row type on a CBC-differential page (parallel to
  `patterns_urine_casts.js`'s cast rows) — not a numeric graded test, but a qualitative "present/absent" or percentage
  flag read into its own channel, matched by named term only (FR-008a), with an explicit reader so it can never become
  a silent drop (N18). A blast-percentage remark and an Auer-rods remark on the same sheet combine into one finding
  (FR-006), not two.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A CBC panel with an isolated abnormal monocyte, eosinophil, or basophil count no longer produces
  `unexplained_abnormal`/`unmatched_abnormal` for that analyte — measured by running the engine's own id-diff and
  orphan-key probe (per N16/N18 convention) before and after the change.
- **SC-002**: A differential report stating "blasts ≥ 20%" or "Auer rods present" always produces exactly one
  same-day/emergency finding (merged when both are present, per FR-006), verified against at least 5 representative
  panels including ones where an existing emergency (pancytopenia, severe neutropenia) is also present, with no rival
  or contradicting timeline (N20 sweep, same pattern as `M162`).
- **SC-003**: A benign morphologic anomaly remark (Pelger-Huët, May-Hegglin, Alder-Reilly) never raises `overall_urgency`
  above what the rest of the panel already warrants, verified on an otherwise-normal panel.
- **SC-004**: Zero new findings reference an immunophenotype, flow-cytometry, or cytogenetic term; `grep` for
  `CD1[0-9]|CD2[0-9]|CD3[0-9]|BCR-ABL|JAK2|CALR|FISH` across all new rule text returns nothing.
- **SC-005**: The full backend regression suite (`npm test` in `khanesh-server/`) passes with zero unintended
  regressions, and every new guard is confirmed red against a pre-fix copy of the tree (N10).

## Assumptions

- Real Iranian lab sheets/differential reports do occasionally carry free-text pathologist remarks (blast %, Auer
  rods, toxic changes) in addition to the tabular cell counts — this is assumed by analogy with the urinalysis/semen
  precedent (N25) but has not been confirmed against an actual scanned Iranian CBC-differential report; flagged for
  verification during planning/research (per the `research` agent's role).
- The morphology/blast remark is assumed to arrive as OCR'd free text on the same page/upload as the numeric CBC
  values, not as a separate report type requiring a new adapter page-kind (unlike semen analysis, N25) — if real
  sheets instead print this as a structured pathologist addendum on its own page, the page-kind detection logic from
  N25 would need to be extended, which is a larger change than this spec assumes.
- The ethnicity-adjusted ANC lower limit, the full AML/MDS/CMML subtyping trees, and the CML-vs-leukemoid decision-tree
  refinement (§2.1, formerly Story 3, dropped by decision) are out of scope; no code will be written for them under
  this feature.
- The WHO PV Hb thresholds (> 16.5 M / > 16.0 F) in this input will be compared against the engine's existing
  `erythrocytosis` rule during planning rather than assumed to already match or already need replacing.
- Monocytosis/eosinophilia/basophilia thresholds are implemented straight from the pasted input, following the
  established P52/P53/P54 pattern: recorded in `MEDICAL_RULES.md` as a pending-review proposal with the non-claim
  source line, code written once the user approves the exact numbers during clinical review — not cross-checked
  against `guidelines.js` first.

## Clarifications

### Session 2026-09-25

- Q: Threshold source for FR-001–003 (monocytosis/eosinophilia/basophilia) — straight to `MEDICAL_RULES.md`
  pending-review, or cross-check against `guidelines.js` first? → A: Straight to `MEDICAL_RULES.md` pending-review,
  same as P52/P53/P54.
- Q: Is Story 2 (free-text morphology/blast remarks) in scope for this feature? → A: Yes, built now — highest-value
  gap in the input (an emergency signal the engine currently cannot see at all).
- Q: Is Story 3 (refining `cml_suspicion` wording against §2.1's decision tree) in scope? → A: Dropped. The rule
  already exists and already triggers on severe leukocytosis; refining its wording is low-value next to Stories 1–2,
  and NAP score may not appear on real Iranian lab sheets at all.
- Q: When a report states both a blast percentage ≥ 20% (FR-004) and "Auer rods present" (FR-006), should the engine
  produce one merged emergency finding or two separate ones? → A: One merged finding — a single acute-leukemia-class
  finding names both the blast % and the Auer rods together, with one instruction (avoids the N20 rival-timeline
  class).
- Q: Should the morphology-flag rules (FR-006–008) match only the named term as printed, or also attempt to interpret
  free-form morphologic descriptions? → A: Named-term match only, consistent with every existing qualitative row in
  `adapter.js`. A sheet that describes morphology without naming the anomaly produces no finding — a known, bounded
  gap, not a guess.
- Q: Should `OCR_PROMPT` be updated to name Auer rods, blasts, toxic granulation, Döhle bodies and Pelger-Huët
  explicitly, given it currently only names "Anisocytosis (+++)" as an example qualitative note? → A: Yes, add them
  as named examples — reduces the risk of the vision model treating an unfamiliar term as noise.

Remaining lower-impact questions (exact monocytosis/eosinophilia wording, whether pseudo-Pelger-Huët needs a separate
finding from true Pelger-Huët) are left to planning/implementation and the user's usual reviewer role, as with
P52/P53/P54.
