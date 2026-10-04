# Data Model: Prenatal Screening Channel

## Channel `e.prenatal`

```text
prenatal = {
  markers: { [KEY]: Item },        // KEY in FBHCG, PAPPA, NT, AFP_MAT, UE3, HCG_TOT, INHA
  risk:    { T21?, T18?, T13?, NTD?: RiskItem },   // printed by the lab
  dating:  { ga_weeks?, ga_days?, basis?: "us"|"lmp"|null, discrepancy_days? },
  profile: { sex, age, pregnant }  // from the user profile; not a signal for identity
}
Item     = { key, raw, mom|null, value|null, unit|null, position?, claimed_by: "name"|"mom_unit"|"companion" }
RiskItem = { raw, denominator|null, category: "high"|"intermediate"|"low"|null }
```

- `AFP_MAT` and `HCG_TOT` are new keys, **never** `AFP` / `HCG` (N25). A weak-name row not claimed stays on its old key.
- `value` is set only for plain concentrations and is never graded; `mom` only for MoM rows.
- Keys are absent from `ADULT_REFS`; they are `noRef`-style for coverage purposes and need `FA_NAMES`.

## Arms and classifier labels

| Arm | Window (source ✅) | Labels (single value) |
|---|---|---|
| first | 9+0–13+6 | `t21_fts` (FBHCG > 1.5 ∧ PAPPA < 0.5 ∧ NT ≥ 3.0 or printed raised), `nt_only`, `null` |
| second | 15–22 | `ntd` (AFP_MAT ≥ 2.5), `ue3_very_low` (UE3 ≤ 0.10), `null` |

Labels that need a pending cut-off (`t18_t13`, `triploid_*`, `turner`, quad `t21`/`t18` from MoM direction) are **not classifier outputs yet**. Their findings are reachable only from the lab's printed risk/category (D5). Adding one later = one new label in the classifier + one rule, with the register item approved.

## Findings (rule ids, urgency per clarification Q1)

| id | fires on | urgency |
|---|---|---|
| `prenatal_t21_pattern_fts` | label `t21_fts` | this_week |
| `prenatal_nt_raised` | NT ≥ 3.0 (independent of label/risk) | this_week |
| `prenatal_ntd_afp` | label `ntd` | this_week |
| `prenatal_ue3_very_low` | label `ue3_very_low` | this_week |
| `prenatal_printed_risk_high` | lab category high for T21 (or engine band when none printed) | this_week |
| `prenatal_printed_risk_t18_t13` | lab category high for T18/T13/triploid | soon |
| `prenatal_printed_risk_partial` | printed risk/category + missing markers, no label (FR-009a) | per category, else routine |
| `prenatal_papp_a_low` | PAPPA < 0.4, no `t21_fts` | routine |
| `prenatal_afp_low` / `_afp_high_isolated` / `_hcg_high_isolated`† / `_inhibin_high` / `_ue3_low` | isolated marker, no owning label | routine |
| `prenatal_window_invalid` | printed GA outside window, or discrepancy > 10 d | routine (caveat finding; never lowers another finding) |
| `prenatal_concentration_unread` | marker printed as plain concentration, no MoM/risk | routine |
| `prenatal_profile_mismatch` | male/child profile | routine |

† `hcg_high_isolated` is pending (conflicting cut-off) — id reserved, rule **not** written until approved.

A hand-off helper decides ownership once (`prenatalOwns(e, key)`) and every isolated rule and the weak-name readers call it (M91e lesson: ask "does the owner fire", never restate a threshold).

## State and validation rules

- A marker is `present` (Item), `printed-not-readable` (placeholder/unparseable → «تفسیر نشدند»), or `absent`; three-way text for each (N4).
- MoM parsing: Persian digits, decimal comma (`commaToDot`), and a `MoM` unit token; a `1:250`-style value is a RiskItem, not a marker.
- No finding sets `has_critical`; no `emergency`.
