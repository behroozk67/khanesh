# Quickstart: validating specs/025

Run everything from `khanesh-server/`.

## 1. Baseline

`npm test` on `HEAD 2252643` gives 1801 tests, 1799 pass, and 1 fail (T15e, pre-existing, payment). Re-measure on the implementation tree. Expected result: the same single failure, and the count rises only by the new tests.

## 2. Probe diff

```bash
node ../specs/025-diabetes-carbohydrates-ch33/snapshots/probe_ch33.mjs > ../specs/025-diabetes-carbohydrates-ch33/snapshots/after.txt
diff ../specs/025-diabetes-carbohydrates-ch33/snapshots/before.txt ../specs/025-diabetes-carbohydrates-ch33/snapshots/after.txt
```

Expected changes, and only these:

| Panel | Expected |
|---|---|
| G1 a1c 3.5 / 3.9 | `unmatched_abnormal` gone; `hba1c_low` present |
| G1 a1c 4.0, G2 a1c 15.0 | unchanged |
| G2 a1c 15.1 | `diabetes_range` with the variant sentence; urgency unchanged |
| G3 dm2 6.2 / 6.9 / 7.0 / 7.8 / fbs 150 | dm2 wording (contract D1/D2); 6.9 is within target, 7.0 is above; urgency equal to before |
| G3 nodm 7.8, G3 dm2 preg 7.8 | byte-identical |
| G4 ins high fbs ok | INSULIN graded high [2.6–24.9]; `insulin_result` |
| G4 ins+cp fbs 45 | `hypoglycemia_insulin_not_suppressed` (`endogenous`) beside `hypoglycemia_significant` (emergency) |
| G4 ins hi cp low fbs 40 | `exogenous` |
| G4 ins pmol | graded in pmol/L against the printed 18–173 |
| G4 ins unitless | not graded; listed, never «طبیعی» |
| G4 homa | INSULIN graded on the fallback range; HOMA-IR still in unmapped |
| G4 IAA | still unmapped |
| G5 IDA / retic / anemia only | «بیشتر از واقع» / «کمتر از واقع» / unchanged |
| G6 GAD pos / neg / no ref | positive / negative (qualVerdict) / read but not interpreted |

## 3. Tests fail first (N10)

Add one test per row above to `rules/engine.test.js`, with Persian comments. Run the new tests against `HEAD`:

- `git archive HEAD khanesh-server | tar -x -C <tmp>`
- link `node_modules` with `mklink /J`
- copy only the new test file in

Every new test must go red there.

## 4. Edges and guards

- Probe HbA1c 6.9 / 7.0 under dm2, 3.9 / 4.0, and 15.0 / 15.1. Probe glucose 53 / 54 with insulin. Probe insulin at the printed lower limit − ε, at the limit, and + ε.
- Run the rule-id diff before and after. The added ids must be exactly `hba1c_low`, `insulin_result`, `hypoglycemia_insulin_not_suppressed` and `islet_autoantibody_result`, with no removals (N16).
- `node --test rules/metamorphic.test.js` must pass with no new `ALLOWED_DROPS`.
- GR1, M32, M36, M37 and G6 must pass.

## 5. Register

The P143 entry is in `MEDICAL_RULES.md` and lands in the same commit as the behaviour (N37).
