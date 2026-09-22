# Specification Quality Checklist: Urinalysis Interpretation (Henry ch.29)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-22
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.

### Validation findings (iteration 1 → 2)

- **Fixed**: the "Context" table names existing rule and helper identifiers. This is deliberate and
  is not an implementation leak — the user's explicit constraint is "no duplicates", and the only
  way to make that constraint testable is to name precisely what already exists. The requirements
  themselves (FR-001 … FR-028) name no file, function or identifier.
- **Fixed**: an earlier draft of FR-009/FR-010 quoted the chapter's numeric cut-offs (3/hpf,
  5/hpf) inside the requirement. Numbers were moved out into the reviewer gate (FR-027), because a
  textbook threshold is a proposal here, not a decided value — quoting it in a requirement would
  have made it live before a clinician approved it.
- **Fixed**: an earlier draft asserted "24-hour volume rules" as in-scope. Moved to Assumptions as
  an explicit exclusion with the reason (requires a timed collection).
- **Open, by design**: the specific-gravity correction for protein and glucose (Edge Cases) is
  stated as a reviewer decision rather than resolved here. It changes a number a patient reads, so
  it belongs in the clinical decision register, not in a spec-writing judgement call.

### Deliberate exclusions, recorded so they are not rediscovered as gaps

Orthostatic proteinuria · 24-hour volume (polyuria/oliguria/anuria) · isosthenuria ·
sulfosalicylic acid · Clinitest and the pass-through phenomenon · ether/chloroform solubility ·
heat and acetic-acid turbidity tests · polarised-light Maltese cross · colour and foam-colour
differential · urine osmolality after water load or dehydration · **dysmorphic red-cell percentage**
and **urine eosinophil percentage** (added 2026-09-22 by clarification: both need a specialist
microscopy report a routine urinalysis does not include, so no rule reading them could be verified
against a real sheet).

## Re-validation after `/speckit-clarify` — Session 2026-09-22

**Status: 16/16 → 16/16 items passing.** No item changed state; no regressions. Five clarifications
were integrated and each strengthened an item that was already passing rather than fixing a failure.

What changed in the spec, and why it matters to this checklist:

- **A live defect was measured during the scan and written into the spec.** A sheet whose only
  red-cell row is a cast count fires the haematuria rule and tells the patient loose blood cells
  were seen. This moved the feature from "purely additive" to "one correction plus additions", and
  produced the Stage A / Stage B split. *Scope is clearly bounded* is now bounded by stage, not just
  by topic.
- **Two success criteria became measurable that were previously only assertable** (SC-009, SC-011) —
  both name a specific panel or a specific delivery path rather than a quality.
- **One scope reduction** (FR-022a) removed two requirements that could not have been verified
  against any real sheet. *Requirements are testable* improved as a result of removing work, not
  adding it.
- **Watch item, not a failure**: FR-017b and FR-023a each justify a requirement by referring to how
  the system currently routes or renders something. This is close to the implementation-detail line.
  Both were kept because the constraint is unintelligible without the reason — "do not put this
  sentence there" is not actionable without "because nothing displays it". Neither names a file, a
  function, or a technology.
