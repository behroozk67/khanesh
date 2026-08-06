# eval-gate — the multi-agent merge gate

Decides whether a change to Khanesh/LabMate may merge automatically. It is not
tuned to say yes. On this repository the majority of clinical changes are
classified HIGH and routed to a human on purpose — the gate's value is that the
routing decision, and the evidence behind it, is reproducible.

```bash
node .claude/eval-gate/run.mjs run --transcript <session.jsonl> --plan <plan.json>
# exit 0 = APPROVE_MERGE, 1 = REJECT_MERGE, 2 = usage error
```

## The eight agents

| # | Agent | Implementation | Decides |
|---|---|---|---|
| 1 | Planner | `.claude/agents/eval-planner.md` | `plan.json`: steps, affected modules, blast radius |
| 2 | Builder | `.claude/agents/eval-builder.md` | the diff, and only within the plan |
| 3 | Static Reviewer | `lib/checks.mjs` | typecheck, lint, unit, integration, build, dead code, dependencies |
| 4 | Medical Reviewer | `lib/medical-facts.mjs` + `.claude/agents/eval-medical-reviewer.md` | clinical correctness |
| 5 | Trajectory Reviewer | `lib/trajectory.mjs` + `.claude/agents/eval-trajectory-reviewer.md` | how the Builder got there |
| 6 | Independent Judge | `.claude/agents/eval-judge.md` | did it do what was asked, blind to all scores |
| 7 | Risk Analyzer | `lib/risk.mjs` | LOW / MEDIUM / HIGH from the changed paths |
| 8 | Merge Gate | `lib/gate.mjs` | the decision, with reasons |

Agents 3, 7 and 8 are code, not prompts. Anything that can be decided by running
something is decided by running something — an LLM is asked only where judgment
is genuinely required, and even then over a fact table it did not produce.

## The decision

```
APPROVE_MERGE  ⇔  build ∧ tests ∧ static ∧ medical ∧ trajectory>threshold
                  ∧ judge=PASS ∧ risk≠HIGH ∧ verdicts valid & independent
                  ∧ (no failure ∨ regression recorded)
```

Every clause is vetoing and each one is covered by a test in `selftest.mjs`.

## Design rules, and why each exists

- **Deterministic evidence overrides LLM opinion.** An LLM score can lower a
  deterministic one (`min`), never raise it. A reviewer that likes the change
  cannot rescue a red test.
- **No agent evaluates its own output.** `produced_by` is compared against the
  Builder's id and across reviewer slots; a self-review is discarded, and a
  discarded verdict is a missing verdict, which is a rejection.
- **The Judge is blind.** It declares `saw_other_verdicts`; declaring `true`
  invalidates it. It exists to check the work against the original request, which
  is exactly what a chain of reviewers reading each other stops doing.
- **Missing evidence is not approval.** No medical verdict, no judge verdict, no
  trajectory data — each is its own rejection reason.
- **Unknown paths are MEDIUM, never LOW.** A new directory nobody classified is
  not automatically safe.
- **The gate cannot lower its own bar.** `config.json`, `lib/gate.mjs` and
  `lib/risk.mjs` are HIGH-risk paths, so a change to the gate can never
  auto-merge itself.
- **A verdict is bound to a tree.** `reviewed.tree_hash` must match the change
  set, so a stale approval cannot be replayed onto new code.
- **Every failure becomes a test.** See below.

## What the checks actually run

| check | command / method | notes |
|---|---|---|
| typecheck | `tsc --noEmit` if a `tsconfig.json` exists, else `node --check` per changed `.js`/`.mjs` | the repo is plain JS; the degradation is reported, not hidden. `.jsx` is covered by the build |
| lint | `npm run lint` (oxlint) in `khanesh/`; the same binary scoped to changed backend files | scoping stops legacy debt in untouched files from failing an unrelated change |
| unit_tests | `npm test` in `khanesh-server/` | the clinical regression suite |
| integration_tests | `lib/integration.mjs` over `fixtures/panels.json` | real panels through `runEngine` → `runPatterns`, asserting the N1/N2/N3/N8/N12 invariants and output determinism |
| build | `npm run build` in `khanesh/` | vite |
| dead_code | exports added by *this diff* that nothing references | pre-existing debt is `run.mjs audit`, which never gates |
| dependency_validation | every import specifier resolved: on disk, in `package.json`, not across sub-projects, present in the lockfile | catches dynamic imports of files that do not exist, which fail only at runtime |

