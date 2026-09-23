# specs/007: medical review

**Verdict: FAIL**, with 2 blockers.

**Scope.** Only the 007 diff: `adapter.js`, `names.js`, `patterns_hematology.js`, `patterns_utils.js`, `refs.js` and `units.js`, compared against `scratchpad/before-007/khanesh-server`. Every panel below was run through the engine in both trees with an ad-hoc probe. The probe was then deleted.

**Gate facts.** There is no eval-gate run for this change. The latest run is `20260803T224303-6e90686`, so no `medical-facts.json` exists. I built the range and function change list from the diff myself.

**Tests.** `node --test --test-name-pattern="M17[7-9]|M18[01]" rules/engine.test.js` gives 10 pass, 0 fail.

## Checked and correct

- **Q1: RBC female range 4.10–5.10** (Henry ch.31 adult automated table, user-approved, P52). Only `low_rbc_hct_without_anemia` reads the low side. It moves by design.
- **Q2: Hct arm.** The threshold is written as `HGB_CRISIS_GDL * 3` and is not a new number. It takes the same `severe_anemia_crisis` action, so there is one instruction.
  - It gives way when a graded Hb exists (Hct 18 + Hb 9: Hb decides).
  - It is off below `PED_MAX_AGE`. A neonate or a 6-year-old with Hct 18 is unchanged (routine, as before, and out of scope per spec).
  - Age 16 and age 85 both fire, as they should.
  - Hct 0.18 L/L is converted to 18 and fires. Unitless 0.18 goes to unmapped. Hct 0.4 % does not fire (`v >= 1`).
  - Pregnancy-range Hct 32 does not fire. The high side (Hct 62, Hb 21) is unchanged.
  - The must_say correctly says the Hb was not measured and that the urgency is *estimated* from the Hct (N5).
- **Q3 hand-offs.** No note when spherocytosis fires, under an Hb < 7 crisis (Hb 5.5 + MCHC 38), or with only one of Hb/Hct present. `low_rbc_hct_without_anemia` stands down under both the crisis and the note.
- **Units.** Hct L/L ×100 and MCHC g/L ×0.1 are converted only when the sheet prints the unit. They are deliberately kept out of `SI_CONVERSIONS`, so a unitless "Hct 39" is still graded.
- **RETIC_ABS.** Mapped, never graded, and routed to noRef under a Persian name. «ARC … %» goes to unmapped.

## Blockers

### B1: the MCHC artefact note tells a patient with real anaemia that no conclusion about anaemia can be drawn

`patterns_hematology.js`, `rbc_indices_implausible` build:

> «شایع‌ترین علت، اثرِ نمونه یا دستگاه است … نه یک بیماری. تا تکرارِ آزمایش، از این شاخص‌ها نتیجه‌ای دربارهٔ کم‌خونی گرفته نمی‌شود. هماتوکریت (21) هم پایین گزارش شده، ولی همین ناهماهنگی می‌تواند علتش باشد.»
> action: «در نوبتِ عادی از پزشک یا آزمایشگاه بخواهید شمارش خون (CBC) روی نمونهٔ تازه تکرار شود.»

`indicesImplausible()` has no condition on Hb, so the note also fires beside a confirmed anaemia finding. Measured panels:

| panel | fires after 007 |
|---|---|
| F 40, Hb 8, Hct 21, MCV 70, MCH 24, MCHC 38, ferritin 5 | `microcytic_ida_likely` (this_week) + `iron_deficiency` (this_week, «خون‌ریزی گوارشی…») + **`rbc_indices_implausible`** |
| M 60, Hb 8, Hct 20, MCV 115, MCHC 40, B12 90 | `macrocytic_anemia` + `overt_b12_deficiency` (this_week) + **`rbc_indices_implausible`** |
| M 50, Hb 9, Hct 24, MCV 88, MCHC 37.5 | `normocytic_anemia` (this_week) + **`rbc_indices_implausible`** |

Before 007, the same panels gave the anaemia findings plus an `unexplained_abnormal` line for Hct and MCHC. There was no contradiction.

This is clinically wrong. Hb is measured directly (cyanmethaemoglobin/SLS) and is not lowered by cold agglutination. Lipaemia *raises* Hb. The artefacts that produce MCHC > 36.5 corrupt the RBC count, MCV and the calculated Hct, but not a low Hb. So a patient with Hb 8 and ferritin 5, or Hb 8 and B12 90, reads, in the same report:

