# specs/020 — baseline and measurements

## T001: baseline (working tree, `HEAD` = `b0a7b65`, `khanesh-server/` clean)

`npm test` → `tests 1698 · pass 1696 · fail 1 · todo 1`. The failing test is
`T15e: پرداخت فقط کارِ خودش را باز می‌کند؛ jobId ِ بدنهٔ /payment/request نادیده گرفته می‌شود`. It also fails alone,
so it is pre-existing and not in scope.

**Correction (measured later, same session):** `T15e` is **environmental, not code**. On a clean copy (`git archive HEAD
khanesh-server`, a `node_modules` junction, no `.env` and a fresh `database.sqlite`, the same set-up the pre-commit hook
uses), HEAD gives `tests 1698 · pass 1696 · fail 0 · skipped 1 · todo 1`.
- In the dev folder, repeated runs added 7 more red auth/OTP/daily-cap tests (SF1, T33, T35, T40, T45, and both daily
  caps). They come from the persistent `database.sqlite` and `.env`, not from this change.
- **Working tree after P132, clean copy:** `tests 1706 · pass 1704 · fail 0 · skipped 1 · todo 1`. The 8 new tests are
  TM11 and TMM10–TMM16.

## T010: negative control

TMM13 (prenatal AFP MoM) did **not** go red when the `serology.js` MoM guard was removed. It **did** go red when
`prenatalClaim` in `adapter.js` was stubbed to `null`, so that is the real guard. Both files were restored from backup,
and `git diff` on them is empty.

## T016/T017/T022: after-snapshots

No existing test went red, so nothing was re-baselined. `before.json` → `after.json` changed only as follows (R2 + Q8):
- Q1 and Q2: ratio state un-inverted.
- Q3 and Q4: `within` → `above`, urgency `routine` → `this_week`.
- Q8_within: score 90 mid → 98 high. Q8_with: score 75 → 98, band stays mid.
- Rows added for all 7 keys.
- Q6: sex flag and sentence added.
- Q10 text was already «خوانده نشد» before the change; only the row is new (research R2 over-stated this).
- Q5_mom and Q7_ca125_male: no change.

## T027: rule-id set

The HEAD copy and the working copy both have 277 ids, and `diff` is empty.

## T002: reader probe (`probe-reader.mjs` → `reader-before.txt`)

The research R2 table is reproduced for sex M, F and `null`, and the results are identical across the three.

**Q5b (pre-existing, unchanged by this feature):** calcitonin 6 pg/mL against «Male: < 8.4 Female: < 5» with
**unknown sex** reads `within` in *both* readers, because the male band is picked. With sex F it reads `above`. A woman
whose sheet does not state her sex is under-read.
- This is a pre-existing gap in `units.parseReference`, which both readers call. It is **not fixed here** because the
  fix would touch every analyte (N36).
- It is recorded as a P132 reviewer item. The test in T010 asserts today's state so the gap is visible and can't move
  silently.

## T004: end-to-end before-snapshot (`e2e.mjs` → `before.json`)

Exact current text (the `psa_result` `must_say`, second sentence):
- **Q1** (ratio 18 % against «> 25»): «درصد Free PSA روی برگهٔ شما 18 % است و داخلِ محدودهٔ چاپ‌شدهٔ همان ردیف است» ⇒ **under-read** (the bug).
- **Q2** (ratio 30 % against «> 25»): «درصد Free PSA روی برگهٔ شما 30 % است و بالاتر از مرزِ چاپ‌شدهٔ همان ردیف است».

The other states before the change:

| Scenario | ungraded state | TM rows | urgency | score |
|---|---|---|---|---|
| Q3 PSA 4.0 «< 4.0» | within | 0 | routine | – |
| Q4 AFP 7.0 «< 7.0» | within | 0 | routine | – |
| Q5_mom AFP MoM, pregnant | (prenatal owns) | 0 | this_week (`prenatal_ntd_afp`) | – |
| Q5_quad AFP 35 IU/mL + hCG, pregnant | **AFP noref → `tumor_markers_result`** | 0 | routine | – |
| Q6/Q7 PSA 1.2 F/M | within | 0 | routine | – |
| Q8_with PSA 6 «< 4» + base panel | above | 0 | this_week | 75 / mid |
| **Q8_within PSA 1 «< 4» + base panel** | within | 0 | routine | **90 / mid** |
| Q8_without base panel only | – | – | none | **98 / high** |
| Q9 calcitonin, no range | noref | 0 | routine | – |
| Q10 age-banded PSA | noref («چاپ نشده») | 0 | routine | – |

Findings recorded for the register:
- **Q8_within**: a *normal* PSA cuts the score from 98 «high» to 90 «mid». This is the same defect class specs/019 fixed
  for CEA (N46), still live for PSA. T013 fixes it.
- **Q5_quad (pre-existing)**: on a pregnant profile, «AFP 35 IU/mL» next to «Total hCG 29000» is not claimed by the
  prenatal path. It goes to `tumor_markers_result`, whose AFP context sentence is about cirrhosis.
  - After T012 this AFP also gets a TM row («محدودهٔ مرجع روی برگه چاپ نشده»). The text is unchanged.
  - Not fixed here: the prenatal claim logic is out of scope. It is a P132 reviewer item.

## T006: source of `context.sex`

- `engineOut.sex` comes from `inferSex(ocr)` (`rules/adapter.js:2705`) applied to the patient object that
  `mergePatient` has already built. **Profile sex wins** (`server.js:244` comment: «جنسیت: پروفایل»).
- `server.js:161` turns it into `context.sex` (`مرد`/`زن`).
- `profileMismatchNotes` (`server.js:247`) separately states a sheet-vs-profile disagreement. That is a different
  fact (which sex was used), not "PSA on a female". T019 therefore keys on `e.sex === "F"`.
- When the sheet says male and the profile says female, the patient sees both sentences: one says which sex was used,
  the other says PSA does not fit. They do not contradict each other. This is accepted and recorded.
