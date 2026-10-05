# Data Model: 24-Hour Urine and Body-Fluid Chemistry (Stage A)

## Specimen identity (closed set)

| id | specimen | analyte | Persian name (`SPECIMEN_FA`) |
|---|---|---|---|
| `U24_VOL` | 24-h urine | volume | حجم ادرار ۲۴ساعته |
| `U24_PROT` | 24-h urine | protein | پروتئین ادرار ۲۴ساعته |
| `U24_CREAT` | 24-h urine | creatinine | کراتینین ادرار ۲۴ساعته |
| `U24_UREA` | 24-h urine | urea / UUN (not distinguished in Stage A) | اورهٔ ادرار ۲۴ساعته |
| `U24_CA` | 24-h urine | calcium | کلسیم ادرار ۲۴ساعته |
| `U24_URIC` | 24-h urine | uric acid | اسید اوریک ادرار ۲۴ساعته |
| `FL_GLU` | body fluid | glucose | قند مایع |
| `FL_PROT` | body fluid | protein | پروتئین مایع |
| `FL_LDH` | body fluid | LDH | LDH مایع |
| `FL_TYPE` | body fluid | fluid-type row (code or word) | نوع مایع |

`U24_CA` is a specimen identity and **not** the engine key `U_CA`. See research R3.

## Specimen row

| field | type | rule |
|---|---|---|
| `id` | one of the ids above | from `specimenClaim` |
| `name` | string | the printed row name, verbatim |
| `raw` | string | the printed value, verbatim (shown to the patient) |
| `unit` | string \| null | the printed unit, verbatim. Never inferred |
| `fluid` | `{ type, code? }` \| absent | fluid rows only. `type` ∈ `pleural · ascites · csf · synovial · pericardial · other · unknown` |
| `claimed_by` | `"name"` \| `"evidence"` | `evidence` = a bare urine name claimed through R1(b) |

Validation: a row is claimed at most once. A row that `mapKey` resolves is never claimed, except the R1(b) bare
names. Two rows with the same `id` (and the same fluid type, for fluids) and different `raw`: the first is kept, the
second goes to `unmapped`.

## `e.specimen` (runEngine output channel)

```
specimen: {
  u24:   [SpecimenRow, …],      // ordered as printed
  fluid: [SpecimenRow, …],      // FL_TYPE rows included
  bareServingFluidNames: [string, …]   // R6: bare Glucose/Protein/LDH printed beside a Fluid Type row (caution only)
}
```

- Always present, with empty arrays when unused, so consumers need no null checks. An empty channel changes no
  output (FR-004).
- **No reader** among `patterns_*.js` in Stage A. Its only consumers are `specimenLine()` (prompt.js) and
  `server.js`. Not added to `safeEngineOut`, the graph state or the prompt payload (N13).

## State transitions

None in Stage A. When P87 is approved, rows from this channel will be read by a future `patterns_specimen.js`. The
channel shape is chosen so that this needs no adapter change.
