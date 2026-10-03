# Data Model — specs/012

Engine-internal shapes only. No new persistence or API fields.

## Channels a row can land in (adapter → `e`)

| Channel | New content | Who reads it |
|---|---|---|
| `e.qual[rawName]` | VDRL, RPR, Rubella IgG, Indirect Coombs, H. pylori (Ag/IgG/UBT), qualitative Anti‑Tg/TRAb/TSI | `patterns_serology.js`, `thyroid` rule |
| `e.ungraded[KEY]` with `reason: "assay_printed"` (**new reason**) | numeric `ANTI_TG`, `TRAB` that have a printed reference range: `{ value, unit, printedRange: [lo, hi] \| {lt} \| {gt}, raw }` | `thyroid` rule only |
| `e.unitUnknown` / unread line | numeric Anti‑Tg/TRAb with no printed range and no qualitative word; numeric Rubella IgG without a unit or printed cutoff | existing `unit_unknown_values` / «تفسیر نشدند» |
| `e.unmapped` | Rubella IgM, H. pylori IgA/IgM, Direct Coombs/DAT, bare `Coombs` | existing «تفسیر نشدند» line |
| `e.semenQual` | unchanged, but every row must now be named | `patterns_reproductive.js` |

Invariant (N28): every name the adapter recognises ends in a channel that has a reader, or in `unmapped`. Guard: M301 (routing) + M313 (semen).

## New engine keys (display names via `FA_NAMES`)

| Key | Persian name (proposal) |
|---|---|
| `ANTI_TG` | آنتی‌بادی ضد تیروگلوبولین (Anti‑Tg) |
| `TRAB` | آنتی‌بادی گیرندهٔ TSH (TRAb/TSI) |

The qualitative tests keep their raw `qual` key (house convention). Their Persian label is fixed inside the rule text: «آزمایش غربالگری سیفلیس (VDRL/RPR)», «ایمنی سرخجه (IgG)», «کومبس غیرمستقیم (غربالگری آنتی‌بادی)», «هلیکوباکتر پیلوری».

## Reader state (`qualState` + titre)

```
state: "pos" | "neg" | "num" | "unknown"
  num   → { n, cmp: "<"|">"|"≤"|"≥"|null, unit }
titre → parseTitre(raw) ⇒ denominator | 0 | null   (only after qualState says "unknown" or "pos")
```

Mapping rules:
- `pos` with a titre → reactive at titre 1:n.
- `neg`, or `parseTitre === 0` → non‑reactive.
- `unknown` (`+/-`, equivocal, borderline, grey zone, «مشکوک») → unread. It is never `pos` and never `neg`.
- For Rubella IgG (C1): immune/non‑immune only from the lab's **printed** cutoff on the row (`≥ x`, `< x`, a range) or an interpretation word (`Immune`, `Non-immune`, `ایمن`, `غیر ایمن`). A number with no printed cutoff and no word → unread. No engine‑fixed 10 IU/mL. `Equivocal` / grey zone → unread.
- For H. pylori, the subtype comes from the key: `ag|antigen|stool|sat` or `ubt|breath` → **active test**; `igg|ab|antibody|serology` → **serology**. If the key has neither, the result is unread.

## Context inputs

- `e.pregnant === true` only (declared by the user, P53 Q2). `canBePregnant(e)` is **not** used to assert pregnancy.
- `e.sex`, `e.age`. Rubella IgG in an infant under 12 months gets the sentence "maternal antibody, no immunity claim".

## Findings (new rule ids)

| id | file | reads | urgency range |
|---|---|---|---|
| `syphilis_screen_result` | patterns_serology.js | qual VDRL/RPR | routine … this_week |
| `rubella_igg_status` | patterns_serology.js | qual Rubella IgG, pregnant, age | none/routine … this_week |
| `indirect_coombs_result` | patterns_serology.js | qual ICT, pregnant | routine … this_week |
| `h_pylori_result` | patterns_serology.js | qual H. pylori by subtype | routine |
| (`thyroid`, extended) | patterns_endocrine_rheum.js | + ANTI_TG, TRAB (assay_printed/qual) | unchanged; + a pregnancy sentence when TRAb is above its printed range and pregnancy is declared (no 3× escalation, C1) |
| (`semen_analysis` / reader for text rows) | patterns_reproductive.js | semenQual text rows | routine |

State transitions: none (stateless per request).
