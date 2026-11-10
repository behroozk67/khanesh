# Research: Tumour-Marker Rules from Reference Chapter 20 (specs/020)

All measurements were taken on 2026-11-10 against the **working tree** (`HEAD` = `b0a7b65`). `khanesh-server/` has no
uncommitted changes, and the uncommitted changes elsewhere are frontend/deploy files only. Probe script:
`$TEMP/claude_probe020.mjs` (scratch, not committed).

## R0 — Baseline test suite

- **Command**: `npm test` in `khanesh-server/`.
- **Result**: `tests 1698 · pass 1696 · fail 1 · todo 1`.
- **Failing test**: `T15e: پرداخت فقط کارِ خودش را باز می‌کند؛ jobId ِ بدنهٔ /payment/request نادیده گرفته می‌شود`
  (`api-contract.test.js:742`, got 503 instead of 200). It also fails when run alone
  (`--test-name-pattern="T15e"`), so it is a real pre-existing failure and not load noise (N48).
- **⚠️ Corrected later in the same session:** T15e is environmental. It comes from the dev folder's persistent
  `database.sqlite` and `.env`. A clean `git archive` copy of HEAD gives `fail 0` (snapshots/BASELINE.md).
- **Decision**: this feature leaves T15e alone. The gate for this feature is therefore **"no new failures relative to
  this baseline"**, and T15e is named in every report until someone fixes it.

## R1 — Which keys does option C actually cover?

- **Finding**: seven keys already take the `assay_printed` path (`serology.js` `AI_RE`/`assayRoute`): `AFP`, `B2M`,
  `CALCITONIN`, `CGA`, `PSA_TOTAL`, `PSA_FREE` and `PSA_RATIO`. They are read by `abVerdict(cleanPrintedRef(…))`, not by
  the specs/019 reader. Because `tmVerdictOf` requires `TM_KEYS`, **none of them gets a row in `_engine.tests`.**
- **Decision**: extend `TM_KEYS` with exactly these seven. `CALPROTECTIN` is also in `AI_RE`, but it is not a tumour
  marker, so it is excluded.
- **Rejected alternative**: new analyte keys (thyroglobulin, HE4, NSE, CYFRA 21-1, SCCA, ProGRP, S100, inhibin, PLAP),
  for three reasons:
  - no real-sheet spellings exist for them (N2);
  - each one needs an owner rule (N1/N18);
  - `tmBuild` pushes `TM_CONTEXT[id]` without a guard, so a key with no entry would print a literal `undefined` into
    Persian text.

  These go into the register with a "needs real-sheet spellings" column.
- **Out of scope**: hCG is owned by the pregnancy-test key (`HCG`) and by the prenatal path. LDH is graded chemistry.
  Neither is touched.

## R2 — What does swapping the reader change? (measured)

Same input for both readers, for sex `M` and `F` (the results were identical for both sexes):

| Row · printed range | Today (`abVerdict`) | specs/019 reader | Change |
|---|---|---|---|
| PSA 4.0 · «< 4.0» | within | **above** | strict `<` read as printed (N46). `psaBuild` ⇒ urgency `routine` → **`this_week`** |
| AFP 7.0 · «< 7.0» | within | **above** | same; `tmBuild` urgency `routine` → **`this_week`** |
| Free PSA ratio 30 · «> 25» | **above** | within | ⚠️ **today's verdict is inverted.** `abVerdict` reads «> 25» as a positive-above cut-off, so a reassuring ratio is shown as «بالاتر از مرزِ چاپ‌شده» |
| Free PSA ratio 18 · «> 25» | **within** | below | ⚠️ same inversion: the lower ratio (the one that argues *for* biopsy) is shown as inside the range |
| PSA 3.0 · «40-49 y: <2.5 / 50-59 y: <3.5» | noref | unreadable | **only the new row differs**: the finding text was already «خوانده نشد» (`lineOf` checks the printed reference). Corrected after measuring the before/after snapshots. |
| PSA 5.0 · P114 forms («< 4.0 / 70-90 years: < 4.0», «… Up to 6.5») | above | above | unchanged |
| AFP 50 · «Adult: < 10 / Pregnancy: variable» | above | above | unchanged |
| Calcitonin 12 · «Male: < 8.4 Female: < 5» | above | above | unchanged |
| Calcitonin 12 · (none) | noref | noref | unchanged |
| B2M 2.5 · «0.8-2.2»; CgA 120 · «< 100» | above | above | unchanged |

- **Decision**: do the swap.
  - The free-PSA inversion is a live wrong patient-facing output. It needs a regression test that fails on today's
    code (N10) and a Lab Notebook entry.
  - The two boundary flips are urgency changes, so under FR-010 each is a reviewer item recorded under P132. They follow
    the rule already adopted for CEA in P122 ("strictness is part of the printed text"), and are not a new clinical
    decision.
- **Still to probe in tasks**:
  - the age-banded PSA range as it appears on a real Iranian sheet (no fixture yet);
  - AFP on a pregnant profile with a concentration unit (FR-008: the prenatal path must keep it);
  - censored values («<0.01» after prostatectomy).

