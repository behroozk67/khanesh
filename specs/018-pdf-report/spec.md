# Feature Specification: PDF Report («دریافت PDF») for the Result Page

**Feature Branch**: `018-pdf-report` (spec directory; work continues on branch `recovery`)

**Created**: 2026-10-28

**Status**: Implemented

**Input**: User request: «بعد از تفسیر آزمایش، فرد بتواند تفسیرش را به‌صورت یک فایل PDF دریافت کند؛ خلاصهٔ تفسیر در نمای ساده، توصیه‌ها، سن زیستی، نمودار امتیازات بدن و نمودار نتایج نمای کل.»

## Decisions (confirmed by the user, 2026-10-28)

- **How the PDF is produced**: the browser's own print engine (`window.print()` → *Save as PDF*). No PDF library, no server round-trip, no new font. Reasons: Persian shaping and the self-hosted Vazirmatn stay exactly as on screen; the text remains selectable/searchable (a jsPDF or raster route loses that); and the clinical data never leaves the device — the same constraint as `analyzeJob.js` (results live in `localStorage`, the server keeps a job for 30 minutes).
- **Where it is generated**: entirely in the user's browser. No server endpoint, no headless Chromium, nothing clinical posted anywhere.
- **Layout**: one compact A4 sheet for a typical sheet. Long interpretations/recommendation lists flow onto a second page instead of being truncated — **no clinical text is ever cut** to hit a page count.
- **«نمودار نتایج نمای کل»** = the reference-range bars of the «نتایج شما» card, not the trend chart.
- **What is inside**: header (brand, patient name from the device profile, sex/age, sample date) · emergency banner when the engine flagged the sheet (never a green «all good») · summary + interpretation + recommendations (server text, unchanged) · biological age (PhenoAge) · body-system score radar with the same numbers as the dashboard · the results bars · the fixed disclaimer footer.
- **What is deliberately not inside**: the site chrome, the trend chart, the OCR/page warnings, derived indices, sources — the report is a summary, not the whole page.

## Current Behaviour (measured)

- `ResultView.jsx` renders the page; `ResultDashboard.jsx` renders the on-screen dashboard from `result._engine` (`tests`, `score`, `phenoAge`, `context`).
- Before this feature the only «download» on the page was `ResultDashboard`'s `onDownload` (raw data), and no print stylesheet existed anywhere (`@media print` count in `khanesh/src/*.css`: 0).
- Verified by printing an actual engine result (21 tests, score 83, urgency `this_week`, PhenoAge 45.7 vs 45): the report is 2 A4 pages — page 1 summary/interpretation/recommendations/PhenoAge/radar, page 2 the results chart. A 9-test all-normal sheet and a 6-test emergency sheet each fit on **1 page**.
- Emergency sheet: the score is `null` by rule (P97-ب); the report shows the reason (from `NO_SCORE_FA`) instead of a number, and the red banner uses the same text as the page (`resultModel.js` → `EMERGENCY_BANNER`).

## Implementation

| File | Role |
|---|---|
| `khanesh/src/ResultReport.jsx` | The A4 document. Print-only; mounted through a portal directly under `<body>` so no app layout can leak into the sheet. |
| `khanesh/src/ResultReport.css` | `@page A4`, page-break rules, the print isolation (`body.is-printing-report > *:not(#krep-root) { display:none }`), and the on-screen toolbar button style. |
| `khanesh/src/resultModel.js` | Extracted from `ResultDashboard.jsx`: the shared row/label/score helpers **and** the two fixed sentences (`EMERGENCY_BANNER`, `DISCLAIMER_FA`) so the page and the PDF cannot drift apart (N12-class). |
| `khanesh/src/ResultView.jsx` | The «دریافت PDF» button, the print lifecycle (font readiness → `print()` → restore title/body class on `afterprint`), and the portal mount. |

### Rules the report obeys

1. **Engine boundary**: no new threshold, verdict, or number is computed. Text comes from the server (`summary`/`interpretation`/`general_recommendations`, or `labmat.patientSection`); the radar and bars are geometry over `_engine.score` / `_engine.tests`; the biological age is `_engine.phenoAge` as-is.
2. **Clinical numbers stay Latin** (the patient must find the printed figure on the sheet); counts and scores are Persian — identical to the dashboard.
3. **No green «everything is fine» block**; the red strip appears only when the engine says the sheet is critical.
4. **No new clinical sentence.** The two fixed sentences live once, in `resultModel.js`, and are shared with `ResultView`.
5. **No network, no storage.** The report is rendered from the result already in memory and printed; nothing is uploaded.

### Print lifecycle (why it looks like this)

- The report is a portal child of `<body>`; `document.body.classList` gets `is-printing-report` for the duration, and the print CSS hides every other body child. This is what makes Ctrl+P from anywhere else still print the normal page.
- `document.title` is temporarily set to `آزمایار-تفسیر-آزمایش-<jalali date>` because the browser uses the document title as the PDF file name.
- We wait for `document.fonts.ready` and two animation frames before calling `print()`; otherwise Chrome's preview can render with a fallback font.
- We restore state on `afterprint` (Chrome/Firefox/Safari all fire it when the dialog closes), plus a 30 s safety timer. We do **not** restore immediately after `print()` returns: in Safari that call is not synchronous and an immediate unmount blanks the preview.
- Known limitation: the number of pages depends on the length of the interpretation; the design targets one page and does not truncate.

## Verification performed

- `npm run lint` and `npm run build` green (only the pre-existing `no-useless-escape`-class warnings are absent; no new warnings).
- Three real engine fixtures (21-test mixed / 9-test normal / 6-test emergency) printed through CDP `Page.printToPDF` and inspected page by page: Persian shaping correct, radar/score numbers match `_engine.score`, emergency sheet shows the banner and no score, surrounding app chrome is absent from every page.
- Click path exercised on the real `ResultView` with `window.print` stubbed: `print()` called exactly once, `body.is-printing-report` present during printing, report portal mounted, title set and restored afterwards.
