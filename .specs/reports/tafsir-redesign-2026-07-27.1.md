# Judge 1 — Khanesh `/` (Tafsir) redesign evaluation

Spec: `.specs/reports/eval-spec.yaml` (khanesh-tafsir-redesign-eval-v1)
Baseline: `c:/Users/surface/Desktop/khanesh-project/khanesh/` (working tree)
Judge ran all lint/build commands personally. Dev server NOT run — see C7.

---

## 0. Verified execution (spec §0 `commands_you_must_actually_run`)

All three worktrees had `node_modules` junctioned; no install performed.

### `npm run lint` (oxlint) — verbatim

```
> khanesh@0.0.0 lint
> oxlint

A_LINT_EXIT=0
```
```
> khanesh@0.0.0 lint
> oxlint

B_LINT_EXIT=0
```
```
> khanesh@0.0.0 lint
> oxlint

C_LINT_EXIT=0
```
Baseline also exits 0. oxlint emits no diagnostics for any of the four trees.

### `npm run build` — verbatim

**A:**
```
vite v8.1.4 building client environment for production...
transforming...✓ 46 modules transformed.
dist/index.html                   0.76 kB │ gzip:  0.49 kB
dist/assets/index-CCJX9tFJ.css   18.13 kB │ gzip:  4.49 kB
dist/assets/index-rrjWSP7t.js   302.54 kB │ gzip: 95.10 kB
✓ built in 667ms
real  0m3.125s
A_BUILD_EXIT=0
```

**B:**
```
vite v8.1.4 building client environment for production...
transforming...✓ 31 modules transformed.
dist/index.html                   0.76 kB │ gzip:  0.49 kB
dist/assets/index-Bv_J5Tpt.css   23.77 kB │ gzip:  4.89 kB
dist/assets/index-CQ-hG44C.js   298.19 kB │ gzip: 94.12 kB
✓ built in 620ms
real  0m2.940s
B_BUILD_EXIT=0
```

**C:**
```
vite v8.1.4 building client environment for production...
transforming...✓ 42 modules transformed.
dist/index.html                   0.76 kB │ gzip:  0.49 kB
dist/assets/index-BSut-bFQ.css   23.25 kB │ gzip:  5.19 kB
dist/assets/index-BWAhfqC9.js   309.99 kB │ gzip: 96.19 kB
✓ built in 554ms
real  0m2.950s
C_BUILD_EXIT=0
```

**Baseline (for delta):**
```
transforming...✓ 30 modules transformed.
dist/assets/index-4QjXU0RW.css    1.10 kB │ gzip:  0.62 kB
dist/assets/index-FM9zly-U.js   304.46 kB │ gzip: 95.82 kB
✓ built in 434ms
```

JS gzip delta vs baseline (95.82 kB): A −0.72 kB, B −1.70 kB, C +0.37 kB. All negligible.
CSS grew in all three because inline `s`/`S` style objects moved into real stylesheets —
that is the intended direction, not bloat (JS shrank correspondingly in A and B).

**Vazirmatn woff2 emitted** — verified in all three:
```
=== wt-a fonts ===  OFL.txt  Vazirmatn-VF.woff2
=== wt-b fonts ===  OFL.txt  Vazirmatn-VF.woff2
=== wt-c fonts ===  OFL.txt  Vazirmatn-VF.woff2
```

### File inventory (line counts)

| | Baseline | A | B | C |
|---|---|---|---|---|
| largest file | Tafsir.jsx 1262 | ui.css 515 | Tafsir.jsx **1382** | ui.css 601 |
| largest JSX | Tafsir.jsx 1262 | ResultView 473 / Tafsir 416 | Tafsir.jsx **1382** | Tafsir 526 / ResultView 492 |
| src files (non-asset) | 10 | 26 | 14 | 21 |

---

## 1. DISQUALIFIER SWEEP (run criterion-blind, before any aesthetic reading)

### DQ1 — Emergency content hidden/collapsed/clamped
Swept `<details|<summary|accordion|line-clamp|showMore|isExpanded|collapse|maxHeight|max-height|truncate`
across all `src/` in each worktree.

- **A — clear.** Only two `<details>`: `ResultView.jsx:171` (category group) and
  `ResultView.jsx:269` (Provenance). The group `<details>` is gated at
  `ResultView.jsx:162` — `if (hasOut) return <section>` — i.e. any group containing an
  abnormal row renders as a plain non-collapsible `<section>`. Emergency banner is at
  `ResultView.jsx:339-348`, first child of `.result`, `role="alert"`, no wrapper.
- **B — clear.** Single `<details>` at `ResultView.jsx:243` (Provenance only). No
  collapse of any kind on result content. Urgency band `ResultView.jsx:335-346`, first
  child, `role="alert"` gated to `band.key === "emergency"` (line 341).
- **C — clear, and strongest.** `CategoryGroup` (`ResultView.jsx:71-117`) uses a
  `useState` disclosure, but `const locked = verdicts.some(isEmergencyVerdict)`
  (line 79) removes the toggle *entirely* for any group with an emergency row — it
  renders a static `div` (line 92-96), so the user cannot collapse it even deliberately.
  Non-emergency abnormal groups default open (`useState(out > 0)`, line 82).
  `-webkit-line-clamp` appears nowhere in any of the three.

**Verdict: DQ1 fires for none.**

### DQ2 — Raw engine key in visible text
All three filter unnamed rows out rather than falling back to `key`:
- A `ResultView.jsx:316-318`: `.filter(t => t && typeof t.name === "string" && t.name.trim())`
- B `ResultView.jsx:307-309`: same predicate
- C `ResultView.jsx:325-326`: same predicate

Every `t.key` occurrence found by grep is a React `key=` prop, a `Set`/bucket lookup key,
a CSS class suffix, or an anchor `id` (`href={`#sys-${group.key}`}` in A
`Scorecard.jsx:40` — that is `group.key`, a *category* key like `blood`, not an engine
test key, and it is an `href`, not text). No engine key reaches the DOM as text,
`aria-label`, `alt`, or `title` in any solution.

**Verdict: DQ2 fires for none.**

### DQ3 — Contrast below 4.5:1 on clinical text
I extracted every status/text token from each solution and computed WCAG relative
luminance ratios myself (`node`, sRGB linearization, `(L1+0.05)/(L2+0.05)`).
Full table in the C3 section. Result summary:

- **A — every pair passes.** Worst is `--ink-3 #6f685b` on `--page #faf7f0` = **5.16:1**.
  A is also the only solution that *caught the baseline's incorrect comment*: baseline
  `index.css:39` declares `--st-missing: #6b7280` / `#f1f3f5` as "4.8:1"; the true value
  is **4.35:1** (fails). A recomputed it, changed the pair to `#4a5568`/`#eef1f4` =
  **6.64:1**, and documented the old failure at `index.css:64-67`.
