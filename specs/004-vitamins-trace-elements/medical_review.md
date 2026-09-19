# Medical review: specs/004 (vitamins & trace elements), uncommitted tree on `2d32dd3`

**Verdict: FAIL**

Reviewer: eval-medical-reviewer (clinical correctness only). Date: 2026-09-19.
Scope: `git diff 2d32dd3 -- khanesh-server/ MEDICAL_RULES.md`, excluding package*.json.
Method: live engine probes on the working tree, compared against a `git archive 2d32dd3` copy with a node_modules junction (scratch: `…/scratchpad/mr004/`).
Suite on the working tree: `tests 508 · pass 485 · fail 0 · todo 23`. The listed "failing tests" are todo items (`M101`, `M101b`, …).

No reference-range value changed. `refs.js`, `refs_ped.js`, `guidelines.js` and `units.js` have no numeric diff; the only `units.js` change is exporting `normUnit`. The three blockers are all in patient-facing text in `patterns_hematology.js`.

---

## Blockers

### B1: macrocytic anemia with low folate and B12 not ruled out now says "folate is low and fits this anemia", and the folic-acid caution is missing

`patterns_hematology.js:54`: `return mode === CLAUSE_FOR.own ? \`${base} ${caution}\` : base;`
Only the standalone folate finding carries the caution. When `macrocytic_anemia` is active, `folate_deficiency` stands down (FR-004), and the macrocytic text has no caution at all.

Probe: `age 40 F · Hb 9.5 g/dL · MCV 112 fL · Folate 2 ng/mL`, no B12. Engine output:
- `macrocytic_anemia | this_week`. must_say:
  > «… فولاتِ شما روی همین برگه 2 و پایین است، که با این نوع کم‌خونی می‌خواند. ویتامین B12 روی این برگه اندازه‌گیری نشده است. کم‌کاری تیروئید هم می‌تواند علت باشد.»
- warnings: `["خودتان مکمل B12 شروع نکنید — اگر قبل از آزمایش مصرف کنید، نتیجه گمراه‌کننده می‌شود."]`
- No finding anywhere on the report says not to start folic acid.

The same gap shows up in two more panels:
- **Borderline B12:** `Hb 9.5 · MCV 112 · Folate 2 · B12 250`. The macrocytic clause says «نزدیکِ مرزِ پایین است و کمبود را کاملاً رد نمی‌کند», and `borderline_b12_deficiency` has `warnings: []`.
- **Severe anemia:** `Hb 6 · MCV 115 · Folate 2`. The same macrocytic text appears under `severe_anemia_crisis`.

**Why it matters.** Macrocytic anemia + low folate + B12 unknown or borderline is the classic case where self-started folic acid masks B12 deficiency while nerve damage keeps progressing. On `2d32dd3` the macrocytic text did not mention folate, so it never pointed the patient toward folic acid. The new sentence does («پایین است، که با این نوع کم‌خونی می‌خواند»), and it arrives without the caution that FR-002 requires. This is the N21/N4 class: the new text says something true but leaves out the part the patient needs.

**Fix:** add the caution in macro mode whenever B12 is absent, has an unknown unit, or is ≤ 399. That means a warning on `macrocytic_anemia` for those branches, the same condition `folate_deficiency` already uses at line 518. Lock it with a test that is red on the current tree.

### B2: a HIGH B12 is now reported only as "not low", and it drops out of the uncovered-abnormal net

`patterns_hematology.js:68`: `` `ویتامین B12 شما روی همین برگه پایین نیست (${shown}).` `` There is no branch for `dir === "high"`.

Probe: `Hb 14 · MCV 90 · Folate 2 ng/mL · B12 1500 pg/mL` (B12 graded `1500(high)`, range 200–900).
- **On `2d32dd3`:** `unexplained_abnormal` says
  > «… ویتامین B12 1500 (طبیعی 200–900). برای این‌ها توضیحِ آمادهٔ اختصاصی نداریم؛ این یعنی موتور دربارهٔ آن‌ها نتیجه‌گیری نکرده، نه اینکه بی‌اهمیت‌اند.»
