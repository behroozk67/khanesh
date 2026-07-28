# Judge 3 of 3 — Khanesh `/app` (Tafsir) redesign evaluation

Spec: `.specs/reports/eval-spec.yaml` (khanesh-tafsir-redesign-eval-v1)
Baseline: `c:/Users/surface/Desktop/khanesh-project/khanesh/`
Judge: independent, no contact with judges 1 or 2.

---

## 0. Commands actually run (spec §required_preparation.commands_you_must_actually_run)

### Lint — all three

```
=== A LINT ===
> khanesh@0.0.0 lint
> oxlint
A_LINT_EXIT=0

=== B LINT ===
> khanesh@0.0.0 lint
> oxlint
B_LINT_EXIT=0

=== C LINT ===
> khanesh@0.0.0 lint
> oxlint
C_LINT_EXIT=0
```

All three clean (oxlint emits nothing on a clean run).

### Build — all three

```
===== BUILD a =====
vite v8.1.4 building client environment for production...
transforming...✓ 46 modules transformed.
dist/index.html                   0.76 kB │ gzip:  0.49 kB
dist/assets/index-CCJX9tFJ.css   18.13 kB │ gzip:  4.49 kB
dist/assets/index-rrjWSP7t.js   302.54 kB │ gzip: 95.10 kB
✓ built in 567ms          real 0m3.128s     EXIT_a=0

===== BUILD b =====
vite v8.1.4 building client environment for production...
transforming...✓ 31 modules transformed.
dist/index.html                   0.76 kB │ gzip:  0.49 kB
dist/assets/index-Bv_J5Tpt.css   23.77 kB │ gzip:  4.89 kB
dist/assets/index-CQ-hG44C.js   298.19 kB │ gzip: 94.12 kB
✓ built in 628ms          real 0m3.233s     EXIT_b=0

===== BUILD c =====
vite v8.1.4 building client environment for production...
transforming...✓ 42 modules transformed.
dist/index.html                   0.76 kB │ gzip:  0.49 kB
dist/assets/index-BSut-bFQ.css   23.25 kB │ gzip:  5.19 kB
dist/assets/index-BWAhfqC9.js   309.99 kB │ gzip: 96.19 kB
✓ built in 600ms          real 0m3.007s     EXIT_c=0
```

`Vazirmatn-VF.woff2` + `OFL.txt` present in `dist/fonts/` for all three (verified by `ls -R dist`).

### Dev server

Not run. Rendered-UX claims below are derived from source and CSS only, per spec
`optional_but_valuable` clause 2. No screenshots invented.

---

## 1. DISQUALIFIER SWEEP (criterion-blind, run before any aesthetic reading)

Method: grepped every solution for `details|summary|accordion|line-clamp|maxHeight|showMore|
truncate|collapsed|expanded`, `t.key`, `type="number"`, `user-scalable`, privacy copy, and every
`color:` declaration; computed WCAG relative luminance for every changed colour pair with a Node
script rather than eyeballing.

### Solution A — **none**

- DQ1: `ResultView.jsx:162-175` — `<details>` wraps a body-system group **only** when
  `hasOut === false` (`const hasOut = rows.some(t => t.abnormal)`). Any group with an abnormal row
  renders as a plain `<section>` with an `<h3>`. Emergency banner at `ResultView.jsx:339-348` is the
  first child of `.result`, outside every collapsible. No clamp/`maxHeight` anywhere in `ui.css`.
- DQ2: `t.name` only (`ResultView.jsx:91`), and `ResultView.jsx:316-318` drops any row whose `name`
  is missing rather than falling back to `key`.
- DQ3: no hard-coded text colour in `ui.css` except `#0b4a47` (10.07:1 on white, 8.92:1 on
  `--brand-soft`) and `#fff` on brand/emergency fills. Computed token table in §3 — worst clinical
  pair is `--ink-3 #6f685b` on `--page #faf7f0` = **5.16:1**. Nothing below 4.5.
- DQ4/DQ5: `MeasuredNote` (`ResultView.jsx:73-81`) prints «روی برگهٔ شما: <measured>» **inline on
  the CA/NA row itself**, plus `DerivedValues` hint «این عددها روی برگهٔ آزمایشگاه نیستند — ما
  آن‌ها را از روی مقادیر خودتان حساب کرده‌ایم» (`ResultView.jsx:238-240`). Strongest of the three.
- DQ6: `Scorecard.jsx:83` ring is `out / total` — a **count**, not a score;
  `Scorecard.jsx:8-12` explicitly refuses a health score. `buildVerdictContext`
  (`resultStates.js:86-102`) only distributes the engine's own `urgency`/`level`/`ctcaeGrade`;
  no value is ever compared to a range.
- DQ7/DQ9: all copy Persian. `LocalPreview.jsx:54-57` «روی دستگاه خودتان انجام می‌شود و جایی
  فرستاده نمی‌شود» is scoped to the *manual-entry local comparison*, which genuinely makes no
  network call — not a claim about the uploaded photo. `imageIntake.js:55` carries the opposite,
  correct caveat («این تابع فقط اندازه را کم می‌کند. برش یا سانسور…»). Not DQ9.
- DQ10: `index.css:135` `input, select, textarea, button { font-size: 16px }`; `ui.css:218`
  `.input { font-size: 16px }`; viewport is `width=device-width, initial-scale=1.0,
  viewport-fit=cover` — no `user-scalable`/`maximum-scale`.

### Solution B — **none**

