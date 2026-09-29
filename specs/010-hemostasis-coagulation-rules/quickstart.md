# Quickstart: validating specs/010

All commands are run from the repo root unless noted. `khanesh-server/node_modules` must be present, or
`api-contract.test.js` fails 10 fake tests (see CLAUDE.md, Commands).

## 1. Baseline, before any code (constitution III)

```bash
cd khanesh-server && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
```

Measured 2026-09-29 on the working tree at `e285030`: `tests 764 · pass 745 · fail 0 · todo 19`. Re-measure; don't
copy this line.

## 2. Probe, before and after

```bash
node specs/010-hemostasis-coagulation-rules/probe.mjs > specs/010-hemostasis-coagulation-rules/probe-after.txt
diff specs/010-hemostasis-coagulation-rules/probe-before.txt specs/010-hemostasis-coagulation-rules/probe-after.txt
```

Expected diff, **and nothing else**:

| panel | before | after |
|---|---|---|
| `fviii_05`, `fviii_iu`, `fa_8` (age 25) | unmapped, no findings | `factor_activity` (severe band), not unmapped |
| `fix_40`, `fix_abbr` | unmapped | `factor_activity` (`fix_40` with no printed range → "not judged", quoted) |
| `fviii_3_aptt` | `coagulation_abnormal` | `factor_activity` only; APTT named in it |
| `inhib_neg` (bare «Inhibitor: Negative») | unmapped | **still unmapped** (bare «Inhibitor» is ambiguous, R4) |
| `inhib` («FVIII Inhibitor 2.4 BU», no printed range) | unmapped | `factor_inhibitor`: number quoted, **no verdict**, `this_week` (FR-021) |
| `factor_only_fviii` (a sheet with only «Factor VIII Activity 0.5 %») | legacy model-judged path, or the canned normal result | engine path, `factor_activity` (FR-019) |
| `fix_neonate` (FIX 30 %, age 3 days) | unmapped | `factor_activity` at `routine`, value quoted, **no band** (FR-020) |
| `isth_plt49` (PLT 45, D-dimer 3 µg/mL, PT 12) | `severe_thrombocytopenia` and friends | **identical** (tier excludes PLT < 50) |
| `vwf`, `vwf_ag` | unmapped | `vwf_panel` (ratio 0.4 quoted / partner missing) |
| `pt_ctrl` | «PT Control» unmapped | not unmapped; `coagulation_abnormal` otherwise unchanged |
| `isth_nonovert` | three `this_week` findings | + `dic_isth_score:soon`; the three stay |
| `plt_1200` | `thrombocytosis:routine` | `thrombocytosis:this_week` |
| `plt_450`, `dic_emerg`, `isth5_no_dic`, `tt`, `tt_abbr`, `adamts` | — | **identical** |

## 3. Rule-id set (N16)

```bash
cd khanesh-server && node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > ../specs/010-hemostasis-coagulation-rules/ids-after.txt
diff ../specs/010-hemostasis-coagulation-rules/ids-before.txt ../specs/010-hemostasis-coagulation-rules/ids-after.txt
```

Expected: only `> ` lines, four of them (`dic_isth_score`, `factor_activity`, `factor_inhibitor`, `vwf_panel`). Any
`< ` line is a deletion, which is a failure.

## 4. Suite, after

```bash
cd khanesh-server && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
```

Expected: fail 0, and pass = the baseline plus the new tests. Every new test must first be shown red against
`e285030`, using the `git archive` + junction recipe in CLAUDE.md (N10).

## 5. Reviewer read-through

Every new Persian string is printed verbatim in the implement report, and `MEDICAL_RULES.md` has `P61` with D1–D13
and questions 61-a…61-e (see plan.md).
