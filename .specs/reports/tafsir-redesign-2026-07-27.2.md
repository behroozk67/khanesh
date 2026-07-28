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

---

# 4. Criterion-by-criterion (scored ACROSS all three at once, per protocol step 4)

## C1 — Patient safety & clinical integrity (weight 26) · A 4.5 · B 4.0 · C 4.5

**Shared: all three fix the same, correct, highest-value defect.** code-recon's closing line names
it — the backend serializes `fa`/`level`/`ctcaeGrade`/`nearLimit` per test and the baseline client
throws all four away in favour of one panel-wide `urgency` label. All three now read those fields,
and none of them ever compares a value to a range:
A `resultStates.js:110-117` + `:86-102`, B `resultStates.js:84-100`, C `resultStates.js:80-122`.
All three also added the same hardening the baseline lacked — a row whose `name` is missing is
dropped rather than falling back to the key (A `:316-318`, B `:307-309`, C `:325-326`) — and all
three put `role="alert"` on the emergency banner, which in baseline was a bare `<div>` no screen
reader announced (A `:340`, B `:341`, C `:363`).

**A — 4.5.** Unique win: `MeasuredNote` (`ResultView.jsx:73-81`) renders
«روی برگهٔ شما: <measured> — عددِ بالا با آلبومینِ شما تصحیح شده.» **inside the CA/NA row itself**,
gated on `indices.ca_correction_applied`. This closes the one N5 gap the baseline left open — the
row shows the corrected `t.value` while the measured number was only visible in a separate block
further down the page. Neither B nor C does this. C1.2 handled correctly: `rangeMath.js:19-28`
returns `null` for qualitative («مثبت») and titre («1/320») strings so the band simply doesn't
render, while `TestRow:95-102` still prints the value and range — the row is never dropped.
Scorecard gated `{hasEngine && ...}` (`:352`). Explicit anti-softening sentence at `:411-416`:
«فوریتِ بالای صفحه برای کلِ برگه است و با واژهٔ هیچ ردیفی لغو نمی‌شود.»
Cost: `buildVerdictContext` narrows the red chip to severe rows inside an emergency panel — the
fallback at `:98` marks *all* abnormal rows when no row is graded severe, so it errs toward
over-marking, which is the right direction; and the confirmation block now sits below the
Scorecard (scored under C5, not here).

**B — 4.0.** Structurally the most conservative on DQ1 (nothing in the result is collapsible at
all) and the row mapping is a clean 1:1 from engine severity. But `stateOf` **drops `urgency` from
the row entirely** (`resultStates.js:81-84`, by design), so in an emergency panel an ungraded
binary test — D-dimer is the engine's own example — renders as plain `out_of_range`
«خارج از محدوده» with nothing tying it to the emergency above. C's `verdictOf:114` and A's
`buildVerdictContext:98` both deliberately keep ungraded rows at emergency for exactly this
reason; B is the only one that doesn't, and the comment at `resultStates.js:31-32` shows this was
a conscious choice rather than an oversight. B compensates with a legend and the top band, which
is why this is 4.0 and not lower. No inline measured-value note.

**C — 4.5.** Three unique safety mechanisms, all at the highest-stakes surface:

1. `ResultView.jsx:79,92-96` — a group holding an emergency verdict gets **no toggle control at
   all** (a static `<div>`, not a default-open button). A's equivalent is also structural, so this
   is parity rather than an edge — but C states the stricter rule («حتی با کلیکِ خودِ کاربر»).
2. `ResultView.jsx:374-379` — inside the emergency banner, on the legacy path, C adds
   «این هشدار را مدل زبانی نوشته و قاعده‌های بالینی ما روی آن اجرا نشده. جدی بگیریدش، ولی حتماً با
   پزشک بررسی کنید.» plus a standing notice at `:396-402`. This is DQ8 reasoning extended to the
   one banner where `has_critical` may be the model's own judgment. Nobody else does it.
3. `Tafsir.jsx:341-352` — C is the only solution that noticed the baseline can put **two verdicts
   for one number on screen at once** (local `REF` preview + engine result) and resolved it. The
   resolution is the safe one: `hideLocalForTidiness = engineOnScreen && !localForced &&
   criticalCount === 0` — the local block is suppressed for tidiness **only when it holds no
   critical claim**, with the reasoning written out («پنهان‌کردنِ یک هشدارِ «همین امروز» برای
   مرتب‌بودنِ صفحه، دقیقاً همان کم‌خوانیِ خاموشی است که بدترین حالتِ شکستِ این پروژه است»).
   Also adds `<a href="tel:115">تماس با ۱۱۵</a>` in the banner (`:381`).

Cost: no inline measured-value note (baseline parity).

