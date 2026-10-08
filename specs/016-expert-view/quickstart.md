# Quickstart: validating the Expert View (specs/016)

## Prerequisites

- `khanesh-server/node_modules` and `khanesh/node_modules` installed.
- No `.env` needed for the engine-level checks. A browser check needs the backend on its own port so it does not collide with the user's servers on 8787 / 5173.

## 1. Engine-level (no server)

```bash
cd khanesh-server
node --test rules/expert.test.js
```

Expected: every test green. Then the panels below, through `runEngine` → `runPatterns` → `healthScore` → `buildExpertView` with `patient: { sex: "M", age: 45 }` (sex and age go **under `patient`**, N32):

| Panel | What to check |
|---|---|
| PT 14 · INR 1.2 | one finding `coagulation_abnormal` (by label), triggers PT and INR with both ranges, `urgency_fa` «این هفته», `suggest` non-empty |
| Ca 7.2 (printed range 8.5–10.5) · albumin 2.5 · creatinine 2.1 · Na 138 · Cl 100 · HCO3 18 | calcium row has `printed` 7.2 and `derived_from` albumin correction; indices show eGFR, anion gap and its albumin-corrected value, each with `method_fa` |
| K 7.0 + Hb 9.5 · MCV 70 · ferritin 6 | `hidden` lists the demoted anaemia findings with no action/warnings; the emergency finding is first |
| K 7.0, `conditions: ["hospitalized"]` | no outpatient phrase anywhere in the object |
| Hb 14 only | no findings; `tests` has one row; `score` present or `null` per P97 rules |
| Unitless urea 150 | a «بدون حکم» row with the printed value |

## 2. Full suite and lint

```bash
cd khanesh-server && npm test
cd ../khanesh && npm run lint && npm run build
```

Expected: the backend suite at the measured baseline plus the new tests, 0 fail; lint exit 0; build OK.

## 3. Browser (manual path)

1. Start a backend on a free port and Vite pointed at it.
2. Enter PT 14 and INR 1.2 manually, submit.
3. The page opens in «ساده», identical to before.
4. Switch to «تخصصی»: the coagulation finding shows PT and INR, ranges, «این هفته», suggested tests, sources (or «منبعِ منتشرشده‌ای به این قاعده پیوست نیست»), and the score breakdown with «انعقاد ۷۵».
5. Reload: the page stays on «تخصصی». In a private window it opens on «ساده».
6. The urgency banner and the context line look the same in both modes.

## 4. Pro batch

```bash
node -e "import('./khanesh-server/rules/patterns.js').then(m=>console.log(m.RULES.filter(r=>r.pro).length))"
```

Expected: ≥ 20 (target 30), and every id in the batch list of research R7 present; each is recorded in `MEDICAL_RULES.md` P100.
