# Cross-Cutting Notes

- All backend user-facing strings and prompts are in Persian; keep new ones consistent with that.
- The frontend proxies `/api` to `localhost:8787` only in dev (`vite.config.js`); production presumably proxies via Nginx (see the 50MB body-limit comment in `server.js` — Express's `express.json({ limit: "60mb" })` is intentionally set higher than Nginx's limit, not lower).
- Patient-identifying fields (name, national ID, phone) are deliberately never captured by the OCR prompt or forwarded to the LLM — only age/sex.
- The backend has a regression suite: `khanesh-server/rules/engine.test.js`, run with `npm test` (`node --test`, no external deps). Its convention is one test per real fixed clinical bug, commented in Persian. Add a test there whenever you fix one — it must fail against the old behavior, or it locks in nothing. The frontend has no tests; verify UI changes by reading the code path.
