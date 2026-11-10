# Research: specs/021

Read from the working tree on 2026-11-10. Line numbers drift, so the anchors here are names, not numbers.

## R1 — G1: why ACR 3.0–3.39 mg/mmol reads A1

- **Measured.** `adapter.js` (ACR branch) sets `tests.ACR = v × 8.84` (`BRANCH_FACTORS.ACR_MGMMOL_TO_MGG`) and `continue`s. The generic grading loop then runs `evaluate("ACR", …)`, which classifies on the mg/g bands (`interpret.js` `ACR`: A1 < 30, A2 < 300, A3 otherwise). So 3.0 mg/mmol = 26.5 mg/g → A1, and 33 mg/mmol = 291.7 mg/g → A2. The printed «< 3.0» is never read.
- **Decision.**
  - The adapter also stores the printed value on `tests._acr_mgmmol`. Underscore keys are skipped by the grading loop, by the same convention as `_trop_conv_uln`.
  - After the generic ACR row is pushed, a mg/mmol tag is derived from the printed value with KDIGO's own mg/mmol edges: A1 < 3, A2 3–30, A3 > 30.
  - The mg/mmol tag is used directly. Its edges (3, 30 mg/mmol = 26.5, 265.2 mg/g) sit below the mg/g edges (30, 300), so it is always ≥ the mg/g tag, and FR-001's "never lower" holds by construction. The row's `tag`, `fa`, `patient` and `abnormal` come from that band of `CLASSIFIERS.ACR`.
  - **This is a clinical decision, not mechanical** (advisor). It breaks unit invariance on purpose: 28.3 mg/g → A1 while 3.2 mg/mmol (the same amount) → A2. That is KDIGO's own pragmatic rounding (3 mg/mmol ≈ 30 mg/g), and it settles source ambiguity #2 in KDIGO's favour. Record it in P133 as a decision.
  - Sex-specific printed limits («M < 2.5, F < 3.5», panel AB4) are ignored today and stay ignored. A woman at 3.2 mg/mmol becomes A2 against her lab's 3.5. KDIGO's categories are sex-independent, and Principle II prefers the over-read. Record this in P133.
  - Known display edge: exactly 3.0 mg/mmol shows as «26.5 (0–26.5)», flagged. `score.js` `parseRange` needs `lo–hi`, so `< 26.5` is not used. The `unitConversions` row explains the mg/mmol origin.
  - The row gets `range: "0–26.5"` (3 × 8.84), so the displayed value and range agree with the verdict (N12: a sentence that quotes an index must agree with it). It also gets `printed: { value, unit: "mg/mmol" }`.
  - A `unitConversions` entry `{test:"ACR", raw, from:"mg/mmol", value, to:"mg/g", basis:"printed"}` is pushed. Today none is, so the patient sees 30.9 mg/g next to a sheet that says 3.5 mg/mmol with nothing explaining it (N5).
- **Why not change the factor to 10** (the pragmatic 3 mg/mmol ≈ 30 mg/g): it would print a number that is neither on the sheet nor the true conversion, which is N5. It would also break M17, which locks 8 mg/mmol ≈ 70.7 mg/g.
- **Why not grade natively in mg/mmol**: that needs a second unit for one key across refs, the classifier, score and expert, which is a larger surface for the same outcome.
- **Text.** `albuminuria_pattern` quotes «${v} میلی‌گرم بر گرم» and «بین ۳۰ تا ۳۰۰». For a mg/mmol row it must quote the printed value and unit and the band in mg/mmol («بین ۳ تا ۳۰ میلی‌گرم بر میلی‌مول»). `key_number` becomes the printed value; today it is 30.9, a number that is not on the sheet. The mg/g text is byte-identical.
- **Untouched.** Unitless ACR stays mg/g, as today; it is recorded in the probe. `minor.js` `ACR: both(T1)` reads the tag set and is unaffected.

## R2 — G2: why urea is «unexplained» under `kidney`

- **Measured.** Coverage (`patterns.js`, `unexplained_abnormal` net) marks a key covered if a shown finding's *source* contains the token (`RULE_READS`) **or** its text names the test. The `kidney` source never contains `UREA` (it reads `e.indices.bun_cr`), and its text never names urea, so urea 80 is orphaned.
- **Decision.**
  - The non-dialysis `kidney` text appends one sentence per high `UREA`/`UREA_N` row: «اوره ${v} (حد طبیعی ${range}) هم بالاتر از حد طبیعی است و کنارِ کراتینین تفسیر می‌شود.» (BUN uses the name «BUN»).
  - The dialysis branch already says «بالا بودنِ کراتینین و اوره … انتظار می‌رود». The `UREA` token now in the rule source covers it there, so the dialysis wording is not changed.
  - The sentence is skipped when `urea_bun_emergency` matches, because that rule owns the number and quotes it.
  - No threshold change and no urgency change.
- **Alternative rejected.** Adding `UREA` to `RULE_READS` artificially. N18 says coverage is a property of the text the patient sees.
- **Widened after the advisor's probe** (`before.txt`, G2a–G2h). The orphan urea line also appears under:
  - `glomerulonephritis_pattern` (G2c);
  - `rhabdomyolysis_pattern` (G2d);
  - the `kidney` emergency (G2e);
  - `kidney` under `potassium_critical` (G2f), where `kidney` is briefed or hidden.

  The dialysis case (G2g) and `urea_bun_emergency` (G2h) are already clean.
