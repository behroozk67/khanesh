# Research — specs/008 (anaemia, iron, haemoglobin-variant ranges)

All facts measured on the working tree on `9deba20`, 2026-09-23. `khanesh-server/rules/` has no uncommitted changes, so
"red before" on the working tree is the same as red on `9deba20`.

**Baseline:** `npm test` in `khanesh-server/` → `tests 618 · pass 599 · fail 0 · todo 19`. RULES = 135.
**Probe:** [probe.mjs](probe.mjs) → [probe-before.txt](probe-before.txt).

---

## R1 — How an Hb range is chosen today, and where age bands can go

- `getRef(key, sex, age)` in `refs.js`: `isPediatricRCPCH(age)` (< 16) → `PED_REFS`, falling back to the adult range
  when no row covers the age. Then `age >= 75 && GERIATRIC_REFS[key]`. Then `ADULT_REFS`. Unknown sex → the **F** range
  (`sex === 'M' ? r.M : r.F`). Unknown age → adult (`undefined >= 75` is false).
- `esrRef(sex, age)` and `creatRef(age, sex)` are precedents for a per-key function inside `getRef`.
- `PED_REFS.HGB` rows stop at `maxAge 12`. **Ages 12–15 therefore fall through to the adult band today** (M 14, F 12.3).

**Decision:** add `hgbRef(sex, age)` in `refs.js`, called from `getRef` before the geriatric lookup:

| age | M low | F low | high (unchanged) |
|---|---|---|---|
| 16–19 | 13.6 | 12.0 | M 17.5 / F 15.3 |
| 20–49 (and unknown age) | 13.7 | 12.0 | same |
| 50–69 | 13.3 | 12.0 | same |
| ≥ 70 | 12.4 | 11.8 | same |

`GERIATRIC_REFS.HGB` is deleted (closes `P2`); `.MCV` and `.ALP` stay at ≥ 75. `getRefSource('HGB', age)` returns a
label for the approved table instead of `Henry A5` / `Geriatric Override`.

**Ages 12–15 (RCPCH fall-through):** kept byte-identical at M 14 / F 12.3. The reference's 12–15 rows (M 12.6, F 11.9)
are paediatric rows, which the project doesn't adopt (FR-004). Recorded in `P53` as an open question.
*Alternatives rejected:* using the 16–19 row for 12–15 (a number applied to an age it wasn't written for); adopting
the reference's paediatric rows (policy).

## R2 — Who reads HGB, and what moves (N23)

- There are 30 `test === "HGB"` reads across 8 `patterns_*.js` files. The malignancy readers gate on their own numbers
  (`t.HGB < 10`, `< 8`); the new limits never cross those, so they are unaffected.
- Every other reader asks "is this patient anaemic?" (`dir === "low"`). Moving the anaemia threshold is the approved
  decision, so a change in their firing *is* the feature. No hold-the-line constant is added here.
- The crisis (`HGB_CRISIS_GDL = 7`) and the Hct arm (`crisisArm`) read numbers, not the range, so they are unchanged.
- `geriatric.test.js` asserts Hb 12.3 is normal for a 75-year-old man. Under the approved ≥ 70 limit of 12.4, that
  value is **low**. The test changes on purpose, and the change is recorded.
- CTCAE `HGB_LOW` grade 1 is "< LLN". Its lower edge moves with the LLN. That is intended.

**T013 audit (2026-09-23), every `test === "HGB"` read:**
- `patterns_hematology.js`: 9, 119, 396, 428, 467, 476, 531, 544, 620, 648, 655, 714, 722, 787, 806, 868, 906, 1060.
  These are the anaemia/thalassaemia/erythrocytosis/crisis/ACD rules. `dir === "low"` means "anaemic" and
  `dir === "high"` means erythrocytosis (upper limits unchanged). → moves on purpose.
- `patterns_biochem.js:926`: the HbA1c-reliability flag (`hgb?.abnormal`). Anaemia does distort HbA1c, so it follows
  the anaemia definition. → moves on purpose.
- `patterns_endocrine_new.js:58` (B12, three-way N4), `patterns_endocrine_rheum.js:163`, `patterns_infectious.js:298`
  (ESR: `anemic`), `patterns_urinalysis.js:63` (three-way wording), and `patterns_utils.js:515` (`crHigh || anemic`):
  all mean "anaemic". → moves on purpose.
- `patterns_utils.js:472`: the crisis reads `value < HGB_CRISIS_GDL`. → unaffected.
- `patterns_malignancy.js`: 64, 98, 180, 209, with their own numbers (`< 10`, `< 8`). → unaffected.
- `patterns_urinalysis.js:251`: presence only. → unaffected.

No hold-the-line constant was needed. The measured side effect: only the Hb range string printed in finding text
changed on every frozen panel (`M104d` C3, `M125`, `M164d` F3/F4, `M171d` hemol, `M180b` ×6). This was verified by a
normalized diff of the full output on `9deba20` against the tree.

**Pre-existing gap surfaced (not caused):** microcytosis without anaemia (MCV < 80, RBC not high, Mentzer ≥ 13) gets
`unmatched_abnormal` on `9deba20` too (Hb 15 / MCV 72 / RBC 5.2). The move from 14 to 13.7 adds men with Hb 13.7–13.9
to that path. It is recorded in `P53`.

**Verification:** a band-edge sweep (both sides of every row and of the 16/20/50/70 age boundaries), plus
before-and-after runs of the existing anaemia panels in `engine.test.js`. Every firing change must fall in a moved
band.

## R3 — Iron and ferritin: grading ranges vs rule thresholds (N23)

The readers are `iron_deficiency_panel` (match 1002–1003, build 1021), `anemia_of_chronic_disease` (1064–1066) and
`whoInflamIronDeficiency` (`patterns_utils.js:112`, which reads the value, not `dir`, so it is unaffected).

**Decision:**
- Grading: `IRON` becomes `both [50, 160]`. `FERRITIN` goes through `ferritinRef(sex, age)`: M 12–300; F < 50 y 12–150;
  F ≥ 50 y 30–300. Unknown sex keeps the F logic; a female of unknown age gets 12–150. Below 16 years `PED_REFS` still
  governs.
- The rules read named cut-offs in `patterns_utils.js`:
  - `ferritinIdCut(e)`: M 30, F ≥ 50 30, F < 50 or unknown 15. Male and young-female values are today's, held; F ≥ 50
    is the clarified change.
  - `IRON_ACD_LOW_UGDL = 60`: today's value, held.
- In `iron_deficiency_panel`, `ferrLow` becomes `ferrBelowCut = FERRITIN < ferritinIdCut(e)`, used in both `match` and
  `build`, including the `whoOnly` branch.
- In `anemia_of_chronic_disease`, `ironLow` becomes `IRON < 60` and `ferrNotLow` becomes `!(FERRITIN < cut)`.

**Text consistency (FR-005):** for M ferritin 12–29 the grading now says «طبیعی» while the rule fires. The parenthetical
«(فریتین پایین …)» is branched in three ways:
- the value is below the lab range → today's wording;
- it is inside the range but below the cut → a new sentence saying the value is at the low edge of the range and that
  the iron-deficiency threshold for adults is 30;
- otherwise the parenthetical is absent.
The `whoOnly` headline «فریتین شما «طبیعی» گزارش شده» stays true, because `whoOnly` now requires the ferritin to be at
or above the cut.

For ACD with iron 50–59, the text never says the iron is below the range; it already doesn't («ذخیره آهن … پایین
نیست»), and this is verified in the probe.

