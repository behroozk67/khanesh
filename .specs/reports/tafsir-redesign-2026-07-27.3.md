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

