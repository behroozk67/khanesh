# Clinical review: Henry ch.26 / P47 (reproductive, semen, hCG)

**Verdict: FAIL**

Reviewed on 2026-09-19 against the uncommitted working tree on branch `recovery`. This review covers clinical correctness only.

- `node --test --test-reporter=tap rules/engine.test.js` result: `tests 415 · pass 398 · fail 0 · todo 17`. The suite is green. None of the defects below is covered by a test.
- No eval-gate run exists for this change. The newest run in `.claude/eval-gate/runs/` is `20260803T224303-6e90686`, which is unrelated. So there is no `medical-facts.json` for this change. Range changes were read from `git diff` instead. No gate verdict was filed, because a verdict against an unrelated run id would be meaningless.

All outputs below are real. They came from `runEngine()` in `rules/adapter.js` followed by `runPatterns()` in `rules/patterns.js`.

---

## Blocking issues (ranked)

### 1. Testosterone reported in ng/mL is graded as ng/dL. Every normal man gets "low testosterone" (N3)

Iranian labs very often print total testosterone in **ng/mL** (typical adult male range about 2.8–8 ng/mL). `units.js` only converts `nmol/L`. A value in ng/mL, or with no unit, goes straight into `TESTO: {M:[300,null]}`.

Input: `{age:40, sex:"M"}`, `Testosterone 4.5 ng/mL` (normal, equal to 450 ng/dL). Output:

> `graded: TESTO 4.5 "≥ 300" low` → `male_gonadal_axis`: «تستوسترونِ شما 4.5 ng/dL است و از حدِ 300 ng/dL کمتر است.»

The same thing happens with `unit:""`. The patient sees the wrong verdict, and the sheet's unit is also misquoted: the sheet says ng/mL and the text says ng/dL.

`nmol/L` works correctly: 8 nmol/L becomes 231 ng/dL and is graded low, which is correct.

**Fix.** Add `ng/mL → ×100` for `TESTO` to `SI_CONVERSIONS`. Refuse to grade `TESTO` when the unit is missing and the value is below about 30. No male value in ng/dL is plausibly that low outside castration. Treat it like the HbA1c implausibility guard, or send it to `ungraded` with a unit reason. Quote the value as printed, not with the engine's unit. Add a regression test for 4.5 ng/mL.

### 2. Azoospermia written as text is silently dropped, and the patient gets «نتایج آزمایش شما در محدوده طبیعی است» (N2 / N4)

The azoospermia branch only fires when `SPERM_CONC === 0` as a number. Iranian sheets commonly print `Nil`, `Azoospermia`, `دیده نشد`, `No sperm seen` or `-`. These go to `semenQual.SPERM_CONC` and nothing reads them.

- `Volume 3 mL · Sperm Count "Azoospermia" · pH 7.6` gives `graded: VOL normal, PH normal`, `semenQual: {"SPERM_CONC":"Azoospermia"}`, `urgency: none`. There are no findings and no `noRef`, so `server.js:974` returns `buildNormalResult`. A man with no sperm is told his results are normal.
- `حجم 3 · تعداد اسپرم "دیده نشد"` gives the same result: `urgency: none`.
- `Volume 0.8 · Count "Nil" · pH 6.8 · Fructose Negative` fires `semen_analysis` only on volume and pH. The headline is «بعضی از شاخص‌ها… کمتر از حد مرجع». Both the azoospermia sentence and the congenital-absence-of-vas sentence (negative fructose) are lost. These are the most important facts on the sheet. The fructose branch is only reachable from `azoo`.

**Fix.** In the adapter, turn a non-numeric `SPERM_CONC` / count value that matches `nil|azoo|no sperm|not seen|none|دیده نشد|ندارد|^-$|^0$` into `tests.SPERM_CONC = 0`, or into an explicit `azoo` flag. For any other non-numeric value, `semen_analysis` must still fire, with "value not interpretable, show the doctor". It must never let a semen page with an unreadable concentration fall into `buildNormalResult`. Add a test for each of the listed spellings.

### 3. Semen page detection misses the common `×10⁶/ml` unit with generic row names. Semen RBCs are then read as hematuria

The problem the change says it fixes still happens with a realistic Iranian layout. `SEMEN_UNIT_RE` does not accept the superscript `⁶`, and `Count`, `Volume` and `pH` are not semen-only markers.

Input: `Volume 3 ml · Count 8 ×10⁶/ml · pH 7.5 · RBC 8-10 /hpf · WBC 3-4 /hpf` (male, 35). Output:

> `urgency: this_week` · `hematuria`: «در آزمایش ادرار شما خون (گلبول قرمز) دیده شده است … از عفونت و سنگ کلیه …»

Oligospermia (8 M/mL) is lost, because `Count` and `Volume` are unmapped. The patient gets a false urinary finding instead.

**Fix.** Normalise Unicode superscripts (`⁶`→`6`, `⁰`–`⁹`) and `×`, `x`, `*`, `^` variants before matching `SEMEN_UNIT_RE`. Also treat `mil/ml` and `M/ml` as semen units. Add a test with exactly this layout.

---

## Non-blocking issues (fix in the same change if possible)

