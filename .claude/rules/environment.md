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
ALLOWED_ORIGINS=             # comma-separated CORS allowlist; empty = any origin. SET THIS IN PRODUCTION
TRUST_PROXY=                 # number of proxy hops (1 behind a single Nginx). See warning below
RATE_LIMIT_WINDOW_MIN=15     # rate-limit window for POST /api/analyze
RATE_LIMIT_MAX=20            # max /api/analyze requests per IP per window
```

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
