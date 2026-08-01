# Khanesh / LabMate — Final Diagnostic Report

**Repository:** `C:\Users\surface\Desktop\khanesh-project`
**Branch:** `clinical/ddimer-coverage`
**HEAD:** `763c73d` — *"WIP: Backup state before LabMat 10-Agent Graph integration"*
**Date of review:** 2026-08-01
**Mode:** Diagnostic only — no project files were modified and no state-changing commands were executed during this review.

---

## 1. Validation performed

| Check | Result |
|---|---|
| Backend test suite (`node --test` in `khanesh-server/`) | **Failing** — `rules/geriatric.test.js` asserts fail (see §4) |
| Skipped tests (regression from prior session) | ~9 categories remain `# SKIP` (R7, M15, M16, M26, M28–M31, G2–G5, cardiac-coverage) |
| Full suite network behavior | `npm test` issues real AvalAI API calls (slow, not isolated) |
| Working tree integrity | Large uncommitted changes across two logical streams (split + hardening); staged and unstaged layers overlap |
| Git hygiene | Migration scripts partially staged then deleted; root-level backup binaries committed; empty files committed |

The single hard failure today is the new `geriatric.test.js`; the louder structural concern is the stack of uncommitted, cross-cutting changes that are only partly verified.

---

## 2. Architecture at a glance

```
UploadCard → Tafsir → POST /api/analyze[/start]
   → Two-stage OCR (AvalAI vision, retries, merge, 409→429 mapping, mismatch gate)
   → Deterministic rules engine (adapter → refs/grade/units/indices → patterns)
   → LabMat 10-Agent graph (LangGraph): context → {cbc, biochem, hormone, microbio} ∥
     → crossTest → diagnosis → evidence (≤1 re-loop) → {patient, doctor} → safety → final
   → jobStore (in-memory TTL, async poll) / direct response
```

**Core invariant (from `CLAUDE.md` and `.claude/rules/architecture.md`):** the deterministic rules engine owns all clinical judgment — abnormal/normal, severity, patterns. The LLM (AvalAI, OpenAI-compatible gateway) only rewrites the engine's findings into plain Persian prose. Raw engine keys (`HGB`, `LDH`, `BILI_T`) must never reach user-facing text; everything routes through `faName()` in `rules/names.js`.

The split into `patterns_*.js` modules preserves this boundary correctly; the `_new` modules were correctly wired into `RULES` during the in-progress session.

---
## 3. What is committed vs. uncommitted

### Committed (HEAD `763c73d`)
- The complete "10-Agent" LangGraph scaffold (`labmat-agents/`): `graph.js`, `state.js`, `llm.js`, `agents/layer1.js`, `agents/layer2.js`.
- `labmat-prototype/` including its full `node_modules/` (~6000 files, vendored) — a significant repo-bloat risk.
- `.agents/skills/impeccable/` tooling tree (vendored skill definitions and detector scripts).
- Extracted modules: `avalaiClient.js`, the MedlinePlus formatter, and prior clinical fixes (D-dimer, rhabdomyolysis, serology, names/ACR leakage, ESR).

### Staged but not committed (in `git status`)
- The patterns-split modules (`patterns_anemia/biochem/hematology/infectious/malignancy/nephrology/endocrine_rheum`) and the three `_new` modules.
- `labmat-agents/` graph/llm/layer files (new).
- Guideline docs (`anemia-guidelines.json/.md`, `biochem-guidelines.json/.md`, `critical-lab-values.md`, `lambda-kappa-guidelines.md`).
- `architecture.html`, `diagram.mmd`.
- Migration/patch scripts (`patch-*.js`, `fix*.cjs`, `recover.cjs`, `extract.cjs`, `skip_tests.cjs`) and print-only "tests" (`test-geriatric.js`, `test_mcV.js`) — these are staged as **additions** but then **deleted** in the unstaged layer (cleanup in flight).
- Root-level backups `original_server.js` (131 KB binary, encoding-mangled) and `original_server_utf8.js`.

### Unstaged on top of staging (the "active work" layer)
- **`refs.js`**: new `GERIATRIC_REFS` export wired into `getRef` / `getRefSource`.
- **`interpret.js`**: MCV/MCH classifiers switched from hardcoded numeric bands to dynamic `'lln'`/`'uln'` bands with `normal: true` flag.
- **`patterns.js`**: the three `_new` modules imported and spread into `RULES`; `runPatterns` hardened (`if (!rule?.id) continue;`, logged `catch`).
- **`server.js`**: `analyzeLimiter` added to `/api/labmat/analyze`; deterministic-engine fallback when the graph fails.
- **`labmat-agents/llm.js` + `agents/layer2.js`**: production-readiness edits (timeout / model-from-env / `max_tokens` / injectable fetch).
- **`rules/engine.test.js`**: modified (+70 lines) — likely un-skipping/updating the 9 skipped tests (incomplete).
- Deletions of the migration/patch/print-only scripts (cleanup).
- Untracked: `cline-report.md` (the prior diagnostic), `rules/geriatric.test.js` (the new, failing test).

