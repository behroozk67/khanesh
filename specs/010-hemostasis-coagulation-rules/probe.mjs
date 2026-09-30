// Probe for specs/010 — run from repo root:
//   node specs/010-hemostasis-coagulation-rules/probe.mjs [panel…]
// Against another tree (e.g. the pre010 archive):  PROBE_ROOT=<dir containing khanesh-server> node …/probe.mjs
import { pathToFileURL } from "node:url";
import path from "node:path";
const ROOT = process.env.PROBE_ROOT
  ? path.resolve(process.env.PROBE_ROOT)
  : path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const mod = (p) => import(pathToFileURL(path.join(ROOT, "khanesh-server/rules", p)).href);
const { runEngine } = await mod("adapter.js");
const { runPatterns } = await mod("patterns.js");

const T = (name, value, unit, reference) => ({ name, value: String(value), unit, ...(reference ? { reference } : {}) });
const BASE = [T("WBC", 7, "10^3/uL"), T("Hb", 14, "g/dL")];
export const PANELS = {
  fviii_05: ["M", 25, [...BASE, T("Factor VIII Activity", 0.5, "%")]],
  fviii_3_aptt: ["M", 25, [...BASE, T("FVIII", 3, "%"), T("APTT", 68, "sec"), T("PT", 12, "sec")]],
  fviii_iu: ["M", 25, [...BASE, T("Factor VIII", 0.01, "IU/mL")]],
  fix_40: ["M", 25, [...BASE, T("Factor IX", 40, "%")]],
  fix_abbr: ["M", 25, [...BASE, T("FIX", 3, "%")]],
  fa_8: ["M", 25, [...BASE, T("فاکتور ۸", 3, "%")]],
  inhib: ["M", 25, [...BASE, T("FVIII Inhibitor", 2.4, "BU")]],
  inhib_neg: ["M", 25, [...BASE, T("Inhibitor", "Negative")]],
  vwf: ["F", 30, [...BASE, T("vWF:Ag", 25, "%"), T("vWF:RCo", 10, "%")]],
  vwf_ag: ["F", 30, [...BASE, T("vWF Antigen", 25, "%")]],
  tt: ["M", 40, [...BASE, T("Thrombin Time", 30, "sec")]],
  tt_abbr: ["M", 40, [...BASE, T("TT", 30, "sec")]],
  pt_ctrl: ["M", 40, [...BASE, T("PT", 19, "sec"), T("PT Control", 12, "sec"), T("INR", 1.6, "")]],
  isth_nonovert: ["M", 60, [T("WBC", 7, "10^3/uL"), T("Hb", 13, "g/dL"), T("PLT", 80, "10^3/uL"), T("D-dimer", 2.0, "µg/mL"), T("PT", 14, "sec"), T("Fibrinogen", 250, "mg/dL")]],
  dic_emerg: ["M", 60, [T("WBC", 7, "10^3/uL"), T("Hb", 13, "g/dL"), T("PLT", 60, "10^3/uL"), T("PT", 18, "sec"), T("Fibrinogen", 120, "mg/dL")]],
  plt_450: ["M", 40, [...BASE, T("PLT", 500, "10^3/uL")]],
  plt_1200: ["M", 40, [...BASE, T("PLT", 1200, "10^3/uL")]],
  isth5_no_dic: ["M", 60, [T("WBC", 7, "10^3/uL"), T("Hb", 13, "g/dL"), T("PLT", 40, "10^3/uL"), T("D-dimer", 6.0, "µg/mL"), T("PT", 12, "sec"), T("Fibrinogen", 300, "mg/dL")]],
  adamts: ["F", 40, [...BASE, T("ADAMTS13 activity", 4, "%")]],
  // ── T004 ──
  factor_only_fviii: ["M", 25, [T("Factor VIII Activity", 0.5, "%")]],
  fix_neonate: ["M", "3 روزه", [T("Factor IX", 30, "%")]],
  fviii_neonate_severe: ["M", "3 روزه", [T("Factor VIII Activity", 0.5, "%")]],
  fix_neonate_severe: ["M", "3 روزه", [T("Factor IX", 3, "%")]],
  fix_neonate_25: ["M", "3 روزه", [T("Factor IX", 25, "%")]],
  fix_06y_4: ["M", 0.6, [T("Factor IX", 4, "%")]],
  neo_hb17: ["M", "3 روزه", [T("WBC", 15, "10^3/uL"), T("Hb", 17, "g/dL")]],
  fviii_child: ["M", 8, [...BASE, T("Factor VIII", 20, "%")]],
  fviii_noage: ["M", null, [...BASE, T("Factor VIII", 20, "%")]],
  isth_plt49: ["M", 60, [T("WBC", 7, "10^3/uL"), T("Hb", 13, "g/dL"), T("PLT", 45, "10^3/uL"), T("D-dimer", 3.0, "µg/mL"), T("PT", 12, "sec")]],
  factor_vii: ["M", 40, [...BASE, T("Factor VII", 40, "%")]],
  factor_x: ["M", 40, [...BASE, T("Factor X", 40, "%")]],
  factor_v: ["M", 40, [...BASE, T("Factor V", 40, "%")]],
  bare_inhibitor_pos: ["M", 25, [...BASE, T("Inhibitor", "Positive")]],
  inhib_num_noref: ["M", 25, [...BASE, T("FVIII Inhibitor", 2.4, "BU")]],
  inhib_num_ref: ["M", 25, [...BASE, T("FVIII Inhibitor", 2.4, "BU", "<0.6")]],
  inhib_word_neg: ["M", 25, [...BASE, T("Bethesda", "Undetected")]],
  fviii_ref_printed: ["M", 25, [...BASE, T("Factor VIII", 45, "%", "50-150")]],
  fviii_inrange: ["M", 25, [...BASE, T("Factor VIII", 90, "%", "50-150")]],
  fviii_31_noref: ["M", 25, [...BASE, T("Factor VIII", 31, "%")]],
  fviii_unitless: ["M", 25, [...BASE, T("Factor VIII", 3)]],
  fviii_normal_fix_normal_aptt_high: ["M", 25, [...BASE, T("Factor VIII", 60, "%"), T("Factor IX", 70, "%"), T("APTT", 68, "sec"), T("PT", 12, "sec")]],
  vwf_ratio_ok: ["F", 30, [...BASE, T("vWF:Ag", 80, "%", "50-160"), T("vWF:RCo", 75, "%", "50-160")]],
  vwf_ract_only: ["F", 30, [...BASE, T("vWF:RCo", 20, "%", "50-160")]],
  vwf_noref: ["F", 30, [...BASE, T("vWF:Ag", 25, "%"), T("vWF:RCo", 10, "%")]],
  vwf_with_fviiic: ["F", 30, [...BASE, T("vWF:Ag", 25, "%"), T("vWF:RCo", 10, "%"), T("FVIII:C", 40, "%")]],
  vwf_plt_low: ["F", 30, [T("WBC", 7, "10^3/uL"), T("Hb", 13, "g/dL"), T("PLT", 90, "10^3/uL"), T("vWF:Ag", 25, "%", "50-160"), T("vWF:RCo", 10, "%", "50-160")]],
  plt_999: ["M", 40, [...BASE, T("PLT", 999, "10^3/uL")]],
  plt_1000: ["M", 40, [...BASE, T("PLT", 1000, "10^3/uL")]],
  plt_raw_1200000: ["M", 40, [...BASE, T("PLT", "1200000", "/µL")]],
  isth_score5_ctrl: ["M", 60, [T("WBC", 7, "10^3/uL"), T("Hb", 13, "g/dL"), T("PLT", 70, "10^3/uL"), T("D-dimer", 4.5, "µg/mL"), T("PT", 14, "sec"), T("PT Control", 10, "sec"), T("Fibrinogen", 250, "mg/dL")]],
  fix_low_aptt: ["M", 25, [...BASE, T("Factor IX", 2, "%"), T("APTT", 70, "sec"), T("PT", 12, "sec")]],
  fviii_low_aptt_pt: ["M", 25, [...BASE, T("Factor VIII", 3, "%"), T("APTT", 70, "sec"), T("PT", 18, "sec")]],
  fviii_low_aptt_norm: ["M", 25, [...BASE, T("Factor VIII", 3, "%"), T("APTT", 30, "sec"), T("PT", 12, "sec")]],
  aptt_only: ["M", 25, [...BASE, T("APTT", 68, "sec"), T("PT", 12, "sec")]],
};

export function run(name) {
  const [sex, age, rows] = PANELS[name];
  const patient = { sex };
  if (age != null) patient.age = age;
  const e = runEngine({ tests: rows, patient });
  const r = runPatterns(e);
  return { e, r };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const pick = process.argv.slice(2);
  const names = pick.length ? pick : Object.keys(PANELS);
  for (const n of names) {
    const { e, r } = run(n);
    const f = (r.findings ?? []).map((x) => `${x.pattern}:${x.urgency}`);
    console.log(`── ${n}\n  graded: ${e.graded.map((g) => `${g.test}=${g.value}${g.abnormal ? (g.dir === "high" ? "↑" : "↓") : ""}`).join(" ")}\n  unmapped: ${JSON.stringify(e.unmapped ?? [])}  noRef: ${JSON.stringify(e.noRef ?? [])}  hemostasis: ${JSON.stringify(Object.keys(e.hemostasis ?? {}))}\n  findings: ${f.join(", ")}  urgency=${r.overall_urgency}`);
  }
}
