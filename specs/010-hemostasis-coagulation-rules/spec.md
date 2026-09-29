# Feature Specification: Hemostasis & Coagulation Decision Rules (Henry's ch. 24/39/40/41, pasted 2026-09-29)

**Feature Branch**: `recovery` (no branch hook; spec directory is independent, per specs/007–009 convention)

**Created**: 2026-09-29

**Status**: Implemented 2026-09-30 (uncommitted) — suite 779 · 760 pass · 0 fail · 19 todo on the working tree; D7–D9, D11, D12 and P61 questions 61-a…61-f still open

**Input**: User description (Persian): «قوانین ... را در موتور قواعد اعمال کن. هر مورد که مشابهِ چیزی است که موتور از قبل دارد، یا مقدارش با مقدار فعلی موتور فرق دارد، اجرا نشود و از من پرسیده شود» — apply the pasted hemostasis/coagulation rules to the rules engine; **anything that resembles something the engine already has, or whose value differs from the engine's current value, must NOT be applied — it is asked about first.**

The pasted document is titled "Laboratory Clinical Diagnostic Decision Rules", cites Henry's Clinical Diagnosis and Management by Laboratory Methods (chapters 24, 39, 40, 41), and covers: PT/INR/APTT/TT/fibrinogen/D-dimer/platelet reference values and a basic coagulation-defect algorithm; the ISTH DIC score; hemophilia severity, carrier ratio and Bethesda inhibitor assay; a von Willebrand subtype matrix; ADAMTS13 thresholds for TTP vs HUS; a ROTEM/TEG transfusion algorithm; and stem-cell/tissue-banking (HPC, CD34⁺, cryopreservation, quarantine) quality thresholds.

## Provenance of the input — read before using any number in it

The document carries inline numbered citations (`[109]`, `[159]`, …) with no bibliography, and has internal inconsistencies (listed under D8 and D10). It is the same "pasted extract, original source not opened" class as the specs/007–009 inputs. Under the constitution's *Clinical Change Constraints*, every number adopted from it is a **proposal until the user, acting as clinical reviewer, approves it in `MEDICAL_RULES.md`** (next free register number: `P61`; `P60` is the highest today). Any code that lands carries the same non-claim source line as specs/007–009 — «تأییدِ کاربر؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم» — and never cites Henry's as if it had been opened.

## The rule this spec is built around

The user's instruction splits the input into three buckets. This spec sorts every item into exactly one, and **only bucket A is built without a further answer**:

| Bucket | Meaning | What happens |
|---|---|---|
| **A — New** | No rule, no reference range and no analyte mapping for it exists in the engine today, and nothing in the input contradicts anything the engine does | Built in this feature (User Stories 1–3) |
| **B — Similar** | The engine already has a rule or range on the same analyte/pattern | **Not applied.** Listed in the decision register with the engine's current value, the input's value, and what changes for the patient either way |
| **C — Different value** | Same thing, different number | **Not applied.** Same register |

Until a decision is recorded for a B/C item, the engine's behaviour for it is **byte-for-byte unchanged**. Deferral is not neutral only when the engine's current value is unsafe; none of the deferred items below is (each is reviewed under "what the patient sees today").

## Context: what the engine already does — measured, not assumed

Measured 2026-09-29 against the working tree on branch `recovery` with `.claude/skills/clinical-knowledge-extraction/scripts/engine-inventory.mjs --search <term>` and by reading `refs.js`, `refs_ped.js`, `ctcae.js`, `patterns_utils.js` (`isDIC`), `patterns_hematology.js` and `patterns_malignancy.js`.

### Bucket B/C — already in the engine (NOT applied; see decision register)

