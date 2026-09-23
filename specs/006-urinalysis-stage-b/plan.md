# Implementation Plan: Urinalysis Stage B (Henry ch.29): crystals, specific gravity, bilirubin/urobilinogen, cells

**Branch**: `recovery` (spec dir `006-urinalysis-stage-b`) | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md) (Stage B of specs/005)

**Input**: User Stories 3–6 and FR-013–FR-028 of the specs/005 spec. Stage A shipped in `c287812`.

## Summary

Four urine row types are either routed into the qualitative channel with no rule reading them (a silent drop), or sent
to «تفسیر نشدند» although the page detector already knows what they are (research R1):
- specific gravity
- crystals
- epithelial cells (squamous and renal tubular)
- dipstick bilirubin and urobilinogen

Stage B routes each through one pure decision function, reads each with one classifier, and adds one finding per
classifier. Where an existing finding already owns the same physical claim, Stage B hands off to it rather than adding
a second timeline (Stage A's Q4 precedent):
- serum bilirubin → the bilirubin and hemolysis rules
- tubular cast → `urine_cast_tubular`
- contamination → `bacteriuria_no_inflammation`

## Technical Context

**Language/Version**: Node ≥ 18 (ESM), plain JS
**Primary Dependencies**: none new
**Storage**: N/A
**Testing**: `node:test`, `npm test` in `khanesh-server/`, `rules/engine.test.js`
**Target Platform**: Express backend (the rules engine)
**Project Type**: web service; the engine is deterministic, and the LLM only rewrites findings
**Performance Goals**: N/A (a handful of regex passes per sheet)
**Constraints**: engine boundary; Persian-only patient text; no graded key for specific gravity (FR-017a); caveats must be
patient-visible, never `preanalytical` (FR-023a); every threshold goes to the register (FR-027)
**Scale/Scope**: 4 rules (crystal, specific gravity, bilirubin/urobilinogen, renal tubular cells) + 1 contamination rule;
3 route functions; 3 owner builds gain one folded sentence each

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1. Result: **PASS**, no violations.*

| Principle | Assessment |
|---|---|
| **I — The Engine Decides** | PASS. All changes are in `khanesh-server/rules/`. No prompt or model change. |
| **II — A Missing Test Is Not a Normal Test** | PASS; this is the active constraint. Every classifier has four states (present/negative/unknown/absent), and "not on this sheet" is used only for truly absent rows (N4). Unknown values go to `unmapped`, never to a reassuring branch. Hand-offs are written as "does that rule fire", calling the owners' own `match`. |
| **III — Measure, Never Quote** | PASS. R1 is a measured table. The baseline is re-derived in T001. |
| **IV — Test That Failed First** | PASS, and it is the merge gate. Each behavioural guard is observed red on `b9068df` (archive + junction). Rule-id set diffed before/after; the set only grows. The routes add no skip in existing readers, so there is no uncounted skip. |
| **V — Persian** | PASS. All strings are Persian; Latin crystal and cell names get Persian names in text. M38 covers the new module automatically. |
| **Clinical constraints** | PASS with a recorded gate. Five numbers (`SG_DILUTE_MAX`, `SG_CONCENTRATED_MIN`, `RTEC_UPPER_HPF`, `SQUAMOUS_CONTAM_HPF`, the crystal classes) go to **P51**, pending review. Hand-offs are asserted two-sided (exactly one finding per claim). |
| **Workflow** | PASS. No `SKIP_HOOKS`. A Lab Notebook entry is required, because the silent drop is wrong output (N25/N18 class). |

## Project Structure

### Documentation (this feature)

```text
specs/006-urinalysis-stage-b/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/engine-output.md
└── tasks.md              # /speckit-tasks
```

### Source Code

```text
khanesh-server/rules/
├── patterns_utils.js        # sgState, crystalClassOf/crystalAxis, epithelialKind, cellRoute/sgRoute/crystalRoute,
│                            #   urineBiliState/urobilState, urineBiliSentence, thresholds (P51)
├── adapter.js               # layer 1 consults the routes; new layer 1c for unitless rows
├── patterns_urinalysis.js   # NEW: urine_crystals, urine_specific_gravity, urine_bilirubin_urobilinogen,
│                            #   urine_renal_tubular_cells, urine_squamous_contamination
├── patterns_urine_casts.js  # export creatClause; tubular cast gains the loose-cell sentence
├── patterns_nephrology.js   # bacteriuria_no_inflammation gains the squamous sentence
├── patterns_biochem.js      # bilirubin_pattern (both arms) gains urineBiliSentence
├── patterns_biochem_new.js  # bilirubin_emergency gains urineBiliSentence
├── patterns_hematology.js   # hemolysis_pattern gains urineBiliSentence
├── patterns.js              # spread RULES_URINALYSIS
└── engine.test.js           # M171+
MEDICAL_RULES.md             # P51
CLAUDE.md                    # N25/N18 recurrence, file-structure line, rule count
```

**Structure Decision**: one new module, with the castAxis shape per classifier. The owners get *one appended sentence*,
not a second finding.

## Complexity Tracking

None.
