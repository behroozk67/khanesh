# Architecture

## Core Architecture Decision

**The LLM never decides what's abnormal or what it means — it only rewrites pre-computed structured findings into fluent Persian.**

This exists because `gpt-4o-mini` misunderstood lab patterns (e.g. suggested an iron-rich diet for macrocytic anemia, where iron is actually the wrong recommendation), and `gpt-4o` fixed that but cost ~35x more. The fix: a deterministic Node rules engine (`khanesh-server/rules/`) does all clinical reasoning; the LLM is downgraded to a formatting/translation role, so cheap models are safe to use again.

---

## Request Flow (`POST /api/analyze` in `server.js`)

1. **OCR (vision LLM), when images are uploaded** — `readImage()`/`readImages()` sends each lab-sheet photo to `VISION_MODEL` with a strict "extraction only, no interpretation" prompt (`OCR_PROMPT`). Retries with backoff on timeout/429/parse failure (`OCR_RETRIES`, capped by `OCR_MAX_TOKENS` — a real truncation incident set this number; don't raise it blindly).
2. **Page merge** — `mergePages()` dedupes tests across multi-page uploads (a lab sheet is usually 2–3 photos: hematology/biochemistry/urine), flags conflicting duplicate values, and detects patient mismatches (different age/sex across pages) to catch photos from two different people.
3. **`extracted_tests` built directly from OCR output** (`ocrToExtractedTests()`), never from the analysis LLM's output — the "what we read from your photo" list can't be altered or truncated by the second-stage model.
4. **Adapter → engine** (`rules/adapter.js`) maps free-text test names (English/Farsi, abbreviations) to canonical engine keys via `NAME_MAP`, converts units, infers patient age/sex when not given, and distinguishes `NEUT#` (absolute) from `NEUT%`, plus detects failed differential counts on the analyzer (very high WBC + collapsed diff % ≠ true neutropenia).
   **Urea is deliberately *not* converted to BUN** (commit `4de8ca4`): Iranian lab sheets usually report urea, so `tests.UREA` is kept as urea and graded against urea's own reference range. `ureaToBUN` (`÷2.14`) survives only as an internal helper for the BUN/Cr index. Don't reintroduce the conversion — it grades urea against a BUN range.
5. **Grading** (`rules/grade.js` + `rules/ctcae.js` + `rules/interpret.js`) — see [rules-engine.md](rules-engine.md) for the three grading modes.
6. **Pattern matching** (`rules/patterns.js`, `RULES` array + `runPatterns()`) looks across multiple graded tests for clinical patterns (e.g. low Hb + low ferritin + low MCV = iron-deficiency anemia) and assigns `overall_urgency` (`emergency` / `this_week` / `routine` / `none`). Multi-test clinical logic lives only here — single-test grading alone can't say "iron deficiency anemia."
7. **Text generation.** If the engine found zero patterns *and* zero abnormal tests, the API returns a canned normal-result response (`buildNormalResult()`) and never calls the LLM. Otherwise `ENGINE_SYSTEM_PROMPT` (`rules/prompt.js`) instructs the LLM to rewrite only `summary` + `interpretation` from each finding's `headline`/`must_say`: no invented tests, no changed numbers, no merged or dropped findings, and no "when/where to go" instruction. The model is sent **only** `headline`, `must_say`, `urgency`, `forbid`. `action`, `warnings` and `suggest` never reach it (2026-09-23, M188).
8. **Recommendations and safety nets** in `server.js` after the LLM responds.
   - **`general_recommendations` always comes from `buildEngineRecommendations()`.** The model's list, if it wrote one, only goes to the trace. The list carries **one** final instruction, picked by `pickFinalAction()`: the strongest `action` among the highest-urgency findings. From the other actions only unconditional timeline sentences are dropped; content, conditional sentences, test requests and specialist referrals stay. The `forbid` filter also runs inside `buildEngineRecommendations()`.
   - Findings the model dropped from `must_say` are force-appended, for `emergency` findings and for findings with a `key_number`.
   - `has_critical` always comes from the engine, never the model.

   The reason: LLM output has been observed to silently drop fields and to merge concurrent emergencies. On one real sheet the model dropped «بدون اتلاف وقت فوراً به اورژانس» from a list of 14 items.
9. **MedlinePlus enrichment** (`buildMedlineContext()`) — a keyword lookup (`TEST_MEDLINE_MAP`) fetches short public reference summaries from NLM MedlinePlus for extra grounding; sources are returned to the client for transparency.

---

## Legacy Non-Engine Path

`USE_ENGINE=false`, or any text-only request without an image, sends everything straight to the LLM using the older, more permissive `SYSTEM_PROMPT`, which asks the model to do its own severity judgment. Prefer the engine path for new clinical logic.
