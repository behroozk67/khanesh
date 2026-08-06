// Deterministic static analysis: dead code + dependency/import resolution.
// Scoped to the diff on purpose — a gate judges the change, not the repo's history.
// Repo-wide scanning is available separately via `run.mjs audit` and never gates.
import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";
import { ROOT, readJson, config, matchAny } from "./util.mjs";
import { addedLines } from "./diff.mjs";

const EXCLUDED = config().exclude_from_static || [];
const gated = (f) => !matchAny(f, EXCLUDED);

const BUILTIN = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);
const CODE = /\.(js|mjs|cjs|jsx)$/;

const SUBPROJECTS = ["khanesh-server", "khanesh"];
const subprojectOf = (f) => SUBPROJECTS.find((s) => f.startsWith(s + "/")) || null;

function readIf(p) {
  try { return fs.readFileSync(path.join(ROOT, p), "utf8"); } catch { return null; }
}

/** All import/require specifiers in a source file, with line numbers. */
export function specifiersOf(src) {
  const out = [];
  const patterns = [
    /(?:^|\n)\s*import\s+[^;'"]*?from\s*["']([^"']+)["']/g,
    /(?:^|\n)\s*import\s*["']([^"']+)["']/g,
    /(?:^|\n)\s*export\s+[^;'"]*?from\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src))) {
      out.push({ spec: m[1], line: src.slice(0, m.index).split("\n").length, dynamic: re.source.includes("import\\s*\\(") });
    }
  }
  return out;
}

function resolveRelative(fromFile, spec) {
  const base = path.resolve(ROOT, path.dirname(fromFile), spec);
  const candidates = [base, base + ".js", base + ".mjs", base + ".jsx", path.join(base, "index.js"), path.join(base, "index.jsx")];
  return candidates.find((c) => fs.existsSync(c)) || null;
}

function packageDeps(sub) {
  const pkg = readJson(path.join(ROOT, sub, "package.json"), null);
  if (!pkg) return null;
  return new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {}),
  ]);
}

/** Exported symbol names declared on lines this diff ADDED. */
function newlyExported(fileSrc, added) {
  const names = [];
  const re = /^\s*export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/;
  for (const { text, line } of added) {
    const m = re.exec(text);
    if (m) names.push({ name: m[1], line });
    const re2 = /^\s*export\s*\{\s*([^}]+)\}/.exec(text);
    if (re2) {
      for (const raw of re2[1].split(",")) {
        const n = raw.split(/\s+as\s+/).pop().trim();
        if (n) names.push({ name: n, line });
      }
    }
  }
  return names;
}

function repoFiles() {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "runs" || e.name === "dist") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (CODE.test(e.name) || /\.(json|md)$/.test(e.name)) out.push(path.relative(ROOT, p).replace(/\\/g, "/"));
    }
  };
  for (const s of [...SUBPROJECTS, ".claude"]) walk(path.join(ROOT, s));
  return out;
}

export function analyseStatic(changeSet) {
  const added = addedLines(changeSet);
  const allChanged = changeSet.files.filter((f) => CODE.test(f.file) && f.status !== "D").map((f) => f.file);
  const changed = allChanged.filter(gated);
  const skipped = allChanged.filter((f) => !gated(f));

  const depIssues = [];
  const deadCode = [];
  let specCount = 0;

  // ── dependency validation ──────────────────────────────────────────────────
  for (const file of changed) {
    const src = readIf(file);
    if (src == null) continue;
    const sub = subprojectOf(file);
    const deps = sub ? packageDeps(sub) : null;

    for (const { spec, line, dynamic } of specifiersOf(src)) {
      specCount++;
      if (spec.startsWith(".")) {
        const resolved = resolveRelative(file, spec);
        if (!resolved) {
          depIssues.push({
            kind: "unresolved_module", severity: "error", file, line, spec, dynamic,
            msg: `import target does not exist on disk: "${spec}"${dynamic ? " (dynamic import — fails only at runtime, in the fallback path nobody tests)" : ""}`,
          });
          continue;
        }
        const rel = path.relative(ROOT, resolved).replace(/\\/g, "/");
        const targetSub = subprojectOf(rel);
        if (sub && targetSub && targetSub !== sub) {
          depIssues.push({
            kind: "cross_subproject_import", severity: "error", file, line, spec,
            msg: `${sub} imports from ${targetSub} — the two sub-projects are independent packages with no shared build`,
          });
        }
      } else if (!BUILTIN.has(spec)) {
        const root = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
        if (deps && !deps.has(root)) {
          depIssues.push({
            kind: "missing_dependency", severity: "error", file, line, spec,
            msg: `"${root}" is imported but is not in ${sub}/package.json`,
          });
        }
      }
    }
  }

  // ── package.json / lockfile coherence ──────────────────────────────────────
  for (const sub of SUBPROJECTS) {
    if (!changed.includes(`${sub}/package.json`) && !changeSet.files.some((f) => f.file === `${sub}/package.json`)) continue;
    const lock = readJson(path.join(ROOT, sub, "package-lock.json"), null);
    const pkg = readJson(path.join(ROOT, sub, "package.json"), null);
    if (!lock || !pkg) continue;
    const locked = new Set(Object.keys(lock.packages || {}).map((k) => k.replace(/^node_modules\//, "")));
    for (const d of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
      if (!locked.has(d)) {
        depIssues.push({
          kind: "lockfile_out_of_sync", severity: "error", file: `${sub}/package.json`, line: 0, spec: d,
          msg: `"${d}" added to package.json but absent from package-lock.json — the install is not reproducible`,
        });
      }
    }
  }

  // ── dead code, newly introduced only ───────────────────────────────────────
  const all = repoFiles();
  const corpus = new Map();
  const readCorpus = (f) => {
    if (!corpus.has(f)) corpus.set(f, readIf(f) || "");
    return corpus.get(f);
  };
  let scanned = 0;
  for (const file of changed) {
    const src = readIf(file);
    if (src == null) continue;
    const names = newlyExported(src, added.get(file) || []);
    scanned += names.length;
    for (const { name, line } of names) {
      const used = all.some((other) => {
        if (other === file) return false;
        const s = readCorpus(other);
        return new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`).test(s);
      });
      const selfUsed = new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`, "g");
      const selfHits = (src.match(selfUsed) || []).length;
      if (!used && selfHits <= 1) {
        deadCode.push({
          kind: "unreferenced_export", severity: "error", file, line, symbol: name,
          msg: `export "${name}" was added by this diff and is referenced nowhere — either wire it up or don't ship it`,
        });
      }
    }
  }

  return { depIssues, deadCode, specifiers: specCount, scanned, vendored_skipped: skipped.length };
}

/** Repo-wide, non-gating. Surfaces pre-existing debt without failing a diff for it. */
export function auditRepo() {
  const files = repoFiles().filter((f) => CODE.test(f));
  const issues = [];
  for (const file of files) {
    const src = readIf(file);
    if (src == null) continue;
    const sub = subprojectOf(file);
    const deps = sub ? packageDeps(sub) : null;
    for (const { spec, line, dynamic } of specifiersOf(src)) {
      if (spec.startsWith(".")) {
        if (!resolveRelative(file, spec)) issues.push({ kind: "unresolved_module", file, line, spec, dynamic });
      } else if (!BUILTIN.has(spec) && deps) {
        const root = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
        if (!deps.has(root)) issues.push({ kind: "missing_dependency", file, line, spec });
      }
    }
  }
  return { files: files.length, issues };
}
