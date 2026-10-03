# Frontend Structure (`khanesh/src/`)

- `App.jsx` — **the "tool is the landing page" decision was reversed.** `Landing.jsx` is back and
  owns `/`; the tool moved to `/app` and `/tafsir`. Current table:

  | path | renders |
  |---|---|
  | `/`, `/landing` | `Landing` (lazy) |
  | `/app` | `AppEntry` — first unfinished step (specs/011) |
  | `/app/intake/:step` | name → sex → age → conditions (`onboarding/Intake.jsx`) |
  | `/app/start` | photo or manual (`onboarding/StartChoice.jsx`) |
  | `/app/:mode` | `Tafsir` — `photo` or `manual`; one route so the instance (and its data) survives a mode switch |
  | `/tafsir` | `Navigate` to `/app` |
  | `/tests`, `/tests/:cat`, `/test/:key` | the encyclopaedia: `Tests`, `CategoryPage`, `TestPage` (lazy) |
  | `*` | `Navigate` to `/` |

  ⚠️ **`/app`, `/tafsir` and `/profile` are wrapped in `AuthGuard`** (`khanesh/src/AuthGuard.jsx`),
  which an earlier version of this file did not mention at all. It renders a phone/OTP screen
  instead of the tool when the **server** says authentication is required — it reads
  `authRequired` from `GET /health` at runtime, not the build-time `VITE_AUTH_REQUIRED`, which is
  now only the initial value. See [environment.md](environment.md); the guard is a convenience,
  and the server's 401 is the actual enforcement (`analyzeJob.js` turns it into a real message and
  clears the dead token).

  Content routes are `lazy()` for size, not taste — 17 categories and 46 tests of Persian body text
  is several hundred KB, and a patient on mobile who just wants one number read shouldn't download
  it. `/` is not lazy.
  ⚠️ The catch-all only runs if the production server serves `index.html` for unknown paths
  (`try_files $uri /index.html`). Without that fallback a hard load of `/app` 404s before React
  boots — and `/app` is now the tool's real address, so this matters more than it used to.
  ⚠️ **Open product decision:** `Logo.jsx` still spells `LABMATE` in its SVG `textPath` while the app
  header says «خوانش». Both strings are exported as `BRAND_LATIN` / `BRAND_FA` — pick one before shipping.
  `LabMateLogo.jsx` (the wordmark `Landing` uses) imports `BRAND_FA` from `Logo.jsx`, so the two
  files are already coupled; don't add a third spelling.
