# Medical review: specs/005 (urinalysis Stage A, P50)

**Verdict: FAIL.** There are 4 blocking issues. B1 alone is enough to fail the change: it produces a false "blood from inside the kidney / glomerulonephritis" finding from a negative result.

What I measured: I ran every panel below through `runEngine` + `runPatterns` on the working tree. Each one uses a realistic urine sheet (Color, SG 1.020, pH 6.0, Nitrite Neg, Urobilinogen Normal, Bacteria Few), with age 40 and sex M unless stated otherwise. `node --test rules/engine.test.js` gave `tests 508 · pass 489 · fail 0 · todo 19`. The suite is green, and none of the defects below is covered by it.

---

## Blocking

### B1. A negative result, written the way Iranian sheets write it, becomes a pathological cast finding
In `castAxis` (patterns_utils.js), a value is treated as absent only if it matches `CAST_NEG_RE = /^(neg|negative|منفی|nil|none|no|not\s*seen|دیده\s*نشد|-|0)$/i`. Any other text with no digit becomes `n = Infinity`, which means "present".

The table shows what each value produced, measured one row per run:

| row | finding |
|---|---|
| `RBC Casts: Absent /lpf` | `urine_cast_rbc` this_week |
| `RBC Casts: Nil seen` / `None seen` / `Not detected` | `urine_cast_rbc` this_week |
| `Granular Casts: مشاهده نشد` / `یافت نشد` / `ندارد` | `urine_cast_granular` |
| `Granular Casts: -ve` / `Nill` / `Not found` / `N/S` / `Negative .` | `urine_cast_granular` |

On a normal sheet that prints «RBC Casts: Absent», the patient reads:
> «در ادرارِ شما سیلندرِ گلبولِ قرمز دیده شده — نشانه‌ای که منشأ خون را درونِ کلیه می‌گذارد … این یافته می‌تواند نشانهٔ التهابِ بخشِ تصفیه‌کنندهٔ کلیه (گلومرول) باشد»

«مشاهده نشد» is the most common Persian way to write "not seen" on a sheet. So this is not an edge case.

**Why it is wrong:** this is the N6 rule broken. A qualitative result is a closed set of words, but here any string that is not on the negative list counts as positive.

**Fix:** invert the logic. A cast type counts as present only if the value is:
- a number greater than 0, or
- a whitelisted presence word (`rare|few|occasional|some|many|moderate|numerous|plenty|present|seen|positive|\+`, and their Persian equivalents such as «کم|چند|گاه|زیاد|فراوان|متوسط|مثبت|دیده شد»).

Any other value is not interpreted. It goes to the «تفسیر نشدند» line, not into a finding. Add a guard that sweeps the negative spellings above.

### B2. Two findings on one sheet contradict each other about the same blood
**Panel:** `Blood +2 · RBC 0-2 /hpf · RBC Casts 3-5 /lpf`. The engine returns `hematuria` (the "disagreeing" arm) plus `urine_cast_rbc`.

- `hematuria` says: «در بخشِ میکروسکوپیِ همین برگه گلبولِ قرمزِ قابل‌توجهی دیده نشده است؛ پس این واکنش می‌تواند از هموگلوبینِ آزاد … یا میوگلوبین … باشد». It also suggests CK and haptoglobin.
- `urine_cast_rbc` says: «وقتی گلبولِ قرمز داخلِ آن‌ها گیر افتاده باشد، یعنی خون از درونِ خودِ کلیه می‌آید».

The sheet itself shows red cells, trapped in casts. The disagreeing arm steers the patient toward haemolysis or rhabdomyolysis on a sheet that points to glomerular bleeding. This is N20 (two findings disagreeing) and N21 (a cause offered even though the same sheet argues against it).

The agreeing arm has the same problem in a milder form. **Panel:** `Blood +3 · RBC 10-15 · RBC Casts 3-5`. The unchanged hematuria text lists «از عفونت و سنگ کلیه تا علل دیگر … دوره‌ی قاعدگی», while right beside it the cast finding says «نه از مثانه یا مجرای ادرار».

**Fix:** when `castAxis(e).label === "rbc_cast"`, `hematuria_pattern` should hand off to `urine_cast_rbc`. That is the same shape it already uses to hand off to GN. Its dipstick/microscope sentence should move into the cast finding. At minimum, the disagreeing (free-pigment) arm must never be chosen when RBC casts are present. Add a guard for exactly one blood-origin finding per sheet.

### B3. The new myoglobin / free-haemoglobin wording has no escalation path
**Panel:** `Blood +3 · RBC 0-1 /hpf`, no CK. The engine returns `hematuria` this_week. The new text names «میوگلوبین (رنگدانهٔ عضله، پس از آسیبِ عضلانی)» and «هموگلوبینِ آزاد (وقتی گلبول‌های قرمز درونِ رگ‌ها می‌شکنند)». The action is inherited unchanged from `hematuriaBase`:
> «این هفته با پزشک مطرح کنید تا علت بررسی شود.»

