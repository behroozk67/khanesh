# Research: Leukocyte differential and smear-morphology rules (specs/009)

All findings are measured on the working tree at `0d8c782` (`rules/` clean), 2026-09-25.
Probe: [probe.mjs](probe.mjs) → [probe-before.txt](probe-before.txt). Baseline: `npm test` = **682 · 663 · 0 fail · 19 todo**,
`RULES.length` = **144**.

---

## R1 — What the engine does today with monocytes, eosinophils and basophils

**Decision:** three new rules read the graded value's own `dir` (`monocytosis`/`monocytopenia`, `eosinophilia`,
`basophilia`). The reference ranges stay the job of `refs.js`. Only one range changes: the adult monocyte lower limit
(R2).

**Measured:**

| panel | graded | today's output |
|---|---|---|
| Mono 17.5 % of WBC 8 (1400/µL) | `MONO_ABS=1400↑ [0–800]` | `unmatched_abnormal` only («توضیح آماده‌ای نداریم») |
| Mono 12 % of WBC 7 (840/µL) | `MONO_ABS=840↑` | `unmatched_abnormal` |
| Mono 9 % of WBC 10 (900/µL) | `MONO_ABS=900↑` | `unmatched_abnormal` |
| Mono 3 % of WBC 5 (150/µL) | `MONO_ABS=150 [0–800]`, normal | nothing |
| Eos 600 / 2000 / «EOS# 1.6» | `EOS_ABS↑ [0–450]` | `unmatched_abnormal`, **routine for 2000 as for 600** |
| Baso 3 % of WBC 8 (240/µL) | `BASO_ABS=240↑ [0–200]` | `unmatched_abnormal` |
| Child 5 y, Mono 11 % (880/µL) | `MONO_ABS=880 [300–1100]`, normal (PED_REFS) | no monocyte finding |

- Units are **/µL** (`refs.js:35-37`), derived from the `%` row × WBC in `adapter.js:1398-1409` unless an absolute row
  (`#`, or a `10^3` unit) is printed. So the input's ×10⁹/L numbers become ×1000: monocytosis 1000, monocytopenia 200,
  hypereosinophilia 1500.
- Grading: `EOS_ABS` → CTCAE `EOS_HIGH`, which is G1 only (`ctcae.js:119-124`). `MONO_ABS`/`BASO_ABS` → `binary`
  (`interpret.js:210-211`). Under 16, `PED_REFS` supplies the ranges (`refs_ped.js:91-103`).
