# specs/008 — clinical review

**Verdict: FAIL**

Reviewed 2026-09-23 against the working tree on `9deba20`. I reviewed only the specs/008 hunks. The concurrent
microcytic_anemia text/`always_show` edits and `M187*` are out of scope. The approved numbers (Q1–Q3, clarify) are
not questioned here; the open items are in `P53`.

Suite on the tree: `npm test` → `tests 636 · pass 617 · fail 0 · todo 19`. This matches the stated baseline.
Base comparisons used `git archive 9deba20 khanesh-server/rules` in a scratch directory.

---

## Blocking

### B1: the moved Hb band silently drops the microcytic work-up (N23 / N1), and P53 understates its size

`microcytic_anemia` reads HGB `dir === "low"`. The research (R2) and `P53` row 10 say the move "adds men with Hb
13.7–13.9" to the pre-existing microcytosis-without-anaemia gap. That is too narrow. The band that moved is:
- men 50–69: 13.3–13.99
- men 70–74: 12.4–13.99, because they were on the adult 14 band before
- men 20–49: 13.7–13.99
- women: 12.0–12.29

Men of 50 and over with microcytosis are the group where the dropped sentence (occult GI blood loss, FOBT) matters most.

Measured panel: M 65, Hb 13.5, MCV 72, RBC 5.0, no ferritin.

- `9deba20`: `microcytic_ida_likely` / **this_week**, with action «این هفته با پزشک وقت بگیرید؛ در بزرگسالان، کمبود آهن باید علت‌یابی شود (به‌ویژه منبع خونریزی پنهان گوارشی).» and suggest `["فریتین","آهن سرم","TIBC","بررسی خون مخفی در مدفوع (FOBT)"]`.
- tree: `unmatched_abnormal` / **routine**, with «1 مورد خارج از محدوده مرجع است، از جمله MCV (حجم گلبول قرمز) با مقدار 72 (طبیعی 80–96). برای این ترکیب توضیح آماده‌ای نداریم.»

Same result for M 72, Hb 12.8, MCV 72 and for F 40, Hb 12.1, MCV 74: this_week becomes routine/unmatched.

Hb 13.5 at 65 being "not anaemic" is the approved decision. Losing the ferritin/FOBT instruction for the MCV 72
beside it is not an approved decision. It is the N1/N23 silent under-read, in the population where microcytosis is
a GI-malignancy flag. There are two ways to fix it:
- give microcytosis without anaemia (MCV < 80, RBC not high, Mentzer ≥ 13) an owner that carries the ferritin/FOBT
  sentence;
- or get an explicit reviewer decision on that exact panel and record it in `P53` with the true band widths.

### B2: «Hemoglobin S» (the full-word spelling) still becomes HGB, giving a false emergency on a sickle-trait sheet (N25 / N3)

FR-007 and SC-003 require that the HbS identity is separated. The adapter handles `hbs`, `hbs%` and `sickle`, and its
own comment names the failure: «قاعدهٔ جمعِ آن «hbs» را به «hb» یعنی HGB می‌بَرد ⇒ «HbS 40» = Hb 40». But `NAME_MAP`
has `hemoglobina`, `hemoglobina2` and `hemoglobinf`, and has **no `hemoglobins`/`haemoglobins`**. So «Hemoglobin S»
falls through to `resolveAlias`, the plural rule strips the s, and the row becomes `hemoglobin` = HGB. «Hemoglobin S»
is the spelling electrophoresis reports print, next to «Hemoglobin A2» / «Hemoglobin F», which this feature now reads.

Measured on the tree (M 24; page: Hemoglobin A 60 %, Hemoglobin A2 3.1 %, Hemoglobin F 0.8 %, Hemoglobin S x %):

| Hemoglobin S | result |
|---|---|
| 35.2 % (sickle trait) | `unit_unknown_values` / **emergency**: «هموگلوبین (35.2): واحد روی برگه خوانده نشد، ولی این عدد فقط با یکی از واحدهای رایج ممکن است، و با همان واحد در محدودهٔ خطرناک است.» action «همین حالا به اورژانس مراجعه کنید.» |
| 0 % | `unit_unknown_values` / this_week: «هموگلوبین (0): … ممکن است عدد درست خوانده نشده باشد» |
| 8 %, with `Hb 14.5 g/dL` printed (either order) | the HbS row **vanishes** (HGB = 14.5, nothing in noRef, unmapped or qual) |
| «Positive» | lands in `qual`, which has no reader. This is the G9 silent drop the spec was written to close. |

