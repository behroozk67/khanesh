# API Contract: 011 Onboarding and Intake Flow

All errors: `{ "error": "<Persian sentence naming the next action>" }`. Never a raw status code in user text (SC-007).

## Sign-in

| Method | Path | Body | 200 | Errors |
|---|---|---|---|---|
| POST | `/api/auth/request-otp` | `{ phone }` — Persian/Latin digits, `+98`/`0098`/`0` accepted | `{ success, retryAfterSec }` | 400 invalid · 429 `{ error, retryAfterSec }` |
| POST | `/api/auth/verify-otp` | `{ phone, code }` | `{ success, token, user:{id}, profile|null }` | 400 wrong/expired/burnt |
| POST | `/api/auth/request-email-otp` | `{ email }` | `{ success, retryAfterSec }` | 400 invalid · 429 |
| POST | `/api/auth/verify-email-otp` | `{ email, code }` | `{ success, token, user:{id}, profile|null }` | 400 |

Token payload: `{ userId, kind: "phone"|"email" }`. The identifier itself is not put in the token.

## Profile (requires auth when `AUTH_REQUIRED=true`; returns 409 `local_only` when auth is off)

| Method | Path | Body | 200 |
|---|---|---|---|
| GET | `/api/profile` | — | `{ profile|null, intakeStep: "name"|"sex"|"age"|"conditions"|"done" }` |
| PATCH | `/api/profile` | any subset of `{ firstName, lastName, sex, ageValue, ageUnit, pregnant, conditions }` | same as GET |
| DELETE | `/api/auth/me` | `{ confirm: true }` | `{ success }` — user, profile, jobs, in-memory jobs removed |

Validation errors: 400 with the field name in Persian (e.g. «نام خانوادگی را وارد کنید.»). Unknown condition ids → 400. `conditions` containing `none` together with another id → 400.

## Analyze (existing routes, extended)

`POST /api/analyze` and `/api/analyze/start`:
- `patient.conditions` may be ids or legacy Persian labels; the server maps them with `conditionIds()`.
- `tests[]` on the manual path may contain urine rows with a **string** `value` (`"+1"`, `"منفی"`, `"5-8"`); they are no longer dropped.
- Response adds `_engine.context` (see data-model.md) and, on profile/sheet disagreement, one Persian line in `ocr_warnings`.
- Only ids in `ACTIVE_CONDITIONS` reach the engine-to-model payload (`buildEnginePrompt`).

## GET /health (existing)

Adds `emailOtp: "mock" | "live"` and `smsOtp: "mock" | "live"` so a deploy can see whether codes are really sent.
