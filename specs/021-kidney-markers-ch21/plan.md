# Implementation Plan: Kidney Markers, Package 2 (Tietz ch. 21)

**Branch**: `021-kidney-markers-ch21` (spec dir only) | **Date**: 2026-11-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/021-kidney-markers-ch21/spec.md`. User decision (2026-11-10): implement G1–G5, with G4 recognition-only (no grading).

## Summary

The work is five narrow changes to the deterministic engine, found by running 17 panels (`snapshots/before.txt`):

| Gap | What changes |
|---|---|
| **G1** | ACR printed in mg/mmol is classified on KDIGO's mg/mmol cut-offs (3/30). Today it is classified on the converted mg/g value, which reads 3.0–3.39 mg/mmol as A1 «طبیعی». |
| **G2** | `kidney` names a high urea/BUN, so the row stops falling into «توضیح نداریم». |
| **G3** | One new rule owns a low uric acid. |
| **G4** | PCR spellings map to a new key with no reference, so they are recognised and shown as not interpreted. |
| **G5** | `urea_low` adds a pregnancy sentence when `pregnant === true`. |

Nothing else changes, and the rule-id diff adds exactly one id (G3). All new patient wording goes into `MEDICAL_RULES.md` P133 in the same commit.

## Technical Context

**Language/Version**: Node ESM (plain JS), the existing `khanesh-server` runtime

**Primary Dependencies**: none new

**Storage**: N/A

**Testing**: `node --test` (all `*.test.js`). Regression tests go in `rules/engine.test.js`. Verification runs on a clean `git archive` copy with `node_modules` junctioned in.

**Target Platform**: the Express backend (`khanesh-server`)

**Project Type**: web service (rules engine inside the backend). No frontend change.

**Performance Goals**: N/A (adds O(1) work per sheet)

**Constraints**:
- Principle II: never under-read, and urgency is never lowered.
- Urea is never converted to BUN.
- No new numeric threshold beyond KDIGO's own mg/mmol band edges, which the classifier already cites.
- Persian text never passes through PowerShell.

**Scale/Scope**: about 6 source files, 1 new rule, about 10 regression tests

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I. Engine decides, model only speaks | All five changes are in `rules/`. There are no prompt changes. | PASS |
| II. A missing test is not a normal test | G1 removes an under-read. G4 makes the unmapped PCR recognised-not-interpreted, never normal. G3 and G5 never lower urgency. | PASS |
| III. Measure, never quote | The before/after probe is committed in `snapshots/`, and the suite runs on a clean copy. | PASS (to verify) |
| IV. Every fix is locked by a test that failed first | Each gap gets a test that is run against `HEAD` first (N10). | PASS (to verify) |
| V. Persian is the patient's language | New strings are Persian, and the new key gets an `FA_NAMES` entry (M32). | PASS |
| Clinical change constraints | P133 is allocated before the code (N37) and lands in the same commit. The six numeric conflicts are recorded, not applied. | PASS |

No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/021-kidney-markers-ch21/
├── spec.md
├── plan.md               # this file
├── research.md           # R1–R6: where each gap is fixed and why
├── data-model.md
├── quickstart.md
├── contracts/engine-output-acr-pcr.md
├── checklists/requirements.md
└── snapshots/  probe.mjs, before.txt (after.txt at implement)
```

### Source Code

```text
khanesh-server/rules/
├── adapter.js            # G1: keep printed mg/mmol on `tests._acr_mgmmol`, re-tag the ACR row, push unitConversions; G4: NAME_MAP spellings → UPCR
├── names.js              # G4: FA_NAMES.UPCR
├── patterns_nephrology.js# G1: albuminuria_pattern quotes the printed value and unit; G2: ureaAlongside() in kidney, glomerulonephritis_pattern and rhabdomyolysis_pattern; G5: urea_low pregnancy sentence
├── patterns_biochem.js   # G3: new rule `uric_acid_low` next to `hyperuricemia`
├── groups.js             # G3: RULE_GROUP kidney += uric_acid_low (guard GR1)
├── patterns.js           # G4: SUGGEST_TESTS «نسبت پروتئین به کراتینین ادرار» → ["UPCR"] so it is not re-requested when measured
└── engine.test.js        # KD1–KD10 regression tests
MEDICAL_RULES.md          # P133
CLAUDE.md                 # Lab Notebook entry N51 (ACR under-read)
```

**Structure Decision**: existing single backend. No new module, because each gap sits next to its existing owner.

## Complexity Tracking

_None._