- Readers today: `BASO_ABS` only in `cml_suspicion` (WBC > 50 + high baso). Nothing reads `MONO_ABS` or `EOS_ABS`.
  (The inventory's `MONO` hit on `monoclonal_gammopathy_*` is a substring match, not a reader.)

**Alternatives rejected:**
- *Adopt the input's 1000 as the grading limit.* That would move `ADULT_REFS.MONO_ABS` 800 → 1000, which is the
  N23 shape (one number, two jobs). 800 stays the reference limit; 1000 is the rule's "monocytosis" cut-off.
- *Fire only at ≥ 1000.* Then 801–999 is graded high while the rule that now reads `MONO_ABS` marks it "covered", so
  it disappears from the net. That is M156/N18. The rule must have a sentence for every graded-high value
  ("slightly above range" below 1000).

## R2 — Monocytopenia needs a range change, and the ordinary input must be checked

**Decision:** `ADULT_REFS.MONO_ABS` becomes `[200, 800]` (the input's normal interval 0.2–0.8 ×10⁹/L), recorded as
pending review in `P56`. A new **routine** `monocytopenia` rule reads the graded `dir === "low"`. Its text must not
alarm: a single low monocyte count, especially from a manual count, is often not significant on its own.

**Why:** with the lower limit at 0, a low monocyte count can never be graded low, so no rule can see it. The input
supplies the number.

**Ordinary-input check** (constitution: a new finding is checked against its most ordinary input). WBC 5 with 3 %
monocytes (150/µL) is a common healthy result on a 100-cell manual differential. So the finding is routine, says
«به‌تنهایی معمولاً معنای خاصی ندارد», and asks for a repeat CBC only. It never uses the words "bone marrow" or
"leukaemia" unless other cytopenias are present. In that case it says the monocytes are part of the wider fall, and it
does not duplicate `leukopenia`/`pancytopenia`, which own the timeline.

**N23 check:** `grep MONO_ABS` in `patterns_*.js` finds no `dir === "low"` reader. Only the new rule will read it.

**Children:** `PED_REFS` already has lower limits (200–500). The rule reads the graded `dir`, so children are covered
with no new literal (N23, M184g lesson).

## R3 — Relative monocytosis (≥ 10 % of WBC) fails the ordinary-input check

**Decision:** the "≥ 10 % of WBC" arm is **not** a standalone trigger. When the absolute count is already graded high,
the finding quotes the percentage. A relative-only monocytosis (absolute count in range, ≥ 10 %) produces no finding.
Registered as an open question in `P56`.

**Why:** measured, `child5_mono` (11 %, 880/µL, in the paediatric range) and any adult with WBC 4.5 and 11 %
monocytes (495/µL) would fire. Both are ordinary healthy results. The "≥ 10 %" criterion in the source is the WHO CMML
criterion, which requires **both** ≥ 1.0 ×10⁹/L **and** ≥ 10 %. Read as a standalone OR, it becomes a false positive
on the common case.

**This deviates from the spec's edge case** ("either one alone is sufficient"). It is listed in plan.md under
"Decisions the user may want to overrule".

## R4 — Eosinophilia bands

**Decision:** `eosinophilia` fires on graded `EOS_ABS` high:
- **ULN–1499:** routine, the common causes (allergy, asthma, eczema, drugs, parasites);
- **≥ 1500 and graded high:** "hypereosinophilia", this_week, repeat + doctor.

"Graded high" is required in both bands, so a neonate's 1800 (in the `PED_REFS` range 100–2000) never fires.

**Why:** the lower band needs no new number. The input's "> 0.35–0.5" contains today's ULN of 450, so "above the range"
already is eosinophilia. 1500 is the input's HE threshold and the only new number (`P56`).

**Rejected:** a third band at ≥ 5000. It is not in the input and would be an invented number.

## R5 — Basophilia and its hand-off to `cml_suspicion`

**Decision:** `basophilia` fires on graded `BASO_ABS` high, routine. It **stands down when `cml_suspicion` fires**,
because that rule owns basophils at WBC > 50. The hand-off calls the live rule (`ruleFiresById`), not a copy of its
threshold (M91e lesson).

**Why:** without the hand-off, WBC 80 + baso 4000 would carry two basophil findings. The input gives no standalone
basophilia number, so the range ULN (200) is the trigger and no number is added.

## R6 — A suppressed finding still marks its keys "covered" (pre-existing N18 defect, found by the probe)

**Measured, `cml_like`** (WBC 80, baso 5 %, eos 6 %, lymph 8 %, mono 4 %):
- matched: `extreme_leukocytosis`, `cll_suspicion_nccn`, `cml_suspicion`;
- shown: `extreme_leukocytosis`, `unexplained_abnormal`; `suppressed: 2`;
- basophils 4000/µL and lymphocytes 6400/µL are **named nowhere in the shown text** and are **absent from the
  «توضیح داده نشدند» list**.

**Cause:** `patterns.js:372-382` builds `covered` from every matched finding, before `blocks_others` suppression runs
(`patterns.js:462-466`). A this_week finding that is then hidden still covers its keys. R3-CR1 fixed the same defect
for *briefed* findings only. This is the N18 rule "coverage is a property of the text the patient sees", missed for
*suppressed* findings.

**Why it is in this feature:** the new rules read `MONO_ABS`, `EOS_ABS` and `BASO_ABS`. On any emergency sheet
(`extreme_leukocytosis`, `pancytopenia`, …) they are suppressed. Without the fix, they would *remove* monocytes and
eosinophils from the net where today they are listed (the `cml_like` panel lists `MONO_ABS`, `EOS_ABS` as uncovered
today). The feature would create a silent drop on exactly the sheets that matter most.

**Decision:** the net counts coverage (keys and text) **only from findings that will be shown in full**. Suppressed
findings contribute nothing; briefed findings keep contributing through their brief (unchanged). The guard is red
before the fix: `cml_like` must list basophils and lymphocytes.

**Blast radius:** this changes the orphan line on every panel where a suppressed finding read an abnormal key. Freeze
hashes that move must be re-baselined only after a full-output diff shows that the orphan line is the only change
(the specs/008 `freezediff` procedure).

**Rejected:** giving only the three new rules `always_show` + `brief`. It does not fix the pre-existing basophil and
lymphocyte drop, and N18 (2026-09-24) already says "when one finding in a class gets `always_show`, check its
siblings". A structural fix in the net closes the class.

## R7 — Smear rows: where they go today

**Measured:** «Blasts 25 %», «Blast 3 %», «Blasts 0 %», «Blast cells: Not seen», «Auer rods: Present», «Toxic
granulation: +», «Dohle bodies: Seen», «Pelger-Huet anomaly: Present», «Band 12 %», «Peripheral blood smear: Toxic
granulation seen», «Anisocytosis: ++» all go to **`unmapped`** («این تست‌ها … تفسیرشان نمی‌کند»). None is silent, and
none is read.

The worst row is `blasts_25`: WBC 30 plus «Blasts 25 %», and the patient's whole report is **`leukocytosis`, this_week**.
A 25 % peripheral blast count is an emergency. `pancyto_blasts` is an emergency anyway, but the blasts are unread.

**Routing today** (`adapter.js:1142-1190`): a row with no `NAME_MAP` key and no `unitGatedKey` goes to `unmapped`.
`resolveAlias` has nothing to collide with for `blast`, `auer`, `toxic`, `dohle` or `pelger` (checked:
`engine-inventory --search` returns no trace for any of them).

## R8 — Smear channel design

**Decision:**
- **A new adapter channel, `smear`**, is filled before the generic `qual`/`unmapped` routing. It is a separate channel,
  not `qual`, for the reason in N25: `qual` is searched by regex on any key, and a smear row must not be read by the
  urine readers (`urineCellCount(e, /…/)`).
- **Closed vocabulary, matched by name** (FR-008a):
  - **Blasts** (`blast`, `blasts`, `blast cell(s)`, `myeloblast(s)`, `lymphoblast(s)`, `monoblast(s)`, «بلاست»):
    value = a `%` number, or a presence word.
  - **Auer rods** (`auer`, `auer rod(s)`), **toxic granulation** (`toxic granul…`), **Döhle bodies** (`dohle`/`döhle`,
    with or without `bod(y|ies)`): presence word.
  - **Pelger-Huët**, split in two: `pseudo-pelger…` is distinct from `pelger…`.
  - **May-Hegglin**, **Alder-Reilly**, **Chédiak-Higashi**: presence word.
- **Generic smear rows** (`peripheral (blood) smear`, `PBS`, `smear`, `morphology`, `comment`, `remark(s)`, «لام خون
  محیطی», «توضیحات»): the value is scanned for the same vocabulary terms. Each term found becomes a present item. A
  value with no vocabulary term keeps today's routing (`unmapped`).
- **Presence is decided by `castValueState`** (`patterns_utils.js:345`), the closed present/absent/unknown lists
  already written and reviewed for N6 (M169). It is exported and reused, not copied. `unknown` → the row stays in
  `unmapped`, exactly as today, so N6 cannot recur.
- **A read row leaves `unmapped`.** «Blasts 0 %» and «not seen» are *read as normal* and produce no finding. That is
  the one visible change for normal sheets.

**Rejected:**
- *Free-text parsing of descriptions* (e.g. "bilobed nuclei"): ruled out by clarification.
- *Routing into `qual`*: the N25 collision risk.
- *Inventing Persian transliterations as input spellings*: N2. Only «بلاست» (a standard loanword) and the generic
  Persian header words are added. The list is registered as unverified against real sheets in `P56`.

## R9 — One smear finding, one classifier

**Decision:** one rule, `peripheral_smear_findings`, reads a single classifier `smearAxis(e)`. The classifier returns the
list of present items with their class. It follows the `mineralAxis` shape.

Urgency is the maximum over the items:

| item | urgency |
|---|---|
| blasts ≥ 20 %, or Auer rods present | emergency, with **one merged sentence** naming both (FR-006 merge) |
| blasts > 0 and < 20 %, or blasts present with no % | this_week |
| pseudo-Pelger-Huët | this_week (an acquired dysplasia sign, see R10) |
| toxic granulation, Döhle bodies | routine, "reactive: infection or inflammation"; never raises urgency on its own (FR-007) |
| Pelger-Huët, May-Hegglin, Alder-Reilly | routine, "usually inherited and harmless" |
| Chédiak-Higashi | routine, with the recurrent-infection sentence (FR-008) |

- **`always_show` + `brief`.** Smear items are not graded, so they are never in `engineOut.abnormal`, and the net cannot
  list them. A suppressed smear finding would be a silent drop. The brief is one line.
- **Hand-off with `acute_leukemia_suspicion`.** When it fires (WBC > 50 + Hb < 8 or PLT < 50) and the smear has
  blasts ≥ 20 % or Auer rods:
  - that rule's `must_say` gains the smear clause;
  - `smearAxis` drops the blast/Auer item, so exactly one finding talks about blasts;
  - the hand-off is "does that rule fire", through a module-local `firesById` over `RULES_MALIGNANCY`. The existing
    `ruleFiresById` searches only `RULES_HEMATOLOGY`. `smearAxis` itself stays pure, to avoid a
    `patterns_utils` → `patterns_malignancy` import cycle (data-model §3).

  A two-sided sweep asserts exactly one finding mentions blasts on every blast panel.
- **The N20 action conflict is handled by the existing layer.** Since M188, `general_recommendations` carries one final
  action from `pickFinalAction()`. So the smear finding's `action` does not create a second instruction beside
  `pancytopenia`. Its `must_say` contains no timeline (N20: a sentence that explains does not instruct).

**Rejected:** separate rules per item. That gives up to five findings from one smear line, rival timelines, and it
contradicts the merge decision.

## R10 — Pseudo-Pelger-Huët is not benign

The spec's FR-008 lists it among the benign anomalies "distinguished per context". Clinically, pseudo-Pelger cells are
acquired dysgranulopoiesis, the MDS/AML hallmark in the input's own table.

**Decision:** a row that names *pseudo*-Pelger gets a this_week sentence that says these cells need specialist review.
It names no diagnosis. A plain «Pelger-Huët» stays routine and benign.

Open question in `P56`: whether a Pelger row next to cytopenias should be read as pseudo-Pelger.

## R11 — Items that are duplicates or already decided (no code)

| item | evidence | disposition |
|---|---|---|
| WBC, ANC, ALC ranges; neutropenia bands | refs + CTCAE + `mild_neutropenia`/`severe_neutropenia` (P54) | duplicate |
| PV Hb > 16.5 / > 16.0 | **P53 Q5, user decision: status quo** (`erythrocytosis` unchanged). Probe `pv_m_168` = no finding, `pv_f_162` = net | decided, not reopened |
| ET PLT ≥ 450 | `ADULT_REFS.PLT` ULN 450; `thrombocytosis` fires on 500 and 900 | duplicate |
| CML / leukemoid tree (§2.1), NAP | Story 3 dropped (clarification) | out of scope |
| Bands, myelocytes (left shift) | both `unmapped` today (`band_12`, `cml_like`) | out of scope, recorded in `P56` as a follow-up |
| Lymphopenia | pre-existing gap (note.md) | not this input's item; untouched |
| Ring sideroblasts, BM blast %, MDS/CMML subtyping, immunophenotype, cytogenetics | a bone-marrow/flow/molecular report, with no adapter path | out of scope (spec boundary); rows stay `unmapped` |
| Ethnic ANC limit | no ethnicity input exists | out of scope |

## R12 — OCR prompt

**Decision:** `server.js:328` gets the smear terms as named examples next to «Anisocytosis (+++)»: Blasts (%), Auer
rods, Toxic granulation, Döhle bodies, Pelger-Huët. The instruction is still "record the value as printed". The prompt is
the only OCR prompt (grep: one hit). The graph path uses the same OCR.

It is not covered by a clinical test: it changes what is extracted, not how it is judged. It is verified by grep, and by
a live OCR run on a real smear sheet if the user has one (quickstart §4).

## R13 — Guard mechanics that constrain the text

- **M38 fails any Latin word in a `patterns_*.js` string outside `ALLOWED_TEST_NAMES`** (`engine.test.js:2510`). So all
  smear terms in patient text are Persian (for example «میله‌های اوئر», «اجسام دوهله», «گرانول‌های سمی»). The wording is
  for the user to approve (FR-011).
- **M36/M37:** `RULES` integrity and encoding. The new module must be spread into `RULES` (N1).
- **Test ids:** the next free ids are `M200` and `T29`. (Corrected in implementation: `M194`/`M194b` already exist out of order — PCT tests — so a tail-of-file grep missed them.).
- **Register:** the next free id is `P56` (`P54` and `P55` exist).
