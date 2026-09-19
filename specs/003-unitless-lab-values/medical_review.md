# Medical review: specs/003 (numbers printed without a unit), round 3

Reviewer: eval-medical-reviewer · 2026-09-19 · working tree on `edec069` (uncommitted), after the round-2 fixes
(`DECIDE_LIMITS`/`SURVIVAL_LIMITS` split, `printedRangeFits` ×3, two-unit references, neonatal rework).
Scope: clinical correctness only. Every panel below was measured with `runEngine` + `runPatterns`. HEAD means
a `git archive edec069` copy. Suite on the working tree: `npm test` gives 486 tests, 469 pass, 0 fail, 17 todo.

## Verdict: FAIL, with one blocker (B9)

B6, B7 and B8 are fixed. The ×3 fit rule and the DECIDE/SURVIVAL split did not reject any real SI or
conventional range I tried (see the sweep below). One defect remains, in the neonatal branch: a jaundiced
newborn's bilirubin printed with no unit and no range is told "this week". The same number printed in mg/dL
is an emergency.

---

## Round-2 blockers: resolved

| # | panel | now |
|---|---|---|
| B6 | neonate, 14 / `<15` | `this_week`, «در محدودهٔ مرجعی است که خودِ آزمایشگاه… (کمتر از 15)» + the neonatal sentence without «همین امروز». No contradiction. |
| B6 | neonate, 13 or 18 / `up to 12` | `emergency`, `CLAUSE.outside` (the false "any unit" claim is gone), «همین امروز» together with the emergency action. They agree. |
| B6 | neonate, 150 / `<205` | `this_week`, «در محدودهٔ مرجعی است…» (it no longer says "out of range in either unit") |
| B7 | FBS 95 / `4-5.6` | readings path, level `none`, `routine`, neutral clause (HEAD: 95, normal) |
| B7 | Urea 40 / `0.6-1.4` | readings path, `routine` «ممکن است خارج…» (no emergency) |
| B8 | Urea 450 · Ca 21 · FBS 1600, no unit | `emergency`, «فقط با یکی از واحدهای رایج ممکن است، و با همان واحد در محدودهٔ خطرناک است» |
| B8 | Iron 1200 · Mg 12, no unit | `routine`, which is identical to the same number printed in its unit. That is an engine defect that predates this change (non-blocking item 3). |

Code-review panels:
- Creatinine 80 / `0.6-1.2 mg/dL (53-106 µmol/L)` → the two-unit reference is not treated as evidence. The
  readings path gives `none` → neutral clause, `routine`. There is no false emergency. (At HEAD the unit was
  decided as mg/dL, which gave 80 mg/dL, an emergency.)
- Neonate aged `3 days`, bilirubin 1.5 / `0.3-1.2` → age resolves to 0.008, not graded against the adult band.
  Result: `this_week`, «بیرون از محدودهٔ مرجعی… (0.3 تا 1.2)» + «پزشکِ نوزاد باید آن را با نمودارِ مخصوصِ نوزاد بسنجد».
  No emergency. Correct.
- Hb 12.5, no unit (F or M) → only the g/dL reading is possible. `routine`, not raised to `this_week`. Correct.

## Sweep: could the ×3 fit rule or DECIDE_LIMITS reject a real range? No.
Common Iranian printed ranges, SI and conventional, each with a critical value. The unit was decided
correctly every time, with the same urgency as the value printed in that unit:
Ca 1.6/`2.1-2.6`, 1.6/`2.15-2.55`, 3.6/`2.2-2.6`, 6/`8.5-10.5` → emergency · FBS 2.0/`3.9-6.1` → 36 mg/dL,
30/`3.9-5.5` → 541 emergency, 35/`70-110` · Cr 900/`62-115`, 600/`45-90` (F), 8/`0.7-1.4` → emergency ·
Urea 40/`2.5-7.1` → 240 emergency, 300/`17-43` → emergency · Bili 300/`3-21`, 300/`<17`, 15/`up to 1` →
emergency · Hb 55/`120-160`, 5/`12-16` → emergency · Alb 20/`35-50` · Chol 12/`<5.2` · TG 10/`<1.7`,
1000/`<150` · Mg 0.3/`0.7-1.0` · Phos 0.3/`0.8-1.5` → emergency · VitD 10/`75-250`, 8/`30-100` · Iron 5/`10-30` ·
Uric 700/`150-420` · HDL 0.6/`>1.0` · LDL 6/`<3.4`.
Values between the DECIDE and SURVIVAL limits that come with a real range (Urea 450/`15-45`, FBS 1600/`70-110`,
Ca 21/`8.5-10.5`) are rejected by DECIDE, fall to the readings path and still come out `emergency`. The design
works as described: a DECIDE error only sends the row to readings, and SURVIVAL keeps the extreme reading.

