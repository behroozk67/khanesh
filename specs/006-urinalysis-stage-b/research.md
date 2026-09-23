# Research: Urinalysis Stage B (Henry ch.29): crystals, specific gravity, bilirubin/urobilinogen, cells

All facts below were measured on the working tree at `b9068df` (2026-09-22). That tree is Stage A (`c287812`),
plus the phrasing fix (`e62099e`), plus the P50 review docs (`b9068df`). The probe scripts are `probeB.mjs` and
`probeB2.mjs` in the session scratchpad. Each panel is a realistic urine page (Color, pH, Nitrite, Blood,
WBC /hpf, RBC /hpf) plus the row under test.

## R1: Where every Stage B row lands today

| Row as printed | Channel today | Any rule reads it? | Patient sees |
|---|---|---|---|
| `Specific Gravity 1.030` / `1.003` / `وزن مخصوص` (no unit) | `unmapped` | no | «تفسیر نشدند» line |
| `Crystals: Cystine` / `Cystine Crystals: Few` (no unit) | `unmapped` | no | «تفسیر نشدند» |
| `Calcium Oxalate: Many` (no unit) | `unmapped` | no | «تفسیر نشدند» |
| `Crystals: Calcium oxalate few` **/hpf** | `qual` (`Urine Crystals`) | **no** | **nothing: silent drop** |
| `Cystine Crystals: Few` **/hpf** | `qual` | **no** | **nothing** |
| `Epithelial Cells: Many` (no unit) | `unmapped` | no | «تفسیر نشدند» |
| `Epithelial Cells: Many` **/hpf**, `Squamous Epithelial Cells 10-15 /hpf` | `qual` | **no** | **nothing** |
| `Renal Tubular Epithelial Cells 5-10 /hpf` | `qual` | **no** | **nothing** |
| `Bilirubin +2` on a urine-only page | `qual` (`Urine Bilirubin`, layer 3) | **no** | **nothing** |
| `Urobilinogen +2` | `qual` (in `QUALITATIVE`) | **no** | **nothing** |
| `Bilirubin +2` on a mixed urine+CBC page | `unmapped` | no | «تفسیر نشدند» (safe: *not* misread as serum) |
| `Dysmorphic RBC 40%` | `unmapped` | no | «تفسیر نشدند» (already meets US6-AS3) |

**Decision:** SC-006 ("recognised and discarded" → 0) is a live defect for every `qual` row above. Those rows
disappear without a trace, which is worse than the `unmapped` rows: those at least reach the honest line. The
page detector (`URINE_ONLY_MARKERS`) already counts `specificgravity`, `crystals` and `epithelial…` as evidence of a
urine page. So the engine uses these rows to decide what page it is on, and then throws them away.

## R2: Routing (FR-017b, FR-016, SC-006)

**Decision:** add a **layer 1c** to `adapter.js`, directly after Stage A's cast layer 1b and with the same shape.
A pure route function in `patterns_utils.js` decides `qual | unmapped`. Layer 1 (`/hpf|lpf`) consults the same
function, so a row with a unit and a row without one are routed the same way.

- **Specific gravity**: `specificgravity|sg|وزن ?مخصوص` → `qual["Urine Specific Gravity"]` on **any** page. The name is
  urine-only vocabulary, so no other row can be meant. An unreadable value (`sgState` = unknown) → `unmapped`.
- **Crystals**: a row is a crystal row if its name contains `crystal|کریستال`, **or** it is one of the names that can
  only mean a crystal: `calcium oxalate`, `amorphous …`, `triple phosphate`, `ammonium biurate`.
  ⚠️ `Uric Acid`, `Cholesterol`, `Cystine`, `Tyrosine` and `Leucine` on their own are serum or amino-acid tests, and
  count as crystals **only** when the crystal word is present. A bare `Cholesterol 240 mg/dL` read as a
  "pathologic crystal" would be the N25 class in its worst form.
  Route:
  - a known class, or a negative value → `qual`;
  - present but of unknown type, or more than one class in one value → `unmapped` (FR-016), same as `castRoute`.
- **Epithelial cells**: the name decides the type.
  - `renal|tubular|توبول|کلیوی` → renal tubular.
  - `transitional` → out of scope: routed to `unmapped`, not interpreted.
  - `squamous|سنگفرشی`, or a bare `epithelial|اپی‌تلیال|اپیتلیال` → squamous. Iranian sheets print squamous cells as
    plain «Epithelial cells».

  A readable value goes to `qual`; anything else goes to `unmapped`.
- **Bilirubin/urobilinogen**: routing unchanged. Both already reach `qual` on urine pages. On a mixed page `Bilirubin`
  stays `unmapped` on purpose; the spec reuses page detection unchanged.

**Alternatives rejected:**
- Adding them to `QUALITATIVE`: that is unconditional, so `Cholesterol` and `Uric Acid` would be swallowed.
- Mapping them to engine keys with ranges: FR-017a forbids this for specific gravity.

## R3: Collision check against the existing `qual` readers (N25)

`urineCellCount`, `urinePositive` and `urineGrade` search every `qual` key by regex.

The new keys are:
- `Urine Specific Gravity`
- `Urine Crystals`, `Urine … Crystals`, `Urine Calcium Oxalate`
- `Urine Squamous Epithelial Cells`, `Urine Epithelial Cells`, `Urine Renal Tubular Epithelial Cells`

