# Research: specs/010 — Hemostasis & Coagulation Decision Rules

All measurements: working tree on branch `recovery` at `e285030`, `khanesh-server/` clean (only untracked
`labmate-bot/`, `specs/010-…`), `node_modules` present, 2026-09-29.
Probe: `node specs/010-hemostasis-coagulation-rules/probe.mjs` → full output in `probe-before.txt`.
Rule-id snapshot: `ids-before.txt` (157 ids).

## Baseline (constitution III)

`cd khanesh-server && npm test` on that working tree: **`tests 764 · pass 745 · fail 0 · todo 19`**.
The working tree equals `HEAD` for `khanesh-server/`, so this is also `e285030`'s number, but only because the tree is clean.
Re-measure before `/speckit-implement`.

## R1 — What a factor-only sheet gets today (the N2 hazard is real, measured)

`Factor VIII Activity 0.5 %` alone → `graded: WBC, HGB`, `unmapped: ["Factor VIII Activity"]`, **zero findings,
urgency `none`**. In `server.js` (`findings.length === 0 && abnormal.length === 0`) that goes to
`buildNormalResult()`. The patient reads «نتایج آزمایش شما در محدوده طبیعی است» with only the generic unmapped line
beside it. That is a severe-hemophilia-range value answered with "normal". The same happens for FIX, both vWF values,
an inhibitor titre, TT and ADAMTS13 (all `unmapped`, all zero findings).

- **Decision**: Stories 1–2 are P1/P2 as written. A finding must fire for every factor/vWF/inhibitor value, whatever
  band it is in, so `findings.length > 0` and the normal result is never reached.
- **Rationale**: this is N2, the worst failure mode in this app. It exists today and is measured, not hypothetical.
- **Alternatives**: rejected: only adding `NAME_MAP` entries without a reader. That is N1. The value would be
  "extracted" and still produce no interpretation.

## R2 — Grading path for factor/vWF/inhibitor: side channel, not `refs.js`

- **Decision**: No `ADULT_REFS` row. The values go into a new side channel `hemostasis` (the `smear` channel of
  specs/009 is the model). Each item is `{ key, value, unitState, printedRef }` and is read by exactly one reader in the
  new `patterns_hemostasis.js`. Each item is listed in the reader's `explains`, so it leaves «تفسیر نشدند». `refs.js`,
  `grade.js`, `ctcae.js` and `interpret.js` are untouched.
- **Rationale**:
  - A reference range for factor activity (commonly 50–150 %) would be a **new number** that the user never approved.
  - The bands the user did approve (D10) are severity bands, not a reference range.
  - The spec's "above 30 % and below the sheet's own reference" needs the *printed* range, which is per-row anyway.
  - Putting the keys in `refs.js` would also put them in `abnormal`, `uncovered` and `M32`'s `FA_NAMES` sweep. That is
    fine, but it pulls in a range nobody sourced.
- **Alternatives**:
  - `refs.js` with a range: rejected, it needs an unapproved number.
  - `QUAL_NO_READER` → `noRef`: rejected. `noRef` alone does not stop the normal-result response on a sheet with
    nothing else abnormal; `noRef` handling in `buildNormalResult` (M146b) only adds a line.

## R3 — Units (FR-006, N3)

| printed | → % | rule |
|---|---|---|
| `%`, `IU/dL`, `U/dL` | ×1 | 1 IU/dL ≡ 1 % of normal pooled plasma |
| `IU/mL`, `U/mL` | ×100 | `0.01 IU/mL` = 1 % (FR-002 requires identical banding) |
| none | — | `unitState: "unknown"`. The value is quoted, **no band**, «واحد روی برگه چاپ نشده». Never guessed by magnitude (P48). |
| anything else | — | `unitState: "unrecognised"`, same as none |

Inhibitor: `BU`, `BU/mL`, `Bethesda` → titre. A number with no unit → `unknown`. A text value → the closed list (R6).

- **Decision**: the conversion lives in `units.js` `PRINTED_ONLY_CONVERSIONS` style, with the printed unit only. A
  unitless value never enters `UNIT_PROFILE`/`decideUnit`, because that path is for graded keys (the M177 lesson).

## R4 — Name collisions (N2, N25): the factor family is one character apart

`norm()` strips spaces, `.`, `_`, `-`, `/`, `()`, `%`, `#`. It keeps `:` and does **not** fold Persian digits.
`resolveAlias` adds prefix, plural and trailing-e aliases. The dangerous neighbours:

