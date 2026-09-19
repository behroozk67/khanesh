# Baseline — 004

## پیش از تغییر (T001–T003)

- **درخت**: `2d32dd3` (HEAD)؛ درختِ کاری فقط فایل‌های جلسهٔ دیگر را دارد (`.gitignore`، `package*.json`)، که روی `rules/` اثری ندارند.
- `npm test` (khanesh-server، ۲۰۲۶-۰۹-۱۹): `tests 489 · pass 472 · fail 0 · todo 17`
- `RULES.length` = **119** — فهرست در `ids-before.txt`
- ۱۲ پنلِ ثابت در `frozen-before.json`؛ یافته‌ها:
  cbc_normal: — · ida: microcytic_ida_likely, iron_deficiency · liver: liver_hepatocellular ·
  kidney: kidney_impairment, unexplained_abnormal · lipid: dyslipidemia, severe_hypercholesterolemia ·
  thyroid: thyroid_hypo_overt · lytes: hypokalemia, hyponatremia · urine: proteinuria_2plus, hematuria ·
  b12_low: overt_b12_deficiency · vitd_low: vitamin_d_deficiency · macro_nofolate: macrocytic_anemia · k7: hyperkalemia

## T005
«ویتامین B12» → `["B12"]` از قبل در `SUGGEST_TESTS` هست (`patterns.js:74`)، و «فولات» هم (`:75`). T018 لازم نیست.

## US1 (T013, T020)

**Red before the change** (the six tests appended to the tree on `2d32dd3`, before any code change, `node --test --test-name-pattern="M14[1-5]"`):
- M141: `یافتهٔ فولات نیامد: unmatched_abnormal`
- M141b: `یافتهٔ فولات نیامد`
- M142: `B12 120: overt_b12_deficiency`
- M143: `تنها: هیچ`
- M144: `The input did not match /فولاتِ شما روی همین برگه 2 و پایین است/`
- M145: `Serum Folate نگاشت نشد`

**After:** `npm test` gives `tests 495 · pass 478 · fail 0 · todo 17`. `RULES.length` = 120.
- On the first run, M38 was red, because the `"own"`/`"macro"` arguments were read as English patient text. Fixed with the `CLAUSE_FOR` constant.

**Frozen panels:** 11 of 12 are byte-for-byte unchanged. `macro_nofolate` changed on purpose (T015): `macrocytic_anemia` now says «فولات روی این برگه اندازه‌گیری نشده است. ویتامین B12 روی این برگه اندازه‌گیری نشده است.»

## US2 (T027, T033)

**Red before the change** (on the tree right after US1):
- M146: `Zinc نگاشت نشد`
- M147: `Anti-Intrinsic Factor Positive`
- M148: `Zn µg/dL`
- M149: `RBC Folate:  / RBC Folate`
- M146b: `[["Zinc","40",null,"µg/dL"]]`, i.e. «نتایج آزمایش شما در محدوده طبیعی است»
- T21: `مسیرِ موتور گرفته نشد`
- M150 is a freeze test. It passes before and after by design, the same pattern as M104c.

**Found while writing T21:** a sheet with only `noRef` keys (P46/P47 too, e.g. prolactin alone) was going down the **old non-engine path** (`server.js`, `graded.length === 0`). On the engine path, `buildNormalResult` would have said «در محدوده طبیعی است». Both are fixed:
- `noRef` now keeps the engine path;
- `buildNormalResult` has a new branch for `noRef`.

The antibody is not in T21, because manual entry only accepts numbers; the photo path is covered by M147.

**After:** `npm test` gives `tests 502 · pass 485 · fail 0 · todo 17`.

## US3 (T038)

`npm test` gives `tests 508 · pass 485 · fail 0 · todo 23`, i.e. todo went from 17 to 23 (+6: M151, M151b, M151c, M152, M153, M154).

## Polish (T040–T043)

- **Rule-id diff:** `ids-before.txt` compared with after. The only difference is `> folate_deficiency`, and `RULES.length` went from 119 to 120 (N16).
- **Frozen panels:** 11 of 12 are identical. `macro_nofolate` differs on purpose (T015).
- **SC-007:** in the `+` lines of the diff to `patterns_*.js`/`refs.js`, the only one of the target numbers is `MCV > 100`. That number already existed and just moved into `macrocyticMatch`, so it is not new. B12 150/399 are also existing numbers (`P21`, `borderline_b12_deficiency`).
- **Lint:** `npm run lint` in `khanesh/` shows no warnings or errors.

## T044 — review round 1 fixes (2026-09-19)
- Code review: 1 must-fix (= medical B1), 4 should-fix. Medical review: FAIL, B1–B3 (`medical_review.md`).
- The code reviewer ran the new tests against `2d32dd3` (archive + junction): `508 · 473 · 12 fail`. The 12 failures are M141–M149, M146b and T21. M150 is a freeze and green on both.
- New tests, each red on the tree before the fix (measured with `--test-name-pattern`, for the reason it was written):
  - `M155` (B1): the only warning was «خودتان مکمل B12 شروع نکنید…».
  - `M156` (B2): `folate_deficiency` fired, the net did not, and there was no «بالاتر از محدود».
  - `M157` (B3): `routine` ≠ `this_week`.
  - `M158` (CR2): the child's folate 25 read «طبیعی است».
  - `M159` (CR4): the text had «4 nmol/L» for a unit the sheet didn't print.
  - `M160` (CR5): no near-limit sentence.
- After the fix: `514 · 491 · 0 · 23 todo`, `RULES` = 120. Rule-id diff is still only `+ folate_deficiency`.
- Not fixed (recorded in P49): B12 150–199 is worded as «نزدیکِ مرز» (inherited from P21). The folic-acid caution has no source registered in `guidelines.js`.

## P49-الف/ج — user-approved, implemented (2026-09-19)
- Approval: the project owner, in conversation («بله، الف و ج را تأیید می‌کنم»). P49-ب (MMA) and P49-د (Zn/Cu/Se/E/C/PLP) were not approved for implementation because they have no numbers; M152 and M154 stay `todo`.
- Red before the code (on the tree right after T044, with `unexplainedNoRef` added first so the file could import it):
  - M151, M151b, M151c: «یافتهٔ ویلسون نیامد» or no «التهاب».
  - M151d: «g/L تبدیل نشد».
  - M151e: CERULOPLASMIN still in the noRef line.
  - M153, M153b: no «پرنیشیوز».
- T22 is red with only the server filter undone (negative control): «سرولوپلاسمینِ تفسیرشده هنوز «تفسیر نشدند» است: … روی (زینک)، سرولوپلاسمین. تفسیر نشدند.»
- T21's ceruloplasmin value changed from 12 to 25 on purpose: 12 now gets a finding. T21's intent (a value with no range stays on the line) is unchanged.
- After: `518 · 499 · 0 · 19 todo`, `RULES` = 121. The rule-id diff is only `+ wilson_evaluation`. M36/M37/M38 are green.
- Medical review of the implementation: FAIL, C1 («Undetected»/«Nondetected» read as positive) and C2 («+/-» read as positive).
  - `M153b` was extended with those values plus weak/equivocal forms and four ceruloplasmin unit spellings. It was red first, at «Undetected».
  - Fix: a whole-value whitelist in `overt_b12_deficiency`, and `normUnit` in `patterns_trace_elements.js`.
  - After: `518 · 499 · 0 · 19 todo`.
  - Non-blocking notes 2–4 are recorded in P49 as open questions.
