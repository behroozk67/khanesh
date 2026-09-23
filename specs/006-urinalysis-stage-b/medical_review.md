# Medical review — specs/006 (urinalysis Stage B, P51)

**Verdict: FAIL**

Scope: `git diff b9068df -- khanesh-server/rules/` (working tree, branch `recovery`) plus the untracked `khanesh-server/rules/patterns_urinalysis.js`. package files and `.gitignore` were ignored. Every panel below went through the live engine (`runEngine` from `rules/adapter.js`, then `runPatterns`). Unless a panel says otherwise the patient was 40 F, and each urine panel also carried `Color: Yellow`, `Appearance: Clear`, `pH: 6` and `Nitrite: Negative`.

Reviewed as clinical correctness only. The P51 numbers (SG 1.005/1.030, RTEC > 2/hpf, squamous ≥ 15/hpf, the crystal classes) match Henry ch.29 as the spec quotes it, and P51 correctly leaves them pending a human reviewer. None of the blocking items below is about those numbers.

---

## Blocking

### B1 — A positive urine bilirubin is handed to a finding that argues against it, and the this_week urgency is lost (N21 / N20)

`serumBiliOwnerFires` (`patterns_urinalysis.js:39`) suppresses `urine_bilirubin_urobilinogen` whenever `bilirubin_pattern` or `hemolysis_pattern` *matches*. It does not check which branch will build. The sentence `urineBiliSentence(e)` (`patterns_utils.js:728-735`) is then added to two branches whose own content contradicts conjugated bilirubinuria:

- **Gilbert branch** (`patterns_biochem.js:1350`). Panel: 30 M, `Bilirubin Total 2.2 mg/dL`, `Bilirubin Direct 0.3 mg/dL`, `ALT 20`, `AST 22`, `Urine Bilirubin 1+`.
  Output: `bilirubin_indirect_dominant[routine]` only. It tells the patient «شایع‌ترین و بی‌خطرترین علت «سندرم ژیلبر» است … هیچ آسیبی به کبد نمی‌زند و درمانی لازم ندارد», then adds «نوارِ ادرار هم بیلی‌روبین را مثبت نشان داده است؛ … پس این با سهمِ کبد یا مجاری صفرا در همین یافته جور است.» The action is «نوبت عادی».
  Gilbert syndrome is an unconjugated hyperbilirubinaemia and does **not** produce bilirubinuria. A positive urine bilirubin is the one thing on this sheet that argues against the benign reading. The text says it "fits" instead, and the this_week finding that would otherwise fire is silenced.
- **Muscle-trap branch** (`patterns_hematology.js:1032`). Panel: 30 M, `LDH 600`, `CK 2500`, `AST 90`, `Haptoglobin 120`, `Urine Bilirubin 2+`.
  Output: `ldh_muscle_not_hemolysis[routine]`, `muscle_origin_not_liver[routine]`. The first says «به آسیب یا فعالیت عضلانی اشاره دارد … نوارِ ادرار هم بیلی‌روبین را مثبت … پس این با سهمِ کبد یا مجاری صفرا در همین یافته جور است», but that finding has no liver component. The finding right next to it says «از عضله می‌آید نه کبد». The urine bilirubin loses its this_week timeline.

A hand-off has to ask whether the owner's *built branch* can hold the sentence, not only whether its `match` fired. At minimum, Gilbert and muscle-trap must not own a positive urine bilirubin.

### B2 — Urobilinogen is graded by magnitude with the printed unit thrown away (N3)

`urobilState` (`patterns_utils.js:708-718`) compares the bare number against ≤ 1 = normal and ≤ 12 = raised. The adapter stores only `String(t.value)` in `qual`, so the unit never reaches the rule. Strips read in SI units print µmol/L: Multistix gives 3.2 / 16 / 33 / 66 / 131 µmol/L, and Combur gives normal / 17 / 70 / 140 / 200 µmol/L.

- `Urobilinogen 3.2 µmol/L`. This is 0.2 mg/dL, the **normal** pad. Output: `urine_bilirubin_urobilinogen_raised[routine]`, «اوروبیلینوژنِ ادرارِ شما بالاست … تجزیهٔ بیشترِ گلبول‌های قرمز».
- `Urobilinogen 70 µmol/L`. This is about 4 mg/dL, clearly raised. Output: no finding. The value stays in `qual` as "unknown" with no reader and is not sent to `unmapped`, so it is dropped silently.
- `33 µmol/L` and `17 µmol/L` take the same unknown, silent path.

So the rule is wrong in both directions: it reports a normal value as raised and says nothing about a raised one. The sheet states the unit, and the rule cannot see it. The code comment at line 718 even acknowledges µmol/L but only for values above 12.

### B3 — Negation and equivocal words are read as a positive urine bilirubin or a raised urobilinogen (N6)

`urineBiliState` (`patterns_utils.js:695-702`) tests only `CAST_ABSENT_RE` before its presence regex. Unlike `urobilState` and `castValueState`, it has no `^<|کمتر` guard. Its presence regex is a substring pattern containing `\+` and `کم`, and any number > 0 counts as positive.

