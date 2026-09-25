# Data Model: specs/009

Everything below is in-memory, per request. Nothing is persisted and the API response shape does not change
([contracts/engine-output.md](contracts/engine-output.md)).

## 1. Graded keys (existing, one range changes)

| key | unit | adult range today → after | PED | grading mode | readers after this feature |
|---|---|---|---|---|---|
| `MONO_ABS` | /µL | `[0, 800]` → **`[200, 800]`** (P56) | `refs_ped.js:91` unchanged | binary | `monocytosis`, `monocytopenia` |
| `EOS_ABS` | /µL | `[0, 450]` unchanged | `refs_ped.js:96` | CTCAE `EOS_HIGH` (G1 only) | `eosinophilia` |
| `BASO_ABS` | /µL | `[0, 200]` unchanged | `refs_ped.js:101` | binary | `basophilia`, `cml_suspicion` (owner at WBC > 50) |
| `MONO_PCT` | % | not graded (no range) | — | — | quoted in the monocytosis text only |

**Rule cut-offs** (named constants in `patterns_utils.js`, never the range; N23):
- `MONOCYTOSIS_ABS_UL = 1000`: "monocytosis" wording, adults and children alike, and only when the value is also
  graded high.
- `HYPEREOSINOPHILIA_ABS_UL = 1500`: this_week band, only when also graded high.

## 2. Smear item (new, adapter output channel `smear`)

`runEngine(...)` returns a new field, `smear: SmearItem[]`. It is empty on every sheet without a recognised smear row.

```
SmearItem = {
  kind:  "blasts" | "auer" | "toxic_granulation" | "dohle" | "pelger" | "pseudo_pelger"
       | "may_hegglin" | "alder_reilly" | "chediak_higashi",
  state: "present" | "absent",          // from castValueState; "unknown" never becomes an item (row → unmapped)
  pct:   number | null,                 // blasts only: the printed % (0–100); null if a word ("Few", "Present")
  raw:   { name: string, value: string } // as printed — for the text and the trace, never re-parsed
}
```

**Validation rules:**
- The kind comes from the **row name**, matched against the closed vocabulary (research R8). For a generic header row
  (smear/PBS/morphology/comment/remark), it comes from vocabulary terms found in the **value**; each term found is one
  item, with `state: "present"`.
- A blasts `%` outside 0–100, or a comma-ambiguous number, is not an item. The row goes to `unmapped` (N2/N6).
- `pct === 0` or an absence word → `state: "absent"`: read, normal, no finding, and not in `unmapped`.
- `castValueState(...) === "unknown"` → no item. The row keeps today's route (`unmapped`).
- Page kind: smear rows are only taken from pages that are not urine-only or semen pages (`detectUrineOnlyPages`, the
  semen layer). So «Pelger» on a urine page is never a blood-smear finding (N25).
- Merge key: `mergePages` dedupes by name. A smear row whose name matches another page's row keeps the page prefix rule
  already used for `semen:`/`electro:` (checked in implementation; T29 if a collision is found).

## 3. `smearAxis(e)` (new pure classifier, `patterns_utils.js`) and the hand-off

```
smearAxis(e, { exclude } = {}) -> null | {
  urgency: "emergency" | "this_week" | "routine",
  items:   SmearItem[],               // present items only, in fixed display order
  leukemic: SmearItem[]               // the emergency-class items: blasts pct ≥ 20, auer
}
```

`smearAxis` is **pure**: it reads only `e.smear` and never calls a rule. This avoids a `patterns_utils` →
`patterns_malignancy` import cycle. The hand-off is done by the two readers, both from the same classifier output:

- `acute_leukemia_suspicion` (`patterns_malignancy.js`) adds its smear clause when `smearAxis(e)?.leukemic.length > 0`.
- `peripheral_smear_findings` (`patterns_leukocyte.js`) asks whether `acute_leukemia_suspicion` fires, using the live
  `match` from `RULES_MALIGNANCY` via a module-local `firesById(e, id)` (the `ruleFiresById` shape; the existing helper is
  local to `patterns_hematology.js` and only searches `RULES_HEMATOLOGY`). If it fires, the rule calls
  `smearAxis(e, { exclude: "leukemic" })`, so exactly one finding talks about blasts.

| present items | urgency |
|---|---|
| blasts `pct ≥ 20`, or auer | emergency |
| blasts `0 < pct < 20`, blasts with `pct == null`, or pseudo_pelger | this_week |
| toxic_granulation, dohle, pelger, may_hegglin, alder_reilly, chediak_higashi | routine |

- The urgency is the **maximum** over the present items that remain after `exclude`.
- The classifier returns `null` when no item remains. `peripheral_smear_findings` fires iff the classifier, after the
  hand-off, is not `null`.

## 4. New findings (patterns module `patterns_leukocyte.js`, spread into `RULES`)

| rule id | match | urgency | notes |
|---|---|---|---|
| `monocytosis` | `MONO_ABS` graded high | routine | Two arms: `< MONOCYTOSIS_ABS_UL` «کمی بالاتر از حد طبیعی», `≥` monocytosis with causes and a repeat CBC + smear. Quotes `MONO_PCT` when printed. |
| `monocytopenia` | `MONO_ABS` graded low | routine | Three-way on WBC: low → «بخشی از همان افتِ گلبول سفید»; normal → «به‌تنهایی معمولاً معنای خاصی ندارد»; absent → says WBC is not on the sheet. |
| `eosinophilia` | `EOS_ABS` graded high | routine below 1500 / this_week at ≥ 1500 | The band's timeline is derived from the urgency (`actionFor`, N20). |
| `basophilia` | `BASO_ABS` graded high **and not** `firesById(e, "cml_suspicion")` | routine | |
| `peripheral_smear_findings` | `smearAxis` after the hand-off is not `null` | from `smearAxis` | `always_show` + one-line `brief`; the `must_say` carries no timeline. |

Changed rule: `acute_leukemia_suspicion` gains a smear clause when `smearAxis` handed the blast/Auer items to it.
Its urgency and action are unchanged.

## 5. Coverage net change (`patterns.js`)

`covered` keys and the coverage text come from **shown** findings only: not suppressed, and not briefed (briefed
findings keep contributing through `brief`/`brief_warnings`, unchanged). Research R6.

## 6. State transitions

None. Every request is evaluated statelessly.