Vendored third-party trees (`config.json → exclude_from_static`: `.agents/skills/**`,
`.claude/skills/impeccable/**`, `.github/skills/**`, `labmat-prototype/**`) are skipped by the
two scanning checks. The repo's rule for those is to re-vendor from source rather than hand-edit,
so a finding inside one is not actionable — and an unactionable finding is how a check gets ignored.
The count of skipped files is recorded in the evidence rather than dropped silently.

## Medical facts are computed, not read off the diff

`lib/medical-facts.mjs` materialises `khanesh-server/rules/` at the base commit,
imports both revisions, and diffs the actual exported values — reference ranges,
CTCAE tables, unit factors, grading function bodies, pattern rule ids. The
Medical Reviewer argues with that table instead of hunting for changed numbers in
a patch. A removed pattern rule is flagged as a boundary violation on its own:
it silently converts an explanation into `unmatched_abnormal`.

## Regression learning

Any failure produces a runnable `node:test` file in `regressions/` plus a row in
`REGRESSIONS.md`, and `regression_recorded` is one of the gate's own merge
conditions — a failing evaluation cannot be closed without one.

```bash
node .claude/eval-gate/run.mjs regressions   # they are red until the defect is fixed
```

The tests are written in the repo's own convention — `node:test`, Persian test names, one file
per defect — and live outside `khanesh-server/` so a red open defect cannot block unrelated
commits through the pre-commit hook.

Failures that a deterministic check already re-detects on every run (lint, build,
typecheck) are recorded as covered rather than duplicated into a new file.

## Files

```
config.json            thresholds, risk map, boundary smells
run.mjs                CLI: run | check | template | verdict | gate | audit | regressions | config
selftest.mjs           20 tests over the gate's own logic
fixtures/panels.json   golden lab panels, each tied to a Lab Notebook entry
lib/                   the deterministic agents
regressions/           generated, runnable, red until fixed
runs/<id>/             per-run evidence (gitignored): static, medical, risk, trajectory,
                       verdicts/, change.patch, evaluation.json, report.md
```

## Reproducing a decision

`evaluation.json` records the commit, the base, the working-tree hash, the config
hash, the judge version, the node version and every command that ran. Re-running
`check` on the same tree with the same config reproduces the deterministic half
exactly; the LLM half is pinned by verdict files that are invalid for any other
tree.

## Known limitations

Stated rather than worked around, because a gate that overstates its own coverage
is worse than one with a documented hole.

- **Untracked files are outside the change set.** `collectChangeSet` builds from
  `git diff`, which does not list files that were never `git add`ed. A change made
  entirely of new files is therefore invisible to the static scan, the dead-code
  pass, the dependency check and the risk classifier — the blind judge would still
  see it, because it reads the repository directly, but nothing deterministic
  would. This is not hypothetical: on this tool's first real run its own 25 new
  files were scored by no check other than the judge. **Stage new files before
  gating a change**, or treat the deterministic half as covering modifications
  only. A fix (folding in `git ls-files --others --exclude-standard`) was proposed
  and declined; if it is ever adopted, the risk classifier will start reporting
  HIGH on new files under the clinical paths, which is the intended behaviour.
- **Independence is enforced by identifier, not by process.** `verdicts.mjs`
  compares `produced_by` against `plan.builder_agent_id`. A reviewer spawned as a
  subagent of the Builder's own session passes that check while sharing the
  session's transcript. The trajectory reviewer of this tool's first run disclosed
  exactly this about itself. Treat `produced_by` as an assertion the operator is
  responsible for, not a proof.
- **A quote-anchored regression test proves the text changed, not that the
  concern was answered.** Reviewer findings are locked by asserting the cited
  snippet is gone from the cited file. That is a proxy: editing the quoted line
  turns the test green without addressing anything. Two of this tool's own
  generated tests went green that way. Treat a reviewer regression going green as
  a prompt to check the fix, not as the check itself — and where the finding was
  "this behaviour has no test", answer it with a real test, not a reworded line.
- **`exclude_from_static` is load-bearing and unaudited by the gate itself.**
  Vendored and generated trees are skipped so the scan reports on authored code;
  on this repository that is a large fraction of the files. `run.mjs config`
  prints the list and the file counts it removes — read it before trusting a
  clean static section.