«Hemoglobin C» and «Hemoglobin E» end in `unmapped`, which violates SC-003. The behaviour is the same on `9deba20`,
so specs/008 did not introduce the defect. But it is inside this feature's declared scope, and the feature reads the
rest of the same page. The spelling list in the spec's Independent Test and in `M186*` never tried the full word.

⚠️ When fixing: `hemoglobine` (norm of «Hémoglobine», the French for plain haemoglobin) must **not** become HBE. Gate
the full-word S/C/E forms the same way the `hbs/hbc/hbe` forms are gated. Do not add a bare `hemoglobine` → HBE entry.

### B3: for unknown sex, the ferritin grading and the rule cut-off disagree, and the ACD text contradicts the label (FR-005)

`ferritinRef` gives `[30, 300]` for `sex !== 'M' && age >= 50`, which **includes unknown sex**. `ferritinIdCut`
returns 30 only for `sex === "F" && age >= 50`, so unknown sex gets 15. Specs/008 introduced this mismatch.

Measured panels, age 55, no sex on the sheet:

- Ferritin 20, Hb 10.5, MCV 86, iron 45, TIBC 300:
  - The graded row shows `FERRITIN=20↓[30–300]` (labelled «پایین»).
  - `anemia_of_chronic_disease` fires with «برخلاف کمبود آهن، اینجا ذخیره آهن بدن پایین نیست — ولی بدن نمی‌تواند از آهن موجود خوب استفاده کند.»
  - The same finding carries `forbid: ["آهن خوراکی","قرص آهن"]` and «مصرف خودسرانه قرص آهن معمولاً کمکی نمی‌کند».
  - So the finding says stores are not low while the row beside it says they are, and it steers away from iron.
  - The same panel with `sex: F` now correctly gives `iron_deficiency`.
- Ferritin 20, Hb 13 → `unmatched_abnormal`: «فریتین با مقدار 20 (طبیعی 30–300). برای این ترکیب توضیح آماده‌ای نداریم.»
  On `9deba20` there was no flag, and with `sex: F` the tree fires `iron_deficiency`.

Fix: `ferritinIdCut` and `ferritinRef` must branch on the same sex predicate. The spec says «unknown sex keeps the F
logic». Whichever way is chosen, the label and the finding must agree.

### B4: «HbS: Positive» alone leaves the engine path, so acceptance US3-2 is not guaranteed

The spec's acceptance scenario US3-2 says «Given «HbS Positive» alone … the patient never receives a normal result and
never a hepatitis-B finding». The adapter sends it to `unmapped` (tested in `M186b`). With nothing graded, no owned
`ungraded` and no `noRef`, `server.js:909-915` sets `engineCandidate = null`, so the sheet goes down the **legacy LLM
path**. There, the model sees the raw text «HbS Positive» and judges severity itself. That is exactly the
HBs/HbS confusion the adapter layer exists to prevent, now handed to the model (N13 shape).

Mixed sheet: a normal CBC plus «HbS: Positive» gives findings `[]` and abnormal `[]`, so `buildNormalResult` returns
«نتایج آزمایش شما در محدوده طبیعی است» with only an `ocr_warnings` line. That is a normal result, which the
acceptance scenario forbids.

Fix: an ambiguous variant row must keep the engine path and must not produce the «طبیعی است» summary. One option is
an `ungraded`/`noRef`-like entry with a neutral label that does not assert sickle. Lock it with an api-contract test,
because the engine-level test cannot see the server's routing.

---

## Non-blocking (record in P53 or fix in passing)

