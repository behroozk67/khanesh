# Feature Specification: Red-Cell Indices and Critical Values (Henry ch.31)

**Feature Branch**: `recovery` (no branch hook; spec directory is independent)

**Created**: 2026-09-22

**Status**: Clarified (Q1 = B, Q2 = A, Q3 = B) — ready for `/speckit-plan`

**Input**: User description: "این دیتا ها به موتور قواعد اضافه کن شرط موارد تکراری اجرا نشود" — a
Gemini-produced Markdown extract of Henry's ch.31 (basic RBC evaluation): age/sex reference
ranges for Hb, Hct, RBC, MCV, MCH, MCHC, RDW, reticulocytes; a critical-value table (Hb <7,
Hb >20, Hct <20%, Hct >60%, MCHC >36.5); the rule of three (Hb×3 ≈ Hct ±3); pre-analytical
interferences (cold agglutinin, lipaemia, EDTA microclots, storage >6 h).

## Provenance of the input — read before using any number in it

The input is **not the chapter**. It is a Gemini answer that went through three truncated drafts
before the final table. Two whole columns were not in any draft: every «حد بحرانی» cell was blank
(«—») in all three drafts and then appeared filled in the final one. Several upper limits are
tagged «(استنباط‌شده)», i.e. inferred. The same applies to the neonatal MCH, the Hct «۱ تا ۵ سال»
row, the RBC paediatric rows and the neonatal reticulocyte row: none of them appears in any earlier
draft. Under the constitution's *Clinical Change Constraints*, a number with no recorded source is a
proposal and does not go into executable code until a reviewer approves it. This spec treats every
number from the input as a proposal. It adds nothing to code on the strength of the input alone.

## Context: what the engine already does — measured, not assumed

Measured on the working tree on `b9068df`, 2026-09-22, with
`node .claude/skills/clinical-knowledge-extraction/scripts/engine-inventory.mjs --search <key>` and
direct `runEngine` → `runPatterns` probes: **134 rules in 18 files, 96 graded keys**.

### Duplicates — excluded from scope

| Input item | Engine today | Verdict |
|---|---|---|
| Hb adult, automated, M 14.0–17.5 / F 12.3–15.3 | `ADULT_REFS.HGB` identical | duplicate |
| Hct adult M 41.5–50.4 / F 35.9–44.6 | `ADULT_REFS.HCT` identical | duplicate |
| RBC male 4.52–5.90 | `ADULT_REFS.RBC.M` 4.5–5.9 | duplicate (rounding) |
| MCH 27.5–33.2 | `ADULT_REFS.MCH` identical | duplicate |
| MCHC 32–36 | `ADULT_REFS.MCHC` identical | duplicate |
| RDW-CV 11.5–14.5 | `ADULT_REFS.RDW_CV` identical | duplicate |
| MCV adult 80–100 | `ADULT_REFS.MCV` 80–96, `GERIATRIC_REFS.MCV` 82–102 | **not adopted.** The engine's 80–96 is Henry's automated interval. 80–100 is the generic textbook band, and it is already the macrocytosis *classifier* cut-off. Taking it as a range would make one number do two jobs (N23). |
| Hb manual method 13.5 / 12.0 | — | not adopted: sheets don't print the method, so nothing can choose between the two bands |
| All paediatric rows (Hb, Hct, MCV, MCH, RBC, retic) | `PED_REFS` (RCPCH 2016) for <16 y | **not adopted.** Paediatric ranges come from RCPCH by project policy. A second paediatric source for the same key would be two copies of one decision. Differences are recorded in `REF_DIFF.md` only. |
| Hb <7 critical | `severe_anemia_crisis` / `anemiaCrisisOwns`, one instruction (N20, `M162`) | duplicate |
| MCHC >36 → spherocytosis | `spherocytosis_likely` (threshold source pending as `P5`) | duplicate. The 36 vs 36.5 question belongs to `P5`, not here. |
| EDTA pseudothrombocytopenia | `preanalytical.js` `edta_pseudothrombocytopenia` | duplicate |
| Hb high, severity | CTCAE `HGB_HIGH` (delta from ULN) + `erythrocytosis` | duplicate for grading; see Gap 4 for urgency |

