# Research: آپلود PDF برگهٔ آزمایش (017)

Measured 2026-10-16 on the working tree (branch `recovery`). Node `v26.5.0`.

## R1 — Which PDF renderer

- **Decision**: `pdfjs-dist`, pinned to the **exact** version `6.3.289` (published 2026-08-29), using its **legacy** build (`pdfjs-dist/legacy/build/pdf.mjs`).
- **Rationale**:
  - It is Mozilla's renderer (Firefox's built-in viewer), licensed Apache-2.0 (checked with `npm view pdfjs-dist license`). That licence is compatible with this project.
  - It runs entirely in the browser, so FR-010 holds: no server change.
  - `npm view pdfjs-dist time` shows the newest release, `6.4.299`, is from 2026-10-03, 13 days old. `6.3.289` has had seven weeks to collect fixes. The pin is exact (no `^`) so a lockfile refresh cannot move it silently.
  - The modern build uses recent JS built-ins (e.g. `Promise.withResolvers`). Older iPhones in use in Iran lack those. The legacy build is the one pdf.js itself ships for older browsers, and it costs some bundle size. FR-013 makes that cost lazy anyway (R3).
- **Alternatives considered**:
  - Server-side rendering (`pdfjs-dist` + `@napi-rs/canvas`, or `mupdf`): rejected. It breaks FR-010, adds a native dependency to the deploy, and uploads the full PDF (larger than the compressed pages).
  - `mupdf` WASM in the browser: rejected. It is AGPL, and the WASM payload is larger.
  - Asking users to screenshot: this is the status quo the feature removes.

## R2 — Worker setup with Vite 8

- **Decision**: `import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"`, then `GlobalWorkerOptions.workerSrc = workerUrl` inside the lazily loaded module.
- **Rationale**: Vite's `?url` emits the worker as a hashed static asset served from the same origin. No CDN is involved, and `deploy/nginx.conf` sets no CSP, so nothing blocks a same-origin worker. Measured: `grep -i "content-security|worker-src" deploy/nginx.conf khanesh/index.html` found nothing.
- **Alternatives considered**:
  - Loading the worker from a CDN: rejected because of the third-party dependency, and because it fails on networks that filter CDNs.
  - Disabling the worker (main-thread parsing): rejected because it freezes the UI on large files, which breaks FR-008.
- **Open risk, to verify during implementation rather than assume** (Principle III): that `npm run build` bundles the legacy build and worker without a target error. The check is `npm run build` plus a real file in the browser (quickstart Q1).

## R3 — Keep photo-only users unaffected (FR-013)

- **Decision**: All PDF code lives in a new module, `khanesh/src/pdfIntake.js`. That module is reached only through `await import("./pdfIntake.js")` and only when a picked file is detected as a PDF.
- **Rationale**: Vite splits a dynamic import into its own chunk, so `pdfjs-dist` and its worker are never fetched on a photo-only path. Verify by building and checking that the entry chunk does not contain `pdfjs` (quickstart Q6).
- **Alternative considered**: a static import. Rejected because it adds several hundred KB to the `/app` route, which is deliberately not lazy.

## R4 — Detecting a PDF

- **Decision**: A file is treated as a PDF when `file.type === "application/pdf"`, **or** when the type is empty and the name ends in `.pdf`. Before parsing, the first 5 bytes must equal `%PDF-`. If they don't, the file is reported as "not a readable PDF" (FR-007, case 4). The image path is never used as a fallback.
- **Rationale**: `imageIntake.js` already records that iPhone file pickers can leave `file.type` empty (`looksLikeImage` falls back to the extension). The magic-byte check catches a renamed file before pdf.js reports a generic error.

## R5 — Page → image, and the size caps

