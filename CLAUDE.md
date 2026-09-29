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
3. **Edit** — for a new lab test, touch the rules files together (see [rules/rules-engine.md](.claude/rules/rules-engine.md)); for UI/API-contract changes, keep `ResultView.jsx`'s expectations of the response shape in sync with `server.js` (see [rules/frontend.md](.claude/rules/frontend.md)).
4. **Verify** — run `npm test` in `khanesh-server/` and `npm run lint` in `khanesh/`. The frontend has no tests, so trace UI logic by reading. The pre-commit hook runs both automatically — see [Git Hooks](#git-hooks).
   ⚠️ **"The baseline" is always two different numbers — the working tree's and the commit's.**
   A previous version of this file quoted `186 tests, 185 pass, 1 fail` as *the* baseline. That
   number was only ever true of somebody's **working tree**; the committed tree was far redder,
   and nobody re-derived it. Then the trap ran the other way — this file carried "the committed
   tree is 12 red" for weeks after it had stopped being true of any tree. See
   [N15](#n15--a-green-suite-proves-nothing-when-the-damage-is-invisible-to-the-tests).

   Every past measurement, with the tree it came from, is logged in
   [.claude/baselines.md](.claude/baselines.md). None of them is a baseline for your change.


   ✅ **`npm test` hung for a stretch on 2026-08-06 — fixed, and worth reading because both
   causes were invisible in the test output.** Concurrent work added `khanesh-server/auth.js` +
   `khanesh-server/database.js` and wired `requireAuth` onto the analyze routes. Three separate
   breakages, all measured, none of which named itself:
   - **401 on every contract test.** `api-contract.test.js` sends no `Authorization` header.
     (Resolved upstream — `requireAuth` now returns the anonymous user when `AUTH_REQUIRED` is
     unset, at [auth.js:155-157](khanesh-server/auth.js#L155-L157). It is a *flag*, not the
     unreachable-code short-circuit an earlier version of this file described; see
     [rules/environment.md](.claude/rules/environment.md). ⚠️ Setting `AUTH_REQUIRED=true` turns
     these red again unless the tests are given a token or the route is exempted.)
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

   ✅ **`skipped` is empty now, and the mechanism that emptied it is the part to keep.** That
   column used to name `patterns_anemia.js` — a dead file `M38` exempted because it held 10
   destroyed Persian strings. **The file was deleted in `ba144a7`** once every one of its rules
   was confirmed to have a live equivalent, so the exemption went with it. No `rules/*.js` file
   is exempt from any guard today.

   The reason it was safe to carry that exemption for as long as it lasted still applies to the
   next one: the "live" file list is **derived** from `patterns.js`'s own `import` statements via
   `livePatternFiles()` in `engine.test.js`, never hand-maintained. So a file cannot be quietly
   exempted by editing a list, and adding a file to `patterns.js` subjects it to every guard in
   the same commit. If you ever need an exemption again, make it visible in the output the way
   that one was (a `t.diagnostic` on every run) — a silent exemption is the N15 class.

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
  ✅ **The `fetch failed` / `EACCES` noise above the summary is gone.** It came from `test-api.js`, a manual network script that `node --test` picked up because its name matches the runner's default `test-*.js` glob. Deleted in `1d8b224`. If you add a manual probe script to `khanesh-server/`, **do not name it `test-*.js` or `*.test.js`** — the runner will execute it on every commit via the pre-commit hook.
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
│   ├── public/lab/              # landing imagery — exactly the 12 files the code names, + CREDITS.md
│   │                            #   (N14 fixed: /*.png is anchored; 18 orphans deleted 2026-08-06)
│   ├── vite.config.js           # dev-only proxy: /api -> http://localhost:8787
│   └── package.json
├── khanesh-server/              # Express backend
│   ├── server.js                # the request pipeline + every safety net
│   ├── avalaiClient.js          # the HTTP boundary to AvalAI, factory + injectable fetch
│   ├── jobStore.js              # in-memory analyze-job store with TTL (async path)
│   ├── labmat-agents/           # the LangGraph agent graph — OFF unless USE_GRAPH=true
│   │   ├── graph.js             # StateGraph wiring, 12 nodes over two layers
│   │   ├── state.js / llm.js
│   │   └── agents/layer1.js     # context, cbc, biochem, hormone, microbio, crossTest,
│   │       └─ agents/layer2.js  #   diagnosis, evidence │ patient, doctor, safety, final
│   ├── api-contract.test.js     # /api/analyze contract — green since 2f964df
│   ├── avalaiClient.test.js
│   ├── auth.js / database.js    # OTP/JWT + SQLite — off by default, see rules/environment.md
│   ├── *-guidelines.{json,md}   # anemia + biochem source extracts
│   ├── rules/
│   │   ├── adapter.js           # OCR text -> engine keys (NAME_MAP, unit conversion)
│   │   │                        #   specs/004: UNIT_GATED_ALIASES (zn/cu/se map only with a
│   │   │                        #   concentration unit; Cr stays creatinine), QUAL_NO_READER
│   │   │                        #   (anti-IF/APCA -> noReader -> noRef, never qual — no rule reads them)
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
│   │   ├── patterns_hematology.js / _biochem.js / _biochem_new.js
│   │   ├── patterns_nephrology.js / _nephrology_new.js / _infectious.js
│   │   ├── patterns_endocrine_rheum.js / _endocrine_new.js / _malignancy.js
│   │   ├── patterns_mineral_bone.js  # ⭐ محور کلسیم/PTH — یک طبقه‌بند، ۱۳ قاعده
│   │   ├── patterns_cardiac.js  # ⭐ فصل ۱۹ هنری — ۴ قاعده، همه روی عددِ «داخلِ محدوده»
│   │   ├── patterns_endocrine_pituitary.js  # فصل ۲۵ هنری — عمداً خالی تا تأییدِ P46؛
│   │   │                        #   پرولاکتین/کورتیزول/ACTH فقط شناخته می‌شوند (noRef)
│   │   ├── patterns_reproductive.js  # فصل ۲۶ هنری — ۵ قاعده، فقط بندهای تأییدشدهٔ P47
│   │   │                        #   (منی WHO 2021، تستوسترونِ مرد، پروژسترونِ روزِ ۲۱، hCG،
│   │   │                        #   مقدارهای بی‌قضاوت)؛ ردیف‌های منی در semenQual، نه qual (N25)
│   │   ├── patterns_unit_unknown.js  # یک قاعده: unit_unknown_values — عددی که واحدش نه چاپ شده
│   │   │                        #   نه از محدودهٔ مرجعِ برگه تعیین شد (specs/003، P48، N3)
│   │   ├── patterns_trace_elements.js  # P49-الف: wilson_evaluation — سرولوپلاسمین از e.ungraded،
│   │   │                        #   فقط با واحدِ چاپ‌شده؛ explains ⇒ بیرون از خطِ «تفسیر نشدند»
│   │   ├── patterns_urinalysis.js  # فصل ۲۹ هنری، مرحلهٔ ب (P51) — کریستال، وزنِ مخصوص، بیلی‌روبینِ نوار،
│   │   │                        #   سلول‌های کلیه/سنگفرشی؛ مسیرها و طبقه‌بندها در patterns_utils
│   │   ├── patterns_urine_casts.js  # فصل ۲۹ هنری، مرحلهٔ الف (P50) — ۷ قاعدهٔ سیلندر، یک طبقه‌بند
│   │   │                        #   (castAxis در utils)؛ شکلِ mineral_bone: یک برگه، یک یافتهٔ سیلندر
│   │   ├── patterns_leukocyte.js  # specs/009 (P56): مونوسیتوز/مونوسیتوپنی، ائوزینوفیلی، بازوفیلی، و یک یافتهٔ لامِ خون
│   │   │                        #   (بلاست، اوئر، گرانولِ سمی، دوهله، پلگر…) از طبقه‌بندِ smearAxis؛ کانالِ smear در adapter
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
├── .specs/reports/              # 8 tracked past eval reports; docs, not executable. Nothing
│                                #   reads them — the untracked run output was deleted 2026-08-06
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

✅ **The loose agent-run artefacts at the repo root are gone** (2026-08-06). `AGENTS.md`,
`ARCHITECTURE.md`, `MEMORY.md`, `VERIFICATION_AUDIT.md`, `audit_report.md`,
`CONTRACT_TEST_REPORT.md`, `architecture.html`, `diagram.mmd`, `fix_val.js`, five stray debug
`.png`s, `khanesh-server/live-probe.js`, `scratchpad/` (4.4 MB), and the untracked half of
`.specs/` were deleted. They were snapshots of past sessions that contradicted each other and
this file, and a new session had no way to tell which was current. The root is now `CLAUDE.md` +
`MEDICAL_RULES.md` + `skills-lock.json` + the two sub-projects.
Before deleting `MEMORY.md` its four "vital lessons" were each checked against the code, and all
four are live: pH-is-urine-unless-ABG → `ABG_MARKERS` ([adapter.js:305](khanesh-server/rules/adapter.js#L305));
qualitative `3+` → N6; CTCAE only for cancer patients → the `isCancer` gate at
[grade.js:76](khanesh-server/rules/grade.js#L76), tested at `engine.test.js:405`; `Anti-HIV`
spellings → N2. Nothing was lost that wasn't already enforced somewhere that runs.

✅ **`labmat-prototype/` is gone (2026-09-20)** — 5109 tracked files removed, of which 5101 were
`node_modules`. It was a superseded copy of `khanesh-server/labmat-agents/`. Deleting it was a
user decision, and two things about it are worth keeping:

- ⚠️ **The live `AVALAI_API_KEY` is still in git history and deleting the directory did not touch
  it.** Measured rather than assumed: `labmat-prototype/.env` was added in `763c73d` and *untracked
  again* in `3416d63`, so it was **not** in the index at the time of the deletion — an earlier
  version of this file, and of `note.md`, said it was, and both were wrong. What is true is worse
  in the way that matters: the `AVALAI_API_KEY` committed in `763c73d`, the copy that was on disk,
  and the one `khanesh-server/.env` uses today all have the **same fingerprint**. Anyone who can
  read this repo's history has the key the production server is using. **It has to be rotated at
  AvalAI**; no amount of deleting files in the working tree does it, and `.gitignore` never could.
- **"It's in `.gitignore`" proves nothing about what is tracked, in either direction.** N14 is the
  case where an ignore rule ate files the app needed; this is the mirror image, where an ignore
  rule (`labmat-prototype/node_modules/`) sat over 5101 files that were already tracked and did
  nothing at all. The question "is this file in the repo?" is answered by `git ls-files`, never by
  reading `.gitignore`.

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

`patterns.js` no longer holds the rules. It imports **eighteen** `patterns_<system>.js` files (the eighteenth, `patterns_leukocyte.js`, from specs/009)
(one of them — `_endocrine_pituitary` — deliberately empty until `P46` is approved; counted
2026-09-22) and
concatenates their `RULES_*` exports into the exported `RULES` array — **150 rules, measured
2026-09-25** (the 145th–149th are `monocytosis`, `monocytopenia`, `eosinophilia`, `basophilia` and `peripheral_smear_findings` in `patterns_leukocyte.js`, specs/009; the 150th is a concurrent session's `erythrocytosis_who_screen` in `patterns_hematology.js`; the 144th is `mild_neutropenia` in `patterns_hematology.js`, second real sheet; the 138th–143rd are `hba2_low`, `hbf_elevated`, `hb_variant`, `zpp_high`, `stfr_index` and `hgb_sex_unknown` in `patterns_hematology.js`, P53 answers; the 136th and 137th are `hba2_elevated` and `microcytosis_no_anemia` in `patterns_hematology.js`, specs/008; the 135th `rbc_indices_implausible`, specs/007; 113, plus the five `P47` Stage B rules in `patterns_reproductive.js`, plus
`unit_unknown_values` in `patterns_unit_unknown.js` from specs/003, plus `folate_deficiency` in
`patterns_hematology.js` and `wilson_evaluation` in `patterns_trace_elements.js` from specs/004, plus
the seven `urine_cast_*` rules in `patterns_urine_casts.js` and `urine_esterase_without_cells` in
`patterns_nephrology.js` from specs/005, plus the five rules of `patterns_urinalysis.js` from specs/006) with the `node -e` one-liner under N16 (116 at `c5700c0`, then 115 once
`liver_injury_pattern` was deleted, then 113 once `overt_hypothyroidism` and
`overt_thyrotoxicosis` went — see N20 with `P43` and `P45`); it still owns `runPatterns()`,
`SUGGEST_TESTS`, and the suppression/dedup logic. So:

- **Adding a clinical rule** → the right `patterns_<system>.js`, then confirm its `RULES_*` export
  is spread into `RULES` in `patterns.js`. A rule in a file that isn't imported is invisible and
  fails exactly like N1 — silently, into `unmatched_abnormal`.
- **Changing how rules are selected, ranked, or suppressed** → `patterns.js` itself.

⭐ **`patterns_mineral_bone.js` (2026-08-07) is the one file here with a different shape, and
the shape is the point.** Its nine calcium/PTH rules do not each carry their own `match`
condition. They all call one classifier — `mineralAxis(e)` — which returns exactly one label or
`null`, and each rule asks only "is that my label?". Two of these rules cannot fire together,
not because the author was careful but because the function returns one value. Prefer this shape
whenever a group of rules partitions the same input space; the alternative (nine independent
`match`es that happen to be mutually exclusive today) is one edit away from a patient reading two
contradictory findings about the same number.

Two things about it that are easy to get wrong:
- `mineralAxis` returns `null` unless **both** calcium and PTH are on the sheet. That is what
  makes the module additive: a sheet without PTH behaves exactly as it did before.
- `calcium_abnormal` in `patterns_biochem.js` is excluded by the axis **except when calcium is
  critical** (`caCritical()`, ≥14 or ≤6.5). Without that exception, `Ca 15 + PTH 300` loses the
  emergency and gets a `this_week` finding instead — measured, and locked by `M68`.

**The anemia rules that run live in `patterns_hematology.js`.** There is exactly one place; this
sentence used to need a paragraph of caveats after it.

✅ **The `patterns_anemia.js` migration is over — the file was deleted in `ba144a7`.** It is
recorded here because a long stretch of this file, and of the Lab Notebook, is about it, and
because the way it ended is the reusable part. For ~a month the repo held a tenth `patterns_*.js`
that **nothing imported**: 10 anemia rules meant to replace six older ones, a `LEGACY_ANEMIA_IDS`
suppression list that was declared and never read, two rules whose Persian was destroyed beyond
recovery (`?`, not mojibake — see
[N15(c)](#n15--a-green-suite-proves-nothing-when-the-damage-is-invisible-to-the-tests)), and one
duplicate id. Being dead is why none of that was ever caught by a test.

It was not finished — it was **cancelled**, after each of its rules was checked against the live
engine and found to have an equivalent already running. That is the right way out of a
half-migration: the alternative on offer was to author replacement clinical text for two rules
whose meaning existed only in their ids, which is exactly the invention this architecture forbids.
**A migration nobody can finish is deleted, not carried.** If you are about to add a
`_new`-suffixed rules file, decide up front what deletes the old one, and in which commit.

✅ **Spherocytosis coverage was missing from the working tree's live engine; it is back.**
(Resolved 2026-08-05 — recorded because the *shape* of the gap is the reusable part.) The committed
`patterns_hematology.js` has `spherocytosis_likely` with English text; an uncommitted rewrite of
that file deleted the rule outright, and for a stretch a repo-wide search found the id in **zero**
files. No test noticed, because a *deleted* rule breaks nothing structurally and `M38` only reads
strings that still exist. **Measured, not assumed**: running `M41`'s panel with the rule filtered
out of `RULES` fires `normocytic_anemia` and nothing else — so the patient got a finding, just not
*this* one, and lost the actual next step (peripheral blood smear). That is the N2 class, and it is
worse than silence precisely because the output still looks complete. Its intended replacement,
`anemia_spherocytosis`, was stranded in the dead `patterns_anemia.js` with destroyed text, so it
could not stand in — and that file has since been deleted (`ba144a7`), so `spherocytosis_likely`
in `patterns_hematology.js` is now the only version there is.

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
written in Persian in the comment above `const USE_GRAPH` in `server.js`: on the graph path
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
- `clinical-knowledge-extraction` (`.claude/skills/`, Persian) — turns raw academic medical text
  (a Henry's chapter, a KDIGO/ADA guideline, a paper) into a structured extraction dossier:
  IF-THEN rule specs, classification tables, reference/critical values **with units**, and
  patient-facing pathophysiology. It deliberately **writes no code** — its output feeds
  `add-medical-rule` and [MEDICAL_RULES.md](MEDICAL_RULES.md), because a threshold from a
  textbook is a proposal until a human reviewer approves it. Its mandatory first step is
  `node .claude/skills/clinical-knowledge-extraction/scripts/engine-inventory.mjs`, which reads
  the live engine (every rule, the graded keys, `NAME_MAP`, `CTCAE_MAP`, guideline ids, the
  pending `P` items) so "already in the engine" is *measured*, not remembered — the same N15(b)
  discipline as the test baseline. `--search <term>` answers "does the engine already know
  this?"; search the **Latin analyte name or engine key**, not the Persian disease name
  (`هیپرکلسمی` finds nothing, `CA` finds the whole mineral axis).
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
- **The lab prints two names for one test, and `norm()` glues them together** (2026-08-10, a
  real three-page sheet). The rows read `SGOT (AST)` and `SGPT (ALT)`. `norm()` strips the
  parens, so the key is `sgotast` — and `NAME_MAP` held only the *reverse* order, `astsgot`.
  Both liver enzymes went `unmapped` on a sheet that printed them, so the engine never saw the
  liver at all, and `isolated_ldh_elevation` — which reads AST/ALT — had nothing to read. The
  asymmetry had been sitting there since the entry was written; nobody printed the other order
  until this sheet. Fixed in `resolveAlias` with a split rule that accepts `a+b` **only when
  both halves map to the same engine key**, so `astalt`, `ptinr` and `cacr` are still refused —
  the agreement requirement is the guard, which is why this isn't the fuzzy matching the rule
  above forbids. Guards `M73`, `M73b`.
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
- ⚠️ **Recurred on troponin, and this one sent a healthy patient to the emergency room**
  (2026-08-10). `refs.js` holds `TROPONIN_I` in **µg/L** (`[0, 0.6]`) but high-sensitivity
  assays print **ng/L** — and `adapter.js`'s troponin branch poured any number straight into the
  key without looking at the unit, because it sat *above* the generic `toConventional()` call and
  `continue`d past it. Measured on `HEAD`, not argued: `hs-cTnI 8 ng/L` — a completely normal
  troponin — graded as `8` against `0.6`, fired `troponin_positive`, and told the patient
  «همین حالا به اورژانس مراجعه کنید». Note the direction: unlike every other entry in N3, this
  one failed toward a **false emergency**, and it failed on the *common* case, because most
  troponins are normal.
  **Two things generalize.** First, a key with a bespoke branch in `adapter.js` is *invisible* to
  `units.js` by design (the table's own header says so) — so "units.js covers the SI table now"
  is not true of `TROPONIN_I`, `DDIMER`, `ACR`, `T3`, `WBC/PLT/RBC` or `*_ABS`. When you add a
  unit guard, check which list the key is on. Second, the fix's two halves are worthless apart:
  converting the unit alone drops `45 ng/L` to `0.045`, which is inside `[0, 0.6]` — **silence on
  real myocardial injury**. The conversion needed `troponin_hs_above_99th` in the same change.
  Guards `M83`–`M83d`, `M84`–`M84d`; registered as `P37` in [MEDICAL_RULES.md](MEDICAL_RULES.md)
  because the ULN itself is still a conventional-assay number and that is a reviewer's call.
  ⚠️ **The false-emergency direction happened again on 2026-08-11**, by a different mechanism —
  not a unit but a missing gate (`dka_hhs_emergency` fired `emergency` on any glucose ≥ 250).
  Written up under N20, and noted here because the *direction* is what the two share: when a
  rule errs toward an emergency it errs on the **common** case, so it reaches far more patients
  than an under-read does. Check the failure direction of every new emergency rule against its
  most ordinary input, not its worst one.
- **The per-test whack-a-mole was itself the bug** (2026-07-27, `rules/units.js`). Five analytes had
  a unit guard, each added after its own incident; every other analyte had none. The unguarded one
  that mattered most was HbA1c: IFCC units are mmol/mol, so a sheet printing `48` — exactly the ADA
  diabetes threshold, 6.5% — was graded against `[4, 5.6]`. `units.js` now covers the whole SI
  table, still refusing to convert unless the sheet states the unit. Adding a numeric test without
  asking "which unit systems print this analyte?" is the same mistake in a new place.
- ⚠️ **Recurred 2026-09-19 through the unit nobody printed** (specs/003, `P48`). "Refusing to convert
  unless the sheet states the unit" had a hidden other half: with **no** unit, the number was graded
  as conventional without saying so. Measured on `edec069`, one unitless row each: creatinine 80,
  calcium 2.4, bilirubin 17 and troponin 8 (all normal in SI) → **emergency**; FBS 15 (high, mmol/L)
  → «قند شما **پایین** است», which is the direction reversed; cholesterol 8 (high, mmol/L) → **no finding at all**.
  Now `decideUnit` in `units.js` uses the row's own printed reference range, and anything it can't
  settle is **not graded** and goes to `unit_unknown_values`. That finding is never an emergency,
  never says «بالا/پایین», and is `this_week` only if the number is out of range under both units.
  Guards `M121`–`M125`, `T20`.
  **The generalizing lesson is about defaults, not units:** "we only convert when told" is only safe if
  "not told" leads to *not grading*. A default that silently picks one interpretation is a guess
  without the word "guess" in it. It also hid in the test suite: 342 fixture rows had no unit and
  passed only because of that guess. When a default changes, the fixtures that leaned on it are part
  of the change. Give them the assumption explicitly (an insertion-only codemod, verified by
  stripping the insertions back out), or the suite stays green on meaning it no longer has.
- ⚠️ **The first specs/003 fix overcorrected. The medical review failed it, and the way it failed is the
  reusable part** (2026-09-19). "Without a unit, severity is unknowable, so never an emergency" was written
  as a ceiling. Measured: calcium 15, Hb 5.5, creatinine 8 and 900, FBS 600 and troponin 2000 all went
  from emergency to «این هفته». Each of them is dangerous under *every* reading that can happen (calcium
  15 mmol/L = 60 mg/dL, which no one survives). Troponin 45 printed next to the lab's own «<19» went to
  «در نوبتِ عادی». The premise only holds when the readings *disagree*. The fix derives urgency from the
  engine itself: the **minimum** across the possible readings, or a single reading scaled to the printed
  range, since that range is always in the same unit as the value. Guards `M127`, `M130`.
  **Rule:** when you remove a false alarm, give the new path a floor, not a ceiling. Then run it against
  the worst real input, not just the ordinary one the bug was about. N20 checks the ordinary case for a
  new emergency rule; this is the same check turned round for a new *non*-emergency rule.
  The same review found two more bugs in the same class. Neither fired on the panels the fix was written for:
  - Age 0 was read as "unknown" (`!raw`), so a neonate's bilirubin was compared against the adult band
    and 14 mg/dL came out as «0.82, normal». That is N4 at the input: `M129`.
  - The new finding was hidden under any `blocks_others` emergency. That is N18: `M128`.
- ⚠️ **The second round failed as well, on one table doing two jobs** (N23 again). `SURVIVAL_LIMITS` answered
  both "can this reading be ruled out?" and "can we believe a printed range that pushes the value this far?".
  - The first question needs *wide* bounds. At 400, urea 450 (real uraemia) was dismissed as "maybe misread" (B8).
  - The second needs *tight* bounds. At a wide limit, "FBS 95" next to a neighbouring row's HbA1c range
    «4-5.6» became 1712 mg/dL and fired `hhs_pattern` (B7).
  - The fix was to split the table in two: `SURVIVAL_LIMITS` for ruling readings out, `DECIDE_LIMITS` for
    trusting a range. A printed range also has to sit within ×3 of the engine band before it is trusted.

  The same round found two more bugs:
  - A reference that prints both units («0.6-1.2 mg/dL (53-106 µmol/L)», typical of SI labs) let the first
    unit win, and creatinine 80 became an emergency again.
  - An adult range printed beside a newborn sample made bilirubin 1.5 on day 3 an emergency.

  **Rule:** evidence that can come from a neighbouring row, or that names two answers at once, is not evidence.
  Before a parsed range or unit is allowed to *raise* urgency, check that it could belong to this test.
  Guards `M134`–`M137b`.
- ⚠️ **The fourth round found that the newborn fix depended on an input nobody had checked: age.** `inferAge`
  had no hours or weeks and read no Persian digits. So «48 h» became 48 years, «2 weeks» became 2 years, and
  «۳ روزه» became an unknown age. A newborn's bilirubin 20 then got «در نوبتِ عادی», which is lower than before
  the fix. The same round found that the newborn sentence («پزشکِ نوزاد، نمودارِ ساعتی») was shown up to age 1,
  although the hourly charts only cover the first weeks. Guards `M139`, `M140`.
  The age fix then caused a bug of its own in round 5 (B12). It checked hours and weeks first and took the first
  match, so «1 month 1 week» was read as one week and the whole sheet was graded against newborn ranges. The parts
  of an age are now added up, not picked.
  **Rule:** when a fix is gated on an input (age, sex, unit), test it with that input written the way real sheets
  write it, not with the number your test fixture happens to pass.

- ⚠️ **Recurred 2026-09-20, through the decimal comma** (found by the specs/003 review, and present in
  `HEAD` since the adapter was written). `toNum` stripped every comma as a thousands separator, so a
  sheet that writes the decimal as a comma turned **K 5,5** into 55 (a hyperkalaemia emergency),
  **Creatinine 1,2** into 12 (emergency) and **0,500** into 500. That is the false-emergency direction
  again, and on ordinary values. `parseReference` in `units.js` already had the right rule, so the
  same sheet was parsed two different ways by two functions.
  - **The fix is `commaToDot` in `adapter.js`, the same rule as `parseReference`:**
    - a comma is a thousands separator only before groups of exactly three digits, with no leading
      zero (`250,000`, `1,250,000`);
    - with a dot in the number, a comma is a thousands separator (`1,234.5`);
    - a single other comma is a decimal point;
    - anything else (`5,5,5`) is ambiguous. It goes to `unmapped`, not to `qual` where no rule would read it.
  - **The manual form had the same bug.** `normalizeDigits` in `khanesh/src/digits.js` now treats the
    Latin comma as a decimal point, like «،». Every count in that form is ×10³/µL, so no value needs a
    thousands separator.
  - **An unreadable manual value is now flagged, not silently skipped.** `Tafsir.jsx` used to do
    `if (isNaN(v)) return`, which is the N2 class in the form.
  - Guards: `M161`, `M161b` (thousands still work; this is the guard for the other direction),
    `M161c`. The frontend has no tests, so its change was checked with a `node` probe of `toNumber`.
  - Remaining ambiguity: `1,200` is always read as 1200.
  **Rule:** when two functions parse the same printed number, they must share one rule. The
  second copy is where the bug lives.

- ⚠️ **Recurred 2026-09-23 on HCT and MCHC (specs/007), found by the plan's probe before any rule could use it.**
  Neither key had a unit row:
  - `Hct 0.39 L/L` (normal) was graded as 0.39 % and read «پایین».
  - `MCHC 366 g/L` (normal) was graded as 366 against 32–36.

  Harmless-looking today, a routine false flag. But the same feature added `Hct < 21` as an emergency trigger and
  `MCHC > 36.5` as a note trigger, so without the fix, a normal SI-unit sheet would become a **false emergency**.

  **The fix is a separate table, `PRINTED_ONLY_CONVERSIONS` in `units.js`, not `SI_CONVERSIONS`.** A key in
  `SI_CONVERSIONS` gets a `UNIT_PROFILE` row (`M121b`), which sends its *unitless* values through `decideUnit`. A
  unitless `Hct 39`, the most common way sheets print it, would then stop being graded. Unitless impossible values
  (Hct ≤ 1, MCHC > 100) go to `unmapped` rather than being converted by magnitude (P48/P52). Guards `M177`, `M177b`.

  **Rule:** before a new rule reads a key as a trigger, run the key's *ordinary* value through every unit a sheet
  prints it in. A threshold is only as safe as the grading of the number fed into it.

- ⚠️ **Recurred 2026-09-28/29 on a ~1-day-old newborn (P57, `534e7af`): the adult row as the silent fallback.**
  `PED_REFS` had no RBC or RDW row for the first months, so `refs.js` fell back to the adult table and the newborn's RBC was
  graded against an adult woman's 4.1–5.1. A normal neonatal count read «بالا/پایین», and every downstream rule inherited
  the wrong verdict. Same shape as the unitless default above: "no row for this age" was answered with a guess.
  Fixed by `NEONATAL_NO_ADULT_FALLBACK` in `refs.js` (first three months: RBC/RDW without a paediatric row → `noRef`, not
  adult), plus new age rows with `P57_SOURCE`. Under 28 days (`isNeonate`, `neonatal.js`) any actionable non-technical
  finding is floored to `emergency`, so `has_critical` is true on those sheets by design. **Rule:** a fallback from a
  paediatric table to the adult one must be an explicit decision per key, never the default. Guards `M220`–`M222`.
  The exact table/page for the P57 numbers is still unsourced (`MEDICAL_RULES.md`, P57).

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
- ⚠️ **Recurred, live on `953f513`, found while answering P53 Q13 (2026-09-24).** `thal_trait_no_anemia` matched on
  `!anemic`, and `!anemic` is also true when Hb is **absent** or **high**. So `MCV 68 · RBC 6.2` with no Hb on the sheet read
  «هموگلوبین شما طبیعی است، پس کم‌خونی ندارید». The rule now needs a graded, in-range Hb, and the no-Hb case has its own
  sentence (`microcytosis_no_anemia`, `M190d`). **`!low` is not "normal". Negating one arm of a three-way state leaves two
  arms, and one of them is "absent".**
- ⚠️ **Recurred 2026-09-29 (P57/P58): "not measured" read as "normal", twice.**
  - **Absent neutrophil count.** A sheet with WBC but no absolute neutrophils gave no finding, so the missing count looked
    like a normal one. `neutrophil_count_missing` now fires (ceiling = WBC minus the other absolute counts; its urgency is
    a floor, never a cap), and beside a high WBC it explicitly asks for a manual differential and a blast check.
  - **Analyser placeholder «---.-».** An infant's differential printed as the device placeholder went to `qual`/`unmapped`
    as if it were a text result. `isPlaceholderValue` (one rule, shared by `adapter.js` and `server.js`) now marks it
    unreadable. Guards `M230`–`M235c`, `T29`.
  **Rule:** a value the device could not produce is a missing test, not a qualitative one. It needs its own arm.

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
- **Recurred 2026-09-19 as a *reading* error, caught by the medical review before commit (P49-ج).**
  The antibody check in `overt_b12_deficiency` looked for a positive with a substring regex,
  `/pos|مثبت|^react|detected|\+/`, after first ruling out negatives with `/neg|…|not.?detect/`. So
  «Undetected» and «Nondetected» passed the negative check and then matched `detected`, and «+/-»
  matched `\+`. For each of them the patient read «آنتی‌بادیِ ضدِ فاکتورِ داخلیِ شما مثبت است …
  پرنیشیوز». Worse, the antibody was then listed in `explains`, so it dropped out of the «تفسیر
  نشدند» line and the wrong reading became the only one shown. Fixed with a whitelist that must
  match the **whole value**. Weak and equivocal results stay uninterpreted. Guard `M153b`.
  **Rule:** a qualitative result is a closed set of words, not a pattern. Negation words contain the
  positive word (`undetected` ⊃ `detected`, `+/-` ⊃ `+`), so ruling negatives out first never closes
  the list.
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
- ⚠️ **Recurred 2026-09-23 on a real pancytopenia sheet, and this time the fix was structural (M188, T23).**
  - **The cap came back as 10 sentences / 20 words.** The findings' `must_say` totalled 11 sentences, and the
    «بی‌توضیح» list sentence was about 40 words. The model cut the list; the net then re-appended headline plus
    the whole block, so the patient read the same sentence twice.
  - **Worse, the model also dropped 4 of the 14 recommendation items**, including «بدون اتلاف وقت فوراً به اورژانس»
    and «نباید منتظر نوبت مطب بمانید». No net ever checked `action` or `warnings`.
  - **Six emergency findings carried five rival timelines** («همین امروز تماس» … «فوراً به اورژانس»). The model
    kept the mildest one.
  - **Fix, part 1:** the caps are gone. `M26` now asserts that no cap exists, instead of asserting that one does.
  - **Fix, part 2:** `action`/`warnings`/`suggest` are no longer sent to the model at all. `general_recommendations`
    is always `buildEngineRecommendations()`, with **one** final instruction from `pickFinalAction()`.
  - **Rule:** a field the model never sees is a field it cannot drop. A net that checks after the fact covers
    exactly the shapes of loss someone thought of, and here that was two fields out of four. Check the
    sentence classifier against **every** action string in the rules, not the panels you happened to test:
    the first version lost «مصرف مکمل ویتامین D را با پزشک در میان بگذارید» and the specialist referrals.
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
- **Recurred a third time on the recommendation list** (2026-08-10). `SUGGEST_TESTS` is what lets
  `alreadyMeasured()` drop a suggestion for a test the sheet already has — and `"پروفایل چربی"`
  was simply **not in the table**. `alreadyMeasured` returns `false` for an unknown string, so a
  patient whose sheet printed cholesterol, LDL, HDL *and* triglycerides was told «درخواست آزمایش
  پروفایل چربی از پزشک», directly under his own four numbers. Note the failure direction of a
  missing table row: it is silent and it always errs toward the wrong side. Added as
  `["CHOL", "LDL", "HDL", "TG"]` — all four, because a three-key entry would make a sheet without
  LDL count as "complete" and delete a suggestion that was correct. Guards `M77`, `M77b`.
- **Recurred a fourth time, 2026-09-18, on a surface that had been empty.** `server.js` joined
  `engineOut.noRef` into the patient-facing `ocr_warnings` raw. Harmless for as long as `noRef`
  was effectively empty; the moment Stage A of Henry ch.25 mapped prolactin and cortisol without
  ranges, the patient would have read «برای این تست‌ها محدوده مرجع نداریم: PRL، CORTISOL_AM».
  Caught before commit by reading every consumer of `noRef`. Fixed with `.map(faName)`; guard
  `T17` (red before the fix, measured). **An empty list is not a safe list** — when your change
  starts populating a field for the first time, read every place that renders it.
- **Recurred a fifth time, and it had been live for every «تکرار …» suggestion** (2026-09-22, found in
  specs/005). `phraseSuggestion` wrapped «تکرار آزمایش ادرار» as «درخواست آزمایش تکرار آزمایش ادرار … از پزشک»; about 50
  suggestions (`تکرار CBC`, `تکرار قند ناشتا`, …) read that way. Fixed once in the helper: a suggestion that already
  starts with «تکرار» gets «درخواست … از پزشک» without «آزمایش». Guard `M170`; `M5` changed on purpose.
- **Rule:** every key goes through `faName()`. For a test that was already measured, the phrasing is
  «تکرارِ …», not a fresh request. **And when a rule suggests a panel, add that exact string to
  `SUGGEST_TESTS` in the same commit** — the match is exact, and an absent row fails open. Deduplicate recommendations by first sentence and drop
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
- ⚠️ **Recurred 2026-09-24 as `abnormal` without `dir`** (`microcytic_anemia`, M187 work). `mch?.abnormal ? "MCH هم …
  همین کوچکی را تأیید می‌کند"` told a patient with a *high* MCH (35) that it confirmed small cells. And because the rule now
  read HCT/MCH, a high HCT was silently marked covered (M156). Every `?.abnormal` in a sentence needs its `dir`. Guard `M187c`.
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
- ✅ **Closed 2026-08-06.** The workaround files (`cbc_card.png.jpg`, `thyroid_card.png.jpg`,
  `diabetes_card.png.PNG`) and 15 other unreferenced files were deleted; `public/lab/` is now
  exactly the 12 files the code names, plus `CREDITS.md`. Method, which is the reusable part:
  `grep -rhoE "/lab/[A-Za-z0-9._-]+" src/ index.html | sort -u` gives the live set, and anything
  on disk outside it goes. Do this from the **reference side**, never by eyeballing filenames —
  `hero.jpg` and `hero.png` and `hero_image_lab_ai.png` and `hero.gif.mp4` and `hero_ai_desk.webp`
  all coexisted and only two were live.
- ⚠️ **The paragraph that used to sit here was wrong, and acting on it would have changed the
  page.** It said `res-1/2/3.jpg` and `news.jpg` were "optimized `.jpg` twins" of the `.png` at
  ~15× smaller, and recommended pointing `Landing.jsx` at them. **They are not twins.** Measured:
  every `.jpg` is an Unsplash photograph cropped to its frame (`res-1.jpg` 768×432, `news.jpg`
  900×600); every `.png` is a square 1024×1024 image from a different, later set. Swapping the
  reference would have silently replaced four photographs with four **different** photographs, at
  the wrong aspect ratio. The size gap was real and the conclusion drawn from it was not — a file
  being smaller with the same stem is not evidence it is the same picture. **Read the dimensions
  before calling two files the same asset.** The `.jpg` were unreferenced and are now deleted;
  their Unsplash attribution lives in git history and is described in `CREDITS.md`.
- ⚠️ **And the images that replaced them have no recorded provenance at all.** Eight of the eleven
  live `.png` entered in `5fae645` — a *clinical rules* commit — as untracked files the commit
  happened to sweep up. `CREDITS.md` still claimed "every image in this folder is from Unsplash"
  for months afterwards, and `Landing.jsx:256` points the reader at that claim. It has been
  rewritten to state what is actually known. **A licence file that covers a folder rather than a
  list of files becomes false the moment someone adds a file** — and nothing will report it.

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
  ✅ **Resolved by deletion, `ba144a7`.** The text was never rewritten and never needed to be: each
  of the file's rules was checked against the live engine, found to have an equivalent already
  running, and the file was removed. `M37`'s guard stands unchanged for the next such file. **The
  floor under recovery is real, and the way past it is to delete, not to author** — see
  [Where a pattern lives](#where-a-pattern-lives).
- **Rule:** a mechanical repair is only complete over the set you *enumerated*, not the set you
  meant. After a bulk fix, re-run the detector over the **whole** directory — including files
  nothing imports — because "no test covers it" is the reason damage survives there, not a reason
  it is safe. And distinguish the two damage classes when you report one: mojibake is recoverable,
  `?` is not, and calling both "an encoding issue" hides which one you are looking at.

⚠️ **Recurred 2026-08-10, self-inflicted, caught in the same minute — and the cause is a tool
worth naming.** A block of new Persian tests was appended to `rules/engine.test.js` with
PowerShell's `Add-Content -Path … -Value (Get-Content -Raw …) -Encoding utf8`. `Get-Content`
without `-Encoding` decodes as the system ANSI codepage, so 164 lines of Persian were re-encoded
into perfect cp1252 mojibake. It surfaced instantly — seven assertions matching Persian text
failed while every structural assertion passed, which is exactly N15(b)'s fingerprint — and the
repair was to truncate and re-append with `cat >>` from Bash. **Never move Persian text through
PowerShell 5.1's `Get-Content`/`Add-Content`/`Set-Content` in this repo**; use the Write/Edit
tools or Bash. Cost was minutes here only because the text was under test; the same command
against a `patterns_*.js` file is `5059a05` again.

**(d) The Windows tool that re-encodes on append — hit again 2026-08-10, caught by `M37`.**

- **Tried:** append a block of Persian tests to `rules/engine.test.js` with
  `Add-Content -Path … -Value (Get-Content -Raw) -Encoding utf8` in PowerShell 5.1, because a
  Bash heredoc had failed to parse.
- **Broke:** `Get-Content` decoded the UTF-8 source as the system ANSI codepage and `Add-Content`
  re-encoded the result, so the appended 185 lines landed as textbook mojibake — 2260 characters
  of it. The Persian *regexes inside the assertions* were mojibaked too, so ten tests failed with
  messages like «متن به پانکراتیت اشاره نکرد» printed next to output that clearly did mention
  پانکراتیت. Read carelessly, that looks like a rules bug, not an encoding bug.
- **What worked:** `node -e "fs.appendFileSync(dst, fs.readFileSync(src,'utf8'))"`. Bash `cat`
  and the `Write` tool are also safe. **Never append Persian with PowerShell 5.1 cmdlets** —
  `Set-Content`/`Add-Content`/`Out-File` all round-trip through a codepage, and `-Encoding utf8`
  additionally means *UTF-8 with BOM*, so on a file that already has content you get a BOM
  spliced into the middle.
- **Cost this time: none.** `M37` failed on the same run and named the file and the character
  count. That is the entry above doing exactly what it was written to do — but note it caught a
  *test* file. The same command on `patterns_hematology.js` would have produced unreadable
  clinical text, and `M37` would have caught that too; the point of logging it is that the
  reflex «I'll just append with PowerShell» is what needs to not happen again.

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
- ⚠️ **Recurred 2026-08-10, in `server.js`'s recommendation net — same `=== 0`, different file.**
  The net rebuilt `general_recommendations` from the engine only when the model returned *no*
  list (`!Array.isArray(recs) || recs.length === 0`). On the real sheet the model returned a
  list and simply made it **shorter**: the engine's `glycemia` finding suggested
  `["تکرار قند ناشتا", "HbA1c", "ACR ادرار", "eGFR", "پروفایل چربی"]` and the patient's screen
  showed only «تکرار قند ناشتا». On an `FBS 209`, HbA1c is the test that both confirms the
  diagnosis and measures how long it has been running — and it vanished with nothing logged.
  Fixed with `missingSuggestions()` in `rules/prompt.js`, wired into **both** the sync and async
  paths. It compares per *test name* with a token measure (all words of the name, ≥0.6), not by
  sentence, because a test name is a proper noun the model barely paraphrases; the error
  direction is biased toward re-adding, like the emergency nets. Guards `M76`, `M76b`, `M76c`.
  **The generalizing point: `=== 0` on a model's output is never the right guard.** A model that
  drops one item looks exactly like a model that did its job.
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
- ⚠️ **Recurred 2026-09-17 on the rendering side, and the granularity is the new part.** Once the
  net exists, its output has to be consumed at the right *grain*. `ResultView.jsx` built a single
  boolean from `_engine.patterns.includes("unmatched_abnormal")` — true if **any** abnormal value
  in the panel was uncovered — and `stateOf` applied it to **every** abnormal row. Measured
  shape: an iron-deficiency panel (`Hb 9.5 · MCV 70 · ferritin 6`) plus one unrelated uncovered
  value gave the Hb and MCV rows a «◌ نیازمند بررسی» chip, directly contradicting the
  interpretation two sections above that explains iron deficiency with confidence. The frontend
  could not do better: `_engine.tests[]` had no per-test coverage flag, so the panel flag was the
  only signal there was. Fixed by having the engine attach the keys it already computed
  (`orphans`) to the finding, and `server.js` expose them as `_engine.uncovered`. Guards `M100`,
  `M100b`.
- **Rule:** a signal that is true of the *panel* is false of an *item*. Before reusing an
  aggregate flag per-row, ask whether the producer knows which item it was about — and if it does,
  make it say so rather than making the consumer guess. Where the consumer cannot know, the safe
  default is to mark **nothing**, not everything: a chip that says "we have no explanation for
  this" is a claim, and putting it on a row the same page just explained is worse than omitting it.
- ⚠️ **Recurred 2026-09-24 through `always_show`/`brief` (specs/008 round 3, R3-CR1).** The net decided coverage
  from a finding's full `must_say` and `RULE_READS`. Then `runPatterns` swapped that `must_say` for the short
  `brief` under a blocker. On a pancytopenia sheet, HCT 55 next to Hb 8.3 and an MCH of 35 were marked "covered" by
  the microcytic text, and that text was never shown. An HbA2 of 5.2 under a K 7.1 emergency lost its number and
  the carrier warning. **Rule:** coverage is a property of the text the patient *sees*. A finding that will be
  briefed covers keys only through `brief` + `brief_warnings` (`willBrief()` in `patterns.js`). Guard `M189c`.
- **Guards:** `M58`, `M58b` (negative control), `M58c`. Verified against the pre-fix code in a temp
  copy — `M58` and `M58c` go red there. Note the copy needs `node_modules` junctioned in or the
  whole file dies on `Cannot find package 'acorn'`, the same trap the Commands section warns about.
- ⚠️ **Recurred twice in specs/004 (2026-09-19). Both are the same net, reached by different doors.**
  - **A rule that *reads* a key takes it away from the net, whatever it says about it.** `covered`
    comes from `RULE_READS`, the source scan. So once `folate_deficiency` read `B12` for its
    three-way clause, `B12 1500` (above the 200–900 range) stopped reaching `unexplained_abnormal`.
    The only B12 text left was «پایین نیست (1500)», which is true, and it drops the flag.
    **Rule:** if your rule reads a key for context, every branch that key can land in needs a
    sentence, including "above range" when your rule only cares about "low". Guard `M156`.
  - **The "all normal" path had the same `=== 0` shape at a different grain.** A sheet whose only
    values had no reference range (`Zinc 40`, `Prolactin 40`) produced no finding and no abnormal
    value. So on the engine path `buildNormalResult` told the patient «نتایج آزمایش شما در محدوده
    طبیعی است», and a sheet with nothing *graded* skipped the engine entirely and went down the legacy
    LLM path (`server.js`), where the model judges severity itself. "Not judged" was read as
    "normal" (N4). Fixed with a `noRef` branch in `buildNormalResult` and a `noRef` check in the
    legacy fallback condition. This also moves prolactin-only and AMH-only sheets (`P46`/`P47`) onto
    the engine path. Guards `M146b`, `T21`, `M160`.

- ⚠️ **Recurred 2026-09-25 (specs/009, research R6): a finding that is *suppressed* still covered its keys.** R3-CR1
  fixed the *briefed* case, but the net still took `covered` from every matched finding, before `blocks_others` ran.
  Measured on `0d8c782`:
  - WBC 80 + baso 5 % + lymph 8 %: `cml_suspicion` and `cll_suspicion_nccn` matched and were hidden under
    `extreme_leukocytosis`. **Basophils 4000 and lymphocytes 6400 appeared nowhere**, not even in «توضیح داده نشدند».
  - K 6.8 + creatinine 3.0: **creatinine 3.0 vanished** under `potassium_critical` the same way.

  The net now ignores hidden findings, both for keys and for text. `پوشش/قلبی` (CK-MB under troponin) and `M188c` were
  changed on purpose: the net's routine action is a list of names, with no timeline. Guard `M200`. **Rule:** before
  deciding what a finding covers, ask whether the patient will see it at all.

- ⚠️ **Recurred 2026-09-29 on an adult pancytopenia sheet (P59, job `40b8a901`), through the same door as N20's `blocks_others` entry.**
  `pancytopenia` hid three findings that each *had* a rule: K 5.5–5.9 (`hyperkalemia`), an isolated PT rise
  (`coagulation_abnormal`) and a high urea with normal creatinine (no rule at all). The first two were suppressed and covered
  nothing (M200), so K and PT fell into «توضیح داده نشدند»; the third fell through the same net. Fixed with `always_show` +
  `brief` (+ `brief_warnings`) on K and PT, and a new `isolated_urea_elevation`. Guards `M240`–`M240f`; `M187` changed on purpose.
  **Rule:** when a blocker can hide a finding, that finding needs `always_show` + a brief that names its own number — check every
  rule whose analyte can appear beside an emergency, not only the one that exposed it. Red-before was proven by stash
  (`pass 668 · fail 8`). Still open in `MEDICAL_RULES.md` P59: six reviewer questions and the sources for four rules.
- ⚠️ **The per-rule fix above was the wrong altitude, and the structural one landed 2026-09-29 (P60).** `always_show` + `brief` has to be
  remembered for every rule that can sit under a blocker; the next one nobody remembers fails the same way. `runPatterns` now rescues
  *any* hidden finding whose compact text (first sentence of its own `must_say` + the sheet's value) names a number nothing else
  explained: it comes back as `supplementary`, labelled «یافتهٔ تکمیلی i از n (جدا از دستور اورژانسی)», with no `action`/`warnings`/
  `suggest`. A hidden finding that says nothing new stays hidden (`leukopenia` under `pancytopenia`) and is counted in
  `_engine.suppressed_ids`. Guards `M241`–`M241f`, `T30`. **Two things to know:** the task that asked for this described a repro
  (only 3 findings on `40b8a901`) that does not reproduce on `HEAD` or the working tree — K/PT/urea were already displayed by the per-rule
  fix, so `M241d`/`M241e` are green-before; the mechanism tests are the red-before ones. And the first version of the compact text
  named the analyte but dropped its number (`CK-MB` without `45`) — worse than the old «توضیح داده نشدند» line, which had it.
  The P60 first-sentence review (436 sentence variants, 118 hideable rules, all read) found dangling openers («این اعداد…», «برای قطعی‌شدنِ
  تشخیص، این آزمایش…») and two device-error rules whose «معمولاً اثرِ نمونه یا دستگاه» is dangerous beside a critical Hb. Fixed with a
  headline fallback (`DANGLING_START`) and `technical`/`no_supplementary` exclusion; guards `M241g`/`M241h`. **The regex's first draft matched
  the prefix «آن», so «آنزیمی…» and «آنتی‌بادی…» were treated as dangling — only the CK-MB test caught it. A Persian prefix match needs a
  word boundary.** Also: a `$&` inside a `String.replace` replacement string silently spliced source text into `patterns.js` (found by
  reading the file, not by the suite) — write regex-bearing edits with the Edit tool, not `node -e`.
  P60 closed 2026-09-29: prompt rule ۰.۷ keeps the «یافتهٔ تکمیلی» label (live model dropped it on run 1, kept it on run 2; n=1 each, `M242`);
  `COMPACT_HEADLINE_ONLY` / `NO_SUPPLEMENTARY_IDS` are explicit id lists, `M244`–`M244c`.

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
- ⚠️ **Recurred 2026-09-23 as the missing-partner version (specs/007, `P52`).** An adult sheet with `Hct 18` and **no Hb**
  got `low_rbc_hct_without_anemia` and «در نوبت عادی». The same blood with Hb printed (≈ 6) was an emergency. So the less
  the sheet printed, the less the patient was told. The fix is a second arm of the **same** predicate
  (`crisisArm` in `patterns_utils.js`): Hct < `HGB_CRISIS_GDL × 3`, and only when Hb is not graded. It is not a parallel
  rule, and 21 is never written as a literal. The retired rule's sole content (a low RBC) moved into the crisis text so it
  isn't orphaned (N20). Guards `M179`–`M179c`.
  **Rule:** when the patient's severity is decided by analyte A, ask what the report says when A is absent but B, which
  tracks A, is printed at a critical value. "Not measured" must not turn into "not urgent".

### N20 — A finding's `urgency` and its action sentence are two copies of one decision, and only one of them is read
2026-08-07, `patterns_mineral_bone.js`. Caught by a smoke test before commit, logged because the
class is not covered by any entry above and it is trivially easy to reintroduce.

- **Tried:** derive a rule's `urgency` from the engine (`levelGrade(ca) >= 2 ? "this_week" :
  "routine"` — correct, and deliberately not an invented number), then write the `action` sentence
  as a plain string underneath it.
- **Broke:** on `Ca 11.4` the CTCAE hypercalcemia grade is 1 (`>ULN` to 11.5), so `urgency` came
  out `routine` — while the hardcoded action said «این هفته با پزشک … وقت بگیرید». One finding,
  two different instructions. **The field the patient actually reads is the sentence**; `urgency`
  only drives colour and ordering in the UI. So the engine would have been "right" in the field
  nobody reads and wrong in the one they do. Four rules had it.
- **Why no existing guard caught it:** every guard in the repo checks a property of one thing —
  `M36` the rule object, `M37` the encoding, `M38` the language of a string. Nothing compares two
  fields of the same finding for agreement. Consistency between fields is a new axis.
- **Rule:** if a value is computed, every sentence that restates it must be *derived from the
  computed value*, never written beside it. Here that is `actionFor(urgency, {week, routine})` —
  one argument, so the two cannot disagree. Same shape as N12's lesson one level up: there, two
  axes were collapsed into one variable; here, one decision was copied into two variables.
- **Guard:** `M70`. It sweeps 18 panels through every rule in the module and asserts `routine`
  findings never say «این هفته» or «همین حالا», and `emergency` findings always carry urgent
  wording. Verified against the pre-fix code — it goes red. It also asserts **every** rule id in
  the module was reached by at least one panel, because without that the test can pass while
  firing nothing (N15's meaningless green); that assertion is what caught two rules whose panels
  were being suppressed by an unrelated `kidney` emergency.
- **And the finding underneath the finding:** those two rules were not broken — `kidney` at
  eGFR 15 is an `emergency` with `blocks_others`, so it correctly hides `this_week` mineral
  findings. Worth knowing before you debug a rule that "doesn't fire": check `suppressed` in
  `runPatterns`'s return before assuming the `match` is wrong.
- ⚠️ **Same class one level up — two *findings* disagreeing, not two fields** (2026-08-10,
  the Henry ch.19 D-dimer work). A new rule was written to add the age-adjusted D-dimer cutoff
  («۱۰×سن برای بالای ۵۰ سال») as its own `routine` finding. Measured on `D-dimer 700` at age 78:
  **both fired**, and the patient read «این هفته با پزشک مطرح کنید» from `d_dimer_elevated`
  directly beside «برای سنِ شما افزایشِ چشمگیری نیست» from the new one. Nothing was factually
  wrong in either sentence; the report as a whole was incoherent, which is worse than either
  sentence alone because the reader has no way to pick.
- **Rule:** before adding a rule that *qualifies* an existing one, ask what turns the existing
  one off. `blocks_others` only suppresses findings of **lower** urgency, so a reassuring
  `routine` rule can never quiet a `this_week` one — the mechanism runs the wrong way for this
  shape. The fix was to delete the new rule and fold its sentence into the existing finding's
  `build`, three-way branched on age, **leaving the urgency untouched** (the age-adjusted cutoff
  is specifically about *PE rule-out in a low-pretest-probability patient*, not a general
  reference range — so it earns a sentence, not a downgrade).
- **And the cheap detector:** assert the *count*. `M86d` simply counts findings whose
  `pattern` matches `/d.?dimer/` and requires exactly one. Any future rule that re-opens this
  turns it red. A guard on "how many findings talk about this number" is worth writing whenever
  two rules read the same analyte — no existing guard in this repo checks that.
- ⚠️ **Recurred twice more, 2026-08-11, and both had been sitting in `patterns_biochem_new.js`
  since it was written.** Found by re-reading the `_new` modules against the rules they duplicate.
  Both are the same shape as the D-dimer case above — a second rule reading an analyte a
  properly-gated rule already owns — and both are worse than that one, because the duplicate
  carried `urgency: "emergency"`.
  - **`dka_hhs_emergency`: an emergency on `glu >= 250` with no gate at all.** Measured on
    `FBS 260` alone — an ordinary number in uncontrolled diabetes — the patient read «فوراً به
    بخش اورژانس مراجعه کنید» and `has_critical` came back true. On a *real* DKA sheet it fired
    **next to** `dka_pattern`, which is gated on ketones/bicarbonate, so the report carried two
    near-identical emergency findings. And on `glu >= 600` it fired next to `hhs_pattern`, whose
    600 threshold and hand-off to DKA had been written carefully (`M25` exists precisely to keep
    520 from claiming HHS). Replaced by `severe_hyperglycemia_uncertain_ketosis`, which fires
    **only when neither owner fires**, takes its urgency from `GLU_HIGH` in `ctcae.js` (G3 =
    250–500 → `this_week`, G4 = >500 → `emergency`) rather than a new number, and states the
    ketone/bicarbonate result three ways (positive / negative / not measured). Registered as
    `P42`. Guards `M91`–`M91e`.
  - **`liver_injury_pattern`: a strict subset of `liver_pattern`, deleted.** Every panel that
    fired it fired `liver_pattern` too, so its only output was a *second* finding about the same
    two enzymes. Three defects in one rule: a hardcoded `> 40` (ALT's ULN is 33 for women, 41 for
    men, and `refs_ped.js` has its own — N3); `urgency` from `alt > 400 || ast > 400` while
    `action` read `alt > 400` alone (the core of this entry); and, measured on
    `CK 900 / AST 120 / ALT 30`, it printed «الگوی آسیب سلول‌های کبدی» directly beside
    `muscle_origin_not_liver`'s «این از عضله می‌آید نه کبد». Registered as `P43`.
    Guards `M92`–`M92d`.
- ⚠️ **Recurred a third and fourth time, 2026-09-17, and these two are the worst instances yet —
  a direct emergency-vs-routine flip on the identical number.** Found by a full-codebase audit,
  not by a test. Both had been sitting in `patterns_biochem_new.js` since it was written, both in
  the *same file* as the two instances above, and both alongside
  `severe_hyperglycemia_uncertain_ketosis` — which gets this exactly right and even cites N20 in
  its own comment. Measured on the live engine:

  | panel | finding one | finding two |
  |---|---|---|
  | `Amylase 800` alone | `amylase_emergency` — «فوراً به بخش اورژانس مراجعه کنید.» | `amylase_isolated` — «نوبت عادی، مگر علامت خاصی داشته باشید.» |
  | `BiliT 18 / BiliD 12` | `bilirubin_emergency` — «بدون تأخیر به اورژانس» | `bilirubin_direct_dominant` — «این هفته با پزشک مطرح کنید.» |

  Neither emergency rule set `blocks_others`, so the suppression logic never engaged
  (`suppressed: 0`). A third pair in `patterns_endocrine_new.js` (`overt_hypothyroidism` vs the
  `thyroid` rule's `thyroid_hypo_overt`) failed the other direction: a strict subset that
  **downgraded** the card the patient reads from `this_week` to `routine`, while
  `overall_urgency` stayed correct because it is a max — so nothing looked wrong from outside.
  Fixed by closing the hand-off from the *lower*-urgency side (`amylaseEmergencyOwns`,
  `biliEmergencyOwns` in `patterns_utils.js`, read by both the emergency `match` and the owner's
  gate) and deleting the two thyroid duplicates. Registered as `P45`. Guards `M97`–`M99d`.
- **Why `blocks_others` was the wrong instrument here, even though it would have worked:** it
  suppresses *every* lower-urgency finding on the sheet, not just the contradicting one. The
  bilirubin-18 patient would have lost their anemia finding too. Reach for a hand-off gate when
  the conflict is about one analyte, and for `blocks_others` only when the emergency genuinely
  should be the only thing the patient reads.
- ⚠️ **And closing a hand-off orphans whatever the retired rule was also covering.** The moment
  `pancreas_pattern` and `bilirubin_pattern` stood down, `LIPASE` and `BILI_D` had no owner and
  fell to the N18 net («توضیحِ آمادهٔ اختصاصی نداریم») — on an emergency report. The root cause
  was not the gate: both emergency rules *named* three or four possible causes while the value
  that discriminates them was printed on the same sheet and never read. That is N21, and the gate
  merely exposed it. Both were rewritten three ways (confirms / argues against / not measured).
  **Before gating a rule off, list what else it was the only owner of.**
  ⚠️ **Recurred 2026-09-23 through `blocks_others`, on a real sheet (M187).** The sheet was a 62-year-old man with
  WBC 0.27, PLT 15, Hb 8.3 and MCV 65.8. `pancytopenia`, `severe_neutropenia` and `severe_thrombocytopenia` each
  carry `blocks_others`, so they hid `microcytic_anemia` (`this_week`) entirely. The report never gave the Hb or MCV
  number, and it never asked for ferritin. On top of that, HCT 23.7, MCH and RDW were printed under «توضیحِ آماده
  نداریم», directly beneath the anaemia that explains them. `RULE_READS` counts only tokens in the source, so no
  rule "read" HCT. Fixed by giving `microcytic_anemia` `always_show` + `brief`, and by naming those values in its
  text.
  ⚠️ **Recurred the next day on a real sheet (job `d982209d`, 2026-09-24):** `normocytic_anemia` had never got the same
  treatment. Under `pancytopenia` + `severe_thrombocytopenia` the report never gave Hb 10.1. HCT, MCH, both RDWs and
  neutrophils 1380 landed in «توضیح داده نشدند», and `pancytopenia` itself had no numbers and an empty `suggest`. Fixed with
  `always_show` + a `brief` built in a module-level helper (`normocyticBrief`), so its keys stay out of `RULE_READS` (M156,
  guard `M191b`). `pancytopenia` now quotes Hb/WBC/PLT/neutrophils and asks for smear, reticulocytes, B12, folate and ferritin
  (`M191`). **When one finding in a class gets `always_show`, check its siblings in the same session.**
  ⚠️ **And that fix was itself incomplete — reported "fixed" twice while the patient still saw the box (job `0400a412`, same
  day).** It named RBC/HCT/MCH only in the *brief* (shown under an emergency). The full normocytic text and all of
  `macrocytic_anemia` never named them, so on an ordinary macrocytic sheet (Hb 11.9, MCV 102.3) RBC 3.33, HCT 34.1 and MCH 35.6
  went to «خارج از محدوده — تفسیرش با پزشک است», plus neutrophils 1697 (normal WBC), which no rule owned at all. The sibling
  rule the entry above told me to check was `macrocytic_anemia`, and I didn't. Fixed with one helper for the full text of both
  (`anemiaCompanionsFa`, same direction only), `always_show` + `macrocyticBrief`, and `mild_neutropenia` (CTCAE bands).
  Guards `M192`–`M192d`. **Verify a coverage fix on the sheet that exposed it *and* on the ordinary panel of every sibling
  rule, in both the full and the brief form. One green panel says nothing about the others.**
  **The fix nearly caused its own N18.** Reading `RBC`/`RDW` in the source marks them covered in *every* direction.
  A high RBC or a low RDW-SD would then have vanished from the report, so each direction got its own sentence
  (M156, `M187b`).
  ⚠️ **Recurred 2026-09-19 (specs/004), and this time the orphan was a warning, not an analyte.**
  `folate_deficiency` stands down whenever `macrocytic_anemia` fires, which is right: one finding
  owns folate. But the folic-acid caution («خودسرانه اسید فولیک شروع نکنید») lived only in
  `folate_deficiency`. So on `Hb 9.5 · MCV 112 · Folate 2` with no B12, the caution vanished. That is
  the one panel where folic acid can hide a B12 deficiency while nerve damage continues, and the new
  macrocytic text had just told the patient the low folate "fits". Caught by both review agents
  before commit. Guard `M155`. The inventory has to cover **warnings and cautions too**, not only
  keys.
  The same review found **B3**: `folate_deficiency` stayed `routine` while `overt_b12_deficiency`
  said «این هفته» about the same B12 it quoted. The fix takes the urgency from the existing rule
  instead of adding a number (`M157`).
- **The rule that generalizes, and it is about where you look:** both of these were *additions*
  to a `_new` module that never checked what the non-`_new` module already did. `patterns.js`
  spreads both arrays into one `RULES`, so the two are siblings at runtime — the filename says
  "new" and means nothing. **Before adding a rule, grep the analyte across every `patterns_*.js`,
  not just the one you are editing**, and if something already reads it, the question is which
  rule hands off to which — not whether yours is also correct. Two correct rules about one number
  still produce an incoherent report.
- **And the detector generalizes with it:** `M91e` sweeps nine glucose panels and asserts that
  **exactly one** of the three glucose owners fires on each — it fails both when a panel falls
  between the rules (silence) and when two claim it (contradiction). That two-sided assertion is
  cheap and belongs anywhere a hand-off exists. Writing it is also what surfaced a real gap:
  `dka_pattern` reads only `GLU_F`/`GLU_RANDOM`, never `GLU_2H`, so a two-hour glucose of 320
  with positive ketones was owned by nobody. The hand-off condition is therefore written as
  "does that rule actually fire", never "is the number past its threshold".
- ⚠️ **Recurred 2026-09-20, and this one had been in the tree since `severe_anemia_crisis`
  was written.** `severe_anemia_crisis` fires at Hb < 7 with «فوراً و بدون اتلاف وقت به بخش
  اورژانس». Every rule that *classifies* the same anaemia kept its own timeline beside it.
  Measured on `607b419`, one panel each, all with Hb 6.2:

  | panel | the emergency says | the second finding says |
  |---|---|---|
  | + MCV 112 | «فوراً … به اورژانس» | `macrocytic_anemia` — «این هفته با پزشک … وقت بگیرید» |
  | + MCV 68 | same | `microcytic_ida_likely` — «همین چند روز …» |
  | + MCV 88 | same | `normocytic_anemia` — «همین چند روز …» |
  | + MCHC 37 | same | `spherocytosis_likely` — «در همین هفته‌های پیشِ رو …» |
  | + WBC 2.1, PLT 60 | same | `pancytopenia` — «همین امروز با پزشک تماس بگیرید» |

  Note `pancytopenia`: it is *also* an emergency and it *already* carries `blocks_others`, which is
  why nobody caught it — `blocks_others` only suppresses **lower** urgency, so two emergencies with
  two different instructions sit side by side untouched. A patient bleeding out at Hb 6.2 got to
  choose between "now", "today", "a few days" and "this week", and the most reassuring one is the
  easiest to act on.
- **The instrument was a hand-off, and the reason not to reach for `blocks_others` is concrete
  here:** the macrocytic/microcytic findings carry the *content* (cell size, the B12/folate or
  ferritin workup, the «خودتان مکمل شروع نکنید» warnings). Suppressing them to silence one
  sentence would delete all of it. Only the `action` field defers: `actionUnlessAnemiaCrisis(e, …)`
  in `patterns_utils.js`, with the Hb < 7 predicate defined **once** (`anemiaCrisisOwns`) and read by
  `severe_anemia_crisis`'s own `match`, so the hand-off asks "does that rule fire" rather than
  re-stating the threshold — the `M91e` lesson.
- ⚠️ **The scope is deliberately narrow, and the narrowness is a decision, not an oversight.**
  Only findings about *that haemoglobin* defer. `overt_b12_deficiency`, `iron_deficiency`,
  `crp_elevated` and `ldh_high_nonspecific` keep their own timelines, because they are about their
  own analyte and widening the gate to "anything on an emergency sheet" is the blanket suppression
  this entry warns against two bullets up. If you add an anaemia-classification rule, add it to the
  `OWNERS` list in `M162` — the guard sweeps five panels and fails both when a rule keeps a rival
  timeline and when fewer than five owner findings were reached (N15's meaningless green).
- **Guards:** `M162` (five panels, red before), `M162b` (the content survives — the negative
  control against "just use `blocks_others`"), `M162c` (Hb 9.5: every action byte-for-byte as it
  was). Registered in `MEDICAL_RULES.md` under `P49`.

- ⚠️ **And the same class in `patterns_unit_unknown.js`, on a newborn** (2026-09-20, `P48`). The
  neonatal bilirubin clause had an `emergency` variant reading «این عدد را همین امروز به
  پزشکِ نوزاد نشان دهید» — printed directly beside its own `action`, «همین حالا به
  اورژانس مراجعه کنید». It was *introduced* by a previous N20 fix (B6), which branched the
  clause on urgency so the two would agree — and they still didn't, because agreeing on the
  *urgency level* is not the same as agreeing on the *instruction*. User decision: the ER wins.
  The clause is now one string with no timeline in it at all, so it cannot branch and cannot
  disagree. **A sentence that explains should not also instruct** — that is what leaves room for a
  second instruction to appear. Guard `M163`; `M134` and `M138` were asserting the retired wording
  and were updated on purpose.


### N21 — Listing the possible causes without saying which ones the same sheet already argues against
2026-08-10, `isolated_ldh_elevation`. Found by running a real patient's sheet through the engine.

- **Tried:** write the "your LDH is high" finding as an honest differential — muscle, liver,
  heart, kidney, malignancy, hemolysis — and then attach *extra* clues only when another test is
  **also abnormal** (`if (ck === "high")`, `if (ast === "high" || alt === "high")`).
- **Broke:** the sheet had `AST 16` and `ALT 22`, both normal, printed two rows above the LDH.
  The patient read a paragraph naming liver disease and muscle injury among the causes, and the
  finding never mentioned that two of those causes had just been tested on that same page and
  come back normal. Nothing said was false. What was withheld was the only reassuring thing on
  the sheet, and withholding it in a paragraph that names malignancy is not a neutral omission.
- **Why no guard saw it:** `M36`/`M37`/`M38` are properties of strings that exist, and the
  string that should have existed didn't. The N16 blind spot, one level down: not a deleted rule
  but a **branch that was never written**.
- **Rule:** when a finding enumerates causes, every cause that the panel can speak to needs a
  three-way branch — supported / argued against / not measured — not just the first one.
  A rule that reads a key only in its `=== "high"` arm is treating "normal" and "absent" as the
  same answer, which is N4 wearing different clothes. Write the "normal" arm at the same time as
  the "high" arm, and make the "absent" arm say it is absent.
- **And keep the two apart:** the `else if` for "one enzyme normal, the other missing" tests
  `=== "absent"` explicitly, not "anything that isn't high". Written the lazy way, a *low* ALT
  would have produced «ALT روی برگهٔ شما نیست» about a number that was printed on it.
- **Guards:** `M74`, `M74b`, `M74c` — all three red against the pre-fix rule.

### N22 — A reference range is not a target, and the sheet only knows the range
2026-08-10, `lipid_profile`. Same sheet as N21.

- **Tried:** gate the lipid finding on the reference range, like every other test —
  `ldl?.abnormal && ldl.dir === "high"`, i.e. LDL above 130.
- **Broke:** the patient's `LDL` was **114** and his `FBS` was **209**. 114 is inside the range,
  so `lipid_profile` never fired and the interpretation said nothing at all about his lipids —
  on the one sheet where they mattered most. The ADA target for someone whose glucose is in the
  diabetes range is under 100 (under 70 if high-risk). The engine had the number and the glucose
  side by side and drew no line between them.
- **The generalizing shape, which is not specific to lipids:** `refs.js` answers "is this value
  unusual for a general adult?". Several analytes are also governed by a *target* that depends on
  another finding on the same sheet — LDL in diabetes, blood pressure in CKD, HbA1c in pregnancy.
  For those, "normal" and "acceptable for this patient" are different questions, and grading only
  answers the first. **Whenever a rule's `match` is `abnormal && dir === "high"`, ask whether some
  other finding on the panel lowers the bar** — and if it does, that is a second `match` arm, not
  a change to the range. Changing `refs.js` would have mislabelled every non-diabetic's LDL.
- **What was deliberately not done:** the 70 target needs cardiovascular history the engine can't
  see, so only 100 is implemented and the text hands the stricter target to the doctor; no statin
  recommendation was added (prescribing isn't this engine's job); and the text says «قند شما در
  محدودهٔ دیابت است», never «دیابت دارید» — the sheet had one abnormal glucose, and ADA needs two.
- **Sourcing:** the number is in `guidelines.js` as `ADA_SOC_CVD`, a **separate** entry from
  `ADA_SOC` even though it is the same document, because `ADA_SOC`'s scope is diagnosis (section
  2) and this comes from section 10. And it is attached via `sources:` on the finding, only on
  that branch — `RULE_SOURCES` deliberately has no lipid row, since the other thresholds there are
  NCEP's, and a blanket attach would have cited ADA to every patient with high triglycerides.
- **Guards:** `M75`, `M75b` (negative control — same LDL, normal glucose, no finding), `M75c`
  (the source doesn't leak onto non-diabetic lipid findings). Registered as `P33` in
  [MEDICAL_RULES.md](MEDICAL_RULES.md) with two open questions for the clinical reviewer.

### N23 — Changing a reference range silently loosens every rule that reads `dir === "low"`
2026-08-11, `ADULT_REFS.ALB` 3.5 → 3.9 (Henry ch.20, reviewer decision `P44`). Caught before
commit by probing the change rather than by any test. Logged because **no existing entry covers
it and no guard in the repo watches for it.**

- **Tried:** apply a reviewer-approved reference range. Henry's Table 20.2 gives albumin
  39–51 g/L, so `[3.5, 5.0]` became `[3.9, 5.1]` g/dL. A range change, nothing more — the kind
  of edit that looks like it can only affect whether one test reads "normal".
- **Broke:** two multi-marker *diagnostic* rules, neither of which was touched.
  `cirrhosis_pattern` counts 4 markers and fires at 3; `isNephrotic` requires heavy proteinuria
  **and** low albumin. Both expressed "low albumin" as `alb.abnormal && alb.dir === "low"` — so
  their clinical threshold was never a decision, it was a **silent alias for whatever the
  reference range happened to be**. Measured on `HEAD`, not argued:

  | panel | before the range change | after, before the guard |
  |---|---|---|
  | `ALB 3.7 · PLT 120 · BILI_T 1.5` | `thrombocytopenia` | + `chronic_liver_disease_pattern` |
  | `urine protein 3+ · ALB 3.7` | `proteinuria_heavy` | `nephrotic_pattern` |

  The first panel is a plausible Gilbert syndrome — mild unconjugated hyperbilirubinemia is
  common and benign — plus mild thrombocytopenia. Telling that patient they have chronic liver
  disease is an over-read nobody decided on. Nephrotic syndrome is not defined at albumin 3.7
  either.
- **Why nothing caught it:** every guard in this repo is a property of *one* thing — `M36` the
  rule object, `M37` encoding, `M38` language, `M70` field agreement inside one finding. The
  full suite stayed **330 pass · 0 fail** across the change. A reference range and a rule that
  reads it live in different files, and nothing asserts a relationship between them.
- **Rule:** a reference range answers "is this unusual for a general adult?". Membership in a
  multi-marker pattern for a heavy diagnosis is a **different question with a different number**.
  Any rule that treats `dir === "low"` / `dir === "high"` as evidence *for a named disease* is
  coupled to `refs.js` whether its author knew it or not. Before changing a range, grep for the
  key in `patterns_*.js` and run the boundary panel — the new value paired with just enough other
  markers to sit one short of the rule's threshold. That panel is where the silent change lives.
- **The fix is a hold-the-line constant, not a new threshold.** `ALB_LOW_MARKER_GDL = 3.5` in
  `patterns_utils.js` pins the two rules to the behaviour they already had, so the range change
  has zero effect on rule firing. It makes no new clinical claim and needs no new source — which
  is exactly why it was the right move for a change whose mandate was "adopt Henry's range", not
  "redefine cirrhosis". Whether 3.5–3.8 *should* count as a marker is a real clinical question
  and it is written down as an open question in `P44-ج`, not decided in passing.
- **This is N22 from the other side.** There, the reference range was too loose for a
  treatment target and a second `match` arm was needed. Here, the reference range got *tighter*
  and a diagnostic threshold rode along with it. Same underlying error both times: **one number
  was doing two jobs.**
- **Guards:** `M94f`, `M94g` (the real 4-marker cirrhosis still fires — a widened guard must not
  become a blindfold), `M94h` (both arms: 3.7 is not nephrotic, 2.4 still is).
- ⚠️ **Hit again, deliberately this time, 2026-09-23 (specs/008, `P53`): ferritin and iron.** The approved ranges widened
  both: male ferritin 30–300 → 12–300, iron 60–150 → 50–160. `iron_deficiency_panel` and `anemia_chronic_disease` read
  `dir === "low"`. Changing the range alone would have silently switched off the iron-deficiency finding for a man with
  ferritin 20, and chronic-disease anaemia at iron 50–59. The fix is the same split as `ALB_LOW_MARKER_GDL`:
  - `ferritinIdCut` / `ferritinBelowIdCut` / `ironLowForAcd` in `patterns_utils.js` hold the old cut-offs.
  - The one intended change goes in the same function: women ≥ 50 are cut at < 30.
  - Guards: `M185`, `M185d`.

  Two traps met on the way, both of them general:
  - **A flat adult cut-off applied to a child.** Under 16 the range comes from `PED_REFS`. A literal 30 would have
    turned a 10-year-old's ferritin 20 (normal by RCPCH) into «کمبودِ آهن». So the helper keeps `dir` under 16.
    ⚠️ **Recurred one fix later, in the rule written to close a round-1 blocker:** `microcytosis_no_anemia` used
    `MCV < 80`, so a healthy 3-year-old (MCV 75, range 70–86, row «طبیعی») read «کوچک‌تر از حد طبیعی … کمبودِ آهن یا
    صفتِ تالاسمی». The WHO sentence had the same flaw: it told a 10-year-old «آستانهٔ معمولِ 30». **Every new literal
    cut-off in a rule needs the under-16 question asked again. Having asked it in the helper next door doesn't count.**
    Guards `M184g`, `M184h`.
  - **A rule that absorbs another rule's content inherits its warnings too** (N20, M155 class). Round 1 made
    `microcytosis_no_anemia` an HbA2 owner, so `hba2_elevated` stood down. The β-trait sentence moved over, but the
    premarital «اگر هر دو والد ناقل باشند…» warning didn't. So a CBC printed next to the HbA2 *removed* the warning
    that HbA2 alone gets. There is now one constant (`HBA2_CARRIER_WARNING`), and `M184j` sweeps every owner.
  - **Once a rule fires on a value the grading calls normal, its text must stop saying «پایین».** The iron-deficiency
    text is now three-way: below the range / inside the range but below the cut / neither.
- **Where a range move is the decision, re-baseline the freezes, and prove the only difference is the one you meant.**
  The Hb thresholds (specs/008 Q1) moved every anaemia finding's printed range («14–17.5» → «13.7–17.5»), which turned
  six hash freezes red. Each was re-baselined only after a diff of the full output on `9deba20` against the tree
  came out empty once the range string was stripped.
  - Moving a rule's `match` into a helper is **not** refactor-neutral here: `RULE_READS` scans the rule's own source, so
    MCV/RBC/HGB fell out of coverage and `unexplained_abnormal` appeared on thalassaemia panels (measured).
  - A "does the owner fire" helper has to call the live rule (`thalOwnerFires`, the `hemolysisRuleFires` shape), not
    carry a copy of its condition.

### N24 — Authenticating the write half of a route pair and not the read half
2026-09-17, `GET /api/analyze/job/:id` and `POST /api/labmat/analyze`. Found by a full-codebase
audit, not by a test. Not a clinical rule — it is the patient's whole interpretation.

- **Tried:** put `requireAuth` on the routes that *start* work (`/api/analyze`,
  `/api/analyze/start`) and leave the poll route open, because it takes an unguessable id and
  returns "just" a job.
- **Broke:** the poll route called `getJob(req.params.id)` and nothing else — no `requireAuth`, no
  owner check — while `/start` handed that id to the client. So with `AUTH_REQUIRED=true`,
  *starting* an analysis needed a token and *reading its result* did not, and the result is the
  full interpretation of a named patient's lab sheet. `jobStore.js` had no concept of an owner at
  all, so there was nothing to check against even if the route had wanted to. The sibling defect
  in the same block: `POST /api/labmat/analyze` had no `requireAuth` **and** no `USE_GRAPH` gate
  (the gate lived only inside `analyzeHandler`), so the one path the project deliberately keeps
  off — LLM-authored patient text that bypasses every step-8 safety net, N13 — was reachable by
  anyone, always.
- **Why nothing caught it:** every test in `api-contract.test.js` exercises `/api/analyze`, and
  `AUTH_REQUIRED` is unset in the test env, so `requireAuth` hands back the shared anonymous user
  and *no route looks different from any other*. An auth asymmetry is invisible in a suite that
  runs with auth off — and it will be invisible in production too, right up until someone turns
  auth on and believes it.
- **Rule:** authentication is a property of a **route pair**, not of a route. Whenever one
  endpoint creates a resource and another reads it, check both, and check that the read is scoped
  to an owner rather than merely to a hard-to-guess id — a job id travels in a response body, a
  log, a `localStorage` entry and a support screenshot. "It's unguessable" is not an
  authorization model.
- **And the consequence you must fix in the same change:** adding auth to a read route breaks the
  client that was polling it without a header. `analyzeJob.js`'s `pollJob()` sent none, so the fix
  would have produced a 401 *after* a successful, billed 90–150s OCR run — the analysis paid for
  and then thrown away. The header helper now serves both calls, and a 401 clears the dead token
  and produces a real sentence instead of «خطای سرور (401)». **When you tighten a route, grep for
  every caller of it before running the suite** — the suite passes either way, because it runs
  with auth off.
- **Guards:** `T14` (ownership in `jobStore`), `T15` (another user's job id gets a 404 and the
  result body does not leak), `T16` (the graph route is 503 with `USE_GRAPH` off). All three red
  against the committed tree; measured with the `git archive` + junction recipe.
- **Also fixed here, and worth its own sentence because it was dead for months:** that route's
  `catch` block promised a deterministic fallback and imported `./rules/engine.js` (does not
  exist — `runEngine` is in `adapter.js`) and `generateInterpretation` from `rules/interpret.js`
  (does not exist anywhere). Every graph failure therefore hit "Fallback failed" and a 500. It now
  calls `buildEngineFallbackResult()`, which is the real engine-only path. **A fallback that has
  never run is not a fallback**; if you write one, make a test take that branch.

### N25 — A row name is not an identity; the page it sits on is part of the key
2026-09-18, Henry ch.26 Stage A (`P47`). Found by probing the live engine before writing the spec,
not by a test.

- **Tried (implicitly, for as long as the adapter has existed):** resolve a row by its printed
  name alone — `pH` is urine pH unless an ABG is present, `WBC`/`RBC` are blood unless the page
  looks like a urinalysis.
- **Broke:** a **semen analysis** prints `pH`, `WBC`, `RBC`, `Volume` and `Count`, the same words.
  Measured on `8ccd67d`, the panel `Volume 2.5 · pH 8.4 · Count 40 million/mL · WBC 15-20 ·
  RBC 8-10 · Motility 45 %` fired `hematuria`, and the patient read «در آزمایش ادرار شما خون
  (گلبول قرمز) دیده شده است» about a sheet that is not a urine test. Not a silence: a
  confidently wrong finding.
- **The obvious fix was also wrong, and that's the reusable part.** Re-labelling the rows
  «Semen RBC» and leaving them in `qual` would have changed nothing. The urine rules look in
  `qual` with `/rbc/` and `/wbc/` on **any** key (`urineCellCount(e, /rbc|…/)`), so a
  differently-named row matches just the same. The rows needed a **separate channel**
  (`semenQual`), not a different name. Before re-labelling anything to hide it from a rule, read
  how the rule looks it up.
- **The same shape one layer up, in `mergePages`:** rows from different pages were deduplicated
  by name, and the first one won. With a CBC page and a semen page both printing `WBC`, uploading
  the semen page first **silently deleted the CBC's WBC**: the N2 class, on the most common test
  in the app. It is fixed by prefixing semen-page rows with `semen:` in the merge key.
- **Order mattered twice.** The semen layer has to run before the `/hpf` layer, because semen
  WBC/RBC are usually printed per `/hpf` and would otherwise be taken as urine first. And the
  semen-unit test has to require **mL**, never µL, because blood RBC is printed `10*6/µL`, and
  matching that would turn every CBC into a semen page (`M104b`).
- **Rule:** whenever two kinds of report share a vocabulary (urine / semen / CBC / ABG), the
  identity of a row is `(page kind, name)`, not `name`. Adding a new kind of report means
  checking three places: the adapter's layer order, every rule that searches `qual` by regex,
  and the merge key.
- **Known limit, by decision (clarify Q4):** a page counts as semen only when it has a
  semen-only row name (Motility, Morphology, Sperm, …) or a semen-only unit. A page with *only*
  `Volume/pH/Count/WBC/RBC` and neither signal is still read as urine. OCR returns no section
  title, so there is nothing else to go on. Adding one to `OCR_PROMPT` is a recorded follow-up in
  `P47`.
- **Guards:** `M104`, `M104b`, `T18` (red on `8ccd67d`, measured with the archive + junction
  recipe: `433 · 413 · 6 fail`, the 6 being these three plus `M105`–`M105c`); `M104c`, `M104d`
  (freezes: mixed CBC+semen page, and 12 urine/CBC-only panels unchanged byte-for-byte).
- ⚠️ **Recurred in Stage B, both directions, caught by the two review agents before commit
  (2026-09-19).** The page detector was made too *eager*: a single `Sperm` row, which Iranian
  urinalysis microscopy prints routinely, turned a urine page into a semen page. Its WBC/RBC left
  `qual`, `hematuria` vanished, and the urine pH was graded as «pHِ مایع منی ۵.۵، پایین». It was
  also too *strict*: `×10⁶/ml` with a superscript six didn't match the unit regex, so a real semen
  page fell back to urine and its RBC fired `hematuria` again. **A page-kind detector has two error
  directions; test a panel for each** (`M114`, `M118`). Words shared by two report kinds
  (`Sperm`, `Morphology`) are *weak* evidence and count only when the page shows no sign of the
  other kind.
- **Same review, the N3 and N2 classes on the new analytes.** Testosterone printed in `ng/mL`
  (common on Iranian sheets) was graded against a `ng/dL` limit, so a healthy man read «تستوسترونِ
  شما 4.5 ng/dL است و از حدِ 300 کمتر است». It is now converted ×100, and **with no unit it is not
  graded at all** (`unit_unknown`), because 4.5 and 450 are both plausible (`M115`). And
  «Sperm Count: Azoospermia» as *text* went to `semenQual`, which nothing read, so an azoospermic
  patient reached `buildNormalResult()` (`M116`). **Every row routed into a side channel needs a
  reader, or the channel is a silent drop** (`M116b`: `/hpf` leukocytes and Grade a–d motility are
  now named without a verdict).
- ⚠️ **Recurred 2026-09-22 inside the urine page itself (specs/005, Henry ch.29 Stage A).** This entry
  already named the mechanism ("the urine rules look in `qual` with `/rbc/` and `/wbc/` on **any**
  key"); this time the colliding rows were urine rows too. Measured on `395a5d7`:
  - `RBC Casts 5-8 /lpf` fired `hematuria`: «در آزمایش ادرار شما خون (گلبول قرمز) دیده شده است». A
    red-cell **cast** forms inside the kidney, so the bleeding is renal, not bladder. The patient got the
    milder reading. That is an under-read, not silence.
  - `Leukocyte Casts 8-10` fired `uti_likely` on a sheet with a normal WBC of 2-3, while the same row
    spelled `WBC Casts` fired nothing. One row gave two different reports and neither was right (the N2
    two-printed-names class).
  - Found while freezing the fixtures: the WBC **count** regex contains `leukocyt`, so it read the
    leukocyte-**esterase pad** row, took its `+1` as "1 cell/hpf", and whichever row came first won.
    Iranian sheets print the dipstick before microscopy, so in the usual layout `LE +1 · WBC 8-10`
    fired nothing.
  **Where the fix went:** it is one exclusion inside `urineCellCount`/`urinePositive`/`urineGrade`
  (`isCastKey`, plus a pad-row skip in `urineCellCount` only), not eight edits at eight call sites. A
  helper-level fix also covers the next rule someone writes with `/rbc/`. That exclusion is a guard
  that *skips* rows, which is exactly what N15 warns about, so it comes with a count: `castRows(e)`
  lists what was skipped and `M165g` fails if any skipped row goes unread by `castAxis`.
  **Rule, sharpened:** within one page kind, "is this row about loose cells, a cast, or a dipstick pad?"
  is a separate identity question from the page-kind one above. Before a regex search over `qual`,
  list which *other* row types contain its fragment (`rbc` is in «RBC Casts», `leukocyt` is in
  «Leukocyte Esterase»). Guards `M164`–`M164e`, `M165`–`M165g`; register `P50`.
  ⚠️ **The fix shipped two regressions of its own, and a medical review caught them (FAIL, B1).** Both
  are classes already in this file:
  - **N6.** The new cast reader treated any value without digits as "present" unless it was on a short
    list of negatives. So `RBC Casts: Absent`, «مشاهده نشد» and `Nil seen` (the usual way to write "not
    seen") produced «سیلندرِ گلبولِ قرمز … منشأ خون درونِ کلیه … این هفته» on a normal sheet. My
    freeze guard for negatives (`M165d`) passed because it only tried the six spellings in my own list.
    That is N3's fourth-round rule again: test the input as real sheets write it, not as your fixture
    happens to. The fix is a closed *presence* list; anything unrecognised goes to «تفسیر نشدند»
    (`M169`, 18 spellings).
  - **N4.** "Not on the sheet" was derived from `urineCellCount() == null`, which also returns `null`
    for a printed but non-numeric value. So «RBC: Many» was reported as «روی این برگه نیست».
    `urineCellState` now separates absent / low / high / unknown (`M169b`, `M169c`).
  The same review also found a new N21 pair: a red-cell cast finding said «نه از مثانه», and next to it
  the haematuria finding said «عفونت و سنگ … قاعدگی». Haematuria now hands off to the cast finding
  (`M169e`, `M169i`).
- ⚠️ **Recurred the other way round, 2026-09-22 (specs/006, Stage B): recognised and then discarded.** The page
  detector counts `Specific Gravity`, `Crystals` and `Epithelial cells` as proof that a page *is* a urine page. After
  that, nothing read them. Printed with `/hpf`, they were routed into `qual`, and no rule looked there for them. So the
  patient saw **nothing**, not even the «تفسیر نشدند» line. Dipstick bilirubin and urobilinogen sat in `qual` the same
  way. Measured on `b9068df` (research R1). That is N18 at the routing layer: a channel with no reader is a silent drop.
  **Rule:** a row name that a detector uses as evidence must have a reader or a route to `unmapped`. Knowing what a row
  is, then keeping quiet about it, is the worst of both. Guards `M171`–`M175g`; register `P51`. The same routing had its
  own N25 trap: `Cholesterol` and `Uric Acid` on their own are serum tests. They count as crystals only when the crystal
  word is present (`M171c`), and «Hippuric acid» contains «uric» (word boundary, `M172e`).
  ⚠️ **And the review failed it (B1–B4), on classes already in this file.**
  - **N6 again, for the third time in this entry:** the new dipstick-bilirubin reader matched `\+` and `کم` as substrings and
    counted any number above zero as positive. So «<0.5», «کمتر از 0.5» and «+/-» all read as «بیلی‌روبینِ مثبت، این هفته».
  - **N3:** the urobilinogen unit was thrown away, so «3.2 µmol/L» (the strip's *normal* pad) was reported as raised.
  - **N20, one level down:** the hand-off asked "does the owner's `match` fire?", but that owner has a branch which denies
    the liver (Gilbert, muscle). So the urine sentence ended up inside the one finding that contradicts it, and the
    this_week urgency was lost.
  **Rule, sharpened:** a hand-off target is the *branch that gets built*, not the rule. When an owner has a branch that
  argues against the folded sentence, build the owner and check the branch; the M91e lesson still applies (never restate
  its threshold). Guards `M176`–`M176l`.
- ⚠️ **Recurred 2026-09-23 on haemoglobin electrophoresis (specs/008, `P53`), and one of the two collisions was a loaded
  gun.**
  - **The silent drop.** «HbS 40 %» (sickle haemoglobin) matched the **anti-HBs** qual pattern `/^(anti)?hbs$/`.
    Nothing reads bare `hbs` (`patterns_infectious.js:40` removed it on purpose), so the result was dropped with no
    trace.
  - **The loaded gun.** The only thing keeping that row out of `resolveAlias` was the anti-HBs regex. The alias's plural
    rule strips the `s` and maps `hb` → **`HGB`**, so «HbS 40» would have become **Hb 40 g/dL**. Remove the regex "to fix
    the collision" and that is what happens.
  - **Same shape elsewhere.** `HbC` is also anti-HBc (hepatitis B core), and `HbE` is HBeAg. `norm()` lowercases, so the
    printed case is gone.
  - **The fix.** An electrophoresis layer in `runEngine`, before `qual`, reads `hbs`/`hbc`/`hbe` as variants only with a
    `%` unit or an unambiguous electrophoresis row (HbA2/HbF/HbA) on the same sheet. Without that evidence the row goes
    to `unmapped` («تفسیر نشدند»), never to `mapKey`.
  - ⚠️ **Recurred in the same feature, round 2 (2026-09-24):** the gate covered «HbS» and «Hemoglobin S» but not «Hgb S»,
    and `hgbs` hits the same plural rule (→ `hgb` → HGB). «Hgb A2 3.1 % · Hgb S 40 %» gave a sickle-trait carrier
    «همین حالا به اورژانس». The same round found Persian «هموگلوبین E/C», «HbA2/E», «HbAS», «35%» in the value, and
    «HBs» (hepatitis page) vs «HbS» (electrophoresis page) colliding in `mergePages`. **Enumerate every spelling family
    (Hb/Hgb/Hemoglobin/Persian × S/C/E/A/A2/F), not the ones in the incident.** Guards `M186m`, `M186n`, `T24`, `T25`.
  - **Rule:** before relying on a regex to *keep a row out of* a channel, check what the row turns into when the regex
    stops matching.
- ⚠️ **Same class one layer down, caught by the probe before commit (P53 Q11, 2026-09-24): a `reason` string is a channel key
  too.** The unknown-sex Hb was first parked in `ungraded` with `reason: "sex_unknown"`, the reason the reproductive-hormone
  channel already used. `reproductive_hormone_context` reads every entry with that reason, so the patient would have read
  «هموگلوبین (12.5): محدودهٔ طبیعیِ این **هورمون** …». It is now `hgb_sex_unknown`. **Before reusing a `reason`, grep every
  reader of `ungraded` for it.** Guard `M190b`. `resolveAlias`'s plural and trailing-`e` rules make every short name one character away from
    another analyte. Guards `M186`–`M186c`.

---

## Rules

Detailed instructions are split across `.claude/rules/`:

- [architecture.md](.claude/rules/architecture.md) — core architecture decision (engine vs. LLM), the 9-step `/api/analyze` request flow, the legacy non-engine path. Describes the **classic path**, which is still the default and the only one with safety nets; the graph path is documented in this file instead.
- [rules-engine.md](.claude/rules/rules-engine.md) — the three grading modes (severity/classifier/binary), reference-range sources, checklist for adding a new lab test.
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
