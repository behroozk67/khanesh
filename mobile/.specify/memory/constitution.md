<!--
Sync Impact Report
- Version change: template → 1.0.0 (first ratification)
- Principles: I. Backend Owns Clinical Judgment; II. Persian-First, RTL UI;
  III. Few Screens; IV. Feedback on Every Core-Loop Action; V. Local-First Patient Data
- Added sections: Platform Constraints; Development Workflow; Governance
- Removed sections: none
- Templates: plan/spec/tasks templates read this file at runtime — no edits needed
- Deferred TODOs: none
-->

# Azmayar Mobile Constitution

## Core Principles

### I. Backend Owns Clinical Judgment

- The app MUST NOT create, hard-code or compute clinical thresholds, reference ranges,
  diagnoses, scores or advice. Every clinical verdict comes from the khanesh backend
  (`_engine` payload) and is rendered as-is.
- Derived numbers shown in the app (biological age, health score, trend direction)
  MUST come from fields the backend returns, or be pure arithmetic over backend
  statuses (e.g. counting `normal` vs `abnormal` tests) with no clinical cut-offs.
- Educational test content (what a test is, why it is ordered) MUST be copied from the
  khanesh site source, not authored freshly by the app.

Rationale: a wrong number shipped to a patient is the costliest failure; one engine,
one source of truth.

### II. Persian-First, RTL UI

- Every user-visible string MUST be Persian. Raw engine keys (`HGB`, `ldl`) MUST NEVER be
  shown; render the server's `name`/`fa`.
- The app MUST run with RTL forced. A number and its unit are one bidi unit.
- The app MUST NOT claim "no identifier is sent" — the sheet photo itself contains them.

### III. Few Screens

- The app MUST have at most 5 top-level tabs. Secondary content (test detail, a result)
  opens as a pushed screen or sheet, never as a new tab.
- A new screen MUST be justified in the plan by a task that cannot fit an existing one.

Rationale: users of a lab-result app are often anxious and non-technical; navigation
must never be the hard part.

### IV. Feedback on Every Core-Loop Action

- The core loop (capture/pick photo → analyze → see result) MUST give visual progress
  and haptic feedback at each step: capture, upload start, completion, failure.
- Haptics MUST be skipped silently where the platform lacks them (web).

### V. Local-First Patient Data

- History, trends, challenges and streaks MUST live in on-device storage
  (AsyncStorage). No new server endpoint is added by this app.
- Only the sheet photo/PDF and age/sex go to the backend; nothing else about the user
  is sent.

## Platform Constraints

- Expo + React Native + expo-router; the Expo SDK version in `package.json` governs.
  Read `AGENTS.md` and the versioned Expo docs before using an Expo API.
- New packages MUST be added with `npx expo install`, never `npm install`.
- `src/lib/api.ts` is the only network client.
- The sibling `../khanesh-project` is read-only reference; nothing is written there.

## Development Workflow

- Before declaring work done: `npx expo lint` and `npx tsc --noEmit` MUST pass, and the
  real output is quoted in the report.
- Pure logic (aggregation, streak counting, history merge) SHOULD carry a small
  assert-based self-check since no test runner is installed.

## Governance

This constitution overrides ad-hoc preferences. Amendments are made by editing this file
with a Sync Impact Report and a semantic version bump (MAJOR: principle removed or
redefined; MINOR: principle or section added; PATCH: wording). Every `/speckit-plan`
MUST include a Constitution Check against these principles; violations need a written
justification in the plan's Complexity Tracking table.

**Version**: 1.1.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-09