- one finding: an anaemia that needs a visit this week and a search for occult GI bleeding;
- a second finding: «نه یک بیماری», no conclusion about anaemia can be drawn, the low Hct may be the artefact, repeat the CBC at a routine visit.

That is two readings and two timelines for one set of indices (N20/N21). The reassuring one is the easier to act on. FR-008 required both texts to be checked together, but only `low_rbc_hct_without_anemia` was.

**Fix direction.** When Hb is low, one of these:
- the note stands down, and MCHC stays on the `unexplained_abnormal` line as before; or
- the note drops the «نتیجه‌ای دربارهٔ کم‌خونی…» and «همین ناهماهنگی می‌تواند علتش باشد» clauses, drops the routine timeline, and limits itself to "MCHC/Hct/RBC may be artefactual; the Hb itself is measured directly".

Add a guard sweeping at least the three panels above.

### B2: the Hct arm ignores an Hb that was printed but not graded, then tells the patient no Hb was measured

`patterns_utils.js`, `crisisArm`: `if (hgb) …` looks only at `e.graded`. An Hb in `e.ungraded` (unit_unknown) is treated as not measured. Measured panels:

- F 40, `Hb 6.2` with no unit, Hct 19 %
- F 40, `Hb 4.0 mmol/L`, Hct 20 %

Both fire `severe_anemia_crisis` with this text:

> «هموگلوبین روی این برگه اندازه‌گیری نشده است؛ … این فوریت از هماتوکریت برآورد شده، نه از هموگلوبینِ اندازه‌گیری‌شده.»

Directly beside it, `unit_unknown_values` says «هموگلوبین (6.2): واحد روی برگه خوانده نشد … در محدودهٔ خطرناک است».

The urgency is right (emergency either way). But the emergency text, which no downstream safety net inspects, states a falsehood about the patient's own sheet, and it contradicts the finding printed next to it. It also breaks FR-004 as written: "When Hb is measured, the measured Hb MUST govern." This sentence is new in 007. The pre-007 `low_rbc_hct_without_anemia` had a similar claim, but 007 moved it into the emergency finding.

**Fix direction.** In the Hct branch, check `e.ungraded.HGB` as well. When present, word it as «هموگلوبین چاپ شده ولی واحدش خوانده نشد، پس سنجیده نشد» rather than «اندازه‌گیری نشده». Whether the crisis may still fire from the Hct when the Hb is printed but ungraded is a decision to record in P52. Add a guard.

## Non-blocking observations (record them; they do not change the verdict)

1. **A printed L/L unit next to a value that is already a percentage is converted with no plausibility check.** Measured:
   - «Hct 39 L/L» gives 3900 and `unmatched_abnormal` («هماتوکریت با مقدار 3900»). Before 007 it graded as normal 39.
   - «Hct 18 L/L» gives 1800, which is routine and misses the new crisis.
   - «MCHC 34 g/L» gives 3.4, low.
   None of these is a false emergency, but "Hct 18 L/L" is an under-read of exactly what Q2 was built for. Suggestion: with L/L, a value > 1 goes to unmapped, mirroring the unitless ≤ 1 guard.
2. **Neonate/child Hct 18 with no Hb** stays «در نوبت عادی». This is pre-existing and explicitly out of scope (spec Edge Cases), but it is the same under-read Q2 fixed for adults. It should be a P52 open item for the reviewer.
3. **P52 open question 3 (MCV 103 beside the artefact note)** is confirmed: MCV still reaches `unexplained_abnormal`. That is acceptable as recorded.

---

## Round 2 (after the fixes for B1, B2 and non-blocking item 1)

**Verdict: FAIL.** There is 1 new blocker. The 007 guards M177–M182 give 15 pass, 0 fail.

### Fixed, and confirmed on the engine

- **B1.** The iron-deficiency panel (Hb 8, MCV 70, MCHC 38, ferritin 5) no longer gets the MCHC note. MCHC goes to `unexplained_abnormal`, as it did before 007. The note still fires in the cases it should:
  - the artefact panel (Hb 14, Hct 30, MCHC 46.7);
  - the lipaemia pattern (Hb 16, MCHC 40);
  - an MCHC of 366 g/L, converted to 36.6.
- **B2 wording.** The crisis text no longer says Hb was not measured when it was printed.
- **The 6 % floor works:**
  - Hct 6 % is an emergency.
  - Hct 20.9 % is an emergency.
