# Implementation Plan: Tumour-Marker Clinical Rules

**Branch**: `main` (no feature branch; spec dir `019-tumor-marker-rules`) | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/019-tumor-marker-rules/spec.md`

## Summary

Tumour markers already exist in the engine (P77): they route through `serology.js` (`AI_RE`), are read **only against the range printed on the sheet row**, live in `ungraded` (never `graded`), and produce the aggregate finding `tumor_markers_result`. Measured gaps (research.md §1): the two-band CEA range is mis-read (silently keeps the non-smoker band, or is unread); «At or below: N» is unread; strict `<` is read as `≤`; marker rows never reach `_engine.tests`; and a row without a verdict would show as «در محدوده» on the result screen.

Approach: **one new pure module `rules/tumor_markers.js`** (range reader with bands and boundary strictness, verdict incl. a new `between` state for unlabelled-smoker CEA, and the `_engine.tests` row builder), called only for the tumour-marker keys. The shared `units.parseReference` / `serology.abVerdict` are **not touched** (they feed every analyte; N36). `server.js` gets a one-line spread, like `urine_rows.js`. The frontend gets one new neutral state for "no verdict". Clinical wording and any default range are gated on a sourced research table (Phase 1 of the task), produced with a stronger model, and limited to sources actually opened (research.md §3).

## Technical Context

**Language/Version**: Node 26 ESM (`khanesh-server`), React 19 + Vite 8 (`khanesh`)

**Primary Dependencies**: none new

**Storage**: N/A (engine is stateless; results in `jobs` untouched)

**Testing**: backend `node --test` (`npm test`, all `*.test.js`) with new cases in `rules/engine.test.js` (+ a dedicated `tumor_markers.test.js` for the pure module, Persian comments); frontend `npm run lint` only (no frontend tests; trace UI by reading)

**Target Platform**: Express server behind nginx; browser SPA

**Project Type**: web application, two independent packages

**Performance Goals**: N/A (pure string/number logic)

**Constraints**: no clinical number from memory; `has_critical`/`emergency` never from a tumour marker; `_engine` changes additive only; Persian-only patient text; Persian never through PowerShell 5.1 `Get-Content/Set-Content`

**Scale/Scope**: 4 range-read markers in scope (CEA, CA 125, CA 15-3, CA 19-9) because they share the same generic path; optional markers (AFP, PSA, HE4, calcitonin, Tg, β-hCG) only if the research table gives a clear opened source — otherwise untouched

## Constitution Check (pre-research gate)

| Principle | Status | How the plan satisfies it |
|---|---|---|
| I. Engine decides, model speaks | ✅ | All verdicts computed in `rules/tumor_markers.js`; prompts untouched; only `headline/must_say/urgency/forbid` reach the model as today |
| II. Missing ≠ normal (NON-NEGOTIABLE) | ⚠️→✅ | Risk found: `resultStates.js:132` turns any falsy `abnormal` into «در محدوده». Plan adds an explicit `abnormal: null` + `verdict` and a new client state; consumers enumerated in research.md §5. `between` and `noref` are first-class verdicts, never collapsed into within |
| III. Measure, never quote | ✅ | Baseline `npm test` on the working tree recorded before editing (quickstart §0); probes in scratchpad are the evidence in research.md §1 |
| IV. Fix locked by a test that failed first | ✅ | Each new test is run against the unmodified tree first; rule-id set (`RULES`) diffed before/after; no rule deleted |
| V. Persian is the patient's language | ✅ | Names via `faName()`; new strings Persian; files written with Write/Edit/Node only |
| Clinical constraints: threshold needs a recorded source | ✅ | No default range is added (no opened manufacturer insert; researcher report §3). Printed range is authoritative. Any text claim traces to an opened passage or is dropped |
| One analyte, one owner (N25/N29) | ✅ | Tumour-marker keys stay owned by `tumor_markers_result`; the new module is a *reader* used by it, not a second rule |

**Gate result**: pass, with Principle II fix mandatory in scope. No Complexity Tracking entries.

## Key Design Decisions (details in research.md)

1. **Local reader, not a shared-parser change.** `tumor_markers.js` exports `parseTmRange(text)` → `{bands:[{label, lo, hi, loStrict, hiStrict}]}` and `tmVerdict(value, cmp, bands)` → `below|within|between|above|unknown`. Called from `serology.assayRoute` only for `TM_KEYS`. Reason: `parseSegment` has no strictness and feeds all analytes; moving it would move unrelated freeze tests.
2. **Two-band detection runs before `cleanPrintedRef`'s split** (that split currently returns the first parseable part ⇒ silent non-smoker band).
3. **CEA, smoking unknown**: `<= non-smoker limit` → within; `(nonsmoker, smoker]` → `between` (neutral, not abnormal, text names the dependence on smoking); `> smoker limit` → above. No profile field added.
4. **`between` is a new `ungraded.state` value**: reader inventory (`patterns_autoimmune.js` lines 33/34/62/304/443/456/491, `endocrine_rheum` Tg/TRAb, `expert.js`, `score.js` unread count, coverage nets, `metamorphic.test.js`) is a task; `isPos/isNeg` stay false for it.
5. **Rows in `_engine.tests`**: built by `tumorMarkerRows(engineOut)` in `tumor_markers.js` from `ungraded` entries with `reason: "assay_printed"` and a TM key; `server.js` change is a single spread next to `urineAbnormalRows`. Row has `abnormal: true|false|null`, `verdict`, `range` (printed text), `refSource: "printed"`. `graded` and the health score are untouched ⇒ tumour markers stay out of score/PhenoAge by construction (they were never in `SCORE_TABLE`).
6. **Frontend**: new STATE `norange` in `resultStates.js` (label «بدون محدوده مرجع», non-red, dashed like `missing`) selected when `t.verdict` is `noref|unreadable|between` (or `abnormal === null`); review `ExpertView`, `ResultDashboard`, `ResultReport`, `ResultView`, `Tafsir` for `abnormal`-based counts. `Tafsir.jsx` is dirty from another session ⇒ hunk-level staging.
7. **Name matching**: `AI_RE` has no Persian and no parenthesised long forms («CEA (Carcinoembryonic Antigen)», «CA 15.3 (Breast)», «CA 125 Ovarian» all unmapped today). Extend only with spellings found on real sheets in the repo / user's list; the five-file checklist (`refs.js`, `NAME_MAP`, `interpret.js`) does **not** apply — a second reader for the same names would break N25. `FA_NAMES` already has the four keys.
8. **Urgency unchanged** (`this_week` above printed range stays, P77 open question re-listed); `has_critical` untouched.
9. **Register**: new entry `P122` (max existing P121, re-grep before writing; N37) in `MEDICAL_RULES.md`, same commit as behaviour; research table in repo root `MEDICAL_RULES_TUMOR_MARKERS.md` (user asked for it beside the register).

## Project Structure

### Documentation (this feature)

```text
specs/019-tumor-marker-rules/
├── plan.md
├── research.md          # measured facts, source access map, decisions
├── data-model.md        # TmRange / TmVerdict / TmRow
├── quickstart.md        # runnable validation, before/after
├── contracts/
│   └── engine-tests-tumor-rows.md   # additive _engine.tests row contract
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
khanesh-server/
├── rules/
│   ├── tumor_markers.js        # NEW: range reader, verdict, row builder
│   ├── tumor_markers.test.js   # NEW: pure-module tests
│   ├── serology.js             # assayRoute: TM keys → tmVerdict; AI_RE additions (names only)
│   ├── patterns_autoimmune.js  # lineOf/tmBuild: `between`, unreadable-vs-noref wording, caveats from research table
│   ├── names.js                # FA_NAMES check (keys exist)
│   └── engine.test.js          # end-to-end live-sheet + boundaries
└── server.js                   # +1 line: spread tumorMarkerRows into serializeGraded
khanesh/src/
├── resultStates.js             # STATES.norange + stateOf branch
└── ExpertView.jsx · ResultDashboard.jsx · ResultReport.jsx · ResultView.jsx   # only if they count/colour by `abnormal`
MEDICAL_RULES.md                # P122 entry
MEDICAL_RULES_TUMOR_MARKERS.md  # Phase-1 sourced table (new)
```

**Structure Decision**: web app, two packages; all clinical logic in a new `rules/` module following `urine_rows.js`, so shared parsers and the dirty `server.js` stay nearly untouched.

## Stronger-model usage (per the request)

| Part | Who | Status |
|---|---|---|
| Source access map | `researcher`, `model: fable` | **Done** — research.md §3 |
| Phase-1 extraction (verbatim passage + section/table per claim) for CEA, CA 125, CA 15-3, then CA 19-9 | `researcher`, `model: fable`, only on sources marked readable | Task T-R1 |
| Two-band range reader design review + boundary table | `advisor` | Done once (changed the plan: items 1–3, 7); again before commit |
| Clinical review of every Persian patient string against the table | `eval-medical-reviewer`, `model: fable` | Task T-R3, before commit |
| Everything else (code, tests) | this session | — |

## Post-design Constitution re-check

Same table; Principle II now has a concrete mechanism (null verdict + new client state + enumerated consumers) and a test that fails on the old code (noref row must not render as normal). Passes. Open items are reviewer decisions, not gate failures: `this_week` urgency (P77), `between` urgency (`routine`, proposed), CEA smoking wording.

## As built (2026-11-08) — deviations from the plan above

- **US6 was a real fix, not a guard** (score 98 → 90 with a normal CEA; `score.js` changed). Not "by construction".
- **Frontend scope grew:** `resultStates.js`, `resultModel.js`, `Scorecard.jsx`, `ui.css` (+ lint), not only `resultStates.js`; `ExpertView.jsx`/`ResultDashboard.jsx`/`ResultReport.jsx` needed no edit (they use `normTest`, which now respects a no-verdict row).
- **Backend scope grew:** `score.js`, `expert.js`, `historyRoutes.js` (one-line skips), in addition to `serology.js`, `patterns_autoimmune.js`, `server.js` (+2 lines).
- **Register:** P122 in `MEDICAL_RULES.md`; sourced table at repo root `MEDICAL_RULES_TUMOR_MARKERS.md`.
- **Tests:** TM1–TM10 in `engine.test.js`, TMM1–TMM9 in `tumor_markers.test.js`, T64/T64b/T64c in `api-contract.test.js`, H10TM in `history.test.js`; intentional changes: `B11` (autoimmune2) and the `afp_cea` hash of `PN02` (prenatal) — each with a proof/comment.
