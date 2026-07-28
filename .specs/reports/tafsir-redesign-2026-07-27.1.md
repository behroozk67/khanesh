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
