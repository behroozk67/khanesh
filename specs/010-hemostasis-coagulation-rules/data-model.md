# Data Model: specs/010

## New engine keys (not graded, no `refs.js` row)

| key | FA_NAMES (proposed, shown for review) | value | unit handling |
|---|---|---|---|
| `FVIII` | «فعالیتِ فاکتور ۸ (FVIII)» | % | `%`/`IU/dL`/`U/dL` ×1, `IU/mL`/`U/mL` ×100, else `unknown` |
| `FIX` | «فعالیتِ فاکتور ۹ (FIX)» | % | same |
| `VWF_AG` | «آنتی‌ژنِ فون‌ویلبراند (vWF:Ag)» | % or IU/dL | same |
| `VWF_ACT` | «فعالیتِ فون‌ویلبراند (vWF:RCo)» | % or IU/dL | same |
| `FVIII_INHIB` | «مهارکنندهٔ فاکتور (Bethesda)» | BU or text | `BU`, `BU/mL`, `Bethesda`; text via closed list |
| `PT_CONTROL` | «PTِ کنترل» | seconds | context for the ISTH PT component only; never graded, never shown as a finding of its own |

## Side channel `hemostasis` (on the engine output, beside `smear`)

```
hemostasis: {
  [key]: {
    value: number | null,        // converted to % (or BU) when unitState === "ok"
    raw: string,                  // as printed
    unit: string | null,          // as printed
    unitState: "ok" | "unknown" | "unrecognised",
    printedRef: { low, high } | null,   // parsed from the row's own reference, same parser as parseReference
    qual: "positive" | "negative" | "unknown" | null   // FVIII_INHIB text only
  }
}
```

It is never sent to the model or the graph (N13). Its only readers are in `patterns_hemostasis.js` and `isthScore`.

## Derived values

- **`factorBand(pct, printedRef, age)`**: one function, one set of comparisons (FR-018). If `age` is under 16 (or neonatal) it returns `paediatric` and no comparison is made (FR-020).
  - `pct < 1` → `severe`
  - `pct <= 5` → `moderate`
  - `pct <= 30` → `mild`
  - `printedRef && pct < printedRef.low` → `reduced`
  - `printedRef && pct >= printedRef.low` → `inRange`
  - no printed reference and `pct > 30` → `notJudged`. The number is quoted, and the text says the sheet printed no
    range; it is never called normal.
- **`vwfRatio`**: `VWF_ACT / VWF_AG`, only when both have `unitState: "ok"`; otherwise `null` with the reason.
- **`isthScore(e)`** (PLT < 50 scores 2 for fidelity, but the `dic_isth_score` trigger excludes PLT < 50, so that arm is never reached from the rule): `{ plt, ddimer, pt, fib, total, missing[] }`. Each component is `0 | 1 | 2 | 3 | null`, and
  `total` sums the non-null ones (research R5).

## Rules

| id | file | fires when | urgency |
|---|---|---|---|
| `factor_activity` (new) | `patterns_hemostasis.js` | `FVIII` or `FIX` in the channel (any band, any unit state); FVIII stands down when `vwf_panel` fires (I2) | from band (R8); `this_week` with a positive inhibitor or one with no possible verdict |
| `factor_inhibitor` (new) | `patterns_hemostasis.js` | `FVIII_INHIB` present **and** `factor_activity` does not fire. When it fires, the inhibitor sentence folds into it (one owner). | closed-list positive → `this_week`; closed-list negative or a printed reference that says negative → `routine`; a number with no printed reference, or `unknown` → `this_week` (no verdict possible; floor) |
| `vwf_panel` (new) | `patterns_hemostasis.js` | `VWF_AG` or `VWF_ACT` present | `this_week` if a value is below its printed range or cannot be judged (no range printed); `routine` only when every printed value is inside its own printed range. The ratio is quoted, never compared with a threshold (FR-021). |
| `dic_isth_score` (new) | `patterns_hematology.js`, beside `dic_pattern` | `!isDIC(e)` ∧ 50 ≤ PLT < 100 ∧ D-dimer > 400 ng/mL | `soon` |
| `thrombocytosis` (changed `build` only) | `patterns_hematology.js` | unchanged `match` | PLT ≥ 1000 → `this_week`, else unchanged `routine` |
| `coagulation_abnormal` (changed `match` only) | `patterns_hematology.js` | unchanged, **and not** `factorOwnsAptt(e)` | unchanged |

`FVIII:C` in a vWF panel is the same analyte as FVIII activity, so it maps to `FVIII`. When a vWF value is on the sheet,
`vwf_panel` owns it and quotes it with no hemophilia band; `factor_activity` stands down for FVIII (FIX unchanged). That read is via a helper, so `RULE_READS` does not double-count it.

## State rules (constitution II)

Every text branch covers:

- below / inside the printed range / not printed;
- measured / not on the sheet (the vWF partner, PT control, APTT beside a factor);
- positive / negative / unknown (inhibitor).

No `x != null ? x : 'طبیعی'`.
