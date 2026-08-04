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
   ⚠️ **The backend suite is red, and "the baseline" is two different numbers.** A previous
   version of this file quoted `186 tests, 185 pass, 1 fail` as *the* baseline. That number was
   only ever true of somebody's **working tree**; the committed tree was far redder, and nobody
   re-derived it. See [N15](#n15--a-green-suite-proves-nothing-when-the-damage-is-invisible-to-the-tests).

   | what you measured | tests | pass | fail |
   |---|---|---|---|
   | `HEAD` before `5059a05` | 186 | 137 | **49** |
   | `HEAD` at `5059a05` (mojibake repaired) | 186 | 174 | **12** |
   | working tree, 2026-08-04 | 187 | 186 | **1** (`T10`) |

   **Any baseline you quote must name which tree it came from**, and you must *re-measure* it —
   never copy a number out of this file. The three differ because uncommitted work in the tree
   fixes tests that the commit does not. The 12 still failing at `5059a05` need the clinical
   changes that are deliberately not committed yet.

   `T10` («دربارهٔ تستِ اندازه‌گیری‌نشده ادعای «طبیعی» نمی‌کند») is the N4 contract and the one
   failure present in *every* column. Any *other* failure is yours. Don't `SKIP_HOOKS=1` past it —
   fix T10 or leave it alone.

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
  | `api-contract.test.js` | end-to-end `/api/analyze` response shape and safety nets (**T10 is the known failure**) |
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
│   ├── api-contract.test.js     # /api/analyze contract — T10 currently failing
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
└── CLAUDE.md                    # this file
```

**Loose files at the repo root** — `AGENTS.md`, `ARCHITECTURE.md`, `MEDICAL_RULES.md`,
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

**Re-measure the baseline; don't quote one.** As of 2026-08-04 the committed tree (`5059a05`)
is `tests 186 · pass 174 · fail 12` and the working tree is `tests 187 · pass 186 · fail 1`
(`api-contract.test.js` T10). Those are different trees, not a discrepancy — see the table in
[Your Role](#your-role) and [N15](#n15--a-green-suite-proves-nothing-when-the-damage-is-invisible-to-the-tests).
To measure the committed number without your own edits in the way, use a clean checkout
(`git archive HEAD khanesh-server | tar -x -C <tmp>`), not the working tree.

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

⚠️ **The backend half of this gate is currently red** (`api-contract.test.js` T10), so *any*
commit touching `khanesh-server/**.{js,mjs,json}` is blocked until T10 is fixed. That is the gate
working, not a broken hook. Fixing T10 is the way through; `SKIP_HOOKS=1` on a clinical contract
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
  corrupt state with `62 خانه از 149 خالی است`. It also catches a **pre-existing** defect the
  same class had hidden: two stray *import objects*
  (`{preanalyticalCaveats, attachPreanalytical}`, `{repeatDeltaFa}`) sitting inside the
  `RULES_ANEMIA` array literal in `patterns_anemia.js`.

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
- **Guard:** a mojibake check belongs in the suite — assert no source file under `rules/` contains
  the cp1252 signature (`Ø`, `Ù`, `Ú©`, `â€Œ`). Until it exists, the one-liner is
  `grep -rlE 'Ø|Ù|Ú©' khanesh-server/rules/*.js` and it must return nothing.

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
