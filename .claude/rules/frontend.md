# Frontend Structure (`khanesh/src/`)

- `App.jsx` — the tool **is** the landing page: `/` renders `Tafsir.jsx`. `/app` and any unknown
  path `Navigate` to `/`, so old links keep working. The former marketing page (`Landing.jsx`) was
  deleted; only its circular SVG badge survives, in `Logo.jsx`.
  ⚠️ The redirect only runs if the production server serves `index.html` for unknown paths
  (`try_files $uri /index.html`). Without that fallback a hard load of `/app` 404s before React boots.
  ⚠️ **Open product decision:** `Logo.jsx` still spells `LABMATE` in its SVG `textPath` while the app
  header says «خوانش». Both strings are exported as `BRAND_LATIN` / `BRAND_FA` — pick one before shipping.
- `Tafsir.jsx` is a single large component with two independent input paths that both ultimately call `POST /api/analyze`:
  - **Manual entry** — a client-side `REF` object (its own copy of test metadata/ranges/categories, separate from the backend's `rules/`) drives a category-filtered form for typing in values directly.
  - **Photo upload** — client-side image compression (`compressImage()`, canvas-based, targets ~400KB per photo since mobile photos can be 8MB+) before sending as data URLs; HEIC decode fallback for iPhones via `<img>` since `createImageBitmap` often fails on HEIC.
  - Rendering reads `extracted_tests`, `_engine`, `has_critical`, `ocr_warnings`, `pages`, `sources` from the API response — the fields the backend safety-net guarantees will be present/correct even if the LLM's own JSON is malformed.

### `_engine` shape

`_engine` is attached **only on the engine path**. Its absence means the response came from the
legacy `USE_ENGINE=false` path, where the model judged severity itself — so any "these conclusions
come from deterministic rules" UI must be gated on `_engine` being present, or it states something
false.

```
_engine = {
  patterns: [rule_id, …],   // e.g. ["microcytic_anemia", "unmatched_abnormal"]
  urgency:  "emergency" | "this_week" | "routine" | "none",
  abnormal: <number>,       // count only — kept for backward compat, prefer tests[]
  indices:  { egfr, ca_measured, ca_corrected, … },   // derived values, NOT on the patient's sheet
  tests:    [ { key, name, value, range, refSource,
                abnormal, dir, fa, level, ctcaeGrade, nearLimit, source } ],

  // ── guideline layer (added 2026-07-27) ──
  guidelines:      [ { id, org, fa, title, year, url, substituted } ],
  preanalytical:   [ { text, sources } ],
  unitConversions: [ { test, name, raw, from, value, to } ]
}
```

All three are rendered by `ResultView.jsx` (`GuidelineSources`, `Preanalytical`, `UnitConversions`).
Each carries a constraint that is not obvious from the field name:

- `guidelines` — the published sources behind the findings shown. **Render `substituted` whenever
  it is non-null.** It means the original body is paywalled (UpToDate, BMJ Best Practice, CLSI's own
  documents) and the number actually came from the named open equivalent; dropping it would claim a
  source the engine never read. This block is deliberately separate from, and above, the MedlinePlus
  "برای مطالعهٔ بیشتر" list — that one is explicitly *not* the basis of the conclusions, and merging
  the two erases the distinction.
- `preanalytical` — CLSI sample-quality caveats whose target finding wasn't shown. Advisory text
  only; they never carry urgency, so never style them as a warning banner.
- `unitConversions` — every SI→conventional conversion the adapter applied. `raw`/`from` is what the
  sheet printed, `value`/`to` is what the engine graded. A patient whose sheet says `48 mmol/mol`
  and whose result says `6.54%` needs this row, or the two numbers look like a mistake — so it
  renders directly under the extracted-numbers box, where that comparison happens.
  ⚠️ **Render `name`, never `test`.** `test` is the raw engine key (`HBA1C`, `CREAT`); `name` is the
  `faName()`-resolved label the server attaches. This was a real slip caught in review — the N8
  class. Test `G7` asserts every key `units.js` can convert exists in `FA_NAMES`.

`tests[]` is the per-test verdict, serialized from `engineOut.graded` by `serializeGraded()` in
`server.js`. Two things about it:

- **`name` is already `faName()`-resolved and `fa` is already a Persian worded status** («بالاتر از
  حد طبیعی», «طبیعی (نزدیک حد پایین)»). Render them; don't re-derive a status client-side, and never
  fall back to `key` in user-facing text.
- **`value` for `CA` and `NA` may be the *corrected* value**, which is not printed on the patient's
  sheet. Use `indices.ca_measured` / `indices.na_measured` for an "as printed on your sheet" column.

Test grouping by body system is presentation data and lives in `khanesh/src/testCategories.js`,
keyed by engine key — deliberately not in `rules/refs.js`, whose only job is clinical ranges.

Keep `REF` (client-side, manual-entry only) and `khanesh-server/rules/` (server-side, authoritative) in sync when a test's range or label changes — they are two separate copies by design, not a shared source of truth.
