# `/api/analyze` Contract Test Suite — Report

**Suite:** [khanesh-server/api-contract.test.js](khanesh-server/api-contract.test.js)
**Run:** `node --test api-contract.test.js` (from `khanesh-server/`)
**Date:** 2026-08-03 · Node v26.5.0

---

## Result matrix

| Test | Expected NOW | **Actual NOW** | Expected AFTER restore |
|---|---|---|---|
| T1 — `has_critical` exists and is boolean | FAIL | **FAIL** ✓ | PASS |
| T2 — critical panel sets the flag true | FAIL | **FAIL** ✓ | PASS |
| T3 — normal panel sets the flag false | FAIL | **FAIL** ✓ | PASS |
| T4 — the flag comes from the engine, not the model ⚠️ | FAIL | **FAIL** ✓ | PASS |
| T5 — the model cannot invent a critical | FAIL | **FAIL** ✓ | PASS |
| T6 — normal panel does not call the LLM | FAIL | **FAIL** ✓ | PASS |
| T7 — malformed LLM output degrades safely | FAIL | **FAIL** ✓ | PASS |
| T8 — emergency coverage net re-injects dropped text | FAIL | **FAIL** ✓ | PASS |
| T9 — recommendation dedup and forbid filter | FAIL | **FAIL** ✓ | PASS |
| T10 — no absent-value claim | FAIL | **FAIL** ✓ | UNKNOWN — reported, not forced |

**10 tests, 0 pass, 10 fail.** No unexpected results — nothing passed that should not have.

```
ℹ tests 10
ℹ pass 0
ℹ fail 10
```

Rest of the backend suite is unaffected: `rules/engine.test.js` is **159/159 green**.
Whole-project `npm test` is now **186 tests, 176 pass, 10 fail** — the 10 are exactly this suite.

---

## Why each test fails (the actual assertion output)

The failures are not variations on a theme; they land on four distinct missing mechanisms.

