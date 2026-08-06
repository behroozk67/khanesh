// Tests for the gate itself. A merge gate nobody tests is a merge gate that
// approves everything the day someone typos a config key.
//   node --test .claude/eval-gate/selftest.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { decide } from "./lib/gate.mjs";
import { classifyFile, analyseRisk } from "./lib/risk.mjs";
import { analyseTrajectory } from "./lib/trajectory.mjs";
import { loadVerdicts } from "./lib/verdicts.mjs";
import { globToRe, matchAny, config } from "./lib/util.mjs";
import { specifiersOf } from "./lib/static-analysis.mjs";
import { boundarySmells } from "./lib/medical-facts.mjs";
import { generateRegressions } from "./lib/regression.mjs";

const cfg = config();

// ── a fully green evidence bundle, which each test then spoils in one way ────
const CHANGE = { base: "aaa", head: "bbb", tree_hash: "t1", branch: "x", files: [], file_count: 0 };

const green = () => ({
  static: {
    verdict: "PASS", stop: false, failed_checks: [],
    checks: [
      { id: "typecheck", status: "pass", blocking: true, findings: [] },
      { id: "lint", status: "pass", blocking: true, findings: [] },
      { id: "unit_tests", status: "pass", blocking: true, findings: [] },
      { id: "integration_tests", status: "pass", blocking: true, findings: [] },
      { id: "build", status: "pass", blocking: true, findings: [] },
      { id: "dead_code", status: "pass", blocking: true, findings: [] },
      { id: "dependency_validation", status: "pass", blocking: true, findings: [] },
    ],
  },
  medical: {
    deterministic_verdict: "PASS", boundary_violations: [], range_changes: [], function_changes: [],
    pattern_changes: { added_rules: [], removed_rules: [], changed_rules: [] },
    requires_human_clinical_signoff: false, load_errors: [], modules_touched: { ranges: [], patterns: [], prompt: [] },
  },
  trajectory: { score: 88, threshold: cfg.thresholds.trajectory_score, status: "measured" },
  risk: { level: "LOW", counts: { HIGH: 0, MEDIUM: 0, LOW: 1 }, drivers: [], per_file: [] },
  verdicts: {
    present: {
      medical: { verdict: "PASS", confidence: 0.95, produced_by: "med-1" },
      judge: { verdict: "PASS", produced_by: "judge-1", saw_other_verdicts: false },
    },
    invalid: [], independence: [], missing: [], judge_version: "v",
  },
  regression: { generated: false, count: 0, created: [], covered_by_existing_check: [] },
});

test("green evidence approves the merge", () => {
  const d = decide(green());
  assert.equal(d.decision, "APPROVE_MERGE");
  assert.deepEqual(d.reasons, []);
});

test("every single gate condition can veto on its own", () => {
  const spoil = {
    BUILD_FAILED: (e) => { e.static.checks.find((c) => c.id === "build").status = "fail"; },
    UNIT_TESTS_FAILED: (e) => { e.static.checks.find((c) => c.id === "unit_tests").status = "fail"; },
    INTEGRATION_TESTS_FAILED: (e) => { e.static.checks.find((c) => c.id === "integration_tests").status = "fail"; },
    STATIC_LINT_FAILED: (e) => { e.static.checks.find((c) => c.id === "lint").status = "fail"; },
    MEDICAL_BOUNDARY_VIOLATION: (e) => { e.medical.deterministic_verdict = "FAIL"; e.medical.boundary_violations = [{ msg: "x" }]; },
    MEDICAL_REVIEW_MISSING: (e) => { delete e.verdicts.present.medical; },
    MEDICAL_REVIEW_FAILED: (e) => { e.verdicts.present.medical.verdict = "FAIL"; },
    MEDICAL_REVIEW_LOW_CONFIDENCE: (e) => { e.verdicts.present.medical.confidence = 0.4; },
    TRAJECTORY_BELOW_THRESHOLD: (e) => { e.trajectory.score = cfg.thresholds.trajectory_score; },
    TRAJECTORY_EVIDENCE_MISSING: (e) => { e.trajectory.score = null; },
    JUDGE_MISSING: (e) => { delete e.verdicts.present.judge; },
    JUDGE_FAILED: (e) => { e.verdicts.present.judge.verdict = "FAIL"; },
    RISK_TOO_HIGH: (e) => { e.risk.level = "HIGH"; e.risk.drivers = ["khanesh-server/rules/refs.js"]; },
    VERDICT_INVALID: (e) => { e.verdicts.invalid = [{ role: "medical", errors: ["stale"] }]; },
    SELF_EVALUATION: (e) => { e.verdicts.independence = [{ role: "judge", msg: "same agent as builder" }]; },
  };
  for (const [code, apply] of Object.entries(spoil)) {
    const e = green();
    apply(e);
    const d = decide(e);
    assert.equal(d.decision, "REJECT_MERGE", `${code} did not reject`);
    assert.ok(d.reasons.some((r) => r.code === code), `${code} missing from reasons: ${d.reasons.map((r) => r.code)}`);
  }
});

