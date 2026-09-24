# Implementation Plan: Anaemia, Iron and Haemoglobin-Variant Reference Ranges

**Branch**: `recovery` (spec dir `specs/008-hematology-ref-ranges`) | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-hematology-ref-ranges/spec.md` (clarified: Q1 = A, Q2 = A, Q3 = A; clarify session: HbA2 hand-off = B, F ≥ 50 ferritin cut = A)

## Summary

This feature makes five changes to the deterministic engine. Nothing already in the engine is added a second time
(the Duplicates table in the spec).

1. **Hb anaemia thresholds by age and sex.** `hgbRef(sex, age)` replaces the flat adult lower limit and the unsourced
   `GERIATRIC_REFS.HGB` (`P2`):
   - M: 16–19 13.6, 20–49 13.7, 50–69 13.3, ≥ 70 12.4
   - F: 16–69 12.0, ≥ 70 11.8

   Upper limits are unchanged. It fixes both failure directions: false anaemia on the common adult case (G1/G2), and
   silence at age 80 (G3).
2. **Iron and ferritin ranges** become iron 50–160 and ferritin M 12–300, F 12–150, F ≥ 50 30–300. The IDA and ACD rules
   read named cut-offs, not the range (N23). The cut-offs are today's values, except women ≥ 50, whose cut is now
   < 30.
3. **Haemoglobin-variant identity.** HbA2, HbF and HbA, plus ZPP, sTfR and EPO, are recognised. HbS, HbC and HbE resolve
   only with electrophoresis evidence (a `%` unit or an HbA2/HbF/HbA row), because their names collide with hepatitis-B
   markers. A bare «HbS» leaves the reader-less `qual` channel for `unmapped`.
4. **HbA2 / HbF grading** (1.5–3.5 %, 0–2 %, from age 2). HbA2 > 3.5 gets one clause (> 3.8 trait-consistent, 3.6–3.8
   borderline) in the thalassaemia owners, or a new routine `hba2_elevated` when no owner fires. There is exactly one
   HbA2 mention per sheet.
5. **Frontend `labRefs.js` Hb bands** follow the backend. Ferritin and iron do not; the divergence goes in `REF_DIFF.md`.

Research found a **latent false emergency**, and the design must not arm it. `resolveAlias("hbs")` strips the plural
`s` and resolves to `HGB`. Only the anti-HBs qual regex keeps «HbS 40 %» from becoming Hb 40 g/dL. The fix therefore
adds exact `NAME_MAP` entries and never removes the regex. See [research.md](research.md) R4.

Everything unadopted goes to `P53`.

## Technical Context

**Language/Version**: Node.js ESM (backend); React/Vite (one frontend data file)
**Primary Dependencies**: none new; `node:test`
**Storage**: N/A
**Testing**: `npm test` in `khanesh-server/`, [probe.mjs](probe.mjs) before/after, `npm run lint` in `khanesh/`
**Target Platform**: Express server + the manual-entry form
**Project Type**: web service (rules-engine change)
**Performance Goals**: N/A
**Constraints**: deterministic; Persian patient text; no raw keys; no number without the approval source line
**Scale/Scope**: ~8 source files + 3 docs; ~20 new tests (behavioural + freezes); RULES 135 → 136

No NEEDS CLARIFICATION remains. Every unknown was resolved by measurement ([research.md](research.md) R1–R8).

## Constitution Check

*Pre-research and post-design. Both pass.*

| Principle / constraint | How the design complies |
|---|---|
| I. Engine decides | All clinical changes are in `rules/`. No prompt edits. |
| II. Missing ≠ normal | The HbA2 clause is three-way: > 3.8 / 3.6–3.8 / absent or ≤ 3.5 → no claim. HbA2 is not graded under 2 y rather than guessed. An ambiguous «HbS» is listed as not interpreted instead of disappearing. |
| III. Measure, never quote | Baseline re-measured 2026-09-23: `618 · 599 · 0 · 19 todo`, 135 rules, `rules/` clean on `9deba20`. |
| IV. Test failed first | Behaviour tests are red on `git archive 9deba20` + junction. Freezes are green on both. Rule-id diff = +`hba2_elevated` only. `geriatric.test.js` Hb 12.3 @ 75 M is changed on purpose (normal → low) and recorded. |
| V. Persian | New strings: FA names ×9, the ferritin «لبهٔ پایین» sentence, the HbA2 clauses ×2 per owner, the `hba2_elevated` text. All are shown verbatim before commit and written with Write/Edit only. |
| Source for every number | «تأییدِ کاربر ۱۴۰۵/۰۷/۰۱؛ مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم». `WHO_ANAEMIA` is not cited (its numbers differ). The held cut-offs keep their existing sources. |
| One number, one job (N23) | Ferritin and iron: the grading range and the rule cut-off are split into named constants. Hb: the readers were grepped (30 across 8 files). The malignancy thresholds are their own numbers; the rest mean "anaemic", so moving them is the decision. |
| One owner per analyte; hand-off = "does it fire" | `thalOwnerFires(e)` is extracted from the owners' `match`. A two-sided sweep asserts exactly one HbA2 mention. |
| Band edges probed | Ages 16/20/50/70; Hb at each limit; F 49/50 ferritin; HbA2 3.5/3.8; HbF/HbA2 at 2 y. |
| New/removed alarm: check the ordinary input | The ordinary inputs are an adult man with Hb 13.8 and ferritin 20, and «HBsAg Positive». All are in the probe or frozen. |
| Lab Notebook | **N23** (range split from rule cut-off) and **N25** (HbS/C/E identity; `resolveAlias` plural trap) each get a hash. |

No violations, so Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/008-hematology-ref-ranges/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/engine-output.md
├── probe.mjs, probe-before.txt          # measured 2026-09-23 on the working tree
└── tasks.md                             # /speckit-tasks
```