*Alternatives rejected:* following the new ranges inside the rules. The IDA finding would disappear for men with
ferritin 12–29. That is the exact N23 failure.

## R4 — Haemoglobin-variant row identity (N25, N2) — the finding that shaped the design

Measured:
- `HbS 40 %` and `HbS Positive` are caught by `QUALITATIVE_PATTERNS` `/^(anti)?hbs$/`, which exists for **anti-HBs**.
  They go to `qual`, and **no rule reads bare `hbs`**: `patterns_infectious.js:40` removed it on purpose. The result is
  a silent drop.
- ⚠️ **Latent false emergency:** if that pattern did not match, `resolveAlias("hbs")` would strip the plural `s`, reach
  `NAME_MAP.hb` and produce **`HGB = 40`**. Any fix must add an **exact** `NAME_MAP` entry, which is resolved before
  `resolveAlias`, and must never simply remove the qual pattern.
- `HbC` collides with anti-HBc (hepatitis B core), and `HbE` with HBeAg/anti-HBe. `norm()` lowercases, so the case
  distinction on the sheet is lost. Today `hbc` and `hbe` are `unmapped`.
- `HbA`, `HbA2`, `HbF`, `ZPP`, `sTfR` and `Erythropoietin` are `unmapped` and collide with nothing. `hba1c`, `a1c` and
  `hemoglobina1c` are exact entries, so `hba` does not steal them.

**Decision:**
- **Unambiguous names map exactly:**
  - `HBA2`: `hba2`, `hemoglobina2`, `هموگلوبینa2`
  - `HBF`: `hbf`, `fetalhb`, `fetalhemoglobin`, `hemoglobinf`, `هموگلوبینf`, `هموگلوبینجنینی`
  - `HBA`: `hba`, `hba0`, `hemoglobina`
  - `ZPP`: `zpp`, `zincprotoporphyrin`
  - `STFR`: `stfr`, `solubletransferrinreceptor`
  - `EPO`: `epo`, `erythropoietin`, `اریتروپویتین`
  - `HBS`: `sickle*`, `هموگلوبینs`
  - Bare `a2` is mapped only with a `%` unit, through the `UNIT_GATED_ALIASES` pattern.
