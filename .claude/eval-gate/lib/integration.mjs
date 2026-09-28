// Integration tests — the real engine, end to end, on golden lab panels.
// `npm test` covers units in isolation; this covers the wiring between
// adapter → grade → patterns → user-facing text, which is where this project's
// historical patient-facing bugs actually lived.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, readJson, GATE_DIR } from "./util.mjs";

const URGENCY_RANK = { none: 0, routine: 1, this_week: 2, soon: 3, emergency: 4 };

async function loadEngine() {
  const imp = (rel) => import(pathToFileURL(path.join(ROOT, "khanesh-server/rules", rel)).href);
  const [adapter, patterns, names] = await Promise.all([imp("adapter.js"), imp("patterns.js"), imp("names.js")]);
  return { runEngine: adapter.runEngine, runPatterns: patterns.runPatterns, faName: names.faName, FA_NAMES: names.FA_NAMES };
}

/** Every string the patient can end up reading, flattened. */
function patientText(patternOut) {
  const out = [];
  for (const f of patternOut.findings || []) {
    for (const k of ["headline", "must_say", "action", "brief"]) if (typeof f[k] === "string") out.push(f[k]);
    for (const k of ["warnings", "suggest"]) for (const s of f[k] || []) if (typeof s === "string") out.push(s);
  }
  return out;
}

export async function runIntegration() {
  const panels = readJson(path.join(GATE_DIR, "fixtures/panels.json"));
  const failed = [];
  let assertions = 0;

  let engine;
  try {
    engine = await loadEngine();
  } catch (e) {
    return {
      total: panels.length, assertions: 0,
      failed: [{ panel: "—", assertion: "engine_loads", msg: `the rules engine could not be imported at all: ${e.message}` }],
    };
  }
  const { runEngine, runPatterns, faName, FA_NAMES } = engine;

  const fail = (panel, assertion, msg, extra = {}) => failed.push({ panel, assertion, msg, ...extra });

  for (const p of panels) {
    let out, pat;
    try {
      out = runEngine(p.ocr);
      pat = runPatterns(out);
    } catch (e) {
      fail(p.id, "engine_runs", `engine threw on a realistic panel: ${e.message}`);
      continue;
    }
    const e = p.expect || {};
    const ids = (pat.findings || []).map((f) => f.rule_id);

    // ── determinism: identical input, identical output ─────────────────────
    assertions++;
    const again = JSON.stringify(runPatterns(runEngine(p.ocr)));
    if (again !== JSON.stringify(pat)) {
      fail(p.id, "determinism", "the same panel produced two different results — the engine is not reproducible");
    }

    if (e.urgency) {
      assertions++;
      if (pat.overall_urgency !== e.urgency) fail(p.id, "urgency", `expected urgency "${e.urgency}", got "${pat.overall_urgency}"`);
    }
    if (e.urgency_at_least) {
      assertions++;
      if (URGENCY_RANK[pat.overall_urgency] < URGENCY_RANK[e.urgency_at_least]) {
        fail(p.id, "urgency_at_least", `expected at least "${e.urgency_at_least}", got "${pat.overall_urgency}"`);
      }
    }
    for (const bad of e.no_patterns || []) {
      assertions++;
      if (ids.includes(bad)) fail(p.id, "no_patterns", `pattern "${bad}" fired — this panel is supposed to be covered by a real rule (N1)`);
    }
    if (e.min_findings != null) {
      assertions++;
      if ((pat.findings || []).length < e.min_findings) {
        fail(p.id, "min_findings", `expected >= ${e.min_findings} finding(s), got ${(pat.findings || []).length} — silence on an abnormal panel is this app's worst failure mode (N2)`);
      }
    }
    if (e.abnormal_keys_empty) {
      assertions++;
      const ab = (out.abnormal || []).map((g) => `${g.test}=${g.value}`);
      if (ab.length) fail(p.id, "abnormal_keys_empty", `a normal panel was graded abnormal: ${ab.join(", ")} (N3 — unit normalisation)`);
    }
    for (const [key, dir] of Object.entries(e.dir_of || {})) {
      assertions++;
      const g = (out.graded || []).find((x) => x.test === key);
      if (!g) fail(p.id, "dir_of", `${key} was not graded at all`);
      else if (g.dir !== dir) fail(p.id, "dir_of", `${key} graded dir="${g.dir}", expected "${dir}" (N12 — direction is its own axis)`);
    }
    for (const key of e.graded_present || []) {
      assertions++;
      if (!(out.graded || []).some((x) => x.test === key)) fail(p.id, "graded_present", `${key} never reached the graded list — check NAME_MAP (N2)`);
    }
    if (e.conversion_for) {
      assertions++;
      const conv = (out.unitConversions || []).some((c) => c.test === e.conversion_for);
      if (!conv) fail(p.id, "conversion_for", `no unit conversion recorded for ${e.conversion_for} — the sheet's unit was graded against the wrong scale (N3)`);
    }

    const texts = patientText(pat);
    for (const bad of e.forbid_text || []) {
      assertions++;
      if (texts.some((t) => t.includes(bad))) fail(p.id, "forbid_text", `patient-facing text contains "${bad}", which is clinically opposite to this result (N12)`);
    }

    // ── N8: no raw engine key may reach patient-facing text ────────────────
    assertions++;
    for (const g of out.graded || []) {
      const fa = faName(g.test);
      if (fa === g.test) continue;                       // abbreviation IS the Persian label (HDL, INR, ...)
      if (!/^[A-Z0-9_]{2,}$/.test(g.test)) continue;
      // A parenthesised abbreviation after a Persian phrase is normal clinical
      // writing («اندازهٔ متوسط گلبول‌ها (MCV) …»). The N8 bug is the BARE key
      // standing in for a name the patient was never given
      // («درخواست آزمایش HGB از پزشک»). Parenthesised → allowed; bare → not.
      const bare = new RegExp(`(^|[^A-Za-z0-9_(\\[«])${g.test}([^A-Za-z0-9_)\\]»]|$)`);
      const hit = texts.find((t) => bare.test(t) && !t.includes(fa));
      if (hit) fail(p.id, "no_raw_keys", `raw engine key "${g.test}" reached patient text with no Persian name anywhere in the sentence — must go through faName() (N8)`, { text: hit.slice(0, 160) });
    }

    // ── every graded key must have a Persian name at all ───────────────────
    assertions++;
    for (const g of out.graded || []) {
      if (!(g.test in FA_NAMES)) fail(p.id, "fa_names_coverage", `graded key "${g.test}" is missing from FA_NAMES — it will print raw to the patient (N8)`);
    }

    // ── urgency must not be flattened away from the graded evidence ────────
    assertions++;
    const anyCritical = (out.abnormal || []).some((a) => a.level === "critical");
    if (anyCritical && pat.overall_urgency === "none") {
      fail(p.id, "urgency_monotonic", "a critically-graded value produced urgency \"none\" — urgency must come from the engine, never be flattened");
    }
  }

  return { total: panels.length, assertions, failed };
}