| # | Input item | Engine today | Relation |
|---|---|---|---|
| D1 | PT 11.0–13.5 s (reagent-dependent) | `ADULT_REFS.PT` = 10–13 s | **C** different value |
| D2 | APTT 23–35 s | `ADULT_REFS.APTT` = 25–35 s | **C** — lower bound only; rules read the high side, so today no finding changes |
| D3 | D-dimer ULN 0.4 µg/mL (= 400 ng/mL) | `ADULT_REFS.DDIMER` = 0–500 ng/mL (0.5 mg/L FEU, VTE rule-out limit; same in `refs_ped.js`) | **C** |
| D4 | Platelets 150–400 ×10³/µL | `ADULT_REFS.PLT` = 150–450 | **C** — upper bound; drives `thrombocytosis` |
| D5 | ISTH DIC score (PLT / D-dimer / PT / fibrinogen, ≥ 5 overt, < 5 repeat in 24–48 h) | `dic_pattern` via `isDIC()`: (PLT < 100 **and** PT > 15 s **and** FIB < 150) **or** (PLT < 100 **and** D-dimer ≥ 5000 ng/mL **and** (PT > 15 **or** FIB < 150)) → `emergency`, `blocks_others` | **B + C** — same purpose, different arithmetic: no score, no PT-vs-control, FIB cut 150 not 100, "strong" D-dimer 5000 not 4000 ng/mL (4.0 µg/mL), no `< 50` tier, no non-overt tier |
| D6 | ITP threshold PLT < 100; extreme thrombocytosis PLT > 1000 | `severe_thrombocytopenia` (< 50, emergency), `thrombocytopenia` (150→50, `this_week`), `thrombocytosis` (any high, `routine`) | **B** — no 100 or 1000 tier exists |
| D7 | Basic coagulation-defect algorithm (APTT↑/PT normal → FVIII/IX/XI or, without bleeding, FXII/PK/HMWK/lupus anticoagulant; PT↑/APTT normal → FVII; both ↑ → common pathway/acquired) | `coagulation_abnormal`: one generic text for any prolonged PT/APTT/INR or low fibrinogen; urgency from PT > 25, FIB < 100, INR > 3 | **B** — same finding, no pattern-specific text |
| D8 | TTP: ADAMTS13 ≤ 5–10 % (or < 10–20 %); HUS: 30–100 % | `maha_ttp_suspicion` (Hb < 10 **and** PLT < 50 → `emergency`; suggests smear, LDH, coagulation) — no ADAMTS13 analyte | **B** — the rule exists; the input adds a confirming tier on an analyte the engine cannot read |
| D9 | Thrombin time upper limit ~25 s | `refs_ped.js` `TT` 9–15 s (< 16 y); no adult TT range, no `NAME_MAP` spelling | **C** against the paediatric row |
| D10 | Hemophilia severity: severe < 1 %, moderate 1–5 %, mild 6–30 % "(or > 5 %)" | none | **A in substance, held for D10 because the input contradicts itself** (gap 5–6 %, "> 5 %" overlaps moderate) |
| D11 | Hemophilia A carrier ratio FVIII/vWF ≤ 0.9 | none | **A**, held: labels a patient a genetic carrier (see D11) |
| D12 | vWD subtype matrix | none | **A**, held: subtype names are diagnoses, and the matrix needs a multimer image (see D12) |
| D13 | ROTEM/TEG transfusion algorithm; HPC/CD34⁺/cord-blood/cryopreservation/quarantine thresholds | none | **excluded** (Q3 = A): not patient-sheet values |

`coagulation_abnormal` is also the owner of fibrinogen < 100 → `emergency` and PT > 25 / INR > 3 → `emergency`; the input's fibrinogen critical value (< 100 mg/dL) and the normal range 200–400 mg/dL **equal** the engine's — **duplicates, no change** (`ADULT_REFS.FIB` = 200–400, `severe` in `coagulation_abnormal`). The INR formula `(PT/control)^ISI` is also a non-item: sheets print INR, and the engine never derives it from PT.

### Bucket A — genuinely new to the engine

Confirmed absent from `NAME_MAP`, `refs.js`, `FA_NAMES` and every `patterns_*.js` (searches for `TT`-adult, `ADAMTS`, `FVIII`, `VWF`, `CD34` all returned nothing beyond the paediatric `TT` row):