| printed | norm | must map to |
|---|---|---|
| Factor VIII, FVIII, F8, F VIII:C, FVIII:C, Factor 8, فاکتور ۸ / 8 / هشت | `factorviii`, `fviii`, `f8`, `fviiic`/`fviii:c`, `factor8`, `فاکتور۸` | `FVIII` |
| Factor IX, FIX, F9, Factor 9, فاکتور ۹ | `factorix`, `fix`, `f9`, `factor9` | `FIX` |
| **Factor VII**, FVII, **Factor V**, Factor V Leiden, **Factor X**, **Factor XI/XII/XIII**, Factor II | `factorvii`, `factorv`, `factorx`, … | **not** FVIII/FIX. They stay `unmapped` (out of scope; they still show in «تفسیر نشدند»). |
| vWF:Ag, vWF Antigen, VWF Ag, فون ویلبراند آنتی‌ژن | `vwf:ag`, `vwfantigen`, `vwfag` | `VWF_AG` |
| vWF:RCo, vWF Activity, Ristocetin cofactor, vWF:GPIbM | `vwf:rco`, `vwfactivity`, `ristocetincofactor` | `VWF_ACT` |
| FVIII Inhibitor, Bethesda, Inhibitor (Bethesda) | `fviiiinhibitor`, `bethesda`, `inhibitorbethesda` | `FVIII_INHIB` |
| bare «Inhibitor» | `inhibitor` | **unmapped**. It is ambiguous: FIX, lupus anticoagulant and others use the same word. |
| PT Control, Control (PT), Control time | `ptcontrol`, `controlpt` | `PT_CONTROL` (context only, never graded) |

- **Decision**: exact `NAME_MAP` keys only, no widening of `resolveAlias`. A test sweeps every row in the table above
  plus `factorv/vii/x/xi/xii/xiii/ii` and asserts each lands where the table says. In particular `factorvii` must not
  prefix-match `factorviii`, and `factorx` must not be taken as `factorix`. `resolveAlias`'s prefix rule is checked
  against each neighbour *before* the entries are added, by running it.
- **Persian digits**: the table maps `فاکتور۸`/`فاکتور8`/`فاکتورهشت` explicitly, because `norm()` doesn't fold digits.

## R5 — ISTH lower tier (FR-015, Q1 = C): trigger, score, hand-offs

Measured:

- `PLT 80 · D-dimer 2.0 µg/mL · PT 14 · FIB 250` (no DIC by `isDIC`) → `d_dimer_elevated`, `thrombocytopenia`,
  `coagulation_abnormal` (all `this_week`) plus `unexplained_abnormal`. No finding connects the three.
- `PLT 40 · D-dimer 6.0 µg/mL · PT 12 · FIB 300` (ISTH 2+3+0+0 = 5, "overt") → `severe_thrombocytopenia` is already
  `emergency`. So ISTH ≥ 5 with PLT < 50 is covered today.
- `PLT 60 · PT 18 · FIB 120` → `possible_DIC` emergency, unchanged.

Decisions:

- **Score** (`isthScore(e)` in `patterns_utils.js`, one function):
  - **PLT**: ≥ 100 → 0; 50–99 → 1; < 50 → 2.
  - **D-dimer** (engine unit ng/mL): ≤ 400 → 0; 400–4000 → 2; > 4000 → 3. These are the input's numbers, used only
    inside the score (Q1 note). `ADULT_REFS.DDIMER` stays at 500 (Q2 = A).
  - **PT**: needs `PT_CONTROL`. PT − control < 3 → 0; 3 to < 6 → 1; ≥ 6 → 2. With no control the component is
    `null`, and the text says it could not be scored. It is **not** 0, and it is not replaced by INR (FR-015, N4).
  - **FIB**: ≥ 100 → 0; < 100 → 1.
  - A component whose analyte is absent is `null`. The total is the sum of the non-null components, and the text names
    the missing ones.
- **Trigger** (`dic_isth_score`): `!isDIC(e)` **and** 50 ≤ PLT graded < 100 **and** D-dimer > 400 ng/mL. PLT < 50 is excluded on purpose (analyze H2): on `isth5_no_dic` (PLT 40, D-dimer 6 µg/mL) `severe_thrombocytopenia` is already `emergency`, and a `soon` tier beside it would be a second timeline for the same platelets (N20). `isthScore` still scores PLT < 50 as 2, so the function stays faithful to the score; the trigger just never reaches that arm.
  - Platelets and fibrin-degradation evidence together are what make DIC a question at all.
  - Without both, the existing single-analyte findings are the right owners, and a score built from one analyte would
    be noise.
  - This means the tier never fires on a sheet that doesn't fire `thrombocytopenia`/`severe_thrombocytopenia` today.