test("trajectory score exactly at threshold is not above it", () => {
  const e = green();
  e.trajectory.score = cfg.thresholds.trajectory_score;
  assert.equal(decide(e).decision, "REJECT_MERGE");
  e.trajectory.score = cfg.thresholds.trajectory_score + 1;
  assert.equal(decide(e).decision, "APPROVE_MERGE");
});

test("a failure with no regression artefact is itself a rejection reason", () => {
  const e = green();
  e.static.checks.find((c) => c.id === "lint").status = "fail";
  e.regression = { generated: false, count: 0 };
  const d = decide(e);
  assert.ok(d.reasons.some((r) => r.code === "REGRESSION_NOT_RECORDED"));
  e.regression = { generated: true, count: 1 };
  assert.ok(!decide(e).reasons.some((r) => r.code === "REGRESSION_NOT_RECORDED"));
});

test("a skipped build is not a failed build", () => {
  const e = green();
  e.static.checks.find((c) => c.id === "build").status = "skip";
  e.static.checks.find((c) => c.id === "build").reason = "no frontend files changed";
  assert.equal(decide(e).decision, "APPROVE_MERGE");
});

// ── Agent 7 ─────────────────────────────────────────────────────────────────
test("risk: clinical engine is HIGH, docs are LOW, unknown is never LOW", () => {
  assert.equal(classifyFile("khanesh-server/rules/refs.js").risk, "HIGH");
  assert.equal(classifyFile("khanesh-server/server.js").risk, "HIGH");
  assert.equal(classifyFile("khanesh/src/ResultView.jsx").risk, "HIGH");
  assert.equal(classifyFile("CLAUDE.md").risk, "LOW");
  assert.equal(classifyFile("khanesh/public/fonts/x.woff2").risk, "LOW");
  assert.equal(classifyFile("khanesh/src/Tafsir.jsx").risk, "MEDIUM");
  assert.equal(classifyFile("some/unmapped/thing.py").risk, "MEDIUM");
  assert.equal(classifyFile(".claude/eval-gate/config.json").risk, "HIGH");   // the gate cannot lower its own bar
});

test("risk of a change set is the max, not the average", () => {
  const r = analyseRisk({ files: [{ file: "README.md", status: "M" }, { file: "khanesh-server/rules/ctcae.js", status: "M" }] });
  assert.equal(r.level, "HIGH");
  assert.equal(r.auto_merge_allowed, false);
  assert.deepEqual(r.drivers, ["khanesh-server/rules/ctcae.js"]);
});

// ── glob semantics the risk map depends on ──────────────────────────────────
test("glob: ** spans directories and matches zero of them", () => {
  assert.ok(globToRe("khanesh-server/rules/**").test("khanesh-server/rules/refs.js"));
  assert.ok(globToRe("khanesh-server/rules/**").test("khanesh-server/rules/a/b/c.js"));
  assert.ok(globToRe("**/*.md").test("README.md"));
  assert.ok(globToRe("**/*.md").test("a/b/README.md"));
  assert.ok(!globToRe("khanesh/src/*.jsx").test("khanesh/src/deep/X.jsx"));
  assert.ok(matchAny("khanesh\\src\\App.jsx", ["khanesh/src/**"]));   // windows separators
});

