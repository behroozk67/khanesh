// Verdict intake for the LLM agents (4 Medical, 5 Trajectory, 6 Judge).
//
// Two rules are enforced here, in code, because they are the two an agent under
// deadline pressure will quietly break:
//   1. No agent may evaluate its own output.
//   2. A verdict is only valid for the exact tree it reviewed.
import fs from "node:fs";
import path from "node:path";
import { GATE_DIR, ROOT, readJson, fileHash, config } from "./util.mjs";

const cfg = config();

const REQUIRED = {
  medical: ["agent_role", "agent_id", "produced_by", "model", "reviewed", "verdict", "confidence", "evidence"],
  trajectory: ["agent_role", "agent_id", "produced_by", "model", "reviewed", "verdict", "trajectory_score", "evidence"],
  judge: ["agent_role", "agent_id", "produced_by", "model", "reviewed", "verdict", "saw_other_verdicts", "evidence"],
};

export function judgeVersion() {
  const md = path.join(ROOT, ".claude/agents/eval-judge.md");
  return `judge-${cfg.version}-${(fileHash(md) || "nofile").slice(0, 12)}`;
}

function validateOne(v, role, changeSet) {
  const errs = [];
  for (const f of REQUIRED[role] || []) if (v[f] === undefined || v[f] === null) errs.push(`missing required field "${f}"`);
  if (v.agent_role && v.agent_role !== role) errs.push(`agent_role "${v.agent_role}" does not match the slot it was filed under ("${role}")`);
  if (v.verdict && !["PASS", "FAIL"].includes(v.verdict)) errs.push(`verdict must be PASS or FAIL, got "${v.verdict}"`);
  if (role === "trajectory" && typeof v.trajectory_score === "number" && (v.trajectory_score < 0 || v.trajectory_score > 100)) {
    errs.push("trajectory_score must be 0–100");
  }
  if (v.verdict === "FAIL" && !(Array.isArray(v.evidence) && v.evidence.length)) {
    errs.push("a FAIL with no evidence is an opinion, not a finding");
  }
  if (Array.isArray(v.evidence)) {
    v.evidence.forEach((e, i) => {
      if (!e || typeof e !== "object" || !e.claim) errs.push(`evidence[${i}] has no "claim"`);
    });
  }
  if (v.reviewed) {
    if (v.reviewed.head && changeSet.head && v.reviewed.head !== changeSet.head) errs.push(`verdict reviewed head ${v.reviewed.head.slice(0, 7)}, current head is ${changeSet.head.slice(0, 7)} — stale`);
    if (v.reviewed.tree_hash && v.reviewed.tree_hash !== changeSet.tree_hash) errs.push("verdict reviewed a different working tree than the one being gated — stale");
  }
  if (role === "judge" && v.saw_other_verdicts === true) {
    errs.push("the independent judge declared it saw other agents' verdicts — its PASS is not independent and cannot be counted");
  }
  return errs;
}

/**
 * Loads verdicts/<role>.json out of the run directory.
 * Missing verdicts are not an error here — the gate decides what missing means.
 */
export function loadVerdicts(runDir, changeSet, buildMeta = {}) {
  const dir = path.join(runDir, "verdicts");
  const out = { present: {}, invalid: [], independence: [], missing: [] };

  for (const role of ["medical", "trajectory", "judge"]) {
    const p = path.join(dir, `${role}.json`);
    if (!fs.existsSync(p)) { out.missing.push(role); continue; }
    let v;
    try { v = readJson(p); } catch (e) { out.invalid.push({ role, errors: [e.message] }); continue; }
    const errs = validateOne(v, role, changeSet);
    if (errs.length) out.invalid.push({ role, errors: errs });
    else out.present[role] = v;
  }

  // ── independence ──────────────────────────────────────────────────────────
  const builder = buildMeta.builder_agent_id || null;
  const ids = Object.entries(out.present).map(([role, v]) => ({ role, id: v.produced_by, agent: v.agent_id }));
  for (const { role, id, agent } of ids) {
    if (builder && (id === builder || agent === builder)) {
      out.independence.push({ role, msg: `${role} reviewer is the same agent that wrote the code (${builder}) — self-evaluation is not evaluation` });
    }
  }
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (ids[i].id && ids[i].id === ids[j].id) {
        out.independence.push({ role: `${ids[i].role}+${ids[j].role}`, msg: `${ids[i].role} and ${ids[j].role} were produced by the same agent instance (${ids[i].id}) — that is one opinion wearing two hats` });
      }
    }
  }

  out.judge_version = judgeVersion();
  return out;
}

/** Skeleton a reviewer agent fills in — keeps the contract in one place. */
export function verdictTemplate(role, changeSet) {
  const base = {
    agent_role: role,
    agent_id: `eval-${role}-reviewer`,
    produced_by: "<unique id of the agent instance that produced this — never the Builder's>",
    model: "<model id>",
    reviewed: { base: changeSet.base, head: changeSet.head, tree_hash: changeSet.tree_hash },
    verdict: "PASS|FAIL",
    evidence: [{ file: "path/to/file.js", line: 0, claim: "what is wrong or right", quote: "the exact line" }],
    reasons: [],
  };
  if (role === "medical") return { ...base, confidence: 0.0, clinical_findings: [] };
  if (role === "trajectory") return { ...base, trajectory_score: 0 };
  return { ...base, saw_other_verdicts: false, task_statement: "<the task as given to the Builder>" };
}

export const GATE_DIR_EXPORT = GATE_DIR;
