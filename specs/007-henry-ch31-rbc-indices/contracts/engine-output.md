# Contract — what changes in `/api/analyze` for specs/007

No route, field or type is added or removed. `Tafsir.jsx` / `ResultView.jsx` need **no change**. Only these
values change.

| field | change | consumer impact |
|---|---|---|
| `_engine.patterns[]` | may contain the new id `rbc_indices_implausible` | none. Ids are opaque to the UI |
| `_engine.patterns[]` | `low_rbc_hct_without_anemia` no longer appears for a normal woman with RBC 4.10–4.49, or beside a Hct-only crisis, or beside the artefact note | none |
| `_engine.urgency` / `has_critical` | `emergency` / `true` for an adult sheet with Hct < 21 % and no Hb (was `routine` / `false`) | the existing emergency banner renders |
| `_engine.tests[]` (HCT, MCHC) | printed `L/L` / `g/L` are now converted, so `value` is % / g/dL | `range` agrees with `value` again |
| `_engine.unitConversions[]` | new rows with `test: "HCT"` or `"MCHC"`, `name` = `faName()` | rendered by the existing «واحدها» card (`name`, never `test`) |
| `_engine.uncovered[]` | `RBC`/`HCT` are covered by the crisis's Hct branch or by the artefact note; `MCHC` by the note | the «نیازمند بررسی» chip is not shown on those rows |
| `ocr_warnings` («تفسیر نشدند») | may list «شمارشِ مطلقِ رتیکولوسیت» (was an unmapped raw row) | none |

Guard `G7` (every convertible key is in `FA_NAMES`) must stay green. HCT and MCHC are already in `FA_NAMES`.
