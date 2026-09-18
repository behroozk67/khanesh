# Data Model — Endocrine & Pituitary Rules (Prolactin, Cortisol/ACTH)

Engine-level entities only. Every numeric threshold below is a **P46 proposal** (research.md R8)
and is not executable until the reviewer approves it; they appear here so the design is complete.

---

## 1. Engine keys (new)

| key | meaning | printed-name examples (normalized by `norm()`) | canonical unit | graded? | range source |
|---|---|---|---|---|---|
| `PRL` | serum prolactin | `prolactin`, `prl`, `پرولاکتین` | ng/mL | yes | `prlRef(sex)` — P46 #1 |
| `CORTISOL_AM` | serum cortisol, **morning draw stated on the sheet** | `cortisol8am`, `cortisolam`, `morningcortisol`, `amcortisol`, `کورتیزولصبح`, `کورتیزول۸صبح` | µg/dL | yes | P46 #4 |
| `CORTISOL` | serum cortisol, **draw time unknown or not morning** | `cortisol`, `serumcortisol`, `cortisolpm`, `cortisol4pm`, `کورتیزول`, `کورتیزولعصر` | µg/dL | **no** → `ungraded` | — (by design, R2) |
| `CORTISOL_DST` | serum cortisol after 1 mg overnight dexamethasone | `cortisolpostdex`, `cortisolafterdexamethasone`, `dst`, `1mgdst`, `کورتیزولبعدازدگزامتازون` | µg/dL | yes | threshold only (P46 #9) |
| `CORTISOL_SAL` | late-night salivary cortisol | `salivarycortisol`, `latenightsalivarycortisol`, `کورتیزولبزاق` | µg/dL (threshold held in nmol/L) | yes | threshold only (P46 #10) |
| `UFC` | 24-hour urinary free cortisol | `24hurinefreecortisol`, `ufc`, `urinefreecortisol`, `کورتیزولادرار۲۴ساعته` | µg/24h | yes | P46 #7 |
| `ACTH` | plasma ACTH | `acth`, `corticotropin`, `آدرنوکورتیکوتروپین` | pg/mL | yes | P46 #6 |

The spelling lists are **seeds**. FR-001 requires the final list to come from real Iranian sheets
(`research` agent), per N2.

**Implemented list (T003/T008, 2026-09-18)** — in `NAME_MAP` (`adapter.js`), normalized form:

| key | NAME_MAP strings | confirmed on an Iranian lab site |
|---|---|---|
| `PRL` | `prolactin`, `prl`, `serumprolactin`, `پرولاکتین` | — (common variants) |
| `CORTISOL_AM` | `cortisol8am`, `cortisol8:00am`, `cortisolam`, `morningcortisol`, `cortisolmorning`, `cortisol89am`, `amcortisol`, `کورتیزولصبح`, `کورتیزول۸صبح`, `کورتیزول8صبح` | «ساعت 8 صبح» — abtinmed.org |
| `CORTISOL` | `cortisol`, `serumcortisol`, `کورتیزول`, `cortisol4pm`, `cortisolpm`, `cortisolevening`, `کورتیزولعصر` | کورتیزول, «4 بعدازظهر» — abtinmed.org |
| `CORTISOL_DST` | `cortisolafterdexamethasone`, `cortisolpostdst`, `cortisolpostdex`, `overnightdst`, `کورتیزولبعدازدگزامتازون` | DST — abtinmed.org |
| `CORTISOL_SAL` | `salivarycortisol`, `latenightsalivarycortisol`, `cortisolsaliva`, `کورتیزولبزاق` | Salivary Cortisol — abtinmed.org |
| `UFC` | `ufc`, `urinefreecortisol`, `urinaryfreecortisol`, `freecortisolurine`, `cortisolurine`, `24hurinefreecortisol`, `کورتیزولادرار۲۴ساعته` | nanomedicallab.com, parsteblab.com |
| `ACTH` | `acth`, `adrenocorticotropichormone`, `acthplasma` | — (common variants) |

Deliberately **not** mapped: bare `dst` (a procedure, not an analyte); `ACTH Stimulation Test` (its result is a cortisol); `17-Hydroxycorticosteroids` / `هیدروکورتیزول` (not UFC). No printed Iranian sheet was seen — N2 still applies. Known gap: a draw time printed in a separate column is lost by OCR, and a bare `Cortisol` row on a urine page maps to serum `CORTISOL` (harmless while `CORTISOL` is ungraded; Stage B's `cortisol_untimed` must check the unit).

**Validation rules**
- Every new key MUST have a `FA_NAMES` entry — enforced automatically by `M32` for every key in
  `ADULT_REFS`; `CORTISOL` (not in `ADULT_REFS`) needs a manual guard.
- No new key may appear in `units.js` without the sheet stating the SI unit (R4).
- Unitless cortisol-family value > 100 → not graded, `unit_unclear` flag on the finding (R4).
- `CORTISOL` MUST NOT be added to `ADULT_REFS`. If it ever is, afternoon values start grading as
  low — guard test required (see contracts).

---

## 2. `SamplingTime`

A property of a cortisol row, derived **only** from which key the printed name mapped to:

| printed name maps to | SamplingTime |
|---|---|
| `CORTISOL_AM` | `morning` |
| `CORTISOL` | `unknown` |
| `CORTISOL_DST` / `CORTISOL_SAL` / `UFC` | n/a — each test defines its own timing |

There is no transition: a row's time is fixed at mapping and never inferred from its value.

---

## 3. Engine output — one additive field

```
engineOut.ungraded : { [key]: number }   // mapped keys that have no reference range
```

Populated at the `noRef` branch in `runEngine()`. Internal to the engine: **not** added to
`engineDebug()` / `_engine`. Existing `noRef: string[]` is unchanged.

---

## 4. `hyperprolactinemia` — owner of `PRL`

**Fires when:** `PRL` graded `abnormal && dir === "high"`.

**Internal branches (one finding, never two):**

| condition | adds |
|---|---|
| `PRL > PRL_PITUITARY_LIKELY` (P46 #2, 200 ng/mL) | "physiologic/drug causes rarely reach this level; pituitary evaluation needed" — never "confirmed" |
| always | pregnancy, breastfeeding, medications, stress of the draw named as common causes (FR-008) |

**Thyroid companion — four arms (FR-006, N21):**

| state on the same sheet | sentence |
|---|---|
| `TSH` high **or** `FT4` low | hypothyroidism can itself raise prolactin; refers to the thyroid finding, does not restate it |
| `TSH` measured normal and `FT4` not low | thyroid excluded as the cause |
| `TSH` absent | thyroid not measured → suggest «TSH و FT4» (existing `SUGGEST_TESTS` row) |
| `TSH` low, `FT4` not low | thyroid abnormal but not in the direction that raises prolactin; refers to the thyroid finding |

Direction comes from `graded.dir`, never from a comparison with a cutoff (N12).

**Age:** the same limits at every age (spec Clarifications). No pediatric branch in `prlRef`; the
known over-read of infant prolactin is listed in `P46` for the reviewer.

**Urgency (P46 #12 family):** `routine` for `ULN < PRL ≤ 200`, `this_week` for `> 200`. Action
sentence derived from urgency via `actionFor()` (N20).

**Must never say:** that a normal or mildly raised prolactin rules out a pituitary tumour (hook
effect); that a raised prolactin proves active disease (macroprolactinemia); any drug or dose.

---

## 5. `adrenalAxis(e)` — owner of the cortisol family

Pure function of the engine output. Returns **exactly one** `AdrenalLabel` or `null`.

### Signals

| signal | definition |
|---|---|
| `hypoStrong` | `CORTISOL_AM < AM_INSUFFICIENCY_LIKELY` (P46 #3, 3 µg/dL) |
| `hypoWeak` | `CORTISOL_AM` graded low **and** `≥ AM_INSUFFICIENCY_LIKELY` |
| `hyperStrong` | `UFC > UFC_STRONG_MULTIPLE × ULN` (P46 #8, 4×) |
| `hyperScreen` | `UFC > ULN` **or** `CORTISOL_DST ≥ DST_POSITIVE` (P46 #9) **or** `CORTISOL_SAL > SAL_POSITIVE` (P46 #10) |
| `amHigh` | `CORTISOL_AM` graded high (needs P46 #4) |
| `untimed` | `e.ungraded.CORTISOL` present |

### Precedence (first match wins)

| # | label | when | urgency |
|---|---|---|---|
| 1 | `discordant` | any hypo signal **and** any hyper signal | `this_week` |
| 2 | `cushing_likely` | `hyperStrong` | `this_week` |
| 3 | `cushing_screen_positive` | `hyperScreen` | `routine` |
| 4 | `insufficiency_likely` | `hypoStrong` | `this_week` (cap, FR-020; P46 #12) |
| 5 | `insufficiency_indeterminate` | `hypoWeak` | `routine` |
| 6 | `am_high_nonspecific` | `amHigh` | `routine` |
| 7 | `untimed` | `untimed`, and none of the above | `routine` |
| — | `null` | nothing | — |

`discordant` exists because a sheet that argues both for and against cortisol excess (e.g. low
morning cortisol with a high UFC) must not be resolved by rule order — the only honest output is
"these conflict, discuss with the doctor", in one finding.

### ACTH companion (read, never owned)

For `cushing_likely` / `cushing_screen_positive` / `am_high_nonspecific` (FR-011, DSL 5.2.2):

| `ACTH` | sentence |
|---|---|
| `< ACTH_INDEPENDENT` (P46 #5, 10 pg/mL) | ACTH-independent — adrenal source |
| `> ACTH_DEPENDENT` (P46 #5, 20 pg/mL) | ACTH-dependent — pituitary or ectopic source |
| between | indeterminate; the doctor interprets with further tests |
| absent | not measured, needed to separate the source → suggest «ACTH» |

For the two insufficiency labels: ACTH present → quote it and say it helps the doctor tell an
adrenal from a pituitary cause, **no threshold** (DSL 5.3.3.1's ACTH cut-offs are defined after a
synacthen test and are not applied to a static value); absent → suggest «ACTH».

### Medication confounders (spec FR-023)

| labels | must name |
|---|---|
| `insufficiency_likely`, `insufficiency_indeterminate` | steroid medicines — tablets, injections, inhalers, creams |
| `cushing_likely`, `cushing_screen_positive`, `am_high_nonspecific` | estrogen / birth-control pills |
| `discordant` | both |
| `untimed` | neither (no direction is claimed) |

Never advice to stop or change a medicine (FR-018). No medication input is read or requested.

### Rules

One rule per label, each `match: (e) => adrenalAxis(e) === "<label>"` — the `mineralAxis`
shape. No two can fire on one panel by construction.

---

## 6. Constants — one number, one job

Diagnostic thresholds are **separate constants** from reference ranges (N23, "one number must do
one job"):

| constant | job | is NOT |
|---|---|---|
| `prlRef(sex)` upper bound | "is this prolactin unusual?" | the pituitary threshold |
| `PRL_PITUITARY_LIKELY = 200` | "physiologic causes rarely reach this" | a range |
| morning-cortisol range (P46 #4) | "is this cortisol unusual?" | the insufficiency threshold |
| `AM_INSUFFICIENCY_LIKELY = 3` | "insufficiency likely" | the range's lower limit |
| `ACTH_INDEPENDENT = 10`, `ACTH_DEPENDENT = 20` | source of cortisol excess | ACTH's reference range |

Changing a range therefore cannot silently move a diagnostic threshold, and vice versa.

---

## 7. `ClinicalRegisterEntry` — `P46`

One entry in `MEDICAL_RULES.md` under «در انتظار بازبینی», same shape as `P43`–`P45`:
test/rule ids · why · each of the 12 numbers in research.md R8 with source (Henry ch.25) and
what the patient reads either way · the three measured conflicts (TSH 4.5 vs 5.0; Na correction
2.4 vs 1.6; central-hypothyroid "inappropriately normal TSH" arm) with their measured outputs ·
the "next feature" list including the calcitonin/procalcitonin name-collision warning · the
all-ages decision and its known cost (infant prolactin over-read) · the
excluded-input and excluded-treatment rule lists · regression test ids.

**State transition:** `pending` → `approved` (per number) → implemented. A number that is not
approved blocks only the piece that uses it (see plan.md, Stage B ordering).
