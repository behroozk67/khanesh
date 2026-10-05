# Implementation Plan: 24-Hour Urine and Body-Fluid Chemistry (Stage A — recognition only)

**Branch**: `recovery` (spec dir `014-urine24h-body-fluids`) | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-urine24h-body-fluids/spec.md`

## Summary

Recognise 24-hour urine rows (volume, protein, creatinine, urea, calcium, uric acid) and body-fluid rows (glucose,
protein, LDH, fluid type) as their own specimen identities. Keep them out of every serum, spot-urine and dipstick
key, and name them with value and unit on the existing «تفسیر نشدند» line, under a distinct «شناخته شد» wording.
This stage adds no finding, no grading, no derived number and no urgency. Every threshold in the source document
goes to `MEDICAL_RULES.md` as **P87**, pending review.

The technical shape copies specs/013: a pure identity module (`rules/specimen.js`) claims the rows in
`ocrToEngineInput` **before** `NAME_MAP`, prenatal or `qual` sees them. It puts them in a separate output channel
(`e.specimen`) that no rule reads. `server.js` and `prompt.js` turn that channel into Persian text, and change routing
so that a specimen-only sheet never says «طبیعی» and never claims "nothing was recognised".

## Technical Context

**Language/Version**: Node.js (ESM), the existing `khanesh-server` runtime

**Primary Dependencies**: none new (Express 4, `node:test`)

**Storage**: N/A (in-memory per request)

**Testing**: `node --test`. A new file `rules/specimen.test.js` (U01–U14) plus `api-contract.test.js` T54–T56. The full suite and `metamorphic.test.js` must stay green

**Target Platform**: the existing backend. No frontend change (`ocr_warnings` is already rendered)

**Project Type**: web service (rules engine + Express)

**Performance Goals**: one extra regex pass per row. Negligible beside OCR

**Constraints**: byte-identical output on every existing panel (FR-004). No new urgency. No derived numbers (clarification 2)

**Scale/Scope**: 10 analyte identities, about 60 spellings, 1 new module, 3 edited modules, 2 test files, 1 register entry

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I. Engine decides, model only speaks | The specimen channel never reaches the prompt, the graph or `safeEngineOut` (N13). No clinical judgement is added anywhere | ✅ PASS. `buildEnginePrompt` reads `findings` only, and the channel adds none |
| II. A missing test is not a normal test | A sheet with specimen rows must never get «نتایج … طبیعی است» without naming them. A specimen-only sheet must not get «هیچ‌کدام را نشناخت» (false) or «طبیعی» | ✅ PASS by design: R4 adds a specimen branch to `buildNormalResult` and a `recognized` variant to `buildUninterpretedResult` |
| III. Measure, never quote | The current-behaviour table in the spec was measured on `8e0d769`+wt. The baseline must be re-measured before implementing | ✅. `quickstart.md` step 0 |
| IV. Test that failed first | U01–U08 and T54–T56 must be red on the pre-change tree. Freezes U09/U10/U12 are green-before by design and labelled as such | ✅ planned |
| V. Persian is the patient's language | Every new string is Persian, and analyte names come from a Persian table, never raw keys (N8) | ✅. Strings fixed in [contracts/engine-specimen.md](contracts/engine-specimen.md) |
| Clinical change constraints | No threshold reaches code. P87 records every number with ✅/📘 | ✅ |

Post-design re-check (after Phase 1): unchanged, all PASS. No complexity-tracking entries.

## Phase 0 / Phase 1 artifacts

- [research.md](research.md): R1–R8 decisions (identity rules, placement, `U_CA` handling, routing, bare names on fluid pages)
- [data-model.md](data-model.md): the `e.specimen` channel, specimen row, fluid type
- [contracts/engine-specimen.md](contracts/engine-specimen.md): adapter output shape and the exact Persian strings
- [quickstart.md](quickstart.md): runnable validation

## Project Structure

### Documentation (this feature)

```text
specs/014-urine24h-body-fluids/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/engine-specimen.md
└── checklists/requirements.md
```

### Source Code

```text
khanesh-server/
├── rules/specimen.js          # NEW: identity only. specimenSheetEvidence(), specimenClaim(), SPECIMEN_FA, fluidTypeOf()
├── rules/adapter.js           # EDIT: claim layer in ocrToEngineInput before the prenatal claim; e.specimen out of runEngine
├── rules/prompt.js            # EDIT: specimenLine(), buildNormalResult specimen branch, buildUninterpretedResult({recognized})
├── server.js                  # EDIT: push specimenLine to ocrWarnings (engine + uninterpreted paths); routing for specimen-only
├── rules/specimen.test.js     # NEW: U01–U14
└── api-contract.test.js       # EDIT: T54–T56
MEDICAL_RULES.md               # P87: every threshold/urgency in the source document, all «در انتظار بازبینی»
CLAUDE.md                      # file-structure line for specimen.js; N2 recurrence note
```

**Structure Decision**: backend only, the same layout as specs/012 and specs/013 (an identity module shared by
adapter and later rules, plus a separate test file so it doesn't collide with concurrent `engine.test.js` work).

## Key design decisions

1. **Claim before mapping** (R2). The claimed row never reaches `mapKey`/`resolveAlias`, so no alias rule can land
   it on `LDH`, `GLU_F`, `TP` or `CREAT`. This is the specs/013 lesson: identity first, name second.
2. **Never steal an existing mapping** (R3). A row that `mapKey` already resolves is not claimed. This keeps
   `24h urine calcium → U_CA` (mineral axis) byte-identical. The one exception is bare `Urine Protein` / `Urine
   Creatinine` / `Urine Volume`, which are claimed only with 24-hour evidence (R1).
3. **The text lives on the warning line, not in a finding** (clarification 1). Urgency stays `none`.
4. **Routing** (R4). A specimen-only sheet stays out of the model path and gets a "recognised, not interpreted"
   result, not the "nothing recognised" one.

## Spec reconciliation (found while planning)

- **Bare `Glucose` / `LDH` on a fluid page** map to serum `GLU_F` / `LDH` today, measured. If the LIS prints a
  `Fluid Type` row beside bare names, Stage A cannot tell fluid from serum on the same sheet (request 28 has both).
  The spec's edge cases assumed fluid-prefixed names. Decision R6: this is a known limit, not claimed, recorded in
  P87 as an open question for the LIS column names. A `Fluid Type` row on a sheet with bare `Glucose`/`Protein`/`LDH`
  adds one Persian caution to the specimen line («اگر این مقادیر مالِ مایع‌اند، سرم خوانده شده‌اند»). This is
  testable (U13). It does not reassign the rows.
- `U_CA` already exists with a 100–300 mg/24h range and is graded when spelled `24h urine calcium`. New LIS
  spellings (`Urine Ca/24h`) go to the specimen channel, not to `U_CA`. Two identities for one analyte is a
  deliberate, temporary inconsistency, recorded in P87 (R3).

## Complexity Tracking

None.
