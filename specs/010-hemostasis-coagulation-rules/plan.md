# Implementation Plan: Hemostasis & Coagulation Decision Rules

**Branch**: `recovery` (spec dir `010-hemostasis-coagulation-rules`; no branch hook) | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-hemostasis-coagulation-rules/spec.md` (clarified: Q1 = C, Q2 = A, Q3 = A, D6 = B, D10 = A)

## Summary

This feature makes the engine *read* four things that are silently dropped today, and adds two narrow tiers. Every
item the engine already has a value for stays byte-for-byte unchanged.

**Measured (research R1):** a sheet with only `Factor VIII Activity 0.5 %` currently gets **zero findings and the
canned "normal" result**. FIX, the vWF values and the Bethesda inhibitor behave the same way.

The approach:

- **New analytes.** FVIII, FIX, vWF:Ag, vWF:RCo, the Bethesda inhibitor and PT-control are mapped by exact
  `NAME_MAP` spellings into a new ungraded side channel (the specs/009 `smear` shape). They are read by a new
  `patterns_hemostasis.js`, and `refs.js` gets no new reference ranges.
- **Hemophilia bands.** Approved by the user (D10 = A), held in one function.
- **ISTH DIC.** The ISTH score becomes a `soon` tier beside `dic_pattern`, which does not change (Q1 = C).
- **Platelets.** `thrombocytosis` gets a PLT ≥ 1000 branch (D6 = B).
- **Also in scope after analyze:** the `server.js` fallback gate (a factor-only sheet must stay on the engine path, FR-019), an age gate for the factor bands (FR-020) and one extraction sentence in `OCR_PROMPT` (FR-022).
- **Deferred items.** Every deferred or held item (D1–D5 sub-values, D7–D9, D11–D13) is written to `MEDICAL_RULES.md`
  `P61` and not coded.

## Technical Context

**Language/Version**: Node.js (ES modules), existing `khanesh-server` runtime.

**Primary Dependencies**: none new. The feature uses `rules/adapter.js`, `units.js`, `patterns_utils.js`, `names.js`
and `patterns.js`.

**Storage**: N/A.

**Testing**: `node:test` via `npm test` in `khanesh-server/`. Tests go in `rules/engine.test.js` (next id `M247`) and
`api-contract.test.js` (next id `T32`).

**Target Platform**: Express backend (`/api/analyze` classic path). The frontend is not touched.

**Project Type**: web service, backend rules engine only.

**Performance Goals**: no measurable change. Each rule adds O(1) work per sheet.

**Constraints**: constitution I–V.

- No LLM involvement.
- No new `emergency` path.
- Persian written only through the Write/Edit tools, Bash or Node `fs`.

**Scale/Scope**:

- 4 new rule ids and 2 changed rules (`thrombocytosis.build`, `coagulation_abnormal.match`).
- About 40 new `NAME_MAP` spellings and 6 new `FA_NAMES`.
- 1 new patterns file and 1 `MEDICAL_RULES.md` entry.

## Constitution Check

| Gate | Status | How |
|---|---|---|
| I. Engine decides | ✅ | All bands, ratios and scores are in rules code. Nothing new reaches the prompt beyond `headline`/`must_say`, and the channel is excluded from the model and the graph (N13). |
| II. Missing ≠ normal | ✅ | Three-way branches for each state (data-model "State rules"): printed range, vWF partner, PT control, APTT beside a factor, inhibitor text. An ISTH component with its analyte absent is `null`, never 0. The `x ?? 'طبیعی'` pattern is forbidden. |
| III. Measure, never quote | ✅ | Baseline measured on `e285030`'s clean tree at 764/745/0/19. Probe and rule-id snapshot are saved (`probe-before.txt`, `ids-before.txt`). |
| IV. Red-first tests | ✅ planned | Every M/T test is run against `e285030` via archive + junction before it is accepted. The rule-id diff must be additions only. |
| V. Persian | ✅ planned | New strings are shown verbatim for review, with `M37`/`M38` guards. Proposed `FA_NAMES` are in data-model.md. |
| Sourced numbers | ✅ after analyze C1 | The D10 bands, PLT 1000 and the ISTH sub-values (inside the Q1 = C tier) were approved by your answers. The 0.5 BU and the 0.6 vWF ratio were **not** approved, so they are not in code (FR-021): the values are quoted and verdicts come only from a closed-list word or the row's own printed range. The rest of the original cell follows. Each code site carries «تأییدِ کاربر؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم», and all are listed in `P61` as pending review. D6/D10 have the user's answer; the ISTH, 0.5 BU and 0.6 values are bucket A and pending. |
| One number, one job | ✅ | D-dimer 400/4000 live only inside `isthScore`, and `ADULT_REFS.DDIMER` stays 500. No `dir`-as-diagnosis is added. |
| One owner per analyte | ✅ | `factorOwnsAptt` is a live-rule hand-off with a two-sided test (R8). `factor_inhibitor` folds into `factor_activity`. `dic_isth_score` wins the final action by rank, and the co-firing `must_say`s are checked for timelines (R5). |
| Band edges probed | ✅ | FR-018 boundary list (0.99 / 1 / 5 / 5.5 / 30 / 30.5 / 31) and PLT 999/1000. |
| New emergency checked on ordinary input | ✅ n/a | No new `emergency`. |

No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/010-hemostasis-coagulation-rules/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/engine-output.md
├── probe.mjs, probe-before.txt, ids-before.txt
└── checklists/requirements.md
```

