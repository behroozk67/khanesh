// Change-set collection. Everything downstream is a function of this object,
// so the whole evaluation is reproducible from (base, head, dirty-tree hash).
import path from "node:path";
import fs from "node:fs";
import { git, ROOT, sha256 } from "./util.mjs";

const IGNORE = [/^node_modules\//, /\/node_modules\//, /^\.claude\/eval-gate\/runs\//];

function parseNameStatus(txt) {
  const files = [];
  for (const line of txt.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const status = parts[0][0];
    const file = (status === "R" ? parts[2] : parts[1]) || "";
    if (!file || IGNORE.some((r) => r.test(file))) continue;
    files.push({ file: file.replace(/\\/g, "/"), status });
  }
  return files;
}

/**
 * @param {object} o
 * @param {string} [o.base]     base ref (default: merge-base with main)
 * @param {boolean} [o.staged]  only staged changes
 * @param {boolean} [o.working] include unstaged working-tree changes (default true)
 */
export function collectChangeSet({ base, staged = false, working = true } = {}) {
  const head = git(["rev-parse", "HEAD"]).output.trim();
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).output.trim();

  let resolvedBase = base;
  if (!resolvedBase) {
    const mb = git(["merge-base", "HEAD", "main"]);
    resolvedBase = mb.ok ? mb.output.trim() : head;
  }

  const committed = parseNameStatus(git(["diff", "--name-status", `${resolvedBase}..HEAD`]).output);
  const stagedFiles = parseNameStatus(git(["diff", "--name-status", "--cached"]).output);
  const workingFiles = parseNameStatus(git(["diff", "--name-status"]).output);

  const byFile = new Map();
  const add = (list, origin) => {
    for (const f of list) {
      const prev = byFile.get(f.file);
      byFile.set(f.file, { ...f, origin: prev ? `${prev.origin}+${origin}` : origin });
    }
  };
  add(committed, "committed");
  if (staged || working) add(stagedFiles, "staged");
  if (working && !staged) add(workingFiles, "working");

  const files = [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));

  // unified diff text — the Builder's actual output, the artifact reviewers read
  // raw: the patch is data, not console output — truncating it would hide added
  // lines from the boundary scanner, which is exactly the code that must not
  // miss anything.
  const range = staged ? ["diff", "--cached", "-U3"] : ["diff", "-U3", `${resolvedBase}`];
  const patch = git([...range], { raw: true }).output;

  // dirty-tree fingerprint: makes an evaluation of uncommitted work reproducible
  const treeHash = sha256(
    files.map((f) => {
      const p = path.join(ROOT, f.file);
      let h = "deleted";
      try { h = sha256(fs.readFileSync(p)); } catch { /* deleted */ }
      return `${f.file}:${h}`;
    }).join("\n")
  );

  return {
    base: resolvedBase,
    head,
    branch,
    mode: staged ? "staged" : working ? "working-tree" : "committed",
    files,
    file_count: files.length,
    tree_hash: treeHash,
    patch_bytes: patch.length,
    patch,
  };
}

/** Added lines only, per file — what the Builder actually introduced. */
export function addedLines(changeSet) {
  const out = new Map();
  let current = null;
  let lineNo = 0;
  for (const line of changeSet.patch.split("\n")) {
    if (line.startsWith("+++ b/")) { current = line.slice(6).trim(); out.set(current, []); continue; }
    if (line.startsWith("@@")) {
      const m = /\+(\d+)/.exec(line);
      lineNo = m ? parseInt(m[1], 10) : 0;
      continue;
    }
    if (!current) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) { out.get(current).push({ line: lineNo, text: line.slice(1) }); lineNo++; }
    else if (!line.startsWith("-")) lineNo++;
  }
  return out;
}

/** File content at a git ref, or null if it did not exist there. */
export function showAtRef(ref, file) {
  const r = git(["show", `${ref}:${file}`], { raw: true });
  return r.ok ? r.output : null;
}
