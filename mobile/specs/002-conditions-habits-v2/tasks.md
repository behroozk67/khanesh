# Tasks: 002 — score placement, conditions, habits v2

Plan in brief: no new dependencies; reanimated for confetti, react-native-svg already present.
Constitution check: I (conditions are IDs, engine decides what applied), III (no new screens), V (local data) — PASS.

- [x] T001 [US1] `score-card.tsx`: title «امتیاز سلامت»; History overview renders `ScoreCard` of the latest sheet
- [x] T002 [US2] `src/lib/conditions.ts` (site list + icons); profile `conditions`; `api.ts` sends `patient.conditions`
- [x] T003 [US2] Interpret screen condition chips; result line «تفسیر بر پایهٔ …» from `_engine.context.conditions_applied`
- [x] T004 [US3/US4/US5] Rewrite `src/lib/challenges.ts`: habit catalogue (check/amount), day logs, attempts, window/grace, streak, consistency, heatmap, trophies
- [x] T005 `src/lib/store.ts`: v2 storage (logs, attempts, reminders), log/undo, start/leave, settle attempts, auto-log «read»
- [x] T006 `src/components/celebration.tsx` full-screen reward (confetti + trophy + haptic)
- [x] T007 `(tabs)/challenges.tsx` rewrite: today, active challenges, consistency chart, trophies, history, start new
- [x] T008 `selfcheck.ts` asserts for v2 logic
- [x] T009 Verify: tsc, lint, selfcheck, Chrome smoke; update CLAUDE.md