- Factor VIII / IX **activity** (%) as an analyte, and a **Bethesda inhibitor** titre (BU).
- von Willebrand panel analytes: vWF:Ag, vWF:RCo (activity), their ratio, FVIII:C — as numbers.
- ADAMTS13 activity (%) and inhibitor status, as analytes (thresholds themselves are held under D8).
- An adult **thrombin time** range (value held under D9).

Out of scope regardless of how the questions are answered (see Diagnosis-labeling boundary): the Bethesda **assay-validity** rule (residual activity must fall between 25 % and 75 %) — that is a laboratory quality-control condition of the assay, not a value on a patient's sheet.

## Diagnosis-labeling boundary — what this feature can and cannot do

Same convention as specs/009: the engine states findings and referral urgency; it never tells a patient "you have hemophilia / TTP / von Willebrand disease" as fact, because the diagnosis needs the factor assay, inhibitor work-up, multimer analysis or clinical picture that a lab sheet does not carry. Findings are phrased as «الگوی ... که نیاز به ارزیابی توسط پزشک/هماتولوژیست دارد». Symptoms in the input (spontaneous hemarthrosis, "with/without bleeding") are **not** engine inputs — no rule may branch on a symptom the engine cannot see; where the input branches on bleeding, the text must say both readings (N21/N4).

## Clarifications

### Session 2026-09-29

- Q: For DIC, keep `dic_pattern` unchanged, replace `isDIC()` with the ISTH score, or keep `isDIC()` as the emergency trigger and add the ISTH score only as a lower tier? → A: **C** — `isDIC()` stays the `emergency` trigger, byte-for-byte; the ISTH score adds only a "non-overt / repeat in 24–48 h" tier below it (D5 resolved; FR-015).
- Q: For PT, APTT lower bound, D-dimer and PLT upper bound, keep the engine's value or adopt the input's? → A: **A** — keep all four unchanged (D1–D4 resolved; FR-007 applies; they remain visible in `P61`).
- Q: Should the ROTEM/TEG and HPC/CD34/cryopreservation/quarantine sections be excluded or included in some form? → A: **A** — both excluded entirely; recorded in `P61` as excluded with reason (D13 resolved; FR-016).
- Q: Should platelets > 1000 and platelets < 100 get their own tier or wording? → A: **B** — only PLT ≥ 1000 ×10³/µL, inside the existing `thrombocytosis` finding (no second rule); no "ITP" tier or label for < 100 (D6 resolved; FR-017).
- Q: Which band edges for factor VIII/IX activity, given the input contradicts itself (mild "6–30 % (or > 5 %)")? → A: **A** — severe < 1 %; moderate 1–5 % (5 included); mild > 5 % to 30 %; above 30 % but below the sheet's own reference: "reduced, outside the severity bands"; never a disease name (D10 resolved; FR-002 and FR-018).
- Analyze pass 2026-09-29: FR-019–FR-022 added; Stories 4–5 added; the 0.5 BU and 0.6 numbers are not applied (FR-021); the ISTH tier excludes PLT < 50.

## Clarifications required from the user

### Question Q1 — DIC (D5) — RESOLVED: option C

`isDIC()` and `dic_pattern` are unchanged. The ISTH score is added only as a lower, non-emergency tier (FR-015). The differing sub-values inside D5 (fibrinogen 150 vs 100, "strong" D-dimer 5000 vs 4000 ng/mL, absolute PT > 15 s vs +3/+6 s over control) are **not** adopted for the emergency trigger; they exist only inside the new lower tier's score.

### Question Q2 — Differing reference values (D1–D4) — RESOLVED: option A

PT (10–13 s), APTT (25–35 s), D-dimer (0–500 ng/mL) and PLT (150–450 ×10³/µL) keep the engine's values. Nothing from the input is adopted for them; they stay in `MEDICAL_RULES.md` `P61` as reviewer-visible differences. The PLT < 100 ("ITP") and PLT > 1000 tiers (D6) were part of the old Q2 wording and are **still open** — see Deferred.

### Question Q3 — Scope of the non-patient-sheet sections (D13) — RESOLVED: option A

