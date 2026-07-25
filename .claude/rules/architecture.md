# Architecture

## Core Architecture Decision

**The LLM never decides what's abnormal or what it means — it only rewrites pre-computed structured findings into fluent Persian.**

This exists because `gpt-4o-mini` misunderstood lab patterns (e.g. suggested an iron-rich diet for macrocytic anemia, where iron is actually the wrong recommendation), and `gpt-4o` fixed that but cost ~35x more. The fix: a deterministic Node rules engine (`khanesh-server/rules/`) does all clinical reasoning; the LLM is downgraded to a formatting/translation role, so cheap models are safe to use again.

---

## Request Flow (`POST /api/analyze` in `server.js`)

1. **OCR (vision LLM), when images are uploaded** — `readImage()`/`readImages()` sends each lab-sheet photo to `VISION_MODEL` with a strict "extraction only, no interpretation" prompt (`OCR_PROMPT`). Retries with backoff on timeout/429/parse failure (`OCR_RETRIES`, capped by `OCR_MAX_TOKENS` — a real truncation incident set this number; don't raise it blindly).
2. **Page merge** — `mergePages()` dedupes tests across multi-page uploads (a lab sheet is usually 2–3 photos: hematology/biochemistry/urine), flags conflicting duplicate values, and detects patient mismatches (different age/sex across pages) to catch photos from two different people.
3. **`extracted_tests` built directly from OCR output** (`ocrToExtractedTests()`), never from the analysis LLM's output — the "what we read from your photo" list can't be altered or truncated by the second-stage model.
4. **Adapter → engine** (`rules/adapter.js`) maps free-text test names (English/Farsi, abbreviations) to canonical engine keys via `NAME_MAP`, converts units (e.g. urea → BUN via `÷2.14`), infers patient age/sex when not given, and distinguishes `NEUT#` (absolute) from `NEUT%`, plus detects failed differential counts on the analyzer (very high WBC + collapsed diff % ≠ true neutropenia).
5. **Grading** (`rules/grade.js` + `rules/ctcae.js` + `rules/interpret.js`) — see [rules-engine.md](rules-engine.md) for the three grading modes.
6. **Pattern matching** (`rules/patterns.js`, `RULES` array + `runPatterns()`) looks across multiple graded tests for clinical patterns (e.g. low Hb + low ferritin + low MCV = iron-deficiency anemia) and assigns `overall_urgency` (`emergency` / `this_week` / `routine` / `none`). Multi-test clinical logic lives only here — single-test grading alone can't say "iron deficiency anemia."
7. **Text generation** — if the engine found zero patterns *and* zero abnormal tests, the API returns a canned normal-result response (`buildNormalResult()`) without calling the LLM at all. Otherwise `ENGINE_SYSTEM_PROMPT` (`rules/prompt.js`) instructs the LLM to only rewrite the engine's `findings` into Persian — never invent tests, change numbers, merge/drop findings, or contradict `urgency`/`forbid`/`must_say` fields.
8. **Safety-net post-processing** in `server.js` after the LLM responds: rebuilds `general_recommendations` from the engine if missing/empty; force-appends any dropped `emergency`-urgency `must_say` text; strips recommendations that name a `forbid`den test. `has_critical` always comes from the engine, never the model — this exists because LLM output has been observed to silently drop fields or merge concurrent emergencies.
9. **MedlinePlus enrichment** (`buildMedlineContext()`) — a keyword lookup (`TEST_MEDLINE_MAP`) fetches short public reference summaries from NLM MedlinePlus for extra grounding; sources are returned to the client for transparency.

---

## Legacy Non-Engine Path

`USE_ENGINE=false`, or any text-only request without an image, sends everything straight to the LLM using the older, more permissive `SYSTEM_PROMPT`, which asks the model to do its own severity judgment. Prefer the engine path for new clinical logic.