---
## 4. The active break — `geriatric.test.js`

**Symptom:** `node --test rules/geriatric.test.js` fails:
```
AssertionError: MCV 101 should be normal for a 75yo male (range 82-102)
  + actual   'normocytic'
  - expected 'normal'
```

**Root cause analysis:** The in-progress `interpret.js` change correctly re-bands the MCV classifier against `'lln'`/`'uln'` and sets `normal: true` on the normocytic band. For MCV 101 with the geriatric range 82–102, the classifier returns `{ tag: 'normocytic', normal: true }`. The test, however, asserts `mcv.tag === 'normal'` (strictEqual). There is a **contract mismatch** between two valid designs:

1. The classifier keeps the descriptive tag (`normocytic`) and marks it normal via the `normal: true` flag — leaving it to `grade.js` (or downstream consumers) to treat `normal: true` as "in range."
2. The test expects the tag itself to be relabeled to `'normal'`.

These cannot both be true. The fix is one of:
- **(a)** Make `grade.js` honor the `normal: true` flag so any graded item carrying it is reported as `normal` (and adjust the test to assert `mcv.normal === true` rather than `mcv.tag === 'normal'`), **or**
- **(b)** Have the classifier relabel `tag` to `'normal'` when `normal: true` (which loses the descriptive `normocytic` value that downstream patterns may rely on).

**Recommendation:** Option (a) is cleaner and preserves the classifier's descriptive tag for pattern-matching, while `grade.js` already recognizes `normal`/`normocytic`/`normochromic` as normal names — but the dynamic-banding change means the name may no longer be in that allowlist, so the flag must be authoritative. This must be verified against `grade.js`'s normal-detection logic before committing.

The companion assertion in the same test (`Hb 12.3 → normal`) was not flagged as failing, so the HGB geriatric override path is working; the break is isolated to the MCV/MCH classifier/grade interaction.

## 5. High-severity findings (status-checked against current tree)

### H1 — Three `_new` rule files were dead code → NOW BEING WIRED (in-progress)
`RULES_BIOCHEM_NEW`, `RULES_NEPHROLOGY_NEW`, `RULES_ENDOCRINE_NEW` were never imported. The unstaged `patterns.js` change imports and spreads all three into `RULES`. This **activates the previously-silent emergency rules**: amylase ≥500, bilirubin ≥15, creatinine ≥5, urea ≥200 / BUN ≥100.
- **Risk:** newly-active rules need test coverage that does not yet exist; verify they don't double-fire or mis-rank against existing rules.

### H2 — 9 `test.skip` entries hide real clinical regressions → PARTIALLY ADDRESSED
`engine.test.js` was edited (+70 lines) but the live run still shows the skips in place. The skipped scenarios and their current status:

| Skipped test | Current behavior | Assessment |
|---|---|---|
| M16 microcytic anemia (Hb 9, MCV 70, RBC 4) | only `unmatched_abnormal[routine]` | **Regression** — `anemia_microcytic_ida` needs ferritin/TIBC/(RDW+MCH); plain CBC microcytic anemia has no interpretation |
| M31 ESR elevated (85 / 120) | only `unmatched_abnormal[routine]` | **Regression** — `esr_elevated` rule was deleted in the split (adapter still maps ESR, `esrRef` still grades it — only the interpretation rule is gone) |
| G2 ferritin 45 + CRP | only `crp_elevated` | **Regression** — iron-depletion unmasking lost |
| R7 reticulocyte hemolysis | no pattern | Regression (rule removed from hematology split) |
| M15 D-dimer under blocker | both `maha_ttp_suspicion` and full `d_dimer_elevated` | Behavior changed (short/brief form no longer applies); skip obscures intent |
| M28 emergency in both units | WBC 258 and 258000 both → `extreme_leukocytosis[emergency]` | Skip is **unnecessary** — behavior actually passes; can un-skip |
| G4 EDTA low platelet | unverified | Coverage lost |

### H3 — `RULES` array cleanliness
The `if (!rule?.id) continue;` guard in the unstaged `runPatterns` mitigates holes/junk objects in `RULES`, but the underlying array should still be audited — the guard prevents crashes but masks malformed entries.

### H4 — `llm.js` production-readiness → IN PROGRESS
`labmat-agents/llm.js` was modified (timeout / model-from-env / `max_tokens` / injectable fetch). The specific changes need verification against the criteria: (1) timeout on the fetch, (2) model sourced from env, (3) `max_tokens` set, (4) truncation tracking, (5) injectable fetch for tests.

### H5 — No deterministic fallback when the graph fails → NOW ADDRESSED (in-progress)
The unstaged `server.js` change adds a `runEngine` + `runPatterns` + `generateInterpretation` fallback inside the `/api/labmat/analyze` `catch` block. Verify the fallback's response shape matches what the frontend (`Tafsir.jsx` / `analyzeJob.js`) expects, and that `fallback: true` is consumed correctly.