### Source Code (touched)

```text
khanesh-server/rules/
├── (server.js, one level up)  # fallback gate keeps the engine path when `hemostasis` is non-empty; OCR_PROMPT sentence
├── adapter.js            # NAME_MAP spellings (R4), route to `hemostasis` channel, inhibitor closed list (R6)
├── units.js              # %/IU·dL/IU·mL → % ; BU (printed unit only) (R3)
├── patterns_utils.js     # factorBand, vwfRatio, isthScore, factorOwnsAptt
├── patterns_hemostasis.js  (new) # factor_activity, factor_inhibitor, vwf_panel
├── patterns_hematology.js  # dic_isth_score (new), thrombocytosis ≥1000 branch, coagulation_abnormal hand-off
├── patterns.js           # import + spread RULES_HEMOSTASIS
├── names.js              # 6 FA_NAMES
└── engine.test.js        # M247+
khanesh-server/api-contract.test.js   # T32: factor-only sheet is not the canned normal result
MEDICAL_RULES.md          # P61
CLAUDE.md                 # File Structure line for patterns_hemostasis.js; rule count re-measured
```

**Structure Decision**: backend only. The new file follows the `patterns_leukocyte.js` precedent: one clinical
subsystem per file, with a side channel read only by that file.

## Numbered implementation plan (file · why · verify)

1. **`MEDICAL_RULES.md` `P61`.** Write this first, so every number used later already has a register entry. It
   covers:
   - D1–D13 with engine vs input values and the recorded answers.
   - Open questions:
     - **61-a**: ADAMTS13 (D8) and TT (D9).
     - **61-b**: should ISTH ≥ 5 without `isDIC` be `emergency`?
     - **61-c**: factor bands are never `emergency`; confirm.
     - **61-d**: the 0.5 BU and 0.6 ratio values.
     - **61-e**: the `isolated_thrombocytopenia` `"today"` urgency and its «سایر رده‌ها طبیعی» wording (observation only).
   - Verify: `node .claude/skills/clinical-knowledge-extraction/scripts/engine-inventory.mjs --search PLT` lists P61.