### Source Code (files this feature touches)

```text
khanesh-server/rules/
├── refs.js                 # hgbRef(), ferritinRef(); IRON [50,160]; ADULT_REFS.HBA2/HBF; GERIATRIC_REFS.HGB removed; getRefSource
├── adapter.js              # NAME_MAP (HBA2/HBF/HBA/ZPP/STFR/EPO, sickle*→HBS); a2 unit-gated; hbs/hbc/hbe electrophoresis gate;
│                           # bare non-numeric hbs → unmapped; HBA2/HBF < 2 y → noRef; unranged variant keys → noRef
├── names.js                # FA_NAMES ×9
├── patterns_utils.js       # ferritinIdCut(), IRON_ACD_LOW_UGDL, thalOwnerFires(), hba2Clause()
├── patterns_hematology.js  # iron_deficiency_panel / anemia_of_chronic_disease read the cut-offs; thal owners get the HbA2 clause
│                           # and drop the electrophoresis request; new hba2_elevated
├── patterns.js             # SUGGEST_TESTS: «الکتروفورز هموگلوبین» → [HBA2], «گیرندهٔ محلول ترانسفرین (sTfR)» → [STFR]
├── engine.test.js          # M184… (behaviour, red-before) + freezes
├── geriatric.test.js       # Hb 12.3 @ 75 M: normal → low, on purpose
└── REF_DIFF.md             # 008 section: Hb bands followed; iron/ferritin not; ped rows
khanesh/src/labRefs.js      # hb.range lower limits by age band
MEDICAL_RULES.md            # P2 closed; P53 (unadopted numbers + open questions)
CLAUDE.md                   # N23 / N25 hashes, baseline row, rule count 136
```

**Structure Decision**: mostly backend `khanesh-server/rules/`, plus one frontend data file (`labRefs.js`). The
response shape is unchanged ([contracts/engine-output.md](contracts/engine-output.md)).

### Order of work (each step verified before the next)

1. `ids-before.txt` and a range dump. Add the extra panels from quickstart §2 to `probe.mjs` and re-save
   `probe-before.txt`.
2. `refs.js` `hgbRef` and remove `GERIATRIC_REFS.HGB`. **Verify** the band-edge panels, the age-13 freeze, and that
   the crisis tests M162–M162c and M179–M183d stay green.
3. `refs.js` `ferritinRef` + IRON, and `patterns_utils.js` cut-offs + the two iron rules. **Verify** M40_Ferr20,
   F55_Ferr25, F49 vs F50, M40_ACD_Iron55; the texts must not contradict the grading.
4. `adapter.js` identity (R4). **Verify** every spelling in the quickstart list; «HBsAg»/«Anti-HBc» frozen; no path
   resolves `hbs` to `HGB`.
5. `refs.js` HBA2/HBF + the `< 2 y` gate; `names.js`. **Verify** HbF_electro, HbA2 at 1 y, and M32 green.
6. HbA2 clause + `hba2_elevated` + SUGGEST_TESTS. **Verify** HbA2_52, HbA2 3.7 / 3.9 alone, HbA2 1.0 in the net, and
   the one-mention sweep.
7. `labRefs.js` Hb bands. **Verify** lint plus a `node` probe of `range()`.
8. Tests: red on the `9deba20` archive, green on the tree. Full `npm test`. The probe diff must equal the quickstart §2
   table.
9. `MEDICAL_RULES.md` (P2 closed, P53), `REF_DIFF.md`, `CLAUDE.md`.
10. Show the Persian strings to the user; run `code-reviewer` + `eval-medical-reviewer` (two rounds).

## Decisions made in planning that the user may want to overrule

- **Ages 12–15 keep today's Hb band** (M 14 / F 12.3), because RCPCH has no row there and the reference's 12–15 rows
  are paediatric. Open in `P53`.
- **HbA2 > 3.8 does not override the Mentzer split.** In the iron-deficiency branch the clause says trait and iron
  deficiency can coexist. Open in `P53`.
- **HbA2 3.6–3.8** gets a borderline clause, not the trait sentence.
- **HbF > 2 % and HbA2 < 1.5 %** get no sentence and fall to the `unexplained_abnormal` net.
- **A bare «HbS: Positive» with no electrophoresis evidence** goes to «تفسیر نشدند» under its printed name. It could be
  a sickle test or anti-HBs, and nothing read it before.
- **Frontend Hb follows the backend; frontend iron and ferritin do not.**

## Complexity Tracking

None.