The existing reader fragments are `rbc|گلبول قرمز`, `wbc|puscell|پوسسل|leukocyt`, `blood|hb|خون`, `protein`, `glucose`, `ket`,
`nitrit`, `bacteri`, `esterase` and `myoglobin`. None of them occurs in the new keys. A guard runs the real readers over
panels carrying every new key and asserts no existing finding changes, so a later regex widening turns the suite red.

## R4: Specific gravity thresholds (FR-017, FR-018, FR-019a) → P51

Henry ch.29, per the user's text: random urine 1.003–1.035, usual 1.015–1.025.

**Proposal:**
- `SG_DILUTE_MAX = 1.005`: at or below it the sample is dilute, and the other pads may read falsely low.
- `SG_CONCENTRATED_MIN = 1.030`: at or above it the sample is concentrated.
- A print without the decimal point (`1030`) is read as `/1000`. Anything outside 1.000–1.060 is `unknown` →
  `unmapped`.
- Both dilute and concentrated are **routine**. The concentrated finding is worded as a property of the sample, not an
  abnormality (FR-019a).
- Concentrated with a positive protein or glucose pad gets a **caveat only, no correction** (spec edge case; the
  correction is a reviewer decision, recorded in P51).
- Usual → no finding. The reasoning is Stage A's normal-hyaline decision: any finding takes the sheet off
  `buildNormalResult`.

## R5: Crystal classes (FR-013–FR-016)

| Class | Members | Urgency | Text core |
|---|---|---|---|
| always-pathologic | cystine, tyrosine, leucine, cholesterol (with the crystal word) | `this_week` | never a normal finding. Cystine → an inherited condition that forms kidney stones; tyrosine/leucine → severe liver disease; cholesterol → heavy protein loss. Always "points at", never "you have" (FR-026). |
| stone-associated | uric acid, calcium oxalate, triple phosphate | `routine` | usually harmless, diet- or sample-related; stones are possible, never asserted. Triple phosphate also names infection in alkaline urine. |
| incidental | amorphous urates/phosphates, ammonium biurate | `routine` | a property of a cold, concentrated or alkaline sample (FR-015) |

One classifier, `crystalAxis(e)`, returns one label (the mineralAxis/castAxis shape). It is ordered pathologic > stone >
incidental, with an `others` sentence naming the lower classes (Stage A's B4 lesson).

## R6: Bilirubin/urobilinogen matrix (FR-020, FR-021)

Bilirubin ∈ {positive, negative, unknown, absent}; urobilinogen ∈ {raised, normal, unknown, absent}. `Normal`, `0.2`,
`Trace` and `Negative` all count as *normal* for urobilinogen, because a dipstick cannot report "decreased" reliably.

| bilirubin | urobilinogen | Finding | Urgency |
|---|---|---|---|
| positive | raised | only the processed form reaches urine → liver or bile ducts; with a raised urobilinogen it leans toward the liver cells | `this_week` |
| positive | normal | same core; leans toward the bile's outflow | `this_week` |
| positive | absent | same core; says urobilinogen is not on the sheet | `this_week` |
| negative | raised | red-cell breakdown or the liver; not obstruction (US5-AS3) | `routine` |
| negative/absent | normal/absent | no finding | — |

**FR-021 hand-off:** when `bilirubin_pattern`, `bilirubin_emergency` or `hemolysis_pattern` fires, the urine rule stands
down and its sentence (`urineBiliSentence(e)`) is appended to that finding. The serum finding owns the one timeline, as
decided in Stage A's Q4. The predicate calls the owners' own `match` (imported rule objects) and never re-states their
thresholds (the M91e lesson).

**Orphan check before gating (N20):** the urine rule is the only owner of the dipstick phrases ("processed bilirubin",
urobilinogen). Those travel in the folded sentence, so nothing is orphaned.

## R7: Cells (FR-022, FR-023, FR-023a)

- **Renal tubular cells**:
  - `RTEC_UPPER_HPF = 2`: more than 2/hpf, or a descriptive few/moderate/many, counts as present → `this_week`.
  - Three-way creatinine clause, reusing Stage A's `creatClause` (exported).
  - Hand-off to `urine_cast_tubular`: when that cast fires, it owns the finding and gains one sentence about the loose
    cells. Two findings about one injury would violate SC-002.
- **Squamous**:
  - «Many/Numerous/زیاد/+3», or a count ≥ `SQUAMOUS_CONTAM_HPF = 15`/hpf → a `routine` finding the patient reads
    (FR-023a: not `preanalytical`).
  - It never changes another finding.
  - Hand-off: if `bacteriuria_no_inflammation` fires, it already says "contamination, repeat midstream", so the
    squamous sentence is folded into it and the standalone finding stands down. Otherwise the patient gets two
    midstream suggestions.
- **Dysmorphic RBC % and urine eosinophils**: already `unmapped` (R1). A freeze guard keeps them there (FR-022a); the
  exclusion is recorded in P50.

## R8: Suggest strings

New suggestions use the Stage A form «کامل ادرار — …», which `phraseSuggestion` renders as
«درخواست آزمایش کامل ادرار از پزشک — …». No new `SUGGEST_TESTS` panel strings are introduced, so there is no N8 table row
to forget.

## R9: The "nothing explains this" net

None of the new rows is a graded key, so `unexplained_abnormal` never sees them. The equivalent risk here is the
`unmapped` line. Any value a route cannot read goes there, never into `qual` without a reader (SC-006).
