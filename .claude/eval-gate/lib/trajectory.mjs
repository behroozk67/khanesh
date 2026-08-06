// Agent 5 — Trajectory Reviewer, deterministic half.
//
// Scores HOW the Builder worked, from the session transcript, not from its own
// account of how it worked. An agent asked to grade its own process will
// describe the process it intended to follow.
import fs from "node:fs";
import path from "node:path";
import { config, sha256, matchAny, ROOT } from "./util.mjs";

const cfg = config();
const EDIT_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);
const READ_TOOLS = new Set(["Read", "NotebookRead"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const TRANSIENT = (cfg.trajectory.transient_error_patterns || []).map((s) => new RegExp(s, "i"));
const isTransient = (text) => !!text && TRANSIENT.some((r) => r.test(text));

// A file written by `printf >> x`, `sed -i`, `cp` or `tee` is edited just as
// surely as one written by the Edit tool, and counting only the tools that
// announce themselves made "0 out-of-plan edits" a weaker claim than it read
// as. Conservative by design: anything with a glob or a variable in the path is
// skipped rather than guessed at, because a false scope-drift accusation is
// worse than a missed one.
const NON_FILE = /^(\/dev\/null|nul|\$null|&\d?)$/i;
const ARG = `("[^"]+"|'[^']+'|[^\\s;|&<>]+)`;
const SHELL_WRITES = [
  // `>` only counts as a redirect when it is not part of `=>`, `>=` or `2>&1`.
  // Inline `node -e "…"` scripts are full of arrow functions, and reading those
  // as redirects invented 14 scope-drift findings on this tool's own trajectory.
  new RegExp(`(?<![0-9&=<>-])>>?(?!=)\\s*${ARG}`, "g"),                          // > file, >> file
  new RegExp(`\\btee\\s+(?:-a\\s+)?${ARG}`, "g"),                               // tee [-a] file
  new RegExp(`\\bsed\\s+-i\\S*\\s+(?:-e\\s+\\S+\\s+)?(?:"[^"]*"|'[^']*'|\\S+)\\s+${ARG}`, "g"),
  new RegExp(`\\b(?:cp|mv|install)\\s+(?:-\\S+\\s+)*(?:"[^"]+"|'[^']+'|[^\\s;|&]+)\\s+${ARG}`, "g"),
  new RegExp(`\\brm\\s+(?:-\\S+\\s+)*${ARG}`, "g"),
  new RegExp(`\\b(?:Set-Content|Add-Content|Out-File)\\s+(?:-Path\\s+)?${ARG}`, "gi"),
];

export function shellWriteTargets(cmd) {
  if (!cmd) return [];
  const out = new Set();
  for (const re of SHELL_WRITES) {
    for (const m of String(cmd).matchAll(re)) {
      const raw = (m[1] || "").replace(/^["']|["']$/g, "");
      if (!raw || NON_FILE.test(raw) || /[$*?]/.test(raw)) continue;
      const rel = path.isAbsolute(raw) ? path.relative(ROOT, raw) : raw;
      const norm = rel.replace(/\\/g, "/");
      if (!norm || norm.startsWith("..")) continue;   // outside the repo — not repo scope
      out.add(norm);
    }
  }
  return [...out];
}

function targetOf(name, input = {}) {
  const p = input.file_path || input.notebook_path || input.path;
  if (p) return path.relative(ROOT, p).replace(/\\/g, "/");
  if (input.command) return `$ ${String(input.command).slice(0, 120)}`;
  if (input.pattern) return `re:${input.pattern}`;
  return null;
}

export function parseTranscript(file) {
  const calls = [];
  const results = new Map();
  const lines = fs.readFileSync(file, "utf8").split("\n");
  let order = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    const content = ev?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type === "tool_use") {
        calls.push({
          order: order++,
          id: block.id,
          name: block.name,
          target: targetOf(block.name, block.input),
          cmd: typeof block.input?.command === "string" ? block.input.command : null,
          hash: sha256(`${block.name}:${JSON.stringify(block.input ?? {})}`).slice(0, 16),
        });
      } else if (block?.type === "tool_result") {
        const text = typeof block.content === "string"
          ? block.content
          : Array.isArray(block.content) ? block.content.map((c) => c?.text || "").join("\n") : "";
        results.set(block.tool_use_id, { is_error: !!block.is_error, text: text.slice(0, 400) });
      }
    }
  }
  return { calls, results };
}

/**
 * @param {object} o
 * @param {string} [o.transcript] path to a session transcript (JSONL)
 * @param {object} [o.plan]       plan.json — affected_modules bounds "in plan"
 * @param {object} [o.llmVerdict] the LLM trajectory reviewer's verdict, if any
 */
export function analyseTrajectory({ transcript, plan, llmVerdict } = {}) {
  const threshold = cfg.thresholds.trajectory_score;

  if (!transcript || !fs.existsSync(transcript)) {
    return {
      agent: "trajectory-reviewer",
      deterministic: false,
      status: "unavailable",
      score: llmVerdict?.trajectory_score ?? null,
      source: llmVerdict ? "llm-only" : "none",
      threshold,
      metrics: {},
      findings: [],
      note: llmVerdict
        ? "no transcript supplied — score comes from the LLM reviewer alone and is therefore unverified"
        : "no transcript and no LLM trajectory verdict — the gate has no evidence about how this change was produced",
    };
  }

  const { calls, results } = parseTranscript(transcript);
  const planned = plan?.affected_modules?.length ? plan.affected_modules : null;
  const steps = plan?.steps?.length || 0;
  const budget = cfg.trajectory.budget.base + cfg.trajectory.budget.per_plan_step * steps;

  const findings = [];
  const seen = new Map();
  const readFiles = new Set();
  const editedFiles = new Set();
  let duplicates = 0, outOfPlan = 0, retries = 0, blind = 0, ignoredErrors = 0;
  let transientRetries = 0, shellEdits = 0;

  for (const c of calls) {
    const prior = seen.get(c.hash);
    if (prior != null) {
      duplicates++;
      const priorRes = results.get(calls[prior]?.id);
      if (priorRes?.is_error && isTransient(priorRes.text)) {
        transientRetries++;
        findings.push({ kind: "transient_retry", call: c.order, tool: c.name, target: c.target, msg: "identical call repeated after a transient infrastructure error — the tool output asked for exactly this, so it carries no penalty" });
      } else if (priorRes?.is_error) {
        retries++;
        findings.push({ kind: "verbatim_retry_after_error", call: c.order, tool: c.name, target: c.target, msg: "identical call repeated after it had already failed — the tool output was not read" });
      } else {
        findings.push({ kind: "duplicate_tool_call", call: c.order, tool: c.name, target: c.target, msg: "identical call already made earlier in the session" });
      }
    }
    seen.set(c.hash, c.order);

    if (READ_TOOLS.has(c.name) && c.target) readFiles.add(c.target);

    if (EDIT_TOOLS.has(c.name) && c.target) {
      editedFiles.add(c.target);
      // Writing a file is knowing its contents — a later Edit to something this
      // session authored is not a blind edit.
      if (c.name === "Write") readFiles.add(c.target);
      // Anything resolving outside the repository root — a scratchpad, /tmp,
      // ~/.claude — is not repo scope drift. Note this exempts the whole
      // filesystem outside ROOT, not just scratch directories.
      const insideRepo = !c.target.startsWith("..") && !path.isAbsolute(c.target);
      if (planned && insideRepo && !matchAny(c.target, planned)) {
        outOfPlan++;
        findings.push({ kind: "out_of_plan_edit", call: c.order, tool: c.name, target: c.target, msg: "file edited that the approved plan does not list — scope drift or a hallucinated dependency" });
      }
      const existed = fs.existsSync(path.join(ROOT, c.target));
      if (existed && c.name === "Edit" && !readFiles.has(c.target)) {
        blind++;
        findings.push({ kind: "blind_edit_no_read", call: c.order, tool: c.name, target: c.target, msg: "existing file edited without being read first in this session" });
      }
    }

    if (SHELL_TOOLS.has(c.name) && c.cmd) {
      for (const t of shellWriteTargets(c.cmd)) {
        editedFiles.add(t);
        shellEdits++;
        if (planned && !matchAny(t, planned)) {
          outOfPlan++;
          findings.push({ kind: "out_of_plan_edit", call: c.order, tool: c.name, target: t, msg: "file written through a shell command the approved plan does not list — a shell write bypasses Edit/Write review entirely" });
        }
      }
    }

    const res = results.get(c.id);
    if (res?.is_error) {
      const laterTouch = calls.some((k) => k.order > c.order && (k.target === c.target || k.name === c.name));
      if (!laterTouch) {
        ignoredErrors++;
        findings.push({ kind: "ignored_tool_error", call: c.order, tool: c.name, target: c.target, msg: "tool reported an error and nothing in the session responded to it" });
      }
    }
  }

  const overBudget = Math.max(0, calls.length - budget);
  const P = cfg.trajectory.penalties;
  const cap = (n, p) => Math.min(n * p.each, p.cap);
  const deductions = {
    duplicate_tool_call: cap(Math.max(0, duplicates - retries - transientRetries), P.duplicate_tool_call),
    out_of_plan_edit: cap(outOfPlan, P.out_of_plan_edit),
    verbatim_retry_after_error: cap(retries, P.verbatim_retry_after_error),
    blind_edit_no_read: cap(blind, P.blind_edit_no_read),
    over_budget_call: cap(overBudget, P.over_budget_call),
    ignored_tool_error: cap(ignoredErrors, P.ignored_tool_error),
  };
  const total = Object.values(deductions).reduce((a, b) => a + b, 0);
  const deterministicScore = Math.max(0, 100 - total);

  // Deterministic evidence overrides LLM opinion: a reviewer can lower the score
  // by seeing something the metrics miss, never raise it.
  const llmScore = typeof llmVerdict?.trajectory_score === "number" ? llmVerdict.trajectory_score : null;
  const score = cfg.gate.llm_can_only_lower && llmScore != null ? Math.min(deterministicScore, llmScore) : deterministicScore;

  return {
    agent: "trajectory-reviewer",
    deterministic: true,
    status: "measured",
    transcript: path.basename(transcript),
    threshold,
    score,
    deterministic_score: deterministicScore,
    llm_score: llmScore,
    source: llmScore != null ? "min(deterministic, llm)" : "deterministic",
    metrics: {
      tool_calls: calls.length,
      budget,
      plan_steps: steps,
      files_edited: editedFiles.size,
      files_read: readFiles.size,
      duplicate_calls: duplicates,
      verbatim_retries: retries,
      transient_retries: transientRetries,
      shell_edits: shellEdits,
      out_of_plan_edits: outOfPlan,
      blind_edits: blind,
      ignored_errors: ignoredErrors,
      over_budget_calls: overBudget,
    },
    deductions,
    findings: findings.slice(0, 60),
    pass: score > threshold,
  };
}

export function renderTrajectoryReport(t) {
  const L = [];
  L.push("# Trajectory Report", "");
  if (t.status === "unavailable") {
    L.push(`**Status:** unavailable — ${t.note}`, "");
    L.push(t.score == null ? "No score can be produced." : `Unverified LLM score: **${t.score}**`);
    return L.join("\n") + "\n";
  }
  L.push(`**Score:** ${t.score} / 100 (threshold > ${t.threshold}) — **${t.pass ? "PASS" : "FAIL"}**`);
  L.push(`**Source:** ${t.source} · deterministic ${t.deterministic_score}${t.llm_score != null ? ` · llm ${t.llm_score}` : ""}`);
  L.push(`**Transcript:** ${t.transcript}`, "");
  L.push("## Metrics", "", "| metric | value |", "|---|---|");
  for (const [k, v] of Object.entries(t.metrics)) L.push(`| ${k} | ${v} |`);
  L.push("", "## Deductions", "", "| penalty | points |", "|---|---|");
  for (const [k, v] of Object.entries(t.deductions)) L.push(`| ${k} | −${v} |`);
  L.push("", "## Findings", "");
  if (!t.findings.length) L.push("_None. The path taken matches the plan._");
  for (const f of t.findings) L.push(`- **${f.kind}** · call #${f.call} · \`${f.tool}\` → \`${f.target ?? "—"}\`  \n  ${f.msg}`);
  return L.join("\n") + "\n";
}
