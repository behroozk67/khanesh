# Implementation Plan: Urinalysis Interpretation — Stage A

**Branch**: `005-urinalysis-rules` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-urinalysis-rules/spec.md`

**Scope**: **Stage A only**, per the clarification session of 2026-09-22. Stage B (crystals,
specific gravity, bilirubin/urobilinogen, cells) is deliberately not planned here and must not be
started until Stage A is measured green.

## Summary

Stage A corrects two live defects and adds the findings that replace them.

A urine microscopy row naming a **cast** is currently consumed by the lookups that count **loose
cells**, because both are matched by the same name fragment. Measured at `395a5d7`: a sheet whose
only red-cell row is `RBC Casts 5-8 /lpf` fires `hematuria` and tells the patient loose blood cells
were seen; a sheet with `Leukocyte Casts 8-10 /lpf` fires `uti_likely` and tells the patient they
have a urinary tract infection, on a sheet whose actual white-cell count is normal. Both mistake a
kidney-origin finding for a lower-tract one, which is the under-reading direction.

The technical approach is a single exclusion inside the two shared urine lookups — so it covers all
eight call sites and the ninth nobody has written — followed by a dedicated cast classifier in the
`patterns_mineral_bone.js` shape (one function returns one label, each rule asks only whether the
label is its own), a blood cross-check folded into the existing haematuria rule, and one small rule
for the white-cell cross-check, which has no existing rule to fold into (corrected during
`/speckit-tasks`).

## Technical Context

**Language/Version**: Node.js ES modules (`"type": "module"`), no transpile step

**Primary Dependencies**: none new. The rules engine is plain deterministic JavaScript with no
runtime dependencies; `express` is present only for the server that wraps it.

**Storage**: N/A — the engine is pure, in-process, and stateless

**Testing**: `node:test` via `npm test` in `khanesh-server/` (bare `node --test`, so it runs every
`*.test.js` in that directory). New guards go in `rules/engine.test.js`, one per fixed defect,
commented in Persian.

**Target Platform**: Node on the backend; no frontend change in Stage A

**Project Type**: Web application with an independent backend — the change is entirely inside
`khanesh-server/rules/`

**Performance Goals**: N/A. The added work is a regex exclusion and one classifier over an object
that holds a handful of keys; it is not on any measurable hot path.

**Constraints**:

- No new patient-facing response field. `_engine.patterns` gains rule ids; nothing else in the
  contract changes, so no frontend work is required (see [contracts/](contracts/)).
- No new numeric threshold may govern text before `MEDICAL_RULES.md` `P50` is reviewed.
- Every changed sentence is Persian, written with the Write/Edit tools or Bash — never through a
  PowerShell 5.1 content cmdlet.

**Scale/Scope**: 121 rules today → **129** (seven cast rules + `urine_esterase_without_cells`).
Files touched: 5 source files, 1 test file, 2 documentation files.

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design. Result: **PASS**, no violations,
Complexity Tracking not required.*

| Principle | Assessment |
|---|---|
| **I — The Engine Decides, the Model Only Speaks** | PASS. Every change is inside `khanesh-server/rules/`. No prompt is edited, no model changed. The new findings carry their own `must_say`, which is the sanctioned way to add depth. Nothing touches the graph path. |
| **II — A Missing Test Is Not a Normal Test** | PASS, and it is the active constraint. Both cross-checks are specified as three-way (`FR-011`): the second test agrees / argues against / was not done. The cast classifier returns `null` when no cast row is present, so a sheet without casts takes no cast branch at all — never a reassuring default. No `x != null ? x : 'طبیعی'` is introduced. The hand-off in `FR-008b` is written over "did that rule fire", not over `=== 0`. |
| **III — Measure, Never Quote** | PASS. Every factual claim in [research.md](research.md) names the tree it was measured on and the panel that produced it. The pre-change baseline is re-derived in T001 rather than copied from `CLAUDE.md`. |
| **IV — Every Fix Is Locked By a Test That Failed First** | PASS, and it is the gate on merge. Each guard must be observed red against the pre-fix code before it is accepted. The rule-id set is captured before and after (`FR-003`); Stage A deletes no rule, so the set only grows, and that is asserted rather than assumed. The exclusion in `urineCellCount` is a guard that *skips* rows — so per the principle it must **count** what it skipped and the classifier must fail loudly if a skipped row matched nothing downstream. |
| **V — Persian Is the Patient's Language** | PASS. All new strings are Persian. Cast rows are qualitative rows, not engine keys, so no `faName()` path is involved and no raw key can leak; the guard that asserts this (`M38`) covers the new module automatically because the live file list is derived from `patterns.js`'s own imports. |
| **Clinical Change Constraints** | PASS with a recorded gate. Three thresholds are introduced and all three go to `P50` pending review (research R8). The hand-off to `glomerulonephritis_pattern` is asserted two-sided — the panel must not fall between the rules and must not be claimed by both. The new module is not `_new`-suffixed and has no predecessor to delete. |
| **Development Workflow and Quality Gates** | PASS. Commands run from inside `khanesh-server/`. `SKIP_HOOKS=1` is not used. `CLAUDE.md`'s Lab Notebook gets an entry in the same session, because this change corrects wrong patient-facing output — that is a requirement, not an option (T012). |

**One point deserves emphasis rather than a checkmark.** Principle IV forbids a guard that skips
malformed data without counting it, because a defensive skip turns a loud failure into a silent one
— that is the mechanism by which 42% of the rules engine once went dark with a green suite. The
exclusion this plan adds to `urineCellCount` is precisely such a skip. The design therefore requires
the helper to expose what it excluded, and requires a guard asserting that every excluded row was
picked up by the cast classifier. A cast row that is excluded from the cell count *and* unread by
the classifier must turn the suite red, not vanish.

## Project Structure

### Documentation (this feature)

```text
specs/005-urinalysis-rules/
├── plan.md              # This file
├── spec.md              # Feature specification (Stage A + Stage B)
├── research.md          # Phase 0 — eight measured findings
├── data-model.md        # Phase 1 — the cast axis and the cross-check pairs
├── quickstart.md        # Phase 1 — reproducible probes and the verification run
├── contracts/
│   └── engine-output.md # Phase 1 — what `_engine` gains, and what must not change
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify, re-validated)
└── tasks.md             # Phase 2 — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
khanesh-server/
├── rules/
│   ├── patterns_utils.js          # CHANGED — the exclusion, the cast readers, the cast axis
│   ├── patterns_urine_casts.js    # NEW — the cast rules (one classifier, N rules)
│   ├── patterns.js                # CHANGED — import + spread the new RULES_URINE_CASTS
│   ├── patterns_nephrology.js     # CHANGED — blood cross-check in hematuria_pattern; esterase rule;
│   │                              #   esterase sentence in bacteriuria_no_inflammation; cast sentence in GN
│   ├── adapter.js                 # CHANGED — cast row names routed to qual without a unit
│   └── engine.test.js             # CHANGED — the guards
├── package.json                   # unchanged
└── (server.js, prompt.js, names.js — unchanged; see contracts/)

