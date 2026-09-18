# Implementation Plan: Reproductive, Fertility & hCG Rules — Henry ch.26

**Branch**: `002-reproductive-fertility-rules` *(spec directory; no git branch was created)* | **Date**: 2026-09-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-reproductive-fertility-rules/spec.md`

## Summary

This feature does two things. **It removes a wrong answer the app gives today:** a semen-analysis
page is read as a urine test, and a semen `RBC 8-10` fires `hematuria` («در آزمایش ادرار شما
خون … دیده شده است»). **It fills a silence:** every sex hormone, the semen parameters and hCG are
`unmapped` today.

The design follows the same two-stage pattern as `001`.

- **Stage A** makes no new clinical claim, so it needs no reviewer. It contains:
  - per-page semen detection, as layer 0 in the adapter;
  - a `mergePages` fix, so a semen page can no longer erase a CBC's WBC;
  - recognition: names, Persian names, and exact unit conversions;
  - the `P47` register entry;
  - every guard. The Stage B guards are marked `todo`.
- **Stage B** adds ranges and eight single-owner rules in a new `patterns_reproductive.js`, one
  approved `P47` row at a time. It also adds the shared `ungraded` channel (from `001`), so that
  day-less, pediatric, sex-unknown and hCG-positive values are shown without a verdict. And it
  changes routing, so a hormone-only sheet reaches the engine instead of the legacy path.

Duplicates are not re-implemented. The pre-eclampsia components, the proteinuria pregnancy
sentence and the thyroid rules are frozen byte-identical by guard `M111`. The prolactin branches
stay with `001`.

## Technical Context

**Language/Version**: JavaScript (ES modules), Node ≥ 18 for the backend; React 19 + Vite 8 for the frontend (one presentation file)

**Primary Dependencies**: none new (Express 4, `node:test`, oxlint)

**Storage**: N/A. `MEDICAL_RULES.md` is the clinical register, a document rather than runtime storage

**Testing**: `node --test` in `khanesh-server/` (`rules/engine.test.js`, `api-contract.test.js`); `npm run lint` in `khanesh/`; the N10 committed-tree check via `git archive` + `node_modules` junction

**Target Platform**: Node server behind Nginx; mobile-first web client

**Project Type**: web application (independent `khanesh/` + `khanesh-server/`)

**Performance Goals**: no measurable change. Page detection is one extra O(rows) pass; the rules are O(rules), which is noise next to OCR's 90–150 s

**Constraints**: engine boundary; Persian-only patient text; no unit guessing; no `emergency`; thresholds not executable before approval; the pregnancy flag is **not** read by the engine (Clarifications Q2); no verdict under 16 or with unknown sex (Q5); progesterone gets no verdict next to a positive hCG (Q6)

**Scale/Scope**: 26 engine keys (7 of them context/qual only), 1 page detector, 1 `mergePages` key change, 6 exact unit conversions, 8 rules in 1 new module, 22 `P47` rows, ~25 guards, 1 guideline id

**Unknowns**: none remain at the design level. Eight *numbers* have no source in the DSL (`P47` rows 11–13, 16, 18–21). They are reviewer inputs, not design unknowns. Each blocks only its own rule ([data-model.md](data-model.md) §5; see the Stage B ordering below). The decision to use row names and units for the semen signal, rather than a printed title, is resolved in [research.md](research.md) R1; the OCR `section` field is recorded as a follow-up.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| principle / constraint | status | how |
|---|---|---|
| **I. Engine decides, model only speaks** | ✅ PASS | All logic is in `rules/` + the adapter. No prompt edit (including OCR, R1). The pregnancy flag stays prompt-only. No new path bypasses the step-8 nets. |
| **II. Missing ≠ normal** | ✅ PASS | Three-way arms: LH/FSH for low T, fructose for azoospermia, abstinence, each androgen. Ungraded values carry a reason, never "normal". The routing change (R6) ships together with its owning rule, so an ungraded-only sheet can never reach `buildNormalResult` (`T19`). |
| **III. Measure, never quote** | ✅ PASS | The baseline, id set and probes are re-derived in [quickstart.md](quickstart.md) §0–2. Every "today" claim in the spec came from a live run. |
| **IV. Test failed first; deletions proven** | ✅ PASS | Every behavioral guard is red first (`M104`, `T18` in Stage A; all Stage B guards via `todo`). Freezes (`M104c/d`, `M111`) are declared as such. Id-set diff: additions only. |
| **V. Persian is the patient's language** | ✅ PASS | 26 `FA_NAMES` + 4 reason sentences listed verbatim in [contracts/engine-output.md](contracts/engine-output.md). `M105b` covers ungraded/qual keys that `M32` cannot see. No PowerShell text moves. |
| **Sourced thresholds, reviewer-approved** | ✅ PASS (by sequencing) | 22 rows go to `P47` in Stage A. Stage B runs row by row. The AMH factor, a convention, is registered and not applied. |
| **One number, one job** | ✅ PASS | Diagnostic thresholds (`TESTO_LOW_M`, `PROG_OVULATION`, `HCG_*`, `MENOPAUSE_AGE`) are separate constants from reference ranges. No existing range changes. |
| **Exactly one owner per analyte; two-sided hand-off** | ✅ PASS | Ownership table in R7. Two classifiers each return one label. `M110` sweeps for silence **and** double claims. `femaleAxis` refuses the DSL's amenorrhea-dependent branch (R7). |
| **Band edges probed** | ✅ PASS | hCG grey zone (both edges), morphology exactly 4 %, abstinence 2 and 5, menopause age: each is an explicit guard panel. |
| **Emergency failure direction** | ✅ PASS | No rule emits `emergency` (`M111b`). The highest is `this_week` (low T, ovarian insufficiency, hCG in a man). |
| **`_new` module must name its deleter** | ✅ N/A | `patterns_reproductive.js` is new and replaces nothing. |
| **Lab Notebook in the same session** | ⚠️ REQUIRED | Stage A corrects a wrong patient output (semen read as urine), so a Lab Notebook entry is due before Stage A is reported done. |

**Gate result: PASS.** No unjustified violation; Complexity Tracking is empty.

**Post-design re-check (after Phase 1):** ✅ still PASS. Three design additions were checked:
1. **Layer 0 runs before `/hpf`.** It can only *remove* a urinary reading from a page that has
   semen evidence. A page with blood markers keeps its WBC/RBC (`M104c`), so it cannot take away
   a CBC value.
2. **The `mergePages` key change** can only keep *more* rows, never fewer (`T18`).
3. **Changing `getRef()` to return `null`** for reproductive keys with unknown sex or age < 16
   is scoped to the new keys, so no existing key's grading changes (`M104d`, `M111`).

## Project Structure

### Documentation (this feature)

```text
specs/002-reproductive-fertility-rules/
├── spec.md              # /speckit-specify + /speckit-clarify (6 clarifications)
├── plan.md              # this file
├── research.md          # Phase 0 — R1–R10
├── data-model.md        # Phase 1 — page classification, keys, classifiers, constants, P47
├── quickstart.md        # Phase 1 — validation run guide
├── contracts/
│   └── engine-output.md # Phase 1 — response impact, rule ids, FA names, guard ids
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
khanesh-server/
├── server.js                         # A: mergePages dedupe key (semen: prefix) + export
│                                     # B: routing condition graded∪ungraded∪semen (R6)
├── api-contract.test.js              # A: T18 · B: T19
└── rules/
    ├── adapter.js                    # A: SEMEN_ONLY_MARKERS, detectSemenPages/isSemenPage (export),
    │                                 #    layer 0; NAME_MAP seeds incl. day-3/day-21 name→key;
    │                                 #    negative collisions · B: ungraded routing with reason
    ├── units.js                      # A: 6 exact conversions (R8); AMH deliberately absent
    ├── names.js                      # A: FA_NAMES × 26
    ├── refs.js                       # B: approved ranges; getRef → null for repro keys when
    │                                 #    sex unknown or age < 16
    ├── patterns_utils.js             # B: shared constants (TESTO_LOW_M, HCG_NEG/POS, …)
    ├── patterns_reproductive.js      # B: NEW — 8 rules, maleAxis(), femaleAxis()
    ├── patterns.js                   # B: import + spread; SUGGEST_TESTS rows («تکرار آنالیز منی»,
    │                                 #    «LH و FSH», «تستوسترون صبحگاهی», «DHEA-S», «17-OHP», …)
    ├── guidelines.js                 # B: HENRY_REPRO (ch.26)
    ├── REF_DIFF.md                   # B: manual-entry REF deliberately lacks these keys
    └── engine.test.js                # A: M104–M111b (Stage B ones as todo)

