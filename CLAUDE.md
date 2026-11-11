# Khanesh — LabMate

<sub>Condensed from the 2623-line version (full text: `git show 87ba305:CLAUDE.md`). Structure, commands and
the Lab Notebook were last verified against the tree in 2026-10/11. Counts and baselines below are
**not** quotable — re-measure.</sub>

## Project Overview

Patient-facing web app that interprets medical lab reports in Persian/Farsi. A React frontend collects lab
values (typed or photographed); an Express backend runs them through a deterministic clinical rules engine,
then an LLM (AvalAI, OpenAI-compatible gateway) rewrites the engine's findings into plain Persian.

## Your Role

1. **Locate** — `khanesh/` (frontend) or `khanesh-server/` (backend). No shared `package.json`; `cd` into the right one.
2. **Respect the engine boundary** — clinical judgment (abnormal, severity, patterns) lives in `khanesh-server/rules/`,
   never in a prompt. See [architecture.md](.claude/rules/architecture.md).
3. **Edit** — new lab test: touch the five rules files together ([rules-engine.md](.claude/rules/rules-engine.md)).
   UI/API change: keep `ResultView.jsx`'s expectations in sync with `server.js` ([frontend.md](.claude/rules/frontend.md)).
4. **Verify** — `npm test` in `khanesh-server/`, `npm run lint` in `khanesh/` (no frontend tests; trace UI by reading).
   The pre-commit hook runs both on the **index**.

**Baselines are measured, never quoted.** Every number in this file's history (186/185/1, "12 red", 213/213) was true of
one tree on one day. Say which tree you measured (working tree ≠ committed `HEAD` ≠ hook output). To measure a commit:
`git archive HEAD khanesh-server | tar -x -C <tmp>`, **link `node_modules` in** (junction on Windows), `node --test`.
Without the link `api-contract.test.js` dies on `ERR_MODULE_NOT_FOUND` and T1–T10 fail falsely. A whole test file going
red at once has several possible causes (missing deps, a hang, a `before` hook TypeError) — read the *first* error.
`khanesh-server/database.sqlite` is gitignored; `npm test` creates it.