Sections 7 and 8 of the input (ROTEM/TEG transfusion algorithm; HPC/CD34⁺/TNC/CFU/cord-blood volume/DMSO cryopreservation/−150 °C storage/180-day donor quarantine) are **out of scope** for this feature. No analyte, range, rule or reader is added for them. They are recorded in `P61` only as "excluded, with reason": operating-room and tissue-bank workflows, no OCR or `NAME_MAP` path, and the ROTEM algorithm issues transfusion orders, which the engine never does.

### Deferred (question quota of 5 reached) — engine unchanged for all of them until answered

D7 (algorithm text inside `coagulation_abnormal`), D8 (ADAMTS13 tier and its inconsistent thresholds), D9 (adult TT value), D11 (carrier ratio), D12 (vWD subtype naming). Each is a reviewer decision; none blocks User Story 1's mapping work.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Factor-activity and inhibitor values are read, not dropped (Priority: P1)

A patient photographs a hematology sheet that prints «Factor VIII Activity 3 %» (or «فاکتور ۸») and, possibly, «Inhibitor 2.4 BU». Today neither name is in `NAME_MAP`, so both go to `unmapped` and — if nothing else is abnormal — the patient can receive the canned normal result (N2). After this feature the factor activity is a graded value with its own severity wording, and a positive inhibitor is named.

**Why this priority**: this is the N2 class — an unmapped bleeding-disorder test read as "healthy" is the worst failure mode this app has, and it is entirely bucket A (no existing rule to disagree with).

**Independent Test**: run panels `FVIII 0.5 %`, `FVIII 3 %`, `FVIII 20 %`, `FIX 40 %`, `FVIII 3 %` with `APTT 68` and an `Inhibitor 2.4 BU` row through the engine; assert each produces a named finding and none reaches `unexplained_abnormal` or `buildNormalResult()`.

**Acceptance Scenarios**:

