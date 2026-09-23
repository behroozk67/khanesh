# Baseline: Stage B (measured, 2026-09-22)

| What was measured | Tests | Pass | Fail | Todo |
|---|---|---|---|---|
| Working tree at `b9068df`, **before** Stage B (`npm test`), 129 rules | 559 | 540 | 0 | 19 |
| `b9068df` (`git archive` + `node_modules` junction) with the new `engine.test.js` dropped in (engine suite only) | 547 | 505 | **23** | 19 |
| Working tree **after** Stage B (`npm test`), 134 rules | 586 | 567 | 0 | 19 |

**Why the 23 red on `b9068df` are exactly the intended ones:**
- **22 behavioural guards:** `M171`, `M171b`, `M172`–`M172f`, `M173`–`M173e`, `M174`–`M174c`, `M174e`, `M175`–`M175e`.
- **`M104d`, changed on purpose:** its hash includes `qual`, and «Specific Gravity» moves from `unmapped` to `qual` (FR-017b).
  It was checked against `HEAD` with `cmp104.mjs`. On all six urine panels the findings and graded values are identical,
  except U4, which gains `urine_specific_gravity`. `qual` gains only that one key.

**Freezes, green on both trees:** `M171c` (serum cholesterol/uric acid), `M171d` (ten reference panels, hashes
measured on `b9068df`), `M174d`, `M175f` (dysmorphic RBC stays unmapped), `M175g` (collision).

**Rule ids:** 129 → 134. The diff adds exactly `urine_bilirubin_urobilinogen`, `urine_crystals`,
`urine_renal_tubular_cells`, `urine_specific_gravity` and `urine_squamous_contamination`, and removes nothing
(`ids-before.txt` / `ids-after.txt`).

**Probes:** `probe-before.txt` / `probe-after.txt`. Every row in research R1 now either fires its finding or sits in
`unmapped`. The one remaining silent `qual` row in the probe is `Yeast`, which is outside this spec's scope and is
recorded in P51.

## After the review round

| What was measured | Tests | Pass | Fail | Todo |
|---|---|---|---|---|
| Working tree after fixing medical B1–B4 and code #1–#9 (`npm test`) | 598 | 579 | 0 | 19 |
| `b9068df` with the final `engine.test.js` (engine suite only) | 559 | 507 | **33** | 19 |

The 33 red are the 22 Stage B guards, 10 of the 12 review guards (`M176`–`M176l`), and `M104d`.
`M176e` and `M176l` pass on `b9068df` because no reader existed there. They were red on the pre-fix Stage B tree, which is
the tree they guard (all 12 of `M176`–`M176l` were red there, measured).
`M104d` was re-hashed after the SG boundary change. All six urine panels now have findings identical to `b9068df`, and
`qual` gains only the specific-gravity key.
