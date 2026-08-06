# Environment Variables

## Backend (`khanesh-server/.env`)

```
AVALAI_API_KEY=xxx          # required — server boots without it but all AI calls fail
TEXT_MODEL=gpt-4o-mini       # default
VISION_MODEL=gpt-4o-mini     # default
PORT=8787                    # default
AI_TIMEOUT_MS=240000         # default 4 min
MAX_IMAGES=5
IMAGE_CONCURRENCY=1          # ⚠️ raise only if your AvalAI account tolerates it — 2+ causes 429s
OCR_RETRIES=3
OCR_MAX_TOKENS=8000          # ⚠️ tuned from a real truncation incident — check GET /health before raising
USE_ENGINE=true              # "false" disables the rules engine, falls back to the old AI-only path
USE_GRAPH=false              # ⚠️ default OFF. "true" routes analysis through the 12-node LangGraph
                             #    in labmat-agents/, whose patient text bypasses every safety net in
                             #    server.js. Local experimentation only — see CLAUDE.md, N13.
AUTH_REQUIRED=false          # ⚠️ default OFF. "true" enforces the OTP/JWT layer on the analyze
                             #    routes. While off, every request is the same anonymous user
                             #    (userId 1), so `getJobById(jobId, userId)` isolates nothing and
                             #    any caller can read any stored result. See warning below.
JWT_SECRET=                  # ⚠️ required when AUTH_REQUIRED=true. The in-repo dev fallback makes
                             #    tokens forgeable, so boot REFUSES rather than warns in that case.
ALLOWED_ORIGINS=             # comma-separated CORS allowlist; empty = any origin. SET THIS IN PRODUCTION
TRUST_PROXY=                 # number of proxy hops (1 behind a single Nginx). See warning below
RATE_LIMIT_WINDOW_MIN=15     # rate-limit window for POST /api/analyze
RATE_LIMIT_MAX=20            # max /api/analyze requests per IP per window
```

## Authentication (`AUTH_REQUIRED`) — and the privacy surface it introduced

`auth.js` + `database.js` add OTP-over-SMS login and a local SQLite store. **This is the first
place the project persists a patient identifier.** Until now the rule was absolute: phone, name and
national ID are never extracted, never sent to the model (see [notes.md](notes.md)). The `users`
table stores the phone number, and `jobs` stores the **full interpretation result** next to a
`user_id`. That is a deliberate product change, not an implementation detail — retention,
encryption at rest, and deletion are now open questions that the code does not answer.

- **Off by default, and loudly.** With `AUTH_REQUIRED` unset, `requireAuth` assigns a shared
  anonymous user (`userId: 1`). Every job is attributed to that one id, so the `userId` argument in
  `getJobById(jobId, userId)` filters nothing — anyone who guesses a job id reads that result. Boot
  prints this in Persian rather than leaving it silent. Do not run it this way in production.
  ⚠️ An earlier version disabled auth with an unconditional `return next()` and left the real
  check as unreachable code below it, so the file read as though protection were in force. If you
  need to disable auth again, flip the flag — never short-circuit the middleware.
- **`JWT_SECRET` is enforced, not warned about.** With auth on and the secret still the in-repo dev
  default, anyone who has read the source can mint a valid token, so `authBootReport()` throws
  instead of warning. This is the one place the server refuses to start.
- **The SMS sender is still a mock** — the code is only `console.log`ged. Wire a real provider
  before enabling auth, or the login code lives in the server log.
- `database.sqlite` is gitignored (path-anchored). `npm test` creates it, because importing
  `server.js` runs `initDb()`.

## Rate limiting and `TRUST_PROXY`

`POST /api/analyze` makes one or more billed AvalAI calls (OCR + analysis) and has no
authentication, so it is rate-limited per client IP.

⚠️ **`TRUST_PROXY` must match the real deployment.** Behind Nginx, `req.ip` is the proxy's
address unless Express is told how many hops to trust:

- **Unset while behind a proxy** → every patient counts as the same client, and one heavy user
  rate-limits everyone. The 429 handler logs a distinctive warning naming `TRUST_PROXY` for
  exactly this reason.
- **Set while *not* behind a proxy** → `X-Forwarded-For` is caller-controlled, so the limiter is
  trivially bypassed.

Set it to the actual hop count (`1` for a single Nginx). `GET /health` reports the live value
alongside `rateLimit` and `corsOrigins`.

CORS restricts browser-driven abuse from other origins only — it does nothing against `curl` or a
script. The rate limiter, not CORS, is what protects the AvalAI bill.

`GET /health` reports current config plus truncation counters — check it before raising `OCR_MAX_TOKENS` or other limits blindly.

## Frontend (`khanesh/vite.config.js`)

Dev-only proxy: `/api` → `http://localhost:8787`. No `.env` file needed on the frontend.