| panel (Bilirubin row) | output |
|---|---|
| `<0.5` (below the detection limit, i.e. negative) | `urine_bilirubin_positive[this_week]` |
| `کمتر از 0.5` | `urine_bilirubin_positive[this_week]` («کمتر» contains «کم») |
| `+/-` (equivocal) | `urine_bilirubin_positive[this_week]` |
| `Urobilinogen +/-` | `urine_bilirubin_urobilinogen_raised[routine]` |

In each case the patient reads «نوارِ ادرارِ شما بیلی‌روبین را مثبت نشان داده است … به کبد یا مجاری صفرا اشاره دارد» about a strip that was negative or equivocal. This is the P49-ج lesson in CLAUDE.md N6 almost word for word («+/-» ⊃ «+»; equivocal results stay uninterpreted). These values need a closed whole-value list, and `<`/«کمتر» must be handled before the presence regex.

### B4 — On a single-photo mixed page, a normal serum bilirubin becomes "urine bilirubin positive" (N25, armed by the new reader)

Panel, all on one page: `FBS 95 mg/dL`, `Creatinine 0.9 mg/dL`, `Bilirubin 0.8 mg/dL`, `Color Yellow`, `Specific Gravity 1.020`, `pH 6`, `Nitrite Negative`.
Output: `qual["Urine Bilirubin"] = "0.8"`, `BILI_T` not graded, `urine_bilirubin_positive[this_week]`.
The same row on a biochemistry-only page goes to `unmapped` (checked).

On b9068df the misrouted row sat in `qual` with no reader, so the error stayed hidden. This change adds a reader that treats any number > 0 as positive (`patterns_utils.js:702`), so a healthy serum value now produces a this_week liver/bile-duct finding. The failure direction is a false alarm on an ordinary value. The minimum fix is to refuse a urine-bilirubin reading when the printed unit is `mg/dL` and the value is below the strip's first positive block. Numeric urine-bilirubin values need their own closed rule rather than `> 0`.

---

## Non-blocking (fix or register, do not merge silently)

1. **Urobilinogen raised is appended to the obstruction branch without saying what it implies** (`patterns_biochem.js:1325`). Panel: `Bili T 4`, `Bili D 3`, `Urobilinogen 4 mg/dL`. `bilirubin_direct_dominant` says «بیشتر به انسداد … می‌خورد», then «نوارِ ادرار اوروبیلینوژن را هم بالا نشان داده است». A raised urobilinogen argues against complete obstruction, and the sentence leaves the reader to reconcile the two (N21).
2. **Spelling gaps. All of these fall to «تفسیر نشدند», so they are honest, not silent.**
   - `Ca oxalate: +` and `Ca. Oxalate: Few`: `CRYSTAL_KEY_RE` needs `calcium`.
   - `Epi. Cells: Few`: `EPI_KEY_RE` needs `epithel`.
   - Persian-digit SG `وزن مخصوص: ۱.۰۲۵` goes unmapped: `sgValue` uses ASCII `\d`.
   - `Transitional …: Many` is unmapped by design.
   All are common Iranian spellings; worth a follow-up (N2).
3. **OCR-damaged SG is read as dilute.** `Specific Gravity 1/025` and `1.0 25` both produce «ادرارِ شما رقیق است». `sgValue` takes the first number, `1`, as 1.000. An SG of exactly 1.000 is not physiological, so reject values below about 1.001, or require three decimals.
4. **The solute caveat overstates small effects.** On `SG 1.030 + Protein 1+`, the text says «پروتئینِ زیاد در ادرار خودش وزنِ مخصوص را کمی بالا می‌برد». 1+ protein (about 30 mg/dL) moves SG negligibly. Gate the caveat at 3+ or reword «زیاد».
5. **`Bilirubin: Trace` → positive, this_week.** This is defensible, since any urine bilirubin is abnormal per Henry. Record it in P51 as a decision.
6. **Crystal `+/-` → present.** `Calcium oxalate +/-` gives `urine_crystals_stone[routine]`. That is harmless because the finding is routine and says «به‌تنهایی نگرانی ندارند», but it is the same N6 shape as B3.

## Checked and correct

- **Crystal parsing.** `Amorphous`, `Amorphous urates: few`, `Amorphous phosphates` → incidental/routine. `Crystals: Not seen / - / Nil / ندارد`, `Tyrosine crystals: Not seen` → nothing. `Cystine crystals Few` and `Crystals: Cholesterol` → pathologic/this_week. `Hippuric acid` and `Bilirubin` crystals → unmapped, not misread as uric acid. `Crystals: Positive` (no type) → unmapped.
- **SG.** 1.010, 1.020, 1.025 → no finding. 1.030, 1030, `>=1.030` → concentrated/routine. 1.003 and 1.005 → dilute/routine. The dilute text makes no isosthenuria claim (FR-019).
- **Epithelial cells.** Squamous `Moderate`, `متوسط`, `8-10`, `2+`, `+/-` → nothing. `Many`, `زیاد`, `15-20` → contamination/routine. With `bacteriuria_no_inflammation` it hands off correctly to one finding. With `uti_likely` it keeps its own routine finding, which says it does not downgrade others.
- **RTEC.** `3-5` and `Moderate` → this_week. `0-1` and `Few` → nothing. With a tubular cast, it hands off to `urine_cast_tubular`, which absorbs the sentence (single finding, single timeline).
- **Urine bilirubin with a normal serum bilirubin.** The four-branch clause is correct and never quotes a number (N4/N5).
- **Urgencies.** Pathologic crystal this_week, RTEC this_week, SG/squamous/stone/incidental routine, and urine bilirubin positive this_week are all defensible. Urobilinogen raised as routine is defensible.
- `unmatched_abnormal` never appeared on any panel.