- **Ambiguous names (`hbs`, `hbc`, `hbe`)** map to `HBS`/`HBC`/`HBE` **only** when the row's unit is `%` **or** the
  same sheet has an unambiguous electrophoresis row (`HBA2`, `HBF` or `HBA`). This is a page-kind signal, the same
  shape as the semen detector.
- A bare `hbs` without that evidence, with a non-numeric value, moves from `qual` to `unmapped`, so it reaches the
  «تفسیر نشدند» line under its printed name. Nothing read it in `qual`, so no finding changes. `anti-HBs`, `HBsAg` and
  `anti-HBc` spellings are untouched, and `hbv_screen_reactive` is frozen.
- `HBS`, `HBC`, `HBE`, `HBA`, `ZPP`, `STFR` and `EPO` have no range, so they go to `noRef` and the «تفسیر نشدند» line,
  as `RETIC_ABS` does. A non-numeric value on an electrophoresis variant row (e.g. «HbS: Positive» next to HbA2) goes
  to `unmapped` with its printed name.

## R5 — HbA2/HbF grading and the age gate

- `ADULT_REFS.HBA2 = both [1.5, 3.5] %` and `ADULT_REFS.HBF = both [0, 2] %`.
- Below 2 years neither is graded: the adapter gates on key and age, as the `RETIC_ABS` gate does, and the row goes to
  `noRef`. HbA2 only reaches adult levels at 1–2 years, and HbF is 60–85 % at birth.
- Unknown age is treated as adult, as elsewhere.

## R6 — Where the HbA2 sentence goes, and the coverage net (N18, N20)

- The thalassaemia owners are `thal_trait_no_anemia` (patterns_hematology.js ≈ 430) and the `microcytic_thal_likely` /
  `microcytic_ida_likely` branches of `microcytic_anemia` (≈ 645–700).
- Both owners get the HbA2 clause. It is three-way:
  - HbA2 > 3.8: consistent with β-thalassaemia trait. In the IDA branch the clause adds that iron deficiency and trait
    can coexist, and that a doctor weighs both (no contradiction with the branch headline, N21).
  - 3.6–3.8: slightly above the range, borderline, and no trait claim.
  - ≤ 3.5 or absent: no clause.
- The owners' `suggest` and `action` stop asking for «الکتروفورز هموگلوبین» when `HBA2` is graded. The `action` string
  is not filtered by `SUGGEST_TESTS`, so it is branched in the rule.
- A new rule, `hba2_elevated` (routine, `patterns_hematology.js`), fires when HbA2 > 3.5 and **neither owner fires**. The
  hand-off helpers `thalOwnerFires(e)` are extracted from the owners' own `match`. It has the same two text branches.
  RULES goes from 135 to 136.
- HbA2 low (< 1.5) and HbF high have no sentence. The net catches them only if no rule *names* them. The coverage test
  is text AND source-read, so reading `HBA2` in a branch that says nothing about it must not mark it covered. This is
  verified by a test in which HbA2 1.0 must appear in `unexplained_abnormal`.
- `SUGGEST_TESTS` gains `"الکتروفورز هموگلوبین": ["HBA2"]` and `"گیرندهٔ محلول ترانسفرین (sTfR)": ["STFR"]`.
- A two-sided sweep (the M91e shape) asserts exactly one HbA2-mentioning finding on every panel with HbA2 > 3.5.

## R7 — Frontend `REF` (manual entry)

`khanesh/src/labRefs.js` `hb.range` carries adult M 13.5 / F 12.0 and a ≥ 900-month (75 y) copy of the unsourced
geriatric 11.0 / 10.5.

**Decision:** follow the backend Hb lower limits by age band. The same elderly under-read exists on manual entry.
Ferritin and iron in `labRefs.js` stay as they are, and the divergence is recorded in `REF_DIFF.md`. There are no
frontend tests; the change is verified with `npm run lint` plus a `node` probe of `range()`.

## R8 — Names, sources, registers

- `FA_NAMES` gains Persian names for HBA, HBA2, HBF, HBS, HBC, HBE, ZPP, STFR and EPO. `M32` enforces this for every
  ranged key.
- Source label for every adopted number: «تأییدِ کاربر ۱۴۰۵/۰۷/۰۱؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم».
  `WHO_ANAEMIA` is **not** cited, because its numbers differ.
- `MEDICAL_RULES.md`:
  - `P2` closed.
  - New `P53` holds everything unadopted: the reference's pregnancy and paediatric Hb rows (including 12–15), ferritin
    < 50–60 under inflammation (the engine uses WHO 70), sTfR/log-ferritin > 2, ZPP > 100, PV criteria
    (Hb > 16.5 / 16.0), HbF bands by age, the HbS/C/E % bands, HbA2 3.6–3.8 borderline, whether HbA2 > 3.8 should
    override the Mentzer split, and the adult Hb 13.7 vs WHO 13.0 note.
- The Lab Notebook gets a new hash on **N23** (range change with hold-the-line) and on **N25** (HbS/HbC/HbE identity,
  and the `resolveAlias` plural trap).
