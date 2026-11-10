# Contract: engine output changes (specs/021)

These are additive. No existing field changes meaning, and `ResultView.jsx` needs no change.

1. **`_engine.tests[]`, ACR row.**
   - It may carry `printed: { value, unit }`. The frontend ignores unknown fields.
   - `range` may read `0–26.5` for a mg/mmol sheet. It is still a `lo–hi` string, as today.
2. **`_engine.unitConversions[]`** may contain `test: "ACR"` with `from: "mg/mmol"`. `name` is resolved via `faName` (G7 requires every convertible key in `FA_NAMES`, and ACR has one).
3. **`noRef` / «محدوده مرجع نداریم»** may contain `UPCR`. It is shown via `FA_NAMES.UPCR`, never as the raw key.
4. **`_engine.patterns`** may contain `uric_acid_low`.
5. **Guarantees.**
   - `has_critical` and `urgency` are never lower than today for any input.
   - `UPCR` never appears in `graded`, so it never shows «در محدوده».
