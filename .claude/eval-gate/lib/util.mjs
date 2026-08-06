// eval-gate — shared helpers. Zero dependencies, Node stdlib only.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const GATE_DIR = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
export const ROOT = path.resolve(GATE_DIR, "../../");

export function readJson(p, fallback = undefined) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    if (fallback !== undefined) return fallback;
    throw new Error(`cannot read JSON at ${p}: ${e.message}`);
  }
}

export function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
  return p;
}

export const config = () => readJson(path.join(GATE_DIR, "config.json"));

/**
 * Run a command. Never throws — the exit status IS the evidence.
 * Output is truncated so evaluation.json stays reviewable.
 */
const quote = (s) => (/[\s"&|<>^]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);

export function sh(cmd, args, { cwd = ROOT, timeout = 600000, env = {}, raw = false } = {}) {
  const started = Date.now();
  // Windows can only launch the npm-family .cmd shims through a shell, and
  // passing an args array alongside shell:true is both deprecated and unquoted —
  // so build one quoted command string instead.
  //
  // Everything else runs shell-free on purpose: routing `git show` through
  // cmd.exe re-encodes its stdout in the console codepage, which silently
  // corrupts every Persian string in this repo's source files. That produced a
  // real false "Invalid or unexpected token" when loading the engine at the
  // base commit.
  const useShell = process.platform === "win32" &&
    (/^(npm|npx|yarn|pnpm)$/i.test(path.basename(cmd)) || /\.cmd$/i.test(cmd));
  const opts = {
    cwd, timeout, encoding: "utf8",
    env: { ...process.env, ...env, NO_COLOR: "1", FORCE_COLOR: "0" },
    maxBuffer: 32 * 1024 * 1024,
  };
  const r = useShell
    ? spawnSync([cmd, ...args].map(quote).join(" "), [], { ...opts, shell: true })
    : spawnSync(cmd, args, opts);
  // `raw` is for commands whose stdout IS data (git show of a source file).
  // Truncating those, or letting a git warning on stderr land in the middle of
  // them, silently corrupts the file — which is how two clinical modules were
  // reported as "failed to parse at the base commit" when they were fine.
  if (raw) {
    return {
      cmd: [cmd, ...args].join(" "), cwd: path.relative(ROOT, cwd) || ".",
      status: r.status === null ? 1 : r.status, ok: r.status === 0,
      timedOut: r.error?.code === "ETIMEDOUT", ms: Date.now() - started,
      output: r.stdout || "", stderr: r.stderr || "",
    };
  }
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  return {
    cmd: [cmd, ...args].join(" "),
    cwd: path.relative(ROOT, cwd) || ".",
    status: r.status === null ? 1 : r.status,
    ok: r.status === 0,
    timedOut: r.error?.code === "ETIMEDOUT",
    ms: Date.now() - started,
    output: out.length > 12000 ? out.slice(0, 6000) + "\n…[truncated]…\n" + out.slice(-6000) : out,
  };
}

// git output is always data for this tool (file lists, patches, file contents),
// never a console log to summarise — so it is never truncated and stderr is
// never mixed into it.
export function git(args, opts = {}) {
  return sh("git", args, { raw: true, ...opts });
}

/** glob → RegExp. Supports **, *, ?. Paths are posix, repo-relative. */
export function globToRe(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // `**/` may match zero directories
        if (glob[i + 2] === "/") { re += "(?:.*/)?"; i += 2; } else { re += ".*"; i += 1; }
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (".+^${}()|[]\\".includes(c)) re += "\\" + c;
    else re += c;
  }
  return new RegExp("^" + re + "$");
}

export function matchAny(file, globs) {
  const f = file.replace(/\\/g, "/");
  return globs.some((g) => globToRe(g).test(f));
}

export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

export function fileHash(p) {
  try { return sha256(fs.readFileSync(p)); } catch { return null; }
}

export function nowIso() { return new Date().toISOString(); }

export const RISK_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2 };
