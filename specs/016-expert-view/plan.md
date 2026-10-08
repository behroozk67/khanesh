# Implementation Plan: Expert View («نمای تخصصی»)

**Branch**: `016-expert-view` (spec directory; work continues on branch `recovery`) | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/016-expert-view/spec.md`

## Summary

Add a «ساده / تخصصی» switch to the result page. The expert view is for clinical staff. It shows, for every shown finding, the triggering tests (printed, converted and corrected values kept apart), both ranges, the engine's grade, sources, suggested tests and an optional clinician-written `pro` block. It also lists hidden findings in a collapsed form, the computed indices with how they were computed, and a read-only breakdown of the P97 sheet score.

Everything is assembled on the server by a new deterministic module (`rules/expert.js`) from the engine's existing output and serialized as `_engine.expert`. No model is involved, no threshold or urgency is created, and nothing changes `overall_urgency`, `has_critical`, the score or the prompt. The first `pro` batch covers 30 common rules (research R7). The text is checked by guards that forbid any number the rule does not already use, and is registered in `MEDICAL_RULES.md` as P100.

## Technical Context

**Language/Version**: JavaScript (ES modules), Node (backend, `node --test`); React 19 + Vite 8 (frontend)

**Primary Dependencies**: none new. Reuses `score.js` (attribution, score), `patterns.js` (`RULES`, `RULE_SOURCES`, `alreadyMeasured`), `prompt.js` (`dropSubsumedTests`, `URGENCY_FA`, both to be exported), `guidelines.js` (`sourceList`), `names.js` (`faName`), `Segmented.jsx`

**Storage**: none on the server. Browser-local view preference only (`azmayar_view_mode_v1`).

**Testing**: `node --test` (backend). New file `khanesh-server/rules/expert.test.js`. The frontend has no test runner: oxlint + build + a browser check.

**Target Platform**: the existing Express server and the Vite SPA, mobile-first RTL

**Project Type**: web application (two independent sub-projects, `khanesh-server/` and `khanesh/`)

**Performance Goals**: building the expert object adds no network call and runs once per analysis; a sweep of ~800 panels must still finish within the existing suite's time budget (the metamorphic file is the slowest at ~10 s)

**Constraints**: engine boundary (Constitution I); three-state statements (II); raw keys never reach text (V); no freeze hash may change (R2); `ResultView.jsx` is entangled with a concurrent session's uncommitted edits, so its diff stays minimal and is committed hunk by hunk

**Scale/Scope**: 250 rules, 30 of which get a `pro` block; one new backend module, one new test file, two new frontend files, small edits to 5 existing files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How the design complies | Status |
|---|---|---|
| I. Engine decides, model only speaks | The expert view is built only from engine output; `_engine` is never in the prompt payload (contract invariant 7). The LLM-written graph-path «گزارش تخصصی برای پزشک» is not reused (R8). | PASS |
| II. Missing is not normal | Ungraded rows are «بدون حکم»; a finding with no source says so rather than omitting the row; `derived_from` without a printed value says the printed value is unavailable. | PASS |
| III. Measure, never quote | Baselines for the suite and lint are measured at the start of implementation and recorded in `baseline.txt`; the 30-rule batch was chosen from a measured sweep plus a stated clinical rationale (R7), and the sweep's bias is written down. | PASS |
| IV. Red-first tests | Every invariant in the contract is a test written before the module and observed red against a stub. `pro` guards are observed red against a deliberately bad fixture. | PASS |
| V. Persian, no raw keys | All labels via `faName()` or `headline`; a sweep asserts no key or rule id in the object (SC-002). No Persian moved through PowerShell cmdlets. | PASS |
| Clinical Change Constraints (thresholds are proposals) | `pro` text may not contain a number absent from the rule's own code (guard), so it adds no threshold. The prose itself is new clinical content: it is registered as P100 «در انتظار بازبینی», and the user explicitly chose to ship the first batch (clarification Q1). See Complexity Tracking. | PASS with justification |

Post-design re-check (after data-model and contract): unchanged. The WeakMap decision (R2) keeps every freeze byte-identical, and the score breakdown is a copy, not a computation (FR-020).

## Project Structure

### Documentation (this feature)

```text
specs/016-expert-view/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R10
├── data-model.md
├── quickstart.md
├── contracts/
│   └── expert-output.md
├── checklists/
│   └── requirements.md
└── tasks.md             # next: /speckit-tasks
```

### Source Code (repository root)

```text
khanesh-server/
├── server.js                    # _engine.expert = buildExpertView(...) next to score (≈3 lines)
└── rules/
    ├── expert.js                # NEW — buildExpertView(engineOut, patternOut, score)
    ├── expert.test.js           # NEW — contract invariants, sweeps, pro guards
    ├── score.js                 # export findingKeys() (moved cappedKeys logic; behaviour unchanged)
    ├── patterns.js              # export HIDDEN_FINDINGS (WeakMap); set it at the end of runPatterns
    ├── prompt.js                # export dropSubsumedTests and URGENCY_FA
    └── patterns_*.js            # `pro` blocks on the 30 batch rules (static objects)