### Gaps — measured, with what the patient gets today

| # | Panel (adult) | Engine output today | Why it is a gap |
|---|---|---|---|
| G1 | F: Hb 13, Hct 39, RBC 4.3, MCV 90 | RBC↓ → `low_rbc_hct_without_anemia` (routine) | Input gives female RBC LLN 4.10. The engine's 4.5 flags a normal woman. |
| G2 | Retic 2.0 % alone | RETIC↑ → `unmatched_abnormal` | Input gives adult ULN 2.5 %. The engine has 1.5. |
| G3 | RDW-SD 50 fL | not abnormal (engine 35–56) | Input gives 39–46. The engine band is wide enough that anisocytosis by SD can never be flagged. |
| G4 | M: Hb 21, Hct 63, RBC 6.8 | `erythrocytosis` **this_week**, same as Hb 18.5 | No hyperviscosity tier. Hb 21 / Hct 63 read the same as a smoker's Hb 18.5. |
| G5 | Hct 62 alone (no Hb) | `unmatched_abnormal` routine | Nothing owns a high Hct without Hb. |
| G6 | F: Hct 18 alone (no Hb) | `low_rbc_hct_without_anemia` → «در نوبت عادی» | Hct 18 corresponds to Hb ≈ 6 under the chapter's own rule of three. With Hb on the sheet, that is an emergency (`severe_anemia_crisis`). Without Hb, it is "routine". The worse the missing information, the less the patient is told (N19). |
| G7 | M: Hb 14, Hct 30, RBC 3.0, MCV 100, MCHC 46.7 (classic cold-agglutinin artefact) | `low_rbc_hct_without_anemia`: «یعنی این نتیجه «کم‌خونی» نیست … کاهشِ ساختِ گلبول قرمز» | MCHC 46.7 is physically implausible. Hb×3 = 42 against Hct 30 breaks the rule of three by 12. The engine explains an analyser artefact as a real finding and suggests a B12/folate/iron work-up. |
| G7b | M: Hb 12.8, Hct 58, MCV 126, MCHC 22 (lipaemia / swelling artefact) | `macrocytic_anemia` this_week | Same class, the other direction. |
| G8 | Absolute reticulocyte count (×10⁹/L) | no key; the row goes to `unmapped` | Chapter content (ARC 25–100). The engine only knows RETIC %. |

Storage >6 h (spurious MCV rise) is **out of scope**: the sheet never prints how long the sample
was stored, so the engine can't condition on it. A caveat attached to every macrocytosis would be
noise that weakens a real finding.

## Clarifications

All three are the same kind of question. The constitution says a textbook number is a proposal
until a reviewer approves it. On this project the user has acted as that reviewer (`P44`, `P49`),
so the questions ask for that decision.

### Session 2026-09-22

