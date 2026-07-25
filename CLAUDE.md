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
│   │   ├── App.jsx             # routes: "/" -> Landing, "/app" -> Tafsir
│   │   ├── Landing.jsx         # marketing page
│   │   ├── Tafsir.jsx          # the actual tool (manual entry + photo upload)
│   │   ├── main.jsx
│   │   └── index.css / App.css
│   ├── public/
│   ├── vite.config.js          # dev-only proxy: /api -> http://localhost:8787
│   └── package.json
├── khanesh-server/              # Express backend
│   ├── server.js                # POST /api/analyze, GET /health
│   ├── rules/
│   │   ├── adapter.js           # OCR text -> engine keys (NAME_MAP, unit conversion)
│   │   ├── refs.js              # adult reference ranges (Henry's Clinical Diagnosis)
│   │   ├── refs_ped.js          # pediatric ranges <16y (RCPCH 2016)
│   │   ├── grade.js             # picks severity/classifier/binary mode per test
│   │   ├── ctcae.js             # CTCAE v5 severity grading
│   │   ├── interpret.js         # categorical classifiers (e.g. MCV micro/normo/macro)
│   │   ├── patterns.js          # multi-test clinical pattern rules (RULES array)
│   │   ├── names.js             # engine key -> Persian display name (FA_NAMES, faName())
│   │   ├── prompt.js            # engine-driven system prompt + payload builder
│   │   ├── medline.js           # MedlinePlus term extraction + lookup
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

## Rules

Detailed instructions are split across `.claude/rules/`:

- [architecture.md](.claude/rules/architecture.md) — core architecture decision (engine vs. LLM), the 9-step `/api/analyze` request flow, the legacy non-engine path
- [rules-engine.md](.claude/rules/rules-engine.md) — the three grading modes (severity/classifier/binary), reference-range sources, checklist for adding a new lab test
- [frontend.md](.claude/rules/frontend.md) — `Tafsir.jsx` structure (manual entry vs. photo upload), which API response fields the UI depends on
- [environment.md](.claude/rules/environment.md) — backend `.env` variables, tuning warnings, `GET /health`
- [notes.md](.claude/rules/notes.md) — cross-cutting notes: Persian-only strings, dev vs. prod proxying, patient-privacy rules, the backend regression suite
