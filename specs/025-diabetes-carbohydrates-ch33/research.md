# Research: Carbohydrates and Diabetes (Tietz ch 22/33), gaps only

All probes ran on `HEAD 2252643`. Output is in [snapshots/before.txt](snapshots/before.txt) (25 panels).

Suite baseline on the same tree: **1801 tests, 1799 pass, 1 fail**. The failure is T15e (payment, `api-contract.test.js:742`, 503 ≠ 200). It was failing before this feature and has nothing to do with it.

## Duplicates confirmed in code (condition 1)

These are listed in the spec. Each was checked by reading the code or by a probe:

- `glycemia`/`prediabetes_range`/`diabetes_range`: patterns_biochem.js:1319–1460.
- `GDM` at :2512, from the Iranian 2021 guideline; the 100 g test and the GCT (50 g screen) are already wired in adapter.js:165–182.
- `neonatal_hypoglycemia`, with its threshold set by user decision.
- Nitroprusside text: patterns_biochem.js:1129 and :2676.
- `lactate_elevated` (< 4) and the sepsis rule (≥ 4, patterns_infectious.js:253).
- eAG: `patterns_p109.js`.

Nothing from this list is rebuilt.

## Decisions

### D1: Treatment target for HbA1c in a reported diabetic

- **Decision**: < 7 % = within the common target; ≥ 7 % = above it.
  - It applies only when `dm2` is active (the condition is already in `ACTIVE_CONDITIONS`), the patient is not pregnant, and the sheet's own numbers do not themselves show diabetes.
  - When the sheet shows diabetes, `diabetes_range` keeps its text, but the "confirm the diagnosis" sentence is replaced by the target sentence, because the patient already has the diagnosis.
  - The text always adds that the doctor sets each patient's own target.
- **Rationale**: N22 says a reference range is not a target. The engine already has the same two-arm shape for LDL (`dmTarget`, patterns_biochem.js:2388, with `applied_conditions: ["dm2"]`), and this decision copies it.
- **Source**: the extraction quotes Tietz quoting ADA. Neither document was opened this session. `guidelines.js` has `ADA_SOC` (diagnosis) and `ADA_SOC_CVD` (lipids), but no glycaemic-target entry.
  - Under N39 no `sources:` is attached.
  - The number goes to P143 as a reviewer question, with the note «if rejected, remove the target arm; nothing else depends on it».
- **Alternatives**:
  - Individualised targets (< 8 % for older adults). Rejected: age-specific targets are not in the extraction.
  - Citing `ADA_SOC`. Rejected, because its scope is diagnosis.

### D2: Glucose and the prediabetes band in a reported diabetic

- **Decision**: with `dm2` active (and not pregnant), `prediabetes_range` says neither «پیش‌دیابت» nor «can prevent progression to diabetes». `diabetes_range` drops «برای قطعی‌شدن تشخیص… تکرار شود».
  - Both get one sentence instead: for someone already diagnosed, this number shows how well blood sugar is controlled, and the doctor compares it with the patient's own target.
  - No numeric glucose target is given (none is in the extraction).
  - Urgency is unchanged for the same numbers.
- **Rationale**: this is the G3 shape that the planning probe found («G3 dm2 a1c 6.2», «G3 dm2 fbs 150»).
- **Alternative**: an ADA pre-meal target of 80–130. Rejected: no source was opened, and condition 1 adds only what helps.

### D3: Insulin and C-peptide reference ranges (condition 2)

- **Decision**: the printed range comes first and keeps **both** edges.
  - Today `PRINTED_FIRST_KEYS` keeps only the upper limit (`[0, hi]`, meant for antibodies), which is wrong for a concentration that can be low.
  - A new set, `PRINTED_FIRST_BOTH_KEYS`, holds `INSULIN` and `C_PEPTIDE` and uses `printedRangePair` as returned.
  - With no printed range, the fallbacks in `refs.js` are insulin **2.6–24.9 µIU/mL** and C-peptide **1.1–4.4 ng/mL**, the ranges common Iranian kits print.
  - Tietz gives 2–25 and 0.78–1.89.
- **Rationale**: condition 2. Tietz's C-peptide upper limit of 1.89 would mark ordinary Iranian sheets high, the N55 shape.
- **Units**:
  - Conversions are added to `units.js` (only when the unit is printed): insulin pmol/L → µIU/mL ÷ 6.945 (the same factor P69 proposes), C-peptide nmol/L → ng/mL ÷ 0.331, and C-peptide pmol/L → ng/mL ÷ 331.
  - A printed range in the original unit is used **without** conversion: value and range come from one column (N12/N3, "a converted value must not be compared to a printed range").
  - **Verify while implementing**: how the adapter treats a printed range on a row whose value it converts. Read the existing path, for example HbA1c mmol/mol with a printed range. Don't assume it.
    - **Verified (T003)**: `printedRefsAll` keeps the range in the printed unit. The value is converted by `toConventional`, and the ratio `value/raw` is in `unitConversions` (the same source as the `printedRanges` display at adapter.js ~3500). `printedBothScaled` scales the pair by that ratio.
    - Probe «G4 ins pmol»: 200 pmol/L against «18–173» is graded 28.8 against 2.59–24.9, high. Test US2b covers both directions.
    - Insulin and C-peptide are in `SI_CONVERSIONS`, so a unitless value goes to `decideUnit` (no guess; probe «G4 ins unitless» gives `unit_unknown_values`).
  - A unitless value with no range is not graded (`decideUnit`, N3).
