# Quickstart: validating specs/026

Run everything from `khanesh-server/`.

## 1. Baseline

Run `npm test` on `HEAD` and record the pass and fail counts. Do not quote an older number; re-measure it. On the implementation tree, the count may only rise by the new tests.

## 2. Probe diff, in two stages

The first stage covers US1–US5, while TSH is still 0.5–4.5:

```bash
node ../specs/026-thyroid-ch42/snapshots/probe_ch42.mjs > ../specs/026-thyroid-ch42/snapshots/after_us1-5.txt
diff ../specs/026-thyroid-ch42/snapshots/before.txt ../specs/026-thyroid-ch42/snapshots/after_us1-5.txt
```

These are the only expected changes:

| Panel | Expected |
|---|---|
| T2 tsh 9.9 | unchanged |
| T2 tsh 10, 14 | C3 text; urgency `routine` |
| T3 tsh 0.05 | C4 text |
| T3 tsh 0.2 | unchanged |
| T4 hypo-cond tsh 0.2 | C1; no «گریوز» as the first explanation |
| T4 hypo-cond tsh 8 / 14 | C2 (14 with «خیلی بالاتر»); no C3 stacked |
| T4 hypo-cond tsh 2 | no finding |
| T4 hypo-cond tpo high | C5 tail |
| T6 preg tpo high | C6 tail |
| T7 tg alone | `thyroid_thyroglobulin` with C7 + the «absent» anti-Tg sentence; Tg not in `unmapped` |
| T7 tg + antitg pos (cancer) | Tg sentence, then the unchanged anti-Tg cancer sentence |
| **T7 tg + antitg pos nocond** | **still the cancer-context anti-Tg text**, never «هاشیموتو… اغلب فقط پیگیری» (FR-004a) |
| T7 antitg pos alone | unchanged |
| T9 neonate 2d | C8 appended; urgency `soon` |
| T9 neonate 10d | unchanged |
| all others | byte-identical |

The second stage covers US6, in its own commit:

```bash
node ../specs/026-thyroid-ch42/snapshots/probe_ch42.mjs > ../specs/026-thyroid-ch42/snapshots/after.txt
diff ../specs/026-thyroid-ch42/snapshots/after_us1-5.txt ../specs/026-thyroid-ch42/snapshots/after.txt
```

The diff may contain only:

- `0.5–4.5` changed to `0.4–4.5`;
- T1 tsh 0.45 noref losing its finding, with urgency going to `none`.

## 3. Tests fail first (N10)

Add `rules/p144.test.js`, with Persian comments and one test per expected change above, plus:

- the M280 update;
- a healthScore test: a clean sheet with and without Tg gives the same score;
- edges: TSH 9.9/10, 0.099/0.1, and 0.39/0.40/0.45 (US6).

Run them on `HEAD` in a `git archive` tree with `node_modules` linked through `mklink /J`. Every new test must go red there.

## 4. Guards

- Rule-id diff: no ids added or removed. The new pattern `thyroid_thyroglobulin` belongs to rule `thyroid` (N16).
- `node --test rules/metamorphic.test.js` passes, with no new `ALLOWED_DROPS`.
- GR1, M32, M36, M37, G6 and the `SUGGEST_TESTS` coverage test pass.
- No probe panel carrying Tg lists `unmatched_abnormal`.

## 5. Register

The P144 entry in `MEDICAL_RULES.md` lands in the same commit as the behaviour (N37). The REF_DIFF TSH row lands in the US6 commit.