---

## Blocking issue

### B9: A neonate's bilirubin printed with no unit and no range is told "this week". The same number in mg/dL is an emergency.
In the readings branch, a neonate's urgency is the **minimum** across readings with a `this_week` floor. The
µmol/L reading is graded against the engine band, and that band is not a neonatal band. This is the same root
cause as B1.

| panel (no unit, no range) | working tree | same number printed `mg/dL` |
|---|---|---|
| age 0, T.Bili `20` | `unit_unknown_values [this_week]` «این هفته با پزشک مطرح کنید.» | `bilirubin_emergency [emergency]` |
| age 0, T.Bili `25` | `[this_week]` | emergency |
| age `2 days`, T.Bili `16` | `[this_week]` | `16 mg/dL` → `bilirubin_emergency [emergency]` |

A neonate at 16–25 mg/dL is at phototherapy or exchange-transfusion level, and bilirubin encephalopathy
develops over hours. The alternative reading (16–25 µmol/L ≈ 1–1.5 mg/dL) is unusual in a newborn whose
bilirubin was ordered for jaundice. Neonatal bilirubin in Iran is printed in mg/dL. For this population the
minimum-over-readings rule protects against the less likely error at the cost of the more dangerous one.
**Fix (record in P48 for the reviewer):** for age < 1 month with no printed range, the urgency should be the
**maximum** over possible readings, i.e. emergency whenever the mg/dL reading reaches the engine's emergency
level. Keep the neonatal «همین امروز» sentence derived from that urgency, as it is now. Add a regression test for
the three panels above, red on the current tree.

---

## Non-blocking

1. **A decimal comma is read as a thousands separator. This predates the change and is outside its scope, but
   it is dangerous.** `K 5,5` → 55 → `hyperkalemia [emergency]`. `Creatinine 1,2 mg/dL` → 12 →
   `creatinine_emergency`. HEAD does exactly the same (measured). Inside this change the reference parser reads
   `0,6-1,2` as 0.6–1.2 while the value parser reads `1,2` as 12, so `Cr 1,2 / 0,6-1,2` is decided mg/dL and
   graded 12, which is an emergency. The two parsers disagree on what a comma means. A value with exactly
   one comma and 1–2 digits after it should be read as a decimal, or not graded at all.
2. Troponin `20` / `<19`, no unit → `emergency`. The same `20 ng/L` printed in its unit → no finding. This
   inconsistency belongs to P37/P48 (carried over).
3. **Engine defects that predate this change** and that the unit-unknown path now inherits: `Mg 12 mg/dL` →
   `hypermagnesemia [routine]` (the respiratory-paralysis range); `Iron 1200` → `routine`; `Hb 8 g/dL` → only
   `unmatched_abnormal [routine]`; glucose 30–35 mg/dL → `this_week`.
4. `parseReference`: a label printed after its range can assign it to the wrong sex (`"13-17 (M) 12-15 (F) 11-14 (Child)"`,
   M → 12–15). A line printing one sex only is applied to the other sex. Low impact, because the systems differ
   ×10 for HGB (carried over).
5. The Persian clauses otherwise pass review. No clause states a direction. Only the printed number is quoted
   (N5). The one-reading clauses («فقط با یکی از واحدهای رایج ممکن است») are accurate. «با هر واحدی… خطرناک» now
   appears only when more than one reading is possible. The neonatal «همین امروز» appears only next to
   an emergency action.

