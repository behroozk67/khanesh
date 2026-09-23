# Research — specs/007 (Henry ch.31, red-cell indices)

All facts below were measured on the **working tree on `b9068df`** (specs/006 uncommitted on top), 2026-09-23:
`npm test` → `598 · 579 · 0 fail · 19 todo`, `RULES.length` = 134. Probe: [probe.mjs](probe.mjs), output
[probe-before.txt](probe-before.txt). Run it from `khanesh-server/` with `node ../specs/007-henry-ch31-rbc-indices/probe.mjs [panel…]`.

---

## R1 — Who reads `RBC` / `HCT` (FR-003, N23)

**Decision:** the RBC-F range change needs no hold-the-line constant.

**Measured:** five places in `patterns_hematology.js` read RBC, and none reads HCT anywhere else.
- `thal_trait_no_anemia` (l.396) reads the **number** `t.RBC > 5.5`, not `dir`. The female LLN doesn't affect it.
- `erythrocytosis` (l.428) reads `rbc.dir === "high"`. The ULN stays 5.10, so it is unaffected.
- `spherocytosis_likely` (l.795) reads `rbcNotHigh`. The ULN is unchanged, so it is unaffected.
- `low_rbc_hct_without_anemia` (l.724/734) reads `rbc.dir === "low"`. **This is the intended change** (G1).

Probe, female, age 30:

| RBC | before | after (expected) |
|---|---|---|
| 4.09 | `low_rbc_hct_without_anemia` | same (still < 4.10) |
| 4.10 | `low_rbc_hct_without_anemia` | **normal** |
| 4.30 (G1) | `low_rbc_hct_without_anemia` | **normal** |
| 4.49 | `low_rbc_hct_without_anemia` | **normal** |
| 4.0, age 80 | `low_rbc_hct_without_anemia` | same (GERIATRIC_REFS has no RBC → adult F) |

`F_thal_RBC` (Hb 12.5, RBC 4.3, MCV 72, MCH 24) moves from `low_rbc_hct_without_anemia` + `unexplained_abnormal`
to `unmatched_abnormal` + `unexplained_abnormal`, for MCV/MCH (measured after the build; it was predicted as
`unexplained_abnormal` alone). That is correct: the low RBC was the false flag. `thal_trait_no_anemia`
does not fire on this panel either before or after, because RBC < 5.5 and Mentzer is 16.7.

**Alternatives rejected:** a hold-the-line constant for `low_rbc_hct_without_anemia`. The change in firing *is* the
approved decision (Q1 = B), not a side effect.

---

## R2 — The Hct-only crisis: where the predicate lives (FR-004/005)

**Decision:** widen `anemiaCrisisOwns(e)` in `patterns_utils.js` to one predicate with two arms, and keep the
number in one place:

- arm Hb: a measured HGB < `HGB_CRISIS_GDL` (7.0). Unchanged.
- arm Hct: **no HGB row graded**, an adult (age == null or age ≥ 16, the `PED_MAX_AGE` boundary), and a
  graded HCT < `HGB_CRISIS_GDL × 3` (a derived constant `HCT_CRISIS_PCT`, **never** a literal 21).

**Measured constraints:**
1. `severe_anemia_crisis.build` does `hgb.value` unconditionally (l.466–474), so the Hct arm would throw.
   The build gets a two-way branch. The Hct text says Hb was not measured and that the emergency is inferred from
   the Hct (N4/N5). `key_number` = the HCT value.
2. Every existing deferrer (`actionUnlessAnemiaCrisis`: macrocytic, microcytic, normocytic, spherocytosis,
   pancytopenia) is gated on low Hb, so with no Hb none of them fires. The widened predicate changes nothing for
   them. `M162`/`M162c` stay green.