- **Working tree:** only `folate_deficiency`, which says
  > «ویتامین B12 شما روی همین برگه پایین نیست (1500).»

  There is no `unexplained_abnormal` finding. The coverage net counts B12 as explained.

The macrocytic version (`Hb 9.5 · MCV 112 · Folate 10 · B12 1500`) says «پایین نیست (1500)، پس کمبودِ B12 علتِ محتمل‌تری نیست». That panel had no B12 line on `2d32dd3` either, so it is not new. The standalone-folate panel is a new loss.

**Why it matters.** An out-of-range value that used to be flagged is now absorbed by a sentence that describes it only by what it is not. B12 above 1000 without supplementation is itself worth investigating (liver disease, myeloproliferative disease), so this is the N18 class. «پایین نیست» for 1500 is also not the three-way branch the spec asks for.

**Fix:** add a separate high arm that says the value is above the range and does not interpret it («بالاتر از محدوده … این یافته دربارهٔ آن نتیجه‌گیری نمی‌کند»), or leave B12 in the uncovered set when it is high. Then re-run this panel.

### B3: low folate + low B12 gives one B12 number two different timings (N20)

`patterns_hematology.js:59` and `:515`.

Probe: `Hb 14 · MCV 90 · Folate 2 ng/mL · B12 100 pg/mL`.
- `overt_b12_deficiency | this_week`. action: «این هفته با پزشک وقت بگیرید. …»
- `folate_deficiency | routine`. must_say ends:
  > «ویتامین B12 شما هم روی همین برگه پایین است (100)؛ کمبودِ هم‌زمانِ این دو ویتامین را پزشک با هم بررسی می‌کند.»

  action: «در نوبتِ عادی با پزشک مطرح کنید و پیش از شروعِ هر مکملی این برگه را به پزشک نشان دهید.»

Count of findings that mention B12 on this panel: 2 now, 1 on `2d32dd3`. The folate card puts the overt B12 deficiency inside a routine instruction ("the doctor will look at both together … at a routine visit"), and the B12 card on the same page says this week. That is N20 exactly: two findings, one number, two instructions. It also goes against FR-015's intent that B12 statements belong in the existing B12 finding, not a second one.

**Fix:** when B12 < 150 is on the sheet, the folate finding should either defer («ویتامین B12 شما هم پایین است — یافتهٔ جداگانهٔ B12 را ببینید») without folding it into its own action, or take its urgency from the B12 owner. Add a count test asserting that exactly one finding sets the timing for B12 on this panel.

---

## Checked and acceptable (with the probe)

1. **folate_deficiency B12 branches**, all with `Folate 2 ng/mL`, `Hb 14`, `MCV 90`.
   - B12 100: see B3.
   - B12 250: «(250) نزدیکِ مرزِ پایین است؛ پیش از مصرفِ اسید فولیک، پزشک باید کمبودِ B12 را هم رد کند» plus the warning. Correct.
   - B12 600: «پایین نیست (600)», `warnings: []`. Acceptable under the existing P21 band.
   - B12 absent: «ویتامین B12 روی این برگه اندازه‌گیری نشده است. پیش از مصرفِ اسید فولیک باید B12 هم سنجیده شود، …» plus the warning and `suggest ["ویتامین B12"]`. Correct.
   - B12 with no unit (250): «روی برگه هست ولی واحدش خوانده نشد، پس درباره‌اش قضاوت نمی‌کنیم.» plus the caution. Correct, and `unit_unknown_values` fires separately.
   - B12 300 pmol/L (graded 407): «پایین نیست (300 pmol/L)». Prints the value as it appears on the sheet (N5 is fine).
   - Folate 5 nmol/L: «5 nmol/L (برابرِ 2.21 ng/mL)». Correct and labelled as converted.
   - **B12 1500:** the wording is only right when B12 is in range. Wrong for a high value (B2).
