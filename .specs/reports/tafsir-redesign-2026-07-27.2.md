# Judge 2 of 3 — Khanesh `/` (Tafsir) redesign evaluation

Spec: `.specs/reports/eval-spec.yaml` (khanesh-tafsir-redesign-eval-v1). Baseline: `khanesh-project/khanesh/`.
Judge run: 2026-07-28. Written incrementally.

## 0. Baseline calibration note (important)

The live working tree's `ResultView.jsx` is **591 lines** and contains `UnitConversions`,
`Preanalytical`, `GuidelineSources`. The spec's `read_baseline_before_reading_any_solution`
declares `ResultView.jsx (465 lines)` and `code-recon.md §1` enumerates its sub-components as
`Chip:26, TestRow:46, CategoryGroup:65, UnmatchedNote:94, DerivedValues:143, ExtractedTests:180,
Provenance:209` — **no guideline-layer components**. Worktree `wt-a` HEAD~1 carries a 466-line
`ResultView.jsx`. The three generators were therefore seeded with the pre-guideline-layer
baseline.

**Consequence:** none of A/B/C renders `_engine.unitConversions`, `.preanalytical`, or
`.guidelines` (verified: `grep -rn "unitConversions\|preanalytical\|guidelines" src/` returns
zero hits in all three worktrees). This is **not** scored as a regression against any of them,
because it was not in the baseline they received. It is flagged here for the orchestrator: all
three will need that block re-attached before merging onto the live working tree.

## 1. Commands actually run (spec §0 `commands_you_must_actually_run`)

`node_modules` was junctioned; no install needed. oxlint in this repo prints nothing on a clean
run — exit code is the signal.

```
# BASELINE  c:/Users/surface/Desktop/khanesh-project/khanesh
dist/index.html                   0.76 kB │ gzip:  0.49 kB
dist/assets/index-4QjXU0RW.css    1.10 kB │ gzip:  0.62 kB
dist/assets/index-FM9zly-U.js   304.46 kB │ gzip: 95.82 kB
✓ built in 699ms

# SOLUTION A  wt-a/khanesh
> khanesh@0.0.0 lint
> oxlint
EXIT=0
> khanesh@0.0.0 build
> vite build
vite v8.1.4 building client environment for production...
transforming...✓ 46 modules transformed.
dist/index.html                   0.76 kB │ gzip:  0.49 kB
dist/assets/index-CCJX9tFJ.css   18.13 kB │ gzip:  4.49 kB
dist/assets/index-rrjWSP7t.js   302.54 kB │ gzip: 95.10 kB
✓ built in 961ms
BUILD_EXIT=0

# SOLUTION B  wt-b/khanesh
LINT_B_EXIT=0
> khanesh@0.0.0 build
> vite build
vite v8.1.4 building client environment for production...
transforming...✓ 31 modules transformed.
dist/index.html                   0.76 kB │ gzip:  0.49 kB
dist/assets/index-Bv_J5Tpt.css   23.77 kB │ gzip:  4.89 kB
dist/assets/index-CQ-hG44C.js   298.19 kB │ gzip: 94.12 kB
✓ built in 599ms
BUILD_B_EXIT=0

# SOLUTION C  wt-c/khanesh
LINT_C_EXIT=0
> khanesh@0.0.0 build
> vite build
vite v8.1.4 building client environment for production...
transforming...✓ 42 modules transformed.
dist/index.html                   0.76 kB │ gzip:  0.49 kB
dist/assets/index-BSut-bFQ.css   23.25 kB │ gzip:  5.19 kB
dist/assets/index-BWAhfqC9.js   309.99 kB │ gzip: 96.19 kB
✓ built in 409ms
BUILD_C_EXIT=0
```

All three: lint exit 0, build exit 0, `dist/` produced. JS gzip deltas vs baseline (95.82 kB):
A −0.72 kB, B −1.70 kB, C +0.37 kB. CSS gzip grew in all three (0.62 → 4.49 / 4.89 / 5.19 kB)
because all three moved styles out of the inline `s`/`S` JS objects and into real stylesheets —
that is the intended trade, and the JS side shrank correspondingly.

## 2. File inventory (baseline vs solutions)

