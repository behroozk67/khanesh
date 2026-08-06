// Deterministic clinical evidence for Agent 4 (Medical Reviewer).
//
// The Medical Reviewer is an LLM and therefore cannot be trusted to *find* a
// changed reference range by reading a diff. This module finds them by loading
// the engine at both revisions and comparing the actual exported values, so the
// reviewer argues about a fact table it did not produce.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, git, config, sha256 } from "./util.mjs";
import { addedLines } from "./diff.mjs";

const cfg = config();
const RULES_DIR = "khanesh-server/rules";

/** Copy a whole directory as it existed at `ref` so its relative imports resolve. */
export function materializeAtRef(ref, dirRel, destDir) {
  const list = git(["ls-tree", "-r", "--name-only", ref, "--", dirRel]);
  if (!list.ok) return null;
  const files = list.output.split("\n").map((s) => s.trim()).filter(Boolean);
  if (!files.length) return null;
  for (const f of files) {
    const r = git(["show", `${ref}:${f}`], { raw: true });
    if (!r.ok) continue;
    const out = path.join(destDir, f);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, r.output, "utf8");
  }
  return path.join(destDir, dirRel);
}

const isPlain = (v) => v && typeof v === "object";

/** Deep diff of two JSON-ish values; functions compared by source. */
function deepDiff(a, b, pathStr = "", out = [], depth = 0) {
  if (depth > 8) return out;
  if (typeof a === "function" || typeof b === "function") {
    const sa = typeof a === "function" ? a.toString().replace(/\s+/g, " ") : String(a);
    const sb = typeof b === "function" ? b.toString().replace(/\s+/g, " ") : String(b);
    if (sa !== sb) out.push({ path: pathStr, kind: "function_body", from_hash: sha256(sa).slice(0, 12), to_hash: sha256(sb).slice(0, 12), from_len: sa.length, to_len: sb.length });
    return out;
  }
  if (!isPlain(a) || !isPlain(b)) {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: pathStr, kind: "value", from: a === undefined ? null : a, to: b === undefined ? null : b });
    return out;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const p = pathStr ? `${pathStr}.${k}` : k;
    if (!(k in a)) { out.push({ path: p, kind: "added", from: null, to: b[k] }); continue; }
    if (!(k in b)) { out.push({ path: p, kind: "removed", from: a[k], to: null }); continue; }
    deepDiff(a[k], b[k], p, out, depth + 1);
  }
  return out;
}

/**
 * Engine-boundary smells on one added line.
 *
 * A threshold only crosses the boundary when it reaches the model, i.e. when it
 * sits inside a string literal. `if (graded.length > 0)` is control flow, and
 * flagging that would train everyone to ignore this check — which is worse than
 * not having it.
 */