4. **Male testosterone above an unapproved upper limit is labelled «طبیعی».** Input: `TESTO 2000 ng/dL` for a 40-year-old man. Output: graded `abnormal:false`, `fa:"طبیعی"`, range `≥ 300`. There is no approved upper limit, so the honest label is "no upper limit judged", not "normal". This matters for supraphysiological values, for example anabolic steroid use. The one-sided `evaluate` branch is correct for semen indices, where high values are not abnormal. It is wrong for a hormone whose upper limit was simply not approved. **Fix:** above some sentinel (or always, for `TESTO`), set `fa` to something like «بالاتر از ۳۰۰؛ حدِ بالا تعریف نشده» instead of `FA.normal`.
5. **The semen headline direction is fixed as "lower".** Input: `Sperm Count 50 · pH 8.4`, a pH-high-only finding. Headline: «بعضی از شاخص‌های آنالیز مایع منی شما کمتر از حد مرجع است». The body correctly says pH is higher. This is the same N12 shape. **Fix:** use a neutral headline, «خارج از حد مرجع», whenever any semen finding is high.
6. **A `<`-prefixed value is quoted as the number itself (N5).**
   - `Sperm Count "<1"` gives «غلظتِ اسپرم 1 میلیون».
   - `Beta HCG "<2"` gives «مقدارِ بتا اچ‌سی‌جیِ شما 2 mIU/mL».
   The verdicts are correct, but the quoted numbers are not what the sheet says. **Fix:** keep the printed string for quoting.
7. **Semen motility printed only as WHO grades a/b/c/d is never evaluated.** Input: `Grade A 5 · B 10 · C 10 · D 75` gives `urgency: none`. A sample with 75% immotile sperm gets no finding, and nothing tells the patient it was not assessed. **Fix:** derive total motility (a+b+c) and progressive motility (a+b) when those grades are present. This is arithmetic on printed values, not a new threshold. If that is not done, at least attach a "not interpreted" note.
8. **`PROG_D21` for a male (or a mis-inferred sex) disappears.** Input: male, `Progesterone Day 21 0.5` gives `ungraded {reason:"threshold"}`, no rule, not in `noRef`, `urgency: none`. It should go to `noRef` / context.
9. **A qualitative `Pregnancy test: Positive` is unmapped.** `Beta HCG: Positive` works, and so does the Persian «تست بارداری». The English name only produces an unmapped warning. Add `pregnancytest` and `serumpregnancytest` to `NAME_MAP` → `HCG`.
10. **The same hCG cutoff (`HCG_POSITIVE_ABOVE = 5`) is used for men.** P47 approved 5 as the positive cutoff for a pregnancy test. Using it as "positive in a man" is an extension nobody approved, so it should be recorded in P47. The wording and the `this_week` urgency are appropriate and do not name cancer.

---

## What was verified correct

**Semen boundaries.** These match WHO 2021 and P47 exactly.
- Concentration 15 is low and 16 is normal.
- Morphology 3 is low and 4 is normal (the P47 gap-1 fix).
- Volume 1.4, total motility 42 and progressive motility 30 are all normal.
- pH 8.0 is normal (flagged near the upper limit), 8.4 is high and 6.8 is low.

**Semen terminology.** Correct throughout.
- Oligospermia is tied to concentration only.
- Low volume is explicitly «با کم بودنِ تعدادِ اسپرم فرق دارد».
- Asthenospermia, teratospermia and azoospermia are used correctly.
- Every finding says one sample is not enough and makes no fertility verdict.

**Semen extras.**
- Viability stain is suggested at total motility below 30% (20 → suggested).
- An abstinence of 7 days gives the correct "long abstinence can understate motility" warning.

**Testosterone.**
- 299 is low and 300 is normal, `routine`.
- The text asks for two morning samples and does not decide testicular versus pituitary origin.
- LH and FSH are quoted three ways: both present, one present, or neither.
- At age 15 the value goes to the `pediatric` context. At age 16 it is graded. With unknown sex it goes to `sex_unknown`. A woman's testosterone goes to `noRef`.

**Day-21 progesterone.**
- 3.0 gives «بیشتر نیست / may be no ovulation», with a cycle-timing caveat.
- 3.1 gives «به احتمالِ زیاد تخمک‌گذاری», limited to this one cycle.
- 20 nmol/L converts to 6.29 ng/mL.
- With a positive hCG it is routed to the `hcg_positive` context.

**hCG.**
- 5 is negative and 6 is positive. There is no grey zone.
- For a woman, a positive result is `routine` and the text says it is «با بارداری سازگار» and that the test alone says nothing about the course of pregnancy. The same-day warning covers severe abdominal pain or bleeding.
- Nothing mentions ectopic pregnancy, miscarriage, viability or gestational age, and nothing prescribes a drug or procedure.
- For a man, a positive result is `this_week`.
- With unknown sex, a positive result is neutral.

**Hormones that are deliberately not judged.**
- A woman's bare LH, FSH, E2 and progesterone go to the `cycle_day_unknown` context.
- `FSH Day 3`, AMH and 17-OHP go to `noRef` with the "not interpreted" warning.

**Name mapping.**
- 17-OHP maps to `OHP17`, not to `PROG`.
- Free βhCG, free testosterone, AFP and any value in MoM units stay unmapped.

**Page routing.**
- A CBC page with `10^6/µL` is not detected as semen.
- A urine page is still urine.
- A semen page with a numeric `million/mL` unit routes pH and RBC away from urine. `SEMEN_RBC` does not fire hematuria.

**Urgency.** No rule in the module emits `emergency`.
