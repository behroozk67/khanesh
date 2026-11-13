# Data Model: specs/026

## New engine key

| Key | Route | Grade | `FA_NAMES` |
|---|---|---|---|
| `THYROGLOBULIN` | `serology.js` assay (`ungraded.THYROGLOBULIN`, `reason: "assay_printed"`, `state: "quoted"`) | none. The value and the printed range are quoted only. | تیروگلوبولین |

Fields: `value` (number or null), `cmp` (`<`/`>` for censored values), `shown` (as printed), `unit` (printed), `reference` (printed, quoted verbatim), `raw`.

## Changed constants

| Where | Before | After |
|---|---|---|
| `refs.js` `TSH.both` | `[0.5, 4.5]` | `[0.4, 4.5]` (US6, separate commit) |
| `labRefs.js` `tsh.range` | `low: 0.5` | `low: 0.4` |
| `conditions.js` `ACTIVE_CONDITIONS` | 4 ids | + `hypothyroid` |

## Rule branches touched (rule id `thyroid` unless stated)

| Branch / pattern | Change | Trigger |
|---|---|---|
| `thyroid_hypo_*` | condition text (C2); ≥ 10 text (C3); newborn timing (C8) | `hypothyroid` / TSH ≥ 10 with FT4 normal / `D(3)` row |
| `thyroid_hyper_*` | condition text (C1); < 0.1 text (C4) | `hypothyroid` / TSH < 0.1 with FT4 normal |
| `thyroid_tpo_positive` | condition tail (C5); pregnancy tail (C6) | `hypothyroid` / `pregnant` |
| `thyroid_antibody_positive` | same tails for anti-Tg | same |
| `thyroid_thyroglobulin` (new pattern, same rule) | Tg sentence (C7) | Tg present, nothing else abnormal |
| any `thyroid` finding | Tg sentence appended | Tg present |

## States

- **Condition:** `hypothyroid` is either reported (active) or absent. Every sentence is conditional on the drug: «اگر لووتیروکسین مصرف می‌کنید».
- **Anti-Tg next to Tg:** above/pos | within/neg | absent. Each has its own sentence (constitution II).
- **TSH magnitude (FT4 normal):** < 0.1 | 0.1 up to below range | in range | above range up to < 10 | ≥ 10.
- **Pregnancy:** `true` only. Unknown never triggers C6.

## Identity rules

- `THYROGLOBULIN_RE` is exact (`k0`), never a prefix. «Tg» alone is not mapped (triglyceride).
- `ANTI_TG_RE` is tested before `THYROGLOBULIN_RE`, so an antibody is never read as the protein.

## MEDICAL_RULES

**P144** records:
- `hypothyroid` activation
- C1–C8 wording
- the TSH range change
- the Tg route
- the reviewer questions:
  - TSH ≥ 10 urgency
  - upper TSH limit
  - whether the user wants a levothyroxine-specific condition