1. **HbA2 far above the trait range is still called β-thal trait.** `HbA2 27 %` gives `hba2_elevated`: «هموگلوبین A2 شما 27٪ است که از ۳.۸ بالاتر است؛ این مقدار معمولاً با «صفتِ تالاسمیِ بتا» … می‌خواند.» Values above about 8–10 % on HPLC/CE usually mean HbE, Lepore or another co-eluting variant, not β-trait. Suggest an upper bound on the «trait» wording (P53).
2. **HbA2 raised beside megaloblastic anaemia.** F 50, Hb 9.8, MCV 112, B12 90, HbA2 4.1 fires `overt_b12_deficiency` plus `hba2_elevated` («معمولاً … صفتِ تالاسمیِ بتا»). B12/folate deficiency raises HbA2 by itself. Add it as a P53 question, or add a clause when macrocytosis or low B12 is on the sheet.
3. **HbA2 lost under an emergency.** `thalOwnerFires` asks whether the owner's `match` fires, not whether its text is shown. With Hb 9.5, MCV 64, RBC 5.9, WBC 1.8, PLT 60, HbA2 5.2, `microcytic_thal_likely` sits under `pancytopenia` and no shown text mentions HbA2. This is acceptable under an emergency, but it is a zero-mention case that the M186g sweep does not cover.
4. **A bare «HBs» on a page with HbA2** (a premarital sheet) becomes `HBS` whatever the unit, so an anti-HBs titre such as «HBs 150 mIU/mL» is listed in «تفسیر نشدند» as «هموگلوبین S (داسی‌شکل)». This is not an interpretation, but it is a mislabel. Consider refusing IU/mIU units in the ambiguous branch.
5. **The ferritin wording «در محدودهٔ چاپ‌شده جا می‌گیرد»** (M, ferritin 12–29) calls the engine's range "printed". The lab's own printed range may be 30–400, which contradicts it (N5 wording). «در محدودهٔ مرجعِ ما» is accurate.
6. **The `whoOnly` text still says «نه آستانهٔ معمولِ ۱۵»** for women aged 50 and over, whose cut-off is now 30. It is attributed to WHO, so it is not false, but it no longer matches the engine's own cut-off for that group.
7. **Adult HbF above 2 %** has no reader and goes to `unmatched_abnormal`. This is the approved scope, noted for completeness.
8. **An adult of unknown sex** now has an Hb lower limit of 12.0 (it was 12.3), following the female default. This is consistent with "unknown sex keeps F logic", but an unknown-sex man with Hb 12.1 is not flagged. It is pre-existing in shape.

## Checked and clean

- Band edges 16/20/50/70 for both sexes, the 12–15-year hold, unknown age giving 13.7, upper limits unchanged, and PED_REFS governing under 16 (probe `M13_Hb138`; ferritin/iron at ages 1/5/10/13/15 identical to `9deba20`).
- The ferritin hold-the-line: M 40, ferritin 20 keeps `iron_deficiency` with the three-way text; F 49 vs F 50 at ferritin 25 matches the clarified change; F 58, anaemic, ferritin 20 now gets `iron_deficiency` instead of ACD.
- Iron 50–59: ACD still fires, and its text makes no claim that iron is below range.
- HbA2 thalassaemia owners: exactly one HbA2 mention on the trait, IDA and HbA2-alone panels. The IDA branch says «کمبودِ آهن HbA2 را کمی پایین می‌آورد», which is correct. The electrophoresis suggestion is dropped when HbA2 is printed. HbA2/HbF are not graded under 2 years.
- Hepatitis freezes: HBsAg fires `hbsag_reactive`; Anti-HBs and Anti-HBc stay in `qual`; «HbA1c» never becomes HBA.
- Engine boundary: no prompt or model change (N9 is clean). No qualitative-to-number conversion (N6 is clean: non-numeric variant values are refused).

---

## Round 1 — resolution (2026-09-23, implementer)

