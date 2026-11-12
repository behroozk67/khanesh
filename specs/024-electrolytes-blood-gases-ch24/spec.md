# Feature Specification: Electrolytes and Blood Gases (Tietz chapter 24): gaps only

**Feature Branch**: `024-electrolytes-blood-gases-ch24` (spec directory only; no git branch)

**Created**: 2026-11-12

**Status**: Draft

**Input**: A Persian NotebookLM/Gemini extraction of Tietz chapter 24 («Electrolytes and Blood Gases»), pasted by the user, with the condition «شرط قواعد تکراری اجرا نشود» (a rule the engine already has must not be implemented again). The extraction has eight rules, a table of formulas and reference ranges, and a list of `FA_NAMES`. It says itself that acid-base patterns and compensation formulas (Winter) are in chapter 36 and renal electrolyte physiology in chapter 35, so those are out of scope.

## Current Behaviour

The probe was `engine-inventory.mjs` on the working tree, which equals `HEAD` (`c4d3622`; `git status` shows only the `.impeccable` submodule). The engine has 285 rules in 26 files.

**Source premise.** The extraction is secondary and unverified. The raw chapter was not opened (Tietz is paid), so under N39/N46 nothing from it is cited in `sources:` or `guidelines.js`, and no quote is treated as verbatim. Every number it contributes is a reviewer question under the next free number, **P141** (`MEDICAL_RULES.md` ends at P140; checked with grep).

**Already in the engine. These are duplicates and get no new rule:**

| Extraction item | Existing owner |
|---|---|
| R2: haemolysis raises potassium | `hemolysis_potassium` in `preanalytical.js` (gated at K < 6.5, never changes urgency) |
| R2: very high white-cell count raises potassium; R3: platelets release potassium in a serum tube | `pseudohyperkalemia_cell_count` (P20; PLT ≥ 500 or WBC ≥ 50, K < 6.5) |
| R4: high osmolal gap | `osmolal_gap_high` (gap > 10 ⇒ `this_week`, > 25 ⇒ `emergency`), `serum_osmolality_abnormal` (P17) |
| Blood pH out of range | `blood_ph_abnormal` (P107); `ph_type_ambiguous` for a lone pH |
| Na, K, Cl, HCO3, OSM reference ranges | `ADULT_REFS`, `PED_REFS`, `CTCAE_MAP` (Na, K) |
| Sodium/potassium emergencies, anion gap, metabolic acidosis/alkalosis | `sodium_critical`, `potassium_critical`, `high_anion_gap`, `normal_ag_acidosis`, `metabolic_alkalosis`, `severe_acidosis` |

**Numeric conflicts between the extraction and the engine. They are recorded and not applied:**

| Item | Extraction | Engine |
|---|---|---|
| Calculated osmolality | `1.86×Na + glucose + urea + 9` (mmol/L) | `2×Na + glucose/18 + BUN/2.8` (`adapter.js`) |
| Cl reference | 98–107 or 100–108 | engine's own `ADULT_REFS` |
| K reference (plasma) | 3.3–4.9 | one K range |

The two osmolality formulas differ by about 10 mOsmol/kg at Na 140 (269 against 280). The engine's gap threshold of 10 was set with its own formula. Switching formulas moves every sheet's gap by the same offset and so changes which sheets cross 10 and 25. That is a reviewer decision, not a mechanical one (N23), and this feature leaves it alone.

**Not executable from a lab sheet. These stay out, even with approval:**

- R2 inputs: haemolysis index, time to separation, tourniquet time.
- R7 (air bubble in the syringe) and R8 (arterial against venous sample): the engine has no `pCO2`, `pO2` or `SO2` key, and a sheet carries no sample type. A new blood-gas key family is a separate feature (see Assumptions).
- The measuring method (indirect or direct ISE; freezing-point or vapour-pressure osmometer).
- R5 inputs: collection method and sample weight of a sweat test.
- Temperature and unit-conversion formulas (Henderson–Hasselbalch, pH/pCO2 temperature correction, kPa): there is no input to correct.

**Gaps: no owner today.** Each is a candidate, and the first probe decides whether it gets a rule (spec 021–023 workflow).