Tie-break applied (C1: fewer removed safeguards, then most unavoidable emergency path): neither A
nor C removes a baseline safeguard; A hardens the derived-value surface, C hardens the emergency
surface. Equal at 4.5. Neither reaches 5.0 — A misses nothing on the checklist but reorders the
confirmation step; C leaves the corrected-value-in-row gap that A closed.

## C2 — Persian / RTL correctness (weight 14) · A 4.5 · B 4.5 · C 4.5

Equal, and deliberately so (spec: "identical scores on a criterion are an acceptable, honest
outcome"). Verified for all three:

- `index.html:7` viewport unchanged, `lang="fa" dir="rtl"` intact, Vazirmatn `rel="preload"` at
  `:9-12`, and `Vazirmatn-VF.woff2` **present in `dist/fonts/`** after my build in all three.
- Every value input is `type="text"` + `inputMode` with `normalizeDigits` in `onChange`:
  A `EntryGrid.jsx:94-97,108-111` and `ProfileCard.jsx:30-33`; B `Tafsir.jsx:824-826,958-960,971`;
  C `ManualEntry.jsx:43-49,60-67` and `ProfileCard.jsx:48-52`. All three carry the Persian comment
  explaining why `type="number"` destroys non-Latin digits at DOM level.
- `.num/.unit/.range { unicode-bidi: isolate; direction: ltr; tabular-nums }` retained by all three.
- Physical `margin-/padding-left|right` in changed CSS: **A 0, C 0, B 2**. B's two
  (`components.css:17-18`) are `padding-left/right: calc(var(--page-pad-i) + var(--safe-l|r))`,
  with a comment explaining that notch and home-bar insets are device properties and correctly do
  *not* mirror under `dir="rtl"`. That is the right call, not a seam.

Per-solution distinctives, each real:

- **A** is the only one that adds a *new numeric surface* to the engine result (`RangeBand.jsx`)
  and therefore the only one that had to solve bidi for it. `RangeBand.jsx:5-8` documents an actual
  baseline bug it fixes — the old manual-entry gauge was built with physical `left` and mirrored
  inside `dir="rtl"` while its low/high labels printed LTR underneath. The replacement uses
  `inset-inline-start`, refuses `translateX(-50%)` (direction-sensitive), and wraps both scale
  endpoints in `.num`. C2's tie-break says breadth of bidi coverage wins — A covers most surfaces.
- **B** made the sharpest Persian-typography catch of the three (`ResultView.jsx:100-102`): the
  separator in «۰ طبیعی · ۱ خارج از محدوده» abutted the Persian digits and the pair read as «۱۰»
  on screen. Fixed by giving each count its own `<span>` and spacing with flex, not text.
- **C** documents the two-numeral-system policy at the page-number warning
  (`ResultView.jsx:408-411`): counts inside Persian sentences in Persian digits, lab values Latin.

Register: all three normalised toward the formal «کنید» form; I found no «وارد کن»/«آپلود کن»
survivals in any of the three. Three quoted strings judged idiomatic, not translated word order:
A «حالتِ هر ردیف از حکمِ خودِ موتور برای همان آزمایش می‌آید، نه از فوریتِ کلِ برگه.»;
B «چیزی که پیدا شد فوریتِ امشب ندارد، ولی نباید ماه‌ها بماند.»;
C «یک تونل یا آسانسور، تحلیلِ شکست‌خورده نیست.»

## C3 — Accessibility (WCAG 2.2 AA) (weight 14) · A 4.5 · B 3.5 · C 4.0

**Computed ratios** (WCAG relative luminance, `(L1+0.05)/(L2+0.05)`; computed in node, four worst
shown longhand):

| pair | fg | bg | computed | claimed in code | verdict |
|---|---|---|---|---|---|
| baseline/B/C `--st-missing` | #6b7280 | #f1f3f5 | **4.35** | «۴.۸:۱» | below AA, claim wrong |
| A `--st-missing` (replaced) | #4a5568 | #eef1f4 | **6.64** | 6.7:1 | pass, accurate |
| B `--text-03` on card | #667085 | #ffffff | **4.97** | 5.0:1 | pass, accurate |
| C `--text-faint` on `--sunken` | #6f685b | #f5f0e6 | **4.86** | 5.6 «روی کرم» | pass, claim off |
| A `--ink-3` on `--page` | #6f685b | #faf7f0 | **5.16** | 5.2:1 | pass, accurate |
| A `--st-out` | #7a4408 | #fff3e5 | **7.23** | 7.2:1 | pass, accurate |
| B/C `--st-emergency` | #b3261e | #fdecea | **5.72** | «۶.۵:۱» | pass, claim off |
| B/C `--st-week` | #8a5300 | #fdf3e2 | **5.76** | «۶.۳:۱» | pass, claim off |
| B/C `--st-routine` | #0f6e6e | #e6f4f3 | **5.35** | «۶.۰:۱» | pass, claim off |
| B/C `--st-unmatched` | #55508c | #eeeef8 | **6.26** | «۷.۲:۱» | pass, claim off |
| A white on `--st-emergency-bg` | #ffffff | #b3261e | **6.54** | 6.6:1 | pass, accurate |
| B `--text-02` on `--fill-03` | #4a5563 | #f5f1e7 | **6.72** | — | pass |

Longhand for the worst four — `L = 0.2126R + 0.7152G + 0.0722B` on linearised channels:

- `#6b7280` → L=0.1795; `#f1f3f5` → L=0.8887. (0.8887+0.05)/(0.1795+0.05) = **4.35**
- `#4a5568` → L=0.0929; `#eef1f4` → L=0.8676. (0.8676+0.05)/(0.0929+0.05) = **6.64**
- `#667085` → L=0.1683; `#ffffff` → L=1.0000. (1.0500)/(0.2183) = **4.97**
- `#6f685b` → L=0.1642; `#f5f0e6` → L=0.8484. (0.8984)/(0.2142) = **4.86**

**A — 4.5.** The only solution that *recomputed* rather than copied. `index.css:66-72` names the
failure it removed: «(جفتِ قبلی #6b7280 روی #f1f3f5 برابر ۴.۴:۱ بود — مردود.)» — my independent
computation is 4.35, so A's number is right and the replacement pair genuinely passes at 6.64. A
also names and removes two further baseline failures carried in the old inline `s` object
(`#8a8272` 3.8:1 and `#a39a88` 2.8:1 on range/unit/footer text, `index.css:40-44`). Every A ratio
I computed matches A's stated value to ±0.1. Plus: `:focus-visible` (`index.css:146`),
reduced-motion in **both** directions (`:168` no-preference / `:172` reduce), 4 tap-target rules
≥44px, the dropzone converted from `div role="button"` to a native `<label htmlFor>` over a
focusable-but-hidden input (`UploadCard.jsx:12-15`), `role="status" aria-live="polite"` on the
progress box (`:175`), and focus moved to the result (`Tafsir.jsx:56,103`). Deduction: that live
region is inside the progress box, which **unmounts** when the result arrives — the exact
3.0-rubric defect ("attached to a node that unmounts"). The compensating focus move is why this is
still 4.5.

**B — 3.5.** B owns the one checklist item A and C both miss: a **stable, always-in-DOM** live
region, `Tafsir.jsx:812` `<div className="k-sr" role="status" aria-live="polite">{liveMsg}</div>`,
with `liveMsg` at `:792-800` covering loading → error → «تفسیر آماده شد.». Also the broadest focus
rule (`base.css:90` `:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible`
— `summary` included, which A and C omit), a `--tap: 44px` token, and reduced-motion. What holds
it at 3.5 is C3.2 applied literally: `tokens.css` states as its own rule #4 that
«نسبتِ کنتراستِ اندازه‌گیری‌شده کنارِ هر توکنِ متنی نوشته شده» — and **six of six `--st-*` ratios in
that new file are overstated**, by 0.45 to 0.94, including one (`--st-missing`, claimed ۴.۸,
actual 4.35) that is below AA. Per bias warning B2 a wrong claim in fresh code is itself a negative
signal. No DQ3 fires, because `.k-status--missing` (`components.css:781`) is unreachable — B's own
`ResultView.jsx:308` filter means `stateOf` is never called with a falsy `t` — but that is luck,
not verification. B also carries the tightest reachable margin of the three (`--text-03` at 4.97).

**C — 4.0.** All *reachable* pairs pass. Two things nobody else has: `index.css:146`
`@supports not selector(:focus-visible)` so older browsers still get a ring, and `ui.css:252`
`.k-emergency :focus-visible { outline-color: #fff; }` — a white ring specifically for controls
inside the red emergency banner, where the default dark ring would vanish. Most tap-target rules
of the three (7). `role="progressbar"` with `aria-valuemin/max/now/valuetext` and a Persian
`aria-label` (`AnalyzePanel.jsx:47-56`). Focus + scroll to the result heading with
`prefers-reduced-motion` consulted before choosing `smooth` vs `auto` (`Tafsir.jsx:115-122`);
`ResultView.jsx:350` provides the `tabIndex={-1}` target. Deduction: the same unmounting live
region as A, and it carried the baseline's inaccurate `--st-*` ratio comments forward into a
rewritten block, plus one new inaccurate claim (`--text-faint` «5.6:1 روی کرم», actual 5.16).

## C4 — Visual design quality & design-system coherence (weight 16) · A 3.5 · B 4.5 · C 3.5

Measured, not eyeballed — hard-coded values remaining in each solution's own changed files:

| | hex literals in JSX | inline `style={{` | literal `px` font-sizes in CSS | spacing scale | type scale |
|---|---:|---:|---:|---|---|
| A | 6 (all inside comments) | 4 | **68** | ✗ (only `--gutter`) | ✗ |
| B | 1 (inside a comment) | 3 | **1** | ✓ `--s1..--s10` | ✓ `--t-display..--t-micro`, 9 steps |
| C | 6 (all inside comments) | **30** | **84** | ✓ `--sp-1..--sp-8` | ✗ |

**B — 4.5, and it wins this criterion clearly.** `styles/tokens.css` is the only complete system of
the three: `--fill-01..06`, `--text-01..05`, `--stroke-01..06`, `--st-*`, `--s1..s10`,
`--r1..r5/--r-pill`, `--e1..e3`, a **bounded 9-step type scale** with the px equivalent written
beside each step, `--lh-tight/body/prose`, `--w-*`, `--ease-*`/`--dur-*`, `--tap`, and
`--safe-b/l/r`. Its stated rule — "no hex outside this file" — I checked and it **holds**: the only
hex strings elsewhere are inside Persian explanatory comments (`components.css:775,777,886,917`,
`Tafsir.jsx:365`). Its claim of "exactly three `style={}` sites remain, all passing *data* as CSS
custom properties" also holds (3 found). One literal font-size in ~1100 lines of CSS is the number
that separates a real type system from a themed one. The restraint is right: `--e1..e3` are all
under 12px blur, no gradients behind data, no animation in front of a number. C4's tie-break —
"prefer coherence over ambition; given a systematic solution and a more striking but seam-ridden
one, the systematic one wins — consistency IS the aesthetic" — points here without ambiguity.

**A — 3.5.** `ui.css` (515) + `index.css` (178) are clean, and the palette work is the
best-reasoned of the three (a documented single status palette, red genuinely reserved — A moved
the delete button off red, `resultStates.js:9`). But there is **no spacing scale and no type
scale**: 68 literal font-sizes, including `10.5px` (`ui.css:332` `.ring-label`) and per-site values
like `11px`/`13.5px`. That is precisely the 3.0 anchor ("colour tokens exist while
spacing/radius/shadow/type remain ad-hoc"). The Scorecard ring is the most striking element in any
of the three and I applied C4.1 and B3 to it deliberately: it is a `conic-gradient` with **no
animation** (verified `ui.css:314-319` — A's claim that it "renders statically" is true), it prints
a count and never a percentage, and it mirrors correctly (`transform: scaleX(-1)` on the ring with
a counter-rotated hole). It earns its place rather than costing clarity. It just does not
compensate for the missing scales.

**C — 3.5.** Warm `--page` + card system, responsive `--gutter` at two breakpoints, a real spacing
scale — but 84 literal font-sizes (`13.5px`, `12.5px`, `11.5px`, `13px` …) and, more damaging,
**30 inline `style={{...}}` sites** remaining, mostly `marginTop`/`marginBottom` spacing patches
scattered through `AnalyzePanel.jsx`, `LocalReview.jsx` and `ManualEntry.jsx`. C's own pitch is
"styling moved into a medium that can express `:focus-visible` and `@media`" — it achieved that for
appearance but left the spacing rhythm half-migrated, which is a visible seam and the exact C6
checklist item "style definitions consolidated, not merely relocated."

No solution imported a marketing pattern: I grepped all three for pricing / membership / referral /
testimonial / streak / badge / gamified-score constructs and found none. The light-mode lock
(`color-scheme: light`) is retained by all three.

## C5 — Information architecture & UX (weight 16) · A 4.0 · B 3.0 · C 4.5

The criterion's own tie-break is decisive here: *"Prefer the one that designed MORE of the real
states (degraded connection, resumed job, partial OCR, legacy no-`_engine`, qualitative results)
over the one with a slicker happy path. Edge states are where patients get hurt."*

**The single hardest fact I found:** `analyzeJob.js` emits `onProgress?.({ degraded: true })` on a
transient network failure (line 101 in B and C, 104 in A) — identical in all three, inherited.
Counting JSX references to `degraded`:

```
A: 0    B: 0    C: 3
```

**C is the only solution that renders the weak-connection state at all.** In A and B, a patient in
a tunnel sees a progress box that simply stops updating, indistinguishable from a hang. C shows
`AnalyzePanel.jsx:68-75`: «اتصال ضعیف است — تحلیل روی سرور ادامه دارد؛ فقط ما نمی‌توانیم مرتب خبر
بگیریم. یک تونل یا آسانسور، تحلیلِ شکست‌خورده نیست.»

**C — 4.5.** `AnalyzePanel.jsx` enumerates and implements the state machine in its header comment
(S5 analysing / S5b degraded / S5c auto-reattached to an unfinished job / S6 resume offer / S9
error): auto-resume gets its own explanatory sentence (`:36-40`) because otherwise the page appears
to be analysing with no user action; the resume "delete" now has a confirmation step (`:113-125`)
where the baseline destroyed the stored result on one click; `ParseErrorView.jsx` is a designed S8;
`EmptyResult` (`:165-181`) is a state that **did not exist before**, with distinct copy for
ready vs not-ready; a sticky mobile CTA appears only once the primary button scrolls out of view
(`Tafsir.jsx:126-136`, IntersectionObserver with `io.disconnect()` cleanup). Progress is stepwise —
one segment per real page plus one interpretation step — explicitly refusing a fake percentage
(`AnalyzePanel.jsx:11-14`). Action-first ordering (banner → ActionCard → warnings → confirm →
summary → rows) answers "what do I do" before "what is X", which is the C5 5.0 phrasing. What holds
it off 5.0: **no range visualisation** — «عددِ من کجای بازه ایستاده؟» is answered by text only.

**A — 4.0.** The only genuine three-level IA: `Scorecard` (`ResultView.jsx:352`) → `SystemCard`
anchored to `#sys-{cat}` (`Scorecard.jsx:40`) → `SystemSection` carrying `tabIndex={-1}` as the
anchor target (`ResultView.jsx:164,171`) → `TestRow`. And the only range visualisation on the
engine result, which is the other half of the C5 5.0 anchor, degrading exactly as required for
open-ended, qualitative and titre values (`rangeMath.js:19-28`; the row still renders with its
number). Against it: zero `degraded` rendering; and C5.1 — the "did we read your numbers right?"
block is demoted below the Scorecard. A did not delete it and did not move it after the
interpretation, and it mitigates with an in-scorecard sentence plus a `#numbers-check` anchor
(`Scorecard.jsx:123-129`), which is why this is a deduction rather than a serious regression.
Fewer designed states than C: no empty state, no degraded state, resume without confirmation.

**B — 3.0.** Closest to the baseline IA: no summary layer, no scorecard, no range visual on the
result — the reading path is band → confirm → summary → interpretation → flat group list, i.e. the
"workable summary → body-system → biomarker path exists but ... several states are inherited
unchanged from baseline" 3.0 anchor almost verbatim. It does add a state legend limited to the
states actually present in the panel (`ResultView.jsx:406-408`), which is a nice restraint. And it
has one genuinely unique IA fix nobody else made: `Tafsir.jsx:788`
`typedIgnored = images.length > 0 && rows.length > 0`, rendered at `:1265-1272` — code-recon §1
flags that when a user has both photos and typed values **the typed values are silently
discarded**; B is the only solution that tells the patient so, and tells them how to change it.
That is worth real credit, and it is why B lands at 3.0 rather than lower.

No horizontal scroll at 375px in any of the three by inspection of the grid rules (all use
`minmax(min(100%, Npx), 1fr)` or flex-wrap). I did not run a browser, so this is code-derived.

## C6 — Code quality & maintainability (weight 8) · A 4.5 · B 3.0 · C 4.0

Shared and correct in all three — the N11 hazard is preserved verbatim: `mountedRef.current = true`
**on mount** with the resume effect kept separate (A `Tafsir.jsx:59-68`, B `:542-551`, C `:70-79`),
and `abortRef.current?.abort()` in the unmount cleanup. **Zero new dependencies** in all three:
`package.json` `dependencies`/`devDependencies` are byte-identical to baseline for A, B and C
(verified). All three carried the dense Persian "why this safeguard exists" comments forward rather
than deleting them along with the code they guard. All three resolved the orphaned `Logo.jsx` (A
and C import it; B deleted it and inlined a `<Mark />`).

- **A — 4.5.** `Tafsir.jsx` 1262 → **416**, split into 12 single-responsibility modules with clean
  boundaries: `rangeMath.js` deliberately split out of `RangeBand.jsx` so one file does not export
  both a component and a helper; `safeText.js` isolates `asText`/`asList`; `imageIntake.js`
  isolates the HEIC/canvas lore. `ResultErrorBoundary` retained. 4 inline style sites. The easiest
  of the three to modify in six months, which is C6's stated tie-break.
- **C — 4.0.** `Tafsir.jsx` 1262 → **526**, 8 modules, `ResultBoundary` with a working retry,
  `modelText.js` isolating the defensive model-JSON readers, effects with proper cleanup
  (`io.disconnect()`). Deduction: 30 inline `style={{}}` sites — styling relocated rather than
  fully consolidated.
- **B — 3.0.** The one solution whose main component **grew**: `Tafsir.jsx` 1262 → **1382**. B's own
  SOLUTION-B.md acknowledges it ("Net +120 lines is almost entirely Persian comments and `aria-*`")
  and that is largely true — but the C6 1.0 anchor's first clause is literally "a larger single
  component than the 1262-line baseline," and the entry view remains one 1382-line file alongside a
  962-line stylesheet. Everything else is right (lint clean, effects correct, no dead code, one new
  component), which is why 3.0 rather than lower. B's styling is the *most* consolidated of the
  three; its component boundaries are the least.

## C7 — Verified working (weight 6) · A 4.0 · B 4.0 · C 4.0

Equal. `npm run lint` exit 0 and `npm run build` exit 0 with `dist/` produced for all three
(verbatim output in §1), Vazirmatn woff2 emitted into `dist/fonts/` in all three, zero warnings in
any build, no new dependencies. **I did not run a dev server**, so I have no browser-console
evidence for any of the three and I am not inventing it — that is what holds all three at 4.0
rather than 5.0, and it holds them equally. Nothing in the code inspection suggests a blank screen
or a broken flow in any of them. Per C7.1, no solution was penalised for the backend being absent.

---

# 5. Mandatory dissent check

Arguing against my vote (C) for sixty seconds:

- **What A does better than C, concretely:** `ResultView.jsx:73-81` — the measured CA/NA value
  printed *in the row* beside the corrected one. That is the N5 lesson applied at the exact place
  where the patient compares the screen to their paper, and C does not do it. A also gives the
  patient the one thing C's text-only rows cannot: `RangeBand.jsx` answering «عددِ من کجای بازه
  ایستاده؟» at a glance, with a correct fallback for titres and qualitative results. And A is the
  only solution whose contrast tokens I could verify as *recomputed* rather than inherited — it
  found and fixed a real sub-AA pair the other two carried forward. If the orchestrator weights
  derived-value safety and range legibility above edge-state coverage, A is the right pick, and it
  is close enough that I would not argue hard against it.
- **What B does better than C, concretely:** `Tafsir.jsx:812` — the stable, never-unmounting
  `role="status" aria-live="polite"` region. C's live region lives inside `ProgressBox` and
  disappears at the exact moment the result arrives; B's is the correct implementation of that
  checklist item, and C's focus-move is a workaround for a gap B simply does not have. And
  `styles/tokens.css` is plainly a better design system than anything in A or C — a real bounded
  type scale, one literal font-size in the entire stylesheet, and a "no hex outside this file" rule
  that I checked and found actually true.

Neither reverses the vote, but each names a specific thing the winner should absorb before merge.

---

# 6. Result

Weighted sums (Σ criterion × weight / 100):

- **A** = (4.5×26 + 4.5×14 + 4.5×14 + 3.5×16 + 4.0×16 + 4.5×8 + 4.0×6)/100
  = (117 + 63 + 63 + 56 + 64 + 36 + 24)/100 = **4.2**
- **B** = (4.0×26 + 4.5×14 + 3.5×14 + 4.5×16 + 3.0×16 + 3.0×8 + 4.0×6)/100
  = (104 + 63 + 49 + 72 + 48 + 24 + 24)/100 = **3.8**
- **C** = (4.5×26 + 4.5×14 + 4.0×14 + 3.5×16 + 4.5×16 + 4.0×8 + 4.0×6)/100
  = (117 + 63 + 56 + 56 + 72 + 32 + 24)/100 = **4.2**

No disqualifier fired, so no cap applies; the uncapped weighted sum is the overall for all three.

**A and C tie exactly at 4.2.** Applying the spec's tie-break chain (C1, then C5, then C3): C1 is
equal at 4.5 for both, so the tie breaks on **C5**, where C scores 4.5 against A's 4.0.

**VOTE: Solution C.**

Decisive difference, with file:line: `analyzeJob.js` emits `degraded: true` on transient network
failure in all three worktrees, and grepping JSX for `degraded` returns **0 hits in A, 0 in B, 3 in
C** — C (`AnalyzePanel.jsx:68-75`) is the only solution that renders the weak-connection state, and
that is representative of the wider gap: C is also the only one with a designed empty-result state
(`AnalyzePanel.jsx:165-181`), a confirmation before destroying a stored result (`:113-125`), a
provenance caveat inside the emergency banner on the legacy path (`ResultView.jsx:374-379`), and a
rule that refuses to hide a local critical banner for the sake of tidiness (`Tafsir.jsx:341-352`).

**Carry-forward for the merge, regardless of which solution wins:** re-attach the guideline layer
(`_engine.unitConversions` / `.preanalytical` / `.guidelines`) noted in §0 — no solution has it,
because none of them was seeded with it.

---

DISQUALIFIERS: Solution A — none. Solution B — none. Solution C — none.

Decisive difference behind the vote: C is the only solution that renders the weak-connection
(`degraded`) state and the only one with designed empty-result, parse-error and resume-confirm
states — grep for `degraded` in JSX returns 0 in A, 0 in B, 3 in C (`AnalyzePanel.jsx:68-75`).

---
VOTE: Solution C
SCORES:
  Solution A: 4.2/5.0
  Solution B: 3.8/5.0
  Solution C: 4.2/5.0
CRITERIA:
 - Patient safety & clinical integrity: A=4.5 B=4.0 C=4.5
 - Persian / RTL correctness: A=4.5 B=4.5 C=4.5
 - Accessibility (WCAG 2.2 AA): A=4.5 B=3.5 C=4.0
 - Visual design quality & design-system coherence: A=3.5 B=4.5 C=3.5
 - Information architecture & UX: A=4.0 B=3.0 C=4.5
 - Code quality & maintainability: A=4.5 B=3.0 C=4.0
 - Verified working: A=4.0 B=4.0 C=4.0
---

---

# DEBATE ROUND 1

## Claim 1 — DQ3 against Solution C: **FIRES. My original sweep was wrong.**

My §3 DQ3 entry audited only the `:root` **token** declarations in each solution and never
enumerated literal hex values inside component rules. That was a hole in my method, not a
disagreement about arithmetic. Enumerating them now
(`grep -nE 'color: *#[0-9a-fA-F]{3,6}' ui.css`) turns up six live sub-AA declarations in C.

Ratios computed independently (WCAG relative luminance, `(L1+0.05)/(L2+0.05)`):

| selector | file:line | colour | actual background | ratio | size |
|---|---|---|---|---:|---|
| `.k-cell-hint` | `wt-c/src/ui.css:519` | `#a39a88` | `--card` `#ffffff` | **2.79** | 10.5px |
| `.k-cell-hint` (on sunken) | same | `#a39a88` | `--sunken` `#f5f0e6` | **2.45** | 10.5px |
| `.k-row-src` | `wt-c/src/ui.css:367` | `#8a93a0` | `--card` `#ffffff` | **3.11** | 11px |
| `.k-cell-unit` | `wt-c/src/ui.css:489` | `#a39a88` | `#ffffff` | **2.79** | 10.5px |
| `.k-cell-tag` | `wt-c/src/ui.css:491` | `#a39a88` | `#ffffff` | **2.79** | 10.5px |
| `.k-local-unit` | `wt-c/src/ui.css:531` | `#a39a88` | `#ffffff` | **2.79** | 10.5px |
| `.k-gauge-ends` | `wt-c/src/ui.css:562` | `#a39a88` | `#ffffff` | **2.79** | 10.5px |

Longhand for the two the claim names:
`#a39a88` → L=0.3369; `#ffffff` → L=1.0. (1.05)/(0.3869) = **2.79**.
`#8a93a0` → L=0.2778; `#ffffff` → L=1.0. (1.05)/(0.3278) = **3.11**.
All are 10.5–11px, so neither large-text exemption (≥24px, or ≥19px bold) is available; the
threshold is 4.5:1.

**Reachability — checked, because a failing colour on a dead element is not the same finding:**

- `.k-cell-hint` renders the **reference range itself**: `ManualEntry.jsx:72-74`
  `<span className="k-cell-hint" id={hintId}>طبیعی: <span className="num">{r.low}–{r.high}</span></span>`.
  It is also the `aria-describedby` target of the value input (`:65`). It sits behind
  `manualOpen` (default `false`, `Tafsir.jsx:48`) — one click, not unreachable, and manual entry is
  one of the product's two primary input paths.
- `.k-row-src` renders **unconditionally in the engine result view**: `ResultView.jsx:64`
  `{t.refSource && <div className="k-row-src">منبع محدوده: {t.refSource}</div>}`, inside
  `.k-block { background: var(--card) }` (`ui.css:326-329`). Every graded test carries a
  `refSource`, so this paints on the default result screen for every patient. It is also the exact
  element the C1 checklist requires («`refSource` still shown next to the range it justifies»).

DQ3's enumerated targets include "a test value, **a reference range**". Both fire.

**Why bias warning B7 (pre-existing conditions) does not protect C here.** These hexes do come from
the baseline's inline `s` object (`baseline/src/Tafsir.jsx`: 14 occurrences of
`#a39a88`/`#8a93a0`/`#8a8272`). But C did not leave them untouched — C rewrote the entire styling
layer and **re-authored these values into a brand-new file**, `ui.css`, six times. DQ3 covers "any
**new or changed** colour", and C3.2 is explicit that replacing a token layer without re-verifying
is an unverified claim. `SOLUTION-C.md` even asserts of `labRef.js` that «colours removed in favour
of class names» — the class names were created, the failing colours were carried into them.

**The comparison is what makes this decisive rather than universal.** Counting the same three hexes
across the worktrees:

```
wt-a  index.css : 1  ← inside a COMMENT that names them as removed failures
wt-b            : 0  ← eliminated entirely
wt-c  ui.css    : 6  ← live declarations
```

A's `index.css:40-44` reads «⚠️ #8a8272 (۳.۸:۱) و #a39a88 (۲.۸:۱) … هر دو AA را رد می‌کردند.
جایگزینشان --ink-3 است.» — my computed 3.56 and 2.79 confirm A's own numbers, and `--ink-3`
(`#6f685b`) measures 5.16:1 on cream. I also enumerated the literal text hexes in A and B for
symmetry, which I had not done before: A has exactly one (`.note--info` `#0b4a47` on
`--brand-soft` `#e6f4f3` = **8.92:1**, passes); B has **zero**. So this is not a defect all three
share — it is the single thing that separates them, and I missed it.

**Verdict: DQ3 fires against Solution C. Overall capped at 2.5.**

## Claim 2 — only C renders `degraded`: **CONFIRMED** (it was my own finding, re-verified)

```
wt-a  analyzeJob.js "degraded: true": 1   |  *.jsx references to `degraded`: 0
wt-b  analyzeJob.js "degraded: true": 1   |  *.jsx references to `degraded`: 0
wt-c  analyzeJob.js "degraded: true": 1   |  *.jsx references to `degraded`: 3  (AnalyzePanel.jsx)
```

Still true, and it remains a genuine A and B weakness. But it no longer decides the outcome: a
cap is not traded against an edge state. C's better IA does not buy back text a patient cannot
read, which is the whole point of the disqualifier mechanism («Aesthetics never buy back a
patient-safety defect»).

## Revised scores

C's C3 drops to the 1.0 anchor ("contrast fails on status or value text"). Every other C criterion
stands on its own terms — DQ3 is an accessibility defect and per `scoring_mechanics.independence`
it does not drag C1 or C5.

C uncapped = (4.5×26 + 4.5×14 + **1.0**×14 + 3.5×16 + 4.5×16 + 4.0×8 + 4.0×6)/100
= (117 + 63 + 14 + 56 + 72 + 32 + 24)/100 = **3.8 uncapped → 2.5 capped (DQ3)**

A (4.2) and B (3.8) are unchanged; I re-verified both are clean of literal sub-AA text colours,
which if anything reinforces A's C3 = 4.5 — A is the only solution that both recomputed its tokens
and removed the bad literals.

**REVISE: VOTE changes from Solution C to Solution A.**

A now leads outright, no tie-break needed: A 4.2 vs B 3.8, driven by C1 (4.5 vs 4.0), C3 (4.5 vs
3.5), C5 (4.0 vs 3.0) and C6 (4.5 vs 3.0), against B's clear C4 win (4.5 vs 3.5). A's own
distinguishing merit is now better evidenced than it was in my first pass: it is the only solution
that treated contrast as something to compute rather than inherit, and the two colours it deleted
are precisely the two that disqualified C.

I am not revising because I was in the minority — claim 2, where I was the sole reporter, I re-ran
and hold. I am revising because I ran a grep I should have run in the first sweep and it returned
six live declarations below 4.5:1 on a reference range and on a source line the result view always
shows.

**Merge note for the orchestrator:** the fix in C is four lines (`#a39a88` → `--text-faint`
`#6f685b`, `#8a93a0` → `--text-muted` `#5a6675`, both already defined in C's own `:root`). If the
synthesis phase merges rather than picks, C's state coverage is worth taking and this defect should
not be the reason to discard it — but as it stands, C ships text at 2.79:1.

---
VOTE: Solution A
SCORES:
  Solution A: 4.2/5.0
  Solution B: 3.8/5.0
  Solution C: 2.5/5.0  (uncapped 3.8; capped by DQ3 — wt-c/src/ui.css:519 #a39a88 at 2.79:1 on the reference range, ui.css:367 #8a93a0 at 3.11:1 on «منبع محدوده»)
CRITERIA:
 - Patient safety & clinical integrity: A=4.5 B=4.0 C=4.5
 - Persian / RTL correctness: A=4.5 B=4.5 C=4.5
 - Accessibility (WCAG 2.2 AA): A=4.5 B=3.5 C=1.0
 - Visual design quality & design-system coherence: A=3.5 B=4.5 C=3.5
 - Information architecture & UX: A=4.0 B=3.0 C=4.5
 - Code quality & maintainability: A=4.5 B=3.0 C=4.0
 - Verified working: A=4.0 B=4.0 C=4.0
---
