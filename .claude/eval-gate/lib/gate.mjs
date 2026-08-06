// Agent 8 — Merge Gate.
//
// The decision is a pure function of the evidence objects. No I/O, no model, no
// discretion. If you want a different answer, change the evidence or change the
// config — not this function's mind.
import { config, RISK_ORDER } from "./util.mjs";

const cfg = config();

const statusOf = (checks, id) => checks.find((c) => c.id === id) || { id, status: "missing", blocking: true };

function condition(name, ok, detail, evidence_ref) {
  return { name, ok, detail, evidence_ref };
}

/**
 * @param {object} e evidence bundle
 * @param {object} e.static      runStaticReviewer() output          (Agent 3)
 * @param {object} e.medical     collectMedicalFacts() output        (Agent 4, deterministic half)
 * @param {object} e.trajectory  analyseTrajectory() output          (Agent 5)
 * @param {object} e.risk        analyseRisk() output                (Agent 7)
 * @param {object} e.verdicts    loadVerdicts() output               (Agents 4/5/6, LLM half)
 * @param {object} [e.regression] regression ledger status
 */
export function decide(e) {
  const checks = e.static?.checks || [];
  const conditions = [];
  const reasons = [];

  const reject = (code, msg, ref) => reasons.push({ code, msg, evidence_ref: ref });

  // ── 1. Build ───────────────────────────────────────────────────────────────
  const build = statusOf(checks, "build");
  const buildOk = build.status !== "fail";
  conditions.push(condition("build_pass", buildOk, build.status === "skip" ? `not applicable — ${build.reason}` : build.status, "static.checks.build"));
  if (!buildOk) reject("BUILD_FAILED", "the frontend build does not compile", "static.checks.build");

  // ── 2. Tests ───────────────────────────────────────────────────────────────
  const unit = statusOf(checks, "unit_tests");
  const integ = statusOf(checks, "integration_tests");
  const testsOk = unit.status !== "fail" && integ.status !== "fail";
  conditions.push(condition("tests_pass", testsOk, `unit=${unit.status} integration=${integ.status}`, "static.checks.unit_tests|integration_tests"));
  if (unit.status === "fail") reject("UNIT_TESTS_FAILED", "the rules-engine regression suite is red — that suite is one test per real patient-facing bug", "static.checks.unit_tests");
  if (integ.status === "fail") reject("INTEGRATION_TESTS_FAILED", "golden lab panels produced wrong engine output", "static.checks.integration_tests");

  // ── other deterministic checks (Agent 3 says STOP on any failure) ──────────
  const otherFailed = checks.filter((c) => c.status === "fail" && c.blocking && !["build", "unit_tests", "integration_tests"].includes(c.id));
  conditions.push(condition("static_checks_pass", otherFailed.length === 0, otherFailed.length ? otherFailed.map((c) => c.id).join(", ") : "typecheck, lint, dead_code, dependency_validation", "static.checks"));
  for (const c of otherFailed) reject(`STATIC_${c.id.toUpperCase()}_FAILED`, `deterministic check "${c.id}" failed with ${c.findings.length} finding(s)`, `static.checks.${c.id}`);

  // ── 3. Medical ─────────────────────────────────────────────────────────────
  const medFacts = e.medical || {};
  const medVerdict = e.verdicts?.present?.medical;
  const medDeterministicOk = medFacts.deterministic_verdict !== "FAIL";
  const medLlmOk = medVerdict?.verdict === "PASS";
  const medicalOk = medDeterministicOk && medLlmOk;
  conditions.push(condition("medical_pass", medicalOk, `deterministic=${medFacts.deterministic_verdict ?? "n/a"} reviewer=${medVerdict?.verdict ?? "missing"}`, "medical|verdicts.medical"));
  if (!medDeterministicOk) reject("MEDICAL_BOUNDARY_VIOLATION", `${medFacts.boundary_violations.length} engine-boundary/clinical violation(s) found deterministically`, "medical.boundary_violations");
  if (!medVerdict) reject("MEDICAL_REVIEW_MISSING", "no Medical Reviewer verdict was filed — absence of review is not approval", "verdicts.medical");
  else if (medVerdict.verdict === "FAIL") reject("MEDICAL_REVIEW_FAILED", medVerdict.reasons?.[0] || "the Medical Reviewer rejected the change", "verdicts.medical");
  else if (typeof medVerdict.confidence === "number" && medVerdict.confidence < cfg.thresholds.medical_confidence) {
    reject("MEDICAL_REVIEW_LOW_CONFIDENCE", `Medical Reviewer confidence ${medVerdict.confidence} is below ${cfg.thresholds.medical_confidence}`, "verdicts.medical.confidence");
  }

  // ── 4. Trajectory ──────────────────────────────────────────────────────────
  const t = e.trajectory || {};
  const trajOk = typeof t.score === "number" && t.score > cfg.thresholds.trajectory_score;
  conditions.push(condition("trajectory_above_threshold", trajOk, t.score == null ? "no score — no transcript and no reviewer verdict" : `${t.score} > ${cfg.thresholds.trajectory_score}?`, "trajectory"));
  if (t.score == null) reject("TRAJECTORY_EVIDENCE_MISSING", "nothing is known about how this change was produced", "trajectory");
  else if (!trajOk) reject("TRAJECTORY_BELOW_THRESHOLD", `trajectory score ${t.score} ≤ threshold ${cfg.thresholds.trajectory_score}`, "trajectory");

  // ── 5. Independent judge ───────────────────────────────────────────────────
  const judge = e.verdicts?.present?.judge;
  const judgeOk = judge?.verdict === "PASS";
  conditions.push(condition("independent_judge_pass", judgeOk, judge?.verdict ?? "missing", "verdicts.judge"));
  if (!judge) reject("JUDGE_MISSING", "no independent judge verdict was filed", "verdicts.judge");
  else if (judge.verdict === "FAIL") reject("JUDGE_FAILED", judge.reasons?.[0] || "the independent judge found the task unsatisfied", "verdicts.judge");

  // ── 6. Risk ────────────────────────────────────────────────────────────────
  const risk = e.risk || { level: "MEDIUM" };
  const riskOk = RISK_ORDER[risk.level] <= RISK_ORDER[cfg.gate.max_risk_for_auto_merge];
  conditions.push(condition("risk_within_limit", riskOk, `${risk.level} (max ${cfg.gate.max_risk_for_auto_merge})`, "risk"));
  if (!riskOk) reject("RISK_TOO_HIGH", `risk is ${risk.level}: ${risk.drivers.slice(0, 5).join(", ")}${risk.drivers.length > 5 ? ` +${risk.drivers.length - 5} more` : ""}`, "risk.drivers");

  // ── verdict hygiene ────────────────────────────────────────────────────────
  const invalid = e.verdicts?.invalid || [];
  const independence = e.verdicts?.independence || [];
  conditions.push(condition("verdicts_valid_and_independent", invalid.length === 0 && independence.length === 0, `${invalid.length} invalid, ${independence.length} independence violation(s)`, "verdicts"));
  for (const i of invalid) reject("VERDICT_INVALID", `${i.role} verdict rejected: ${i.errors.join("; ")}`, `verdicts.invalid.${i.role}`);
  for (const i of independence) reject("SELF_EVALUATION", i.msg, "verdicts.independence");

  // ── regression learning ────────────────────────────────────────────────────
  const anyFailure = reasons.length > 0;
  const reg = e.regression || {};
  const regOk = !cfg.gate.require_regression_on_failure || !anyFailure || reg.generated === true;
  conditions.push(condition("regression_recorded", regOk, anyFailure ? (reg.generated ? `${reg.count} regression artefact(s) written` : "none written") : "not applicable — nothing failed", "regression"));
  if (!regOk) reject("REGRESSION_NOT_RECORDED", "a failure was found but no regression test was generated — the same bug is allowed to come back", "regression");

  const approved = reasons.length === 0;

  return {
    agent: "merge-gate",
    deterministic: true,
    decision: approved ? "APPROVE_MERGE" : "REJECT_MERGE",
    conditions,
    reasons,
    human_review_required: !approved || risk.level === "HIGH" || medFacts.requires_human_clinical_signoff === true,
    next_actions: approved ? [] : nextActions(reasons, risk, medFacts),
  };
}

