# Quickstart: validating 011

## Prerequisites
```bash
cd khanesh-server && npm install && node server.js      # :8787, prints [SMS MOCK]/[EMAIL MOCK] codes
cd khanesh && npm run dev                                  # :5173
```
Run once with `AUTH_REQUIRED` unset and once with `AUTH_REQUIRED=true JWT_SECRET=<random>`.

## Gates (must all pass, quote the output)
```bash
cd khanesh-server && npm test          # whole suite; new tests listed below must be red on HEAD first
cd khanesh && npm run lint && npm run build
```

## Scenarios

| # | Do | Expect |
|---|---|---|
| 1 | Sign in with `۰۹۱۲۱۲۳۴۵۶۷` (Persian digits), code from server log | signed in; intake starts at name |
| 2 | Sign in with an email, code from server log | signed in; separate account from #1 |
| 3 | Enter a wrong code 5× | code burnt; message says to request a new one |
| 4 | Fill name, close tab, reopen `/app` | resumes at sex |
| 5 | Age `3` + unit روز | accepted; neonatal note shown on result |
| 6 | Female, 30 years, pregnant ✓, Hb 11.5 manual | Hb graded against the pregnancy floor (not low) |
| 7 | Tick `dm2`, manual LDL 114, FBS 95 | `lipid_profile` fires with the < 100 target sentence; context line shows «دیابت نوع ۲» |
| 8 | Same panel, `dm2` unticked | no lipid finding (negative control) |
| 9 | Tick `htn` only, any panel | result identical to no condition; context line does **not** mention فشار خون |
| 10 | Tick `cancer`, Hb 7.5 | CTCAE grade present (as today) |
| 11 | Photo of a sheet printed «مرد», profile زن | graded as female; warning line names the mismatch |
| 12 | Manual urine: blood `+2`, RBC/hpf `10-15` | `hematuria` finding (values were not dropped) |
| 13 | Profile → delete → confirm | signed out; `GET /api/profile` 401; jobs gone |
| 14 | 360 px viewport, every screen | no horizontal scroll (`document.documentElement.scrollWidth <= 360`) |

## New backend tests (red on HEAD, green after)
- `conditionIds()` maps ids + legacy Persian labels; unknown → rejected.
- reported `dm2` triggers the existing LDL < 100 arm; absent `dm2` does not (M-series, red-first).
- inactive conditions never reach `buildEnginePrompt` payload (`htn` absent from the model input).
- manual urine string values reach `runEngine` (T-series, api-contract).
- `_engine.context.conditions_applied` contains only active ids.
- sex/age mismatch warning (T-series).
- email OTP request/verify + delete-account cascade (api-contract, auth on).
