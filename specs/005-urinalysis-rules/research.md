# Phase 0 Research: Urinalysis Stage A

**Date**: 2026-09-22 · **Tree measured**: working tree at `395a5d7` · **Scope**: Stage A only

Every claim below was produced by running the engine, not by reading it. The probe panels are
reproducible from [quickstart.md](quickstart.md).

---

## R1 — The cast misread, and its exact mechanism

**Decision**: The defect is in the lookup, not in the adapter. Cast rows reach the engine
correctly; `urineCellCount` and `urinePositive` then match them with a regex intended for loose
cells.

**Measured**:

```
panel:  Nitrite Negative · WBC 2-3 /hpf · RBC Casts 5-8 /lpf
qual:   {"Urine WBC":"2-3","Urine RBC Casts":"5-8"}
fired:  hematuria  →  «در آزمایش ادرار شما خون (گلبول قرمز) دیده شده است»
```

A cast row carrying a `/lpf` unit is routed to the qualitative channel by adapter layer 1 and
stored under its printed name, `"Urine RBC Casts"`. `urineCellCount(e, /rbc|گلبول\s*قرمز/i)` tests
that key, matches on the substring `rbc`, parses `5-8`, and returns 8 as a free red-cell count.

**Rationale for locating the fix in the lookup**: the adapter is behaving correctly — a cast row
*is* a urine microscopy row and *does* belong in the qualitative channel. Changing the routing
would hide casts from the rules that are about to be written for them. The defect is that two
different findings share one name fragment.

**Alternatives considered**:

- *Rename cast rows in the adapter so the regex misses them* — rejected. This is the exact move
  N25 records as the wrong fix: the rules search `qual` by regex over **any** key, so a renamed row
  is still matched by the next regex someone writes. A separate channel or an explicit exclusion is
  the only durable shape.
- *Tighten each regex at each call site* — rejected as the primary mechanism. There are six call
  sites for red cells and two for white cells (R2); a fix repeated eight times is seven chances to
  miss one, and the next rule added makes nine. The exclusion belongs inside the helper.

---

## R2 — Blast radius: every call site the fix must cover

**Decision**: Eight call sites across four files, plus one shared predicate.

| Reads | Where | Rule |
|---|---|---|
| `/rbc/` | `patterns_nephrology.js:165` | `hematuria_pattern` |
| `/rbc/` | `patterns_nephrology.js:293` | `kidney` |
| `/rbc/` | `patterns_nephrology_new.js:116` | `persistent_microhematuria` |
| `/rbc/` | `patterns_nephrology_new.js:123` | `persistent_microhematuria` (build) |
| `/rbc/` | `patterns_utils.js:308` | `isGlomerulonephritis` — feeds `glomerulonephritis_pattern` |
| `/wbc\|puscell\|leukocyt/` | `patterns_nephrology.js:18` | `uti_pattern` |
| `/wbc\|puscell\|leukocyt/` | `patterns_nephrology.js:58` | `bacteriuria_no_inflammation` |
| `/leukocyte\|esterase/` | `patterns_nephrology.js:16, :56` | `uti_pattern`, `bacteriuria_no_inflammation` |

The last row is the one that is easy to miss: `urinePositive(e, /leukocyte|استراز|esterase/i)` is
looking for the *leukocyte esterase dipstick pad*, and it matches a row named «Leukocyte Casts».

**Rationale**: a fix inside `urineCellCount` and `urinePositive` covers all eight at once and
covers the ninth that has not been written yet. This is the shape the constitution asks for —
one number, one job — applied to a lookup instead of a threshold.

---

## R3 — A second live defect, found while measuring the first

**Decision**: White-cell casts are misread too, and the outcome depends on how the lab spells the
row. Both spellings are wrong, differently.

**Measured**, on a realistic urine sheet (colour, SG, pH, nitrite, urobilinogen, bacteria present):

```
Leukocyte Casts 8-10 /lpf · WBC 2-3 /hpf   →  fired: uti_likely / this_week
WBC Casts       8-10 /lpf · WBC 2-3 /hpf   →  fired: (nothing)
```

With the «Leukocyte Casts» spelling, the esterase lookup returns true *and* the cell-count lookup
returns 8, so `uti_pattern` reaches its two-signal threshold and the patient is told they have a
urinary tract infection — at `this_week`. White-cell casts are the chapter's discriminator for
infection **of the kidney**, which is not a this-week problem, and the patient's actual white-cell
count on that sheet is 2-3/hpf, which is normal.

With the «WBC Casts» spelling the esterase lookup misses, only one signal is reached, and the sheet
produces nothing at all.

**Rationale for including this in Stage A**: it is the same root cause and the same fix. Separating
it would mean shipping a correction that leaves its twin in place.

**This is the N2 "one test, two printed names" class** — the same row produces a wrong finding under
one spelling and silence under the other, and nothing reports the divergence.

---

## R4 — Which cast rows reach the engine at all

**Decision**: Cast rows carrying a `/lpf` or `/hpf` unit arrive intact. Cast rows without a unit do
not, and Stage A must route them.

**Measured**:

| Row | Result |
|---|---|
| `RBC Casts 5-8 /lpf` | → `qual["Urine RBC Casts"]` |
| `Hyaline Casts 1-2 /lpf` | → `qual["Urine Hyaline Casts"]` |
| `Granular / Waxy / Epithelial Casts, /lpf` | → `qual[...]`, all intact |
| `Casts: "Hyaline, few"` (no unit) | → **`unmapped`** |
| `Specific Gravity 1.020` | → **`unmapped`** |
| `Crystals: "Calcium Oxalate"` | → **`unmapped`** |