---

# Round 4

Reviewer: eval-medical-reviewer · 2026-09-19 · working tree on `edec069` (uncommitted), after the B9 fix
(`adapter.js` ~1288–1299, `newborn = age < 1/12` → urgency = **worst** reading; `CLAUSE.worstNeonatal`; guard `M138`).
Every panel below was measured with `runEngine` + `runPatterns` from a scratch script. Suite on the working tree:
`npm test` → `tests 487 · pass 470 · fail 0 · todo 17`, which matches the expected baseline.
`M138` negative control: with the `newborn` branch disabled in a temp copy, `M138` fails with
`actual: 'this_week', expected: 'emergency'`. With the real `adapter.js` it passes. It is a real guard (N10).

## Verdict: FAIL, with two blockers (B10, B11)

B9 is closed **for the ages the parser understands** (`0`, `N D`, `N d`, `N روز`, `N روزه`, `N day(s)`, `N month`).
It is not closed for three common ways a neonatal sheet prints age, and for those the result is worse than B9 was.

---

## B9: closed for parsed ages

No unit and no printed range. A 3-day-old (age 0.0082) and age `0` give identical results:

| T.Bili | unit-unknown result | same number printed `mg/dL` | same number printed `µmol/L` |
|---|---|---|---|
| 5 | `this_week` | `this_week` (unmatched_abnormal) | `none` |
| 12 | `this_week` | `this_week` | `none` |
| 12.5 – 14.9 | `emergency` | `emergency` (unmatched_abnormal) | — |
| 15, 20 | **`emergency`**, `worstReading` (was `this_week` in round 3) | `emergency` (bilirubin_emergency) | `none` |
| 61 – 200 | `this_week` (only µmol/L possible) | — | `this_week` (61: `routine`) |
| 220 – 256 | `emergency` | — | `emergency` |
| 250, 340 | `emergency`, one-reading clause | `emergency` | `emergency` |

In the first month, the unit-unknown urgency is now never below the urgency of either printed unit. That is exactly
what B9 asked for.

Boundary: `28 days`, `29 days` and `30 days` → `emergency`. `31 days` and `1 month` (0.0833, not `< 1/12`) → `this_week`.
A strict `< 1 month` is at or above NICE CG98's 28-day scope, so the cut-off is fine.

With a printed range, the `newborn` branch is skipped as intended. At 3 days, 15 or 20 with `0.3-1.2` → `emergency`
(`CLAUSE.outside`), and 15 or 20 with `5-21` → `this_week`. The range decides. The adult-range panel from round 3
(1.5 with `0.3-1.2` → `this_week`) is unchanged.

1–12 months (`2 months`, `11 months`), no unit and no range: 5, 12, 15 and 20 → `this_week`; 250 and 340 → `emergency`.
**This is identical to round 3**, so this branch is no worse off. 15 and 20 are still below the `mg/dL` result
(`emergency`). That comes from the minimum rule, which P48 discloses («برای ۱ تا ۱۲ ماه، همان قاعدهٔ کمینه ماند»). It is
not a blocker, but see B11 for the text these infants get.

## Blocking issues

### B10: a newborn whose age is printed in hours, weeks or Persian digits is not treated as a newborn. B9 stays open for them, and they now get `routine`.
`inferAge` (`adapter.js:655-669`) knows `سال/year/y`, `ماه/month/mo` and `روز/day/d`. It does not know hours or weeks,
and `[\d.]` does not match Persian digits. Measured with T.Bili `20`, no unit, no range:

| printed age | parsed `age` | result |
|---|---|---|
| `48 h`, `48 hours`, `48 ساعت` | **48** (years) | `routine`, no neonatal clause |
| `2 weeks`, `2 wk`, `2 هفته`, `3 weeks` | **2 / 3** (years) | `routine` |
| `۳ روزه`, `۳ روز`, `۴۸ ساعت` | `null` | `routine` |
| `3 D`, `3 روزه`, `0`, `0 Y` | 0.008 / 0 | `emergency` (correct) |