export function boundarySmells(line) {
  const stripped = String(line).trim();
  if (!stripped || stripped.startsWith("//") || stripped.startsWith("*")) return [];
  const strings = stripped.match(/(['"`])(?:\\.|(?!\1)[\s\S])*?\1/g) || [];
  const out = [];
  for (const smell of cfg.medical.boundary_smells) {
    const haystacks = smell.scope === "string" ? strings : [stripped];
    const re = new RegExp(smell.re, "i");
    const hit = haystacks.find((h) => re.test(h));
    if (hit) out.push({ id: smell.id, text: hit.slice(0, 200), msg: smell.msg });
  }
  return out;
}

async function importPair(baseRulesDir, fileRel) {
  const headUrl = pathToFileURL(path.join(ROOT, fileRel)).href;
  const baseUrl = baseRulesDir ? pathToFileURL(path.join(baseRulesDir, path.basename(fileRel))).href : null;
  let head = null, base = null, error = null;
  try { head = await import(headUrl); } catch (e) { error = `head import failed: ${e.message}`; }
  if (baseUrl && fs.existsSync(path.join(baseRulesDir, path.basename(fileRel)))) {
    try { base = await import(baseUrl); } catch (e) { error = (error ? error + "; " : "") + `base import failed: ${e.message}`; }
  }
  return { head, base, error };
}

/**
 * @param changeSet from collectChangeSet()
 * @param workDir   scratch dir for the base checkout (inside the run folder)
 */
export async function collectMedicalFacts(changeSet, workDir) {
  const changed = changeSet.files.map((f) => f.file);
  const touchedMedical = changed.filter((f) => cfg.medical.range_modules.includes(f));
  const touchedPatterns = changed.filter((f) => /^khanesh-server\/rules\/patterns.*\.js$/.test(f));
  const touchedPrompt = changed.filter((f) => cfg.medical.prompt_modules.includes(f));

  const facts = {
    agent: "medical-facts",
    deterministic: true,
    base: changeSet.base,
    modules_touched: { ranges: touchedMedical, patterns: touchedPatterns, prompt: touchedPrompt },
    range_changes: [],
    function_changes: [],
    pattern_changes: { added_rules: [], removed_rules: [], changed_rules: [] },
    boundary_violations: [],
    load_errors: [],
  };

  // engine-boundary smells in added prompt/server lines
  const added = addedLines(changeSet);
  for (const file of touchedPrompt) {
    for (const { line, text } of added.get(file) || []) {
      for (const v of boundarySmells(text)) facts.boundary_violations.push({ file, line, ...v });
    }
  }

  if (!touchedMedical.length && !touchedPatterns.length) {
    facts.summary = "no clinical module changed — nothing for the medical reviewer to compare";
    facts.deterministic_verdict = facts.boundary_violations.length ? "FAIL" : "PASS";
    facts.requires_human_clinical_signoff = false;
    return facts;
  }

  const baseRules = materializeAtRef(changeSet.base, RULES_DIR, path.join(workDir, "base-tree"));
  if (!baseRules) facts.load_errors.push(`could not materialise ${RULES_DIR} at ${changeSet.base}`);

  for (const file of [...touchedMedical, ...touchedPatterns]) {
    const { head, base, error } = await importPair(baseRules, file);
    if (error) facts.load_errors.push({ file, error });
    if (!head || !base) continue;

    for (const name of new Set([...Object.keys(head), ...Object.keys(base)])) {
      const h = head[name], b = base[name];
      if (typeof h === "function" || typeof b === "function") {
        const d = deepDiff(b, h, `${path.basename(file)}:${name}`);
        for (const item of d) facts.function_changes.push({ file, export: name, ...item });
        continue;
      }
      if (!isPlain(h) && !isPlain(b)) continue;

      if (name === "RULES" && Array.isArray(h) && Array.isArray(b)) {
        const hIds = new Set(h.map((r) => r?.id).filter(Boolean));
        const bIds = new Set(b.map((r) => r?.id).filter(Boolean));
        facts.pattern_changes.added_rules.push(...[...hIds].filter((i) => !bIds.has(i)));
        facts.pattern_changes.removed_rules.push(...[...bIds].filter((i) => !hIds.has(i)));
        for (const id of [...hIds].filter((i) => bIds.has(i))) {
          // RULES is assembled by spreading several pattern modules, so a hole
          // in the array is possible — never assume every element is an object.
          const hr = h.find((r) => r?.id === id), br = b.find((r) => r?.id === id);
          const d = deepDiff(br, hr, id);
          if (d.length) facts.pattern_changes.changed_rules.push({ rule_id: id, changes: d.slice(0, 40) });
        }
        continue;
      }

      const d = deepDiff(b, h, `${path.basename(file)}:${name}`);
      for (const item of d) facts.range_changes.push({ file, export: name, ...item });
    }
  }

  // A removed pattern rule is the N1 failure mode in reverse: an abnormal value
  // that used to have an explanation now falls through to unmatched_abnormal.
  for (const id of facts.pattern_changes.removed_rules) {
    facts.boundary_violations.push({
      id: "pattern_rule_removed", file: "khanesh-server/rules/patterns*.js", line: 0, text: id,
      msg: `clinical rule "${id}" was removed — every value it used to explain now falls through to unmatched_abnormal (N1)`,
    });
  }

  facts.summary =
    `${facts.range_changes.length} data change(s), ${facts.function_changes.length} function-body change(s), ` +
    `+${facts.pattern_changes.added_rules.length}/-${facts.pattern_changes.removed_rules.length} pattern rules, ` +
    `${facts.boundary_violations.length} boundary violation(s)`;

  // Deterministic side of the medical verdict. The LLM reviewer can only agree
  // with a FAIL here, never overturn it.
  facts.deterministic_verdict = facts.boundary_violations.length ? "FAIL" : "PASS";
  facts.requires_human_clinical_signoff =
    facts.range_changes.length > 0 || facts.function_changes.length > 0 ||
    facts.pattern_changes.removed_rules.length > 0 ||
    // A module that would not load at the base commit was never compared. An
    // incomplete fact table must not read as "nothing changed".
    facts.load_errors.length > 0;

  return facts;
}
