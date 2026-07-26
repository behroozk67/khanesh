# Cross-Cutting Notes

- All backend user-facing strings and prompts are in Persian; keep new ones consistent with that.
- The frontend proxies `/api` to `localhost:8787` only in dev (`vite.config.js`); production presumably proxies via Nginx (see the 50MB body-limit comment in `server.js` — Express's `express.json({ limit: "60mb" })` is intentionally set higher than Nginx's limit, not lower).
- Patient-identifying fields (name, national ID, phone) are deliberately never captured by the OCR prompt or forwarded to the LLM — only age/sex.
- **Known limitation, stated so nobody over-claims it:** that guarantee covers the *extracted text*,
  not the *image bytes*. On the photo path the whole lab-sheet photo — patient name, national ID,
  doctor's stamp and all — is uploaded to AvalAI's vision model, a third-party gateway.
  `compressImage()` in `Tafsir.jsx` resizes, it does not crop or redact. So "we never send
  identifiers" is true of the OCR output and false of the upload. Don't repeat the short version in
  user-facing copy or a privacy policy without this caveat.
- Raw OCR text is attacker-controlled (whoever supplies the photo chooses what it says). It must
  never be interpolated into a prompt as instructions. The engine path only forwards structured,
  already-graded findings; the MedlinePlus block deliberately dropped its `sourceLine` echo for
  this reason (see the comment in `buildMedlineContext`). The legacy `USE_ENGINE=false` path does
  send raw text to the model by design — another reason not to run it in production.
- The backend has a regression suite: `khanesh-server/rules/engine.test.js`, run with `npm test` (`node --test`, no external deps). Its convention is one test per real fixed clinical bug, commented in Persian. Add a test there whenever you fix one — it must fail against the old behavior, or it locks in nothing. The frontend has no tests; verify UI changes by reading the code path.
