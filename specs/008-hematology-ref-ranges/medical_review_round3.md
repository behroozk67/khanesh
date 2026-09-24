# specs/008: round-3 medical review

**Verdict: FAIL** (2 blocking findings)

- **Tree:** working tree on `recovery`, on top of `9deba20`.
- **Suite:** re-measured before this review with `node --test`: 657 tests, 638 pass, 0 fail, 19 todo. RULES = 137.
- **Comparison baseline:** `9deba20`, extracted with `git archive` and given a junctioned `node_modules`.
- **Method:** every panel below was run through `runEngine` and `runPatterns` on both trees. Final recommendation lists were
  checked with `buildEngineRecommendations`, and the "unjudged" text with `buildNormalResult`.
- **Scratch scripts:** in the session scratchpad (`p1.mjs` to `p10.mjs`). None are in the repo.
- **Eval gate:** no verdict was filed. No gate run id exists for this change; the only run directory is from 2026-08-03.

---

## Blocking findings

### R3-B1: A ferritin just above the rule cut-off makes the patient read «کمبودِ آهن کم‌احتمال‌تر» (introduced by the R2-B2 fix)

`microcytosis_no_anemia` has a ferritin arm, `patterns_hematology.js` around line 511. It runs whenever the printed ferritin
is at or above `ferritinIdCut`, which is 15 for women under 50 and 30 for men. In that arm it states that the ferritin
lowers the probability of iron deficiency.

| panel | observed must_say (verbatim) |
|---|---|
| F 30, Hb 12.4 g/dL, MCV 72, RBC 4.9, **Ferritin 16** | «فریتینِ همین برگه 16 است و پایین نیست، که کمبودِ آهن را کم‌احتمال‌تر می‌کند؛ علتِ شایعِ دیگرِ گلبولِ کوچک یک ویژگیِ ارثیِ خون (صفتِ تالاسمی) است.» |
| F 30, same CBC, **Ferritin 20** | «فریتینِ همین برگه 20 است و پایین نیست، که کمبودِ آهن را کم‌احتمال‌تر می‌کند؛ …» |
| F 45, same CBC, **Ferritin 25**, CRP 3 | «فریتینِ همین برگه 25 است و پایین نیست، که کمبودِ آهن را کم‌احتمال‌تر می‌کند؛ …» |
| M 65, Hb 14, MCV 74, RBC 5.0, **Ferritin 35** | «فریتینِ همین برگه 35 است و پایین نیست، که کمبودِ آهن را کم‌احتمال‌تر می‌کند؛ …». The GI-bleeding sentence does not appear. |

In all four panels the action is «در نوبت عادی با پزشک مطرح کنید.» and the only suggestion is «الکتروفورز هموگلوبین».

**Why it is dangerous.**

- **The direction is wrong.** In a microcytic patient, a ferritin between 15 and 45 µg/L *raises* the probability of iron
  deficiency. Guyatt 1992 gives likelihood ratios of about 8.8 for 15–25, 2.5 for 25–35 and 1.8 for 35–45. Only above about
  45–100 does ferritin argue against it. NICE CKS and BSG 2021 treat ferritin < 30 as confirmed iron deficiency.
- **The engine contradicts itself.** The anaemic sibling, `microcytic_ida_likely`, prints «فریتین زیر ۳۰ کمبود آهن را
  تأیید می‌کند». `iron_deficiency_panel` calls a man's ferritin of 20 «زیرِ حدی است که معمولاً برای کمبودِ آهن در نظر
  گرفته می‌شود». A woman with the same ferritin and no anaemia is told the opposite.
- **The patient is steered to the wrong diagnosis.** The finding points to thalassaemia trait, asks for electrophoresis
  only and gives no iron-deficiency work-up. Iron deficiency lowers HbA2, so the electrophoresis will then look reassuring.
  For the 65-year-old man, the occult GI-bleeding sentence is lost as well; it exists only in the no-ferritin arm.
- **This is new text.** On `9deba20` the same panel produced only `unmatched_abnormal` («برای این ترکیب توضیح آماده‌ای
  نداریم»). That was silent, but it was not wrong.

The approved P53 Q2 cut-off (15 for women under 50) decides when `iron_deficiency_panel` *fires*. It does not license a
sentence saying that iron deficiency is less likely above it.

**Fix direction.** Split the "not low" arm in three:
1. At or above `ferritinIdCut` but under about 45 (or under 100 with inflammation or at older age): state it neutrally,
   e.g. «در محدودهٔ مرجع ولی نزدیکِ لبهٔ پایین؛ کمبودِ آهن را رد نمی‌کند».
2. Clearly replete (≥ 100): «کم‌احتمال‌تر» is correct here.
3. High: the existing sentence.

