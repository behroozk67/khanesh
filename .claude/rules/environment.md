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
```

`GET /health` reports current config plus truncation counters — check it before raising `OCR_MAX_TOKENS` or other limits blindly.

## Frontend (`khanesh/vite.config.js`)

Dev-only proxy: `/api` → `http://localhost:8787`. No `.env` file needed on the frontend.
