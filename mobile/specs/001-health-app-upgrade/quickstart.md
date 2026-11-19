# Quickstart / Verification

```bash
node scripts/sync-content.mjs                 # refresh vendored encyclopedia
node --experimental-strip-types src/lib/selfcheck.ts
npx expo lint
npx tsc --noEmit
npx expo start --web                          # smoke in Chrome at localhost:8081
```

- V1 Tabs: four tabs with Persian labels, RTL.
- V2 Intake: gallery pick adds a page thumbnail; PDF pick adds one thumbnail per page.
- V3 Analysis (needs `AUTH_REQUIRED=false node server.js` in khanesh-server): progress → result screen.
- V4 Result: score card, systems chart, trend, tests; «دریافت PDF» opens print dialog (web).
- V5 History: record listed; per-test chart.
- V6 Tests: search «فریتین» → page with site text.
- V7 Challenges: join, check in, progress 1/3.
