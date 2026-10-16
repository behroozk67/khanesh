# Quickstart: validating PDF upload (017)

## Prerequisites

- `khanesh-server/.env` with `AVALAI_API_KEY` (Q1/Q2 call the real OCR).
- Fixture PDFs in a scratch folder (never commit patient data):
  - `two-page.pdf`: a real 2-page sheet, plus photos of the same two pages
  - `four-page.pdf`
  - `locked.pdf`: password-protected
  - `broken.pdf`: a valid PDF truncated to half its bytes
  - `fake.pdf`: a text file renamed
  - `landscape.pdf`

## Run

```bash
cd khanesh-server && node server.js
cd khanesh && npm run dev        # http://localhost:5173/app/photo
```

## Scenarios

| # | Do | Expect |
|---|---|---|
| Q1 | pick `two-page.pdf` | 2 previews in order; progress «صفحهٔ ۱ از ۲»; analyse runs; result looks like a photo run |
| Q2 | analyse the photos of the same sheet | `extracted_tests` names/values match Q1 on ≥ 95 % of rows (SC-002) |
| Q3 | 3 photos, then `four-page.pdf` | nothing added; `pdf_over_limit` text with ۴ / ۳ / ۵ |
| Q4 | remove 2 photos (1 left), pick `four-page.pdf` again | all 4 pages added after the photo, total ۵; a further photo is refused with `photo_over_limit` |
| Q5 | `locked.pdf`, `broken.pdf`, `fake.pdf` one by one | three distinct messages (`pdf_password`, `pdf_unreadable` ×2); page list unchanged |
| Q6 | `npm run build`, then list `dist/assets` | `pdf.worker` asset and a separate chunk contain pdfjs; the entry chunk does not (`grep -l pdfjs dist/assets/index-*.js` → nothing) |
| Q7 | DevTools network, photo-only flow | no pdfjs/worker request (FR-013) |
| Q8 | `landscape.pdf` | preview keeps aspect ratio; not black (white fill) |
| Q9 | DevTools network on analyse | request body has only `data:image/jpeg` strings; no PDF bytes, no text layer (FR-014) |

## Gates

```bash
cd khanesh && npm run lint && npm run build
cd khanesh-server && npm test   # must equal the pre-change working-tree count: no server file changes (SC-006)
```

Record the baseline numbers from your own run, with the tree they came from (Principle III).