The same 48-hour-old with `20 mg/dL` printed gets `bilirubin_emergency`. Neonatal bilirubin is the one test whose
clinical reference is age in **hours** (hour-specific nomograms), and Persian-language sheets print Persian digits. So
these are the most likely formats for exactly the population the B9 fix protects. Instead these babies fall through to
the adult minimum rule (`routine`, «در نوبتِ عادی با پزشک مطرح کنید.»). That is lower than B9's own `this_week`. It is
the same class as round 2's age-0 bug (`M129`, N4 at the input).
**Fix:** in `inferAge`, fold Persian/Arabic-Indic digits to ASCII first. Then add hours (`ساعت|hour|hr|h`, ÷8760) and
weeks (`هفته|week|wk|w`, ÷52.14) *before* the bare-number fallback. Add these panels to `M138`.

### B11: infants aged 1–12 months are told the newborn bilirubin nomogram applies to them
`neonatalBili` is `age < 1` (one year), so `entry.neonatal` is set for the whole first year and `clauseFor` adds the
newborn sentence. Measured at `2 months` and `11 months`, T.Bili 5/12/15/20, no unit:

> «بیلی‌روبینِ نوزاد به سنِ او به ساعت بستگی دارد و پزشکِ نوزاد باید آن را با نمودارِ مخصوصِ نوزاد بسنجد.»

and at 250/340:

> «برای نوزاد، این عدد را همین امروز به پزشکِ نوزاد نشان دهید؛ بیلی‌روبینِ نوزاد به سنِ او به ساعت بستگی دارد.»

This is medically wrong for an 11-month-old. Hour-specific bilirubin nomograms (Bhutani; AAP 2022) cover only about the
first 2 weeks of life. After the neonatal period there is no "age in hours" rule and no newborn chart, and the doctor is
a pediatrician, not a neonatologist. The urgency is unaffected, but the text gives parents a false medical premise.
Round 3 missed this because it only probed a 3-day-old.
**Fix:** gate the `neonatal` text on the same `< 1 month` (after B10) that gates the urgency. For 1–12 months, give
either no extra sentence or a neutral infant one, with no hours and no nomogram.

## Adult / non-bilirubin regression spot-check: none

Age 45, no unit and no range. All unchanged from round 3:
- Creatinine 80 → `routine`, neutral clause, no emergency.
- Calcium 2.4 → `routine`, neutral clause.
- Troponin 8 → `this_week`, «بسته به واحد، ممکن است خارج از محدودهٔ طبیعی باشد.», plus the chest-pain warning.
- FBS 15 → `this_week`, «با هر کدام از دو واحد که خوانده شود، خارج از محدودهٔ طبیعی است.»

Adult T.Bili 17 and 20 → `routine`, so the specs/003 false emergency does not come back. A 5-year-old's T.Bili 20 →
`routine`. Unknown age with T.Bili 20 → `routine`, which is correct: we cannot know it is a newborn.

The neonatal emergency is `always_show`. With a unitless creatinine 80 on the same sheet, both clauses print under the
one emergency action and nothing is suppressed.

## Text check (N5, N12)

The `worstReading` clause, verbatim (3 days, T.Bili 20):

> «بیلی‌روبین تام (20): واحد روی برگه خوانده نشد؛ با یکی از دو واحدِ رایج این عدد برای نوزاد در محدودهٔ خطرناک است، و تا واحد روشن نشده باید همین را فرض کرد. برای نوزاد، این عدد را همین امروز به پزشکِ نوزاد نشان دهید؛ بیلی‌روبینِ نوزاد به سنِ او به ساعت بستگی دارد. این اعداد را با برگهٔ اصلی به پزشک نشان دهید؛ واحد معمولاً کنارِ عدد یا در ستونِ واحد چاپ می‌شود.»
> action: «همین حالا به اورژانس مراجعه کنید.»

The clause states that the unit is unknown and that only **one** reading is dangerous; it does not claim "any unit". It
gives no direction and quotes only the printed number, so it passes N5 and N12. `worstReading` is set only when
`possible > 1`, so 250 and 340 correctly get the one-reading clause instead.