| item | fix | guard (red on `9deba20` unless noted) |
|---|---|---|
| B1 microcytic work-up lost | new routine rule `microcytosis_no_anemia` (MCV < 80, Hb not low, `thal_trait_no_anemia` not firing): ferritin, and GI-bleeding sentence for men / women ≥ 50; three-way on Hb (N4); counts as a thal owner for HbA2 | `M184f` |
| B2 «Hemoglobin S/C» → HGB | `hemoglobins/hemoglobinc` join the electrophoresis gate; `hemoglobine` (French) never → HBE | `M186h` |
| B3 unknown-sex ferritin | `ferritinIdCut` uses the same non-male ≥ 50 row as `ferritinRef` | `M185e` |
| B4 «HbS: Positive» off the engine path | an ambiguous bare name also adds the neutral key `HB_NAME_AMBIGUOUS` to `noRef` (engine path kept, no sickle/hepatitis claim); «Sickle test: Positive» → HBS in `noRef` | `M186i` |
| note 1 HbA2 27 % | `very_high` (> 12) wording: above trait range, possibly HbE co-elution | `M186l` |
| note 2 megaloblastic + HbA2 | `hba2_elevated` adds a B12/folate sentence when MCV > 100 | — |
| note 4 bare HBs on another page | electrophoresis evidence is per page | `M186k` (green on `9deba20` — there the row went to `qual`; red on the sheet-wide variant, measured) |
| note 5 «چاپ‌شده» | → «مرجع» | — |
| note 6 WHO text «۱۵» | cut value comes from `ferritinIdCut(e)` | — |
| notes 3, 7, 8 | recorded in P53 row 11 | — |
| code #2 flag suffix, #3 normal/low HbA2 in owners, #6 partial electrophoresis, #7 range literal | fixed | `M186j`, `M186l` |
| code #1 freeze comments | comments now state the hashes also contain the concurrent session's `microcytic_anemia` text; the two changes must be committed together | — |