- **Grading mode**: `binary`. No CTCAE grade.
- **Alternative**: Tietz ranges as fallback. Rejected under condition 2.

### D4: When insulin is "not suppressed" during hypoglycaemia

- **Decision**: the rule fires when glucose is < 54 mg/dL on the same sheet (the existing level-2 cut-off in `hypoglycemia`; no new glucose threshold) and insulin is graded **not low** (within or above its range).
  - **Endogenous shape**: C-peptide is also not low, or absent.
  - **Exogenous shape**: insulin is high and C-peptide is low.
- **Rationale**:
  - "Not low" against the range in use is the conservative reading. The Endocrine Society criterion (insulin ≥ 3 µIU/mL, C-peptide ≥ 0.6 ng/mL) sits near the bottom of these ranges, but it was not opened this session.
  - The extraction's "insulin > 10 µIU/mL, C-peptide > 0.6 nmol/L" is stricter and would miss real cases, so it is recorded as a conflict and not applied.
- **Urgency**: the finding takes `soon`. It never lowers the `hypoglycemia_significant` emergency, which stays the owner of the glucose (N20).
  - It is `always_show` with a brief, so it survives under the emergency blocker (N18).
- **Wording**: possibility only. «انسولینوما» is never asserted. The text names only tests to order: C-peptide (if absent), proinsulin, and a sulfonylurea screen.

### D5: HbA1c < 4 % and > 15 %

- **Decision**:
  - A new owner, `hba1c_low`, fires when HbA1c is graded low (adult range 4–5.6; under 16 the range is `PED_REFS`). It is `routine`, or `this_week` when the blood count is abnormal.
  - For HbA1c > 15, `diabetes_range` gets one added sentence; urgency is unchanged.
  - Both name a haemoglobin variant and a shorter red-cell lifespan. When `hbVariantState(e)` reads a variant on the same sheet, they say so.
- **Edges**: < 4 (strict) and > 15 (strict). Probe at 3.9 / 4.0 / 15.0 / 15.1.

### D6: Direction of HbA1c doubt (N21)

- **Decision**: inside `a1c_diabetes_range_unreliable`:
  - Iron deficiency shown on the sheet (MCV < 80 and `ferritinBelowIdCut(e)`) gives «ممکن است بیشتر از واقع باشد».
  - Graded high RETIC gives «کمتر از واقع».
  - Both, or neither, keep today's two-sided text.
- Only the text changes, and only on those sheets.

### D7: Anti-GAD and anti-IA-2

- **Decision**: register them in `serology.js` beside `ANTI_CCP`, on the `assay_printed` path, with a positive verdict only against the printed cut-off. A qualitative word goes through `qualVerdict`.
  - The rule `islet_autoantibody_result` goes in `patterns_autoimmune.js`, where `explainsOf` and the other `assay_printed` readers already live. It is `routine`; when positive with glucose or HbA1c in the diabetes range, it is `this_week`.
  - Its text: "supports an autoimmune type of diabetes (type 1 or LADA)", never a diagnosis.
  - No cut-off printed means «خوانده شد، تفسیر نشد».
- **Spellings**: `antigad`, `gad`, `gadab`, `gad65`, `antigad65`, `antiglutamicaciddecarboxylase`, `antiia2`, `ia2`, `ia2a`, `ia2ab`.

### D8: HOMA-IR and insulin antibody rows

- **Decision**: no change needed. HOMA-IR is unmapped today and already listed in `_engine.unread` (probe «G4 homa»), and it stays there (no threshold, P69 unreviewed).
  - «Insulin Antibody» must **stay** unmapped once `insulin` is added. The probe must show that `resolveAlias` (the prefix rule) does not turn `insulinantibody` into `INSULIN` (N25).
  - If it does, add an explicit exclusion and a test.

### D9: Fasting glucose range (condition 2)

- **Decision**: keep 70–110. This follows the user's decision of 2026-10-03 (REF_DIFF) and matches what Iranian sheets print. `prediabetes_range` already flags ≥ 100 (probe «FBS105» in the spec).
- Recorded in P143 as «unchanged, by condition 2».

## Conflicts recorded, not applied

| Item | Extraction | Engine / choice |
|---|---|---|
| Fasting glucose reference | 74–99 | 70–110 (D9) |
| C-peptide fallback | 0.78–1.89 ng/mL | 1.1–4.4 (D3) |
| Hyperinsulinism cut-offs | insulin > 10 µIU/mL, C-peptide > 0.6 nmol/L, glucose ≤ 45 | "not low" against the range in use, glucose < 54 (D4) |
| Neonatal hypoglycaemia | < 30 (term), < 20 (preterm) | < 40 (user decision, P63) |
