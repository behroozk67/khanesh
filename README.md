# Khanesh — LabMate («خوانش»)

Patient-facing web app that interprets medical lab reports in Persian/Farsi. A React frontend
collects lab values (typed in or photographed) and an Express backend runs them through a
deterministic clinical rules engine before an LLM (via AvalAI, an OpenAI-compatible gateway)
rewrites the engine's findings into plain-language Persian.

**The core architectural rule: the LLM never decides what's abnormal.** Clinical judgment —
abnormal/normal, severity, patterns — is computed by a deterministic rules engine
(`khanesh-server/rules/`); the LLM only rewrites pre-computed findings into fluent Persian. See
[CLAUDE.md](CLAUDE.md) for why, and [.claude/rules/architecture.md](.claude/rules/architecture.md)
for the full request flow.

## Structure

Two independent projects, no shared `package.json` — `cd` into the right one before running
commands.

| Folder | What it is |
|---|---|
| [`khanesh/`](khanesh/) | React 19 + Vite frontend — the form/photo intake and result UI |
| [`khanesh-server/`](khanesh-server/) | Express backend — OCR, the rules engine, the AvalAI proxy |

```
khanesh-project/
├── khanesh/              # React + Vite frontend
├── khanesh-server/       # Express backend + rules engine (khanesh-server/rules/)
├── .claude/               # agents, skills, rules — see below
├── MEDICAL_RULES.md      # clinical decision register, pending human review
└── CLAUDE.md             # full project map, commands, architecture, lab notebook
```

## Quick start

**Backend** (`khanesh-server/`):

```bash
npm install
# requires .env with AVALAI_API_KEY — see .claude/rules/environment.md
node server.js       # or: npm start / npm run dev (nodemon)
```

**Frontend** (`khanesh/`), separate terminal:

```bash
npm install
npm run dev           # Vite dev server, proxies /api/* to http://localhost:8787
```

## Verifying a change

```bash
cd khanesh-server && npm test         # node --test — full backend regression suite
cd khanesh && npm run lint            # oxlint
```

The frontend has no test runner — trace UI logic by reading the code. A pre-commit hook
(`.githooks/pre-commit`) runs both automatically for whichever sub-project has staged changes.

## Where to go next

- **[CLAUDE.md](CLAUDE.md)** — the real map of this repo: full file structure, every command,
  the agent/skill roster, environment variables, and the "Lab Notebook" — a log of real clinical
  bugs previous sessions introduced here and the rule that generalizes from each. Read it before
  touching `khanesh-server/rules/`.
- **[MEDICAL_RULES.md](MEDICAL_RULES.md)** — the clinical decision register: thresholds and
  ranges awaiting human clinical review before they reach executable code.
- **[.claude/rules/](.claude/rules/)** — architecture, the rules-engine grading modes and
  checklist for adding a lab test, frontend contract, environment variables, and cross-cutting
  notes (Persian-only strings, patient privacy).
