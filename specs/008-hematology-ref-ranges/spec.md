# Feature Specification: Anaemia, Iron and Haemoglobin-Variant Reference Ranges (hematology reference, 2026-09-23)

**Feature Branch**: `recovery` (no branch hook; spec directory is independent)

**Created**: 2026-09-23

**Status**: Clarified (Q1 = A, Q2 = A, Q3 = A) — ready for `/speckit-plan`

**Input**: User description: «فایل جدید اضافه شد موارد تکراری اضافه نشود رنج های نرمال براساس این رفرنس ست شود» — a pasted
Markdown hematology reference: age/sex/pregnancy Hb anaemia thresholds; RBC-index cut-offs (MCV, MCH, MCHC, RDW, Mentzer);
iron markers (serum iron, TIBC, TSAT, ferritin by sex/menopause, ZPP, sTfR, sTfR/log-ferritin); haemoglobin fractions
(HbA, HbA2, HbF by age, HbS, HbC, HbE); microcytic/normocytic/macrocytic decision trees; α/β-thalassaemia and sickle
genotype tables; WHO polycythaemia vera criteria.

## Provenance of the input — read before using any number in it

The input names **no source**. Its format (numbered rules, ASCII decision trees, a Python snippet) is an AI-generated
extract, the same class as the specs/007 input. The Hb threshold rows (M 13.7 / 13.3 / 12.4, F 12.0 / 11.8) are **not**
the WHO 2024 cut-offs already cited in `guidelines.js` (`WHO_ANAEMIA`: adult men 13.0, women 12.0); they resemble a
2.5th-percentile table from a textbook anaemia chapter, but that is unverified. Under the constitution's *Clinical Change
Constraints* every number here is a proposal until the user, acting as reviewer (as in `P44`, `P49`, `P52`), approves it,
and the source line in code must say «تأییدِ کاربر؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم» — never claim a book.

## Context: what the engine already does — measured, not assumed

Measured on the working tree on `9deba20`, 2026-09-23, with `engine-inventory.mjs` (**135 rules in 18 files, 96 graded
keys**) and `probe.mjs` in this directory (output: `probe-before.txt`).

### Duplicates — excluded from scope (zero code change)

| Input item | Engine today | Verdict |
|---|---|---|
| MCV 80–100, micro < 80, macro > 100 | `ADULT_REFS.MCV` 80–96 + the 100 classifier cut-off | rejected in specs/007 (N23: one number, two jobs) |
| MCH 27–33 | 27.5–33.2 (Henry) | duplicate (rounding) |
| MCHC 32–36; > 36 ⇒ spherocytosis | identical; `spherocytosis_likely` (`P5`) | duplicate |
| RDW 11.5–14.5; high RDW separates IDA from thal trait | identical; used in microcytic split | duplicate |
| Mentzer < 13 ⇒ thal trait | `thal_trait_no_anemia`, `microcytic_thal_likely` | duplicate |
| TIBC 250–400 | identical | duplicate |
| TSAT 20–55; < 15 / > 55 | identical range; hemochromatosis cut-off is `P25` | duplicate (P25 owns the high side) |
| Ferritin < 15 absent stores; higher cut-off under inflammation | `iron_deficiency_panel` + `whoInflamIronDeficiency` (WHO 2020, 70) | duplicate — the reference's «< 50–60» is a second number for the same decision; recorded, not adopted |
| ACD (low iron, ferritin not low, TIBC not high) | `anemia_of_chronic_disease` | duplicate |
| Hemolysis (LDH, bilirubin, haptoglobin), MAHA/TTP | `hemolysis_pattern`, `maha_ttp_suspicion` | duplicate |
| B12 / folate macrocytic work-up; "never folate alone" | `overt_b12_deficiency`, `folate_deficiency`, macrocytic caution (`M155`) | duplicate |
| Pancytopenia, MDS | `pancytopenia`, `mds_suspicion`, `anemia_macrocytic_mds` | duplicate |
| Paediatric Hb rows (1–15 y), paediatric MCV, iron, ferritin | `PED_REFS` (RCPCH 2016) | not adopted by project policy; differences go to `REF_DIFF.md` |
| RPI, bone-marrow, smear, osmotic fragility, EMA, JAK2, red-cell mass, genotype tables | not on a lab sheet the engine reads | out of scope — the engine cannot condition on them |
| Pregnancy Hb < 11 | the engine has no pregnancy input | out of scope (same reason as storage time in specs/007) |

### Gaps — measured, with what the patient gets today

