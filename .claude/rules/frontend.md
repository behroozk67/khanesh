# Frontend Structure (`khanesh/src/`)

- `App.jsx` — two routes: `/` (`Landing.jsx`, marketing page) and `/app` (`Tafsir.jsx`, the actual tool).
- `Tafsir.jsx` is a single large component with two independent input paths that both ultimately call `POST /api/analyze`:
  - **Manual entry** — a client-side `REF` object (its own copy of test metadata/ranges/categories, separate from the backend's `rules/`) drives a category-filtered form for typing in values directly.
  - **Photo upload** — client-side image compression (`compressImage()`, canvas-based, targets ~400KB per photo since mobile photos can be 8MB+) before sending as data URLs; HEIC decode fallback for iPhones via `<img>` since `createImageBitmap` often fails on HEIC.
  - Rendering reads `extracted_tests`, `_engine`, `has_critical`, `ocr_warnings`, `pages`, `sources` from the API response — the fields the backend safety-net guarantees will be present/correct even if the LLM's own JSON is malformed.

Keep `REF` (client-side, manual-entry only) and `khanesh-server/rules/` (server-side, authoritative) in sync when a test's range or label changes — they are two separate copies by design, not a shared source of truth.
