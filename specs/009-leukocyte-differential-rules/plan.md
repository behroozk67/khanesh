# Implementation Plan: Leukocyte Differential and Smear-Morphology Rules

**Branch**: `recovery` (spec dir `specs/009-leukocyte-differential-rules`; the setup script's `BRANCH` field is derived from the
directory name, and no git branch was created) | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-leukocyte-differential-rules/spec.md` (clarified: 6 answers, session
2026-09-25)

## Summary

The engine gets four count rules and one smear rule, and one net defect is fixed. Nothing already in the engine is added
a second time ([research.md](research.md) R11).

1. **Monocytes, eosinophils, basophils** (Story 1). Today each of these, when isolated and abnormal, reaches only
   `unmatched_abnormal` («توضیح آماده‌ای نداریم»), and eosinophils at 2000 get the same routine urgency as at 600
   (measured). New rules read the graded `dir`:
   - `monocytosis`: two arms around 1000/µL;
   - `monocytopenia`: new adult lower limit of 200;
   - `eosinophilia`: this_week at ≥ 1500;
   - `basophilia`: stands down to `cml_suspicion`.
2. **Peripheral smear rows** (Story 2). «Blasts 25 %» next to WBC 30 produces **`leukocytosis`, this_week** today, and
   the blast row goes to «تفسیر نشدند» (measured). The fix has three parts:
   - A new adapter channel `smear`, with a closed, name-matched vocabulary. Presence is decided by the existing
     `castValueState`.
   - One classifier, `smearAxis`, and one finding, `peripheral_smear_findings`:
     - blasts ≥ 20 % or Auer rods → emergency, with one merged sentence;
     - blasts < 20 % or pseudo-Pelger → this_week;
     - toxic granulation, Döhle bodies and the inherited anomalies → routine.
     - The finding is `always_show` + `brief`.
   - A hand-off, so that `acute_leukemia_suspicion` alone talks about blasts when it fires.
3. **A pre-existing net defect the new rules would otherwise worsen** (research R6). A finding suppressed under an
   emergency still marks its keys as "covered". Measured: on WBC 80, basophils 4000 and lymphocytes 6400 vanish from
   the report. The net will count only the findings that are shown.
4. **`OCR_PROMPT`** names the smear terms as examples (FR-008b).

Every new number goes to `P56` as pending review, with the non-claim source line.

## Technical Context

**Language/Version**: Node.js ESM (backend only)
**Primary Dependencies**: none new; `node:test`
**Storage**: N/A
**Testing**: `npm test` in `khanesh-server/`; [probe.mjs](probe.mjs) before/after; red-before on a `git archive 0d8c782`
copy + junction
**Target Platform**: Express server (`khanesh-server/`). The frontend is untouched: `labRefs.js` has no mono/eos/baso
rows (grep).
**Project Type**: web service, a rules-engine change
**Performance Goals**: N/A (a few more rule evaluations per request)
**Constraints**: deterministic; Persian patient text only (M38 forbids Latin words outside `ALLOWED_TEST_NAMES`); no raw
keys; no number without the approval source line; no diagnosis labels (spec boundary)
**Scale/Scope**: 6 source files + 1 new module + 3 docs; ~15–20 new tests; RULES 144 → 149

No NEEDS CLARIFICATION remains. Every unknown was resolved by measurement (research R1–R13).

## Constitution Check

*Pre-research and post-design. Both pass.*

| Principle / constraint | How the design complies |
|---|---|
| I. Engine decides | All judgment is in `rules/`. The OCR prompt change only asks for extraction (no interpretation words). `smear` never reaches the model raw, and is deleted from the graph payload (contract). |
| II. Missing ≠ normal | `monocytopenia` is three-way on WBC (low / normal / not on the sheet). A smear row is present / absent / unknown; unknown stays in «تفسیر نشدند», and is never read as absent. R6 fixes a net that assumed "a rule read it" meant "the patient saw it". |
| III. Measure, never quote | Baseline re-measured 2026-09-25 on `0d8c782`: `682 · 663 · 0 · 19 todo`, 144 rules, `rules/` clean. |
| IV. Test failed first | Behaviour guards red on the `0d8c782` archive, freezes green on both. Rule-id diff = +5, −0. The `MONO_ABS` range change is recorded, and every freeze hash that moves is re-baselined only after a full-output diff. |
| V. Persian | Smear terms are written in Persian in patient text (M38). Every string is shown to the user verbatim before commit, and written with Write/Edit only. |
| Source for every number | 200 (mono LLN), 1000 (monocytosis), 1500 (HE), 20 % (blasts): «تأییدِ کاربر؛ عدد از مرجعِ چسبانده‌شده، منبعِ اصلی نامعلوم», `P56`. The eos ULN (450) and the baso ULN (200) are existing ranges, so no new number. |
| One number, one job (N23) | The range ULN stays the grading limit. 1000 and 1500 are named rule constants. `MONO_ABS` low has no current reader (grepped). |
| One owner per analyte; hand-off = "does it fire" | `basophilia` → `cml_suspicion`, and smear blasts → `acute_leukemia_suspicion`, both via the live `match`. Two-sided sweeps assert exactly one basophil finding and exactly one blast mention. |
| Band edges probed | mono 800/801/999/1000, 199/200; eos 450/451, 1499/1500; blasts 0/1/19/20 %; the neonate eos 1800 (ped range). |
| New alarm: check the ordinary input | Relative monocytosis ≥ 10 % fails the check on healthy children and low-normal-WBC adults, so it is not a trigger (R3). Monocytopenia on a 3 % manual count is routine and non-alarming (R2). Toxic granulation never raises urgency. «Blasts 0 %» / «not seen» produce nothing. |
| Lab Notebook | **N18** gets the R6 recurrence (suppressed findings, with a hash). **N25** gets a hash if the smear channel needs a page/merge guard. |

No violations, so Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/009-leukocyte-differential-rules/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/engine-output.md
├── probe.mjs, probe-before.txt          # measured 2026-09-25 on 0d8c782
├── checklists/requirements.md
└── tasks.md                             # /speckit-tasks
```

