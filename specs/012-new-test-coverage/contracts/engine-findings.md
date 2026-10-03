# Contract — findings and routing for specs/012

This is the engine's only external interface affected: `runPatterns(e).findings[]`, serialised by `server.js` into the existing response (`_engine.patterns`, `interpretation`, `general_recommendations`). The response schema is unchanged.

## C1 Routing contract (adapter)

| Input row (name: value [unit]) | MUST land in | MUST NOT land in |
|---|---|---|
| `VDRL: Reactive 1:8`, `RPR: Non-reactive` | `qual` | `unmapped`, `tests` |
| `Rubella IgG: 4 IU/mL (Immune ≥ 10)` / `Rubella IgG: Immune` (a bare number with no printed cutoff → unread, C1) | `qual` | `unmapped` |
| `Rubella IgM: Positive` | `unmapped` | `qual` |
| `Indirect Coombs: Positive`, `Antibody screen: Negative` | `qual` | `tests` (COOMBS_WRIGHT) |
| `Coombs Wright: 1/160` | `tests.COOMBS_WRIGHT` (unchanged) | `qual` |
| `Direct Coombs: Positive`, `Coombs: Positive` | `unmapped` | `qual`, COOMBS_WRIGHT |
| `H. pylori Ag (stool)`, `UBT`, `H.pylori IgG` | `qual` | `unmapped` |
| `H. pylori IgA` / `IgM` | `unmapped` | `qual` |
| `Anti-Tg: 300 IU/mL (<115)` | `ungraded.ANTI_TG` reason `assay_printed` | `tests.TG` |
| `Anti-Tg: 300` (no unit, no range) | unread / `unitUnknown` | graded anything |
| `TRAb: 8 IU/L (<1.75)` | `ungraded.TRAB` reason `assay_printed` | — |
| `Tg: 180 mg/dL` | `tests.TG` (unchanged) | ANTI_TG |
| `Spermogram: Abnormal` | `semenQual`, and named in a finding or the unread line | silent |

## C2 Finding contract (each new or extended rule)

Every finding object carries the standard fields (`pattern`, `urgency`, `headline`, `must_say`, `action`, `warnings`, `suggest`, `sources`). In addition:

1. `action` is produced by one `ACTION[urgency]` lookup (N20). No timeline is written beside it.
2. `must_say` names the test in Persian and quotes the value exactly as printed (titre, number + unit, or word).
3. A negative result's text is scoped to that test. It never says «سالم هستید» or «عفونت ندارید».
4. Forbidden phrasings (asserted by test): «سیفلیس دارید», «مبتلا به گریوز», «عفونت هلیکوباکتر دارید» as a conclusion from one result; any vaccination advice in a declared pregnancy.
5. `sources` contains only ids that exist in `guidelines.js` (G6).
6. Every `suggest` string exists in `SUGGEST_TESTS` with the keys that make it "already measured".

### Draft headlines (Persian, for reviewer; final strings land in P68)

| id / branch | headline |
|---|---|
| syphilis, reactive | «آزمایش غربالگری سیفلیس (VDRL/RPR) شما واکنش‌گر است» |
| syphilis, non‑reactive | «آزمایش غربالگری سیفلیس (VDRL/RPR) شما منفی است» |
| rubella, non‑immune, pregnant | «آنتی‌بادی محافظ سرخجه در خون شما کافی نیست — در بارداری مهم است» |
| rubella, non‑immune | «آنتی‌بادی محافظ سرخجه در خون شما کافی نیست» |
| ICT positive, pregnant | «در آزمایش کومبس غیرمستقیم شما آنتی‌بادی دیده شده است» |
| ICT negative | «آزمایش کومبس غیرمستقیم شما منفی است» |
| H. pylori active, positive | «آزمایش هلیکوباکتر پیلوری شما (آنتی‌ژن مدفوع/تست تنفسی) مثبت است» |
| H. pylori IgG, positive | «آنتی‌بادی هلیکوباکتر پیلوری در خون شما مثبت است» |

## C3 Count contract (one owner)

For each in‑scope test, exactly **one** finding's text mentions it (M309). This holds on panels that also contain TSH/FT4 (thyroid fold), Coombs Wright (brucella), and a pregnancy flag.

## C4 Server routing contract

A sheet whose only rows are one in‑scope serology test stays on the engine path: the response has `_engine`, and does not contain `buildNormalResult`'s «نتایج آزمایش شما در محدوده طبیعی است» (T45, T46).