2. **Pediatric folate and emergency suppression.**
   - Age 5, Folate 2.5 → «از حدِ پایینِ طبیعی (3 ng/mL) کمتر است». Uses the refs_ped `[3,15]` range.
   - Age 5, Folate 3.2 → no finding.
   - Age 5, Folate 20 → `unmatched_abnormal` (range 3–15).
   - Folate 2 + K 7.0 → only `potassium_critical | emergency`, `suppressed: 1`. The routine folate finding is correctly hidden under the emergency.
3. **N4 in macrocytic_anemia.** The unmeasured branches say «اندازه‌گیری نشده است» or «واحدش خوانده نشد». No text calls an absent value normal.
   - **Hand-off:** folate_deficiency never fires alongside macrocytic_anemia (5 panels). Folate talkers: exactly 1 per panel.
   - **B12 talkers:** 2 on every panel where B12 has its own rule. This was already true of macrocytic + borderline/overt on `2d32dd3`. The new double is B3.
4. **NAME_MAP collisions.** 148 rows (common Iranian CBC, biochemistry, urine, serology and hormone names, plus the new ones) were compared between `2d32dd3` and the working tree. 31 changed, and every change is unmapped → the intended key. `Vit B12` → B12 (graded) is the only one that now gets graded; the other 30 go to noRef.
   - **Unchanged:**
     - Creatinine rows: `Cr 1.0 mg/dL` → CREAT, `Cr 88 umol/L` → CREAT, unitless `Cr` → unit_unknown CREAT.
     - Rare-element abbreviations: `Co` and `Co mmol/L` → unmapped, `Mn` and `Mn ug/L` → unmapped, `Mo` → unmapped.
     - Unitless `Cu`, `Zn`, `Se` → unmapped. `Cu 2 /hpf` → `Q:Urine Cu`, same as before.
     - Bare `Vitamin` → unmapped. `Urine Copper` without "24h" → unmapped.
   - **Unit-gated:** `Cu/Zn/Se` with µg/dL or µg/L → noRef COPPER/ZINC/SELENIUM.
   - **Persian `روی`:** maps to ZINC even without a unit. Acceptable, because it only reaches noRef and makes no claim.
   - **`Vitamine` → VIT_E:** this spelling is also a common way to write a bare "Vitamin". Harmless for the same reason, but should be reconsidered before P49-د gives VIT_E a range.
   - **Still unmapped (N2 gap, not a safety issue):** `Zn (Zinc)`, `Cu (Copper)`, `Se (Selenium)`, `Zinc level`.
5. **Anti-IF / APCA.** `Anti Intrinsic Factor Positive`, `Anti-IF 12 U/mL`, `Parietal cell antibody Negative` and `APCA 1:40` all go to `noRef` only. None becomes a number or a `qual` entry, and none produces a finding. N6 holds.
6. **buildNormalResult noRef branch** (`prompt.js:402`). Zinc only:
   > summary «مقادیرِ این برگه خوانده شدند، ولی موتور هیچ‌کدام را تفسیر نکرد.»
   > interpretation «برای این مقادیر محدودهٔ مرجعِ تأییدشده نداریم: روی (زینک). درباره‌شان «بالا» یا «پایین» نمی‌گوییم؛ تفسیرشان با پزشک است.»
   > recommendation «این برگه را به پزشک نشان دهید تا مقادیرِ تفسیرنشده را بررسی کند.»

   With a normal CBC it says «مقادیری که موتور می‌سنجد در محدودهٔ طبیعی‌اند، ولی چند مقدارِ این برگه تفسیر نشدند.» Accurate, with no false reassurance, and better than the old «نتایج آزمایش شما در محدوده طبیعی است». The display names go through `faName()`.
   - *Minor, not blocking:* this branch returns early, so the old «چند مورد نزدیک حد محدوده هستند …» borderline sentence is lost on these sheets.