- DQ1: only `<details>` is `Provenance` (`ResultView.jsx:243`), which is explanatory, never
  emergency. Urgency band `ResultView.jsx:335-346` is the first child, `role="alert"` when
  emergency. No clamp anywhere.
- DQ2: `t.name` (`ResultView.jsx:67`); rows without `name` dropped at `ResultView.jsx:307-309`.
- DQ3: **zero** hard-coded `color:` hexes outside `tokens.css` (verified by grep). Two computed
  weak spots, neither fires: `--text-03 #667085` on `--fill-03 #f5f1e7` = **4.41:1** (used for
  placeholder text, `components.css:143`, not clinical text), and `--st-missing #6b7280` on
  `#f1f3f5` = **4.35:1** — but `.k-status--missing` (`components.css:781`) is **unreachable**:
  `stateOf` (`resultStates.js:84-85`) only returns `STATES.missing` for a null `t`, and
  `ResultView.jsx:307` maps over an already-filtered array. Latent, not fired. The token's own
  comment claims «۴.۸:۱», which is wrong (B2 signal), inherited uncorrected from the baseline.
- DQ4/DQ5: `MEASURED_OF` + «روی برگهٔ شما» retained (`ResultView.jsx:169, 189-192`); derived hint
  at `ResultView.jsx:181-183`. Parity with baseline; no inline row-level note.
- DQ6: `stateOf` reads `level`/`ctcaeGrade`/`nearLimit` only (`resultStates.js:87-99`), explicitly
  never compares value to range. `evidenceOf` (`resultStates.js:147-159`) maps `t.source` to the
  engine's own three grading modes — a description of method, not a new verdict.
- DQ7/DQ9/DQ10: Persian throughout; no privacy copy at all; `base.css:76` +
  `components.css:137` `font-size: 1rem` (=16px, `:root` is `font-size:16px`).

### Solution C — **DQ3 fires** (three reachable pairs, all below 4.5:1)

Computed with the WCAG relative-luminance formula (`(L1+0.05)/(L2+0.05)`):

| element | file:line | colour | background | ratio |
|---|---|---|---|---|
| `.k-row-src` — «منبع محدوده: …» in the **engine result view** | `ui.css:367`, rendered `ResultView.jsx:64` | `#8a93a0` @11px | `--card #ffffff` | **3.11:1** |
| `.k-cell-hint` — «طبیعی: 4.4–11», i.e. the **reference range** | `ui.css:519`, rendered `ManualEntry.jsx:72-74` | `#a39a88` @10.5px | `#ffffff` | **2.79:1** |
| `.k-cell-unit` / `.k-local-unit` / `.k-gauge-ends` — the **unit next to a lab value** and the **range endpoints** on the gauge | `ui.css:489, 531, 562`; `ManualEntry.jsx:35`, `LocalReview.jsx:40, 63-66` | `#a39a88` | `#ffffff` | **2.79:1** |

Arithmetic for the worst pair, `#a39a88` on `#ffffff`:
`sR=0.639→0.3662, sG=0.604→0.3250, sB=0.533→0.2462`;
`L = .2126(.3662)+.7152(.3250)+.0722(.2462) = .0779+.2325+.0178 = .3282`;
`(1.0+.05)/(.3282+.05) = 1.05/.3782 = **2.79:1**`.
For `#8a93a0` on `#ffffff`: `L=.2839` → `1.05/.3339 = **3.14→3.11:1**` (computed 3.11).

DQ3's own wording names "a status label, a **test value**, a **reference range**, … or paragraph
text". `.k-cell-hint` *is* the reference range and `.k-row-src` *is* the citation attached to the
range in the engine result. Both fail. Notably, Solution A caught and removed this exact
`#a39a88` value, documenting it at `wt-a/khanesh/src/index.css:38-41` («#a39a88 (۲.۸:۱) … هر دو AA
را رد می‌کردند»); C carried it forward into new code.

C's other disqualifiers: DQ1 clean (`ResultView.jsx:79-83` — a group containing an emergency
verdict gets **no** collapse control at all, not merely default-open; comment at 76-78 is matched
by the code). DQ2 clean (`ResultView.jsx:325-326`). DQ4/DQ5 parity with baseline. DQ6 clean
(`resultStates.js:80-86` reads `level`/`ctcaeGrade` only). DQ7/DQ9/DQ10 clean.

### Shared regression, all three (not a DQ, scored under C1.5)

All three **deleted** the baseline's `UnitConversions`, `Preanalytical` and `GuidelineSources`
blocks (baseline `ResultView.jsx:214, 245, 270`, wired at `393, 443, 446`). Verified by
`grep -rn "unitConversions|preanalytical|guidelines|substituted"` returning **zero hits** in all
three worktrees. `.claude/rules/frontend.md` calls `unitConversions` load-bearing: a sheet printing
`48 mmol/mol` against a result of `6.54%` "look[s] like a mistake" without that row. Since it is
uniform, it does not separate them — but it lowers C1 for all three.


---

## 2. FILE INVENTORY (baseline vs solution)

Baseline `khanesh/src` = 2490 lines across 11 files; largest component `Tafsir.jsx` 1262,
`ResultView.jsx` 591; **210** inline `style={{...}}` / `style={s....}` / `style={S....}` uses.

| | files | total lines | largest component | inline styles left | CSS files |
|---|---|---|---|---|---|
| baseline | 11 | 2490 | Tafsir 1262 | 210 | index.css 94 |
| **A** | 24 | 3737 | ResultView 473 / Tafsir 416 | **4** | index.css 178 + ui.css 515 |
| **B** | 13 | 3717 | **Tafsir 1382** (component body approx. 868, starts line 514) | **3** | tokens 128 + base 137 + components 962 |
| **C** | 21 | 3853 | ui.css 601 / Tafsir 526 / ResultView 492 | **30** | index.css 171 + ui.css 601 |