function nextActions(reasons, risk, medFacts) {
  const a = [];
  const codes = new Set(reasons.map((r) => r.code));
  if (codes.has("RISK_TOO_HIGH")) {
    a.push(`Route to a human reviewer: ${risk.drivers.slice(0, 3).join(", ")}. HIGH-risk paths in this repo decide what a patient is told about their own results.`);
  }
  if (codes.has("MEDICAL_REVIEW_MISSING")) a.push("Run the medical reviewer (Agent 4) against this tree and file verdicts/medical.json.");
  if (codes.has("JUDGE_MISSING")) a.push("Run the independent judge (Agent 6) blind — task statement and diff only, no other verdicts.");
  if (codes.has("TRAJECTORY_EVIDENCE_MISSING")) a.push("Re-run with --transcript <session.jsonl>, or file verdicts/trajectory.json.");
  if (codes.has("UNIT_TESTS_FAILED")) a.push("Fix the failing test. Never SKIP_HOOKS past a red clinical test (N10).");
  if (codes.has("INTEGRATION_TESTS_FAILED")) a.push("A golden panel changed behaviour — decide whether the new output is clinically correct before touching the fixture.");
  if (medFacts.requires_human_clinical_signoff) a.push("A reference range, grading function or pattern rule changed — a clinician must sign off on the numbers, not just the code.");
  return a;
}
