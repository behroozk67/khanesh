# Data Model: specs/020

There is no new storage and no new API field, apart from the optional `sexMismatch` on a row. The shapes below extend
the specs/019 shapes. See [contracts/engine-tests-tumor-rows-v2.md](contracts/engine-tests-tumor-rows-v2.md).

## Tumour-marker key set (`TM_KEYS`)

- **specs/019**: `CEA, CA125, CA153, CA199`.
- **specs/020**: adds `AFP, B2M, CALCITONIN, CGA, PSA_TOTAL, PSA_FREE, PSA_RATIO`.
- **Membership means four things**:
  - the printed range is read by `parseTmRange`/`tmVerdict` (strict `<`, labelled bands, `unreadable`);
  - the key gets a row in `_engine.tests`;
  - the key is excluded from the sheet score;
  - the expert view shows it through `tmDisplay`.

## `ungraded[key]` for a member key (unchanged shape)

`{ value, cmp, shown, unit, state, raw, reference, name?, reason: "assay_printed" }`

- `state` ∈ `above | below | within | between | noref | equiv`.
  - `between` only occurs with labelled smoker bands.
  - `equiv` only occurs from a borderline word.
  - The display layer maps `noref` + a printed reference to `unreadable`.

## Tumour-marker row (`_engine.tests[]` member)

The fields are the same as specs/019: `key, name, value, unit, range, refSource:"printed", abnormal (true|false|null),
dir, fa, level:null, ctcaeGrade:null, nearLimit:false, source:"tumor_marker_printed", verdict`.

- **New**: `sexMismatch?: true`. It is present only for `PSA_TOTAL`/`PSA_FREE`/`PSA_RATIO` when the engine's
  `context.sex` is female. **It never changes `abnormal`, `dir`, `fa` or `verdict`** (FR-007 as amended).
- **Validation**:
  - `abnormal === null` ⇔ `verdict ∈ {between, noref, unreadable}`. Every reader must treat `null` as "no verdict",
    never as "normal" (N46).
  - `name` always comes from `faName(key)`. The raw key never reaches text (Principle V).

## Score exemption

Exempt finding ids: `tumor_markers_result` and **`psa_result`**, each only when its `explains` is non-empty and every
explained key is in `TM_KEYS`.

## Register entry (P132, `MEDICAL_RULES.md` + `MEDICAL_RULES_TUMOR_MARKERS.md` §6)

| Field | Content |
|---|---|
| id | P132 |
| behaviour | the reader swap for the 7 keys; the score exemption for `psa_result`; the PSA-in-female sentence |
| patient impact | the R2 table: 2 boundary urgency flips, free-PSA verdict un-inverted, «چاپ نشده» → «خوانده نشد» |
| source | P122 / N46 rule on strictness; no chapter source is used for code |
| reviewer decisions needed | the boundary urgency flips; the PSA score exclusion; the wording of the mismatch sentence |
| chapter proposals | 40 rules × {needed input, verification state = "secondary, unverified"}; 7 source contradictions; R5 gap table |