| | baseline | A | B | C |
|---|---|---|---|---|
| Tafsir.jsx | 1262 | **416** | **1382** | **526** |
| ResultView.jsx | 465(seed) | 473 | 451 | 492 |
| resultStates.js | 92 | 157 | 165 | 143 |
| CSS files | index.css 94 | index.css 178 + ui.css 515 | index.css 23 + tokens 128 + base 137 + components 962 | index.css 171 + ui.css 601 |
| new components | — | 12 | 1 (Segmented) | 8 |
| src/ files total | 13 | 29 | 16 | 24 |

B is the only solution whose main component **grew** (1262 → 1382).

## 3. Automatic disqualifier sweep (criterion-blind, run first)

### DQ1 — emergency hidden/collapsed/clamped
- **A: clear.** `wt-a/src/ResultView.jsx:162-175` — `SystemSection` renders a plain
  `<section>` when `hasOut` (`rows.some(t => t.abnormal)`) and only falls to
  `<details className="group group--collapsible">` when every row is in range. An emergency row
  is by definition `abnormal`, so it can never sit inside the `<details>`. Crit banner at
  `:339-348` is the first child of `.result` with `role="alert"`.
- **B: clear.** No collapsible group at all — `CategoryGroup` (`wt-b/src/ResultView.jsx:91-118`)
  is an always-open `<div>`. The only `<details>` in the file is `Provenance` (`:243`), which
  carries no clinical verdict. Band at `:335-346`, `role="alert"` gated to
  `band.key === "emergency"` (`:341`).
- **C: clear, and strongest.** `wt-c/src/ResultView.jsx:79` `const locked =
  verdicts.some(isEmergencyVerdict)` — a group holding an emergency verdict renders a static
  `<div className="k-group-head k-group-static">` with **no toggle control at all** (`:92-96`),
  so the user cannot collapse it even deliberately. `:83` `const isOpen = locked || open`.
  OCR/`pages.failed` warnings are unconditional divs (`:405-418`). Comment at `:18-22` states
  the rule.
- grep for `-webkit-line-clamp` across all three worktrees: **0 hits**. grep for `maxHeight`
  wrapping clinical text: 0 hits.

### DQ2 — raw engine key in visible text
- **All three: clear, and all three hardened it beyond baseline.** Every `t.key` occurrence is a
  React `key=` prop or a CSS class/anchor id, never a text child:
  A `ResultView.jsx:154,196,427`, `Scorecard.jsx:40,59,135`; B `ResultView.jsx:115,138`;
  C `ResultView.jsx:112,137`.
- All three added the same defensive filter the baseline lacked — a row with no `name` is
  dropped rather than falling back to the key: A `:316-318`, B `:307-309`, C `:325-326`.

### DQ3 — contrast < 4.5:1 on clinical text
Computed in §Criterion C3 below. **No solution fires it** on the pairs I computed; the worst
pair found is B's `--k-text-dim` on `--k-surface-sunken` at 4.79:1 (pass). Full arithmetic in C3.

### DQ4 — a missing test rendered as normal
- **All three: clear.** All three keep a distinct `missing` state with an action colour and a
  literal Persian label «روی برگه نیست», and all three keep the `!t → missing` branch ahead of
  the `!t.abnormal → normal` branch: A `resultStates.js:110-112`, B `resultStates.js:84-87`,
  C `resultStates.js:108-109`. No two-way `!abnormal` collapse found in any of them.
  (In practice the state is currently unreachable, exactly as in baseline, because
  `_engine.tests` only contains measured tests — that is inherited, not introduced.)

### DQ5 — derived value shown as if printed on the sheet
- **All three: clear.** All three keep `DerivedValues` with the verbatim Persian framing
  «این عددها روی برگهٔ آزمایشگاه نیستند — ما آن‌ها را از روی مقادیر خودتان حساب کرده‌ایم.»
  (A `:239`, B `:182`, C `:181`) and all three keep `MEASURED_OF` pairing `ca_corrected` /
  `na_corrected` with `ca_measured` / `na_measured` (A `:226`, B `:169`, C `:168`).
- **A additionally closes the gap the baseline left**: `wt-a/src/ResultView.jsx:73-81`
  `MeasuredNote` puts «روی برگهٔ شما: <measured> — عددِ بالا با آلبومینِ شما تصحیح شده.»
  **inside the CA/NA test row itself**, gated on `indices.ca_correction_applied`. B and C
  inherit the baseline behaviour where the row shows the corrected `t.value` and the measured
  number only appears further down the page. Not a DQ (the pairing exists), but a real C1
  differentiator.

