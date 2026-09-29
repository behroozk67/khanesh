# Contract: what changes in `/api/analyze` for specs/010

No route, field or type is removed. `Tafsir.jsx` and `ResultView.jsx` need **no change**.

| field | change | consumer impact |
|---|---|---|
| `_engine.patterns[]` | new ids: `factor_activity`, `factor_inhibitor`, `vwf_panel`, `dic_isth_score` | none |
| `_engine.urgency` / `has_critical` | a factor/vWF/inhibitor sheet goes from `none` (and the canned normal result) to `routine`/`this_week`; `dic_isth_score` can raise a `this_week` sheet to `soon`; PLT ≥ 1000 goes from `routine` to `this_week`. `has_critical` is never set by any new path (no new `emergency`). | none |
| `ocr_warnings` («تفسیر نشدند») | FVIII/FIX/vWF/Bethesda/PT-control rows leave this line; Factor V/VII/X/XI/XII/XIII, bare «Inhibitor», TT and ADAMTS13 **stay** (deferred or out of scope) | none |
| `extracted_tests` | unchanged: built from OCR, not from the engine | none |
| `general_recommendations` | still one final action from `pickFinalAction()`; with `dic_isth_score` present it is that finding's «۲۴ تا ۴۸ ساعت» action | none |
| `_engine.tests[]` | **unchanged**. The new keys are not graded, so they add no rows (same as `smear`). | none |

Path: a sheet whose only interpretable rows are factor / vWF / inhibitor / PT-control rows stays on the engine path (FR-019); before this, it fell to the legacy model-judged path.

Not sent to the model: the `hemostasis` channel (printed text; N13). Only each finding's `headline`/`must_say`/
`urgency`/`forbid` reaches the model, as today (M188).

Every panel with no FVIII/FIX/vWF/inhibitor/PT-control row, with PLT < 1000, and without the
`50 ≤ PLT < 100 ∧ D-dimer > 400 ∧ !isDIC` combination produces the same output as `e285030`, byte for byte (SC-002).