| # | Panel | Engine output today | Why it is a gap |
|---|---|---|---|
| G1 | M 30, Hb 13.8 | `normocytic_anemia`, **this_week** | Reference threshold 13.7: not anaemic. The most common panel — a false anaemia finding (N20 failure direction). |
| G2 | M 60, Hb 13.4 · M 72, Hb 12.6 · F 72, Hb 11.9 | `normocytic_anemia` this_week | Reference: normal for age (13.3 / 12.4 / 11.8). The engine's elderly band starts at 75. |
| G3 | M 80, Hb 11.5 · F 80, Hb 11.0 | **no finding, «none»** | Reference: anaemic (< 12.4 / < 11.8). `GERIATRIC_REFS.HGB` (11.0 / 10.5) is unsourced (`P2`) and **under-reads** — the silent direction. |
| G4 | M 40, ferritin 20 | `iron_deficiency` this_week | Reference male LLN 12. Changing it would silently switch the IDA rule off (N23) — the rule reads the range's `dir`. |
| G5 | F 55, ferritin 25 | none | Reference postmenopausal LLN 30. Engine has no menopause input. |
| G6 | M 40, iron 55 | `unmatched_abnormal`; with anaemia + ferritin 250 ⇒ `anemia_of_chronic_disease` | Reference range 50–160. Changing it switches the ACD rule off for iron 50–59 (N23). |
| G7 | «HbA2 5.2 %» next to MCV 66, RBC 6.1 | HbA2 → `unmapped`; `microcytic_thal_likely` asks for electrophoresis the sheet already printed | The confirmatory test is dropped (N2, N8 «درخواستِ آزمایشی که روی برگه است»). Iran-critical: thalassaemia trait is common. |
| G8 | Electrophoresis page: HbA 96, HbA2 2.8, HbF 0.6 | all `unmapped` ⇒ legacy path | A whole report type the engine cannot read. |
| G9 | «HbS Positive», «Hb S 40 %» | routed to `qual`, **no reader**, urgency `none` | N25 channel-with-no-reader: a sickle result is silently dropped. The name also sits next to the anti-HBs regex (`/^(anti)?hbs$/`) — an identity collision waiting for a reader. |
| G10 | ZPP, sTfR, EPO | `unmapped` | Not recognised; no range in engine. |
| G11 | M 40, Hb 17.0, RBC 6.2 | `unmatched_abnormal` | WHO PV Hb > 16.5 (M) / > 16.0 (F) sits inside the engine's normal Hb band; `erythrocytosis` needs Hb above 17.5. |

## Clarifications

### Session 2026-09-23

The user acts as clinical reviewer (as in `P44`, `P49`, `P52`). Source line in code for every adopted number:
«تأییدِ کاربر ۱۴۰۵/۰۷/۰۱؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم».

- Q1: Which Hb anaemia rows to adopt? → A: **A** — all adult and elderly rows, lower limit only: M 16–19 13.6, 20–49 13.7,
  50–69 13.3, ≥ 70 12.4; F 16–69 12.0, ≥ 70 11.8. Upper limits unchanged. The elderly Hb band starts at 70 (was 75), and
  `GERIATRIC_REFS.HGB` (11.0 / 10.5, `P2`) is replaced. `GERIATRIC_REFS.MCV`/`.ALP` keep their ≥ 75 start. Covers G1–G3.
- Q2: Iron and ferritin ranges? → A: **A** — grading ranges become iron 50–160 µg/dL; ferritin M 12–300, F 12–150,
  F ≥ 50 y 30–300 (menopause proxy). `iron_deficiency_panel` and `anemia_of_chronic_disease` keep today's cut-offs
  (ferritin M < 30 / F < 15, iron < 60) through named hold-the-line constants (N23), except F ≥ 50 (see below). Covers G4–G6.
- Q3: Haemoglobin-variant rows? → A: **A** — recognise HbA, HbA2, HbF, HbS, HbC, HbE under own keys; grade HbA2
  1.5–3.5 % and HbF < 2 % (adults only; HbF not graded under 2 y); one sentence in the existing thalassaemia findings when
  HbA2 > 3.8 %; drop the «الکتروفورز هموگلوبین» suggestion when the rows are on the sheet. HbS/HbC/HbE are recognised,
  unranged, and routed to «تفسیر نشدند» (never `qual` without a reader). Covers G7–G9.

- Q: When HbA2 > 3.8 % but no thalassaemia finding fires (e.g. an electrophoresis-only page), what does the patient
  get? → A: **B** — one new `routine` finding (high HbA2, usually consistent with β-thalassaemia trait, interpret with a
  CBC by a doctor) that fires **only** when no thalassaemia finding fired; the thalassaemia findings keep their one added
  sentence. Exactly one finding mentions HbA2 per sheet.
- Q: Should the iron-deficiency finding fire for a woman ≥ 50 with ferritin 15–29 (graded low under the new 30–300
  band)? → A: **A** — yes: for F ≥ 50 the `iron_deficiency_panel` ferritin cut-off is < 30 (same as men); F < 50 stays
  < 15. Label and finding agree for that band. This is a deliberate behaviour change (G5), not a hold-the-line.