7. **server.js legacy-path gate.** On `2d32dd3` these sheets went to the legacy path, where the LLM makes its own clinical judgment (N9). Now they stay on the engine and reach the noRef text above:
   - Prolactin 80 and Prolactin 15
   - AMH 0.1 (noRef plus ungraded `no_range`)
   - Cortisol 2
   - Ceruloplasmin 8
   - Zinc
   - Anti-IF

   That is safer under the engine boundary. The cost is that a clinically important unapproved value (prolactin 80, ceruloplasmin 8, cortisol 2) gets "show your doctor" with `urgency: none`. That is the intended P46/P49 staging, and it is disclosed.
   - *Residual, not blocking:* a sheet where every other row is unmapped (for example a critical analyte missing from NAME_MAP) plus one noRef key no longer falls back to the LLM. The unmapped rows are still named in `ocr_warnings`.
8. **P49.** No number from P49 reaches executable code:
   - `folate_deficiency` uses the existing `refs.js` / `refs_ped.js` folate ranges.
   - The B12 150/399 bands are the existing `P21` / `borderline_b12_deficiency` numbers.
   - The new analytes have no range.
   - Ceruloplasmin, MMA, antibody and trace-element thresholds exist only as `todo` tests (`M151`–`M154`).

   *Not blocking but open:* spec.md:272 requires the source of the folic-acid caution sentence to be registered in `guidelines.js` before it runs, or moved into P49. It is not in `guidelines.js`, and P49 does not list it. The same sentence already runs in P21's `overt_b12_deficiency` warnings, so it is not new clinical content. The procedure is still unmet.