**IMPORTANT**
- The analysis LLM never decides what's abnormal. Prompts only format text.
- All backend user-facing strings and prompts are Persian.
- No raw engine key (`HGB`, `LDH`) reaches the patient — go through `faName()` in `rules/names.js`.
- Eight subagents live in `.claude/agents/` ([Agents](#agents)). Read the [Lab Notebook](#lab-notebook) before any clinical change.

## Tech Stack

- **Frontend:** React 19, Vite 8, react-router-dom 7, plain CSS (`index.css`/`site.css`/`ui.css`). Content routes are `lazy()`; `/` is not.
- **Backend:** Node + Express 4, proxies to AvalAI; `express-rate-limit` on analyze endpoints.
- **Rules engine:** plain deterministic JS in `khanesh-server/rules/` — no ML, no external calls.
- **Agent graph:** `@langchain/langgraph`, 12 nodes, **default off**.
- **Lint:** oxlint, frontend only (warnings don't fail the gate).
- **External data:** NLM MedlinePlus (cached 20h). **MCP:** Playwright. **Submodule:** `.impeccable`.
- **Tests:** backend only. `npm test` = bare `node --test`, so it runs **every** `*.test.js`:
  `rules/engine.test.js` (one test per real fixed bug, Persian comments), `geriatric.test.js`, `api-contract.test.js`,
  `avalaiClient.test.js` (injected fetch), `metamorphic.test.js` (worse value ⇒ urgency never lower; added test ⇒ urgency
  never lower; format/alias/order invariance; exceptions only in `ALLOWED_DROPS` with a clinical reason), plus
  `specimen/serology/score/expert/lis1005/review*.test.js`. **Never name a manual probe script `test-*.js` or `*.test.js`.**
- No npm workspace — two independent `package.json`s.

## File Structure (map, not inventory)

```
khanesh-project/
├── khanesh/src/            App.jsx (routes) · Landing.jsx · Tafsir.jsx (the tool) · labRefs.js (client REF/CATS/statusOf)
│                           LocalPreview.jsx · analyzeJob.js (async job client) · imageIntake.js · pdfIntake.js (lazy)
│                           ResultView.jsx · ResultErrorBoundary.jsx · EntryGrid/UploadCard · onboarding/ · content/ (encyclopaedia)
├── khanesh-server/         server.js (pipeline + safety nets) · avalaiClient.js · jobStore.js · auth.js/database.js (off by default)
│                           labmat-agents/ (graph) · historyRoutes.js · plans.js · zarinpal.js
│   └── rules/              adapter.js (NAME_MAP, units, channels) · refs.js/refs_ped.js · grade.js · ctcae.js · interpret.js
│                           units.js · preanalytical.js · biovar.js · guidelines.js · names.js (FA_NAMES) · prompt.js · coverage.js
│                           patterns.js (aggregator) + ~21 patterns_<system>.js · patterns_utils.js · minor.js · neonatal.js
│                           expert.js · pro_text.js · inpatient.js · score.js · serology.js · specimen.js · prenatal.js
├── .claude/                agents/ · rules/ · skills/ · eval-gate/ · settings.local.json
├── .githooks/pre-commit    test/lint gate (core.hooksPath)
├── MEDICAL_RULES.md        ⭐ clinical decision register (P-numbers) — pending human review
├── skills-lock.json · .agents/skills/ · .impeccable/ (submodule) · deploy/ (nginx.conf)
└── CLAUDE.md
```

- **`MEDICAL_RULES.md`**: every threshold/range/rule change that needs a human reviewer is recorded there (proposal,
  reasoning, patient impact). Read it before changing a number in `refs.js` or a pattern threshold. Nothing there
  reaches code until a reviewer approves. A `MEDICAL_RULES` entry lands in the **same commit** as its behaviour (N37).
- **"In `.gitignore`" proves nothing about what's tracked** — `git ls-files` answers that.
- **`labmat-prototype/` is deleted, but the live `AVALAI_API_KEY` is still in git history** (`763c73d`) and is the same
  key production uses. It must be rotated at AvalAI; deleting files never did it.

### Routes (`App.jsx`)
`/`, `/landing` → Landing · `/app` → AppEntry (first unfinished step) · `/app/intake/:step` → Intake · `/app/start` → StartChoice ·
`/app/:mode` (`photo`|`manual`) → Tafsir (one route so data survives a mode switch) · `/tafsir` → `/app` ·
`/tests`, `/tests/:cat`, `/test/:key` → encyclopaedia · `*` → `/`. `/app`, `/tafsir`, `/profile` sit behind `AuthGuard`.
**nginx `try_files` is a whitelist** (`deploy/nginx.conf`) — a new SPA route 404s on refresh until added there (N43).

### Where a pattern lives
`patterns.js` only aggregates `RULES_*` from the `patterns_<system>.js` files and owns `runPatterns()`, `SUGGEST_TESTS`,
suppression/dedup. Rule count is not quotable — `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.length))"`.
- **New rule** → the right `patterns_<system>.js`, and confirm its `RULES_*` is spread into `RULES`. A rule in an un-imported
  file fails silently into `unmatched_abnormal` (N1).
- **Shape to prefer:** when rules partition one input space, use one classifier returning one label (`mineralAxis`, `castAxis`,
  `smearAxis`) and let each rule ask "is that my label?". Two rules then *cannot* contradict.
- **Migrations:** `patterns_anemia.js` was a dead file nobody imported; it was *deleted*, not finished. A migration nobody
  can finish is deleted. If you add a `_new` file, decide up front what deletes the old one.
- **Deleted rules have no artefact.** Rewrites must diff the rule-id set (N16).

## Commands

```bash
# khanesh/                          # khanesh-server/
npm run dev | build | lint | preview  npm install; node server.js | npm start; npm run dev (nodemon)
                                      npm test        # node --test, all *.test.js
                                      npm run test:coverage   # lines 85 / branches 70 / functions 85
```
One file: `node --test rules/engine.test.js`. Needs `khanesh-server/.env` with `AVALAI_API_KEY`
([environment.md](.claude/rules/environment.md)). The hook's output is **not** a baseline for `HEAD`.

## The LabMat Agent Graph (`USE_GRAPH`)

12-node `StateGraph` in `labmat-agents/`. **Off by default, as a clinical decision**: patient text comes from two LLM agents
whose output skips every `server.js` safety net (emergency `must_say` coverage, `key_number`, `forbid`). N13 came from here.
`GET /health` reports `graph: on|off`. It is fed `safeEngineOut` (`note`/`patient` deleted) but still gets `rawData` — the N13
shape. Making it default requires routing its output through the step-8 nets; a flag flip is not that.

## Async Analyze Endpoints

`POST /api/analyze` (sync, the one the nets are written around; tests/local only, not registered in production because it has no payment or plan gate) · `POST /api/analyze/start` · `GET /api/analyze/job/:id`
(owner-scoped, N24) · `POST /api/labmat/analyze` (graph, 503 when off) · `GET /health`. Async exists because a 3-page sheet
takes 90–150 s. `jobStore.js` is in-memory with TTL: restart drops jobs; behind a load balancer a poll can miss the instance.
Client: `analyzeJob.js` keeps the job id in `localStorage`.

## Git Hooks

`core.hooksPath=.githooks`. Pre-commit, only for the sub-project with staged files: backend `.js/.mjs/.json` → `npm test`;
frontend `.js/.jsx/.mjs/.json` → `npm run lint`. It gates the **index** (`git write-tree` + `git archive` into a temp dir,
`node_modules` linked via `mklink /J`, `.env` deliberately not). If the index tree can't be built, the commit is blocked.
`SKIP_HOOKS=1` bypasses — **never** use it to get past a clinical contract test. Fresh clone: `git config core.hooksPath .githooks`.

## Agents

`research` (facts, read-only) · `code-reviewer` (diff review, read-only) · `qa` (runs tests, writes regression tests) · and the
gate stages `eval-planner`, `eval-builder`, `eval-medical-reviewer`, `eval-trajectory-reviewer`, `eval-judge` (driven by the
`eval-gate` skill; three stages are deterministic code in `.claude/eval-gate/lib/`). Typical: `research` → edit → `qa` → `code-reviewer`.

## Skills

- `professional-interpretation` — depth comes from richer `must_say`/`warnings`/`suggest`, never a model upgrade.
- `impeccable` — frontend design; installed **three times** (`.claude/`, `.agents/`, `.github/`), each with its own `scripts/`.
  Drift check: `node .claude/skills/impeccable/scripts/doctor.mjs`.
- `eval-gate` — 8-stage merge gate; `node .claude/eval-gate/selftest.mjs` checks the gate.
- `clinical-knowledge-extraction` (Persian) — raw medical text → rule specs; writes no code. First step:
  `node .claude/skills/clinical-knowledge-extraction/scripts/engine-inventory.mjs` (search Latin analyte names, not Persian disease names).
- `add-medical-rule` (`.agents/skills/`) — predates the `patterns_*.js` split; the repo's rules files win on conflict.
- Vendored skills are version-pinned in `skills-lock.json`; re-vendor, don't hand-edit. Same skill in two dirs = two copies.

---

## Lab Notebook

Real mistakes made in this repo. **Keeping it current:** when a change of yours (or a review of it) corrects something you
got wrong, append an entry in the same session before reporting done: title, commit, what was tried, what it did to the
patient-facing output, the generalizing rule. Log wrong *output*, not wrong turns. A repeat goes under the existing entry.
(Full entries with measurements: `git show 87ba305:CLAUDE.md`.)

**N1 — Wiring a test is not adding a test.** `NAME_MAP` + `refs.js` without a `patterns_*.js` rule ⇒ `unmatched_abnormal`
(«توضیح آماده‌ای نداریم» next to a clearly abnormal number). Verify `unmatched_abnormal` is absent on the panel.

**N2 — Unmapped ≠ normal.** Unmapped rows never reach `abnormal`; a sheet with only an unmapped abnormality got the canned
normal result. Get spellings from real sheets (`research`); no fuzzy matching (`resolveAlias` is prefix/plural/trailing-e only,
plus split `a+b` when both halves map to one key). A qualitative name must pass `NAME_MAP` *and* `QUALITATIVE`. Widening a matcher
can create a false positive (anti-HBs vs HBsAg). Recurs on every new analyte family (hemostasis, neutrophils, LIS exports,
random glucose, OGTT): check both `dir`s, and ask which population prints the name most.

**N3 — Grading against the wrong unit.** WBC 7000 vs 4.4–11 ⇒ false leukocytosis; troponin ng/L vs µg/L ⇒ false ER referral.
Normalize in `adapter.js` with thresholds far above any real value; never reintroduce urea→BUN. A key with a bespoke adapter branch
is invisible to `units.js`. **Convert only when the sheet prints the unit; with no unit and no decisive range, don't grade**
(`decideUnit` → `unit_unknown_values`, never an emergency, urgency = minimum across readings, a *floor* not a ceiling). Decimal
comma (`commaToDot`), digits inside units, age «48 h», printed ranges travel with the printed unit, fallbacks from paediatric to
adult rows must be explicit. Before a range-decided unit, list every unit labs print. Derive units from sheet identities (MCHC=Hb/Hct) before magnitude guesses.

**N4 — Telling the patient about a test they didn't have.** `!low` is not "normal": three-way (high/normal/absent), four with
direction. "Absent" means absent from `graded` *and* `ungraded` (`ungradedFa`, `missingFa`). Device placeholders are missing, not qualitative.

**N5 — Printing a derived number as if on the sheet.** Corrected Ca/Na, eGFR (invalid in rhabdo). Say measured vs corrected; quote what's printed.

**N6 — Never convert qualitative to numeric; a qualitative value is a closed set.** Negations contain the positive word
(`undetected`, `+/-`). Use `qualVerdict()`/`qualState`, match the whole value.

**N7 — Fix "the model dropped it" in the engine.** Sentence caps and substring nets backfired. Caps are gone; `action`/`warnings`/`suggest`
never reach the model; `general_recommendations` is always `buildEngineRecommendations()` with one `pickFinalAction()`. Nets compare meaning (`coverage.js`).

**N8 — Engine vocabulary reaching the patient.** Raw keys, «درخواست آزمایش X» around non-tests, already-measured tests re-requested,
new surfaces (`unitConversions`, `noRef`). Everything through `faName()`; suggest strings in `SUGGEST_TESTS` (exact match, absent row fails open);
`suggest` holds names of things to order, never sentences; `M32` checks `FA_NAMES` coverage. Quoted English values get a gloss (`applyQualGloss`).

**N9 — Never fix clinical wrongness with a prompt or a bigger model.**

**N10 — A regression test must fail on the old code.** Run it against the pre-fix tree. Never `SKIP_HOOKS=1` past a red clinical test.

**N11 — Frontend assumptions.** StrictMode double mount; hook exec bit (`git update-index --chmod=+x`); `REF` in `labRefs.js` is a separate copy
(record divergence in `REF_DIFF.md`); `overflow-x: hidden` kills `position: sticky` (use `clip`); assert post-scroll geometry, not a top screenshot.

**N12 — Severity and direction are two axes.** `crit` doesn't say which end. Derive direction from `graded.dir`, never from a severity cutoff
or `?.abnormal`; an index that two opposite states can produce (anion gap) needs its direction-supplying measurement as a gate; a sentence quoting an index must agree with it; a converted value must not be compared to a printed range.

**N13 — Never give OCR raw data to diagnostic LLMs** (models ignore "ignore these ranges"). Why `USE_GRAPH` is off.

**N14 — A blanket `*.png` gitignore ate the landing images.** Anchor ignores (`/*.png`); verify against the index tree; delete unreferenced assets from the reference side;
don't call two files the same asset without reading dimensions; a licence file covering a folder rots when files are added.

**N15 — A green suite proves nothing when the damage is invisible to it.** Bulk `sed` made 62 array holes (silently skipped by `if (!rule?.id) continue`) and mojibake
hid 37 red tests. Guards: `M36` (RULES integrity), `M37` (mojibake scan; `?` runs = unrecoverable), `M38` (language). Skip-guards must count what they skip.
**Never move Persian through PowerShell 5.1 `Get-Content`/`Add-Content`/`Set-Content`** — use Write/Edit, Bash `cat >>`, or `fs.appendFileSync`. Prove a mechanical repair content-neutral.

**N16 — Deletion has no artefact.** Diff the rule-id set before/after a rewrite; verify the replacement is in `RULES`; write the negative control (filter the id out, watch the test go red).

**N17 — A rule reading a key that doesn't exist asserts instead of going quiet.** `val(e)` is graded tests only; derived values are in `e.indices`, qualitative in `e.qual`.
Never write `x != null ? x : 'طبیعی'`.

**N18 — A net that fires only when nothing else did is no net.** `=== 0` guards on partial coverage: `unmatched_abnormal`, recommendation lists (`missingSuggestions`),
`always_show`+`brief` for rules that can sit under a `blocks_others` emergency, coverage is a property of the text the patient *sees* (not of matched or hidden findings),
a rule that merely *reads* a key removes it from the net, "all normal" must mention unmapped/noRef rows, routing gates must keep urine-only/ungraded sheets on the engine path,
hidden findings with an unexplained number are rescued as «یافتهٔ تکمیلی». `always_show` doesn't guarantee the brief carries the number. Check both `dir`s per key.

**N19 — Covering the borderline but not the frank case.** A band `match` claims someone owns the region below; verify. Missing partner analyte must not become "not urgent" (Hct without Hb).

**N20 — `urgency` and its action sentence are two copies of one decision; and rival findings contradict.** Derive the sentence from the computed urgency (`actionFor`);
before adding a rule that qualifies another, ask what turns the other off; hand-offs are gated on the owner's own severity predicate and call the owner (never restate its threshold);
`blocks_others` is the wrong instrument for one-analyte conflicts. Closing a hand-off orphans what the retired rule covered (keys, warnings). New emergency rules: test the *ordinary* input
(false emergencies hit the common case). `M70`, `M91e`, `M162`, `M307` sweep for contradiction/silence. An `action` you write is also a candidate for the report's last word — test beside every other emergency.

**N21 — Listing causes without saying which the sheet already argues against.** Every cause the panel can speak to gets supported / argued against / not measured.

**N22 — A reference range is not a target.** LDL 114 with FBS 209 needs a second `match` arm (ADA < 100), cited separately in `guidelines.js`; don't change `refs.js`.

**N23 — Changing a range silently moves every rule reading `dir === "low"`.** Pin old clinical cut-offs in constants (`ALB_LOW_MARKER_GDL`, `ferritinIdCut`) when adopting a range; run the boundary panel;
under-16 needs the question asked again for every literal cut-off; a rule absorbing another's content inherits its warnings; re-baseline freezes only after proving the diff is the intended one.

**N24 — Auth is a property of a route pair.** Poll route was open while start was authed; graph route unauthenticated. Tighten → grep every caller (`analyzeJob.js` sent no header).
A fallback that never ran isn't a fallback — make a test take it.

**N25 — A row name is not an identity; `(page kind, name)` is.** pH/WBC/RBC on semen vs urine vs CBC; cast rows vs loose cells vs dipstick pads; HbS/HbC/HbE vs anti-HBs/c/e (a regex was the only thing keeping HbS from becoming Hb 40);
reusing a `reason` string collides with another reader; combined LIS sheets (`cellTwinRoutes`, `detectDipstickPages`); "last write wins" is a silent decision (`valueConflictLines`);
prenatal markers vs tumour markers (`rules/prenatal.js`). Every side channel needs a reader; page-kind detectors have two error directions — test both.

**N26 — A safety floor is a floor on the timeline, not a promotion to emergency.** Newborn floor is `soon`; emergency only from the number's own severity.

**N27 — A client gate reading its switch through an un-proxied path is always open.** Read `/api/health`, not `/health`; failure must not pick "off".

**N28 — A recognised channel with no reader is a silent drop, and tests that froze the gap read as guards.** For every recognised key name its reader; probe lone/unitless/child/other-unit;
unit-decisive unitless numbers aren't graded by guess; new row kinds in an existing channel → re-read every consumer (nets assumed `qual` = urine).

**N29 — A rule closing a coverage gap keeps the gap's urgency (`netUrgency`) and hands off by naming owner ids** (`P73_OWNERS`), not by `RULE_READS`. A "high" rule needs the partner's direction in `match`.

**N30 — One substring-reads-a-negative bug lived in eight readers.** `qualVerdict()` is the only qualitative reader; censored values («<6») go to «تفسیر نشدند»; hand-offs gated on the owner's severity predicate.

**N31 — A guard that is a subset of its neighbour condition does nothing; only metamorphic sweeps see it.** Keep `metamorphic.test.js` green; no `ALLOWED_DROPS` entry without a clinical reason.
Decide unitless differentials once per sheet from its arithmetic (`unitlessDiffIsPercent`), not per row.

**N32 — A display score must use range geometry, per-system attribution, and be checked on the narrowest ranges (pH, osmolality, Cl).** Missing attribution raises the score; probe where the engine reads context (`patient`, not top-level).

**N33 — A sweep over a new surface found yesterday's leak.** Rewrites that can delete text need counting guards (`H10`); sweep new surfaces over combined panels; Persian-escape fixtures via `String.fromCharCode`.

**N34 — Audit claims must be re-measured.** Hard-coded child thresholds, `mergePages` compared raw strings, `key_number` used `includes`, `suggest` held a sentence. Before calling two tables different, call both with the argument form each takes. `CRP`/`TROPONIN_T` `PED_REFS` rows are intentionally inert — remove only with `score.js`/`score.test.js`.

**N35 — Closing a gap can over-instruct; a score signature must not include the score.** Routine findings with nothing to do get one line (`minor` channel); don't cap lists.

**N36 — A field added to engine state for one rule is read by shared display code.** When a byte-lock goes red on an input you never mentioned, bisect; don't re-baseline.

**N37 — Allocate the `P` number from `MEDICAL_RULES.md` before using it in code**; the entry lands with the behaviour; on collision document under a free number and cross-reference.

**N39 — A healthy 9-year-old came out with four abnormalities.** Printed units are never "unknown" for long (`EXTRA_PRINTED_UNITS`/`PRINTED_ONLY_CONVERSIONS`); compare printed vs engine range only in one unit;
age-dependent index gates read `getRef`, not an adult literal; every abnormal row needs an owner; a guideline-based owner rule is cited from a source read *this session*; a reviewer-listed threshold is a named user decision, not a patch;
screening advice needs evidence beyond one cutoff; advice text inherits age gates (`pastChildbearing`).

**N40 — "The feature didn't work" because the running server predated the code.** `curl` the route (`404` = stale process) before debugging. History is recorded at the response layer from the projection, not from `jobs`.

**N41 — Visual history-card defects.** Display percentages in baseline-relative terms (not log); RTL `flex-start` means right (fix coordinates with `direction: ltr`); number+unit is one bidi atom (`dir=ltr`, nowrap, isolate); state status once.

**N42 — Five sessions share one dirty tree; the toolbar I extended wasn't in `HEAD`.** `git show HEAD:<file> | grep -c <marker>` before promising a commit; never commit a partial that breaks navigation; `print()` doesn't fire in a hidden tab.

**N43 — A new SPA route 404s on refresh until nginx knows it.** Add it to `deploy/nginx.conf` *and* the live site; edit the symlink target, not the symlink.

**N44 — A fixed overlay inside the hero lost blur and z-index.** Portal it to `document.body`; when an effect doesn't show, read `getComputedStyle` (`none` = not applied).

**N45 — The CSS minifier kept only the `-webkit-` half of a prefixed pair.** Write the prefixed property first, the standard one last; grep `dist/assets/*.css` for the property.

**N46 — A labelled multi-band printed range was reduced to its first band; a no-verdict row rendered as «در محدوده»; a "normal" tumour marker lowered the score.** (specs/019, commit: this change.) `cleanPrintedRef` split on `/ ; | ،` and returned the first parseable part, so CEA 7 against «Non smoker: < 5 / Smokers: < 10» came out *above* (the smoker band silently dropped); with spaces the range was unread; «Smokers: < 10» alone read CEA 7 as *within*. «<» was read as «≤»; «At or below: 31.0» unread. Adding marker rows to `_engine.tests` would have shown any `abnormal:null` row as green «در محدوده» (`!t.abnormal`), written it to history as in-range (`!!null`), and let the client re-derive a verdict from the range text; and a *normal* CEA already cut a clean sheet 98 → 90 («مطلوب» → «نیاز به توجه») via an unattributed finding cap + the «unread» flag. Rules: detect labelled bands on the *whole* string before any split, and report unreadable rather than first-part; strictness is part of the printed text; **a row with no verdict needs its own state in every reader** (resultStates, normTest, Scorecard sentence «همه داخل محدوده بودند», history, expert view) — grep `!x.abnormal` before adding any row kind with `abnormal:null`; a finding that owns no graded key must not cap the whole sheet when it is outside the score by decision. Unverified pre-existing clinical sentences are *kept and flagged*, not silently deleted (MEDICAL_RULES_TUMOR_MARKERS.md §4); a summarizer's «verbatim» quotes are not verbatim until checked against raw text (ASCO 2015 quotes were absent from the raw PMC text).

**N47 — A paywall on the route locked the result already paid for; the money path had no test.** (Commit: this change.) `PlanRequired` wrapped `/app/:mode`, so spending the last credit sent a refresh or a locked phone to the plan form and the stored result (possibly an emergency) was unreachable. `/api/payment/verify` returned the patient's interpretation and card PAN to anyone holding the Authority; a job-bound payment granted all the plan's credits on top of the unlocked result; `planOf` ignored `PAYMENT_EXEMPT_PHONES`, so the exempt number lost history the moment `REQUIRE_PAYMENT=true`; `-15` was documented as domain mismatch (it is `-14`; `-15` = suspended). `getJobById(id)` with its second argument missing matched no rows, so the "already verified" branch silently returned no result — an audit reading the route called that a leak, and only the test showed it was dead code. Rules: a gate on spending never blocks reading what was bought; an Authority is in a URL and is not an identity; a turned-on switch needs re-reading every reader of it; drive money flows end to end in a test (`paymentFlow.test.js`, fake gateway via `--import`) before trusting either the route or a review of it.

**N48 — Two `BEGIN`s on one shared SQLite connection; a new row kind inherits every reader.** (Commit: this change.) `DELETE /api/auth/me` right after an analysis returned 500 at random, because `insertLabEvent` was mid-transaction: «cannot start a transaction within a transaction». It only showed once a test deleted an account immediately after a job, and passed when run alone; `beginTx` now serialises transactions (`database.tx.test.js`). A test that goes red only under load is a finding, not noise — run it alone before blaming the harness. Family members (P131) touch the same lesson as N25: "the same user" was the identity behind history owner, `getLatestCompletedJob` and the cascade delete, and all three had to learn the member, or a child's values get compared with an adult's. History was recorded when the analysis finished, before any payment decision: an Empire user with no credits read an unpaid sheet's values from `/history`. The verify route also recorded under `user:<id>` while every reader uses `u:<id>`, so that row could never be read or deleted. Both are one rule: record at delivery (`shim` delivery branch, `settlePayment`), with the owner captured from the request.
Follow-up (`7069493` and the next commit): `paid` and the credit were two writes, so a crash between them left a paid row with no credit, and nothing retried it: Zarinpal had already verified it, so `unVerified` no longer listed it. Now both happen in one transaction (`settlePaymentRecord`). The row is marked `verifying` before calling the gateway, and reconcile re-verifies stuck rows (code 101). `markPaymentFailed` had no status guard, so a concurrent rejection could turn `paid` into `failed`, and the next verify credited twice. Rule: `firstTime` is the double-credit lock, so every write that can move a row out of `paid` guards on status. Also, an Empire user with 0 credits saw «پلن فعالی ندارید» while history was open. "No credit" is not "no plan".

**N49 — The Free-PSA ratio was read inverted: an antibody reader on a ratio.** (specs/020, P132; commit: this change.) The seven P77 tumour-marker keys (AFP, B2M, calcitonin, CgA, PSA total/free/ratio) went through `abVerdict`, which reads «> N» as an antibody's positive cut-off. Two consequences:
- **Ratio.** «درصد Free PSA» 18 % against «> 25», the side that argues for a biopsy, was told «داخلِ محدودهٔ چاپ‌شده». The same paragraph quoted a ~20 % biopsy-cancer probability. A ratio of 30 % was told «بالاتر از مرزِ».
- **Score.** A normal PSA cut a healthy sheet from 98 «high» to 90 «mid». This is the N46 CEA defect, still live for PSA, because `score.js` exempted only `tumor_markers_result`.

Rules:
- «> N» on a ratio or percentage is the lower normal limit, not a positive cut-off. Never run a concentration or a ratio through a reader written for antibodies.
- A fix scoped to a key set (`TM_KEYS`) must grep every key that takes the same route (`assay_printed`). The 019 fix covered four of eleven.
- An exemption listed by finding id must list every finding that owns those keys.

**N50 — With the sex unknown, a sex-banded range took the male band; my first fix turned a clearly high value into "unreadable".** (specs/020, P132-6a; commit: this change.)
- **The bug.** For calcitonin 6 against «Male: < 8.4 Female: < 5» with no sex on the sheet, `parseReference` took the male band and said «داخل», an under-read for a woman. «Female: < 5» on its own was applied to anyone.
- **My first fix.** "Sex label + unknown sex ⇒ unreadable" made calcitonin 9, which is above *both* bands, «خوانده نشد» with `routine` urgency. That is a worse under-read, and it was found only by running real panels after the tests were green.
- **Rule.** When the input that picks a band is missing, evaluate every band and give a verdict only if they all agree (`kind: "sexed"`, the same shape as the smoker `between` case). "Don't guess" must never mean "don't say a value that is high whichever band applies".

**N51 — An ACR printed in mg/mmol was classified on the converted mg/g value; 3.0–3.39 mg/mmol read as normal.** (specs/021, P133; commit: this change.)
- **The bug.** An ACR printed as «3.2 mg/mmol (< 3.0)» was converted to mg/g (×8.84 = 28.3) and then classified on the mg/g edges (30/300). 3.0–3.39 mg/mmol came out A1 «طبیعی» with no finding at all, against KDIGO (A2 ≥ 3 mg/mmol) and against the lab's own printed range; 30.1–33.9 mg/mmol came out A2 instead of A3. `key_number` quoted 30.9 mg/g, a number not on the sheet, and no «واحدها» row explained it.
- **Why it hid.** M17 locked «8 mg/mmol → A2» — a value far from either edge. Every test sat in the middle of a band; no test probed the band edges in the *printed* unit.
- **Rule.** A category with published edges in two units is decided in the unit the sheet printed, with that unit's edges, not by converting and reusing the other unit's edges — rounding in the guideline's equivalence (3 mg/mmol ≈ 30 mg/g) lands exactly on the boundary. Probe classifier edges in every printed unit (edge − ε, edge, edge + ε). The same probe found a second class: a high urea next to a high creatinine fell into «توضیح نداریم» under four different owners, and under a blocker only keys named *in the rule's own source* (`RULE_READS`) are rescued — a helper's internal key names don't count.

**N52 — «HCV Ag Reactive» was read as an antibody and told «may be a past infection»; a card that owned albumin never named it.** (specs/022, P134; commit: this change.)
- **The bugs.**
  - `hcv_screen_reactive` matched any name containing `hcv`, so the core antigen, which shows the virus is present now, got the antibody text.
  - `cirrhosis_pattern` quoted no number at all. `albumin_low_alone` handed albumin to it through `P73_OWNERS`, so albumin 2.7 sat in «توضیح نداریم» directly under the cirrhosis card.
  - The probe found three more surfaces with no numbers: ammonia (an emergency), ALP, and INR without an aPTT.
- **Rules.**
  - A name regex is an identity claim: antigen, antibody and RNA/DNA of one virus are three readers, not one (N25).
  - An owner listed in a hand-off table must quote the key in the text the patient sees, or the hand-off is an orphan (N18/N20).
  - Re-routing a misread row can lower urgency (here `this_week` → «تفسیر نشد»). Say so in the decision record; don't let the probe hide it.

**N53 — A 3-year-old was graded in the 1–3-year row, and the text quoted an adult man's Hct range.** (P135; commit: this change.)
- **The bugs.**
  - `getPedRef` used `age <= maxAge`. Intake sends whole years, so a child exactly N years old fell into the younger row at 37 integer boundaries: ALP 495 against 76–308 instead of 80–800, and Hct 34.9 against 36–44 instead of CALIPER 31.3–41.7.
  - P110's "same verdict ⇒ show only the printed range" swapped the paediatric engine range for the sheet's adult range, so the card said 36–44 and the text said 41.5–50.4.
  - An unmapped row (1,25-(OH)₂ vitamin D, correctly not VIT_D) was in no count: 4 + 19 ≠ 24.
- **Why it hid.** Every paediatric test used a mid-band age or a fractional one. M360 locked a 4-year-old to the "3 to <4" row.
- **Rules.**
  - Age arrives as completed years, so an age band is half-open. Probe every boundary at N and N + 0.5 (PB2 does this for the whole table).
  - A display rule that picks "the" range must know which population the graded range came from.
  - Every row read off the sheet appears in some count or list on the screen that counts.

**N54 — The static SEO page put a direction-less sentence under «بالا بودن»; the REF test pages had none of the app's content.** (Commit: this change.) `gen-static-heads.mjs` rendered `EXTRA_TESTS[key].results[0]` as «بالا بودن X» and `results[1]` as «پایین بودن X», but `results[]` has no direction: on 236 live pages, D-dimer said «منفی بودن… خبرِ خوب است» under «بالا بودن D-dimer». The same file read `EXTRA_TESTS` only, so the 46 `REF` pages (B12, INR, PT…) never showed their `TEST_PAGES` content, and Google left them «Crawled – currently not indexed». Rules: a label that claims a direction needs a field that has one; the static HTML Google reads is a second renderer of the same content, so diff what it prints against `TestPage`/`ExtraTestPage`.

Detailed instructions are split across `.claude/rules/`: [architecture.md](.claude/rules/architecture.md) (engine vs LLM, 9-step request flow, legacy path),
[rules-engine.md](.claude/rules/rules-engine.md) (grading modes, adding a test, guideline layer), [frontend.md](.claude/rules/frontend.md) (routes, `_engine` shape),
[environment.md](.claude/rules/environment.md) (`.env`, auth, `TRUST_PROXY`), [notes.md](.claude/rules/notes.md) (privacy, Persian-only, proxying).

## Working Agreement, Token Economy, Orientation

Same as the global `~/.claude/CLAUDE.md` (plan-first for 3+ files, verify with real commands, finish before reporting, read with offset/limit, batch calls).
Project-specific: this file contains ZWNJ (U+200C) characters — orthographically required in Persian, never strip or "normalize" them; read the file with the file tool.