- Q: Should the engine's normal range for women's red-cell count, reticulocytes and RDW-SD be changed to the pasted Henry values? → A: **B** — only `ADULT_REFS.RBC.F` changes, to 4.10–5.10 (Henry's automated adult interval; the male half, 4.5–5.9, already comes from it). RETIC 0.5–2.5 % and RDW-SD 39–46 fL are recorded in `P52` as pending proposals. They are not in code, and G2/G3 stay open.
- Q: Which low/high red-cell values may set urgency when Hb is absent or values are extreme? → A: **A** — low side only. An adult sheet with Hct < 21 % and **no measured Hb** takes the existing Hb < 7 crisis instruction. The threshold is the approved Hb < 7 × 3 (rule of three), not a new number. Hct > 60 % and Hb > 20 g/dL are recorded in `P52` and not implemented, so G4 and G5 stay open.
- Q: Should the engine add a "values contradict each other" note, and what triggers it? → A: **B** — one trigger: MCHC > 36.5 g/dL with Hb and Hct both measured, and **not** on a panel where `spherocytosis_likely` fires. The note is text only. The rule of three (Hb×3 ≈ Hct ± 3) is recorded in `P52` and is not a trigger, because it breaks legitimately in iron deficiency and thalassaemia trait, which are the common case. G7 is covered. G7b (low MCHC with a broken rule of three) stays open.

G8 (ARC as a key) and the `REF_DIFF.md` record of paediatric differences do not depend on the
answers. G8 adds recognition only. Its 25–100 ×10⁹/L range is a `P52` proposal, like RETIC under
Q1 = B, so ARC is routed to the «تفسیر نشدند» line until it is approved.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A healthy adult is not told something is wrong (Priority: P1)

A woman with a normal CBC and RBC 4.3 ×10¹²/L currently gets a "low red cells" finding. After
this change, a female RBC inside 4.10–5.10 produces no finding. Reticulocyte % and RDW-SD are
**not** changed in this feature (clarification Q1 = B). A panel like Retic 2.0 % keeps today's
output and is locked by a freeze test.

**Why this priority**: Most sheets are normal, so a false abnormal on the ordinary case reaches
the most patients (N20's failure-direction rule).

**Independent Test**: Run the G1 panel through the engine. RBC must be `abnormal: false` and no
finding may name it. The boundary panels (female 4.09 / 4.10, 5.10 / 5.11) must fall on opposite
sides. The male RBC range and the RETIC and RDW_SD ranges must be byte-identical before and after.

**Acceptance Scenarios**:

1. **Given** a female sheet with RBC 4.3 and otherwise normal indices, **When** it is analysed,
   **Then** no finding fires and the result is the normal result.
2. **Given** RBC 4.0 in a woman with normal Hb, **When** analysed, **Then**
   `low_rbc_hct_without_anemia` still fires. The range moved; the rule did not disappear.
3. **Given** every rule that reads `RBC` with `dir` (`low_rbc_hct_without_anemia`,
   `thal_trait_no_anemia`, `erythrocytosis`, and any other found by grep), **When** the female range
   changes, **Then** each rule's female boundary panel is re-run and any change in firing is either
   intended and recorded, or blocked by a hold-the-line constant (N23).

### User Story 2 — A dangerous number is not "routine" because its partner is missing (Priority: P1)

A sheet prints Hct 18 % and no Hb. Today the patient reads «در نوبت عادی». After this change,
they get the same instruction the engine already gives for Hb <7. That is one instruction, not
two (N20).

**Why this priority**: This is the only gap where the current output can delay an emergency.

**Independent Test**: Hct-only panels at 18, 20, 21, 25, with and without Hb. The two-sided sweep
must find exactly one owner per panel and never an emergency beside a routine timeline.

**Acceptance Scenarios**:

1. **Given** Hct 18 with no Hb, **When** analysed, **Then** urgency is `emergency` and the action
   is the `severe_anemia_crisis` action, not a second one.
2. **Given** Hct 18 **with** Hb 9, **When** analysed, **Then** the measured Hb governs and no
   Hct-derived emergency appears. A measured value always beats a derived one.
3. **Given** Hct 30 with no Hb, **When** analysed, **Then** today's finding is unchanged,
   byte-for-byte.
4. **Given** Hb 21 / Hct 63, or Hct 62 alone, **When** analysed, **Then** output is byte-identical
   to today's. The high side is not in scope (Q2 = A) and is locked by a freeze test.
5. **Given** Hct 20.9 vs 21.0 with no Hb, **When** analysed, **Then** they fall on opposite sides of
   the hand-off. Both band edges are probed.

### User Story 3 — An analyser artefact is not explained as a disease (Priority: P2)

When Hb, Hct and MCHC contradict each other beyond what physiology allows, the patient is told
the numbers may be a sample or analyser effect and should be repeated. They are not given a B12,
folate and iron work-up for an artefact.

**Why this priority**: The output is wrong but not dangerous. It causes needless tests and worry,
and it never delays care.

**Independent Test**: The G7 panel, plus 12 ordinary CBC panels (normal, iron deficiency, B12,
thalassaemia trait, spherocytosis, polycythaemia). The note fires on G7 only, and every ordinary
panel's output is frozen byte-for-byte. G7b is frozen too, since it is out of scope (Q3 = B).

**Acceptance Scenarios**:

1. **Given** Hb 14, Hct 30, MCHC 46.7, **When** analysed, **Then** a caveat says the indices do
   not agree with each other and that the lab should repeat or check the sample. It is text only.
   `overall_urgency` is unchanged.
2. **Given** a real emergency (Hb 5.5) together with MCHC 38, **When** analysed, **Then** the
   emergency stands in full, with the same urgency and instruction. The note never downgrades it
   (guideline-layer rule).
3. **Given** Hb 9.5, Hct 34, MCV 68, MCHC 28 (iron deficiency; ×3 off by 5.5), **When** analysed,
   **Then** no note. The rule of three is not a trigger.
4. **Given** Hb 10.5, MCV 88, MCHC 37, RDW 16.5 (`spherocytosis_likely` fires), **When** analysed,
   **Then** no note. Spherocytosis owns that MCHC.
5. **Given** MCHC 36.5 vs 36.6 with normal Hb/Hct, **When** analysed, **Then** they fall on
   opposite sides of the trigger.
6. **Given** MCHC 40 on a sheet with only Hb, or only Hct, **When** analysed, **Then** no note. A missing test is not a normal test.

### User Story 4 — The absolute reticulocyte count is read, not dropped (Priority: P3)

A sheet printing «Retic abs 150 ×10⁹/L» today loses that row to `unmapped`. After this change it
is recognised and named in Persian. It has no approved range yet (`P52`), so it is listed as not
interpreted. It is never silently dropped.

**Independent Test**: Spellings `Retic Abs`, `Absolute Retic`, `ARC`, «رتیکولوسیت مطلق» each
resolve to one key. `unmapped` count for them goes to 0, and the ARC key is never confused with
RETIC %.

**Acceptance Scenarios**:

1. **Given** «ARC 150 ×10⁹/L», **When** analysed, **Then** the value reaches the engine under its
   own key with a Persian name, and every existing reader of `RETIC` sees no change.
2. **Given** «Retic 1.2 %» and «ARC 60» on one sheet, **When** analysed, **Then** both appear and
   neither overwrites the other.

### Edge Cases

- `ARC` as an abbreviation must not collide with any existing alias. Check `NAME_MAP` and
  `UNIT_GATED_ALIASES` before adding it.
- Hct printed as a fraction (0.39 L/L) instead of %: the Hct-derived severity must not read 0.39
  as 0.39 %. If the unit can't be decided, the value is not graded (specs/003).
- Neonates and children: the rule of three and the Hct-derived severity do not apply under the
  paediatric band. They are scoped to adults unless the reviewer says otherwise.
- Elderly (≥75): `GERIATRIC_REFS.HGB` is lower. The Hct-derived severity must use the same Hb <7
  hand-off as `anemiaCrisisOwns`, not a new age-specific number.
- Female RBC 4.10–4.49: the `low_rbc_hct_without_anemia` elderly sentence and `thal_trait_no_anemia`
  both read RBC. Both boundary panels must be run.
- MCHC above 36.5 on an anaemic, high-RDW sheet: `spherocytosis_likely` owns it, and the hand-off is "does that rule fire". MCHC 36–36.5 fires no note at all. The artefact note must not also claim
  it, or two findings will explain one number two ways.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every item in the Duplicates table MUST produce zero code change. The rule-id set
  and every range for those keys are identical before and after, verified by a diff of the
  id set and a dump of `ADULT_REFS` for the listed keys.
- **FR-002**: Every numeric proposal from the input (G1–G8 thresholds, the input's critical values,
  inferred limits) MUST be recorded in `MEDICAL_RULES.md` as `P52`, with this spec's provenance
  note, before any of them reaches code.
- **FR-003**: `ADULT_REFS.RBC.F` MUST become [4.10, 5.10] with a recorded Henry ch.31 source.
  `RBC.M`, `RETIC` and `RDW_SD` MUST NOT change. The change MUST be applied only together with a
  boundary-panel run of every rule reading `RBC`. A rule whose firing changes unintentionally MUST be pinned with a
  hold-the-line constant (N23).
- **FR-004**: On an adult sheet with no measured Hb, a Hct < 21 % (= approved Hb < 7 × 3) MUST
  take the `severe_anemia_crisis` urgency and instruction, through the same crisis predicate, not
  a parallel threshold. When Hb is measured, the measured Hb MUST govern and Hct MUST NOT trigger
  the crisis. The text MUST say Hb was not measured and that the emergency comes from the Hct
  (N4/N5: a derived number is never presented as printed).
- **FR-005**: Any Hct-derived emergency MUST defer its action to the existing crisis instruction.
  Exactly one emergency instruction per sheet about red-cell mass, asserted two-sided like `M162`.
- **FR-006**: `erythrocytosis` and the Hct-only-high path MUST NOT change (Q2 = A). Hct > 60 % and
  Hb > 20 g/dL go to `P52` only.
- **FR-007**: The artefact note MUST fire only on MCHC > 36.5 g/dL with Hb and Hct both measured,
  and only when `spherocytosis_likely` does not fire. The hand-off is written as "does that rule
  fire", not as a restated threshold. The note MUST be text only and MUST NOT alter
  `urgency`/`overall_urgency`/`has_critical`. The rule of three MUST NOT be a trigger.
- **FR-008**: When the artefact caveat fires, findings that interpret the contradictory indices
  (e.g. `low_rbc_hct_without_anemia`'s «کم‌خونی نیست») MUST NOT state a conclusion the caveat says
  cannot be drawn. Both texts must be checked together.
- **FR-009**: The absolute reticulocyte count MUST be recognised under its own key with a Persian
  display name and a unit check. It has no range in this feature, so it goes to the «تفسیر نشدند» line.
  It MUST never be silently dropped.
- **FR-010**: Paediatric differences between the input and `PED_REFS` MUST be recorded in
  `REF_DIFF.md` (or `P52`), with no change to `PED_REFS`.
- **FR-011**: All new patient-facing text MUST be Persian and carry no raw engine key. It is shown
  to the user verbatim for review before commit.
- **FR-012**: Each behaviour change MUST be locked by a test observed red on the pre-change tree.
  Each exclusion MUST be locked by a freeze test that stays green on both trees.

### Key Entities

- **Reference interval** (per key, sex, age band): low, high, unit, source. Only adult RBC-F
  changes. RETIC and RDW_SD are `P52` proposals.
- **Critical threshold**: an analyte value that sets urgency. Distinct from a reference interval,
  with its own source line.
- **Artefact note (implausible MCHC)**: text only, attached when MCHC > 36.5 and Hb and Hct are both
  measured. It is never evidence for a disease and never changes urgency. The rule of three itself
  is a `P52` proposal only.
- **Absolute reticulocyte count**: a new analyte, separate from reticulocyte %.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero changes to any item marked duplicate. The rule-id diff lists only approved
  additions, and the range dump for HGB/HCT/MCV/MCH/MCHC/RDW_CV/RDW_SD/RETIC/RBC.M is identical.
  The only range delta is `RBC.F` 4.5 → 4.10.
- **SC-002**: Each gap panel G1–G8 produces the outcome described in its user story, and each
  outcome is shown in a before/after probe file.
- **SC-003**: No adult sheet with Hct < 21 % and no Hb gets a routine timeline. The sweep finds exactly one red-cell-mass instruction on every panel.
- **SC-004**: 100 % of the 12 ordinary CBC freeze panels produce byte-identical output.
- **SC-005**: The full backend suite is green on the working tree, and the new behavioural tests
  are red on `b9068df` (archive + junction recipe), with the counts quoted from the real run.
- **SC-006**: `P52` exists in `MEDICAL_RULES.md` and lists every input number not approved in
  Q1–Q3, each with its provenance marked (chapter / inferred / Gemini-only).

## Assumptions

- Adult scope only for the rule of three and Hct-derived severity. Paediatrics stays on RCPCH.
- Sheets never state the Hb method (manual vs automated). The engine keeps the automated interval.
- MCHC > 36.5 is approved by the user acting as reviewer (Q3). Its source line must say so
  («تأییدِ کاربر، ۱۴۰۵/۰۶/۳۱؛ عدد از استخراجِ Gemini از هنری فصل ۳۱»), not claim the chapter. The
  rule of three's ±3 is a `P52` proposal.
- Storage-time interference is not implementable (no input carries it) and is excluded.
- The user acts as clinical reviewer for Q1–Q3, as in `P44` and `P49`.
