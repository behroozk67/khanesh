# Data Model: Tumour-Marker Reading

## TmRange (parsed printed range for one row)

| Field | Type | Notes |
|---|---|---|
| `bands` | array of TmBand, 1–2 | one band for ordinary ranges; two for labelled smoker/non-smoker |
| `kind` | `"single"` \| `"labelled"` \| `"unreadable"` | `unreadable` when a labelled multi-band string cannot be read whole |

### TmBand

| Field | Type | Notes |
|---|---|---|
| `label` | `null` \| `"nonsmoker"` \| `"smoker"` | label as printed; `null` for a plain range |
| `lo`, `hi` | number \| null | null = open side |
| `loStrict`, `hiStrict` | boolean | `true` for `<` / `>`; `false` for `≤`, «up to», «at or below», `lo-hi` |

Validation: for `labelled`, `nonsmoker.hi < smoker.hi`, otherwise `unreadable` (a contradictory print is not guessed).

## TmVerdict (state stored in `ungraded[key].state`)

`below | within | between | above | noref | unreadable`

- `between`: only for `labelled` ranges when smoking status is unknown and `nonsmoker.hi < value ≤ smoker.hi` (respecting strictness).
- `noref`: no range printed (existing P77 state). `unreadable`: a range was printed but cannot be read (replaces today's undifferentiated «خوانده نشد» only for truly unparseable text).
- Censored values («<0.5») keep today's behaviour (`noref`, no up/down claim).

## TmRow (element appended to `_engine.tests`)

| Field | Type | Notes |
|---|---|---|
| `key` | string | engine key (`CEA`, `CA125`, `CA153`, `CA199`) |
| `name` | string | `faName(key)` — never the raw key (N8) |
| `value` | number \| null | numeric value as read |
| `unit` | string \| null | printed unit |
| `range` | string \| null | the printed range text of that row |
| `refSource` | `"printed"` | always |
| `abnormal` | `true` \| `false` \| `null` | `null` for `noref` / `between` / `unreadable` |
| `dir` | `"high"` \| `null` | `high` only for `above` |
| `fa` | string | Persian worded status |
| `level`, `ctcaeGrade` | null | tumour markers have no severity scale |
| `nearLimit` | false | |
| `source` | `"tumor_marker_printed"` | |
| `verdict` | TmVerdict | additive field the client uses to pick the no-verdict state |

Relationships: built from `engineOut.ungraded[key]` where `reason === "assay_printed"` and `key ∈ TM_KEYS`; never added to `graded`, so `score.js`, PhenoAge and CTCAE are untouched.

State transitions: none (stateless per request).

## As built (2026-11-08) — corrections to the sections above

- **Stored `ungraded[key].state` values:** `below | within | between | above | noref`. `unreadable` is *not* stored: it is derived (`noref` + a non-empty printed `reference`), exactly the P114 convention already used by `lineOf`; adding a stored state would have created a value no existing reader knows (N28).
- **TmBand for labelled ranges:** `lo` is normalised to `null`; «0-5» and «< 5» are both upper-only bands.
- **Single range, no population label:** if the whole string is not one band, the old behaviour is kept — first readable part after splitting on `/ ; | ،` — because HEAD read «0-35 U/mL (CA 125 II)»; with a smoker/non-smoker label present this salvage is never reached.
- **Row additions:** `dir: "low"` exists for `below`; `value` may be the printed string for censored values.
