# Implementation Plan: Endocrine & Pituitary Rules — Henry ch.25 (Prolactin, Cortisol/ACTH)

**Branch**: `001-endocrine-pituitary-rules` *(spec directory; no git branch was created)* | **Date**: 2026-09-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-endocrine-pituitary-rules/spec.md`

## Summary

Close a measured silence: today a sheet whose only abnormal value is prolactin (or cortisol) is
`unmapped`, so the patient receives the all-normal response. Add prolactin and the cortisol/ACTH
family to the deterministic engine as two single-owner axes: one `hyperprolactinemia` rule, and an
`adrenalAxis()` classifier that returns exactly one label. Draw time is encoded in the key chosen
by the printed name (`CORTISOL_AM` vs `CORTISOL`), and an untimed cortisol is carried to its rule
through a new engine-internal `ungraded` channel instead of being graded against a morning range.

Delivery is in two stages because of the constitution. **Stage A** registers every number as
`P46`, writes the failing guards, and adds recognition (name mapping and unit conversions), none of
which makes a clinical claim. **Stage B** adds ranges and rules only after the reviewer approves.
Seven DSL rules are duplicates of existing behavior, and a byte-identical freeze proves they add
nothing. Three conflicts are registered and left unchanged.

**Revision 2 (after `/speckit-clarify`, 2026-09-18):** two answers folded in — adult limits at
every age (no pediatric branch; infant-prolactin cost recorded in `P46`), and medication
confounders named in every cortisol finding (spec FR-023; steroid medicines for low, estrogen
pills for high; never advice to stop a medicine). Facts re-measured on the working tree before
this revision and unchanged: 113 rules, 89 graded keys; `Prolactin`, `Cortisol`, `ACTH` all
`unmapped` with zero findings; none of them in `PED_REFS`; `M101` and `P46` still free.

## Technical Context

**Language/Version**: JavaScript (ES modules), Node ≥ 18 — backend; React 19 + Vite 8 — frontend (one presentation file only)

**Primary Dependencies**: none new. Express 4 (unchanged), `node:test`, oxlint

**Storage**: N/A. `MEDICAL_RULES.md` is the clinical register (a document, not runtime storage)

**Testing**: `node --test` in `khanesh-server/` (`rules/engine.test.js`); `npm run lint` in `khanesh/`; N10 committed-tree check via `git archive` + `node_modules` junction

**Target Platform**: Node server behind Nginx; mobile-first web client

**Project Type**: web application (independent `khanesh/` frontend + `khanesh-server/` backend)

**Performance Goals**: no measurable change. The engine is synchronous and O(rules); adding 8 rules and 1 classifier is noise next to OCR (90–150 s per sheet)

**Constraints**: engine boundary (no clinical logic in prompts); Persian-only patient text; no unit guessing from magnitude; no `emergency` urgency from this feature; thresholds not executable before reviewer approval

**Scale/Scope**: 7 new engine keys, 1 ungraded channel, 8 new rules in 1 new module, ~4 unit conversions, 1 guideline entry, ~16 guard tests, 1 register entry (`P46`). All ages use adult limits; medication confounders are named in text only (spec Clarifications 2026-09-18, second round)

**Unknowns**: none remain unresolved at the design level. Three *numbers* have no source in the input (morning-cortisol reference range, ACTH reference range, UFC ULN). They are reviewer inputs, not design unknowns, and Stage B is ordered so each one blocks only its own piece — see [research.md](research.md) R8.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| principle / constraint | status | how |
|---|---|---|
| **I. Engine decides, model only speaks** | ✅ PASS | All logic is in `rules/`. No prompt edit. No new path that bypasses the step-8 safety nets. |
| **II. Missing ≠ normal** | ✅ PASS | Thyroid companion has 4 arms and ACTH has 4 arms, each with an explicit "absent" arm. Untimed cortisol makes no verdict. Direction comes from `graded.dir`. No `=== 0` fallback is introduced. |
| **III. Measure, never quote** | ✅ PASS | Baseline, rule count and duplicate freeze are re-derived at run time ([quickstart.md](quickstart.md) §0). Expected delta is stated as a formula, not a number. |
| **IV. Test failed first; deletions proven** | ✅ PASS | 15 of 16 guards are red before Stage B; `M103` is a "nothing changed" freeze, by design. Id-set diff: additions only, 0 removals. No silent-skip guard is introduced. |
| **V. Persian is the patient's language** | ✅ PASS | New keys get `FA_NAMES` entries. `M32` covers graded keys, and `M103e` covers `CORTISOL`, which `M32` cannot see. Test text is appended via Node `fs` or the Write tool, never PowerShell. |
| **Sourced thresholds, reviewer-approved** | ✅ PASS (by sequencing) | 12 numbers go to `P46` in Stage A. Stage B does not start until they are approved. No feature flag carries dormant code. |
| **One number, one job** | ✅ PASS | Diagnostic thresholds are separate constants from reference ranges ([data-model.md](data-model.md) §6). The existing TSH and Na-correction numbers are untouched. |
| **Exactly one owner per analyte; two-sided hand-off** | ✅ PASS | `hyperprolactinemia` is the single `PRL` owner. `adrenalAxis()` returns one label. `M102` sweeps for both silence and contradiction. |
| **Band edges probed** | ✅ PASS | Bands: PRL `(ULN, 200]` and `hypoWeak` `[3, LLN)`. Both edges of each are in the guard panels (`M101b`, `M101d`, `M102`). |
| **Emergency failure direction** | ✅ PASS | No rule emits `emergency` (FR-020, `M103d`). The reviewer may raise `adrenal_insufficiency_likely`. |
| **`_new` module must name its deleter** | ✅ N/A | The new module is not `_new`-suffixed and replaces nothing. |
| **Lab Notebook in the same session** | ⚠️ REQUIRED | The feature corrects a wrong patient output: unmapped prolactin produces "you're healthy". Add an N2 recurrence entry before reporting Stage B done. |

**Gate result: PASS** — no unjustified violation; Complexity Tracking is empty.

**Post-design re-check (after Phase 1):** ✅ still PASS. Two things the design added were checked
against the constitution. (1) The `ungraded` engine field is internal, is not serialized into
`_engine`, and is read only by the rule that owns it; it does not open the N17 hole because
`val(e)` is unchanged. (2) The `discordant` label means rule order never decides between opposite
conclusions (N20).

**Re-check after Revision 2:** ✅ still PASS. The medication sentences are fixed patient text in
Persian, with no new input and no drug advice (FR-018, `M102f`), so the engine boundary and
Principle V are unaffected. The all-ages decision adds no number, so there is nothing new to
register beyond recording its cost in `P46`. Neither answer adds a hand-off or a band.

## Project Structure

### Documentation (this feature)

```text
specs/001-endocrine-pituitary-rules/
├── spec.md              # /speckit-specify
├── plan.md              # this file
├── research.md          # Phase 0 — R1–R9
├── data-model.md        # Phase 1 — keys, adrenalAxis, constants, P46
├── quickstart.md        # Phase 1 — validation run guide
├── contracts/
│   └── engine-output.md # Phase 1 — _engine values, findings, guard ids
├── checklists/
│   └── requirements.md  # /speckit-specify quality checklist
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
khanesh-server/
├── rules/
│   ├── adapter.js                      # A: NAME_MAP seeds for 7 keys · B: `ungraded` output field,
│   │                                   #    unitless-cortisol >100 guard
│   ├── units.js                        # A: SI conversions (cortisol family, ACTH, UFC, PRL mIU/L)
│   ├── names.js                        # A: FA_NAMES for PRL, CORTISOL_AM, CORTISOL, CORTISOL_DST,
│   │                                   #    CORTISOL_SAL, UFC, ACTH
│   ├── refs.js                         # B: prlRef(sex) branch in getRef(); ranges for approved keys
│   ├── guidelines.js                   # B: HENRY_ENDOCRINE (ch.25)
│   ├── patterns_endocrine_pituitary.js # B: NEW — hyperprolactinemia, adrenalAxis() + 7 label rules
│   ├── patterns.js                     # B: import + spread RULES_ENDOCRINE_PITUITARY;
│   │                                   #    SUGGEST_TESTS rows «ACTH», «کورتیزول صبح»
│   ├── REF_DIFF.md                     # B: manual-entry REF deliberately lacks these keys
│   └── engine.test.js                  # A: M101–M103e
└── (server.js, api-contract.test.js)   # untouched — _engine shape unchanged

