# Data Model: آپلود PDF برگهٔ آزمایش (017)

All state is client-side and in-memory. Nothing is persisted, and the server data shape does not change.

## SelectedPage (existing item in `Tafsir.jsx` `images` state — unchanged shape)

| field | type | note |
|---|---|---|
| `id` | string | unique per page |
| `dataUrl` | `data:image/jpeg;base64,…` | what the server receives; identical for photo and PDF pages |
| `sizeKB` | number | compressed size |
| `origKB` | number | photo: file size; PDF page: file size ÷ page count (rounded), display only |
| `source` | `"photo" \| "pdf"` | **new, optional**; UI only, never sent to the server |
| `label` | string? | **new, optional**; for PDF pages e.g. «report.pdf — صفحهٔ ۲ از ۳» |

Validation:
- `dataUrl` MUST start with `data:image/`. The server already drops anything else.
- The order of `images` is the order submitted. A PDF's pages are inserted contiguously, in document order.

## PageAllowance (derived, not stored)

`allowance = MAX_IMAGES − images.length`, recomputed before each file in a pick.

## IntakeOutcome (per picked file, transient)

| outcome | adds pages? | user sees |
|---|---|---|
| `added` (photo, 1 page) | yes | preview |
| `added` (pdf, n pages) | yes, all n | n previews |
| `refused: over_limit` | no | `pdf_over_limit` / `photo_over_limit` |
| `refused: password` | no | `pdf_password` |
| `refused: unreadable` | no | `pdf_unreadable` |
| `refused: empty` | no | `pdf_empty` |
| `refused: lib_failed` | no | `pdf_lib_failed` |
| `refused: image_decode` (existing) | no | existing iPhone message |

State transitions for one pick: `idle → busy(progress i/n) → idle`. While `busy`, the analyse button stays disabled (it already reads `imgBusy`). Messages for all refused files in one pick are joined into one `aiError`, one line per cause.

Invariant (FR-006): after a pick, `images.length_after − images.length_before` equals the sum of the page counts of the `added` files. No partial PDF is ever inserted.