ZPP, sTfR, EPO (G10) are recognised only (FR-007). Polycythaemia (G11) and sTfR/log-ferritin go to `P53`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Anaemia is judged against the right threshold for age and sex (Priority: P1)

A 30-year-old man with Hb 13.8 is no longer told he is anaemic; an 80-year-old woman with Hb 11.0 is no longer told
nothing.

**Why this priority**: Hb is on almost every sheet. G1/G2 are false alarms on the common case; G3 is the silent
under-read in the population most likely to have a real anaemia.

**Independent Test**: Run every G1–G3 panel plus both sides of each adopted threshold (e.g. M 30: 13.6 / 13.7; M 72:
12.3 / 12.4; F 80: 11.7 / 11.8). Each must fall on the side the approved table says, and every rule reading HGB `dir`
must be boundary-probed (N23).

**Acceptance Scenarios**:

1. **Given** M 30, Hb 13.8, **When** analysed, **Then** Hb is normal and no anaemia finding fires.
2. **Given** F 80, Hb 11.0, **When** analysed, **Then** Hb is low and an anaemia finding fires with its existing text.
3. **Given** Hb < 7 at any age, **When** analysed, **Then** `severe_anemia_crisis` is unchanged byte-for-byte.
4. **Given** M 40, Hb 17.0, **When** analysed, **Then** the upper Hb limit is unchanged (this feature moves lower limits only).
5. **Given** age < 16, **When** analysed, **Then** `PED_REFS` governs, unchanged.
6. **Given** no age on the sheet, **When** analysed, **Then** the adult (20–49) threshold applies — the engine's existing default.

### User Story 2 — Iron markers use the approved ranges without silently disabling the iron rules (Priority: P2)

**Why this priority**: The reference's iron/ferritin ranges are wider than the engine's. Adopting them naïvely changes
two diagnostic rules nobody touched (N23).

**Independent Test**: G4–G6 panels, plus each iron rule's boundary panel before and after. Any firing change is either
the approved decision or pinned with a hold-the-line constant.

**Acceptance Scenarios**:

1. **Given** the approved decision on FR-005, **When** the G4/G6 panels are analysed, **Then** the IDA and ACD rules fire
   exactly as the decision says, and the finding text never contradicts the grading shown beside it.
2. **Given** iron 155 or 165, **When** analysed, **Then** grading follows the approved range; no new high-iron rule is
   added (that is `P25`).

### User Story 3 — A printed haemoglobin-variant result is read, not dropped (Priority: P2)

**Why this priority**: In Iran the HbA2 row is the test that confirms thalassaemia trait; today the engine drops it and
then asks the patient to request it.

**Independent Test**: Spellings `HbA2`, `Hb A2`, `A2`, `HbF`, `Hb F`, `Fetal Hb`, `HbA`, `HbA0`, `HbS`, `Hb S`,
`Sickle`, `HbC`, `HbE`, «هموگلوبین A2»، «هموگلوبین جنینی» each resolve to exactly one key; none maps to a hepatitis key;
`unmapped` for them goes to 0; none reaches `qual` without a reader (N25).

**Acceptance Scenarios**:

1. **Given** «HbA2 5.2 %» with MCV 66 and RBC 6.1, **When** analysed, **Then** the thalassaemia finding no longer asks for
   electrophoresis, and the HbA2 value is handled per FR-008.
2. **Given** «HbS Positive» alone, **When** analysed, **Then** the patient never receives a normal result and never a
   hepatitis-B finding.
3. **Given** «HBsAg Positive», **When** analysed, **Then** `hbv_screen_reactive` fires exactly as today (freeze).

### Edge Cases

- `A2` / `HbA` alone collide with nothing? Check `NAME_MAP`, `resolveAlias` split rule and `UNIT_GATED_ALIASES`.
  `HbA1c` must never resolve to `HbA` (prefix alias).
- HbF in a neonate (60–85 %) is normal; any HbF range must be age-banded or not graded under 2 years.
- Hb thresholds at exact band edges (16, 20, 50, 70 years): the band an age falls into is written once and tested at
  both sides.
- Elderly band start moves 75 → 70 only if Q1 says so; `GERIATRIC_REFS.MCV` and `.ALP` (≥ 75) are untouched.
- A geriatric Hb change must not re-open specs/007's Hct-crisis hand-off (that reads measured-Hb presence, not range).
- `thal_trait_no_anemia` and `microcytic_thal_likely` read HGB `dir`; the male 13.7–13.9 band moves them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every item in the Duplicates table MUST produce zero code change; verified by a rule-id diff and a range
  dump of the listed keys before and after.
- **FR-002**: Every number in the input not approved below MUST be recorded in `MEDICAL_RULES.md` as `P53` with the
  provenance note, before any of them reaches code.
