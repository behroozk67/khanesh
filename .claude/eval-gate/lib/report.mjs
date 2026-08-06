// The mandated output. All eight sections, always, in order, even when a
// section is empty — an omitted section reads as "fine" and is how a gate
// quietly stops gating.
const ICON = { pass: "PASS", fail: "FAIL", skip: "SKIP", missing: "MISSING" };

function table(rows, headers) {
  const out = [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`];
  for (const r of rows) out.push(`| ${r.join(" | ")} |`);
  return out.join("\n");
}

export function renderReport(ev) {
  const L = [];
  const { change_set: cs, static: st, medical: med, trajectory: tr, risk, gate, regression, verdicts, meta } = ev;

  // ── 1 ──────────────────────────────────────────────────────────────────────
  L.push("## Execution Summary", "");
  L.push(table([
    ["commit", `\`${(cs.head || "").slice(0, 8)}\` on \`${cs.branch}\``],
    ["base", `\`${(cs.base || "").slice(0, 8)}\``],
    ["mode", cs.mode],
    ["files changed", String(cs.file_count)],
    ["tree hash", `\`${cs.tree_hash.slice(0, 16)}\``],
    ["judge version", `\`${verdicts.judge_version}\``],
    ["gate version", `\`${meta.gate_version}\``],
    ["node", meta.node],
    ["timestamp", meta.timestamp],
    ["duration", `${meta.duration_ms} ms`],
  ], ["field", "value"]));
  L.push("");
  const byRisk = cs.files.slice(0, 25).map((f) => `\`${f.file}\``).join(", ");
  L.push(`**Changed:** ${byRisk}${cs.file_count > 25 ? ` … +${cs.file_count - 25} more` : ""}`, "");

  // ── 2 ──────────────────────────────────────────────────────────────────────
  L.push("## Deterministic Checks", "");
  L.push(table(st.checks.map((c) => [
    c.id,
    `**${ICON[c.status] || c.status}**`,
    c.blocking ? "blocking" : "advisory",
    (c.reason || c.evidence?.[0]?.cmd || "").toString().replace(/\|/g, "\\|").slice(0, 110) || "—",
    String((c.findings || []).length),
  ]), ["check", "status", "gating", "detail", "findings"]));
  L.push("");
  for (const c of st.checks.filter((x) => x.status === "fail")) {
    L.push(`**${c.id} — failures**`, "");
    for (const f of (c.findings || []).slice(0, 12)) {
      L.push(`- \`${f.file || f.panel || "—"}${f.line ? ":" + f.line : ""}\` — ${f.msg || f.assertion || JSON.stringify(f).slice(0, 200)}`);
    }
    if (!(c.findings || []).length) L.push("```\n" + (c.evidence?.[0]?.output || "").slice(-1200) + "\n```");
    L.push("");
  }
  L.push(`**Static Reviewer verdict:** ${st.verdict}${st.stop ? " — STOP, nothing downstream can overturn this" : ""}`, "");

  // ── 3 ──────────────────────────────────────────────────────────────────────
  L.push("## Medical Validation", "");
  const mv = verdicts.present?.medical;
  L.push(table([
    ["deterministic verdict", med.deterministic_verdict ?? "n/a"],
    ["reviewer verdict", mv ? `${mv.verdict} (confidence ${mv.confidence ?? "—"}, model \`${mv.model}\`)` : "**missing**"],
    ["clinical modules touched", [...med.modules_touched.ranges, ...med.modules_touched.patterns].map((f) => `\`${f.split("/").pop()}\``).join(", ") || "none"],
    ["reference-range changes", String(med.range_changes.length)],
    ["grading-function changes", String(med.function_changes.length)],
    ["pattern rules +/−", `+${med.pattern_changes.added_rules.length} / −${med.pattern_changes.removed_rules.length}`],
    ["boundary violations", String(med.boundary_violations.length)],
    ["human clinical sign-off", med.requires_human_clinical_signoff ? "**required**" : "not required"],
  ], ["field", "value"]));
  L.push("");
  if (med.range_changes.length) {
    L.push("**Values that changed (loaded from both revisions, not read off the diff):**", "");
    L.push(table(med.range_changes.slice(0, 20).map((r) => [
      `\`${r.path}\``, r.kind, JSON.stringify(r.from ?? null).slice(0, 40), JSON.stringify(r.to ?? null).slice(0, 40),
    ]), ["path", "kind", "before", "after"]));
    L.push("");
  }
  if (med.function_changes.length) {
    L.push("**Grading/derivation functions whose body changed:** " +
      med.function_changes.slice(0, 12).map((f) => `\`${f.export}\` (${f.file.split("/").pop()})`).join(", "), "");
  }
  for (const v of med.boundary_violations) L.push(`- 🔴 \`${v.file}:${v.line}\` — ${v.msg}`);
  if (med.load_errors.length) L.push("", "**Load errors:** " + JSON.stringify(med.load_errors).slice(0, 400));
  L.push("");

  // ── 4 ──────────────────────────────────────────────────────────────────────
  L.push("## Trajectory Analysis", "");
  if (tr.status === "unavailable") {
    L.push(`**Status:** unavailable — ${tr.note}`, "");
  } else {
    L.push(table([
      ["score", `**${tr.score} / 100** (threshold > ${tr.threshold}) — ${tr.pass ? "PASS" : "FAIL"}`],
      ["source", tr.source],
      ["tool calls", `${tr.metrics.tool_calls} (budget ${tr.metrics.budget})`],
      ["duplicate calls", String(tr.metrics.duplicate_calls)],
      ["verbatim retries after error", String(tr.metrics.verbatim_retries)],
      ["out-of-plan edits", String(tr.metrics.out_of_plan_edits)],
      ["blind edits (no prior read)", String(tr.metrics.blind_edits)],
      ["ignored tool errors", String(tr.metrics.ignored_errors)],
    ], ["metric", "value"]));
    L.push("");
    for (const f of (tr.findings || []).slice(0, 10)) L.push(`- **${f.kind}** · call #${f.call} \`${f.tool}\` → \`${f.target ?? "—"}\` — ${f.msg}`);
    L.push("");
  }

  // ── 5 ──────────────────────────────────────────────────────────────────────
  L.push("## Risk Level", "");
  L.push(`**${risk.level}** — HIGH ${risk.counts.HIGH} · MEDIUM ${risk.counts.MEDIUM} · LOW ${risk.counts.LOW}`, "");
  L.push(table(risk.per_file.slice(0, 20).map((f) => [`\`${f.file}\``, f.risk, f.why.slice(0, 90)]), ["file", "risk", "why"]));
  if (risk.per_file.length > 20) L.push(`\n_… +${risk.per_file.length - 20} more files_`);
  if (risk.note) L.push("", `> ${risk.note}`);
  L.push("");

  // ── 6 ──────────────────────────────────────────────────────────────────────
  L.push("## Merge Decision", "");
  L.push(`# ${gate.decision === "APPROVE_MERGE" ? "APPROVE MERGE" : "REJECT MERGE"}`, "");
  L.push(table(gate.conditions.map((c) => [c.name, c.ok ? "met" : "**NOT MET**", String(c.detail).replace(/\|/g, "\\|").slice(0, 90)]), ["condition", "state", "detail"]));
  L.push("");
  if (gate.reasons.length) {
    L.push("**Reasons for rejection:**", "");
    for (const r of gate.reasons) L.push(`1. \`${r.code}\` — ${r.msg}  \n   _evidence:_ \`${r.evidence_ref}\``);
    L.push("");
  }
  if (gate.human_review_required) L.push("> **Human review required.** This change cannot be auto-merged in this repository.", "");
  if (gate.next_actions.length) {
    L.push("**Next actions:**", "");
    for (const a of gate.next_actions) L.push(`- ${a}`);
    L.push("");
  }

  // ── 7 ──────────────────────────────────────────────────────────────────────
  L.push("## Evidence", "");
  L.push(`Full machine-readable record: \`${meta.run_dir}/evaluation.json\``, "");
  L.push(table([
    ["static checks", `${meta.run_dir}/static.json`],
    ["medical facts", `${meta.run_dir}/medical-facts.json`],
    ["risk", `${meta.run_dir}/risk.json`],
    ["trajectory", `${meta.run_dir}/trajectory.json` + (tr.status === "measured" ? ` · ${meta.run_dir}/trajectory_report.md` : "")],
    ["verdicts", `${meta.run_dir}/verdicts/{medical,trajectory,judge}.json`],
    ["diff", `${meta.run_dir}/change.patch`],
  ], ["artefact", "path"]));
  L.push("");
  const cmds = st.checks.flatMap((c) => (c.evidence || []).filter((e) => e.cmd).map((e) => `- \`${e.cmd}\`${e.cwd ? ` (in \`${e.cwd}\`)` : ""} → exit ${e.status ?? (e.ok ? 0 : 1)}${e.ms ? `, ${e.ms} ms` : ""}`));
  if (cmds.length) { L.push("**Commands actually run:**", "", ...cmds, ""); }
  if (verdicts.invalid.length) {
    L.push("**Rejected verdicts:**", "");
    for (const i of verdicts.invalid) L.push(`- ${i.role}: ${i.errors.join("; ")}`);
    L.push("");
  }
  if (verdicts.independence.length) {
    L.push("**Independence violations:**", "");
    for (const i of verdicts.independence) L.push(`- ${i.msg}`);
    L.push("");
  }

  // ── 8 ──────────────────────────────────────────────────────────────────────
  L.push("## Regression Tests Added", "");
  if (!regression || (!regression.created.length && !regression.covered_by_existing_check.length)) {
    L.push("_None — nothing failed, so there is nothing to lock in._", "");
  } else {
    if (regression.created.length) {
      L.push(table(regression.created.map((c) => [`\`${c.file}\``, c.why.replace(/\|/g, "\\|").slice(0, 120)]), ["test file", "defect it locks in"]));
      L.push("", "Run them: `node .claude/eval-gate/run.mjs regressions` — they are red until the defect is fixed, which is the point.", "");
    }
    if (regression.covered_by_existing_check.length) {
      L.push("**Already covered by a deterministic check (no new file needed):**", "");
      for (const c of regression.covered_by_existing_check) L.push(`- \`${c.id}\` — ${c.why}`);
      L.push("");
    }
  }

  return L.join("\n");
}
