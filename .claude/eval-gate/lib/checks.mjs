// Agent 3 — Static Reviewer. Every check here is deterministic: same commit in,
// same verdict out. No LLM is consulted, and no LLM verdict can overturn one.
import fs from "node:fs";
import path from "node:path";
import { sh, ROOT, config } from "./util.mjs";
import { analyseStatic } from "./static-analysis.mjs";
import { runIntegration } from "./integration.mjs";

const cfg = config();

const isBackend = (f) => f.startsWith("khanesh-server/");
const isFrontend = (f) => f.startsWith("khanesh/") && !f.startsWith("khanesh/node_modules/");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

function result(id, status, opts = {}) {
  return {
    id,
    status,                                   // pass | fail | skip
    blocking: cfg.checks[id]?.blocking ?? true,
    reason: opts.reason || null,
    evidence: opts.evidence || [],
    findings: opts.findings || [],
    ms: opts.ms || 0,
  };
}

// ── 1. typecheck ─────────────────────────────────────────────────────────────
// The repo is plain JS with no tsconfig. Rather than report a check that never
// ran as "pass", it degrades to a real parse of every changed JS/MJS file and
// says so. .jsx has no stdlib parser here — it is covered by the build check.
function checkTypecheck(files) {
  const tsconfigs = ["khanesh/tsconfig.json", "khanesh-server/tsconfig.json"].filter(exists);
  if (tsconfigs.length) {
    const runs = tsconfigs.map((tc) =>
      sh("npx", ["--no-install", "tsc", "--noEmit", "-p", tc], { cwd: ROOT })
    );
    const bad = runs.filter((r) => !r.ok);
    return result("typecheck", bad.length ? "fail" : "pass", { evidence: runs });
  }

  const targets = files.filter((f) => /\.(js|mjs)$/.test(f) && exists(f));
  if (!targets.length) {
    return result("typecheck", "skip", { reason: "no tsconfig in repo and no .js/.mjs files changed" });
  }
  const failures = [];
  for (const f of targets) {
    const r = sh(process.execPath, ["--check", f], { cwd: ROOT });
    if (!r.ok) failures.push({ file: f, output: r.output.slice(0, 800) });
  }
  return result("typecheck", failures.length ? "fail" : "pass", {
    reason: "no tsconfig — degraded to `node --check` syntax verification; .jsx is covered by build",
    findings: failures,
    evidence: [{ cmd: `node --check × ${targets.length} file(s)`, ok: !failures.length, files: targets }],
  });
}

// ── 2. lint ──────────────────────────────────────────────────────────────────
function checkLint(files) {
  const evidence = [];
  let failed = false;

  if (files.some(isFrontend)) {
    const r = sh("npm", ["run", "lint", "--silent"], { cwd: path.join(ROOT, "khanesh") });
    evidence.push(r);
    if (!r.ok) failed = true;
  }

  // Backend has no lint config of its own; borrow the frontend's installed oxlint
  // and scope it to the changed files so legacy debt in untouched files can't
  // fail an unrelated change.
  const backendJs = files.filter((f) => isBackend(f) && /\.(js|mjs)$/.test(f) && exists(f));
  const oxlint = path.join(ROOT, "khanesh/node_modules/.bin/oxlint" + (process.platform === "win32" ? ".cmd" : ""));
  if (backendJs.length && fs.existsSync(oxlint)) {
    const r = sh(oxlint, backendJs.map((f) => path.join(ROOT, f)), { cwd: ROOT });
    evidence.push({ ...r, scope: "backend changed files only" });
    if (!r.ok) failed = true;
  }

  if (!evidence.length) return result("lint", "skip", { reason: "no lintable files changed" });
  return result("lint", failed ? "fail" : "pass", { evidence });
}

// ── 3. unit tests ────────────────────────────────────────────────────────────
function checkUnitTests(files, { full }) {
  if (!full && !files.some(isBackend)) {
    return result("unit_tests", "skip", { reason: "no backend files changed (the only test suite lives in khanesh-server)" });
  }
  const r = sh("npm", ["test", "--silent"], { cwd: path.join(ROOT, "khanesh-server") });
  const m = /# pass (\d+)[\s\S]*?# fail (\d+)/.exec(r.output);
  return result("unit_tests", r.ok ? "pass" : "fail", {
    evidence: [r],
    findings: m ? [{ passed: +m[1], failed: +m[2] }] : [],
  });
}

// ── 4. integration tests ─────────────────────────────────────────────────────
async function checkIntegration(files, { full }) {
  if (!full && !files.some(isBackend)) {
    return result("integration_tests", "skip", { reason: "no backend/engine files changed" });
  }
  const res = await runIntegration();
  return result("integration_tests", res.failed.length ? "fail" : "pass", {
    findings: res.failed,
    evidence: [{ cmd: "eval-gate integration harness", panels: res.total, assertions: res.assertions, ok: !res.failed.length }],
  });
}

// ── 5. build ─────────────────────────────────────────────────────────────────
function checkBuild(files, { full }) {
  if (!full && !files.some(isFrontend)) {
    return result("build", "skip", { reason: "no frontend files changed" });
  }
  const r = sh("npm", ["run", "build", "--silent"], { cwd: path.join(ROOT, "khanesh") });
  return result("build", r.ok ? "pass" : "fail", { evidence: [r] });
}

// ── 6+7. dead code & dependency validation ───────────────────────────────────
function checkStatic(changeSet) {
  const a = analyseStatic(changeSet);
  const dead = result("dead_code", a.deadCode.length ? "fail" : "pass", {
    findings: a.deadCode,
    reason: cfg.checks.dead_code.only_newly_introduced
      ? "only unreachable symbols introduced by THIS diff count — pre-existing debt is reported by `run.mjs audit`, not gated here"
      : null,
    evidence: [{ cmd: "eval-gate dead-code scan", scanned: a.scanned, vendored_files_skipped: a.vendored_skipped, ok: !a.deadCode.length }],
  });
  const deps = result("dependency_validation", a.depIssues.length ? "fail" : "pass", {
    findings: a.depIssues,
    evidence: [{ cmd: "eval-gate import-resolution scan", specifiers: a.specifiers, vendored_files_skipped: a.vendored_skipped, ok: !a.depIssues.length }],
  });
  return [dead, deps];
}

export async function runStaticReviewer(changeSet, { full = false } = {}) {
  const files = changeSet.files.map((f) => f.file);
  const started = Date.now();

  const checks = [];
  checks.push(checkTypecheck(files));
  checks.push(checkLint(files));
  checks.push(checkUnitTests(files, { full }));
  checks.push(await checkIntegration(files, { full }));
  checks.push(checkBuild(files, { full }));
  checks.push(...checkStatic(changeSet));

  const failed = checks.filter((c) => c.status === "fail");
  const blockingFailed = failed.filter((c) => c.blocking);

  return {
    agent: "static-reviewer",
    deterministic: true,
    ms: Date.now() - started,
    checks,
    failed_checks: failed.map((c) => c.id),
    // "If any check fails: STOP." — nothing downstream can talk this back.
    verdict: blockingFailed.length ? "FAIL" : "PASS",
    stop: blockingFailed.length > 0,
  };
}
