---
description: "Task list for 011 Onboarding and Intake Flow"
---

# Tasks: Onboarding and Intake Flow for the Interpretation Page

**Input**: `specs/011-onboarding-intake-flow/` — plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui-flow.md, quickstart.md

**Tests**: Included. Constitution IV requires every clinical/contract change to be locked by a test that is **red on HEAD first** (prove by `git stash` or running against `git archive HEAD` with `node_modules` junctioned, per CLAUDE.md → Commands). The frontend has no test runner: UI tasks are verified with `npm run lint`, `npm run build` and a Playwright walk-through at 360 px.

**Format**: `- [ ] [ID] [P?] [Story?] Description with file path`

## Baseline (measured 2026-10-02, working tree on HEAD `a6857f8`)

- `khanesh-server` `npm test`: `tests 806 · pass 787 · fail 0`
- `khanesh` `npm run lint` (oxlint): no output, 0 warnings / 0 errors
- `khanesh` `npm run build`: `✓ built in 521ms`

---

## Phase 1: Setup

- [X] T001 Measure and record the baseline: run `npm test` in `khanesh-server/` and `npm run lint` + `npm run build` in `khanesh/`; write the three results with the tree they came from (working tree, `git rev-parse --short HEAD`) at the top of `specs/011-onboarding-intake-flow/tasks.md` under "Baseline"
- [X] T002 [P] Add a **P66** entry to `MEDICAL_RULES.md` under «در انتظار بازبینی»: reported conditions as engine input — `cancer` (already active, id plumbing only), `dm2` (reported diabetes triggers the existing LDL < 100 arm, source `ADA_SOC_CVD`, no new number), and the eight inactive conditions with their candidate effects and the patient impact either way; list the ten Persian labels for reviewer confirmation

---

## Phase 2: Foundational (blocks all stories)

- [X] T003 Create `khanesh-server/rules/conditions.js` exporting `CONDITIONS` (ordered `[{id, fa}]` for `htn, dm2, lipid, hypothyroid, ckd, fatty_liver, ida, thal_trait, chd, cancer` with the Persian labels from data-model.md), `ACTIVE_CONDITIONS = new Set(["dm2","cancer"])`, and `conditionIds(input)` that accepts ids **and** legacy Persian labels (`دیابت`→dm2, `فشار خون`→htn, `بیماری کلیوی`→ckd, `بیماری کبدی`→fatty_liver, any match of `/سرطان|شیمی.?درمانی|رادیوتراپی|ایمونوتراپی/`→cancer), drops `none`, dedupes, and returns `{ids, unknown}`
- [X] T004 [P] Create `khanesh/src/conditions.js` with the same ordered ids and Persian labels plus `NONE_ID = "none"` (labels only — no "active" flag on the frontend)
- [X] T005 Add test `M280` to `khanesh-server/rules/engine.test.js`: `conditionIds` maps every id, every legacy label, rejects unknown strings into `unknown`, and `CONDITIONS` has exactly 10 entries each with a non-empty Persian `fa` (comment in Persian)
- [X] T006 In `khanesh-server/rules/adapter.js` (~line 1588) replace the raw regex on `ocr.patient.conditions` with `conditionIds(...)`; set `isCancerPatient = ids.includes("cancer")`; expose `patient.conditions` (ids) on the engine output so rules can read it; keep behaviour identical for the legacy label «سرطان / شیمی‌درمانی» — guard with test `M281` (legacy label and id both give CTCAE grade on Hb 7.5; no condition gives none)

**Checkpoint**: `npm test` in `khanesh-server/` — all pre-existing tests still pass, M280/M281 green.

---

## Phase 3: User Story 1 — Sign in by mobile or email (P1) 🎯 MVP

**Goal**: one minimal screen, two tabs (موبایل / ایمیل), OTP for each.
**Independent test**: quickstart #1–#3 — sign in once by phone (Persian digits) and once by email; 5 wrong codes burn the code.

