# Tasks: آپلود PDF برگهٔ آزمایش

**Input**: Design documents from `specs/017-pdf-upload/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/pdf-intake.md](contracts/pdf-intake.md), [quickstart.md](quickstart.md)

**Tests**: The spec does not request automated tests, and the frontend has no test runner. Verification is per-task commands plus the browser scenarios Q1–Q9 in quickstart.md. No `engine.test.js` entry is added, because no engine behaviour changes.

**Organization**: Tasks are grouped by user story so each can be implemented and verified on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 from spec.md
- All paths are repo-relative. Frontend commands run inside `khanesh/`; backend commands run inside `khanesh-server/`.

## Path Conventions

- Frontend: `khanesh/src/`
- Docs: `.claude/rules/`
- No `khanesh-server/` file changes in this feature (FR-010)

---

## Phase 1: Setup

**Purpose**: Record the baseline and add the dependency.

- [X] T001 Measure and record the pre-change baseline on the working tree. Run `npm test` in `khanesh-server/` (tests · pass · fail) and `npm run lint` in `khanesh/` (warnings · errors). Write the numbers, the date, and "working tree, branch recovery" into `specs/017-pdf-upload/baseline.txt` (Principle III: measured, never quoted).
- [X] T002 Add `"pdfjs-dist": "6.3.289"` (exact, no caret) to `dependencies` in `khanesh/package.json` with `npm install pdfjs-dist@6.3.289 --save-exact` inside `khanesh/`. Confirm `khanesh/package-lock.json` resolves exactly 6.3.289 and that `node_modules/pdfjs-dist/legacy/build/pdf.mjs` and `pdf.worker.min.mjs` exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared sizing/encoding helpers and the lazy PDF module that every story uses.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [X] T003 Refactor `khanesh/src/imageIntake.js` without changing photo behaviour:
  - Extract `export function fitScale(w, h, maxWidth = MAX_WIDTH)`, returning `Math.min(1, maxWidth / w, Math.sqrt(MAX_PIXELS / (w * h)))`. This is the same arithmetic as the current `widthScale`/`areaScale` lines.
  - Extract `export function encodeCanvas(canvas, quality = JPEG_QUALITY)`, returning `canvas.toDataURL("image/jpeg", quality)`.
  - Make `compressImage` call both.
  - Export `MAX_WIDTH`, `MAX_PIXELS` and `JPEG_QUALITY`.
  - Keep every existing comment, including the privacy comment.
- [X] T004 Add `export function looksLikePdf(file)` to `khanesh/src/imageIntake.js`. It returns true when `file.type === "application/pdf"`, or when `!file.type && /\.pdf$/i.test(file.name || "")` (research R4). Add a Persian comment explaining the empty-MIME iPhone case, like the one on `looksLikeImage`.
- [X] T005 Create `khanesh/src/pdfIntake.js` per [contracts/pdf-intake.md](contracts/pdf-intake.md):
  - Import `{ getDocument, GlobalWorkerOptions }` from `pdfjs-dist/legacy/build/pdf.mjs`, and `workerUrl` from `pdfjs-dist/legacy/build/pdf.worker.min.mjs?url`. Set `GlobalWorkerOptions.workerSrc = workerUrl`.
  - Export a `class PdfIntakeError extends Error` with `.code` set to `"password" | "unreadable" | "empty"`.
  - `export async function openPdf(file)`:
    - Read `file.arrayBuffer()`. If the first 5 bytes are not `%PDF-`, throw `unreadable`.
    - Call `getDocument({ data, isEvalSupported: false })`. Map `PasswordException` → `password` and any other load error → `unreadable` (check the exception `name` values against the installed 6.3.289 source; don't assume them).
    - If `numPages === 0`, throw `empty`.
    - Return `{ numPages, renderPage(i), close() }`.
  - `renderPage(i)`:
    - Get the viewport at scale 1, then rescale with `fitScale(vp.width, vp.height)`.
    - Create the canvas and fill it white (`fillStyle="#fff"; fillRect`).
    - Render, then `encodeCanvas`.
    - In `finally`: `page.cleanup()` and set canvas width/height to 0.
  - `close()` calls `doc.destroy()`.
  - Never call `getTextContent` (FR-014). Write a Persian header comment stating that, and the privacy caveat.
- [X] T006 Run `npm run build` in `khanesh/` and resolve any legacy-build/target errors in `khanesh/vite.config.js` (research R2 open risk). Change only what the error requires, and record the change and the reason in a comment. Verify with quickstart Q6: `grep -l pdfjs khanesh/dist/assets/index-*.js` returns nothing, and a separate chunk plus a `pdf.worker` asset exist. Note: until T008 imports the module, the chunk may not exist yet. Re-run this check in T018.

**Checkpoint**: the helpers exist, the photo path is unchanged, and the lazy module builds.

---

## Phase 3: User Story 1 — Upload a PDF of my lab sheet (Priority: P1) 🎯 MVP

**Goal**: picking a PDF that fits the limit adds one preview per page, in order, and the analysis runs exactly as for photos.

**Independent Test**: quickstart Q1 + Q2 + Q8 + Q9. A 2-page PDF gives 2 ordered previews, the analysis succeeds, `extracted_tests` matches the photos of the same sheet on ≥ 95 % of rows, a landscape page is not black, and the request carries only `data:image/jpeg`.

- [X] T007 [P] [US1] In `khanesh/src/UploadCard.jsx`:
  - Change the input to `accept="image/*,application/pdf,.pdf"`.
  - Change the empty-dropzone main text to «عکس یا PDF برگهٔ آزمایش را انتخاب کنید».
  - Change the sub text to «اگر برگه چند صفحه است، همه را با هم انتخاب کنید (حداکثر {max} صفحه)», with `max` = `toFaDigits(MAX_IMAGES)` (import `MAX_IMAGES` from `./imageIntake.js`; use the existing `toFaDigits` import or add it from `./digits.js` the way other files do).
  - Accept a new prop `imgProgress` (`{i, n} | null`). While `imgBusy` and `imgProgress` is set, show «در حال آماده‌سازیِ صفحهٔ {i} از {n}…» (Persian digits) instead of «در حال آماده‌سازی…».
- [X] T008 [US1] In `khanesh/src/Tafsir.jsx` `onFile`, add the PDF branch:
  - Add state `const [imgProgress, setImgProgress] = useState(null)` and pass `imgProgress` to `UploadCard`.
  - For each picked file in order: if `looksLikePdf(f)`, lazy-load with `const { openPdf } = await import("./pdfIntake.js")` (a rejected import → message `pdf_lib_failed`). Call `openPdf(f)` and render pages `1..numPages` sequentially, calling `setImgProgress({i, n})`. Collect the pages into a local array of `{ id, dataUrl, sizeKB, origKB: Math.round(f.size / 1024 / numPages), source: "pdf", label: \`${f.name} — صفحهٔ ${toFaDigits(i)} از ${toFaDigits(n)}\` }`, and push them into `out` only after **all** pages have rendered. Any render error discards that PDF's pages (FR-006) and records `pdf_unreadable`.
  - Always call `close()` in `finally`, and clear `imgProgress` in the outer `finally`.
  - Mark photo items with `source: "photo"`.
  - Skip state updates when `!mountedRef.current` (StrictMode/unmount, N11).
- [X] T009 [US1] In `khanesh/src/UploadCard.jsx`, show each page's `label` (when present) as the preview's `alt`/caption, so PDF pages are identifiable. Keep the existing remove/move controls working unchanged for PDF-origin pages (FR-009).
- [X] T010 [US1] Run `npm run lint` in `khanesh/` (0 errors; warnings no higher than the T001 baseline). Then run quickstart Q1, Q2, Q8, Q9 in the browser with the Playwright MCP against `npm run dev` + `node server.js`, and record the observed results (counts, the row-match %, the request-body check) in `specs/017-pdf-upload/baseline.txt`.

**Checkpoint**: MVP. A PDF within the limit works end to end.

---

## Phase 4: User Story 2 — Mix photos and PDF pages, with a clear page limit (Priority: P2)

**Goal**: the limit of 5 counts pages across photos and PDFs. Each file is added whole or refused whole, with its reason named.

**Independent Test**: quickstart Q3 + Q4. With 3 photos, a 4-page PDF is refused with the `pdf_over_limit` text showing ۴ / ۳ / ۵. With 1 photo, it is fully added (total ۵), and a further photo is refused with `photo_over_limit`.

- [X] T011 [US2] In `khanesh/src/Tafsir.jsx` `onFile`:
  - Remove the up-front `images.length + picked.length > MAX_IMAGES` refusal.
  - Track `let used = images.length` and process files in pick order. A photo needs 1 page. A PDF needs `numPages`, checked right after `openPdf` and **before** any `renderPage` (FR-004).
  - If `used + need > MAX_IMAGES`, refuse the file whole: for a PDF, `close()` it and record `pdf_over_limit` with `{name, n: numPages, k: used, max}`; for a photo, collect its name for `photo_over_limit`. Otherwise add it and do `used += need`.
  - Assert the data-model invariant in development (`console.assert` that the added count equals the sum of the added files' pages).
- [X] T012 [US2] In `khanesh/src/Tafsir.jsx`, replace the old «حداکثر … عکس. الان … صفحه انتخاب شده.» message with the contract texts:
  - `pdf_over_limit`: «فایل «{name}» {n} صفحه دارد و الان {k} صفحه انتخاب شده؛ حداکثر {max} صفحه می‌شود. چند صفحه را حذف کنید یا فقط صفحه‌های لازم را جدا کنید.»
  - `photo_over_limit`: «حداکثر {max} صفحه. این فایل‌ها اضافه نشدند: {names}.» (names joined with «، »)

  All numbers go through `toFaDigits`. Join the messages of one pick into a single `setAiError` string, one sentence per cause.
- [X] T013 [US2] Run `npm run lint` in `khanesh/`, then quickstart Q3 and Q4 in the browser. Confirm `images.length` after each pick matches the expectation, that no PDF is partially added, and that removing pages lets a previously refused PDF in (spec US2 scenario 3). Record the results in `specs/017-pdf-upload/baseline.txt`.

**Checkpoint**: US1 and US2 both work.

---

## Phase 5: User Story 3 — Understand why a PDF could not be used (Priority: P3)

**Goal**: a protected, damaged, empty or fake PDF, or a failed library load, each gives its own Persian message, and the page list stays unchanged.

**Independent Test**: quickstart Q5. `locked.pdf`, `broken.pdf` and `fake.pdf` give `pdf_password`, `pdf_unreadable` and `pdf_unreadable`, and `images` is unchanged. Simulating offline before the first PDF pick gives `pdf_lib_failed`.

- [X] T014 [US3] In `khanesh/src/Tafsir.jsx`, map `PdfIntakeError.code` and the import failure to the contract texts:
  - `pdf_password`: «فایل «{name}» رمز دارد و باز نشد. رمزش را بردارید یا از صفحه‌های برگه عکس بگیرید.»
  - `pdf_unreadable`: «فایل «{name}» به‌عنوان PDF باز نشد؛ شاید خراب باشد. از صفحه‌های برگه عکس بگیرید.»
  - `pdf_empty`: «فایل «{name}» هیچ صفحه‌ای ندارد.»
  - `pdf_lib_failed`: «ابزارِ خواندنِ PDF بارگیری نشد. اتصالِ اینترنت را بررسی کنید و دوباره امتحان کنید.»

  An unknown error falls back to `pdf_unreadable`, never to a raw `e.message`. Keep the existing iPhone image-decode message for photos only. Make sure a file that passes `looksLikePdf` never reaches the image path.
- [X] T015 [US3] Run quickstart Q5 in the browser with the Playwright MCP. For the offline case, block the pdfIntake chunk request (network route abort) before the first PDF pick. Confirm each message's text verbatim and that `images.length` is unchanged after each attempt. Record the results in `specs/017-pdf-upload/baseline.txt`.

**Checkpoint**: all three stories work independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 [P] Update `.claude/rules/notes.md`, the "Known limitation" bullet: PDF pages are rendered on the device and uploaded as images exactly like photos, including any name, national ID or stamp printed on them; the PDF text layer is never read or sent (FR-012, FR-014). Use the Edit tool only (Principle V: no PowerShell for Persian text).
- [X] T017 [P] Extend the privacy comment above `compressImage` in `khanesh/src/imageIntake.js` to say the same applies to PDF pages rendered by `pdfIntake.js`.
- [X] T018 Final gates. In `khanesh/`, run `npm run lint` and `npm run build`, then re-run quickstart Q6 (the entry chunk does not contain pdfjs; there is a separate chunk plus a worker asset) and Q7 (no pdfjs request on a photo-only flow). In `khanesh-server/`, run `npm test`: the counts must equal T001's numbers (SC-006). Quote the real outputs in `specs/017-pdf-upload/baseline.txt`.
- [X] T019 Re-run a photo-only upload of the same file used before T003 and confirm `sizeKB` is identical: the T003 refactor is behaviour-neutral.
- [X] T020 Update the File Structure block in `CLAUDE.md` with a one-line `pdfIntake.js` entry under `khanesh/src/`, and note in `.claude/rules/frontend.md` (Photo upload bullet) that `pdfIntake.js` is a lazy chunk with the page-counted limit.

---

## Dependencies & Execution Order

- **Setup (T001–T002)**: T001 first (baseline before any change), then T002.
- **Foundational (T003–T006)**: T003 → T004 (same file) → T005 (imports T003's helpers) → T006 (build).
- **US1 (T007–T010)**: T007 [P] can start in parallel with T008 (different files). T009 after T007. T010 last.
- **US2 (T011–T013)**: after US1 (same `onFile` in `Tafsir.jsx`). T011 → T012 → T013.
- **US3 (T014–T015)**: after US2 (same function). T014 → T015.
- **Polish (T016–T020)**: T016 and T017 [P] any time after T005. T018 and T019 after all stories. T020 last.

Story dependencies: US2 and US3 extend the same `onFile`, so they run after US1. Each is still independently verifiable by its own quickstart scenarios.

## Parallel Example

```text
# After Phase 2:
T007 (UploadCard.jsx copy/accept/progress)  ‖  T008 (Tafsir.jsx PDF branch)
# Polish:
T016 (.claude/rules/notes.md)  ‖  T017 (imageIntake.js comment)
```

## Implementation Strategy

1. **MVP**: Phases 1–3 (T001–T010). A single PDF within the limit works. Stop and validate with Q1/Q2/Q8/Q9.
2. Add US2 (page-counted limit across mixed selections), then validate Q3/Q4.
3. Add US3 (failure messages), then validate Q5.
4. Polish: privacy docs, final gates, CLAUDE.md map.

Commit points (only if asked to commit): after T010, T013, T015 and T020. The pre-commit hook runs `npm run lint` for `khanesh/` changes.
