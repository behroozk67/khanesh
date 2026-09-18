# Phase 0 Research — Endocrine & Pituitary Rules (Henry ch.25): Prolactin, Cortisol/ACTH

Every decision below was taken against the live engine on the working tree of 2026-09-18
(113 rules, 89 graded keys), not against documentation. Where a finding changed the design, the
measurement is quoted.

---

## R1 — How is the draw time of a cortisol known?

**Decision:** Encode draw time in the **engine key**, chosen by the printed test name at mapping
time. `CORTISOL_AM` for names that state a morning draw; `CORTISOL` for every other serum-cortisol
spelling (time unknown or non-morning). Timing never comes from the number.

**Rationale:** `norm()` (`rules/adapter.js:22`) lowercases and strips spaces, dots, dashes,
slashes, parentheses, `%` and `#`, so `Cortisol (8 AM)` → `cortisol8am`, `Cortisol AM` →
`cortisolam`, `کورتیزول صبح` → `کورتیزولصبح`. Each is an exact `NAME_MAP` entry. `resolveAlias()`
(`adapter.js:248`) does **no** generic prefix matching — only `^esr`, a trailing `s`, a trailing
`e`, and the two-halves-must-agree split — so an unlisted variant such as `cortisol7am` cannot
silently resolve to the bare `cortisol` entry. It stays unmapped, which is then a visible gap in
`unmapped`, not a mis-grade.

**Alternatives considered:**
- *A separate "time of draw" field parsed from the sheet* — the OCR prompt does not extract it, and
  adding it widens the OCR contract for one analyte. Rejected.
- *Assume unlabeled cortisol is a morning draw* — rejected by the user in Q2: it produces a false
  adrenal-insufficiency warning on the most common mistake, a normal afternoon draw.

---

## R2 — How does a rule see a cortisol that has no reference range?

**Decision:** `CORTISOL` (time unknown) gets **no** entry in `ADULT_REFS`, so it is never graded
and never enters `abnormal`. `runEngine()` gains one additive output field, `ungraded`, mapping
each mapped-but-rangeless key to its value. The time-unknown rule reads `e.ungraded.CORTISOL`.

**Rationale:** measured at `adapter.js:905-908`: a key whose `getRef()` is `null` is pushed onto
`noRef` **as a bare key** and its value is discarded. `val(e)` (`patterns_utils.js:310`) flattens
only `e.graded`. So today no rule can read an ungraded value — which is correct for the N17 class
(reading a key that is never graded), and is why this needs a separate, explicitly named field
rather than a range. Giving `CORTISOL` the morning range instead would grade an afternoon value of
`3 µg/dL` as `abnormal: low`; the `unexplained_abnormal` net and the frontend's row chip would
then state "out of range" — exactly the claim Q2 forbids, made by the safety net rather than by a
rule.

**Alternatives considered:**
- *Put it in `e.indices`* — `indices` means "derived, not on the sheet" and is shown to the patient
  under that meaning (`frontend.md`). Wrong semantics. Rejected.
- *No finding at all for time-unknown cortisol* — US2 scenario 2 requires the "timing matters"
  sentence. Rejected.

---

## R3 — Prolactin range when sex is unknown

**Decision:** Add a prolactin branch to `getRef()` — `if (testKey === 'PRL') return prlRef(sex)` —
beside the existing `ESR` and `CREAT` branches. `prlRef` returns the male range for `'M'`, the
female range for `'F'`, and the **male (lower) range for `null`**.

**Rationale:** `getRef()` ends `return sex === 'M' ? r.M : r.F` (`refs.js:330`), i.e. every
sex-specific key currently falls back to the **female** range when sex is unknown. For prolactin
the female upper limit is the higher one (25 vs 20 ng/mL), so the default would under-read — the
direction the spec forbids (FR-005, Edge Cases). Changing the global fallback would silently move
every sex-specific key (`HGB`, `ALT`, `FERRITIN`, …): the N23 class. A per-key branch has zero
blast radius. Note `inferSex()` also infers sex from the printed Hb range, so truly unknown sex
is uncommon.

**Alternatives considered:** change the global default — rejected (N23); store prolactin as
`both: [x, 20]` — rejected, it would call a woman's `22` abnormal (spec scenario US1-2).

