# Quickstart — validating specs/007

All commands are run from `khanesh-server/` unless noted. Quote the real output. Never copy numbers from here (Principle III).

## 0. Baseline (before any edit)

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"      # measured 2026-09-23: 598 · 579 · 0 · 19 todo
node -e "import('file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/patterns.js').then(m=>console.log(m.RULES.length))"   # 134
node -e "import('file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > <scratch>/ids-before.txt
node -e "import('file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/refs.js').then(m=>console.log(JSON.stringify(['HGB','HCT','MCV','MCH','MCHC','RDW_CV','RDW_SD','RETIC','RBC'].map(k=>[k,m.ADULT_REFS[k]]))))" > <scratch>/refs-before.json
```

`npm test` can exceed 2 minutes, so run it in the background and grep the output file.

## 1. The pre-change tree for "red before" (R9)

specs/006 is uncommitted, so 007's "before" is a **copy of the working tree taken before the first 007 edit**, not
`git archive b9068df`:

```bash
cp -r khanesh-server <scratch>/before-007/khanesh-server        # before touching anything
# Windows junction for dependencies:
# New-Item -ItemType Junction <scratch>/before-007/khanesh-server/node_modules -Target <repo>/khanesh-server/node_modules
```

Afterwards, drop the new `engine.test.js` into the copy and run `node --test rules/engine.test.js`. Expected red:
exactly the new behavioural tests. Freeze tests stay green.

If the user commits specs/006 first, use `git archive HEAD khanesh-server` + junction instead.

## 2. Probe, before and after

```bash
node ../specs/007-henry-ch31-rbc-indices/probe.mjs > ../specs/007-henry-ch31-rbc-indices/probe-after.txt
diff ../specs/007-henry-ch31-rbc-indices/probe-before.txt ../specs/007-henry-ch31-rbc-indices/probe-after.txt
```

Expected diff: **only** these panels change.

| panel | after |
|---|---|
| G1_F_RBC43, F_RBC410, F_RBC449 | `none`, no finding |
| F_thal_RBC | `unmatched_abnormal` + `unexplained_abnormal` for MCV/MCH (measured 2026-09-23; the plan predicted `unexplained_abnormal` alone, but with no rule firing the net is `unmatched_abnormal`) |
| G6_F_Hct18, F_Hct209, age_unknown_Hct18, **F_Hct18_nounit** | `emergency`, `severe_anemia_crisis` alone, with the same action string as the Hb arm. A unitless 18 cannot be a fraction, so it is %; the plan wrongly listed it as unchanged. |
| F_Hct018_LL | `emergency` (0.18 L/L = 18 %) and an HCT row in `unitConversions` |
| F_Hct018_nounit | HCT not graded → `unit_unknown_values`, never `emergency` |
| G7_M_artefact | `rbc_indices_implausible` (routine), with no `low_rbc_hct_without_anemia`. `unexplained_abnormal` remains for **MCV 100** only (open question 3 in P52) |
| MCHC366 | `rbc_indices_implausible` replaces `unmatched_abnormal`; urgency stays `routine` |
| MCHC_gL | 366 g/L → 36.6 g/dL, so like MCHC366 |
| G8_* | ARC/Retic Abs/… leave `unmapped` and appear in `noRef` as `RETIC_ABS` |

Every other panel is byte-identical except for the printed female RBC range string («4.5–5.1» → «4.1–5.1»). That
includes F_RBC409, F_RBC40_old, F_Hct21, F_Hct25, F_Hct18_Hb9,
child_Hct18, MCHC365, MCHC40_HbOnly, Hb55_MCHC38, sphero, ida, G7b, G4_Hb21, G5_Hct62 and G2_retic.

## 3. Invariants

- The id diff against `ids-before.txt` shows exactly **one** addition (`rbc_indices_implausible`); RULES = 135.
- The refs dump differs only in `RBC.F`.
- Full `npm test`: 0 fail. `M162`, `M162b`, `M162c`, `M41`, `M47`, `M36`, `M37`, `M38` and `G7` are green.
- `cd ../khanesh && npm run lint`: no change is expected (no frontend edit). Run it only if the task list touches `khanesh/`.

## 4. Patient text review

Before commit, print every new or changed Persian string (the crisis Hct branch, `rbc_indices_implausible`, the
`FA_NAMES.RETIC_ABS` label) to the user verbatim.
