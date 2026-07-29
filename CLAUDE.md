# Khanesh — LabMate

## Project Overview

Patient-facing web app that interprets medical lab reports in Persian/Farsi. A React frontend collects lab values (typed in or photographed) and an Express backend runs them through a deterministic clinical rules engine before an LLM (via AvalAI, an OpenAI-compatible gateway) rewrites the engine's findings into plain-language Persian.

## Your Role

When the user asks for a change in this repo:

1. **Locate** — figure out which sub-project (`khanesh/` frontend or `khanesh-server/` backend) owns the change; they have no shared `package.json`, so `cd` into the right one before running commands.
2. **Respect the engine boundary** — clinical judgment (abnormal/normal, severity, patterns) belongs in `khanesh-server/rules/`, never in a prompt. See [rules/architecture.md](.claude/rules/architecture.md).
3. **Edit** — for a new lab test, touch the rules files together (see [rules/rules-engine.md](.claude/rules/rules-engine.md)); for UI/API-contract changes, keep `Tafsir.jsx`'s expectations of the response shape in sync with `server.js` (see [rules/frontend.md](.claude/rules/frontend.md)).
4. **Verify** — run `npm test` in `khanesh-server/` (rules-engine regression suite) and `npm run lint` in `khanesh/`. The frontend has no tests, so trace UI logic by reading. The pre-commit hook runs both automatically — see [Git Hooks](#git-hooks).

Three subagents in `.claude/agents/` cover the recurring work — see [Agents](#agents) below.

Before you start a clinical change, read [Lab Notebook](#lab-notebook--things-not-to-try-again) — it is the log of mistakes previous Claude instances actually made here. Most of them look reasonable right up until they reach a patient.

**IMPORTANT**:
- Never let the analysis LLM decide what's abnormal — that is the rules engine's job. Prompts only format text.
- All backend user-facing strings and prompts are in Persian; keep new ones consistent with that.
- Never let a raw engine key (`HGB`, `LDH`, `BILI_T`) reach user-facing text — run it through `faName()` in `rules/names.js`. This was a real bug: the prompt handed raw keys to the LLM and patients saw «درخواست آزمایش HGB از پزشک».

---

## Tech Stack

- **Frontend**: React 19 + Vite, `react-router-dom`, embedded CSS, no CSS framework
- **Backend**: Node + Express (`lab-proxy` / "LabMate"), proxies to AvalAI (`https://api.avalai.ir/v1`, OpenAI-compatible)
- **Rules engine**: plain deterministic JS modules (`khanesh-server/rules/`) — no ML, no external calls
- **Linting**: oxlint (frontend only; config `.oxlintrc.json`)
- **External data**: NLM MedlinePlus web service (public health-topic summaries, fetched live, cached 20h)
- **Tests**: backend only — `node:test` regression suite at `khanesh-server/rules/engine.test.js` (`npm test`), one test per previously-fixed clinical bug. No frontend tests.
- **No npm workspace** — two fully independent `package.json`s
- **MCP**: `.mcp.json` registers the Playwright server (`@playwright/mcp`) for driving the frontend in a browser

---

## File Structure

```
khanesh-project/
├── khanesh/                    # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx             # routes: "/" -> Tafsir; "/app" and "*" redirect to "/"
│   │   ├── Tafsir.jsx          # the actual tool (manual entry + photo upload)
│   │   ├── ResultView.jsx      # result screen: six states, category groups, derived values
│   │   ├── resultStates.js     # the six result states (word + shape + colour)
│   │   ├── testCategories.js   # engine key -> body-system category (presentation only)
│   │   ├── digits.js           # Persian/Arabic digit normalisation
│   │   ├── Logo.jsx            # circular badge (rescued from the deleted Landing.jsx)
│   │   ├── main.jsx
│   │   └── index.css / App.css
│   ├── public/fonts/           # self-hosted Vazirmatn variable woff2 + OFL licence
│   ├── public/
│   ├── vite.config.js          # dev-only proxy: /api -> http://localhost:8787
│   └── package.json
├── khanesh-server/              # Express backend
│   ├── server.js                # POST /api/analyze, GET /health
│   ├── rules/
│   │   ├── adapter.js           # OCR text -> engine keys (NAME_MAP, unit conversion)
│   │   ├── guidelines.js        # citation registry (CLSI/IFCC/EFLM/WHO/KDIGO/ADA/ESC/ACG/…)
│   │   ├── units.js             # IFCC SI -> conventional units (HbA1c mmol/mol, mmol/L, µmol/L)
│   │   ├── preanalytical.js     # CLSI sample-quality caveats (hemolysis, fasting, EDTA, stasis)
│   │   ├── biovar.js            # EFLM biological variation -> reference change value
│   │   ├── refs.js              # adult reference ranges (Henry's Clinical Diagnosis)
│   │   ├── refs_ped.js          # pediatric ranges <16y (RCPCH 2016)
│   │   ├── grade.js             # picks severity/classifier/binary mode per test
│   │   ├── ctcae.js             # CTCAE v5 severity grading
│   │   ├── interpret.js         # categorical classifiers (e.g. MCV micro/normo/macro)
│   │   ├── patterns.js          # multi-test clinical pattern rules (RULES array)
│   │   ├── names.js             # engine key -> Persian display name (FA_NAMES, faName())
│   │   ├── prompt.js            # engine-driven system prompt + payload builder
│   │   ├── medline.js           # MedlinePlus term extraction + lookup
│   │   ├── coverage.js          # sentence-level check that the LLM kept every must_say
│   │   ├── engine.test.js       # node:test regression suite (npm test)
│   │   ├── CLINICAL_REVIEW.md   # clinical audit log — fixed + outstanding defects
│   │   └── REF_DIFF.md          # known REF (frontend) vs refs.js (backend) range drift
│   ├── .env                     # AVALAI_API_KEY, etc. (gitignored)
│   └── package.json
├── .claude/
│   ├── agents/                  # subagents, see below
│   ├── rules/                   # detailed rules, see below
│   └── skills/                  # project skills, see below
├── .githooks/pre-commit         # test/lint gate (core.hooksPath = .githooks)
├── .mcp.json                    # Playwright MCP server
├── .agents/skills/              # vendored third-party skills (see skills-lock.json)
└── CLAUDE.md                    # this file
```

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
npm test           # node --test — rules/engine.test.js regression suite
```

Requires a `.env` file with `AVALAI_API_KEY` (server boots without it but logs a warning, and all AI calls fail). See [rules/environment.md](.claude/rules/environment.md).

---

## Git Hooks

`core.hooksPath` is set to `.githooks/`. The `pre-commit` hook runs, **only for the sub-project with staged files**:

- `khanesh-server/**.{js,mjs,json}` staged → `npm test` in `khanesh-server/`
- `khanesh/**.{js,jsx,mjs,json}` staged → `npm run lint` in `khanesh/`

A failure blocks the commit. `SKIP_HOOKS=1 git commit ...` bypasses it — don't reach for that to get past a failing clinical regression test; fix the test.

If the hook never fires on a fresh clone, `git config core.hooksPath .githooks`.

---

## Agents

Three subagents in `.claude/agents/` handle the recurring work. Invoke them by name.

| Agent | Use it for | Can edit? |
|---|---|---|
| `research` | Facts before code: tracing a value through OCR → adapter → grade → patterns → prompt, finding where a test key is defined, sourcing a reference range or CTCAE grade, collecting real-world lab-sheet spellings for `NAME_MAP` | No |
| `code-reviewer` | Reviewing a diff for engine-boundary violations, wrong ranges/units/grading modes, missed `NAME_MAP` aliases, urgency errors, frontend/backend contract drift, privacy and Persian-string regressions | No |
| `qa` | Running `npm test`, `npm run lint`, `npm run build`, and direct engine spot-checks; writing regression tests in `rules/engine.test.js` for bugs just fixed | Yes |

Typical clinical change: `research` (what should the range be, where does it live) → edit → `qa` (test it, lock it in) → `code-reviewer` (before commit).

---

## Skills

- `professional-interpretation` (`.claude/skills/`) — when the user says an interpretation is too shallow/basic («ابتدایی») or asks for «تفسیر حرفه‌ای‌تر». Depth comes from richer `must_say`/`warnings`/`suggest` in `rules/patterns.js`, **never** from a model upgrade or a smarter prompt — that would break the engine boundary.
- `.agents/skills/` holds third-party skills vendored from GitHub (`find-skills`, `parallel-web-search`, `parallel-deep-research`), pinned by hash in `skills-lock.json`. Don't hand-edit them; they're regenerated from source.

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

---

## Rules

Detailed instructions are split across `.claude/rules/`:

- [architecture.md](.claude/rules/architecture.md) — core architecture decision (engine vs. LLM), the 9-step `/api/analyze` request flow, the legacy non-engine path
- [rules-engine.md](.claude/rules/rules-engine.md) — the three grading modes (severity/classifier/binary), reference-range sources, checklist for adding a new lab test
- [frontend.md](.claude/rules/frontend.md) — `Tafsir.jsx` structure (manual entry vs. photo upload), which API response fields the UI depends on
- [environment.md](.claude/rules/environment.md) — backend `.env` variables, tuning warnings, `GET /health`
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