3. **`low_rbc_hct_without_anemia` is the one rule that fires with Hct 18 and no Hb** (G6). Its text says
   «بدون آن نمی‌توان گفت کم‌خونی هست یا نه» and «در نوبت عادی». If it stays beside the crisis, the report gives two
   instructions and contradicts itself. **It stands down when `anemiaCrisisOwns(e)`** (hand-off = "does that rule
   fire"). Its one piece of unique content is naming a low RBC, which moves into the crisis Hct branch
   («تعداد گلبول قرمز هم پایین است: …») so RBC is not orphaned to the net (N20: list what the retired rule owned).
4. The `RULE_READS` scan is a source-token scan over `match` + `build`. `severe_anemia_crisis.match` is
   `(e) => anemiaCrisisOwns(e)`, so HCT/RBC must appear as tokens in its **build** (they will: the Hct branch reads
   `g.test === "HCT"` / `"RBC"`), or they fall to `unexplained_abnormal` next to an emergency.
5. Children: `child_Hct18` (age 6) is graded against the **adult** HCT range, because PED_REFS.HCT stops at age 3
   (RCPCH fallback, by policy). The Hct arm is therefore gated on age explicitly, not on "the range was adult".
   Age unknown counts as adult, the same default the rest of the engine uses.

**Band edges (FR/US2 #5):** Hct 20.9 → crisis; 21.0 → `low_rbc_hct_without_anemia` routine (unchanged).
Hct 18 + Hb 9 → Hb governs. Today that is `unmatched_abnormal`, and it must be byte-identical after.

**Alternatives rejected:**
- A new rule `hct_crisis_no_hgb`. It would be a parallel threshold with its own action, which is the N20 shape. It
  would also need its own entry in every deferral list.
- `blocks_others` on the crisis. That suppresses every lower-urgency finding on the sheet (N20).

---

## R3 — Hct unit: 0.39 L/L must not become an emergency (edge case → precondition of FR-004)

**Measured (a bug that already exists):** `Hct 0.18 L/L` and unitless `Hct 0.18` are both graded as **0.18 %**. HCT
has no `SI_CONVERSIONS` row. Today a normal `0.39 L/L` reads "low" → `low_rbc_hct_without_anemia` routine, which
is a false flag. **Once the Hct arm exists, the same value becomes a false emergency** (0.39 < 21), and it fails on
exactly the ordinary case N20/N3 warn about. The Hct arm cannot ship without this fix.

**Decision:**
- Printed `L/L` (also `l/l`, `fraction`) → ×100 to % through a new `SI_CONVERSIONS.HCT` row
  (`{ si: /^l\/l$/, factor: 100, conv: '%' }`). The unit is printed, so this is the ordinary units.js path, with no
  magnitude guess. It shows up in `unitConversions` and the «واحدها» card, with `faName("HCT")`.
- Unitless HCT **≤ 1** → not graded. It goes to `unit_unknown_values`, like every other unresolved unit (specs/003).
  Unitless HCT > 1 keeps today's behaviour (graded as %). **Implementation constraint:** putting HCT into
  `UNIT_PROFILE` switches on specs/003's `decideUnit` for unitless values. That must not turn a unitless `Hct 39`
  into `unit_unknown` (a regression on the common case). The tasks must verify `F_Hct18_nounit` and a unitless
  `Hct 39` are byte-identical before and after. If `decideUnit` can't express "≤ 1 only", the ≤ 1 gate goes in the
  adapter's HCT branch instead.
- Defence in depth: the Hct arm of `anemiaCrisisOwns` also requires `hct.value ≥ 1`. Belt and braces, and the
  number isn't clinical: a fraction can never be ≥ 1.

**Alternatives rejected:** unitless ≤ 1 → ×100 by magnitude. The two scales can't overlap, so it would be safe,
but magnitude inference is gated behind P48 approval (rules-engine.md). Recorded in P52 as a proposal.

---

## R4 — MCHC unit and the artefact trigger (FR-007)

**Measured:** `MCHC 366 g/L` (a normal value, 36.6 g/dL) is graded as 366 against 32–36. MCHC has no SI row
either. With a `> 36.5` trigger, **every SI-unit sheet would fire the artefact note on a normal MCHC**.

**Decision:** add `SI_CONVERSIONS.MCHC = { si: /^g\/l$/, factor: 0.1, conv: 'g/dL' }`, the same shape as `HGB`.
Unitless MCHC > 100 → not graded (unit_unknown), under the same constraint as R3: unitless 30–40 must stay
byte-identical. The artefact predicate reads only a graded MCHC.

---

## R5 — The artefact note: shape (FR-007/008)

**Decision:** a new rule `rbc_indices_implausible` in `patterns_hematology.js`, urgency `routine`.

- `match`: MCHC (graded, g/dL) > `MCHC_ARTEFACT_GDL` (36.5, user-approved, source line «تأییدِ کاربر…») **and** HGB
  graded **and** HCT graded **and** `spherocytosis_likely` does not fire **and** `!anemiaCrisisOwns(e)`.
  "Does not fire" is written by calling the spherocytosis rule's own `match` via a shared exported predicate
  `spherocytosisFires(e)`. The threshold is not restated.
- The predicate also requires the MCHC to be graded `abnormal && dir === "high"`. That makes the next point true
  by construction, not by table lookup: adult ULN 36, PED_REFS MCHC ULN 35 (< 16 y).
- Why `routine` doesn't move `overall_urgency`: MCHC > 36.5 is always graded abnormal (ULN 36). So on every panel
  where the note can fire, an abnormal MCHC already produces at least a `routine` finding (`unmatched_abnormal`, see
  `MCHC366` in the probe). The note replaces that net finding and does not add urgency. A test must assert
  `overall_urgency` and `has_critical` are unchanged on every trigger panel, not just argue it.
- **Under an Hb/Hct crisis the note does not fire.** Scenario US3#2 (Hb 5.5 + MCHC 38). A sentence saying "these
  numbers may be a sample artefact" beside «فوراً به اورژانس» invites the patient to discount the emergency. The
  hospital redraws the sample anyway. MCHC then falls to `unexplained_abnormal`, which is today's output
  byte-for-byte. The spec only requires that the emergency stands in full, and this is the conservative reading of
  that. Flagged for the user in the plan.
- **FR-008:** `low_rbc_hct_without_anemia` fires on G7 with «یعنی این نتیجه «کم‌خونی» نیست» and a B12/folate/iron
  work-up. That conclusion rests on exactly the indices the note says can't be trusted. **`low_rbc_hct_without_anemia`
  stands down when `rbc_indices_implausible` fires**, and the note names the low RBC/HCT values it covers, so
  RBC/HCT are not orphaned. The note's suggestions are a repeat CBC, a sample check (warming for cold agglutinin) and
  a peripheral smear. There is no nutrient work-up.

**Alternatives rejected:**
- `preanalytical.js`. Its caveats attach only to an existing finding, and orphans go to `_engine.preanalytical`,
  which **no renderer shows** (frontend.md). The patient would never read it.
- A sentence folded into `low_rbc_hct_without_anemia`. The note must also fire where that rule doesn't (MCHC 36.6
  with normal Hb/Hct).

---

## R6 — Absolute reticulocyte count (FR-009, G8)

**Measured:** `ARC`, `Retic Abs`, `Absolute Retic` and «رتیکولوسیت مطلق» all go to `unmapped` today, and none of
them is mis-resolved to RETIC by prefix. **`RETIC_ABS` already exists as a key in `refs_ped.js`** (l.104,
`maxAge: D(1)`, range `[1800, 4600]`, commented «×10⁹/L → /µL»). Those numbers don't match the published neonatal
ARC in either unit, and nothing maps to that key today, so the row is dead.

**Decision:**
- Key `RETIC_ABS`, which reuses the existing name. NAME_MAP: `arc`, `reticabs`, `absoluteretic`,
  `absolutereticulocyte(s)`, `reticulocyteabsolute`, `retabs`, «رتیکولوسیتمطلق». Check for collisions against
  `NAME_MAP` and `UNIT_GATED_ALIASES` in the task, and verify `resolveAlias` doesn't send `reticabs` → `RETIC`.
- `FA_NAMES.RETIC_ABS = "شمارشِ مطلقِ رتیکولوسیت"` (patient-facing; shown verbatim before commit).
- **Not graded at any age in this feature.** RETIC_ABS goes to `noRef` explicitly, even for neonates, so the dead
  PED_REFS row can't start grading. The row's unit problem is written into `REF_DIFF.md` + `P52`. Unit check: a
  printed `%` on an ARC row means a mislabelled RETIC. It goes to `unmapped`, never into RETIC_ABS.
- Rules that read `RETIC` read the graded key `RETIC` only, so they see no change (checked with `M104d`-style freeze).

---

## R7 — Paediatric differences (FR-010)

**Decision:** no code. `REF_DIFF.md` gets a "Henry ch.31 (Gemini extract) vs PED_REFS" block listing the rows
that differ. Plus the RETIC_ABS row finding (R6) and the observation that PED_REFS.HCT stops at age 3.

---

## R8 — P52 and the source lines (FR-002, SC-006)

`MEDICAL_RULES.md` `P52` records, each tagged chapter / inferred / Gemini-only:
- RETIC 0.5–2.5 %, RDW-SD 39–46 fL, ARC 25–100 ×10⁹/L (G2, G3, G8 range)
- Hct > 60 %, Hb > 20 g/dL (G4, G5)
- the rule of three ±3 as a trigger, and G7b
- unitless Hct ≤ 1 → ×100 by magnitude (R3)
- the dead neonatal RETIC_ABS row (R6)

It also records the **approved** items with their approval line: RBC-F 4.10 (Henry ch.31 automated adult interval),
Hct < 21 = Hb 7 × 3 (derived from `P8`'s Hb 7, still unsourced), and MCHC > 36.5 («تأییدِ کاربر،
۱۴۰۵/۰۶/۳۱؛ عدد از استخراجِ Gemini از هنری فصل ۳۱»).

---

## R9 — Commit isolation

specs/006 is still uncommitted in the same files (`patterns_hematology.js`, `patterns_utils.js`, `engine.test.js`,
`adapter.js`). 007's red-before checks use `b9068df` + the specs/006 working tree, i.e. a **copy of the current working
tree**, not `git archive b9068df`. The latter would show 006's 33 tests red as well and hide the attribution
(Principle III). The recipe is in [quickstart.md](quickstart.md). Committing 006 first would make the recipe
`git archive HEAD`. That is the user's decision.
