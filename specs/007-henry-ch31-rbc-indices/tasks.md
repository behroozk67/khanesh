---
description: "Task list for specs/007 — Henry ch.31 red-cell indices"
---

# Tasks: Red-Cell Indices and Critical Values (Henry ch.31)

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/engine-output.md](contracts/engine-output.md), [quickstart.md](quickstart.md)

**Tests**: required. FR-012 asks for a test per behaviour change, red on the pre-change tree, and a freeze test per
exclusion that is green on both trees (Constitution IV). New tests continue after `M176l`: `M177`–`M181`.

**Paths**: backend only. Everything is under `khanesh-server/rules/` unless a path says otherwise. Run all commands
from `khanesh-server/`. `npm test` can exceed 2 minutes: run it in the background and grep `^ℹ (tests|pass|fail|todo)`.

**Persian text**: write it only with the Write/Edit tools, never with PowerShell cmdlets (N15). Every string below
is a **draft** and must be shown to the user verbatim before commit (T040).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Re-measure the baseline on the working tree. Quote the real output: `npm test` counts, `RULES.length`.
  Plan-time value, 2026-09-23: `598 · 579 · 0 · 19 todo`, 134. If it differs, stop and find out why before editing.
- [X] T002 Snapshot the pre-007 tree for red-before runs (research R9). Copy `khanesh-server/` (without
  `node_modules`) to `<scratchpad>/before-007/khanesh-server/`, then
  `New-Item -ItemType Junction <scratchpad>/before-007/khanesh-server/node_modules -Target <repo>/khanesh-server/node_modules`.
  If the user has committed specs/006 by now, use `git archive HEAD khanesh-server` + the junction instead.
- [X] T003 [P] Save `ids-before.txt` (sorted `RULES` ids) and `refs-before.json` (the ADULT_REFS dump for
  HGB/HCT/MCV/MCH/MCHC/RDW_CV/RDW_SD/RETIC/RBC, plus GERIATRIC_REFS and PED_REFS in full) to the scratchpad, using
  the one-liners in [quickstart.md](quickstart.md) §0.
- [X] T004 [P] Confirm that `specs/007-henry-ch31-rbc-indices/probe-before.txt` still matches
  `node ../specs/007-henry-ch31-rbc-indices/probe.mjs`. Regenerate it if T001 found drift.

---

## Phase 2: Foundational — unit preconditions (blocks US2 and US3)

**Why this blocks**: without it, the US2 crisis turns a normal «Hct 0.39 L/L» into a false emergency, and the US3
note fires on every normal SI-unit MCHC (research R3/R4).

- [X] T005 Write `M177` in `rules/engine.test.js`: «هماتوکریت با واحدِ L/L ×۱۰۰ درجه‌بندی می‌شود؛ MCHC با g/L ÷۱۰».
  Cases:
  - `Hct 0.39 L/L` (F, 30) → graded HCT value 39, not abnormal, and `unitConversions` has a HCT row whose `name`
    is `faName("HCT")`.
  - `MCHC 340 g/L` → 34, not abnormal.
  - `Hct 0.18` unitless → HCT not in `graded` and present in `ungraded` with the unit_unknown reason.
  - `MCHC 366` unitless → not graded.
- [X] T006 Write the `M177b` freeze in `rules/engine.test.js`. Unitless `Hct 39`, `Hct 18`, `MCHC 34`, and `Hct 39 %`
  are graded exactly as today (same value, range, abnormal, dir). Must be green on both trees.
- [X] T007 Add `HCT: { si: /^l\/l$/, factor: 100, conv: '%' }` and `MCHC: { si: /^g\/l$/, factor: 0.1, conv: 'g/dL' }`
  to `SI_CONVERSIONS` in `rules/units.js`, under «هماتولوژی», with a Persian comment citing N3/specs/007.
  Also add LOINC rows (HCT `4544-3`/`20570-8`, MCHC `786-4`/`28540-3`) if `UNIT_PROFILE` requires them. Check the
  `LOINC` table shape first.