2. **`adapter.js` + `units.js`: mapping and channel** (R2–R4, R6).
   - First run `resolveAlias` over every R4 neighbour and record the result in `research.md`.
   - Verify: new test **M247** (spelling sweep: each row lands where the R4 table says; Factor V/VII/X/XI/XII/XIII and
     bare «Inhibitor» stay unmapped) and **M248** (units: `0.01 IU/mL` ≡ `1 %`; unitless → `unknown`; inhibitor
     closed list with 12 spellings).
3. **`patterns_utils.js` helpers.**
   - Verify: **M249** (the FR-018 boundary list through `factorBand`) and **M250** (`isthScore` components, including
     PT-without-control = `null`).
4. **`patterns_hemostasis.js` + `patterns.js` + `names.js`.**
   - Verify: **M251** (factor-only sheet → `factor_activity`, not `unexplained_abnormal`, and the FVIII row absent from
     `unmapped`), **M252** (N21: APTT high with FVIII/FIX normal → `coagulation_abnormal` keeps it), **M253** (vWF
     partner missing / ratio 0.4) and **T32** (a `/api/analyze` factor-only sheet does not get `buildNormalResult`).
5. **`coagulation_abnormal` hand-off** (R8).
   - Verify: **M254**, a two-sided sweep over 6 panels. Exactly one of `factor_activity`/`coagulation_abnormal` owns
     APTT, and both warnings are present when the factor finding owns it (the M155 inventory).
6. **`dic_isth_score`** (R5).
   - Verify: **M255** (fires on `isth_nonovert`; `dic_emerg` is unchanged; `isth5_no_dic` is unchanged; the final
     action is the `soon` one; no co-firing `must_say` has a timeline).
7. **`thrombocytosis` ≥ 1000** (R9).
   - Verify: **M256** (1000 → `this_week`; 999 and 500 hashes equal the pre-feature output).
8. **Freeze** (SC-002).
   - Verify: **M257** hashes full `runPatterns` output for every unchanged panel in `probe-before.txt`, plus the
     existing coagulation/platelet fixtures.
9. **Red-first proof.** Run M247–M257 and T32 against the `e285030` archive with a `node_modules` junction. Each must
   fail there, except the freezes (M256's 999/500 half and M257), which must pass there by design.
10. **Final measurement.** Run `npm test` (fail 0), the probe diff (matches the quickstart table), the rule-id diff
    (four `>` lines, no `<`), and `npm run lint` in `khanesh/` (unaffected, run for the gate).
    - Then update CLAUDE.md: the File Structure line and the re-measured rule count.
    - Add a Lab Notebook entry **only if** a wrong patient-facing output is corrected. R1 qualifies as an N2
      recurrence, so its hash is added to N2.

## Complexity Tracking

None.

## Amendments from /speckit-analyze (2026-09-29)

| Finding | Change |
|---|---|
| C1 | 0.5 BU and 0.6 vWF ratio removed from code paths (quote-only, FR-021). Verdicts only from a closed-list word or the row's own printed reference; an unjudgeable inhibitor or vWF value is `this_week`. |
| H1 | New tasks: keep the engine path for a hemostasis-only sheet (`server.js`), and a factor-only probe/contract arm (FR-019). |
| H2 | `dic_isth_score` trigger is `!isDIC ∧ 50 ≤ PLT < 100 ∧ D-dimer > 400`; PLT < 50 stays with `severe_thrombocytopenia`. |
| H3 | `factorBand` takes age; under 16 no band (FR-020). New probe panels and a neonatal FIX test. |
| M1–M2, M4–M6 | Spec wording aligned (bare «Inhibitor» unmapped; "this week" not "urgent"; `PT_CONTROL` in FR-001; Stories 4–5; no-range >30 %). |
| M3 | New scan test (`M258`) for disease names and raw keys (FR-010, SC-005). |
| M7 | `OCR_PROMPT` gets one extraction-only sentence for the new rows (FR-022). |
| L1–L2 | D13 in the register table; T-item wording. |

Numbering is unchanged for existing tests M247–M257 and T32; the scan test is `M258`.
