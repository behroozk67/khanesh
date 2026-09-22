# Data Model: Urinalysis Stage A

**Scope**: Stage A only. Stage B entities (crystal class, specific gravity, bile pigments) are
defined in [spec.md](spec.md) and are not modelled here.

The engine has no persistence. "Entities" here are the shapes the rules engine reads from and
produces during one evaluation of one sheet.

---

## 1. Urine microscopy row (existing — shape unchanged)

A row the adapter has already placed in the qualitative channel, `e.qual`, keyed by its printed name.

| Field | Type | Example | Notes |
|---|---|---|---|
| key | string | `"Urine RBC Casts"` | The printed name, prefixed with `Urine ` by the adapter when it lacks one |
| value | string | `"5-8"`, `"few"`, `"+2"`, `"negative"`, `"<2"` | Never parsed at storage time; parsed by the reader |

**Stage A change**: none to the shape. What changes is *which reader may consume a row*.

---

## 2. Row kind (new — derived, not stored)

Every urine microscopy row is exactly one of two kinds, decided from its key alone.

| Kind | Decided by | Readers allowed |
|---|---|---|
| **cast** | the key names a cast (English or Persian: `cast`, `cylinder`, `سیلندر`, `کست`) | the cast axis only |
| **loose** | every other urine row | the existing cell-count and pad lookups |

**Validation rules**

- **V1**: A row of kind *cast* MUST NOT be returned by the cell-count lookup or the pad-positivity
  lookup, regardless of the caller's regex. This is the fix for research R1–R3.
- **V2**: A row of kind *loose* MUST be treated exactly as it is today. On a sheet with no cast row,
  every existing reader returns a byte-identical result (`FR-004b`).
- **V3**: Every row excluded under V1 MUST be counted, and every counted row MUST be consumed by the
  cast axis. A row excluded and not consumed is a defect and must fail a guard, not disappear
  (constitution Principle IV).

---

## 3. Cast axis (new)

A single classifier over the sheet's cast rows, returning **one** label or `null`.

### Label set, in rank order

The rank is clinical specificity — the label that most narrows where in the kidney the problem is
wins. A sheet reporting granular and red-cell casts together is a red-cell cast sheet.

| Rank | Label | Points at | Default urgency | Reviewer-gated? |
|---|---|---|---|---|
| 1 | `rbc_cast` | bleeding originating in the glomerulus | `this_week` | text only |
| 2 | `wbc_cast` | infection or inflammation of the kidney itself, not the bladder | `this_week` | text only |
| 3 | `tubular_cast` | injury to the kidney's tubules | `this_week` | text only |
| 4 | `waxy_or_broad_cast` | long-standing kidney damage | `this_week` | Q2 in `P50` |
| 5 | `fatty_cast` | heavy protein loss | `this_week` | text only |
| 6 | `granular_cast` | non-specific; also transient after exertion | `routine` | Q3 in `P50` |
| 7 | `hyaline_cast_raised` | non-specific; exercise, fever, dehydration | `routine` | threshold in `P50` |
| — | `hyaline_cast_normal` | normal — row consumed, **no finding** (see correction below) | — | threshold in `P50` |
| — | `null` | no cast row present, or every cast row negative | — | — |

### Validation rules

- **V4**: The axis returns `null` when no cast row exists. A sheet without casts takes no cast
  branch — not a reassuring one, not any one.
- **V5**: A cast row whose value is negative (`negative`, `none`, `nil`, `0`, `-`, `منفی`) counts as
  absent for ranking. A negative red-cell cast row must never yield `rbc_cast`.
- **V6**: A cast row whose name is recognised as a cast but whose type is not (e.g. «Casts: mixed»,
  or «Casts: few» with no type anywhere in the name or value) is routed by the **adapter** to
  `unmapped`, so the patient reads the existing «تفسیر نشدند» line. It never reaches the cast axis,
  and is never mapped to the nearest known type. Putting this in the adapter reuses the one honest
  channel the engine already has, instead of inventing a sentence for "a cast we cannot name".
- **V7**: The axis is total over its inputs: it returns exactly one value for every sheet. Two cast
  findings on one report are impossible by construction.

### State of a hyaline cast

Hyaline casts are the one type whose meaning depends on the count.

```
hyaline count ≤ upper normal bound   →  hyaline_cast_normal   (row consumed, NO finding)
hyaline count > upper normal bound   →  hyaline_cast_raised   (non-specific sentence, routine)
```

The bound is Henry ch.29's 0–2 /lpf and is pending review in `P50`.

