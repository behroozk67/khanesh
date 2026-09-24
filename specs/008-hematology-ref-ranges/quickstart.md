# Quickstart — validating specs/008

Run everything from `khanesh-server/` unless a step says otherwise.

## 0. Baseline (already measured 2026-09-23, working tree on `9deba20`)

```bash
npm test            # expect: tests 618 · pass 599 · fail 0 · todo 19
node ../specs/008-hematology-ref-ranges/probe.mjs > /dev/null   # probe-before.txt already saved
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > ../specs/008-hematology-ref-ranges/ids-before.txt
```

## 1. Pre-change copy, for the "red before" runs

`rules/` is clean on `9deba20`, so the pre-change copy is the commit itself:

```bash
git archive 9deba20 khanesh-server | tar -x -C <tmp>
# Windows: New-Item -ItemType Junction <tmp>/khanesh-server/node_modules -Target <repo>/khanesh-server/node_modules
cp rules/engine.test.js rules/geriatric.test.js <tmp>/khanesh-server/rules/
cd <tmp>/khanesh-server && node --test rules/engine.test.js rules/geriatric.test.js
```

**Expected:** red on exactly the new behavioural tests and the `geriatric.test.js` Hb case that was changed on purpose.
The freezes stay green. Quote the real counts.

## 2. Probe diff — expected outcomes

`node ../specs/008-hematology-ref-ranges/probe.mjs > ../specs/008-hematology-ref-ranges/probe-after.txt`, then diff it
against `probe-before.txt`.

| panel | before | after |
|---|---|---|
| M30_Hb138, M30_Hb136 | `normocytic_anemia` this_week | 13.8: none; 13.6: still anaemic (< 13.7) |
| M60_Hb134 | normocytic this_week | none (≥ 13.3) |
| M72_Hb126 | normocytic this_week | none (≥ 12.4) |
| F72_Hb119 | normocytic this_week | none (≥ 11.8) |
| M80_Hb115, F80_Hb110 | **none** | anaemia finding, this_week |
| F30_Hb121 | normocytic this_week | none (≥ 12.0) |
| M17_Hb135 | normocytic this_week | still anaemic (< 13.6) |
| M30_Hb138_micro | `microcytic_ida_likely` | a microcytic finding without Hb-low wording — check the text doesn't claim anaemia |
| M40_Ferr20 | `iron_deficiency` | still `iron_deficiency`; FERRITIN graded normal; text has no «فریتین پایین» |
| F55_Ferr25 | none | `iron_deficiency`; FERRITIN↓[30–300] |
| F30_Ferr13 | iron_deficiency | iron_deficiency (13 ≥ 12 is graded normal; the rule still fires because 13 < 15) |
| M40_Iron55 | `unmatched_abnormal` | none (inside 50–160) |
| M40_ACD_Iron55 | ACD fires | ACD fires; IRON graded normal; text doesn't call the iron low |
| M40_Iron155 | unmatched | none |
| HbA2_52 | HbA2 unmapped; suggests electrophoresis | HBA2↑ graded; thal finding carries the > 3.8 clause; no electrophoresis request |
| HbF_electro | all unmapped | HBA2/HBF graded normal; HBA in noRef; no finding |
| HbS_trait | `HbS` in qual (silent) | HBS in noRef (via the `%` unit); HBA in noRef |
| ZPP, sTfR, EPO | unmapped | noRef (Persian names in «تفسیر نشدند») |
| PV_M_Hb170 | unmatched | unchanged (PV is P53) |

Add these panels to the probe before implementing:
- band edges: M 30 at 13.6/13.7; M 19 vs 20 at 13.65; M 49 vs 50 at 13.5; M 69 vs 70 at 12.5; F 69 vs 70 at 11.9; F 49 vs 50 with ferritin 25;
- age 13 M with Hb 13.8 (byte-identical);
- HbA2 3.7 alone and 3.9 alone (→ `hba2_elevated`, two branches);
- HbA2 1.0 (→ `unexplained_abnormal` lists it);
- HbA2 5 at age 1 (→ noRef);
- «HBsAg Positive» (frozen), «HbS Positive» alone (→ unmapped), «HbC 30 %» + «HbA2 3» (→ HBC);
- «HbC Positive» alone (stays unmapped, never hepatitis);
- «Anti-HBc Positive» (frozen).

## 3. Full gates

```bash
npm test                       # all green; quote the counts
cd ../khanesh && npm run lint  # labRefs.js Hb bands
node -e "<probe of hb.range(s, months)>"  # frontend bands: 30y/70y/80y × M/F
```

Rule-id diff against `ids-before.txt`: **+`hba2_elevated` only**.

## 4. Review

Show every new Persian string to the user, verbatim. Then run `code-reviewer` and `eval-medical-reviewer` (two rounds).
Record their findings in `medical_review.md`.