khanesh/src/
└── testCategories.js                   # B: new keys into the endocrine group (presentation only)

MEDICAL_RULES.md                        # A: P46
CLAUDE.md                               # B: Lab Notebook N2 recurrence; rule count; baseline rows
```

**Structure Decision**: this is the existing two-project web application. Nearly all change is in
`khanesh-server/rules/`. The response contract is unchanged, so `server.js` and the frontend
rendering code are not touched; `testCategories.js` is the only frontend file.

### Stage B ordering — what each unapproved number blocks

| piece | needs approved | if not approved |
|---|---|---|
| `PRL` range + `hyperprolactinemia` | #1, #2, #11 | nothing of prolactin ships (it is the MVP — the reviewer should prioritise these) |
| `adrenal_insufficiency_likely` / `_indeterminate` | #3, #4 (LLN only), #12 | `_indeterminate` needs the LLN; `_likely` needs only #3 |
| `cortisol_untimed` | none (no threshold) | ships as soon as the axis exists |
| Cushing labels via DST / salivary | #9, #10 | those signals are absent from the axis |
| Cushing labels via UFC | #7, #8 | UFC stays ungraded (no `UFC` range) |
| `cortisol_am_high_nonspecific` | #4 (ULN) | label never returned |
| ACTH companion arms | #5 (the arms); #6 (ACTH's own grading display) | without #5 the arms fall back to "quote value, doctor interprets" |
| medication-confounder sentences (FR-023) | none — fixed text, no threshold | ship with whichever cortisol labels ship |

## Complexity Tracking

> No constitution violations to justify.
