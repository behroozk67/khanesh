# Implementation Plan: آپلود PDF برگهٔ آزمایش

**Branch**: `017-pdf-upload` (spec dir; work continues on `recovery`) | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/017-pdf-upload/spec.md`

## Summary

Users can pick a PDF in the photo mode. On the device, each PDF page is rendered to a JPEG with the same size caps and encoding as a compressed photo, and appended to the existing page list. From there it follows the unchanged path: OCR → `mergePages` → adapter → engine. The page limit (5) counts photo and PDF pages together. It is checked against the PDF's page count before any rendering, and a file that does not fit is refused whole, with a Persian message. PDF code is a lazily loaded chunk (`pdfjs-dist` legacy build, pinned), so photo-only users download nothing new. No server, API, or engine change.

## Technical Context

**Language/Version**: JavaScript (ES modules), React 19, Vite 8. Node v26.5.0 for tooling (measured).

**Primary Dependencies**: new `pdfjs-dist@6.3.289` (exact pin, Apache-2.0, legacy build + worker via `?url`). See research R1–R2.

**Storage**: N/A (in-memory React state only).

**Testing**: no frontend test runner exists. Verification uses `npm run lint`, `npm run build` plus a chunk inspection, and a Playwright-MCP browser run over fixture PDFs (quickstart.md). The backend `npm test` must be unchanged.

**Target Platform**: mobile browsers (iOS Safari, including older versions, which is why the legacy build is used) and desktop browsers.

**Project Type**: web application. The change is frontend-only (`khanesh/`).

**Performance Goals**: a 2-page PDF ready to analyse in under 30 s on a mid-range phone (SC-001). Zero added bytes on the photo-only path (SC-005).

**Constraints**:
- Each rendered page stays within the existing caps (width ≤ 1200, ≤ 6 MP, JPEG 0.85).
- ≤ 5 pages total.
- No PDF text layer is ever read (FR-014).

**Scale/Scope**: 1 new module, 3 edited frontend files, 1 edited doc, 1 new dependency.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Status |
|---|---|---|
| I. Engine decides, model only speaks | No clinical logic touched. The OCR model receives the same image type as today. | ✅ pass |
| II. Missing ≠ normal; no silent drop | The intake equivalent is FR-006: no partial PDF, every refused file named, a page-count invariant (data-model). A blank page still goes to OCR, and the existing "nothing read" handling applies. | ✅ pass |
| III. Measure, never quote | Library version, licence and worker CSP were measured (research). The build bundling of the legacy build is **not** assumed: quickstart Q6 verifies it. | ✅ pass (verification deferred to implementation, named) |
| IV. Fix locked by a failing test | This is not a bug fix, and no engine change means no `engine.test.js` entry. The backend suite must stay identical (SC-006). | ✅ N/A |
| V. Persian; privacy caveat | All new strings are Persian (contract). `notes.md` and the `compressImage` comment are updated to cover PDF pages. No redaction claim is made. | ✅ pass |
| Workflow: frontend clinical text | No clinical text is added; only intake messages. Browser verification is required (quickstart). | ✅ pass |

Post-design re-check: unchanged, all pass. No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/017-pdf-upload/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R9
├── data-model.md
├── quickstart.md
├── contracts/pdf-intake.md
└── checklists/requirements.md
```

### Source Code

```text
khanesh/
├── package.json                 # + "pdfjs-dist": "6.3.289" (exact)
└── src/
    ├── imageIntake.js           # + looksLikePdf(); extract fitScale() + encodeCanvas() shared with compressImage (behaviour unchanged)
    ├── pdfIntake.js             # NEW, lazy: openPdf(file) → { numPages, renderPage(i), close() }; magic-byte check; error codes
    ├── Tafsir.jsx               # onFile: page-counted allowance, per-file in pick order, dynamic import, progress i/n, Persian messages
    └── UploadCard.jsx           # accept="image/*,application/pdf,.pdf"; dropzone copy + progress text
.claude/rules/notes.md           # privacy caveat covers PDF pages
```

Untouched by design: `khanesh-server/**`, `analyzeJob.js`, `ResultView.jsx`.

**Structure Decision**: the existing two-project layout. All code changes are in `khanesh/src`. The PDF code is isolated in one lazily imported module, so it can be removed or swapped without touching the photo path.

## Implementation order (for /speckit-tasks)

1. Refactor `imageIntake.js` (`fitScale`, `encodeCanvas`, `looksLikePdf`). Verify: lint, plus a photo upload in the browser looks identical (same `sizeKB` for the same file).
2. Add the dependency and `pdfIntake.js`. Verify: `npm run build`, and Q6 (separate chunk).
3. Rewrite `onFile` in `Tafsir.jsx` (allowance, order, progress, messages). Verify: Q1, Q3, Q4, Q5, Q8.
4. Change the `UploadCard.jsx` copy and `accept`. Verify: Q1 on a phone-size viewport.
5. Update `notes.md` and the privacy comment. Verify: Q9 (request body).
6. Gates: `npm run lint`, `npm run build`, and backend `npm test` with the count unchanged from the pre-change working tree.

## Risks

- **Legacy build plus Vite 8 target**: may need `optimizeDeps`/`build.target` tweaks. This is found at step 2, not guessed.
- **Low-memory phones on large pages**: each page is rendered and released one at a time (`page.cleanup()`, canvas reset), never all at once.
- **The behaviour change for over-limit photo batches** (research R6): it is a deliberate decision, and the message names the dropped files.

## Complexity Tracking

None.