- `Tafsir.jsx` is no longer one large component — it has been decomposed, and the pieces are where
  the interesting logic now lives. Both input paths still end at the analyze API:
  - **Manual entry** — the client-side `REF` object (its own copy of test metadata/ranges/categories,
    separate from the backend's `rules/`) **moved out of `Tafsir.jsx` into `labRefs.js`**, alongside
    `CATS`, `ALL`, `LOCAL_STATES`, `statusOf()`, `deltaOf()` and `comboInsights()`. `EntryGrid.jsx`
    renders the form; `LocalPreview.jsx` renders the engine-free preview (see N12 — that file is the
    only clinical text in the app with no engine, no `must_say`, and no test behind it).
  - **Photo upload** — `imageIntake.js` holds the intake and canvas compression (~400KB target,
    since mobile photos can be 8MB+) and the HEIC `<img>` decode fallback for iPhones, where
    `createImageBitmap` often fails. `UploadCard.jsx` is the UI.
  - **The request is asynchronous now.** `analyzeJob.js` starts a job (`POST /api/analyze/start`),
    polls (`GET /api/analyze/job/:id`), and keeps the job id in `localStorage` so a locked phone or a
    backgrounded tab no longer destroys a 90–150s analysis. The id never leaves the device; the
    server drops the job after ~30 minutes.
  - `ResultErrorBoundary.jsx` wraps the result screen so a malformed response degrades instead of
    white-screening.
  - Rendering reads `extracted_tests`, `_engine`, `has_critical`, `ocr_warnings`, `pages`, `sources` from the API response — the fields the backend safety-net guarantees will be present/correct even if the LLM's own JSON is malformed.

### `_engine` shape

`_engine` is attached **only on the engine path**. Its absence means the response came from the
legacy `USE_ENGINE=false` path, where the model judged severity itself — so any "these conclusions
come from deterministic rules" UI must be gated on `_engine` being present, or it states something
false.

```
_engine = {
  patterns: [rule_id, …],   // e.g. ["microcytic_anemia", "unmatched_abnormal"]
  urgency:  "emergency" | "soon" | "this_week" | "routine" | "none",   // soon = ۲۴ تا ۴۸ ساعت (2026-09-28، P56)
  abnormal: <number>,       // count only — kept for backward compat, prefer tests[]
  uncovered: [engine_key, …],   // keys no rule picked up — see the warning below
  suppressed: <number>,         // findings dropped from the full text under an emergency blocker (2026-09-29, P60)
  suppressed_ids: [rule_id, …], //   …which ones
  context: { sex, age_text, pregnant, conditions_applied: [{ id, fa }] },   // specs/011: what the engine *used*; render the
                                // «تفسیر بر پایهٔ …» line only from this. Inactive conditions never appear (FR-019)
  critical_banner: { title, body } | null,   // نوزادِ «فقط-به‌خاطرِ-کف» (2026-09-30): متنِ بنرِ بالای صفحه از rules/neonatal.js. null ⇒ بنرِ عمومیِ ResultView. has_critical دست نمی‌خورد
  supplementary: [rule_id, …],  //   …the subset shown as a compact «یافتهٔ تکمیلی» because it explained a number nothing else did
                                //   (absent on an older server — treat as empty; nothing in the UI reads these yet)
  indices:  { egfr, ca_measured, ca_corrected, … },   // derived values, NOT on the patient's sheet
  tests:    [ { key, name, value, range, refSource,
                abnormal, dir, fa, level, ctcaeGrade, nearLimit, source } ],

  // ── guideline layer (added 2026-07-27) ──
  guidelines:      [ { id, org, fa, title, year, url, substituted } ],
  preanalytical:   [ { text, sources } ],
  unitConversions: [ { test, name, raw, from, value, to, basis? } ]   // basis: specs/003
}
```

⚠️ **Corrected 2026-09-19: an earlier version of this file said all three are rendered by
`ResultView.jsx` (`GuidelineSources`, `Preanalytical`, `UnitConversions`). None of the three existed in
`khanesh/src`** — they were dropped around `763c73d` and the server kept sending the fields to nobody.
`UnitConversions` is back (specs/003, the «واحدها» card under the extracted numbers). It renders
`name`, what the sheet printed, the graded value, and one Persian sentence per `basis`:
`printed` (or absent, from an older server) / `reference` (the unit was decided from the lab's printed
reference range) / `magnitude` (only one unit is possible for that number — reviewer-gated, `P48`).
For `basis ≠ printed` it says the sheet printed the number **without** a unit; it must never write
«روی برگهٔ شما ۸۰ µmol/L» for a unit the sheet didn't print (N5). **`GuidelineSources` and
`Preanalytical` are still not rendered** — their constraints below describe what a renderer must do,
not what one does today.
Each field carries a constraint that is not obvious from its name:

- `guidelines` — the published sources behind the findings shown. **Render `substituted` whenever
  it is non-null.** It means the original body is paywalled (UpToDate, BMJ Best Practice, CLSI's own
  documents) and the number actually came from the named open equivalent; dropping it would claim a
  source the engine never read. This block is deliberately separate from, and above, the MedlinePlus
  "برای مطالعهٔ بیشتر" list — that one is explicitly *not* the basis of the conclusions, and merging
  the two erases the distinction.
- `uncovered` — the engine keys that no rule picked up, i.e. exactly the tests the
  `unexplained_abnormal` net names. **Decide the "no explanation" chip per key from this array,
  never from `patterns.includes("unmatched_abnormal")`.** That was a real bug (2026-09-17):
  `patterns` carries a *panel-wide* flag and `stateOf` applied it to every abnormal row, so an
  iron-deficiency patient with one unrelated high value saw «نیازمند بررسی» on the Hb and MCV rows
  that the same page had just explained with confidence. A signal that is true of the panel is
  false of an individual test. Absent on an older server response — treat that as an empty array,
  which marks nothing, rather than falling back to the panel flag. Guards `M100`, `M100b`.
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

**specs/011 — onboarding.** `ProfileCard.jsx` is gone. Sex/age/pregnancy/conditions come from
`onboarding/profileStore.js` (server `GET/PATCH /api/profile` when auth is on, `localStorage["azmayar_profile_v1"]`
when it is off — the server returns 409 `local_only` then, because every request is the same anonymous user).
`patientFromProfile()` is the only builder of `patient` and never includes the name. Conditions travel as ids
(`khanesh/src/conditions.js`, mirror of `khanesh-server/rules/conditions.js`); the frontend never decides which are
active. Manual urine rows go as strings with `kind: "urine"` (`URINE_FIELDS` in `labRefs.js`). Health checks use
`/api/health` — `/health` is not proxied (N27).

Keep `REF` (in `khanesh/src/labRefs.js` — client-side, manual-entry only) and
`khanesh-server/rules/` (server-side, authoritative) in sync when a test's range or label changes
— they are two separate copies by design, not a shared source of truth. Record any deliberate
divergence in `docs/reviews/REF_DIFF.md`.
