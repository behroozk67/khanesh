// Agent 7 — Risk Analyzer. Deterministic: a path either matches a class or it
// does not. No model is asked "how risky does this feel", because risk appetite
// is exactly the thing an eager model talks itself out of.
import { config, matchAny, RISK_ORDER } from "./util.mjs";

const cfg = config();

const REASONS = {
  HIGH: "clinical engine / patient interpretation / auth / migration / production or gate configuration",
  MEDIUM: "shared utility, API route, schema, medical UI, or an unclassified path (unknown is never LOW)",
  LOW: "documentation, static asset, or UI copy with no clinical logic",
};

export function classifyFile(file) {
  if (matchAny(file, cfg.risk.HIGH)) return { file, risk: "HIGH", why: REASONS.HIGH };
  if (matchAny(file, cfg.risk.LOW)) return { file, risk: "LOW", why: REASONS.LOW };
  // Deliberate fail-safe: anything the map does not recognise is MEDIUM, not LOW.
  const known = matchAny(file, cfg.risk.MEDIUM_HINT);
  return { file, risk: cfg.gate.unknown_path_risk, why: known ? REASONS.MEDIUM : `unmapped path — defaulted to ${cfg.gate.unknown_path_risk}` };
}

export function analyseRisk(changeSet) {
  const perFile = changeSet.files.map((f) => ({ ...classifyFile(f.file), status: f.status }));
  const level = perFile.reduce((acc, f) => (RISK_ORDER[f.risk] > RISK_ORDER[acc] ? f.risk : acc), "LOW");
  const drivers = perFile.filter((f) => f.risk === level).map((f) => f.file);

  return {
    agent: "risk-analyzer",
    deterministic: true,
    level,
    counts: {
      HIGH: perFile.filter((f) => f.risk === "HIGH").length,
      MEDIUM: perFile.filter((f) => f.risk === "MEDIUM").length,
      LOW: perFile.filter((f) => f.risk === "LOW").length,
    },
    drivers,
    per_file: perFile,
    auto_merge_allowed: RISK_ORDER[level] <= RISK_ORDER[cfg.gate.max_risk_for_auto_merge],
    note: level === "HIGH"
      ? "HIGH risk can never auto-merge in this repo by design: every file under khanesh-server/rules/ decides what a patient is told about their own blood."
      : null,
  };
}