Keep the adult GI-bleeding sentence in the first band. Add a guard that fails on the F 30 / Ferritin 20 panel above.

### R3-B2: A hepatitis B row printed on the same page as an electrophoresis result is renamed as a haemoglobin variant, as «هموگلوبین S (داسی‌شکل)»

`adapter.js` electrophoresis layer, around line 905: `evidence = pct || electroPages.has(page)`. For a non-numeric value,
page evidence alone turns bare `HBs` / `HBc` / `HBe` into `HBS` / `HBC` / `HBE`, and those go into `noRef`.
Electrophoresis never reports a variant as «Positive/Reactive/Negative»; it reports a %. Page evidence therefore cannot
make a *qualitative* value a haemoglobin variant.

| panel (single page, M 30) | `9deba20` | tree |
|---|---|---|
| Hb 14.5, MCV 85, RBC 5, WBC 7, PLT 250, HbA2 2.8 %, **HBs: Positive** | HBs → `qual`, no finding → `buildNormalResult`: «نتایج آزمایش شما در محدوده طبیعی است.» | `noRef ["HBS"]` → «مقادیری که موتور می‌سنجد در محدودهٔ طبیعی‌اند، ولی چند مقدارِ این برگه تفسیر نشدند.» … «برای این مقادیر محدودهٔ مرجعِ تأییدشده نداریم: هموگلوبین S (داسی‌شکل).» |
| HbA2 2.8 %, HBs Ag Positive, **HBe: Positive** | HBe unmapped | `noRef ["HBE"]`, i.e. «هموگلوبین E» |
| HbA2 2.8 %, **HBc: Reactive** | HBc unmapped | `noRef ["HBC"]`, i.e. «هموگلوبین C» |

The same happens to «HBs: Negative».

**Why it is dangerous.** On a premarital sheet (CBC + HbA2 ± hepatitis B screen) a reactive hepatitis B surface antigen is
presented to the couple as an uninterpreted «sickle haemoglobin» result. That is a wrong disease name on the one sheet
where genetic-carrier decisions are made. The hepatitis result still reaches no finding. `9deba20` was also wrong here: it
silently read the sheet as normal (N2). The tree trades that for a confident misidentification (the N25 identity class).

The honest output already exists: `HB_NAME_AMBIGUOUS` («ردیفی با نامِ دوپهلو (HbS/HbC/HbE — هموگلوبینِ غیرطبیعی یا
نشانگرِ هپاتیت B)»).

**Fix direction.** For `HB_AMBIGUOUS` names, only a % (unit or value) counts as variant evidence. Alternatively, page
evidence counts only when the value is numeric. A qualitative value falls to `HB_NAME_AMBIGUOUS` whatever the page.
Add a guard on the first panel above.

---

## Mandatory check points: results