**Age (clarified 2026-09-18):** `prlRef` has no pediatric branch — the user chose adult limits at
every age, which is also what `getRef()` already does for any key absent from `PED_REFS` (neither
`PRL` nor any cortisol key is there). Recorded in `P46` with its cost: infant prolactin is
physiologically high and can be read as high.

---

## R4 — Units

**Decision:** Canonical units: `PRL` ng/mL; all cortisol keys µg/dL; `ACTH` pg/mL; `UFC` µg/24h.
Conversions added to `rules/units.js`, applied **only** when the sheet prints the SI unit:

| key | printed unit | factor to canonical | basis |
|---|---|---|---|
| `CORTISOL_AM`, `CORTISOL`, `CORTISOL_DST`, `CORTISOL_SAL` | nmol/L | ÷ 27.59 | molar mass 362.46 g/mol — exact |
| `ACTH` | pmol/L | × 4.541 | molar mass 4541 g/mol — exact |
| `UFC` | nmol/24h | ÷ 2.759 | molar mass — exact |
| `PRL` | mIU/L | ÷ 21.2 | WHO 3rd IS 84/500 — **assay-dependent**, registered for the reviewer |

**Unitless cortisol with a value > 100** is not graded and the finding says the unit is unclear —
a documented implausibility guard, the same exception pattern as `HBA1C_IMPLAUSIBLE_AS_PERCENT`
(no µg/dL serum cortisol is > 100; a nmol/L one almost always is). Unitless ≤ 100 is taken as
µg/dL, which is the engine's existing convention for every analyte.

**Rationale:** N3 — grading a number against a unit the sheet does not use. Constitution:
"a unit is converted only when the sheet states it".

**Alternatives considered:** refuse to grade `PRL` printed in mIU/L because the factor is
assay-dependent — rejected: refusal means the value never reaches `abnormal`, so a sheet whose
only abnormality is prolactin gets `buildNormalResult()` — the silence this feature exists to
close. A ±15% factor error at the limit is strictly better than "you are healthy".

---

## R5 — One owner per analyte

**Decision:** Two owners, both shaped like `mineralAxis()` in `patterns_mineral_bone.js`:
- `PRL` is owned by exactly one rule, `hyperprolactinemia`, whose `build` branches internally on
  magnitude (> ULN vs > 200 ng/mL) — so a single value can never produce two prolactin findings.
- Cortisol is owned by one classifier, `adrenalAxis(e)`, which returns **exactly one** label or
  `null` (see data-model.md, `AdrenalLabel`). Each adrenal rule asks only "is that my label?".

The companions (`TSH`/`FT4` for prolactin, `ACTH` for cortisol) are **read**, never owned — they
keep their existing owners (`thyroid` rule; no existing ACTH owner). `ACTH` gets no standalone rule;
an `ACTH` without any cortisol on the sheet is abnormal-graded and falls to `unexplained_abnormal`,
which is the correct generic net for a lone companion value.

**Rationale:** Clinical Change Constraints — "exactly one rule owns each analyte on each panel";
N20 recurred four times in this codebase, each time from two independent `match`es that happened
not to be exclusive. A classifier that returns one value cannot produce two findings by
construction.

**Alternatives considered:** one rule per DSL rule (5.1 UFC, 5.1 DST, 5.2.2, 5.3.1 …) with
independent `match`es — rejected: a sheet with morning cortisol *and* UFC would fire two
contradictory adrenal findings (N20).

---

## R6 — Where the rules live

**Decision:** A new module `rules/patterns_endocrine_pituitary.js`, spread into `RULES` in
`patterns.js`.