MEDICAL_RULES.md                   # CHANGED — P50, three thresholds + three open questions
CLAUDE.md                          # CHANGED — Lab Notebook entry (N26)
```

**Structure Decision**: The change is confined to the backend rules engine. `khanesh/` is not
touched: Stage A adds rule identifiers to an array the frontend already renders generically, and
adds no response field. This is deliberate — the one Stage A decision that could have required
frontend work (the contamination caveat's delivery path) belongs to Stage B, and was resolved in
clarification *against* the unrendered layer precisely so no frontend dependency is created.

The new module sits beside the other fifteen `patterns_<system>.js` files and is wired into `RULES`
through `patterns.js`'s own import list. That list is what `engine.test.js` derives its "live files"
set from, so the new module is subject to every existing structural, encoding and language guard in
the same commit that adds it — nothing needs to be added to a list by hand, and nothing can be
quietly exempted.

## Phase 0 — Research

Complete. See [research.md](research.md). Summary of what was resolved:

| # | Question | Resolution |
|---|---|---|
| R1 | Where does the misread happen? | In the shared lookups, not the adapter |
| R2 | How wide is the blast radius? | Eight call sites, four files, one shared predicate |
| R3 | Is red-cell the only cast affected? | No — white-cell casts too, and the outcome depends on the lab's spelling |
| R4 | Do cast rows reach the engine? | Yes with a `/lpf` unit; without one they land in `unmapped` |
| R5 | Is the cross-check premise real? | Yes, measured — but only reproduces on a realistic urine sheet |
| R6 | What does the cast finding hand off to? | `glomerulonephritis_pattern`, which cannot fire on a urine-only sheet |
| R7 | Where do the new rules live? | A new `patterns_urine_casts.js` in the mineral-bone classifier shape |
| R8 | Which numbers need a reviewer? | Three, all to `P50` |

No `NEEDS CLARIFICATION` markers remain.

## Phase 1 — Design & Contracts

Complete. Artifacts:

- **[data-model.md](data-model.md)** — the cast axis (the ranked label set and the single classifier
  that produces it), the cross-check pair as a three-state entity, and the validation rules each
  carries.
- **[contracts/engine-output.md](contracts/engine-output.md)** — the `_engine` contract: what Stage A
  adds, what it must not change, and the specific fields a frontend consumer already reads that
  could be disturbed.
- **[quickstart.md](quickstart.md)** — the exact probes that reproduce both defects today, the
  commands that verify the fix, and the negative controls that prove the fix is inert on sheets
  without casts.

### Design decisions that the artifacts carry

**The exclusion is subtractive and named.** `urineCellCount` and `urinePositive` gain a shared
"this row is about casts, not loose cells" test applied before the caller's regex is consulted. It
is one predicate in one place, so the eight call sites need no edit and the next call site inherits
the correction. Per the constitution note above, the helper reports what it excluded.

**The cast axis returns one label.** `castAxis(e)` returns exactly one of the ranked labels or
`null`. Two cast findings cannot reach one report because the function returns one value — not
because six `match`es happened to be disjoint on the day they were written.

**The blood cross-check is a sentence, not a rule; the white-cell one had to be a rule.** The blood
arm is built inside `hematuria_pattern`, which already fires on every sheet the cross-check is about.
The white-cell arm was planned the same way inside `uti_pattern`, but `uti_pattern` needs two signals
and the "argues against" state has one — measured, probe X2 fires nothing. With no host to fold into,
it becomes one small rule, `urine_esterase_without_cells`, which fires only when neither
`uti_pattern` nor `bacteriuria_no_inflammation` does, and folds into the latter when that one fires.
No existing rule reads the esterase pad alone, so this is not a duplicate. (Corrected during
`/speckit-tasks`; see [data-model.md](data-model.md) §4.)

**A normal hyaline count produces no finding.** Any finding moves a sheet off the canned normal
response (`server.js:978`) and onto the billed model path, and hyaline 0-1 is printed on a large share
of normal urinalyses. The row is consumed and judged normal; the canned response already tells the
patient their results are normal. (Corrected during `/speckit-tasks`; see data-model.md §3.)

**The hand-off is asked, not restated.** The standalone cast rule's `match` consults whether
`glomerulonephritis_pattern` fired, never its conditions — because those conditions require blood
tests, and restating them would silence the cast rule on the urine-only sheets it exists for.

### Post-design Constitution re-check

**PASS.** The design introduces no new violation. Two points were tightened *by* the design rather
than despite it: the exclusion is centralised (Principle IV's counting requirement is met by
exposing the skip), and the hand-off direction was corrected by R6 (the common path is the
standalone branch, so that branch gets the fuller text rather than being treated as the fallback).

## Complexity Tracking

Not required — the Constitution Check records no violations.