## Non-blocking

1. **P48 item 6 gives the wrong false-emergency window.** It says 15–60. The measured window is **12.5–60**, because the
   engine's own `mg/dL` reading already reaches `emergency` at 12.5 through `unmatched_abnormal`. The phrase «که در
   روزهای اول طبیعی است» is also loose. On days 2–5 a typical TSB is about 85–250 µmol/L, while 12–60 µmol/L is typical
   of the first hours of life or of the third week. The trade-off itself is acceptable. Iranian labs print neonatal
   bilirubin in mg/dL, so the worst reading is also the likely one, and under-reading risks acute bilirubin
   encephalopathy. The disclosure should state the measured window.
2. The engine's neonatal `mg/dL` emergency starts at 12.5 (generic grade), and the pattern threshold is 15
   (`BILI_T_EMERGENCY_MGDL`). Neither depends on age in hours. This predates the change.
3. 1–12 months: the minimum rule leaves unitless 15/20 at `this_week` where `mg/dL` gives `emergency`. This is disclosed
   in P48 and consistent with the adult policy. It is the reviewer's call.

---

# Round 5

Reviewer: eval-medical-reviewer · 2026-09-19 · working tree on `edec069` (uncommitted), after the B10/B11 fixes
(`adapter.js` `inferAge` ~655–677: Persian/Arabic digits folded first, then hours ÷8760 and weeks ×7/365 parsed **before**
year/month/day; ~1294 `newborn = age < 1/12` → `entry.neonatal`; guards `M139`, `M140`).
Probes: fresh scratch script calling `runEngine` + `runPatterns`, bilirubin with no unit and no printed range.
Suite: `npm test` → `ℹ tests 489 · ℹ pass 472 · ℹ fail 0 · ℹ todo 17`, which matches the expected baseline. The
`✖ failing tests:` block lists only `todo` items (`M101` etc., P46).

## Verdict: FAIL, with one blocker (B12)

B10 and B11 are closed for every format the round-4 review listed. The B10 fix introduced a new misread: an age
written as **two components where the smaller unit is weeks or hours** is read as the small component alone. That
turns a 5-week-old, a 3½-month-old or a 1-year-old into a newborn.

## B10: closed

T.Bili `20`, no unit, no range:

| printed age | parsed age (y) | `unit_unknown_values` | neonatal | worstReading |
|---|---|---|---|---|
| `48 h` / `۴۸ ساعت` | 0.00548 | emergency | true | true |
| `72 hours` | 0.00822 | emergency | true | true |
| `2 weeks` / `۲ هفته` | 0.03836 | emergency | true | true |
| `3 wk` | 0.05753 | emergency | true | true |
| `۳ روزه` / `٣ روز` | 0.00822 | emergency | true | true |
| `5 weeks` | 0.09589 | this_week | false | — |
| `1 month` | 0.08333 | this_week | false | — |
| `2 months` | 0.16667 | this_week | false | — |

Single-component adult ages are unchanged: `45`, `۴۵`, `۴۵ سال`, `45 y`, `45 yrs`, `45Y`, `45Yrs`, `45 years old`, `M/45`,
`45 (M)`, `Male 45`, `H 45`, `45-Y`, `45 Y/M`, `45 yr (M)`, `45 yo`, `45 ساله`, `۴۵ساله`, `45y 3m`, `45 years 3 months`,
`45 hw`, `45 hash` → all parse as **45**. With T.Bili 20 and creatinine 80, both unitless, the result is `routine`, and the
bilirubin is `none`. The `(?![a-z])` lookahead is what keeps `hw`, `hash` and `yrs` away from the hours and weeks
patterns.

## B11: closed. Infants aged 1–12 months keep their urgency floor

Unitless, no range, T.Bili 5/12/15/20/250/340 at `1 month`, `2 months`, `6 months` and `11 months`:
- 5, 12, 15 and 20 → `this_week`.
- 250 and 340 → `emergency`.
- `neonatal:false` everywhere, and there is no «نوزاد» or «ساعت» in the text.

