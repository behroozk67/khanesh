# Implementation Plan: Electrolytes and Blood Gases (Tietz chapter 24): gaps only

**Branch**: `024-electrolytes-blood-gases-ch24` (spec directory only; no git branch) | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/024-electrolytes-blood-gases-ch24/spec.md`

## Summary

Of the extraction's eight rules, six are already owned by the engine and are recorded as duplicates, never rebuilt (the user's condition). The first planning probe also moved R3 (platelets and serum potassium) into the duplicates: `pseudohyperkalemia_cell_count` already attaches that caveat. Two gaps remain:

1. **Pseudohyponatraemia caveat**: a new entry in `preanalytical.js` attached to `sodium_critical`. It is text only and is gated off at the sodium emergency.
2. **Sweat chloride**: a new key `SWEAT_CL` (ungraded, read in the printed unit) and one rule, `sweat_chloride_result`, with four value bands and two no-verdict states.

Both carry thresholds from an unverified extraction. Implementation waits for user decisions D1 and D3 ([research.md](research.md)).

## Technical Context

**Language/Version**: Node.js (ESM), the existing `khanesh-server`
**Primary Dependencies**: none new
**Storage**: N/A
**Testing**: `node --test` (`npm test` in `khanesh-server/`); new cases in `rules/engine.test.js` (constitution IV), probe in `snapshots/`
**Target Platform**: the existing Express backend
**Project Type**: web service, backend rules engine only; no frontend change (findings render through the existing path)
**Performance Goals**: N/A (two O(1) checks per sheet)
**Constraints**: no urgency lowered, no existing number changed, Persian-only text, no raw key in text, printed-unit-only reading
**Scale/Scope**: 4 rules files touched (`preanalytical.js`, `adapter.js`, `names.js`, `patterns_specimen.js`), plus `groups.js`, `patterns.js` (`SUGGEST_TESTS`), `MEDICAL_RULES.md`, tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Note |
|---|---|---|
| I. Engine decides, model speaks | ✅ | Both additions are deterministic engine output; no prompt change |
| II. Missing ≠ normal; direction ≠ severity | ✅ | Caveat requires TG/TP **measured** and above the cut-off; sodium direction from `dir`; sweat states include `unread` and `too_young`, never «طبیعی» by default |
| III. Measure, never quote | ✅ | Baseline measured on `HEAD c4d3622` ([snapshots/before.txt](snapshots/before.txt)); suite baseline 1787 tests, 1 failure (T15e, payment, pre-existing) — re-measured in quickstart step 1 |
| IV. Test failed first; rule-id diff | ✅ planned | Quickstart §3 (stash the rule changes, the tests must go red); id diff must be `+sweat_chloride_result` only |
| V. Persian, no raw key | ✅ | Drafts in [contracts/findings.md](contracts/findings.md); `FA_NAMES.SWEAT_CL`; invariant 4 |
| Clinical Change Constraints: a number needs a source and a reviewer | ⚠️ **conditional** | TG ≥ 1000 / TP ≥ 10 (D1) and the sweat-chloride urgencies (D3) are proposals with no source opened this session. They go into code **only** after the user decides D1/D3, and they land as P141 «در انتظار بازبینی» in the same commit (N37), the same practice as P133/P134 |
| One owner per analyte | ✅ | Caveat attaches to the existing `sodium_critical`; `SWEAT_CL` is a new analyte with one owner; serum `CL` untouched |
| Band edges probed; ordinary input checked | ✅ planned | Quickstart §4; no new `emergency` anywhere |

**Gate result:** PASS, conditional on D1 and D3 before `/speckit-implement`. Nothing is unjustified, so Complexity Tracking stays empty.

**Post-design re-check (after Phase 1):** unchanged. The design adds no channel the frontend must learn. `sweat_chloride_result` is an ordinary finding, the caveat uses the existing pre-analytical carrier, and `SWEAT_CL` reuses the `UNIT_KEPT` ungraded path that `UPCR` uses. One residual risk is recorded in [data-model.md](data-model.md): an ungraded key counts as «خوانده‌نشده» in `score.js`, which the probe must show and the user must accept or not (no `score.js` change in this feature).

## Project Structure

### Documentation (this feature)

```text
specs/024-electrolytes-blood-gases-ch24/
├── spec.md              # /speckit-specify (corrected during planning: R3 duplicate, 2-week age)
├── plan.md              # this file
├── research.md          # Phase 0: duplicates, decisions D1–D3, conflicts
├── data-model.md        # Phase 1: SWEAT_CL key, caveat inputs, states
├── quickstart.md        # Phase 1: validation commands and expected diff
├── contracts/
│   └── findings.md      # Phase 1: patient-facing strings and invariants
├── checklists/
│   └── requirements.md  # /speckit-specify
├── snapshots/
│   ├── probe_ch24.mjs   # 16 panels (G1 sodium, G2 sweat, G3 potassium)
│   └── before.txt       # measured on HEAD c4d3622
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
khanesh-server/rules/
├── preanalytical.js        # + pseudohyponatremia_lipid_protein (attachTo sodium_critical)
├── adapter.js              # + NAME_MAP spellings → SWEAT_CL; + "SWEAT_CL" in UNIT_KEPT
├── names.js                # + FA_NAMES.SWEAT_CL
├── patterns_specimen.js    # + sweat_chloride_result (exported in its RULES_* array, already spread into RULES)
├── groups.js               # + sweat_chloride_result in `general` (GR1)
├── patterns.js             # + SUGGEST_TESTS rows for «تکرار کلرید عرق», «آزمایش ژنتیک CFTR» (S11)
└── engine.test.js          # + one test per behaviour, Persian comments, red on HEAD
MEDICAL_RULES.md            # + P141 (duplicates, conflicts, not-executable list, D1/D3 decisions, «if rejected, remove …»)
```

**Structure Decision**: backend rules engine only. Each addition goes into the file that already owns its kind: pre-analytical caveats in `preanalytical.js`, non-blood specimens in `patterns_specimen.js`. No new module.

## Complexity Tracking

No constitution violations to justify.