1. **Given** FVIII activity 0.5 % (or `0.005 IU/mL`, the same value), **When** graded, **Then** the finding says the activity is in the severe range and needs hematology evaluation this week (the wording is derived from the finding's urgency), quotes the printed number and unit, and does not say «شما هموفیلی دارید».
2. **Given** FVIII 3 % and a raised APTT on the same sheet, **When** graded, **Then** exactly one finding covers both numbers (hand-off, not two rival timelines — N20), and the raised APTT is not left in «توضیح داده نشدند».
3. **Given** a factor activity printed with no unit, **When** graded, **Then** it is treated by the unit rule of specs/003 (not graded, listed as unit-unknown), never by magnitude.
4. **Given** «FVIII Inhibitor: Negative» / «Bethesda: Not detected» / «Undetected», **When** read, **Then** none is read as positive (N6 closed-list rule). A bare «Inhibitor» row (no factor or Bethesda word) is deliberately left unmapped, because the word is ambiguous.
5. **Given** a numeric inhibitor titre such as «2.4 BU», **When** read, **Then** the number and unit are quoted. It is called negative or positive **only** if the row prints its own reference or a closed-list word; otherwise the finding says no verdict is possible from the sheet and a hematologist must read it, at `this_week` (a floor, not a ceiling — N3). No cut-off that the user has not approved (such as 0.5 BU) is applied (FR-021).

---

### User Story 2 - von Willebrand values are read with a three-way state (Priority: P2)

A sheet prints vWF antigen, vWF activity (ristocetin cofactor) and FVIII:C. The engine reads them, computes the activity/antigen ratio only when **both** are printed and quotes it, says whether each value is below the sheet's own printed range, and says «روی برگهٔ شما نیست» for a missing partner instead of staying silent.

**Why this priority**: same silent-drop risk as Story 1, but lower frequency, and the subtype-naming part is held (D12), so this story is limited to the numbers and the ratio.

**Independent Test**: panels with `vWF:Ag 25 · vWF:RCo 10`, `vWF:Ag 25` alone, `vWF:Ag 90 · vWF:RCo 80`.

**Acceptance Scenarios**:

1. **Given** Ag 25 and RCo 10 (ratio 0.4), **When** graded, **Then** the ratio is quoted as 0.4 with no threshold comparison (the 0.6 cut-off is not approved, FR-021), the text says a hematologist should interpret the pair, the urgency is `this_week`, and no subtype is named unless D12 is approved.
2. **Given** only vWF:Ag printed, **When** graded, **Then** the ratio is reported as not computable and the missing activity test is suggested (N4).
3. **Given** a platelet count below the normal range next to a low vWF activity, **When** graded, **Then** the platelet finding and the vWF finding do not contradict each other's urgency (N20).

---

### User Story 3 - Every held item is visible, not silently absent (Priority: P1)

The reviewer opens `MEDICAL_RULES.md` and finds every bucket B/C item from the decision register as a pending `P61` entry: input value, engine value, why they differ, what the patient sees under each choice — and the engine has not changed for any of them.

**Why this priority**: this is the user's explicit instruction; without it "not applied" is indistinguishable from "forgotten" (N16 — no guard watches what you never wrote).

**Independent Test**: diff the rule-id set and the `ADULT_REFS`/`refs_ped` contents before and after the feature; the only differences must be bucket-A additions. Then check that each of D1–D13 has a `P61` sub-entry.

**Acceptance Scenarios**:

1. **Given** the feature is built, **When** the set of existing rule ids and every existing reference range is compared to the pre-feature snapshot, **Then** no id is removed and no existing range or threshold changed.
2. **Given** a panel that fires `dic_pattern`, `coagulation_abnormal`, `d_dimer_elevated`, `thrombocytopenia` or `maha_ttp_suspicion` today, **When** run after the feature without a recorded decision for its item, **Then** the output is identical.

---

### User Story 4 - A lower DIC-screening tier for non-emergency cases (Priority: P2)

A sheet with platelets 50–99, a raised D-dimer and no other DIC trigger gets a finding that quotes the ISTH score components and asks for a repeat panel in 24–48 hours, instead of three unrelated `this_week` findings. `dic_pattern` is unchanged (Q1 = C).

**Why this priority**: closes the gap between "nothing connects these three numbers" and the existing emergency rule, without touching the emergency rule.

**Independent Test**: panels `isth_nonovert` (fires), `dic_emerg` and `isth5_no_dic` (both unchanged; the second has PLT < 50 and is already an emergency through `severe_thrombocytopenia`).

**Acceptance Scenarios**:

1. **Given** PLT 80, D-dimer 2.0 µg/mL, PT 14, fibrinogen 250, **When** graded, **Then** `dic_isth_score` fires at `soon`, quotes each component, and says the PT part could not be scored if no control value is printed.
2. **Given** any panel that fires `dic_pattern` today, **When** graded, **Then** the output is identical.
3. **Given** PLT below 50, **When** graded, **Then** the tier does not fire (`severe_thrombocytopenia` already owns it).

---

### User Story 5 - A platelet count of a million is not called routine (Priority: P3)

A platelet count of 1000 ×10³/µL or more gets `this_week` urgency and wording that does not call the rise mostly reactive. Counts below 1000 are unchanged.

**Why this priority**: today every high count, including 1200, reads «در بیشتر موارد یک واکنش موقت بدن است» at `routine`.

**Independent Test**: `plt_1000`, `plt_1200` change; `plt_450`, `plt_999` are byte-identical.

**Acceptance Scenarios**:

1. **Given** PLT 1200, **When** graded, **Then** `thrombocytosis` has urgency `this_week` and a same-day warning for bleeding or clot symptoms.
2. **Given** PLT 999 or 500, **When** graded, **Then** the output equals the pre-feature output.

---

### Edge Cases

- Factor activity printed as `IU/mL` or `IU/dL` (`0.01 IU/mL` = 1 %): unit must be converted only when printed (N3); the input itself writes both forms.
- Fibrinogen printed in g/L (2.0 = 200 mg/dL), D-dimer in µg/mL, mg/L FEU or ng/mL DDU, platelets as a raw count per µL: existing conversions must not change (bucket-A analytes must not perturb them).
- A sheet with APTT raised and FVIII printed normal: the finding must not suggest hemophilia (N21 — the normal factor argues against it, and must be said).
- The input's "with / without bleeding symptoms" branch: symptoms are not engine input; both readings are stated.
- Adding a value that is a subset of an existing finding's territory (APTT, PT, INR, platelets): must be a branch inside the owner or a hand-off, never a second rule with its own timeline (N20; `M91e`-style "exactly one owner" assertion).
- Children and neonates: coagulation factors are physiologically different (`refs_ped.js` PT 8.5–14.1, APTT 28–55; factor IX in particular is low in a healthy newborn). The adult severity bands MUST NOT be applied under 16 years; the value is quoted and a paediatric source is asked for (FR-020).
- A sheet whose only rows are factor / vWF / inhibitor rows has nothing graded; it MUST stay on the engine path and not fall to the legacy model-judged path (FR-019).
- A new analyte name that collides with an existing key through `resolveAlias`'s plural/trailing-e rules (`FIX`/`FVIII`/`TT`/`vWF`): every spelling family must be enumerated (N2, N25 `hbs`→`HGB` lesson).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The engine MUST read Factor VIII and Factor IX activity, vWF antigen, vWF activity (ristocetin cofactor), Bethesda inhibitor titre and the PT control time (context for the ISTH score only, never a finding of its own) from lab sheets, under every spelling a real sheet uses (English, Persian, abbreviations, `%`/`IU/mL`/`IU/dL`), and MUST carry a Persian display name for each so no raw key reaches the patient (N1, N8).
- **FR-002** *(from D10 = A)*: A factor VIII or IX activity value MUST be read, quoted with its unit, and never dropped or called normal (N2, N16). Bands: **< 1 %** severe; **1 % to 5 %** (5 included) moderate; **> 5 % to 30 %** mild; **> 30 % and below the sheet's own reference range** «کاهش‌یافته، خارج از ردهٔ شدت هموفیلی»; inside the sheet's reference range: no bleeding-disorder wording; **> 30 % with no printed range**: the value is quoted and the text says the sheet printed no range (never called normal). Under 16 years no band applies (FR-020). `0.01 IU/mL` equals 1 % and MUST band identically to `1 %`. Every band's text says a hematologist must evaluate it and never names the disease as fact (FR-010). The edges come from the pasted input with the contradiction resolved as stated, so they carry the FR-009 source line and a `P61` entry.
- **FR-003**: Any new finding that touches APTT, PT, INR, fibrinogen or platelets MUST live inside, or hand off to, the existing owner (`coagulation_abnormal`, `thrombocytopenia`, `severe_thrombocytopenia`, `d_dimer_elevated`, `dic_pattern`, `maha_ttp_suspicion`), so one number never produces two timelines (N20). A test MUST assert exactly-one-owner on the boundary panels.
- **FR-004**: New findings MUST state each related analyte three ways — supported / argued against / not on the sheet — including a normal factor level beside a raised APTT and a missing vWF partner (N4, N21).
- **FR-005**: Qualitative inhibitor results MUST be read from a closed list of words that must match the whole value; «undetected / non-detected / منفی» MUST never match a positive (N6).
- **FR-006**: Units MUST be converted only when the sheet prints them; a unitless factor activity, vWF, fibrinogen or D-dimer MUST go through the specs/003 unit-unknown path, not a magnitude guess (N3, P48).
- **FR-007**: The feature MUST NOT change any existing reference range, threshold, rule id, `must_say`, `action` or urgency for bucket B/C items (D1–D9, D13) until the user records a decision; a before/after snapshot of the rule-id set and of every range MUST prove it (N16, N23).
- **FR-008**: Every bucket B/C item MUST be recorded in `MEDICAL_RULES.md` as a pending `P61` entry with: the input's value and citation, the engine's value and source, the reason they differ, the patient-visible effect of each choice, and the open reviewer question.
- **FR-009**: Each adopted number in code MUST carry the non-claim source line «تأییدِ کاربر؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم», and MUST NOT be cited as Henry's or any opened source.
- **FR-010**: No finding may name a disease as fact (hemophilia, von Willebrand disease and its types, TTP, HUS, DIC); wording is «الگو / نیاز به بررسی». A test MUST scan every string the new rules can produce for those names used as the patient's diagnosis, and for raw engine keys.
- **FR-011**: Every patient-visible string added MUST be Persian, pass the existing encoding and language guards (`M37`, `M38`), and be shown verbatim for review before commit.
- **FR-012**: An emergency- or `this_week`-urgency finding MUST take its urgency from one computed value and derive its action sentence from that value (N20), and any new emergency rule MUST be probed against its most ordinary input, not only its worst (N3 false-emergency lesson).
- **FR-013**: Every new analyte MUST have a reader; a value routed to a side channel without a reader is a silent drop and MUST instead reach `unmapped` (N18, N25).
- **FR-014**: Each fix or new rule MUST ship with a regression test that fails against the pre-feature code (N10), and the baseline MUST be re-measured on this tree before and after, naming which tree it came from (constitution III).
- **FR-015** *(from Q1 = C)*: The ISTH DIC score (platelets 0/1/2, D-dimer 0/2/3, PT 0/1/2, fibrinogen 0/1) MUST be computed only as an additional lower tier. It MUST NOT change `isDIC()`, `dic_pattern`, its urgency or its `blocks_others`. Any panel that fires `dic_pattern` today MUST fire it identically. The tier fires only when `dic_pattern` does **not**, takes urgency below `emergency` from one computed value (N20), and says "repeat the panel in 24–48 h" with the score's components quoted. PT is scored against a control value only when the sheet prints one; when it does not, the PT component is reported as "not scorable", never as 0 (N4). The ISTH entry requirement (an underlying disease) is not an engine input, so the text MUST say the score is meaningful only in that setting.
- **FR-016** *(from Q3 = A)*: The feature MUST NOT add any analyte, reference range, rule or reader for viscoelastic (ROTEM/TEG) parameters or for HPC/CD34⁺/cord-blood/cryopreservation/quarantine values, and MUST NOT emit any transfusion or product-selection instruction (FFP, cryoprecipitate, platelet concentrate, tranexamic acid). `P61` records them as excluded, with the reason.
- **FR-017** *(from Q4 = B)*: For PLT ≥ 1000 ×10³/µL the existing `thrombocytosis` finding MUST branch inside its own `build` (no new rule, N20): urgency is `this_week` (above the current `routine`), the action sentence is derived from that urgency, and the text MUST NOT say the rise is "mostly a temporary reaction" without also saying that a count this high needs a doctor's assessment and that bleeding or clotting symptoms warrant same-day care. PLT 450–999 output MUST stay byte-for-byte unchanged. `thrombocytopenia` and `severe_thrombocytopenia` MUST NOT change and the label «ITP» MUST NOT be used. The 1000 cut-off is a new number from the pasted input; it carries the non-claim source line (FR-009) and a `P61` entry.
- **FR-018** *(from D10 = A)*: The mild band edge is one comparison shared by every reader of factor activity; the "> 5 %" and "6 %" readings in the input MUST NOT both exist in code. A boundary test MUST cover 0.99, 1, 5, 5.5, 30, 30.5 and 31 %.
- **FR-019** *(from analyze H1)*: A sheet whose only interpretable rows are factor, vWF, inhibitor or PT-control rows MUST stay on the engine path (the legacy fallback condition in `server.js` MUST treat a non-empty hemostasis channel like a graded or `noRef` value), and a contract test MUST use such a factor-only sheet.
- **FR-020** *(from analyze H3)*: The factor severity bands MUST NOT be applied when the age is under 16 (including every neonatal age); when the age is missing the adult bands apply and the text says the age was not on the sheet; the value is quoted, the text says the range for a child comes from a paediatric source, and urgency is `routine`. A test MUST cover a neonatal factor IX.
- **FR-021** *(from analyze C1)*: No number the user has not approved may decide a verdict. The 0.5 BU inhibitor cut-off and the 0.6 vWF ratio are **not** applied: the titre and the ratio are quoted, verdicts come only from a closed-list word or the row's own printed reference, and a case where no verdict is possible is `this_week` (a floor). Both numbers stay in `P61` question 61-d.
- **FR-023** *(from analyze I2)*: When a vWF value is on the sheet, the FVIII:C printed with it is owned by the vWF finding and quoted without a hemophilia severity band; `factor_activity` still covers FIX. One finding speaks about each FVIII number (N20); a test asserts it both ways.
- **FR-022** *(from analyze M7)*: The OCR extraction prompt MUST ask for factor, vWF, inhibitor and PT-control rows verbatim (extraction only, no interpretation), the same way it already asks for smear rows.

### Key Entities

- **Coagulation analyte**: PT, INR, APTT, TT, fibrinogen, D-dimer — already read; unchanged by this feature except where a decision D1–D9 is later approved.
- **Factor activity**: Factor VIII / IX activity as a percentage (or IU); new analyte; carries a unit and (after D10) a severity band.
- **Inhibitor titre**: Bethesda units, or a qualitative positive/negative; new analyte; closed-list reading; a number is quoted, not judged, unless the row prints its own reference.
- **PT control**: the laboratory's control time in seconds; context for the PT part of the ISTH score only.
- **vWF panel**: antigen, activity, their ratio, FVIII:C; ratio exists only when both members are printed.
- **Held item**: a bucket B/C entry with input value, engine value, patient effect either way, and a recorded decision (or "awaiting").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a sheet that prints a factor VIII/IX activity, a vWF value or an inhibitor result, 100 % of the tested spellings and units produce a named finding — none is silently dropped, none produces the "all normal" response.
- **SC-002**: For all bucket B/C items with no recorded decision, the before/after comparison of the existing rule-id set, every reference range and the full output of the current regression panels shows zero differences.
- **SC-003**: On each boundary panel (APTT high + factor normal, APTT high + factor low, PT high alone, PLT < 100 with high D-dimer, missing vWF partner) exactly one finding owns each number and no two findings give different timelines for the same number.
- **SC-004**: Every one of the 13 register items D1–D13 has a `P61` entry a reviewer can answer in one line, including what the patient sees under each choice.
- **SC-005**: No new finding says a patient *has* a named coagulation disease; a scan of all added strings finds zero such claims and zero raw engine keys.
- **SC-006**: The full backend suite is green on the tree after the change, measured (not quoted), with the baseline of the tree before the change recorded next to it.

## Assumptions

- **Analyze remediation (2026-09-29), defaults chosen without further questions and open to reversal:** C1 → quote-only for 0.5 BU and 0.6 (FR-021); H2 → the ISTH tier does not fire when PLT < 50 (Story 4 AC3), because `severe_thrombocytopenia` already owns that case; H3 → no factor bands under 16 (FR-020). The user asked for all findings to be fixed, not for a new decision on each.

- The input's numbers are unverified proposals (see Provenance); "adopt" always means "after the user approves it in `MEDICAL_RULES.md`", never on the strength of the paste.
- Held items D1–D13 leave engine behaviour unchanged, and the patient-visible risk of leaving them unchanged is acceptable because every current engine value is a conventional, already-reviewed number (D1–D4 differ by small margins; D5's current rule is the more sensitive-to-alarm side, not the more permissive).
- Hemophilia/vWD/inhibitor/ADAMTS13 values are uncommon on patient-photographed sheets; the reason to build Story 1–2 anyway is that an unmapped value reads as "healthy" (N2), not that they are frequent.
- Symptoms, family history and genetic status are not engine inputs and will not be added by this feature.
- PT relative to a control value is only usable when the sheet prints the control; otherwise the current absolute PT/INR logic applies.
- Ethnicity, pregnancy and anticoagulant-drug context are not inputs; texts that depend on them say so and ask the patient to tell the doctor.
- Existing paediatric ranges (`refs_ped.js`) remain authoritative under 16 years; nothing from the input is applied to a child without an explicit paediatric row.