These urgencies are identical to round 4. At `3 D`, the neonatal text is still present, and 15 and 20 still give
`worstReading` → `emergency`.

The 2-month-old, T.Bili 20, verbatim:
> «بیلی‌روبین تام (20): واحد روی برگه خوانده نشد و این آزمایش با دو واحدِ رایج گزارش می‌شود که عددشان خیلی فرق دارد؛ برای همین دربارهٔ آن قضاوت نمی‌کنیم. بسته به واحد، ممکن است خارج از محدودهٔ طبیعی باشد. این اعداد را با برگهٔ اصلی به پزشک نشان دهید؛ واحد معمولاً کنارِ عدد یا در ستونِ واحد چاپ می‌شود.»
> action: «این هفته با پزشک مطرح کنید.»

The 2-month-old, T.Bili 340, verbatim:
> «بیلی‌روبین تام (340): واحد روی برگه خوانده نشد، ولی این عدد فقط با یکی از واحدهای رایج ممکن است، و با همان واحد در محدودهٔ خطرناک است. این اعداد را با برگهٔ اصلی به پزشک نشان دهید؛ واحد معمولاً کنارِ عدد یا در ستونِ واحد چاپ می‌شود.»
> action: «همین حالا به اورژانس مراجعه کنید.»

Neither text has a direction, a nomogram or "neonatologist" in it. It passes N5 and N12.

## Blocking issue

### B12: a compound age whose smaller unit is weeks or hours is read as that small unit alone. Infants and children become newborns.
Hours and weeks are now matched **before** years and months. A first-match `match()` therefore returns the trailing
component. Probe: Hb `11 g/dL` plus T.Bili `20` with no unit.

| printed age | before (old parse) | now | Hb 11 graded against | outcome now |
|---|---|---|---|---|
| `1 month 1 week` (≈5 wk) | 0.0833 | **0.0192** | `14–18.6` → **low**, abnormal | `emergency` + `unexplained_abnormal` + newborn text |
| `3 months 2 weeks` | 0.25 | **0.0384** | `9.5–12.5` | `emergency` + newborn text |
| `۳ ماه و ۲ هفته` | null | **0.0384** | `9.5–12.5` | `emergency` + newborn text |
| `3M 2W` | 0.25 | **0.0384** | — | `emergency` + newborn text |
| `1 y 2 w` / `۱ سال و ۲ هفته` | 1 / null | **0.0384** | — | `emergency` + newborn text (a 1-year-old) |
| `45 Y 2 W` | 45 | **0.0384** | — | `emergency` + newborn text (an adult) |

The "before" column comes from re-running the round-4 regex chain (year → month → day → bare number) on the same
strings. What the patient gets:
- The newborn sentence and the worst-reading emergency. This is the B11 text reaching an infant or child, and it
  comes back through the parser rather than through the gate.
- `refs_ped` **neonatal** ranges for **every** analyte on the sheet. A 5-week-old's normal Hb of 11 is flagged low.

This fails toward over-calling, not silence. But it is a new wrong statement that this change introduced, and
"N months and M weeks" is a natural way to write an infant's age in Persian.
**Fix:** add up the components instead of taking the first match (years + months/12 + weeks·7/365 + days/365 +
hours/8760). At minimum, match the larger units first and use weeks or hours only when no year, month or day
component is present. Add `1 month 1 week`, `۳ ماه و ۲ هفته` and `1 y 2 w` to `M139` as not-newborn cases.

## Non-blocking

1. `0Y 3M` → 0 (neonate) and `2 m 3 d` → 3 days: the year and day regexes win over the months component. **This
   predates this change** (the old chain gives the same values). It is the same class as B12 and would be fixed by the
   same summing parse.
2. `age: 45h`, `45 H` and `45 hrs` → 45 hours. That is the literal reading, and no adult sheet prints an age like that.
   Acceptable.
3. `32 weeks gestation` → 0.61 y. This is gestational age, not postnatal age, so no parse is right. The result is not
   neonatal, so no false emergency follows. Acceptable, but a gestational-age field should not reach `patient.age`.