**Why it is wrong:** rhabdomyolysis and intravascular haemolysis both need same-day care when they are symptomatic. `rhabdomyolysis_pattern` can only catch this when CK > 1000 is printed on the sheet, and a urine-only sheet has no CK. Every other new finding in this change carries a «زودتر مراجعه کنید» escape clause. The one finding that names a potentially emergent cause is the only one that does not.

**Fix:** keep `this_week`, and add to this arm's action: «اگر ادرارِ تیره یا قهوه‌ای‌رنگ، دردِ شدید یا ضعفِ عضلانی (به‌ویژه پس از ورزشِ سنگین یا ضربه)، زردی یا کم‌شدنِ ادرار دارید، همین امروز مراجعه کنید.»

In the same arm, read CK three ways (N21). Currently CK 800 on the sheet is ignored (panel `Blood +3 · RBC 0-1 · CK 800`), and a normal CK is not mentioned either:
- high but ≤ 1000: supports muscle as the source;
- normal: argues against muscle;
- absent: suggest CK, as the code does today.

### B4. A lower-ranked cast type on the same sheet disappears from the report
**Panel:** `RBC Casts 2-3 · Waxy Casts 1-2`. The only finding is `urine_cast_rbc`, and the waxy row is mentioned nowhere. **Panel:** `RBC Casts 2-3 · Fatty Casts 1-2 · Protein +3`. The engine returns `urine_cast_rbc` plus `proteinuria_heavy`, and the fatty casts are never mentioned.

`castAxis` puts every cast row in `read`, so the lower-ranked rows are consumed without any text. They do not reach any "not interpreted" line either. Clinically, RBC + waxy suggests chronic or advanced glomerular disease, and RBC + fatty suggests a mixed nephritic–nephrotic picture. Both combinations are more significant than the RBC cast alone. The CLAUDE.md N18 entry (specs/004, M156) states the rule this breaks: "a rule that reads a key takes it away from the net; every branch it can land in needs a sentence."

**Fix:** keep one finding per sheet with the same rank and urgency. Have `castAxis` also return the other present types, and append one sentence to the top finding, for example «در همین برگه سیلندرِ مومی هم گزارش شده است، که پزشک در کنارِ این یافته می‌خواند.» No new urgency and no new claim are needed. Add a guard that every present cast type is named in the report.

---

## Non-blocking (record in P50)

- **N-a. RBC casts with raised creatinine stay this_week.** On `RBC Casts 3-5 · Creatinine 3.5`, the engine returns `kidney_impairment` this_week plus `urine_cast_rbc` this_week. Active sediment with a raised creatinine is the rapidly progressive GN picture, which nephrology usually wants seen within 24–48 h. The red-flag clause («ورم، کم‌شدنِ ادرار … زودتر») lessens the risk, and the GN rule already present has the same limitation. This should go to the reviewer as a question: should `rbc_cast` together with CREAT high escalate? At Cr 6 the emergency takes over correctly.
- **N-b. WBC-cast wording.** «همین یافته است که عفونتِ کلیه را از عفونتِ سادهٔ مثانه جدا می‌کند» presents infection as the reading. WBC casts also occur in (drug-induced) interstitial nephritis. Suggest adding «یا التهابِ غیرعفونیِ کلیه، مثلاً واکنش به دارو» and a medication-review suggestion. Firing alongside `uti_likely` is coherent, because pyelonephritis is a UTI. `this_week` with «تب، لرز یا درد پهلو … زودتر» is acceptable.
- **N-c. Fatty cast with protein +1/+2** reads «پروتئینِ ادرارِ همین برگه زیاد نیست». +2 is still significant proteinuria. Split the wording: negative → «منفی است»; +1/+2 → «هست ولی کمتر از +۳».
- **N-d. `urine_cast_granular` does not read creatinine.** Its text says «گاهی نشانهٔ آسیبِ کلیه است» but ignores a creatinine printed on the same sheet (N21). Reuse `creatClause` there, as the tubular and waxy rules already do.
- **N-e. `Casts: Not seen` (no type)** goes to `unmapped`, so an explicitly negative row appears in «تفسیر نشدند». This is noise, not a hazard.
- **N-f. P50 Q1 (WBC ≤ 5 for women).** Acceptable as a provisional value. With `LE+ · WBC 6-8` and sex F, `uti_likely` fires. That is the rule's existing behaviour, not a new over-read. It is correctly recorded for the reviewer.