- **Decision**: Render each page into a canvas at the same caps `compressImage` applies (width ≤ `MAX_WIDTH` 1200, area ≤ `MAX_PIXELS` 6 MP). The scale is computed from the page's own viewport. Encode with the same `toDataURL("image/jpeg", JPEG_QUALITY)`.
  - Implementation detail: extract the scale computation (`fitScale(w, h)`) and the encode step from `compressImage` into shared helpers in `imageIntake.js`. Both paths then use one rule (N3's "two parsers, one rule" lesson applied to sizing).
  - Fill the canvas white before rendering. pdf.js leaves transparent areas, and JPEG turns transparency black, so an unfilled canvas produces a black page.
- **Rationale**: FR-003 says PDF pages are indistinguishable downstream. Rendering from vector at the target size is at least as sharp as a downscaled photo. The server already accepts these `data:image/jpeg` strings (`server.js` keeps `startsWith("data:image")`).
- **Alternative considered**: render at 2× and then pass the result through `compressImage`. Rejected because it decodes twice for no gain.
- **Correction found in implementation (measured 2026-10-16).** "Same caps" was not enough. `fitScale` never scales above 1, which is right for photos. A PDF page at scale 1 is 72 dpi, though, so A4 rendered at 595×842 and 12-pt text came out about 12 px tall. `fitScale` now takes `{ upscale: true }` for vector pages, and A4 renders at 1200×1698. Photos keep the cap; outputs were verified byte-identical in T019.
- **Deploy consequence (R2 addendum)**: pdf.js starts the worker as a module worker (`type: "module"`), so it must be served with a JavaScript MIME type. `deploy/nginx.conf` now maps `.mjs` explicitly, because older nginx `mime.types` files don't.

## R6 — Page limit with mixed selections (FR-004, FR-005, FR-006)

- **Decision**: Count pages, not files. A photo is 1 page; a PDF is its `numPages`, read **before** any page is rendered. Files are processed in pick order. A file is added whole if it fits the remaining allowance; otherwise it is refused whole, with a message.
- **Behaviour change from today, stated so it is a decision and not an accident**: today an over-limit *photo* batch is refused entirely with «حداکثر ۵ عکس…». With page counting, the photos that fit are added and the rest are named as refused. Nothing is silent, so FR-006 holds. The old message's word «عکس» becomes «صفحه», because PDF pages now count too.
- **Alternative considered**: refuse the whole batch if the total exceeds the limit. Rejected because a user who picks a 1-page PDF and 6 photos would lose the PDF for a reason unrelated to it.

## R7 — Failure taxonomy (FR-007)

pdf.js raises named exceptions. The mapping below is checked against the pinned version during implementation, not assumed.

| Cause | Detection | Message key |
|---|---|---|
| password | `PasswordException` from `getDocument().promise` | `pdf_password` |
| damaged | `InvalidPDFException` / `FormatError` / any other load error | `pdf_unreadable` |
| not a PDF | magic bytes ≠ `%PDF-` | `pdf_unreadable` |
| no pages | `numPages === 0` | `pdf_empty` |
| over limit | `numPages > allowance` | `pdf_over_limit` |
| library failed to load (offline, chunk 404) | `import()` rejects | `pdf_lib_failed` |
| one page fails to render | render promise rejects | the whole PDF is refused as `pdf_unreadable`. Partial pages are never added (FR-006) |

The texts are in [contracts/pdf-intake.md](contracts/pdf-intake.md).

## R8 — Privacy (FR-012, FR-014)

- **Decision**:
  - Only rendered JPEG pages leave the device.
  - `getTextContent` is never called.
  - Update `.claude/rules/notes.md` (the "Known limitation" bullet) and the privacy comment above `compressImage` to say the same caveat applies to PDF pages.
  - No user-facing copy claims redaction.
- **Rationale**: Constitution V explicitly forbids repeating the "we never send identifiers" claim without the image caveat.

## R9 — Verification without a frontend test runner

- **Decision**: The frontend has no tests (constitution: Development Workflow). Verification is:
  1. `npm run lint` in `khanesh/`;
  2. `npm run build` and an inspection of the chunk split;
  3. a browser run with the Playwright MCP over the fixture PDFs in quickstart.md;
  4. `npm test` in `khanesh-server/`, which must be unchanged (SC-006), because no server file changes.
- No clinical test is added: no engine behaviour changes (Principle IV applies to fixes; this is a frontend input path).
