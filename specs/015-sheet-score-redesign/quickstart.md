# Quickstart: validating the sheet score redesign (015)

Prerequisites: `khanesh-server/node_modules` and `khanesh/node_modules` installed. No `.env` is needed.

## 1. Unit tests (backend)

```bash
cd khanesh-server
node --test rules/score.test.js
```

Expected: every test passes. The new tests (SC-001 PT/INR > 80, the emergency cap, buckets, the coverage reason, the 109-key table guard, the metamorphic sweeps, the narrow-range pH case) must each have been observed **red** on the pre-change `score.js`. Measure it by stashing `rules/score.js` and `rules/patterns.js` and re-running (Principle IV). Record the red count in the commit message.

## 2. Measured panels (the spec's table, re-run)

Re-run the probe from the spec's "Current Behaviour" section (`runEngine` → `runPatterns` → `healthScore(e, p)`). Expected after the change:

| Panel | Expected |
|---|---|
| base + PT 14 · INR 1.2 | value ≈ 96; coag system 75 (capped), others 100 |
| base + PT 14 · INR 1.2 · aPTT 36 | same coag bucket, value ≈ 96 |
| base + K 7.0 (emergency) | value ≤ 35 |
| base + ferritin 320 | value ≥ 95 (ferritin ≈ 0.995) |
| CBC only (Hb, WBC, PLT, MCV, RDW) | value null, reason `one_system`, blood system scored |
| pH 7.25 + 6 normal tests in ≥ 2 systems | pH points ≈ 0.50 (not 0.997) |

## 3. Full backend suite and frontend lint

```bash
cd khanesh-server && npm test
cd ../khanesh && npm run lint && npm run build
```

Expected: the backend shows `fail 0`, and the number reported is the one measured on this tree (not a quoted one). Lint shows 0 errors.

## 4. Frontend (read the code path, then a browser check)

- `ResultDashboard.jsx` contains no `systemScore` and no `0.65`/`0.35` constants (`grep`).
- With the dev servers running (`npm run dev` in both), submit the PT/INR panel manually. Expected:
  - the count line appears above the number;
  - the radar shows 5 systems;
  - coagulation shows 75 with «پایین‌ترین: INR»;
  - the number label reads «امتیازِ این برگه — خلاصهٔ مرورِ سریعِ همین برگه، نه حکمِ پزشکی».
- Submit a CBC-only panel. Expected: no number, and the `one_system` sentence naming «خون‌سازی».
