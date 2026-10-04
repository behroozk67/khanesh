# Quickstart: validating prenatal screening

Prerequisites: `cd khanesh-server`, `node_modules` present. Do not quote a baseline: measure `npm test` on the tree you are changing and name the tree.

## 1. Probe (before any code, task T001)

Already run once (2026-10-04, research.md): every MoM/NT/risk row is `unmapped` with no finding; P13 fires `tumor_markers_result` + `hcg_result`. Re-run on the tree you implement against and collect real sheet spellings before writing name entries.

## 2. Validation panels (after implementation)

| # | Panel (marker, value, unit) | Expected |
|---|---|---|
| P1 | FBHCG 1.8 MoM · PAPPA 0.3 MoM · NT 3.2 mm · GA 12w US | `prenatal_t21_pattern_fts` (this_week) + `prenatal_nt_raised`; no HCG/AFP finding |
| P2 | PAPPA 0.35 MoM only | `prenatal_papp_a_low` routine; missing partners named; not «normal» |
| P3 | AFP_MAT 3.1 MoM · UE3 1.0 · INHA 1.2 · GA 17w | `prenatal_ntd_afp`; text says most raised AFP is not NTD |
| P4 | UE3 0.08 MoM | `prenatal_ue3_very_low` |
| P5 | quad at GA 13w | `prenatal_window_invalid` |
| P6 | printed «Trisomy 18 risk 1:60 high», markers missing | `prenatal_printed_risk_t18_t13` soon; markers named; no label |
| P7 | bare «hCG 25000» with **no** companion, unitless | old pregnancy-test behaviour; no prenatal finding |
| P8 | bare «hCG 1.9 MoM» + AFP 0.9 MoM | claimed as screening (MoM unit) |
| P9 | «Free β-hCG 40 IU/L» | `prenatal_concentration_unread`; not graded |
| P10 | P1 with male profile | rows unread + mismatch sentence |
| P11 | all markers present, risk low | low-risk text + «رد نمی‌کند» line; nothing «طبیعی» for an absent marker |
| P12 | existing fixtures (pregnancy test, tumour AFP) | byte-identical output |
| P13 | AFP 35 IU/mL · Estriol (uE3) 4.1 nmol/L · Total hCG 29000 mIU/mL · Inhibin-A 179 pg/mL | **no** `tumor_markers_result`, **no** `hcg_result`; four markers named via `prenatal_concentration_unread`. Today: both wrong findings fire (measured), so this is the first red-before guard |

## 3. Commands

```bash
cd khanesh-server
node --test rules/prenatal.test.js     # new file
npm test                                # whole suite; compare with the measured pre-change run
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.length))"   # rule count before/after; id-set diff per N16
```

## 4. Red-before proof

Copy the pre-change tree (`git archive HEAD khanesh-server` + `node_modules` junction), copy only `prenatal.test.js`, run it: every behavioural test must fail there. Record the counts.

## 5. Owner review

Show the Persian strings verbatim (new `must_say`, `action`, caveats) before commit; register the pending item in `MEDICAL_RULES.md`.