### H6 — `/api/labmat/analyze` unthrottled → NOW ADDRESSED (in-progress)
`analyzeLimiter` added to the route. Verify it matches the existing limiter pattern on `/api/analyze`.

---
---
## 6. Medium / low-severity findings

- **`skip_tests.cjs` was a test-file mutator** (string replacement on `engine.test.js`) — being deleted in the cleanup layer; confirm it is fully removed and that no CI/local hook still references it.
- **Print-only "tests"** `test-geriatric.js` and `test_mcV.js` (zero assertions) counted as passing files — being deleted; replace with real `node:test` cases if the scenarios matter.
- **Empty staged files:** `critical-lab-values.md`, `lambda-kappa-guidelines.md` (0 bytes) — remove from staging.
- **Root-level backups in git:** `original_server.js` (131 KB binary, encoding-mangled) and `original_server_utf8.js` — should not be tracked; move out of the repo or onto a branch.
- **Repo bloat:** `labmat-prototype/node_modules/` (~6000 files) committed in HEAD. Consider a `.gitignore` + `git rm --cached` sweep.
- **Encoding fragility:** Git warns LF→CRLF on the new `rules` files, and some show mojibake when decoded as UTF-8 (e.g. `patterns.js` comments) — mixed encodings risk silent corruption on future edits.
- **Frontend bundle:** `ExtraTestPage` chunk is ~595 kB (gzip 142 kB), over Vite's 500 kB advisory — a lazy-load candidate.
- **`jobStore`:** in-memory; `MAX_JOBS` eviction removes only *finished* jobs, so an all-running burst can exceed the cap. TTL 30 min.
- **Rate-limit coupling:** with `TRUST_PROXY` unset behind Nginx, all traffic shares one client IP and a heavy user blocks everyone — documented, but worth an explicit production config check.
- **Geriatric refs reconciliation:** engine `refs.js` now has `GERIATRIC_REFS`; the client `labRefs.js` was modified (+7 lines) — confirm the two stay aligned.

---

## 7. What is genuinely good

- The deterministic engine boundary is preserved through the split; `serializeGraded` / `engineDebug` keep raw test keys away from patients.
- Async job flow with real progress (`pagesDone`), TTL sweep with `.unref()`, and client resume-after-reload.
- Privacy-conscious upstream error logging (status/length only; patient data never echoed).
- `safeParseJson` recovery chain (code fences → trailing commas → truncated JSON).
- `PATIENT_MISMATCH` gate with explicit, user-confirmed bypass and stable `code`.
- Agent prompts consistently assert the engine boundary and forbid inventing Thalassemia/IDA when markers are normal.
- The patterns split is structurally sound (one module per body system, shared `patterns_utils.js`), and the `_new` wiring is the correct response to the dead-code finding.

---

## 8. Recommended next steps (prioritized)

1. **Resolve the geriatric classifier/grade contract (§4).** Decide whether `normal: true` is authoritative in `grade.js` (preferred) or the tag relabels to `'normal'`; update `geriatric.test.js` accordingly. Get `node --test rules/geriatric.test.js` green.
2. **Verify the newly-wired `_new` emergency rules (H1).** Add tests for amylase ≥500, bilirubin ≥15, creatinine ≥5, urea ≥200/BUN ≥100; confirm no double-firing or rank collisions.
3. **Restore or deliberately re-audit the 9 skipped tests (H2).** Reintroduce `esr_elevated`; fix microcytic-anemia coverage (or accept "unmatched" and reword the test); update M15; un-skip M28 (it passes) and G4.
4. **Make `llm.js` production-ready (H4).** Confirm timeout, model-from-env, `max_tokens`, truncation tracking, injectable fetch for tests.
5. **Verify the server fallback + limiter (H5/H6).** Confirm response shape matches frontend expectations; confirm limiter parity with `/api/analyze`.
6. **Reconcile geriatric refs** between engine `refs.js` and client `labRefs.js`.
7. **Commit cleanup in coherent chunks:** remove migration/patch scripts, empty files, root-level backups; convert any kept print-only scripts to assertion tests; add `labmat-prototype/node_modules/` to `.gitignore` and untrack.
8. **Establish an isolated test mode** so `npm test` does not require network (AvalAI) — guard with `SKIP_NETWORK` / injectable fetch so the suite is deterministic in CI.

---

## 9. Security & operations quick notes

- Empty `ALLOWED_ORIGINS` = any origin (fine for dev; must be set in prod).
- No auth on the analyze endpoints — origin check + rate limit are the only defenses; the `/api/labmat/analyze` limiter addition closes one scraping vector.
- `AVALAI_API_KEY` stays server-side only — good.
- `express.json` at 60 MB vs Nginx at 50 M — layered correctly; revisit when tuning Nginx.
- Single-deployment assumptions (in-memory jobs, one instance, shared proxy IP) are documented but must be revisited before horizontal scaling.

---

*End of report. Generated 2026-08-01. Diagnostic only — no project files were modified beyond this report file itself.*