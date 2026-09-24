# specs/008 — clinical review, round 2

**Verdict: FAIL**

Reviewed 2026-09-24 against the working tree on `9deba20` (uncommitted). Suite measured on the tree: `node --test` →
`tests 647 · pass 628 · fail 0 · todo 19`. Base comparisons: `git archive 9deba20 khanesh-server` in a scratch
directory. Every panel below was run through `runEngine` + `runPatterns` (and `buildEngineRecommendations` /
`buildNormalResult` where stated). No code was edited.

All five blocking items come from the round-1 fixes themselves (B1's new rule and the thal-owner hand-off) or from the
part of the B2 fix that was left undone. The fixes for B3, B4 (for HbS), note 1, note 2 and note 5 are correct.

---

## Blocking

### R2-B1: `microcytosis_no_anemia` uses the adult MCV 80 cut-off in children, so a normal child's CBC gets a "small cells" finding

`match` reads `t.MCV < 80` as a literal. Below 16 the MCV range comes from `PED_REFS`, where 70–86 (age 3) and 77–91
(age 8) are normal. The rule ignores that grading. `adultRisk` is age-gated, but the match is not.

| panel | `9deba20` | tree |
|---|---|---|
| M 3 y, Hb 11.8, MCV 75, RBC 4.6 (graded `MCV=75[70–86]`, normal) | `none` (all normal) | `microcytosis_no_anemia` / routine |
| F 8 y, Hb 12.5, MCV 78, RBC 4.6 (graded `MCV=78[77–91]`, normal) | `none` | `microcytosis_no_anemia` / routine |

The parent reads: «اندازهٔ متوسط گلبول‌ها (MCV) 75 است که کوچک‌تر از حد طبیعی است. … دو علتِ شایعِ گلبولِ کوچک، کمبودِ آهن … و
یک ویژگیِ ارثیِ خون (صفتِ تالاسمی) است؛ فریتین این دو را از هم جدا می‌کند.» The recommendations add ferritin and haemoglobin
electrophoresis. The same row is labelled normal on the same page. This is a new false abnormal on the most common
paediatric panel, and it is the `isPedAge` trap that `ferritinBelowIdCut` already avoids. Under 16, the fix is to use
`MCV` `dir === "low"`.
(`thal_trait_no_anemia` has the same literal, but that predates specs/008. Record it, don't block on it.)

### R2-B2: the "Hb not on the sheet" arm is wrong when Hb is printed without a unit, or when Hct shows severe anaemia (N4 / N19 / N20)

The three-way branch treats "no graded `HGB`" as "not measured". The arm's text claims more than that.

- **Hct 18, MCV 72, no Hb (M 40).** The tree gives `severe_anemia_crisis` / emergency **and** `microcytosis_no_anemia` /
  routine. The emergency says «کم‌خونیِ بسیار شدیدی که اکسیژن‌رسانی به قلب و مغز را به خطر می‌اندازد». Beside it the new
  finding says «هموگلوبین روی این برگه نیست، پس دربارهٔ کم‌خونی نمی‌شود چیزی گفت.» (its action is «در نوبت عادی با پزشک
  مطرح کنید…»). The rule's own premise is "no anaemia", and here it fires beside an Hct-estimated anaemia crisis. On
  `9deba20` only the crisis and the `unexplained_abnormal` MCV line fired.
- **Hct 30, RBC 4.0, MCV 72, no Hb.** The finding again says nothing can be said about anaemia, next to
  `low_rbc_hct_without_anemia`.
- **Unitless Hb printed (`Hb 135` or `Hb 85`, no unit), MCV 72.** `HGB` goes to `ungraded` (`unit_unknown`) and
  `unit_unknown_values` quotes «هموگلوبین (85): …». The new finding says «هموگلوبین روی این برگه نیست». That is false:
  it is printed. 85 g/L means Hb 8.5, so the patient is anaemic. This is the M169b lesson: printed-but-unreadable is
  not absent.

Fix direction: the rule must not fire (or must hand off) when `crisisArm` / Hct-low evidence of anaemia exists. The
"absent" arm must distinguish `e.ungraded.HGB` ("printed, unit unclear") from truly absent.

### R2-B3: reading `HGB` hides a high Hb (N18 / M156): microcytosis with erythrocytosis loses its only flag

`microcytosis_no_anemia` reads `HGB`, so `RULE_READS` marks it covered in every direction. The build only says «پایین
نیست».

| panel | `9deba20` | tree |
|---|---|---|
| M 40, Hb 18.2 (`↑`, 13.7–17.5), MCV 74, RBC 5.4 | `unmatched_abnormal`: «2 مورد خارج از محدوده مرجع است، از جمله هموگلوبین با مقدار 18.2 (طبیعی 14–17.5). …» + MCV in `unexplained_abnormal` | only `microcytosis_no_anemia`: «هموگلوبین شما 18.2 است (حد طبیعی 13.7–17.5) و پایین نیست، پس کم‌خونی ندارید.» |

Nothing in the report now says the Hb is **above** range. `erythrocytosis` requires MCV ≥ 80, so it cannot fire. High
Hb with microcytosis is the iron-depleted polycythaemia picture. The high arm needs its own sentence (M156's rule: every
direction a read key can land in needs one), or HGB-high must stay uncovered.

### R2-B4: the thal-owner hand-off drops the carrier/genetic-counselling warning for a β-thal trait (N20: orphaned warning, M155 class)

`hba2_elevated` and `thal_trait_no_anemia` carry the premarital warning («اگر قصدِ ازدواج یا بچه‌دار شدن دارید … اگر
هر دو والد ناقل باشند، فرزند ممکن است شکلِ شدیدِ بیماری را بگیرد»). Round 1 added `microcytosis_no_anemia` to
`THAL_OWNER_IDS`, so `hba2_elevated` now stands down for it. But `microcytosis_no_anemia` has no such warning, and
neither does the IDA branch of `microcytic_anemia`.

Checked with a regex (`بچه‌دار|ازدواج|ژنتیک`) over every finding and over `buildEngineRecommendations`:

| panel | owner | genetic warning anywhere? |
|---|---|---|
| HbA2 5.2 % alone | `hba2_elevated` | yes |
| M 30, Hb 14.5, MCV 72, RBC 5.2, HbA2 5.2 % (Mentzer 13.8: the typical Iranian premarital trait sheet) | `microcytosis_no_anemia` | **no** |
| same + ferritin 8 | `iron_deficiency`, `microcytosis_no_anemia` | **no** |
| M 30, Hb 11, MCV 70, RBC 4.5, HbA2 5.2 % | `microcytic_ida_likely` | **no** |

The patient reads «هموگلوبین A2 شما 5.2٪ است که از ۳.۸ بالاتر است؛ این مقدار معمولاً با «صفتِ تالاسمیِ بتا» (ناقل بودن، نه
بیماری) می‌خواند.» That is only the reassurance. The consequence for their children, which is the reason the test
is done in Iran, is gone. So printing the CBC next to the HbA2 removes a warning that HbA2 alone gets. Any owner
that absorbs the HbA2 sentence must carry the warning when `hba2State` is `trait` / `very_high`. Add a sweep guard
over all owners.

### R2-B5: the B2/B4 fix is incomplete for HbE and HbC; a printed variant still gets «نتایج آزمایش شما در محدوده طبیعی است»

`hemoglobine` (the norm of English «Hemoglobin E» as well as French «Hémoglobine») maps to HBE only with evidence.
Without evidence it falls to `unmapped`, **without** the `HB_NAME_AMBIGUOUS` noRef that B4 added. Persian «هموگلوبین
C» / «هموگلوبین E» and the HPLC label «HbA2/E» have no mapping at all, even with a `%` unit or with HbA2 on the page.

Measured with `buildNormalResult`, each panel with Hb 14.5 g/dL and MCV 85:

| row | engine | patient reads |
|---|---|---|
| «Hemoglobin E: Positive» | unmapped, no noRef | «نتایج آزمایش شما در محدوده طبیعی است.» / «هیچ‌کدام از مقادیر خارج از محدوده مرجع نیست.» |
| «هموگلوبین E 28 %» | unmapped (also with «هموگلوبین A2 3 %» on the page) | same |
| «هموگلوبین C 30 %» | unmapped | same |
| «HbA2/E 28 %» | unmapped | same |
| «Hemoglobin E: Positive» alone | nothing graded, no noRef | **legacy LLM path** (`server.js:910` condition true), which is round-1 B4's shape |

This existed on `9deba20`. But round 1 put «Hemoglobin C / Hemoglobin E» inside this feature's SC-003 and named the
«طبیعی است» result as the US3-2 failure. The resolution table marks B2/B4 closed, and for these spellings they are not.
HbE carrier status is premarital-relevant (HbE/β-thal compound). Map the Persian and «/E» forms under the same gate,
and send an unevidenced «Hemoglobin E» to `HB_NAME_AMBIGUOUS`, not to bare `unmapped`.

---

## Non-blocking

1. **`microcytosis_no_anemia` asks for ferritin that is already on the sheet, and never reads it (N8 / N21).**
   - With ferritin 8 (M 65, Hb 13.5, MCV 72), `iron_deficiency` fires. The recommendations still contain «آزمایش فریتین
     را بخواهید.» (from the action sentence, which escapes `alreadyMeasured`). The finding says «فریتین این دو را از هم
     جدا می‌کند» beside a ferritin of 8.
   - With ferritin 150, the patient gets only «در نوبت عادی با پزشک مطرح کنید و آزمایش فریتین را بخواهید.». Nothing
     says that the printed normal ferritin argues against iron deficiency.
   - Timelines are fine: `pickFinalAction` keeps only «این هفته…». The wording is not.
   - I would block this if it were the only issue; fix it together with R2-B2 (three-way on ferritin too).
2. **Hct 18 recommendations** include both «آزمایش فریتین را بخواهید.» and «درخواست آزمایش فریتین از پزشک» (duplicate),
   plus a pre-existing «درخواست آزمایش تزریق خون (Blood Transfusion) از پزشک» (not specs/008).
3. **WHO text (note 6).** For men and for women ≥ 50 it now reads «…نه آستانهٔ معمولِ 30». In the sentence it is
   attributed to WHO, whose usual adult cut-off is 15. Say «آستانهٔ معمولِ ما (30)» or drop the number. The same
   branch still says «در محدودهٔ چاپ‌شدهٔ آزمایشگاه» (the note-5 wording, left in the `whoOnly` arm).
4. **Note 4 still holds on the same page.** «HBs 150 mIU/mL» or «HBs: Positive» on a page that also prints HbA2 (a
   mixed premarital page) becomes `HBS` and is listed as «هموگلوبین S (داسی‌شکل)». This is not an interpretation.
   Refusing IU/mIU/«Positive» without `%` in the evidence branch would close it.
5. **HbA2 3.8–12 % is all worded "trait".** 12.0 → «معمولاً … صفتِ تالاسمیِ بتا»; 12.1 → very_high. Values of about 8–12
   are already atypical for β-trait. 12 is the approved number, so record it in P53 and do not change it here.
6. **No api-contract test for B4.** Routing was verified by reading `server.js:910` (noRef keeps the engine path). `M186i`
   is engine-level only, and round 1 asked for a contract test.
7. **P53 row 10 open question stands.** `microcytosis_no_anemia` is routine for men and women ≥ 50. Before specs/008,
   the same patients got «این هفته» with the FOBT instruction.

## Checked and clean

- **B1, adult core.** M 65 Hb 13.5 MCV 72 RBC 5.0 → `microcytosis_no_anemia` with ferritin and «خونریزیِ پنهانِ گوارشی».
  F 55 gets the GI sentence and F 30 does not. MCV 79.5 fires. RBC 6.1 (Mentzer 10.8) → only `thal_trait_likely`
  (hand-off via live `match`, no double finding). Anaemic → `microcytic_anemia` only. Under a pancytopenia emergency it
  is suppressed.
- **B2, HbS.**
  - «Hemoglobin S 35.2 %» on an electrophoresis page → `HBS` noRef, no HGB, no emergency.
  - «Hemoglobin S 35.2» with no unit on the page → `HBS`. Alone, or «Hemoglobin S 8» next to «Hemoglobin 14.5 g/dL» →
    `HB_NAME_AMBIGUOUS`, and HGB stays 14.5.
  - «Haemoglobin S 30 %», «هموگلوبین S 30 %» → HBS.
  - «Hémoglobine» → unmapped, never HBE and never HGB.
  - Nothing reaches `resolveAlias` as hb → HGB in any spelling tried.
- **B4, HbS.** «HbS: Positive», «HbS Negative», «Hb S Trace», «Hemoglobin C Positive», «HBs 12 IU/L» alone →
  `HB_NAME_AMBIGUOUS` noRef. With a normal CBC the summary is «مقادیری که موتور می‌سنجد در محدودهٔ طبیعی‌اند، ولی چند
  مقدارِ این برگه تفسیر نشدند» with a neutral label. «Sickle test: Negative/Positive» → HBS noRef, no fabricated number.
- **Flag suffixes.** «HbA2 5.2 H» grades 5.2. «HbS <1» with HbA2 on the page → HBS noRef.
- **Hepatitis unchanged vs `9deba20`.** HBsAg / «HBs Ag» Positive → `hbsag_reactive`. Anti-HBs 150 mIU/mL and Anti-HBc
  stay in `qual`, also with HbA2 on the page. HBeAg / «HBe Ab» / «HBc Ab» are unmapped, identical to `9deba20` (pre-existing).
- **B3.** Unknown sex age 55: ferritin 29 → `↓[30–300]` + `iron_deficiency`; 30 → none; ferritin 20 with Hb 10.5 /
  iron 45 → `iron_deficiency`, no ACD contradiction. Unknown sex age 40: 14 → iron_deficiency («در محدودهٔ مرجع…»), 20 →
  none. Unknown age and sex: 20 → none. M 40: 29 → ID, 30 → none, 11 → ID «فریتین پایین». F 49: 14/15; F 50: 29/30 at the
  edges. Children 10 and 15 follow PED dir (20 → none, 10 → ID). M 16 uses the adult cut of 30.
- **Note 1.** HbA2 12.1 / 27 % → «…حتی از حدِ معمولِ «صفتِ تالاسمیِ بتا» هم بالاتر است؛ … (مثلاً HbE) …» in both
  `hba2_elevated` and the thal owner.
- **Note 2.** F 50 Hb 9.8 MCV 112 B12 90 HbA2 4.1 → the sentence «در کمبودِ B12 یا فولات HbA2 می‌تواند کمی بالا برود، پس
  این عدد باید پس از روشن‌شدنِ آن تفسیر شود.» It fires only for MCV > 100, and it is correct.
- **Note 5.** «در محدودهٔ مرجع جا می‌گیرد» replaces «چاپ‌شده» in the three-way ferritin text.
- **N9** clean (no prompt/model change for clinical logic). **N6** clean (non-numeric variant values never become numbers).

Not filed through `.claude/eval-gate/run.mjs verdict`, because no gate run id was supplied for this round.