### DQ6 — clinical judgment moved into / newly expanded in the frontend
- **A: clear, with one item examined closely.** `Scorecard.jsx` is a count, not a score: the
  ring's centre prints `toFaDigits(out)` — the number of out-of-range tests — and
  `ringPct` (`:83`) is `out/total`, never rendered as text. No health score, no 0–100 gauge, no
  biological age. `buildVerdictContext` (`resultStates.js:86-102`) decides *which* rows inside an
  already-emergency panel carry the red chip, using only engine-supplied `t.level` /
  `t.ctcaeGrade`, and falls back to marking **all** abnormal rows when no row is graded severe
  (`:98`). No value-vs-range comparison anywhere. `RangeBand`/`rangeMath` compute marker
  *position* only; the colour comes from `state.cls` passed in (`ResultView.jsx:107`) — this is
  the C1.1 allowance, not DQ6.
- **B: clear.** `stateOf` (`resultStates.js:84-100`) maps `t.level`/`t.ctcaeGrade` only.
  `evidenceOf` (`:147-159`) reads `t.source` — an engine field — and labels which of the engine's
  three grading modes was used; it invents no number.
- **C: clear.** `engineTier` (`resultStates.js:80-86`) reads `level`/`ctcaeGrade` only, and
  `verdictOf` (`:114`) only steps *down* from emergency when the engine explicitly said
  `mild`/`moderate` — an ungraded test in an emergency panel stays emergency.
- Pre-existing manual-entry preview (`REF`/`statusOf`/`comboInsights`) retained by all three
  (A `LocalPreview.jsx`+`labRefs.js`, B inline in `Tafsir.jsx`, C `LocalReview.jsx`+`labRef.js`)
  — per spec C1.4 this is not scored down. None of the three routes engine-response data through
  it; verified by checking that each local block reads only `vals`/`REF`, never `result._engine`.

### DQ7 — non-Persian user-facing copy / fabricated clinical content
- **All three: clear.** `grep -rnE '(placeholder|aria-label|alt|title)="[A-Za-z ]{3,}"' src/`
  returns **0 hits** in all three. No hard-coded demo result reachable by a user in any of them.

### DQ8 — "deterministic rules" claim on the legacy path
- **All three: clear.** All three keep `Provenance({ hasEngine })` with the two-branch text
  (A `:267-303`, B `:241-292`, C `:240-275`), and the legacy branch says the rules were **not**
  applied.
- **A goes further**: the whole Scorecard is gated `{hasEngine && ...}` (`:352`), so the
  count/ring never appears on the legacy path.
- **C goes furthest**: `:396-402` adds a standing `k-notice` on the legacy path («قاعده‌های
  بالینی روی این نتیجه اجرا نشده») outside the `<details>`, and `:374-379` adds a sentence
  *inside the emergency banner itself* saying that on the legacy path the warning is the model's
  judgment, not the engine's. That is a new, correct safety property no other solution has.

### DQ9 — privacy over-claim
- **All three: clear.** No new copy claiming the photo stays on device.
  A `imageIntake.js:55` carries the *correct* caveat («این تابع فقط اندازه را کم می‌کند. برش یا
  سانسور …»). A `LocalPreview.jsx:55` says «روی دستگاه خودتان انجام…» — but that sentence is
  about the **manual-entry local preview**, which genuinely is computed on-device before any
  server call. It makes no claim about the uploaded photo. Not a fire.

### DQ10 — iOS zoom trap / zoom suppression
- **All three: clear.** All three `index.html:7` read
  `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
  — no `user-scalable=no`, no `maximum-scale`. All three keep the 16px floor:
  A `src/index.css:135` `input, select, textarea, button { font-size: 16px }`,
  C `src/index.css:130` same, B `src/styles/base.css` (verified, see C2).

### DISQUALIFIER RESULT

```
DISQUALIFIERS: Solution A — none
DISQUALIFIERS: Solution B — none
DISQUALIFIERS: Solution C — none
```

No solution is capped. All scores below are the honest weighted sums.
