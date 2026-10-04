# Implementation Plan: Prenatal Serum Screening (Double / Quad Marker)

**Branch**: `013-prenatal-serum-screening` | **Date**: 2026-10-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-prenatal-serum-screening/spec.md`

## Summary

Add a separate, ungraded **`prenatal` channel** to the engine (same shape as the specs/010 `hemostasis` channel), filled by a two-pass identity layer in the adapter, and read by one new rules module with **one classifier per trimester arm**. MoM and printed risk are inputs only; nothing is converted, recomputed or graded. Only thresholds the source marks ✅ become executable. Everything else (T18/T13/Turner/triploid pattern cut-offs, the 0.5–2.0 band, hCG "low", aspirin, PAPP-A follow-up protocol) is named without a verdict and registered as a pending item.

**Measured starting point (research.md):** every screening row is `unmapped` today. The one live wrong output is a quad sheet printed in concentrations: AFP fires `tumor_markers_result` (cancer and liver-surveillance text) and total hCG fires `hcg_result` («تستِ بارداری مثبت است») for a pregnant patient. Closing that collision is the first guard, before any new rule.

## Technical Context

**Language/Version**: Node (ESM), plain JS modules in `khanesh-server/rules/`

**Primary Dependencies**: none new

**Storage**: N/A (no persistence; nothing added to the DB)

**Testing**: `node:test`; new file `rules/prenatal.test.js` (the S01–S22 pattern from `serology.test.js`, kept out of `engine.test.js` to avoid clashing with concurrent sessions). Existing suite re-measured before and after, tree named.

**Target Platform**: existing Express backend; no frontend change required (see contracts)

**Project Type**: web-service (backend rules engine)

**Performance Goals**: none beyond existing; rules are pure functions over one parsed sheet

**Constraints**: engine boundary (LLM never judges); Persian-only patient text; no `emergency`; `RULE_READS`/coverage net must see the module's reads; no `soon` without a register entry

**Scale/Scope**: 1 new module, ~12 rules, 1 classifier per arm, ~6 name families, ~30 tests

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 design — still passed.*

| Principle | How the plan satisfies it |
|---|---|
| I. Engine decides, model speaks | All pattern/urgency logic in `patterns_prenatal.js`; the model receives only `headline`/`must_say`/`urgency`/`forbid` as for every rule |
| II. Missing ≠ normal | Every finding has present / absent / not-printed arms; sweep test asserts no «طبیعی» for an unmeasured marker (FR-009) |
| III. Measure, never quote | Current behaviour of all 10 probe panels measured on the working tree (research.md); real sheet spellings still unmeasured → task T001; no test baseline is quoted |
| IV. Test fails first | Every task pairs a test with a red-before run (stash/temp-copy with `node_modules` junction) |
| V. Persian | New names in `FA_NAMES`; text reviewed verbatim by the owner before commit |
| Clinical-change constraints | ⚠️ thresholds → `MEDICAL_RULES.md` pending item; `soon` tier recorded there |

No violations; Complexity Tracking empty.

## Phase 0 / Phase 1 artifacts

- [research.md](research.md) — decisions and the unknowns to measure first
- [data-model.md](data-model.md) — channel shape, classifier labels, finding table
- [contracts/engine-prenatal.md](contracts/engine-prenatal.md) — adapter→engine→response contract
- [quickstart.md](quickstart.md) — runnable validation panels

## Project Structure

### Documentation (this feature)

```text
specs/013-prenatal-serum-screening/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/engine-prenatal.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code

```text
khanesh-server/rules/
├── adapter.js               # two-pass identity layer BEFORE the generic /^mom$/ → unmapped branch and BEFORE NAME_MAP's hcg/afp aliases; fills `prenatal`
├── patterns_prenatal.js     # NEW — prenatalAxis(arm) classifier + rules; exports RULES_PRENATAL
├── patterns.js              # spread RULES_PRENATAL into RULES; SUGGEST_TESTS rows; ownership hand-off with HCG/AFP findings
├── names.js                 # FA_NAMES for the 7 markers + printed-risk row
├── patterns_reproductive.js # hCG-pregnancy reader: stand down when the row was claimed by the prenatal channel
├── patterns_autoimmune.js   # AFP tumour-marker reader: same stand-down
├── prenatal.test.js         # NEW
khanesh-server/server.js     # engine-path fallback gate: a sheet with only prenatal rows stays on the engine path (N18, routing layer)
MEDICAL_RULES.md             # new pending item (next free P number at write time)
```

