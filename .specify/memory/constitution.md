<!--
Sync Impact Report
==================
Version change: (unratified template) → 1.0.0
Bump rationale: Initial ratification. Every placeholder in the scaffold was replaced with
concrete, project-derived governance; no prior version existed to amend.

Principles defined (all new):
  - I.   The Engine Decides, the Model Only Speaks (NON-NEGOTIABLE)
  - II.  A Missing Test Is Not a Normal Test (NON-NEGOTIABLE)
  - III. Measure, Never Quote
  - IV.  Every Fix Is Locked By a Test That Failed First
  - V.   Persian Is the Patient's Language

Sections added:
  - Clinical Change Constraints (SECTION_2)
  - Development Workflow and Quality Gates (SECTION_3)
  - Governance

Sections removed: none (no prior content).

Sources these principles were distilled from (not modified by this command):
  - CLAUDE.md — "Your Role", "IMPORTANT", and the Lab Notebook (N1-N23)
  - .claude/rules/architecture.md, rules-engine.md, frontend.md, environment.md, notes.md
  - MEDICAL_RULES.md — the clinical decision register

Follow-up TODOs: none. RATIFICATION_DATE is set to the date of this initial adoption rather
than back-dated to the repository's first commit, because no constitution governed the project
before today.
-->

# Khanesh / LabMate Constitution

## Core Principles

### I. The Engine Decides, the Model Only Speaks (NON-NEGOTIABLE)

All clinical judgment — abnormal versus normal, severity, direction, urgency, and multi-test
patterns — MUST be computed by the deterministic rules engine in `khanesh-server/rules/`. The
LLM's only sanctioned role is rewriting the engine's already-decided `findings` into fluent
Persian. A prompt MUST NOT be edited to fix a clinical error, and a model MUST NOT be upgraded
to fix one; depth and correctness come from richer `must_say`, `warnings`, and `suggest` fields
in the `patterns_*.js` modules.

No module that depends on the engine's judgment may be shown raw OCR text alongside OCR-printed
reference ranges. A model cannot unsee a contradictory bound, and negative instructions
("ignore the ranges in the raw data") do not hold. Any path that bypasses the `server.js`
safety nets — emergency `must_say` coverage, the `key_number` guarantee, the `forbid` filter —
MUST default to off, and turning it on requires routing its output through those nets first,
not flipping a flag.

Rationale: this architecture exists because a cheap model recommended iron for macrocytic
anemia. The boundary is the reason a cheap model is safe to use at all.

### II. A Missing Test Is Not a Normal Test (NON-NEGOTIABLE)

Every statement about an analyte MUST distinguish three states: measured-and-abnormal,
measured-and-normal, and not-measured. A binary branch that collapses "normal" and "absent"
into one arm is forbidden, and the expression `x != null ? x : 'طبیعی'` — a reassuring default
on an absent value — is forbidden outright.

Severity and direction are two axes and MUST never be carried by one variable. Direction is
derived from the graded value's own `dir`, never from a comparison against a severity cutoff,
even where the two agree today. A derived index (anion gap, BUN/Cr, non-HDL, osmolar gap,
eGFR) is directionless on its own; the measured value that supplies its direction MUST be named
and gated on explicitly.

A safety net's trigger MUST be written over what remains uncovered, never over whether anything
at all happened. Any `=== 0` or `.length === 0` guard on a fallback is a defect by default: it
covers total failure and is silent on the partial case, which is the case that actually reaches
patients.

Rationale: under-reading is this application's worst failure mode, because the output still
looks complete. A confident, well-formed report that omits the abnormal number is more
dangerous than an error.

### III. Measure, Never Quote

Any figure asserted about the system — test counts, pass/fail baselines, rule counts, coverage,
the set of files a commit touched — MUST be re-derived by running the real command at the time
of the claim, and the claim MUST name which tree produced it (working tree or a specific
commit). Numbers copied out of `CLAUDE.md`, out of a prior session's summary, or read off a
pre-commit hook run are not measurements.

A measurement taken in the wrong environment is not a measurement. A committed-tree baseline
MUST be taken with dependencies present; a delta MUST be attributed by isolating the change
that is being credited, because a total is not an attribution.

Rationale: this project has shipped a stale baseline three separate times, and each one cost a
later session hours of hunting for damage that did not exist or missing damage that did.

### IV. Every Fix Is Locked By a Test That Failed First

A regression test MUST be run against the pre-fix code and observed to fail before it is
accepted. A test that also passes on the old behavior locks in nothing and reads as coverage
that does not exist. Tests live in `khanesh-server/rules/engine.test.js`, one per real fixed
bug, commented in Persian.

Deletion requires the same proof as addition. Before and after any rewrite of a rules module,
the rule-id set MUST be diffed; an id that leaves the set is a clinical deletion requiring a
source, a decision, and a line in `MEDICAL_RULES.md`. "It is being replaced" is a plan, not a
state — the replacement MUST be live in `RULES` in the same change, or the original stays.

A guard that skips malformed data without counting it MUST NOT be written. Guards count what
they skipped and fail when the count is non-zero, because a defensive skip converts a loud
failure into a silent one.

Rationale: every automated guard in this repository observes properties of code that exists.
Nothing observes what was removed, and nothing observes a test that never could have failed.

### V. Persian Is the Patient's Language