## Checked and acceptable
- **RBC-cast text:** glomerular origin, "may be", diagnosis left to the doctor, and the creatinine is handled three ways (high, normal, not measured) plus an unknown-unit case.
- **Tubular (RTE) text:** dehydration and drugs as causes, and the patient is told not to stop medication. **Waxy/broad:** "chronic damage, not by itself kidney failure". **Fatty:** linked to heavy proteinuria, with a three-way protein branch. **Hyaline:** transient, not disease on its own.
- **Urgencies:** this_week for RBC, WBC, tubular, waxy and fatty casts; routine for granular and raised hyaline. None of them is a false emergency. Emergencies (Cr 6, CK 5000) still suppress or own the report correctly.
- **Rank order** (rbc > wbc > tubular > waxy/broad > fatty > granular > hyaline) is clinically sound. Having one finding per sheet is sound once B4 is fixed.
- **Hyaline ≤ 2/lpf gives no finding.** This is correct: 0–2 hyaline casts per lpf is physiological. "Few/rare" hyaline counts as normal and "many" as raised, which is correct.
- **P50 Q4: "0-1" pathological casts counted as present.** This is correct. The reference value for non-hyaline casts is 0, so even an occasional RBC, WBC or granular cast is reportable.
- **GN hand-off (Q7).** It is acceptable that the standalone RBC-cast finding is the common path. It already names glomerular inflammation, asks for creatinine/eGFR when creatinine is absent, and points to nephrology. When GN does fire (`Blood+2 · Protein+2 · RBC 10-15 · RBC casts · Cr 3.5`), exactly one finding is produced.
- **`urine_esterase_without_cells`** (`LE+1 · WBC 2-3` and `LE+2` with no WBC row): the wording is correct. It says the result is not a UTI by itself, offers lysis, contamination and sterile inflammation as causes, advises no self-started antibiotics, and says to come sooner with dysuria, fever or flank pain. `routine` is appropriate.
- The fixed misreadings (RBC cast read as haematuria, leukocyte cast read as UTI, the LE pad read as a WBC count) are correct and clinically important.

---

## Resolution — 2026-09-22 (implementer)

Both reviews were reproduced on the working tree before any fix. All 12 findings reproduced as reported: the code review's #1–#8 and this review's B1–B4, several of which overlap. Each fix below has a guard that was **seen red** before the fix, in the run where `node --test rules/engine.test.js` reported `fail 12`: the 11 new guards plus `M167d`, which was changed on purpose. All are green afterwards. The reviewers' own panels were then re-run against the fixed engine.

| Finding | Fix | Guard |
|---|---|---|
| **B1** / code #1 — negative cast read as present | `castValueState`: a **closed presence list** (N6), with negation checked first. Anything that is neither a positive count nor a presence word is `unknown`, and the adapter sends it to «تفسیر نشد» (`N/S` → `unmapped`). `<n` and «کمتر از» are absent. | `M169` (18 spellings × 3 cast types) |
| **B2** / code #4 — contradictory blood findings | `hematuria_pattern` hands off to `urine_cast_rbc` whenever `castAxis` is `rbc_cast`, in **every** arm, the same way it already hands off to GN. | `M169e`, `M169i`; `M167d` **changed on purpose** (it used to require `hematuria` to fire in the not-done arm) |
| **B3** — no escalation for myoglobin/free Hb | `this_week` is kept. The action now adds «اگر ادرارِ تیره یا قهوه‌ای‌رنگ، دردِ شدید یا ضعفِ عضلانی (…)، زردی یا کم‌شدنِ ادرار دارید، همین امروز مراجعه کنید». CK is reported with five branches (high / low / normal / printed-without-unit / absent). | `M169j` |
| **B4** / code #6 — lower-ranked casts vanish | `castAxis` returns `types`/`others`; `othersSentence` names the other pathological casts on the winning finding and inside GN's folded sentence. | `M169k` |
| code #2 — descriptive count read as "not on sheet" | `urineCellState` → absent / low / high / unknown. "Not on this sheet" is used only for **absent**. `Many`/`Full field`/«فراوان» count as high; `Few`/`Rare` count as low. | `M169b`, `M169c` |
| code #3 — WBC cast plus esterase gave two verdicts | `urine_esterase_without_cells` stands down when any WBC cast is present. | `M169d` |
| code #5 — a multi-type «Casts» row read as its worst type | `castRoute`: an untyped row whose value names more than one type goes to `unmapped`. | `M169f` |
| code #7 — «Casts: Not seen» triggered the uninterpreted warning | An untyped **negative** row goes to `qual` and is consumed as absent. | `M169g` |
| code #8 — Persian «کست» with ZWNJ or kasra | `CAST_KEY_RE` accepts ZWNJ, kasra and «ها»; «شکست» still doesn't match. | `M169h` |

**Non-blocking items also applied:**
- The WBC-cast text now names drug-related interstitial inflammation and suggests a medication review.
- Fatty casts with protein +1/+2 now read «کمتر از مقداری که معمولاً همراهِ این یافته دیده می‌شود» instead of «زیاد نیست».
- The granular-cast finding reads creatinine with the same five-branch clause.

**Recorded in P50 for the reviewer, not changed:**
- RBC casts with creatinine 3.5 stay at `this_week` (possible RPGN).
- The single WBC bound for women.

**Pre-existing, found by the code review and recorded, not fixed:**
- `uti_pattern` does not read descriptive WBC («WBC: Many»).
- The «Leukocytes: +2» pad label is unmapped.
- «تکرار آزمایش ادرار» is phrased as «درخواست آزمایش تکرار آزمایش ادرار». ✅ Fixed after the Stage A commit (`phraseSuggestion`, `M170`).

**Final state:** `npm test` gives `558 · 539 · 0 fail · 19 todo`, working tree on `395a5d7`.
