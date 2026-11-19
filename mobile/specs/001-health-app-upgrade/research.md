# Research: Azmayar App Upgrade

## R1 — Navigation
- **Decision**: expo-router JS `Tabs` in `src/app/(tabs)/`, root `Stack` for `result/[id]` and `test/[key]`.
- **Rationale**: Works identically on Android, iOS and web; RTL handled by React Navigation.
- **Alternatives**: Native tabs (platform look, but less control over Persian font/labels on web).

## R2 — PDF input
- **Decision**: `expo-document-picker` (installed) → base64 → a hidden renderer page running pdf.js
  (cdnjs, pinned `4.10.38`) that renders each page at 1200 px width to JPEG q≈0.85 and posts data
  URLs back. Native: `react-native-webview`; web: hidden `iframe` with the same HTML.
- **Rationale**: `/api/analyze/start` accepts only `imageDataUrls`; mirrors the web's `pdfIntake.js`
  caps. Works in Expo Go (webview is bundled).
- **Alternatives**: native PDF libraries (need dev build), server-side PDF (not supported).

## R3 — Haptics
- **Decision**: `expo-haptics` — `selectionAsync` page added, `impactAsync(Medium)` start,
  `notificationAsync(Success|Error)` result. Wrapped in try/catch; skipped on web.

## R4 — Charts
- **Decision**: `react-native-svg` hand-drawn line chart (score trend, test series with band) and
  horizontal bars (system scores). No chart library.
- **Rationale**: Three tiny charts; web site draws its own SVG the same way.

## R5 — PDF export
- **Decision**: `expo-print.printToFileAsync({ html })` + `expo-sharing.shareAsync`; web: `Print.printAsync({ html })`.
- **Rationale**: HTML gives correct Persian shaping/RTL for free; Vazirmatn via Google Fonts link.

## R6 — History storage
- **Decision**: AsyncStorage key `azmayar_history_v1` = array of records (≤50). Dedupe like the
  site's `scoreHistory.js`: same `_engine.context.sample_date`, or same signature (sorted
  `name:value` of extracted tests) ⇒ replace.
- **Rationale**: Server `/api/history` is paid-plan gated and the app has no login.

## R7 — Encyclopedia content
- **Decision**: `scripts/sync-content.mjs` copies the pure data modules (`labRefs.js`, `digits.js`,
  `testCatalog.js`, `testContent.js`, `testSearch.js`, `guideContent.js`, `sources.js`,
  `content/**`) into `src/content/khanesh/` with a generated header. The page-assembly logic of
  `TestPage.jsx` / `ExtraTestPage.jsx` (choosing which fields become which section) is ported
  into a small TS function rendering the same sections.
- **Rationale**: Identical text, no re-authoring; Metro bundles plain ESM JS.

## R8 — Challenges & reminders
- **Decision**: Fixed catalogue in `challenges.ts`; enrolment state in AsyncStorage; week starts
  Saturday local time; streak = consecutive completed weeks ending with the last finished week
  (current week counts once completed). Reminders via `expo-notifications` WEEKLY trigger
  (weekday 1=Sunday … 7=Saturday), 19:00 local, one per chosen day; cancelled on leave.
- **Rationale**: No server; local notifications work in Expo Go.

## R9 — Animation
- **Decision**: reanimated (installed): count-up score, card `FadeInDown` entering, pulsing
  progress ring, check-in scale "pop".
