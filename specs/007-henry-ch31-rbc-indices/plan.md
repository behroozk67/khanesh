# Implementation Plan: Red-Cell Indices and Critical Values (Henry ch.31)

**Branch**: `recovery` (spec dir `specs/007-henry-ch31-rbc-indices`) | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-henry-ch31-rbc-indices/spec.md` (clarified: Q1 = B, Q2 = A, Q3 = B)

## Summary

This feature makes four clarified changes to the deterministic engine. Nothing duplicated from the Gemini extract is
implemented a second time.

1. **Female RBC range.** `ADULT_REFS.RBC.F` moves to 4.10–5.10. This removes a false "low red cells" on normal women.
2. **Hct-only crisis.** An adult sheet with Hct < 21 % and no Hb gets the existing Hb < 7 emergency. It goes through
   the **same** `anemiaCrisisOwns` predicate, with a second arm and a derived constant (Hb 7 × 3). It is not a
   parallel rule.
3. **Implausible-MCHC note.** A new text-only `routine` rule, `rbc_indices_implausible`, fires on MCHC > 36.5 with Hb
   and Hct both measured. It hands off to `spherocytosis_likely` and to the crisis. `low_rbc_hct_without_anemia`
   stands down beside it, so the "not anaemia" conclusion is never drawn from untrustworthy indices.
4. **Absolute reticulocyte count.** `RETIC_ABS` is recognised and named, and gets no range.

Every other number goes to `P52`.

Research surfaced **two pre-existing unit bugs that are preconditions, not scope creep:**
- `Hct 0.39 L/L` is graded as 0.39 %. Today that is a false "low"; with change 2 it would be a **false emergency**
  on a normal sheet.
- `MCHC 366 g/L` is graded as g/dL. With change 3, every SI sheet would get the artefact note.

Both are fixed by printed-unit conversions in `units.js`. Unresolvable unitless values stay ungraded (specs/003
machinery). See [research.md](research.md) R3 and R4.

## Technical Context

**Language/Version**: Node.js ESM (backend only)
**Primary Dependencies**: none new. `node:test` for tests.
**Storage**: N/A
**Testing**: `npm test` in `khanesh-server/` (bare `node --test`), plus [probe.mjs](probe.mjs) before/after diff
**Target Platform**: Express server (`khanesh-server/`); no frontend change
**Project Type**: web service (rules-engine change)
**Performance Goals**: N/A (a few extra predicate calls per request)
**Constraints**: deterministic, Persian patient text, no raw keys, no new unsourced numbers
**Scale/Scope**: 7 source files + 2 docs; about 12 new tests (behavioural + freezes); RULES 134 → 135

No NEEDS CLARIFICATION remains. Every unknown was resolved by measurement in [research.md](research.md).

## Constitution Check

*Pre-research and post-design. Both pass.*

| Principle / constraint | How the design complies |
|---|---|
| I. Engine decides | All changes are in `rules/`. No prompt edits. |
| II. Missing ≠ normal | The Hct arm requires "HGB **not graded**" and says so in text. The artefact note requires Hb **and** Hct to be measured (US3#6). `low_rbc_hct_without_anemia`'s three-way `hgbFa` is untouched. |
| III. Measure, never quote | Baseline re-measured 2026-09-23 (`598 · 579 · 0 · 19 todo`, 134 rules). "Red before" is taken against a working-tree copy, because specs/006 is uncommitted (R9). |
| IV. Test failed first | Each behaviour test is red on the pre-007 copy. Freezes are green on both. Rule-id diff: +1 exactly. |
| V. Persian | New strings: the crisis Hct branch, the artefact note, `FA_NAMES.RETIC_ABS`. All are shown verbatim to the user before commit. Written with Write/Edit only. |
| Source for every number | RBC-F: Henry ch.31 + user approval. Hct 21: derived from `HGB_CRISIS_GDL` (P8's Hb 7, still unsourced, as today). MCHC 36.5: «تأییدِ کاربر». Everything else is in `P52`. |
| One number, one job (N23) | The RBC readers were grepped (R1). Only `low_rbc_hct_without_anemia` reads RBC `dir === "low"`, and that change is intended. Boundary panels 4.09/4.10/4.49 are in the probe. |
| One owner per analyte; hand-off = "does it fire" | `spherocytosisFires(e)` is extracted from the rule's own `match`. `anemiaCrisisOwns` stays the single predicate. Two-sided sweep test (M162 shape). |
| Band edges probed | Hct 20.9/21.0, MCHC 36.5/36.6, RBC 4.09/4.10. |
| New emergency: check the ordinary input | The ordinary Hct input is 0.39 L/L or a normal unitless 39. That is why R3's unit fix is a precondition, plus the `value ≥ 1` guard in the predicate. |
| Lab Notebook | The HCT/MCHC unit bug corrects wrong patient output → add a hash to **N3** (a recurrence, not a new entry). The Hct-only crisis → add to **N19** (the worse the missing data, the less the patient was told). |

No violations, so Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/007-henry-ch31-rbc-indices/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/engine-output.md
├── probe.mjs, probe-before.txt          # measured 2026-09-23 on the working tree
└── tasks.md                             # /speckit-tasks
```

