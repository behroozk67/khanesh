# Implementation Plan: Thyroid Disorders (Tietz ch. 42): gaps only

**Branch**: `main`. This work has a spec directory only, with no git branch. | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

## Summary

This change closes seven measured gaps in the thyroid engine (G1–G7 plus G3b in the spec) without duplicating the eleven thyroid behaviours that already exist:

- **Known hypothyroidism:** activate the `hypothyroid` condition. A low or high TSH is then read as a possible levothyroxine dose effect, always conditionally.
- **TSH ≥ 10 or < 0.1 with normal FT4:** stop calling it «خفیف».
- **Thyroglobulin:** map it through the serology assay route as quote-only, keep the anti-Tg cancer context working, and add three-state anti-Tg sentences.
- **Pregnancy:** add a sentence for thyroid antibodies.
- **Newborn:** add a screening-timing sentence.
- **Adult TSH fallback:** lower limit 0.5 → 0.4, in a separate commit.

Urgency does not change anywhere. Decisions are in [research.md](research.md), strings in [contracts/findings.md](contracts/findings.md), and checks in [quickstart.md](quickstart.md).

## Technical Context

- **Stack:** Node (ESM), Express. Rules engine in `khanesh-server/rules/`.
- **Tests:** `node --test` (all `*.test.js`). The new file is `rules/p144.test.js`.
- **Storage:** none. **External calls:** none.
- **Constraints:**
  - Byte-identical output outside the targeted panels.
  - The metamorphic suite stays green with no new `ALLOWED_DROPS`.
  - Persian strings never move through PowerShell `Set-Content`.
- **Scale:** the `thyroid` rule (≈ 330 lines) plus helpers. About 8 files touched.
- **Unknowns:** none open. The neonatal age input path was confirmed (research D5).

## Constitution Check

| Principle | Status |
|---|---|
| I. The engine decides | ✅ All logic is in `patterns_endocrine_rheum.js` and `serology.js`. No prompt edits. |
| II. Missing ≠ normal | ✅ Anti-Tg has three states next to Tg. The FT4 clause is three-state under C2. Pregnancy fires only on `=== true`. |
| III. Measure, never quote | ✅ The baseline is re-measured on `HEAD`. The probe lives in `snapshots/`. |
| IV. Test fails first | ✅ `p144.test.js` is run against a `git archive` of `HEAD`. |
| V. Persian | ✅ Contract C1–C8. `FA_NAMES.THYROGLOBULIN` is added. |
| Clinical register | ✅ P144 lands with the behaviour (N37). |

No violations.

## Project Structure

```text
specs/026-thyroid-ch42/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/findings.md
└── snapshots/ probe_ch42.mjs · before.txt · (after_us1-5.txt · after.txt)

khanesh-server/rules/
├── conditions.js                 ACTIVE_CONDITIONS += hypothyroid
├── patterns_endocrine_rheum.js   thyroid branches (C1–C5, C8), thyroidWithAntibodies (Tg, C6, C7), thyroidCancerContext
├── serology.js                   THYROGLOBULIN assay route (quote-only)
├── names.js                      FA_NAMES.THYROGLOBULIN
├── patterns.js                   SUGGEST_TESTS row for Anti-Tg (if absent)
├── score.js                      exemption only if the healthScore probe drops
├── refs.js                       TSH [0.4, 4.5]   ← commit 2
├── engine.test.js                M280 active set
└── p144.test.js                  new
khanesh/src/labRefs.js            tsh low 0.4      ← commit 2
docs/reviews/REF_DIFF.md          TSH row          ← commit 2
MEDICAL_RULES.md                  P144
```

## Order

1. Write `p144.test.js` and prove it red on `HEAD`.
2. Implement US3 (Tg) first, including FR-004a. Run the `nocond` probe.
3. US1, then US2, then US4, then US5.
4. Run `after_us1-5.txt` against `before.txt`. Run the full suite and metamorphic. Add P144. Commit 1.
5. US6: change the range, run `after.txt` against `after_us1-5.txt` (range string and T1 only), add the REF_DIFF row. Commit 2.
6. Run `code-reviewer`, then deploy from a clean worktree.

## Complexity Tracking

No constitution violations to justify. The one non-obvious choice is to keep Tg inside rule `thyroid` instead of adding a new rule. That avoids a second finding about the same anti-Tg, and a new GR1 entry.