1. **R1, pseudohyponatraemia.** A low sodium next to a very high triglyceride or total protein on the same sheet has no caveat. The sheet does not say which method the lab used.
2. **R5/R6, sweat chloride.** There is no sweat-chloride key. A sheet that prints one (a cystic-fibrosis centre) gets no verdict or lands in «تفسیر نشدند».
3. ~~R3, serum against plasma potassium~~ — **duplicate, found during `/speckit-plan`**: `pseudohyperkalemia_cell_count` (`preanalytical.js`) already attaches a serum-clotting caveat to `potassium_critical` when PLT ≥ 500 or WBC ≥ 50 and K < 6.5 (probe G3a, `snapshots/before.txt`). No change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A low sodium that may be an artefact is not read as true salt loss (Priority: P1)

A patient's sheet shows sodium below the lab's printed or engine range, together with a very high triglyceride or total protein. Today the sheet gets the sodium finding with no hint that the number can be a method artefact.

**Why this priority**: This is the only extraction item that can send a patient toward a wrong action on common input. A caveat prevents an unneeded alarm without hiding the finding.

**Independent Test**: Build a panel with Na 128, triglyceride 2000 mg/dL and nothing else abnormal, and run it before and after.

**Acceptance Scenarios**:

1. **Given** Na is low and TG or total protein is far above its range on the same sheet, **When** the sheet is interpreted, **Then** the sodium finding keeps its urgency and the text adds one sentence saying the number can read falsely low in this situation and the doctor may repeat it by another method.
2. **Given** Na is low and TG and protein are normal or absent from the sheet, **When** the sheet is interpreted, **Then** nothing is added (an absent test is not «normal»; no claim is made about a test that was not measured).
3. **Given** the same panel, **When** the sentence is added, **Then** no urgency, headline or `has_critical` changes, and `sodium_critical` still fires at its own threshold.

---

### User Story 2 - A sweat-chloride result is read against its published bands (Priority: P2)

A sheet from a cystic-fibrosis centre prints a sweat chloride in mmol/L. The engine has no key for it.

**Why this priority**: The result is rare on routine sheets, but when it appears it is currently unread.

**Independent Test**: Run rows of 20, 29, 30, 59, 60 and 161 mmol/L, with and without an age under 28 days.

**Acceptance Scenarios**:

1. **Given** sweat chloride ≤ 29 mmol/L, **When** interpreted, **Then** the engine states the value and that it is in the range the source calls «unlikely for CF», with no urgency.
2. **Given** 30–59, **When** interpreted, **Then** the result is «intermediate», with `this_week` urgency and a repeat suggestion.
3. **Given** ≥ 60 and ≤ 160, **When** interpreted, **Then** the text says the value fits cystic fibrosis criteria and the doctor will confirm; the headline stays neutral and does not name the disease.
4. **Given** a value above 160, **When** interpreted, **Then** it is treated as a probable sampling or lab error and gets no CF sentence.
5. **Given** an infant under 2 weeks or an unknown printed unit, **When** interpreted, **Then** no verdict is given and the sheet is flagged for the doctor (the source excludes very young infants).

---

### Edge Cases

