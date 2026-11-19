# Tasks: Azmayar App Upgrade

**Input**: plan.md, spec.md, data-model.md, contracts/engine-result.md
**Tests**: no runner; pure logic gets `src/lib/selfcheck.ts` (constitution workflow).

## Phase 1: Setup

- [x] T001 Install deps: `npx expo install expo-haptics expo-print expo-sharing expo-notifications react-native-svg react-native-webview @expo/vector-icons`
- [x] T002 [P] `scripts/sync-content.mjs` + run it → `src/content/khanesh/` (allowJs/ignore for lint+tsc)
- [x] T003 [P] `src/components/ui.tsx`: colours, `T` text, `Card`, `Button`

## Phase 2: Foundational

- [x] T004 Navigation: root Stack in `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx` with 4 tabs; move intake to `(tabs)/index.tsx`
- [x] T005 [P] `src/lib/feedback.ts` haptics wrappers
- [x] T006 [P] `src/lib/engine.ts` typed `_engine` views + Persian band/reason strings from `resultModel.js`
- [x] T007 `src/lib/history.ts` (save/dedupe/list/get/remove, scoreTrend, testSeries, overview); `api.ts` saves on completion

## Phase 3: US1 — Interpret from camera / gallery / PDF (P1) 🎯 MVP

- [x] T008 [US1] Camera + gallery + page strip with remove in `(tabs)/index.tsx`
- [x] T009 [US1] `src/components/pdf-renderer.tsx` (WebView native / iframe web) + PDF button
- [x] T010 [US1] Animated progress + haptics on add/start/success/error; navigate to `result/[id]`

## Phase 4: US2 — Result screen + export (P1)

- [x] T011 [P] [US2] `line-chart.tsx` (react-native-svg, optional band)
- [x] T012 [P] [US2] `score-card.tsx` (count-up), `pheno-card.tsx`, `systems-chart.tsx`
- [x] T013 [US2] `src/app/result/[id].tsx` assembling banner, score, pheno, systems, trend, tests
- [x] T014 [US2] `result-list.tsx`: status chip, range text, link to test page
- [x] T015 [US2] `src/lib/report.ts` PDF HTML + print/share; button on result screen

## Phase 5: US3 — History (P2)

- [x] T016 [US3] `(tabs)/history.tsx`: overview, trend, record list (long-press delete), per-test picker + chart

## Phase 6: US4 — Encyclopedia (P2)

- [x] T017 [US4] `src/lib/encyclopedia.ts`: page sections ported from `TestPage.jsx`/`ExtraTestPage.jsx`
- [x] T018 [US4] `(tabs)/tests.tsx` categories + search; `src/app/test/[key].tsx`

## Phase 7: US5 — Challenges (P3)

- [x] T019 [US5] `src/lib/challenges.ts` catalogue, check-in, week/streak/badges, notifications, auto check-in on analysis
- [x] T020 [US5] `(tabs)/challenges.tsx` join/day picker/check-in/celebration
- [x] T021 [US5] `src/lib/selfcheck.ts` asserts for history + challenges

## Phase 8: Polish

- [x] T022 Update `CLAUDE.md` status/architecture; `npx expo lint`, `npx tsc --noEmit`, selfcheck, web smoke in Chrome

## Dependencies

T001 → all; T004 → US phases; T007 → T010, T013, T016; T011 → T013, T016; US1→US2 for live data (US2 testable with a stored record).

## External dependencies

khanesh-server running with `AUTH_REQUIRED=false` for a live analysis; cdnjs reachable for the PDF renderer.