- [X] T008 Implement the unitless gates: HCT ≤ 1 → not graded, MCHC > 100 → not graded, both routed like any
  specs/003 unresolved unit, with everything else unchanged. First check whether T007 alone makes `decideUnit`
  send unitless `Hct 39` to unknown. If it does, put the gate in the adapter's grading loop in `rules/adapter.js`
  and keep HCT/MCHC out of the unitless decision path. Whichever way you choose, T006 must stay green.
- [X] T009 Run `node --test rules/engine.test.js`: M177 and M177b are green. Drop the file into the T002 copy:
  M177 red, M177b green. Quote both results.

**Checkpoint**: the probe panels `F_Hct018_LL`, `F_Hct018_nounit` and `MCHC_gL` change. `F_Hct18_nounit` does not
change at this checkpoint. It becomes an emergency later, in US2, which is correct: 18 cannot be a fraction.

> **As built (deviations from T005/T007/T008, 2026-09-23).** `M121b` requires every `SI_CONVERSIONS` key to have a
> `UNIT_PROFILE` row. That row would send *unitless* HCT/MCHC through `decideUnit` and stop grading a unitless
> `Hct 39`. So the conversions live in a separate `PRINTED_ONLY_CONVERSIONS` in `units.js`, read only by
> `toConventional`, and no LOINC rows were needed. Unitless impossible values (HCT ≤ 1, MCHC > 100) go to `unmapped`
> in `adapter.js` (the «تفسیرشان نمی‌کند» line, same as the ambiguous decimal comma), not to `unit_unknown`, whose
> machinery requires a `UNIT_PROFILE` row. `M177` asserts `unmapped`.

---

## Phase 3: User Story 1 — a healthy woman is not flagged (P1) 🎯 MVP

**Goal**: `ADULT_REFS.RBC.F` = [4.10, 5.10] (Q1 = B).
**Independent test**: probe panels G1_F_RBC43, F_RBC410 and F_RBC449 → no finding. F_RBC409 and F_RBC40_old are
unchanged.

- [X] T010 [US1] Write `M178` in `rules/engine.test.js`: «گلبول قرمزِ ۴.۳ در زن طبیعی است (هنری فصل ۳۱، Q1)».
  - G1 panel (F, 30: Hb 13, Hct 39, RBC 4.3, MCV 90) → RBC `abnormal: false`, zero findings, `overall_urgency: "none"`.
  - Boundary: RBC 4.09 → `low_rbc_hct_without_anemia` fires; 4.10 → it does not; 5.10 → not high; 5.11 → high.
- [X] T011 [P] [US1] Write the `M178b` freeze in `rules/engine.test.js`:
  - Male RBC 4.4 still low.
  - RETIC 2.0 % still `abnormal` high, and the G2 output is byte-identical: `unmatched_abnormal`.
  - RDW-SD 50 still not abnormal (G3).
  - Female RBC 4.0 at age 80 still fires `low_rbc_hct_without_anemia`.
- [X] T012 [US1] Change `RBC: { M: [4.5, 5.9], F: [4.5, 5.1] … }` to `F: [4.10, 5.10]` in `rules/refs.js`. Add a
  comment: Henry ch.31 automated adult interval, approved by the user 2026-09-22 (Q1 = B), P52.
- [X] T013 [US1] Re-grep `RBC` across all `rules/patterns_*.js` (research R1) and confirm that no reader other than
  `low_rbc_hct_without_anemia` depends on the female LLN. Run the probe for F_thal_RBC: its expected output is
  `unexplained_abnormal` only. M178 is red on the T002 copy and green on the tree; M178b is green on both. Quote
  the results.

**Checkpoint**: US1 ships alone, and refs-before diff = `RBC.F` only.

---

## Phase 4: User Story 2 — Hct < 21 with no Hb is an emergency (P1)

**Goal**: one crisis predicate with two arms (data-model §3). One emergency instruction per sheet.
**Independent test**: probe panels G6_F_Hct18, F_Hct209, age_unknown_Hct18 and F_Hct018_LL → `severe_anemia_crisis`
alone. F_Hct21, F_Hct25, F_Hct18_Hb9 and child_Hct18 are unchanged.
**Depends on**: Phase 2.

