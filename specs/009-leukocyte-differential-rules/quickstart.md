# Quickstart: validating specs/009

## Prerequisites

- `khanesh-server/node_modules` is installed.
- For the red-before check: a `git archive 0d8c782` copy with a `node_modules` junction (CLAUDE.md → Commands).

## 1. Baseline (re-measure; never quote)

```bash
cd khanesh-server && npm test          # 2026-09-25 on 0d8c782: 682 · 663 · 0 fail · 19 todo
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.length))"   # 144
```

## 2. The probe: before vs after

```bash
node specs/009-leukocyte-differential-rules/probe.mjs > specs/009-leukocyte-differential-rules/probe-after.txt
```

Expected changes against [probe-before.txt](probe-before.txt). Every other panel must be byte-identical.

| panel | before | after |
|---|---|---|
| `mono_1400` | `unmatched_abnormal` | `monocytosis` (routine, «مونوسیتوز»); no net |
| `mono_pct12_abs840`, `mono_900_pct9` | `unmatched_abnormal` | `monocytosis`, "slightly above" arm |
| `mono_150` | none | `monocytopenia` (routine), `MONO_ABS=150↓ [200–800]` |
| `mono_0` | none | `monocytopenia` |
| `eos_600` | `unmatched_abnormal` routine | `eosinophilia` routine |
| `eos_2000`, `eos_abs_row_1600` | `unmatched_abnormal` routine | `eosinophilia` **this_week** (hypereosinophilia) |
| `baso_250` | `unmatched_abnormal` | `basophilia` |
| `cml_like` | `extreme_leukocytosis, unexplained_abnormal`; uncovered `HGB, NEUT_ABS, MONO_ABS, EOS_ABS` | same findings; uncovered **adds `LYMPH_ABS`, `BASO_ABS`** (R6), and keeps `MONO_ABS`, `EOS_ABS` |
| `blasts_25` | `leukocytosis` this_week; `unmapped: [Blasts]` | **emergency**, `peripheral_smear_findings`; `unmapped: []` |
| `blasts_3` | none; `unmapped: [Blast]` | `peripheral_smear_findings` this_week |
| `blasts_0`, `blasts_word` | none; unmapped | none; `unmapped: []` (read as "none seen") |
| `auer` | `leukocytosis` this_week | emergency, `peripheral_smear_findings` |
| `toxic`, `dohle` | leukocytosis (+ net); unmapped | + `peripheral_smear_findings` routine; overall urgency unchanged |
| `pelger` | none; unmapped | `peripheral_smear_findings` routine («معمولاً ارثی و بی‌خطر») |
| `smear_remark` | none; unmapped | `peripheral_smear_findings` routine (toxic granulation, from the value) |
| `pancyto_blasts` | emergency ×5; `unmapped: [Blasts]` | same emergencies + `peripheral_smear_findings` (always_show; brief if briefed); `unmapped: []` |
| `band_12`, `anisocytosis` | unmapped | **unchanged** (out of scope) |
| `plt_*`, `pv_*`, `normal`, `child5_mono` | as before | **unchanged** |

Panels to add to the probe during the build: the three-way `monocytopenia` WBC arms; «Pseudo-Pelger cells: Present»;
«Blasts: Few»; «Auer rods: +/-» (equivocal → unmapped); WBC 45 with baso 3 % (`cml_suspicion` needs WBC > 50, so
`basophilia` fires, beside `leukocytosis`); the `acute_leukemia_suspicion` + «Blasts 30 %» panel (exactly one finding
mentions blasts); a urine page with «Pelger» (no smear item); a neonate with eos 1800 (no finding).

## 3. Tests

```bash
cd khanesh-server && npm test                       # all green; count = baseline + new tests
node --test rules/engine.test.js                    # the M200… block
```

Every behavioural guard must be red on the `0d8c782` archive with the new `engine.test.js` dropped in. Freezes must be
green on both. Rule-id diff: `+monocytosis, +monocytopenia, +eosinophilia, +basophilia, +peripheral_smear_findings`
(144 → 149), nothing removed.

Guards the build must include (ids from `M200`):
- one per new rule, on its probe panel (red before);
- the "slightly above" arm (mono 900): not silent, not the net;
- R6: `cml_like` lists `BASO_ABS` and `LYMPH_ABS` (red before);
- merge: blasts 25 % + Auer → exactly one finding names both;
- hand-off: `acute_leukemia_suspicion` + blasts → exactly one blast mention (two-sided sweep, M91e shape);
- N6: absence and equivocal words never become a present item (sweep over the `castValueState` lists);
- N25: smear vocabulary on a urine page is not read;
- freezes: `normal`, `plt_*`, `pv_*`, `band_12`, and the M104d/M180b-class hashes, re-baselined only after a
  full-output diff shows only the intended change.

## 4. OCR prompt

```bash
grep -n "Auer\|Blasts\|Toxic granulation\|Döhle\|Pelger" khanesh-server/server.js    # the new example line
```

If the user has a real sheet with a smear remark, run it through `/api/analyze/start` on a local server
(`TRACE=1`). Confirm the rows arrive in `smear`, not in `unmapped`.

## 5. Text review

Every new Persian string (5 rules, the acute-leukaemia clause, the briefs) is shown to the user verbatim before commit
(FR-011). Then run `eval-medical-reviewer` + `code-reviewer`.