**T1–T5, T7 — the field does not exist.**
`actual: undefined, expected: false`. The response object is built at
[server.js:839-853](khanesh-server/server.js#L839-L853) as `{ labmat, loops }` plus `_engine`,
`extracted_tests`, `ocr_warnings`, `pages`, `sources`. There is no `has_critical` key on any
path. T4 and T5 therefore fail *vacuously right now* — there is no field for the engine to win
control of. That is worth stating plainly: **the engine's `has_critical` verdict is computed by
`runPatterns()` and then discarded before the response is serialized.**

**T6 — 12 LLM calls for a completely healthy patient.**
```
AssertionError: پنلِ طبیعی نباید مدل را صدا بزند؛ 12 فراخوانی انجام شد
12 !== 0
```
This is the regression named in the spec, reproduced exactly. `buildNormalResult()` is imported
at [server.js:34](khanesh-server/server.js#L34) and never called; the 10-agent graph is invoked
unconditionally at [server.js:835](khanesh-server/server.js#L835) for every request, including
one where the engine found zero abnormals and zero patterns.

**T8 — the engine's clinical narrative never reaches the response at all.**
The dropped text was the entire `potassium_critical` finding:
> «پتاسیم خون شما 7.1 (حد طبیعی 3.5–5) است … در حد بحرانی خطر ایست قلبی دارد — و در این حد نیاز به رسیدگی فوری دارد.»

This is broader than a missing coverage net. `_engine` carries `patterns` (rule ids only),
`urgency`, and per-test verdicts — but **not** `must_say`, `headline`, `warnings`, or `suggest`.
So the deterministic clinical text the rules engine produces is not merely un-verified against
the model output; it is never serialized at any point. 100% of the prose the patient reads is
LLM-generated.

**T9 — there is no recommendations field.**
`general_recommendations باید آرایه باشد؛ بود: undefined`. Nothing to dedup and nothing to filter.

**T10 — the model's false claim reaches the response verbatim, twice.**
The stubbed model text «کراتینین شما طبیعی است و کلیه‌ها مشکلی ندارند.» appears in the response
body in both `labmat.patientSection` and `labmat.doctorSection`, unfiltered — on a panel where
the engine explicitly determined «در این برگه کراتینین (شاخص کار کلیه) اندازه‌گیری نشده».

---

## Proof the tests are not tautologically red

Per rule 4, a red test proves nothing unless the assertion is satisfiable. I built a positive
control that constructs the response a restored safety net would return (engine-sourced
`has_critical`, `buildNormalResult()` short-circuit, `missingFindingText()` re-injection,
`tidyRecommendations()` + forbid filter — all using the real production helpers from
`rules/prompt.js` and `rules/coverage.js`) and ran the same assertion expressions against it:

```
T1 has_critical is boolean          PASS
T3 normal === false                 PASS
T6 well-formed summary              PASS
T2 critical === true                PASS
T4 model false is overridden        PASS
T5 model true is overridden         PASS
T7 has_critical false on parse fail PASS
T8 must_say re-injected             PASS
T9 is array / dup collapsed /
   subset dropped / forbid removed  PASS (4/4)
T10 no absent-value claim           FAIL   ← stays red even with a full restore
```

Every assertion T1–T9 is satisfiable and discriminating. T10 stays red against a fully restored
net, which independently confirms the spec's prediction that it targets a gap the old path never
closed. (This is a satisfiability check on the assertion logic, not an execution of the test file
itself against a restored server — that would require writing the restore, which this pass does
not do.)

---

## Tests that could not be written as specified

**None.** All ten were written without touching production code.

T10 was writable, but it is worth recording *what* it asserts, since the spec anticipated it might
not be: it is a **detection** assertion, not a mechanism check. It scans the whole response for
`کراتینین … (طبیعی|نرمال|در محدوده)` within one sentence. I verified the regex returns `null`
against the engine's own text for this fixture, so it cannot false-positive on legitimate output.
The missing production mechanism it implies: **nothing anywhere in the request path compares model
prose against the set of tests actually present in `engineOut.graded`.** The engine knows exactly
which analytes were measured; no consumer of that knowledge exists.

---

## Design notes on the suite

- **Network boundary, one seam.** `labmat-agents/llm.js` calls global `fetch`
  ([llm.js:13](khanesh-server/labmat-agents/llm.js#L13)), as does OCR and MedlinePlus. Replacing
  `globalThis.fetch` therefore stubs the entire LLM surface, the vision model, and NLM in one
  place. Localhost requests (the test's own) pass through to the real fetch. Any unexpected
  external host throws. **No test makes a live call; the suite runs fully offline.**
- **The stub payload carries both response shapes** — the graph agents' fields
  (`text`/`analysis`/`reasoning`/`diagnosis`/`status`/`score`/`followUps`) and the contract fields
  (`interpretation`/`general_recommendations`/`has_critical`/…). One stub works against both the
  current graph path and a restored direct-LLM path, so the tests are not coupled to the internal
  architecture — only to the response contract.
- **Server lifecycle without touching `server.js`.** `server.js` exports nothing and calls
  `app.listen()` on import. The test patches `http.createServer` *in the test process only* to
  capture the server handle, boots on `PORT=0` (ephemeral), and closes it in `after()`.
- **Fixtures are engine-verified, not invented.** Each panel's expected engine verdict is asserted
  as a precondition inside the test via `runEngine`/`runPatterns`, so a future rules change that
  invalidates a fixture fails loudly instead of silently weakening the test.
- **A fifth fixture was required.** The spec's four fixtures contain no pattern with a non-empty
  `forbid`, so T9 could not be written against any of them. I added `PANEL_FORBID`
  (Hb 6.2 / MCV 70 / Ferritin 5 → `microcytic_anemia`, `forbid: ["B12", "فولات"]`) — the only
  reachable panel that exercises the forbid filter.

---

## Findings outside the ten tests

Three things surfaced while building the suite that are not covered by any of the ten:

1. **Every safety-net helper is imported and never called.** Each of `buildNormalResult`,
   `buildEngineFallbackResult`, `buildEngineRecommendations`, `tidyRecommendations`,
   `missingFindingText`, `buildEnginePrompt`, and `ENGINE_SYSTEM_PROMPT` occurs exactly once in
   `server.js` — on the import line ([server.js:34](khanesh-server/server.js#L34),
   [server.js:40](khanesh-server/server.js#L40)). `SYSTEM_PROMPT` (the legacy path) is defined at
   [server.js:333](khanesh-server/server.js#L333) and also never referenced. The entire
   second-stage analysis path is dead code.

2. **N13 is currently violated in the live path.** [server.js:830](khanesh-server/server.js#L830)
   passes `rawData` — the full patient text including OCR-printed reference ranges — into the
   graph alongside `engineOutput`. The Lab Notebook entry N13 records this exact construction as a
   fixed bug ("the engine boundary is absolute … must **never** be allowed to see the raw test
   numbers combined with OCR ranges/flags"). The agent prompts compensate with negative
   instructions ("Trust only engineOutput", "NEVER mention…"), which is the mitigation N13 says
   does not work.

3. **T7 becomes vacuous after the restore, and should be strengthened then.** The spec pins T7 to
   `PANEL_NORMAL`. Once `buildNormalResult()`'s short-circuit is restored (T6), a normal panel
   never reaches the LLM, so the malformed-output path it is meant to exercise is unreachable for
   that fixture and T7 will pass without testing anything. I implemented it exactly as specified
   rather than silently redefining it. **Recommend adding a T7b on `PANEL_CRITICAL`** after the
   restore — that is where a parse failure must fall back to `buildEngineFallbackResult()` and
   where the `null` handling actually matters.

---

## Production files modified

**None by this work.** The only file added is `khanesh-server/api-contract.test.js` (untracked),
plus this report. `git status` shows no new modification attributable to this pass;
`server.js` and `rules/prompt.js` retain their pre-session mtime of `17:04:58`, while the test
file is `17:23:47`.

One disclosure for accuracy: **`khanesh-server/rules/interpret.js` changed during this session
(mtime `17:18:20`), and not by me** — I issued no edit to it. It came from another process: a
hook, a concurrent session, or the editor.

Reviewed after the fact, the change is correct and does not affect this suite. It makes the `lln`
classifier band strict (`value < limit` instead of `<=`), resolving a contradiction between
[interpret.js:212](khanesh-server/rules/interpret.js#L212) — which treats `[lln, uln]` as
inclusive — and the classifier loop, which was tagging a boundary MCV of 80 as `microcytosis`.
Blast radius is two analytes (MCV, MCH are the only classifiers with an `lln` band) at exactly one
value each. No `patterns*.js` rule consumes the `microcytosis`/`hypochromia` tag, so pattern firing
and urgency are unchanged. It is covered by `M34` at
[engine.test.js:2092-2115](khanesh-server/rules/engine.test.js#L2092-L2115), which asserts both
directions of both boundaries and fails against the pre-change code. `PANEL_FORBID` uses MCV 70,
far below the boundary, and every fixture's engine-verdict precondition still passes.

Flagged anyway, because it is an uncommitted live edit to clinical grading logic that no one in
this session authored. It is also a wrong-patient-output bug (a normal MCV of 80 would have read
«گلبول‌های قرمز شما کوچک‌تر از حد معمول هستند»), so per CLAUDE.md it earns a Lab Notebook entry
when committed — a new class, not a repeat of N12.

---

## ⚠️ Immediate consequence

`npm test` in `khanesh-server/` is now **red (10 failures)**, and `.githooks/pre-commit` runs it
whenever `khanesh-server/**.{js,mjs,json}` is staged. **Commits touching the backend are blocked
until the step 7–8 restore lands.** That is the intended behavior of a contract suite written
red-first — the gate is doing its job. Do not reach for `SKIP_HOOKS=1`.
