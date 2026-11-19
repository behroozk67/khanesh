# Feature Specification: Score placement, underlying conditions, habit challenges v2

**Feature Branch**: `002-conditions-habits-v2` (work stays on `master`, uncommitted)
**Created**: 2026-11-06
**Status**: Draft
**Input**: User request (fa): radar chart belongs in the score section; condition icons (blood pressure,
diabetes, CKD, dialysis, cancer/chemotherapy…) on the interpret screen; challenges must show past attempts,
a consistency chart, a visual reward on completing e.g. a 3-day challenge, and several habit types —
a once-a-day habit differs from a volume habit logged several times a day.

Supersedes spec 001 US5 (weekly check-in challenges).

## User Scenarios & Testing

### US1 — Score section holds the radar (P1)
The result card is titled «امتیاز سلامت» and contains the body-systems radar with the overall score in
its centre. The History tab's health overview shows the same radar for the latest sheet.

**Acceptance**: a scored result shows one score card containing the radar; History shows it under
«وضعیت سلامت شما».

### US2 — Underlying conditions with icons (P1)
On the interpret screen the user ticks any of the site's 12 conditions (icon + Persian label) or
«هیچ‌کدام». The choice is remembered and sent to the engine as condition IDs. The result shows
«تفسیر بر پایهٔ …» listing only the conditions the engine reports it applied.

**Acceptance**: ticking «سرطان / شیمی‌درمانی» sends `patient.conditions: ["cancer"]`; it never appears in
the free-text `patientInfo`.

### US3 — Habit types (P1)
Two kinds of habit:
- **once a day** (check): one tap marks today done (e.g. regular sleep, no sugary drinks).
- **volume** (amount): several logs a day toward a daily goal with a unit and step (water 8 glasses,
  walking 30 minutes in 10-minute steps, 5 servings of fruit/veg); today shows progress `x / goal` and can be undone.

**Acceptance**: logging water 3 times shows 3/8 and the day is not met; at 8/8 a success haptic fires.

### US4 — Fixed-length challenges with a visual reward (P1)
Starting a habit means starting a challenge of 3, 7, 14 or 30 days. It is completed when the daily goal
is met on that many days within the window (length + ⌈length/3⌉ grace days); otherwise it fails when the
window ends. Completion shows a full-screen celebration (trophy, confetti, haptic) once, and adds a trophy.

**Acceptance**: a 3-day challenge met on 3 days → celebration appears once and a bronze trophy is added.

### US5 — Past attempts and consistency (P2)
The tab shows the history of attempts (habit, length, dates, days met, completed/failed), a 5-week
consistency heatmap (share of active habits met each day), the 30-day consistency % and per-habit
consistency bars, and the current daily streak per habit.

**Acceptance**: after one completed and one failed attempt both appear in the history with their outcome.

### Edge Cases
- Logging is only for today; past days are not editable.
- Volume habits cannot go below 0; check habits toggle.
- Leaving an active challenge marks it «رها شد» in history.
- Data from the v1 weekly challenges is not migrated (single test enrolment existed).

## Requirements
- **FR-001** Exactly 4 tabs remain; no new screens.
- **FR-002** Conditions list, IDs and Persian labels are the site's `conditions.js`; IDs only in `patient.conditions`.
- **FR-003** Habit text is general wellness. Changed at the user's request (2026-11-09): a result screen may *offer* a habit to start, only from the engine's flags on glucose and lipid tests, never on a critical sheet or with kidney disease, dialysis, cancer or a hospital stay, and it never starts one by itself (`suggestedHabits`).
- **FR-004** All habit data stays on device; reminders stay local weekly notifications.
- **FR-005** Pure habit logic carries assert-based self-checks.

## Success Criteria
- **SC-001** A user can log a volume habit in one tap per unit.
- **SC-002** Every completed challenge yields exactly one celebration and one trophy.
- **SC-003** 100% of condition IDs sent match the site's IDs.