## Probe scripts
`C:\Users\surface\AppData\Local\Temp\claude\c--Users-surface-Desktop-khanesh-project\2dfd807f-ec40-4fd1-8ac2-a31f9044a709\scratchpad\mr004\`: `p1.mjs` (B12/folate branches), `p2.mjs` (old vs new, B12 high), `p3.mjs` (pediatric/emergency), `names.mjs` + `old.json` / `new.json` (148-row name diff), `p6.mjs` (noRef sheets and server path), `p7.mjs` (finding counts). `old/` is the `2d32dd3` archive, and its `node_modules` is a junction, so do not `rm -rf` it.

---

## دور ۲ (۲۰۲۶-۰۹-۱۹)

**Verdict: PASS.** Confidence 0.85. B1, B2 and B3 are closed on the live engine, and no new blocker was found.

Suite on the working tree: `npm test` → `tests 514 · pass 491 · fail 0 · todo 23`. M155–M160 are all green.

Probes: `C:\Users\surface\AppData\Local\Temp\claude\c--Users-surface-Desktop-khanesh-project\2dfd807f-ec40-4fd1-8ac2-a31f9044a709\scratchpad\mr004b\`
- `q1.mjs` (B1–B3 and the 150/399/400 edges)
- `q2.mjs` (unit-unknown, pmol/L, pediatric, emergency, high folate)
- `q3.mjs` (Hb<7, compared against `2d32dd3`)
- `q4.mjs` (`buildNormalResult`)

### B1 — closed
The folic-acid caution is now carried inside `macrocytic_anemia` (`patterns_hematology.js:490,501,513`). Tested with Hb 9.5, MCV 112 and Folate 2 ng/mL:
- **B12 absent:** must_say «ویتامین B12 روی این برگه اندازه‌گیری نشده است. پیش از مصرفِ اسید فولیک باید B12 هم سنجیده شود، چون اسید فولیک می‌تواند کم‌خونیِ ناشی از کمبودِ B12 را بپوشاند در حالی که آسیبِ عصبیِ آن ادامه پیدا می‌کند.» + warning «تا پزشک وضعیتِ ویتامین B12 را بررسی نکرده، خودسرانه اسید فولیک شروع نکنید.»
- **B12 250 / 150 / 399 pg/mL:** «ویتامین B12 شما (250) نزدیکِ مرزِ پایین است و کمبود را کاملاً رد نمی‌کند.» + the same warning.
- **B12 unitless 250:** «ویتامین B12 روی برگه هست ولی واحدش خوانده نشد، پس درباره‌اش قضاوت نمی‌کنیم.» + the caution and the warning. `unit_unknown_values` fires separately.
- **B12 100:** no folic warning in `macrocytic_anemia`. `overt_b12_deficiency` carries it («خودسرانه فولات یا اسید فولیک مصرف نکنید…»), so the warning appears once.
- **B12 400 / 295 pmol/L (→400):** «پایین نیست (400)، پس کمبودِ B12 علتِ محتمل‌تری نیست», no folic warning. This follows the P21 band.

Duplicates: no panel shows two folic warnings. When B12 is absent, the caution (the explanation) and the warning (the instruction) are two sentences with different content, which is acceptable.

### B2 — closed
- **Folate 2 + B12 1500 (own mode):** «ویتامین B12 شما (1500) بالاتر از محدودهٔ طبیعی است (200–900)؛ کمبودِ B12 نیست، ولی بالا بودنش را این یافته توضیح نمی‌دهد و باید با پزشک بررسی شود.»
- **Macrocytic, B12 1500 pmol/L:** «ویتامین B12 شما (1500 pmol/L) بالاتر از محدودهٔ طبیعی است (200–900)، …». Direction is correct. The printed number is shown with its printed unit (N5 OK). The range is the pg/mL range, the same presentation round 1 accepted.
- **B12 800 pmol/L (graded 1084):** «بالاتر از محدودهٔ طبیعی».
- **Age 5, B12 1000 (range 160–925):** «بالاتر از محدودهٔ طبیعی است (160–925)».
- **B12 1500 alone:** `unmatched_abnormal` still names it. The N18 net is unchanged when no B12 reader fires.

### B3 — closed
- **Folate 2 + B12 100 (Hb 14, MCV 90):** `folate_deficiency|this_week`, action «همراه با یافتهٔ ویتامین B12، این هفته با پزشک مطرح کنید…», next to `overt_b12_deficiency|this_week`. Both findings give the same timing.
- **Edges:** 149 (110 pmol/L) → both this_week. 150 (111 pmol/L → 150.4) → both routine (folate + borderline). Both rules read `val(e).B12`, so rounding cannot split them.

### Other checks
- **K 7.0 + folate panels:** `potassium_critical` alone; `suppressed` 1 or 2.
- **Adult folate 25:** no finding. **Folate 1200:** `unmatched_abnormal` («فولات با مقدار 1200 (طبیعی 3.5–999)»).
- **Pediatric macrocytic, folate 20:** «بالاتر از محدودهٔ طبیعی است (20، طبیعی 3–15)».
- **N4:** every absent value says «اندازه‌گیری نشده». No absent value is reported as normal.
- **`buildNormalResult`, noRef + Hb 12.4 (near limit):** the old sentence is restored: «… چند مورد نزدیک حد محدوده هستند: هموگلوبین. این به‌خودی‌خود معنایی ندارد، ولی اگر نتیجه قبلی دارید مقایسه کنید.»

### Not blocking. Record or fix later:
1. **Hb < 7 macrocytic: two timings for the same Hb (N20). Pre-existing, measured on `2d32dd3`.**
   - `severe_anemia_crisis` says «فوراً و بدون اتلاف وقت به بخش اورژانس…».
   - Right beside it, `macrocytic_anemia` says «این هفته با پزشک عمومی یا داخلی وقت بگیرید…».
   - `suppressed: 0`, because `severe_anemia_crisis` has no `blocks_others`.
   - Both lines are identical on `2d32dd3`, so this change did not introduce it. Register it in MEDICAL_RULES.
2. **Unitless folate that is out of range under both readings + macrocytic + B12 absent or borderline: no folic caution.**
   - Folate 2 with no unit is out of range under both readings (`level: all`), yet `folicRisk` requires graded FOLATE.
   - This never existed on `2d32dd3` either, so it is a gap, not a regression.
   - Suggestion: define `folicRisk` as "folate is not known to be normal". Better still, give the caution in every macrocytic anemia where B12 is unsettled.
3. **B12 150–199 (adult range 200–900) or 155 in a child (range 160–925).**
   - The engine grades these values `low`.
   - `b12Clause` still says «نزدیکِ مرزِ پایین», and `borderline_b12_deficiency` adds «حتی اگر عدد در محدوده طبیعی آزمایشگاه باشد».
   - The direction is right but the wording understates it, and the test table shows «پایین‌تر از حد طبیعی». This is the P21 band (150/399), awaiting reviewer review.

## P49-الف/ج (۲۰۲۶-۰۹-۱۹)

**Verdict: FAIL.** The engine tells the patient the antibody is positive when the sheet says it is **not detected**.

Measured on the working tree (base `2d32dd3` plus uncommitted specs/004). `npm test`: 518 · 499 · 0 fail · 19 todo. Probes are in the session scratchpad `mrP49/probe.mjs` and `probe2.mjs`. No source was edited.

### Blockers

**C1: «Undetected» and «Nondetected» are read as POSITIVE, so a negative result is reported as positive (N12 class, wrong direction).**
- Location: `patterns_endocrine_new.js`, `pos()` inside `overt_b12_deficiency`.
- Cause: the negative regex `/neg|منفی|non.?react|not.?detect/` does not match `undetected` or `nondetected`. The positive regex's bare `/detected/` then matches.
- Measured on B12 120 pg/mL + Anti-Intrinsic Factor «Undetected» (and «Nondetected»). The patient reads:
  > «آنتی‌بادیِ ضدِ فاکتورِ داخلیِ شما مثبت است. همراهِ B12ِ پایین، این احتمالِ کم‌خونیِ پرنیشیوز را مطرح می‌کند — بیماریِ خودایمنی‌ای که جذبِ B12 از روده را مختل می‌کند. تشخیص با پزشک است.»
- `ANTI_IF` is then put in `explains` and drops out of the «تفسیر نشدند» line. The wrong reading becomes the only one the patient sees.
- The same fault applies to APCA, which uses the same `pos()`.

**C2: «+/-» (equivocal) is reported as «مثبت است».**
- The bare `\+` in the positive regex matches it.
- Measured on B12 120 + anti-IF «+/-»: the same pernicious-anaemia sentence as in C1.
- The reviewer approved «Positive» only. An equivocal result must stay uninterpreted, as «Equivocal», «Borderline» and «Indeterminate» already do.

**Fix direction (for the builder, not a new threshold):**
- Test the negative forms first, and anchor them: `un-`/`non-`/`not` + `detect`, `absent`, `nil`, `±` and `+/-`.
- Remove the bare `/detected/` and the bare `\+` from the positive test, or anchor them to the whole value.
- Add a guard in the `M153b` loop for «Undetected», «Nondetected» and «+/-». It must go red on the current code.

### Checked and correct
- **Ceruloplasmin 19.9 / 20 / 20.0 mg/dL:** this_week / no finding / no finding. **0.19 g/L** reads «0.19 g/L (برابرِ 19 mg/dL)». **0.2 g/L** gives no finding. **100 mg/L** reads «(برابرِ 10 mg/dL)». Conversions and the edge are correct. The printed number is shown next to the converted one (N5).
- **Ceruloplasmin 0 and «< 5»:** this_week. Nothing is invented.
- **Age:** «11 months» (0.92), «6 ماهه», «۶ ماه», «10 days», «3 weeks» and «0» all give no finding. For these, ceruloplasmin stays in the «تفسیر نشدند» line, so nothing is silently dropped. «1», «12 months» and «1 year» all fire.
- **Urine copper:**
  - «µg/L», «ug/L», «µmol/L» and «µg/dL» are **not** treated as 24h. The finding says «مسِ ادرارِ ۲۴ساعته روی برگه هست ولی واحدش خوانده نشد، پس درباره‌اش قضاوت نمی‌کنیم.», and the value stays in the «تفسیر نشدند» line.
  - «µg/d», «µg/day», «mcg/24h», «µg/24 h» and «µg/24hrs» are all judged.
  - «µmol/24h» is converted ×63.55. 1.57 µmol is about 100 µg, which matches the threshold.
  - A row named «Urine Copper» (no 24h) is unmapped and goes to the unmapped warning. The Wilson finding correctly says the 24h test «اندازه‌گیری نشده است».
- **Suppression:** tested with ceruloplasmin 10 + K 7.5, and with B12 120 + anti-IF Positive + K 7.5. `hyperkalemia` is the only finding and `suppressed` is 1. CERULOPLASMIN / ANTI_IF **return** to the «تفسیر نشدند» line. `unexplainedNoRef` reads `runPatterns().findings`, which holds only the findings actually shown (`patterns.js`, `findings: shown`). There is no silent drop.
- **Severe anaemia (Hb 5) + B12 120 + APCA Positive:** `severe_anemia_crisis` has no `blocks_others`, so the B12 finding and its APCA sentence («… شایع است ولی اختصاصی نیست …») are both shown.
- **Antibody positive with B12 250, B12 600, no B12, or unitless B12:** no pernicious-anaemia sentence, and the antibody stays in the «تفسیر نشدند» line. This matches the approved scope.
- **Other antibody values:** «Negative», «neg», «Non-reactive», «Not reactive», «Not detected», «Undetectable», «ND», «Equivocal», «Borderline», «Indeterminate», «Present», «Absent», «25 U/mL» and «Negative (+/-)» are all uninterpreted and stay in the line.
- **Inflammation branch:**
  - Tested with ceruloplasmin 25 + CRP 40, ceruloplasmin 60 + ESR 80, and ceruloplasmin 30 + qualitative CRP Positive.
  - The branch is routine, and its action matches its urgency (N20): «اگر این آزمایش برای بررسیِ ویلسون خواسته شده، در نوبتِ عادی این نکته را با پزشک مطرح کنید.»
  - It sits next to crp_elevated (this_week) or esr_elevated (routine) without contradiction.
- **Liver panel (ALT 300 / AST 250 / bilirubin 3) + ceruloplasmin 10:** `liver_unspecified` and `wilson_evaluation` are both this_week. There is no contradiction. The text never says «ویلسون دارید».
- **N8:** no raw key appears in any Wilson or B12 text. The «تفسیر نشدند» line uses `faName`.

### Not blocking. Record in MEDICAL_RULES or fix later
1. **Printed units the rule does not recognise:** «میلی گرم در دسی لیتر», «(mg/dL)», «mg/dL.», «mgdl» and «mg/100mL». `units.js` recognises these for other analytes (M126, FR-009). `ceruloMgDl` recognises none of them, so ceruloplasmin 10 falls back to «تفسیر نشدند». This is not dangerous, because the value is still flagged to the doctor, but it is an under-read on sheets that did print the unit. Reusing the `units.js` normaliser would close it.
2. **Age parsing (pre-existing `inferAge`):** «6 m», «6 M» and «6/12» all parse as **6 years**, so a 6-month infant gets «سرولوپلاسمینِ شما پایین است — بررسیِ بیماریِ ویلسون با پزشک» at this_week. This is no worse than an unknown age, which also fires by design. ⚠️ Do not fix it by treating a trailing «M» as months: «40 M» as Age/Sex would then make an adult 3.3 years old and grade the whole sheet against paediatric ranges.
3. **N21:** the Wilson text does not read albumin or proteinuria. Nephrotic syndrome and hepatic synthetic failure are the commonest non-Wilson causes of low ceruloplasmin. Measured on ceruloplasmin 10 + albumin 2.0 + urine protein 3+: `nephrotic_pattern` fires, and the Wilson finding says only «سرولوپلاسمینِ پایین علت‌های دیگری هم دارد». A three-way albumin clause (low / normal / not measured) would tell the patient that their own sheet already offers another explanation. This is a reviewer decision.
4. **«Weakly positive», «مثبت ضعیف», «1+» and «positive (weak)»** are reported as «مثبت است». They are positive by the lab's own call, but the reviewer should confirm that a weak positive earns the same sentence.

## P49-الف/ج دور ۲ (۲۰۲۶-۰۹-۱۹)

**Verdict: PASS.** C1 and C2 are closed, and I found no new blocker (C3+: none).

Measured on the working tree (branch `recovery`). `npm test`: 518 · 499 · 0 fail · 19 todo. The only `✖` lines are `todo` tests such as M101, which is how node reports them. The probe is `scratchpad/mrP49b/probe.mjs` and its output is `out.txt`. No source was edited.

### C1 and C2: closed
The whitelist check in `pos()` (`patterns_endocrine_new.js:76-80`) compares the whole value. It was probed with B12 120 pg/mL on the anti-IF row and on the APCA row.
- «Undetected», «UNDETECTED», «Nondetected», «Non-detected», «+/-», «±», «+ / -» and «-/+» are all left uninterpreted. There is no «پرنیشیوز» sentence, `explains` is null, and ANTI_IF (or APCA) stays in the «تفسیر نشدند» line.
- Negative controls also stay uninterpreted: «Negative», «Not detected», «Undetectable», «ND», «Not Positive», «non positive», «Positive?» and «Detected (low)».
- M153b now loops over «Undetected», «Nondetected», «+/-» and «±». In round 1 I measured these same values fire the positive sentence on the old `pos()`, so this guard would have caught the bug (N10).

### Real positive spellings
**Still read as positive.** The patient reads «آنتی‌بادیِ ضدِ فاکتورِ داخلیِ شما مثبت است. همراهِ B12ِ پایین، این احتمالِ کم‌خونیِ پرنیشیوز را مطرح می‌کند — بیماریِ خودایمنی‌ای که جذبِ B12 از روده را مختل می‌کند. تشخیص با پزشک است.» for these values:
- «Positive», «POSITIVE», «Pos», «pos.», «مثبت», «Detected», «detected.», « Positive » (with spaces), «Positive.», «positive!» and «Reactive».
- APCA «Positive» gets the sentence «… شایع است ولی اختصاصی نیست …».

**Now uninterpreted.** This is an under-read, not a danger: the value stays in the «تفسیر نشدند» line and is shown to the doctor. It should be recorded in P49-ج:
- «Positive (+)» (for both anti-IF and APCA), «+ve», «Positive 1:40», «مثبت است».
- The weak and equivocal forms («Weakly positive», «مثبت ضعیف», «1+», «+», «++») are also uninterpreted. This is intended until the reviewer decides on weak positives (round-1 item 4).

**Dangerous readings:** none. No negative, equivocal or absent value reaches «مثبت است».

### Urine copper after `normUnit`
- **Judged:** «µg/24h», «ug/24 h», «mcg/day», «µg/24 h», «µg/d», «mcg/24hrs», «(µg/24h)», «µg/24h.» and «µmol/24h».
  - «1.0 µmol/24h» → «1 µmol/24h (برابرِ 64 µg/24h) است و از ۱۰۰ میکروگرم در ۲۴ ساعت بیشتر نیست؛ این به‌تنهایی ویلسون را رد نمی‌کند و تصمیمش با پزشک است.»
- **Not judged** (correct): «µg/L», «ug/L», «µmol/L», «µg/dL» and «nmol/24h». These give «مسِ ادرارِ ۲۴ساعته روی برگه هست ولی واحدش خوانده نشد، پس درباره‌اش قضاوت نمی‌کنیم.», and U_COPPER_24H stays in the «تفسیر نشدند» line.
- **Under-read, not dangerous:** «µg/24hours» and «میکروگرم در ۲۴ ساعت» are not recognised and fall to the same «واحدش خوانده نشد» sentence.

### Ceruloplasmin units
Round-1 item 1 is now mostly closed. «میلی گرم در دسی لیتر», «(mg/dL)», «mg/dL.» and «mgdl» are all judged. Only «mg/100mL» still falls to the «تفسیر نشدند» line, which is an under-read.

### Still open, not blocking
Round-1 items 2–4 are unchanged: `inferAge` reads «6 m» as years, the N21 albumin/proteinuria clause is missing, and the weak-positive policy needs a reviewer decision.
