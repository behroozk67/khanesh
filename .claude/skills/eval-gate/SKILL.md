---
name: eval-gate
description: Run the multi-agent evaluation gate on a change to Khanesh/LabMate — plan, build, deterministic checks, medical review, trajectory review, blind judge, risk classification, merge decision, and regression capture. Use when the user asks whether a change can be merged, asks to evaluate/gate/review a diff or branch end to end, or wants an evaluation.json for work that was just done. Not for a quick code read — use code-reviewer for that.
---

# Evaluation Gate

Eight agents decide whether a change merges. Three of them are code, because a
deterministic check that cannot be talked out of its answer is worth more than
another opinion.

| # | Agent | Where it lives | Kind |
|---|---|---|---|
| 1 | Planner | `.claude/agents/eval-planner.md` | LLM |
| 2 | Builder | `.claude/agents/eval-builder.md` | LLM |
| 3 | Static Reviewer | `lib/checks.mjs` | deterministic |
| 4 | Medical Reviewer | `.claude/agents/eval-medical-reviewer.md` + `lib/medical-facts.mjs` | LLM over a deterministic fact table |
| 5 | Trajectory Reviewer | `.claude/agents/eval-trajectory-reviewer.md` + `lib/trajectory.mjs` | LLM over deterministic metrics |
| 6 | Independent Judge | `.claude/agents/eval-judge.md` | LLM, blind |
| 7 | Risk Analyzer | `lib/risk.mjs` | deterministic |
| 8 | Merge Gate | `lib/gate.mjs` | deterministic |

## The flow

```bash
# 1. plan  (Agent 1) — writes plan.json
# 2. build (Agent 2) — implements only that plan

# 3+4+5+7 — all deterministic evidence, one command
node .claude/eval-gate/run.mjs check --plan <plan.json> --transcript <session.jsonl>

# 4, 5, 6 — the LLM halves, each a separate agent instance
#   eval-medical-reviewer     → run.mjs verdict --role medical    --file …
#   eval-trajectory-reviewer  → run.mjs verdict --role trajectory --file …
#   eval-judge (blind)        → run.mjs verdict --role judge      --file …

# 8 — decision, evaluation.json, regression capture, the eight-section report
node .claude/eval-gate/run.mjs gate
```

`run.mjs run` does check + gate in one pass. Exit code is the decision: 0 approve, 1 reject.

## Non-negotiables when you drive this

- **Never file a verdict yourself for work you did.** The gate detects it via
  `produced_by` and discards the verdict — a discarded verdict is a missing
  verdict, which is a rejection. Spawn a separate agent instance per role.
- **The Judge must stay blind.** Give it a fresh context with the task statement
  and the diff. Do not paste the other agents' findings into its prompt "for
  efficiency"; that converts three independent opinions into one.
- **Deterministic evidence wins.** If the Medical Reviewer says a range is fine
  and `medical-facts.json` shows it changed from `[4, 5.6]` to `[4, 6.5]`, the
  fact table is what the report carries. LLM scores can only lower a
  deterministic score, never raise it.
- **A missing verdict is not a pass.** The gate rejects on absent evidence
  deliberately; do not "unblock" a run by relaxing that.
- **HIGH risk never auto-merges here.** Everything under `khanesh-server/rules/`
  is HIGH by design, so most clinical changes route to a human. That is the
  intended behaviour, not a misconfiguration to work around — report it as a
  routing decision.

## Reporting back

Print all eight sections from `runs/<id>/report.md`, in order, including the
empty ones: Execution Summary, Deterministic Checks, Medical Validation,
Trajectory Analysis, Risk Level, Merge Decision, Evidence, Regression Tests
Added. A section quietly dropped because it had nothing in it is how a gate
stops gating.

If anything failed, confirm a regression artefact exists in
`.claude/eval-gate/regressions/` before you call the task done — the gate makes
that one of its own merge conditions.