khanesh/src/
├── ExpertView.jsx               # NEW — renders _engine.expert; degrades on an older server
├── ExpertView.css               # NEW — tokens from the existing theme, RTL, mobile-first
└── ResultView.jsx               # Segmented switch + mode storage + conditional render (minimal hunk)

MEDICAL_RULES.md                 # P100 — the pro batch and the index method sentences, pending review
CLAUDE.md                        # File Structure + frontend.md `_engine` shape: the new field
.claude/rules/frontend.md        # `_engine.expert` and its constraints
```

**Structure Decision**: web application with the existing two sub-projects. The clinical assembly lives in `khanesh-server/rules/expert.js`; the frontend only renders. New frontend files avoid entangling with the concurrent session's uncommitted edits.

## Phases (for /speckit-tasks)

1. **Setup:** measure the suite and lint baselines on the working tree; record them.
2. **Foundational:** export `findingKeys`, `dropSubsumedTests`, `URGENCY_FA`, `HIDDEN_FINDINGS`. A guard proves `score.js` output is byte-identical before and after the move, and every freeze stays green.
3. **US1 + US3 (P1):** `expert.js` with findings, triggers and values, indices, sources; `server.js` wiring; contract tests red first.
4. **US2 (P1):** suggested tests per finding and per sheet; already-measured filter tests.
5. **US5 (P2):** score breakdown copy; mode-equality tests (score, urgency, `has_critical`).
6. **Frontend:** `ExpertView.jsx/.css`, switch in `ResultView.jsx`, older-server fallback; lint and build.
7. **US4 (P2):** `pro` guards first (red against a bad fixture), then the 30 blocks, then P100 in `MEDICAL_RULES.md`.
8. **US6 (P3):** hospitalized sweep over the whole object.
9. **Polish:** docs (CLAUDE.md, frontend.md), `code-reviewer`, browser check, full suite, hunk-only commits.

## Complexity Tracking

| Deviation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Shipping new clinician-facing prose (`pro`) before a human reviewer approves it | The user chose to ship a 30-rule batch with this feature (clarification Q1), and the feature's stated value is a deeper interpretation that does not exist in the engine today | Shipping no text (option A) delivers a slot with nothing in it. Mitigations: the text cannot contain a number the rule does not already use (guard); it never changes urgency or the patient view; it is shown only in the expert view and labelled as pending review in `MEDICAL_RULES.md` P100 |
| A module-level `WeakMap` to expose hidden findings | The expert view must list hidden findings (FR-016), and `runPatterns`' return value is hashed by freeze tests | An enumerable field would re-baseline every freeze with no clinical change, which is exactly the kind of noise that hides a real diff |
