# Implementation Plan: Onboarding and Intake Flow for the Interpretation Page

**Branch**: `recovery` (feature id `011-onboarding-intake-flow`) | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-onboarding-intake-flow/spec.md`

## Summary

Turn `/app` from one long form into a guided flow: sign in by SMS **or** email OTP → four intake screens (name, sex, age, background conditions) → choose photo or manual entry → result. Most plumbing already exists (SMS OTP, JWT, `ProfileCard`, `mergePatient`, engine `patient` input). The new work is: email OTP, a profile store, a shared condition catalogue with an explicit **active** subset, a urine section on manual entry whose string values are no longer dropped, a "context applied" line driven by the engine, and account deletion. Two conditions are active (`cancer` — already graded; `dm2` — reuses the existing sourced LDL < 100 arm). The other eight are stored and never claimed (clarification B, FR-019/020). See [research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (Node 20+ ESM backend; React 19 + Vite 8 frontend)

**Primary Dependencies**: Express 4, `jsonwebtoken`, `express-rate-limit`, `sqlite`/`sqlite3`; `react-router-dom` 7. No new dependencies.

**Storage**: SQLite (`khanesh-server/database.sqlite`) — `users` rebuilt to allow email, new `profiles` table; `localStorage` for the profile when auth is off.

**Testing**: `node --test` in `khanesh-server/` (`engine.test.js`, `api-contract.test.js`); frontend has no tests → `npm run lint`, `npm run build`, Playwright walk-through at 360 px.

**Target Platform**: mobile-first web (RTL), desktop browsers.

**Project Type**: web application (two independent packages: `khanesh/`, `khanesh-server/`).

**Performance Goals**: each intake screen interactive < 1 s on mid-range mobile; full new-user flow < 3 min excluding code delivery (SC-001).

**Constraints**: Persian-only UI strings; no name/phone/email in any analyze or model payload; auth default stays off; SMS and email senders remain mocks until deploy.

**Scale/Scope**: ~10 screens/routes, 2 new backend modules (`rules/conditions.js`, profile routes), 1 migration, ~8 new tests.

## Constitution Check

*GATE: checked before Phase 0, re-checked after Phase 1.*

| Principle | Gate | Status |
|---|---|---|
| I. Engine decides, model only speaks | Conditions change interpretation only through engine code; inactive ones are stripped from the model payload (R2, R4) | ✅ pass (design enforces it) |
| II. Missing test ≠ normal test | No intake input the engine reads today is removed: `pregnant` and age units kept (R5); manual urine values no longer dropped (R11) | ✅ pass — required a spec amendment (below) |
| III. Measure, never quote | Baseline for `npm test` re-measured at implementation start, tree named | ⏳ at implementation |
| IV. Every fix locked by a red-first test | `dm2` trigger, prompt stripping, urine path, mismatch warning, context line: each gets a test shown red on HEAD | ⏳ at implementation |
| V. Persian is the patient's language | All new strings Persian; condition labels via one catalogue, never raw ids | ✅ pass |
| Clinical Change Constraints | `dm2` as a reported trigger is a clinical change → registered as **P66** in `MEDICAL_RULES.md` with the existing `ADA_SOC_CVD` source; no new threshold. Inactive conditions proposed in P66, not implemented | ✅ pass with P66 entry |

**Post-design re-check**: unchanged — all pass; no violations to justify.

### Spec amendments required by the gates
1. **FR-007** — ages accept a unit (سال/ماه/روز), not only 0–120 years (neonatal ranges depend on it).
2. **Assumption on pregnancy** — reversed: pregnancy is asked when sex is female and age ≥ 10 years, because the engine uses it for the Hb floor.
3. **FR-008 tenth condition** — سرطان / شیمی‌درمانی (the only condition the engine already grades with).
4. **FR-020** — active set at ship time is `dm2` + `cancer`; `htn` and `lipid` wait for P66 approval.

## Project Structure

### Documentation (this feature)

```text
specs/011-onboarding-intake-flow/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui-flow.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code

```text
khanesh-server/
├── auth.js                 # + email OTP pair, phone normalization, DELETE /me, profile routes (or profile.js)
├── database.js             # + user_version migration (users rebuild), profiles table, profile CRUD, deleteUserCascade
├── server.js               # conditionIds() on patient; urine string rows on manual path; mismatch warning; _engine.context
├── jobStore.js             # + dropJobsForUser(userId)
├── rules/conditions.js     # NEW — catalogue, ACTIVE_CONDITIONS, conditionIds()
├── rules/adapter.js        # isCancerPatient via conditionIds(); expose e.patient.conditions (ids)
├── rules/patterns_biochem.js  # ldlAboveDmTarget: reported dm2 as second trigger, own sentence
├── rules/prompt.js         # only ACTIVE conditions in the model payload
├── rules/engine.test.js    # M-series for dm2 trigger, prompt stripping, context
└── api-contract.test.js    # T-series for email OTP, profile, delete, urine, mismatch

khanesh/src/
├── App.jsx                 # /app/* nested routes
├── AuthGuard.jsx           # → SignIn screen with mobile/email tabs
├── onboarding/             # NEW — SignIn.jsx, IntakeName/Sex/Age/Conditions.jsx, Progress.jsx, profileStore.js
├── conditions.js           # NEW — ids + Persian labels (mirror of backend catalogue)
├── StartChoice.jsx         # NEW — photo / manual cards + context chip
├── PhotoGuide.jsx          # NEW — 4-line in-flow guide above UploadCard
├── EntryGrid.jsx           # sections خون/بیوشیمی/هورمون/ویتامین/ادرار, collapsible, filled counts
├── labRefs.js              # SECTION map over CATS; urine field definitions (qualitative)
├── Tafsir.jsx              # reads profile instead of local sex/age/pregnant/conditions state; drops ProfileCard
├── ResultView.jsx          # «تفسیر بر پایهٔ …» line from _engine.context
├── Profile.jsx             # edit intake answers + delete account
└── site.css / ui.css       # onboarding styles (tokens only)

MEDICAL_RULES.md            # P66 — reported conditions as engine input
```

**Structure Decision**: Existing two-package web app; no new package. New frontend screens grouped under `khanesh/src/onboarding/`; backend condition logic lives in `rules/` because it feeds the engine.

## Implementation order (for /speckit-tasks)

1. `rules/conditions.js` + adapter/prompt wiring + tests (pure backend, unblocks everything) — verify `npm test`.
2. `dm2` trigger in `ldlAboveDmTarget` with its own sentence («شما دیابت را گزارش کرده‌اید…», not «قند شما در محدودهٔ دیابت است») + P66 — red-first test.
3. `_engine.context` + mismatch warning — tests.
4. Manual urine string rows on the server — test.
5. DB migration + email OTP + profile routes + delete cascade — api-contract tests with `AUTH_REQUIRED=true`.
6. Frontend: sign-in tabs → intake screens → start choice → photo guide → sectioned manual entry → result context line → profile edit/delete — `npm run lint`, `npm run build`, Playwright at 360 px per quickstart.

## Complexity Tracking

No constitution violations; table intentionally empty.