`package.json` is byte-identical to baseline in all three (diff shows only CRLF/LF) - **no new
dependencies anywhere**.

---

## 3. C1 - Patient safety & clinical integrity (weight 26)

**Shared, all three (parity, no differentiator):** `has_critical` read verbatim, never recomputed;
`hasEngine` gates the "fixed rules" provenance copy; the client-side disclaimer is a hard-coded
constant; no green all-clear banner; `unmatched_abnormal` keeps its own copy and its own cool-violet
state; `missing` keeps an action colour + dashed border; unknown engine key falls into «سایر»;
rows without `name` are dropped rather than falling back to `key`; N11 `mountedRef.current = true`
on mount with the resume effect kept separate (A `Tafsir.jsx:62-64`, B `545-547`, C `73-75`);
`AbortController` cleanup on unmount; `localStorage` wrapped in try/catch (`analyzeJob.js:29-38`).
All three deleted `UnitConversions` / `Preanalytical` / `GuidelineSources` (section 1, shared
regression). All three carry the same latent inaccuracy: `unmatchedRows = tests.filter(t =>
t.abnormal)` marks *every* abnormal test as unmatched whenever the pattern is present
(A `ResultView.jsx:331`, B `319`, C `336`).

**A - 4.5.** Strictly stronger than baseline in three places, each verifiable:

1. `MeasuredNote` (`ResultView.jsx:73-81`, used at `104`) prints
   «روی برگهٔ شما: <measured> — عددِ بالا با آلبومینِ شما تصحیح شده» **on the CA/NA row itself**,
   not only in the derived-values block. B and C keep only the baseline's block-level version.
2. `rangeMath.js:19-28` refuses to parse anything that is not two finite numbers - qualitative
   («مثبت»), titre («1/320») and one-sided («<200») ranges get **no band**, while the row still
   renders its number and range as text (`ResultView.jsx:96-108`). That is exactly spec C1.2 and
   the N6 lesson, implemented rather than asserted.
3. `ResultView.jsx:411-416` - when `urgency === "emergency"`, the all-tests block adds
   «فوریتِ بالای صفحه برای کلِ برگه است و با واژهٔ هیچ ردیفی لغو نمی‌شود», closing the exact hole
   that per-row severity opens.

Also `Tafsir.jsx:376-383`: the manual-entry local preview is suppressed once an engine result is
on screen, so the REF-vs-backend drift (TSH 5.0 vs 4.5) can no longer be read as a contradiction -
a real C1.4 improvement - and `LocalPreview.jsx:79` labels the preview
«این‌ها قاعده‌های سادهٔ همین صفحه‌اند، نه خروجیِ موتور قواعد».
Cost: the «آیا درست خواندیم؟» confirmation now sits *below* the Scorecard
(`ResultView.jsx:352-375`) - still before summary/interpretation, and the Scorecard links to it
(«یک نگاه به آن‌ها بیندازید», `Scorecard.jsx:123-129`) - but this is the C5.1 weakening.

**B - 4.0.** Realises the recon's named "highest-value fix" (`code-recon.md:341`) most fully:
`resultStates.js:84-100` maps `level`/`ctcaeGrade` to a four-step ladder
(mild/moderate/marked/critical) and `ResultView.jsx:76` renders `t.fa` verbatim as its own line, so
a CTCAE-3 potassium and a marginally low HDL no longer both read «امروز». Urgency is a single band
at the top (`ResultView.jsx:330-346`), `role="alert"` only for emergency. Confirmation stays in
second position. Deduction: no inline measured-value note; no range visual at all; and `evidenceOf`
(`resultStates.js:147-159`) invents a three-bar "evidence strength" ramp from a substring test
(`src.includes("CTCAE")`) - not a clinical verdict, so not DQ6, but a novel client-side confidence
signal attached to a clinical row whose correctness depends on an undocumented string format.

**C - 3.5.** Best legacy-path posture of the three: `ResultView.jsx:396-402` renders a persistent,
uncollapsed «قاعده‌های بالینی روی این نتیجه اجرا نشده» notice when `!hasEngine`, and `374-379` adds
a provenance sentence *inside* the emergency banner on that path. A and B state the same fact only
inside a `<details>` a patient may never open. `ResultView.jsx:79, 92-96`: a group containing an
emergency verdict is rendered with **no collapse control at all** rather than merely default-open -
the strictest DQ1 reading of the three. Deductions: `ctcaeGrade` is serialized by the server and
never reaches the row (`TestRow`, `ResultView.jsx:49-67` has no grade output), so the engine's
severity number is discarded; `general_recommendations` are hoisted above the
"did we read this right?" confirmation (`ResultView.jsx:387-421`); and `.k-row-src` - the
range-source citation *in the engine result view* - is painted at **3.11:1** (section 1).

**C1: A=4.5 · B=4.0 · C=3.5**

---

## 4. C2 - Persian / RTL correctness (weight 14)

Grep counts of physical vs logical CSS properties in changed files:

| | physical margin/padding left+right | margin/padding-inline | bare `left:`/`right:` | `inset-inline` |
|---|---|---|---|---|
| A | **0** | 4 | 0 | 4 |
| B | 2 (`components.css`) | 10 | 0 | 5 |
| C | **0** | 11 | 0 | 2 |