- **Urgency**: `soon` (24–48 h). This is the "repeat in 24–48 h" of the input's non-overt branch, and `soon` already
  exists in every rank table (P56). It is below `emergency` (FR-015) and above the co-firing `this_week` findings, so
  `pickFinalAction()` picks its single final action (M188 mechanism). No rival timeline reaches the recommendations list.
- **Score ≥ 5 without `isDIC`**: possible only as PLT 50–99 (1) + D-dimer > 4000 (3) + PT +3–6 s over a printed
  control (1). With PLT < 50, `severe_thrombocytopenia` is already an emergency.
  - The text states "meets the ISTH overt threshold", with urgency still `soon`.
  - **Recorded as open P61 question 61-b**: should this be `emergency`? It stays `soon` until answered, because the
    user's instruction is "ask, don't decide" and Q1 said the emergency trigger is `isDIC` alone.
- **Co-firing findings keep their content** (warnings: no aspirin/NSAID; bleeding signs). The tier does not suppress
  them; it names their numbers.
  - A test asserts that no co-firing `must_say` carries a timeline.
  - A test asserts the single final action is the tier's.
- **Entry requirement text**: «این امتیاز فقط وقتی معنا دارد که بیماریِ زمینه‌ایِ مرتبط (مثل عفونتِ شدید، ضربهٔ شدید،
  سرطان یا عارضهٔ بارداری) وجود داشته باشد — تشخیصش با پزشک است.» No disease is named as the patient's.