## R3 — Score (FR-004)

- **Finding**: `score.js:192` drops `TM_KEYS` from the count of ungraded rows. `score.js:203` exempts only the finding
  `tumor_markers_result`. Once PSA is in `TM_KEYS`, `psa_result` would still cap the sheet: half in, half out.
- **Decision**: also exempt `psa_result` when every key it explains is in `TM_KEYS`. This is a test-locked change
  (a PSA-only sheet is scored the same as the same sheet without PSA).
- Taking PSA out of the score changes the score of every sheet that has PSA on it. That is the specs/019 decision
  ("outside the score by decision") applied to more keys. It is recorded under P132 as a reviewer item.

## R4 — Sex-mismatch flag (FR-007) — amended

- **Conflict**: "flagged *instead of* graded" hides an above-range value. That breaks Principle II (under-reading is
  the worst failure).
- **Decision**: the flag is **additive**. The verdict and the urgency stay, and the finding gets one more sentence.
  The row carries `sexMismatch: true` for the expert view.
- **Narrowed to PSA in a female profile.**
  - PSA in a woman most likely means the wrong sheet or the wrong profile sex. The sentence asks the patient to check
    that, and makes no clinical claim.
  - CA 125 in a man can be ordered for non-gynaecological reasons. The chapter's sentence is guidance on what
    laboratories should accept, so a "doesn't match your sex" line would be a clinical claim. Under option C that waits
    for the reviewer and goes into the register.
  - The spec FR-007 is amended to match. This narrowing is stated in the plan and in the final report.
- **Sex source**: the engine's own `context.sex` (`server.js:150` reads it the same way), not a fresh OCR guess.
  - Task: confirm whether `context.sex` is profile-first or sheet-first when the two disagree.
  - If it is sheet-first, the mismatch is a sheet/profile conflict that `server.js:249` already detects. Check that we
    don't produce two sentences for one fact.
- **Proposed Persian sentence** (reviewer to confirm; shown verbatim per the user's rule):
  «PSA آزمایشِ مخصوصِ پروستات است و جنسِ ثبت‌شده برای این برگه زن است؛ اگر این برگه مالِ شخصِ دیگری نیست، جنسِ پروفایل را بررسی کنید و برگه را به پزشک نشان دهید.»

## R5 — The chapter extraction against the existing code text (FR-001, partly blocked)

- **Status**: raw chapter text not supplied ⇒ **every row below is "secondary, unverified"**. These are not
  corrections. They are the list the reviewer and the raw-text check start from, and they answer specs/019 open
  question 4 ("unsourced text: keep or remove?").

| Existing code text (where) | Extraction says | Gap |
|---|---|---|
| CA 19-9: «حدود ۱۰ درصدِ افراد فنوتیپِ Lewis-منفی‌اند» (`patterns_autoimmune.js` `TM_CONTEXT.CA199`) | 5–10 % | number differs |
| PSA grey zone 4–10 (`psaBuild`) | "3 or 4 to 10" | lower edge differs |
| `freePsaBand` probabilities (Catalona 1998) | no free-PSA cut-off given at all | the code's numbers have a different source; the chapter cannot confirm them |
| AFP: «سونوگرافیِ هر ۶ ماه، با AFP یا بدونِ آن» | NACB "≥ 20 µg/L and rising ⇒ CT/MRI even if ultrasound negative" | different statement; not contradictory |
| Calcitonin > 100 pg/mL (`calcitoninHigh`) | no calcitonin number in the chapter | unconfirmed by this source |
| CA 125 benign causes | adds non-malignant ascites (> 5000 kU/L), SLE, urinary retention, heart failure, pericarditis | possible additions |
| CA 15-3 «چند هفته موقتاً بالا برود» | flare during response (no duration) | duration not in this source |
| PSA confounders (ejaculation, cycling, 5-ARI ½ after 6 months) | DRE, catheter, biopsy, UTI, retention; no 5-ARI | sources differ; no contradiction |
| CEA benign causes («بعضی بیماری‌های خوش‌خیم») | names them; also says "take blood before colonoscopy" | possible additions |

- **Decision**: the register (`MEDICAL_RULES_TUMOR_MARKERS.md`, new §6 under P132) carries:
  - this table;
  - the 40 extracted rules, each with the engine input it needs (FR-013);
  - the extraction's 7 source contradictions (FR-011).

  No row changes code text in this feature.
- **Unblocking input**: the raw chapter text, plus the book title and edition. Until then FR-001/SC-001 stay "not
  started", which is reported honestly rather than marked done.

## R6 — P-number

- **Search**: `grep -rE '\bP13[2-9]\b'` over `*.md`/`*.js` returned nothing. The highest number used in
  `MEDICAL_RULES.md` is P131.
- **Decision**: allocate **P132** in `MEDICAL_RULES.md` *before* any code that cites it (N37). It is one entry with
  three parts: the reader swap and its boundary flips, the score exemption, and the PSA-in-female note.