// ── Agent 5 ─────────────────────────────────────────────────────────────────
function transcript(calls, results = {}) {
  const lines = [];
  for (const c of calls) {
    lines.push(JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: c.id, name: c.name, input: c.input }] } }));
    if (results[c.id]) lines.push(JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: c.id, is_error: results[c.id].is_error, content: results[c.id].text || "" }] } }));
  }
  const p = path.join(os.tmpdir(), `eval-gate-selftest-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  fs.writeFileSync(p, lines.join("\n"), "utf8");
  return p;
}

test("trajectory: a clean run scores 100", () => {
  const p = transcript([
    { id: "1", name: "Read", input: { file_path: "CLAUDE.md" } },
    { id: "2", name: "Grep", input: { pattern: "faName" } },
  ]);
  const t = analyseTrajectory({ transcript: p, plan: { steps: [{ n: 1 }], affected_modules: ["**"] } });
  assert.equal(t.score, 100);
  assert.equal(t.pass, true);
  fs.unlinkSync(p);
});

test("trajectory: duplicates, out-of-plan edits and verbatim retries are each penalised", () => {
  const dup = { id: "1", name: "Grep", input: { pattern: "x" } };
  const p = transcript([
    dup,
    { id: "2", name: "Grep", input: { pattern: "x" } },                            // duplicate
    { id: "3", name: "Write", input: { file_path: "khanesh/src/Other.jsx" } },     // out of plan
  ], {});
  const t = analyseTrajectory({ transcript: p, plan: { steps: [{ n: 1 }], affected_modules: ["khanesh-server/**"] } });
  assert.ok(t.score < 100);
  assert.equal(t.metrics.duplicate_calls, 1);
  assert.equal(t.metrics.out_of_plan_edits, 1);
  assert.ok(t.findings.some((f) => f.kind === "out_of_plan_edit"));
  fs.unlinkSync(p);
});

// The four semantics below were all changed or added in response to a review
// finding. Each is locked here because an untested metric definition is exactly
// what lets an agent tune its own score — the trajectory reviewer's own charge
// against this build, and it was right.

test("trajectory: a file this session Wrote is not a blind edit when later Edited", () => {
  const p = transcript([
    { id: "1", name: "Write", input: { file_path: ".claude/eval-gate/new.mjs" } },
    { id: "2", name: "Edit", input: { file_path: ".claude/eval-gate/new.mjs" } },
  ]);
  const t = analyseTrajectory({ transcript: p, plan: { steps: [{ n: 1 }], affected_modules: ["**"] } });
  assert.equal(t.metrics.blind_edits, 0, "writing a file is knowing its contents");
  fs.unlinkSync(p);
});

test("trajectory: editing outside the repo root is not repo scope drift", () => {
  const outside = path.join(os.tmpdir(), "scratch", "notes.md");
  const p = transcript([{ id: "1", name: "Write", input: { file_path: outside } }]);
  const t = analyseTrajectory({ transcript: p, plan: { steps: [{ n: 1 }], affected_modules: ["khanesh-server/**"] } });
  assert.equal(t.metrics.out_of_plan_edits, 0);
  fs.unlinkSync(p);
});

test("trajectory: a retry after a transient platform error carries no penalty", () => {
  const call = { id: "1", name: "Write", input: { file_path: "khanesh-server/x.js" } };
  const p = transcript(
    [call, { id: "2", name: "Write", input: { file_path: "khanesh-server/x.js" } }],
    { 1: { is_error: true, text: "claude-sonnet-5 is temporarily unavailable, so auto mode cannot determine the safety of Write right now. Wait briefly and then try this action again." } },
  );
  const t = analyseTrajectory({ transcript: p, plan: { steps: [{ n: 1 }], affected_modules: ["**"] } });
  assert.equal(t.metrics.verbatim_retries, 0, "the tool output asked for the retry");
  assert.equal(t.metrics.transient_retries, 1);
  assert.equal(t.deductions.verbatim_retry_after_error, 0);
  assert.equal(t.deductions.duplicate_tool_call, 0, "a transient retry is not a duplicate either");
  fs.unlinkSync(p);
});

test("trajectory: a shell redirect counts as an edit for scope purposes", () => {
  const p = transcript([
    { id: "1", name: "Bash", input: { command: "printf 'x\\n' >> .gitignore" } },
    { id: "2", name: "Bash", input: { command: "node --test 2>&1 > /dev/null" } },   // not a repo write
  ]);
  const t = analyseTrajectory({ transcript: p, plan: { steps: [{ n: 1 }], affected_modules: ["khanesh-server/**"] } });
  assert.equal(t.metrics.shell_edits, 1);
  assert.equal(t.metrics.out_of_plan_edits, 1);
  assert.ok(t.findings.some((f) => f.kind === "out_of_plan_edit" && f.target === ".gitignore"));
  fs.unlinkSync(p);
});

test("trajectory: an arrow function in an inline script is not a redirect", () => {
  const p = transcript([
    { id: "1", name: "Bash", input: { command: `node -e "import('./x.mjs').then(m => m.run()).then(r => console.log(r))"` } },
    { id: "2", name: "Bash", input: { command: "test $a >= $b" } },
  ]);
  const t = analyseTrajectory({ transcript: p, plan: { steps: [{ n: 1 }], affected_modules: ["khanesh-server/**"] } });
  assert.equal(t.metrics.shell_edits, 0);
  assert.equal(t.metrics.out_of_plan_edits, 0);
  fs.unlinkSync(p);
});

test("trajectory: shell-write detection refuses to guess at globs and variables", () => {
  const p = transcript([
    { id: "1", name: "Bash", input: { command: "rm -rf $TMP/*.json && cp a.txt \"$DEST\"" } },
  ]);
  const t = analyseTrajectory({ transcript: p, plan: { steps: [{ n: 1 }], affected_modules: ["khanesh-server/**"] } });
  assert.equal(t.metrics.shell_edits, 0, "a false scope-drift accusation is worse than a missed one");
  fs.unlinkSync(p);
});

test("trajectory: repeating a call that already errored is scored as ignoring the output", () => {
  const p = transcript([
    { id: "1", name: "Bash", input: { command: "npm test" } },
    { id: "2", name: "Bash", input: { command: "npm test" } },
  ], { 1: { is_error: true, text: "boom" } });
  const t = analyseTrajectory({ transcript: p, plan: { steps: [], affected_modules: ["**"] } });
  assert.equal(t.metrics.verbatim_retries, 1);
  assert.ok(t.findings.some((f) => f.kind === "verbatim_retry_after_error"));
  fs.unlinkSync(p);
});

test("trajectory: an LLM score may lower the deterministic one, never raise it", () => {
  const p = transcript([{ id: "1", name: "Read", input: { file_path: "CLAUDE.md" } }]);
  const plan = { steps: [], affected_modules: ["**"] };
  assert.equal(analyseTrajectory({ transcript: p, plan, llmVerdict: { trajectory_score: 100 } }).score, 100);
  assert.equal(analyseTrajectory({ transcript: p, plan, llmVerdict: { trajectory_score: 40 } }).score, 40);
  const noisy = transcript([
    { id: "1", name: "Grep", input: { pattern: "x" } },
    { id: "2", name: "Grep", input: { pattern: "x" } },
  ]);
  const det = analyseTrajectory({ transcript: noisy, plan }).score;
  assert.equal(analyseTrajectory({ transcript: noisy, plan, llmVerdict: { trajectory_score: 100 } }).score, det);
  fs.unlinkSync(p); fs.unlinkSync(noisy);
});

test("trajectory: no transcript yields no score rather than a default pass", () => {
  const t = analyseTrajectory({});
  assert.equal(t.score, null);
  assert.equal(t.status, "unavailable");
  assert.equal(decide({ ...green(), trajectory: t }).decision, "REJECT_MERGE");
});

// ── verdict intake ──────────────────────────────────────────────────────────
function runDirWith(verdicts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eval-gate-run-"));
  fs.mkdirSync(path.join(dir, "verdicts"));
  for (const [role, v] of Object.entries(verdicts)) fs.writeFileSync(path.join(dir, "verdicts", `${role}.json`), JSON.stringify(v), "utf8");
  return dir;
}

const validMedical = {
  agent_role: "medical", agent_id: "eval-medical-reviewer", produced_by: "med-1", model: "m",
  reviewed: { base: "aaa", head: "bbb", tree_hash: "t1" }, verdict: "PASS", confidence: 0.9, evidence: [{ claim: "ranges unchanged" }],
};
const validJudge = {
  agent_role: "judge", agent_id: "eval-judge", produced_by: "judge-1", model: "m",
  reviewed: { base: "aaa", head: "bbb", tree_hash: "t1" }, verdict: "PASS", saw_other_verdicts: false, evidence: [{ claim: "task satisfied" }],
};

test("verdicts: a valid pair loads clean", () => {
  const dir = runDirWith({ medical: validMedical, judge: validJudge });
  const r = loadVerdicts(dir, CHANGE, { builder_agent_id: "builder-1" });
  assert.deepEqual(r.invalid, []);
  assert.deepEqual(r.independence, []);
  assert.ok(r.present.medical && r.present.judge);
  assert.deepEqual(r.missing, ["trajectory"]);
});

test("verdicts: the Builder cannot review its own work", () => {
  const dir = runDirWith({ medical: { ...validMedical, produced_by: "builder-1" }, judge: validJudge });
  const r = loadVerdicts(dir, CHANGE, { builder_agent_id: "builder-1" });
  assert.equal(r.independence.length, 1);
  assert.match(r.independence[0].msg, /self-evaluation/);
});

test("verdicts: one agent cannot fill two reviewer slots", () => {
  const dir = runDirWith({ medical: validMedical, judge: { ...validJudge, produced_by: "med-1" } });
  const r = loadVerdicts(dir, CHANGE, { builder_agent_id: "builder-1" });
  assert.equal(r.independence.length, 1);
  assert.match(r.independence[0].msg, /one opinion wearing two hats/);
});

test("verdicts: a judge that admits seeing other verdicts is discarded", () => {
  const dir = runDirWith({ judge: { ...validJudge, saw_other_verdicts: true } });
  const r = loadVerdicts(dir, CHANGE, {});
  assert.ok(r.invalid.some((i) => i.role === "judge" && i.errors.some((e) => /not independent/.test(e))));
});

test("verdicts: a verdict for a different tree is stale and rejected", () => {
  const dir = runDirWith({ medical: { ...validMedical, reviewed: { base: "aaa", head: "ccc", tree_hash: "t9" } } });
  const r = loadVerdicts(dir, CHANGE, {});
  assert.ok(r.invalid.some((i) => i.role === "medical" && i.errors.some((e) => /stale/.test(e))));
});

test("verdicts: a FAIL with no evidence is not a finding", () => {
  const dir = runDirWith({ medical: { ...validMedical, verdict: "FAIL", evidence: [] } });
  const r = loadVerdicts(dir, CHANGE, {});
  assert.ok(r.invalid.some((i) => i.errors.some((e) => /opinion, not a finding/.test(e))));
});

test("a reviewer FAIL produces a regression artefact of its own", () => {
  const e = green();
  e.verdicts.present.medical = {
    verdict: "FAIL", confidence: 0.93, produced_by: "med-1",
    evidence: [{ file: "khanesh-server/rules/refs.js", line: 179, claim: "geriatric HGB override hides anaemia", quote: "HGB: { M: [11.0, 17.5]" }],
    reasons: ["uncited override"],
  };
  const r = generateRegressions(e, { commit: "deadbeef", dryRun: true });
  assert.equal(r.generated, true);
  assert.equal(r.created.length, 1);
  assert.match(r.created[0].file, /medical-.*\.test\.mjs$/);
  assert.ok(/assert\.ok\(!src\.includes/.test(r.created[0].body), "a citation inside the repo anchors on the quoted text");
  // and the gate must then accept that the condition is satisfiable at all
  assert.ok(!decide({ ...e, regression: r }).reasons.some((x) => x.code === "REGRESSION_NOT_RECORDED"));
});

// ── Agent 4, deterministic half ─────────────────────────────────────────────
test("boundary smells fire on prompt text, not on ordinary control flow", () => {
  const ids = (line) => boundarySmells(line).map((v) => v.id);
  // the real false positive this scoping was written for
  assert.deepEqual(ids("if (engineCandidate.graded.length > 0) {"), []);
  assert.deepEqual(ids("for (let i = 0; i < tests.length; i++) {"), []);
  assert.deepEqual(ids("// اگر قند بالای 126 بود دیابت است"), []);           // a comment is not a prompt
  // and the thing it must still catch
  assert.deepEqual(ids('const rule = "اگر قند ناشتا > 126 بود، دیابت را گزارش کن";'), ["threshold_in_prompt"]);
  assert.deepEqual(ids('"مقدار بالای 200 mg/dL را خطرناک بدان"'), ["threshold_in_prompt"]);
  assert.deepEqual(ids("`decide whether the result is abnormal`"), ["verdict_verb_in_prompt"]);
  assert.deepEqual(ids("out.push(`درخواست آزمایش ${e.test} از پزشک`);"), ["raw_key_template"]);
});

// ── import scanning ─────────────────────────────────────────────────────────
test("specifier scan catches static, dynamic, re-export and require forms", () => {
  const src = `
import a from "./a.js";
import "./side.js";
export { b } from "./b.js";
const c = await import("./c.js");
const d = require("./d.js");
import express from "express";
`;
  const specs = specifiersOf(src).map((s) => s.spec).sort();
  assert.deepEqual(specs, ["./a.js", "./b.js", "./c.js", "./d.js", "./side.js", "express"]);
});
