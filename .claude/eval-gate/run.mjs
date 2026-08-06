#!/usr/bin/env node
// eval-gate — the orchestrator.
//
//   node .claude/eval-gate/run.mjs run   [--base <ref>] [--staged] [--transcript <jsonl>] [--plan <plan.json>]
//   node .claude/eval-gate/run.mjs check
//   node .claude/eval-gate/run.mjs template --role medical|trajectory|judge
//   node .claude/eval-gate/run.mjs verdict  --role <role> --file <path>
//   node .claude/eval-gate/run.mjs gate
//   node .claude/eval-gate/run.mjs audit | regressions | config
//
// Exit code 0 = APPROVE_MERGE, 1 = REJECT_MERGE, 2 = usage error.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { GATE_DIR, ROOT, config, readJson, writeJson, nowIso, sh, sha256 } from "./lib/util.mjs";
import { collectChangeSet } from "./lib/diff.mjs";
import { runStaticReviewer } from "./lib/checks.mjs";
import { collectMedicalFacts } from "./lib/medical-facts.mjs";
import { analyseRisk } from "./lib/risk.mjs";
import { analyseTrajectory, renderTrajectoryReport } from "./lib/trajectory.mjs";
import { loadVerdicts, verdictTemplate, judgeVersion } from "./lib/verdicts.mjs";
import { decide } from "./lib/gate.mjs";
import { generateRegressions } from "./lib/regression.mjs";
import { renderReport } from "./lib/report.mjs";
import { auditRepo } from "./lib/static-analysis.mjs";

const RUNS = path.join(GATE_DIR, "runs");
const LATEST = path.join(RUNS, "LATEST");

const { values: a, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: "string" }, staged: { type: "boolean" }, transcript: { type: "string" },
    plan: { type: "string" }, role: { type: "string" }, file: { type: "string" },
    full: { type: "boolean" }, run: { type: "string" }, quiet: { type: "boolean" },
  },
});
const cmd = positionals[0] || "run";

function runDir(create = false) {
  if (a.run) return path.join(RUNS, a.run);
  if (!create) {
    if (!fs.existsSync(LATEST)) die("no evaluation run found — run `check` or `run` first");
    return path.join(RUNS, fs.readFileSync(LATEST, "utf8").trim());
  }
  const head = sh("git", ["rev-parse", "--short", "HEAD"]).output.trim() || "nogit";
  const id = `${nowIso().replace(/[-:]/g, "").replace(/\..+/, "")}-${head}`;
  const dir = path.join(RUNS, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LATEST, id, "utf8");
  return dir;
}

function die(msg, code = 2) { console.error(`eval-gate: ${msg}`); process.exit(code); }
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

// ── evidence collection (Agents 3, 4-deterministic, 5, 7) ────────────────────
async function collect() {
  const started = Date.now();
  const dir = runDir(true);
  const changeSet = collectChangeSet({ base: a.base, staged: !!a.staged });

  if (!changeSet.file_count) console.error("eval-gate: warning — the change set is empty; there is nothing to evaluate");

  fs.writeFileSync(path.join(dir, "change.patch"), changeSet.patch, "utf8");
  const { patch, ...changeMeta } = changeSet;
  writeJson(path.join(dir, "change-set.json"), changeMeta);

  const plan = a.plan ? readJson(path.resolve(ROOT, a.plan)) : (fs.existsSync(path.join(dir, "plan.json")) ? readJson(path.join(dir, "plan.json")) : null);
  if (plan) writeJson(path.join(dir, "plan.json"), plan);

  const staticOut = await runStaticReviewer(changeSet, { full: !!a.full });
  writeJson(path.join(dir, "static.json"), staticOut);

  const medical = await collectMedicalFacts(changeSet, dir);
  writeJson(path.join(dir, "medical-facts.json"), medical);

  const risk = analyseRisk(changeSet);
  writeJson(path.join(dir, "risk.json"), risk);

  const transcript = a.transcript ? path.resolve(a.transcript) : null;
  if (transcript) writeJson(path.join(dir, "trajectory-input.json"), { transcript });

  return { dir, changeSet, changeMeta, staticOut, medical, risk, plan, started };
}

async function cmdCheck() {
  const c = await collect();
  const tr = analyseTrajectory({ transcript: a.transcript ? path.resolve(a.transcript) : trFromDir(c.dir), plan: c.plan });
  writeJson(path.join(c.dir, "trajectory.json"), tr);
  fs.writeFileSync(path.join(c.dir, "trajectory_report.md"), renderTrajectoryReport(tr), "utf8");

  console.log(`run: ${rel(c.dir)}`);
  console.log(`static: ${c.staticOut.verdict} (${c.staticOut.failed_checks.join(", ") || "no failures"})`);
  console.log(`medical: ${c.medical.deterministic_verdict} — ${c.medical.summary}`);
  console.log(`risk: ${c.risk.level}`);
  console.log(`trajectory: ${tr.score ?? "n/a"}`);
  console.log(`\nfile the LLM verdicts, then: node ${rel(path.join(GATE_DIR, "run.mjs"))} gate --run ${path.basename(c.dir)}`);
  return c;
}

function trFromDir(dir) {
  const p = path.join(dir, "trajectory-input.json");
  return fs.existsSync(p) ? readJson(p).transcript : null;
}

