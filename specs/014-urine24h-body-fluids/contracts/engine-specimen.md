# Contract: specimen channel and its Persian text (Stage A)

## 1. `rules/specimen.js` (pure, no I/O)

| export | signature | contract |
|---|---|---|
| `specimenSheetEvidence(tests, norm)` | `→ { u24: boolean, fluidTypeRow: boolean }` | `u24` is true when any row matches R1(a) or carries a 24-h unit. `fluidTypeRow` is true when a `Fluid Type` row is present |
| `specimenClaim(row, evidence, norm, mapKey)` | `→ { id, fluid?, claimed_by } \| null` | `null` for any row `mapKey` resolves, except bare urine protein/creatinine/volume claimed with `evidence.u24` (R1(b), R3) |
| `fluidTypeOf(name, value)` | `→ { type, code? }` | type words only; a numeric code gives `type: "unknown"` |
| `SPECIMEN_FA` | `{ [id]: string }` | Persian names (data-model table) |
| `FLUID_TYPE_FA` | `{ pleural: "مایع پلور", ascites: "مایع آسیت", csf: "مایع مغزی‌نخاعی", synovial: "مایع مفصل", pericardial: "مایع پریکارد", other: "مایع دیگر" }` | |

## 2. `runEngine(ocr).specimen`

Shape as in [data-model.md](../data-model.md). Invariants (each is a test):

- A claimed row appears in **none** of `graded`, `ungraded`, `qual`, `noRef`, `unmapped`, `hemostasis`, `prenatal` (U01–U04).
- With an empty channel, the whole `runEngine` + `runPatterns` output is byte-identical to the pre-change tree (U09, U10).
- No `patterns_*.js` file reads `e.specimen` (U14, a source grep. It fails if a rule starts reading the channel without P87 approval).

## 3. Persian strings (user-facing, exact)

`specimenLine(specimen)` → `string | null` (null when both arrays are empty). Rows are listed as `<SPECIMEN_FA name> value[ unit]` (the Persian name, no guillemets; refined during implementation),
joined by «؛ ». The 24-hour group comes first.

```
این مقادیر شناخته شدند، ولی موتور هنوز تفسیرشان نمی‌کند (قواعدشان در انتظارِ بازبینیِ پزشک است) — ادرار ۲۴ساعته: {rows}. مایع بدن ({typeFa}): {rows}. دربارهٔ این مقادیر حکمی نمی‌دهیم؛ حتماً با پزشک بررسی کنید.
```

- `{typeFa}`: `نوع: مایع پلور`, …, or for a code `نوع: کدِ «4»، نامعلوم`, or with no type row and no type word `نوعِ مایع روی برگه نیامده`.
- A group with no rows is omitted, including its label.
- Several fluid types: one `مایع بدن (…)` group per type.
- The `FL_TYPE` row is not listed as a value. It only fills `{typeFa}`.

R6 caution (appended only when `bareServingFluidNames` is non-empty). A bare name is listed only when the same analyte is **not** also printed with a fluid name on the sheet: in request 28, `Fluid LDH` plus `LDH` means the bare `LDH` is the serum partner, so no caution (refined during implementation, U11/U13):

```
ردیف‌های {names} بی‌نامِ نمونه چاپ شده‌اند و موتور آن‌ها را مقدارِ خون فرض کرده است. اگر روی برگهٔ شما این ردیف‌ها مالِ مایع‌اند، این را به پزشک بگویید؛ تا آن موقع هر توصیهٔ فوری در همین گزارش معتبر است.
```

The first wording («تفسیرِ مربوط به آن‌ها را نادیده بگیرید») was dropped after code review. Beside `Glucose 30` it invited the patient to dismiss a hypoglycaemia emergency (N20). The caution informs only, and never overrides another instruction (U18).

`buildUninterpretedResult(unmapped, { listShown, recognized })`. When `recognized` is non-empty, the interpretation becomes:

```
این مقادیر شناخته شدند (ادرار ۲۴ساعته یا مایع بدن)، ولی موتور هنوز قاعدهٔ تأییدشده‌ای برای تفسیرشان ندارد، پس دربارهٔ آن‌ها حکمی نمی‌دهیم.
```

It is followed by the existing «مقادیرِ نشناخته: …» sentence, only if `unmapped` is non-empty, and the existing
`listShown` tail. The summary stays the P78 sentence unchanged.

`buildNormalResult` specimen branch (graded tests all normal, no findings, specimen non-empty):

```
summary: مقادیری که موتور می‌سنجد در محدودهٔ طبیعی‌اند، ولی چند مقدارِ این برگه تفسیر نشدند.
interpretation: هیچ‌کدام از مقادیری که موتور می‌سنجد خارج از محدودهٔ مرجع نیست. این مقادیرِ ادرار ۲۴ساعته یا مایع بدن شناخته شدند ولی موتور هنوز تفسیرشان نمی‌کند: {names}. دربارهٔ آن‌ها حکمی نمی‌دهیم؛ تفسیرشان با پزشک است.
```

If `noRef` is also non-empty, both sentences appear. The noRef branch's existing text is unchanged.

Forbidden in every string above, about a specimen row: «بالا», «پایین», «طبیعی است», «نرمال», any urgency phrase
(«امروز», «این هفته», «اورژانس»). The only «طبیعی» allowed is the existing P78 negation and the clause about the
*graded* values.

## 4. `server.js`

- Engine path: after the unmapped line, `ocrWarnings.push(specimenLine(engineOut.specimen))` when non-null.
- Fallback gate unchanged. In the uninterpreted path, `recognized = specimenLine(engineCandidateBeforeNull.specimen)`
  (captured before `engineCandidate = null`). It goes both to `buildUninterpretedResult` and to `ocrWarnings`.
- `_engine` is unchanged in Stage A (no `specimen` field, so the UI contract doesn't move).