**Rationale**: the unit is doing all the work. Adapter layer 1 routes on `/hpf|lpf/`; a cast row
printed without one falls through every layer, fails `NAME_MAP`, and lands in `unmapped`.

Landing in `unmapped` is not silence — the patient reads «این تست‌ها … تفسیر نشدند». That is honest,
so it is not a defect, but it does mean a unitless cast row cannot trigger any Stage A finding.

**Decision for Stage A**: add cast row names to the qualitative allow-list so they route on name as
well as on unit. Specific gravity and crystals stay in `unmapped` until Stage B — that is where
they are scoped, and leaving them honestly uninterpreted in the meantime is correct.

---

## R5 — The dipstick-versus-microscope cross-check premise

**Decision**: Confirmed live, and it only reproduces on a sheet the engine recognises as a urine
page.

**Measured**:

```
FULL urine sheet + Blood +2 + RBC 0-2 /hpf  →  fired: hematuria / this_week
                                               «در آزمایش ادرار شما خون (گلبول قرمز) دیده شده است»
```

RBC 0-2/hpf is a normal red-cell count. The patient is told red cells were seen because the dipstick
pad was positive, and the microscope's disagreement is never mentioned.

**A constraint the implementation must respect**: the same panel *without* the surrounding urine
rows behaves differently — a bare `Blood +2` goes to `unmapped`, because `blood` is an ambiguous key
that is only treated as urinary on a page the adapter has classified as a pure urine page. Test
fixtures for the cross-checks must therefore be realistic sheets, not two-row panels. A two-row
fixture would pass while proving nothing.

**Alternatives considered**: *make `blood` unambiguously urinary* — rejected, out of scope and
directly against the guard that keeps a blood-panel haemoglobin from being read as urine blood.

---

## R6 — What the cast finding hands off to, and how often that is anything

**Decision**: The hand-off target is `glomerulonephritis_pattern`, and on a urine-only sheet it
cannot fire. The standalone cast finding will be what fires in practice.

**Measured**: `isGlomerulonephritis` requires haematuria **and** proteinuria **and** (raised
creatinine **or** anaemia). Creatinine and haemoglobin are blood tests. A urine-only sheet has
neither, so the predicate returns false regardless of how convincing the urine is:

```
FULL urine sheet + RBC Casts 5-8 + RBC 20-30 /hpf + Protein +2
  →  fired: proteinuria_2plus, hematuria      (no glomerulonephritis_pattern)
```

**Rationale**: this does not invalidate the clarification decision — the existing pattern still owns
the timeline **when it fires**, which is the correct precedence on a combined urine+blood sheet. It
does mean the implementer must not build the hand-off expecting the other side to be the usual case.
The standalone branch is the common path and needs the better text.

**Consequence for the hand-off condition**: it must be written as "did `glomerulonephritis_pattern`
actually fire", never as a restatement of its conditions. Restating them would embed a
blood-test requirement inside a urine rule, and the urine rule would then go quiet on exactly the
sheets it exists for.

---

## R7 — Where the new rules live

**Decision**: A new module, `rules/patterns_urine_casts.js`, holding one classifier and the cast
rules; the cross-check sentences fold into the existing rules in `rules/patterns_nephrology.js`.

**Rationale**: the cast rules partition one input space — a sheet gets **one** cast verdict, chosen
by clinical specificity (red-cell > white-cell > tubular-cell > waxy/broad > granular > hyaline) —
which is exactly the `patterns_mineral_bone.js` shape the project already prefers: one function
returns one label, and each rule asks only whether that label is its own. Two cast findings cannot
appear on one report because the classifier returns one value, not because each `match` was written
carefully.

The cross-checks are **not** new rules. They are sentences inside `hematuria_pattern` and
`uti_pattern`, because a second rule about the same dipstick pad is the N20 shape this feature is
meant to avoid.

**Alternatives considered**:

- *Put the cast rules in `patterns_nephrology.js`* — workable, but that file already holds eleven
  rules with independent `match`es, and adding six more that must be mutually exclusive by
  construction would hide the classifier shape.
- *A `_new`-suffixed module* — rejected outright. The constitution requires a `_new` module to
  declare what deletes its predecessor and in which commit; there is no predecessor here, so the
  suffix would be meaningless and the project has one unfinished migration in its history already.

---

## R8 — Reviewer-gated numbers

**Decision**: Stage A introduces exactly three numeric thresholds, and all three go to
`MEDICAL_RULES.md` as `P50` before they govern text.

| Number | Use | Source |
|---|---|---|
| Hyaline casts 0–2 /lpf | the boundary between "normal" and "raised" | Henry ch.29 |
| RBC ≤ 2 /hpf | the microscope "saw no meaningful red cells" arm of the blood cross-check | Henry ch.29 |
| WBC ≤ 5 /hpf (≤ 8–10 in women) | the "saw no white cells" arm of the esterase cross-check | Henry ch.29 |

The third carries a sex-dependent upper bound, which the engine can honour because sex is available
— but whether to use the wider female bound for the cross-check is a clinical judgement, and it is
written into `P50` as an open question rather than decided here.

**Rationale**: the constitution is explicit that a textbook number is a proposal until a human
reviewer approves it. Stage A can ship its *structure* — the exclusion fix, the classifier, the
hand-off — with the thresholds pending, because the exclusion fix is a correction that needs no new
number at all.

---

## Open questions carried into `MEDICAL_RULES.md` (`P50`)

1. Should the esterase cross-check use the wider female white-cell bound, or one bound for everyone?
2. Broad casts are defined by width relative to a normal cast, which no lab reports numerically —
   should «Broad casts» as a *named* row be treated as equivalent to waxy casts?
3. Granular casts appear transiently after strenuous exercise. Should the finding say so, given
   that the engine cannot know whether the patient exercised?