Suite after round 1: `647 · 628 · 0 · 19 todo` (working tree, includes the concurrent session's M187/M188 work). RULES 137.

---

## Round 2 — medical review

**Verdict: FAIL**

Reviewed 2026-09-24 against the uncommitted working tree on `9deba20`. Scope: the round-1 fixes (B1–B4 and notes) and
the concurrent `microcytic_anemia` change (`always_show`/`brief`, HCT/RBC/MCH/RDW sentences, `M187`/`M187b`).
Suite re-measured on the tree with `node --test`: `tests 647 · pass 628 · fail 0 · todo 19`. For comparison I ran
`9deba20` (`git archive` of `khanesh-server/rules` into a scratch directory, with `node_modules` copied in). Every panel
below comes from `runEngine` → `runPatterns` → `buildEngineRecommendations`, measured. None was reasoned out.

### Round-1 items, verified

| item | verdict | evidence |
|---|---|---|
| B1 | fixed for adults | M 65, Hb 13.5, MCV 72, RBC 5.0 → `microcytosis_no_anemia`/routine, with ferritin and the conditional GI-bleeding sentence. M 72 Hb 12.8 and F 40 Hb 12.1 behave the same way. **The new rule opens R2-B1 and R2-B2 below.** |
| B2 | fixed for the spellings listed | «Hemoglobin S 40 %» → `HBS` in noRef; without a unit and without evidence it becomes `HB_NAME_AMBIGUOUS`. «Hemoglobin C/E», «Hb S/C/E» → own keys. «Hémoglobine» never becomes HBE. **The same mechanism is still open for `Hgb`/`HGB`: R2-B4.** |
| B3 | fixed | Age 55, no sex: ferritin 25 → `FERRITIN=25↓[30–300]` together with `iron_deficiency`. Ferritin 20, Hb 10.5, iron 45 → `iron_deficiency`, not ACD. Age 40, no sex: `[12–150]` together with ACD («ذخیره آهن پایین نیست»), which is consistent with the F < 50 cut-off of 15. |
| B4 | fixed | «HbS: Positive» alone → noRef `HB_NAME_AMBIGUOUS`, so it stays on the engine path (`server.js:910`). `buildNormalResult`: «مقادیرِ این برگه خوانده شدند، ولی موتور هیچ‌کدام را تفسیر نکرد.» With a normal CBC it gives «مقادیری که موتور می‌سنجد در محدودهٔ طبیعی‌اند، ولی چند مقدارِ این برگه تفسیر نشدند.» It is never «نتایج … طبیعی است», and it makes no hepatitis claim. |
| note 1 | fixed | HbA2 27 % → «حتی از حدِ معمولِ «صفتِ تالاسمیِ بتا» هم بالاتر است؛ … (مثلاً HbE) …». HbA2 12.5 % with a thal-trait CBC gets the same clause inside `thal_trait_likely`. |
| note 2 | fixed | HbA2 4.5 + MCV 105 → «در کمبودِ B12 یا فولات HbA2 می‌تواند کمی بالا برود…» |
| ferritin boundaries | clean | F 50: 29 → ID, 30 → none. F 49: 25 → none, 14 → ID (the text says «در محدودهٔ مرجع جا می‌گیرد… زیرِ حدی…», which matches the 12–150 label). Child 10, ferritin 20 → none (PED dir). Age 15, 13 → none; age 16, 13 → ID. M 40, iron 55, ferritin 250 → ACD still fires. |
| pancytopenia sheet (M 62) | clean | The emergency set is unchanged. `microcytic_ida_likely` now shows under the blockers as `brief`: «کم‌خونی هم دارید: هموگلوبین 8.3، هماتوکریت 23.7، و گلبول‌ها کوچک‌اند (MCV 65.8). علت‌یابیِ آن (مثل فریتین) هم باید در کنار موارد فوریِ بالا با پزشک مطرح شود.» The final instruction is still «بدون اتلاف وقت فوراً به اورژانس مراجعه کنید.» Only `LYMPH_ABS` is uncovered, and it is listed. |
| Hb 6.2 crisis + MCV 68 | clean | The microcytic action defers («همان دستورِ فوریِ بالا را دنبال کنید…»). There is no rival timeline. |
| hepatitis freezes | clean | «HBsAg», «HBs Ag» → `hbsag_reactive`. A HBsAg row on an electrophoresis page still reaches `qual`. |

### Blocking

#### R2-B1: `microcytosis_no_anemia` fires on normal children (a flat adult cut-off, N23)

The match is `t.MCV < 80`, a literal adult number. It is not the graded `dir`. RCPCH MCV is 70–86 at ages 0.5–5 and
77–91 at 6–11, so the rule fires on healthy children whose MCV row is printed as normal right beside the finding:

| panel (F) | graded | finding |
|---|---|---|
| 1 y, Hb 11.5, MCV 75 | `MCV=75[70–86]` normal | `microcytosis_no_anemia`: «اندازهٔ متوسط گلبول‌ها (MCV) 75 است که کوچک‌تر از حد طبیعی است…» + ferritin + electrophoresis |
| 3 y, Hb 12, MCV 76 | `MCV=76[70–86]` | same |
| 6 y, Hb 12.5, MCV 78 | `MCV=78[77–91]` | same |
| 10 y, Hb 13, MCV 79 | `MCV=79[77–91]` | same |

This is a false finding on the ordinary paediatric CBC, which is the N20 failure direction: it errs on the common case.
The text contradicts the label beside it, and it sends parents to ferritin and haemoglobin electrophoresis for a
normal child. `CLAUDE.md` N23 names exactly this trap («A flat adult cut-off applied to a child»), and specs/008 already
guards against it for ferritin with `isPedAge`. The rule needs the same treatment: below 16, use `MCV.abnormal && dir === "low"`.

#### R2-B2: `microcytosis_no_anemia` ignores a ferritin that is printed on the sheet (N8, N20, N21)

The rule never reads FERRITIN. Its text and action always say «فریتین این دو را از هم جدا می‌کند» and «آزمایش فریتین
را بخواهید».
- **M 55, Hb 14.5, MCV 72, RBC 5.0, ferritin 10.** `iron_deficiency`/this_week and `microcytosis_no_anemia`/routine
  both fire. The recommendation list carries «این هفته با پزشک وقت بگیرید…» and **«آزمایش فریتین را بخواهید.»**
  That asks for a test already printed on the sheet, and it is low. The routine card says «اگر کمبودِ آهن تأیید شود»
  right beside the finding that has just confirmed it. That is two findings with two timelines about one process.
  F 30, Hb 12.5, MCV 74, ferritin 8 gives the same result.
- **M 55, Hb 14.5, MCV 72, ferritin 200.** The only finding tells the patient to go and request ferritin. It never says
  that a normal ferritin printed on this sheet argues against iron deficiency and makes the inherited cause (or
  another cause) more likely. That is N21: the sheet can speak to the cause, and the text withholds it.

This needs the three-way branch on FERRITIN: below the cut (hand off to `iron_deficiency`, no second timeline) / not
below / not measured. The ferritin request and the «فریتین جدا می‌کند» sentence belong only in the last arm.

#### R2-B3: the concurrent `microcytic_anemia` change covers MCH and HCT in every direction but speaks for only one (N12, N18/M156)

- `(mch?.abnormal ? … "MCH هم X است که همین کوچکی را تأیید می‌کند")` branches on `abnormal`, not on direction.
  **F 30, Hb 10, MCV 72, MCH 35** gives «(MCH هم 35 است که همین کوچکی را تأیید می‌کند)». A *high* MCH beside a low MCV
  (an interference artefact such as lipaemia or a turbid sample) is presented as confirming microcytosis. The sentence
  is wrong for this direction, which is the N12 shape.
- The rule's source now reads `MCH` and `HCT`, so `RULE_READS` marks them covered in every direction, but sentences
  exist only for the low arm. Measured, `9deba20` against the tree:
  - F 30, Hb 10, MCV 72, **HCT 47↑**: `9deba20` gives `microcytic_ida_likely` + `unexplained_abnormal`. The tree gives
    `microcytic_ida_likely` only. HCT 47 is not mentioned anywhere.
  - F 30, Hb 10, MCV 72, **MCH 35↑**: `9deba20` gives `unexplained_abnormal`. The tree drops it; the only mention is
    the wrong sentence above.

  The change's own comment names this trap («هر جهتی که این کلیدها می‌توانند بگیرند جمله دارد») and closes it for
  RBC-high and RDW-low (`M187b`). HCT-high and MCH-high were missed. An HCT that is high while Hb is low is an
  internally inconsistent sheet. That is exactly what the reader must be told, not have silently absorbed.

#### R2-B4: «Hgb S» / «HGB S» still become HGB, the same mechanism as round-1 B2 (N25, N3)

`hgbs` is in neither `HB_AMBIGUOUS` nor `NAME_MAP`, so `resolveAlias`'s plural rule strips the `s` and maps it to `hgb`,
which is **HGB**. `Hgb A`, `Hgb A2` and `Hgb F` are not recognised either, so the page gives no electrophoresis evidence.
Measured on the tree (the result is identical on `9deba20`, so the defect predates this change, but it is inside the B2
scope that round 1 declared blocking):

| sheet (M 24) | result |
|---|---|
| Hgb A 57 %, Hgb A2 3.1 %, Hgb F 0.8 %, **Hgb S 40 %** | `unit_unknown_values`/**emergency**: «هموگلوبین (40): … با همان واحد در محدودهٔ خطرناک است.» + «همین حالا به اورژانس مراجعه کنید.». The A/A2/F rows go to `unmapped`. |
| HGB A2 3.1 %, **HGB S 38** | the same emergency |
| Hb 14 g/dL + **Hgb S 38** | the HbS row **vanishes**: it is not in noRef, not in unmapped, and not in qual |
| Hb 13 g/dL + **Hgb S 40 %** | the HbS row vanishes, and Hb 13 goes to `unmatched_abnormal` |

A sickle-trait electrophoresis sheet in the `Hgb` spelling (the US/LabCorp template, and the `HGB` prefix that
analysers print) sends a healthy carrier to the emergency room. When a CBC is also on the sheet, the variant result is
silently dropped. The fix has to close the class, not add one more spelling: route every `(hb|hgb|haemoglobin|hemoglobin)`
+ `{s,c,e}` form through the gated branch, and every `… + {a,a2,f}` form to its variant key.
`hemoglobine`/`haemoglobine` (French) stays excluded.

### Non-blocking

1. **Note 4, not fully closed.** On the same page as HbA2, «HBs 150 mIU/mL» (an anti-HBs titre) still becomes `HBS` and
   is listed as «هموگلوبین S (داسی‌شکل)». This is a mislabel, not an interpretation. An IU/mIU unit should be refused in
   the variant branch.
2. **Note 5 was fixed in only one of two branches.** The `whoOnly` text still says «در محدودهٔ چاپ‌شدهٔ آزمایشگاه
   «طبیعی»» (an N5 wording issue), and its new `${ferritinIdCut(e)}` prints a Latin «30» inside the Persian sentence
   («نه آستانهٔ معمولِ 30»).
3. **IRON is absorbed by substring.** M 55, Hb 14.5, MCV 72, iron 30, TIBC 450: `faName(IRON)` = «آهن» appears in
   «کمبودِ آهن», so IRON 30↓ counts as covered, yet no sentence states it. TIBC is listed; iron is not. This coverage
   weakness predates the change, but the new rule now reaches it. R2-B2's three-way branch should name iron/TIBC when
   they are printed.
4. **B4 routing** is locked by `M186i` (engine) plus the generic `T21` (noRef keeps the engine path). The api-contract
   test requested in round 1 for the HbS sheet itself was not added.
5. **Bio-Rad HPLC peak labels** («F», «S-window», «Ao») end in `unmapped`, and only a bare «A2 %» is read. They are not
   dangerous (they reach «تفسیر نشدند»), but SC-003 is not met for analyser-native labels.
6. **Pre-existing, noted:** with CRP 30, ferritin 40, iron 40 and Hb 11, the rules
   `iron_deficiency_masked_by_inflammation` and `anemia_of_chronic_disease` fire together, and they read in opposite
   directions. Same on `9deba20`.

### Engine boundary

No prompt or model change is used as a clinical fix (N9 clean). No qualitative-to-number conversion: non-numeric variant
values go to noRef/unmapped (N6 clean). No eval-gate run exists for this change (`.claude/eval-gate/runs/` holds only
`20260803T224303-6e90686`), so this verdict is recorded here only.


## Round 2 — resolution (2026-09-24, implementer)

Sources: the medical review above (R2-B1…R2-B4, notes 1–6), `medical_review_round2.md` (R2-B4 carrier warning, R2-B5),
and the round-2 code review (CR1–CR11, builder findings #2–#5).

| item | fix | guard (red on the pre-fix tree) |
|---|---|---|
| R2-B1 / CR1 — child MCV | `microcytosis_no_anemia` uses MCV `dir` under 16 (`isPedAge`) | `M184g` |
| R2-B2 / CR4 — printed ferritin | low → `iron_deficiency_panel` owns it and names MCV in both directions; not low → «کم‌احتمال‌تر», high has its own sentence; no ferritin request | `M184i`, `M184j` |
| CR2 / CR3 — high, absent or unitless Hb | the rule fires only on a graded in-range Hb; the rest go to the net as on `9deba20` (`M184f` changed on purpose) | `M184j` |
| R2-B3 — MCH/HCT direction | high MCH and high HCT get their own «هم‌خوان نیست» sentence | `M187c` |
| R2-B4 (round2 file) — carrier warning | `HBA2_CARRIER_WARNING` on every owner that states the β-trait sentence | `M184j` |
| R2-B4 (this file), R2-B5, CR5, CR8–CR10 — row identity | Hgb S/C/E/A/A2/F, HbAS, «35%» in the value, Persian «هموگلوبین E/C/A», «HbA2/E» → HBA2, unevidenced «Hemoglobin E» → `HB_NAME_AMBIGUOUS`, IU never HbS, «Hémoglobine/Hemoglobina» + g/dL → HGB, sickle test → own key `SICKLE` (`M186i` changed on purpose) | `M186m`, `M186n`, `T25` |
| CR6 — merge collision | `mergePages` prefixes ambiguous names on an electrophoresis page with `electro:` | `T24` |
| code #5, note 2, CR11 — WHO sentence | thresholds from `whoFerritinThreshold`/`ferritinIdCut`; child → «حدِ پایینِ محدودهٔ مرجع برای سنِ شما»; adult → «حدِ 30 که بدونِ التهاب به کار می‌رود»; «چاپ‌شده» → «مرجع» | `M184h` |
| code #2–#4 — recommendation builder | repeat-interval «هفته» masked; content sentences keep their content without the rival timeline head; stranded reassurance dropped; relative conditionals under a today/ER final dropped; no duplicate sentence. Re-checked against all 192 action strings under a this-week and an ER-now final | `M188d` |
| CR11 — freeze comments | reworded: identical to `9deba20` before the `microcytic_anemia` text, not after | — |
| medical notes 3, 5, 6; HbF/HbA2 alone; HPLC peak labels; MCV with no Hb | recorded in P53 rows 12–13 | — |

Measured: working tree `npm test` = 657 · 638 · 0 fail · 19 todo; RULES 137; frontend lint exit 0. A copy with the pre-fix
`patterns_hematology.js`, `patterns_utils.js`, `adapter.js`, `prompt.js` and the `server.js` merge edit undone:
657 · 626 · **12 fail** — exactly the 10 new guards plus `M184f` and `M186i`. **Round 3 has not run.**