| # | check | result |
|---|---|---|
| 1a | `microcytosis_no_anemia` fires only on a graded, in-range Hb | **pass.** Hb 18.5 → `unmatched_abnormal`, which names Hb 18.5 and MCV. No Hb → `unmatched_abnormal`. Unitless Hb → `unit_unknown_values` plus the MCV net line. |
| 1b | under 16, uses MCV `dir` | **pass.** 3 y MCV 75: nothing fires. 3 y MCV 65 fires with no adult GI sentence. 8 y MCV 76 (range 77–91) fires. 16 y uses the adult 80. |
| 1c | no co-fire with `severe_anemia_crisis` / `unit_unknown_values` | **pass.** Hct 18 without Hb → crisis plus the MCV net line only. Hb 6 → crisis plus `microcytic_ida_likely` (deferring action). |
| 1c' | no co-fire with `low_rbc_hct_without_anemia` | **does co-fire** when Hb is graded in range and RBC or Hct is low (e.g. Hb 14.5, MCV 72, RBC 3.5, Hct 30). Both findings are routine and both say «کم‌خونی نیست», so there is no rival timeline and no contradiction. Non-blocking (see N1). The round-2 case (Hb absent) is fixed. |
| 1d | high Hb goes back to the net | **pass** |
| 1e | high-ferritin sentence (M156) | **pass.** Ferritin 450: «فریتینِ همین برگه 450 است که بالاتر از حد طبیعی (12–300) است؛ این کمبودِ آهن را کم‌احتمال‌تر می‌کند، ولی فریتینِ بالا خودش … باید با پزشک بررسی شود». **But the "not low" arm is wrong in the 15–45 band: R3-B1.** |
| 2 | a low ferritin hands off to `iron_deficiency_panel`; one ferritin finding; no rival timeline | **pass.** Ferritin 8 and ferritin 20 (man) each give one `iron_deficiency` (this_week), and MCV is named in it. WHO inflammation branch: adult «زیر 70 … نه حدِ 30», child 8 y «زیر 70 … حدِ پایینِ محدودهٔ مرجع برای سنِ شما», child 3 y «زیر 30». TSAT/TIBC branch hands off too. |
| 3 | carrier warning exactly once | **pass.** M Hb 14.5 / MCV 72 / RBC 5.2 / HbA2 5.2: `microcytosis_no_anemia`, warning ×1 in the final recommendations. F Hb 11 / MCV 70 / HbA2 5.2: `microcytic_ida_likely`, ×1. Also ×1 with ferritin 20 (`iron_deficiency` + `hba2_elevated`) and with ferritin 8. |
| 4 | HbE/HbC/HbS spelling families never «طبیعی», never HGB | **pass** for Hb/Hgb/HGB-/Hemoglobin/Haemoglobin/هموگلوبین × S/C/E, HbAS, Hb-S, «35%» in the value, with and without HbA2 on the page. Outcomes are `HBx` in `noRef` or `HB_NAME_AMBIGUOUS` + unmapped; none went to HGB. `HbA2/E 35` → `hba2_elevated` "very high … sometimes HbE co-elutes" + carrier warning, which is appropriate. Hepatitis rows *alone* (HBs Ag, HBsAg, Anti-HBs, Anti-HBc, Anti-HBe, HBeAg, HBc Ab, HBs Ab, numeric IU/COI, full hep panel with ALT) are byte-identical to `9deba20`. Bare «HBs Positive» alone changed from silent `qual` to «تفسیر نشدند», an improvement. **Exception: R3-B2**, bare HBs/HBc/HBe with a qualitative value on a page that also has HbA2/HbF/HbA. |
| 5 | SICKLE is not electrophoresis evidence | **pass.** «Sickle test Positive» + «HbS 30» (no unit) → `SICKLE` + `HB_NAME_AMBIGUOUS`, HbS unmapped. Same for «Sickling Test» and «Sickle» + «Hemoglobin E». |
| 6 | N20 / N4 / N21 on new sentences | **pass except R3-B1.** Every new finding's urgency matches its action. `iron_deficiency_panel`'s `mcvClause` covers both directions. Under an Hb crisis the microcytic owner says «همان دستورِ فوریِ بالا را دنبال کنید». |
| 7 | paediatric use of any new literal | **pass** for the round-2 literals: MCV via `dir`, WHO text via `whoFerritinThreshold`/`isPedAge`, HbA2 at age 1 / 4 months → `noRef` (not graded). |

## P53 open questions 12–13: clinical opinion

- **Q12. HbA2 3.8–12 % is always read as "β-trait".**
  - β-thalassaemia trait is typically 3.5–7 %. Values above about 8–9 % are unusual and should raise co-elution
    (HbE, Hb Lepore, other variants) or artefact.
  - Recommendation: lower the `very_high` threshold from 12 to about 8 %. This is not blocking: 8–12 % still gets the
    carrier warning and a referral.
  - HbF 8 % or HbA2 1.1 % alone going to «توضیح داده نشدند» is acceptable; it makes no false reassurance.
  - HPLC peak labels going to unmapped is acceptable.
- **Q13. A small MCV with no Hb on the sheet goes to the net.** Acceptable as it is: nothing false is said.
  - A neutral sentence would be better, e.g. «گلبول‌ها کوچک‌اند؛ هموگلوبین روی برگه نیست، پس دربارهٔ کم‌خونی
    نمی‌گوییم؛ فریتین بخواهید». It must not fire under an Hct crisis or beside a unitless or urgent Hb (R2-B2).
  - Not required for merge.

## Non-blocking notes

1. **Co-fire with `low_rbc_hct_without_anemia`.** When Hb is in range, `microcytosis_no_anemia` and
   `low_rbc_hct_without_anemia` can co-fire. Examples: F 25, Hb 12.4, MCV 66, Hct 35 alongside `thal_trait_likely`; and
   Hb 14.5, MCV 72, RBC 3.5, Hct 30. Both say "no anaemia" and both are routine. `low_rbc_hct_without_anemia` then
   suggests B12, folate, reticulocytes and creatinine for what is a thalassaemia-trait picture. The output is coherent but
   redundant.
2. **Child false positive, pre-existing.** `thal_trait_no_anemia` still uses literal `MCV < 80` and `RBC > 5.5` /
   Mentzer < 13 at every age. A healthy 3-year-old (Hb 11.8, MCV 75, RBC 5.8, all graded normal) gets «گلبول‌ها
   کوچک‌ترند و تعدادشان بیشتر از حد معمول است … ویژگی ارثی». This is identical on `9deba20`. Register it and fix it
   with the same `isPedAge` → `dir` pattern.
