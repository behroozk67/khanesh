# Contract: tumour-marker rows in `_engine.tests` — v2 (specs/020)

This extends [specs/019 contracts/engine-tests-tumor-rows.md](../../019-tumor-marker-rules/contracts/engine-tests-tumor-rows.md).
Everything there still holds. Changes:

1. **Key set.** Rows are now emitted for `AFP, B2M, CALCITONIN, CGA, PSA_TOTAL, PSA_FREE, PSA_RATIO` in addition to
   `CEA, CA125, CA153, CA199`, but only for entries with `reason: "assay_printed"`. An AFP row that the prenatal path owns
   (`AFP_MAT`, a MoM unit) never appears here.
2. **Optional field `sexMismatch: true`.** It is present only on PSA rows when `_engine.context.sex` is «زن». It does
   not alter `abnormal/dir/fa/verdict`. An older client ignores it. No frontend change in this feature.
3. **`verdict: "below"`** is now reachable for `PSA_RATIO` (for example 18 against «> 25»).
   - `abnormal: true, dir: "low"`. The frontend already renders `dir:"low"` rows.
   - **Direction note for reviewers**: for this key "below" is the less reassuring side. The row reports the position
     against the printed range only, and no meaning is attached to it (option C).

Invariants a test must hold:

- `abnormal === null` ⇔ `verdict ∈ {between, noref, unreadable}`.
- No row's `name` equals its `key` (except where `FA_NAMES` maps the key to itself, as with `CEA`).
- `engineOut` is not mutated, so `urgency`, `has_critical`, `score` and `phenoAge` come only from the engine. The one
  intended score change is the `psa_result` exemption (data-model.md).