All three: `index.html` still `lang="fa" dir="rtl"`; self-hosted `@font-face` for Vazirmatn
(A `index.css:20-26`, B `base.css`, C `index.css:21-27`) with `Vazirmatn-VF.woff2` emitted to
`dist/fonts/` (verified by `ls -R dist`); `.num, .unit, .range { unicode-bidi: isolate; direction:
ltr; font-variant-numeric: tabular-nums }` retained verbatim (A `index.css:122-126`,
B `base.css:64-68`, C `index.css:118-122`); every value input is `type="text" + inputMode="decimal"
+ normalizeDigits` on change (A `EntryGrid.jsx:94-97, 108-111`; B `Tafsir.jsx:957-975`;
C `ManualEntry.jsx:41-52, 58-68`) - no `type="number"` regression anywhere; body `line-height: 1.8`.

Register: I grepped for the baseline's informal imperatives («وارد کن», «آپلود کن», ...) -
**zero hits in all three**, against 24/25/37 formal «...کنید». All three fixed the register
inconsistency the spec flagged as "real work".

Three quoted strings, judged: A `ResultView.jsx:186-188` «خارج از محدودهٔ مرجع است، ولی ما الگوی
مشخصی برایش نداریم که بتوانیم با اطمینان توضیحش دهیم» - idiomatic, not translated word order;
B `Tafsir.jsx:1081-1085` «اگر این دو با هم اختلاف داشتند، آنچه معتبر است تفسیرِ هوشمند است» - the
clearest preview-vs-engine framing of the three; C `ResultView.jsx:306-308` «پیش از هر کاری، در
بخشِ «اعدادی که از عکس شما خواندیم» یک نگاه بیندازید» - idiomatic.

Differentiator, on the spec's own C2 tie-break ("breadth of numeric/bidi surfaces beats elegance"):
A is the only solution that adds a *new numeric graphic* and it isolates it correctly -
`RangeBand.jsx:38-40` wraps both scale endpoints in `.num`, and `RangeBand.jsx:10-18` documents
why `inset-inline-start` replaces `left` and why `translateX(-50%)` is unusable in RTL. C's
`k-gauge-ends` (`LocalReview.jsx:63-66`) does the same for the local gauge. B adds no numeric
graphic, so it has nothing extra to get right - and it has the only two physical padding
declarations.

**C2: A=4.5 · B=4.0 · C=4.0**

---

## 5. C3 - Accessibility WCAG 2.2 AA (weight 14)

Computed with `(L1+0.05)/(L2+0.05)` on WCAG relative luminance, each foreground paired with the
surface it is *actually* painted on (card, not page).

**A** - every changed pair passes; worst four shown:

```
--ink-3 #6f685b on --page   #faf7f0 = 5.16:1
--ink-3 #6f685b on --sunken #f7f8fa = 5.19:1
--st-near #0f6e6e on #e6f4f3        = 5.35:1
--st-emergency-ink #b3261e on #fdecea = 5.72:1
(--st-normal 5.75 · --st-out 7.23 · --st-unmatched 6.26 · white-on-emergency 6.54 ·
 --st-missing #4a5568 on #eef1f4 6.64 · brand 5.82 · warn 5.77 · #0b4a47 on brand-soft 8.92)
```

