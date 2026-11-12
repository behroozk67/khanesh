# Quickstart: validating specs/024

Prerequisites: `khanesh-server/node_modules` installed; run everything from `khanesh-server/`.

## 1. Baseline (before any code)

```bash
node --test 2>&1 | grep -E "^ℹ (tests|pass|fail)"      # record the numbers and the failing ids (T15e failed before this feature)
node ../specs/024-electrolytes-blood-gases-ch24/snapshots/probe_ch24.mjs > /tmp/before.txt
diff /tmp/before.txt ../specs/024-electrolytes-blood-gases-ch24/snapshots/before.txt   # expect no difference on an unchanged tree
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > /tmp/ids_before.txt
```

## 2. After implementation

```bash
node ../specs/024-electrolytes-blood-gases-ch24/snapshots/probe_ch24.mjs > ../specs/024-electrolytes-blood-gases-ch24/snapshots/after.txt
diff ../specs/024-electrolytes-blood-gases-ch24/snapshots/before.txt ../specs/024-electrolytes-blood-gases-ch24/snapshots/after.txt
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > /tmp/ids_after.txt
diff /tmp/ids_before.txt /tmp/ids_after.txt            # expect exactly: > sweat_chloride_result
node --test 2>&1 | grep -E "^ℹ (tests|pass|fail)|^✖"   # no new failure compared with step 1
```

Expected `before → after` diff, and nothing else:

| Panel | Expected change |
|---|---|
| G1a, G1c (Na 128 + TG 2000 / TP 11) | `sodium_critical` gains the caveat (contract §1); urgency stays `this_week` |
| G1b (TG 400), G1d (Na alone), G1e (Na 118), G1f only if TG ≥ D1 cut-off | G1b, G1d, G1e unchanged; G1f (TG 2002 mg/dL after conversion) gains the caveat |
| G2a–G2e | leave `unmapped`; one `sweat_chloride_result` finding in the contract state for its value |
| G2f (conductivity) | unchanged (`unmapped`) |
| G3a–G3d | unchanged (R3 is a duplicate) |

## 3. Tests that must be red on the old tree (N10)

Run the new test file against `HEAD` with only the test added (`git stash` the rule changes): every new case must fail, and the negative controls (G1b, G1d, G1e, G2f, serum chloride) must pass on both trees.

## 4. Edge sweep (FR-012)

Sweat chloride 29, 29.5, 30, 59, 59.5, 60, 160, 160.5, 161 in `mmol/L` and `mEq/L`; once with no unit; once with age 0.02 (≈ 7 days) and 0.05 (≈ 18 days). Sodium 120, 121, 134 with TG 999/1000 and TP 9.9/10.
