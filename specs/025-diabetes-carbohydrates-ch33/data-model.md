# Data Model: specs/025

## New engine keys

| Key | FA_NAMES | Mode | Fallback range (refs.js) | Printed range | Units read (printed only) |
|---|---|---|---|---|---|
| `INSULIN` | «انسولین» | binary | 2.6–24.9 µIU/mL (adult and child) | first, both edges (`PRINTED_FIRST_BOTH_KEYS`) | µIU/mL = µU/mL = mIU/L; pmol/L ÷ 6.945 |
| `C_PEPTIDE` | «سی‌پپتید (C-peptide)» | binary | 1.1–4.4 ng/mL | first, both edges | ng/mL; nmol/L ÷ 0.331; pmol/L ÷ 331 |

`NAME_MAP` spellings are matched after normalisation:
- `INSULIN`: `insulin`, `fastinginsulin`, `insulinfasting`, `seruminsulin`, `insulinserum`, «انسولین», «انسولینسرم», «انسولینناشتا».
- `C_PEPTIDE`: `cpeptide`, `cpep`, `cpept`, `connectingpeptide`, «سیپپتاید», «سیپپتید», «پپتیدc».

Not mapped, and they must stay unmapped (N25): `insulinantibody`, `antiinsulin`, `iaa`, `homair`, `homa`, `proinsulin`.

## Serology entries (`serology.js`, `assay_printed`)

| Id | FA | Regex roots | Verdict |
|---|---|---|---|
| `ANTI_GAD` | «آنتی‌بادی ضد GAD» | `antigad`, `gad`, `gadab`, `gad65`, `antigad65`, `antiglutamicaciddecarboxylase` | the printed cut-off, or `qualVerdict` for a word; otherwise unread |
| `ANTI_IA2` | «آنتی‌بادی ضد IA-2» | `antiia2`, `ia2`, `ia2a`, `ia2ab` | same |

## Rules (new or changed)

| Rule id | File | Kind | Reads | Urgency | `RULE_GROUP` |
|---|---|---|---|---|---|
| `glycemia` → `diabetes_range` / `prediabetes_range` | patterns_biochem.js | **text change** when `dm2` is active and the patient is not pregnant (D1/D2); `applied_conditions: ["dm2"]` | GLU_F, GLU_2H, GLU_RANDOM, HBA1C, `e.conditions` | unchanged | unchanged |
| `diabetes_range` | patterns_biochem.js | **sentence added** for HbA1c > 15 (D5) | HBA1C, `hbVariantState` | unchanged | unchanged |
| `a1c_diabetes_range_unreliable` | patterns_biochem.js | **direction text** (D6) | MCV, ferritin (`ferritinBelowIdCut`), RETIC | unchanged (`this_week`) | unchanged |
| `hba1c_low` | patterns_biochem.js | new owner (D5) | HBA1C dir low, HGB, MCV, `hbVariantState` | `routine`; `this_week` with an abnormal count | biochemistry |
| `insulin_result` | patterns_biochem.js | new owner of INSULIN/C_PEPTIDE when no hypoglycaemia (US2-6) | INSULIN, C_PEPTIDE, glucose | `routine` | hormones/immunology |
| `hypoglycemia_insulin_not_suppressed` | patterns_biochem.js | new (D4); `always_show` + `brief` | glucose < 54, INSULIN, C_PEPTIDE | `soon` | biochemistry (beside the hypoglycaemia emergency) |
| `islet_autoantibody_result` | patterns_autoimmune.js | new (D7) | `ungraded.ANTI_GAD`/`ANTI_IA2` (`assay_printed`), `qual` | `routine`; `this_week` if positive with glucose in the diabetes range | hormones/immunology |

## States

**Insulin pair (D4).** Evaluated only when glucose < 54:

| INSULIN | C_PEPTIDE | Label |
|---|---|---|
| not low | not low | `endogenous` |
| not low | absent | `endogenous_cp_unknown` (C-peptide is suggested, never asserted) |
| high | low | `exogenous` |
| low | any | no finding (insulin appropriately suppressed) |
| absent | any | no finding |

**`dm2` mode (D1/D2)**: `e.conditions?.includes("dm2") && !e.pregnant`. Pregnancy keeps `gestational_diabetes_range` as owner.

**HbA1c target (D1)**: `< 7` is «در محدودهٔ هدفِ رایج»; `≥ 7` is «بالاتر از هدفِ رایج».

## Identity rules

- `insulin_result` and `hypoglycemia_insulin_not_suppressed` partition the input space: the first requires *no* glucose < 54. They cannot both fire.
- `hba1c_low` and `diabetes_range` cannot both fire on one HbA1c.
- The HOMA-IR row is never read.

## MEDICAL_RULES

Entry **P143**, «پیاده‌شده؛ در انتظارِ بازبینیِ بالینی». It contains:
- the duplicates table;
- D1–D9, each with its source status;
- the conflicts table;
- the «if rejected» line for each item.

It also cross-references P69 for the insulin factor and HOMA-IR.
