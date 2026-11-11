# Research and Decisions: specs/023

Every decision was read against the code on b7eb497. The guide was not checked against primary sources, so every number below is P136 reviewer material.

## D1: New keys go through the serology assay path, not `refs.js`

- **Decision.** Add the new keys to `AI_RE` in `serology.js`. They are graded only against the printed range. A row with no printed range gets `noref`. A censored or equivocal row gets `noref`/`equiv`.
- **Rationale.**
  - Antibody cut-offs depend on the kit. The guide itself gives tTG < 4 (Mayo 0–3), and for liver antibodies Euroimmun 20 RU/mL against Inova 25 U.
  - P77 decided «C1: مرز از ردیفِ همان برگه», and the path already implements states, titres and unit quoting.
- **Rejected.** `refs.js` rows for tTG and other antibodies would grade a kit with a different range wrongly. That is N3, and the G1 bug itself.

## D2: G1 uses the printed range first for ANTI_TPO and RF

- **Decision.** If the row prints a parseable upper limit, grade against it. Otherwise keep `refs.js`.
  - This is implemented by generalising the P114 `printedOwn` branch, which is adult LDH only, to a set `PRINTED_FIRST_KEYS`.
  - Children are included. Unlike LDH under P96, there is no child-specific engine range for these keys.
- **Rationale.** The probe shows both directions wrong: TPO 20 «<30» is called high, and RF 18 «<15» is called normal. The engine range (0–9, 0–20) is one kit's.
- **Rejected.**
  - Changing `refs.js` numbers only moves the wrong kit.
  - Moving the keys to the assay path would break `thyroid`, `rf_positive`, `score.js` and `minor.js`, which read `graded`.

## D3: One finding per family (N20)

- **Decision.** The new families are celiac, autoimmune liver, MG, immunoglobulins and Anti-DNase B. Secondary antibodies join the owner of their existing family: histone joins ANA, aCL-IgA joins aPL, CH50 joins complement.
- **Rationale.** This matches the existing `RULES_AUTOIMMUNE` structure, so two rules cannot contradict each other about one analyte.

## D4: Celiac logic

- **Decision.**
  - A positive tTG-IgA gives `this_week`. The text states the multiple of the printed ULN (one decimal place). At ≥ 10× ULN it adds the no-biopsy sentence (EMA in a second sample, children, specialist decision).
  - A negative tTG-IgA is read against Total IgA, three ways:
    - IgA below its printed range: "unreliable", with DGP-IgG or tTG-IgG suggested;
    - IgA normal: negative;
    - IgA absent: "Total IgA not measured", with it suggested.
  - tTG-IgG positive with a normal IgA adds «ارزش تشخیصیِ کمی دارد».
  - Every celiac finding carries the gluten caveat.
- **Rationale.** These are the guide's celiac paragraphs (lines 128–130).
- **Rejected.** Declaring celiac at ≥ 10× ULN: the guide makes it conditional on EMA and on the child, and the engine never diagnoses.
- **Constant.** `TTG_NO_BIOPSY_ULN_MULTIPLE = 10`.

## D5: Liver-antibody titres use 1:40

- **Decision.**
  - A bare titre for ASMA, ANTI_LKM1 or AMA is positive at ≥ 1:40 and negative below.
  - ANTI_SLA and AMA_M2 are numeric or word only.
- **Rationale.** The guide's IAIHG table (≥ 1:40 is +1, LKM1 ≥ 1:40 is +2) and its PBC line (AMA < 1:40 is negative). This is the same shape as the ANA 1:80 decision in P77.
- **Constant.** `LIVER_AB_TITRE_CUT = 40`.
- **Urgency.**
  - A positive result gives `this_week`.
  - If ALT or AST is graded high on the same sheet, the text says so. Urgency stays `this_week`, because the liver-enzyme owner keeps its own urgency (`liver_pattern`).

## D6: Myasthenia

- **Decision.**
  - AChR binding is positive when above the printed limit. With no printed range, positive is > 0.02 nmol/L, used only when the unit is nmol/L. Constant `ACHR_BINDING_POS_NMOL = 0.02`.
  - A positive result gives `this_week`, with the warning «اگر تنگیِ نفس یا اختلالِ بلع دارید فوراً به اورژانس بروید». This is a conditional sentence in `warnings`, so N20 holds.
  - A negative result gives `routine`, with the text «رد نمی‌کند (فرمِ چشمی، MuSK)».
- **Rejected.** An emergency on AChR value alone: the number does not measure crisis.

## D7: Immunoglobulins

- **Decision.**
  - They are `AI_RANGE_ONLY`. A qualitative word for them goes to unmapped.
  - Low IgG, IgA or IgM gives `routine` with an immunologist suggestion. The text gives no IGRT threshold and names no diagnosis.
  - Under 16, a "below" result says the child's levels change with age and the lab's range must be for that age. That is the N53 lesson, because we can't tell whether the printed range is adult.
  - High IgE gives `routine` («آلرژی، انگل، ...»).
- **IGA_TOTAL ownership.** When any celiac key is present, `celiac_serology_result` owns IGA_TOTAL and `immunoglobulin_result` skips it. A two-sided test checks this.
- **Names (N2/N25).**
  - `IGG` matches only `igg|totaligg|serumigg|immunoglobuling|...`.
  - `IgG index`, `IgG4`, `IgG1–3`, `tTG IgG` and `DGP IgG` must not match.
  - The CSF IgG index stays unmapped.

## D8: Anti-DNase B

- **Decision.**
  - With a printed range, grade against it.
  - With none, use the age bands: < 5 y ≤ 250, 5–17 y ≤ 375, ≥ 18 y ≤ 300 U/mL, only for a U/mL unit. Constant `DNASEB_ULN_BY_AGE`.
  - With age unknown and no range: `noref`.
  - Urgency is `routine`, the same as `aso_result`. The text mentions ASO three ways (from `qualRows`, the same as `asoBuild`).

## D9: APS bands

- **Decision.** One sentence is added per numeric criteria isotype (aCL IgG/IgM, β2GPI IgG/IgM):
  - < 40: «زیرِ سطحی که معیارِ ۲۰۲۳ می‌شمارد»;
  - 40–79: moderate;
  - ≥ 80: high.

  The band is used only when the printed unit matches `/gpl|mpl|^u|u\/ml/i`. Urgency is unchanged, so the existing `this_week` stays.
- **Isolated aCL-IgA.** When it is the only positive, the urgency is `routine`. If it sits next to another positive, the urgency is that positive's `this_week`.
- **Metamorphic check.** Adding IgA to a sheet never lowers urgency, because a stronger result still wins.

## D10: Out of scope (from the spec)

PID quantitation, CSF markers, clinical scoring, ARF Jones, the "CRP in known SLE" sentence, and TSH targets. Nothing is mapped for them, so their rows stay `unmapped` exactly as in `before.txt`.

## Open questions for the P136 reviewer

1. The 1:40 titre cut for ASMA, LKM1 and AMA.
2. AChR > 0.02 nmol/L when no range is printed.
3. The Anti-DNase B age bands.
4. The tTG 10×ULN no-biopsy sentence for adults (the guide restricts it to children).
5. The Ro/La pregnancy percentages. The guide says 1–2 % (5 % with La). The engine says ~2 % (~3 %). The engine is unchanged.
6. Isolated aCL-IgA set to `routine`.