All backend user-facing strings and prompts MUST be Persian. No raw engine key (`HGB`, `LDH`,
`BILI_T`) may reach user-facing text on any surface; every key passes through `faName()`, and
every new patient-facing surface re-opens this hole and MUST be checked for it.

Persian text MUST NOT be moved through PowerShell 5.1's `Get-Content`, `Set-Content`,
`Add-Content`, or `Out-File`. Those cmdlets round-trip through a system codepage and silently
produce mojibake or unrecoverable `?` runs. Use the Write/Edit tools, Bash, or Node's `fs`.

Patient-identifying fields (name, national ID, phone) are never extracted by the OCR prompt and
never forwarded to the model. This guarantee covers the extracted text and NOT the uploaded
image bytes; the short version MUST NOT be repeated in user-facing copy or a privacy policy
without that caveat.

Rationale: the one sentence that matters most in a report is the one most likely to be the
unreadable one, and a mojibaked emergency instruction passes every structural assertion.

## Clinical Change Constraints

A threshold, reference range, or severity cutoff MUST carry a recorded source. A number taken
from a textbook or guideline is a proposal until a human clinical reviewer approves it, and it
lives in `MEDICAL_RULES.md` under "در انتظار بازبینی" until then — not in executable code. A
paywalled source is never cited as if it were read; it carries a `substitutedBy` naming the
open source the number actually came from.

One number MUST do one job. A reference range answers "is this unusual for a general adult?"
It does not answer "is this an acceptable target for this patient?" (which may be tightened by
another finding on the same sheet) and it does not answer "does this count as evidence for a
named disease?" (which is a diagnostic threshold with its own source). A rule that reads
`dir === "low"` or `dir === "high"` as evidence for a diagnosis is coupled to `refs.js` whether
its author intended that or not; changing a range therefore requires grepping the key across
every `patterns_*.js` and running the boundary panel.

Within one finding, a computed value and every sentence restating it MUST be derived from the
same computation, never written side by side. Across findings, exactly one rule owns each
analyte on each panel: before adding a rule, grep that analyte across every `patterns_*.js`,
and where a hand-off exists, assert two-sided — the panel MUST NOT fall between the rules
(silence) and MUST NOT be claimed by two (contradiction). Hand-off conditions are written as
"does that rule actually fire", never "is the number past its threshold".

Whenever a rule's `match` is a band rather than a threshold, both edges are new gaps and both
MUST be probed. Whenever a new rule can emit `emergency`, its failure direction MUST be checked
against its most ordinary input, not its worst one.

A migration that cannot be finished is deleted, not carried. A `_new`-suffixed rules module MUST
declare, at the time it is created, what deletes the module it replaces and in which commit.

## Development Workflow and Quality Gates

`khanesh/` (frontend) and `khanesh-server/` (backend) are independent projects with no shared
`package.json`. Locate the owner of a change and run commands from inside it.

The `.githooks/pre-commit` gate measures the index, not the working tree, and blocks rather than
waves through when it cannot build the index tree. `SKIP_HOOKS=1` MUST NOT be used to get past a
failing clinical test; the test is fixed instead. Backend changes run `npm test` in
`khanesh-server/`; frontend changes run `npm run lint` in `khanesh/`.

The frontend has no tests. Frontend clinical text — notably the engine-free manual-entry preview
— has no `must_say`, no coverage check, and no backend test behind it, and therefore requires
the same scrutiny as a rules module rather than less. UI behavior claims MUST be verified in a
browser against the real post-interaction state; a screenshot of the top of a page proves
nothing about what happens after scrolling.

`CLAUDE.md`'s Lab Notebook MUST be appended to in the same session as any change that corrects a
wrong patient-facing output, before the work is reported as done. An entry names what was tried,
what it did to the patient, and the rule that generalizes. A repeat of an existing entry adds
its hash to that entry rather than creating a second one, because a recurring entry is the
strongest signal in the file. Mistakes whose only cost was wasted effort are not logged.

## Governance

This constitution supersedes conflicting practice elsewhere in the repository. Where it and a
project rules file disagree on a matter of governance, this document wins; where they disagree
on a matter of fact about the code, the code wins and both documents are corrected.

Amendments MUST be made through `/speckit-constitution`, which rewrites
`.specify/memory/constitution.md` and prepends a Sync Impact Report recording the version
change, the principles modified, and any deferred items. Amendments that weaken or remove a
NON-NEGOTIABLE principle additionally require an explicit statement of what replaces the
protection being removed.

Versioning follows semantic versioning of governance:

- MAJOR — a principle is removed or redefined in a backward-incompatible way.
- MINOR — a principle or section is added, or existing guidance is materially expanded.
- PATCH — clarification, wording, or typo fixes that do not change what is required.

Compliance is verified at review time. A reviewer of any change touching
`khanesh-server/rules/`, `server.js`, or patient-facing text MUST check it against Principles I,
II, and V and against the Clinical Change Constraints; the `code-reviewer` and
`eval-medical-reviewer` agents exist for this and encode much of it. Complexity that violates a
principle MUST be justified in writing at the point of review, not discovered later.

Runtime development guidance — structure, commands, agents, and the Lab Notebook — lives in
`CLAUDE.md` and `.claude/rules/`. Those files describe how the project works; this one describes
what the project will not do.

**Version**: 1.0.0 | **Ratified**: 2026-09-17 | **Last Amended**: 2026-09-17