### Source Code (files this feature touches)

```text
khanesh-server/rules/
├── refs.js                 # RBC.F → [4.10, 5.10]
├── units.js                # SI_CONVERSIONS.HCT (L/L ×100), .MCHC (g/L ×0.1); unitless HCT ≤1 / MCHC >100 → unit_unknown
├── adapter.js              # NAME_MAP RETIC_ABS aliases; RETIC_ABS → noRef at every age; `%` on an ARC row → unmapped
├── names.js                # FA_NAMES.RETIC_ABS
├── patterns_utils.js       # crisisArm(), HCT_CRISIS_PCT, anemiaCrisisOwns widened; spherocytosisFires() if it lives here
├── patterns_hematology.js  # severe_anemia_crisis Hct branch; low_rbc_hct_without_anemia two stand-downs;
│                           # spherocytosis_likely.match → spherocytosisFires; new rbc_indices_implausible
├── engine.test.js          # M177… (behaviour, red-before) + freezes
└── REF_DIFF.md             # paediatric ch.31 vs PED_REFS; dead RETIC_ABS neonatal row
MEDICAL_RULES.md            # P52 (proposals + the three approvals with their approval lines)
CLAUDE.md                   # N3 / N19 hashes, baseline row, rule count 135
```

**Structure Decision**: backend `khanesh-server/rules/` only. The response contract is unchanged in shape
([contracts/engine-output.md](contracts/engine-output.md)), so `khanesh/` is untouched.

### Order of work (each step verified before the next)

1. Snapshot the pre-007 working-tree copy + junction (quickstart §1); ids-before, refs-before.
2. `units.js` HCT/MCHC conversions + unitless gates. **Verify** that `F_Hct018_LL`, `F_Hct018_nounit`, `MCHC_gL`
   change, and that unitless `Hct 18` / `Hct 39` / `MCHC 34` are byte-identical.
3. `refs.js` RBC.F. **Verify** the boundary panels (R1 table).
4. `patterns_utils.js` `crisisArm` + `severe_anemia_crisis` Hct branch + `low_rbc` stand-down. **Verify** Hct
   18/20.9/21/25, the Hct 18 + Hb 9 panel, child, age-unknown, and M162–M162c.
5. `spherocytosisFires` extraction. **Verify** M41 plus a byte-identical probe on `sphero`.
6. `rbc_indices_implausible` + the `low_rbc` stand-down. **Verify** G7, MCHC365/366, MCHC40_HbOnly, Hb55_MCHC38,
   ida, sphero, G7b, and `overall_urgency` unchanged.
7. RETIC_ABS aliases/name/noRef. **Verify** G8_* and that RETIC readers are unchanged.
8. Tests: red on the copy, green on the tree. Full `npm test`. Probe diff = the table in quickstart §2 exactly.
9. `MEDICAL_RULES.md` P52, `REF_DIFF.md`, `CLAUDE.md` (Lab Notebook + baseline row).
10. Show the Persian strings to the user. Run `code-reviewer` + `eval-medical-reviewer` (twice, per note.md §D).

## Decisions made in planning that the user may want to overrule

- **The artefact note is silent under an Hb/Hct crisis** (R5). US3#2 only requires the emergency to stand. Saying
  "may be an artefact" beside «فوراً به اورژانس» could make a patient discount it.
- **The Hct arm treats an unknown age as adult** (R2), the same default as the rest of the engine.
- **Unitless Hct ≤ 1 is not graded** rather than converted by magnitude (R3). The magnitude conversion goes to P52.

## Complexity Tracking

None.