// ── decision (Agent 8) ───────────────────────────────────────────────────────
function cmdGate({ silent = false } = {}) {
  const gateStarted = Date.now();
  const dir = runDir(false);
  const need = (f) => {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) die(`${f} missing in ${rel(dir)} — run \`check\` first`);
    return readJson(p);
  };
  const changeMeta = need("change-set.json");
  const staticOut = need("static.json");
  const medical = need("medical-facts.json");
  const risk = need("risk.json");
  const plan = fs.existsSync(path.join(dir, "plan.json")) ? readJson(path.join(dir, "plan.json")) : null;

  const verdicts = loadVerdicts(dir, changeMeta, plan || {});
  const trajectory = analyseTrajectory({
    transcript: a.transcript ? path.resolve(a.transcript) : trFromDir(dir),
    plan,
    llmVerdict: verdicts.present.trajectory,
  });
  writeJson(path.join(dir, "trajectory.json"), trajectory);
  fs.writeFileSync(path.join(dir, "trajectory_report.md"), renderTrajectoryReport(trajectory), "utf8");

  const evidence = { static: staticOut, medical, risk, trajectory, verdicts };

  // Regression learning runs BEFORE the decision, so "did you record it?" is
  // itself one of the gate's conditions rather than a post-hoc chore.
  const regression = generateRegressions(evidence, { commit: changeMeta.head });
  writeJson(path.join(dir, "regression.json"), regression);

  const gate = decide({ ...evidence, regression });

  const evaluation = {
    schema: "labmate.eval-gate/v1",
    meta: {
      gate_version: config().version,
      judge_version: verdicts.judge_version,
      node: process.version,
      platform: process.platform,
      timestamp: nowIso(),
      run_dir: rel(dir),
      duration_ms: 0,
      // Reproducibility: the same tree + the same config must give the same call.
      config_hash: sha256(fs.readFileSync(path.join(GATE_DIR, "config.json"), "utf8")).slice(0, 16),
    },
    change_set: changeMeta,
    plan: plan ? { id: plan.id ?? null, steps: plan.steps?.length ?? 0, affected_modules: plan.affected_modules ?? [] } : null,
    scores: {
      static: staticOut.verdict,
      medical_deterministic: medical.deterministic_verdict,
      medical_reviewer: verdicts.present.medical?.verdict ?? null,
      medical_confidence: verdicts.present.medical?.confidence ?? null,
      trajectory_score: trajectory.score,
      trajectory_threshold: trajectory.threshold,
      judge: verdicts.present.judge?.verdict ?? null,
      risk: risk.level,
    },
    failed_checks: staticOut.failed_checks,
    static: staticOut,
    medical,
    trajectory,
    risk,
    verdicts,
    regression,
    gate,
    decision: gate.decision,
  };
  evaluation.meta.duration_ms = Date.now() - gateStarted;
  writeJson(path.join(dir, "evaluation.json"), evaluation);

  const report = renderReport(evaluation);
  fs.writeFileSync(path.join(dir, "report.md"), report, "utf8");
  if (!silent) console.log(report);

  return { evaluation, dir };
}

// ── entry points ─────────────────────────────────────────────────────────────
async function main() {
  switch (cmd) {
    case "run": {
      await cmdCheck();
      console.log("");
      const { evaluation } = cmdGate();
      process.exit(evaluation.decision === "APPROVE_MERGE" ? 0 : 1);
      break;
    }
    case "check": await cmdCheck(); break;
    case "gate": {
      const { evaluation } = cmdGate();
      process.exit(evaluation.decision === "APPROVE_MERGE" ? 0 : 1);
      break;
    }
    case "template": {
      if (!a.role) die("--role medical|trajectory|judge is required");
      const dir = fs.existsSync(LATEST) ? runDir(false) : null;
      const cs = dir ? readJson(path.join(dir, "change-set.json")) : collectChangeSet({ base: a.base, staged: !!a.staged });
      console.log(JSON.stringify(verdictTemplate(a.role, cs), null, 2));
      break;
    }
    case "verdict": {
      if (!a.role || !a.file) die("--role <role> --file <path.json> are both required");
      const dir = runDir(false);
      const v = readJson(path.resolve(a.file));
      writeJson(path.join(dir, "verdicts", `${a.role}.json`), v);
      const cs = readJson(path.join(dir, "change-set.json"));
      const plan = fs.existsSync(path.join(dir, "plan.json")) ? readJson(path.join(dir, "plan.json")) : {};
      const res = loadVerdicts(dir, cs, plan);
      const bad = res.invalid.find((i) => i.role === a.role);
      if (bad) { console.error(`verdict filed but INVALID: ${bad.errors.join("; ")}`); process.exit(1); }
      const ind = res.independence.filter((i) => i.role.includes(a.role));
      if (ind.length) { console.error(`verdict filed but violates independence: ${ind.map((i) => i.msg).join("; ")}`); process.exit(1); }
      console.log(`ok — ${a.role} verdict accepted into ${rel(dir)}`);
      break;
    }
    case "audit": {
      const r = auditRepo();
      console.log(`scanned ${r.files} source files, ${r.issues.length} pre-existing issue(s):\n`);
      for (const i of r.issues) console.log(`  ${i.kind.padEnd(20)} ${i.file}:${i.line}  "${i.spec}"${i.dynamic ? " (dynamic)" : ""}`);
      break;
    }
    case "regressions": {
      const dir = path.join(GATE_DIR, "regressions");
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".test.mjs")).map((f) => path.join(dir, f)) : [];
      if (!files.length) { console.log("no regression tests recorded yet"); break; }
      // Passing the files explicitly: `node --test <dir>` resolves the directory
      // as a module on this runtime and fails before running anything.
      const r = sh(process.execPath, ["--test", ...files], { cwd: ROOT });
      console.log(r.output);
      process.exit(r.status);
      break;
    }
    case "config": console.log(JSON.stringify({ ...config(), judge_version: judgeVersion() }, null, 2)); break;
    default: die(`unknown command "${cmd}"`);
  }
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(2); });