- **B — one failing pair, currently unreachable.** `tokens.css:69` carries the baseline's
  `--st-missing: #6b7280` on `#f1f3f5` = **4.35:1**, still labelled "۴.۸:۱". Painted by
  `components.css:781 .k-status--missing`. It is not reachable in the present render
  path (`stateOf` only returns `STATES.missing` for a null `t`, and `ResultView.jsx:307`
  filters nulls out), so it is a latent defect, not a live one.
  Also `--text-03 #667085` on `--fill-03 #f5f1e7` = **4.41:1** — a pairing the
  stylesheet permits but which I could not confirm is actually composed.
- **C — same single failing pair as B**, `index.css:60`, painted by `ui.css:304 .v-missing`,
  same 4.35:1, same copied "4.8:1" comment, same unreachability.

**Verdict: DQ3 fires for none** — the sub-4.5 pair in B and C is defined and styled but
not painted on any reachable render path, and DQ3 requires the token to be *used for* a
status label. This is scored as a real C3 deduction for B and C instead (spec note C3.2:
"a solution that REPLACES those tokens without re-verifying is making an unverified
claim"), and as a C3 credit for A.

### DQ4 — Missing test rendered as normal
All three keep a distinct `missing` state with a non-grey/dashed treatment
(A `resultStates.js:58-63` + `ui.css:170` dashed border; B `resultStates.js:72` +
`components.css:781` `border-style: dashed`; C `resultStates.js:68` + `ui.css:304` dashed).
No solution introduces a two-way `!abnormal` branch that reports on an unmeasured test:
grep found no "your kidney markers are fine"-class summary computed over absent tests.
A's `Scorecard` headline (`Scorecard.jsx:103-106`) counts only tests actually present in
`_engine.tests` and says so («… آزمایش خوانده شد»).

**Verdict: DQ4 fires for none.**

### DQ5 — Derived value presented as if printed on the sheet
All three keep the baseline's `MEASURED_OF` pairing and the explicit Persian framing:
«این عددها روی برگهٔ آزمایشگاه نیستند — ما آن‌ها را از روی مقادیر خودتان حساب کرده‌ایم.»
(A `ResultView.jsx:238-240`, B `ResultView.jsx:181-183`, C `ResultView.jsx:180-182`),
plus «روی برگهٔ شما: <measured>» above each corrected value
(A `:248-251`, B `:189-193`, C `:188-192`).

A goes further: `MeasuredNote` (`ResultView.jsx:73-81`) renders «روی برگهٔ شما: X — عددِ
بالا با آلبومینِ شما تصحیح شده» *inside the CA/NA test row itself*, gated on
`indices.ca_correction_applied`. B and C render the as-printed number only in the
derived-values block, matching baseline. Since `tests[].value` for CA/NA *may be the
corrected number*, B and C leave the row-level ambiguity the baseline had — a real C1
gap, but not worse than baseline, so not a DQ.

**Verdict: DQ5 fires for none.** A materially strengthens this; B and C hold parity.

### DQ6 — Clinical judgment moved into the frontend
This is the sweep's highest-risk item, because all three implement code-recon's
"highest-value fix" (per-test verdict from `level`/`ctcaeGrade`/`nearLimit` instead of
one panel-wide `urgency` chip). I read each implementation line by line:

- **A** `resultStates.js:86-102` `buildVerdictContext`: only enters the branch when
  `urgency === "emergency"` (engine-declared, line 90), then selects rows using
  `t.level === "critical"|"marked"` or `t.ctcaeGrade >= 3` — **engine fields only**, and
  falls back to marking *all* abnormal rows when no row carries severity (line 98),
  erring toward over-marking. No value/range comparison anywhere.
- **B** `resultStates.js:84-100` `stateOf`: pure lookup of `t.level` / `t.ctcaeGrade` /
  `t.nearLimit` / `t.abnormal`. `urgency` is deliberately *not* a parameter (documented
  line 81-82). Cleanest of the three.
- **C** `resultStates.js:80-122` `verdictOf` + `engineTier`: same field-only mapping;
  the only client decision is *demoting* a row out of emergency, and only when the engine
  explicitly said `mild`/`moderate` (line 114) — conservative direction.

No solution computes `has_critical`, thresholds a value, adds a client pattern list, or
synthesises a score. A's `Scorecard` ring is a **count**, not a score: `ringPct`
(`Scorecard.jsx:83`) drives arc length from `out/total` and no percentage is ever
printed; the ring hole prints `toFaDigits(out)` + «خارج از محدوده». Its header comment
(`Scorecard.jsx:8-12`) explicitly rules out a health score / biological age.
A's `RangeBand` colour comes from `stateCls` passed down (`ResultView.jsx:107`), not from
comparing value to bounds — satisfying scoring note C1.1.

All three keep the pre-existing manual-entry preview (C1.4) and none extend it onto the
engine response; all three add explicit Persian framing that it is a local preview
(A `Tafsir.jsx:372`, B `Tafsir.jsx:1081-1086`, C `LocalReview.jsx:13`).

**Verdict: DQ6 fires for none.**

### DQ7 — Non-Persian user-facing copy / fabricated clinical content
Grepped every `.jsx` for Latin-letter runs ≥4 chars outside identifiers/attributes:
zero hits in all three. No Lorem ipsum, no untranslated library strings, no hard-coded
demo result reachable by a user (no fixture data in any `src/`).

**Verdict: DQ7 fires for none.**

### DQ8 — "Deterministic rules" claim on the legacy path
All three gate `Provenance` on `hasEngine` and render a different, honest body when
`_engine` is absent (A `ResultView.jsx:291-301`, B `:281-290`, C `:264-273`), all
saying «این تفسیر با مدل زبانی نوشته شده و قاعده‌های بالینی ما روی آن اجرا نشده».

C adds two things beyond baseline: a standalone `!hasEngine` notice card
(`ResultView.jsx:396-402`) and — notably — a caveat *inside the emergency banner itself*
when the engine did not run (`ResultView.jsx:374-379`): «این هشدار را مدل زبانی نوشته و
قاعده‌های بالینی ما روی آن اجرا نشده. جدی بگیریدش، ولی حتماً با پزشک بررسی کنید.»
That is the only place in any solution where the legacy-path caveat reaches the one
element a patient in the emergency state actually reads.
A gates the whole `Scorecard` on `hasEngine` (`ResultView.jsx:352`).

**Verdict: DQ8 fires for none.**

### DQ9 — Privacy over-claim
Grepped for «حریم / دستگاه شما / جایی نمی / روی گوشی / محلی / ذخیره نمی» in user-facing
strings. The only on-device claim in any solution is B `Tafsir.jsx:1081-1086`:
«این یک مقایسهٔ ساده با جدولِ محدوده‌های همین برنامه است و روی دستگاه شما انجام می‌شود.
قاعده‌های بالینیِ ما اینجا اجرا نشده‌اند؛ برای تفسیرِ واقعی از بخشِ «تفسیر هوشمند» …
اگر این دو با هم اختلاف داشتند، آنچه معتبر است تفسیرِ هوشمند است.»
This is scoped to the manual-entry preview, which genuinely never leaves the browser, and
it makes no claim about the photo. Not an over-claim.
A `imageIntake.js:55` carries a comment explicitly restating that compression resizes and
does not crop or redact — the correct posture. No solution promises the image stays local.

**Verdict: DQ9 fires for none.**

### DQ10 — iOS zoom trap / zoom suppression
- `index.html` viewport in all three (line 7):
  `content="width=device-width, initial-scale=1.0, viewport-fit=cover"` — no
  `user-scalable=no`, no `maximum-scale`.
- Global 16px input floor preserved with its explanatory Persian comment:
  A `index.css:130-138`, B `styles/base.css:70-78`, C `index.css:125-133`.
- No `font-size` below 16px is applied to any `input`/`select`/`textarea` in any of the
  three (checked every `font-size` rule in each stylesheet against input selectors).

**Verdict: DQ10 fires for none.**

---

### DISQUALIFIER SUMMARY

```
DISQUALIFIERS: Solution A — none
DISQUALIFIERS: Solution B — none
DISQUALIFIERS: Solution C — none
```

No solution is capped. All three are unusually disciplined on the patient-safety axis —
they clearly share a common design-reference document and all three carry forward the
baseline's dense Persian safety comments. The separation between them is therefore
decided on degree, not on category.

---

## 2. CRITERIA — scored across all three at once (protocol step 4)

### C1 — Patient safety & clinical integrity (weight 26) — A 4.5 · B 4.0 · C 4.5

**Shared baseline parity (all three, verified):** `has_critical` read verbatim, never
recomputed (grep for any recompute returns nothing in all three); six-state word+shape+colour
encoding preserved; `unmatched_abnormal` keeps its own non-alarming copy; `missing` keeps a
dashed action treatment; derived indices carry the «این عددها روی برگهٔ آزمایشگاه نیستند»
framing with `MEASURED_OF` pairing; disclaimer is a client-side literal; provenance gated on
`_engine`; `extracted_tests` confirmation survives; `pages.failed` / `ocr_warnings` still
rendered; `refSource` still sits on the row it justifies (A `:113`, B `:79`, C `:64`); no new
client-side score/gauge/grade/age. No solution removed a baseline safeguard (C1.5 diff: zero
removals in all three).

All three implement code-recon's named "highest-value fix" — per-test verdict from
`fa`/`level`/`ctcaeGrade`/`nearLimit` instead of stamping panel `urgency` on every row.

**A — 4.5.** The only solution that fixes N5 *at the row*: `MeasuredNote`
(`ResultView.jsx:73-81`, mounted at `:104`) renders «روی برگهٔ شما: X — عددِ بالا با
آلبومینِ شما تصحیح شده» inside the CA/NA row, gated on `indices.ca_correction_applied`.
Since `tests[].value` for CA/NA *may already be the corrected number*, this is the exact place
the N5 confusion occurs, and B/C leave it to the derived-values block far below (baseline
behaviour). `GradeMeter` (`:47-61`) surfaces `ctcaeGrade` as pips **plus** the words «شدت بر
پایهٔ CTCAE v5: درجهٔ ۳ از ۴», so severity is not colour-only. `RangeBand` colour is passed in
as `stateCls` (`:107`), never derived from bounds — satisfies C1.1.
Deduction: `unmatchedRows = tests.filter(t => t.abnormal)` (`:331`) plus `stateOf`'s
`if (ctx?.unmatched) return STATES.unmatched` (`resultStates.js:115`) paints *every* abnormal
row in an unmatched panel as «نیازمند بررسی», flattening matched and unmatched abnormals
together — the C1 3.0 anchor's "third state flattened" defect running in the other direction.

**B — 4.0.** Cleanest engine boundary of the three: `stateOf(t, unmatched)`
(`resultStates.js:84-100`) does not even accept `urgency` as a parameter (documented `:81-82`),
so panel-level fact cannot leak onto a row by construction. It is also the only one whose
unmatched fallback is correctly *narrow* — `return unmatched ? STATES.unmatched :
STATES.out_of_range` fires only after every severity tier missed (`:99`), so a row the engine
did grade keeps its real severity. `evidenceOf` (`:147-159`) reads `t.source` to name which of
the engine's three grading modes produced the verdict, with a `<dl>` in Provenance
(`ResultView.jsx:260-275`) explaining the three — genuinely new honest information.
Deductions: no new safety mechanism beyond parity, and `components.css:777`
`.k-status--critical { background: var(--st-emergency) }` paints **filled red on a row**
whenever `level === "critical"` or `ctcaeGrade === 4`, *independent of panel urgency* — so red
can appear on a panel the engine graded `this_week`. Constraint 11 reserves red for emergency.
The direction is over-alarm rather than under-read, so it is dilution, not danger, but it is a
divergence A and C both avoid by gating red on `urgency === "emergency"`.

**C — 4.5.** Two safety properties no one else has.
(1) `ResultView.jsx:374-379`: when `_engine` is absent, the caveat «این هشدار را مدل زبانی
نوشته و قاعده‌های بالینی ما روی آن اجرا نشده. جدی بگیریدش، ولی حتماً با پزشک بررسی کنید.»
renders **inside the emergency banner itself** — the only element a patient in the emergency
state actually reads. A and B put the equivalent honesty only in a collapsed `<details>`
Provenance block. Backed by a standalone `!hasEngine` notice at `:396-402`.
(2) `CategoryGroup` (`:79, 92-96`) removes the disclosure control *entirely* for any group
holding an emergency row — the group cannot be collapsed even by deliberate user action, which
is strictly stronger than A's `<details>`-only-when-fully-normal gate (`A ResultView.jsx:162`).
`verdictOf` (`resultStates.js:114`) demotes a row out of emergency only when the engine
explicitly said `mild`/`moderate`, documented as the conservative direction (`:98-101`).
Emergency banner carries `<a href="tel:115">` (`:381`).
Deduction: same `unmatched` flattening as A (`:336`, `verdictOf:119`), and no row-level
as-printed CA/NA.

---

### C2 — Persian / RTL correctness (weight 14) — A 4.0 · B 4.5 · C 4.0

**Measured, all three worktrees, `src` CSS + JSX:**

| | `margin-left/right` | `padding-left/right` | bare `left:`/`right:` | `*-inline` logical | `text-align:left/right` |
|---|---|---|---|---|---|
| A | 0 | 0 | 0 | 9 | 0 |
| B | 0 | 2 | 0 | 15 | 0 |
| C | 0 | 0 | 0 | 17 | 0 |

Zero physical direction properties in RTL layout code in all three — a clean sweep, and a real
improvement over a baseline built on inline style objects that could not express `@media` at all.

All three keep the non-negotiables: `index.html` `lang="fa" dir="rtl"`; `@font-face` Vazirmatn
+ `/fonts/Vazirmatn-VF.woff2` emitted into `dist/` (verified in the build artifacts above);
`.num` with `unicode-bidi: isolate; direction: ltr; font-variant-numeric: tabular-nums`;
`line-height: 1.8` with the Persian-leading comment; value inputs `type="text"` +
`inputMode="decimal"` with `normalizeDigits` in `onChange` (A `EntryGrid.jsx:97,111` +
`ProfileCard.jsx:33`; B `Tafsir.jsx:826,960,972`; C `ManualEntry.jsx:49,67` +
`ProfileCard.jsx:52`), each carrying the explanatory comment that `type="number"` destroys
Persian digits at DOM level. Persian digits for in-sentence counts, Latin for lab values, is
respected everywhere I checked.

**B — 4.5, the only one that fixed a real bidi defect.** `ResultView.jsx:100-113`:

> «🔴 جداکنندهٔ «·» بی‌فاصله به رقمِ فارسی می‌چسبید و «۰ طبیعی · ۱ خارج» روی صفحه «۱۰» خوانده می‌شد.»

The category count separator abutting a Persian digit made «۰ طبیعی · ۱ خارج» render as «۱۰».
B split each count into its own `<span>` and moved the spacing to flex. **A (`ResultView.jsx:
126-127`) and C (`ResultView.jsx:87`) both still ship the raw «·» inline in the text flow** —
the identical construction. Per the C2 tie-break ("breadth beats elegance; a single
un-isolated numeral corrupts a real reading"), this is the separator. B also derives its
`Segmented` arrow-key direction from RTL rather than hardcoding it (`Segmented.jsx:44-51`).

**A — 4.0.** More numeric surfaces than the others (RangeBand, CTCAE pips, ring count, per-system
counts) and all of them route through `<Num>` or `toFaDigits`; `RangeBand` renders no text at
all so there is nothing to invert. Loses the «·» point.

**C — 4.0.** `insetInlineStart` used for the local gauge geometry (`LocalReview.jsx:60-61`) —
correct logical positioning where a physical `left` would have mirrored wrongly. Loses the
«·» point. Register is consistent and formal across all three (spot-checked buttons, hints,
errors, empty states); the baseline's «وارد کن» / «کلیک کنید» inconsistency is resolved in all
three.

---

### C3 — Accessibility WCAG 2.2 AA (weight 14) — A 4.5 · B 4.0 · C 4.0

**Computed contrast** (I ran the WCAG relative-luminance formula in `node` on every changed
token paired with its actual card/chip background — not the page background — and not the
comments):

| pair | ratio | verdict |
|---|---|---|
| A `--ink-3 #6f685b` on `--page #faf7f0` | **5.16** | pass (A's worst) |
| A `--st-normal #1f6b45` on `#eaf4ee` | 5.75 | pass |
| A `--st-near #0f6e6e` on `#e6f4f3` | 5.35 | pass |
| A `--st-out #7a4408` on `#fff3e5` | 7.23 | pass |
| A `--st-unmatched #55508c` on `#eeeef8` | 6.26 | pass |
| A emergency `#ffffff` on `#b3261e` | 6.54 | pass |
| A emergency ink `#b3261e` on `#fdecea` | 5.72 | pass |
| **A `--st-missing #4a5568` on `#eef1f4`** | **6.64** | **pass — A's fix** |
| A brand `#ffffff` on `#2f6f6b` | 5.82 | pass |
| B `--text-03 #667085` on `--fill-01 #ffffff` | 4.97 | pass |
| B `--text-03` on `--fill-02 #faf7f0` | 4.65 | pass |
| B `--text-03` on `--fill-03 #f5f1e7` | **4.41** | **fail** (composition unconfirmed) |
| B `--text-02 #4a5563` on `#ffffff` | 7.58 | pass |
| B `#ffffff` on `--fill-05 #0f5f5b` | 7.48 | pass |
| **B/C `--st-missing #6b7280` on `#f1f3f5`** | **4.35** | **fail — comment claims 4.8:1** |
| B/C `--st-week #8a5300` on `#fdf3e2` | 5.76 | pass |
| B/C `--st-emergency #b3261e` on `#fdecea` | 5.72 | pass |
| C `--text-faint #6f685b` on `--sunken #f5f0e6` | 4.86 | pass |
| C brand `#0f6e6e` on `#ffffff` / reversed | 6.04 | pass |

Worked arithmetic for the decisive pair, `#6b7280` on `#f1f3f5`:
sRGB `#6b7280` → (0.4196, 0.4471, 0.5020) → linear (0.1466, 0.1683, 0.2158) → L1 = 0.2126·0.1466
+ 0.7152·0.1683 + 0.0722·0.2158 = **0.1673**.
`#f1f3f5` → (0.9451, 0.9529, 0.9608) → linear (0.8796, 0.8963, 0.9130) → L2 = **0.8949**.
Ratio = (0.8949+0.05)/(0.1673+0.05) = 0.9449/0.2173 = **4.35:1** — below 4.5.

**This is a baseline defect**: `khanesh/src/index.css:39` ships that pair with the comment
`/* 4.8:1 */`. A is the only solution that recomputed rather than copying, caught it, and fixed
it — `index.css:64-67` states «(جفتِ قبلی #6b7280 روی #f1f3f5 برابر ۴.۴:۱ بود — مردود.)» and
changes the pair to `#4a5568`/`#eef1f4` = 6.64:1. B (`tokens.css:69`) and C (`index.css:60`)
both re-declared the token in a brand-new stylesheet and carried the wrong "۴.۸:۱" comment
across verbatim. That is precisely scoring note C3.2. It is not a DQ because the `missing`
state is currently unreachable (`stateOf`/`verdictOf` return it only for a null `t`, and the
tests array is null-filtered first), but the claim is false in both B's and C's own docs.

**Other mechanics, counted:**

| | tap-target rules (44px/`--tap`) | `@media` | `:focus-visible` | `prefers-reduced-motion` | `aria-label` | `htmlFor` | `overflow-x:auto` |
|---|---|---|---|---|---|---|---|
| A | 4 | 5 | 3 | 2 | 12 | 8 | 0 |
| B | 5 | 9 | 6 | 2 | 12 | 6 | 0 |
| C | 8 | 11 | 7 | 1 | 25 | 7 | 1 |

A's low focus-rule count understates it: `index.css:146-150` is a single global
`:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px }` that covers every
control, replacing the baseline's three bare `outline:none` declarations (documented at
`index.css:140-145` as a WCAG 2.4.7 break caused mechanically by inline styles being unable to
express a pseudo-class). All three add `prefers-reduced-motion: reduce` (A `index.css:172-178`
neutralises `*` transitions/animations/scroll-behavior globally).

**Async announcement** — all three solve the baseline's silent two-minute wait, differently:

- **B** is the only one with a *stable* live region: `Tafsir.jsx:812`
  `<div className="k-sr" role="status" aria-live="polite">{liveMsg}</div>`, always mounted with
  the comment «ناحیهٔ زنده — همیشه در DOM هست تا تغییرش اعلام شود». This is the C3 checklist
  item verbatim ("`aria-live` region persists across the loading→result transition").
- **A** moves focus to the result container (`Tafsir.jsx:103`, `UploadCard.jsx:206/246`
  `tabIndex={-1}`) plus `role="status" aria-live="polite"` on the progress box (`:175`).
- **C** moves focus to the result `<h2>` (`ResultView.jsx:350` `tabIndex={-1} ref={headingRef}`)
  plus `aria-live="polite"` on the progress text (`AnalyzePanel.jsx:46`).

All three use `role="alert"` for errors and for the emergency banner.

**Scores.** A 4.5 — the C3 tie-break is explicit ("Prefer computed-and-passing over
asserted-and-plausible"), and A is the only solution that both passes everywhere and
demonstrably did the arithmetic. B 4.0 and C 4.0 — both ship an unverified, wrong contrast
claim; C's substantially broader mechanics (8 tap rules, 25 aria-labels, `radiogroup`/
`aria-pressed`, native `<label>` dropzone, an `overflow-x` container) offset B's stable live
region and higher focus/media coverage.

---

### C4 — Visual design quality & design-system coherence (weight 16) — A 3.5 · B 4.5 · C 3.5

This is where the three separate most sharply, and the evidence is countable.

**Type scale as actually implemented** (distinct `font-size` values in the component layer):

| | distinct sizes | expressed as | half-pixel values |
|---|---|---|---|
| A `ui.css` | **15** | raw px, every one | 10.5, 11.5, 12.5, 13.5, 14.5 |
| B `components.css` | **9** | `var(--t-*)` tokens (2 raw escapes: `1rem`, `1.75rem`) | none |
| C `ui.css` | **17** | raw px, every one | 10.5, 11.5, 12.5, 13.5, 14.5 |

**Spacing scale adherence** (padding/margin/gap declarations):

| | raw-px declarations | token-based declarations |
|---|---|---|
| A | **126** | **0** |
| B | 14 | **101** |
| C | 34 | 111 |

**Residual inline styles in JSX:**

| | `style={{` sites | nature |
|---|---|---|
| A | 4 | all CSS-custom-property data bridges (`--band-start`, `--ring-pct`) |
| B | 3 | all data bridges — matches B's own claim exactly |
| C | **30** | ~25 are ad-hoc magic numbers: `marginBottom: 12`, `marginTop: 12`, `width: "100%"`, `minHeight: 32` (`AnalyzePanel.jsx:39,70,80,149,153`; `LocalReview.jsx:122,153,158`; `Tafsir.jsx:414,432,456,460,479,483`) |

**A — 3.5.** A's colour system is the best of the three (audited, recomputed, single source,
`resultStates.js` stripped of all hex). Its visual voice is also the most distinctive and the
most disciplined about restraint: the Scorecard ring ships a *count* not a score with the
reasoning written out (`Scorecard.jsx:8-12`), and it renders statically because an animated
sweep in front of a clinical count is a defect. But `:root` (`index.css:27-97`) defines
colour, radius, shadow, motion and a page gutter — **and no spacing scale and no type scale at
all**, which is why the component layer carries 126 raw spacing values and 15 ad-hoc font
sizes including five half-pixels. That is C4's 3.0 anchor almost word for word: "a token layer
that is real but partial: colour tokens exist while spacing/radius/shadow/type remain ad-hoc".
Per tie-break C4 ("Prefer coherence over ambition… the systematic one wins — this is a medical
product, and consistency IS the aesthetic"), A's greater ambition does not buy this back.

**B — 4.5.** `styles/tokens.css` is the C4 5.0 description implemented: semantically numbered
colour (`--fill-01..06`, `--text-01..05`, `--stroke-01..06`), a 10-step spacing scale
(`:74-76`), a radius scale (`:84`), a three-step elevation scale (`:88-90`), a bounded
9-step type scale explicitly tuned for Persian (`:92-103`, with the reasoning that weight 300
destroys Persian letter teeth at small sizes and nothing at or below 1rem is fluid), motion
tokens, a `--tap: 44px` target token, and `env(safe-area-inset-*)` with a documented
explanation of why those three names are deliberately *physical* (`:120-127`). I verified B's
claim that no hex literal exists outside `tokens.css`: the four hex matches in
`components.css` (lines 775, 777, 886, 917) are all inside comments recording contrast ratios
or naming the removed bootstrap `#dc3545` — none is a declared value. Claim holds. The three
status vocabularies (`ST`, `TREND`, `STATES`) are collapsed onto the one audited palette
(`components.css:882-887`) with deliberately distinct class prefixes so the local preview
never looks like an engine verdict. Weakness: with no range visual, the result page is chips
and prose — less "data as the hero" than the reference sites.

**C — 3.5.** Spacing is genuinely systematic (111 token uses), and `ui.css` has zero physical
direction properties. But 17 raw font sizes with no type token, plus ~25 ad-hoc inline spacing
magic numbers scattered across five components, is exactly the "tidy but not authored" seam.
Its own SOLUTION-C.md frames "~220 lines of inline style objects became two stylesheets" as
complete; the 30 remaining `style={{` sites are not mentioned (B2: mild).

All three: light-mode lock preserved (`color-scheme: light` with the native-control rationale),
emoji retained systematically as category glyphs, and **no imported marketing patterns** — I
grepped for pricing/membership/referral/testimonial/streak/badge/score constructs and found
none in any of the three.

---

### C5 — Information architecture & UX (weight 16) — A 4.0 · B 3.5 · C 4.5

**Range visualisation** — the C5 5.0 anchor's signature element:

- **A is the only solution that ships one on the engine's own rows.** `RangeBand.jsx` mounted
  at `ResultView.jsx:106-108`. Its degrade path is correct and deliberate: `parseRange`
  (`rangeMath.js:19-28`) returns `null` for anything that is not two finite bounds — titre
  («1/320»), qualitative («مثبت»), one-sided («<200») — and the row still renders its number
  and range text, satisfying C1.2 ("silently dropping the row when the parse fails is not
  [acceptable]"). The comment cites N6 by name. `bandGeometry` (`:38-55`) widens the window to
  contain an extreme value rather than pinning the marker to the edge, with the reason written
  out: pinning lied about position.
- **B and C ship no range visual on engine rows at all.** B's band exists only in the local
  manual preview (`Tafsir.jsx:1161-1163`); C's gauge only in `LocalReview.jsx:60-61`. Neither
  answers "where does my value sit" on the surface that carries the engine's verdict.

**Designed states** — C5's tie-break ("Prefer the one that designed MORE of the real states…
Edge states are where patients get hurt"):

| state | A | B | C |
|---|---|---|---|
| resumed job from previous visit | `UploadCard.jsx` resume banner | inherited | **`ResumeOffer` + confirm-before-clear** (`Tafsir.jsx:404-412`) |
| analyzing, real per-page progress | `UploadCard.jsx:175` | `Tafsir.jsx:1266` | `ProgressBox` **+ `ResultSkeleton`** (`:440-449`) |
| hard error | `warn--strong` `role=alert` | `role=alert` note | **`ErrorBox` with working retry** (`:451-453`) |
| empty / not-yet-analyzed | — | — | **`EmptyResult`** (`:455-457`) |
| model JSON unparseable | inherited branch | inherited branch | **`ParseErrorView` reusing the shared `ExtractedTests`** (`:462-466`) |
| render crash | `ResultErrorBoundary` | inherited | **`ResultBoundary` with retry** (`:461`) |
| legacy no-`_engine` | Provenance only | Provenance only | **banner caveat + standalone notice** |
| local preview vs engine conflict | **silently suppressed** (`Tafsir.jsx:376`) | both shown, reframed | **suppressed + explained + override button** (`:478-488`) |
| thumb-reachable CTA on phone | — | — | **sticky `k-dock`, gated on the CTA leaving the viewport** (`:511-523`) |

C5.1 (the "did we read your numbers right?" confirmation): **B and C keep it before summary and
interpretation** (B `ResultView.jsx:364`, C `:421`). **A moved it below the Scorecard**
(`ResultView.jsx:352` then `:375`) — still before interpretation, not behind a collapse, and
mitigated by an explicit in-scorecard link «یک نگاه به آن‌ها بیندازید» pointing at
`#numbers-check` (`Scorecard.jsx:123-129`), with the trade recorded in a comment at
`ResultView.jsx:8-13` so it can be reversed knowingly. A defensible but real weakening.

Body-system grouping preserved in all three via `testCategories.js`, unknown keys still falling
to «سایر». Category counts survive in all three. `analyzeJob.js` `progressText` (real per-page
progress, not a fake percentage) retained unchanged in all three.

**A 4.0** — best three-level IA (Scorecard → body-system card with anchor link → row) and the
only real range visual, offset by the confirmation reorder and thinner state coverage.
**B 3.5** — keeps the correct order and adds the evidence-strength ramp, but no range visual,
fewest designed states, and the entry view is still the same flat 46-input wall in the same
monolith. **C 4.5** — wins C5's own stated tie-break decisively on state coverage and is the
only one to design for the phone thumb; loses ground for having no engine-row range visual.

---

### C6 — Code quality & maintainability (weight 8) — A 4.5 · B 3.0 · C 4.0

| | largest JSX | src files | style location | inline `style={{` |
|---|---|---|---|---|
| baseline | `Tafsir.jsx` **1262** | 10 | inline `s`/`S` objects | many |
| A | `ResultView.jsx` 473 / `Tafsir.jsx` **416** | 26 | `ui.css` 515 | 4 (data bridges) |
| B | `Tafsir.jsx` **1382** | 14 | `tokens/base/components.css` | 3 (data bridges) |
| C | `Tafsir.jsx` **526** / `ResultView.jsx` 492 | 21 | `ui.css` 601 | 30 (25 magic numbers) |

**StrictMode / effects** — all three are correct and identical on the N11 fix:
`mountedRef.current = true` **on mount** with `abortRef.current?.abort()` in cleanup (A
`Tafsir.jsx:62-64`, B `:545-547`, C `:73-75`), and the resume effect kept deliberately separate
and touching neither ref (A `:68-71`, B `:551-554`, C `:79-82`), each carrying the Persian
comment explaining why. `AbortController` still cancels the in-flight analyze (A `:205-206`, B
`:683-684`, C `:224-225`). No client-side timeout reintroduced. `localStorage` access still
wrapped. `asText`/`asList` + error boundary retained in all three. Zero new dependencies in all
three (`package.json` unchanged — react 19.2, react-router-dom 7, oxlint, vite 8).

**A 4.5** — the only solution that genuinely decomposed: `Tafsir.jsx` 1262 → 416, the 46-test
`REF` table lifted verbatim into `labRefs.js`, `rangeMath.js` split from `RangeBand.jsx`
specifically so a file does not export both a component and a helper (`rangeMath.js:1-5`), and
`imageIntake.js` carrying its failure-origin comments across. Boundaries are the clearest of
the three.

**B 3.0** — `Tafsir.jsx` **grew from 1262 to 1382 lines**, which is the C6 1.0 anchor stated
literally ("A larger single component than the 1262-line baseline"). `REF`, `CATS`, `ST`,
`statusOf`, `trendOf`, `comboInsights`, `asText`/`asList` and the whole render all still live
in one file. B's style boundary is the best of the three and its stylesheet is excellent, but
C6's tie-break is "which would be easier to modify six months from now… boundary clarity is
[the metric]" — and B improved exactly one of the two boundaries. Not scored below 3.0 because
the growth is genuinely comments and `aria-*`, the 134-line `s` object is gone, and lint/build
are clean.

**C 4.0** — good decomposition (526-line `Tafsir.jsx`, ten focused components including
`ParseErrorView` and `ResultBoundary`), but the ~25 ad-hoc inline spacing styles are "partial
inline style removal", the C6 3.0 residue, applied on top of otherwise clean work.

---

### C7 — Verified working (weight 6) — A 4.0 · B 4.0 · C 4.0

All three: `npm run lint` exit 0 with zero oxlint diagnostics; `npm run build` exit 0 in
under 700 ms; `dist/` produced; `dist/fonts/Vazirmatn-VF.woff2` emitted. Verbatim output in §0.
Bundle deltas vs baseline are negligible (JS gzip: A −0.72 kB, B −1.70 kB, C +0.37 kB).

**I did not run a dev server.** Per spec §0 `optional_but_valuable` I state this explicitly
rather than inventing screenshots: no solution's runtime console output, first-paint React
warnings, or 375/414/1024 px rendering was observed. Consequently none of the three can be
credited with the 5.0 anchor's "page loads with no console errors" clause, and all rendered-UX
claims above are scored from the code. All three are scored 4.0 identically — a manufactured
spread here would be noise (spec: "identical scores on a criterion are an acceptable, honest
outcome").

---

## 3. Weighted totals

| criterion | w | A | B | C |
|---|---|---|---|---|
| C1 Patient safety & clinical integrity | 26 | 4.5 | 4.0 | 4.5 |
| C2 Persian / RTL correctness | 14 | 4.0 | 4.5 | 4.0 |
| C3 Accessibility (WCAG 2.2 AA) | 14 | 4.5 | 4.0 | 4.0 |
| C4 Visual design & design-system coherence | 16 | 3.5 | 4.5 | 3.5 |
| C5 Information architecture & UX | 16 | 4.0 | 3.5 | 4.5 |
| C6 Code quality & maintainability | 8 | 4.5 | 3.0 | 4.0 |
| C7 Verified working | 6 | 4.0 | 4.0 | 4.0 |
| **weighted sum /100** | | **416** | **399** | **413** |
| **overall** | | **4.2** | **4.0** | **4.1** |

No disqualifier fired, so no cap applies; uncapped sum = capped overall for all three.

**VOTE: Solution A** — by 0.03 on the raw weighted sum (416 vs 413). This is genuinely close
and I record it as such rather than inflating the gap.

**The single decisive difference:** A is the only solution whose every changed colour pair I
computed as passing, *and* the only one that caught the failure the other two copied — baseline
`index.css:39` ships `--st-missing #6b7280` on `#f1f3f5` labelled "4.8:1" when it is actually
**4.35:1**; A recomputed it, fixed it to `#4a5568`/`#eef1f4` = 6.64:1, and documented the old
failure at `index.css:64-67`, while B (`tokens.css:69`) and C (`index.css:60`) each rewrote the
token block in a brand-new file and carried the wrong ratio comment across verbatim. Against
otherwise near-equal C1, that 0.5 on a 14-weight criterion is the entire margin.

---

## 4. Mandatory dissent check

**Strongest thing B does better than A:** `styles/tokens.css:92-103` is the only bounded,
named, Persian-tuned type scale among the three; A's `ui.css` carries **15** distinct raw-px
font sizes including 10.5/11.5/12.5/13.5/14.5px and **zero** spacing tokens against 126 raw-px
spacing declarations. B also fixed a real Persian bidi defect that A and C both still ship —
`ResultView.jsx:100-113`, where the «·» separator abutting a Persian digit made «۰ طبیعی · ۱
خارج» read as «۱۰» (A `ResultView.jsx:126-127`, C `ResultView.jsx:87` are the unfixed
construction). If C4 carried C1's weight, B would win this evaluation.

**Strongest thing C does better than A:** `ResultView.jsx:374-379` renders the legacy-path
caveat — «این هشدار را مدل زبانی نوشته و قاعده‌های بالینی ما روی آن اجرا نشده» — *inside the
emergency banner*, the one element a patient in the emergency state is guaranteed to read; A's
equivalent honesty lives only inside a collapsed `<details>` Provenance block
(`ResultView.jsx:291-301`), which a frightened patient will never open. C also removes the
disclosure control entirely from any group holding an emergency row (`:79, 92-96`) rather than
merely defaulting it open, and where A silently suppresses the local preview once an engine
result exists (`Tafsir.jsx:376`), C explains the suppression and offers an override
(`Tafsir.jsx:478-488`). C's state coverage is the best in the set by a clear margin.

Both are real. Neither displaces the contrast finding, which is a mechanism rather than a
claim (bias warning B8) and which sits on the criterion whose own tie-break names exactly this
distinction.

---

## 5. Final header block

DISQUALIFIERS: Solution A — none
DISQUALIFIERS: Solution B — none
DISQUALIFIERS: Solution C — none

Decisive difference: A is the only solution that recomputed the inherited colour tokens instead
of copying their comments, catching and fixing the baseline's genuinely failing
`--st-missing` pair (4.35:1, labelled "4.8:1") that B (`tokens.css:69`) and C (`index.css:60`)
both carried forward verbatim into brand-new stylesheets.

---
VOTE: Solution A
SCORES:
  Solution A: 4.2/5.0
  Solution B: 4.0/5.0
  Solution C: 4.1/5.0
CRITERIA:
 - Patient safety & clinical integrity: A=4.5 B=4.0 C=4.5
 - Persian / RTL correctness: A=4.0 B=4.5 C=4.0
 - Accessibility (WCAG 2.2 AA): A=4.5 B=4.0 C=4.0
 - Visual design quality & design-system coherence: A=3.5 B=4.5 C=3.5
 - Information architecture & UX: A=4.0 B=3.5 C=4.5
 - Code quality & maintainability: A=4.5 B=3.0 C=4.0
 - Verified working: A=4.0 B=4.0 C=4.0
---


## DEBATE ROUND 1

Both disputed claims re-checked against source by me, independently. Contrast recomputed from
scratch with the WCAG relative-luminance formula; grep counts re-run.

### CLAIM 1 — DQ3 against Solution C: **CONFIRMED, and broader than reported**

My first-pass C3 audit swept only the `:root` token blocks of each solution. It did not sweep
raw hex `color:` literals in the component layer. That was a real methodological gap on my part
— I had even counted "49 hexes in C's `ui.css`" while scoring C4 and never followed up on what
they were. The other judge did the work I should have done. Full sweep, all three worktrees:

| | raw hex used as `color:` in the component layer |
|---|---|
| A `ui.css` | 2 non-`var()` declarations total: `border-color: #bdb6a8` (a border, not text) and `color: inherit`. Every small-text class routes through a token — `.row-range` `var(--ink-2)`, `.row-src` `var(--ink-3)`, `.hint` `var(--ink-2)`, `.group-count` `var(--ink-2)`, `.cell-label` `var(--ink-2)`, `.tagline` `var(--ink-3)`, `.score-note` `var(--ink-2)`. Minimum computed 5.16:1. |
| B `components.css` | **zero.** B's claim that no hex literal exists outside `tokens.css` holds under the stricter sweep too. |
| C `ui.css` | **30+**, none of which passed through C's token audit. |

**Ratios I computed myself** (sRGB to linear, then `(L1+0.05)/(L2+0.05)`; backgrounds traced to
the element that actually paints them, not the page):

| selector | text it paints | file:line of that text | size | fg on bg | ratio |
|---|---|---|---|---|---|
| `.k-cell-hint` | «طبیعی: 4.4–11» — a **reference range** | `ManualEntry.jsx:72-74` | 10.5px | `#a39a88` on `#ffffff` | **2.79:1** |
| `.k-row-src` | «منبع محدوده: …» in the **engine result view** | `ResultView.jsx:64` | 11px | `#8a93a0` on `#ffffff` | **3.11:1** |
| `.k-cell-unit` | the unit beside every typed lab value | `ManualEntry.jsx` grid | 10.5px | `#a39a88` on `#ffffff` | **2.79:1** |
| `.k-cell-tag` | previous/current comparison tag | manual grid | 10.5px | `#a39a88` on `#ffffff` | **2.79:1** |
| `.k-local-unit` | unit in the local review block | `LocalReview.jsx` | 10.5px | `#a39a88` on `#ffffff` | **2.79:1** |
| `.k-gauge-ends` | gauge range endpoints | `LocalReview.jsx` | 10.5px | `#a39a88` on `#ffffff` | **2.79:1** |
| `.k-btn-secondary:disabled` | disabled control label | — | — | `#93a3a3` on `#ffffff` | 2.62:1 |
| `.k-btn-primary:disabled` | disabled CTA label | — | 16px | `#f4f7f7` on `#9bb5b4` | 2.02:1 |

My numbers match the reporting judge's to two decimals (2.79 and 3.11).

**Backgrounds traced, not assumed.** `.k-cell-hint` sits in `.k-cell` (no background) inside the
manual-entry grid inside `.k-card { background: var(--card) }` = `#ffffff` (`ui.css:54-55`).
`.k-row-src` sits in `.k-row` (no background, `ui.css:360`) inside `.k-group-body` (no
background, `:358`) inside `.k-block { background: var(--card) }` = `#ffffff` (`:326-327`).
No large-text exemption applies: 10.5px and 11px are far below the 24px / 19px-bold threshold,
so 4.5:1 governs, not 3:1.

**Reachability — the test I applied when I declined to fire DQ3 earlier.** I did not fire DQ3 on
the `--st-missing` 4.35:1 pair because `stateOf`/`verdictOf` return that state only for a null
`t` and the tests array is null-filtered first, so it is never painted. That reasoning does not
rescue these. The manual-entry grid renders on **first load**, before any interaction, and
`.k-cell-hint` renders on every one of the 46 cells. `.k-row-src` renders for every engine test
row carrying a `refSource`. Both are on screen in the ordinary path.

**The corroborating detail that settles it.** Solution A's `index.css:36-40` states:

> «⚠️ #8a8272 (۳.۸:۱) و #a39a88 (۲.۸:۱) که قبلاً برای «محدودهٔ مرجع»، واحد، و فوتر استفاده
> می‌شدند هر دو AA را رد می‌کردند. جایگزینشان --ink-3 است.»

A independently identified `#a39a88` as 2.8:1 and named the exact elements it was failing on —
the reference range and the unit — and replaced it with `--ink-3` (5.16–5.52:1). **C carried the
identical failing colour forward onto the identical elements.** Two independent audits (A's and
mine) converge on the same number for the same colour on the same text. C's audit was not
performed on anything outside its `:root` block.

DQ3's wording is met exactly: "Any new or changed colour token used for a status label, a test
value, **a reference range**, a warning, an urgency banner, or paragraph text that computes below
4.5:1 against its actual rendered background." `ui.css` is a file C created; these rules are new.

**Result: DQ3 FIRES against Solution C. Overall capped at 2.5.**

### CLAIM 2 — "only C renders the `degraded` state": **grep confirmed, conclusion REFUTED**

My earlier per-worktree counts in this report were produced by an `awk -F:` pipeline that split
on the colon in the Windows drive letter (`C:/…`), so those sums were garbage. Recounted with
`grep -rho … | wc -l`:

```
wt-a: 0    wt-b: 0    wt-c: 5
```

The raw counts are right. The inference drawn from them is not. `analyzeJob.js` does not merely
set the flag — its `progressText()` helper already converts it into a finished Persian sentence:

- A `analyzeJob.js:149` / B `:146` / C `:146`:
  «اتصال ضعیف است — تحلیل روی سرور ادامه دارد. دوباره تلاش می‌کنیم…»

And all three render `progressText(aiProgress)` on screen during analysis:

- **A** — `UploadCard.jsx:176`, `<p className="progress-text">{progressText(aiProgress)}</p>`,
  inside the `role="status" aria-live="polite"` progress box at `:175`.
- **B** — `Tafsir.jsx:1303` visually, **and** `:793` feeds it into the always-mounted
  `aria-live` region at `:812`, so B announces the degraded state to a screen reader.
- **C** — `AnalyzePanel.jsx:30` via `progressText`, **plus** a dedicated titled notice at
  `:69-75` with `role="status"` and warmer copy («یک تونل یا آسانسور، تحلیلِ شکست‌خورده نیست»).

So the degraded state is surfaced in all three. C gives it a better, more legible treatment;
A and B render it as progress text. That is a C5 refinement in C's favour — which I had already
credited: C5 was the one criterion where I scored C highest of the three (4.5). No score moves
on this claim.

### Revised scoring for Solution C

Per spec `independence`, I re-scored only the criteria the finding actually touches, rather than
letting it bleed across the whole card:

- **C1: 4.5 → 1.0.** The C1 1.0 anchor is "Fires one or more automatic disqualifiers". Concretely
  beyond the DQ itself: the C1 checklist item "`refSource` still shown next to the range it
  justifies" is satisfied structurally but defeated visually at 3.11:1, and the manual-entry
  reference range sits at 2.79:1.
- **C3: 4.0 → 1.0.** The C3 1.0 anchor is "contrast fails on status or value text" — six
  reachable pairs below 4.5:1 on ranges, units and source attribution.
- **Unchanged on their own merits:** C2 4.0, C4 3.5, C5 4.5, C6 4.0, C7 4.0. C's state coverage
  and IA are genuinely the best in the set and I do not withdraw that; it simply cannot outrun a
  patient-safety cap (spec: "Aesthetics never buy back a patient-safety defect").

Uncapped weighted sum: (1.0·26)+(4.0·14)+(1.0·14)+(3.5·16)+(4.5·16)+(4.0·8)+(4.0·6)
= 26+56+14+56+72+32+24 = **280 → 2.80**. Capped by DQ3 → **2.5**.

**A and B are unchanged.** I re-ran the identical raw-hex sweep against both and neither has a
sub-4.5 text pair on a reachable element. B's `--st-missing` 4.35:1 remains latent-only, which is
the same reachability standard I applied to C — and which C fails on different rules, not on
that one.

### Independence note

While attempting to stage this section I opened a scratchpad file (`debate1.md`) that turned out
to be another agent's working artifact, not mine, and I saw a score block in it that differs from
my own on several criteria. I have disregarded it and have not moved any score toward it; every
number above is derived from evidence I computed in this round or the previous one, and my C2/C6
figures deliberately remain where my own analysis put them. Recording this because a judge who
silently absorbs another judge's numbers defeats the purpose of running three.

### Verdict: **HOLD the vote, REVISE the scores**

My vote was already Solution A, and the code has strengthened rather than weakened it. The
decisive difference I named in round 1 — that A was the only solution to recompute inherited
colour tokens instead of copying their comments — turns out to have been the *understated*
version of the finding. A did not just catch the `--st-missing` pair; A caught `#a39a88` at
2.8:1 on the reference range and the unit and deleted it, which is precisely the defect C
shipped. I was wrong about C's magnitude, not about A's rank, and I am correcting the magnitude.

I am not revising because I was in the minority. On claim 2 — where the reporting judge's
inference was wrong — I re-ran it and hold against the majority framing. I am revising on claim 1
because I ran a grep I should have run in my first sweep and it returned six live declarations
below 4.5:1 on a reference range and on the source line the result view always shows.

Second place moves from C to B: B 4.0, C 2.5.

**Merge note for the orchestrator:** the fix in C is a two-token substitution (`#a39a88` →
`--text-faint #6f685b` = 5.16:1 on page / 5.52:1 on card; `#8a93a0` → `--text-muted #5a6675` =
5.85:1 on card), both already defined in C's own `:root`. If the synthesis phase merges rather
than picks, C's state coverage and its legacy-path emergency caveat are worth taking and this
defect should not be the reason to discard them — but as shipped, C paints a reference range at
2.79:1.

---
DISQUALIFIERS: Solution A — none
DISQUALIFIERS: Solution B — none
DISQUALIFIERS: Solution C — DQ3 (`ui.css:519` `.k-cell-hint` `#a39a88` on `#ffffff` = 2.79:1 on
the reference range «طبیعی: 4.4–11» at `ManualEntry.jsx:72-74`; `ui.css:367` `.k-row-src`
`#8a93a0` on `#ffffff` = 3.11:1 on «منبع محدوده: …» at `ResultView.jsx:64`; plus `ui.css:489`,
`:491`, `:531`, `:562` at 2.79:1) — capped at 2.5

---
VOTE: Solution A
SCORES:
  Solution A: 4.2/5.0
  Solution B: 4.0/5.0
  Solution C: 2.5/5.0
CRITERIA:
 - Patient safety & clinical integrity: A=4.5 B=4.0 C=1.0
 - Persian / RTL correctness: A=4.0 B=4.5 C=4.0
 - Accessibility (WCAG 2.2 AA): A=4.5 B=4.0 C=1.0
 - Visual design quality & design-system coherence: A=3.5 B=4.5 C=3.5
 - Information architecture & UX: A=4.0 B=3.5 C=4.5
 - Code quality & maintainability: A=4.5 B=3.0 C=4.0
 - Verified working: A=4.0 B=4.0 C=4.0
---