- **Unit checks work:**
  - Hct 0.18 L/L is converted to 18 and is an emergency. The text quotes «روی برگه 0.18 L/L», which is correct (N5).
  - Hct 0.39 L/L is converted to 39, normal.
  - Hct 18 L/L, 0.4 % and 1 % all go to unmapped.
  - MCHC 34 g/L goes to unmapped.
  - MCHC 340 g/L is converted to 34.
- **The crisis still stands with the MCHC note silent:** Hb 5.5 with MCHC 38.

### R2-B1: the B2 fix brought back an emergency and a routine instruction side by side about the same red-cell mass (N20, FR-005)

`crisisArm()` now returns null whenever HGB is in `e.ungraded`. That releases the stand-down of `low_rbc_hct_without_anemia`, so its routine instruction appears next to the emergency finding for the unit-unknown Hb.

Panel: F, age 40, `Hb 6.2` (no unit), `Hct 19 %`. The same result appears with `Hb 65` (no unit), `Hb 4.3 mmol/L`, and `Hb 6.5 mg/dL` with Hct 19–20.

- `unit_unknown_values` (emergency): «هموگلوبین (6.2): … با همان واحد در محدودهٔ خطرناک است» → «همین حالا به اورژانس مراجعه کنید.»
- `low_rbc_hct_without_anemia` (routine): «هموگلوبین روی این برگه چاپ شده، ولی چون واحدش معلوم نبود سنجیده نشد؛ بدون آن نمی‌توان گفت کم‌خونی هست یا نه» → «با پزشک عمومی یا داخلی در نوبت عادی مطرح کنید…»

The patient reads two timelines for one anaemia: "now" and "at a routine visit". The second finding also says it cannot tell whether there is anaemia, directly under a finding that calls the same Hb dangerous.

This pair did exist before 007. Round 1 had removed it, and this fix brings it back. FR-005 requires exactly one instruction per sheet about red-cell mass.

**Fix direction.**
- When `e.ungraded.HGB` carries `urgency: "emergency"` (or whenever it is non-routine), `low_rbc_hct_without_anemia` stands down.
- Alternatively, it defers its action the way `actionUnlessAnemiaCrisis` does, and drops the sentence «نمی‌توان گفت کم‌خونی هست یا نه».
- The guard should sweep the four Hb spellings above against Hct 19. It should also assert that a routine unit-unknown Hb (`Hb 8.5 mmol/L` + Hct 19, where both findings are routine) is unchanged.

### Non-blocking

1. **Hct 5 % becomes a routine low-Hct finding** (below the 6 % floor): «هماتوکریت 5 است … در نوبت عادی». It is implausible and probably misread, but it is quoted as a real number. It should probably go to unmapped, like the other impossible values. This behaviour predates 007.
2. **An Hct of 18 printed with an «L/L» label now goes to unmapped** (before 007 it was graded as 18 %, low, routine). That is consistent with the specs/003 rule. Check that a sheet whose only row is this reaches the «تفسیر نشدند» line and not a "normal" message.

---

## Round 3 (after the R2-B1 fix)

**Verdict: PASS.** No blockers remain.

- **R2-B1 is fixed.** Four panels, each a woman aged 40, each with Hct 19–20 %:
  - `Hb 6.2` with no unit
  - `Hb 65` with no unit
  - `Hb 4.3 mmol/L`
  - `Hb 5.5 mmol/L` (Hct 28 %)
  
  All four give `unit_unknown_values` (emergency, «همین حالا به اورژانس») and nothing with a second timeline. Hct and RBC reach `unexplained_abnormal` («… موقع مراجعه با پزشک مرور کنید»), so nothing is left unowned and no second instruction appears.
- **No new gap for a this_week Hb.** `Hb 7.5` (no unit) + Hct 25 gives this_week, and Hct goes to the net.
- **Routine Hb panels are unchanged.** `Hb 8.5 mmol/L` + Hct 19, `Hb 9.5` + RBC 3.3 / Hct 30, and `Hb 12` + Hct 30 each give `low_rbc_hct_without_anemia` (routine) with the «چاپ شده ولی … سنجیده نشد» wording, next to a routine `unit_unknown_values`. The two findings have one timeline.
- **Final pass over the rest of 007:**
  - Hct 18 % with no Hb is an emergency, and the text says the urgency is estimated.
  - The iron-deficiency panel with MCHC 38 gets no artefact note.
  - The unit checks behave as in round 2.
- **Non-blocking items stand** (Hct 5 %, «18 L/L» on its own, children's Hct) and are recorded for P52.