- A sheet with a sweat chloride and no unit: no conversion and no verdict (N3).
- A sweat-chloride name spelled in Persian or in Latin with «Cl-» or «Chloride (sweat)»: spellings must come from real sheets (N2); a name that could be serum chloride must stay serum chloride (N25: `(page kind, name)` is the identity).
- A lone sweat conductivity (mmol/L NaCl equivalent): a screening number with a different cut-off (≥ 50); it is not a sweat chloride and gets no verdict.
- TG printed in mmol/L: the high band is decided in the printed unit (N3).
- Sodium low **and** `sodium_critical` active: the caveat is added, the emergency is not softened.
- A new rule that reads `NA`, `TG`, `TP`, `K` or `PLT` by name inside its own `build` marks those keys as «covered» for the unexplained-abnormal net (N56); key lists belong in a helper outside `build`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST NOT add any rule, range, conversion or sentence for an item listed under «Already in the engine». Each such item is recorded as «موجود: <id>» in `MEDICAL_RULES.md` and nothing else.
- **FR-002**: Before any code, the probe (`before.txt`) MUST show, for each gap, what the engine prints today, so the diff after the change is attributable.
- **FR-003**: The pseudohyponatraemia sentence MUST appear only when the sodium is low and a triglyceride or total protein on the same sheet is above its range. It MUST be silent when those tests are absent.
- **FR-004**: No rule from this feature MAY lower an urgency, remove a finding or change `has_critical`. Caveats add text only (the `preanalytical.js` principle).
- **FR-005**: A sweat-chloride value MUST be read in the printed unit only. The bands are ≤ 29, 30–59, ≥ 60 and an upper plausibility limit of 160; a value above 160 gets no disease sentence.
- **FR-006**: A sweat-chloride sheet for an infant under 2 weeks (the source's own exclusion; corrected from «28 days» during planning), or with no readable unit, MUST get no verdict.
- **FR-007**: A sweat-chloride key MUST be added to `refs.js` or the assay path, `adapter.js` `NAME_MAP` (spellings from a real sheet), `names.js` `FA_NAMES`, `RULE_GROUP` and the rule file together (N1); the new rule MUST be present in `RULES` and in the rule-id diff (N16).
- **FR-008**: The sweat-chloride headline MUST be neutral and MUST NOT name the disease, the same rule the hepatitis screening headline follows.
- **FR-009**: (withdrawn during planning: R3 is a duplicate of `pseudohyperkalemia_cell_count`; see Current Behaviour.)
- **FR-010**: Each new patient-facing sentence MUST be Persian, contain no raw engine key (`faName()`), and be shown verbatim to the reviewer in the final report.
- **FR-011**: A reviewer entry under P141 MUST land in the same commit as the behaviour (N37), with the duplicates table, the conflicts table above, the not-executable list, and a «if rejected, remove X» line.
- **FR-012**: Every new test MUST fail on the old code (N10) and cover both directions and every edge in the printed unit: edge − ε, edge and edge + ε for 29/30, 59/60, 160/161.
- **FR-013**: The existing suite MUST stay green apart from `T15e`, which fails before this work (payment route, 503); `metamorphic.test.js` MUST stay green with no new `ALLOWED_DROPS` entry.

### Key Entities

- **Sweat chloride result**: a numeric value in mmol/L printed on the sheet, with the printed unit and optional printed range; read with the profile's age.
- **Caveat sentence**: text appended to an existing finding with no effect on urgency, level or score.
- **Gap**: an extraction item with no owner in the engine and an input present on a normal lab sheet.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For all 30 extraction items (8 rules and 22 formula/range rows), the register says «موجود», «تضاد», «ورودی ناموجود» or «پیاده‌شد»; none is left unclassified.
- **SC-002**: Zero duplicate rules: the rule-id set after the change differs from `HEAD` by at most the sweat-chloride rule ids.
- **SC-003**: On the probe panels, no urgency, `has_critical` or score differs from `before.txt` except the lines that intentionally gain a sentence.
- **SC-004**: A low sodium with TG 2000 mg/dL shows the new sentence and keeps the old urgency; the same sodium with normal TG shows no new sentence.
- **SC-005**: Sweat-chloride rows at 29, 30, 59, 60, 160 and 161 land in the five bands above, and an infant under 2 weeks gets no verdict.
- **SC-006**: The full backend suite has no new failure compared with the baseline.

## Assumptions

- The extraction is secondary, and no raw chapter text is available. Its numbers are reviewer questions, not facts.
- The osmolality formula, the K/Cl reference differences and the osmolal-gap thresholds stay as the engine has them; changing them is a separate reviewer decision (see the conflicts table).
- Blood-gas rules R7 and R8 need new `pCO2`, `pO2` and `SO2` keys and a sample-type input. That is a separate feature and is **not** in this one; if the user wants it, it gets its own spec.
- The sweat-chloride result exists on few sheets. The feature is still worth doing because a printed value is otherwise unread, and a rule is cheap once the key exists.
- Infant age (under 2 weeks) is taken from the profile age the engine already has; gestational age and weight (the source's other exclusions) are not on a sheet and are not asked for.
- The next free reviewer number is **P141**; the final number is re-checked with grep when the entry is written (N37).
- No git branch is created; the spec directory is the only artefact (the same practice as specs 021–023).