- **FR-003**: Hb lower limits MUST become (Q1 = A): M 16–19 13.6, 20–49 13.7, 50–69 13.3, ≥ 70 12.4; F 16–69 12.0,
  ≥ 70 11.8, replacing `GERIATRIC_REFS.HGB`. Upper limits MUST NOT change. Every rule reading HGB `dir` MUST
  be boundary-probed and any unintended firing change pinned (N23).
- **FR-004**: The engine MUST NOT add a pregnancy branch (no input exists); paediatric rows (< 16) MUST go to
  `REF_DIFF.md` only.
- **FR-005**: Iron and ferritin grading ranges MUST become (Q2 = A) iron 50–160 µg/dL; ferritin M 12–300, F 12–150,
  F ≥ 50 y 30–300. `iron_deficiency_panel` and `anemia_of_chronic_disease` MUST keep today's firing (ferritin M < 30 /
  F < 15, iron < 60) via named constants, except F ≥ 50, where the ferritin cut-off becomes < 30 (clarified; G5 panel
  F 55 ferritin 25 MUST fire `iron_deficiency`; F 49 ferritin 25 MUST NOT). Where a rule fires on a value now graded "normal" (e.g. M ferritin 20), its
  text MUST NOT say the value is below the normal range (grading and finding must not contradict).
- **FR-006**: No rule's clinical threshold may silently follow a range change; a rule that must keep its behaviour reads
  a named constant, not the range's `dir` (N23).
- **FR-007**: HbA2, HbF, HbA, HbS, HbC, HbE, ZPP, sTfR and EPO rows MUST be recognised under their own keys with Persian
  display names and never silently dropped: a row with no reader goes to the «تفسیر نشدند» line. `HbS` MUST be separated
  from every hepatitis-B matcher.
- **FR-008**: Haemoglobin-variant rows MUST (Q3 = A) be graded with HbA2 1.5–3.5 % and HbF < 2 % (HbF not graded
  under 2 y); when HbA2 > 3.8 % the existing thalassaemia findings MUST add one sentence (no urgency change); when none
  of them fires, one new `routine` HbA2 finding MUST fire instead — the hand-off is written as "does a thalassaemia
  finding fire", and a two-sided sweep asserts exactly one HbA2 mention per sheet (N20);
  HbA2 3.6–3.8 % is abnormal-high with no trait sentence (borderline, recorded in `P53`). HbS/HbC/HbE are unranged. Any `suggest` of «الکتروفورز هموگلوبین» MUST be dropped when those rows are
  already on the sheet (`SUGGEST_TESTS`, N8).
- **FR-009**: Polycythaemia (G11) and the sTfR/log-ferritin index MUST go to `P53` only; no new rule in this feature.
- **FR-010**: All new patient-facing text MUST be Persian, carry no raw engine key, and be shown verbatim for review.
- **FR-011**: Each behaviour change MUST be locked by a test observed red on `9deba20`; each exclusion by a freeze test
  green on both trees. Ordinary CBC/iron panels (normal, IDA, ACD, thal trait, B12, spherocytosis, crisis) MUST be
  byte-identical except where an approved range moves them.

### Key Entities

- **Hb anaemia threshold**: lower limit by sex and age band (16–19, 20–49, 50–69, ≥ 70); upper limit unchanged.
- **Iron-marker range**: iron, ferritin (sex; female ≥ 50 as menopause proxy if approved).
- **Rule-held threshold**: a named constant that keeps a diagnostic rule's cut-off when its range moves (N23).
- **Haemoglobin fraction**: HbA / HbA2 / HbF / HbS / HbC / HbE, percent of total Hb, own keys, not qualitative.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The rule-id set and every range in the Duplicates table are identical before and after; only approved
  ranges differ in the range dump.
- **SC-002**: Every G-panel in `probe-before.txt` produces its approved outcome in `probe-after.txt`.
- **SC-003**: Zero haemoglobin-variant spellings in the test list end in `unmapped` or in a reader-less channel; zero map
  to a hepatitis key.
- **SC-004**: 100 % of the ordinary freeze panels are byte-identical unless listed as an approved change.
- **SC-005**: The full backend suite is green on the working tree and the new behavioural tests are red on `9deba20`,
  counts quoted from the real run.
- **SC-006**: `P53` exists and lists every unadopted number with its provenance.

## Assumptions

- The user acts as clinical reviewer, as in `P44`, `P49`, `P52`; «رنج‌های نرمال بر اساس این رفرنس ست شود» is read as a
  request to adopt ranges, gated on the three questions because each one silently moves existing diagnostic rules.
- Unknown age = adult 20–49 band; unknown sex keeps today's behaviour.
- Sheets never state menopause; age ≥ 50 is the only available proxy, and only if approved.
- Paediatrics stays on RCPCH; pregnancy is not modelled.