**Structure Decision**: a separate channel plus its own module, because (a) N25 shows a differently-named row inside `qual`/`tests` is still found by the old regex readers, and (b) the hemostasis channel proves the pattern (unscored values, own reader, own fallback-gate line).

## Key design decisions

1. **Two-pass identity.** Pass 1 scans all rows for *strong* signals: names «Free β-hCG», PAPP-A, uE3/unconjugated estriol, Inhibin A, NT/nuchal translucency, or a MoM unit. Pass 2 claims weak names (bare hCG, total hCG, AFP, estriol) only if pass 1 found any strong signal on the sheet or the row itself has a MoM unit (clarification Q3). This includes concentration-unit quad sheets, which is the measured live defect. Claimed rows never reach `ungraded.AFP`/`ungraded.HCG`, so `tumor_markers_result` and `hcg_result` cannot fire on them. Unclaimed rows keep today's meaning (freeze test). The profile pregnancy flag is never a signal.
2. **One classifier per arm.** `firstTrimesterAxis(e)` and `secondTrimesterAxis(e)` each return exactly one label or `null`; rules ask "is that my label". The two arms are independent; a mixed sheet can yield one label per arm.
3. **Executable labels only where every cut is ✅.** See the table in data-model.md. Where a pattern needs an unsourced cut, the classifier returns `null` for that label and the report names the rows without a verdict (FR-010).
4. **Printed risk first.** The lab's printed risk/category is quoted and, where present, decides the tier (clarification Q4 → partial sheets still get one finding). Engine bands (FMF > 1:100 / < 1:1000; quad T21 1:270, T18 1:100, AFP 2.5 MoM) apply only when the sheet prints no category.
5. **Urgency by clarification Q1.** `this_week` for T21-type, NTD-type, NT ≥ 3.0; `soon` for T18/T13/triploid-type; `routine` for isolated markers. Action sentences derived from urgency via one helper (N20). Because the source gives no cut for T18/T13/triploid, the `soon` tier is reachable only through the lab's own printed high-risk category for those trisomies; the engine does not assign it from MoM direction.
6. **Dating from the sheet only** (Q2): window and > 10-day discrepancy checked when printed; otherwise one «بررسی نشده» sentence.
7. **Profile mismatch** (Q5): male/child → rows unread with one sentence; not-pregnant/unset → interpreted with a note.
8. **Plain concentration** (Q6): one naming sentence, no grade, no pattern.
9. **Coverage net.** The module's marker reads must register with `RULE_READS`; every prenatal key either is read by a named owner or appears in «تفسیر نشدند» (N18/N28). A hand-off names explicit owner ids, never "read the key" (N29).

## Spec reconciliation (found while planning)

- **User Story 1, scenario 3** says low PAPP-A advises growth and blood-pressure follow-up, but FR-010 and the source mark that follow-up protocol ⚠️. Plan resolution: the finding fires at PAPP-A < 0.4 MoM (✅ definition) with the ✅ outcome associations and a generic «با متخصص زنان/مامایی در میان بگذارید»; the growth/BP monitoring sentence stays out until the pending item is approved. Scenario 3 will be edited to match when tasks are generated.
- **User Story 1 scenario 2 and Story 2 scenario 2** (T18 reading from MoM direction) cannot be executable on the source's numbers alone. They become: the lab's printed T18/T13 risk is quoted and tiered; an MoM-only T18-type pattern is named without a label until the pending item is approved.
- **hCG high cut-off** conflicts inside the source (> 2.0 vs > 3.0 MoM). Executable T21-quad label needs one value; both values are placed in the pending item and the quad T21 label stays printed-risk-driven until chosen.

## Complexity Tracking

None.