### Source Code (files this feature touches)

```text
khanesh-server/
├── server.js                    # OCR_PROMPT example line (R12); safeEngineOut deletes `smear` (contract)
└── rules/
    ├── refs.js                  # ADULT_REFS.MONO_ABS [0,800] → [200,800] + source line
    ├── adapter.js               # smear channel: vocabulary, generic-header scan, page-kind gate, returns `smear`
    ├── patterns_utils.js        # export castValueState; MONOCYTOSIS_ABS_UL, HYPEREOSINOPHILIA_ABS_UL; smearAxis()
    ├── patterns_leukocyte.js    # NEW: monocytosis, monocytopenia, eosinophilia, basophilia, peripheral_smear_findings
    ├── patterns_malignancy.js   # acute_leukemia_suspicion: smear clause when smearAxis(e).leukemic is non-empty
    ├── patterns.js              # import + spread RULES_LEUKOCYTE; the net counts shown findings only (R6)
    └── engine.test.js           # M194… behaviour (red-before) + sweeps + freezes
MEDICAL_RULES.md                 # P56: the numbers, the open questions, the deferred items
CLAUDE.md                        # N18 recurrence; baseline row; rule count 149; file-structure line for patterns_leukocyte.js
```

**Structure Decision**: backend `khanesh-server/rules/` plus two small `server.js` edits. The response shape is
unchanged ([contracts/engine-output.md](contracts/engine-output.md)). A new module, not `patterns_hematology.js`:
that file is ~2000 lines, and these rules share no helpers with it except `actionFor`, which is copied locally as in
`patterns_cardiac.js`.

### Order of work (each step verified before the next)

1. `ids-before.txt` (N16 one-liner). Add the extra panels listed in quickstart §2 to `probe.mjs` and re-save
   `probe-before.txt`.
2. **R6 net fix first, alone** (`patterns.js`). **Verify:**
   - the new guard (`cml_like` lists `BASO_ABS`, `LYMPH_ABS`) is red before and green after;
   - the full `npm test`;
   - freeze hashes that move: a full-output diff shows that only the orphan line changed, then re-baseline;
   - add the N18 notebook entry.

   Done first so that its blast radius is measured separately from the new rules.
3. `refs.js` `MONO_ABS` lower limit + `patterns_leukocyte.js` count rules + the import in `patterns.js`. **Verify:** the
   probe mono/eos/baso rows and the band edges; `cml_like` still lists `MONO_ABS`/`EOS_ABS`; `child5_mono` unchanged;
   M36/M37/M38/M32 green.
4. `adapter.js` smear channel + export `castValueState`. **Verify:**
   - every vocabulary spelling;
   - the absence/equivocal sweep;
   - a urine page with «Pelger» → not read;
   - `mergePages` with a smear row on two pages;
   - `unmapped` is unchanged for `band_12`/`anisocytosis`.
5. `smearAxis` + `peripheral_smear_findings` + the `acute_leukemia_suspicion` clause. **Verify:**
   - blasts 0/1/19/20/25 %, «Few», Auer alone, blast + Auer (one sentence);
   - `pancyto_blasts` (brief shown);
   - the hand-off sweep (exactly one blast mention).
6. `server.js`: the `OCR_PROMPT` line and the `safeEngineOut` delete. **Verify:** grep, `api-contract.test.js` green.
7. Tests: red on the `0d8c782` archive, green on the tree; full `npm test`. The probe diff must equal the quickstart §2
   table.
8. `MEDICAL_RULES.md` `P56`, `CLAUDE.md` (baseline row, rule count, N18, file structure).
9. Show every new Persian string to the user. Run `eval-medical-reviewer` + `code-reviewer`, two rounds (note.md: every
   round has found something the previous fix introduced).

## Decisions made in planning that the user may want to overrule

- **Relative monocytosis (≥ 10 % with a normal absolute count) is not a trigger** (R3). The spec's edge case says
  "either one alone is sufficient", but that fires on healthy children and on adults with a low-normal WBC. The ≥ 10 %
  criterion in the source is the CMML one, which needs *both*. The percentage is quoted when the absolute count is high.
  Open in `P56`.
- **Pseudo-Pelger-Huët is this_week, not benign** (R10). FR-008 grouped it with the benign anomalies; clinically it is
  a dysplasia sign.
- **Blasts < 20 % (or "present" with no %) are this_week**, not emergency. The input gives no urgency for this band.
- **The monocyte lower limit moves to 200**, so a count < 200 appears as ↓ in the tests table. The finding says it is
  usually not significant alone.
- **The R6 net fix is in scope** although it predates this input, because without it the new rules would silently drop
  monocytes and eosinophils on emergency sheets.
- **Bands and myelocytes (left shift) stay unread** («تفسیر نشدند»). They are needed for the CML/leukemoid tree, which was
  dropped. Recorded in `P56` as a follow-up.
- **Spellings are the English canonical terms plus «بلاست» and generic Persian header words.** None is verified against
  a real Iranian smear report (N2). A real sheet should be run before commit if one is available.

## Complexity Tracking

None.
