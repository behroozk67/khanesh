# Khanesh — LabMate

<sub>Structure, commands, agents, skills and test baseline last verified against the working tree
on **2026-08-03** (branch `recovery`). The Lab Notebook below is cumulative and not re-verified —
its entries are history, and history doesn't expire.</sub>

## Project Overview

Patient-facing web app that interprets medical lab reports in Persian/Farsi. A React frontend collects lab values (typed in or photographed) and an Express backend runs them through a deterministic clinical rules engine before an LLM (via AvalAI, an OpenAI-compatible gateway) rewrites the engine's findings into plain-language Persian.

## Your Role

When the user asks for a change in this repo:

1. **Locate** — figure out which sub-project (`khanesh/` frontend or `khanesh-server/` backend) owns the change; they have no shared `package.json`, so `cd` into the right one before running commands.
2. **Respect the engine boundary** — clinical judgment (abnormal/normal, severity, patterns) belongs in `khanesh-server/rules/`, never in a prompt. See [rules/architecture.md](.claude/rules/architecture.md).
3. **Edit** — for a new lab test, touch the rules files together (see [rules/rules-engine.md](.claude/rules/rules-engine.md)); for UI/API-contract changes, keep `Tafsir.jsx`'s expectations of the response shape in sync with `server.js` (see [rules/frontend.md](.claude/rules/frontend.md)).
4. **Verify** — run `npm test` in `khanesh-server/` and `npm run lint` in `khanesh/`. The frontend has no tests, so trace UI logic by reading. The pre-commit hook runs both automatically — see [Git Hooks](#git-hooks).
   ⚠️ **"The baseline" is always two different numbers — the working tree's and the commit's.**
   A previous version of this file quoted `186 tests, 185 pass, 1 fail` as *the* baseline. That
   number was only ever true of somebody's **working tree**; the committed tree was far redder,
   and nobody re-derived it. As of `acc9cc0` the working tree is green and the committed tree is
   12 red, so the trap is now the other way round and just as easy to fall into. See
   [N15](#n15--a-green-suite-proves-nothing-when-the-damage-is-invisible-to-the-tests).

   | what you measured | tests | pass | fail | skipped |
   |---|---|---|---|---|
   | `HEAD` before `5059a05` | 186 | 137 | **49** | — |
   | `HEAD` at `5059a05` (mojibake repaired) | 186 | 174 | **12** | — |
   | `HEAD` at `a547164` (docs only — unchanged, as expected) | 186 | 174 | **12** | — |
   | `HEAD` at `c093712` (`M36`+`M37` added) | 190 | 178 | **12** | — |
   | working tree, 2026-08-04 (before `M37`) | 187 | 186 | **1** (`T10`) | — |
   | working tree, 2026-08-04 (after `M37`, 3 new tests) | 190 | 189 | **1** (`T10`) | — |
   | `HEAD` at `acc9cc0` (`T10` fixed, `M38` added) | 193 | 181 | **12** | `patterns_anemia.js` |
   | working tree, 2026-08-04 (after `acc9cc0`) | 193 | 193 | **0** | `patterns_anemia.js` |
   | `HEAD` at `1469449` (docs + hook only — unchanged, as expected) | 193 | 181 | **12** | `patterns_anemia.js` |
   | working tree, 2026-08-05 (after `M41`, `spherocytosis_likely` restored) | 194 | 194 | **0** | `patterns_anemia.js` |
   | working tree, 2026-08-06, **before** the electrolyte work (bare `node --test`) | 215 | 215 | **0** | — |
   | working tree, 2026-08-06, after it — `rules/*.test.js` + `avalaiClient.test.js` only | 238 | 238 | **0** | `patterns_anemia.js` |

   | working tree, 2026-08-06, after the auth/DB test-gate repair (`npm test`) | 256 | 256 | **0** | — |

   ✅ **`npm test` hung for a stretch on 2026-08-06 — fixed, and worth reading because both
   causes were invisible in the test output.** Concurrent work added `khanesh-server/auth.js` +
   `khanesh-server/database.js` and wired `requireAuth` onto the analyze routes. Three separate
   breakages, all measured, none of which named itself:
   - **401 on every contract test.** `api-contract.test.js` sends no `Authorization` header.
     (Resolved upstream — `requireAuth` is currently short-circuited at
     [auth.js:75-77](khanesh-server/auth.js#L75-L77). ⚠️ When auth is re-enabled, these go red
     again unless the tests are given a token or the route is exempted.)
   - **The suite never exited.** `database.js` called `open({...})` at **module scope**, so merely
     importing it opened a SQLite handle that held the event loop. `node --test
     api-contract.test.js` timed out at exit 124 — and since the pre-commit hook runs `npm test`,
     **the hook hung too, blocking every backend commit**. Fixed by making the connection lazy
     (`dbConn()`) and exporting `closeDb()`, which the test's `after` hook now calls. Production
     is unchanged: `initDb()` still opens it at boot.
   - **A listen race.** `app.listen()` moved inside `initDb().then(...)`, so the server no longer
     comes up synchronously with the `import`. The `before` hook read `serverHandle.once` on a
     still-`null` handle and threw `TypeError: Cannot read properties of null`. It now waits for
     the handle before waiting for `listening`.

   **The generalizing lesson:** a hang and a `TypeError` in a `before` hook both present as "all
   tests in the file fail", which looks identical to the `ERR_MODULE_NOT_FOUND` trap documented
   under [Commands](#commands). Three different root causes, one symptom. When a whole test file
   goes red at once, read past the summary to the *first* error — the count tells you nothing.

   ⚠️ **`khanesh-server/database.sqlite` is gitignored** (`/khanesh-server/database.sqlite`,
   path-anchored per N14). `npm test` creates it, because importing `server.js` runs `initDb()`.
   Without the ignore it shows up in `git status` as a 24 KB binary and eventually gets committed
   — along with whatever phone numbers are sitting in the `users` table.

   **Any baseline you quote must name which tree it came from**, and you must *re-measure* it —
   never copy a number out of this file. Committed and working-tree rows differ because
   uncommitted work in the tree fixes tests that the commit does not.

   ⚠️ **The two `acc9cc0` rows are 12 apart, and that gap is the whole point of this table.**
   A session on 2026-08-04 watched the pre-commit hook print `193 · 193 · 0` and recorded that
   as the committed baseline. It isn't: the hook runs `npm test` against the **working tree**,
   not against what is being committed. The committed tree is `193 · 181 · 12`. Reading a
   baseline off a hook run is the same error as quoting one out of a file — see
   [N15(b)](#n15--a-green-suite-proves-nothing-when-the-damage-is-invisible-to-the-tests). The
   only way to measure a commit is to check it out; the recipe is under [Commands](#commands).

   The 12 failing at `acc9cc0` are **not** the 12 at `c093712` — the count is a coincidence.
   They are still the same 12 at `1469449` (re-measured 2026-08-05). Eleven of them (`T9`, `R7`,
   `M15`, `M16`, `M31`×3, `M28`, `G2`, `G4`, `M33`) need the clinical changes still uncommitted in
   the working tree. The twelfth is `M38` itself, and it is failing on a **real live defect in the
   committed tree**: `spherocytosis_likely` in `patterns_hematology.js` has its
   `headline`/`must_say`/`action`/`suggest` entirely in English («Increased Intracellular
   Hemoglobin Concentration», «Schedule an appointment with your doctor in the coming weeks»).
   That rule fires, and a Persian-speaking patient reads it.
   **The working tree fixes this** — the rewrite of `patterns_hematology.js` restores the rule
   with the same thresholds and freshly written Persian at
   [patterns_hematology.js:514](khanesh-server/rules/patterns_hematology.js#L514), and `M41` locks
   it in — but until that lands, the committed tree ships English clinical text to patients.
   `M38` at `HEAD` also flags a bare `LDL` in `severe_hypercholesterolemia`'s `must_say`; the
   working tree's version of that string is Persian with `LDL` inline («مقدار کلسترول بد (LDL) شما
   …»), which is the right fix — `LDL` was **not** added to `ALLOWED_TEST_NAMES`, so that list is
   still exactly the eleven English full words of `P6` plus the printed-on-the-sheet abbreviations.

   ⚠️ **Measure with `node_modules` present or the number is fiction.** See the warning under
   [Commands](#commands) — the obvious "clean checkout" recipe silently reports **20** failures
   instead of 12.

   **`skipped` is a real column, not a footnote.** `patterns_anemia.js` is dead code
   (`patterns.js` does not import it) and holds 10 destroyed Persian strings that only a human can
   rewrite — see [N15(c)](#n15--a-green-suite-proves-nothing-when-the-damage-is-invisible-to-the-tests).
   Three guards treat it differently, and the difference matters:

   | guard | covers `patterns_anemia.js`? |
   |---|---|
   | `M36` (`RULES` integrity) | **no** — its rules are not in `RULES` at all |
   | `M37` assertion 1 (mojibake, every `rules/*.js`) | **yes** — and it passes; the mojibake was repaired |
   | `M37` assertion 2 (destroyed text, live files only) | **no** |
   | `M38` (Persian user-facing strings) | **no** — skipped, with a visible `t.diagnostic` |

   So the file is *not* unguarded: its encoding is checked, its content is not. `M38` prints
   `SKIP: patterns_anemia.js — فایل مرده، 10 رشتهٔ نابودشده، نیازمند متن انسانی` on every run, so
   the exemption is visible in the output rather than silent. All three exemptions are derived
   from `patterns.js`'s own `import` statements via `livePatternFiles()` — nothing is hand-listed,
   so wiring `RULES_ANEMIA` into `RULES` turns all three red at once, which is correct.

   `T10` («دربارهٔ تستِ اندازه‌گیری‌نشده ادعای «طبیعی» نمی‌کند») was the N4 contract failure
   present in every column up to `c093712`. It was fixed in `2f964df` (`stripUnmeasuredClaims` in
   `rules/coverage.js`) and now passes in both trees. Don't reach for `SKIP_HOOKS=1` on any
   clinical contract test that replaces it.

Eight subagents in `.claude/agents/` cover the recurring work — see [Agents](#agents) below.

Before you start a clinical change, read [Lab Notebook](#lab-notebook--things-not-to-try-again) — it is the log of mistakes previous Claude instances actually made here. Most of them look reasonable right up until they reach a patient.

**IMPORTANT**:
- Never let the analysis LLM decide what's abnormal — that is the rules engine's job. Prompts only format text.
- All backend user-facing strings and prompts are in Persian; keep new ones consistent with that.
- Never let a raw engine key (`HGB`, `LDH`, `BILI_T`) reach user-facing text — run it through `faName()` in `rules/names.js`. This was a real bug: the prompt handed raw keys to the LLM and patients saw «درخواست آزمایش HGB از پزشک».

---

## Tech Stack

- **Frontend**: React 19 + Vite 8, `react-router-dom` 7, plain CSS files (`index.css` / `site.css` / `ui.css`), no CSS framework. Content pages are route-level `lazy()` imports; `/` (the tool) deliberately is not.
- **Backend**: Node + Express 4 (`lab-proxy` / "LabMate"), proxies to AvalAI (`https://api.avalai.ir/v1`, OpenAI-compatible), `express-rate-limit` on the analyze endpoints
- **Rules engine**: plain deterministic JS modules (`khanesh-server/rules/`) — no ML, no external calls
- **Agent graph**: `@langchain/langgraph` — a 12-node, two-layer graph in `khanesh-server/labmat-agents/`. **Default off.** See [The LabMat Agent Graph](#the-labmat-agent-graph-use_graph).
- **Linting**: oxlint (frontend only; config `.oxlintrc.json`). Currently 6 `no-unused-vars` warnings, 0 errors — warnings don't fail the gate.
- **External data**: NLM MedlinePlus web service (public health-topic summaries, fetched live, cached 20h)
- **Tests**: backend only, `node:test`. `npm test` is bare `node --test`, so it runs **every** `*.test.js` in `khanesh-server/`, not just the rules suite:
  | File | What it covers |
  |---|---|
  | `rules/engine.test.js` | the clinical regression suite — one test per real fixed bug, commented in Persian |
  | `rules/geriatric.test.js` | `GERIATRIC_REFS` (age ≥ 75) overrides in `refs.js` |
  | `api-contract.test.js` | end-to-end `/api/analyze` response shape and safety nets (`T10` was the long-standing failure; fixed in `2f964df`) |
  | `avalaiClient.test.js` | the HTTP boundary — 429, timeout, truncation, malformed JSON — with an injected `fetch`, no network |
  `test-api.js` is *not* a test file but `node --test` picks it up anyway; it tries a real network call and logs a `fetch failed` / `EACCES` above the summary. That noise is expected, and it still reports `✔`.
- **No frontend tests** and no frontend test runner — `khanesh/package.json` has no `test` script.
- **No npm workspace** — two fully independent `package.json`s
- **MCP**: `.mcp.json` registers the Playwright server (`@playwright/mcp@0.0.78`) for driving the frontend in a browser
- **Submodule**: `.impeccable` is a git submodule (`github.com/pbakaus/impeccable`), separate from the three vendored `impeccable` *skill* copies described under [Skills](#skills)

---

## File Structure

```
khanesh-project/
├── khanesh/                     # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx              # routes — see below; NOT "/" -> Tafsir any more
│   │   ├── Landing.jsx          # "/" — the marketing page, un-deleted and back in front
│   │   ├── Tafsir.jsx           # the tool itself, now at "/app" and "/tafsir"
│   │   ├── labRefs.js           # ⭐ REF / CATS / statusOf / comboInsights — the client-side
│   │   │                        #   copy of test metadata, moved OUT of Tafsir.jsx
│   │   ├── LocalPreview.jsx     # manual-entry preview — the only clinical text with no engine
│   │   ├── analyzeJob.js        # async job client: start, poll, resume from localStorage
│   │   ├── imageIntake.js       # photo intake + compression (was inline in Tafsir.jsx)
│   │   ├── ResultView.jsx       # result screen: states, category groups, derived values
│   │   ├── ResultErrorBoundary.jsx  # keeps a malformed response off a white screen
│   │   ├── ExtractedTests.jsx / Scorecard.jsx / RangeBand.jsx / Num.jsx / Segmented.jsx
│   │   ├── EntryGrid.jsx / UploadCard.jsx / ProfileCard.jsx      # the two input paths
│   │   ├── Tests.jsx / CategoryPage.jsx / TestPage.jsx / ExtraTestPage.jsx / Guide.jsx
│   │   ├── content/             # the encyclopaedia text: extra.<topic>.js × 18 + coverage.mjs
│   │   ├── testContent.js / guideContent.js / testCatalog.js / testCategories.js
│   │   ├── sources.js / rangeMath.js / safeText.js / digits.js / resultStates.js
│   │   ├── Logo.jsx             # BRAND_FA / BRAND_LATIN live here
│   │   ├── LabMateLogo.jsx      # the wordmark used by Landing
│   │   ├── main.jsx
│   │   └── index.css / site.css / ui.css
│   ├── public/fonts/            # self-hosted Vazirmatn variable woff2 + OFL licence
│   ├── public/lab/              # ⚠️ landing imagery — mostly .png, i.e. GITIGNORED (see N14)
│   ├── vite.config.js           # dev-only proxy: /api -> http://localhost:8787
│   └── package.json
├── khanesh-server/              # Express backend
│   ├── server.js                # the request pipeline + every safety net (~1300 lines)
│   ├── avalaiClient.js          # the HTTP boundary to AvalAI, factory + injectable fetch
│   ├── jobStore.js              # in-memory analyze-job store with TTL (async path)
│   ├── labmat-agents/           # the LangGraph agent graph — OFF unless USE_GRAPH=true
│   │   ├── graph.js             # StateGraph wiring, 12 nodes over two layers
│   │   ├── state.js / llm.js
│   │   └── agents/layer1.js     # context, cbc, biochem, hormone, microbio, crossTest,
│   │       └─ agents/layer2.js  #   diagnosis, evidence │ patient, doctor, safety, final
│   ├── api-contract.test.js     # /api/analyze contract — green since 2f964df
│   ├── avalaiClient.test.js
│   ├── test-api.js              # a manual script, not a test (node --test runs it anyway)
│   ├── *-guidelines.{json,md}   # anemia + biochem source extracts
│   ├── rules/
│   │   ├── adapter.js           # OCR text -> engine keys (NAME_MAP, unit conversion)
│   │   ├── guidelines.js        # citation registry (CLSI/IFCC/EFLM/WHO/KDIGO/ADA/ESC/ACG/…)
│   │   ├── units.js             # IFCC SI -> conventional units (HbA1c mmol/mol, mmol/L, µmol/L)
│   │   ├── preanalytical.js     # CLSI sample-quality caveats (hemolysis, fasting, EDTA, stasis)
│   │   ├── biovar.js            # EFLM biological variation -> reference change value
│   │   ├── refs.js              # adult ranges (Henry's) + GERIATRIC_REFS (age >= 75)
│   │   ├── refs_ped.js          # pediatric ranges <16y (RCPCH 2016)
│   │   ├── grade.js             # picks severity/classifier/binary mode per test
│   │   ├── ctcae.js             # CTCAE v5 severity grading
│   │   ├── interpret.js         # categorical classifiers (e.g. MCV micro/normo/macro)
│   │   ├── patterns.js          # ⭐ now an AGGREGATOR — see "Where a pattern lives" below
│   │   ├── patterns_anemia.js / _hematology.js / _biochem.js / _biochem_new.js
│   │   ├── patterns_nephrology.js / _nephrology_new.js / _infectious.js
│   │   ├── patterns_endocrine_rheum.js / _endocrine_new.js / _malignancy.js
│   │   ├── patterns_utils.js    # levelGrade, rankOf — shared by every patterns_* file
│   │   ├── names.js             # engine key -> Persian display name (FA_NAMES, faName())
│   │   ├── prompt.js            # engine-driven system prompt + payload builder
│   │   ├── medline.js           # MedlinePlus term extraction + lookup
│   │   ├── coverage.js          # sentence-level check that the LLM kept every must_say
│   │   ├── engine.test.js       # the clinical regression suite
│   │   ├── geriatric.test.js    # GERIATRIC_REFS coverage
│   │   ├── split*.cjs / extract-ids.cjs   # one-off migration scripts; dead, not wired in
│   │   ├── CLINICAL_REVIEW.md   # clinical audit log — fixed + outstanding defects
│   │   └── REF_DIFF.md          # known REF (frontend) vs refs.js (backend) range drift
│   ├── .env                     # AVALAI_API_KEY, etc. (gitignored)
│   └── package.json
├── .claude/
│   ├── agents/                  # 8 subagents, see below
│   ├── eval-gate/               # the evaluation gate's code: run.mjs + lib/*.mjs + fixtures
│   │   └── runs/                # per-run evidence — gitignored, reproducible
│   ├── rules/                   # detailed rules, see below
│   ├── skills/                  # project + vendored skills, see below
│   └── settings.local.json      # MCP allowlist + the impeccable design hooks
├── .specs/                      # eval specs (yaml) + written reports; docs, not executable
├── .githooks/pre-commit         # test/lint gate (core.hooksPath = .githooks)
├── .mcp.json                    # Playwright MCP server
├── .agents/skills/              # vendored third-party skills, cross-tool layout
├── skills-lock.json             # ⭐ EXISTS — source + hash per vendored skill
├── .impeccable/                 # git submodule (github.com/pbakaus/impeccable)
├── .codex/hooks.json            # impeccable hooks for Codex (reads .agents/skills/)
├── .github/hooks/impeccable.json # impeccable hooks for GitHub (reads .github/skills/)
├── MEDICAL_RULES.md             # ⭐ clinical decision register — pending human review (P1-P7)
└── CLAUDE.md                    # this file
```

**`MEDICAL_RULES.md` at the repo root is maintained, and it is not like the others.** It is the
clinical decision register: every threshold, range, or rule change that needs a *human* clinical
reviewer is recorded there under "در انتظار بازبینی" with the proposal, the reasoning, and what
happens to the patient either way. `5c3a86b` filled in `P3`–`P7`. Read it before changing a
number in `refs.js` or a threshold in a pattern — the answer to "should this be 306 or 130?" is
often already written down, waiting for a decision rather than for code. Nothing there is
supposed to reach executable code until a reviewer moves it to the approved section.

**The other loose files at the repo root** — `AGENTS.md`, `ARCHITECTURE.md`,
`MEMORY.md`, `VERIFICATION_AUDIT.md`, `audit_report.md`, `CONTRACT_TEST_REPORT.md`,
`architecture.html`, `diagram.mmd`, `fix_val.js`, several `.png`s, `scratchpad/`,
`labmat-prototype/`. These are agent-run artefacts and scratch, **not** maintained
documentation, and several contradict each other and this file. `CLAUDE.md` +
`.claude/rules/` are the map; treat everything in that list as a snapshot of one past session
unless you've just verified it against the code.

### Routes (`App.jsx`)

The old "the tool *is* the landing page" decision was reversed — `/` is `Landing` again.

| path | renders |
|---|---|
| `/` and `/landing` | `Landing` (lazy) |
| `/app` and `/tafsir` | `Tafsir` — the actual tool |
| `/tests`, `/tests/:cat`, `/test/:key` | the encyclopaedia (lazy) |
| `*` | `Navigate` to `/` |

The Nginx `try_files $uri /index.html` caveat still applies to every one of these, and now
matters more: a hard load of `/app` is the *main* entry point for a returning user.

### Where a pattern lives

`patterns.js` no longer holds the rules. It imports ten `patterns_*.js` files and concatenates
them into the exported `RULES` array; it still owns `runPatterns()`, `SUGGEST_TESTS`, and the
suppression/dedup logic. So:

- **Adding a clinical rule** → the right `patterns_<system>.js`, then confirm its `RULES_*` export
  is spread into `RULES` in `patterns.js`. A rule in a file that isn't imported is invisible and
  fails exactly like N1 — silently, into `unmatched_abnormal`.
- **Changing how rules are selected, ranked, or suppressed** → `patterns.js` itself.

⚠️ **`patterns_anemia.js` is dead code — nothing imports it.** It exports `RULES_ANEMIA`
(10 rules: `anemia_microcytic_ida`, `anemia_microcytic_thalassemia`, `anemia_hemolytic`,
`anemia_macrocytic_megaloblastic`, …) and no file in the repo imports it. `patterns.js` also
declares `LEGACY_ANEMIA_IDS` and never reads it. The intent is legible — `LEGACY_ANEMIA_IDS`
lists exactly the six older anemia rules (`microcytic_anemia`, `macrocytic_anemia`,
`normocytic_anemia`, `iron_deficiency_panel`, `anemia_chronic_disease`, `hemolysis_pattern`),
so `patterns_anemia.js` was meant to replace them and the last two lines of that migration were
never written. **The anemia rules that actually run live in `patterns_hematology.js`.**

So: editing `patterns_anemia.js` changes nothing a patient sees, and it is currently a modified
file in the working tree. Before touching anemia, decide which of the two you're in, and if you
finish the migration, do it as its own change — the two rule sets overlap, and spreading
`RULES_ANEMIA` into `RULES` without suppressing `LEGACY_ANEMIA_IDS` fires both.

⚠️ **That file is also damaged, and being dead is why nobody noticed** (2026-08-04, see
[N15(c)](#n15--a-green-suite-proves-nothing-when-the-damage-is-invisible-to-the-tests)). Its
mojibake has been recovered and it now scans clean, but wiring `RULES_ANEMIA` into `RULES` has
**three hard prerequisites**, each of which currently turns the suite red:

1. **8 Persian strings are literal `?` and unrecoverable.** `anemia_macrocytic_mds` and
   `anemia_spherocytosis` exist only in the working tree, and their
   `headline`/`must_say`/`action`/`suggest` text is *gone, not garbled* — a lossy single-byte save,
   not the reversible cp1252 round-trip. A human writes that clinical text. `M37`'s second
   assertion enforces it. Don't fill them in by paraphrasing the rule id; that is inventing
   clinical content, and it is the one thing this architecture exists to prevent.
2. **`anemia_macrocytic_mds` is a duplicate id.** The same id is already live in
   `patterns_hematology.js`, and the `patterns_anemia.js` copy is a byte-for-byte clone of its
   `match`/`build` with the text destroyed — it carries no new clinical logic. Spreading both
   fires `M36`'s duplicate-id assertion. Delete one; the live one is the one with readable text.
3. **`LEGACY_ANEMIA_IDS` must actually be applied**, per the paragraph above, or the old and new
   anemia rules both fire.

✅ **Spherocytosis coverage was missing from the working tree's live engine; it is back.**
(Resolved 2026-08-05 — recorded because the *shape* of the gap is the reusable part.) The committed
`patterns_hematology.js` has `spherocytosis_likely` with English text; an uncommitted rewrite of
that file deleted the rule outright, and for a stretch a repo-wide search found the id in **zero**
files. No test noticed, because a *deleted* rule breaks nothing structurally and `M38` only reads
strings that still exist. **Measured, not assumed**: running `M41`'s panel with the rule filtered
out of `RULES` fires `normocytic_anemia` and nothing else — so the patient got a finding, just not
*this* one, and lost the actual next step (peripheral blood smear). That is the N2 class, and it is
worse than silence precisely because the output still looks complete. Its intended replacement, `anemia_spherocytosis`, was (and still is) stranded in
the dead `patterns_anemia.js` with destroyed text, so it could not stand in.

The fix was the smaller one: port the rule back into
[patterns_hematology.js:514](khanesh-server/rules/patterns_hematology.js#L514) with the HEAD
thresholds unchanged (`MCHC > 36`, `MCV ≤ 100`, MCH normal, HGB low, RBC not high, RDW high) and
freshly written Persian, plus `M41` to lock it in. It did **not** require finishing the anemia
migration — the plumbing was always sound (`MCHC`, `RDW_CV`, `RDW_SD` are fully wired through
`refs.js`, `NAME_MAP` and `FA_NAMES`). Still open: the `MCHC > 36` threshold carries no recorded
source — see `P5` in [MEDICAL_RULES.md](MEDICAL_RULES.md).

---

## Commands

### Frontend (`khanesh/`)
```bash
npm run dev       # Vite dev server; proxies /api/* to http://localhost:8787
npm run build      # production build
npm run lint       # oxlint
npm run preview
```

### Backend (`khanesh-server/`)
```bash
npm install
node server.js     # or: npm start
npm run dev        # nodemon — watches server.js + rules/, ignores *.test.js
npm test           # node --test — EVERY *.test.js in khanesh-server/, see Tech Stack
npm run test:coverage   # same, with thresholds: lines 85 / branches 70 / functions 85
```

**Re-measure the baseline; don't quote one.** Measured 2026-08-06 with the recipe below:
the committed tree at `d44921f` is `tests 213 · pass 213 · fail 0` — **green**. The long-standing
"the committed tree is 12 red" note that used to sit here described `1469449` and has been true
of no tree since; the uncommitted clinical work it referred to has landed. This is the third time
this file has carried a stale number, which is the entire point of
[N15(b)](#n15--a-green-suite-proves-nothing-when-the-damage-is-invisible-to-the-tests): if you
are about to quote any figure in this section, re-derive it first and say which tree you measured.

⚠️ **The pre-commit hook's output is not a substitute for this measurement**, even now that it
gates the index (`1469449`). It tells you the *index* was green at the moment you committed; it
says nothing about `HEAD` afterwards, and it never runs at all for a commit that stages no
`.js`/`.jsx`/`.mjs`/`.json` under the two sub-projects — `5c3a86b` is exactly that case, and its
own message says so. To know what a commit scores, check it out and run it.

To measure the committed number without your own edits in the way, extract a clean copy **and
give it the dependencies**:

```bash
git archive HEAD khanesh-server | tar -x -C <tmp>
# Windows: New-Item -ItemType Junction <tmp>/khanesh-server/node_modules -Target <repo>/khanesh-server/node_modules
ln -s "$PWD/khanesh-server/node_modules" <tmp>/khanesh-server/node_modules
cd <tmp>/khanesh-server && node --test
```

⚠️ **Skip the link and the number is wrong by eight.** `git archive` does not carry
`node_modules` (it is gitignored), so `api-contract.test.js` cannot import `express`, the whole
file errors out, and **all ten of T1–T10 fail** — reporting `pass 166 · fail 20` for a tree whose
real score is `178 / 12`. Nothing in that output says "missing dependency" unless you read past
the summary to `ERR_MODULE_NOT_FOUND`. This bit a session on 2026-08-04, which briefly concluded
it had broken eight contract tests it had never touched — the same trap as N15(b), reached
through a *procedure* rather than a quoted number. A baseline measured with the wrong
environment is a quoted baseline wearing a lab coat.

To run one file: `node --test rules/engine.test.js`.

Requires a `.env` file with `AVALAI_API_KEY` (server boots without it but logs a warning, and all AI calls fail). See [rules/environment.md](.claude/rules/environment.md).

---

## The LabMat Agent Graph (`USE_GRAPH`)

`khanesh-server/labmat-agents/` is a `@langchain/langgraph` `StateGraph` with 12 nodes in two
layers — layer 1 fans out to `cbc`, `biochem`, `hormone`, `microbio` after a context node, then
`crossTest` → `diagnosis` → `evidence`; layer 2 runs `patient`, `doctor`, `safety`, `final`.

**It is off by default and that is a clinical decision, not an unfinished toggle.** The reason is
written in Persian at [server.js:170-176](khanesh-server/server.js#L170-L176): on the graph path
the patient-facing text comes out of two LLM agents (`patientSection`, `doctorSection`) whose
output **does not pass through any of `server.js`'s safety nets** — not the emergency `must_say`
coverage check, not the `key_number` guarantee, not the `forbid` filter. The classic path has all
three. N13 came from exactly this path.

If you work on the graph:

- Turn it on with `USE_GRAPH=true` for a local run only. `GET /health` reports `graph: "on"|"off"`
  and boot logs it in Persian — check there before concluding which path produced an output.
- The graph is fed `safeEngineOut`, a copy of `engineOut` with `note` and `patient` **deleted**
  from every graded test, because an agent that reads «تالاسمی» in a `note` field reports the
  patient *has* thalassemia. Don't add fields back into that payload without asking what an LLM
  will do with the wording.
- It is still handed `rawData` (the OCR text). That is the N13 shape and the reason the default is
  off — do not treat the current wiring as an endorsement of it.
- Making it the default requires routing its output through the step-8 safety nets first. That's
  the work; a flag flip is not.

## Async Analyze Endpoints

`server.js` exposes more than the two routes the old docs listed:

| route | purpose |
|---|---|
| `POST /api/analyze` | the original synchronous path — still the one the safety nets are written around |
| `POST /api/analyze/start` | starts a job, returns an id immediately |
| `GET /api/analyze/job/:id` | polls that job |
| `POST /api/labmat/analyze` | the graph-path entry point |
| `GET /health` | config + truncation counters + `graph` state |

The async pair exists because a three-page sheet takes 90–150s with `IMAGE_CONCURRENCY=1` and
`OCR_RETRIES=3`, and a phone that locks or backgrounds the tab was destroying the whole job — and
the real OCR spend with it. `jobStore.js` is **in-memory with a TTL**: a server restart drops
in-flight jobs, and behind a load balancer a poll can land on an instance that never had the job.
The client half is `khanesh/src/analyzeJob.js`, which keeps the job id in `localStorage` so a
returning user sees the finished result instead of an empty form.

---

## Git Hooks

`core.hooksPath` is set to `.githooks/`. The `pre-commit` hook runs, **only for the sub-project with staged files**:

- `khanesh-server/**.{js,mjs,json}` staged → `npm test` in `khanesh-server/`
- `khanesh/**.{js,jsx,mjs,json}` staged → `npm run lint` in `khanesh/`

A failure blocks the commit. `SKIP_HOOKS=1 git commit ...` bypasses it — don't reach for that to get past a failing clinical regression test; fix the test.

✅ **The gate measures the index, not your working tree** — since `1469449`. It was the other way
round until then, and that is how `acc9cc0` was committed 12-red on a green hook: the hook ran
`npm test` in the checkout, so a partial commit (`git add -p`, or staging two of three changed
files) was gated on code that wasn't going in. How the current hook works, because each part was a
failure someone hit:

- It builds the index tree with `git write-tree` + `git archive` into a temp dir, and runs the
  checks *there*. It deliberately does **not** `git stash -k` — a crash or a Ctrl-C mid-run would
  strand uncommitted work in a stash entry and leave the tree looking like the index, i.e. the
  hook would appear to have eaten your work. Nothing in the working tree is touched.
- It links `node_modules` into that temp tree, because without it `api-contract.test.js` can't
  import `express`, the whole file errors, and `T1`–`T10` go red — the hook would then block every
  commit with a fake failure. Same trap as the manual recipe under [Commands](#commands).
- On Windows it links with `mklink /J` (a junction) and falls back to `ln -s`, not the reverse:
  `ln -s` in Git Bash needs `MSYS=winsymlinks:nativestrict` or Developer Mode, and measured five
  runs on this repo, **three of them failed**.
- If the index tree can't be built, **the commit is blocked**, not waved through. The previous
  version fell back to the working tree, which is usually greener than the index — that made the
  gate random, and `8aaba5d` went through with 11 red tests that way. "I don't know" answers no.

`.env` is deliberately *not* linked in: it isn't committed, so the tests must not depend on it.
Measured — its absence turns nothing red.

The backend half was red for a long stretch on `api-contract.test.js` `T10`; that was the gate
working, and it was fixed in `2f964df` rather than skipped. `SKIP_HOOKS=1` on a clinical contract
test is the thing this file exists to talk you out of.

If the hook never fires on a fresh clone, `git config core.hooksPath .githooks`.

---

## Agents

Eight subagents in `.claude/agents/`. Invoke them by name. The first three are the everyday set;
the five `eval-*` agents are stages of the evaluation gate and are normally driven by the
`eval-gate` skill rather than called individually.

| Agent | Use it for | Can edit? |
|---|---|---|
| `research` | Facts before code: tracing a value through OCR → adapter → grade → patterns → prompt, finding where a test key is defined, sourcing a reference range or CTCAE grade, collecting real-world lab-sheet spellings for `NAME_MAP` | No |
| `code-reviewer` | Reviewing a diff for engine-boundary violations, wrong ranges/units/grading modes, missed `NAME_MAP` aliases, urgency errors, frontend/backend contract drift, privacy and Persian-string regressions | No |
| `qa` | Running `npm test`, `npm run lint`, `npm run build`, and direct engine spot-checks; writing regression tests in `rules/engine.test.js` for bugs just fixed | Yes |
| `eval-planner` | Gate stage 1 — turns a requested change into an approved `plan.json` before any code exists | Writes plan only |
| `eval-builder` | Gate stage 2 — implements that plan and nothing else; minimal diffs, no scope drift | Yes |
| `eval-medical-reviewer` | Gate stage 4 — clinical correctness only (ranges, units, grading, pattern logic, dangerous interpretations). Never reviews style | Writes report |
| `eval-trajectory-reviewer` | Gate stage 5 — scores *how* the builder got there from the session transcript: wasted loops, hallucinated edits, ignored tool output | Writes report |
| `eval-judge` | Gate stage 6 — blind PASS/FAIL on one question: did the implementation satisfy the task? Sees the task and the diff, never the other scores. Run last, with clean context | Writes verdict |

Typical clinical change: `research` (what should the range be, where does it live) → edit → `qa` (test it, lock it in) → `code-reviewer` (before commit).

For a change that needs a merge decision rather than a read, use the `eval-gate` skill — it
sequences all eight stages, three of which (`lib/checks.mjs`, `lib/risk.mjs`, `lib/gate.mjs`) are
deterministic code rather than another LLM opinion.

---

## Skills

- `professional-interpretation` (`.claude/skills/`) — when the user says an interpretation is too shallow/basic («ابتدایی») or asks for «تفسیر حرفه‌ای‌تر». Depth comes from richer `must_say`/`warnings`/`suggest` in `rules/patterns.js`, **never** from a model upgrade or a smarter prompt — that would break the engine boundary.
- `impeccable` (`.claude/skills/`, v4.0.2) — frontend design and UX work: `audit`, `critique`,
  `polish`, `bolder`, `quieter`, `harden`, `animate`, `shape`, and friends. It is installed three
  times over, once per tool that reads a different directory — `.claude/skills/impeccable/`
  (Claude Code), `.agents/skills/impeccable/` (Codex, plus four `agents/*.toml` + `openai.yaml`
  files the others don't have), `.github/skills/impeccable/` (GitHub) — and each has its own
  copy of `scripts/`, so **updating one does not update the others**. A `PostToolUse` + `Stop`
  design detector is wired to `scripts/hook.mjs` in `.claude/settings.local.json`,
  `.codex/hooks.json`, and `.github/hooks/impeccable.json`. To check an install for drift:
  `node .claude/skills/impeccable/scripts/doctor.mjs`.
- `eval-gate` (`.claude/skills/`) — the eight-stage merge gate described under [Agents](#agents).
  Its code lives in `.claude/eval-gate/` (`run.mjs`, `lib/*.mjs`, `fixtures/`, `regressions/`);
  per-run evidence lands in `.claude/eval-gate/runs/`, which is gitignored on purpose.
  `node .claude/eval-gate/selftest.mjs` checks the gate itself.
- `add-medical-rule` (`.agents/skills/`, Persian) — step-by-step procedure for adding a new
  clinical rule or pattern. It overlaps [rules-engine.md](.claude/rules/rules-engine.md); where
  they disagree, this repo's own rules files win, and note that the skill predates the
  `patterns_*.js` split described above.
- Design skills: `brandkit`, `design-taste-frontend` (+ a `-v1` copy in `.agents/`),
  `imagegen-frontend-web`. Multi-agent skills: `do-competitively`, `do-in-parallel`, `judge`,
  `judge-with-debate`, `multi-agent-patterns`, `parallel-deep-research`, `parallel-web-search`,
  `find-skills`.
- **Vendored skills are version-pinned.** `skills-lock.json` at the repo root records
  `source` (e.g. `Leonxlnx/taste-skill`), `sourceType`, `skillPath`, and a `computedHash` for each
  one. *(A previous version of this file claimed no such lock file existed "and never has" — it
  does; that claim was wrong.)* Don't hand-edit a vendored skill: re-vendor from source, which
  updates the hash. A skill whose files no longer match its `computedHash` has been edited in
  place and its provenance is gone.
- The same skill can exist in `.claude/skills/` and `.agents/skills/` as **two independent
  copies** — that's the same trap as the three `impeccable` installs. Changing one changes one.

---

## Lab Notebook — Things Not To Try Again

A running log of things a Claude instance actually did on this project that turned out to be
wrong. Every entry is a real fix in this repo's history, not a hypothetical. Read it before
touching `khanesh-server/rules/`.

**Keeping it current — do this without being asked.** Whenever a change you make (or a review
of your change) corrects something you got wrong, append an entry here in the same session,
before you report the work as done. Format: a short title, the commit hash, what was tried,
what it did to the patient-facing output, and the rule that generalizes. Don't log a mistake
whose only cost was your own time — this file is for wrong output, not wrong turns. If a new
mistake is a repeat of an existing entry, add the new hash to that entry instead of writing a
second one; a recurring entry is the strongest signal in the file.

### N1 — Adding a test to `NAME_MAP` + `refs.js` is not "adding a test"
`ecea2ca`, `0273509`, `3d5e1ce`, `ed5788d` — four separate recurrences of the same class.

- **Tried:** wire a new test through the adapter and reference ranges, see it appear in
  `extracted_tests`, call it done.
- **Broke:** with no matching rule in `patterns.js`, an abnormal value falls into
  `unmatched_abnormal` and the patient reads «برای این ترکیب توضیح آماده‌ای نداریم» next to a
  clearly abnormal number. Hit D-dimer, calcium, vitamin D, ESR, and qualitative CRP.
- **Rule:** the checklist in [rules-engine.md](.claude/rules/rules-engine.md) is five files, and
  `patterns.js` is the one that gets skipped. If a test is graded `binary`, it has *no*
  interpretation unless a pattern picks it up. Verify by running the panel through the engine and
  checking that `unmatched_abnormal` is absent — not by checking that the test was extracted.

### N2 — An unmapped test doesn't fail loudly; it turns into "you're healthy"
`ed5788d`, `3d5e1ce`, `3d9fbd9`

- **Tried:** assume `NAME_MAP` already covers the spellings a lab sheet uses.
- **Broke:** real sheets print `Creatinin` (no e), `cholestrol`, `Triglicerde`, `ESR 1hrs`,
  and Iranian serology rows (رایت، ۲ME، کومبس رایت). Unmapped tests never reach `abnormal`, so a
  sheet whose only abnormality was «رایت ۱/۳۲۰» got the canned `buildNormalResult()` response.
  Silent under-reading is the worst failure mode this app has.
- **Rule:** get the spellings from real sheets (`research` agent), not from your own idea of how
  the test is spelled. But do **not** add fuzzy matching to compensate: `resolveAlias()` only does
  unambiguous prefix/plural/trailing-e aliases, because a *wrong* mapping in clinical text is worse
  than no mapping. When you touch the adapter, count `unmapped` before and after.
- **`NAME_MAP` is not the only gate a name has to pass** (`3d9fbd9`). A qualitative test must also
  be in `adapter.js`'s `QUALITATIVE` set/patterns, and then the *pattern's own* name regex has to
  match. All three failed at once for the HIV/HCV/HBV screens: the allowlist held bare `hiv`, but
  sheets write `HIV Ab` / `Anti-HIV`, so the value never reached `qual`; and `serologyReactive`
  tested the raw key against space-free patterns like `/hepatitisc/`, the same defect already
  fixed in `qualPositive` for «RA factor» and never carried across. Net effect: three screening
  rules that could not fire on any realistic sheet, and a reactive HIV screen answered with
  `buildNormalResult()`. Coverage tests are what surfaced it — the rules looked fine when read.
- **Widening a name matcher can create a false positive in the same breath** (`3d9fbd9`). Once
  anti-HBs reached `qual`, the HBV rule's `/hbs/` alternative matched it — and anti-HBs is the
  *immunity* marker, so a vaccinated patient would have been told they may have hepatitis B. When
  you widen a matcher, enumerate what else the wider pattern now catches, and check each one is
  clinically the same thing. Antigen ≠ antibody.

### N3 — Grading a sheet's number against a unit the sheet doesn't use
`ed5788d`, `4de8ca4`, `ecea2ca`

- **Tried:** take the reference range from a textbook and compare the OCR'd number to it directly.
- **Broke:** `refs.js` wants WBC/PLT in K/µL and RBC in M/µL, but sheets usually print raw counts.
  `WBC = 7000` scored against `4.4–11` turned the single most common test in the app into
  «لکوسیتوز شدید — بررسی فوری» on a completely normal CBC. Same class: urea graded against a BUN
  range, D-dimer against the wrong unit.
- **Rule:** before adding a threshold, establish what Iranian sheets actually print for that
  analyte. Normalize in `adapter.js` with a threshold set far above the highest clinically possible
  value (WBC 1000, PLT 3000, RBC 100) so a genuinely critical result is never halved. And never
  reintroduce the urea→BUN conversion — see [architecture.md](.claude/rules/architecture.md) step 4.
- **The per-test whack-a-mole was itself the bug** (2026-07-27, `rules/units.js`). Five analytes had
  a unit guard, each added after its own incident; every other analyte had none. The unguarded one
  that mattered most was HbA1c: IFCC units are mmol/mol, so a sheet printing `48` — exactly the ADA
  diabetes threshold, 6.5% — was graded against `[4, 5.6]`. `units.js` now covers the whole SI
  table, still refusing to convert unless the sheet states the unit. Adding a numeric test without
  asking "which unit systems print this analyte?" is the same mistake in a new place.

### N4 — Telling the patient about a test they didn't have
`9c93319`

- **Tried:** `if (!crHigh) { …"kidney marker is still normal"… }`.
- **Broke:** `!crHigh` collapses *normal*, *low*, and *absent* into one branch, so a sheet with no
  creatinine at all told the patient their kidney function was fine — inside an `emergency`
  finding with `blocks_others`, which is the only text the patient sees and which no downstream
  safety net inspects.
- **Rule:** a missing test is not a normal test. Any finding that reports on another analyte needs a
  three-way branch (high / normal / not measured), and "not measured" in an emergency finding is an
  action item, not silence.

### N5 — Printing a derived number as if it were on the patient's sheet
`9c93319`

- **Tried:** quote `e.graded` values in `must_say` text.
- **Broke:** `graded` calcium is albumin-corrected (7.3) and does not appear anywhere on the
  patient's paper (6.2); the rule that explains the correction was suppressed underneath the
  emergency. Same commit: eGFR was quoted during rhabdomyolysis, where CKD-EPI is invalid because
  it assumes a stable creatinine.
- **Rule:** if you quote a number, say whether it's the measured value or a corrected one, and check
  the correction's own explanation isn't being suppressed by `blocks_others`. Derived indices
  (eGFR, corrected Na/Ca, anion gap) each have preconditions — confirm they hold in *this* pattern.

### N6 — Converting a qualitative result into a number
`ed5788d`

- **Tried:** translate CRP «۳+» into mg/L so it could be graded on the numeric scale.
- **Broke:** the conversion factor differs per kit and the qualitative plate has no formula at all.
  The output would have been fabricated data wearing a real number's clothes.
- **Rule:** qualitative stays qualitative — give it its own classifier and its own pattern. Titres
  get `parseTitre()` (`toNum("1/160")` returns 1160). Thresholds for Iran-specific serology come from
  the national guideline, not CDC, when the dominant species differs.

### N7 — Fixing a "the model dropped it" bug anywhere except the engine
`0b2ebd8`, `db20d28`

- **Tried:** cap `interpretation` at 5 sentences, then have `server.js` verify emergency coverage by
  literal substring match on the headline or the whole `must_say`.
- **Broke:** the cap contradicted the prompt's own rule 1 ("convey `must_say` in full"), so the model
  either truncated the tail (where the CK-repeat instruction lived) or summarized — and summarizing
  made the substring match fail, so the safety net re-appended the entire block. Live run:
  19 sentences, 4 of them verbatim duplicates. The richer `must_say` got, the more certain the bug —
  the safety net was in direct opposition to the `professional-interpretation` skill.
- **Rule:** safety nets compare meaning, not characters (`rules/coverage.js`, sentence-level, distinctive
  tokens, threshold 0.6, biased toward re-adding). And never resolve a text-quality complaint by
  upgrading the model or loosening the prompt's clinical constraints — that's the engine boundary,
  and it's the reason this architecture exists.

### N8 — Letting engine vocabulary reach the patient
`0273509`, `ed5788d`, `7db9a7e`

- **Tried:** interpolate keys and recommendation strings straight into user-facing text.
- **Broke:** «درخواست آزمایش HGB از پزشک»; the «درخواست آزمایش X از پزشک» template wrapped around
  something that wasn't a test name, giving «درخواست آزمایش مشاوره با پزشک … از پزشک»; and tests
  already present on the sheet were "requested" again («درخواست آزمایش فریتین» when ferritin was
  measured).
- **Recurred again on a brand-new surface** (2026-07-27, `ResultView.jsx` `UnitConversions`). The
  IFCC unit-conversion block was written to render `row.test` — the raw engine key — so a patient
  whose sheet used SI units would have read «HBA1C» in the one block whose whole job is to reassure
  them the numbers match. Every *new* patient-facing surface re-opens this hole; the fix is that the
  server attaches a `faName()`-resolved `name` alongside the key, and test `G7` asserts every
  convertible key exists in `FA_NAMES`.
- **Rule:** every key goes through `faName()`. For a test that was already measured, the phrasing is
  «تکرارِ …», not a fresh request. Deduplicate recommendations by first sentence and drop
  data-driven subsets (سرم آهن + TIBC under «پنل کامل آهن») — a plain `new Set` left 19 near-identical
  lines on an ordinary panel.
- **Near-miss, now machine-checked:** an audit found `ACR` fully wired (`refs.js`, `interpret.js`
  KDIGO bands, `albuminuria_pattern`) but absent from `FA_NAMES`. It never reached a patient only
  because that pattern's text hand-spelled the label instead of calling `faName()`; the
  `unmatched_abnormal` net would have printed «ACR» raw. Test `M32` in `engine.test.js` now asserts
  every key in `ADULT_REFS`/`CLASSIFIERS`/`CTCAE_MAP` is present in `FA_NAMES`, so this class is
  covered by `npm test` — don't re-audit it by hand. It checks *presence*, not that the Persian
  name differs from the key: for MCH, MCHC, HDL, LDL, INR, TIBC the abbreviation is the correct
  patient-facing name.

### N9 — Editing a prompt to fix clinical wrongness
Standing rule; the whole architecture is the fix.

- **Tried (tempting, don't):** "the interpretation is shallow / wrong — I'll improve the system prompt
  or move to a stronger model."
- **Broke:** this is exactly what the engine exists to prevent. `gpt-4o-mini` recommended iron for
  macrocytic anemia; the answer was not a better prompt.
- **Rule:** depth and correctness come from richer `must_say`/`warnings`/`suggest` in `patterns.js`.
  See the `professional-interpretation` skill. Prompts format text; they never judge.

### N10 — A regression test that also passes on the old code
Convention in `rules/engine.test.js`.

- **Tried:** add a test alongside a fix without checking it against the pre-fix behaviour.
- **Broke:** it locks in nothing and reads as coverage that doesn't exist.
- **Rule:** run the new test against the old code and confirm it fails. One test per real fixed bug,
  commented in Persian. Never `SKIP_HOOKS=1` past a red clinical test — that gate is the last thing
  standing between a bad rule and a patient.

### N11 — Frontend assumptions that don't survive the real environment
`7545772`, `9bd1066`, `REF_DIFF.md`

- **Tried:** a `mountedRef` guard for the analyze request; committing the git hook from Windows;
  assuming a range change in `refs.js` reaches the manual-entry form.
- **Broke:** React StrictMode's double mount left the AI spinner hanging forever in dev; the hook
  landed without its exec bit, so Git silently ignored it on Linux/macOS and nobody else's commits
  were gated; and `Tafsir.jsx`'s `REF` is a deliberately separate copy, so manual entry kept the old
  range (frontend TSH is still 5.0 while the backend is 4.5).
- **Rule:** frontend has no tests — trace the code path by reading it, in StrictMode terms. Check
  `git update-index --chmod=+x` on anything executable. When a range changes, decide explicitly
  whether `REF` follows, and record the answer in `REF_DIFF.md`.
- **`overflow-x: hidden` on a wrapper silently kills `position: sticky` for everything inside it**
  (2026-07-29, `site.css`). The content pages' fluid `clamp(…vw…)` headings can overflow by a pixel,
  so the `.site` wrapper got `overflow-x: hidden` as a guard. That makes the wrapper a scroll
  container, and a sticky descendant sticks to *it* rather than the viewport — so the sticky header
  and the sticky table-of-contents both just scrolled away. Nothing errored; lint and build were
  green; it looked correct in a top-of-page screenshot. Measured in the browser at scroll 4100:
  the header's `bottom` was `-4025`. Fix is `overflow-x: clip`, which clips without creating a
  scroll container.
- **Rule:** a screenshot of the top of the page proves nothing about scroll behaviour. Assert the
  post-scroll geometry (`getBoundingClientRect().top` after `scrollTo`) — and prefer `clip` to
  `hidden` on any wrapper that has, or might later contain, a sticky child.

### N12 — A severity state that swallowed the direction
`bfc70fa` (fix). Found by a generator agent on platelets, confirmed by the orchestrator to be
five analytes wider.

- **Tried:** in the manual-entry local preview, pick the explanatory sentence with
  `row.status === "above" || row.status === "crit" ? m.high : row.status === "below" ? m.low : m.about`.
- **Broke:** `statusOf()` returns a single `"crit"` for *either* end of the critical range, so
  folding `crit` into the `above` branch explained every critically **low** value with the
  **high** text. Not a near-miss — the sentences are clinically opposite:

  | value | what it is | what the patient read |
  |---|---|---|
  | K 2.5 | hypokalemia | «بالا (هایپرکالمی) می‌تواند خطر آریتمی قلبی ایجاد کند» |
  | Na 115 | severe hyponatremia | «بالا اغلب به کم‌آبی مربوط است» |
  | WBC 1.5 | severe neutropenia | «بالا اغلب نشانه عفونت، التهاب یا استرس است» |
  | PLT 40 | bleeding risk | «بالا می‌تواند واکنشی … باشد» |
  | Glucose 30 | hypoglycemia | «۱۰۰ تا ۱۲۵ پیش‌دیابت و ۱۲۶ به بالا … دیابت» |

  Every analyte with a lower `crit` bound was affected. The badge was right and the sentence
  under it was inverted, which is worse than no sentence: it reads as confirmation.
- **Rule:** **severity and direction are two axes, never one.** A state that means "far out of
  range" says nothing about *which* end, so never branch explanatory text on it. Derive
  direction from the value against the range and branch on that
  (`LocalPreview.jsx:106-108`: `row.v > r.high ? "high" : row.v < r.low ? "low" : null`).
  The same shape hides anywhere a `crit`/`critical`/`emergency` state sits in a conditional
  beside `above`/`high` — grep for it before adding a state, not after.
- **Why it survived so long:** the local preview is the *only* screen with no engine behind it,
  so no `must_say`, no coverage check, and no backend test ever saw this text. Frontend-only
  clinical strings have no safety net — they need the same scrutiny as `patterns.js`, and they
  don't get it automatically.
- ⚠️ **Recurred twice more, 2026-08-06, in the backend engine** (`potassium_critical`,
  `sodium_critical`). This is now the most-repeated entry in the file, and the new shape is worth
  naming because it is *latent*: both rules derived direction from a **severity threshold** —
  `const high = t.K >= 6.0` and `const high = t.NA >= 155` — which was *correct* only because each
  rule's `match` happened to exclude everything between the two extremes. The bug was armed and
  waiting for someone to widen the `match`. Widening the rules to cover every abnormal value (the
  `calcium_abnormal` shape) would have made `K 5.6` read «پایین‌تر از حد طبیعی» and `Na 148` read
  «سدیم پایین است». Guards `M48c` and `M49b`.
- **Rule, sharpened:** it is not enough that direction is *currently* right. Derive it from
  `graded.dir` — never from a comparison against a severity cutoff — even when the two agree
  today. A correct-by-coincidence expression is a bug with a delayed fuse, and the fuse is lit by
  the next person who broadens the rule.
- **Same axis-confusion, one level up — a derived index read without its context** (2026-08-06,
  `high_anion_gap`). Measured: `Na 142 / Cl 92 / HCO3 36` → anion gap 14 → the rule fired and told
  the patient «این می‌تواند نشانهٔ تجمع اسید در بدن باشد». Bicarbonate 36 is *alkalosis*, and
  contraction alkalosis raises the anion gap mildly, so this is not an exotic panel. The anion gap
  is a **directionless number**: it says how much unmeasured anion is present, never whether the
  patient is acidotic. Fixed by gating the rule on `HCO3` not being high, and giving alkalosis its
  own rule. Guard `M52`.
- **Rule:** before interpreting any computed index (`anion_gap`, `bun_cr`, `r_ratio`, `nlr`,
  `non_hdl`, `osm_gap`), write down which measured value supplies its direction, and gate on that
  value explicitly. An index that can be produced by two opposite clinical states must never carry
  a one-directional sentence.

### N17 — A rule that reads a key which doesn't exist fails as a confident false claim, not as silence
2026-08-06, `ckd_pattern_diagnostic` in `patterns_nephrology_new.js`. Fixed; recorded because the
*failure mode* is the reusable part.

- **Tried:** read a derived value the way graded tests are read — `val(e).EGFR`.
- **Broke:** `val(e)` only flattens `e.graded`, and eGFR is never a graded test — it lives in
  `e.indices.egfr`. So the read returned `undefined` forever. That alone would have been a merely
  dead branch. What made it a patient-safety defect was the *fallback*: the text was written as
  `${egfr != null ? egfr : 'طبیعی'}`, so a permanently-`undefined` read did not go quiet — it
  asserted. Measured live on `ACR 45` with no creatinine on the sheet:

  > «مقدار eGFR شما **طبیعی** و نسبت آلبومین به کراتینین ادرار (uACR) شما 45 است.»

  The engine had never computed eGFR, and the patient was told it was normal. Same class as N4,
  reached by a different road — and `persistent_microhematuria` in the same file had the twin bug
  (`val(e).U_RBC`, which simply made the rule unreachable).
- **Why no guard caught it:** `M36` sees a well-formed rule object, `M37` sees clean encoding,
  `M38` sees Persian strings. All three are properties of code that *exists*. Nothing checks that
  the keys a rule reads are keys the engine can produce.
- **Rule:** `val(e)` is for graded tests only. Derived values are on `e.indices`, qualitative and
  urine values are in `e.qual` (via `urineCellCount`/`urinePositive`/`urineGrade`). Before writing
  `val(e).SOMETHING`, confirm `SOMETHING` is a key in `ADULT_REFS` — if it isn't, the read is dead.
- **And the sharper rule:** **never write `x != null ? x : 'طبیعی'`.** A missing value must produce
  the "not measured" branch, never the reassuring one — that is N4's whole content. When a
  three-way branch is right, write all three arms; a binary fallback on an absent test is a false
  claim waiting for the read to break. Guards `M56`, `M56b`.
- **Cheap detector for the next rewrite:** diff the rule-id set before and after
  (`node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"`,
  per N16) *and* grep the diff for `val(e).` reads whose key is absent from `refs.js`.

### N13 — Sending OCR raw data directly to diagnostic agents
- **Tried:** pass `state.rawData` to diagnostic LLMs alongside `engineOutput`, instructing them to "IGNORE reference ranges in rawData and trust engineOutput".
- **Broke:** models ignore the negative instruction when it contradicts their pre-training. Given `Hb: 12.3` and an OCR range of `13.5-17.5` for a 78yo Male, the engine correctly classified it as normal (`GERIATRIC_REFS`). But the LLMs saw the `rawData` range (or relied on their internal adult bounds) and hallucinated it as abnormal, generating differential diagnoses like MDS and writing `(بالا)` or `(پایین)` contrary to the engine's explicit `abnormal: false` flag.
- **Rule:** the engine boundary is absolute. If a module relies on the engine's clinical judgement, it must **never** be allowed to see the raw test numbers combined with OCR ranges/flags. An LLM cannot unsee contradictory raw bounds. Supply only the normalized, age-adjusted `engineOutput` to LLMs performing downstream reporting.
- **Status:** this is why `USE_GRAPH` defaults to off. The graph path still receives `rawData`.
  See [The LabMat Agent Graph](#the-labmat-agent-graph-use_graph).

### N14 — A blanket `*.png` gitignore that ate the product's own images
2026-08-03, `.gitignore`. Not clinical — but it ships a broken page.

- **Tried:** `.gitignore` a blanket `*.png` to keep Playwright/debug screenshots out of the repo.
  Reasonable at the time: the root really does collect `root.png`, `landing-ok.png`,
  `ocr-result.png`, `site-up.png`, `az-default.png` from UI checks.
- **Broke:** the pattern has no path anchor, so it also matches `khanesh/public/lab/*.png` — the
  landing page's own imagery. `Landing.jsx` and `Tests.jsx` reference at least 12 of them
  (`hero_image_lab_ai.png`, `couple.png`, `doctor-tablet.png`, `lab_modern_tech.png`,
  `cbc_card.png`, `thyroid_card.png`, `diabetes_card.png`, `res-1/2/3.png`, `news.png`). Exactly
  one `.png` in the whole repo is tracked — `khanesh/src/assets/hero.png`, and only because
  `.gitignore` has no effect on a file that was already tracked when the rule landed; nothing
  imports it. **On a fresh clone the landing page — the app's `/` route — renders with every hero
  and card image 404.** It looks fine locally forever, because the files are sitting right there,
  untracked.
- **The workaround made it worse:** someone hit this and renamed files to dodge the pattern, so
  the tree now holds `cbc_card.png.jpg`, `thyroid_card.png.jpg`, and `diabetes_card.png.PNG`
  (that last one is *also* ignored — the pattern is case-insensitive on Windows). Those double
  extensions are a symptom, not a fix; the code still asks for `/lab/cbc_card.png`.
- **Rule:** anchor an ignore pattern to the directory that actually produces the junk
  (`/*.png`, `.playwright-mcp/`), never a bare `*.ext` in a repo that ships assets of that type.
  After touching `.gitignore`, verify with `git status --porcelain --ignored <asset-dir>` that
  nothing the app loads has become ignored — and treat a filename like `x.png.jpg` as evidence
  that someone already tripped over this and routed around it instead of fixing it.
- ✅ **Fixed 2026-08-05 (staged, not committed).** `*.png` → `/*.png`, and the 11 referenced
  images staged. Verified against the **index tree**, not the working tree — the working tree
  always passes here, which is why this survived so long: `git archive $(git write-tree)
  khanesh/public/lab`, then resolve every `/lab/…` path `grep`ped out of `khanesh/src/`. All 13
  resolve. The five root screenshots N14 named (`root.png`, `landing-ok.png`, `ocr-result.png`,
  `site-up.png`, `az-default.png`) are still ignored, now by `.gitignore:5`.
- **Left open on purpose:** the workaround files (`cbc_card.png.jpg`, `thyroid_card.png.jpg`,
  `diabetes_card.png.PNG`) are still untracked on disk — nothing references them; deleting them
  is a separate call. And the 11 tracked `.png` are **7.1 MB**, while optimized `.jpg` twins of
  four of them are already tracked at **212 KB total** (`res-1/2/3.jpg`, `news.jpg` — ~15×
  smaller). Pointing `Landing.jsx` at the `.jpg` and re-exporting the other seven is the right
  follow-up; it was not folded in here because it changes rendered output and needs eyes on the
  images, whereas tracking what the code already names does not.

### N15 — A green suite proves nothing when the damage is invisible to the tests
2026-08-04, `5059a05`. Two instances in a single session, from one careless bulk edit.

The shared shape: a mechanical fix (`sed`, an encoding conversion) was run across many rules
files at once, and the resulting damage landed in exactly the places the test suite does not
look. Neither showed up as an error. One of them made the suite *greener*.

**(a) 62 array elisions turned 42% of the rules engine off, and the suite stayed green.**

- **Tried:** repair mojibake across `patterns_*.js` with a bulk `sed`. It also rewrote `},` to
  `},,` (58×) and `[` to `[,` (4×).
- **Broke:** in JavaScript those are *array elisions* — `[, {a}, , {b}]` has holes. `RULES` went
  from 87 entries to 149, of which **62 were `undefined`**. Nothing threw, because
  [patterns.js:146](khanesh-server/rules/patterns.js#L146) opens the loop with
  `if (!rule?.id) continue;` and skipped every hole in silence. `npm test` was **identical**
  before and after: the corrupt engine and the healthy one scored the same.
- **Why it was invisible:** no test asserted anything about the *shape* of `RULES`. Every test
  exercised rules through `runPatterns()`, and the holes were between rules, so no individual
  rule went missing — only the array's integrity was destroyed, and nothing measured that.
- **Guard:** test `M36` in `rules/engine.test.js` asserts every `RULES` entry is an object with
  an `id`, that each has callable `match`/`build`, and that no `id` repeats. It fails against the
  corrupt state with `62 خانه از 149 خالی است`. It also caught a **pre-existing** defect the
  same class had hidden: two stray *import objects*
  (`{preanalyticalCaveats, attachPreanalytical}`, `{repeatDeltaFa}`) — object-shorthand copies of
  the file's own `import` lines, sitting at the head of the `RULES_HEMATOLOGY` array literal in
  [patterns_hematology.js:7-8](khanesh-server/rules/patterns_hematology.js#L7-L8). Removed in
  `c093712`; `M36` fails against the state before it with `2 خانه از 85 خالی است` at indices 26–27.
  ⚠️ **An earlier draft of this entry put them in `RULES_ANEMIA` / `patterns_anemia.js` — wrong,
  and wrong in the way that costs a session.** `grep` for those identifiers finds nothing, because
  the working tree's uncommitted hematology rewrite had already dropped them; they survive only in
  the committed tree. The way to locate an offending `RULES` index is to *derive* it — sum the
  lengths of the spread arrays in `patterns.js` until the index lands inside one
  (`RULES_INFECTIOUS` 0–9, `RULES_NEPHROLOGY` 10–20, `RULES_NEPHROLOGY_NEW` 21–25, so 26 is the
  first hematology entry) — not to guess from the rule's subject matter.

**(b) Mojibake hid 37 red tests behind a quoted baseline nobody re-derived.**

- **Tried:** trust this file's stated baseline — `186 tests, 185 pass, 1 fail` — as the number to
  establish before starting.
- **Broke:** that was the **working tree's** number. The *committed* tree was `137 pass, 49 fail`.
  Every Persian string in nine `patterns_*.js` files was UTF-8 decoded as cp1252 and re-saved
  («تروپونین» stored as «ØªØ±ÙˆÙ¾ÙˆÙ†ÛŒÙ†»), so 37 tests asserting patient-facing text could not
  possibly match. A new session that cloned the repo, ran `npm test`, and compared against the
  documented 185/1 would have concluded it had broken 48 tests itself.
- **Rule:** **a baseline is measured, never quoted.** Re-derive it from the tree you are actually
  about to change, and say which tree that was. A number in a document is a claim about a moment,
  and this file has now been wrong about it once.
- **Guard:** test `M37` in `rules/engine.test.js` now does this — three assertions, added
  2026-08-04. It replaces the `grep` one-liner this entry used to recommend.
  1. **Source scan.** No `.js` file under `rules/` may contain a mojibake character
     (`U+00D8`–`U+00DB` — the mojibaked lead byte of every Persian letter — plus `U+00C3`,
     `U+00E2`, `U+FFFD`). None of those has a legitimate use in this repo's Persian or English,
     so *presence alone* is the failure. Verified against a deliberately mojibaked probe file:
     `این فایل‌ها mojibake دارند: _n15_probe.js (43 نویسه)`.
     ⚠️ The test writes those characters as `\uXXXX` escapes on purpose — spell them literally
     and the check fails on its own source. (It did, on the first draft.)
  2. **Destroyed-text scan.** Live `patterns_*.js` files may not contain a run of 3+ `?`. This is
     a *second, worse* class than mojibake: Persian saved through a single-byte encoding becomes
     literal `?` and is **unrecoverable** — the bytes are gone, not permuted. The "live" list is
     derived from `patterns.js`'s own `import` statements, not hand-maintained, so nothing can be
     quietly exempted.
  3. **Runtime scan.** The N15 panel (`WBC 114`, `PLT 46`, `HGB 8.1`) is run through the engine
     and every string in the output is checked for both classes. It first asserts
     `acute_leukemia_suspicion` actually fired — because if the rule doesn't fire, scanning its
     output proves nothing and yields exactly the meaningless green this entry is about.

**(c) What it actually did to a patient, and what was still broken a day later.**

- **The patient impact of (b), stated plainly.** On a panel with `WBC 114` and `PLT 46` the engine
  worked perfectly: `acute_leukemia_suspicion` fired, urgency was `emergency`, and the safety net
  returned the mandatory text. But that one sentence — «احتمال لوسمی حاد، بدون تأخیر به اورژانس
  مراجعه کنید» — rendered as mojibake, because it lived in one of the nine damaged files. The rest
  of the report was clean, since it came from files the `sed` never touched. **The single most
  important sentence in the report was the only unreadable one**, and every structural assertion
  about it passed. That asymmetry is the whole point: encoding damage is not evenly distributed
  across a report, and the fraction that is unreadable tells you nothing about which fraction it is.
- **The damage was in the *working tree*, not in a file `5059a05` skipped.** An earlier draft of
  this entry said "`5059a05` repaired nine files and missed a tenth" — that is wrong, and the
  diffstat disproves it in one command: `patterns_anemia.js` is the **first** of the nine files in
  `git show --stat 5059a05` (98 changed lines). What was actually true on 2026-08-04 is the
  reverse of a miss — `HEAD`'s copy was clean and the *uncommitted* copy was mojibaked, i.e. an
  in-progress edit had re-broken a file the commit had already fixed. It survived for the reason
  it is safe to miss and dangerous to leave: **nothing imports it**, so no test could see it, and
  `npm test` stayed green at 187/186/1 with a whole rules file unreadable. Recovered by
  round-tripping cp1252→UTF-8 (2296 Persian characters restored, 0 residual, CRLF preserved,
  `node --check` clean, all 10 `RULES_ANEMIA` ids intact); it now scans clean at `0` mojibake
  characters.
- **Rule:** before writing "the fix missed file X", diff the fix. "Which files did that commit
  touch" is `git show --stat <sha>` and it is never worth guessing — a wrong claim of omission
  sends the next session hunting for damage that was repaired weeks ago, and it discredits the
  entry that would otherwise have been believed.
- **Recovery has a floor, and part of that file is under it.** Two rules that exist *only* in the
  working tree — `anemia_macrocytic_mds` and `anemia_spherocytosis` — have 8 Persian strings
  (`headline`, `must_say`, `action`, `suggest`) saved as literal `?`: `"??? ????????? ???? ??????
  …"`. That is a different failure from mojibake and **cannot be decoded back**; the information
  no longer exists in the file. No Persian was invented to fill them in — writing plausible-looking
  clinical text into a `must_say` is precisely the thing this architecture forbids. They are
  harmless today because the file is dead, and `M37`'s second assertion is wired so that importing
  `RULES_ANEMIA` into `RULES` turns the suite red until that text is rewritten by a human.
- **Rule:** a mechanical repair is only complete over the set you *enumerated*, not the set you
  meant. After a bulk fix, re-run the detector over the **whole** directory — including files
  nothing imports — because "no test covers it" is the reason damage survives there, not a reason
  it is safe. And distinguish the two damage classes when you report one: mojibake is recoverable,
  `?` is not, and calling both "an encoding issue" hides which one you are looking at.

**The generalizing rule, and the one worth remembering:** when you change many files with one
mechanical command, the suite passing is *not* evidence the command did what you meant. Ask what
the tests actually observe, then verify the thing they don't — here, `RULES.length` and the
absence of `undefined` (one `node -e`), and the encoding of the files themselves. For an
encoding repair specifically, prove it is content-neutral by re-encoding each changed line back
through cp1252 and asserting it reproduces the original bytes; `5059a05` is 1006 insertions and
1006 deletions with zero net change, which is what encoding-only looks like in a diffstat.

⚠️ And note what defeated the safety net: `if (!rule?.id) continue` is a *defensive* guard, and
its defensiveness is what let a third of the engine go dark quietly. A guard that skips bad data
without counting it converts a loud failure into a silent one. If you add one, count what it
skipped and fail when the count is non-zero.

### N16 — Every guard in this repo watches the rules that exist; none watches the one you deleted
2026-08-05, `spherocytosis_likely`. Fixed in the working tree; recorded because the *gap* is
structural, not specific to that rule.

- **Tried:** rewrite `patterns_hematology.js` and, in the course of it, drop a rule that was going
  to be replaced by `anemia_spherocytosis` in `patterns_anemia.js`. The replacement never landed —
  that file is dead and its text is destroyed (N15(c)) — so the id ended up in **zero** files.
- **Broke:** on the matching panel (Hb 10.5, MCV 88, MCH 30, MCHC 37, RDW 16.5) the engine returns
  `normocytic_anemia` and stops. The patient gets a plausible, complete-looking report that never
  mentions red-cell shape, never quotes the MCHC that triggered it, and never asks for the
  peripheral blood smear that is the whole point. Under-reading dressed as a finished answer.
- **Why nothing caught it — check this list before trusting a green suite after a rewrite:**

  | guard | what it observes | sees a deleted rule? |
  |---|---|---|
  | `M36` | `RULES` integrity: no holes, callable `match`/`build`, no duplicate ids | **no** — a shorter array is still a valid one |
  | `M37` | encoding of the files that exist | **no** |
  | `M38` | language of the strings that exist | **no** — deleted strings aren't scanned |
  | `runPatterns()` | whatever did fire | **no** — it has no expectation of what *should* have |

  Every one of them is a property of the present tense. Deletion is the one edit with no artefact.
- **Rule:** a rewrite is not a refactor until you diff the **id set**, not the file. Before and
  after: `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"`
  and compare. Any id that leaves the set is a clinical deletion and needs the same review as a
  clinical addition — a source, a decision, and a line in `MEDICAL_RULES.md`. "It's being replaced"
  is a plan, not a state; verify the replacement is in `RULES` in the same change, or don't remove
  the original.
- **And write the negative control, don't assert it.** `M41` locks the restored rule in; it was
  verified by filtering the id back out of `RULES` in a temp copy and watching it go red
  (`166 pass · 1 fail`, `الگوی اسفروسیتوز فعال نشد؛ فعال‌شده‌ها: normocytic_anemia`). That run is
  also what corrected this entry: the pre-fix claim in `MEDICAL_RULES.md` was "the patient gets no
  finding at all", and the measurement says otherwise. N10 asks you to run the test against the old
  code — do it literally, because it tells you what the bug *was*, not just that the test works.

### N18 — A safety net that only fires when nothing else did is not a safety net
2026-08-06, `unmatched_abnormal` in `patterns.js`. Fixed; the shape is the reusable part.

- **Tried:** guard the "we have no rule for this" case with `if (findings.length === 0 &&
  engineOut.abnormal.length > 0)`. Reasonable-looking: if the engine produced *nothing*, say
  something. It is the net that caught `WBC = 258`.
- **Broke:** the condition is `=== 0`, so the net switched itself off the moment any *other*
  rule fired. On a real sheet — where something almost always fires — an abnormal test with no
  rule was not given a vague message. It was **not mentioned at all**. Measured:

  > panel `Hb 9.5 · MCV 70 · ferritin 6 · Mg 0.68 · Phos 1.0`
  > → `microcytic_anemia, iron_deficiency_panel`
  > → `منیزیم در متن؟ false | فسفر در متن؟ false`

  Magnesium 0.68 and phosphate 1.0 both graded `abnormal: true` and then vanished. The patient
  reads a complete, confident write-up about iron deficiency. That is the N2/N16 class, and the
  completeness is what makes it dangerous.
- **The measurement that sizes it:** pushing each of the 82 `ADULT_REFS` keys out of range one at
  a time, on an otherwise-normal full panel, **33 of 44 directions produced only
  `unmatched_abnormal`** — i.e. a third of the graded vocabulary has no rule of its own. The net
  is not an edge case; it is load-bearing, and it was disabled exactly when other findings existed.
- **Rule:** a net whose trigger is "the normal path produced nothing" only covers total failure,
  never partial. Write the condition over *what is still uncovered*, not over *whether anything
  happened*. Any time you see `=== 0` / `.length === 0` guarding a fallback, ask what the partial
  case looks like — that is where the silence lives.
- **On detecting "uncovered", and why one signal was not enough:** the fix has to decide whether a
  fired finding already accounts for a test. Two obvious signals, both measured, both wrong alone:
  scanning the finding *text* for the test's name gave 6 false positives on a liver panel
  (`liver_pattern` discusses AST/ALT without naming them); scanning the rule's *source* for the key
  marked `IRON` covered on an iron panel where nothing said anything about it. The `AND` of the two
  cut the liver panel to one and kept the real gaps. **Strip comments before scanning source** —
  `toString()` keeps them, and `// PT>25 … INR>3` would mark keys as read that the code never
  reads. That error direction is silence, which is the one this whole entry is about.
- **And don't buy precision with an exception list.** `MCH` and `RDW_CV` have no rule anywhere, so
  they surface on nearly every anemia panel and dilute the output. The tempting fix is to suppress
  them when `MCV` is covered. Don't: an unsourced suppression list is how N16 happened. Give them
  real coverage inside the anemia rules instead. Logged as open in `MEDICAL_RULES.md` `E5`.
- **Guards:** `M58`, `M58b` (negative control), `M58c`. Verified against the pre-fix code in a temp
  copy — `M58` and `M58c` go red there. Note the copy needs `node_modules` junctioned in or the
  whole file dies on `Cannot find package 'acorn'`, the same trap the Commands section warns about.

### N19 — Covering the borderline case and not the frank one
2026-08-06, `borderline_b12_deficiency`. Same session as N18, found by the same probe.

- **Tried:** write a rule for the clinically interesting *grey zone* — `150 ≤ B12 ≤ 399`, the band
  where the lab flags nothing but the patient may still be deficient. Genuinely good clinical
  thinking, and the rule itself is fine.
- **Broke:** nothing covered `B12 < 150`. So `B12 = 80` — an unambiguous deficiency — fell through
  to `unmatched_abnormal` and got «برای این ترکیب توضیح آماده‌ای نداریم», while `B12 = 250` got a
  paragraph. **The worse the number, the less the patient was told.**
- **Rule:** when a rule's `match` is a *band* rather than a threshold, both edges are new gaps.
  Before merging one, run the analyte past each edge and check what fires. A band that starts at a
  non-zero lower bound is claiming someone else owns the region below it — verify that someone
  exists, exactly as N16 asks you to verify a replacement exists before deleting a rule.
- **Guards:** `M59`, `M59b`, `M59c` (hand-off at 180, so two rules never fire on one value).

---

## Rules

Detailed instructions are split across `.claude/rules/`:

- [architecture.md](.claude/rules/architecture.md) — core architecture decision (engine vs. LLM), the 9-step `/api/analyze` request flow, the legacy non-engine path. Describes the **classic path**, which is still the default and the only one with safety nets; the graph path is documented in this file instead.
- [rules-engine.md](.claude/rules/rules-engine.md) — the three grading modes (severity/classifier/binary), reference-range sources, checklist for adding a new lab test. Its checklist says `patterns.js`; read that as "the right `patterns_<system>.js`" since the split.
- [frontend.md](.claude/rules/frontend.md) — routes, the decomposed `Tafsir.jsx`, `labRefs.js`, the async job client, and the `_engine` response shape the UI depends on
- [environment.md](.claude/rules/environment.md) — backend `.env` variables (including `USE_GRAPH`), tuning warnings, `GET /health`
- [notes.md](.claude/rules/notes.md) — cross-cutting notes: Persian-only strings, dev vs. prod proxying, patient-privacy rules, the backend regression suite
## Working Agreement

My default is a short prompt then a long unattended run (~1 instruction per hour of session).
Optimize for that, don't fight it:

- **Plan first, then go.** For anything touching 3+ files: post a numbered plan (file, why,
  the exact command that verifies it) as your first output, then execute without waiting for
  approval. Keep it in TodoWrite so I can course-correct at a glance instead of reading
  200 tool calls.
- **A wrong turn costs the whole session.** If the task turns out to differ from what my
  prompt implied, say so in one sentence, state your assumption, and keep going. Never stop
  with nothing delivered, and never silently redefine the scope to something easier.
- **Verify with the real command and quote the real output.** "Should work" is not a result.
  If a step failed or was skipped, name it. I judge the commit, not the narration.
- **Finish before reporting done.** Partial work announced as complete is the expensive
  failure here, because I'm not watching mid-run.

## Token Economy

- Never re-read a file already read this session, and never re-read to "verify" your own
  Edit — Edit errors if it fails.
- Read with `offset`/`limit`; Grep with `head_limit`. Whole-file reads only when you'll
  actually use the whole file.
- Batch independent tool calls into one block.
- Don't echo file contents or diffs back to me — I can open the file. Report the decision.
- No preamble, no restating my request, no step-by-step recap of what I just watched happen.

## Orientation

- The project's own `CLAUDE.md` and `.claude/rules/` are the map — trust them. Grep only for
  what they don't answer, not to re-derive structure they already describe.
- Both Bash and PowerShell are available as separate tools. Pick the right one per task; a
  command that already worked in one shell doesn't need translating into the other.
- Global `.claude/rules/` applies to every project. Anything project-specific belongs in that
  project's folder, not here.