> **Correction made during `/speckit-tasks` (2026-09-22).** The earlier draft gave
> `hyaline_cast_normal` a reassuring finding at urgency `none`. Two measured facts rule that out:
>
> 1. **No rule in the engine emits `urgency: "none"`** (`grep` across every `patterns_*.js`: zero
>    hits). A finding at that urgency would be the first of its kind, on untested ranking code.
> 2. **Any finding at all takes a sheet off the normal path.** `server.js:978` returns the canned
>    `buildNormalResult()` only when `findings.length === 0`. Hyaline 0-1 /lpf is printed on a large
>    share of completely normal urinalyses, so a reassuring finding would move the single most common
>    normal sheet onto the billed LLM path and change its whole response — to say, at greater cost,
>    what the canned response already says.
>
> So a normal hyaline count is **read and judged normal without producing a finding**. The spec's
> acceptance scenario ("the report states this is a normal finding and does not raise urgency") is met
> by `buildNormalResult`, which already tells the patient their results are normal. The row is
> *consumed* — it counts toward V3's invariant — so it is not silently dropped.

---

## 4. Cross-check pair (new — lives inside existing rules)

A dipstick pad and the microscopy row that tests the same physical claim.

| Pair | Pad | Microscopy row | Host rule |
|---|---|---|---|
| Blood | blood / haemoglobin pad | loose red cells per hpf | `hematuria_pattern` (existing) |
| White cells | leukocyte esterase pad | loose white cells per hpf | `urine_esterase_without_cells` (**new**) — see correction below |

> **Correction made during `/speckit-tasks` (2026-09-22).** The plan named `uti_pattern` as the host
> for the white-cell cross-check. It cannot be: `uti_pattern` requires two of {esterase, nitrite,
> WBC > 5}, and the "argues against" state is by definition esterase alone with a normal WBC — one
> signal. Measured: probe X2 fires nothing. There is no existing rule to fold a sentence into, so this
> pair needs a small new rule. It is **not** a duplicate: no rule in the engine reads the esterase pad
> on its own (`grep` across every `patterns_*.js`).
>
> Its hand-off is two-sided: it fires only when neither `uti_pattern` nor
> `bacteriuria_no_inflammation` fires. When `bacteriuria_no_inflammation` fires on an esterase-positive
> sheet, the esterase sentence is folded into that rule instead, so the discordance is never lost and
> never stated twice.

### Three states

Every cross-check resolves to exactly one of three states. `FR-011` forbids treating the third as
either of the first two.

| State | Condition | What the patient reads |
|---|---|---|
| **agrees** | pad positive, microscopy above the normal count | nothing new — the existing finding is unchanged (`FR-012`) |
| **argues against** | pad positive, microscopy at or below the normal count | the pad's reaction without intact cells, and what can cause it |
| **not done** | pad positive, no microscopy row on the sheet | that the microscope count that would settle it is not on the sheet |

### Validation rules

- **V8**: The *agrees* state MUST leave the host rule's output byte-identical to today.
- **V9**: The *argues against* state MUST NOT assert that intact cells were seen. For the blood pair
  it names free haemoglobin or muscle pigment; for the white-cell pair it names sample handling and
  non-bacterial causes.
- **V10**: The *not done* state MUST NOT be read as either of the others. A missing microscopy row is
  an action item, not a verdict.
- **V11**: The microscopy count used by a cross-check MUST come through the corrected lookup, so a
  cast row can never stand in for the loose-cell count. This is where V1 and the cross-checks meet:
  without V1, `RBC Casts 5-8` would put the blood pair in the *agrees* state.
- **V12**: The host rule's urgency MUST NOT change in any state. A cross-check adds a sentence; it
  never downgrades a finding.

---

## 5. Hand-off (new relationship between two rules)

```
glomerulonephritis_pattern fired?
   ├── yes → it owns the timeline; the rbc_cast sentence is folded into its text (FR-008a)
   └── no  → the standalone rbc_cast finding fires with its own timeline (FR-008b)
```

**Validation rules**

- **V13**: The condition is "did `glomerulonephritis_pattern` fire on this sheet", never a restatement
  of its conditions (research R6: those conditions require blood tests). Concretely: call
  `isGlomerulonephritis(e)` — it **is** that rule's `match` (`patterns_nephrology.js`), so calling it
  asks the question rather than restating the answer. This is exactly how `hematuria_pattern` already
  defers to the same rule today. What is forbidden is re-deriving haematuria + proteinuria + creatinine
  inline.
- **V14**: Two-sided — on every red-cell-cast panel, **exactly one** of the two carries the cast
  sentence. Neither zero (silence) nor two (contradiction).
- **V15**: Folding the sentence in MUST NOT change `glomerulonephritis_pattern`'s urgency or remove any
  of its existing text.