A is the only solution that **found and fixed** the baseline's failing `missing` pair, and says so
with the correct arithmetic at `index.css:64-67` («جفتِ قبلی #6b7280 روی #f1f3f5 برابر ۴.۴:۱ بود —
مردود»). Focus: `index.css:143-147` `:focus-visible { outline: 3px solid var(--brand) }` - #2f6f6b
against white = 5.82:1, far above the 3:1 non-text rule. `prefers-reduced-motion` handled in both
directions (`index.css:168, 172`). `role="alert"` on the emergency banner (`ResultView.jsx:340`),
partial-page warning (`363`), errors (`UploadCard.jsx:199, 207`); `role="status" aria-live="polite"`
on the progress box (`UploadCard.jsx:175`). `RangeBand` is `aria-hidden="true"` with a documented
textual equivalent one line above - correct, not a gap. Two deductions: the progress live region
unmounts when the result renders (the C3-3.0 anchor's "attached to a node that unmounts"), and
`.seg-group--sm .seg` is 38px (`ui.css:153`), under the 44x44 target.

**B** - **zero** hard-coded `color:` outside `tokens.css` (grep). Two computed weak spots:

```
--text-03 #667085 on --fill-03 #f5f1e7 = 4.41:1   (placeholder text, components.css:143)
--st-missing #6b7280 on #f1f3f5        = 4.35:1   (unreachable - see section 1)
```

The token comment claims «۴.۸:۱» for the second. That is a C3.2 violation: the ratio was copied,
not recomputed, and it is wrong. B's compensating strength is real and is the spec's explicit 5.0
property: `Tafsir.jsx:812` `<div className="k-sr" role="status" aria-live="polite">{liveMsg}</div>`
is **always mounted**, with `liveMsg` (`790-799`) covering the whole lifecycle
(progress -> error -> «تفسیر آماده شد.»). Neither A nor C has a persistent region. Focus ring
`base.css:90-95` outline `#16202c` = 16.4:1. Deduction: `.k-btn--sm` is 36px (`components.css:293`)
- the image *delete* button, one of the controls the spec names explicitly.

**C** - **DQ3 fires.** Three reachable clinical-text pairs below 4.5:1 (full table and arithmetic
in section 1): the reference range «طبیعی: 4.4–11» at **2.79:1**, the unit beside every typed lab
value at **2.79:1**, the gauge's range endpoints at **2.79:1**, and the engine result's
range-source line at **3.11:1**. C also inherits the same false «۴.۸:۱» comment on `--st-missing`.
Everything else in C's a11y work is good and should be said: every button is >=44px
(`ui.css:120-121` `.k-btn-sm { min-height: 44px }`, `.k-btn-icon { 44x44 }`) - the only solution
with no sub-44 target; focus is moved to the result heading on completion with
`prefers-reduced-motion` respected (`Tafsir.jsx:113-120`, `ResultView.jsx:350`
`tabIndex={-1} ref={headingRef}`); `role="alert"` / `role="status"` used across 8 distinct states.
But C3.1 is unambiguous: computed numbers decide this criterion, and four of C's computed numbers
fail on text a patient must read to check their own result.

**C3: A=4.5 · B=4.0 · C=2.0**

---

## 6. C4 - Visual design quality & design-system coherence (weight 16)

Measured, not impressionistic. Distinct `font-size` values and raw-px spacing declarations in each
solution's CSS:

| | distinct font-size values | raw-px in padding/margin/gap | hard-coded hex outside token block | inline styles |
|---|---|---|---|---|
| A | **16** (10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 17, 26, 28, 32px, .8em) | **88** | 5 (`#0b4a47` x2, `#fff` x3) | 4 |
| B | **3 literals + 9 named tokens** (`--t-display/h1/h2/h3/body/sm/xs/2xs/micro`) | **7** | **0** | 3 |
| C | **17** (10.5 ... 30px) | **21** | **13** | 30 |

B is the only solution that built a *complete* token layer: `tokens.css:100-116` a bounded
9-step type scale with `--lh-tight/body/prose` and four weights; `tokens.css:80-82` `--s1..--s10`
on a 4px grid with fluid values reserved for page gutters only; `--r1..--r5`, `--e1..--e3`,
`--dur-1..3`, `--tap: 44px`, and `--safe-b/l/r` with a written justification for why those three
names are deliberately physical. Its stated rule «هیچ هگزی بیرون از این فایل نوشته نمی‌شود» is
**true in the code** - grep finds zero. That is the C4 5.0 anchor ("named tokens for colour,
spacing, radius, elevation, and type, defined once and referenced everywhere"), and the spec's C4
tie-break ("prefer coherence over ambition... consistency IS the aesthetic") points here.

A is the 3.0-to-4.0 case the rubric describes exactly: "colour tokens exist while
spacing/radius/shadow/type remain ad-hoc". Its colour layer is genuinely single-source
(`index.css:29-77`, and `resultStates.js` was stripped of every hex), radius and shadow are
tokenised, but 16 raw font sizes including 10.5/11.5/12.5/13.5/14.5px is not a type scale, and 88
raw-px spacing values is not a spacing scale. Against that, A is the only one whose *visual*
invention earns its place under C4.1: the Scorecard ring encodes a **count**, not a score
(`Scorecard.jsx:83, 96-98`, with an explicit refusal of health-score/biological-age at `8-12`), and
the range band is informative rather than decorative. Nothing in A delays a number or drops
contrast.

C is the weakest here, and it contradicts its own file header. `index.css:8-14` states that colour
now has one source of truth; `ui.css` then hard-codes 13 colours including `#a39a88` five times and
`#8a93a0`, plus 30 residual inline styles with magic numbers (`style={{ marginTop: 12 }}`,
`style={{ marginBottom: 8 }}`). Two sources of truth were reintroduced in the same change that
claimed to remove them - a B2 signal, and the mechanism behind its DQ3. Its step-numbered card IA
and sticky mobile dock are genuinely good product thinking, which is why this is 3.0 and not lower.

None of the three imported a marketing pattern: no pricing, membership, referral, streak, badge,
testimonial or gamified score anywhere (grepped). All three keep `color-scheme: light`.

**C4: A=3.5 · B=4.5 · C=3.0**

---

## 7. C5 - Information architecture & UX (weight 16)

**A - three-level path, and the only range visualisation.**
Level 1 `Scorecard.jsx:85-138` (count + engine urgency chip + one card per body system);
level 2 `SystemCard` cards link to `#sys-${key}` anchors targeting `ResultView.jsx:164/171`
(`tabIndex={-1}` so focus follows the anchor); level 3 `TestRow` with value, range, band, CTCAE
pips, `refSource`. The band degrades correctly for all four range shapes the spec names -
two-sided renders, one-sided/qualitative/titre return `null` from `parseRange` and the row still
prints its number (`rangeMath.js:19-28`, `ResultView.jsx:96-108`). Category counts survive
(`CountLine`, `120-136`). States present: resume (`UploadCard.jsx:121`), real per-page
`progressText` (`176`), compression feedback in orig-KB (`64`), parseError branch (`205-243`),
`pages.failed` (`ResultView.jsx:362`), legacy no-`_engine` (Scorecard and rows suppressed, `352`).
Weakness: the entry view is still a linear scroll - ProfileCard -> 46-input EntryGrid ->
UploadCard (`Tafsir.jsx:351-399`) - so a photo-path user still scrolls the whole manual form, the
same as baseline; and the confirmation moved below the Scorecard (C5.1).

**B - informative rows, thin navigation.** Band -> warnings -> confirmation -> summary ->
interpretation -> unmatched -> recommendations -> all tests -> derived -> sources. No
summary/at-a-glance layer beyond one sentence (`ResultView.jsx:398-402`), no anchors, no range
visual, and the entry view is unchanged in structure from baseline (one 868-line component
rendering every card in sequence). What B does better than either: the per-row verdict is the most
informative of the three (`t.fa` verbatim + four-step chip + CTCAE number + grading-mode label),
and the legend renders only states actually present (`ResultView.jsx:322-326`) instead of a fixed
red-containing key.

**C - the most designed states, no range visual.** Entry IA is restructured into numbered steps
(profile, upload, manual, «۳ تفسیر» at `Tafsir.jsx:392-400`) with `ManualEntry` collapsible
(`ManualEntry.jsx:120`), which is the only solution that spares a photo-path user the 46-input wall.
A sticky mobile action dock appears only when the CTA scrolls off (`Tafsir.jsx:355`,
`ui.css:574`). Dedicated components for states the others inline: `AnalyzePanel.jsx` (progress +
`etaText` + cancel + resume + error), `ParseErrorView.jsx` (labelled «حالت S8» and reusing the same
`ExtractedTests` renderer rather than a second, weaker copy), `ResultBoundary.jsx`,
`ResumeOffer` with a two-step confirm-clear, a neonate notice in `ProfileCard.jsx:86`, and
`imgProgress` during compression. Against that: no range visualisation in the engine result at all,
and recommendations were hoisted above the confirmation step.

Neither A, B nor C handles a degraded/offline connection - `navigator.onLine` appears in none of
them. Parity.

Per the C5 tie-break ("prefer the one that designed MORE of the real states"), C edges A on state
coverage while A edges C on the result-page path and the range visual; they land level. B trails on
navigation.

**C5: A=4.0 · B=3.5 · C=4.0**

---

## 8. C6 - Code quality & maintainability (weight 8)

**A - 4.5.** 24 files, no file above 515 lines; the 1262-line baseline component became
`Tafsir.jsx` 416 (state + handlers) plus `ProfileCard` 116, `EntryGrid` 161, `LocalPreview` 151,
`UploadCard` 254, `Scorecard` 140, `ExtractedTests` 41, `RangeBand` 44, with pure helpers split out
(`rangeMath.js` 55, `imageIntake.js` 79, `safeText.js` 18, `labRefs.js` 389). Inline styles
210 -> **4**, and the four remaining are CSS-custom-property passthroughs
(`RangeBand.jsx:33, 35`, `Scorecard.jsx:93`) - the one legitimate use. Three `useEffect`s, all
verified: `62-64` mount/abort (sets `mountedRef.current = true` on mount, N11-correct),
`71-` resume-poll (deliberately separate, comment at `68`), `101-` (comment at `99` states it
touches neither ref). Persian safeguard comments carried forward *and extended* with the mechanical
reason each guard exists.

**B - 3.0.** The design-system work is the best of the three and the component work is the worst.
`Tafsir.jsx` is **1382 lines - larger than the 1262-line baseline** it was meant to improve, with
the `Tafsir()` component body running from line 514 to the end (approx. 868 lines) and still
containing `REF`, `statusOf`, `trendOf`, `comboInsights`, `compressImage`, both input paths and the
whole result plumbing. The C6 1.0 anchor names this case verbatim ("a larger single component than
the 1262-line baseline"). Only `ResultView.jsx` and `Segmented.jsx` were extracted; `Logo.jsx` was
deleted and replaced by an inline `Mark()` at `Tafsir.jsx:504`. Effects and cleanup are correct
(`545-547`, `554-`, `583-`, same N11 pattern), lint is clean, and the CSS layer is exemplary - so
this is 3.0 ("reasonable ... but with residue"), not lower.

**C - 3.5.** Good decomposition (21 files, largest JSX 526) and a genuine state-per-component
split, but the styling consolidation is half-done: **30** inline `style={{...}}` remain, several
with magic numbers, alongside 13 hard-coded hexes in `ui.css` - the 3.0 anchor's "partial inline
style removal", and the direct cause of its DQ3.

All three: zero new dependencies (`package.json` byte-identical to baseline modulo line endings),
`asText`/`asList` retained, an error boundary around result rendering retained, no dead files left
from the baseline.

**C6: A=4.5 · B=3.0 · C=3.5**

---

## 9. C7 - Verified working (weight 6)

Lint clean and build exit 0 for all three, with `dist/` and `dist/fonts/Vazirmatn-VF.woff2`
emitted - full output pasted in section 0. Gzip: A 95.10 kB JS / 4.49 kB CSS; B 94.12 / 4.89;
C 96.19 / 5.19. All within 2 kB of each other; none is a bundle-cost differentiator.

**I did not run a dev server**, so I cannot assert "no console errors on first paint" or exercise
either input path in a browser for any of the three. Per spec `handling_uncertainty` I state that
plainly rather than guess. The rubric's 5.0 requires runtime verification I do not have, so all
three sit at the same level: green build, green lint, runtime unverified.

**C7: A=4.0 · B=4.0 · C=4.0**

---

## 10. MANDATORY DISSENT CHECK

**Strongest thing B does better than A:** B's `src/styles/tokens.css` is the only complete design
system in the three - a bounded 9-step type scale (`tokens.css:100-116`), a `--s1..--s10` spacing
scale, and **zero** hex literals outside that file, against A's 16 ad-hoc font sizes and 88 raw-px
spacing declarations. And `resultStates.js:84-100` gives a four-step per-test severity ladder where
A collapses to out/emergency, which is a fuller answer to the recon's stated
"highest-value fix" (`code-recon.md:341`).

**Strongest thing C does better than A:** C is the only solution that surfaces the legacy
no-`_engine` warning *outside* a disclosure - a persistent notice at `ResultView.jsx:396-402` plus a
provenance sentence inside the emergency banner itself at `374-379`. A (and B) state the same fact
only inside a collapsed `<details>` (A `ResultView.jsx:291-301`) that a patient may never open, so
on the legacy path A's page is silently less honest than C's. C is also the only solution with no
interactive target under 44x44.

Neither displaces the vote. A wins on the criterion with the largest weight and on the two
criteria where a defect reaches the patient directly (C1, C3), and it is the only solution whose
safety properties are *measurably stronger* than baseline rather than merely preserved.

---

## 11. WEIGHTED TOTALS

```
        C1x26   C2x14   C3x14   C4x16   C5x16   C6x8    C7x6      total/100
A       4.5     4.5     4.5     3.5     4.0     4.5     4.0    =  4.23 -> 4.2
B       4.0     4.0     4.0     4.5     3.5     3.0     4.0    =  3.92 -> 3.9
C       3.5     4.0     2.0     3.0     4.0     3.5     4.0    =  3.39 -> 3.4  <- capped
```

Solution C fires **DQ3**, so its overall is capped at **2.5** (uncapped weighted sum 3.4).

**Decisive difference:** Solution A is the only one whose clinical-text contrast is *computed and
passing on every pair* (worst 5.16:1) - it even found and fixed the baseline's failing
`--st-missing` pair at `index.css:64-67` - while C ships the patient's reference range at 2.79:1 and
B ships a token whose stated 4.8:1 is actually 4.35:1; and A is the only one that renders the
as-printed CA/NA value on the row itself (`ResultView.jsx:73-81`) and the only one whose range
visual refuses to draw a bar for a qualitative or titre result (`rangeMath.js:19-28`).

---

## 12. DISQUALIFIERS (summary)

- **Solution A: none**
- **Solution B: none**
- **Solution C: DQ3** — `wt-c/khanesh/src/ui.css:519` `.k-cell-hint { color: #a39a88 }` renders the
  reference range «طبیعی: 4.4–11» (`ManualEntry.jsx:72-74`) at **2.79:1**; `ui.css:367`
  `.k-row-src { color: #8a93a0 }` renders «منبع محدوده: …» in the engine result view
  (`ResultView.jsx:64`) at **3.11:1**; `ui.css:489/531/562` puts the same `#a39a88` on the unit
  beside every lab value and on the gauge's range endpoints.

---
VOTE: Solution A
SCORES:
  Solution A: 4.2/5.0
  Solution B: 3.9/5.0
  Solution C: 2.5/5.0
CRITERIA:
 - Patient safety & clinical integrity: A=4.5 B=4.0 C=3.5
 - Persian / RTL correctness: A=4.5 B=4.0 C=4.0
 - Accessibility (WCAG 2.2 AA): A=4.5 B=4.0 C=2.0
 - Visual design quality & design-system coherence: A=3.5 B=4.5 C=3.0
 - Information architecture & UX: A=4.0 B=3.5 C=4.0
 - Code quality & maintainability: A=4.5 B=3.0 C=3.5
 - Verified working: A=4.0 B=4.0 C=4.0
---

---

# DEBATE ROUND 1

Both disputed claims re-checked against source. I raised Claim 1 myself in my original report; on
re-examination **I was wrong about it**, for a reason the spec itself names. Details below.

## VERIFIED CLAIM 1 — DQ3 against Solution C: **DOES NOT FIRE.** I withdraw it.

The ratios are right. My own recomputation, independent of the numbers in the round message:

```
#a39a88 on #ffffff = 2.79:1     (.k-cell-hint, .k-cell-unit, .k-local-unit, .k-gauge-ends)
#8a93a0 on #ffffff = 3.11:1     (.k-row-src)
```

Reachability is also right — I confirmed `.k-cell-hint` is rendered **unconditionally** for every
row of the manual-entry grid (`ManualEntry.jsx:72-74`, no guard), and it carries the reference range
«طبیعی: 4.4–11»; `.k-row-src` renders whenever `t.refSource` is present
(`ResultView.jsx:64`), which is the common case in the engine result.

**But the colours are not C's.** They are the baseline's, transposed unchanged:

| | baseline | Solution C |
|---|---|---|
| reference-range hint | `Tafsir.jsx:1179` `refHint: { fontSize: 10.5, color: "#a39a88" }` | `ui.css:519` `.k-cell-hint { font-size: 10.5px; color: #a39a88 }` |
| range-source line | `ResultView.jsx:528` `rowSrc: { fontSize: 11, color: "#8a93a0" }` | `ui.css:367` `.k-row-src { font-size: 11px; color: #8a93a0 }` |
| unit beside a value | `Tafsir.jsx:1164` `unitInline: { color: "#a39a88" }` | `ui.css:489` `.k-cell-unit { color: #a39a88 }` |
| «قبلی» tag | `Tafsir.jsx:1165` `prevTag: { color: "#a39a88" }` | `ui.css:491` `.k-cell-tag { color: #a39a88 }` |

Same hex, same font-size, same white card behind it. What a patient sees is byte-identical to what
they saw before the redesign. DQ3 is scoped to "any **new or changed** colour token"; moving a
declaration from an inline style object into a stylesheet changes neither the value nor the rendered
result. And bias warning **B7** is explicit: *"Do not penalise a solution for pre-existing conditions
it did not touch. Do penalise it for making them worse."* C did not make it worse.

I had this evidence in front of me in round 1 — I wrote in §1 that "Solution A caught and removed
this exact `#a39a88` value … C carried it forward" — and I still fired the disqualifier. Carrying
forward is precisely what B7 says is not a disqualifier. That was my error, not a close call, and
the 2.5 cap I applied to Solution C is withdrawn.

**What survives, and where it belongs:** this is a **C3 finding, not a DQ**. C is the only solution
that left an inherited AA failure standing on text a patient reads to check their own number, while
both competitors fixed it in the same change — A replaced it with `--ink-3 #6f685b` (**5.52:1** on
card) and B with `--text-03 #667085` (**4.97:1**). C's page still fails AA on its reference range;
it just isn't C's regression. I raise C's **C3 from 2.0 to 2.5** — a real, computed, unfixed AA
failure, tempered by the fact that it is inherited and by C's genuinely best-in-class 44×44 targets
(`ui.css:120-121`), focus-to-heading on completion (`Tafsir.jsx:113-120`), and 8 announced states.
Removing the cap moves C's overall from 2.5 to its true weighted sum.

## VERIFIED CLAIM 2 — "only C renders `degraded`": **REFUTED as stated.**

My grep counts match the claim's: `degraded` in JSX = **0 in A, 0 in B, 3 in C**
(`AnalyzePanel.jsx:29, 35, 69`). But that grep is measuring the wrong thing, and I verified why:

`analyzeJob.js` `progressText()` — identical in the baseline and all three worktrees — makes
`degraded` its **second branch, before every other case**:

```js
export function progressText(p) {
  if (!p) return "در حال آماده‌سازی…";
  if (p.degraded) return "اتصال ضعیف است — تحلیل روی سرور ادامه دارد. دوباره تلاش می‌کنیم…";
  ...
}
```
(A `analyzeJob.js:149`, B `:146`, C `:146`.)

Every solution renders that function's output:
- **A** — `UploadCard.jsx:176` `<p className="progress-text">{progressText(aiProgress)}</p>`
- **B** — `Tafsir.jsx:1303` visible progress text, **and** `Tafsir.jsx:793` inside `liveMsg`, so B is
  the only solution that also *announces* the degraded state through its persistent
  `aria-live="polite"` region (`Tafsir.jsx:812`)
- **C** — `AnalyzePanel.jsx:30` via `progressText`, **plus** a dedicated `k-notice k-notice-warn`
  block at `68-75` and an `is-degraded` class on the container at `35`

So no solution "silently drops" the state; the Persian degraded sentence reaches the user in all
three. The spec's own C5 checklist asks for exactly this — "Real per-page progress retained
(`analyzeJob.js` `progressText`), not a fake percentage bar" — and all three retain it.

What is true is narrower: **C gives the state a dedicated visual treatment** with better copy
(«یک تونل یا آسانسور، تحلیلِ شکست‌خورده نیست» — reassurance that a lift is not a failed analysis),
where A and B give it one swapped sentence. That is a real edge for C, and it is already the reason
C tied A at C5=4.0 in round 1 ("the most designed states"). It does not move a score.

I must correct one sentence of my own round-1 report: I wrote *"Neither A, B nor C handles a
degraded/offline connection — `navigator.onLine` appears in none of them. Parity."* The
`navigator.onLine` test was the wrong probe; this codebase signals degradation through the job
poller, not the browser API. All three handle it; C handles it best. The C5 scores stand.

## Revised totals

```
        C1x26   C2x14   C3x14   C4x16   C5x16   C6x8    C7x6      total/100
A       4.5     4.5     4.5     3.5     4.0     4.5     4.0    =  4.23 -> 4.2
B       4.0     4.0     4.0     4.5     3.5     3.0     4.0    =  3.92 -> 3.9
C       3.5     4.0     2.5     3.0     4.0     3.5     4.0    =  3.46 -> 3.5   (cap withdrawn)
```

Only C changes: C3 2.0 -> 2.5, and the DQ3 cap is removed, so 2.5 -> 3.5.

## HOLD — vote unchanged: Solution A

Withdrawing my own disqualifier raises C from 2.5 to 3.5 and does not reach A's 4.2. The ranking was
never resting on the cap: on the uncapped sums from round 1, A led C by 4.23 to 3.39. A wins on the
26-weight criterion (`MeasuredNote` on the CA/NA row itself, `ResultView.jsx:73-81`; a range visual
that refuses to draw a bar for a qualitative or titre result, `rangeMath.js:19-28`; the
emergency-does-not-get-cancelled-by-a-row-label sentence at `ResultView.jsx:411-416`), and it is now
the *only* solution whose clinical text passes AA on every computed pair — the pairs C left at
2.79:1 are ones A actively repaired (`index.css:38-41, 64-67`), which is a delta against the same
baseline rather than a penalty for inheriting it.

The correction does change what I would say about C: it is a stronger solution than my round-1
number implied, and the gap to B is now 0.4 rather than 1.4.

---
VOTE: Solution A
SCORES:
  Solution A: 4.2/5.0
  Solution B: 3.9/5.0
  Solution C: 3.5/5.0
CRITERIA:
 - Patient safety & clinical integrity: A=4.5 B=4.0 C=3.5
 - Persian / RTL correctness: A=4.5 B=4.0 C=4.0
 - Accessibility (WCAG 2.2 AA): A=4.5 B=4.0 C=2.5
 - Visual design quality & design-system coherence: A=3.5 B=4.5 C=3.0
 - Information architecture & UX: A=4.0 B=3.5 C=4.0
 - Code quality & maintainability: A=4.5 B=3.0 C=3.5
 - Verified working: A=4.0 B=4.0 C=4.0
---