3. **Stale ferritin sentence, pre-existing.** `microcytic_ida_likely` says «برای تأیید، فریتین باید اندازه‌گیری شود»
   even when ferritin is printed on the sheet (F Hb 11 / MCV 70 / Ferritin 8). It also quotes «(۸۰ تا ۱۰۰)» while the
   graded range is 80–96. Identical on `9deba20`.
4. **Very high ferritin framed as routine.** `microcytosis_no_anemia` owns ferritin at any height with a routine urgency:
   ferritin 3000 with MCV 72 gets «باید با پزشک بررسی شود … در نوبت عادی». Urgency is the same as on `9deba20`
   (`unexplained_abnormal`, routine), so this is not a regression. Very high ferritin (> 1000) deserves its own P item.
   TSAT 60 + ferritin 450 + microcytosis (iron-loading / sideroblastic picture) leaves TSAT to the net.
5. **Sickle-trait sheet gets no carrier warning.** «HbS 35 %» + HbA2 3.1 % → «مقادیری که موتور می‌سنجد در محدودهٔ
   طبیعی‌اند، ولی چند مقدار … تفسیر نشدند: هموگلوبین S (داسی‌شکل)». This follows the P53 decision (HbS has no approved
   range), but a sickle-trait carrier on a premarital sheet gets no carrier warning. Worth a P53 row.
6. **Unmapped variants.** HbD / «Hb D Punjab» (the second most common variant in Iran), HbH, Hb Bart's, HbSC and
   «هموگلوبین ای» go to unmapped, the same as `9deba20`. A sheet that has only these rows takes the legacy path. None of
   them becomes HGB.
7. **HbA with a mass unit.** «HbA 96 g/dL» → HGB 96 (`unmatched_abnormal`, this_week) by the CR10 design. It is
   implausible input and not dangerous, but an Hb > 25 g/dL should probably go to unmapped.
8. **CBC suggestion kept on a partial sheet.** `hba2_elevated` suggests «شمارش خون (CBC)» even beside Hb and MCV,
   because the `SUGGEST_TESTS` row needs HGB + WBC + PLT. On real CBC sheets it is correctly dropped.

---

## Round 3 — resolution (session `khanesh-project-2a`, 2026-09-24, uncommitted)

| id | fix | guard |
|---|---|---|
| R3-B1 | `microcytosis_no_anemia`: an in-range ferritin now gets the neutral sentence («… این مقدار کمبودِ آهن را رد نمی‌کند، به‌ویژه اگر به حدِ پایین نزدیک باشد …») and keeps the occult-GI sentence for men and women ≥ 50. Only a ferritin *above* its range says «کم‌احتمال‌تر». The 45/100 split is a new number, so it went to P53 Q14, not into code. | `M189`; `M184i` changed on purpose |
| R3-B2 | `adapter.js`: for HBs/HBc/HBe (and French «hemoglobine»), page-level electrophoresis evidence counts only for a *numeric* value; qualitative values go to `HB_NAME_AMBIGUOUS` whatever is on the page. S/CO, COI and index now join IU as hepatitis units. | `M189b` |
| R3-CR1 (code) | `patterns.js`: a finding that will be shown only as its `brief` under a blocker now covers keys only through the text actually shown (`brief` + new `brief_warnings`), not `RULE_READS`. The `microcytic_anemia` brief names the same-direction values (low HCT/RBC/MCH, high RDW) and the HbA2 clause, and keeps the carrier warning via `brief_warnings`. Contradicting directions (high HCT, high MCH) go back to the net. Also R3-CR5: the brief no longer says «… دارید». | `M189c` |
| R3-CR2 (code) | `prompt.js` `buildEngineRecommendations`: warnings are never forbid-filtered, and a finding whose own headline/must_say is about the forbidden word is exempt from *another* finding's forbid. A finding's own suggestions are still filtered (A2). | `M189d` |
| R3-CR4 (code) | `server.js` `mergePages`: an ambiguous name's merge key carries the value's shape (`%` / number / text), so «HbS 38 %» and «HBs: Positive» on one page both survive. | `T26` |

Not fixed, logged: R3-CR3 (specialist referral «(داخلی یا قلب)» dropped), R3-CR6 (N8 wording «درخواست آزمایش تزریق خون …»; a milder conditional warning beside an ER-now final), R3-CR7 (the graph path still has its own copy of the old recommendation logic). The medical non-blocking notes are in P53 Q15–Q16.

**Measured:**
- Working tree `npm test`: 662 · 643 · 0 fail · 19 todo.
- Pre-fix copy of the tree (taken before these edits; `prompt.js` edit reverted in the copy) with the new test files: 662 · 637 · **6 fail**. The six are exactly `M189`–`M189d`, `T26`, and `M184i`, which was changed on purpose.

**Round 4 has not run.**