### Tests
- [X] T007 [P] [US1] Add `T33` to `khanesh-server/api-contract.test.js` (with `AUTH_REQUIRED=true` and a test `JWT_SECRET` set in the test's env before importing `server.js`): phone `۰۹۱۲۱۲۳۴۵۶۷` and `+989121234567` are accepted and normalized; email request → verify returns a token; wrong code ×5 → burnt message; invalid email → 400 with Persian text. Capture the mocked code by injecting the sender (see T009)
- [X] T008 [P] [US1] Add `T34`: `users` migration — a DB file with the old schema (`phone NOT NULL`) and one row migrates to `user_version = 1`, keeps the row, and accepts an email-only user

### Implementation
- [X] T009 [US1] In `khanesh-server/auth.js`: add `normalizePhone()` (Persian/Arabic digits → Latin, strip `+98`/`0098`, prefix `0`) used by both phone routes; extract `sendSmsCode(phone, code)` and new `sendEmailCode(email, code)` (both `console.log` mocks, overridable via an exported `setOtpSenders()` for tests); generalize `otpStore` to key `phone:<n>` / `email:<e>`
- [X] T010 [US1] In `khanesh-server/auth.js` add `POST /request-email-otp` and `POST /verify-email-otp` (email regex, lower-case/trim, 10-min TTL, same limiters and 5-attempt burn); token payload `{ userId, kind }`; both verify routes return `{ success, token, user:{id}, profile }` (`profile` from T019, `null` until then); request routes return `retryAfterSec`
- [X] T011 [US1] In `khanesh-server/database.js`: `PRAGMA user_version` migration 0→1 that rebuilds `users` with `phone UNIQUE NULL, email UNIQUE NULL, CHECK(phone IS NOT NULL OR email IS NOT NULL)` copying rows; add `getUserByEmail`, `createUserWithEmail`; keep `dbConn()` lazy
- [X] T012 [US1] Add `smsOtp: "mock"` / `emailOtp: "mock"` to the `/health` payload in `khanesh-server/server.js` (`healthHandler`)
- [X] T013 [US1] Create `khanesh/src/onboarding/SignIn.jsx`: two-tab segmented control (موبایل / ایمیل), identifier field (`type="text"`, `inputMode="numeric"` / `"email"`, normalized with `normalizeDigits`), inline validation before sending, 6-box code input with `autocomplete="one-time-code"`, resend countdown from `retryAfterSec`, Persian error from the server body (never a status code), «ورود با ایمیل» / «ورود با موبایل» switch on delivery failure
- [X] T014 [US1] Rewrite `khanesh/src/AuthGuard.jsx` to render `SignIn` (keep the `/health` `authRequired` read, StrictMode `alive` guard and token storage key `auth_token`); after sign-in store `profile` from the response for T021
- [X] T015 [P] [US1] Add onboarding styles to `khanesh/src/site.css` (tokens on `:root` only, dark mode via existing tokens, RTL, 360 px without horizontal scroll, one primary button per screen)

**Checkpoint**: T007/T008 green; `npm run lint` + `npm run build`; Playwright: sign in by phone and by email with codes from the server log.

---

## Phase 4: User Story 2 — Intake: name → sex → age → conditions (P1)

**Goal**: four single-purpose screens, resumable, skipped for returning users, editable from the profile.
**Independent test**: quickstart #4–#6 — fill name, reload, resume at sex; female 30 y pregnant flag stored; returning user lands on start.

### Tests
- [X] T016 [P] [US2] Add `T35` to `khanesh-server/api-contract.test.js` (auth on): `PATCH /api/profile` validates each field (empty last name → «نام خانوادگی را وارد کنید.»; `age_unit=day` with 90 → 400; unknown condition id → 400; `none` with another id → 400; `pregnant` with `sex=male` → 400); `GET /api/profile` returns `intakeStep` progressing name→sex→age→conditions→done
- [X] T017 [P] [US2] Add `T36`: with auth **off**, `GET/PATCH /api/profile` return 409 `local_only` and nothing is written to `database.sqlite` (count `profiles` rows before/after)

### Implementation
- [X] T018 [US2] In `khanesh-server/database.js` add the `profiles` table (schema in data-model.md, `ON DELETE CASCADE`, `PRAGMA foreign_keys = ON`) plus `getProfile(userId)`, `upsertProfile(userId, patch)`
- [X] T019 [US2] Create `khanesh-server/profile.js` (Express router mounted at `/api/profile` in `server.js`, behind `requireAllowedOrigin` + `requireAuth`): GET/PATCH with the validation of T016, `intakeStep` derivation, 409 `local_only` when `AUTH_REQUIRED` is false; wire `profile` into both verify responses in `auth.js`
- [X] T020 [P] [US2] Create `khanesh/src/onboarding/profileStore.js`: `loadProfile()`/`saveProfile(patch)`/`intakeStep(profile)`/`clearProfile()` — server-backed when `/health` says `authRequired`, `localStorage["azmayar_profile_v1"]` otherwise; every storage access in try/catch
- [X] T021 [P] [US2] Create `khanesh/src/onboarding/Progress.jsx` (۱ از ۴ … ۴ از ۴ with Persian digits, back button)
- [X] T022 [US2] Create `khanesh/src/onboarding/IntakeName.jsx` (first/last name, 1–50 chars, inline missing-field message)
- [X] T023 [US2] Create `khanesh/src/onboarding/IntakeSex.jsx` (two large cards زن / مرد, required)
- [X] T024 [US2] Create `khanesh/src/onboarding/IntakeAge.jsx` (number via `normalizeDigits` + unit سال/ماه/روز with the ranges of data-model.md; when female and ≥ 10 years show «باردار هستید؟»; reuse the neonatal note text from `ProfileCard.jsx` when months < 6)
- [X] T025 [US2] Create `khanesh/src/onboarding/IntakeConditions.jsx` (10 rows from `khanesh/src/conditions.js` + «هیچ‌کدام»; ticking none clears others and vice versa; «پایان» enabled when ≥1 tick or none)
- [X] T026 [US2] In `khanesh/src/App.jsx` add nested routes under `/app` (`signin`, `intake/:step`, `start`, `photo`, `manual`) wrapped in `AuthGuard`; `/app` index resolves to the first incomplete step via `intakeStep()`; `/tafsir` → `Navigate` to `/app`
- [X] T027 [US2] In `khanesh/src/Profile.jsx` add editing of each intake answer (reusing the four intake components in "edit" mode)

**Checkpoint**: T016/T017 green; lint + build; Playwright quickstart #4–#6 at 360 px.

---

## Phase 5: User Story 3 — Choose photo or manual (P1)

**Goal**: start screen with two cards; short photo guide; manual entry in sections خون / بیوشیمی / هورمون / ویتامین‌ها / ادرار; switching keeps data.
**Independent test**: quickstart #12 — manual urine `+2` blood and RBC `10-15` produce `hematuria`; switching modes keeps typed values.

### Tests
- [X] T028 [P] [US3] Add `T37` to `khanesh-server/api-contract.test.js`: a manual payload with urine rows `{name:"Blood (urine)", value:"+2"}` and `{name:"RBC", value:"10-15", unit:"/hpf"}` reaches the engine and fires `hematuria` (red on HEAD: the `Number.isFinite` filter in `server.js` ~line 893 drops them)

### Implementation
- [X] T029 [US3] In `khanesh-server/server.js` manual path (~line 885–918): keep rows whose `value` is a non-empty string when the row is a urine field (name matched by the adapter's existing urine layer) instead of dropping every non-finite value; numeric rows unchanged
- [X] T030 [P] [US3] In `khanesh/src/labRefs.js` add `SECTIONS` (ordered `[{id, label, cats}]`: خون = cbc+coag+iron, بیوشیمی = diabetes+heart+kidney+liver+electro, هورمون = thyroid, ویتامین‌ها = vitamin, ادرار = urine) and `URINE_FIELDS` (pH, وزن مخصوص, پروتئین, قند, خون, نیتریت, لکوسیت استراز as select inputs منفی/±/+1/+2/+3; WBC/hpf and RBC/hpf as text ranges) with the engine-facing English row names the adapter already maps
- [X] T031 [US3] Update `khanesh/src/EntryGrid.jsx` to render collapsible sections from `SECTIONS` with a filled-count badge per header and the urine block; disabled submit shows «حداقل یک مقدار وارد کنید»
- [X] T032 [US3] In `khanesh/src/Tafsir.jsx` include urine values in `buildStructuredTests()`/`buildTestText()` as string rows; read sex/age/ageUnit/pregnant/conditions from `profileStore` instead of local state; remove `ProfileCard` from the page; keep `vals`/`images` in this parent so photo ↔ manual loses nothing (FR-014)
- [X] T033 [P] [US3] Create `khanesh/src/StartChoice.jsx` (two cards «عکسِ برگه» / «ورودِ دستی», one line each, profile chip «زن، ۴۵ ساله، …» with «ویرایش» → `/profile`)
- [X] T034 [P] [US3] Create `khanesh/src/PhotoGuide.jsx` (4 one-line tips: نور یکنواخت، بدون سایه و برق‌زدگی، گوشی موازیِ برگه، همهٔ ردیف‌ها در کادر — plus link «راهنمای کامل» → `/how-to-capture`) rendered above `UploadCard` on `/app/photo`
- [X] T035 [US3] Add the mode switch links «عکس دارم» / «دستی وارد می‌کنم» on `/app/photo` and `/app/manual` in `khanesh/src/Tafsir.jsx`

**Checkpoint**: T028 green; lint + build; Playwright: type CBC values, switch to photo and back, values still there.

---

## Phase 6: User Story 4 — Age, sex and conditions shape the interpretation (P1)

**Goal**: active conditions change the result through the engine; inactive ones are never claimed; result states the context; sheet/profile mismatch is announced.
**Independent test**: quickstart #6–#11.

### Tests (all red on HEAD first)
- [X] T036 [P] [US4] `M282` in `khanesh-server/rules/engine.test.js`: LDL 114, FBS 95, `patient.conditions:["dm2"]` → `lipid_profile` fires with the < 100 target and text saying the patient **reported** diabetes (not «قند شما در محدودهٔ دیابت است»); `M282b` negative control: same panel without dm2 → no lipid finding; `M282c`: FBS 209 without dm2 behaves byte-for-byte as before
- [X] T037 [P] [US4] `M283`: `buildEnginePrompt(...)` payload with `conditions:["htn","dm2"]` contains «دیابت نوع ۲» and does **not** contain «فشار خون» (inactive stripped)
- [X] T038 [P] [US4] `T38` in `khanesh-server/api-contract.test.js`: response `_engine.context.conditions_applied` lists only active ids with Persian `fa`; `htn` alone → empty list
- [X] T039 [P] [US4] `T39`: photo-path OCR mock printing «مرد» with profile `sex:"زن"` → graded female and `ocr_warnings` contains the Persian mismatch sentence; matching sex → no warning

### Implementation
- [X] T040 [US4] In `khanesh-server/rules/patterns_biochem.js` extend `ldlAboveDmTarget(e)` (~line 1116, helper near 1687) with a second trigger `e.patient?.conditions?.includes("dm2")`, and branch the sentence: sheet-glucose trigger keeps its current text; reported-diabetes trigger says «شما دیابت را گزارش کرده‌اید؛ هدفِ LDL در دیابت زیر ۱۰۰ است …»; urgency and `sources:["ADA_SOC_CVD"]` unchanged
- [X] T041 [US4] In `khanesh-server/rules/prompt.js` (~line 123) send `بیماری_زمینه‌ای` as the Persian labels of `conditionIds(...).ids` filtered by `ACTIVE_CONDITIONS` only; omit the key when empty
- [X] T042 [US4] In `khanesh-server/server.js` build `_engine.context = { sex, age_text, pregnant, conditions_applied, source }` from the engine's own patient values (not from the request) on both sync and async paths
- [X] T043 [US4] In `khanesh-server/server.js` after `mergePatient(merged.patient, patient)` (~line 846) compare sheet vs profile sex and age (> 1 year adults; any difference under 1 year) and push one Persian sentence to `ocr_warnings` naming both values and which was used
- [X] T044 [US4] In `khanesh/src/ResultView.jsx` render «تفسیر بر پایهٔ: …» above the interpretation from `_engine.context` only (absent on older servers → render nothing)

**Checkpoint**: `npm test` — M282–M283, T38–T39 green, every pre-existing test still green; re-run M282b/M282c to confirm no rule fired that did not before.

---

## Phase 7: Account deletion (clarification A — serves US2/profile)

- [X] T045 [P] [US2] `T40` in `khanesh-server/api-contract.test.js` (auth on): `DELETE /api/auth/me` with `{confirm:true}` removes the user, profile and jobs rows; the old token then gets 401 from `GET /api/profile`; without `confirm` → 400
- [X] T046 [US2] Implement `deleteUserCascade(userId)` in `khanesh-server/database.js` (single transaction) and `dropJobsForUser(userId)` in `khanesh-server/jobStore.js`; add `DELETE /me` in `khanesh-server/auth.js`; reject tokens whose user no longer exists in `requireAuth`
- [X] T047 [US2] In `khanesh/src/Profile.jsx` add «حذف حساب و اطلاعات من» with a second confirm dialog; on success clear `auth_token`, `profileStore`, the stored analyze job id (`analyzeJob.js` key) and navigate to `/app/signin`; auth off → clear local data only

---

## Phase 8: Polish & cross-cutting

- [X] T048 [P] Update `CLAUDE.md` Routes table and `.claude/rules/frontend.md` (new `/app/*` routes, `ProfileCard` removed, `_engine.context`), and `.claude/rules/environment.md` (email OTP mock, `/health` `smsOtp`/`emailOtp`, profile stored locally when auth is off)
- [X] T049 [P] Update `.claude/rules/architecture.md` step 6/7: conditions reach the engine as ids; only `ACTIVE_CONDITIONS` reach the model
- [X] T050 Prove red-first for every new test (M280–M283, T33–T40): run them against `git archive HEAD` with `node_modules` junctioned and record pass/fail per test in this file
- [X] T051 Full gates: `npm test` (khanesh-server), `npm run lint` and `npm run build` (khanesh); quote the summary lines in this file
- [X] T052 Playwright pass over quickstart #1–#14 at 360 px and 1280 px, light and dark; check `document.documentElement.scrollWidth <= innerWidth` on every screen; screenshots to the scratchpad, not the repo
- [X] T053 Dispatch `code-reviewer` on the diff (engine boundary, Persian strings, privacy: no name/phone/email in analyze or model payloads); fix findings

---

## Dependencies & execution order

- Phase 1 → Phase 2 → stories.
- **US1** (Phase 3) is independent after Phase 2.
- **US2** needs US1's auth plumbing (T009–T011) for the server-backed path; its local-only path works without it.
- **US3** needs Phase 2 only (T029 is backend-independent of US1/US2); T032 reads `profileStore` from T020.
- **US4** needs Phase 2 (`conditions.js`, adapter ids); T044 needs T042.
- Phase 7 needs T011 + T018.
- Phase 8 last.

## Parallel opportunities

- T002 ‖ T001; T004 ‖ T003.
- US1 tests T007 ‖ T008; T015 ‖ T013.
- US2: T016 ‖ T017 ‖ T020 ‖ T021.
- US3: T028 ‖ T030 ‖ T033 ‖ T034.
- US4: T036 ‖ T037 ‖ T038 ‖ T039; then T040 ‖ T041 (different files).
- US3 and US4 backend work can run in parallel with US1/US2 frontend work.

## Implementation strategy

1. **MVP** = Phase 1–2 + US1 (sign-in by phone and email) — demo-able alone.
2. Add US2 (intake) → the profile exists.
3. Add US4 backend (T036–T043) before US3 frontend, so the context line is real the first time the new screens ship.
4. Add US3 (start choice, photo guide, sectioned manual + urine).
5. Phase 7 deletion, Phase 8 gates. Nothing is committed unless the user asks.

## Code review (T053) — 2026-10-02

`code-reviewer` found 3 high / 3 medium / 5 low. Fixed, each with a guard shown red without its fix:

| # | Finding | Fix | Guard |
|---|---|---|---|
| H1 | infant age never ages — a «۱۰ روز» profile is graded as a newborn months later | day/month age older than 7 days is asked again (`ageRecordedAt`) | `T45` |
| H2 | profile age silently overrides a sheet in a different age band (child's sheet, parent's profile) | `PATIENT_MISMATCH` confirmation first; profile wins only after «ادامه بده» | `T41` |
| H3 | `ownedQual` route dropped unread urine rows (nitrite +) | `unreadQualRows()` names them in `ocr_warnings` | `T42` |
| M5 | profile load failure ran the analysis with no age/sex/conditions | run disabled until the profile is loaded and complete; error shown | lint/build + reading |
| M6 | auth off: anonymous results stored under user 1, undeletable, inherited by first real user | anonymous jobs are not persisted | `T44` |
| L7 | legacy text sent a condition count to the model | removed | reading |
| L8 | context line named dm2 even when unused | only conditions a shown finding (or CTCAE) actually used | `T43` |
| L9 | free legacy regex mapped «پیش‌دیابت» to dm2 | exact old labels only | `M284` |
| L10 | burning a code reset the resend cooldown | separate `lastSent` map; reset only on successful login | `T33` |
| L11 | Latin digits in a Persian age error | Persian digits | reading |
| info | graph payload carried inactive conditions; failed `/api/health` cached forever | filtered; failure not cached | reading |

**Not changed — needs a human:** M4, the reported-diabetes arm is live while `P66` is pending review (one-line revert noted in P66).