- [X] T014 [US2] Write `M179` in `rules/engine.test.js`: «هماتوکریتِ زیرِ ۲۱ بی‌هموگلوبین — همان دستورِ اورژانسِ
  Hb<۷ (N19، Q2)». Panels F/30, all with no HGB:
  - Hct 18 → `overall_urgency` emergency; `severe_anemia_crisis` present; its `action` is **identical** to the
    action of the Hb 6.2 panel; `key_number` 18; `must_say` matches /اندازه‌گیری نشده/ and /هماتوکریت/.
  - Hct 20.9 → crisis; Hct 21.0 → no crisis.
  - Hct 18 with age unknown → crisis.
  - `Hct 0.18 L/L` → crisis.
- [X] T015 [US2] Write `M179b` in `rules/engine.test.js`, a two-sided sweep in the M162 shape. Over Hct
  {15, 18, 20.9} with no Hb, and with RBC 2.5 added:
  - exactly one finding carries an emergency action;
  - no finding's action matches `RIVAL_TIMELINE`, except via `ANEMIA_CRISIS_DEFER`;
  - `low_rbc_hct_without_anemia` is absent;
  - RBC and HCT are **not** in `_engine`-style uncovered (`unexplained_abnormal` absent, or it doesn't name them);
  - assert the number of panels reached ≥ 3 (N15).
- [X] T016 [P] [US2] Write the `M179c` freeze in `rules/engine.test.js`:
  - Hct 18 + Hb 9 → today's findings exactly (`unmatched_abnormal`, `unexplained_abnormal`), no crisis.
  - Hct 25 or Hct 21 alone → `low_rbc_hct_without_anemia` routine, same action as today.
  - child M/6 with Hct 18 → no crisis.
  - Unitless `Hct 0.18` → no emergency.
  - Hb 21 / Hct 63 / RBC 6.8 → `erythrocytosis` this_week (G4); Hct 62 alone → `unmatched_abnormal` (G5).
- [X] T017 [US2] In `rules/patterns_utils.js`, add `const HCT_CRISIS_PCT = HGB_CRISIS_GDL * 3;` and
  `export function crisisArm(e)` per data-model §3. Arm `hct` requires:
  - no HGB in `e.graded`;
  - `e.age == null || e.age >= PED_MAX_AGE` (import from `./refs_ped.js`);
  - a graded HCT with `1 <= value < HCT_CRISIS_PCT`.

  Then redefine `anemiaCrisisOwns(e)` as `crisisArm(e) !== null`, export `crisisArm` and `HCT_CRISIS_PCT`, and extend
  the Persian doc comment. ⚠️ Keep the comment explicit that the Hct arm is the approved Hb 7 × 3, not a new number (P8).
- [X] T018 [US2] In `rules/patterns_hematology.js`, branch `severe_anemia_crisis.build` on `crisisArm(e)`. Arm `hgb`
  stays byte-identical. Arm `hct`: same `pattern`, `urgency`, `headline`, `action` and `suggest`;
  `key_number: hct.value`; and this draft `must_say`:
  > «هماتوکریت شما ${hct.value} است (حد طبیعی ${hct.range}). هموگلوبین روی این برگه اندازه‌گیری نشده است؛ هماتوکریتِ
  > زیر ۲۱ معمولاً با هموگلوبینِ زیر ۷ همراه است، یعنی کم‌خونیِ بسیار شدیدی که اکسیژن‌رسانی به قلب و مغز را به خطر
  > می‌اندازد. این فوریت از هماتوکریت برآورد شده، نه از هموگلوبینِ اندازه‌گیری‌شده.»

  Append this sentence only when RBC is graded low:
  > « تعداد گلبول‌های قرمز هم ${rbc.value} است (حد طبیعی ${rbc.range}).»

  Import `crisisArm`. The build must read `g.test === "HCT"` and `"RBC"` literally, so `RULE_READS` counts them
  (research R2.4).
- [X] T019 [US2] In `rules/patterns_hematology.js`, add `&& !anemiaCrisisOwns(e)` to `low_rbc_hct_without_anemia.match`.
  Comment it in Persian: hand-off = "does the crisis fire" (N20, M91e).
- [X] T020 [US2] Run M179, M179b and M179c plus M162, M162b and M162c on the tree (all green) and on the T002 copy
  (M179 and M179b red, M179c green). Quote both results.

**Checkpoint**: the probe diff for Hct panels matches [quickstart.md](quickstart.md) §2.

---

## Phase 5: User Story 3 — an analyser artefact is not explained as a disease (P2)

**Goal**: `rbc_indices_implausible` (data-model §5), with its two hand-offs.
**Independent test**: G7 → the note alone (no `low_rbc_hct_without_anemia`, no nutrient work-up), with
`overall_urgency` unchanged. The 12 ordinary panels are frozen.
**Depends on**: Phase 2. Also on US2's `anemiaCrisisOwns` (T017) for the crisis stand-down.

- [X] T021 [US3] Write `M180` in `rules/engine.test.js`: «MCHC ناممکن ⇒ یادداشتِ ناهماهنگیِ شاخص‌ها، نه کم‌خونی (Q3)».
  - G7 (M/40: Hb 14, Hct 30, RBC 3.0, MCV 100, MCHC 46.7) → `rbc_indices_implausible` present, urgency `routine`;
    `low_rbc_hct_without_anemia` absent; no finding contains «کم‌خونی» نیست; `suggest` has no B12/فولات/فریتین;
    `overall_urgency` routine; `has_critical` false.
  - MCHC 36.6 with Hb 15, Hct 44 → note present, `overall_urgency` equals the pre-007 value (routine).
  - MCHC 36.5 → note absent.
  - `MCHC 366 g/L` → note present (converted).
- [X] T022 [P] [US3] Write the `M180b` freeze in `rules/engine.test.js`, exact `fired()` lists and urgencies. Every
  panel must be green on both trees except where marked:
  - MCHC 40 with Hb only / Hct only → no note (US3#6).
  - Hb 5.5 + Hct 15 + MCHC 38 → `severe_anemia_crisis` + `unexplained_abnormal`, no note (plan decision).
  - The spherocytosis panel (Hb 10.5, MCV 88, MCH 30, MCHC 37, RDW 16.5) → `normocytic_anemia`,
    `spherocytosis_likely`, no note.
  - IDA (Hb 9.5, Hct 34, MCV 68, MCHC 28) → unchanged (US3#3).
  - G7b → `macrocytic_anemia` this_week unchanged.
  - The 12 ordinary CBCs from SC-004 (normal M, normal F, IDA, B12 macrocytic, thal trait, spherocytosis,
    erythrocytosis, pancytopenia, isolated low PLT, leukocytosis, elderly normocytic, normal child) →
    `JSON.stringify(findings)` equal to a fixture captured on the T002 copy. **Exception:** the normal-female panel
    is built with RBC ≥ 4.5 so that US1 doesn't move it.
- [X] T023 [US3] In `rules/patterns_hematology.js`, extract `spherocytosis_likely.match`'s body byte-for-byte into
  `function spherocytosisFires(e)`, in the same file above `RULES_HEMATOLOGY`, and set `match: (e) => spherocytosisFires(e)`.
  M41 must stay green. So must the probe `sphero` output.
- [X] T024 [US3] In `rules/patterns_hematology.js`, add rule `rbc_indices_implausible` right after
  `spherocytosis_likely`, with `const MCHC_ARTEFACT_GDL = 36.5;` and a comment
  «تأییدِ کاربر ۱۴۰۵/۰۶/۳۱؛ عدد از استخراجِ Gemini از هنری فصل ۳۱ — نه از خودِ کتاب (P52)».

  `match`: MCHC graded `abnormal && dir === "high" && value > MCHC_ARTEFACT_GDL`, HGB graded, HCT graded,
  `!spherocytosisFires(e)`, `!anemiaCrisisOwns(e)`.

  `build`, draft Persian (the values come from `graded`):
  - `pattern`: `"rbc_indices_implausible"`
  - `urgency`: `"routine"`
  - `key_number`: `mchc.value`
  - `headline`: «شاخص‌های گلبول قرمزِ این برگه با هم جور درنمی‌آیند»
  - `must_say`:
    > «غلظت هموگلوبین در گلبول‌های قرمز (MCHC) ${mchc.value} گزارش شده (حد طبیعی ${mchc.range})؛ این مقدار از نظرِ
    > بدنی بعید است و معمولاً یعنی هموگلوبین (${hgb.value}) و هماتوکریت (${hct.value}) این برگه با هم هماهنگ نیستند.
    > شایع‌ترین علت، اثرِ نمونه یا دستگاه است — مثلاً چسبیدنِ گلبول‌ها به هم در نمونهٔ سرد (آگلوتینینِ سرد) یا
    > چربیِ زیادِ خون — نه یک بیماری. تا تکرارِ آزمایش، از این شاخص‌ها نتیجه‌ای دربارهٔ کم‌خونی گرفته نمی‌شود.»

    Append this when HCT or RBC is graded low. Name only the low ones:
    > « ${parts} هم پایین گزارش شده، ولی همین ناهماهنگی می‌تواند علتش باشد.»
  - `action`: «در نوبتِ عادی از پزشک یا آزمایشگاه بخواهید شمارش خون (CBC) روی نمونهٔ تازه تکرار شود.»
  - `suggest`: `["تکرار CBC", "لام خون محیطی"]`
  - `warnings`: `["تا تکرارِ آزمایش، خودتان مکملِ آهن، B12 یا فولات شروع نکنید."]`

  The build must read `"RBC"`, `"HCT"`, `"HGB"` and `"MCHC"` as literal tokens.
- [X] T025 [US3] In `rules/patterns_hematology.js`, `low_rbc_hct_without_anemia.match` also stands down when
  `rbc_indices_implausible` fires. Extract its match into `indicesImplausible(e)` and call it from both rules, so
  the hand-off is "does that rule fire" (FR-008).
- [X] T026 [US3] If the "تکرار CBC" / "لام خون محیطی" suggestions need `SUGGEST_TESTS` rows for
  `alreadyMeasured` (N8), check `rules/patterns.js`. "تکرار …" must not be dropped as already measured. Check the
  existing `spherocytosis_likely` suggest behaviour and mirror it. Change nothing if it already works.
- [X] T027 [US3] Run M180, M180b and M41 on the tree (green) and on the T002 copy (M180 red, M180b green). Quote both.

**Checkpoint**: probe G7, MCHC365, MCHC366, MCHC40_HbOnly, Hb55_MCHC38, sphero, ida and G7b match quickstart §2.

---

## Phase 6: User Story 4 — the absolute reticulocyte count is read (P3)

**Goal**: `RETIC_ABS` is recognised, named, and not graded (data-model §7).
**Independent test**: probe G8_* → no `unmapped`, and `RETIC_ABS` in `noRef`. G8_both keeps RETIC 1.2 graded.
**Independent of**: Phases 2–5, so it can run in parallel with them after Phase 1.

- [X] T028 [P] [US4] Write `M181` in `rules/engine.test.js`: «شمارشِ مطلقِ رتیکولوسیت شناخته می‌شود و گم نمی‌شود (G8)».
  - `ARC`, `Retic Abs`, `Absolute Retic` and «رتیکولوسیت مطلق» (all ×10⁹/L, M/40) → `unmapped` empty, `noRef`
    includes `RETIC_ABS`, and the `ocr_warnings`-style name is `faName("RETIC_ABS")` ≠ `"RETIC_ABS"`.
  - `Retic 1.2 %` + `ARC 60` → RETIC graded 1.2, RETIC_ABS in noRef.
  - Neonate (age 0.001) with `ARC 150` → still noRef, not graded.
  - `ARC 1.2 %` → `unmapped`.
- [X] T029 [US4] Check aliases for collisions: grep `NAME_MAP`, `UNIT_GATED_ALIASES` and `resolveAlias` in
  `rules/adapter.js` for `arc`, `reticabs`, `retabs`. Confirm `resolveAlias("reticabs")` does not already prefix-resolve
  to `RETIC` (the probe says it goes to unmapped today). Write the result down in a comment.
- [X] T030 [US4] In `rules/adapter.js`, add NAME_MAP entries → `"RETIC_ABS"`: `arc`, `reticabs`, `retabs`,
  `absoluteretic`, `absolutereticulocyte`, `absolutereticulocytes`, `reticulocyteabsolute`, `رتیکولوسیتمطلق`. Route
  `RETIC_ABS` to `noRef` at every age, before `getRef` is consulted, so the dead `PED_REFS.RETIC_ABS` row can't grade.
  A printed `%` unit on a RETIC_ABS row → `unmapped`.
- [X] T031 [P] [US4] Add `RETIC_ABS: "شمارشِ مطلقِ رتیکولوسیت"` to `FA_NAMES` in `rules/names.js`.
- [X] T032 [US4] Run M181 plus M32 and G7 (green). On the T002 copy, M181 is red. Quote both.

---

## Phase 7: Polish & cross-cutting

- [X] T033 Run the full `npm test` on the tree: 0 fail. Quote the counts, and state the delta as attributable only
  to M177–M181.
- [X] T034 Drop the final `engine.test.js` into the T002 copy and run it. Red must be exactly the behavioural tests
  (M177, M178, M179, M179b, M180, M181, plus any sub-case listed as red above). All freezes are green. Quote the counts.
- [X] T035 Rule-id diff against `ids-before.txt`: exactly `+rbc_indices_implausible`, RULES = 135. Refs dump diff:
  `RBC.F` only.
- [X] T036 Probe after: `node ../specs/007-henry-ch31-rbc-indices/probe.mjs > …/probe-after.txt`, then diff against
  `probe-before.txt`. The diff must be **exactly** the table in quickstart §2. Explain any other line or fix it.
- [X] T037 [P] Add `P52` to `MEDICAL_RULES.md` per research R8. Include the provenance column (chapter / inferred /
  Gemini-only) and the three approvals with their approval lines. Also record the plan decisions (artefact note
  silent under a crisis; unknown age = adult; unitless Hct ≤ 1 ungraded) as open questions for the reviewer.
- [X] T038 [P] In `khanesh-server/rules/REF_DIFF.md`, add a "Henry ch.31 (Gemini extract) vs PED_REFS" block, the dead
  `PED_REFS.RETIC_ABS` row, and the note that PED_REFS.HCT ends at age 3 (R6/R7).
- [X] T039 Update `CLAUDE.md`:
  - N3: add the HCT L/L / MCHC g/L recurrence.
  - N19: add the Hct-only crisis.
  - Add a baseline table row: working tree + T002 copy, with measured counts.
  - "Where a pattern lives": 135 rules.
  - No new Lab Notebook entry unless review finds a new class.
- [X] T040 (2026-09-23: متن‌ها در گزارشِ جلسه نقل شد؛ کاربر با «پیشنهادت اجرا کن» تأیید کرد) Print every new or changed Persian string to the user **verbatim**. Do this before any commit, and wait
  for approval of the text:
  - the T018 Hct branch;
  - the T024 note (headline, must_say both variants, action, warnings);
  - `FA_NAMES.RETIC_ABS`.
- [X] T041 Run `code-reviewer` and `eval-medical-reviewer` on the diff. Fix blockers with a new red-before test each.
  Run both reviewers a second time on the fixes (note.md §D).
- [X] T042 Update `note.md` §0 with the state, measured counts and anything left open. Do not commit unless the user
  asks. Never stage anything from note.md's "never commit" list.

---

## Dependencies

```
Phase 1 (T001–T004)
  ├─► Phase 2 (T005–T009) ─┬─► US2 (T014–T020) ─► US3 (T021–T027)
  │                        └──────────────────────► US3 needs T017 too
  ├─► US1 (T010–T013)        independent of Phase 2
  └─► US4 (T028–T032)        independent of Phases 2–5
All stories ─► Phase 7 (T033–T042)
```

`engine.test.js`, `patterns_hematology.js` and `adapter.js` are each touched by several stories. Tasks on the same
file are serial even when the stories are independent.

## Parallel opportunities

- T003 ∥ T004.
- US1 (refs.js) ∥ Phase 2 (units.js) ∥ US4's T031 (names.js). Only the test-file edits serialize.
- T037 ∥ T038 (different docs).

## Implementation strategy

1. **MVP = Phase 1 + US1.** It removes the most frequent false flag (normal women) with a one-line range change
   and no new rule.
2. Then Phase 2 → US2, the only change that can move a patient from «نوبت عادی» to the emergency room. It is not
   shippable without Phase 2.
3. Then US3 and US4.
4. Phase 7 last. Nothing is committed without T040 approval and an explicit commit request.
