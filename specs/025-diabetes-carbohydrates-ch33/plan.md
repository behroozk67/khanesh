# Implementation Plan: Carbohydrates and Diabetes (Tietz ch 22/33): gaps only

**Branch**: `025-diabetes-carbohydrates-ch33` (spec directory only; no git branch) | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

## Summary

Roughly 25 extraction items were checked against the code. Most are already owned by the engine and are not rebuilt (condition 1). Five real gaps remain, all shown by the 25-panel probe ([snapshots/before.txt](snapshots/before.txt)):

1. **A reported diabetic is told to confirm a diagnosis, or is told «پیش‌دیابت».** The fix is a text-only `dm2` mode in `glycemia`, with an HbA1c target of < 7 % (D1, D2). Urgency is unchanged.
2. **Insulin and C-peptide are dropped.** They get two new keys wired through all five files. The printed range comes first, with both edges kept (D3). The engine adds `insulin_result` and `hypoglycemia_insulin_not_suppressed` (D4).
3. **HbA1c < 4 has no owner, and HbA1c > 15 has no caveat.** The fix is `hba1c_low` and one sentence (D5).
4. **The HbA1c doubt has no direction.** The fix is a direction from iron deficiency or reticulocytes (D6).
5. **Anti-GAD and IA-2 are unmapped.** The fix reads them through `assay_printed` from the printed cut-off (D7).

Ranges (condition 2):
- Fasting glucose stays 70–110 (a user decision).
- The insulin fallback is 2.6–24.9 µIU/mL and the C-peptide fallback is 1.1–4.4 ng/mL. Both are the ranges common Iranian kits print, not Tietz's.

## Technical Context

**Language/Version**: Node.js ESM (`khanesh-server`)
**Primary Dependencies**: none new
**Storage**: N/A
**Testing**: `node --test`; new cases in `rules/engine.test.js`; probe in `snapshots/`
**Target Platform**: the existing Express backend
**Project Type**: backend rules engine only. Findings render through the existing path, so the frontend does not change.
**Performance Goals**: N/A (O(1) checks per sheet)
**Constraints**:
- No urgency is lowered.
- No existing threshold changes.
- Text is Persian only and goes through `faName`.
- A unit is converted only when it is printed.
- The printed range wins.

**Scale/Scope**: `refs.js`, `adapter.js`, `units.js`, `names.js`, `serology.js`, `patterns_biochem.js`, `patterns_autoimmune.js`, `groups.js`, `patterns.js` (`SUGGEST_TESTS`), `MEDICAL_RULES.md`, plus tests.

## Constitution Check

| Principle | Status | Note |
|---|---|---|
| I. Engine decides, model speaks | ✅ | All new findings come from the engine; no prompt change. |
| II. Missing ≠ normal; direction ≠ severity | ✅ | The insulin pair state has explicit absent rows. C-peptide is never asserted when absent. A unitless insulin is not graded. Direction comes from `dir`. |
| III. Measure, never quote | ✅ | Probe and suite baseline (1801 / 1799 / 1, T15e pre-existing) measured on `2252643`. |
| IV. Test failed first; rule-id diff | ✅ planned | Quickstart §3–4. The expected id diff is +4, −0. |
| V. Persian, no raw key | ✅ | Drafts are in [contracts/findings.md](contracts/findings.md), with `FA_NAMES` for both keys and `SUGGEST_TESTS` rows. |
| Clinical changes need a source and a reviewer | ⚠️ conditional | The HbA1c target of 7 %, the insulin and C-peptide fallbacks, the < 4 / > 15 edges and D4's "not low" definition come from no document opened this session. They land as P143 «در انتظارِ بازبینی» in the same commit (N37), with no `sources:` (N39). This is the same practice as P141. |
| One owner per analyte | ✅ | `insulin_result` and `hypoglycemia_insulin_not_suppressed` partition on glucose < 54. `hba1c_low` and `diabetes_range` cannot both fire. `hypoglycemia_significant` keeps glucose and its emergency. |
| Edges probed; ordinary input checked | ✅ planned | Quickstart §4. No new `emergency`. The ordinary insulin sheet with normal glucose gets `routine`. |

**Gate**: PASS, conditional on P143 landing with the behaviour.

**Post-design re-check**: unchanged. One risk is to verify, not assume: how the adapter treats a printed range on a converted row (insulin in pmol/L). This is recorded in research D3.

## Project Structure

```text
specs/025-diabetes-carbohydrates-ch33/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/findings.md
├── checklists/requirements.md
└── snapshots/probe_ch33.mjs · before.txt
```

```text
khanesh-server/rules/
├── refs.js                # + INSULIN 2.6–24.9, C_PEPTIDE 1.1–4.4
├── adapter.js             # + NAME_MAP spellings; + PRINTED_FIRST_BOTH_KEYS
├── units.js               # + insulin pmol/L, C-peptide nmol/L and pmol/L (printed unit only)
├── names.js               # + FA_NAMES INSULIN, C_PEPTIDE, ANTI_GAD, ANTI_IA2
├── serology.js            # + ANTI_GAD, ANTI_IA2 (assay_printed)
├── patterns_biochem.js    # glycemia dm2 mode, the >15 sentence, a1cBad direction, + hba1c_low, insulin_result, hypoglycemia_insulin_not_suppressed
├── patterns_autoimmune.js # + islet_autoantibody_result
├── groups.js              # + 4 RULE_GROUP entries (GR1)
├── patterns.js            # + SUGGEST_TESTS rows
└── engine.test.js         # + tests, red on HEAD
MEDICAL_RULES.md           # + P143
```

**Structure Decision**: each change goes into the file that already owns its kind. There is no new module.

## Complexity Tracking

No violations.
