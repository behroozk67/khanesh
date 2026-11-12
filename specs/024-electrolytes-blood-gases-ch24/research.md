# Research: Tietz chapter 24 — gaps only (specs/024)

## تصمیمِ کاربر (T001, 2026-11-12)

The user ran `/speckit-implement` without answering D1/D3 explicitly, after both were asked twice. The **recommended** options are therefore applied as assumed defaults and flagged in P141 for the reviewer. Neither is a physician decision.

- **D1 = A:** TG ≥ 1000 mg/dL or TP ≥ 10 g/dL (graded unit; TG in mmol/L converted only with a printed unit).
- **D2 = default:** no caveat when Na ≤ 120 (`sodium_critical` emergency edge).
- **D3 = recommended table:** < 30 `routine`; 30 to < 60 `this_week`; 60–160 `this_week`; > 160 `routine`; < 14 days or unreadable unit `routine` with no verdict.

All measurements are on the working tree = `HEAD` `c4d3622`. The probe is [snapshots/probe_ch24.mjs](snapshots/probe_ch24.mjs) and its output is [snapshots/before.txt](snapshots/before.txt). The source is a secondary extraction, and no number from it is cited as read (N39/N46).

## R0 — Which extraction items are duplicates?

**Decision:** six of the eight rules are already owned. They get a «موجود» line and no code.

| Item | Owner found | Evidence |
|---|---|---|
| R2 haemolysis, delay | `hemolysis_potassium`, `delayed_separation` (`preanalytical.js`) | G3a warnings in `before.txt` |
| R2 WBC > 300 | `pseudohyperkalemia_cell_count` (WBC ≥ 50) | `preanalytical.js:68` |
| R3 platelets in a serum tube | `pseudohyperkalemia_cell_count` (PLT ≥ 500, K < 6.5) | G3a: the platelet sentence is already attached; G3d (PLT 520, K 5.3) too |
| R4 osmolal gap | `osmolal_gap_high`, `serum_osmolality_abnormal` | `patterns_biochem.js:364` |
| R7, R8 blood gas | no `pCO2`/`pO2` key; not executable | `adapter.js` has no such key; `blood_ph_abnormal` owns pH |

**Rationale:** the user's condition («قواعد تکراری اجرا نشود»). The spec first listed R3 as a gap; the probe showed the caveat is already on the potassium card, so the spec was corrected.

**Alternatives considered:** lowering the existing PLT ≥ 500 gate to "PLT above range" to match the extraction's wording. Rejected: it changes an existing number with no source that was read, and the extraction gives no number.

## R1 — Pseudohyponatraemia: where it attaches and when

**Decision:** one new entry in `PREANALYTICAL_RULES`, `pseudohyponatremia_lipid_protein`, `attachTo: ['sodium_critical']`.

- `match`: sodium graded `low`, **not** in `sodium_critical`'s emergency band (it calls the owner's predicate `v <= 120`; it never restates it, N20), the glucose correction not applied (`na_correction_applied` is a different, real cause), and TG or TP at or above a cut-off (D1).
- The text is a caveat. Urgency, `blocks_others` and `key_number` never change; that is the file's own contract.

**Rationale:** `preanalytical.js` already does exactly this for potassium (K < 6.5 gate) and has the right non-negotiable rule: "maybe the sample" never lowers urgency. A rule in `patterns_*.js` would compete with `sodium_critical` for the same analyte (constitution: one owner per analyte).

**Measured today (G1a–G1f):** `sodium_critical` says nothing about lipids or protein. At Na 118 + TG 2000 (G1e) the sodium emergency blocks the lipid card, and TG lands in `unexplained_abnormal`. That is pre-existing and correct behaviour for a blocker, and this feature must not change it (the emergency gate).

**Alternatives considered:** attaching at every low sodium. Rejected: a dangerous sodium would be diluted with "maybe the method", which is the exact failure the K < 6.5 gate exists for.

### D1 — the cut-offs (USER DECISION before implementation)

The extraction says "severe lipaemia" and "high protein (e.g. myeloma)" and gives **no number**. Constitution: a threshold needs a recorded source and a reviewer, not executable code first. Options:

| Option | TG | TP | Source state |
|---|---|---|---|
| A (recommended) | ≥ 1000 mg/dL (≥ 11.3 mmol/L, printed unit only) | ≥ 10 g/dL | Common clinical teaching; **not opened this session** ⇒ recorded as unsourced proposal in P141 |
| B | engine «high» (`dir === "high"`) | engine «high» | No new number, but TG 160 would trigger a caveat on half of all hyponatraemia sheets (noise, N35) |
| C | do not implement R1 | — | Leave as «نامزد» in P141 |

### D2 — the emergency gate

**Decision (recommended):** no caveat when `sodium_critical` is an emergency (`v <= 120`). Same reasoning as `hemolysis_potassium`. Reviewer may widen it.

## R2 — Sweat chloride: key, path and bands

**Decision:**
- New key `SWEAT_CL`. Spellings (normalised as `adapter.js` does): `sweatchloride`, `sweatcl`, `chloridesweat`, `sweatchlorideconcentration`, `کلریدعرق`, `کلرعرق`. Measured today: all of these are `unmapped` (G2a–G2e). None of them collides with serum `CL` (`cl`, `chloride`), because they always carry the word «sweat»/«عرق»; serum chloride is unchanged (N25).
- **Sweat conductivity is not mapped** (G2f stays `unmapped`): it is a screening value with a different cut-off (≥ 50 referral), not a chloride.
- Path: like `UPCR`, the key has **no `refs.js` range** and sits in `UNIT_KEPT`, so `e.ungraded.SWEAT_CL = {value, unit, reason}`. The rule reads it there. A range in `refs.js` would grade it against an adult blood range system and put it into the score; it is neither.
- Rule `sweat_chloride_result` in `patterns_specimen.js` (non-blood specimens: CSF, pleural, ascites already live there), `RULE_GROUP` = `general`, the group `csf_glucose_low`, `pleural_glucose_low` and `ascites_runyon_pattern` already use (`groups.js:119`).
- Unit: only `mmol/L` (or `mEq/L`, numerically equal). Any other or missing unit ⇒ no verdict; the row stays readable as «تفسیر نشد» (N3).

### D3 — bands and urgency (USER DECISION before implementation)

The bands come from the extraction (Tietz p.422, unverified) and match the CF Foundation 2017 consensus as commonly cited (not opened this session).

| Value (mmol/L) | Band | Recommended urgency |
|---|---|---|
| ≤ 29 | CF unlikely | `routine` |
| 30–59 | intermediate | `this_week` (repeat; the extraction says within 2 months) |
| 60–160 | consistent with CF | `this_week` (specialist confirmation; not an emergency) |
| > 160 | above the functional limit ⇒ probable collection or lab error | `routine`, with a repeat instruction and no disease sentence |
| age < 2 weeks, or no/other unit | no verdict | `routine` |

Edge values for tests: 29/29.5/30, 59/59.5/60, 160/160.5/161 (FR-012). Non-integer values between bands (29.5, 59.5) belong to the higher band, because the source writes the bands as integers and the safer error is over-read (constitution II).

**Rationale for not using `emergency`:** a positive sweat test confirms a chronic condition. The ordinary input is a known-CF-workup child; an emergency card would be a false alarm (constitution: check a new rule against its most ordinary input).

## R3 — Things the extraction lists that are reviewer conflicts, not code

| Item | Extraction | Engine | Decision |
|---|---|---|---|
| Calculated osmolality | `1.86×Na + glu + urea + 9` | `2×Na + glu/18 + BUN/2.8` | Keep engine. At Na 140 the formulas differ by ≈ 10 mOsmol/kg, which is the gap threshold itself. Changing it moves every gap; reviewer question in P141. |
| Cl range | 98–107 / 100–108 | engine `ADULT_REFS` | Keep; recorded |
| K plasma range | 3.3–4.9 | one K range | Keep; a sheet does not say serum vs plasma |
| SO2, FO2Hb ranges | 94–98 %, 90–95 % | no key | Out of scope (blood-gas keys) |

## R4 — N56 trap

**Decision:** `pseudohyponatremia_lipid_protein` lives in `preanalytical.js`, which `RULE_READS` does not scan. `sweat_chloride_result` names only `SWEAT_CL`, which is its own key, so marking it «read» is correct. No helper move is needed.

## Open user decisions (block `/speckit-implement`)

- **D1** TG/TP cut-offs for R1 (A recommended).
- **D3** sweat-chloride urgencies (table above recommended).
- D2 has a recommended default that mirrors existing code and does not need a decision unless the user wants to widen it.