Pre-existing, observed, **not touched** (bucket B, outside the user's instruction):

- `isolated_thrombocytopenia` (`patterns_malignancy.js:316`) emits `urgency: "today"`, which is not in any rank table.
- It also says «سایر رده‌ها طبیعی» by checking only Hb/WBC, so it co-fires beside raised D-dimer/PT.
- Both go into `P61` as observations for the reviewer, with no code change in this feature.

## R6 — Inhibitor reading (FR-005, N6)

- **Decision (analyze C1: quote-only, no unapproved number)**: a numeric titre with a printed BU unit is **quoted** and is called negative or positive only if the row prints its own reference (the lab's number, not ours). Without a printed reference there is no verdict: the text says so and a hematologist must read it, at `this_week`, a floor and not a ceiling (N3). The input's 0.5 BU assay-sensitivity floor is **not applied** and stays in `P61` 61-d.
- Text values match a closed whole-value list:
  - positive: `positive|detected|present|مثبت`
  - negative: `negative|not detected|undetected|non-detected|nondetected|absent|nil|منفی|یافت نشد`
- Anything else is `unknown` → quoted as printed, with no verdict.
- `+/-`, «weak», «borderline», «equivocal» → `unknown`.

## R7 — vWF (Story 2)

- **Decision**:
  - `VWF_AG` and `VWF_ACT` are each compared with the sheet's printed reference: below / inside / not printed.
  - The ratio ACT/AG is computed only when both are printed with the same unit family.
  - The ratio is **quoted only** (analyze C1). The input's 0.6 cut-off is not applied and stays in `P61` 61-d. The text says a hematologist must interpret the pair, with **no subtype name** (D12 deferred).
  - A missing partner → «… روی برگهٔ شما نیست» plus a suggestion for the missing test (N4).
  - The 30–50 IU/dL "low vWF" band is **not** used: it names a category, which is the D12 territory.
- **Urgency**: `this_week` when either value is below its printed range, **or** when a vWF value is printed with no range at all and so cannot be judged (a floor, N3); `routine` only when every printed value is inside its own printed range.

## R8 — Factor finding ↔ `coagulation_abnormal` hand-off (FR-003, N20, M155)

Measured: `FVIII 3 % · APTT 68 · PT 12` → `coagulation_abnormal` (`this_week`) plus `FVIII` unmapped. After the
feature, both the factor finding and `coagulation_abnormal` would read APTT.

- **Decision**: `factorOwnsAptt(e)` in `patterns_utils.js`. It is true when `factor_activity` actually **fires** (the
  function calls the live rule, like `thalOwnerFires`) **and** the only abnormal coagulation value is APTT (PT, INR and
  FIB not abnormal). `coagulation_abnormal.match` then returns false.
- The factor finding then carries, in the same change:
  - the APTT number, three-way;
  - both of `coagulation_abnormal`'s warnings (no aspirin/NSAID; unusual bleeding → same day);
  - its "tell the doctor your medicines" sentence.

  This is the M155 inventory.
- Two-sided assertion (M91e style): on each boundary panel exactly one of the two fires.
- Panels without a factor value: `coagulation_abnormal` is byte-for-byte unchanged (SC-002).
- **N21**: APTT raised with a *normal* FVIII **and** FIX printed → the factor finding says both were measured and are
  not low, so APTT has another explanation. It does not own the APTT, and `coagulation_abnormal` keeps it.
- **Urgency of `factor_activity`**, from one computed band (N20):
  - severe → `this_week`;
  - moderate → `this_week`;
  - mild → `routine`;
  - reduced-outside-bands → `routine`;
  - inside the printed range → `routine`, but only when no inhibitor is positive.
  - A positive inhibitor, or one with no possible verdict (FR-021), → `this_week`, whatever the band.

  No factor band is `emergency`: the value says how severe a disorder is, not that bleeding is happening, and symptoms
  are not an engine input. This is written into P61 as question 61-c for the reviewer.

## R9 — PLT ≥ 1000 branch (FR-017)

- **Decision**: in `thrombocytosis.build`, `const extreme = p.value >= 1000`, with one urgency and the action from
  `actionFor(urgency, …)`:
  - `extreme` → `this_week`, a new `must_say` and a new warning (bleeding or clot symptoms → same day);
  - otherwise → the current object, byte-for-byte.
- The unit is K/µL (engine), so 1000 means 1,000,000 /µL. The adapter's WBC/PLT raw-count normalisation (threshold
  3000) happens first, so `1,200,000` printed raw → 1200 → extreme.
- **Freeze**: `PLT 500` and `PLT 999` outputs are hashed before and after.

## R10 — Existing tests that must not change

`M86d` (one D-dimer finding), the DIC tests, `M162` (anemia-crisis owners), `M187`/`M191` (pancytopenia) and `M240`
(coagulation `always_show`) all run unmodified. A new freeze test hashes the full `runPatterns` output of every
coagulation/platelet panel in `probe-before.txt` that has no new analyte. SC-002 is the proof.

## R11 — Decisions from /speckit-analyze (2026-09-29)

- **Legacy-path gate (H1).** `server.js:991` sends a sheet with nothing graded, no owned-ungraded value and no `noRef` to the legacy model-judged path. A sheet whose only rows are FVIII/FIX/vWF/inhibitor has none of those. **Decision**: the condition also requires `hemostasis` to be empty (FR-019). All earlier probes and T018 carried `Hb 14`, which hid this; the probe gets a factor-only panel.
- **Age gate (H3).** Factor IX is physiologically low in a healthy newborn, so the adult bands would put it in "moderate/mild" at `this_week`. **Decision**: under 16 (and on any neonatal age), no band; the value is quoted, urgency `routine`, text asks for a paediatric source (FR-020). Age arrives through `patient.age`; the M139/M140 tests show how real sheets write a neonatal age (hours, days, weeks).
- **OCR prompt (M7).** `OCR_PROMPT` has an explicit smear-row instruction (specs/009) and none for factor rows, so the vision model may not extract them at all. **Decision**: add one extraction-only sentence (FR-022); the sentence is shown verbatim for review.
- **Scan test (M3).** A test walks every string the new rules can produce and fails on a disease name used as the patient's diagnosis or on a raw engine key (FR-010, SC-005).

## R12 — Implementation notes (2026-09-29)

- **R4 neighbour check, measured before and after the `NAME_MAP` entries** (`M247`): «Factor V», «Factor V Leiden», «Factor VII»,
  «FVII», «Factor X/XI/XII/XIII», «Factor II» and bare «Inhibitor» are `unmapped` on `e285030` and stay `unmapped` after the change,
  with no graded key. `resolveAlias`'s plural, trailing-e and same-key split rules produce no hit for any of them.
- **Neonatal floor (FR-020).** `applyNeonatalFloor` lifts every finding that has an `action` to `emergency` under 28 days. So the
  paediatric branch of `factor_activity` carries **no `action`** (its text explains, it does not instruct), and the floor leaves it at
  `routine`. The reviewer's floor policy (P57) is untouched.
- **`factorOwnsAptt` lives in `patterns_hemostasis.js`, not `patterns_utils.js`** (plan/tasks said utils): it calls the live
  `factor_activity` rule, and `patterns_utils.js` importing the rule file would be an import cycle.