khanesh/src/testCategories.js         # B: «باروری و هورمون‌های جنسی» group (presentation only)
MEDICAL_RULES.md                      # A: P47
CLAUDE.md                             # A: Lab Notebook entry · B: rule count, baseline rows
```

**Structure Decision**: this is the existing two-project web app. Changes are concentrated in
`khanesh-server/rules/`. `server.js` is touched in two narrow places (the merge key and one
routing condition). The response shape is unchanged, so the frontend rendering code is not
touched.

### Dependency on `001`

The `ungraded` channel is designed in `001` (`P46` Stage B) and is not yet built (`M103b` is
`todo`). Whichever feature reaches Stage B first builds it with the `reason` field defined in
[data-model.md](data-model.md) §3, and the other consumes it. This feature's Stage A does
**not** depend on it.

### Stage B ordering — what each unapproved `P47` row blocks

| piece | needs approved | if not approved |
|---|---|---|
| `semen_analysis` | #1 (edition) → #2–6, #7, #8, #9 | the semen keys stay recognized but ungraded, and the misreading fix (Stage A) still stands |
| `male_gonadal_axis` | #10, #11 | TESTO/LH/FSH stay in `noRef` |
| `female_ovarian_axis` | #12, #13, #14 | day-3 keys stay in `noRef` |
| `luteal_progesterone` | #15 | `PROG_D21` stays in `noRef` |
| `amh_level` | #16 (#17 only for pmol/L sheets) | `AMH` stays in `noRef` |
| `female_androgen_excess` | #18, #19, #20 (each arm independently) | an arm without an approved ULN says "the doctor interprets" |
| `hcg_result` | #21 | `HCG` stays in `noRef`; qualitative positive/negative can still ship (no threshold needed) |
| `reproductive_hormone_context` + routing (R6) | none (no threshold) | ships with the first hormone rule, never alone |
| urgency caps | #22 | the default cap is `this_week` |

## Complexity Tracking

> No constitution violations to justify.
