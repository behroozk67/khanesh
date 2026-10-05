# Quickstart: validating Stage A (24-hour urine and body fluids)

All commands are run from `khanesh-server/`, with `node_modules` present (CLAUDE.md, "Commands").

## 0. Baseline: measure first, never quote it

```bash
node --test 2>&1 | tail -8          # record tests/pass/fail and the tree (git rev-parse --short HEAD + "working tree")
```

**Measured 2026-10-05 (T001), working tree on `8e0d769`:** `tests 1079 · pass 1078 · fail 0 · todo 1` (the todo is `M154b`, a P49-د expected-red marker).

## 1. Red-before

Write `rules/specimen.test.js` and T54–T56 first, run them on the unchanged tree, and record the failures. Expected
red: U01–U08, U11, U13, T54–T56. Expected green-before (freezes, labelled in their comments): U09, U10, U12, U14.

| id | asserts |
|---|---|
| U01 | request 27 (`Urine Volume/24h 1700 · Urine Prot/24h 153 · Urine Cr/24h 700`, F 25): three `u24` rows, `unmapped` empty, `findings` empty, `overall_urgency: none` |
| U02 | request 28: three fluid rows + `FL_TYPE` (`unknown`, code `4`). Serum `LDH 367` is still the only `LDH` graded. `isolated_ldh_elevation`/`unit_unknown_values` are unchanged from the pre-change tree |
| U03 | single-row spellings (spec table: `Pleural LDH`, `Ascitic Glucose`, `Body Fluid LDH`, `Glucose (CSF)`, `Total Protein (Fluid)`, `Creatinine 24h`, `Uric Acid 24h`, `24 hr urine protein`, Persian `پروتئین ادرار ۲۴ساعته`) are each claimed to the right id and type |
| U04 | `Pleural LDH 306` + `LDH 367` → graded LDH value 367. 306 is in no serum key |
| U05 | `Urine Protein 153` beside `Urine Volume/24h 1700` → `U24_PROT` (`claimed_by: evidence`), not `qual` |
| U06 | `Urine Protein +1` alone → still `qual` (control: no evidence, no claim) |
| U07 | `Urine Ca/24h 320` → `U24_CA`, not graded, `U_CA` absent |
| U08 | conflicting duplicate (`Urine Prot/24h 153` and `150`) → first kept, second in `unmapped` |
| U09 | freeze: `24h urine calcium 320` + `Ca 11.2` + `PTH 90` → output identical to the pre-change tree (mineral axis, FR-014) |
| U10 | freeze: every panel in `lis1005.test.js` and 12 ordinary panels → `runEngine`+`runPatterns` JSON byte-identical with an empty specimen channel |
| U11 | `specimenLine` for requests 27/28 equals the contract strings exactly. No raw id (`U24_`, `FL_`) and none of the forbidden words |
| U12 | `CSF Glucose 30` + `FBS 100` → no finding mentions CSF. Urgency is the same as the sheet without the CSF row (Stage A interprets nothing, even an emergency-looking value) |
| U13 | `Fluid Type 4` + bare `Glucose 122` + `LDH 306` → not claimed (still `GLU_F`/`LDH`), and the R6 caution names both |
| U14 | source grep: no `patterns_*.js` reads `specimen` |
| T54 | `/api/analyze` manual request 27 → `ocr_warnings` contains the specimen line. The result is the "recognised" uninterpreted variant: no «نشناخت» about these rows, no model call |
| T55 | request 28 → the engine path, with the specimen line next to the existing warnings, and `has_critical` unchanged |
| T56 | normal serum panel + `Urine Prot/24h 153` → `buildNormalResult` specimen branch. The summary is the "some values not interpreted" sentence, not «نتایج … طبیعی است» |

## 2. Green-after

```bash
node --test rules/specimen.test.js
node --test api-contract.test.js
node --test                          # full suite; compare with step 0. New tests are the only delta
node --test rules/metamorphic.test.js
```

## 3. Live probe (optional)

`USE_GRAPH` off, `npm start`, then POST request 27 as manual JSON to `/api/analyze`. Check `ocr_warnings` and that the
trace shows `llm_called: false`.

## 4. Register

`MEDICAL_RULES.md` P87: every threshold/urgency of the source document, grouped by section, each with ✅/📘 and
«در انتظار بازبینی». Include the open decisions from Section 4 of the document plus R3 (U_CA dual identity) and R6 (bare
names).