**Rationale:** `patterns_endocrine_rheum.js` already mixes thyroid, vitamin D and rheumatology;
`patterns_endocrine_new.js` holds B12 and is a `_new` module (the constitution requires a `_new`
module to name what deletes its predecessor — not this feature's job). A fresh, non-`_new` file
keeps the axis self-contained, like `patterns_mineral_bone.js`.

**Side effect to expect in the baseline:** `M37`/`M38` derive their file list from
`patterns.js`'s `import`s, so the new module is scanned automatically. **Corrected 2026-09-18 (measured):** each is one `test()` looping over the files, not one subtest per file, so the test-count delta is *new tests + 0* (T011 measured 407 → 408 for `M103e` alone).

---

## R7 — Duplicates and conflicts: verification method

**Decision:** Freeze the current output of a fixed panel set **before** any change and assert it
is byte-identical after (FR-014, SC-002). Panels: the four thyroid states, central hypothyroid
(both TSH arms), osmolal gap > 10, `Na 128 / Glu 400`.

**Measured baseline (live engine, 2026-09-18):**

| panel | findings today |
|---|---|
| `TSH 6.0 / FT4 0.7` | `thyroid_hypo_overt` [this_week] |
| `TSH 4.8 / FT4 1.2` | `thyroid_hypo_subclinical` [routine] |
| `TSH 12 / FT4 1.2` | `thyroid_hypo_subclinical` [routine] |
| `TSH 1.0 / FT4 0.6` | `thyroid_ft4_abnormal` [routine] |
| `TSH 0.3 / FT4 0.6` | `thyroid_central_hypo` [this_week] |
| `Na 128 / Glu 400` | `diabetes_range` + `severe_hyperglycemia_uncertain_ketosis` [this_week] — **no hyponatremia finding** (corrected Na 135, factor 2.4) |

**Duplicate confirmation, measured:** calculated osmolality formula at `adapter.js:962` is
`2·Na + glucose/18 + BUN/2.8` — identical to Henry's. `osmolal_gap_high` fires at `gap > 10`
(`patterns_biochem.js:202`) — identical threshold.

---

## R8 — Clinical governance sequencing

**Decision:** Two-stage delivery. Stage A (no reviewer needed): register `P46` in
`MEDICAL_RULES.md` under «در انتظار بازبینی», write all regression tests and confirm they fail,
add name mappings and unit conversions. Stage B (after reviewer approval of `P46`): add the
reference ranges and the rules module.

**Rationale:** Constitution, Clinical Change Constraints — "A number taken from a textbook … is a
proposal until a human clinical reviewer approves it, and it lives in `MEDICAL_RULES.md` … not in
executable code." Precedent: `P34` (Henry ch.18) and `P44` (Henry ch.20) were applied only after a
reviewer decision. No feature flag is used to ship dormant code — Stage B simply does not start.

**Why name mapping is Stage A:** mapping `PRL` into `NAME_MAP` without a range already moves a
prolactin row from `unmapped` to `noRef`, which carries no clinical claim; it is pure recognition.

**Numbers the reviewer must decide (none are invented here — each is Henry's, from the DSL, and is
checked against the chapter text before it enters `P46`):**

| # | number | used for |
|---|---|---|
| 1 | PRL ULN 25 (F) / 20 (M) ng/mL | reference range |
| 2 | PRL > 200 ng/mL | "pituitary cause likely" sentence — a separate constant, not the range |
| 3 | morning cortisol < 3 µg/dL / > 18 µg/dL | insufficiency likely / excluded |
| 4 | morning cortisol reference range (LLN/ULN) | grading — **not in the DSL; the reviewer must source it** |
| 5 | ACTH < 10 / > 20 pg/mL | ACTH-independent / -dependent |
| 6 | ACTH reference range | grading — **not in the DSL** |
| 7 | UFC ULN | **not in the DSL, assay-dependent** (LC-MS/MS vs immunoassay) |
| 8 | UFC > 4 × ULN | "highly suggestive" |
| 9 | post-1 mg DST cortisol ≥ 1.8 µg/dL | positive screen |
| 10 | midnight salivary cortisol > 9.3 nmol/L | positive screen |
| 11 | PRL mIU/L ÷ 21.2 | unit conversion (assay-dependent) |
| 12 | urgency cap `this_week` for morning cortisol < 3 | FR-020 — the reviewer may raise it |

Items 4, 6 and 7 have **no source in the input**. If the reviewer cannot source them, the
corresponding pieces (morning-cortisol *high*, ACTH grading display, UFC) ship without them and
the rest of Stage B is unaffected — see plan.md, Stage B ordering.

---

## R9 — Frontend impact

**Decision:** No contract change. New graded keys appear in `_engine.tests[]` through the existing
`serializeGraded()`; `_engine` gets no new top-level field (`ungraded` is engine-internal and is
**not** added to `engineDebug()`). Add the new keys to the endocrine group in
`khanesh/src/testCategories.js` (presentation only; unknown keys already fall into «سایر», so
this is cosmetic). Manual entry (`labRefs.js` `REF`) deliberately does **not** gain these fields;
recorded in `REF_DIFF.md`.

**Rationale:** the manual-entry form only offers fields it knows, so there is no path where a
patient types prolactin and it is silently dropped. Adding them there means a second copy of every
new range with no engine behind it (N12's surface).