## Not done

The gate-run `verdict` command was not filed because no `runs/<id>` was provided for this change. This file is the report the caller asked for.


## Resolution (implementer, 2026-09-22)

Both reviews were reproduced on the live engine before any fix; each blocking item got a guard that was observed red on
the pre-fix Stage B tree. `M176`–`M176l` (12 tests). All 12 red before the fix, all green after.

| Item | Fix | Guard |
|---|---|---|
| **B1 / code #1**: the urine-bilirubin sentence was attached to the Gilbert and muscle-trap branches; this_week was lost | The hand-off now builds the owner and accepts only `bilirubin_direct_dominant`, `bilirubin_indirect_dominant` and `hemolysis_likely` (plus the emergency). The Gilbert wording is not built when the urine bilirubin is positive, because bilirubinuria argues against Gilbert; that branch becomes this_week, with the "not explained by breakdown alone" sentence. The muscle branch no longer carries the sentence, and the urine finding stays standalone. | `M176`, `M176b` (two-page sheets) |
| **B2 / code #3**: the urobilinogen unit was dropped, and «Not increased» / «Abnormal» were misread | The adapter keeps the printed unit next to the value. A closed list is matched against the whole value. A number counts only with its unit (mg/dL or EU > 1, µmol/L > 17), or when it means the same in both units (≤1, >17). Anything else goes to «تفسیر نشدند». | `M176c`, `M176f` |
| **B3 / code #2**: «<0.5», «کمتر از» and «+/-» were read as positive | A closed list for the dipstick bilirubin pad. `<`/`کمتر` mean negative; `+/-`/`±` are equivocal and go to «تفسیر نشدند». The same equivocal guard is now in `castValueState`, so it covers crystals and casts. | `M176d`, `M176l` |
| **B4**: «Bilirubin 0.8 mg/dL» on a mixed page became a positive urine bilirubin | A number on a urine-page «Bilirubin» row is ambiguous and goes to «تفسیر نشدند». Only words or plus-grades are read as the pad. | `M176e` |
| **Code #4**: unreadable bilirubin/urobilinogen values stayed silently in qual | Both are now routed: unknown values go to `unmapped`. | `M176c`, `M176d` |
| **Code #5**: the contamination finding sat beside `uti_likely` (two readings of one WBC) | The squamous sentence is folded into `uti_likely`, `urine_esterase_without_cells` and `bacteriuria_no_inflammation`. The standalone finding fires only when none of them does. `M175c` was changed on purpose to a hematuria panel. | `M176g` |
| **Code #6**: 1.030 and 1.005 are inside the reference range; CRP was read as urine protein | The boundaries are now exclusive (dilute < 1.005, concentrated > 1.030). The solute regex is anchored to the urine protein/glucose rows, and «زیاد» was removed from the sentence. `M173`/`M173d` now use 1.040. `M104d` U4 was re-hashed: all six urine panels have findings identical to `b9068df`. | `M176h` |
| **Code #7**: «Round epithelial» was read as squamous | It is routed out of scope, to «تفسیر نشدند». | `M176i` |
| **Code #8**: CBC was suggested next to a printed CBC | It is suggested only when no haemoglobin is on the sheet. | `M176j` |
| **Code #9 / non-blocking**: specific-gravity spellings, Persian digits, OCR «1/025» | «Sp. Gravity», «Spec. Grav.» and «(SG)» are accepted, and Persian/Arabic digits are normalised. The whole value must be a number, so «1/025» goes to «تفسیر نشدند». «Ca oxalate» and «Epi. Cells» are recognised. | `M176k` |
| Non-blocking: a raised urobilinogen appended to the direct/obstruction finding | The sentence now adds «این با انسدادِ کاملِ مجاری صفرا جور نیست» on the direct branch. | — |
| Non-blocking: bilirubin `Trace` read as positive | Kept on purpose and recorded in P51. | — |

**Final state:** `npm test` 598 · 579 · 0 fail · 19 todo (working tree on `b9068df`).

The isolated proof on `b9068df` (archive + junction) has 33 red:
- the 22 Stage B behavioural guards;
- `M104d`, changed on purpose;
- 10 of the 12 review guards.

`M176e` and `M176l` pass on `b9068df` because it had no reader for those rows; they guard against the Stage B regressions,
and both were red on the pre-fix Stage B tree.