- **Revised decision.**
  - A single helper in `patterns_nephrology.js`, `ureaAlongside(e)`, returns the sentence for the high `UREA`/`UREA_N` rows, or "" when `urea_bun_emergency` matches.
  - It is appended to `must_say` of `kidney` (non-dialysis), `glomerulonephritis_pattern` and `rhabdomyolysis_pattern`, and to the `brief` of each one that has a brief.
  - For a hidden finding, the rescue path counts `RULE_READS`, which now contains `UREA`, and the compact text quotes the number.
  - Acceptance is the probe, not the code reading: no G2 panel may keep an "unexplained" line that names urea.

## R3 — G3: low uric acid owner

- **Measured.** No rule reads `URIC` with `dir === "low"`. The grade is binary against `refs.js` (M 3.5–7.2, F 2.5–6.2), and sex-unknown already goes to `sex_unknown_value`.
- **Decision.**
  - New rule `uric_acid_low` in `patterns_biochem.js`, next to `hyperuricemia`, with the same age gate (age ≥ 16 or unknown).
  - Urgency is `routine`. No new threshold: «low» is the `refs.js` verdict.
  - The text states the value and range. It gives the source's definition of hypouricaemia (< 2.0 mg/dL, Tietz, unverified) only as the framing for a value below 2.0.
  - It uses no cause list beyond what the source supplies. The source supplies none for low urate, so the text says the value is usually harmless and the doctor reads it with the medicines being taken.
  - No `sources:`, because Tietz was not opened.
- Add `uric_acid_low` to `RULE_GROUP.kidney` (`groups.js`, guard GR1). `hyperuricemia` lives there too.
- **Registration tables** (repo-wide grep for `hyperuricemia`): `groups.js` (required, GR1) and `pro_text.js` (optional; X20 only forbids orphans). Tests reference it by id. Nothing in `khanesh/src` or `.claude/eval-gate` lists it. So `uric_acid_low` needs only `groups.js`.
- **Sexless low side** (panel U6): uric 3.0 with no sex already goes to `sex_unknown_value` (side: low) and is never graded. The new rule reads `graded` only, so it cannot fire (N50).
- **Child** (panel U7): age 10 with uric 1.8 is graded against the *adult* range and lands in `unmatched_abnormal`. The new rule keeps `hyperuricemia`'s age gate, so this stays as today. Paediatric urate ranges are a separate gap, recorded in P133 and not fixed here.

## R4 — G4: PCR recognition only

- **Measured.** All three spellings land in `unmapped`. A key with no `getRef` and not in `PRINTED_REF_ONLY_KEYS` goes to `noRef` ("recognised, no reference") and is never graded.
- **Decision.**
  - `NAME_MAP` gets `upcr`, `proteincreatinineratio`, `proteintocreatinineratio`, `urineproteincreatinineratio`, `urineproteintocreatinineratio`, `نسبتپروتئینبهکراتینین` and `پروتئینبهکراتینین`, all mapping to `UPCR`.
  - No `refs.js` entry. `FA_NAMES.UPCR = "نسبت پروتئین به کراتینین ادرار (PCR)"`.
  - `SUGGEST_TESTS["نسبت پروتئین به کراتینین ادرار"] = ["UPCR"]`, so `nephrotic_pattern` stops re-requesting a test that is already on the sheet (N8). Verify the exact suggest string at implement.
- **Bare «pcr» is deliberately not mapped.** «HCV PCR», «COVID PCR» and «PCR: Detected» are molecular tests (N25). The norm form of «Urine Protein/Creatinine Ratio» is verified at implement.
- **Risk check.** The `a+b` alias split only fires when both halves map to one key. «protein» and «creatinine» map to different keys, so there is no collision.
- **What the patient sees** (advisor's check, from reading `buildNormalResultAdult` in `prompt.js`).
  - On a PCR-only sheet, `noRef` keeps the engine path. The result is «مقادیرِ این برگه خوانده شدند، ولی موتور هیچ‌کدام را تفسیر نکرد … برای این مقادیر محدودهٔ مرجعِ تأییدشده نداریم: … درباره‌شان «بالا» یا «پایین» نمی‌گوییم». It is not «طبیعی».
  - «تأییدشده» keeps the sentence true next to a printed «< 15». No such range has been approved.
  - This is verified end-to-end through `/api/analyze` at implement. If the route somehow returns the normal canned result, switch to the printed-position reader (`printedVerdict`).

## R5 — G5: pregnancy sentence in `urea_low`

- **Measured.** `engineOut.pregnant === true` is set from the profile. `urea_low` text is fixed.
- **Decision.** When `e.pregnant === true`, append: «در بارداری جریانِ خون و صافیِ کلیه بیشتر می‌شود و اوره به‌طورِ طبیعی پایین‌تر از بازهٔ غیرِبارداری است؛ این شایع‌ترین توضیحِ اورهٔ پایین در بارداری است.» (Source: Tietz, physiological hyperfiltration, unverified.) Not-pregnant or unknown stays byte-identical.

## R6 — Verification method

- **Probe.** `snapshots/probe.mjs` gets the ACR boundary panels, G2 panels, dialysis, emergency, pregnancy and the three PCR spellings, plus a bare «PCR: Positive» negative control. Before and after are diffed. Any change outside G1–G5 is a defect.
- **Rule-id diff.** Exactly `+uric_acid_low`.
- **Clean-copy suite.** `git archive` the index into a temp dir, junction `node_modules`, then `node --test`.
- **Local end-to-end.** One panel per gap through `/api/analyze` on the running local server, using the model.
